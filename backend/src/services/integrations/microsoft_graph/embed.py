"""
Chunk and embed Microsoft Graph documents into document_chunks.

Called after sync for any document_metadata row with status='raw_ingested'
and source='microsoft_graph' (emails, Teams messages, OneDrive files).

Uses text-embedding-3-large at native 3072 dimensions to match the existing
pgvector columns.
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

CHUNK_MAX_CHARS = 3000
CHUNK_OVERLAP_CHARS = 400
MIN_EMBEDDABLE_CHARS_BY_TYPE = {
    "teams_dm_conversation": 200,
    "teams_message": 200,
    "email": 300,
}
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072
AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"


def _provider_configs() -> List[Dict[str, str]]:
    providers: List[Dict[str, str]] = []
    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    if gateway_key:
        providers.append(
            {
                "name": "AI Gateway",
                "api_key": gateway_key,
                "base_url": AI_GATEWAY_BASE_URL,
                "model_prefix": "openai/",
            }
        )

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        providers.append(
            {
                "name": "OpenAI direct",
                "api_key": openai_key,
                "base_url": "",
                "model_prefix": "",
            }
        )

    if not providers:
        raise RuntimeError("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required for Graph embeddings")
    return providers


def _model_for_provider(model: str, provider: Dict[str, str]) -> str:
    prefix = provider.get("model_prefix", "")
    if prefix and not model.startswith(prefix):
        return f"{prefix}{model}"
    return model


def _split_text(text: str) -> List[str]:
    """Split text into overlapping chunks at sentence boundaries."""
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
            # Keep overlap tail
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


def _source_type_for_document(doc: Dict[str, Any]) -> str:
    category = doc.get("category")
    if category == "teams_message":
        doc_type = doc.get("type")
        if doc_type in ("teams_dm_conversation", "teams_dm"):
            return "teams_dm"
        if doc_type == "teams_message":
            return "teams_channel"
        return "teams_message"
    if category == "email":
        return "email"
    if category == "document":
        return "onedrive_document"
    return "microsoft_graph"


def _min_embeddable_chars(doc: Dict[str, Any]) -> int:
    doc_type = str(doc.get("type") or "")
    category = str(doc.get("category") or "")
    return MIN_EMBEDDABLE_CHARS_BY_TYPE.get(
        doc_type,
        MIN_EMBEDDABLE_CHARS_BY_TYPE.get(category, 1),
    )


def _substantive_text_length(text: str) -> int:
    without_markers = re.sub(r"\[[^\]]+\]", " ", text)
    tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9'-]*", without_markers.lower())
    filler = {
        "ok",
        "okay",
        "thanks",
        "thank",
        "thx",
        "yes",
        "no",
        "sent",
        "done",
        "got",
        "good",
    }
    return sum(len(token) for token in tokens if len(token) > 2 and token not in filler)


def _batch_embed(texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using configured providers."""
    if not texts:
        return []

    from openai import OpenAI

    truncated = [t[:8000] for t in texts]
    errors: List[str] = []
    for provider in _provider_configs():
        kwargs: Dict[str, str] = {"api_key": provider["api_key"]}
        if provider.get("base_url"):
            kwargs["base_url"] = provider["base_url"]

        try:
            response = OpenAI(**kwargs).embeddings.create(
                model=_model_for_provider(EMBEDDING_MODEL, provider),
                input=truncated,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            embeddings = [item.embedding for item in response.data]
            if len(embeddings) != len(texts):
                raise RuntimeError(f"expected {len(texts)} embeddings, got {len(embeddings)}")
            if any(len(embedding) != EMBEDDING_DIMENSIONS for embedding in embeddings):
                raise RuntimeError(f"one or more embeddings did not have {EMBEDDING_DIMENSIONS} dimensions")
            logger.info(
                "[GraphEmbed] Embedded %d chunks via %s with %s (dim=%d)",
                len(texts),
                provider["name"],
                EMBEDDING_MODEL,
                EMBEDDING_DIMENSIONS,
            )
            return embeddings
        except Exception as e:
            message = f"{provider['name']}: {e}"
            logger.error("[GraphEmbed] Embedding provider failed: %s", message)
            errors.append(message)

    raise RuntimeError("Graph embedding failed across all providers: " + " | ".join(errors))


def embed_graph_document(supabase_client, metadata_id: str) -> int:
    """
    Chunk and embed a single document_metadata row into document_chunks.
    Updates document_metadata.status to 'embedded' on success.
    Returns the number of chunks written.
    """
    # Fetch document
    try:
        resp = (
            supabase_client.from_("document_metadata")
            .select("id, title, content, category, source, date, participants, tags, project_id, type")
            .eq("id", metadata_id)
            .single()
            .execute()
        )
        doc = resp.data
    except Exception as e:
        logger.error("[GraphEmbed] Failed to fetch document_metadata %s: %s", metadata_id, e)
        return 0

    if not doc:
        logger.warning("[GraphEmbed] Document %s not found", metadata_id)
        return 0

    content = (doc.get("content") or "").strip()
    if not content:
        logger.warning("[GraphEmbed] Document %s has no content — skipping", metadata_id)
        # Still mark as embedded so we don't retry it forever
        supabase_client.from_("document_metadata").update({"status": "embedded"}).eq("id", metadata_id).execute()
        return 0

    substantive_chars = _substantive_text_length(content)
    min_chars = _min_embeddable_chars(doc)
    if substantive_chars < min_chars:
        logger.info(
            "[GraphEmbed] Document %s skipped_low_content (%d < %d chars)",
            metadata_id,
            substantive_chars,
            min_chars,
        )
        supabase_client.from_("document_chunks").delete().eq("document_id", metadata_id).execute()
        supabase_client.from_("document_metadata").update(
            {"status": "skipped_low_content"}
        ).eq("id", metadata_id).execute()
        return 0

    title = doc.get("title") or "Untitled"
    # Prepend title for better retrieval context
    full_text = f"[{title}]\n\n{content}"
    chunks = _split_text(full_text)
    if not chunks:
        supabase_client.from_("document_metadata").update({"status": "embedded"}).eq("id", metadata_id).execute()
        return 0

    # Embed all chunks. Do not write unembedded chunks or mark the document
    # complete if the provider path is broken.
    embeddings = _batch_embed(chunks)

    # Build chunk rows
    base_metadata: Dict[str, Any] = {
        "title": title,
        "category": doc.get("category"),
        "source": doc.get("source"),
        "type": doc.get("type"),
        "date": doc.get("date"),
        "project_id": doc.get("project_id"),
        "participants": doc.get("participants"),
        "tags": doc.get("tags"),
    }
    source_type = _source_type_for_document(doc)

    rows = []
    for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = f"{metadata_id}__chunk_{i}"
        row: Dict[str, Any] = {
            "document_id": metadata_id,
            "chunk_index": i,
            "chunk_id": chunk_id,
            "text": chunk_text,
            "metadata": {**base_metadata, "chunk_index": i, "total_chunks": len(chunks)},
            "content_hash": _content_hash(chunk_text),
            "source_type": source_type,
        }
        if embedding:
            row["embedding"] = embedding
        rows.append(row)

    # Delete old chunks for this document (re-embed case), then insert fresh
    try:
        supabase_client.from_("document_chunks").delete().eq("document_id", metadata_id).execute()
        # Upsert in batches of 50 to avoid payload limits
        batch_size = 50
        for start in range(0, len(rows), batch_size):
            supabase_client.from_("document_chunks").upsert(rows[start:start + batch_size]).execute()
    except Exception as e:
        logger.error("[GraphEmbed] Failed to write chunks for %s: %s", metadata_id, e)
        supabase_client.from_("document_metadata").update(
            {"status": "error"}
        ).eq("id", metadata_id).execute()
        return 0

    # Mark embedded
    try:
        supabase_client.from_("document_metadata").update({
            "status": "embedded",
        }).eq("id", metadata_id).execute()
    except Exception as e:
        logger.warning("[GraphEmbed] Could not update status for %s: %s", metadata_id, e)

    logger.info("[GraphEmbed] %s → %d chunks embedded", metadata_id, len(rows))
    return len(rows)


def embed_pending_graph_documents(supabase_client, limit: int = 100) -> Dict[str, Any]:
    """
    Find all document_metadata rows with source='microsoft_graph' that still need
    embedding. Picks up both 'raw_ingested' (fresh syncs) and 'segmented' (items
    that were accidentally routed through the Fireflies segmenter instead of the
    graph embed path).

    Returns summary dict.
    """
    try:
        resp = (
            supabase_client.from_("document_metadata")
            .select("id, category")
            .eq("source", "microsoft_graph")
            .in_("status", ["raw_ingested", "segmented", "compiled"])
            .limit(limit)
            .execute()
        )
        docs = resp.data or []
    except Exception as e:
        logger.error("[GraphEmbed] Failed to query pending docs: %s", e)
        return {"embedded": 0, "errors": 1}

    if not docs:
        logger.info("[GraphEmbed] No pending microsoft_graph documents to embed")
        return {"embedded": 0, "errors": 0}

    logger.info("[GraphEmbed] Processing %d pending microsoft_graph documents", len(docs))
    total_chunks = 0
    errors = 0
    by_category: Dict[str, int] = {}

    for doc in docs:
        doc_id = doc["id"]
        category = doc.get("category", "unknown")
        try:
            n = embed_graph_document(supabase_client, doc_id)
            total_chunks += n
            by_category[category] = by_category.get(category, 0) + 1
        except Exception as e:
            logger.error("[GraphEmbed] Error embedding %s: %s", doc_id, e)
            errors += 1

    logger.info(
        "[GraphEmbed] Done — %d docs embedded (%d total chunks, %d errors). By category: %s",
        len(docs) - errors, total_chunks, errors, by_category,
    )
    return {
        "embedded": len(docs) - errors,
        "total_chunks": total_chunks,
        "errors": errors,
        "by_category": by_category,
    }
