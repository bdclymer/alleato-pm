"""
Backfill missing embeddings in the document_chunks table.

Finds rows where embedding IS NULL and text is non-empty, embeds them using
OpenAI text-embedding-3-large at 3072 dimensions, and updates the rows.

Idempotent — only processes rows with NULL embeddings, safe to run multiple times.

Usage:
  cd backend
  .venv/bin/python src/scripts/backfill_missing_chunk_embeddings.py
  .venv/bin/python src/scripts/backfill_missing_chunk_embeddings.py --dry-run
  .venv/bin/python src/scripts/backfill_missing_chunk_embeddings.py --limit 100
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from typing import List, Tuple

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment loading
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
try:
    from src.services.env_loader import load_env
    load_env()
except Exception:
    from dotenv import load_dotenv
    # Load from project root .env
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072
MAX_TEXT_LENGTH = 8000          # Truncate input text to this many chars
OPENAI_BATCH_SIZE = 20          # Texts per OpenAI API call
DB_UPDATE_BATCH_SIZE = 5        # Rows per Supabase update batch
DB_FETCH_LIMIT = 1000           # Max rows to fetch per query
LOG_INTERVAL = 50               # Log progress every N rows
SLEEP_BETWEEN_API_CALLS = 0.3   # Seconds between OpenAI calls


# ---------------------------------------------------------------------------
# OpenAI embedding helper
# ---------------------------------------------------------------------------

def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using text-embedding-3-large at 3072 dims."""
    from openai import OpenAI

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    truncated = [t[:MAX_TEXT_LENGTH] for t in texts]
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=truncated,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return [item.embedding for item in response.data]


# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------

def get_client():
    """Get Supabase client using project helpers or direct creation."""
    try:
        from src.services.supabase_helpers import get_supabase_client
        return get_supabase_client()
    except Exception:
        from supabase import create_client
        url = os.environ["SUPABASE_URL"]
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_SERVICE_KEY"]
        return create_client(url, key)


# ---------------------------------------------------------------------------
# Main backfill logic
# ---------------------------------------------------------------------------

def fetch_null_embedding_chunks(client, limit: int) -> list:
    """Fetch document_chunks where embedding IS NULL and text is non-empty."""
    resp = (
        client.from_("document_chunks")
        .select("chunk_id,text")
        .is_("embedding", "null")
        .neq("text", "")
        .not_.is_("text", "null")
        .limit(limit)
        .execute()
    )
    return resp.data or []


def backfill(dry_run: bool = False, limit: int = DB_FETCH_LIMIT) -> Tuple[int, int, int]:
    """
    Main backfill routine.

    Returns (total_processed, total_updated, total_errors).
    """
    client = get_client()

    # Fetch rows needing embeddings
    logger.info("Fetching document_chunks with NULL embeddings (limit=%d)...", limit)
    rows = fetch_null_embedding_chunks(client, limit)

    if not rows:
        logger.info("No rows found with NULL embeddings. Nothing to do.")
        return 0, 0, 0

    # Filter to rows with actual text content
    valid_rows = [(r["chunk_id"], r["text"].strip()) for r in rows if r.get("text") and r["text"].strip()]
    skipped = len(rows) - len(valid_rows)
    if skipped:
        logger.info("Skipped %d rows with empty/null text", skipped)

    total = len(valid_rows)
    logger.info("Found %d chunks to embed", total)

    if dry_run:
        logger.info("DRY RUN — would embed %d chunks. Exiting.", total)
        return total, 0, 0

    updated = 0
    errors = 0

    # Process in OpenAI batch sizes
    for batch_start in range(0, total, OPENAI_BATCH_SIZE):
        batch = valid_rows[batch_start:batch_start + OPENAI_BATCH_SIZE]
        batch_ids = [b[0] for b in batch]
        batch_texts = [b[1] for b in batch]

        # Call OpenAI to get embeddings
        try:
            embeddings = embed_texts(batch_texts)
        except Exception as e:
            logger.error(
                "OpenAI API error for batch starting at row %d: %s — skipping %d rows",
                batch_start, e, len(batch),
            )
            errors += len(batch)
            continue

        # Update DB in smaller sub-batches
        for update_start in range(0, len(batch_ids), DB_UPDATE_BATCH_SIZE):
            sub_ids = batch_ids[update_start:update_start + DB_UPDATE_BATCH_SIZE]
            sub_embeddings = embeddings[update_start:update_start + DB_UPDATE_BATCH_SIZE]

            for chunk_id, emb in zip(sub_ids, sub_embeddings):
                try:
                    client.from_("document_chunks").update(
                        {"embedding": emb}
                    ).eq("chunk_id", chunk_id).execute()
                    updated += 1
                except Exception as e:
                    logger.error("DB update failed for chunk_id=%s: %s", chunk_id, e)
                    errors += 1
                    continue

        # Log progress
        processed_so_far = min(batch_start + len(batch), total)
        if processed_so_far % LOG_INTERVAL < OPENAI_BATCH_SIZE or processed_so_far == total:
            logger.info(
                "Progress: %d/%d processed, %d updated, %d errors",
                processed_so_far, total, updated, errors,
            )

        # Rate limit courtesy
        time.sleep(SLEEP_BETWEEN_API_CALLS)

    return total, updated, errors


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Backfill missing embeddings in document_chunks table"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Count rows without writing embeddings",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DB_FETCH_LIMIT,
        help=f"Max rows to process (default: {DB_FETCH_LIMIT})",
    )
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Backfill missing document_chunks embeddings")
    logger.info("Model: %s | Dimensions: %d", EMBEDDING_MODEL, EMBEDDING_DIMENSIONS)
    logger.info("OpenAI batch: %d | DB update batch: %d", OPENAI_BATCH_SIZE, DB_UPDATE_BATCH_SIZE)
    if args.dry_run:
        logger.info("MODE: DRY RUN")
    logger.info("=" * 60)

    start = time.time()
    total, updated, errors = backfill(dry_run=args.dry_run, limit=args.limit)
    elapsed = time.time() - start

    logger.info("=" * 60)
    logger.info("COMPLETE in %.1fs", elapsed)
    logger.info("  Total processed: %d", total)
    logger.info("  Updated:         %d", updated)
    logger.info("  Errors:          %d", errors)
    logger.info("=" * 60)

    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
