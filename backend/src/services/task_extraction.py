"""
Task extraction service — pulls action items from meetings, emails, and Teams messages.

Reads from document_metadata filtered to communication types (meeting, email,
teams_dm, teams_dm_conversation, teams_message). Skips interview/test records
and documents that have already been processed within the current window.
Uses gpt-4o-mini via the existing LLM provider config (AI Gateway or direct).

Called by scheduler.py on a daily cron (replacing the old Vercel cron route).
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from openai import OpenAI

from .supabase_helpers import get_supabase_client

logger = logging.getLogger(__name__)

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

Rules:
- Only extract tasks that are clearly assigned to a named person
- Do NOT extract vague "team" tasks or self-evident follow-ups
- Do NOT invent tasks — only extract what is explicitly stated
- Each task must have a clear action verb and a named owner
- If no qualifying tasks exist, return an empty array

Respond ONLY with a JSON array (no markdown, no explanation):
[{{"title":"Short action title (max 10 words)","description":"Full context description",\
"assignee_name":"First Last or null","assignee_email":"email or null",\
"due_date":"YYYY-MM-DD or null","priority":"high|medium|low|null",\
"assigned_by":"name of person assigning or null"}}]

Source text:
{text}"""


def _openai_client() -> OpenAI:
    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    if gateway_key:
        return OpenAI(
            api_key=gateway_key,
            base_url="https://ai-gateway.vercel.sh/v1",
        )
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        return OpenAI(api_key=openai_key)
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


def _extract_tasks(doc: dict[str, Any], client: OpenAI) -> list[dict[str, Any]]:
    text = _build_text(doc)
    if not text or len(text) < 80:
        return []

    prompt = _EXTRACT_PROMPT.format(
        type_label=_type_label(doc.get("type")),
        text=text,
    )
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=800,
        )
        raw = (resp.choices[0].message.content or "").strip()
        cleaned = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, list) else []
    except Exception as exc:
        logger.warning("[TaskExtraction] LLM call failed for doc %s: %s", doc.get("id"), exc)
        return []


def run_task_extraction(window_days: int = 2) -> dict[str, Any]:
    """
    Extract tasks from recent communication documents and insert into the tasks table.

    Args:
        window_days: How many days back to scan for unprocessed documents.

    Returns:
        Summary dict with docs_found, docs_processed, inserted, skipped, errors.
    """
    client_db = get_supabase_client()
    client_ai = _openai_client()

    since = (datetime.now(timezone.utc) - timedelta(days=window_days)).isoformat()

    # Fetch recent communication docs.
    result = (
        client_db.table("document_metadata")
        .select("id,title,type,source_system,summary,content,action_items,bullet_points,project_id")
        .in_("type", list(TASK_SOURCE_TYPES))
        .not_.in_("type", list(EXCLUDE_TYPES))
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(500)
        .execute()
    )
    docs = result.data or []
    logger.info("[TaskExtraction] Found %d docs in last %d days", len(docs), window_days)

    if not docs:
        return {"docs_found": 0, "docs_processed": 0, "inserted": 0, "skipped": 0, "errors": 0}

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
    errors = 0
    docs_processed = 0

    for doc in docs:
        doc_id = doc.get("id")

        # Skip docs we've already extracted tasks from.
        if doc_id in already_processed:
            skipped += 1
            continue

        tasks = _extract_tasks(doc, client_ai)
        docs_processed += 1

        if not tasks:
            continue

        for task in tasks:
            desc_key = (task.get("description") or "").lower().strip()
            if desc_key and desc_key in existing_descriptions:
                skipped += 1
                continue

            def _nullable(val: Any) -> Any:
                """Coerce LLM string 'null' / '' to Python None."""
                if val is None or str(val).lower() in ("null", "none", ""):
                    return None
                return val

            row = {
                "title": _nullable(task.get("title")),
                "description": _nullable(task.get("description")) or _nullable(task.get("title")),
                "assignee_name": _nullable(task.get("assignee_name")),
                "assignee_email": _nullable(task.get("assignee_email")),
                "due_date": _nullable(task.get("due_date")),
                "priority": _nullable(task.get("priority")),
                "assigned_by": _nullable(task.get("assigned_by")),
                "status": "open",
                "source_system": doc.get("source_system") or doc.get("type") or "unknown",
                "metadata_id": doc_id,
                "project_id": doc.get("project_id"),
            }

            insert_result = client_db.table("tasks").insert(row).execute()
            if insert_result.data:
                inserted += 1
                if desc_key:
                    existing_descriptions.add(desc_key)
            else:
                errors += 1
                logger.warning("[TaskExtraction] Insert failed for doc %s", doc_id)

    logger.info(
        "[TaskExtraction] Done — docs_found=%d processed=%d inserted=%d skipped=%d errors=%d",
        len(docs), docs_processed, inserted, skipped, errors,
    )
    return {
        "docs_found": len(docs),
        "docs_processed": docs_processed,
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors,
    }
