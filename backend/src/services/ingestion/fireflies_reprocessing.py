"""Canonical Fireflies-native reprocessing for existing meeting documents."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from ..supabase_helpers import SupabaseRagStore
from .fireflies_pipeline import FirefliesIngestionPipeline
from .sync_followups import run_fireflies_post_ingest_extraction

logger = logging.getLogger(__name__)


def _metadata_source(metadata: Dict[str, Any]) -> str:
    return str(metadata.get("source") or metadata.get("source_system") or "").strip().lower()


def _coerce_project_id(value: Any) -> Optional[int]:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _ensure_fireflies_identity_header(content: str, metadata: Dict[str, Any]) -> str:
    text = str(content or "").strip()
    fireflies_id = str(metadata.get("fireflies_id") or "").strip()
    title = str(metadata.get("title") or "").strip()
    date_value = str(metadata.get("captured_at") or metadata.get("date") or "").strip()

    has_identity = "**Fireflies ID:**" in text or "fireflies.ai/view/" in text
    if has_identity:
        return text

    header_lines = []
    if title:
        header_lines.append(f"# {title}")
    if fireflies_id:
        header_lines.append(f"**Fireflies ID:** {fireflies_id}")
    if date_value:
        header_lines.append(f"**Date:** {date_value}")

    if not header_lines:
        return text
    return "\n".join([*header_lines, "", text]).strip()


def reprocess_existing_fireflies_document(
    metadata_id: str,
    *,
    store: Optional[SupabaseRagStore] = None,
) -> Dict[str, Any]:
    """Re-run Fireflies-native chunking/embedding for an existing meeting row.

    This is the canonical recovery path for Fireflies documents that already
    exist in `document_metadata` but still need vectorization or replay.
    """

    rag_store = store or SupabaseRagStore()
    metadata = rag_store.fetch_document_metadata(metadata_id)
    if not metadata:
        raise RuntimeError(f"Fireflies reprocess failed: document_metadata row not found for {metadata_id}")

    source = _metadata_source(metadata)
    if source and source != "fireflies":
        raise RuntimeError(
            f"Fireflies reprocess failed: metadata_id {metadata_id} belongs to source '{source}', not Fireflies"
        )

    content = _ensure_fireflies_identity_header(
        str(metadata.get("content") or metadata.get("raw_text") or "").strip(),
        metadata,
    )
    if not content:
        raise RuntimeError(
            f"Fireflies reprocess failed: metadata_id {metadata_id} has no stored content/raw_text to re-ingest"
        )

    project_id = _coerce_project_id(metadata.get("project_id"))
    storage_url = metadata.get("source_web_url") or metadata.get("url")
    source_metadata = metadata.get("source_metadata")
    extra_metadata = {
        **(source_metadata if isinstance(source_metadata, dict) else {}),
        "id": metadata_id,
        "fireflies_id": metadata.get("fireflies_id"),
    }

    logger.info(
        "[FirefliesReprocess] metadata_id=%s fireflies_id=%s project_id=%s",
        metadata_id,
        metadata.get("fireflies_id"),
        project_id,
    )

    pipeline = FirefliesIngestionPipeline(rag_store)
    result = pipeline.ingest_markdown_text(
        content,
        project_id=project_id,
        dry_run=False,
        storage_url=storage_url,
        extra_metadata=extra_metadata,
    )
    extraction = run_fireflies_post_ingest_extraction(result.document_id)
    return {
        "metadataId": metadata_id,
        "documentId": result.document_id,
        "firefliesId": metadata.get("fireflies_id"),
        "chunkCount": result.chunk_count,
        "actionItemCount": result.action_item_count,
        "taskCount": extraction.get("tasks", 0),
        "decisionCount": extraction.get("decisions", 0),
        "riskCount": extraction.get("risks", 0),
        "opportunityCount": extraction.get("opportunities", 0),
        "signalCount": extraction.get("signalsWritten", 0),
        "contentHash": result.content_hash,
        "skipped": result.skipped,
        "owner": "fireflies_native_reprocess",
    }
