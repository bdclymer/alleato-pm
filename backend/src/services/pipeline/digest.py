"""
Stage 4 – Post-meeting digest generation.

Reads structured data (decisions, risks, tasks, opportunities) produced
by the extractor (Stage 3) and generates a concise executive digest via LLM.

Stores the result in the ``meeting_digests`` table.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, List

from ..supabase_helpers import get_supabase_client
from . import llm

logger = logging.getLogger(__name__)


def run_digest(metadata_id: str) -> Dict[str, Any]:
    """
    Generate and store a post-meeting digest for a single meeting.

    Returns:
        dict with metadataId, has_digest, key_takeaways count
    """
    client = get_supabase_client()
    start = time.time()

    # 1. Fetch metadata
    meta_resp = (
        client.table("document_metadata")
        .select("id, title, date, participants_array, overview, summary, project_id")
        .eq("id", metadata_id)
        .single()
        .execute()
    )
    metadata = meta_resp.data
    if not metadata:
        raise ValueError(f"document_metadata not found: {metadata_id}")

    title = metadata.get("title") or "Untitled Meeting"
    date_str = metadata.get("date") or ""
    if date_str and "T" in date_str:
        date_str = date_str[:10]
    participants: List[str] = metadata.get("participants_array") or []
    summary = (
        metadata.get("overview")
        or metadata.get("summary")
        or ""
    )
    project_id = metadata.get("project_id")

    # 2. Fetch structured data from Stage 3 outputs
    decisions = _fetch_items(client, "decisions", metadata_id)
    risks = _fetch_items(client, "risks", metadata_id)
    tasks = _fetch_items(client, "tasks", metadata_id)
    opportunities = _fetch_items(client, "opportunities", metadata_id)

    total_items = len(decisions) + len(risks) + len(tasks) + len(opportunities)
    if total_items < 2:
        logger.info(
            "[Digest] Skipping digest for %s — only %d items extracted",
            metadata_id, total_items,
        )
        return {"metadataId": metadata_id, "has_digest": False, "reason": "insufficient_data"}

    logger.info(
        "[Digest] Generating digest for %s (%d decisions, %d risks, %d tasks, %d opps)",
        title, len(decisions), len(risks), len(tasks), len(opportunities),
    )

    # 3. Generate digest via LLM
    digest_data = llm.generate_meeting_digest(
        title=title,
        date=date_str,
        participants=participants,
        summary=summary,
        decisions=decisions,
        risks=risks,
        tasks=tasks,
        opportunities=opportunities,
    )

    elapsed = round(time.time() - start, 2)

    # 4. Save to meeting_digests table
    record = {
        "metadata_id": metadata_id,
        "project_id": project_id,
        "digest_text": digest_data.get("digest_text", ""),
        "decisions_summary": digest_data.get("decisions_summary", []),
        "action_items_summary": digest_data.get("action_items_summary", []),
        "risks_summary": digest_data.get("risks_summary", []),
        "opportunities_summary": digest_data.get("opportunities_summary", []),
        "follow_ups": digest_data.get("follow_ups", []),
        "key_takeaways": digest_data.get("key_takeaways", []),
        "model_used": llm.CHAT_MODEL,
        "generation_time_seconds": elapsed,
    }

    client.table("meeting_digests").upsert(
        record, on_conflict="metadata_id"
    ).execute()

    logger.info("[Digest] Saved digest for %s in %.2fs", title, elapsed)

    return {
        "metadataId": metadata_id,
        "has_digest": True,
        "key_takeaways": len(digest_data.get("key_takeaways", [])),
        "generation_time": elapsed,
    }


def _fetch_items(
    client, table: str, metadata_id: str
) -> List[Dict[str, Any]]:
    """Fetch structured items for a meeting, excluding embedding vectors."""
    cols = {
        "decisions": "description, rationale, owner_name, status",
        "risks": "description, category, likelihood, impact, owner_name, status",
        "tasks": "description, assignee_name, due_date, priority, status",
        "opportunities": "description, type, owner_name, status",
    }
    select = cols.get(table, "*")
    resp = (
        client.table(table)
        .select(select)
        .eq("metadata_id", metadata_id)
        .execute()
    )
    return resp.data or []
