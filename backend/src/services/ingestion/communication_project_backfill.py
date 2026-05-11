"""Incremental project attribution backfill for ingested communications."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, Iterable, List

from supabase import Client

from .project_assignment import ProjectAssigner

SOURCE_FILTERS = {
    "microsoft_graph": {"teams_message", "email", "document"},
    "fireflies": None,
}
BACKFILL_TAG = "project_backfill:incremental_assignment_v1"


def _append_tag(existing: str | None, tag: str) -> str:
    tags = [item.strip() for item in (existing or "").split(",") if item.strip()]
    if tag not in tags:
        tags.append(tag)
    return ",".join(tags)


def _participants_for_document(document: Dict[str, Any]) -> List[str]:
    participants: List[str] = []
    raw_participants = document.get("participants")
    if raw_participants:
        participants.append(str(raw_participants))

    raw_array = document.get("participants_array") or []
    if isinstance(raw_array, list):
        participants.extend(str(item) for item in raw_array if item)

    for field in ("host_email", "organizer_email"):
        value = document.get(field)
        if value:
            participants.append(str(value))

    return participants


def _is_target_document(document: Dict[str, Any]) -> bool:
    source = document.get("source")
    allowed_categories = SOURCE_FILTERS.get(source)
    if allowed_categories is None:
        return source in SOURCE_FILTERS
    return document.get("category") in allowed_categories


def _iter_unassigned_documents(
    client: Client,
    limit: int,
    since: datetime | None = None,
) -> Iterable[Dict[str, Any]]:
    query = (
        client.table("document_metadata")
        .select(
            "id,title,source,category,content,summary,overview,participants,participants_array,host_email,organizer_email,tags,project_id",
        )
        .is_("project_id", "null")
        .in_("source", list(SOURCE_FILTERS.keys()))
        .order("created_at", desc=True)
        .limit(limit)
    )
    if since is not None:
        query = query.gte("date", since.isoformat())
    response = query.execute()

    for document in response.data or []:
        if _is_target_document(document):
            yield document


def run_incremental_project_backfill(
    client: Client,
    *,
    limit: int | None = None,
    min_confidence: float | None = None,
    since: datetime | None = None,
) -> Dict[str, Any]:
    """Assign project_id on recent unassigned communication documents.

    This is intentionally bounded so it can run after sync jobs without turning
    every scheduler tick into a full historical scan.
    """

    resolved_limit = limit or int(os.getenv("COMM_PROJECT_BACKFILL_LIMIT", "250"))
    resolved_min_confidence = min_confidence or float(
        os.getenv("COMM_PROJECT_BACKFILL_MIN_CONFIDENCE", "0.70")
    )

    assigner = ProjectAssigner(client)
    stats: Dict[str, Any] = {
        "scanned": 0,
        "assigned": 0,
        "skipped_low_confidence": 0,
        "failed": 0,
        "methods": {},
        "errors": [],
    }

    for document in _iter_unassigned_documents(client, resolved_limit, since=since):
        stats["scanned"] += 1
        try:
            content = " ".join(
                str(document.get(field) or "")
                for field in ("content", "summary", "overview")
            )
            project_id, method, confidence = assigner.assign_project(
                meeting_title=str(document.get("title") or ""),
                participants=_participants_for_document(document),
                content=content[:3000],
                existing_project_id=None,
            )

            if not project_id or confidence < resolved_min_confidence:
                stats["skipped_low_confidence"] += 1
                continue

            project = (
                client.table("projects")
                .select("name")
                .eq("id", int(project_id))
                .single()
                .execute()
                .data
            )
            project_name = (project or {}).get("name")
            client.table("document_metadata").update(
                {
                    "project_id": int(project_id),
                    "project": project_name,
                    "tags": _append_tag(document.get("tags"), BACKFILL_TAG),
                }
            ).eq("id", document["id"]).execute()

            client.table("document_attribution_candidates").insert(
                {
                    "source_document_id": document["id"],
                    "candidate_project_id": int(project_id),
                    "candidate_project_name": project_name,
                    "confidence": min(0.99, confidence),
                    "attribution_method": method,
                    "evidence_terms": [method],
                    "reasoning": (
                        "Auto-assigned by incremental communications project backfill "
                        "after Graph/Fireflies sync."
                    ),
                    "status": "auto_assigned",
                }
            ).execute()

            stats["assigned"] += 1
            stats["methods"][method] = stats["methods"].get(method, 0) + 1
        except Exception as exc:
            stats["failed"] += 1
            stats["errors"].append({"document_id": document.get("id"), "error": str(exc)})

    return stats
