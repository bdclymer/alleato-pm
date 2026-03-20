"""
Pipeline orchestrator — chains all 3 stages in sequence.

Usage:
    from src.services.pipeline import run_full_pipeline
    run_full_pipeline(metadata_id="some-uuid")
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict

from .parser import run_parser
from .document_parser import run_document_parser
from .financial_parser import run_financial_parser
from .embedder import run_embedder
from .extractor import run_extractor
from ..supabase_helpers import get_supabase_client

logger = logging.getLogger(__name__)

# Categories that should use the meeting parser (Fireflies transcripts)
_MEETING_CATEGORIES = {"meeting", "transcript", "meeting_transcript"}
_FINANCIAL_CATEGORIES = {"financial", "financial_document", "budget", "estimate"}
_FINANCIAL_EXTENSIONS = (".csv", ".tsv", ".xls", ".xlsx")


def _is_generic_document(client, metadata_id: str) -> bool:
    """Detect whether a document_metadata row is a generic document or a meeting.

    Returns True for PDFs, DOCX, and non-meeting categories — these go through
    the document_parser. Returns False for Fireflies transcripts — those use
    the legacy run_parser.
    """
    try:
        resp = (
            client.table("document_metadata")
            .select("category, file_name, file_path, source")
            .eq("id", metadata_id)
            .single()
            .execute()
        )
        row = resp.data or {}
    except Exception:
        return False  # default to meeting parser on error

    category = (row.get("category") or "").lower().strip()
    source = (row.get("source") or "").lower().strip()
    file_name = (row.get("file_name") or row.get("file_path") or "").lower()

    # Explicit meeting categories → meeting parser
    if category in _MEETING_CATEGORIES:
        return False

    # Fireflies source → meeting parser
    if source == "fireflies":
        return False

    # Files with PDF/DOCX extension → document parser
    if file_name.endswith((".pdf", ".docx", ".doc")):
        return True

    # Non-meeting category → document parser
    if category and category not in _MEETING_CATEGORIES:
        return True

    # Default: meeting parser (backwards-compatible)
    return False


def _is_financial_document(client, metadata_id: str) -> bool:
    """Detect whether a row should use financial_parser Stage 1."""
    try:
        resp = (
            client.table("document_metadata")
            .select("category, file_name, file_path")
            .eq("id", metadata_id)
            .single()
            .execute()
        )
        row = resp.data or {}
    except Exception:
        return False

    category = (row.get("category") or "").lower().strip()
    file_name = (row.get("file_name") or row.get("file_path") or "").lower()
    is_tabular_extension = file_name.endswith(_FINANCIAL_EXTENSIONS)

    # Financial parser is tabular-only; keep PDF/DOCX financial docs on the
    # generic document parser to avoid unsupported-extension failures.
    if category in _FINANCIAL_CATEGORIES and is_tabular_extension:
        return True
    return is_tabular_extension


def _is_transient_db_timeout(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        "statement timeout" in msg
        or "code': '57014'" in msg
        or 'code": "57014"' in msg
        or "canceling statement due to statement timeout" in msg
        or "bad gateway" in msg
        or "error code 502" in msg
        or "json could not be generated" in msg
        or "code': 502" in msg
        or 'code": 502' in msg
    )


def run_full_pipeline(metadata_id: str) -> Dict[str, Any]:
    """
    Run all 3 pipeline stages in sequence for a document_metadata row.

    Stages:
      1. Parser    — parse markdown, LLM segmentation → meeting_segments
      2. Embedder  — chunk + embed → document_chunks, document_metadata.summary_embedding
      3. Extractor — structured extraction → insights (decisions/risks/opportunities), tasks

    The digest stage (formerly Stage 4) was removed. Fireflies provides a high-quality
    summary natively in document_metadata.summary; the LLM digest was redundant.

    On failure the job is marked as 'error' in fireflies_ingestion_jobs and
    the exception is re-raised so FastAPI BackgroundTasks can log it.
    """
    client = get_supabase_client()
    results: Dict[str, Any] = {"metadataId": metadata_id}

    # Detect document type to select the right Stage 1 parser
    is_financial = _is_financial_document(client, metadata_id)
    is_document = _is_generic_document(client, metadata_id)

    max_retries = int(os.getenv("PIPELINE_TRANSIENT_RETRIES", "2"))
    for attempt in range(max_retries + 1):
        try:
            if is_financial:
                logger.info("[Pipeline] Stage 1/4: Financial Parser → %s", metadata_id)
                results["parser"] = run_financial_parser(metadata_id)
            elif is_document:
                logger.info("[Pipeline] Stage 1/4: Document Parser → %s", metadata_id)
                results["parser"] = run_document_parser(metadata_id)
            else:
                logger.info("[Pipeline] Stage 1/4: Meeting Parser → %s", metadata_id)
                results["parser"] = run_parser(metadata_id)
            logger.info("[Pipeline] Parser done: %s", results["parser"])

            logger.info("[Pipeline] Stage 2/4: Embedder → %s", metadata_id)
            results["embedder"] = run_embedder(metadata_id)
            logger.info("[Pipeline] Embedder done: %s", results["embedder"])

            logger.info("[Pipeline] Stage 3/3: Extractor → %s", metadata_id)
            results["extractor"] = run_extractor(metadata_id)
            logger.info("[Pipeline] Extractor done: %s", results["extractor"])

            results["status"] = "done"
            return results
        except Exception as exc:
            is_transient = _is_transient_db_timeout(exc)
            is_last_attempt = attempt >= max_retries
            if is_transient and not is_last_attempt:
                backoff_seconds = 2 ** (attempt + 1)
                logger.warning(
                    "[Pipeline] Transient DB timeout for %s; retrying in %ss (attempt %s/%s): %s",
                    metadata_id,
                    backoff_seconds,
                    attempt + 1,
                    max_retries + 1,
                    exc,
                )
                time.sleep(backoff_seconds)
                continue

            logger.error(
                "[Pipeline] Failed at metadata_id=%s: %s", metadata_id, exc, exc_info=True
            )
            try:
                client.table("fireflies_ingestion_jobs").update(
                    {"stage": "error", "error_message": str(exc)[:500]}
                ).eq("metadata_id", metadata_id).execute()
            except Exception:
                pass  # Don't mask the original error
            results["status"] = "error"
            results["error"] = str(exc)
            raise
