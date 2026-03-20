"""
Stage 3 – Structured data extraction.

Reads segments from ``meeting_segments``, collects raw decisions/risks/tasks,
then calls the LLM to normalize, deduplicate, and identify opportunities.

Stores the enriched, embedded results in the ``insights`` table (type column
distinguishes 'decision' / 'risk' / 'opportunity') and the ``tasks`` table,
then marks the job as ``done``.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, List

from ..supabase_helpers import get_supabase_client
from ..ingestion.fireflies_pipeline import FirefliesIngestionPipeline
from .models import DecisionItem, OpportunityItem, RiskItem, TaskItem
from . import llm

# Stateless parser instance for content re-parsing.
_parser = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)

logger = logging.getLogger(__name__)
_GENERIC_TASK_PREFIX_RE = re.compile(
    r"^(prepare|review|follow up|check|ensure|discuss|coordinate|look into)\b",
    re.IGNORECASE,
)
_LOW_SIGNAL_TASK_RE = re.compile(
    r"\b(next meeting|as needed|if needed|when possible|as soon as possible)\b",
    re.IGNORECASE,
)
_VALID_PRIORITIES = {"low", "medium", "high", "urgent"}


def _meeting_type_from_metadata(metadata: Dict[str, Any]) -> str:
    metadata_type = str(metadata.get("type") or "").strip().lower()
    if metadata_type:
        return metadata_type

    content = str(metadata.get("content") or metadata.get("raw_text") or "")
    if not content:
        return ""

    try:
        sections = _parser._split_sections(content)  # type: ignore[attr-defined]
        section_type = str(sections.get("Meeting Type") or "").strip().lower()
        return section_type
    except Exception:
        return ""


def _is_interview_meeting(metadata: Dict[str, Any]) -> bool:
    meeting_type = _meeting_type_from_metadata(metadata)
    if meeting_type == "interview":
        return True
    title = str(metadata.get("title") or "").lower()
    return "interview" in title


def _is_meeting_record(metadata: Dict[str, Any]) -> bool:
    source = str(metadata.get("source") or "").strip().lower()
    metadata_type = str(metadata.get("type") or "").strip().lower()
    category = str(metadata.get("category") or "").strip().lower()
    meeting_values = {"meeting", "transcript", "meeting_transcript"}
    if source == "fireflies":
        return True
    return metadata_type in meeting_values or category in meeting_values


def _normalize_task_priority(raw: str | None) -> str:
    if not raw:
        return "medium"
    normalized = str(raw).strip().lower()
    if normalized not in _VALID_PRIORITIES:
        return "medium"
    return normalized


def _is_generic_low_signal_task(task: TaskItem) -> bool:
    description = (task.description or "").strip()
    if len(description) < 24:
        return True
    if _GENERIC_TASK_PREFIX_RE.match(description) and _LOW_SIGNAL_TASK_RE.search(description):
        return True
    return False


def _apply_task_quality_gates(tasks: List[TaskItem]) -> List[TaskItem]:
    """Keep only actionable tasks and normalize confidence-sensitive fields."""
    filtered: List[TaskItem] = []
    dropped = 0
    for task in tasks:
        task.priority = _normalize_task_priority(task.priority)
        has_owner = bool(task.assignee or task.assignee_email)
        has_due_date = bool(task.due_date)
        is_low_signal = _is_generic_low_signal_task(task)

        # Drop noisy extraction artifacts that are generic and unowned/undated.
        if is_low_signal and not has_owner and not has_due_date:
            dropped += 1
            continue

        # Avoid false urgency when extraction has no ownership or deadline signal.
        if not has_owner and not has_due_date and task.priority in {"high", "urgent"}:
            task.priority = "medium"

        filtered.append(task)

    if dropped:
        logger.info("[Extractor] Dropped %d low-signal tasks via quality gates", dropped)
    return filtered


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

    if _is_interview_meeting(metadata):
        fireflies_id = str(metadata.get("fireflies_id") or metadata_id)
        client.table("fireflies_ingestion_jobs").update(
            {"stage": "done"}
        ).eq("fireflies_id", fireflies_id).execute()
        client.table("fireflies_ingestion_jobs").update(
            {"stage": "done"}
        ).eq("metadata_id", metadata_id).execute()
        client.table("document_metadata").update(
            {"status": "complete"}
        ).eq("id", metadata_id).execute()
        return {
            "metadataId": metadata_id,
            "decisions": 0,
            "risks": 0,
            "tasks": 0,
            "opportunities": 0,
            "skipped": True,
            "skipReason": "interview",
        }

    is_meeting = _is_meeting_record(metadata)

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

    # Also include action_items stored in metadata (meeting-only).
    if is_meeting:
        action_items_raw = metadata.get("action_items") or ""
        if action_items_raw:
            raw_tasks.extend(
                t.strip() for t in action_items_raw.split("\n") if t.strip()
            )

    # 2b. Extract rich section context for enhanced task extraction
    content = metadata.get("content") or metadata.get("raw_text") or ""
    notes_context = ""
    speaker_email_map: Dict[str, str] = {}
    direct_fireflies_tasks: List[TaskItem] = []
    if content and is_meeting:
        try:
            parsed = _parser.parse_markdown(content)
            # Build notes context from notes topics + action items section
            notes_parts: List[str] = []
            for topic_name, topic_content in (parsed.notes_topics or {}).items():
                notes_parts.append(f"### {topic_name}\n{topic_content}")
            action_items_section = (parsed.rich_sections or {}).get("Action Items", "")
            if action_items_section:
                notes_parts.append(f"### Action Items\n{action_items_section}")
            notes_context = "\n\n".join(notes_parts)
            speaker_email_map = parsed.speaker_email_map or {}
            direct_fireflies_tasks = [
                TaskItem(
                    description=row["description"],
                    assignee=row.get("assignee_name"),
                    assignee_email=row.get("assignee_email"),
                    priority=row.get("priority"),
                )
                for row in _parser._build_task_rows_from_action_items(  # type: ignore[attr-defined]
                    metadata_id=metadata_id,
                    action_items=parsed.action_items,
                    project_id=metadata.get("project_id"),
                    speaker_email_map=parsed.speaker_email_map,
                    speakers_json=parsed.speakers_json,
                    attendees_json=parsed.attendees_json,
                )
            ]
            if speaker_email_map:
                logger.info("[Extractor] Speaker-email map: %s", speaker_email_map)
        except Exception as exc:
            logger.warning("[Extractor] Failed to parse rich sections: %s", exc)
    elif not is_meeting:
        logger.info(
            "[Extractor] Non-meeting metadata (%s/%s) -> task extraction disabled",
            metadata.get("type"),
            metadata.get("category"),
        )

    logger.info(
        "[Extractor] Raw: %d decisions, %d risks, %d tasks | Notes context: %d chars",
        len(raw_decisions), len(raw_risks), len(raw_tasks), len(notes_context),
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
        notes_context=notes_context,
        speaker_email_map=speaker_email_map,
    )

    logger.info(
        "[Extractor] Structured: %d decisions, %d risks, %d tasks, %d opportunities",
        len(structured.decisions),
        len(structured.risks),
        len(structured.tasks),
        len(structured.opportunities),
    )
    if direct_fireflies_tasks:
        structured.tasks = direct_fireflies_tasks
        logger.info(
            "[Extractor] Using %d direct Fireflies action items for task upserts",
            len(structured.tasks),
        )
    else:
        structured.tasks = _apply_task_quality_gates(structured.tasks)
    logger.info("[Extractor] Tasks after quality gates: %d", len(structured.tasks))

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
    # Resolve project_ids from document_metadata so tasks are linked to projects
    doc_project_id = metadata.get("project_id")
    project_ids = [doc_project_id] if doc_project_id else []

    for decision in structured.decisions:
        _upsert_insight(client, "decision", decision, metadata_id,
                        details={"rationale": decision.rationale, "impact": getattr(decision, "impact", None)})
    for risk in structured.risks:
        _upsert_insight(client, "risk", risk, metadata_id,
                        details={"category": risk.category, "likelihood": risk.likelihood,
                                 "impact": risk.impact, "mitigation_plan": getattr(risk, "mitigation_plan", None)})
    tasks_to_persist = structured.tasks if is_meeting else []
    # Replace task set for this meeting to avoid stale rows from prior runs
    # (for example tasks created before project assignment existed).
    client.table("tasks").delete().eq("metadata_id", metadata_id).eq(
        "source_system", "fireflies"
    ).execute()
    for task in tasks_to_persist:
        _upsert_task(
            client,
            task,
            metadata_id,
            project_ids,
            doc_project_id,
            metadata.get("client_id"),
        )
    for opportunity in structured.opportunities:
        _upsert_insight(client, "opportunity", opportunity, metadata_id,
                        details={"opportunity_type": opportunity.type,
                                 "next_step": getattr(opportunity, "next_step", None)})

    # 6. Mark job done and metadata complete
    client.table("fireflies_ingestion_jobs").update(
        {"stage": "done"}
    ).eq("metadata_id", metadata_id).execute()

    client.table("document_metadata").update(
        {"status": "complete"}
    ).eq("id", metadata_id).execute()

    return {
        "metadataId": metadata_id,
        "insights": len(structured.decisions) + len(structured.risks) + len(structured.opportunities),
        "decisions": len(structured.decisions),
        "risks": len(structured.risks),
        "opportunities": len(structured.opportunities),
        "tasks": len(tasks_to_persist),
    }


# ---------------------------------------------------------------------------
# Upsert helpers
# ---------------------------------------------------------------------------

def _upsert_insight(
    client,
    insight_type: str,
    item: "DecisionItem | RiskItem | OpportunityItem",
    metadata_id: str,
    details: Dict[str, Any] | None = None,
) -> None:
    """Upsert a single insight row into the unified insights table."""
    import json
    client.table("insights").upsert(
        {
            "metadata_id": metadata_id,
            "type": insight_type,
            "description": item.description,
            "owner_name": getattr(item, "owner", None),
            "embedding": item.embedding,
            "status": "active" if insight_type == "decision" else "open",
            "details": details or {},
        },
        on_conflict="metadata_id,type,description",
    ).execute()


def _upsert_task(
    client,
    task: TaskItem,
    metadata_id: str,
    project_ids: List[int] | None = None,
    project_id: int | None = None,
    client_id: int | None = None,
) -> None:
    resolved_project_id = project_id
    if resolved_project_id is None and project_ids:
        try:
            resolved_project_id = int(project_ids[0])
        except (TypeError, ValueError):
            resolved_project_id = None

    data = {
        "metadata_id": metadata_id,
        "description": task.description,
        "assignee_name": task.assignee,
        "due_date": task.due_date,
        "priority": task.priority,
        "embedding": task.embedding,
        "status": "open",
        "source_system": "fireflies",
        "project_ids": project_ids or [],
        "project_id": resolved_project_id,
        "client_id": client_id,
    }
    if task.assignee_email:
        data["assignee_email"] = task.assignee_email
    client.table("tasks").upsert(
        data,
        on_conflict="metadata_id,description",
    ).execute()


