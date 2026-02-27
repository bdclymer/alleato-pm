"""
Stage 3 – Structured data extraction.

Reads segments from ``meeting_segments``, collects raw decisions/risks/tasks,
then calls the LLM to normalize, deduplicate, and identify opportunities.

Stores the enriched, embedded results in the ``decisions``, ``risks``,
``tasks``, and ``opportunities`` tables, then marks the job as ``done``.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from ..supabase_helpers import get_supabase_client
from .models import DecisionItem, OpportunityItem, RiskItem, TaskItem
from . import llm

logger = logging.getLogger(__name__)


def run_extractor(metadata_id: str) -> Dict[str, Any]:
    """
    Extract and store structured data from a parsed meeting.

    Returns:
        dict with metadataId, decisions, risks, tasks, opportunities counts
    """
    client = get_supabase_client()

    # 1. Fetch metadata
    resp = (
        client.table("document_metadata")
        .select("*")
        .eq("id", metadata_id)
        .single()
        .execute()
    )
    metadata = resp.data
    if not metadata:
        raise ValueError(f"document_metadata not found: {metadata_id}")

    title = metadata.get("title") or "Untitled"
    started_at = metadata.get("started_at") or metadata.get("captured_at")
    participants: List[str] = metadata.get("participants_array") or []
    meeting_summary = (
        metadata.get("overview")
        or metadata.get("meeting_summary")
        or ""
    )

    logger.info("[Extractor] Processing: %s (%s)", title, metadata_id)

    # 2. Fetch segments to collect raw items
    seg_resp = (
        client.table("meeting_segments")
        .select("decisions", "risks", "tasks")
        .eq("metadata_id", metadata_id)
        .execute()
    )
    segment_rows = seg_resp.data or []

    raw_decisions: List[str] = []
    raw_risks: List[str] = []
    raw_tasks: List[str] = []

    for row in segment_rows:
        if row.get("decisions"):
            raw_decisions.extend(row["decisions"])
        if row.get("risks"):
            raw_risks.extend(row["risks"])
        if row.get("tasks"):
            raw_tasks.extend(row["tasks"])

    # Also include action_items stored in metadata
    action_items_raw = metadata.get("action_items") or ""
    if action_items_raw:
        raw_tasks.extend(
            t.strip() for t in action_items_raw.split("\n") if t.strip()
        )

    logger.info(
        "[Extractor] Raw: %d decisions, %d risks, %d tasks",
        len(raw_decisions), len(raw_risks), len(raw_tasks),
    )

    # 3. LLM normalization + opportunity discovery
    date_str = started_at[:10] if started_at else None
    structured = llm.extract_structured_data(
        title=title,
        date=date_str,
        participants=participants,
        summary=meeting_summary,
        raw_decisions=raw_decisions,
        raw_risks=raw_risks,
        raw_tasks=raw_tasks,
    )

    logger.info(
        "[Extractor] Structured: %d decisions, %d risks, %d tasks, %d opportunities",
        len(structured.decisions),
        len(structured.risks),
        len(structured.tasks),
        len(structured.opportunities),
    )

    # 4. Batch embed all descriptions in one call
    all_descriptions = [
        *[d.description for d in structured.decisions],
        *[r.description for r in structured.risks],
        *[t.description for t in structured.tasks],
        *[o.description for o in structured.opportunities],
    ]
    embeddings = llm.batch_embed(all_descriptions) if all_descriptions else []

    idx = 0
    for item in structured.decisions:
        item.embedding = embeddings[idx] if idx < len(embeddings) else None
        idx += 1
    for item in structured.risks:
        item.embedding = embeddings[idx] if idx < len(embeddings) else None
        idx += 1
    for item in structured.tasks:
        item.embedding = embeddings[idx] if idx < len(embeddings) else None
        idx += 1
    for item in structured.opportunities:
        item.embedding = embeddings[idx] if idx < len(embeddings) else None
        idx += 1

    # 5. Store structured data
    for decision in structured.decisions:
        _upsert_decision(client, decision, metadata_id)
    for risk in structured.risks:
        _upsert_risk(client, risk, metadata_id)
    for task in structured.tasks:
        _upsert_task(client, task, metadata_id)
    for opportunity in structured.opportunities:
        _upsert_opportunity(client, opportunity, metadata_id)

    # 6. Mark job done and metadata complete
    client.table("fireflies_ingestion_jobs").update(
        {"stage": "done"}
    ).eq("metadata_id", metadata_id).execute()

    client.table("document_metadata").update(
        {"status": "complete"}
    ).eq("id", metadata_id).execute()

    return {
        "metadataId": metadata_id,
        "decisions": len(structured.decisions),
        "risks": len(structured.risks),
        "tasks": len(structured.tasks),
        "opportunities": len(structured.opportunities),
    }


# ---------------------------------------------------------------------------
# Upsert helpers
# ---------------------------------------------------------------------------

def _upsert_decision(client, decision: DecisionItem, metadata_id: str) -> None:
    client.table("decisions").upsert(
        {
            "metadata_id": metadata_id,
            "description": decision.description,
            "rationale": decision.rationale,
            "owner_name": decision.owner,
            "embedding": decision.embedding,
            "status": "active",
        },
        on_conflict="metadata_id,description",
    ).execute()


def _upsert_risk(client, risk: RiskItem, metadata_id: str) -> None:
    client.table("risks").upsert(
        {
            "metadata_id": metadata_id,
            "description": risk.description,
            "category": risk.category,
            "likelihood": risk.likelihood,
            "impact": risk.impact,
            "owner_name": risk.owner,
            "embedding": risk.embedding,
            "status": "open",
        },
        on_conflict="metadata_id,description",
    ).execute()


def _upsert_task(client, task: TaskItem, metadata_id: str) -> None:
    client.table("tasks").upsert(
        {
            "metadata_id": metadata_id,
            "description": task.description,
            "assignee_name": task.assignee,
            "due_date": task.due_date,
            "priority": task.priority,
            "embedding": task.embedding,
            "status": "open",
            "source_system": "fireflies",
        },
        on_conflict="metadata_id,description",
    ).execute()


def _upsert_opportunity(client, opportunity: OpportunityItem, metadata_id: str) -> None:
    client.table("opportunities").upsert(
        {
            "metadata_id": metadata_id,
            "description": opportunity.description,
            "type": opportunity.type,
            "owner_name": opportunity.owner,
            "embedding": opportunity.embedding,
            "status": "open",
        },
        on_conflict="metadata_id,description",
    ).execute()
