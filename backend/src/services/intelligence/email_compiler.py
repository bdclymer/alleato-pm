"""Outlook email thread intelligence compiler.

Mirrors the Teams compiler architecture (fetch → parse → normalize → attribute →
extract → write → mark compiled), but operates on email *threads* (groups of
document_metadata rows that share an Outlook ``conversation_id``) instead of
single conversation documents.

The thread "head" is the most recent message in the conversation. All extracted
artifacts (overview, insights, tasks, attribution candidates, packet signals) are
written against the head document's id. Every other message in the thread is
marked compiled with a pointer back to that head id, so we never recompile the
same thread twice and downstream RAG/UI code has a stable canonical doc per
thread.
"""

from __future__ import annotations

import logging
import os
import re
import time
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from src.services.integrations.microsoft_graph.project_inference import infer_project_id
    from src.services.supabase_helpers import get_rag_read_client, get_rag_write_client
except ModuleNotFoundError:
    from services.integrations.microsoft_graph.project_inference import infer_project_id
    from services.supabase_helpers import get_rag_read_client, get_rag_write_client

from .client import COMPILER_MODEL_DEFAULT, COMPILER_MODEL_LARGE, extract_with_retry
from .compiler import (
    compile_current_packet,
    ensure_client_project_target,
    process_packet_refresh_job,
    promote_signal_candidate,
    write_source_signal_candidate,
)
from .prompts import build_email_extraction_messages
from ..task_assignees import TaskAssigneeResolver

logger = logging.getLogger(__name__)


def _hydrate_rag_thread_content(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    ids = [str(row.get("id")) for row in rows if row.get("id")]
    if not ids:
        return rows
    try:
        rag_rows = (
            get_rag_read_client()
            .table("rag_document_metadata")
            .select("id,content,raw_text")
            .in_("id", ids)
            .execute()
            .data
            or []
        )
    except Exception:
        logger.warning("[EmailCompiler] Could not hydrate RAG email content", exc_info=True)
        return rows
    by_id = {str(row.get("id")): row for row in rag_rows if row.get("id")}
    return [
        {
            **row,
            "content": (by_id.get(str(row.get("id"))) or {}).get("content")
            or (by_id.get(str(row.get("id"))) or {}).get("raw_text"),
        }
        for row in rows
    ]

TASK_EXTRACTION_PROMPT_VERSION = "email_compiler.tasks.v3.gpt-5.5"

MIN_COMPILER_CHARS = 200
AUTO_ASSIGN_CONFIDENCE = 0.85
MAX_LLM_THREAD_CHARS = 12000
MAX_BODY_PER_MESSAGE = 4000
PACKET_COMPILER_VERSION = "email_thread_compiler_v0_1"
EMAIL_COMPILER_KEY = "email_compiler"

_HEADER_RE = re.compile(
    r"^(?P<key>Subject|Date|From|To|Cc|Bcc|Reply-To):\s*(?P<value>.*)$",
    re.IGNORECASE,
)
_QUOTE_LINE_RE = re.compile(r"^\s*(?:>|On\s.+wrote:|From:\s.+)$")


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return max(0.0, min(1.0, number))


def _as_list(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _normalize_match_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _contains_token(text: str, token: str) -> bool:
    if not text or not token:
        return False
    return bool(re.search(rf"\b{re.escape(token)}\b", text))


def _valid_due_date(value: Any) -> Optional[str]:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)).isoformat()
    except ValueError:
        return None


def _signal_key(*parts: Any) -> str:
    raw = ":".join(_clean_text(part).lower() for part in parts if _clean_text(part))
    return re.sub(r"[^a-z0-9]+", "-", raw).strip("-")[:180] or "email-signal"


def _substantive_text_length(text: str) -> int:
    """Count letters in non-trivial tokens, ignoring quoted reply chains and header markup."""
    body_only = "\n".join(
        line for line in (text or "").splitlines() if not _QUOTE_LINE_RE.match(line)
    )
    without_markers = re.sub(r"<[^>]+>|\[[^\]]+\]", " ", body_only)
    tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9'-]*", without_markers.lower())
    filler = {
        "ok",
        "okay",
        "thanks",
        "thank",
        "thx",
        "yes",
        "no",
        "sent",
        "got",
        "good",
        "regards",
        "sincerely",
    }
    return sum(len(token) for token in tokens if len(token) > 2 and token not in filler)


def parse_email_message(content: str) -> Dict[str, Any]:
    """Parse a single email row's content blob into headers + body.

    The Outlook ingestion path stores rows in the form::

        Subject: <subject>
        Date: <iso>
        From: <name> <email>
        To: <recipients>
        Cc: <recipients>
        <blank line>
        <body>

    Anything after the first blank line is treated as the body. We deliberately
    keep quoted reply chains intact in the raw body — the prompt tells the LLM
    to focus on the new content per message.
    """
    headers: Dict[str, str] = {}
    body_lines: List[str] = []
    in_body = False
    for raw_line in (content or "").splitlines():
        if not in_body and not raw_line.strip():
            in_body = True
            continue
        if in_body:
            body_lines.append(raw_line)
            continue
        match = _HEADER_RE.match(raw_line)
        if match:
            headers[match.group("key").lower()] = match.group("value").strip()
        else:
            # Header continuation (folded line) — append to last header if any.
            if headers:
                last_key = list(headers.keys())[-1]
                headers[last_key] = (headers[last_key] + " " + raw_line.strip()).strip()
    body = "\n".join(body_lines).strip()
    return {
        "subject": headers.get("subject", ""),
        "date": headers.get("date", ""),
        "from": headers.get("from", ""),
        "to": headers.get("to", ""),
        "cc": headers.get("cc", ""),
        "body": body,
    }


