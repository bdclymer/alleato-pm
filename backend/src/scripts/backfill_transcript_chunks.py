"""
Backfill transcript chunks for Fireflies meetings that only have summary-level data.

For each meeting in document_metadata (source='fireflies') that has no rows in
document_chunks with source_type='meeting_transcript', fetches the full transcript
directly from the Fireflies API and re-ingests with full content.

Uses the existing FirefliesIngestionPipeline so chunking logic, overlap settings,
and embedding generation are identical to live ingestion.

WHY this script exists vs relying on ingest_markdown_text auto-upgrade:
  The stored document_metadata.content is a summary-only markdown (~2-3KB) that
  does NOT contain the Fireflies link markers ("fireflies.ai/view/" or
  "**Fireflies ID:**") that _is_likely_legacy_fireflies_markdown() checks for.
  As a result, the auto-upgrade branch never fires, and no transcript sections
  are generated, so the chunker produces 0 transcript chunks.

  This script bypasses the stored content entirely and calls the Fireflies GraphQL
  API directly using the stored fireflies_id, then feeds the resulting rich
  markdown (with full ## Transcript section) to ingest_markdown_text().

Idempotent — skips any meeting that already has meeting_transcript chunks.

Usage:
  cd backend
  .venv/bin/python src/scripts/backfill_transcript_chunks.py
  .venv/bin/python src/scripts/backfill_transcript_chunks.py --dry-run
  .venv/bin/python src/scripts/backfill_transcript_chunks.py --limit 50
  .venv/bin/python src/scripts/backfill_transcript_chunks.py --project-id 67
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from typing import List, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from backend.src.services.supabase_helpers import get_supabase_client, get_rag_read_client, SupabaseRagStore
from backend.src.services.ingestion.fireflies_pipeline import FirefliesIngestionPipeline


def get_meetings_needing_chunks(
    client,
    project_id: Optional[int] = None,
    limit: Optional[int] = None,
) -> List[dict]:
    """Return document_metadata rows for Fireflies meetings with no transcript chunks."""
    # document_chunks lives in the AI Database (RAG project), not the PM APP
    rag_client = get_rag_read_client()
    # Meetings that already have transcript chunks
    existing_resp = (
        rag_client.table("document_chunks")
        .select("document_id")
        .eq("source_type", "meeting_transcript")
        .execute()
    )
    existing_ids = {r["document_id"] for r in (existing_resp.data or [])}

    query = (
        client.table("document_metadata")
        .select("id, title, project_id, date, fireflies_id")
        .eq("source", "fireflies")
        .not_.is_("fireflies_id", "null")  # Must have a fireflies_id to fetch from API
    )
    if project_id:
        query = query.eq("project_id", project_id)

    query = query.order("date", desc=True)
    if limit:
        query = query.limit(limit * 3)  # over-fetch to account for already-covered meetings

    resp = query.execute()
    rows = resp.data or []

    # Filter to only meetings without transcript chunks
    needing = [r for r in rows if r["id"] not in existing_ids]
    if limit:
        needing = needing[:limit]
    return needing


def run(dry_run: bool = False, limit: Optional[int] = None, project_id: Optional[int] = None) -> None:
    client = get_supabase_client()
    store = SupabaseRagStore(client)
    pipeline = FirefliesIngestionPipeline(store=store)

    if not pipeline._fireflies_api_key:
        logger.error("FIREFLIES_API_KEY not set — cannot fetch transcripts from API")
        sys.exit(1)

    meetings = get_meetings_needing_chunks(client, project_id=project_id, limit=limit)
    total = len(meetings)
    logger.info("Found %d meetings needing transcript chunks", total)

    if dry_run:
        for m in meetings[:20]:
            logger.info("  [DRY RUN] %s (project=%s, fireflies_id=%s)", m["title"], m["project_id"], m.get("fireflies_id"))
        if total > 20:
            logger.info("  ... and %d more", total - 20)
        return

    success = 0
    skipped = 0
    errors = 0

    for i, meeting in enumerate(meetings, 1):
        title = meeting.get("title") or meeting["id"]
        fireflies_id = meeting.get("fireflies_id")
        pid = meeting.get("project_id")

        if not fireflies_id:
            logger.warning("[%d/%d] Skipping %s — no fireflies_id", i, total, title)
            skipped += 1
            continue

        try:
            # Fetch the full transcript directly from Fireflies API.
            # This bypasses the stored summary-only content in document_metadata.content
            # which lacks the Fireflies link markers needed for auto-upgrade detection.
            transcript = pipeline._fetch_transcript(fireflies_id)
            apps_outputs = pipeline._fetch_apps_outputs(fireflies_id)
            rich_content = pipeline._format_transcript_markdown(transcript, apps_outputs)

            result = pipeline.ingest_markdown_text(
                content=rich_content,
                project_id=pid,
                dry_run=False,
            )
            if result.skipped:
                logger.info("[%d/%d] Skipped (duplicate) %s", i, total, title)
                skipped += 1
            else:
                logger.info(
                    "[%d/%d] ✓ %s — %d chunks",
                    i, total, title, result.chunk_count,
                )
                success += 1
        except Exception as exc:
            logger.error("[%d/%d] ✗ %s — %s", i, total, title, exc)
            errors += 1

        # Rate-limit embedding + Fireflies API calls
        if i % 5 == 0:
            time.sleep(1)

    logger.info(
        "Done. success=%d  skipped=%d  errors=%d  total=%d",
        success, skipped, errors, total,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill transcript chunks by fetching from Fireflies API")
    parser.add_argument("--dry-run", action="store_true", help="List meetings without writing")
    parser.add_argument("--limit", type=int, default=None, help="Max meetings to process")
    parser.add_argument("--project-id", type=int, default=None, help="Restrict to one project")
    args = parser.parse_args()

    run(dry_run=args.dry_run, limit=args.limit, project_id=args.project_id)


if __name__ == "__main__":
    main()
