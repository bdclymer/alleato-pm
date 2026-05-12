"""
Task extraction service — pulls action items from meetings, emails, and Teams messages.

Reads from document_metadata filtered to communication types (meeting, email,
teams_dm, teams_dm_conversation, teams_message). Skips interview/test records
and documents that have already been processed within the current window.
Uses GPT-5.5 via the existing LLM provider config (AI Gateway or direct).

Called by scheduler.py on a daily cron (replacing the old Vercel cron route).
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from openai import OpenAI

from .supabase_helpers import get_supabase_client
from .task_assignees import TaskAssigneeResolver, clean_text

logger = logging.getLogger(__name__)

TASK_EXTRACTION_MODEL = "gpt-5.5"
TASK_EXTRACTION_PROMPT_VERSION = "task_extraction.v2.gpt-5.5"
TASK_EXTRACTION_DEFAULT_LIMIT = 100
TASK_EXTRACTION_CANDIDATE_MULTIPLIER = 25

# Source types that can contain action items.
TASK_SOURCE_TYPES = (
    "meeting",
    "email",
    "teams_dm",
    "teams_dm_conversation",
    "teams_message",
)

# Never generate tasks from these.
EXCLUDE_TYPES = ("interview", "Interview")

_EXTRACT_PROMPT = """\
You are extracting action items assigned to specific people from this {type_label}.

Source communication date: {source_date}

Rules:
- Only extract tasks that are clearly assigned to a named person
- Do NOT extract vague "team" tasks or self-evident follow-ups
- Do NOT invent tasks — only extract what is explicitly stated
- Each task must have a clear action verb and a named owner
- Interpret relative dates like "tomorrow", "next Friday", or "end of week" using the source communication date, not today's date
- If no qualifying tasks exist, return an empty array

Respond ONLY with a JSON array (no markdown, no explanation):
[{{"title":"Short action title (max 10 words)","description":"Full context description",\
"assignee_name":"First Last or null","assignee_email":"email or null",\
"due_date":"YYYY-MM-DD or null","priority":"high|medium|low|null",\
"assigned_by":"name of person assigning or null"}}]

