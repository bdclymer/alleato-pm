"""Project intelligence compiler job helpers.

This module is the durable control plane between raw RAG sources
(`document_metadata` / `document_chunks`) and the existing packet-first
intelligence tables. It deliberately starts with job and staging helpers only;
LLM extraction and packet synthesis can build on these functions without
inventing another queue contract.
"""

from __future__ import annotations

import hashlib
import os
import re
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from src.services.ops.db_pressure_guard import enforce_pm_app_final_projection_guard
from src.services.supabase_helpers import get_rag_read_client, get_rag_write_client

COMPILER_VERSION = "ai_intelligence_compiler_v0_1"
ACTIVE_JOB_STATUSES = ("queued", "running", "succeeded")
ACTIVE_REFRESH_STATUSES = ("queued", "running")
ACTIVE_CARD_STATUSES = ("open", "blocked", "needs_review", "stale")
CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}
SOURCE_CATEGORY_LABELS = {
    "meeting": "Meetings",
    "email": "Emails",
    "teams": "Teams",
    "document": "Documents",
    "rfi": "RFIs",
    "submittal": "Submittals",
    "drawing": "Drawings",
    "specification": "Specifications",
    "daily_report": "Daily Reports",
    "task": "Tasks",
    "risk": "Risks",
}


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


def _is_duplicate_intelligence_target_slug_error(exc: Exception) -> bool:
    message = str(exc)
    return (
        "duplicate key value violates unique constraint" in message
        and "intelligence_targets_slug_key" in message
    ) or ("23505" in message and "slug" in message)


def _rag_read() -> Any:
    return get_rag_read_client()


def _rag_write() -> Any:
    return get_rag_write_client()


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _source_category(value: Any) -> str:
    raw = _clean_text(value).lower()
    if any(term in raw for term in ("meeting", "fireflies", "transcript")):
        return "meeting"
    if any(term in raw for term in ("email", "outlook")):
        return "email"
    if any(term in raw for term in ("teams", "chat", "message")):
        return "teams"
    if "rfi" in raw:
        return "rfi"
    if "submittal" in raw:
        return "submittal"
    if "drawing" in raw:
        return "drawing"
    if "spec" in raw:
        return "specification"
    if "daily" in raw:
        return "daily_report"
    if "task" in raw:
        return "task"
    if "risk" in raw:
        return "risk"
    return "document"


def _category_coverage_from_evidence(evidence: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    counts: Dict[str, int] = {}
    latest_by_category: Dict[str, str] = {}

    for row in evidence:
        category = _source_category(row.get("source_type"))
        counts[category] = counts.get(category, 0) + 1
        occurred_at = row.get("source_occurred_at")
        if occurred_at and str(occurred_at) > latest_by_category.get(category, ""):
            latest_by_category[category] = str(occurred_at)

    return [
        {
            "category": category,
            "label": SOURCE_CATEGORY_LABELS.get(category, category.replace("_", " ").title()),
            "availableCount": count,
            "sourceCount": count,
            "inPacketCount": count,
            "latestAt": latest_by_category.get(category),
            "tableNames": ["insight_card_evidence"],
        }
        for category, count in sorted(counts.items())
    ]


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
        .select("id,title,type,category,source,source_system,project_id,project,date,captured_at,created_at,summary,overview,status,participants,participants_array,source_metadata")
        .eq("id", source_document_id)
        .limit(1)
        .execute()
    )
    if not row:
        raise ValueError(f"document_metadata row not found: {source_document_id}")
    rag_row = _single_row(
        _rag_read()
        .table("rag_document_metadata")
        .select("content,raw_text,summary,overview")
        .eq("id", source_document_id)
        .limit(1)
        .execute()
    ) or {}
    if rag_row.get("content") or rag_row.get("raw_text"):
        row = {
            **row,
            "content": rag_row.get("content"),
            "raw_text": rag_row.get("raw_text"),
            "summary": rag_row.get("summary") or row.get("summary"),
            "overview": rag_row.get("overview") or row.get("overview"),
        }
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
        _rag_read().table("source_signal_candidates")
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
        .select("id, name, project_number, aliases")
        .eq("id", int(project_id))
        .limit(1)
        .execute()
    )
    if not row:
        raise ValueError(f"projects row not found: {project_id}")
    return row


def _fetch_project_optional(supabase: Any, project_id: Any) -> Optional[Dict[str, Any]]:
    if not project_id:
        return None
    try:
        return _fetch_project(supabase, int(project_id))
    except (TypeError, ValueError):
        return None


def _same_project_id(left: Any, right: Any) -> bool:
    try:
        return int(left) == int(right)
    except (TypeError, ValueError):
        return False


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
    if card_type in {"sentiment", "initiative_signal"}:
        return "strategic_read"
    return "current_read"


