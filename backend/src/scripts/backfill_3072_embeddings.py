"""
Backfill all RAG embeddings with text-embedding-3-large at 3072 dimensions.

Run AFTER applying migration 20260318000004_migrate_embeddings_to_3072.sql.

Tables processed:
  - document_chunks      (text column)
  - meeting_segments     (summary column → summary_embedding)
  - decisions            (description column)
  - risks                (description column)
  - opportunities        (description column)
  - tasks                (description column)
  - documents            (content column — unconstrained vector, no schema change needed)

Usage:
  cd /path/to/alleato-pm/backend
  python src/scripts/backfill_3072_embeddings.py [--dry-run] [--table TABLE]

Cost estimate: ~21k embeddings × 500 avg tokens × $0.00013/1K tokens ≈ $1.50
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
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
    load_dotenv()

EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072
BATCH_SIZE = 50          # rows per DB read batch
EMBED_BATCH = 100        # texts per OpenAI embedding call (max 2048)
SLEEP_BETWEEN_BATCHES = 0.5  # seconds — avoid rate limits


# ---------------------------------------------------------------------------
# OpenAI embedding helper
# ---------------------------------------------------------------------------

def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts with text-embedding-3-large at 3072 dims."""
    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    truncated = [t[:8000] for t in texts]
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
    from src.services.supabase_helpers import get_supabase_client
    return get_supabase_client()


# ---------------------------------------------------------------------------
# Per-table backfill logic
# ---------------------------------------------------------------------------

def _backfill_table(
    client,
    table: str,
    text_col: str,
    embedding_col: str,
    id_col: str = "id",
    dry_run: bool = False,
    extra_filter: Optional[Dict[str, Any]] = None,
) -> Tuple[int, int]:
    """Generic backfill for a table. Returns (rows_updated, rows_skipped)."""
    logger.info("[%s] Starting backfill (text_col=%s, embedding_col=%s)", table, text_col, embedding_col)

    offset = 0
    updated = 0
    skipped = 0

    while True:
        # Fetch rows where embedding is NULL or needs re-embedding
        q = (
            client.from_(table)
            .select(f"{id_col},{text_col}")
            .is_(embedding_col, "null")
            .range(offset, offset + BATCH_SIZE - 1)
        )
        if extra_filter:
            for col, val in extra_filter.items():
                q = q.eq(col, val)

        resp = q.execute()
        rows = resp.data or []
        if not rows:
            break

        # Filter to rows with non-empty text
        valid = [(r[id_col], (r.get(text_col) or "").strip()) for r in rows]
        valid = [(rid, txt) for rid, txt in valid if txt]
        skipped += len(rows) - len(valid)

        if valid and not dry_run:
            # Embed in sub-batches
            ids = [v[0] for v in valid]
            texts = [v[1] for v in valid]

            for i in range(0, len(texts), EMBED_BATCH):
                batch_ids = ids[i:i + EMBED_BATCH]
                batch_texts = texts[i:i + EMBED_BATCH]
                try:
                    embeddings = embed_texts(batch_texts)
                    for row_id, emb in zip(batch_ids, embeddings):
                        client.from_(table).update(
                            {embedding_col: emb}
                        ).eq(id_col, row_id).execute()
                    updated += len(batch_ids)
                    logger.info("[%s] Updated %d rows (total %d)", table, len(batch_ids), updated)
                    time.sleep(SLEEP_BETWEEN_BATCHES)
                except Exception as e:
                    logger.error("[%s] Error embedding batch starting at %d: %s", table, i, e)
                    raise
        elif dry_run:
            logger.info("[%s] DRY RUN — would embed %d rows", table, len(valid))
            updated += len(valid)

        offset += BATCH_SIZE
        if len(rows) < BATCH_SIZE:
            break

    logger.info("[%s] Done — updated=%d skipped=%d", table, updated, skipped)
    return updated, skipped


def backfill_document_chunks(client, dry_run: bool) -> Tuple[int, int]:
    return _backfill_table(client, "document_chunks", "text", "embedding",
                           id_col="chunk_id", dry_run=dry_run)


def backfill_meeting_segments(client, dry_run: bool) -> Tuple[int, int]:
    return _backfill_table(client, "meeting_segments", "summary", "summary_embedding",
                           dry_run=dry_run)


def backfill_decisions(client, dry_run: bool) -> Tuple[int, int]:
    return _backfill_table(client, "decisions", "description", "embedding",
                           dry_run=dry_run)


def backfill_risks(client, dry_run: bool) -> Tuple[int, int]:
    return _backfill_table(client, "risks", "description", "embedding",
                           dry_run=dry_run)


def backfill_opportunities(client, dry_run: bool) -> Tuple[int, int]:
    return _backfill_table(client, "opportunities", "description", "embedding",
                           dry_run=dry_run)


def backfill_tasks(client, dry_run: bool) -> Tuple[int, int]:
    return _backfill_table(client, "tasks", "description", "embedding",
                           dry_run=dry_run)


def backfill_documents(client, dry_run: bool) -> Tuple[int, int]:
    """documents.embedding is unconstrained vector — NULLed by migration, re-embed at 3072."""
    # Migration already ran: UPDATE documents SET embedding = NULL WHERE embedding IS NOT NULL
    # So all rows now have NULL embeddings — just embed the content.
    return _backfill_table(client, "documents", "content", "embedding",
                           id_col="id", dry_run=dry_run)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

TABLE_MAP = {
    "document_chunks": backfill_document_chunks,
    "meeting_segments": backfill_meeting_segments,
    "decisions": backfill_decisions,
    "risks": backfill_risks,
    "opportunities": backfill_opportunities,
    "tasks": backfill_tasks,
    "documents": backfill_documents,
}


def main():
    parser = argparse.ArgumentParser(description="Backfill all RAG embeddings to text-embedding-3-large (3072 dims)")
    parser.add_argument("--dry-run", action="store_true", help="Count rows without writing embeddings")
    parser.add_argument("--table", choices=list(TABLE_MAP.keys()), help="Only process this table")
    args = parser.parse_args()

    client = get_client()
    tables = [args.table] if args.table else list(TABLE_MAP.keys())

    if args.dry_run:
        logger.info("=== DRY RUN MODE — no embeddings will be written ===")

    total_updated = 0
    total_skipped = 0
    start = time.time()

    for tbl in tables:
        try:
            u, s = TABLE_MAP[tbl](client, args.dry_run)
            total_updated += u
            total_skipped += s
        except Exception as e:
            logger.error("Failed to backfill %s: %s", tbl, e)
            if not args.dry_run:
                raise

    elapsed = time.time() - start
    logger.info(
        "=== Backfill complete in %.1fs — total updated=%d skipped=%d ===",
        elapsed, total_updated, total_skipped,
    )


if __name__ == "__main__":
    main()
