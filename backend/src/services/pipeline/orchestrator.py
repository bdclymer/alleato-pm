"""
Pipeline orchestrator — chains all 3 stages in sequence.

Usage:
    from src.services.pipeline import run_full_pipeline
    run_full_pipeline(metadata_id="some-uuid")
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from .parser import run_parser
from .embedder import run_embedder
from .extractor import run_extractor
from .digest import run_digest
from ..supabase_helpers import get_supabase_client

logger = logging.getLogger(__name__)


def run_full_pipeline(metadata_id: str) -> Dict[str, Any]:
    """
    Run all 3 pipeline stages in sequence for a document_metadata row.

    Stages:
      1. Parser   — parse markdown, LLM segmentation → meeting_segments
      2. Embedder — chunk + embed → documents
      3. Extractor — structured extraction → decisions/risks/tasks/opportunities

    On failure the job is marked as 'error' in fireflies_ingestion_jobs and
    the exception is re-raised so FastAPI BackgroundTasks can log it.
    """
    client = get_supabase_client()
    results: Dict[str, Any] = {"metadataId": metadata_id}

    try:
        logger.info("[Pipeline] Stage 1/4: Parser → %s", metadata_id)
        results["parser"] = run_parser(metadata_id)
        logger.info("[Pipeline] Parser done: %s", results["parser"])

        logger.info("[Pipeline] Stage 2/4: Embedder → %s", metadata_id)
        results["embedder"] = run_embedder(metadata_id)
        logger.info("[Pipeline] Embedder done: %s", results["embedder"])

        logger.info("[Pipeline] Stage 3/4: Extractor → %s", metadata_id)
        results["extractor"] = run_extractor(metadata_id)
        logger.info("[Pipeline] Extractor done: %s", results["extractor"])

        # Stage 4: Digest — non-critical, failures don't block pipeline
        try:
            logger.info("[Pipeline] Stage 4/4: Digest → %s", metadata_id)
            results["digest"] = run_digest(metadata_id)
            logger.info("[Pipeline] Digest done: %s", results["digest"])
        except Exception as digest_exc:
            logger.warning(
                "[Pipeline] Digest failed for %s (non-critical): %s",
                metadata_id, digest_exc,
            )
            results["digest"] = {"status": "error", "error": str(digest_exc)}

        results["status"] = "done"
        return results

    except Exception as exc:
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
