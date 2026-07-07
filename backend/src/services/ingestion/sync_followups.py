from __future__ import annotations

import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)


def maybe_run_comm_project_backfill(client, *, since: datetime | None = None) -> dict:
    """Run bounded communication project assignment after ingestion jobs."""
    if os.getenv("COMM_PROJECT_BACKFILL_AFTER_SYNC", "true").lower() in ("0", "false", "no"):
        return {"status": "skipped", "reason": "disabled"}

    from .communication_project_backfill import run_incremental_project_backfill

    result = run_incremental_project_backfill(client, since=since)
    if result.get("failed"):
        logger.warning("Communication project backfill reported errors: %s", result)
    else:
        logger.info(
            "Communication project backfill complete: scanned=%d assigned=%d",
            result.get("scanned", 0),
            result.get("assigned", 0),
        )
    return result


def run_fireflies_post_ingest_extraction(metadata_id: str) -> dict:
    """Run the canonical Fireflies post-ingest extraction path.

    This keeps task/signal extraction attached to the Fireflies-native owner
    instead of relying on the generic multi-stage orchestrator.
    """
    from ..pipeline.extractor import run_extractor
    from ..supabase_helpers import update_ingestion_job_state

    try:
        return run_extractor(metadata_id)
    except Exception as exc:
        update_ingestion_job_state(
            metadata_id,
            stage="error",
            error_message=f"Fireflies post-ingest extraction failed: {exc}",
        )
        raise
