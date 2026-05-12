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
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from ...ai_transport import retry_ai_call

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


def _run_source_intelligence_compiler(supabase_client, metadata_id: str) -> None:
    """Queue/evaluate newly searchable Graph sources for packet-first intelligence."""
    try:
        from ...intelligence.compiler import process_source_document_to_packet

        result = process_source_document_to_packet(
            supabase_client,
            metadata_id,
            compile_packet=False,
        )
        logger.info(
            "[GraphEmbed] Intelligence compiler completed for %s: status=%s",
            metadata_id,
            result.get("status"),
        )
    except Exception as exc:
        logger.warning(
            "[GraphEmbed] Intelligence compiler failed for %s: %s",
            metadata_id,
            exc,
            exc_info=True,
        )


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
            response = retry_ai_call(
                lambda: OpenAI(**kwargs).embeddings.create(
                    model=_model_for_provider(EMBEDDING_MODEL, provider),
                    input=truncated,
                    dimensions=EMBEDDING_DIMENSIONS,
                ),
                provider_name=provider["name"],
                operation="graph embedding batch",
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
    def _clear_ingestion_error(stage: str) -> None:
        try:
            supabase_client.from_("fireflies_ingestion_jobs").update(
                {"stage": stage, "error_message": None}
            ).eq("metadata_id", metadata_id).execute()
        except Exception as exc:
            logger.warning("[GraphEmbed] Could not clear ingestion error for %s: %s", metadata_id, exc)

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
        _clear_ingestion_error("embedded")
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
        _clear_ingestion_error("embedded")
        return 0

    title = doc.get("title") or "Untitled"
    # Prepend title for better retrieval context
    full_text = f"[{title}]\n\n{content}"
    chunks = _split_text(full_text)
    if not chunks:
        supabase_client.from_("document_metadata").update({"status": "embedded"}).eq("id", metadata_id).execute()
        _clear_ingestion_error("embedded")
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

    _clear_ingestion_error("embedded")
    _run_source_intelligence_compiler(supabase_client, metadata_id)

    logger.info("[GraphEmbed] %s → %d chunks embedded", metadata_id, len(rows))
    return len(rows)


def embed_pending_graph_documents(supabase_client, limit: int = 100) -> Dict[str, Any]:
    """
    Find all document_metadata rows with source='microsoft_graph' that still need
    embedding. Picks up raw/segmented rows, content-bearing error rows that can
    be retried, and rows that were accidentally routed through the Fireflies
    segmenter instead of the graph embed path. Also repairs recent communication
    rows that were marked embedded/complete before chunks were written, because
    those rows otherwise look successful while remaining invisible to retrieval.

    Returns summary dict.
    """
    started_at = datetime.now(timezone.utc)
    docs: List[Dict[str, Any]] = []
    try:
        try:
            docs = _fetch_graph_embedding_candidates(limit)
        except Exception as exc:
            logger.warning(
                "[GraphEmbed] SQL candidate query failed; falling back to Supabase scan: %s",
                exc,
            )
            docs = None
        if docs is None:
            docs = _fetch_graph_embedding_candidates_via_supabase(supabase_client, limit)
    except Exception as e:
        logger.error("[GraphEmbed] Failed to query pending docs: %s", e)
        _record_graph_embed_run(
            supabase_client,
            started_at=started_at,
            status="failed",
            items_failed=1,
            error_message=str(e),
            metadata={"limit": limit, "stage": "query_pending"},
        )
        return {"embedded": 0, "errors": 1}

    if not docs:
        logger.info("[GraphEmbed] No pending microsoft_graph documents to embed")
        _record_graph_embed_run(
            supabase_client,
            started_at=started_at,
            status="succeeded",
            metadata={"limit": limit, "pending": 0},
        )
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
        # Throttle DB writes — without this, 1000 docs fire hundreds of queries
        # per second and saturate the Supabase connection pool.
        time.sleep(0.1)

    logger.info(
        "[GraphEmbed] Done — %d docs embedded (%d total chunks, %d errors). By category: %s",
        len(docs) - errors, total_chunks, errors, by_category,
    )
    result = {
        "embedded": len(docs) - errors,
        "total_chunks": total_chunks,
        "errors": errors,
        "by_category": by_category,
    }
    _record_graph_embed_run(
        supabase_client,
        started_at=started_at,
        status="failed" if errors == len(docs) else "warning" if errors else "succeeded",
        items_seen=len(docs),
        items_synced=result["embedded"],
        items_created=total_chunks,
        items_failed=errors,
        error_message=f"{errors} graph documents failed embedding" if errors else None,
        metadata={"limit": limit, **result},
    )
    return result


def _fetch_graph_embedding_candidates(limit: int) -> Optional[List[Dict[str, Any]]]:
    """Fetch Graph docs that need embedding using SQL anti-joins when DB access is available."""
    database_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not database_url:
        return None

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except Exception as exc:
        logger.warning("[GraphEmbed] psycopg2 unavailable; falling back to Supabase scan: %s", exc)
        return None

    query = """
        with pending as (
          select
            id,
            category,
            status,
            created_at,
            coalesce(captured_at, date, created_at::timestamptz) as source_at
          from public.document_metadata
          where source = 'microsoft_graph'
            and status in ('raw_ingested', 'segmented', 'compiled', 'error')
            and length(coalesce(content, '')) > 0
            and coalesce(captured_at, date, created_at::timestamptz) >= now() - interval '365 days'
        ),
        completed_without_embeddings as (
          select
            dm.id,
            dm.category,
            dm.status,
            dm.created_at,
            coalesce(dm.captured_at, dm.date, dm.created_at::timestamptz) as source_at
          from public.document_metadata dm
          where dm.source = 'microsoft_graph'
            and dm.status in ('embedded', 'complete')
            and dm.category in ('email', 'teams_message', 'document')
            and coalesce(dm.captured_at, dm.date, dm.created_at::timestamptz) >= now() - interval '365 days'
            and not exists (
              select 1
              from public.document_chunks dc
              where dc.document_id = dm.id
                and dc.embedding is not null
            )
        )
        select id, category, status, created_at
        from (
          select * from pending
          union all
          select * from completed_without_embeddings
        ) candidates
        order by source_at desc nulls last, created_at desc nulls last
        limit %s
    """
    conn = None
    try:
        conn = psycopg2.connect(database_url, sslmode="require")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (limit,))
            return [dict(row) for row in cur.fetchall()]
    finally:
        if conn is not None:
            conn.close()


