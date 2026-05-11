"""Teams direct-message conversation compiler."""

from __future__ import annotations

import logging
import os
import re
import time
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

try:
    from src.services.integrations.microsoft_graph.project_inference import infer_project_id
except ModuleNotFoundError:  # Allows backend-local scripts with sys.path.insert(0, "src").
    from services.integrations.microsoft_graph.project_inference import infer_project_id

from .client import COMPILER_MODEL_DEFAULT, COMPILER_MODEL_LARGE, extract_with_retry
from .compiler import (
    compile_current_packet,
    ensure_client_project_target,
    process_packet_refresh_job,
    promote_signal_candidate,
    write_source_signal_candidate,
)
from .prompts import build_extraction_messages
from ..task_assignees import TaskAssigneeResolver

logger = logging.getLogger(__name__)

TASK_EXTRACTION_PROMPT_VERSION = "teams_compiler.tasks.v2.gpt-5.5"

MIN_COMPILER_CHARS = 200
AUTO_ASSIGN_CONFIDENCE = 0.85
TITLE_OVERRIDE_CONFIDENCE = 0.9
MAX_LLM_CONVERSATION_CHARS = 6000
PACKET_COMPILER_VERSION = "teams_conversation_compiler_v0_1"

_MESSAGE_RE = re.compile(
    r"^\[message:(?P<id>[^\]]+)\]\s+\[(?P<ts>[^\]]+)\]\s+(?P<sender>[^:]+):\s*(?P<text>.*)$"
)


def _substantive_text_length(text: str) -> int:
    without_markers = re.sub(r"\[[^\]]+\]", " ", text)
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
        "done",
        "got",
        "good",
    }
    return sum(len(token) for token in tokens if len(token) > 2 and token not in filler)


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
    return re.sub(r"[^a-z0-9]+", "-", raw).strip("-")[:180] or "teams-signal"


def _message_excerpt(messages: List[Dict[str, str]], source_message_ids: List[str], fallback: str) -> str:
    if not source_message_ids:
        return fallback[:900]
    wanted = set(source_message_ids)
    lines = [
        f"{message['sender']}: {message['text']}"
        for message in messages
        if message.get("message_id") in wanted
    ]
    return ("\n".join(lines) or fallback)[:900]


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


def parse_conversation_messages(content: str) -> List[Dict[str, str]]:
    """
    Parse raw Teams DM content into message objects.

    Multi-line continuations are appended to the previous message. Malformed
    content returns an empty list so callers can fail loudly without throwing
    parser exceptions.
    """
    messages: List[Dict[str, str]] = []
    current: Optional[Dict[str, str]] = None

    for raw_line in (content or "").splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue
        match = _MESSAGE_RE.match(line)
        if match:
            if current:
                messages.append(current)
            timestamp = match.group("ts").replace(" ", "T", 1)
            current = {
                "message_id": match.group("id").strip(),
                "timestamp": timestamp,
                "sender": match.group("sender").strip(),
                "text": match.group("text").strip(),
            }
            continue

        if current and not line.startswith("[Teams Direct Message Conversation:") and not line.startswith("Date:"):
            current["text"] = f"{current['text']}\n{line.strip()}".strip()

    if current:
        messages.append(current)

    return [message for message in messages if message["message_id"] and message["text"]]


