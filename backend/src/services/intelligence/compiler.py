"""Project intelligence compiler job helpers.

This module is the durable control plane between raw RAG sources
(`document_metadata` / `document_chunks`) and the existing packet-first
intelligence tables. It deliberately starts with job and staging helpers only;
LLM extraction and packet synthesis can build on these functions without
inventing another queue contract.
"""

from __future__ import annotations

import hashlib
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

COMPILER_VERSION = "ai_intelligence_compiler_v0_1"
ACTIVE_JOB_STATUSES = ("queued", "running", "succeeded")
ACTIVE_REFRESH_STATUSES = ("queued", "running")
ACTIVE_CARD_STATUSES = ("open", "blocked", "needs_review", "stale")
CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_timestamp(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        text = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _older_than(value: Any, now: datetime, minutes: int) -> bool:
    parsed = _parse_timestamp(value)
    if not parsed:
        return False
    return (now - parsed).total_seconds() > minutes * 60


def _within_hours(value: Any, now: datetime, hours: int) -> bool:
    parsed = _parse_timestamp(value)
    if not parsed:
        return False
    return 0 <= (now - parsed).total_seconds() <= hours * 3600


def _infer_project_id(*args: Any, **kwargs: Any) -> Any:
    """Lazy import project inference so app startup tests can stub ingestion modules."""
    try:
        from src.services.integrations.microsoft_graph.project_inference import infer_project_id
    except ModuleNotFoundError as exc:
        if exc.name and not exc.name.startswith("src"):
            raise
        from services.integrations.microsoft_graph.project_inference import infer_project_id
    return infer_project_id(*args, **kwargs)


def confidence_label(score: float) -> str:
    """Map a normalized confidence score to the schema confidence label."""
    if score >= 0.85:
        return "high"
    if score >= 0.60:
        return "medium"
    return "low"


def _single_row(response: Any) -> Optional[Dict[str, Any]]:
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "untitled"


def _source_hash(document: Dict[str, Any]) -> str:
    existing_hash = document.get("content_hash")
    if existing_hash:
        return str(existing_hash)
    digest_source = "\n".join(
        [
            str(document.get("id") or ""),
            str(document.get("title") or ""),
            str(document.get("date") or ""),
            str(document.get("content") or ""),
        ]
    )
    return hashlib.sha256(digest_source.encode("utf-8")).hexdigest()


def _participants(document: Dict[str, Any]) -> List[str]:
    raw = document.get("participants")
    if isinstance(raw, list):
        return [_clean_text(item) for item in raw if _clean_text(item)]
    if isinstance(raw, str):
        return [
            _clean_text(part)
            for part in re.split(r"[,;|]", raw)
            if _clean_text(part)
        ]
    metadata = document.get("metadata")
    if isinstance(metadata, dict):
        values = metadata.get("participants") or metadata.get("attendees") or []
        if isinstance(values, list):
            return [_clean_text(item) for item in values if _clean_text(item)]
    return []


def _fetch_source_document(supabase: Any, source_document_id: str) -> Dict[str, Any]:
    row = _single_row(
        supabase.table("document_metadata")
        .select("*")
        .eq("id", source_document_id)
        .limit(1)
        .execute()
    )
    if not row:
        raise ValueError(f"document_metadata row not found: {source_document_id}")
    return row


def _record_document_compiler_status(
    supabase: Any,
    source_document_id: str,
    *,
    status: str,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
    compiler_version: str = COMPILER_VERSION,
) -> None:
    """Persist compiler status on the source row so failures are diagnosable."""
    try:
        document = _fetch_source_document(supabase, source_document_id)
        metadata = _metadata_dict(document.get("source_metadata"))
        metadata["intelligence_compiler"] = {
            "status": status,
            "compiler_version": compiler_version,
            "updated_at": _utc_now(),
            "result": result or {},
            "error": error[:1000] if error else None,
        }
        supabase.table("document_metadata").update(
            {"source_metadata": metadata}
        ).eq("id", source_document_id).execute()
    except Exception:
        # The job tables still carry the primary failure state. Avoid masking the
        # actual compiler exception with a best-effort metadata write failure.
        return


def _fetch_signal_candidate(supabase: Any, candidate_id: str) -> Dict[str, Any]:
    row = _single_row(
        supabase.table("source_signal_candidates")
        .select("*")
        .eq("id", candidate_id)
        .limit(1)
        .execute()
    )
    if not row:
        raise ValueError(f"source_signal_candidates row not found: {candidate_id}")
    return row


def _fetch_project(supabase: Any, project_id: int) -> Dict[str, Any]:
    row = _single_row(
        supabase.table("projects")
        .select("id, name, project_number, client, aliases")
        .eq("id", int(project_id))
        .limit(1)
        .execute()
    )
    if not row:
        raise ValueError(f"projects row not found: {project_id}")
    return row


def _fetch_target(supabase: Any, target_id: str) -> Dict[str, Any]:
    row = _single_row(
        supabase.table("intelligence_targets")
        .select("*")
        .eq("id", target_id)
        .limit(1)
        .execute()
    )
    if not row:
        raise ValueError(f"intelligence_targets row not found: {target_id}")
    return row


def _max_confidence(left: Optional[str], right: Optional[str]) -> str:
    left_value = left if left in CONFIDENCE_RANK else "low"
    right_value = right if right in CONFIDENCE_RANK else "low"
    return left_value if CONFIDENCE_RANK[left_value] >= CONFIDENCE_RANK[right_value] else right_value


def _auto_attribution_status(confidence: str) -> str:
    return "auto_assigned" if confidence == "high" else "needs_review"


def _metadata_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _append_unique(values: Any, item: Any) -> List[Any]:
    result = list(values) if isinstance(values, list) else []
    if item is not None and item not in result:
        result.append(item)
    return result


def _section_for_card(card_type: str) -> str:
    if card_type in {"risk", "blocker", "financial_exposure", "schedule_risk"}:
        return "risks"
    if card_type in {"decision", "change_management"}:
        return "decisions"
    if card_type in {"task", "open_question"}:
        return "follow_ups"
    return "current_read"


def _confidence_counts(cards: List[Dict[str, Any]]) -> Dict[str, int]:
    counts = {"high": 0, "medium": 0, "low": 0}
    for card in cards:
        confidence = card.get("confidence")
        if confidence in counts:
            counts[confidence] += 1
    return counts


def _best_confidence(cards: List[Dict[str, Any]]) -> str:
    best = "low"
    for card in cards:
        best = _max_confidence(best, card.get("confidence"))
    return best


def _table_rows(supabase: Any, table_name: str, select: str = "*") -> List[Dict[str, Any]]:
    """Fetch all rows for health checks instead of Supabase's first 1,000 rows."""
    rows: List[Dict[str, Any]] = []
    page_size = 1000
    start = 0
    while True:
        batch = getattr(
            supabase.table(table_name)
            .select(select)
            .range(start, start + page_size - 1)
            .execute(),
            "data",
            None,
        ) or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size
    return rows


def _status_counts(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for row in rows:
        status = str(row.get("status") or "unknown")
        counts[status] = counts.get(status, 0) + 1
    return counts


def get_intelligence_compiler_status(
    supabase: Any,
    *,
    max_queued_minutes: int = 30,
    max_running_minutes: int = 30,
    recent_failure_hours: int = 24,
    max_unpromoted_minutes: int = 30,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Return health counts for the packet-first intelligence compiler."""
    now = now or datetime.now(timezone.utc)
    source_jobs = _table_rows(
        supabase,
        "source_intelligence_jobs",
        "id,status,queued_at,started_at,updated_at,finished_at,last_error",
    )
    packet_jobs = _table_rows(
        supabase,
        "packet_refresh_jobs",
        "id,status,queued_at,started_at,updated_at,finished_at,output_packet_id,last_error",
    )
    signal_candidates = _table_rows(
        supabase,
        "source_signal_candidates",
        "id,source_document_id,status,confidence,created_at,promoted_insight_card_id",
    )
    cards = _table_rows(
        supabase,
        "insight_cards",
        "id,primary_target_id,current_status,attribution_status",
    )
    evidence_rows = _table_rows(
        supabase,
        "insight_card_evidence",
        "id,insight_card_id,source_document_id",
    )
    packets = _table_rows(
        supabase,
        "intelligence_packets",
        "id,target_id,packet_type",
    )
    packet_cards = _table_rows(
        supabase,
        "intelligence_packet_cards",
        "packet_id,insight_card_id",
    )

    source_stale_queued = sum(
        1
        for job in source_jobs
        if job.get("status") == "queued"
        and _older_than(job.get("queued_at"), now, max_queued_minutes)
    )
    packet_stale_queued = sum(
        1
        for job in packet_jobs
        if job.get("status") == "queued"
        and _older_than(job.get("queued_at"), now, max_queued_minutes)
    )
    source_stale_running = sum(
        1
        for job in source_jobs
        if job.get("status") == "running"
        and _older_than(
            job.get("started_at") or job.get("updated_at") or job.get("queued_at"),
            now,
            max_running_minutes,
        )
    )
    packet_stale_running = sum(
        1
        for job in packet_jobs
        if job.get("status") == "running"
        and _older_than(
            job.get("started_at") or job.get("updated_at") or job.get("queued_at"),
            now,
            max_running_minutes,
        )
    )
    source_recent_failed = sum(
        1
        for job in source_jobs
        if job.get("status") == "failed"
        and _within_hours(
            job.get("finished_at") or job.get("updated_at") or job.get("queued_at"),
            now,
            recent_failure_hours,
        )
    )
    packet_recent_failed = sum(
        1
        for job in packet_jobs
        if job.get("status") == "failed"
        and _within_hours(
            job.get("finished_at") or job.get("updated_at") or job.get("queued_at"),
            now,
            recent_failure_hours,
        )
    )
    high_confidence_unpromoted = sum(
        1
        for candidate in signal_candidates
        if candidate.get("confidence") == "high"
        and candidate.get("status") == "candidate"
        and _older_than(candidate.get("created_at"), now, max_unpromoted_minutes)
    )

    card_ids = {card.get("id") for card in cards if card.get("id")}
    evidence_pairs = {
        (row.get("insight_card_id"), row.get("source_document_id"))
        for row in evidence_rows
    }
    promoted_without_card = sum(
        1
        for candidate in signal_candidates
        if candidate.get("status") == "promoted"
        and (
            not candidate.get("promoted_insight_card_id")
            or candidate.get("promoted_insight_card_id") not in card_ids
        )
    )
    promoted_without_evidence = sum(
        1
        for candidate in signal_candidates
        if candidate.get("status") == "promoted"
        and candidate.get("promoted_insight_card_id")
        and (
            candidate.get("promoted_insight_card_id"),
            candidate.get("source_document_id"),
        )
        not in evidence_pairs
    )

    current_packet_ids_by_target: Dict[str, set] = {}
    for packet in packets:
        if packet.get("packet_type") != "current" or not packet.get("target_id"):
            continue
        packet_ids = current_packet_ids_by_target.setdefault(packet["target_id"], set())
        packet_ids.add(packet.get("id"))
    packet_card_pairs = {
        (row.get("packet_id"), row.get("insight_card_id"))
        for row in packet_cards
    }
    active_cards_missing_current_packet = 0
    for card in cards:
        if card.get("current_status") not in ACTIVE_CARD_STATUSES:
            continue
        if card.get("attribution_status") == "rejected":
            continue
        current_packet_ids = current_packet_ids_by_target.get(card.get("primary_target_id"), set())
        if not any((packet_id, card.get("id")) in packet_card_pairs for packet_id in current_packet_ids):
            active_cards_missing_current_packet += 1

    succeeded_packet_jobs_without_output = sum(
        1
        for job in packet_jobs
        if job.get("status") == "succeeded"
        and not job.get("output_packet_id")
        and _within_hours(
            job.get("finished_at") or job.get("updated_at") or job.get("queued_at"),
            now,
            recent_failure_hours,
        )
    )

    checks = {
        "sourceStaleQueued": source_stale_queued,
        "packetStaleQueued": packet_stale_queued,
        "sourceStaleRunning": source_stale_running,
        "packetStaleRunning": packet_stale_running,
        "sourceRecentFailed": source_recent_failed,
        "packetRecentFailed": packet_recent_failed,
        "highConfidenceUnpromoted": high_confidence_unpromoted,
        "promotedWithoutCard": promoted_without_card,
        "promotedWithoutEvidence": promoted_without_evidence,
        "activeCardsMissingCurrentPacket": active_cards_missing_current_packet,
        "succeededPacketJobsWithoutOutput": succeeded_packet_jobs_without_output,
    }
    unhealthy_checks = {key: value for key, value in checks.items() if value > 0}
    return {
        "status": "healthy" if not unhealthy_checks else "unhealthy",
        "healthy": not unhealthy_checks,
        "thresholds": {
            "maxQueuedMinutes": max_queued_minutes,
            "maxRunningMinutes": max_running_minutes,
            "recentFailureHours": recent_failure_hours,
            "maxUnpromotedMinutes": max_unpromoted_minutes,
        },
        "counts": {
            "sourceJobsByStatus": _status_counts(source_jobs),
            "packetJobsByStatus": _status_counts(packet_jobs),
            "sourceSignalCandidatesByStatus": _status_counts(signal_candidates),
            "insightCards": len(cards),
            "currentPackets": sum(1 for packet in packets if packet.get("packet_type") == "current"),
        },
        "checks": checks,
        "unhealthyChecks": unhealthy_checks,
        "generatedAt": now.isoformat(),
    }


def ensure_client_project_target(
    supabase: Any,
    project_id: int,
    *,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Return or create the packet target for a client project."""
    existing = _single_row(
        supabase.table("intelligence_targets")
        .select("*")
        .eq("target_type", "client_project")
        .eq("project_id", int(project_id))
        .limit(1)
        .execute()
    )
    if existing:
        return existing

    project = _fetch_project(supabase, project_id)
    name = project.get("name") or f"Project {project_id}"
    slug_parts = [project.get("project_number"), name]
    slug = _slugify(" ".join(str(part) for part in slug_parts if part))
    payload = {
        "target_type": "client_project",
        "name": name,
        "slug": slug,
        "status": "active",
        "project_id": int(project_id),
        "metadata": {
            "created_by": "ai_intelligence_compiler",
            "compiler_version": compiler_version,
        },
    }
    return _single_row(
        supabase.table("intelligence_targets").insert(payload).execute()
    ) or payload


def enqueue_source_intelligence_job(
    supabase: Any,
    source_document_id: str,
    *,
    job_type: str = "attribution",
    source_hash: Optional[str] = None,
    target_id: Optional[str] = None,
    project_id: Optional[int] = None,
    priority: int = 0,
    input_snapshot: Optional[Dict[str, Any]] = None,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Enqueue a source compiler job, reusing an active identical job when possible."""
    query = (
        supabase.table("source_intelligence_jobs")
        .select("*")
        .eq("source_document_id", source_document_id)
        .eq("job_type", job_type)
        .eq("compiler_version", compiler_version)
        .in_("status", list(ACTIVE_JOB_STATUSES))
        .limit(1)
    )
    if source_hash:
        query = query.eq("source_hash", source_hash)
    existing = _single_row(query.execute())
    if existing:
        return existing

    payload = {
        "source_document_id": source_document_id,
        "source_hash": source_hash,
        "job_type": job_type,
        "status": "queued",
        "priority": priority,
        "target_id": target_id,
        "project_id": project_id,
        "compiler_version": compiler_version,
        "input_snapshot": input_snapshot or {},
    }
    return _single_row(
        supabase.table("source_intelligence_jobs").insert(payload).execute()
    ) or payload


def claim_queued_source_jobs(
    supabase: Any,
    *,
    limit: int = 10,
    job_type: Optional[str] = None,
    compiler_version: str = COMPILER_VERSION,
) -> List[Dict[str, Any]]:
    """Claim queued source jobs for a worker process.

    This uses Supabase row updates instead of SKIP LOCKED because the current
    backend service layer operates through the Supabase client. The job ledger
    keeps attempts bounded and visible even when two workers race.
    """
    query = (
        supabase.table("source_intelligence_jobs")
        .select("*")
        .eq("status", "queued")
        .eq("compiler_version", compiler_version)
        .order("priority", desc=True)
        .order("queued_at")
        .limit(limit)
    )
    if job_type:
        query = query.eq("job_type", job_type)

    rows = getattr(query.execute(), "data", None) or []
    claimed: List[Dict[str, Any]] = []
    for row in rows:
        update = {
            "status": "running",
            "started_at": _utc_now(),
            "attempt_count": int(row.get("attempt_count") or 0) + 1,
            "updated_at": _utc_now(),
        }
        updated = _single_row(
            supabase.table("source_intelligence_jobs")
            .update(update)
            .eq("id", row["id"])
            .eq("status", "queued")
            .execute()
        )
        if updated:
            claimed.append(updated)
    return claimed


def mark_source_job_succeeded(
    supabase: Any,
    job_id: str,
    *,
    output_summary: Optional[Dict[str, Any]] = None,
) -> None:
    supabase.table("source_intelligence_jobs").update(
        {
            "status": "succeeded",
            "finished_at": _utc_now(),
            "last_error": None,
            "output_summary": output_summary or {},
            "updated_at": _utc_now(),
        }
    ).eq("id", job_id).execute()


def mark_source_job_failed(
    supabase: Any,
    job_id: str,
    error: str,
    *,
    retryable: bool = True,
    max_attempts: int = 3,
) -> None:
    row = _single_row(
        supabase.table("source_intelligence_jobs")
        .select("attempt_count")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    attempts = int((row or {}).get("attempt_count") or 0)
    status = "queued" if retryable and attempts < max_attempts else "failed"
    supabase.table("source_intelligence_jobs").update(
        {
            "status": status,
            "last_error": error[:2000],
            "finished_at": _utc_now() if status == "failed" else None,
            "updated_at": _utc_now(),
        }
    ).eq("id", job_id).execute()


def write_source_signal_candidate(
    supabase: Any,
    *,
    source_document_id: str,
    signal_type: str,
    title: str,
    summary: str,
    confidence_score: float,
    normalized_signal_key: str,
    source_chunk_id: Optional[str] = None,
    target_id: Optional[str] = None,
    project_id: Optional[int] = None,
    why_it_matters: Optional[str] = None,
    current_status: str = "open",
    suggested_owner_person_id: Optional[str] = None,
    suggested_owner_label: Optional[str] = None,
    next_action: Optional[str] = None,
    stale_after: Optional[str] = None,
    source_occurred_at: Optional[str] = None,
    excerpt: Optional[str] = None,
    extraction_json: Optional[Dict[str, Any]] = None,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Stage an extracted signal before promotion to an insight card."""
    bounded_score = max(0.0, min(1.0, float(confidence_score)))
    payload = {
        "source_document_id": source_document_id,
        "source_chunk_id": source_chunk_id,
        "target_id": target_id,
        "project_id": project_id,
        "signal_type": signal_type,
        "title": title,
        "summary": summary,
        "why_it_matters": why_it_matters,
        "current_status": current_status,
        "confidence_score": bounded_score,
        "confidence": confidence_label(bounded_score),
        "status": "candidate" if bounded_score >= 0.85 else "needs_review",
        "suggested_owner_person_id": suggested_owner_person_id,
        "suggested_owner_label": suggested_owner_label,
        "next_action": next_action,
        "stale_after": stale_after,
        "source_occurred_at": source_occurred_at,
        "excerpt": excerpt,
        "normalized_signal_key": normalized_signal_key,
        "extraction_json": extraction_json or {},
        "compiler_version": compiler_version,
    }
    return _single_row(
        supabase.table("source_signal_candidates").insert(payload).execute()
    ) or payload


def write_document_attribution_candidate(
    supabase: Any,
    *,
    source_document_id: str,
    candidate_project_id: Optional[int],
    candidate_target_id: Optional[str],
    confidence_score: float,
    attribution_method: str,
    evidence_terms: Optional[List[str]] = None,
    matched_fields: Optional[List[str]] = None,
    reasoning: Optional[str] = None,
    source_message_ids: Optional[List[str]] = None,
    candidate_project_name: Optional[str] = None,
    evidence: Optional[Dict[str, Any]] = None,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Write one compiler-owned attribution candidate for review/audit."""
    bounded_score = max(0.0, min(1.0, float(confidence_score)))
    status = "auto_assigned" if bounded_score >= 0.85 and candidate_project_id else "pending_review"

    supabase.table("document_attribution_candidates").delete().eq(
        "source_document_id", source_document_id
    ).eq("compiler_version", compiler_version).execute()

    payload = {
        "source_document_id": source_document_id,
        "source_message_ids": source_message_ids or [],
        "candidate_project_id": int(candidate_project_id) if candidate_project_id else None,
        "candidate_project_name": candidate_project_name,
        "candidate_target_id": candidate_target_id,
        "confidence": bounded_score,
        "confidence_label": confidence_label(bounded_score),
        "attribution_method": attribution_method,
        "evidence_terms": evidence_terms or [],
        "matched_fields": matched_fields or [],
        "reasoning": reasoning,
        "evidence": evidence or {},
        "status": status,
        "compiler_version": compiler_version,
    }
    return _single_row(
        supabase.table("document_attribution_candidates").insert(payload).execute()
    ) or payload


def classify_basic_signal(document: Dict[str, Any]) -> Dict[str, Any]:
    """Create a conservative, deterministic signal candidate from source text."""
    title = _clean_text(document.get("title")) or "Source update"
    content = _clean_text(document.get("content"))
    haystack = f"{title} {content}".lower()

    signal_type = "project_update"
    if re.search(r"\b(change order|pco|cco|change event|cost exposure|budget|invoice|payment)\b", haystack):
        signal_type = "financial_exposure"
    if re.search(r"\b(schedule|delay|delayed|late|slip|slipping|milestone|completion|deadline)\b", haystack):
        signal_type = "schedule_risk"
    if re.search(r"\b(risk|blocker|blocked|concern|issue|problem|escalat|frustrat)\b", haystack):
        signal_type = "risk"
    if re.search(r"\b(decided|decision|approved|rejected|agreed|confirmed)\b", haystack):
        signal_type = "decision"
    if re.search(r"\b(action item|todo|follow up|needs to|will handle|owner|due)\b", haystack):
        signal_type = "task"

    excerpt = content[:900] if content else title
    normalized_key_source = f"{signal_type}:{title}:{excerpt[:160]}".lower()
    normalized_signal_key = re.sub(r"[^a-z0-9]+", "-", normalized_key_source).strip("-")[:180]

    return {
        "signal_type": signal_type,
        "title": title[:180],
        "summary": (excerpt or title)[:800],
        "why_it_matters": "This source contains project-relevant language that should be reviewed before it is trusted in a current intelligence packet.",
        "next_action": "Review the source attribution and extracted signal, then promote or reject it.",
        "excerpt": excerpt,
        "normalized_signal_key": normalized_signal_key or _slugify(title),
    }


def enqueue_packet_refresh(
    supabase: Any,
    target_id: str,
    *,
    reason: str,
    trigger_source_document_id: Optional[str] = None,
    trigger_insight_card_id: Optional[str] = None,
    priority: int = 0,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Enqueue a deduped packet refresh for a target."""
    existing = _single_row(
        supabase.table("packet_refresh_jobs")
        .select("*")
        .eq("target_id", target_id)
        .eq("compiler_version", compiler_version)
        .in_("status", list(ACTIVE_REFRESH_STATUSES))
        .limit(1)
        .execute()
    )
    if existing:
        if trigger_insight_card_id and not existing.get("trigger_insight_card_id"):
            updated = _single_row(
                supabase.table("packet_refresh_jobs")
                .update(
                    {
                        "reason": reason,
                        "trigger_source_document_id": trigger_source_document_id
                        or existing.get("trigger_source_document_id"),
                        "trigger_insight_card_id": trigger_insight_card_id,
                        "priority": max(int(existing.get("priority") or 0), priority),
                        "updated_at": _utc_now(),
                    }
                )
                .eq("id", existing["id"])
                .execute()
            )
            return updated or existing
        return existing

    payload = {
        "target_id": target_id,
        "reason": reason,
        "trigger_source_document_id": trigger_source_document_id,
        "trigger_insight_card_id": trigger_insight_card_id,
        "status": "queued",
        "priority": priority,
        "compiler_version": compiler_version,
    }
    return _single_row(
        supabase.table("packet_refresh_jobs").insert(payload).execute()
    ) or payload


def _find_existing_insight_card(
    supabase: Any,
    *,
    target_id: str,
    signal_type: str,
    normalized_signal_key: str,
    compiler_version: str,
) -> Optional[Dict[str, Any]]:
    rows = getattr(
        supabase.table("insight_cards")
        .select("*")
        .eq("primary_target_id", target_id)
        .eq("card_type", signal_type)
        .eq("compiler_version", compiler_version)
        .in_("current_status", list(ACTIVE_CARD_STATUSES))
        .limit(20)
        .execute(),
        "data",
        None,
    ) or []
    for row in rows:
        metadata = _metadata_dict(row.get("metadata"))
        if metadata.get("normalized_signal_key") == normalized_signal_key:
            return row
    return None


def _upsert_insight_card_from_candidate(
    supabase: Any,
    candidate: Dict[str, Any],
    *,
    compiler_version: str,
) -> Dict[str, Any]:
    target_id = candidate.get("target_id")
    if not target_id:
        raise ValueError("source signal candidate is missing target_id")

    confidence = candidate.get("confidence") or confidence_label(candidate.get("confidence_score") or 0)
    metadata_key = candidate.get("normalized_signal_key")
    existing = _find_existing_insight_card(
        supabase,
        target_id=target_id,
        signal_type=candidate["signal_type"],
        normalized_signal_key=metadata_key,
        compiler_version=compiler_version,
    )

    metadata = _metadata_dict((existing or {}).get("metadata"))
    metadata.update(
        {
            "normalized_signal_key": metadata_key,
            "last_source_signal_candidate_id": candidate.get("id"),
            "source_signal_candidate_ids": _append_unique(
                metadata.get("source_signal_candidate_ids"),
                candidate.get("id"),
            ),
        }
    )

    last_seen_at = candidate.get("source_occurred_at") or _utc_now()
    if existing:
        existing_evidence = _single_row(
            supabase.table("insight_card_evidence")
            .select("id")
            .eq("insight_card_id", existing["id"])
            .eq("source_document_id", candidate["source_document_id"])
            .limit(1)
            .execute()
        )
        source_count_increment = 0 if existing_evidence else 1
        payload = {
            "title": candidate["title"],
            "summary": candidate["summary"],
            "why_it_matters": candidate.get("why_it_matters"),
            "current_status": candidate.get("current_status") or existing.get("current_status") or "open",
            "confidence": _max_confidence(existing.get("confidence"), confidence),
            "attribution_status": _auto_attribution_status(
                _max_confidence(existing.get("confidence"), confidence)
            ),
            "suggested_owner_person_id": candidate.get("suggested_owner_person_id"),
            "suggested_owner_label": candidate.get("suggested_owner_label"),
            "next_action": candidate.get("next_action"),
            "last_seen_at": last_seen_at,
            "stale_after": candidate.get("stale_after"),
            "source_count": int(existing.get("source_count") or 0) + source_count_increment,
            "metadata": metadata,
            "updated_at": _utc_now(),
        }
        return _single_row(
            supabase.table("insight_cards")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}

    payload = {
        "primary_target_id": target_id,
        "title": candidate["title"],
        "card_type": candidate["signal_type"],
        "summary": candidate["summary"],
        "why_it_matters": candidate.get("why_it_matters"),
        "current_status": candidate.get("current_status") or "open",
        "confidence": confidence,
        "attribution_status": _auto_attribution_status(confidence),
        "suggested_owner_person_id": candidate.get("suggested_owner_person_id"),
        "suggested_owner_label": candidate.get("suggested_owner_label"),
        "next_action": candidate.get("next_action"),
        "first_seen_at": last_seen_at,
        "last_seen_at": last_seen_at,
        "stale_after": candidate.get("stale_after"),
        "source_count": 1,
        "compiler_version": compiler_version,
        "metadata": metadata,
    }
    return _single_row(
        supabase.table("insight_cards").insert(payload).execute()
    ) or payload


def _ensure_insight_card_target(
    supabase: Any,
    *,
    insight_card_id: str,
    target_id: str,
    confidence: str,
    reason: str,
) -> Dict[str, Any]:
    existing = _single_row(
        supabase.table("insight_card_targets")
        .select("*")
        .eq("insight_card_id", insight_card_id)
        .eq("relationship", "primary")
        .limit(1)
        .execute()
    )
    payload = {
        "insight_card_id": insight_card_id,
        "target_id": target_id,
        "relationship": "primary",
        "confidence": confidence,
        "attribution_status": _auto_attribution_status(confidence),
        "matched_terms": [],
        "reason": reason,
    }
    if existing:
        return _single_row(
            supabase.table("insight_card_targets")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    return _single_row(
        supabase.table("insight_card_targets").insert(payload).execute()
    ) or payload


def _write_insight_card_evidence(
    supabase: Any,
    *,
    card: Dict[str, Any],
    candidate: Dict[str, Any],
    document: Dict[str, Any],
) -> Dict[str, Any]:
    existing = _single_row(
        supabase.table("insight_card_evidence")
        .select("*")
        .eq("insight_card_id", card["id"])
        .eq("source_document_id", candidate["source_document_id"])
        .limit(1)
        .execute()
    )
    payload = {
        "insight_card_id": card["id"],
        "source_document_id": candidate.get("source_document_id"),
        "source_chunk_id": candidate.get("source_chunk_id"),
        "source_type": document.get("category") or document.get("source"),
        "source_title": document.get("title"),
        "source_occurred_at": candidate.get("source_occurred_at") or document.get("date"),
        "source_message_id": _metadata_dict(document.get("metadata")).get("message_id"),
        "participants": _participants(document),
        "excerpt": candidate.get("excerpt"),
        "summary": candidate.get("summary"),
        "relevance_reason": candidate.get("why_it_matters"),
        "evidence_role": "primary",
        "confidence": candidate.get("confidence") or "low",
    }
    if existing:
        return _single_row(
            supabase.table("insight_card_evidence")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    return _single_row(
        supabase.table("insight_card_evidence").insert(payload).execute()
    ) or payload


def _load_packet_cards_for_target(
    supabase: Any,
    target_id: str,
    *,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    query = (
        supabase.table("insight_cards")
        .select("*")
        .eq("primary_target_id", target_id)
        .in_("current_status", list(ACTIVE_CARD_STATUSES))
        .order("last_seen_at", desc=True)
    )
    if limit is not None:
        query = query.limit(limit)
    rows = getattr(query.execute(), "data", None) or []
    return [row for row in rows if row.get("attribution_status") != "rejected"]


def _load_evidence_for_cards(
    supabase: Any,
    card_ids: List[str],
) -> List[Dict[str, Any]]:
    if not card_ids:
        return []
    return getattr(
        supabase.table("insight_card_evidence")
        .select("*")
        .in_("insight_card_id", card_ids)
        .order("source_occurred_at", desc=True)
        .execute(),
        "data",
        None,
    ) or []


def _packet_payload(
    *,
    target: Dict[str, Any],
    cards: List[Dict[str, Any]],
    evidence: List[Dict[str, Any]],
    compiler_version: str,
) -> Dict[str, Any]:
    target_name = target.get("name") or "This target"
    top_card = cards[0] if cards else None
    source_dates = [
        row.get("source_occurred_at")
        for row in evidence
        if row.get("source_occurred_at")
    ]
    source_dates = sorted(source_dates)
    review_queue_count = sum(
        1
        for card in cards
        if card.get("attribution_status") in {"candidate", "needs_review"}
    )
    stale_item_count = sum(1 for card in cards if card.get("current_status") == "stale")
    recommended_next_moves = [
        _clean_text(card.get("next_action"))
        for card in cards
        if _clean_text(card.get("next_action"))
    ][:5]
    sections: Dict[str, List[str]] = {}
    for card in cards:
        sections.setdefault(_section_for_card(card.get("card_type") or ""), []).append(card["id"])

    if top_card:
        executive_summary = (
            f"{target_name} has {len(cards)} active intelligence card(s). "
            f"Top signal: {top_card.get('title')}."
        )
        current_status = top_card.get("summary")
        strategic_read = "Prioritize high-confidence cards and review candidate attributions before treating this packet as final."
        why_it_matters = top_card.get("why_it_matters")
    else:
        executive_summary = f"{target_name} has no active promoted intelligence cards yet."
        current_status = "No promoted intelligence cards are available for this target."
        strategic_read = "The assistant should fall back to raw source retrieval until promoted intelligence exists."
        why_it_matters = "This packet is intentionally thin so the advisor does not invent current project state."

    return {
        "target_id": target["id"],
        "packet_type": "current",
        "packet_version": f"{compiler_version}:current",
        "generated_at": _utc_now(),
        "covered_start_at": source_dates[0] if source_dates else None,
        "covered_end_at": source_dates[-1] if source_dates else None,
        "freshness_status": "fresh" if cards else "partial",
        "executive_summary": executive_summary,
        "current_status": current_status,
        "strategic_read": strategic_read,
        "why_it_matters": why_it_matters,
        "recommended_next_moves": recommended_next_moves,
        "confidence_summary": {
            "overall": _best_confidence(cards),
            "counts": _confidence_counts(cards),
            "reason": "Derived from promoted insight cards and linked evidence.",
        },
        "source_coverage": {
            "promotedCardCount": len(cards),
            "linkedEvidenceCount": len(evidence),
            "latestSourceAt": source_dates[-1] if source_dates else None,
            "gaps": [] if cards else ["No promoted insight cards for this target."],
        },
        "review_queue_count": review_queue_count,
        "stale_item_count": stale_item_count,
        "packet_json": {
            "target": {
                "id": target.get("id"),
                "name": target.get("name"),
                "targetType": target.get("target_type"),
                "projectId": target.get("project_id"),
            },
            "sections": sections,
            "cardIds": [card["id"] for card in cards],
            "evidenceIds": [row["id"] for row in evidence],
        },
        "compiler_version": compiler_version,
    }


def compile_current_packet(
    supabase: Any,
    target_id: str,
    *,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Compile promoted cards into the current packet row read by the advisor."""
    target = _fetch_target(supabase, target_id)
    cards = _load_packet_cards_for_target(supabase, target_id)
    evidence = _load_evidence_for_cards(
        supabase,
        [card["id"] for card in cards],
    )
    payload = _packet_payload(
        target=target,
        cards=cards,
        evidence=evidence,
        compiler_version=compiler_version,
    )

    existing = _single_row(
        supabase.table("intelligence_packets")
        .select("*")
        .eq("target_id", target_id)
        .eq("packet_type", "current")
        .limit(1)
        .execute()
    )
    if existing:
        packet = _single_row(
            supabase.table("intelligence_packets")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    else:
        packet = _single_row(
            supabase.table("intelligence_packets").insert(payload).execute()
        ) or payload

    supabase.table("intelligence_packet_cards").delete().eq(
        "packet_id", packet["id"]
    ).execute()
    packet_card_rows = [
        {
            "packet_id": packet["id"],
            "insight_card_id": card["id"],
            "section": _section_for_card(card.get("card_type") or ""),
            "rank": index + 1,
            "included_reason": "Active promoted card for the current intelligence packet.",
        }
        for index, card in enumerate(cards)
    ]
    for start in range(0, len(packet_card_rows), 500):
        supabase.table("intelligence_packet_cards").insert(
            packet_card_rows[start : start + 500]
        ).execute()

    return {
        "status": "compiled",
        "packet_id": packet.get("id"),
        "target_id": target_id,
        "card_count": len(cards),
        "evidence_count": len(evidence),
    }


def promote_signal_candidate(
    supabase: Any,
    candidate_id: str,
    *,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Promote a staged source signal into durable packet-readable intelligence."""
    candidate = _fetch_signal_candidate(supabase, candidate_id)
    if candidate.get("status") == "promoted" and candidate.get("promoted_insight_card_id"):
        return {
            "status": "skipped",
            "reason": "source signal candidate already promoted",
            "insight_card_id": candidate["promoted_insight_card_id"],
        }

    if not candidate.get("target_id"):
        supabase.table("source_signal_candidates").update(
            {
                "status": "needs_review",
                "extraction_json": {
                    **_metadata_dict(candidate.get("extraction_json")),
                    "promotion_error": "missing target_id",
                },
                "updated_at": _utc_now(),
            }
        ).eq("id", candidate_id).execute()
        return {
            "status": "needs_review",
            "reason": "source signal candidate is missing target_id",
            "signal_candidate_id": candidate_id,
        }

    document = _fetch_source_document(supabase, candidate["source_document_id"])
    card = _upsert_insight_card_from_candidate(
        supabase,
        candidate,
        compiler_version=compiler_version,
    )
    target_link = _ensure_insight_card_target(
        supabase,
        insight_card_id=card["id"],
        target_id=candidate["target_id"],
        confidence=candidate.get("confidence") or "low",
        reason="Promoted from source_signal_candidates by the intelligence compiler.",
    )
    evidence = _write_insight_card_evidence(
        supabase,
        card=card,
        candidate=candidate,
        document=document,
    )

    updated_candidate = _single_row(
        supabase.table("source_signal_candidates")
        .update(
            {
                "status": "promoted",
                "promoted_insight_card_id": card["id"],
                "updated_at": _utc_now(),
            }
        )
        .eq("id", candidate_id)
        .execute()
    ) or candidate

    refresh_job = enqueue_packet_refresh(
        supabase,
        candidate["target_id"],
        reason="insight card promoted from source signal",
        trigger_source_document_id=candidate.get("source_document_id"),
        trigger_insight_card_id=card["id"],
        priority=10,
        compiler_version=compiler_version,
    )
    return {
        "status": "promoted",
        "signal_candidate_id": updated_candidate.get("id"),
        "insight_card_id": card.get("id"),
        "target_link_id": target_link.get("id"),
        "evidence_id": evidence.get("id"),
        "packet_refresh_job_id": refresh_job.get("id"),
    }


def claim_queued_packet_refresh_jobs(
    supabase: Any,
    *,
    limit: int = 5,
    compiler_version: str = COMPILER_VERSION,
) -> List[Dict[str, Any]]:
    query = (
        supabase.table("packet_refresh_jobs")
        .select("*")
        .eq("status", "queued")
        .eq("compiler_version", compiler_version)
        .order("priority", desc=True)
        .order("queued_at")
        .limit(limit)
    )
    rows = getattr(query.execute(), "data", None) or []
    claimed: List[Dict[str, Any]] = []
    for row in rows:
        updated = _single_row(
            supabase.table("packet_refresh_jobs")
            .update(
                {
                    "status": "running",
                    "started_at": _utc_now(),
                    "attempt_count": int(row.get("attempt_count") or 0) + 1,
                    "updated_at": _utc_now(),
                }
            )
            .eq("id", row["id"])
            .eq("status", "queued")
            .execute()
        )
        if updated:
            claimed.append(updated)
    return claimed


def mark_packet_refresh_succeeded(
    supabase: Any,
    job_id: str,
    *,
    output_packet_id: Optional[str] = None,
) -> None:
    supabase.table("packet_refresh_jobs").update(
        {
            "status": "succeeded",
            "output_packet_id": output_packet_id,
            "finished_at": _utc_now(),
            "last_error": None,
            "updated_at": _utc_now(),
        }
    ).eq("id", job_id).execute()


def mark_packet_refresh_failed(
    supabase: Any,
    job_id: str,
    error: str,
    *,
    retryable: bool = True,
    max_attempts: int = 3,
) -> None:
    row = _single_row(
        supabase.table("packet_refresh_jobs")
        .select("attempt_count")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    attempts = int((row or {}).get("attempt_count") or 0)
    status = "queued" if retryable and attempts < max_attempts else "failed"
    supabase.table("packet_refresh_jobs").update(
        {
            "status": status,
            "last_error": error[:2000],
            "finished_at": _utc_now() if status == "failed" else None,
            "updated_at": _utc_now(),
        }
    ).eq("id", job_id).execute()


def process_packet_refresh_job(
    supabase: Any,
    job_id: str,
    *,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Run one packet refresh job and record the output packet id."""
    job = _single_row(
        supabase.table("packet_refresh_jobs")
        .select("*")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    if not job:
        raise ValueError(f"packet_refresh_jobs row not found: {job_id}")

    update_payload = {
        "status": "running",
        "started_at": job.get("started_at") or _utc_now(),
        "updated_at": _utc_now(),
    }
    if job.get("status") != "running":
        update_payload["attempt_count"] = int(job.get("attempt_count") or 0) + 1
    supabase.table("packet_refresh_jobs").update(update_payload).eq("id", job_id).execute()

    try:
        result = compile_current_packet(
            supabase,
            job["target_id"],
            compiler_version=compiler_version,
        )
        mark_packet_refresh_succeeded(
            supabase,
            job_id,
            output_packet_id=result.get("packet_id"),
        )
        return {
            **result,
            "status": "succeeded",
            "packet_refresh_job_id": job_id,
        }
    except Exception as exc:
        mark_packet_refresh_failed(supabase, job_id, str(exc), retryable=False)
        raise


def process_source_document_to_packet(
    supabase: Any,
    source_document_id: str,
    *,
    compiler_version: str = COMPILER_VERSION,
    force: bool = False,
    compile_packet: bool = True,
    source_job: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run the source compiler through packet refresh for high-confidence sources.

    This is the ingestion-safe entrypoint. It keeps weak attribution in review,
    promotes high-confidence source signals to cards, and refreshes the current
    packet so advisor reads have durable state before raw retrieval fallback.
    """
    try:
        source_result = process_source_document(
            supabase,
            source_document_id,
            compiler_version=compiler_version,
            force=force,
            source_job=source_job,
        )
        result: Dict[str, Any] = {
            "status": "succeeded",
            "source_document_id": source_document_id,
            "source": source_result,
            "promotion": None,
            "packet": None,
        }

        signal_candidate_id = source_result.get("signal_candidate_id")
        is_high_confidence = source_result.get("confidence") == "high"
        if source_result.get("status") == "skipped":
            result["status"] = "skipped"
        elif signal_candidate_id and is_high_confidence:
            promotion = promote_signal_candidate(
                supabase,
                signal_candidate_id,
                compiler_version=compiler_version,
            )
            result["promotion"] = promotion
            refresh_job_id = promotion.get("packet_refresh_job_id")
            if compile_packet and refresh_job_id:
                result["packet"] = process_packet_refresh_job(
                    supabase,
                    refresh_job_id,
                    compiler_version=compiler_version,
                )
        elif signal_candidate_id:
            result["status"] = "needs_review"
            result["reason"] = "signal candidate was staged but not auto-promoted because confidence is below high"

        _record_document_compiler_status(
            supabase,
            source_document_id,
            status=result["status"],
            result=result,
            compiler_version=compiler_version,
        )
        return result
    except Exception as exc:
        _record_document_compiler_status(
            supabase,
            source_document_id,
            status="error",
            error=str(exc),
            compiler_version=compiler_version,
        )
        raise


def _time_limit_reached(started: float, max_processing_time_ms: Optional[int]) -> bool:
    if not max_processing_time_ms:
        return False
    return int((time.monotonic() - started) * 1000) >= int(max_processing_time_ms)


def run_intelligence_compiler_batch(
    supabase: Any,
    *,
    source_limit: int = 10,
    packet_limit: int = 5,
    max_processing_time_ms: Optional[int] = None,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Process queued source compiler and packet refresh jobs in a bounded batch."""
    started = time.monotonic()
    run_started_at = datetime.now(timezone.utc)
    source_limit = max(0, min(int(source_limit or 0), 100))
    packet_limit = max(0, min(int(packet_limit or 0), 100))
    stats: Dict[str, Any] = {
        "source_jobs_claimed": 0,
        "source_jobs_succeeded": 0,
        "source_jobs_failed": 0,
        "packet_jobs_claimed": 0,
        "packet_jobs_succeeded": 0,
        "packet_jobs_failed": 0,
        "failed_source_job_ids": [],
        "failed_packet_job_ids": [],
        "timed_out": False,
        "processing_time_ms": 0,
    }

    source_jobs = claim_queued_source_jobs(
        supabase,
        limit=source_limit,
        compiler_version=compiler_version,
    ) if source_limit else []
    stats["source_jobs_claimed"] = len(source_jobs)
    for job in source_jobs:
        if _time_limit_reached(started, max_processing_time_ms):
            stats["timed_out"] = True
            break
        job_id = job.get("id")
        try:
            if job.get("job_type") not in {"attribution", "signal_extract"}:
                raise ValueError(f"unsupported source intelligence job_type: {job.get('job_type')}")
            process_source_document_to_packet(
                supabase,
                job["source_document_id"],
                compiler_version=compiler_version,
                source_job=job,
            )
            stats["source_jobs_succeeded"] += 1
        except Exception as exc:
            stats["source_jobs_failed"] += 1
            if job_id:
                stats["failed_source_job_ids"].append(job_id)
                mark_source_job_failed(supabase, job_id, str(exc), retryable=False)

    packet_jobs = claim_queued_packet_refresh_jobs(
        supabase,
        limit=packet_limit,
        compiler_version=compiler_version,
    ) if packet_limit and not stats["timed_out"] else []
    stats["packet_jobs_claimed"] = len(packet_jobs)
    for job in packet_jobs:
        if _time_limit_reached(started, max_processing_time_ms):
            stats["timed_out"] = True
            break
        job_id = job.get("id")
        try:
            process_packet_refresh_job(
                supabase,
                job["id"],
                compiler_version=compiler_version,
            )
            stats["packet_jobs_succeeded"] += 1
        except Exception as exc:
            stats["packet_jobs_failed"] += 1
            if job_id:
                stats["failed_packet_job_ids"].append(job_id)
                mark_packet_refresh_failed(supabase, job_id, str(exc), retryable=False)

    stats["processing_time_ms"] = int((time.monotonic() - started) * 1000)
    _record_intelligence_compiler_run(
        supabase,
        started_at=run_started_at,
        stats=stats,
        compiler_version=compiler_version,
        source_limit=source_limit,
        packet_limit=packet_limit,
        max_processing_time_ms=max_processing_time_ms,
    )
    return stats


def _record_intelligence_compiler_run(
    supabase: Any,
    *,
    started_at: datetime,
    stats: Dict[str, Any],
    compiler_version: str,
    source_limit: int,
    packet_limit: int,
    max_processing_time_ms: Optional[int],
) -> None:
    try:
        from src.services.health.source_sync_health import record_sync_run

        failed = int(stats.get("source_jobs_failed", 0) or 0) + int(stats.get("packet_jobs_failed", 0) or 0)
        succeeded = int(stats.get("source_jobs_succeeded", 0) or 0) + int(stats.get("packet_jobs_succeeded", 0) or 0)
        claimed = int(stats.get("source_jobs_claimed", 0) or 0) + int(stats.get("packet_jobs_claimed", 0) or 0)
        status = "failed" if failed and failed >= claimed and claimed else "warning" if failed or stats.get("timed_out") else "succeeded"
        record_sync_run(
            supabase,
            source="intelligence_compiler",
            resource_id="source_and_packet_queues",
            resource_name="AI intelligence compiler",
            stage="intelligence_compile",
            status=status,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
            items_seen=claimed,
            items_synced=succeeded,
            items_failed=failed,
            error_message=(
                f"{failed} compiler jobs failed"
                if failed
                else "Compiler run hit processing time limit"
                if stats.get("timed_out")
                else None
            ),
            metadata={
                "compiler_version": compiler_version,
                "source_limit": source_limit,
                "packet_limit": packet_limit,
                "max_processing_time_ms": max_processing_time_ms,
                **stats,
            },
        )
    except Exception as exc:
        logger.warning("[IntelligenceCompiler] Could not record source_sync_runs row: %s", exc)


def process_source_document(
    supabase: Any,
    source_document_id: str,
    *,
    compiler_version: str = COMPILER_VERSION,
    force: bool = False,
    source_job: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Process one document_metadata source into compiler staging tables.

    This is the first end-to-end compiler path:
    source row -> attribution candidate -> signal candidate -> packet refresh job.
    It intentionally does not promote insight cards yet.
    """
    document = _fetch_source_document(supabase, source_document_id)
    source_hash = _source_hash(document)
    existing_job = source_job or enqueue_source_intelligence_job(
        supabase,
        source_document_id,
        job_type="signal_extract",
        source_hash=source_hash,
        project_id=document.get("project_id"),
        compiler_version=compiler_version,
        input_snapshot={
            "title": document.get("title"),
            "category": document.get("category"),
            "source": document.get("source"),
            "date": document.get("date"),
            "project_id": document.get("project_id"),
        },
    )

    if existing_job.get("status") == "succeeded" and not force:
        return {
            "status": "skipped",
            "reason": "source already processed with this compiler version and hash",
            "job": existing_job,
        }

    job_id = existing_job.get("id")
    if job_id:
        update_payload = {
            "status": "running",
            "started_at": existing_job.get("started_at") or _utc_now(),
            "updated_at": _utc_now(),
        }
        if existing_job.get("status") != "running":
            update_payload["attempt_count"] = int(existing_job.get("attempt_count") or 0) + 1
        supabase.table("source_intelligence_jobs").update(update_payload).eq("id", job_id).execute()

    try:
        existing_project_id = document.get("project_id")
        project_id = existing_project_id
        attribution_method = "existing_project_id" if project_id else "project_inference"
        confidence_score = 0.95 if project_id else 0.0
        corrected_project_attribution = False
        project_name: Optional[str] = None
        target: Optional[Dict[str, Any]] = None

        inferred_project_id, method, confidence = _infer_project_id(
            supabase,
            title=str(document.get("title") or ""),
            content=str(document.get("content") or ""),
            participants=_participants(document),
            existing_project_id=int(existing_project_id) if existing_project_id else None,
        )
        if (
            existing_project_id
            and inferred_project_id
            and int(inferred_project_id) != int(existing_project_id)
            and method == "title_correction"
            and confidence >= 0.93
        ):
            project_id = inferred_project_id
            attribution_method = method
            confidence_score = confidence
            corrected_project_attribution = True
            supabase.table("document_metadata").update(
                {
                    "project_id": int(inferred_project_id),
                }
            ).eq("id", source_document_id).execute()
        elif not project_id:
            project_id = inferred_project_id
            attribution_method = method
            confidence_score = confidence

        if project_id:
            project = _fetch_project(supabase, int(project_id))
            project_name = project.get("name")
            if corrected_project_attribution and project_name:
                supabase.table("document_metadata").update(
                    {
                        "project": project_name,
                    }
                ).eq("id", source_document_id).execute()
            target = ensure_client_project_target(
                supabase,
                int(project_id),
                compiler_version=compiler_version,
            )

        attribution = write_document_attribution_candidate(
            supabase,
            source_document_id=source_document_id,
            candidate_project_id=int(project_id) if project_id else None,
            candidate_target_id=target.get("id") if target else None,
            candidate_project_name=project_name,
            confidence_score=confidence_score,
            attribution_method=f"intelligence_compiler:{attribution_method}",
            evidence_terms=[
                value
                for value in [
                    project_name,
                    str(document.get("title") or "") if corrected_project_attribution else None,
                ]
                if value
            ],
            matched_fields=(
                ["document_metadata.title"]
                if corrected_project_attribution
                else ["document_metadata.project_id"] if document.get("project_id") else []
            ),
            reasoning=(
                "Existing document_metadata.project_id was corrected because the source title strongly matched another project."
                if corrected_project_attribution
                else
                "Existing document_metadata.project_id was trusted as the project attribution."
                if document.get("project_id")
                else "Project attribution was inferred from source title, content, and participants."
            ),
            evidence={
                "source_title": document.get("title"),
                "source_category": document.get("category"),
                "source_date": document.get("date"),
            },
            compiler_version=compiler_version,
        )

        signal = classify_basic_signal(document)
        signal_candidate = None
        packet_refresh_job = None
        if target:
            signal_candidate = write_source_signal_candidate(
                supabase,
                source_document_id=source_document_id,
                source_chunk_id=None,
                target_id=target.get("id"),
                project_id=int(project_id),
                signal_type=signal["signal_type"],
                title=signal["title"],
                summary=signal["summary"],
                why_it_matters=signal["why_it_matters"],
                confidence_score=confidence_score,
                normalized_signal_key=signal["normalized_signal_key"],
                source_occurred_at=document.get("date") or document.get("created_at"),
                excerpt=signal["excerpt"],
                next_action=signal["next_action"],
                extraction_json={
                    "extractor": "deterministic_basic_signal",
                    "source": document.get("source"),
                    "category": document.get("category"),
                },
                compiler_version=compiler_version,
            )

            if confidence_score >= 0.85:
                packet_refresh_job = enqueue_packet_refresh(
                    supabase,
                    target["id"],
                    reason="high-confidence source signal staged",
                    trigger_source_document_id=source_document_id,
                    priority=5,
                    compiler_version=compiler_version,
                )

        output_summary = {
            "project_id": int(project_id) if project_id else None,
            "target_id": target.get("id") if target else None,
            "attribution_candidate_id": attribution.get("id"),
            "signal_candidate_id": signal_candidate.get("id") if signal_candidate else None,
            "packet_refresh_job_id": packet_refresh_job.get("id") if packet_refresh_job else None,
            "confidence": confidence_label(confidence_score),
            "confidence_score": confidence_score,
        }
        if job_id:
            mark_source_job_succeeded(supabase, job_id, output_summary=output_summary)
        return {"status": "succeeded", **output_summary}
    except Exception as exc:
        if job_id:
            mark_source_job_failed(supabase, job_id, str(exc), retryable=False)
        raise
