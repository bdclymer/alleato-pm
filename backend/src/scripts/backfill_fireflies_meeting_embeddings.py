"""
Backfill embeddings for Fireflies meetings that have content in rag_document_metadata
but were never vectorized (embedding_status=null, status='processed' in PM APP).

These are missed by embed_pending_graph_documents (wrong source filter) and would
crash run_embedder (no meeting_segments). This script embeds them directly from
rag_document_metadata.content.

Usage:
    python -m src.scripts.backfill_fireflies_meeting_embeddings [--limit N] [--dry-run]
"""
from __future__ import annotations

import argparse
import hashlib
import logging
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

CHUNK_MAX_CHARS = 3000
CHUNK_OVERLAP_CHARS = 400
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072
AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"
MIN_CONTENT_CHARS = 200


def _split_text(text: str) -> List[str]:
    if len(text) <= CHUNK_MAX_CHARS:
        return [text] if text.strip() else []
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0
    for sentence in sentences:
        slen = len(sentence)
        if current_len + slen > CHUNK_MAX_CHARS and current:
            chunks.append(" ".join(current))
            overlap: List[str] = []
            overlap_len = 0
            for s in reversed(current):
                if overlap_len + len(s) <= CHUNK_OVERLAP_CHARS:
                    overlap.insert(0, s)
                    overlap_len += len(s)
                else:
                    break
            current = overlap
            current_len = overlap_len
        current.append(sentence)
        current_len += slen
    if current:
        chunks.append(" ".join(current))
    return chunks


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _get_embedding_client():
    from openai import OpenAI
    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    if gateway_key:
        return OpenAI(api_key=gateway_key, base_url=AI_GATEWAY_BASE_URL), f"openai/{EMBEDDING_MODEL}"
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        return OpenAI(api_key=openai_key), EMBEDDING_MODEL
    raise RuntimeError("No AI_GATEWAY_API_KEY or OPENAI_API_KEY found")


def _embed_batch(texts: List[str]) -> List[List[float]]:
    client, model = _get_embedding_client()
    truncated = [t[:8000] for t in texts]
    response = client.embeddings.create(
        model=model,
        input=truncated,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return [item.embedding for item in response.data]


def fetch_pending_meetings(rag_client, limit: int) -> List[Dict[str, Any]]:
    """Fetch Fireflies meetings with content but no embedding."""
    resp = (
        rag_client.from_("rag_document_metadata")
        .select("id,title,type,content,raw_text,content_length")
        .eq("type", "meeting")
        .is_("embedding_status", "null")
        .gt("content_length", MIN_CONTENT_CHARS)
        .limit(limit)
        .execute()
    )
    return resp.data or []


def embed_meeting(doc: Dict[str, Any], rag_client, pm_client, dry_run: bool) -> Dict[str, Any]:
    doc_id = doc["id"]
    title = doc.get("title") or "Untitled"
    content = (doc.get("content") or doc.get("raw_text") or "").strip()

    if not content or len(content) < MIN_CONTENT_CHARS:
        return {"id": doc_id, "status": "skipped_low_content", "chunks": 0}

    full_text = f"[{title}]\n\n{content}"
    chunks = _split_text(full_text)

    if not chunks:
        return {"id": doc_id, "status": "skipped_no_chunks", "chunks": 0}

    logger.info("  Embedding %s → %d chunks ('%s')", doc_id, len(chunks), title[:60])

    if dry_run:
        return {"id": doc_id, "status": "dry_run", "chunks": len(chunks)}

    embeddings = _embed_batch(chunks)

    rows = []
    for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = f"{doc_id}__ff_meeting_chunk_{i}"
        rows.append({
            "chunk_id": chunk_id,
            "document_id": doc_id,
            "chunk_index": i,
            "text": chunk_text,
            "embedding": embedding,
            "source_type": "meeting_transcript",
            "content_hash": _content_hash(chunk_text),
            "metadata": {"title": title, "chunk_index": i, "total_chunks": len(chunks)},
        })

    # Delete old chunks then insert fresh
    rag_client.from_("document_chunks").delete().eq("document_id", doc_id).execute()
    batch_size = 50
    for start in range(0, len(rows), batch_size):
        rag_client.from_("document_chunks").upsert(rows[start:start + batch_size]).execute()

    # Mark embedded in RAG DB
    rag_client.from_("rag_document_metadata").update(
        {"embedding_status": "embedded"}
    ).eq("id", doc_id).execute()

    # Mark embedded in PM APP
    try:
        pm_client.from_("document_metadata").update(
            {"status": "embedded"}
        ).eq("id", doc_id).execute()
    except Exception as exc:
        logger.warning("  Could not update PM APP status for %s: %s", doc_id, exc)

    return {"id": doc_id, "status": "embedded", "chunks": len(chunks)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    from supabase import create_client

    rag_url = os.getenv("RAG_SUPABASE_URL", "").strip('"')
    rag_key = os.getenv("RAG_SUPABASE_SERVICE_ROLE_KEY", "")
    pm_url = os.getenv("SUPABASE_URL", "").strip('"')
    pm_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not rag_url or not rag_key:
        logger.error("RAG_SUPABASE_URL and RAG_SUPABASE_SERVICE_ROLE_KEY required")
        sys.exit(1)

    rag_client = create_client(rag_url, rag_key)
    pm_client = create_client(pm_url, pm_key)

    logger.info("Fetching up to %d pending Fireflies meetings...", args.limit)
    docs = fetch_pending_meetings(rag_client, args.limit)
    logger.info("Found %d meetings to embed", len(docs))

    if not docs:
        logger.info("Nothing to do.")
        return

    results = []
    for doc in docs:
        try:
            result = embed_meeting(doc, rag_client, pm_client, args.dry_run)
            results.append(result)
            logger.info("  → %s", result)
        except Exception as exc:
            logger.error("  FAILED %s: %s", doc["id"], exc)
            results.append({"id": doc["id"], "status": "error", "error": str(exc)})
        time.sleep(0.1)

    embedded = sum(1 for r in results if r["status"] == "embedded")
    total_chunks = sum(r.get("chunks", 0) for r in results)
    errors = sum(1 for r in results if r["status"] == "error")
    logger.info("\nDone: %d embedded, %d total chunks, %d errors", embedded, total_chunks, errors)


if __name__ == "__main__":
    main()