# Allowed insight_cards.card_type values. Mirrors InsightCardType in
# frontend/src/lib/ai/intelligence/types.ts and the CHECK constraint on
# insight_cards.card_type. Keep these three in lockstep.
INSIGHT_CARD_TYPES = {
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
    # Predictive + timeline card types (migration 20260614140000 widened the
    # insight_cards.card_type CHECK to allow these). flag = AI prediction
    # (e.g. potential change event); solution = resolution of an issue/risk;
    # milestone = notable project event.
    "flag",
    "solution",
    "milestone",
}


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
        _rag_read(),
        "source_intelligence_jobs",
        "id,status,queued_at,started_at,updated_at,finished_at,last_error",
    )
    packet_jobs = _table_rows(
        _rag_read(),
        "packet_refresh_jobs",
        "id,status,queued_at,started_at,updated_at,finished_at,output_packet_id,last_error",
    )
    signal_candidates = _table_rows(
        _rag_read(),
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
        "id,target_id,packet_type,compiler_version",
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
    base_slug = _slugify(" ".join(str(part) for part in slug_parts if part))

    # Disambiguate if slug is already taken by a different project
    slug = base_slug
    slug_taken = _single_row(
        supabase.table("intelligence_targets")
        .select("id, project_id")
        .eq("slug", base_slug)
        .limit(1)
        .execute()
    )
    if slug_taken and slug_taken.get("project_id") != int(project_id):
        slug = f"{base_slug}-{project_id}"

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
    try:
        return _single_row(
            supabase.table("intelligence_targets").insert(payload).execute()
        ) or payload
    except Exception as exc:
        if not _is_duplicate_intelligence_target_slug_error(exc):
            raise

    # Slug creation can race with another compiler or encounter an existing
    # manually-created target. Re-read by project first, then retry with the
    # deterministic project-id suffix so a duplicate slug never poisons the job.
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

    payload["slug"] = f"{base_slug}-{project_id}"
    try:
        return _single_row(
            supabase.table("intelligence_targets").insert(payload).execute()
        ) or payload
    except Exception as exc:
        if not _is_duplicate_intelligence_target_slug_error(exc):
            raise
        existing_by_slug = _single_row(
            supabase.table("intelligence_targets")
            .select("*")
            .eq("slug", payload["slug"])
            .limit(1)
            .execute()
        )
        if existing_by_slug:
            return existing_by_slug
        raise


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
    job_client = _rag_write()
    query = (
        job_client.table("source_intelligence_jobs")
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
        job_client.table("source_intelligence_jobs").insert(payload).execute()
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
    job_client = _rag_write()
    query = (
        job_client.table("source_intelligence_jobs")
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
            job_client.table("source_intelligence_jobs")
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
    _rag_write().table("source_intelligence_jobs").update(
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
        _rag_read().table("source_intelligence_jobs")
        .select("attempt_count")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    attempts = int((row or {}).get("attempt_count") or 0)
    status = "queued" if retryable and attempts < max_attempts else "failed"
    _rag_write().table("source_intelligence_jobs").update(
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
        _rag_write().table("source_signal_candidates").insert(payload).execute()
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
    if not candidate_project_id:
        return {}
    bounded_score = max(0.0, min(1.0, float(confidence_score)))
    status = "auto_assigned" if bounded_score >= 0.85 else "pending_review"

    _rag_write().table("document_attribution_candidates").delete().eq(
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
        _rag_write().table("document_attribution_candidates").insert(payload).execute()
    ) or payload


def classify_basic_signal(document: Dict[str, Any]) -> Dict[str, Any]:
    """Create a conservative, deterministic signal candidate from source text."""
    title = _clean_text(document.get("title")) or "Source update"
    raw_content = _clean_text(document.get("content") or document.get("raw_text"))
    summary_content = _clean_text(document.get("summary") or document.get("overview"))
    content = summary_content or raw_content
    haystack = f"{title} {raw_content} {summary_content}".lower()

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
    # Structural hints win: if the source payload carries an extracted
    # `sentiment_reason` field, it's a sentiment signal; if it carries a
    # `strategic_read` field or an `initiative_name` it's an initiative_signal.
    # Free-text emotional cues alone are too noisy for deterministic routing,
    # so plain keyword matches are not used here — those rely on the LLM
    # extractor with the structured prompt fields in prompts.py.
    if isinstance(document.get("sentiment_reason"), str) and document["sentiment_reason"].strip():
        signal_type = "sentiment"
    elif (
        isinstance(document.get("strategic_read"), str) and document["strategic_read"].strip()
    ) or (
        isinstance(document.get("initiative_name"), str) and document["initiative_name"].strip()
    ):
        signal_type = "initiative_signal"

    excerpt = content[:900] if content else title
    if excerpt.startswith("# "):
        # Fireflies markdown exports often begin with metadata before the useful
        # summary. Avoid projecting that header as the Project Intelligence read.
        excerpt = re.sub(r"^# .+?(?=(summary|overview|discussion|transcript)\b)", "", excerpt, flags=re.IGNORECASE).strip() or excerpt
    excerpt = excerpt.encode("ascii", "ignore").decode("ascii").strip() or title
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


def _source_family(document: Dict[str, Any]) -> str:
    raw = " ".join(
        str(value or "")
        for value in [
            document.get("source"),
            document.get("source_system"),
            document.get("category"),
            document.get("type"),
        ]
    ).lower()
    if "fireflies" in raw or "meeting" in raw or "transcript" in raw:
        return "fireflies"
    if "outlook" in raw or "email" in raw:
        return "outlook_email"
    if "teams" in raw or "chat" in raw or "message" in raw:
        return "teams"
    if "sharepoint" in raw:
        return "sharepoint_document"
    if "onedrive" in raw or "document" in raw:
        return "onedrive_document"
    if "attachment" in raw:
        return "email_attachment"
    if "daily" in raw:
        return "daily_log"
    return "other"


def _source_occurred_at(document: Dict[str, Any]) -> Optional[str]:
    for key in ("date", "captured_at", "created_at"):
        value = document.get(key)
        if value:
            return str(value)
    return None


def _source_business_date(document: Dict[str, Any]) -> date:
    parsed = _parse_timestamp(_source_occurred_at(document))
    return (parsed or datetime.now(timezone.utc)).date()


def _source_content(document: Dict[str, Any]) -> str:
    return str(
        document.get("content")
        or document.get("raw_text")
        or document.get("summary")
        or document.get("overview")
        or ""
    )


def _signal_json(signal: Dict[str, Any], *, source_document_id: str, confidence: str) -> Dict[str, Any]:
    return {
        "source_document_id": source_document_id,
        "title": signal.get("title"),
        "summary": signal.get("summary"),
        "why_it_matters": signal.get("why_it_matters"),
        "confidence": confidence,
    }


def write_source_synthesis(
    supabase: Any,
    *,
    document: Dict[str, Any],
    project_id: Optional[int],
    signal: Dict[str, Any],
    confidence_score: float,
    compiler_version: str,
) -> Dict[str, Any]:
    """Persist the reusable full-source operating synthesis record.

    This first implementation is deterministic and cost-free. It creates the
    durable contract row every downstream consumer needs; a later model-backed
    enrichment pass can update the same row without changing consumers.
    """
    source_document_id = str(document["id"])
    source_hash = _source_hash(document)
    confidence = confidence_label(confidence_score)
    content = _source_content(document)
    status = "succeeded" if content.strip() else "skipped_no_content"
    signal_type = signal.get("signal_type")
    base_signal = _signal_json(signal, source_document_id=source_document_id, confidence=confidence)

    payload = {
        "source_document_id": source_document_id,
        "source_family": _source_family(document),
        "project_id": int(project_id) if project_id else None,
        "source_occurred_at": _source_occurred_at(document),
        "source_title": document.get("title"),
        "source_url": _metadata_dict(document.get("source_metadata")).get("url")
        or _metadata_dict(document.get("source_metadata")).get("web_link"),
        "full_source_hash": source_hash,
        "synthesis_model": "deterministic_source_synthesis_v0_1",
        "synthesis_status": status,
        "executive_summary": signal.get("summary") if status == "succeeded" else None,
        "what_changed": [base_signal] if signal_type == "project_update" else [],
        "decisions": [base_signal] if signal_type == "decision" else [],
        "risks": [base_signal] if signal_type in {"risk", "blocker", "schedule_risk"} else [],
        "commitments": [base_signal] if signal_type == "task" else [],
        "tasks": [base_signal] if signal_type == "task" else [],
        "financial_signals": [base_signal] if signal_type == "financial_exposure" else [],
        "schedule_signals": [base_signal] if signal_type == "schedule_risk" else [],
        "change_event_signals": [base_signal] if _looks_like_change_event_signal(document, signal) else [],
        "daily_log_signals": [base_signal] if _source_family(document) == "daily_log" else [],
        "progress_report_signals": [base_signal]
        if signal_type in {"project_update", "milestone", "risk", "schedule_risk", "financial_exposure"}
        else [],
        "confidence": confidence if status == "succeeded" else "low",
        "confidence_notes": None if status == "succeeded" else "Source did not contain readable content.",
        "source_quotes": [
            {
                "excerpt": signal.get("excerpt"),
                "source_document_id": source_document_id,
            }
        ]
        if signal.get("excerpt")
        else [],
        "token_usage": {},
        "error_code": None,
        "error_message": None,
        "metadata": {
            "compiler_version": compiler_version,
            "deterministic_signal_type": signal_type,
            "normalized_signal_key": signal.get("normalized_signal_key"),
        },
        "completed_at": _utc_now() if status == "succeeded" else None,
        "updated_at": _utc_now(),
    }

    existing = _single_row(
        _rag_read()
        .table("source_syntheses")
        .select("*")
        .eq("source_document_id", source_document_id)
        .eq("full_source_hash", source_hash)
        .limit(1)
        .execute()
    )
    if existing:
        return _single_row(
            _rag_write()
            .table("source_syntheses")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    return _single_row(_rag_write().table("source_syntheses").insert(payload).execute()) or payload


def mark_source_synthesis_needs_project_review(
    source_synthesis: Dict[str, Any],
    *,
    reason: str,
) -> Dict[str, Any]:
    """Quarantine a source synthesis when its project attribution is not valid."""
    if not source_synthesis.get("id"):
        return {
            **source_synthesis,
            "project_id": None,
            "synthesis_status": "needs_project_review",
            "confidence": "low",
            "confidence_notes": reason,
        }
    payload = {
        "project_id": None,
        "synthesis_status": "needs_project_review",
        "confidence": "low",
        "confidence_notes": reason,
        "completed_at": None,
        "updated_at": _utc_now(),
    }
    return _single_row(
        _rag_write()
        .table("source_syntheses")
        .update(payload)
        .eq("id", source_synthesis["id"])
        .execute()
    ) or {**source_synthesis, **payload}


def _count_rows(
    supabase: Any,
    table_name: str,
    *,
    project_id: int,
    status_column: Optional[str] = None,
) -> Dict[str, Any]:
    result: Dict[str, Any] = {"total": 0, "byStatus": {}, "warning": None}
    try:
        total_response = (
            supabase.table(table_name)
            .select("id", count="exact")
            .eq("project_id", int(project_id))
            .limit(1)
            .execute()
        )
        result["total"] = int(getattr(total_response, "count", None) or 0)
        if status_column:
            rows = getattr(
                supabase.table(table_name)
                .select(status_column)
                .eq("project_id", int(project_id))
                .limit(1000)
                .execute(),
                "data",
                None,
            ) or []
            counts: Dict[str, int] = {}
            for row in rows:
                status = str(row.get(status_column) or "unknown")
                counts[status] = counts.get(status, 0) + 1
            result["byStatus"] = counts
    except Exception as exc:
        result["warning"] = f"{table_name} count failed: {str(exc)[:300]}"
    return result


def _project_financial_snapshot(project: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "budget": project.get("budget"),
        "budget_used": project.get("budget_used"),
        "estimated_revenue": project.get("est revenue"),
        "estimated_profit": project.get("est profit"),
        "estimated_completion": project.get("est completion"),
        "erp_sync_status": project.get("erp_sync_status"),
        "erp_system": project.get("erp_system"),
        "erp_last_direct_cost_sync": project.get("erp_last_direct_cost_sync"),
        "erp_last_job_cost_sync": project.get("erp_last_job_cost_sync"),
    }


def build_project_operating_snapshot_payload(
    supabase: Any,
    *,
    project_id: int,
    source_delta_id: Optional[str],
    source_coverage: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    project = _single_row(
        supabase.table("projects")
        .select("*")
        .eq("id", int(project_id))
        .limit(1)
        .execute()
    ) or {"id": int(project_id)}

    counts = {
        "rfis": _count_rows(supabase, "rfis", project_id=project_id, status_column="status"),
        "submittals": _count_rows(supabase, "submittals", project_id=project_id, status_column="status"),
        "change_events": _count_rows(supabase, "change_events", project_id=project_id, status_column="status"),
        "change_orders": _count_rows(supabase, "change_orders", project_id=project_id, status_column="status"),
        "potential_change_orders": _count_rows(supabase, "potential_change_orders", project_id=project_id, status_column="status"),
        "commitments": _count_rows(supabase, "commitments_unified", project_id=project_id, status_column="status"),
        "drawings": _count_rows(supabase, "drawings", project_id=project_id),
        "daily_logs": _count_rows(supabase, "daily_logs", project_id=project_id, status_column="status"),
        "progress_reports": _count_rows(supabase, "project_progress_reports", project_id=project_id, status_column="status"),
    }
    warnings = [
        value["warning"]
        for value in counts.values()
        if isinstance(value, dict) and value.get("warning")
    ]
    acumatica_sync_at = (
        project.get("erp_last_job_cost_sync")
        or project.get("erp_last_direct_cost_sync")
    )

    return {
        "project_id": int(project_id),
        "source_delta_id": source_delta_id,
        "source_coverage": source_coverage or {},
        "financial_snapshot": _project_financial_snapshot(project),
        "schedule_snapshot": {
            "start_date": project.get("start date"),
            "substantial_completion_date": project.get("est completion"),
            "completion_percentage": project.get("completion_percentage"),
            "stage": project.get("stage"),
            "phase": project.get("phase"),
        },
        "database_counts": counts,
        "project_info": {
            "id": project.get("id"),
            "name": project.get("name"),
            "project_number": project.get("project_number"),
            "company_id": project.get("company_id"),
            "health_status": project.get("health_status"),
        },
        "acumatica_sync_at": acumatica_sync_at,
        "freshness": {
            "snapshot_generated_at": _utc_now(),
            "erp_last_direct_cost_sync": project.get("erp_last_direct_cost_sync"),
            "erp_last_job_cost_sync": project.get("erp_last_job_cost_sync"),
        },
        "warnings": warnings,
        "confidence": "medium" if not warnings else "low",
    }


def write_project_operating_snapshot(
    supabase: Any,
    *,
    project_id: int,
    source_delta_id: Optional[str],
    source_coverage: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    payload = build_project_operating_snapshot_payload(
        supabase,
        project_id=project_id,
        source_delta_id=source_delta_id,
        source_coverage=source_coverage,
    )
    enforce_pm_app_final_projection_guard(
        "project_operating_snapshot_projection",
        row_counts={"project_operating_snapshots": 1},
    )
    return _single_row(supabase.table("project_operating_snapshots").insert(payload).execute()) or payload


def compile_project_daily_delta(
    supabase: Any,
    *,
    project_id: int,
    business_date: date,
    source_synthesis: Dict[str, Any],
    compiler_version: str,
) -> Dict[str, Any]:
    """Upsert the RAG-side project/day delta for downstream app projections."""
    source_id = source_synthesis.get("id")
    start_at = datetime.combine(business_date, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    end_at = (datetime.combine(business_date, datetime.min.time(), tzinfo=timezone.utc) + timedelta(days=1)).isoformat()
    syntheses = getattr(
        _rag_read()
        .table("source_syntheses")
        .select(
            "id,source_family,source_document_id,source_title,source_occurred_at,executive_summary,"
            "what_changed,decisions,risks,tasks,financial_signals,schedule_signals,change_event_signals,"
            "daily_log_signals,progress_report_signals,confidence"
        )
        .eq("project_id", int(project_id))
        .gte("source_occurred_at", start_at)
        .lt("source_occurred_at", end_at)
        .execute(),
        "data",
        None,
    ) or []
    if not syntheses and source_synthesis:
        syntheses = [source_synthesis]

    def collect(key: str) -> List[Any]:
        items: List[Any] = []
        for row in syntheses:
            value = row.get(key)
            if isinstance(value, list):
                items.extend(value)
        return items

    families: Dict[str, int] = {}
    for row in syntheses:
        family = str(row.get("source_family") or "unknown")
        families[family] = families.get(family, 0) + 1

    headline = None
    for row in syntheses:
        if row.get("executive_summary"):
            headline = str(row["executive_summary"])[:500]
            break
    headline = headline or f"{len(syntheses)} source update(s) processed for project {project_id}."

    payload = {
        "project_id": int(project_id),
        "business_date": business_date.isoformat(),
        "status": "succeeded" if syntheses else "skipped_no_sources",
        "source_synthesis_ids": [row["id"] for row in syntheses if row.get("id")],
        "headline": headline,
        "what_changed": collect("what_changed"),
        "decisions": collect("decisions"),
        "risks": collect("risks"),
        "issues": collect("risks"),
        "milestones": [],
        "financial_changes": collect("financial_signals"),
        "schedule_changes": collect("schedule_signals"),
        "change_event_candidates": collect("change_event_signals"),
        "task_candidates": collect("tasks"),
        "daily_report_draft": {
            "date": business_date.isoformat(),
            "source_count": len(syntheses),
            "field_activity_signals": collect("daily_log_signals"),
            "summary": headline,
        },
        "progress_report_updates": {
            "week_start": (business_date - timedelta(days=business_date.weekday())).isoformat(),
            "source_count": len(syntheses),
            "updates": collect("progress_report_signals"),
            "risks": collect("risks"),
            "financial_changes": collect("financial_signals"),
            "schedule_changes": collect("schedule_signals"),
        },
        "source_coverage": {
            "source_count": len(syntheses),
            "families": families,
            "latest_source_synthesis_id": source_id,
        },
        "confidence": _best_confidence(syntheses) if syntheses else "low",
        "confidence_notes": "Deterministic daily delta from source_syntheses; model enrichment can update this row.",
        "model": "deterministic_project_daily_delta_v0_1",
        "token_usage": {},
        "error_code": None,
        "error_message": None,
        "metadata": {"compiler_version": compiler_version},
        "completed_at": _utc_now(),
        "updated_at": _utc_now(),
    }

    existing = _single_row(
        _rag_read()
        .table("project_daily_deltas")
        .select("*")
        .eq("project_id", int(project_id))
        .eq("business_date", business_date.isoformat())
        .neq("status", "superseded")
        .limit(1)
        .execute()
    )
    if existing:
        return _single_row(
            _rag_write()
            .table("project_daily_deltas")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    return _single_row(_rag_write().table("project_daily_deltas").insert(payload).execute()) or payload


def _looks_like_change_event_signal(document: Dict[str, Any], signal: Dict[str, Any]) -> bool:
    haystack = f"{document.get('title') or ''} {_source_content(document)} {signal.get('summary') or ''}".lower()
    return bool(
        re.search(
            r"\b(change event|change order|pco|cco|scope change|cost exposure|extra work|delay claim|backcharge)\b",
            haystack,
        )
    )


def _timeline_event_type(signal_type: str) -> str:
    return {
        "decision": "decision",
        "risk": "risk",
        "blocker": "issue",
        "financial_exposure": "cost_exposure",
        "schedule_risk": "schedule_impact",
        "task": "progress_update",
        "project_update": "progress_update",
    }.get(signal_type, "document")


def _timeline_priority(signal_type: str) -> str:
    if signal_type in {"blocker", "schedule_risk", "financial_exposure"}:
        return "high"
    if signal_type in {"risk", "decision"}:
        return "medium"
    return "low"


def _upsert_project_timeline_event(
    supabase: Any,
    *,
    project_id: int,
    source_synthesis: Dict[str, Any],
    signal: Dict[str, Any],
    document: Dict[str, Any],
) -> Dict[str, Any]:
    signal_type = str(signal.get("signal_type") or "project_update")
    source_document_id = str(document["id"])
    existing = _single_row(
        supabase.table("project_intelligence_timeline_events")
        .select("*")
        .eq("project_id", int(project_id))
        .eq("source_document_id", source_document_id)
        .eq("source_synthesis_id", source_synthesis.get("id"))
        .limit(1)
        .execute()
    )
    payload = {
        "project_id": int(project_id),
        "event_at": _source_occurred_at(document) or _utc_now(),
        "event_type": "change_event_signal"
        if _looks_like_change_event_signal(document, signal)
        else _timeline_event_type(signal_type),
        "title": signal.get("title") or document.get("title") or "Project update",
        "summary": signal.get("summary"),
        "why_it_matters": signal.get("why_it_matters"),
        "current_status": "needs_decision" if signal_type == "decision" else "monitoring",
        "owner_label": None,
        "priority": _timeline_priority(signal_type),
        "source_synthesis_id": source_synthesis.get("id"),
        "source_document_id": source_document_id,
        "related_event_ids": [],
        "related_record_type": "document_metadata",
        "related_record_id": source_document_id,
        "confidence": source_synthesis.get("confidence") or "unknown",
        "metadata": {
            "normalized_signal_key": signal.get("normalized_signal_key"),
            "source_family": source_synthesis.get("source_family"),
        },
        "updated_at": _utc_now(),
    }
    enforce_pm_app_final_projection_guard(
        "project_intelligence_timeline_projection",
        row_counts={"project_intelligence_timeline_events": 1},
    )
    if existing:
        return _single_row(
            supabase.table("project_intelligence_timeline_events")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    return _single_row(supabase.table("project_intelligence_timeline_events").insert(payload).execute()) or payload


def _upsert_timeline_event_source(
    supabase: Any,
    *,
    timeline_event: Dict[str, Any],
    source_synthesis: Dict[str, Any],
    document: Dict[str, Any],
    signal: Dict[str, Any],
) -> Dict[str, Any]:
    existing = _single_row(
        supabase.table("project_intelligence_timeline_event_sources")
        .select("*")
        .eq("timeline_event_id", timeline_event["id"])
        .eq("source_document_id", str(document["id"]))
        .limit(1)
        .execute()
    )
    payload = {
        "timeline_event_id": timeline_event["id"],
        "source_synthesis_id": source_synthesis.get("id"),
        "source_document_id": str(document["id"]),
        "source_family": source_synthesis.get("source_family"),
        "source_title": document.get("title"),
        "source_excerpt": signal.get("excerpt"),
        "source_url": source_synthesis.get("source_url"),
        "source_occurred_at": _source_occurred_at(document),
        "confidence": source_synthesis.get("confidence") or "unknown",
        "metadata": {"compiler_version": COMPILER_VERSION},
    }
    if existing:
        return _single_row(
            supabase.table("project_intelligence_timeline_event_sources")
            .update(payload)
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    return _single_row(
        supabase.table("project_intelligence_timeline_event_sources").insert(payload).execute()
    ) or payload


def _upsert_change_event_candidate(
    supabase: Any,
    *,
    project_id: int,
    source_synthesis: Dict[str, Any],
    timeline_event: Dict[str, Any],
    signal: Dict[str, Any],
    document: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if not _looks_like_change_event_signal(document, signal):
        return None
    title = f"Potential change: {signal.get('title') or document.get('title') or 'source update'}"[:180]
    existing = _single_row(
        supabase.table("change_event_candidates")
        .select("*")
        .eq("project_id", int(project_id))
        .eq("title", title)
        .in_("status", ["candidate", "reviewing", "draft_created"])
        .limit(1)
        .execute()
    )
    payload = {
        "project_id": int(project_id),
        "title": title,
        "description": signal.get("summary"),
        "reason": "Source language suggests a potential scope, cost, schedule, or change-order exposure.",
        "potential_cost_impact": None,
        "potential_schedule_impact": None,
        "source_synthesis_ids": [source_synthesis.get("id")] if source_synthesis.get("id") else [],
        "timeline_event_ids": [timeline_event.get("id")] if timeline_event.get("id") else [],
        "confidence": source_synthesis.get("confidence") or "unknown",
        "missing_information": [
            "Confirm whether this is already covered by contract scope.",
            "Confirm cost and schedule impact before creating a formal change event.",
        ],
        "status": "candidate",
        "metadata": {
            "source_document_id": str(document["id"]),
            "normalized_signal_key": signal.get("normalized_signal_key"),
        },
        "updated_at": _utc_now(),
    }
    enforce_pm_app_final_projection_guard(
        "change_event_candidate_projection",
        row_counts={"change_event_candidates": 1},
    )
    if existing:
        merged_source_ids = _append_unique(existing.get("source_synthesis_ids"), source_synthesis.get("id"))
        merged_event_ids = _append_unique(existing.get("timeline_event_ids"), timeline_event.get("id"))
        return _single_row(
            supabase.table("change_event_candidates")
            .update({**payload, "source_synthesis_ids": merged_source_ids, "timeline_event_ids": merged_event_ids})
            .eq("id", existing["id"])
            .execute()
        ) or {**existing, **payload}
    return _single_row(supabase.table("change_event_candidates").insert(payload).execute()) or payload


def _upsert_project_report_suggestions(
    supabase: Any,
    *,
    project_id: int,
    daily_delta: Dict[str, Any],
    snapshot: Dict[str, Any],
    timeline_event: Dict[str, Any],
    business_date: date,
) -> List[Dict[str, Any]]:
    week_start = business_date - timedelta(days=business_date.weekday())
    suggestions = [
        {
            "report_type": "project_daily_report",
            "business_date": business_date.isoformat(),
            "week_start_date": None,
            "title": f"Daily report draft for {business_date.isoformat()}",
            "suggestion_payload": daily_delta.get("daily_report_draft") or {},
        },
        {
            "report_type": "weekly_progress_report",
            "business_date": None,
            "week_start_date": week_start.isoformat(),
            "title": f"Weekly progress report updates for week of {week_start.isoformat()}",
            "suggestion_payload": daily_delta.get("progress_report_updates") or {},
        },
    ]
    written: List[Dict[str, Any]] = []
    for suggestion in suggestions:
        existing_query = (
            supabase.table("project_report_suggestions")
            .select("*")
            .eq("project_id", int(project_id))
            .eq("report_type", suggestion["report_type"])
            .eq("source_delta_id", daily_delta.get("id"))
            .limit(1)
        )
        existing = _single_row(existing_query.execute())
        payload = {
            "project_id": int(project_id),
            "report_type": suggestion["report_type"],
            "business_date": suggestion["business_date"],
            "week_start_date": suggestion["week_start_date"],
            "source_delta_id": daily_delta.get("id"),
            "source_snapshot_id": snapshot.get("id"),
            "title": suggestion["title"],
            "suggestion_payload": suggestion["suggestion_payload"],
            "source_timeline_event_ids": [timeline_event.get("id")] if timeline_event.get("id") else [],
            "status": "suggested",
            "confidence": daily_delta.get("confidence") or "unknown",
            "metadata": {"compiler_version": COMPILER_VERSION},
            "updated_at": _utc_now(),
        }
        if existing:
            written.append(
                _single_row(
                    supabase.table("project_report_suggestions")
                    .update(payload)
                    .eq("id", existing["id"])
                    .execute()
                )
                or {**existing, **payload}
            )
        else:
            written.append(
                _single_row(supabase.table("project_report_suggestions").insert(payload).execute())
                or payload
            )
    return written


def apply_source_operating_record_projection(
    supabase: Any,
    *,
    document: Dict[str, Any],
    project_id: int,
    source_synthesis: Dict[str, Any],
    daily_delta: Dict[str, Any],
    signal: Dict[str, Any],
) -> Dict[str, Any]:
    """Write the app-facing Project Intelligence operating-record projection."""
    source_coverage = daily_delta.get("source_coverage") if isinstance(daily_delta, dict) else {}
    snapshot = write_project_operating_snapshot(
        supabase,
        project_id=project_id,
        source_delta_id=daily_delta.get("id"),
        source_coverage=source_coverage if isinstance(source_coverage, dict) else {},
    )
    timeline_event = _upsert_project_timeline_event(
        supabase,
        project_id=project_id,
        source_synthesis=source_synthesis,
        signal=signal,
        document=document,
    )
    timeline_source = _upsert_timeline_event_source(
        supabase,
        timeline_event=timeline_event,
        source_synthesis=source_synthesis,
        document=document,
        signal=signal,
    )
    change_candidate = _upsert_change_event_candidate(
        supabase,
        project_id=project_id,
        source_synthesis=source_synthesis,
        timeline_event=timeline_event,
        signal=signal,
        document=document,
    )

    current_state_payload = {
        "project_id": int(project_id),
        "current_summary": daily_delta.get("headline") or source_synthesis.get("executive_summary"),
        "health_status": "watch" if daily_delta.get("risks") or daily_delta.get("issues") else "unknown",
        "what_changed_since_last_update": daily_delta.get("what_changed") or [],
        "needs_attention": (daily_delta.get("risks") or []) + (daily_delta.get("change_event_candidates") or []),
        "open_decisions": daily_delta.get("decisions") or [],
        "active_risks": daily_delta.get("risks") or [],
        "financial_read": _clean_text((daily_delta.get("financial_changes") or [{}])[0].get("summary"))
        if daily_delta.get("financial_changes")
        else None,
        "schedule_read": _clean_text((daily_delta.get("schedule_changes") or [{}])[0].get("summary"))
        if daily_delta.get("schedule_changes")
        else None,
        "field_read": _clean_text((daily_delta.get("daily_report_draft") or {}).get("summary")),
        "source_confidence": {
            "confidence": daily_delta.get("confidence"),
            "source_coverage": daily_delta.get("source_coverage"),
        },
        "last_delta_id": daily_delta.get("id"),
        "last_snapshot_id": snapshot.get("id"),
        "updated_at": _utc_now(),
    }
    existing_current_state = _single_row(
        supabase.table("project_current_state")
        .select("project_id")
        .eq("project_id", int(project_id))
        .limit(1)
        .execute()
    )
    enforce_pm_app_final_projection_guard(
        "project_current_state_projection",
        row_counts={"project_current_state": 1},
    )
    if existing_current_state:
        current_state = _single_row(
            supabase.table("project_current_state")
            .update(current_state_payload)
            .eq("project_id", int(project_id))
            .execute()
        ) or current_state_payload
    else:
        current_state = _single_row(
            supabase.table("project_current_state").insert(current_state_payload).execute()
        ) or current_state_payload

    report_suggestions = _upsert_project_report_suggestions(
        supabase,
        project_id=project_id,
        daily_delta=daily_delta,
        snapshot=snapshot,
        timeline_event=timeline_event,
        business_date=_source_business_date(document),
    )
    return {
        "snapshot_id": snapshot.get("id"),
        "current_state_project_id": current_state.get("project_id"),
        "timeline_event_id": timeline_event.get("id"),
        "timeline_event_source_id": timeline_source.get("id"),
        "change_event_candidate_id": change_candidate.get("id") if change_candidate else None,
        "report_suggestion_ids": [row.get("id") for row in report_suggestions if row.get("id")],
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
    job_client = _rag_write()
    existing = _single_row(
        job_client.table("packet_refresh_jobs")
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
                job_client.table("packet_refresh_jobs")
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
        job_client.table("packet_refresh_jobs").insert(payload).execute()
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


# Risk-bearing card types that carry a 1-5 severity on the timeline.
_SEVERITY_CARD_TYPES = {"risk", "schedule_risk", "financial_exposure", "blocker"}
_SEVERITY_IMPACT = {"low": 1, "medium": 3, "high": 5}
_SEVERITY_LIKELIHOOD = {"low": 0, "medium": 1, "high": 2}


def _derive_card_severity(candidate: Dict[str, Any]) -> Optional[int]:
    """1-5 timeline severity for risk-bearing cards.

    Prefers an explicit ``severity`` emitted by the LLM; otherwise derives it
    from likelihood x impact in ``extraction_json``. Returns None for
    non-risk card types or when the inputs are missing.
    """
    if candidate.get("signal_type") not in _SEVERITY_CARD_TYPES:
        return None
    raw = candidate.get("extraction_json") or {}
    explicit = raw.get("severity")
    if isinstance(explicit, (int, float)) and 1 <= explicit <= 5:
        return int(round(explicit))
    impact = _SEVERITY_IMPACT.get(str(raw.get("impact") or "").lower())
    if impact is None:
        return None
    likelihood = _SEVERITY_LIKELIHOOD.get(str(raw.get("likelihood") or "").lower(), 0)
    return max(1, min(5, impact + likelihood - 1))


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
            "severity": _derive_card_severity(candidate),
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
        "occurred_at": last_seen_at,
        "severity": _derive_card_severity(candidate),
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
            "categoryCoverage": _category_coverage_from_evidence(evidence),
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
    projection = build_current_packet_projection(
        supabase,
        target_id,
        compiler_version=compiler_version,
    )
    return apply_current_packet_projection(supabase, projection)


def build_current_packet_projection(
    supabase: Any,
    target_id: str,
    *,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Build a bounded final PM packet projection payload without writing it."""
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
    packet_card_rows = [
        {
            "insight_card_id": card["id"],
            "section": _section_for_card(card.get("card_type") or ""),
            "rank": index + 1,
            "included_reason": "Active promoted card for the current intelligence packet.",
        }
        for index, card in enumerate(cards)
    ]

    return {
        "projection_type": "current_packet",
        "target_id": target_id,
        "compiler_version": compiler_version,
        "row_counts": {
            "intelligence_packets": 1,
            "intelligence_packet_cards": len(packet_card_rows),
        },
        "packet_payload": payload,
        "packet_card_rows": packet_card_rows,
        "card_count": len(cards),
        "evidence_count": len(evidence),
    }


def apply_current_packet_projection(
    supabase: Any,
    projection: Dict[str, Any],
) -> Dict[str, Any]:
    """Apply a previously staged bounded packet projection to PM tables."""
    target_id = projection["target_id"]
    payload = projection["packet_payload"]
    packet_card_rows = list(projection.get("packet_card_rows") or [])
    enforce_pm_app_final_projection_guard(
        "intelligence_apply_current_packet_projection",
        row_counts=projection.get("row_counts") or {},
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
        {**row, "packet_id": packet["id"]}
        for row in packet_card_rows
    ]
    for start in range(0, len(packet_card_rows), 500):
        supabase.table("intelligence_packet_cards").insert(
            packet_card_rows[start : start + 500]
        ).execute()

    return {
        "status": "compiled",
        "packet_id": packet.get("id"),
        "target_id": target_id,
        "card_count": int(projection.get("card_count") or 0),
        "evidence_count": int(projection.get("evidence_count") or 0),
    }


def stage_current_packet_projection_job(
    supabase: Any,
    job_id: str,
    *,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Stage a final PM packet projection payload on the RAG packet job."""
    job = _single_row(
        _rag_read().table("packet_refresh_jobs")
        .select("*")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    if not job:
        raise ValueError(f"packet_refresh_jobs row not found: {job_id}")

    projection = build_current_packet_projection(
        supabase,
        job["target_id"],
        compiler_version=compiler_version,
    )
    updated = _single_row(
        _rag_write().table("packet_refresh_jobs")
        .update(
            {
                "status": "succeeded",
                "projection_status": "staged",
                "projection_payload": projection,
                "projection_error": None,
                "finished_at": _utc_now(),
                "updated_at": _utc_now(),
            }
        )
        .eq("id", job_id)
        .execute()
    ) or job
    return {
        "status": "staged",
        "packet_refresh_job_id": job_id,
        "target_id": projection["target_id"],
        "card_count": projection["card_count"],
        "evidence_count": projection["evidence_count"],
        "row_counts": projection["row_counts"],
        "job": updated,
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
        _rag_write().table("source_signal_candidates").update(
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
    enforce_pm_app_final_projection_guard(
        "intelligence_promote_signal_candidate",
        row_counts={
            "insight_cards": 1,
            "insight_card_targets": 1,
            "insight_card_evidence": 1,
        },
    )
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
        _rag_write().table("source_signal_candidates")
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

    refresh_job = None
    if _source_category(document.get("category") or document.get("source") or "") == "meeting":
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
        "packet_refresh_job_id": refresh_job.get("id") if refresh_job else None,
    }


def claim_queued_packet_refresh_jobs(
    supabase: Any,
    *,
    limit: int = 5,
    compiler_version: str = COMPILER_VERSION,
) -> List[Dict[str, Any]]:
    job_client = _rag_write()
    query = (
        job_client.table("packet_refresh_jobs")
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
            job_client.table("packet_refresh_jobs")
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
    _rag_write().table("packet_refresh_jobs").update(
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
        _rag_read().table("packet_refresh_jobs")
        .select("attempt_count")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    attempts = int((row or {}).get("attempt_count") or 0)
    status = "queued" if retryable and attempts < max_attempts else "failed"
    _rag_write().table("packet_refresh_jobs").update(
        {
            "status": status,
            "last_error": error[:2000],
            "finished_at": _utc_now() if status == "failed" else None,
            "updated_at": _utc_now(),
        }
    ).eq("id", job_id).execute()


def claim_staged_pm_projection_jobs(
    *,
    limit: int = 5,
    compiler_version: str = COMPILER_VERSION,
) -> List[Dict[str, Any]]:
    """Claim staged RAG packet jobs for bounded PM projection draining."""
    limit = max(0, min(int(limit or 0), 25))
    if not limit:
        return []

    job_client = _rag_write()
    query = (
        job_client.table("packet_refresh_jobs")
        .select("*")
        .eq("status", "succeeded")
        .eq("projection_status", "staged")
        .eq("compiler_version", compiler_version)
        .order("priority", desc=True)
        .order("queued_at")
        .limit(limit)
    )
    rows = getattr(query.execute(), "data", None) or []
    claimed: List[Dict[str, Any]] = []
    for row in rows:
        updated = _single_row(
            job_client.table("packet_refresh_jobs")
            .update(
                {
                    "projection_status": "projecting",
                    "projection_attempt_count": int(row.get("projection_attempt_count") or 0) + 1,
                    "projection_error": None,
                    "updated_at": _utc_now(),
                }
            )
            .eq("id", row["id"])
            .eq("projection_status", "staged")
            .execute()
        )
        if updated:
            claimed.append(updated)
    return claimed


def project_pm_intelligence_packet_job(
    supabase: Any,
    job_id: str,
) -> Dict[str, Any]:
    """Drain one staged RAG packet job into PM through the projection guard."""
    job = _single_row(
        _rag_read().table("packet_refresh_jobs")
        .select("*")
        .eq("id", job_id)
        .limit(1)
        .execute()
    )
    if not job:
        raise ValueError(f"packet_refresh_jobs row not found: {job_id}")

    projection = job.get("projection_payload") or {}
    if not projection:
        raise ValueError(f"packet_refresh_jobs row has no projection_payload: {job_id}")

    if job.get("projection_status") != "projecting":
        _rag_write().table("packet_refresh_jobs").update(
            {
                "projection_status": "projecting",
                "projection_attempt_count": int(job.get("projection_attempt_count") or 0) + 1,
                "projection_error": None,
                "updated_at": _utc_now(),
            }
        ).eq("id", job_id).execute()

    try:
        result = apply_current_packet_projection(supabase, projection)
        _rag_write().table("packet_refresh_jobs").update(
            {
                "status": "succeeded",
                "output_packet_id": result.get("packet_id"),
                "projected_output_packet_id": str(result.get("packet_id") or ""),
                "projection_status": "projected",
                "projection_error": None,
                "projected_at": _utc_now(),
                "updated_at": _utc_now(),
            }
        ).eq("id", job_id).execute()
        return {
            **result,
            "status": "projected",
            "packet_refresh_job_id": job_id,
        }
    except Exception as exc:
        _rag_write().table("packet_refresh_jobs").update(
            {
                "projection_status": "failed",
                "projection_error": str(exc)[:2000],
                "updated_at": _utc_now(),
            }
        ).eq("id", job_id).execute()
        raise


def run_pm_intelligence_projection_batch(
    supabase: Any,
    *,
    limit: int = 5,
    max_processing_time_ms: Optional[int] = None,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Drain staged PM packet projections from RAG in a bounded batch."""
    started = time.monotonic()
    limit = max(0, min(int(limit or 0), 25))
    stats: Dict[str, Any] = {
        "projection_jobs_claimed": 0,
        "projection_jobs_succeeded": 0,
        "projection_jobs_failed": 0,
        "failed_projection_job_ids": [],
        "timed_out": False,
        "processing_time_ms": 0,
    }

    jobs = claim_staged_pm_projection_jobs(
        limit=limit,
        compiler_version=compiler_version,
    )
    stats["projection_jobs_claimed"] = len(jobs)
    for job in jobs:
        if _time_limit_reached(started, max_processing_time_ms):
            stats["timed_out"] = True
            break
        job_id = job.get("id")
        try:
            project_pm_intelligence_packet_job(supabase, job["id"])
            stats["projection_jobs_succeeded"] += 1
        except Exception:
            stats["projection_jobs_failed"] += 1
            if job_id:
                stats["failed_projection_job_ids"].append(job_id)

    stats["processing_time_ms"] = int((time.monotonic() - started) * 1000)
    return stats


def process_packet_refresh_job(
    supabase: Any,
    job_id: str,
    *,
    compiler_version: str = COMPILER_VERSION,
) -> Dict[str, Any]:
    """Run one packet refresh job and record the output packet id."""
    job = _single_row(
        _rag_read().table("packet_refresh_jobs")
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
    _rag_write().table("packet_refresh_jobs").update(update_payload).eq("id", job_id).execute()

    try:
        if os.getenv("INTELLIGENCE_STAGE_PM_PROJECTION", "false").lower() in {"1", "true", "yes"}:
            result = stage_current_packet_projection_job(
                supabase,
                job_id,
                compiler_version=compiler_version,
            )
            return {
                **result,
                "packet_refresh_job_id": job_id,
            }

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
            inline_refresh_enabled = os.getenv(
                "INTELLIGENCE_INLINE_PACKET_REFRESH",
                "false",
            ).lower() in {"1", "true", "yes"}
            if compile_packet and refresh_job_id and inline_refresh_enabled:
                result["packet"] = process_packet_refresh_job(
                    supabase,
                    refresh_job_id,
                    compiler_version=compiler_version,
                )
            elif refresh_job_id:
                result["packet"] = {
                    "status": "queued",
                    "packet_refresh_job_id": refresh_job_id,
                    "reason": "packet refresh queued for scheduled/batched synthesis compiler",
                }
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
        output_summary = existing_job.get("output_summary") if isinstance(existing_job.get("output_summary"), dict) else {}
        output_project_id = output_summary.get("project_id")
        document_project_id = document.get("project_id")
        project_id = output_project_id or document_project_id
        invalid_project_note = None
        if project_id:
            project_row = _fetch_project_optional(supabase, project_id)
            if not project_row and document_project_id and not _same_project_id(document_project_id, project_id):
                project_row = _fetch_project_optional(supabase, document_project_id)
                project_id = document_project_id if project_row else project_id
            if not project_row:
                invalid_project_note = (
                    "Existing compiler job referenced missing project_id "
                    f"{project_id}; source needs project attribution review."
                )
                project_id = None
        existing_source_synthesis = _single_row(
            _rag_read()
            .table("source_syntheses")
            .select("*")
            .eq("source_document_id", source_document_id)
            .eq("full_source_hash", source_hash)
            .limit(1)
            .execute()
        )
        if existing_source_synthesis and existing_source_synthesis.get("project_id"):
            existing_project_id = existing_source_synthesis.get("project_id")
            if not _fetch_project_optional(supabase, existing_project_id):
                invalid_project_note = (
                    "Existing source synthesis referenced missing project_id "
                    f"{existing_project_id}; source needs project attribution review."
                )
                existing_source_synthesis = mark_source_synthesis_needs_project_review(
                    existing_source_synthesis,
                    reason=invalid_project_note,
                )
                catchup_summary = {
                    **output_summary,
                    "project_id": None,
                    "source_synthesis_id": existing_source_synthesis.get("id"),
                    "project_daily_delta_id": None,
                    "operating_projection": None,
                    "operating_projection_catchup": True,
                    "operating_projection_skipped": "missing_project",
                    "project_review_reason": invalid_project_note,
                }
                if existing_job.get("id"):
                    _rag_write().table("source_intelligence_jobs").update(
                        {
                            "output_summary": catchup_summary,
                            "updated_at": _utc_now(),
                        }
                    ).eq("id", existing_job["id"]).execute()
                return {
                    "status": "succeeded",
                    **catchup_summary,
                }
        if not existing_source_synthesis:
            confidence_score = float(output_summary.get("confidence_score") or (0.95 if project_id else 0.0))
            signal = classify_basic_signal(document)
            source_synthesis = write_source_synthesis(
                supabase,
                document=document,
                project_id=int(project_id) if project_id else None,
                signal=signal,
                confidence_score=confidence_score,
                compiler_version=compiler_version,
            )
            daily_delta = None
            operating_projection = None
            if invalid_project_note:
                source_synthesis = mark_source_synthesis_needs_project_review(
                    source_synthesis,
                    reason=invalid_project_note,
                )
            if project_id and source_synthesis.get("synthesis_status") == "succeeded":
                daily_delta = compile_project_daily_delta(
                    supabase,
                    project_id=int(project_id),
                    business_date=_source_business_date(document),
                    source_synthesis=source_synthesis,
                    compiler_version=compiler_version,
                )
                operating_projection = apply_source_operating_record_projection(
                    supabase,
                    document=document,
                    project_id=int(project_id),
                    source_synthesis=source_synthesis,
                    daily_delta=daily_delta,
                    signal=signal,
                )
            catchup_summary = {
                **output_summary,
                "project_id": int(project_id) if project_id else None,
                "source_synthesis_id": source_synthesis.get("id") if source_synthesis else None,
                "project_daily_delta_id": daily_delta.get("id") if daily_delta else None,
                "operating_projection": operating_projection,
                "operating_projection_catchup": True,
                "operating_projection_skipped": "missing_project" if invalid_project_note else None,
                "project_review_reason": invalid_project_note,
            }
            if existing_job.get("id"):
                _rag_write().table("source_intelligence_jobs").update(
                    {
                        "output_summary": catchup_summary,
                        "updated_at": _utc_now(),
                    }
                ).eq("id", existing_job["id"]).execute()
            return {
                "status": "succeeded",
                **catchup_summary,
            }
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
        _rag_write().table("source_intelligence_jobs").update(update_payload).eq("id", job_id).execute()

    try:
        existing_project_id = document.get("project_id")
        project_id = existing_project_id
        attribution_method = "existing_project_id" if project_id else "project_inference"
        confidence_score = 0.95 if project_id else 0.0
        corrected_project_attribution = False
        inferred_missing_project_attribution = False
        invalid_project_note = None
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
            inferred_missing_project_attribution = bool(project_id)

        if project_id:
            project = _fetch_project_optional(supabase, project_id)
            if not project:
                invalid_project_note = (
                    "Source referenced missing project_id "
                    f"{project_id}; source needs project attribution review."
                )
                project_id = None
                confidence_score = 0.0
                attribution_method = "missing_project_review"
            else:
                project_name = project.get("name")
                if (corrected_project_attribution or inferred_missing_project_attribution) and project_name:
                    supabase.table("document_metadata").update(
                        {
                            "project_id": int(project_id),
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
                else ["document_metadata.title", "document_metadata.content"]
                if inferred_missing_project_attribution
                else ["document_metadata.project_id"]
                if invalid_project_note
                else ["document_metadata.project_id"]
                if document.get("project_id")
                else []
            ),
            reasoning=(
                "Existing document_metadata.project_id was corrected because the source title strongly matched another project."
                if corrected_project_attribution
                else
                "Missing document_metadata.project_id was filled from project inference."
                if inferred_missing_project_attribution
                else
                invalid_project_note
                if invalid_project_note
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
        source_synthesis = write_source_synthesis(
            supabase,
            document=document,
            project_id=int(project_id) if project_id else None,
            signal=signal,
            confidence_score=confidence_score,
            compiler_version=compiler_version,
        )
        if invalid_project_note:
            source_synthesis = mark_source_synthesis_needs_project_review(
                source_synthesis,
                reason=invalid_project_note,
            )
        daily_delta = None
        operating_projection = None
        if project_id and source_synthesis.get("synthesis_status") == "succeeded":
            daily_delta = compile_project_daily_delta(
                supabase,
                project_id=int(project_id),
                business_date=_source_business_date(document),
                source_synthesis=source_synthesis,
                compiler_version=compiler_version,
            )
            operating_projection = apply_source_operating_record_projection(
                supabase,
                document=document,
                project_id=int(project_id),
                source_synthesis=source_synthesis,
                daily_delta=daily_delta,
                signal=signal,
            )
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

            if confidence_score >= 0.85 and _source_category(document.get("category") or document.get("source") or "") == "meeting":
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
            "source_synthesis_id": source_synthesis.get("id") if source_synthesis else None,
            "project_daily_delta_id": daily_delta.get("id") if daily_delta else None,
            "operating_projection": operating_projection,
            "operating_projection_skipped": "missing_project" if invalid_project_note else None,
            "project_review_reason": invalid_project_note,
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
