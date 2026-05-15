"""Backfill project_id for OneDrive/SharePoint documents that have no project assigned.

For each unassigned document we try two strategies in order:
1. Folder-name match — extract the first subfolder below the configured root and do a
   case-insensitive lookup against projects.name.  This is high-confidence (1.0).
2. Content inference — pass title + content to ProjectAssigner (same path as live sync).

Documents that get assigned are updated in document_metadata and a tag is appended.
"""

from __future__ import annotations

import logging
import os
from pathlib import PurePosixPath
from typing import Any, Optional

logger = logging.getLogger(__name__)

BACKFILL_TAG = "project_auto_backfill:folder_match_v1"
GRAPH_FILE_SOURCES = {"onedrive", "sharepoint"}


def _infer_source_system(row: dict) -> Optional[str]:
    sys = str(row.get("source_system") or "").lower()
    if sys in GRAPH_FILE_SOURCES:
        return sys
    row_id = str(row.get("id") or "")
    if row_id.startswith("onedrive_"):
        return "onedrive"
    if row_id.startswith("sharepoint_"):
        return "sharepoint"
    tags = str(row.get("tags") or "").lower()
    if "onedrive" in tags:
        return "onedrive"
    if "sharepoint" in tags:
        return "sharepoint"
    return None


def _parent_folder_from_path(source_path: str) -> Optional[str]:
    """Return the first non-trivial folder segment from the source_path.

    OneDrive paths look like:
      Alleato Group/2026 Jobs/Vermillion Rise Warehouse/Estimates/Budget.xlsx
    We want the first subfolder that likely corresponds to a project, which is typically
    position [2] (index) after splitting on '/'.  We skip known root segments.
    """
    parts = [p for p in source_path.strip("/").split("/") if p]
    if not parts:
        return None

    # Try known root prefixes to skip, then return first meaningful segment
    SKIP_PREFIXES = {"alleato group", "2026 jobs", "2025 jobs", "jobs", "projects"}
    for i, part in enumerate(parts):
        if part.lower() in SKIP_PREFIXES:
            continue
        # Return this segment as the candidate project folder name
        return part
    return parts[-1] if parts else None


def _lookup_project_by_folder(client: Any, folder_name: str) -> Optional[int]:
    """Case-insensitive exact match against projects.name."""
    try:
        res = (
            client.from_("projects")
            .select("id")
            .ilike("name", folder_name)
            .limit(1)
            .execute()
        )
        if res.data:
            return int(res.data[0]["id"])
    except Exception as exc:
        logger.warning("[OneDriveBackfill] folder lookup failed for '%s': %s", folder_name, exc)
    return None


def _append_tag(existing: str | None, tag: str) -> str:
    tags = [t.strip() for t in (existing or "").split(",") if t.strip()]
    if tag not in tags:
        tags.append(tag)
    return ",".join(tags)


def run_onedrive_project_assignment_backfill(
    client: Any,
    *,
    batch_size: int = 500,
    dry_run: bool = False,
    use_content_inference: bool = False,
) -> dict:
    """Assign project_id to unassigned OneDrive/SharePoint document_metadata rows.

    Returns a summary dict with counts.
    """
    result = {
        "scanned": 0,
        "eligible": 0,
        "assigned_folder": 0,
        "assigned_inference": 0,
        "unresolved": 0,
        "failed": 0,
        "dry_run": dry_run,
        "errors": [],
    }

    response = (
        client.from_("document_metadata")
        .select(
            "id, title, file_name, source_path, source_system, tags, project_id, "
            "content, raw_text, participants"
        )
        .eq("category", "document")
        .is_("project_id", "null")
        .limit(batch_size)
        .execute()
    )
    rows = response.data or []
    result["scanned"] = len(rows)

    # Filter to graph file sources
    eligible = [r for r in rows if _infer_source_system(r)]
    result["eligible"] = len(eligible)

    assigner = None
    if use_content_inference:
        try:
            from src.services.ingestion.project_assignment import ProjectAssigner
            assigner = ProjectAssigner(client)
        except Exception as exc:
            logger.warning("[OneDriveBackfill] Could not load ProjectAssigner: %s", exc)

    for row in eligible:
        doc_id = row["id"]
        source_path = row.get("source_path") or ""
        title = row.get("file_name") or row.get("title") or ""

        project_id: Optional[int] = None
        method = "unresolved"

        # Strategy 1: folder name → project name
        if source_path:
            folder_name = _parent_folder_from_path(source_path)
            if folder_name:
                project_id = _lookup_project_by_folder(client, folder_name)
                if project_id:
                    method = f"folder_match:{folder_name}"

        # Strategy 2: content inference (opt-in)
        if not project_id and assigner and use_content_inference:
            content = row.get("content") or row.get("raw_text") or ""
            participants = [p.strip() for p in (row.get("participants") or "").split(",") if p.strip()]
            min_confidence = float(os.environ.get("GRAPH_PROJECT_ASSIGN_MIN_CONFIDENCE", "0.70"))
            try:
                pid, inf_method, confidence = assigner.assign_project(
                    meeting_title=title,
                    participants=participants,
                    content=content[:3000],
                )
                if pid and confidence >= min_confidence:
                    project_id = int(pid)
                    method = f"inference:{inf_method}:{confidence:.2f}"
            except Exception as exc:
                logger.warning("[OneDriveBackfill] inference failed for %s: %s", doc_id, exc)

        if not project_id:
            result["unresolved"] += 1
            continue

        logger.info("[OneDriveBackfill] %s → project_id=%s via %s", doc_id, project_id, method)

        if not dry_run:
            try:
                new_tags = _append_tag(row.get("tags"), f"{BACKFILL_TAG}")
                new_tags = _append_tag(new_tags, f"project_auto:{method.split(':')[0]}")
                client.from_("document_metadata").update({
                    "project_id": project_id,
                    "tags": new_tags,
                }).eq("id", doc_id).execute()
            except Exception as exc:
                result["failed"] += 1
                result["errors"].append({"id": doc_id, "error": str(exc)})
                continue

        if "folder_match" in method:
            result["assigned_folder"] += 1
        else:
            result["assigned_inference"] += 1

    return result