def _fetch_graph_embedding_candidates_via_supabase(
    supabase_client,
    limit: int,
) -> List[Dict[str, Any]]:
    """Fallback candidate scan when the backend only has Supabase API access."""
    try:
        pending_resp = (
            supabase_client.from_("document_metadata")
            .select("id, category, status, created_at, date")
            .eq("source", "microsoft_graph")
            .in_("status", ["raw_ingested", "segmented", "compiled", "error"])
            .not_.is_("content", "null")
            .gte("date", (datetime.now(timezone.utc) - timedelta(days=365)).date().isoformat())
            .order("date", desc=True)
            .limit(limit)
            .execute()
        )

        by_id: Dict[str, Dict[str, Any]] = {}
        for doc in (pending_resp.data or []):
            by_id[doc["id"]] = doc

        repair_scan_limit = max(limit * 50, 1_000)
        page_size = 500
        scanned = 0
        while len(by_id) < limit and scanned < repair_scan_limit:
            repair_resp = (
                supabase_client.from_("document_metadata")
                .select("id, category, status, created_at, date")
                .eq("source", "microsoft_graph")
                .in_("status", ["embedded", "complete"])
                .in_("category", ["email", "teams_message", "document"])
                .gte("date", (datetime.now(timezone.utc) - timedelta(days=365)).date().isoformat())
                .order("date", desc=True)
                .range(scanned, scanned + page_size - 1)
                .execute()
            )
            repair_rows = repair_resp.data or []
            if not repair_rows:
                break
            for doc in repair_rows:
                if doc["id"] in by_id:
                    continue
                if not _has_embedded_graph_chunks(supabase_client, doc["id"]):
                    by_id[doc["id"]] = doc
                    if len(by_id) >= limit:
                        break
            scanned += len(repair_rows)

        docs = sorted(
            by_id.values(),
            key=lambda row: str(row.get("date") or row.get("created_at") or ""),
            reverse=True,
        )[:limit]
        return docs
    except Exception:
        raise


def _has_embedded_graph_chunks(supabase_client, metadata_id: str) -> bool:
    """Return whether a Graph document already has searchable embedded chunks."""
    try:
        resp = (
            supabase_client.from_("document_chunks")
            .select("chunk_id")
            .eq("document_id", metadata_id)
            .not_.is_("embedding", "null")
            .limit(1)
            .execute()
        )
        return bool(resp.data)
    except Exception as exc:
        logger.warning("[GraphEmbed] Could not inspect chunks for %s: %s", metadata_id, exc)
        return False


def _record_graph_embed_run(
    supabase_client,
    *,
    started_at: datetime,
    status: str,
    items_seen: int = 0,
    items_synced: int = 0,
    items_created: int = 0,
    items_failed: int = 0,
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    try:
        from src.services.health.source_sync_health import record_sync_run

        record_sync_run(
            supabase_client,
            source="microsoft_graph",
            resource_id="graph_embed",
            resource_name="Microsoft Graph embedding",
            stage="vectorization",
            status=status,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
            items_seen=items_seen,
            items_synced=items_synced,
            items_created=items_created,
            items_failed=items_failed,
            error_message=error_message,
            metadata=metadata or {},
        )
    except Exception as exc:
        logger.warning("[GraphEmbed] Could not record source_sync_runs row: %s", exc)
