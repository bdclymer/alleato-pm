"""
Migrate remaining embedding sources into the unified document_chunks table.

Migrates:
  1. insights (decisions, risks, opportunities) → source_type='insight'
  2. ai_memories → source_type='ai_memory'
  3. document_metadata.summary_embedding → source_type='meeting_summary_embed'

Run from backend directory:
  cd backend && python src/scripts/migrate_to_unified_chunks.py
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Load env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

BATCH_SIZE = 20  # Small batches needed — embedding columns are huge and Supabase REST has a 10s statement timeout


def get_client():
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def migrate_insights(client):
    """Migrate insights embeddings → document_chunks with source_type='insight'."""
    logger.info("=== Migrating insights ===")

    # Get all insights with embeddings
    offset = 0
    total_migrated = 0
    total_skipped = 0

    while True:
        resp = (
            client.table("insights")
            .select("id, metadata_id, type, description, owner_name, status, details, project_id, project_ids, embedding, created_at")
            .not_.is_("embedding", "null")
            .order("created_at")
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            break

        chunks_to_insert = []
        for row in rows:
            chunk_id = f"insight_{row['id']}"
            text = f"{row.get('type', 'insight')}: {row.get('description', '')}"
            if row.get("owner_name"):
                text += f" (Owner: {row['owner_name']})"

            chunks_to_insert.append({
                "chunk_id": chunk_id,
                "document_id": row.get("metadata_id") or "no_meeting",
                "chunk_index": 0,
                "text": text,
                "metadata": {
                    "type": row.get("type"),
                    "owner": row.get("owner_name"),
                    "status": row.get("status"),
                    "project_id": row.get("project_id"),
                },
                "embedding": row["embedding"],
                "source_type": "insight",
                "created_at": row.get("created_at"),
            })

        try:
            client.table("document_chunks").upsert(
                chunks_to_insert, on_conflict="chunk_id"
            ).execute()
            total_migrated += len(chunks_to_insert)
            logger.info(f"  Insights: {total_migrated} migrated so far...")
        except Exception as e:
            logger.error(f"  Error inserting insights batch at offset {offset}: {e}")
            total_skipped += len(chunks_to_insert)

        offset += BATCH_SIZE
        if len(rows) < BATCH_SIZE:
            break

    logger.info(f"  Insights done: {total_migrated} migrated, {total_skipped} skipped")
    return total_migrated


def migrate_ai_memories(client):
    """Migrate ai_memories embeddings → document_chunks with source_type='ai_memory'."""
    logger.info("=== Migrating ai_memories ===")

    offset = 0
    total_migrated = 0
    total_skipped = 0

    while True:
        resp = (
            client.table("ai_memories")
            .select("id, meeting_id, type, content, project_id, source, visibility, embedding, created_at")
            .not_.is_("embedding", "null")
            .order("created_at")
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            break

        chunks_to_insert = []
        for row in rows:
            chunk_id = f"ai_memory_{row['id']}"
            chunks_to_insert.append({
                "chunk_id": chunk_id,
                "document_id": row.get("meeting_id") or "no_meeting",
                "chunk_index": 0,
                "text": row.get("content") or "",
                "metadata": {
                    "type": row.get("type"),
                    "project_id": row.get("project_id"),
                    "source": row.get("source"),
                    "visibility": row.get("visibility"),
                },
                "embedding": row["embedding"],
                "source_type": "ai_memory",
                "created_at": row.get("created_at"),
            })

        try:
            client.table("document_chunks").upsert(
                chunks_to_insert, on_conflict="chunk_id"
            ).execute()
            total_migrated += len(chunks_to_insert)
            logger.info(f"  AI memories: {total_migrated} migrated so far...")
        except Exception as e:
            logger.error(f"  Error inserting ai_memories batch at offset {offset}: {e}")
            total_skipped += len(chunks_to_insert)

        offset += BATCH_SIZE
        if len(rows) < BATCH_SIZE:
            break

    logger.info(f"  AI memories done: {total_migrated} migrated, {total_skipped} skipped")
    return total_migrated


def migrate_summary_embeddings(client):
    """Migrate document_metadata.summary_embedding → document_chunks with source_type='meeting_summary_embed'."""
    logger.info("=== Migrating document_metadata summary embeddings ===")

    offset = 0
    total_migrated = 0
    total_skipped = 0

    while True:
        resp = (
            client.table("document_metadata")
            .select("id, title, source, category, project_id, summary, overview, summary_embedding, created_at")
            .not_.is_("summary_embedding", "null")
            .order("created_at")
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            break

        chunks_to_insert = []
        for row in rows:
            text = row.get("summary") or row.get("overview") or ""
            if not text.strip():
                total_skipped += 1
                continue

            chunk_id = f"dm_summary_{row['id']}"
            chunks_to_insert.append({
                "chunk_id": chunk_id,
                "document_id": row["id"],
                "chunk_index": -1,
                "text": text,
                "metadata": {
                    "title": row.get("title"),
                    "source": row.get("source"),
                    "category": row.get("category"),
                    "project_id": row.get("project_id"),
                },
                "embedding": row["summary_embedding"],
                "source_type": "meeting_summary_embed",
                "created_at": row.get("created_at"),
            })

        if chunks_to_insert:
            try:
                client.table("document_chunks").upsert(
                    chunks_to_insert, on_conflict="chunk_id"
                ).execute()
                total_migrated += len(chunks_to_insert)
                logger.info(f"  Summary embeddings: {total_migrated} migrated so far...")
            except Exception as e:
                logger.error(f"  Error inserting summary batch at offset {offset}: {e}")
                total_skipped += len(chunks_to_insert)

        offset += BATCH_SIZE
        if len(rows) < BATCH_SIZE:
            break

    logger.info(f"  Summary embeddings done: {total_migrated} migrated, {total_skipped} skipped")
    return total_migrated


def main():
    client = get_client()

    # Check current state
    resp = client.table("document_chunks").select("source_type", count="exact").execute()
    logger.info(f"document_chunks before migration: {resp.count} total rows")

    insights_count = migrate_insights(client)
    memories_count = migrate_ai_memories(client)
    summaries_count = migrate_summary_embeddings(client)

    # Final state
    resp = client.table("document_chunks").select("source_type", count="exact").execute()
    logger.info(f"\n=== Migration complete ===")
    logger.info(f"  Insights migrated: {insights_count}")
    logger.info(f"  AI memories migrated: {memories_count}")
    logger.info(f"  Summary embeddings migrated: {summaries_count}")
    logger.info(f"  document_chunks total rows: {resp.count}")


if __name__ == "__main__":
    main()