Source text:
{text}"""


@dataclass(frozen=True)
class TaskExtractionResult:
    tasks: list[dict[str, Any]]
    error_message: str | None = None


def _openai_client() -> tuple[OpenAI, str, str]:
    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    if gateway_key:
        return (
            OpenAI(api_key=gateway_key, base_url="https://ai-gateway.vercel.sh/v1"),
            f"openai/{TASK_EXTRACTION_MODEL}",
            "AI Gateway",
        )
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        return OpenAI(api_key=openai_key), TASK_EXTRACTION_MODEL, "OpenAI direct"
    raise RuntimeError("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required")


def _type_label(doc_type: str | None) -> str:
    t = (doc_type or "").lower()
    if t == "meeting":
        return "meeting transcript"
    if t == "email":
        return "email"
    if t in ("teams_dm", "teams_dm_conversation", "teams_message"):
        return "Teams message"
    return "document"


def _build_text(doc: dict[str, Any]) -> str:
    parts = []
    for field in ("action_items", "summary", "bullet_points", "content"):
        val = doc.get(field)
        if val:
            text = str(val).strip()
            if field == "content" and len(text) > 3000:
                text = text[:3000]
            parts.append(text)
    return "\n\n".join(parts)


def _extract_tasks(
    doc: dict[str, Any],
    client: OpenAI,
    model: str,
    source_occurred_at: datetime | None = None,
) -> TaskExtractionResult:
    text = _build_text(doc)
    if not text or len(text) < 80:
        return TaskExtractionResult(tasks=[])

    prompt = _EXTRACT_PROMPT.format(
        type_label=_type_label(doc.get("type")),
        source_date=source_occurred_at.date().isoformat() if source_occurred_at else "unknown",
        text=text,
    )
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=1600,
        )
        raw = (resp.choices[0].message.content or "").strip()
        cleaned = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            return TaskExtractionResult(
                tasks=[],
                error_message="LLM response was not a JSON array",
            )
        return TaskExtractionResult(tasks=parsed)
    except Exception as exc:
        logger.warning("[TaskExtraction] LLM call failed for doc %s: %s", doc.get("id"), exc)
        return TaskExtractionResult(tasks=[], error_message=str(exc))


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = str(value).strip()
        if not raw:
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            logger.warning("[TaskExtraction] Invalid source date value: %s", raw)
            return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _source_occurred_at(doc: dict[str, Any]) -> datetime | None:
    """Return the real communication date, falling back to ingestion time."""
    for field in ("date", "captured_at", "created_at"):
        parsed = _parse_datetime(doc.get(field))
        if parsed:
            return parsed
    return None


def _task_extraction_state(doc: dict[str, Any]) -> dict[str, Any]:
    source_metadata = doc.get("source_metadata")
    if not isinstance(source_metadata, dict):
        return {}
    task_extraction = source_metadata.get("task_extraction")
    return task_extraction if isinstance(task_extraction, dict) else {}


def _already_processed_for_window(doc: dict[str, Any], since_dt: datetime) -> bool:
    state = _task_extraction_state(doc)
    if state.get("prompt_version") != TASK_EXTRACTION_PROMPT_VERSION:
        return False
    processed_source_at = _parse_datetime(state.get("source_occurred_at"))
    if not processed_source_at:
        return False
    return processed_source_at >= since_dt


def _mark_task_extraction_state(
    client_db: Any,
    doc: dict[str, Any],
    status: str,
    source_occurred_at: datetime | None,
    window_days: int,
    inserted_count: int = 0,
    error_message: str | None = None,
) -> None:
    source_metadata = doc.get("source_metadata")
    if not isinstance(source_metadata, dict):
        source_metadata = {}
    source_metadata["task_extraction"] = {
        "status": status,
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "prompt_version": TASK_EXTRACTION_PROMPT_VERSION,
        "source_occurred_at": source_occurred_at.isoformat() if source_occurred_at else None,
        "window_days": window_days,
        "inserted_count": inserted_count,
    }
    if error_message:
        source_metadata["task_extraction"]["error_message"] = error_message
    client_db.table("document_metadata").update({"source_metadata": source_metadata}).eq("id", doc.get("id")).execute()


def run_task_extraction(
    window_days: int = 2,
    max_docs: int | None = None,
) -> dict[str, Any]:
    """
    Extract tasks from recent communication documents and insert into the tasks table.

    Args:
        window_days: How many days back to scan for unprocessed documents.
        max_docs: Maximum source documents to process in one run.

    Returns:
        Summary dict with docs_found, docs_processed, inserted, skipped, errors.
    """
    started_at = datetime.now(timezone.utc)
    client_db = get_supabase_client()
    client_ai, model_id, provider_name = _openai_client()

    since_dt = datetime.now(timezone.utc) - timedelta(days=window_days)
    since = since_dt.isoformat()
    doc_limit = max_docs or int(os.getenv("TASK_EXTRACTION_MAX_DOCS", str(TASK_EXTRACTION_DEFAULT_LIMIT)))
    candidate_limit = max(500, doc_limit * TASK_EXTRACTION_CANDIDATE_MULTIPLIER)

    # Fetch recently ingested communication docs, then guard against old source
    # conversations that were backfilled or recompiled inside the ingestion window.
    result = (
        client_db.table("document_metadata")
        .select("id,title,type,source_system,summary,content,action_items,bullet_points,project_id,date,captured_at,created_at,source_metadata")
        .in_("type", list(TASK_SOURCE_TYPES))
        .not_.in_("type", list(EXCLUDE_TYPES))
        .or_(f"date.gte.{since},captured_at.gte.{since},created_at.gte.{since}")
        .order("date", desc=True)
        .order("captured_at", desc=True)
        .order("created_at", desc=True)
        .limit(candidate_limit)
        .execute()
    )
    docs = result.data or []
    logger.info(
        "[TaskExtraction] Found %d docs in last %d days (limit=%d)",
        len(docs),
        window_days,
        doc_limit,
    )

    if not docs:
        result = {"docs_found": 0, "docs_processed": 0, "inserted": 0, "skipped": 0, "errors": 0}
        _record_task_extraction_run(
            client_db,
            started_at=started_at,
            status="succeeded",
            metadata={"window_days": window_days, "max_docs": doc_limit, **result},
        )
        return result

    # Build set of metadata_ids that already have tasks to avoid re-processing.
    # Fetch in batches of 50 to stay within PostgREST URL limits.
    doc_ids = [d["id"] for d in docs]
    already_processed: set[str] = set()
    batch_size = 50
    for i in range(0, len(doc_ids), batch_size):
        batch = doc_ids[i : i + batch_size]
        batch_result = (
            client_db.table("tasks")
            .select("metadata_id")
            .in_("metadata_id", batch)
            .execute()
        )
        for r in batch_result.data or []:
            if r.get("metadata_id"):
                already_processed.add(r["metadata_id"])

    # Also build dedup set from task descriptions to prevent duplicate rows.
    desc_result = (
        client_db.table("tasks")
        .select("description")
        .limit(5000)
        .execute()
    )
    existing_descriptions: set[str] = {
        (r.get("description") or "").lower().strip()
        for r in (desc_result.data or [])
    }

    inserted = 0
    skipped = 0
    stale_source_skipped = 0
    errors = 0
    docs_processed = 0
    resolver = TaskAssigneeResolver(client_db)

    for doc in docs:
        doc_id = doc.get("id")
        source_occurred_at = _source_occurred_at(doc)

        if docs_processed >= doc_limit:
            break

        if source_occurred_at and source_occurred_at < since_dt:
            stale_source_skipped += 1
            skipped += 1
            logger.info(
                "[TaskExtraction] Skipping stale source doc %s: source_occurred_at=%s window_start=%s",
                doc_id,
                source_occurred_at.isoformat(),
                since,
            )
            _mark_task_extraction_state(client_db, doc, "skipped_stale_source", source_occurred_at, window_days)
            continue

        # Skip docs we've already extracted tasks from.
        if doc_id in already_processed or _already_processed_for_window(doc, since_dt):
            skipped += 1
            continue

        extraction = _extract_tasks(doc, client_ai, model_id, source_occurred_at)
        docs_processed += 1

        if extraction.error_message:
            errors += 1
            _mark_task_extraction_state(
                client_db,
                doc,
                "llm_failed",
                source_occurred_at,
                window_days,
                error_message=extraction.error_message,
            )
            continue

        tasks = extraction.tasks

        if not tasks:
            _mark_task_extraction_state(client_db, doc, "no_tasks", source_occurred_at, window_days)
            continue

        inserted_for_doc = 0
        for task in tasks:
            desc_key = (task.get("description") or "").lower().strip()
            if desc_key and desc_key in existing_descriptions:
                skipped += 1
                continue

            assignee = resolver.resolve(task.get("assignee_name"), task.get("assignee_email"))
            # Only employees can own tasks. Skip external owners — they should
            # surface as project intelligence, not assigned work.
            if not assignee.is_employee:
                logger.info(
                    "[TaskExtraction] Skipping non-employee task: assignee=%r person_type=%r title=%r",
                    task.get("assignee_name"),
                    assignee.person_type,
                    task.get("title"),
                )
                skipped += 1
                continue
            row = {
                "title": clean_text(task.get("title")),
                "description": clean_text(task.get("description")) or clean_text(task.get("title")),
                **assignee.row_values(),
                "due_date": clean_text(task.get("due_date")),
                "priority": clean_text(task.get("priority")),
                "assigned_by": clean_text(task.get("assigned_by")),
                "status": "open",
                "source_system": doc.get("source_system") or doc.get("type") or "unknown",
                "metadata_id": doc_id,
                "project_id": doc.get("project_id"),
                "extraction_source": "scheduled_task_extraction",
                "extraction_model": TASK_EXTRACTION_MODEL,
                "extraction_prompt_version": TASK_EXTRACTION_PROMPT_VERSION,
                "extraction_metadata": {
                    "provider": provider_name,
                    "model_id": model_id,
                    "source_type": doc.get("type"),
                    "source_title": doc.get("title"),
                    "source_occurred_at": source_occurred_at.isoformat() if source_occurred_at else None,
                    "source_document_created_at": doc.get("created_at"),
                    "window_days": window_days,
                    **assignee.metadata(),
                },
            }

            insert_result = client_db.table("tasks").insert(row).execute()
            if insert_result.data:
                inserted += 1
                inserted_for_doc += 1
                if desc_key:
                    existing_descriptions.add(desc_key)
            else:
                errors += 1
                logger.warning("[TaskExtraction] Insert failed for doc %s", doc_id)
        _mark_task_extraction_state(
            client_db,
            doc,
            "inserted" if inserted_for_doc else "duplicates_only",
            source_occurred_at,
            window_days,
            inserted_for_doc,
        )

    logger.info(
        "[TaskExtraction] Done — docs_found=%d processed=%d inserted=%d skipped=%d stale_source_skipped=%d errors=%d",
        len(docs), docs_processed, inserted, skipped, stale_source_skipped, errors,
    )
    result = {
        "docs_found": len(docs),
        "docs_processed": docs_processed,
        "inserted": inserted,
        "skipped": skipped,
        "stale_source_skipped": stale_source_skipped,
        "errors": errors,
    }
    _record_task_extraction_run(
        client_db,
        started_at=started_at,
        status="failed" if errors and errors >= docs_processed and docs_processed else "warning" if errors else "succeeded",
        items_seen=len(docs),
        items_synced=docs_processed,
        items_created=inserted,
        items_skipped=skipped,
        items_failed=errors,
        error_message=f"{errors} task extraction inserts failed" if errors else None,
        metadata={"window_days": window_days, "max_docs": doc_limit, **result},
    )
    return result


def _record_task_extraction_run(
    client_db: Any,
    *,
    started_at: datetime,
    status: str,
    items_seen: int = 0,
    items_synced: int = 0,
    items_created: int = 0,
    items_skipped: int = 0,
    items_failed: int = 0,
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    try:
        from .health.source_sync_health import record_sync_run

        record_sync_run(
            client_db,
            source="task_extraction",
            resource_id="scheduled_task_extraction",
            resource_name="Scheduled task extraction",
            stage="task_extraction",
            status=status,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
            items_seen=items_seen,
            items_synced=items_synced,
            items_created=items_created,
            items_skipped=items_skipped,
            items_failed=items_failed,
            error_message=error_message,
            metadata=metadata or {},
        )
    except Exception as exc:
        logger.warning("[TaskExtraction] Could not record source_sync_runs row: %s", exc)
