"""Domain-level packet compiler for company_process intelligence targets.

Unlike compile_current_packet (project-coupled, signal-candidate driven), this
compiler synthesizes cross-project communications into a domain packet by:

  1. Filtering document_metadata by keywords from the target's
     metadata.source_filters
  2. Asking an LLM to produce an executive synthesis + structured recurring
     findings
  3. Upserting insight_cards by a stable finding_key — incrementing
     first_seen_at / last_seen_at / source_count across runs so recurring
     issues are tracked over time
  4. Writing the intelligence_packets row (packet_type='current') and linking
     cards via intelligence_packet_cards
  5. Recording evidence rows that point at the source documents used

Targets live in MAIN; this compiler writes everything to MAIN.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from ..ai_transport import get_openai_client

logger = logging.getLogger(__name__)

DOMAIN_COMPILER_VERSION = "domain_compiler_v0_1"
DEFAULT_LOOKBACK_DAYS = int(os.getenv("DOMAIN_PACKET_LOOKBACK_DAYS", "60"))
DEFAULT_DOC_LIMIT = int(os.getenv("DOMAIN_PACKET_DOC_LIMIT", "150"))
DEFAULT_MODEL = os.getenv("DOMAIN_PACKET_MODEL", "gpt-5.4-mini")
DOC_SNIPPET_CHARS = 1800
TOTAL_PROMPT_DOC_CHARS = 80_000


# ---------------------------------------------------------------------------
# OpenAI client
# ---------------------------------------------------------------------------

def _openai_client() -> Tuple[Any, str, str]:
    client = get_openai_client()
    return client, DEFAULT_MODEL, "OpenAI direct"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _single(response: Any) -> Optional[Dict[str, Any]]:
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def _rows(response: Any) -> List[Dict[str, Any]]:
    return getattr(response, "data", None) or []


def _coerce_metadata(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except (json.JSONDecodeError, ValueError):
            return {}
    return {}


def _fetch_target(supabase: Any, target_id: str) -> Dict[str, Any]:
    row = _single(
        supabase.table("intelligence_targets")
        .select("id, name, slug, target_type, status, description, metadata, last_signal_at")
        .eq("id", target_id)
        .limit(1)
        .execute()
    )
    if not row:
        raise ValueError(f"intelligence_targets row not found: {target_id}")
    if row.get("target_type") != "company_process":
        raise ValueError(
            f"Target {target_id} has target_type={row.get('target_type')}; "
            "domain compiler only handles company_process"
        )
    return row


# ---------------------------------------------------------------------------
# Source document selection
# ---------------------------------------------------------------------------

def _fetch_domain_documents(
    supabase: Any,
    target: Dict[str, Any],
    *,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    limit: int = DEFAULT_DOC_LIMIT,
) -> List[Dict[str, Any]]:
    """Fetch document_metadata rows whose searchable fields match domain filters."""
    filters = _coerce_metadata(target.get("metadata")).get("source_filters") or {}
    keywords: List[str] = filters.get("keywords") or []
    meeting_titles: List[str] = filters.get("meeting_titles") or []
    if not keywords and not meeting_titles:
        logger.warning(
            "[domain_compiler] target %s has no source_filters.keywords or meeting_titles — skipping",
            target.get("slug"),
        )
        return []

    cutoff_iso = _iso(_utc_now() - timedelta(days=lookback_days))
    select_cols = (
        "id, title, summary, overview, content, action_items, "
        "category, source, document_type, project_id, project, "
        "participants_array, participants, date, captured_at, created_at"
    )

    # Postgrest .or_() requires a string of comma-separated filters. Each keyword
    # contributes `summary.ilike.*kw*,content.ilike.*kw*,title.ilike.*kw*,...`.
    # We OR everything into a single query for efficiency.
    or_clauses: List[str] = []
    fields = ("title", "summary", "overview", "content", "action_items")
    for kw in keywords:
        safe = kw.replace(",", " ").replace("%", " ")
        for field in fields:
            or_clauses.append(f"{field}.ilike.%{safe}%")
    for mt in meeting_titles:
        safe = mt.replace(",", " ").replace("%", " ")
        or_clauses.append(f"title.ilike.%{safe}%")

    if not or_clauses:
        return []

    query = (
        supabase.table("document_metadata")
        .select(select_cols)
        .or_(",".join(or_clauses))
        .gte("date", cutoff_iso[:10])
        .order("date", desc=True)
        .limit(limit)
    )
    try:
        rows = _rows(query.execute())
    except Exception as exc:
        # If `date` is null on many rows the index won't help — fall back to captured_at.
        logger.warning("[domain_compiler] date-ordered query failed (%s); retrying via captured_at", exc)
        rows = _rows(
            supabase.table("document_metadata")
            .select(select_cols)
            .or_(",".join(or_clauses))
            .gte("captured_at", cutoff_iso)
            .order("captured_at", desc=True)
            .limit(limit)
            .execute()
        )
    logger.info(
        "[domain_compiler] fetched %d documents for target=%s lookback=%dd",
        len(rows),
        target.get("slug"),
        lookback_days,
    )
    return rows


def _doc_snippet(doc: Dict[str, Any]) -> str:
    """Compact text representation of a document for the synthesis prompt."""
    parts: List[str] = []
    title = doc.get("title") or "(untitled)"
    date = doc.get("date") or (doc.get("captured_at") or "")[:10]
    category = doc.get("category") or doc.get("document_type") or "document"
    parts.append(f"[{doc['id']}] {date} · {category} · {title}")
    for field in ("summary", "overview", "action_items", "content"):
        val = doc.get(field)
        if val:
            text = str(val).strip()
            if not text:
                continue
            if field == "content" and len(text) > 1200:
                text = text[:1200]
            parts.append(f"{field}: {text}")
            if sum(len(p) for p in parts) > DOC_SNIPPET_CHARS:
                break
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# LLM synthesis
# ---------------------------------------------------------------------------

ALLOWED_CARD_TYPES = {
    "risk",
    "decision",
    "blocker",
    "task",
    "product_need",
    "process_issue",
    "project_update",
    "open_question",
    "requirement",
    "financial_exposure",
    "change_management",
    "schedule_risk",
    "sentiment",
    "initiative_signal",
}

SYSTEM_PROMPT = (
    "You are a senior operating-executive analyst at Alleato, a $24M+ general "
    "contractor. You synthesize cross-project communications about a single "
    "business domain (e.g. accounting, operations) into an intelligence packet "
    "that the CEO and domain leads can read in 60 seconds.\n\n"
    "STRICT RULES:\n"
    "- Every finding MUST be grounded in the supplied documents. Never invent "
    "  meetings, quotes, dollar amounts, dates, contract numbers, or people.\n"
    "- Attribution of qualitative statements to people IS allowed when the "
    "  document explicitly contains that person's name in that context.\n"
    "- Editorial judgment IS expected — synthesize patterns, name root causes, "
    "  flag what's structurally broken vs. what's a one-off.\n"
    "- If multiple documents describe the same underlying issue, treat them "
    "  as ONE finding with multiple evidence items — not separate findings.\n"
    "- Pick a stable `finding_key` for each finding so the same issue is "
    "  recognized across packet refreshes (e.g. 'ap-ceo-approval-bottleneck'). "
    "  Use lowercase, hyphen-separated, durable phrasing.\n"
    "Return strict JSON matching the schema."
)


def _build_synthesis_prompt(target: Dict[str, Any], docs: List[Dict[str, Any]]) -> str:
    snippets: List[str] = []
    total = 0
    for doc in docs:
        snippet = _doc_snippet(doc)
        total += len(snippet)
        if total > TOTAL_PROMPT_DOC_CHARS:
            break
        snippets.append(snippet)

    schema_hint = {
        "executive_summary": "string — 2-4 sentence headline of the domain right now",
        "current_status": "string — one-paragraph state of the function today",
        "strategic_read": "string — what this means for leadership, with editorial judgment",
        "why_it_matters": "string — why a CEO should care this week",
        "recommended_next_moves": ["string — concrete actions, max 5"],
        "findings": [
            {
                "finding_key": "string — stable lowercase-hyphen slug for dedup across runs",
                "title": "string — short title of the recurring issue or pattern",
                "summary": "string — 1-3 sentences describing the finding",
                "why_it_matters": "string — impact / risk / opportunity",
                "card_type": "one of: " + ", ".join(sorted(ALLOWED_CARD_TYPES)),
                "confidence": "high | medium | low",
                "next_action": "string or null",
                "evidence_doc_ids": ["uuid strings from the document list above"],
            }
        ],
    }

    return (
        f"DOMAIN: {target['name']} (slug={target['slug']})\n"
        f"DESCRIPTION: {target.get('description') or ''}\n\n"
        f"DOCUMENTS ({len(snippets)} of {len(docs)} included):\n"
        + "\n---\n".join(snippets)
        + "\n\nReturn JSON with this schema:\n"
        + json.dumps(schema_hint, indent=2)
    )


def _call_synthesis(prompt: str) -> Dict[str, Any]:
    """Call the LLM and return parsed JSON.

    AI Gateway does not currently accept `response_format` for all models, so we
    instruct the model to return raw JSON in the prompt and strip markdown code
    fences from the response (mirroring task_extraction.py).
    """
    client, model_id, provider_label = _openai_client()
    logger.info("[domain_compiler] calling %s via %s", model_id, provider_label)
    response = client.chat.completions.create(
        model=model_id,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": prompt
                + "\n\nReturn ONLY the JSON object — no prose, no commentary, no markdown code fences.",
            },
        ],
        temperature=0.3,
    )
    raw = (response.choices[0].message.content or "").strip()
    cleaned = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Synthesis returned invalid JSON: {exc}; head: {cleaned[:500]}") from exc


# ---------------------------------------------------------------------------
# Card upsert (recurring-issue tracking)
# ---------------------------------------------------------------------------

def _find_existing_card_by_key(
    supabase: Any,
    target_id: str,
    finding_key: str,
) -> Optional[Dict[str, Any]]:
    rows = _rows(
        supabase.table("insight_cards")
        .select("*")
        .eq("primary_target_id", target_id)
        .execute()
    )
    for row in rows:
        meta = _coerce_metadata(row.get("metadata"))
        if meta.get("finding_key") == finding_key:
            return row
    return None


def _normalize_card_type(value: Optional[str]) -> str:
    if value and value in ALLOWED_CARD_TYPES:
        return value
    return "process_issue"


def _normalize_confidence(value: Optional[str]) -> str:
    if value in ("high", "medium", "low"):
        return value
    return "medium"


def _upsert_finding(
    supabase: Any,
    target_id: str,
    finding: Dict[str, Any],
    docs_by_id: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    finding_key = (finding.get("finding_key") or "").strip().lower()
    if not finding_key:
        raise ValueError("finding is missing finding_key")
    now_iso = _iso(_utc_now())

    evidence_ids: List[str] = []
    for did in finding.get("evidence_doc_ids") or []:
        if isinstance(did, str) and did in docs_by_id:
            evidence_ids.append(did)
    source_count = len(evidence_ids)

    existing = _find_existing_card_by_key(supabase, target_id, finding_key)
    base_payload = {
        "primary_target_id": target_id,
        "title": finding.get("title") or finding_key,
        "card_type": _normalize_card_type(finding.get("card_type")),
        "summary": finding.get("summary") or "",
        "why_it_matters": finding.get("why_it_matters"),
        "current_status": "open",
        "confidence": _normalize_confidence(finding.get("confidence")),
        "attribution_status": "auto_assigned",
        "next_action": finding.get("next_action"),
        "compiler_version": DOMAIN_COMPILER_VERSION,
        "last_seen_at": now_iso,
        "updated_at": now_iso,
    }

    if existing:
        existing_meta = _coerce_metadata(existing.get("metadata"))
        merged_meta = {
            **existing_meta,
            "finding_key": finding_key,
            "last_synthesis_at": now_iso,
            "last_evidence_doc_ids": evidence_ids,
        }
        prior_count = int(existing.get("source_count") or 0)
        payload = {
            **base_payload,
            "metadata": merged_meta,
            "source_count": prior_count + source_count,
        }
        updated = _single(
            supabase.table("insight_cards")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
        return {"card": updated, "evidence_doc_ids": evidence_ids, "was_new": False}

    payload = {
        **base_payload,
        "first_seen_at": now_iso,
        "source_count": source_count,
        "metadata": {
            "finding_key": finding_key,
            "first_synthesis_at": now_iso,
            "last_synthesis_at": now_iso,
            "last_evidence_doc_ids": evidence_ids,
            "produced_by": DOMAIN_COMPILER_VERSION,
        },
    }
    inserted = _single(
        supabase.table("insight_cards").insert(payload).execute()
    ) or payload
    return {"card": inserted, "evidence_doc_ids": evidence_ids, "was_new": True}


def _resolve_stale_cards(
    supabase: Any,
    target_id: str,
    seen_finding_keys: set[str],
) -> int:
    """Mark cards whose finding_keys did not appear in this synthesis as stale.

    A card is only auto-resolved after multiple consecutive absences — for now,
    we mark `current_status = stale`. The compiler intentionally does NOT
    delete cards; recurring-issue tracking depends on their persistence.
    """
    rows = _rows(
        supabase.table("insight_cards")
        .select("id, metadata, current_status")
        .eq("primary_target_id", target_id)
        .in_("current_status", ["open", "needs_review", "blocked"])
        .execute()
    )
    stale = 0
    now_iso = _iso(_utc_now())
    for row in rows:
        meta = _coerce_metadata(row.get("metadata"))
        key = meta.get("finding_key")
        if key and key not in seen_finding_keys:
            supabase.table("insight_cards").update(
                {"current_status": "stale", "updated_at": now_iso}
            ).eq("id", row["id"]).execute()
            stale += 1
    return stale


# ---------------------------------------------------------------------------
# Evidence rows
# ---------------------------------------------------------------------------

def _write_evidence(
    supabase: Any,
    card_id: str,
    evidence_doc_ids: List[str],
    docs_by_id: Dict[str, Dict[str, Any]],
) -> int:
    """Upsert evidence rows pointing at the source documents."""
    written = 0
    for doc_id in evidence_doc_ids:
        doc = docs_by_id.get(doc_id)
        if not doc:
            continue
        existing = _single(
            supabase.table("insight_card_evidence")
            .select("id")
            .eq("insight_card_id", card_id)
            .eq("source_document_id", doc_id)
            .limit(1)
            .execute()
        )
        if existing:
            continue
        payload = {
            "insight_card_id": card_id,
            "source_document_id": doc_id,
            "source_type": doc.get("category") or doc.get("source") or "document",
            "source_title": doc.get("title"),
            "source_occurred_at": doc.get("date") or doc.get("captured_at"),
            "participants": doc.get("participants_array") or [],
            "summary": doc.get("summary"),
            "relevance_reason": "Cited by domain synthesis as evidence for this finding.",
            "evidence_role": "primary",
            "confidence": "medium",
        }
        supabase.table("insight_card_evidence").insert(payload).execute()
        written += 1
    return written


# ---------------------------------------------------------------------------
# Packet write
# ---------------------------------------------------------------------------

def _write_packet(
    supabase: Any,
    target: Dict[str, Any],
    synthesis: Dict[str, Any],
    card_rows: List[Dict[str, Any]],
    covered_start: datetime,
    covered_end: datetime,
    doc_count: int,
) -> Dict[str, Any]:
    now_iso = _iso(_utc_now())
    next_moves = synthesis.get("recommended_next_moves") or []
    if not isinstance(next_moves, list):
        next_moves = [str(next_moves)]
    next_moves = [str(item) for item in next_moves if item][:5]

    confidence_summary = {
        "overall": "medium",
        "reason": "Domain synthesis from document_metadata; no signal-candidate review queue.",
        "card_count": len(card_rows),
    }
    source_coverage = {
        "domain_documents": doc_count,
        "domain_findings": len(card_rows),
        "freshnessStatus": "fresh",
        "lookback_days": DEFAULT_LOOKBACK_DAYS,
    }

    payload = {
        "target_id": target["id"],
        "packet_type": "current",
        "packet_version": "1",
        "compiler_version": DOMAIN_COMPILER_VERSION,
        "generated_at": now_iso,
        "covered_start_at": _iso(covered_start),
        "covered_end_at": _iso(covered_end),
        "freshness_status": "fresh",
        "executive_summary": (synthesis.get("executive_summary") or "")[:8000],
        "current_status": (synthesis.get("current_status") or "")[:8000],
        "strategic_read": (synthesis.get("strategic_read") or "")[:8000],
        "why_it_matters": (synthesis.get("why_it_matters") or "")[:8000],
        "recommended_next_moves": next_moves,
        "confidence_summary": confidence_summary,
        "source_coverage": source_coverage,
        "review_queue_count": 0,
        "stale_item_count": 0,
        "packet_json": {
            "synthesis": synthesis,
            "compiled_by": DOMAIN_COMPILER_VERSION,
        },
    }

    existing = _single(
        supabase.table("intelligence_packets")
        .select("id")
        .eq("target_id", target["id"])
        .eq("packet_type", "current")
        .limit(1)
        .execute()
    )
    if existing:
        packet = _single(
            supabase.table("intelligence_packets")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    else:
        packet = _single(
            supabase.table("intelligence_packets").insert(payload).execute()
        ) or payload

    supabase.table("intelligence_packet_cards").delete().eq(
        "packet_id", packet["id"]
    ).execute()
    if card_rows:
        link_rows = [
            {
                "packet_id": packet["id"],
                "insight_card_id": card["id"],
                "section": "findings",
                "rank": idx + 1,
                "included_reason": "Recurring finding from domain synthesis.",
            }
            for idx, card in enumerate(card_rows)
        ]
        supabase.table("intelligence_packet_cards").insert(link_rows).execute()

    return packet


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------

def compile_domain_packet(
    supabase: Any,
    target_id: str,
    *,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    doc_limit: int = DEFAULT_DOC_LIMIT,
) -> Dict[str, Any]:
    """Compile a single company_process target into a current packet."""
    target = _fetch_target(supabase, target_id)
    started = _utc_now()
    docs = _fetch_domain_documents(
        supabase,
        target,
        lookback_days=lookback_days,
        limit=doc_limit,
    )

    if not docs:
        logger.warning("[domain_compiler] target=%s has no source documents", target["slug"])
        return {
            "status": "skipped_no_documents",
            "target_id": target_id,
            "slug": target.get("slug"),
        }

    docs_by_id: Dict[str, Dict[str, Any]] = {d["id"]: d for d in docs}

    synthesis = _call_synthesis(_build_synthesis_prompt(target, docs))
    findings = synthesis.get("findings") or []
    if not isinstance(findings, list):
        findings = []

    seen_keys: set[str] = set()
    card_results: List[Dict[str, Any]] = []
    for finding in findings:
        if not isinstance(finding, dict):
            continue
        try:
            result = _upsert_finding(supabase, target["id"], finding, docs_by_id)
        except ValueError as exc:
            logger.warning("[domain_compiler] skipping finding: %s", exc)
            continue
        card_results.append(result)
        key = (finding.get("finding_key") or "").strip().lower()
        if key:
            seen_keys.add(key)

    evidence_written = 0
    card_rows: List[Dict[str, Any]] = []
    for result in card_results:
        card = result["card"]
        card_rows.append(card)
        evidence_written += _write_evidence(
            supabase,
            card["id"],
            result["evidence_doc_ids"],
            docs_by_id,
        )

    stale_count = _resolve_stale_cards(supabase, target["id"], seen_keys)

    dates = [d for d in (doc.get("date") for doc in docs) if d]
    covered_end = _utc_now()
    covered_start = covered_end - timedelta(days=lookback_days)
    if dates:
        try:
            covered_start = datetime.fromisoformat(min(dates)).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            pass

    packet = _write_packet(
        supabase,
        target,
        synthesis,
        card_rows,
        covered_start,
        covered_end,
        len(docs),
    )

    supabase.table("intelligence_targets").update(
        {"last_signal_at": _iso(_utc_now())}
    ).eq("id", target["id"]).execute()

    duration_ms = int((_utc_now() - started).total_seconds() * 1000)
    return {
        "status": "compiled",
        "target_id": target_id,
        "slug": target.get("slug"),
        "packet_id": packet.get("id"),
        "document_count": len(docs),
        "finding_count": len(card_rows),
        "evidence_written": evidence_written,
        "stale_resolved": stale_count,
        "duration_ms": duration_ms,
    }


def compile_all_domain_packets(
    supabase: Any,
    *,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    doc_limit: int = DEFAULT_DOC_LIMIT,
) -> Dict[str, Any]:
    """Compile every active company_process target. Failures don't abort the batch."""
    started = _utc_now()
    targets = _rows(
        supabase.table("intelligence_targets")
        .select("id, slug, name")
        .eq("target_type", "company_process")
        .eq("status", "active")
        .execute()
    )

    results: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    for target in targets:
        try:
            result = compile_domain_packet(
                supabase,
                target["id"],
                lookback_days=lookback_days,
                doc_limit=doc_limit,
            )
            results.append(result)
        except Exception as exc:  # noqa: BLE001 — log and continue
            logger.exception(
                "[domain_compiler] failed for target=%s: %s", target.get("slug"), exc
            )
            errors.append(
                {"target_id": target["id"], "slug": target.get("slug"), "error": str(exc)}
            )

    duration_ms = int((_utc_now() - started).total_seconds() * 1000)
    return {
        "status": "ok" if not errors else "partial",
        "target_count": len(targets),
        "succeeded": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
        "duration_ms": duration_ms,
    }
