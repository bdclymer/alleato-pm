"""
Backfill document_chunks embeddings for meeting transcripts that have content
in document_metadata but no corresponding rows in document_chunks.

Scoped to meetings on or after a cutoff date (default: 2024-01-01).
Runs the full pipeline (parser → embedder → extractor) for each unprocessed meeting.

Usage:
  cd backend
  .venv/bin/python src/scripts/backfill_meeting_transcript_embeddings.py
  .venv/bin/python src/scripts/backfill_meeting_transcript_embeddings.py --dry-run
  .venv/bin/python src/scripts/backfill_meeting_transcript_embeddings.py --limit 50
  .venv/bin/python src/scripts/backfill_meeting_transcript_embeddings.py --since 2025-01-01
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from pathlib import Path
from typing import List

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Bootstrap sys.path so local imports work when run directly
# ---------------------------------------------------------------------------
_backend_src = Path(__file__).resolve().parents[1]
if str(_backend_src) not in sys.path:
    sys.path.insert(0, str(_backend_src))

try:
    from services.env_loader import load_env
    load_env()
except Exception:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[3] / ".env")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_SINCE = "2024-01-01"
DEFAULT_LIMIT = 1000
SLEEP_BETWEEN_JOBS = 1.0   # seconds — avoids hammering OpenAI / Supabase
LOG_INTERVAL = 10


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_client():
    try:
        from services.supabase_helpers import get_supabase_client
        return get_supabase_client()
    except Exception:
        from supabase import create_client
        url = os.environ["SUPABASE_URL"]
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_SERVICE_KEY"]
        return create_client(url, key)


def fetch_unvectorized_meeting_ids(client, since: str, limit: int) -> List[str]:
    """
    Return document_metadata IDs for meetings that:
      - have a date >= `since`
      - have content to embed
      - have NO rows in document_chunks with source_type='meeting_transcript'
    """
    # Fetch IDs that already have chunks
    existing_resp = (
        client.table("document_chunks")
        .select("document_id")
        .eq("source_type", "meeting_transcript")
        .execute()
    )
    already_done = {row["document_id"] for row in (existing_resp.data or [])}
    logger.info("Found %d meetings already vectorized", len(already_done))

    # Fetch candidate meetings (meetings view filters to type='meeting' rows)
    resp = (
        client.table("document_metadata")
        .select("id,title")
        .gte("date", since)
        .not_.is_("content", "null")
        .neq("content", "")
        .limit(limit * 2)   # over-fetch to account for filtering
        .execute()
    )
    rows = resp.data or []

    ids = [
        row["id"] for row in rows
        if row["id"] not in already_done
        and "interview" not in str(row.get("title") or "").lower()
    ][:limit]

    logger.info(
        "Fetched %d candidates from document_metadata (since %s), %d need processing",
        len(rows), since, len(ids),
    )
    return ids


# ---------------------------------------------------------------------------
# Main backfill
# ---------------------------------------------------------------------------

def backfill(since: str, limit: int, dry_run: bool) -> tuple[int, int, int]:
    client = get_client()

    ids = fetch_unvectorized_meeting_ids(client, since, limit)
    total = len(ids)

    if not ids:
        logger.info("Nothing to process. All meetings from %s onward are vectorized.", since)
        return 0, 0, 0

    if dry_run:
        logger.info("DRY RUN — would process %d meetings. Exiting.", total)
        return total, 0, 0

    from services.pipeline.orchestrator import run_full_pipeline

    succeeded = 0
    errors = 0

    for i, metadata_id in enumerate(ids, 1):
        try:
            result = run_full_pipeline(metadata_id)
            succeeded += 1
            if i % LOG_INTERVAL == 0 or i == total:
                logger.info(
                    "Progress: %d/%d | succeeded=%d errors=%d | last=%s chunks=%s",
                    i, total, succeeded, errors,
                    metadata_id,
                    result.get("embedder", {}).get("chunkCount", "?"),
                )
        except Exception as exc:
            errors += 1
            logger.error("FAILED metadata_id=%s: %s", metadata_id, exc)

        time.sleep(SLEEP_BETWEEN_JOBS)

    return total, succeeded, errors


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Backfill meeting transcript embeddings in document_chunks"
    )
    parser.add_argument(
        "--since",
        default=DEFAULT_SINCE,
        help=f"Only process meetings on or after this date (default: {DEFAULT_SINCE})",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Max meetings to process (default: {DEFAULT_LIMIT})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Count without processing",
    )
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Backfill: meeting transcript embeddings")
    logger.info("Since:    %s", args.since)
    logger.info("Limit:    %d", args.limit)
    logger.info("Mode:     %s", "DRY RUN" if args.dry_run else "LIVE")
    logger.info("=" * 60)

    start = time.time()
    total, succeeded, errors = backfill(
        since=args.since,
        limit=args.limit,
        dry_run=args.dry_run,
    )
    elapsed = time.time() - start

    logger.info("=" * 60)
    logger.info("COMPLETE in %.1fs", elapsed)
    logger.info("  Total:     %d", total)
    logger.info("  Succeeded: %d", succeeded)
    logger.info("  Errors:    %d", errors)
    logger.info("=" * 60)

    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