def _extract_email_address(value: str) -> Optional[str]:
    if not value:
        return None
    match = re.search(r"<([^>]+)>", value)
    if match:
        return match.group(1).strip().lower()
    if "@" in value:
        return value.strip().strip("<>").lower()
    return None


def _extract_display_name(value: str) -> str:
    if not value:
        return ""
    match = re.match(r"\s*([^<]+?)\s*<[^>]+>", value)
    if match:
        return match.group(1).strip().strip('"')
    return value.strip().strip('"')


def normalize_thread(
    head_doc: Dict[str, Any], thread_rows: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Build the structured thread payload that the LLM and writers consume.

    ``thread_rows`` must be sorted oldest-first by the caller.
    """
    parsed_messages: List[Dict[str, Any]] = []
    participants: Dict[str, str] = {}  # email → display name
    subjects: List[str] = []

    for index, row in enumerate(thread_rows):
        parsed = parse_email_message(row.get("content") or "")
        sender_email = _extract_email_address(parsed["from"]) or f"unknown-{index}"
        display = _extract_display_name(parsed["from"]) or sender_email
        participants.setdefault(sender_email, display)
        for recipient in re.split(r"[,;]", f"{parsed['to']},{parsed['cc']}"):
            email = _extract_email_address(recipient)
            if email:
                participants.setdefault(email, _extract_display_name(recipient) or email)
        if parsed["subject"]:
            subjects.append(parsed["subject"])

        truncated_body = parsed["body"]
        if len(truncated_body) > MAX_BODY_PER_MESSAGE:
            truncated_body = truncated_body[:MAX_BODY_PER_MESSAGE].rstrip() + "\n…[truncated]"

        parsed_messages.append(
            {
                "message_id": row.get("id"),
                "ordinal": index + 1,
                "timestamp": parsed["date"] or str(row.get("date") or ""),
                "from_email": sender_email,
                "from_display": display,
                "to": parsed["to"],
                "cc": parsed["cc"],
                "subject": parsed["subject"],
                "body": truncated_body,
            }
        )

    subject = head_doc.get("title") or ""
    if subject.startswith("Email: "):
        subject = subject[len("Email: ") :]
    if not subject and subjects:
        subject = subjects[-1]
    subject = re.sub(r"^(?:Re|Fw|Fwd):\s*", "", subject, flags=re.IGNORECASE).strip() or subject

    thread_lines: List[str] = []
    for message in parsed_messages:
        thread_lines.append(
            f"--- MESSAGE {message['ordinal']} | {message['timestamp']} "
            f"| from: {message['from_display']} <{message['from_email']}> "
            f"| to: {message['to']} ---"
        )
        thread_lines.append(message["body"])
        thread_lines.append("")

    thread_text = "\n".join(thread_lines).strip()
    head_date = head_doc.get("date")
    if isinstance(head_date, datetime):
        thread_date = head_date.date().isoformat()
    elif head_date:
        thread_date = str(head_date)[:10]
    else:
        thread_date = parsed_messages[-1]["timestamp"][:10] if parsed_messages else ""

    title_signals = [
        signal.strip(" -_:")
        for signal in re.split(r"[,/|]+", subject)
        if signal.strip(" -_:")
    ]

    return {
        "subject": subject or "Email thread",
        "date": thread_date,
        "participants": sorted(participants.values()),
        "participant_emails": sorted(participants.keys()),
        "message_count": len(parsed_messages),
        "message_ids": [m["message_id"] for m in parsed_messages],
        "head_message_id": head_doc.get("id"),
        "thread_text": thread_text,
        "substantive_length": _substantive_text_length(thread_text),
        "title": subject,
        "title_signals": title_signals,
        "messages": parsed_messages,
    }


def _fetch_projects(supabase) -> List[Dict[str, Any]]:
    response = (
        supabase.table("projects")
        .select("id, name, client, aliases, project_number")
        .execute()
    )
    return response.data or []


def _project_name(supabase, project_id: Optional[int], projects: Optional[List[Dict[str, Any]]] = None) -> Optional[str]:  # noqa: E501
    if not project_id:
        return None
    for project in projects or []:
        if int(project.get("id")) == int(project_id):
            return project.get("name")
    response = supabase.table("projects").select("id, name").eq("id", int(project_id)).limit(1).execute()
    rows = response.data or []
    return rows[0].get("name") if rows else None


def _title_candidates(projects: List[Dict[str, Any]], normalized: Dict[str, Any]) -> List[Dict[str, Any]]:
    title_text = _normalize_match_text(" ".join(normalized.get("title_signals") or []))
    candidates: List[Dict[str, Any]] = []
    for project in projects:
        project_id = project.get("id")
        if project_id is None:
            continue
        evidence: List[str] = []
        score = 0.0
        project_name = _normalize_match_text(project.get("name"))
        if project_name and project_name in title_text:
            evidence.append(str(project.get("name")))
            score = max(score, 0.95)
        client = _normalize_match_text(project.get("client"))
        if client and client in title_text:
            evidence.append(str(project.get("client")))
            score = max(score, 0.9)
        for alias in project.get("aliases") or []:
            alias_norm = _normalize_match_text(alias)
            if alias_norm and _contains_token(title_text, alias_norm):
                evidence.append(str(alias))
                score = max(score, 0.92 if len(alias_norm) <= 5 else 0.9)
        project_number = _normalize_match_text(project.get("project_number"))
        if project_number and _contains_token(title_text, project_number):
            evidence.append(str(project.get("project_number")))
            score = max(score, 0.94)
        if score > 0:
            candidates.append(
                {
                    "project_id": int(project_id),
                    "project_name": project.get("name"),
                    "confidence": score,
                    "method": "title_override",
                    "evidence_terms": sorted(set(evidence)),
                    "reasoning": "Email subject contains a direct project name, alias, client, or project number signal.",
                }
            )
    candidates.sort(key=lambda item: item["confidence"], reverse=True)
    return candidates


def attribute_project(
    supabase,
    head_doc_id: str,
    normalized: Dict[str, Any],
    existing_project_id: Optional[int],
    projects: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Email-specific project attribution. Subject overrides win when present."""
    if projects is None:
        projects = _fetch_projects(supabase)
    title_matches = _title_candidates(projects, normalized)
    if title_matches:
        best = title_matches[0]
        existing_int = int(existing_project_id) if existing_project_id else None
        is_correction = bool(existing_int and existing_int != best["project_id"])
        review_candidates = []
        if is_correction or len(title_matches) > 1:
            for candidate in title_matches:
                review_candidates.append(
                    {
                        **candidate,
                        "status": "pending_review",
                        "source_message_ids": normalized.get("message_ids") or [],
                    }
                )
        return {
            "project_id": best["project_id"],
            "project_name": best["project_name"],
            "confidence": best["confidence"],
            "method": "title_override",
            "evidence_terms": best["evidence_terms"],
            "candidates": review_candidates,
            "needs_review": is_correction or len(title_matches) > 1,
            "is_correction": is_correction,
        }

    inferred_id, method, confidence = infer_project_id(
        supabase,
        title=normalized.get("subject") or "",
        content=normalized.get("thread_text") or "",
        participants=normalized.get("participants") or [],
        existing_project_id=existing_project_id,
    )
    project_name = _project_name(supabase, inferred_id, projects)
    needs_review = not inferred_id or confidence < AUTO_ASSIGN_CONFIDENCE
    candidates: List[Dict[str, Any]] = []
    if inferred_id and needs_review:
        candidates.append(
            {
                "project_id": int(inferred_id),
                "project_name": project_name,
                "confidence": confidence,
                "method": method,
                "evidence_terms": [],
                "reasoning": "Existing project inference did not meet the auto-assignment threshold.",
                "status": "pending_review",
                "source_message_ids": normalized.get("message_ids") or [],
            }
        )

    return {
        "project_id": int(inferred_id) if inferred_id else None,
        "project_name": project_name,
        "confidence": float(confidence or 0),
        "method": method,
        "evidence_terms": [],
        "candidates": candidates,
        "needs_review": needs_review,
        "is_correction": False,
    }


def extract_intelligence(
    normalized: Dict[str, Any],
    attribution: Dict[str, Any],
    model: str = COMPILER_MODEL_DEFAULT,
) -> Dict[str, Any]:
    """Single LLM call returning structured email-thread intelligence."""
    thread_text = normalized.get("thread_text") or ""
    if len(thread_text) > MAX_LLM_THREAD_CHARS:
        logger.warning(
            "[EmailCompiler] Truncating thread for LLM from %d to %d chars",
            len(thread_text),
            MAX_LLM_THREAD_CHARS,
        )
        thread_text = thread_text[:MAX_LLM_THREAD_CHARS]
    token_estimate = len(thread_text) // 4
    selected_model = COMPILER_MODEL_LARGE if token_estimate > 2000 else model
    messages = build_email_extraction_messages(
        thread_text=thread_text,
        project_name=attribution.get("project_name"),
        subject=normalized.get("subject") or "Email thread",
        participants=normalized.get("participants") or [],
    )
    extracted = extract_with_retry(messages, model=selected_model)
    for key, default in (
        ("insights", []),
        ("tasks", []),
        ("risks", []),
        ("decisions", []),
        ("initiative_signals", []),
    ):
        if not isinstance(extracted.get(key), list):
            extracted[key] = default
    if not isinstance(extracted.get("sentiment"), dict):
        extracted["sentiment"] = None
    return extracted


def _append_tag(existing: Optional[str], tag: str) -> str:
    tags = [item.strip() for item in (existing or "").split(",") if item.strip()]
    if tag not in tags:
        tags.append(tag)
    return ",".join(tags)


def write_overview(supabase, head_doc_id: str, overview: str, attribution: Dict[str, Any]) -> None:
    update: Dict[str, Any] = {"overview": overview}
    can_assign = (
        attribution.get("project_id") is not None
        and _to_float(attribution.get("confidence")) >= AUTO_ASSIGN_CONFIDENCE
        and not attribution.get("is_correction")
        and not attribution.get("needs_review")
    )
    if can_assign:
        update["project_id"] = int(attribution["project_id"])
        if attribution.get("project_name"):
            update["project"] = attribution["project_name"]

    if attribution.get("method"):
        existing = (
            supabase.table("document_metadata")
            .select("tags")
            .eq("id", head_doc_id)
            .limit(1)
            .execute()
        )
        rows = existing.data or []
        update["tags"] = _append_tag(
            rows[0].get("tags") if rows else "",
            f"project_auto:{attribution['method']}",
        )

    supabase.table("document_metadata").update(update).eq("id", head_doc_id).execute()


def write_attribution_candidates(supabase, head_doc_id: str, candidates: List[Dict[str, Any]]) -> int:
    rows: List[Dict[str, Any]] = []
    for candidate in candidates:
        if not candidate.get("project_id"):
            continue
        confidence = _to_float(candidate.get("confidence"))
        rows.append(
            {
                "source_document_id": head_doc_id,
                "source_message_ids": candidate.get("source_message_ids") or [],
                "candidate_project_id": int(candidate["project_id"]),
                "candidate_project_name": candidate.get("project_name"),
                "confidence": confidence,
                "attribution_method": candidate.get("method") or candidate.get("attribution_method") or "unknown",
                "evidence_terms": candidate.get("evidence_terms") or [],
                "reasoning": candidate.get("reasoning"),
                "status": candidate.get("status") or "pending_review",
            }
        )
    if not rows:
        return 0
    rag_client = get_rag_write_client()
    rag_client.table("document_attribution_candidates").delete().eq("source_document_id", head_doc_id).execute()
    rag_client.table("document_attribution_candidates").insert(rows).execute()
    return len(rows)


def _insight_signal_type(insight_type: Any) -> str:
    value = str(insight_type or "").lower()
    mapping = {
        "schedule_risk": "schedule_risk",
        "financial_risk": "financial_exposure",
        "change_order_risk": "change_management",
        "procurement_risk": "risk",
        "field_coordination": "project_update",
        "client_relationship": "risk",
        "decision_needed": "open_question",
        "task": "task",
        "process_breakdown": "process_issue",
        "root_cause": "process_issue",
        "sentiment": "process_issue",
    }
    return mapping.get(value, "project_update")


def _risk_signal_type(risk_category: Any) -> str:
    value = str(risk_category or "").lower()
    if value == "schedule":
        return "schedule_risk"
    if value in {"cost", "cash_flow"}:
        return "financial_exposure"
    return "risk"


def _status_for_decision(value: Any) -> str:
    status = str(value or "").lower()
    if status == "decided":
        return "resolved"
    if status in {"blocked", "needs_approval"}:
        return "blocked"
    return "open"


def write_insight_cards(
    supabase,
    head_doc_id: str,
    insights: List[Dict[str, Any]],
    project_id: Optional[int],
) -> int:
    if not project_id:
        return 0
    rows: List[Dict[str, Any]] = []
    for insight in insights:
        if _to_float(insight.get("confidence")) < 0.8:
            continue
        if insight.get("target_type") and insight.get("target_type") != "client_project":
            continue
        summary = _clean_text(insight.get("summary"))
        if not summary:
            continue
        rows.append(
            {
                "project_id": int(project_id),
                "summary": summary,
                "detail": insight,
                "severity": insight.get("severity") or "info",
                "source_document_ids": [head_doc_id],
                "metadata": {
                    "compiler": "email_thread_compiler",
                    "source_message_ids": insight.get("source_message_ids") or [],
                    "insight_type": insight.get("insight_type"),
                },
            }
        )
    if not rows:
        return 0
    supabase.table("project_insights").insert(rows).execute()
    return len(rows)


def write_structured_insights(
    supabase,
    head_doc_id: str,
    items: List[Dict[str, Any]],
    project_id: Optional[int],
) -> int:
    rows: List[Dict[str, Any]] = []
    project_ids = [int(project_id)] if project_id else []
    for item in items:
        item_type = item.get("_compiler_type") or item.get("type")
        confidence = _to_float(item.get("confidence"), 0.8)
        if confidence < 0.7:
            continue
        if item_type == "risk":
            description = _clean_text(item.get("risk_title") or item.get("evidence"))
            owner_name = None
        elif item_type == "decision":
            description = _clean_text(item.get("decision_text"))
            owner_name = item.get("decider")
        elif item_type == "sentiment":
            description = _clean_text(item.get("sentiment_reason") or item.get("business_implication"))
            owner_name = None
        elif item_type == "initiative_signal":
            description = _clean_text(item.get("summary") or item.get("strategic_read"))
            owner_name = None
        else:
            description = _clean_text(item.get("description") or item.get("summary"))
            owner_name = item.get("owner_name")
        if not description:
            continue
        rows.append(
            {
                "metadata_id": head_doc_id,
                "project_id": int(project_id) if project_id else None,
                "project_ids": project_ids,
                "type": item_type,
                "description": description,
                "owner_name": owner_name,
                "status": "open",
                "details": item,
            }
        )
    if not rows:
        return 0
    supabase.table("insights").delete().eq("metadata_id", head_doc_id).execute()
    supabase.table("insights").insert(rows).execute()
    return len(rows)


def write_tasks(
    supabase,
    head_doc_id: str,
    tasks: List[Dict[str, Any]],
    project_id: Optional[int],
    extraction_model: str = COMPILER_MODEL_DEFAULT,
) -> int:
    rows: List[Dict[str, Any]] = []
    project_ids = [int(project_id)] if project_id else []
    resolver = TaskAssigneeResolver(supabase)
    for task in tasks:
        description = _clean_text(task.get("task_text") or task.get("description"))
        owner = _clean_text(task.get("owner"))
        if not description or not owner or task.get("needs_review") or _to_float(task.get("confidence")) < 0.7:
            continue
        assignee = resolver.resolve(owner, task.get("owner_email") or task.get("assignee_email"))
        # Only employees can own tasks. External owners surface as project
        # intelligence signals instead.
        if not assignee.is_employee:
            logger.info(
                "Skipping non-employee task: owner=%r person_type=%r description=%r",
                owner,
                assignee.person_type,
                description[:120],
            )
            continue
        rows.append(
            {
                "metadata_id": head_doc_id,
                "description": description,
                **assignee.row_values(),
                "assigned_by": _clean_text(task.get("assigned_by")),
                "due_date": _valid_due_date(task.get("due_date")),
                "priority": task.get("priority") or "medium",
                "status": "open",
                "source_system": "outlook_email",
                "file_name": task.get("source_message_id"),
                "project_id": int(project_id) if project_id else None,
                "project_ids": project_ids,
                "extraction_source": "email_compiler",
                "extraction_model": extraction_model,
                "extraction_prompt_version": TASK_EXTRACTION_PROMPT_VERSION,
                "extraction_metadata": {
                    "source_message_id": task.get("source_message_id"),
                    "confidence": _to_float(task.get("confidence")),
                    "needs_review": bool(task.get("needs_review")),
                    **assignee.metadata(),
                },
            }
        )
    if not rows:
        return 0
    supabase.table("tasks").upsert(rows, on_conflict="metadata_id,description").execute()
    return len(rows)


def _message_excerpt(messages: List[Dict[str, Any]], source_message_ids: List[str], fallback: str) -> str:
    if not source_message_ids:
        return fallback[:900]
    wanted = {str(mid) for mid in source_message_ids if mid}
    parts = [
        f"{m['from_display']}: {m['body']}"
        for m in messages
        if str(m.get("message_id")) in wanted
    ]
    return ("\n\n".join(parts) or fallback)[:900]


def _packet_signal_payloads(
    extracted: Dict[str, Any],
    messages: List[Dict[str, Any]],
    head_doc_id: str,
    source_occurred_at: Optional[str],
) -> List[Dict[str, Any]]:
    payloads: List[Dict[str, Any]] = []

    for insight in _as_list(extracted.get("insights")):
        if insight.get("target_type") and insight.get("target_type") != "client_project":
            continue
        confidence = _to_float(insight.get("confidence"), 0.0)
        if confidence < 0.7:
            continue
        source_message_ids = [str(item) for item in _as_list(insight.get("source_message_ids")) if item]
        summary = _clean_text(insight.get("summary"))
        if not summary:
            continue
        signal_type = _insight_signal_type(insight.get("insight_type"))
        payloads.append(
            {
                "signal_type": signal_type,
                "title": summary[:180],
                "summary": _clean_text(insight.get("strategic_read")) or summary,
                "why_it_matters": _clean_text(insight.get("why_it_matters")),
                "next_action": _clean_text(insight.get("recommended_action")),
                "confidence_score": confidence,
                "source_occurred_at": source_occurred_at,
                "excerpt": _message_excerpt(messages, source_message_ids, summary),
                "normalized_signal_key": _signal_key(head_doc_id, signal_type, source_message_ids, summary),
                "extraction_json": {**insight, "email_packet_source": "insights"},
            }
        )

    for risk in _as_list(extracted.get("risks")):
        confidence = _to_float(risk.get("confidence"), 0.0)
        if confidence < 0.7:
            continue
        title = _clean_text(risk.get("risk_title"))
        summary = _clean_text(risk.get("likely_impact") or risk.get("evidence"))
        if not title or not summary:
            continue
        signal_type = _risk_signal_type(risk.get("risk_category"))
        payloads.append(
            {
                "signal_type": signal_type,
                "title": title[:180],
                "summary": summary,
                "why_it_matters": _clean_text(risk.get("evidence")),
                "next_action": _clean_text(risk.get("recommended_action")),
                "confidence_score": confidence,
                "source_occurred_at": source_occurred_at,
                "excerpt": _clean_text(risk.get("evidence"))[:900],
                "normalized_signal_key": _signal_key(head_doc_id, signal_type, title),
                "extraction_json": {**risk, "email_packet_source": "risks"},
            }
        )

    for decision in _as_list(extracted.get("decisions")):
        confidence = _to_float(decision.get("confidence"), 0.0)
        if confidence < 0.7:
            continue
        summary = _clean_text(decision.get("decision_text"))
        if not summary:
            continue
        source_message_ids = [str(decision.get("source_message_id"))] if decision.get("source_message_id") else []
        payloads.append(
            {
                "signal_type": "decision",
                "title": summary[:180],
                "summary": _clean_text(decision.get("impact")) or summary,
                "why_it_matters": _clean_text(decision.get("impact")),
                "current_status": _status_for_decision(decision.get("decision_status")),
                "confidence_score": confidence,
                "source_occurred_at": source_occurred_at,
                "excerpt": _message_excerpt(messages, source_message_ids, summary),
                "normalized_signal_key": _signal_key(head_doc_id, "decision", source_message_ids, summary),
                "extraction_json": {**decision, "email_packet_source": "decisions"},
            }
        )

    for task in _as_list(extracted.get("tasks")):
        confidence = _to_float(task.get("confidence"), 0.0)
        summary = _clean_text(task.get("task_text") or task.get("description"))
        owner = _clean_text(task.get("owner"))
        if confidence < 0.7 or task.get("needs_review") or not summary:
            continue
        source_message_ids = [str(task.get("source_message_id"))] if task.get("source_message_id") else []
        payloads.append(
            {
                "signal_type": "task",
                "title": summary[:180],
                "summary": summary,
                "why_it_matters": "This is an explicit action item extracted from an email thread.",
                "next_action": summary,
                "suggested_owner_label": owner or None,
                "confidence_score": confidence,
                "source_occurred_at": source_occurred_at,
                "excerpt": _message_excerpt(messages, source_message_ids, summary),
                "normalized_signal_key": _signal_key(head_doc_id, "task", source_message_ids, summary),
                "extraction_json": {**task, "email_packet_source": "tasks"},
            }
        )

    sentiment = extracted.get("sentiment") if isinstance(extracted.get("sentiment"), dict) else None
    if sentiment:
        confidence = _to_float(sentiment.get("confidence"), 0.0)
        label = str(sentiment.get("sentiment") or "").lower()
        summary = _clean_text(sentiment.get("business_implication") or sentiment.get("sentiment_reason"))
        if confidence >= 0.8 and label in {"concerned", "frustrated", "urgent", "conflict"} and summary:
            payloads.append(
                {
                    "signal_type": "process_issue",
                    "title": f"Email sentiment: {label}"[:180],
                    "summary": summary,
                    "why_it_matters": _clean_text(sentiment.get("sentiment_reason")),
                    "confidence_score": confidence,
                    "source_occurred_at": source_occurred_at,
                    "excerpt": _clean_text(sentiment.get("sentiment_reason") or summary)[:900],
                    "normalized_signal_key": _signal_key(head_doc_id, "sentiment", label, summary),
                    "extraction_json": {**sentiment, "email_packet_source": "sentiment"},
                }
            )

    return payloads


def write_packet_first_signals(
    supabase,
    head_doc_id: str,
    extracted: Dict[str, Any],
    messages: List[Dict[str, Any]],
    project_id: Optional[int],
    source_occurred_at: Optional[str],
) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "signals_written": 0,
        "signals_promoted": 0,
        "packet_id": None,
        "target_id": None,
        "skipped_reason": None,
    }
    if not project_id:
        result["skipped_reason"] = "no high-confidence client project attribution"
        return result

    target = ensure_client_project_target(
        supabase,
        int(project_id),
        compiler_version=PACKET_COMPILER_VERSION,
    )
    target_id = target.get("id")
    result["target_id"] = target_id
    if not target_id:
        result["skipped_reason"] = "missing intelligence target"
        return result

    get_rag_write_client().table("source_signal_candidates").delete().eq(
        "source_document_id", head_doc_id
    ).eq("compiler_version", PACKET_COMPILER_VERSION).execute()

    promoted_refresh_job_ids: List[str] = []
    for payload in _packet_signal_payloads(extracted, messages, head_doc_id, source_occurred_at):
        candidate = write_source_signal_candidate(
            supabase,
            source_document_id=head_doc_id,
            target_id=target_id,
            project_id=int(project_id),
            compiler_version=PACKET_COMPILER_VERSION,
            **payload,
        )
        result["signals_written"] += 1
        if candidate.get("status") == "candidate":
            promotion = promote_signal_candidate(
                supabase,
                candidate["id"],
                compiler_version=PACKET_COMPILER_VERSION,
            )
            if promotion.get("status") == "promoted":
                result["signals_promoted"] += 1
                if promotion.get("packet_refresh_job_id"):
                    promoted_refresh_job_ids.append(promotion["packet_refresh_job_id"])

    if promoted_refresh_job_ids:
        packet = process_packet_refresh_job(
            supabase,
            promoted_refresh_job_ids[-1],
            compiler_version=PACKET_COMPILER_VERSION,
        )
        result["packet_id"] = packet.get("packet_id")
    elif result["signals_written"]:
        packet = compile_current_packet(
            supabase,
            target_id,
            compiler_version=PACKET_COMPILER_VERSION,
        )
        result["packet_id"] = packet.get("packet_id")

    return result