def normalize_conversation(doc: Dict[str, Any], messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Extract structured metadata from a document row and parsed messages."""
    content = doc.get("content") or ""
    title = doc.get("title") or ""
    header_match = re.search(r"^\[Teams Direct Message Conversation:\s*(?P<name>[^\]]+)\]", content, re.M)
    if header_match:
        chat_name = header_match.group("name").strip()
    else:
        chat_name = re.sub(r"^Teams DM Conversation:\s*", "", title).strip() or "Unknown Teams DM"

    date_match = re.search(r"^Date:\s*(?P<date>\d{4}-\d{2}-\d{2})", content, re.M)
    conversation_date = date_match.group("date") if date_match else str(doc.get("date") or "")[:10]
    participants = sorted({message["sender"] for message in messages if message.get("sender")})
    conversation_lines = [
        f"{message['sender']} ({message['timestamp']}): {message['text']}"
        for message in messages
    ]
    signal_text = f"{title} {chat_name}"
    title_signals = [
        signal.strip(" -_:")
        for signal in re.split(r"[,/|]+", signal_text)
        if signal.strip(" -_:")
    ]

    return {
        "chat_name": chat_name,
        "date": conversation_date,
        "participants": participants,
        "message_count": len(messages),
        "message_ids": [message["message_id"] for message in messages],
        "substantive_length": _substantive_text_length(content),
        "conversation_text": "\n".join(conversation_lines),
        "title": title,
        "title_signals": title_signals,
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


def _project_terms(project: Dict[str, Any]) -> List[str]:
    terms = [project.get("name"), project.get("client"), project.get("project_number")]
    terms.extend(project.get("aliases") or [])
    return [_clean_text(term) for term in terms if _clean_text(term)]


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
                    "reasoning": "Conversation title contains a direct project name, alias, client, or project-number signal.",
                }
            )
    candidates.sort(key=lambda item: item["confidence"], reverse=True)
    return candidates


def attribute_project(
    supabase,
    doc_id: str,
    normalized: Dict[str, Any],
    existing_project_id: Optional[int],
    projects: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Run Teams-specific project attribution with title override protection."""
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
        title=normalized.get("title") or normalized.get("chat_name") or "",
        content=normalized.get("conversation_text") or "",
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
    conversation_text: str,
    normalized: Dict[str, Any],
    attribution: Dict[str, Any],
    model: str = COMPILER_MODEL_DEFAULT,
) -> Dict[str, Any]:
    """Extract all Teams intelligence in one LLM call."""
    llm_text = conversation_text or ""
    if len(llm_text) > MAX_LLM_CONVERSATION_CHARS:
        logger.warning(
            "[TeamsCompiler] Truncating conversation for LLM from %d to %d chars",
            len(llm_text),
            MAX_LLM_CONVERSATION_CHARS,
        )
        llm_text = llm_text[:MAX_LLM_CONVERSATION_CHARS]
    token_estimate = len(llm_text) // 4
    selected_model = COMPILER_MODEL_LARGE if token_estimate > 2000 else model
    messages = build_extraction_messages(
        conversation_text=llm_text,
        project_name=attribution.get("project_name"),
        chat_name=normalized.get("chat_name") or "Unknown Teams DM",
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


def write_overview(supabase, doc_id: str, overview: str, attribution: Dict[str, Any]) -> None:
    """Update document_metadata with overview and safe high-confidence attribution."""
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
            .eq("id", doc_id)
            .limit(1)
            .execute()
        )
        rows = existing.data or []
        update["tags"] = _append_tag(
            rows[0].get("tags") if rows else "",
            f"project_auto:{attribution['method']}",
        )

    supabase.table("document_metadata").update(update).eq("id", doc_id).execute()