def _mark_status(
    supabase,
    doc_id: str,
    status: str,
    source_metadata: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
    head_doc_id: Optional[str] = None,
    thread_message_count: Optional[int] = None,
    role: Optional[str] = None,
) -> None:
    update: Dict[str, Any] = {"status": status}
    if source_metadata is not None:
        metadata = dict(source_metadata or {})
        compiler_metadata = dict(metadata.get(EMAIL_COMPILER_KEY) or {})
        compiler_metadata.update(
            {
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        if status == "compiled":
            compiler_metadata["compiled_at"] = compiler_metadata["updated_at"]
            compiler_metadata.pop("error", None)
        if error:
            compiler_metadata["error"] = error
        if head_doc_id:
            compiler_metadata["thread_head_id"] = head_doc_id
        if thread_message_count is not None:
            compiler_metadata["thread_message_count"] = thread_message_count
        if role:
            compiler_metadata["role"] = role
        metadata[EMAIL_COMPILER_KEY] = compiler_metadata
        update["source_metadata"] = metadata
    supabase.table("document_metadata").update(update).eq("id", doc_id).execute()


def _fetch_thread_rows(supabase, conversation_id: str) -> List[Dict[str, Any]]:
    """Fetch every email row that shares an Outlook ``conversation_id``.

    Sorted oldest-first so threads read in chronological order.
    """
    response = (
        supabase.table("document_metadata")
        .select(
            "id, title, project_id, project, tags, type, category, source_system, "
            "date, created_at, captured_at, source_metadata, status"
        )
        .eq("category", "email")
        .filter("source_metadata->>conversation_id", "eq", conversation_id)
        .order("date", desc=False)
        .order("created_at", desc=False)
        .execute()
    )
    return _hydrate_rag_thread_content(response.data or [])


def compile_thread(
    supabase,
    conversation_id: str,
    projects_cache: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Compile a single Outlook email thread (all rows sharing a conversation_id)."""
    result: Dict[str, Any] = {
        "conversation_id": conversation_id,
        "thread_head_id": None,
        "thread_message_count": 0,
        "status": "error",
        "overview_written": False,
        "project_assigned": False,
        "insight_cards_written": 0,
        "structured_insights_written": 0,
        "tasks_written": 0,
        "attribution_candidates_written": 0,
        "packet_signals_written": 0,
        "packet_signals_promoted": 0,
        "packet_id": None,
        "error": None,
    }
    stage = "fetch"
    head_doc: Dict[str, Any] = {}
    try:
        thread_rows = _fetch_thread_rows(supabase, conversation_id)
        if not thread_rows:
            result["error"] = f"no email rows found for conversation_id {conversation_id}"
            return result
        head_doc = thread_rows[-1]
        head_doc_id = head_doc["id"]
        result["thread_head_id"] = head_doc_id
        result["thread_message_count"] = len(thread_rows)

        stage = "normalize"
        normalized = normalize_thread(head_doc, thread_rows)
        if normalized["substantive_length"] < MIN_COMPILER_CHARS:
            for row in thread_rows:
                _mark_status(
                    supabase,
                    row["id"],
                    "skipped_low_content",
                    row.get("source_metadata"),
                    head_doc_id=head_doc_id,
                    thread_message_count=len(thread_rows),
                    role="head" if row["id"] == head_doc_id else "member",
                )
            result.update({"status": "skipped", "error": None})
            return result

        stage = "attribute"
        attribution = attribute_project(
            supabase,
            head_doc_id,
            normalized,
            head_doc.get("project_id"),
            projects=projects_cache,
        )

        stage = "extract"
        extracted = extract_intelligence(normalized, attribution)
        if extracted.get("_extraction_failed"):
            error_text = "LLM extraction failed: " + "; ".join(extracted.get("_errors") or [])
            for row in thread_rows:
                _mark_status(
                    supabase,
                    row["id"],
                    "error",
                    row.get("source_metadata"),
                    error_text,
                    head_doc_id=head_doc_id,
                    thread_message_count=len(thread_rows),
                    role="head" if row["id"] == head_doc_id else "member",
                )
            result["error"] = error_text
            return result

        overview = _clean_text(extracted.get("overview"))
        if not overview:
            raise RuntimeError("LLM extraction returned an empty overview")

        stage = "write"
        candidates_written = write_attribution_candidates(
            supabase,
            head_doc_id,
            attribution.get("candidates") or [],
        )
        write_overview(supabase, head_doc_id, overview, attribution)
        assigned_project_id: Optional[int] = None
        if (
            attribution.get("project_id") is not None
            and _to_float(attribution.get("confidence")) >= AUTO_ASSIGN_CONFIDENCE
            and not attribution.get("is_correction")
            and not attribution.get("needs_review")
        ):
            assigned_project_id = int(attribution["project_id"])

        insight_cards_written = write_insight_cards(
            supabase,
            head_doc_id,
            _as_list(extracted.get("insights")),
            assigned_project_id,
        )
        structured_items: List[Dict[str, Any]] = []
        structured_items.extend({**item, "_compiler_type": "risk"} for item in _as_list(extracted.get("risks")))
        structured_items.extend({**item, "_compiler_type": "decision"} for item in _as_list(extracted.get("decisions")))
        if extracted.get("sentiment"):
            structured_items.append({**extracted["sentiment"], "_compiler_type": "sentiment"})
        structured_items.extend(
            {**item, "_compiler_type": "initiative_signal"}
            for item in _as_list(extracted.get("initiative_signals"))
        )
        structured_insights_written = write_structured_insights(
            supabase,
            head_doc_id,
            structured_items,
            assigned_project_id,
        )
        tasks_written = write_tasks(
            supabase,
            head_doc_id,
            _as_list(extracted.get("tasks")),
            assigned_project_id,
            selected_model,
        )
        packet_result = write_packet_first_signals(
            supabase,
            head_doc_id,
            extracted,
            normalized.get("messages") or [],
            assigned_project_id,
            normalized.get("date"),
        )

        for row in thread_rows:
            _mark_status(
                supabase,
                row["id"],
                "compiled",
                row.get("source_metadata"),
                head_doc_id=head_doc_id,
                thread_message_count=len(thread_rows),
                role="head" if row["id"] == head_doc_id else "member",
            )

        result.update(
            {
                "status": "success",
                "overview_written": True,
                "project_assigned": assigned_project_id is not None,
                "insight_cards_written": insight_cards_written,
                "structured_insights_written": structured_insights_written,
                "tasks_written": tasks_written,
                "attribution_candidates_written": candidates_written,
                "packet_signals_written": packet_result.get("signals_written", 0),
                "packet_signals_promoted": packet_result.get("signals_promoted", 0),
                "packet_id": packet_result.get("packet_id"),
                "error": None,
            }
        )
        return result

    except Exception as exc:
        logger.error(
            "[EmailCompiler] Failed conversation_id=%s stage=%s error=%s",
            conversation_id,
            stage,
            exc,
            exc_info=True,
        )
        # Best-effort error status — only on the head doc to avoid cascading failure writes.
        try:
            if head_doc:
                _mark_status(
                    supabase,
                    head_doc["id"],
                    "error",
                    head_doc.get("source_metadata"),
                    f"{stage}: {exc}",
                    head_doc_id=head_doc.get("id"),
                )
        except Exception as status_exc:
            logger.error(
                "[EmailCompiler] Could not mark conversation_id=%s error: %s",
                conversation_id,
                status_exc,
            )
        result["error"] = f"{stage}: {exc}"
        return result


def _claim_pending_thread_ids(
    supabase,
    since_iso: Optional[str],
    batch_size: int,
) -> List[str]:
    """Return a batch of distinct conversation_ids that still need compilation.

    A thread is "pending" if no message in it has an
    ``email_compiler.status = 'compiled'`` entry. We filter at the SQL level for
    the date window, then group + filter pending in Python — the SQL
    ``->`` JSON path operator returns NULL for missing keys and Supabase's
    ``neq`` filter excludes NULLs, so a pure SQL filter would skip every
    never-compiled row.
    """
    query = (
        supabase.table("document_metadata")
        .select("source_metadata, date")
        .eq("category", "email")
        .eq("source_system", "outlook_email")
        .order("date", desc=True)
        # Page through enough rows to find ``batch_size`` distinct pending threads,
        # bounded so we never materialize the whole table.
        .limit(max(batch_size * 20, 500))
    )
    if since_iso:
        query = query.gte("date", since_iso)
    response = query.execute()
    rows = response.data or []

    compiled_threads: set[str] = set()
    candidates: List[str] = []
    seen_candidate: set[str] = set()
    for row in rows:
        meta = row.get("source_metadata") or {}
        conv_id = meta.get("conversation_id")
        if not conv_id:
            continue
        compiler_block = meta.get("email_compiler") or {}
        status = compiler_block.get("status") if isinstance(compiler_block, dict) else None
        if status == "compiled":
            compiled_threads.add(conv_id)
            continue
        if conv_id in seen_candidate:
            continue
        seen_candidate.add(conv_id)
        candidates.append(conv_id)

    # Drop any candidate whose thread has at least one already-compiled message.
    pending = [conv_id for conv_id in candidates if conv_id not in compiled_threads]
    return pending[:batch_size]


def run_email_compiler_batch(
    supabase,
    batch_size: int = 25,
    max_retries: int = 1,
    since_iso: Optional[str] = None,
    max_processing_time_ms: Optional[int] = None,
) -> Dict[str, Any]:
    """Process up to ``batch_size`` distinct email threads.

    ``since_iso`` (e.g. ``"2026-04-19T00:00:00Z"``) limits the candidate set to
    threads with at least one message on or after that date — used by the
    14-day backfill.
    """
    started = time.monotonic()
    max_processing_time_ms = max_processing_time_ms or int(
        os.getenv("EMAIL_COMPILER_BATCH_MAX_MS", "300000")
    )
    batch_size = max(1, min(int(batch_size or 25), 100))

    stats: Dict[str, Any] = {
        "total_threads": 0,
        "succeeded": 0,
        "failed": 0,
        "skipped": 0,
        "overview_written": 0,
        "insight_cards_written": 0,
        "structured_insights_written": 0,
        "tasks_written": 0,
        "attribution_candidates_written": 0,
        "packet_signals_written": 0,
        "packet_signals_promoted": 0,
        "failed_conversation_ids": [],
        "processing_time_ms": 0,
        "timed_out": False,
        "since": since_iso,
    }

    try:
        conversation_ids = _claim_pending_thread_ids(supabase, since_iso, batch_size)
    except Exception as exc:
        logger.error("[EmailCompiler] Failed to query pending threads: %s", exc)
        stats.update(
            {
                "failed": 1,
                "failed_conversation_ids": ["batch_query"],
                "processing_time_ms": int((time.monotonic() - started) * 1000),
            }
        )
        return stats

    try:
        projects_cache = _fetch_projects(supabase)
    except Exception as exc:
        logger.warning("[EmailCompiler] Could not pre-fetch projects: %s", exc)
        projects_cache = None

    for conv_id in conversation_ids:
        elapsed_ms = int((time.monotonic() - started) * 1000)
        if elapsed_ms >= max_processing_time_ms:
            logger.warning(
                "[EmailCompiler] Batch time limit reached after %d/%d threads",
                stats["total_threads"],
                len(conversation_ids),
            )
            stats["timed_out"] = True
            break
        stats["total_threads"] += 1
        result: Dict[str, Any] = {}
        for attempt in range(max_retries + 1):
            result = compile_thread(supabase, conv_id, projects_cache=projects_cache)
            if result.get("status") != "error":
                break
            logger.warning(
                "[EmailCompiler] Retryable failure conv_id=%s attempt=%d/%d error=%s",
                conv_id,
                attempt + 1,
                max_retries + 1,
                result.get("error"),
            )
        if result.get("status") == "success":
            stats["succeeded"] += 1
            stats["overview_written"] += 1 if result.get("overview_written") else 0
            stats["insight_cards_written"] += int(result.get("insight_cards_written") or 0)
            stats["structured_insights_written"] += int(result.get("structured_insights_written") or 0)
            stats["tasks_written"] += int(result.get("tasks_written") or 0)
            stats["attribution_candidates_written"] += int(result.get("attribution_candidates_written") or 0)
            stats["packet_signals_written"] += int(result.get("packet_signals_written") or 0)
            stats["packet_signals_promoted"] += int(result.get("packet_signals_promoted") or 0)
        elif result.get("status") == "skipped":
            stats["skipped"] += 1
        else:
            stats["failed"] += 1
            stats["failed_conversation_ids"].append(conv_id)

    stats["processing_time_ms"] = int((time.monotonic() - started) * 1000)
    return stats