def write_attribution_candidates(supabase, doc_id: str, candidates: List[Dict[str, Any]]) -> int:
    """Write uncertain or correction attribution candidates."""
    rows = []
    for candidate in candidates:
        if not candidate.get("project_id"):
            continue
        confidence = _to_float(candidate.get("confidence"))
        rows.append(
            {
                "source_document_id": doc_id,
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
    # Remove stale candidates before inserting — prevents duplicates when a document
    # is retried or recompiled (no unique constraint exists on this table).
    supabase.table("document_attribution_candidates").delete().eq("source_document_id", doc_id).execute()
    supabase.table("document_attribution_candidates").insert(rows).execute()
    return len(rows)


def write_insight_cards(
    supabase,
    doc_id: str,
    insights: List[Dict[str, Any]],
    project_id: Optional[int],
) -> int:
    """Write high-confidence project insight cards."""
    if not project_id:
        return 0
    rows = []
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
                "source_document_ids": [doc_id],
                "metadata": {
                    "compiler": "teams_conversation_compiler",
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
    doc_id: str,
    items: List[Dict[str, Any]],
    project_id: Optional[int],
) -> int:
    """Write risks, decisions, sentiment, and initiative signals to insights."""
    rows = []
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
                "metadata_id": doc_id,
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
    # DELETE + INSERT rather than upsert: the insights table has no unique constraint
    # on (metadata_id, type, description), and description text can exceed btree's key
    # size limit making a constraint impractical. Recompilation is idempotent because
    # compile_conversation always rebuilds from source content.
    supabase.table("insights").delete().eq("metadata_id", doc_id).execute()
    supabase.table("insights").insert(rows).execute()
    return len(rows)


def write_tasks(
    supabase,
    doc_id: str,
    tasks: List[Dict[str, Any]],
    project_id: Optional[int],
    extraction_model: str = COMPILER_MODEL_DEFAULT,
) -> int:
    """Write clear action items to the tasks table."""
    rows = []
    project_ids = [int(project_id)] if project_id else []
    resolver = TaskAssigneeResolver(supabase)
    for task in tasks:
        description = _clean_text(task.get("task_text") or task.get("description"))
        owner = _clean_text(task.get("owner"))
        if not description or not owner or task.get("needs_review") or _to_float(task.get("confidence")) < 0.7:
            continue
        assignee = resolver.resolve(owner, task.get("owner_email") or task.get("assignee_email"))
        rows.append(
            {
                "metadata_id": doc_id,
                "description": description,
                **assignee.row_values(),
                "assigned_by": _clean_text(task.get("assigned_by")),
                "due_date": _valid_due_date(task.get("due_date")),
                "priority": task.get("priority") or "medium",
                "status": "open",
                "source_system": "microsoft_teams",
                "file_name": task.get("source_message_id"),
                "project_id": int(project_id) if project_id else None,
                "project_ids": project_ids,
                "extraction_source": "teams_compiler",
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
    supabase.table("tasks").upsert(
        rows,
        on_conflict="metadata_id,description",
    ).execute()
    return len(rows)


def _packet_signal_payloads(
    extracted: Dict[str, Any],
    messages: List[Dict[str, str]],
    doc_id: str,
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
                "normalized_signal_key": _signal_key(doc_id, signal_type, source_message_ids, summary),
                "extraction_json": {**insight, "teams_packet_source": "insights"},
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
                "normalized_signal_key": _signal_key(doc_id, signal_type, title),
                "extraction_json": {**risk, "teams_packet_source": "risks"},
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
                "normalized_signal_key": _signal_key(doc_id, "decision", source_message_ids, summary),
                "extraction_json": {**decision, "teams_packet_source": "decisions"},
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
                "why_it_matters": "This is an explicit action item extracted from a Teams conversation.",
                "next_action": summary,
                "suggested_owner_label": owner or None,
                "confidence_score": confidence,
                "source_occurred_at": source_occurred_at,
                "excerpt": _message_excerpt(messages, source_message_ids, summary),
                "normalized_signal_key": _signal_key(doc_id, "task", source_message_ids, summary),
                "extraction_json": {**task, "teams_packet_source": "tasks"},
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
                    "title": f"Teams sentiment: {label}"[:180],
                    "summary": summary,
                    "why_it_matters": _clean_text(sentiment.get("sentiment_reason")),
                    "confidence_score": confidence,
                    "source_occurred_at": source_occurred_at,
                    "excerpt": _clean_text(sentiment.get("sentiment_reason") or summary)[:900],
                    "normalized_signal_key": _signal_key(doc_id, "sentiment", label, summary),
                    "extraction_json": {**sentiment, "teams_packet_source": "sentiment"},
                }
            )

    return payloads


def write_packet_first_signals(
    supabase,
    doc_id: str,
    extracted: Dict[str, Any],
    messages: List[Dict[str, str]],
    project_id: Optional[int],
    source_occurred_at: Optional[str],
) -> Dict[str, Any]:
    """Write Teams LLM extraction into packet-first intelligence tables."""
    result = {
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

    supabase.table("source_signal_candidates").delete().eq(
        "source_document_id", doc_id
    ).eq("compiler_version", PACKET_COMPILER_VERSION).execute()

    promoted_refresh_job_ids: List[str] = []
    for payload in _packet_signal_payloads(extracted, messages, doc_id, source_occurred_at):
        candidate = write_source_signal_candidate(
            supabase,
            source_document_id=doc_id,
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
) -> None:
    update: Dict[str, Any] = {"status": status}
    if source_metadata is not None:
        metadata = dict(source_metadata or {})
        compiler_metadata = dict(metadata.get("teams_compiler") or {})
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
        metadata["teams_compiler"] = compiler_metadata
        update["source_metadata"] = metadata
    supabase.table("document_metadata").update(update).eq("id", doc_id).execute()


def compile_conversation(
    supabase,
    doc_id: str,
    projects_cache: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Compile a single teams_dm_conversation document."""
    result = {
        "doc_id": doc_id,
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
    try:
        response = (
            supabase.table("document_metadata")
            .select("id, title, content, participants, date, project_id, project, tags, type, source_metadata")
            .eq("id", doc_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            result["error"] = "document_metadata row not found"
            return result
        doc = rows[0]
        if doc.get("type") != "teams_dm_conversation":
            result.update({"status": "skipped", "error": "document is not a teams_dm_conversation"})
            return result

        content = doc.get("content") or ""
        if _substantive_text_length(content) < MIN_COMPILER_CHARS:
            _mark_status(supabase, doc_id, "skipped_low_content", doc.get("source_metadata"))
            result.update({"status": "skipped", "error": None})
            return result

        stage = "parse"
        messages = parse_conversation_messages(content)
        if not messages:
            raise RuntimeError("no parseable Teams message rows found in document content")

        stage = "normalize"
        normalized = normalize_conversation(doc, messages)

        stage = "attribute"
        attribution = attribute_project(
            supabase,
            doc_id,
            normalized,
            doc.get("project_id"),
            projects=projects_cache,
        )

        stage = "extract"
        extracted = extract_intelligence(
            normalized["conversation_text"],
            normalized,
            attribution,
        )
        if extracted.get("_extraction_failed"):
            _mark_status(
                supabase,
                doc_id,
                "error",
                doc.get("source_metadata"),
                "LLM extraction failed: " + "; ".join(extracted.get("_errors") or []),
            )
            result["error"] = "LLM extraction failed: " + "; ".join(extracted.get("_errors") or [])
            return result

        overview = _clean_text(extracted.get("overview"))
        if not overview:
            raise RuntimeError("LLM extraction returned an empty overview")

        stage = "write"
        candidates_written = write_attribution_candidates(
            supabase,
            doc_id,
            attribution.get("candidates") or [],
        )
        write_overview(supabase, doc_id, overview, attribution)
        assigned_project_id = None
        if (
            attribution.get("project_id") is not None
            and _to_float(attribution.get("confidence")) >= AUTO_ASSIGN_CONFIDENCE
            and not attribution.get("is_correction")
            and not attribution.get("needs_review")
        ):
            assigned_project_id = int(attribution["project_id"])

        insight_cards_written = write_insight_cards(
            supabase,
            doc_id,
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
            doc_id,
            structured_items,
            assigned_project_id,
        )
        tasks_written = write_tasks(
            supabase,
            doc_id,
            _as_list(extracted.get("tasks")),
            assigned_project_id,
            selected_model,
        )
        packet_result = write_packet_first_signals(
            supabase,
            doc_id,
            extracted,
            messages,
            assigned_project_id,
            normalized.get("date"),
        )

        _mark_status(supabase, doc_id, "compiled", doc.get("source_metadata"))
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
            "[TeamsCompiler] Failed doc_id=%s stage=%s error=%s",
            doc_id,
            stage,
            exc,
            exc_info=True,
        )
        try:
            _mark_status(supabase, doc_id, "error", error=f"{stage}: {exc}")
        except Exception as status_exc:
            logger.error("[TeamsCompiler] Could not mark doc_id=%s error: %s", doc_id, status_exc)
        result["error"] = f"{stage}: {exc}"
        return result


def run_compiler_batch(
    supabase,
    batch_size: int = 25,
    max_retries: int = 2,
    target_status: Optional[List[str]] = None,
    max_processing_time_ms: Optional[int] = None,
) -> Dict[str, Any]:
    """Process a bounded batch of Teams DM conversation documents."""
    started = time.monotonic()
    max_processing_time_ms = max_processing_time_ms or int(
        os.getenv("TEAMS_COMPILER_BATCH_MAX_MS", "170000")
    )
    # Default runs only pick rows that have not completed the Teams compiler.
    # A manual caller can pass target_status explicitly for repair/retry work.
    statuses = target_status or ["raw_ingested", "embedded"]
    batch_size = max(1, min(int(batch_size or 25), 50))
    stats = {
        "total_processed": 0,
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
        "failed_doc_ids": [],
        "processing_time_ms": 0,
        "timed_out": False,
    }

    try:
        # Order by conversation date (date column) so the batch always processes
        # the most recent conversations first, regardless of ingestion order.
        response = (
            supabase.table("document_metadata")
            .select("id")
            .eq("type", "teams_dm_conversation")
            .in_("status", statuses)
            .or_("overview.is.null,overview.eq.")
            .order("date", desc=True)
            .limit(batch_size)
            .execute()
        )
        docs = response.data or []
    except Exception as exc:
        logger.error("[TeamsCompiler] Failed to query batch: %s", exc)
        stats.update({"failed": 1, "failed_doc_ids": ["batch_query"], "processing_time_ms": int((time.monotonic() - started) * 1000)})
        return stats

    # Fetch projects once for the entire batch — avoids N+1 SELECT per document.
    try:
        projects_cache = _fetch_projects(supabase)
    except Exception as exc:
        logger.warning("[TeamsCompiler] Could not pre-fetch projects, will fetch per-doc: %s", exc)
        projects_cache = None

    for doc in docs:
        elapsed_ms = int((time.monotonic() - started) * 1000)
        if elapsed_ms >= max_processing_time_ms:
            logger.warning(
                "[TeamsCompiler] Batch time limit reached after %d/%d docs (%d ms)",
                stats["total_processed"],
                len(docs),
                elapsed_ms,
            )
            stats["timed_out"] = True
            break
        doc_id = doc.get("id")
        if not doc_id:
            continue
        stats["total_processed"] += 1
        result: Dict[str, Any] = {}
        for attempt in range(max_retries + 1):
            result = compile_conversation(supabase, doc_id, projects_cache=projects_cache)
            if result.get("status") != "error":
                break
            logger.warning(
                "[TeamsCompiler] Retryable failure doc_id=%s attempt=%d/%d error=%s",
                doc_id,
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
            stats["failed_doc_ids"].append(doc_id)

    stats["processing_time_ms"] = int((time.monotonic() - started) * 1000)
    return stats
