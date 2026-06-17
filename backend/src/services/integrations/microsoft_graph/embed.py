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
import posixpath
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from ...ai_transport import get_openai_client, retry_ai_call
from ...pipeline.model_usage import (
    ModelUsageContext,
    assert_background_model_budget_available,
    record_model_usage,
)
from ...pipeline.source_processing import (
    SourceProcessingContext,
    record_source_processing_status,
    status_for_project_assignment,
)
from ...supabase_helpers import (
    get_rag_read_client,
    get_rag_write_client,
    get_supabase_client,
    rag_database_writes_enabled,
    rag_supabase_configured,
)

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
INTENTIONAL_EMBEDDING_EXCLUSION_STATUS = "intentionally_excluded"
GRAPH_REHYDRATED_STORAGE_PREFIX = "graph-rehydrated"


def _is_interview_title(title: Optional[str]) -> bool:
    return "interview" in str(title or "").lower()


def _mark_intentionally_excluded(supabase_client, rag_client, doc: Dict[str, Any], reason: str) -> None:
    metadata_id = str(doc.get("id") or "")
    if not metadata_id:
        return
    supabase_client.from_("document_metadata").update(
        {"status": INTENTIONAL_EMBEDDING_EXCLUSION_STATUS}
    ).eq("id", metadata_id).execute()
    try:
        rag_client.from_("document_chunks").delete().eq("document_id", metadata_id).execute()
        rag_client.from_("rag_document_metadata").upsert(
            {
                "id": metadata_id,
                "app_document_id": metadata_id,
                "title": doc.get("title"),
                "source": doc.get("source"),
                "type": doc.get("type"),
                "category": doc.get("category"),
                "embedding_status": INTENTIONAL_EMBEDDING_EXCLUSION_STATUS,
                "processing_metadata": {
                    "embedding_exclusion": {
                        "code": "interview_title_excluded",
                        "message": reason,
                        "intentional": True,
                    }
                },
            }
        ).execute()
    except Exception as exc:
        logger.warning("[GraphEmbed] Could not persist intentional exclusion for %s: %s", metadata_id, exc)


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


def _upsert_rag_content_payload(
    rag_client,
    doc: Dict[str, Any],
    *,
    content: str,
    storage_bucket: Optional[str] = None,
    storage_path: Optional[str] = None,
    repair_source: Optional[str] = None,
) -> None:
    metadata_id = str(doc.get("id") or "")
    if not metadata_id or not content:
        return

    processing_metadata = {"app_status": doc.get("status")}
    if repair_source:
        processing_metadata["rehydrated_from"] = repair_source

    rag_client.from_("rag_document_metadata").upsert(
        {
            "id": metadata_id,
            "app_document_id": metadata_id,
            "project_id": doc.get("project_id"),
            "source": doc.get("source"),
            "source_system": doc.get("source_system"),
            "source_item_id": doc.get("source_item_id"),
            "title": doc.get("title"),
            "type": doc.get("type"),
            "category": doc.get("category"),
            "storage_bucket": storage_bucket or doc.get("storage_bucket"),
            "storage_path": storage_path or doc.get("file_path") or doc.get("source_path"),
            "source_web_url": doc.get("source_web_url"),
            "content": content,
            "raw_text": content,
            "content_length": len(content),
            "parsing_status": doc.get("status"),
            "processing_metadata": processing_metadata,
            "last_content_loaded_at": datetime.utcnow().isoformat(),
        }
    ).execute()


def _decode_storage_bytes(payload: Any) -> str:
    if payload is None:
        return ""
    if isinstance(payload, bytes):
        return payload.decode("utf-8", errors="ignore").replace("\x00", "").strip()
    if hasattr(payload, "decode"):
        return payload.decode("utf-8", errors="ignore").replace("\x00", "").strip()
    return str(payload).replace("\x00", "").strip()


def _fallback_storage_path(doc: Dict[str, Any]) -> str:
    source_system = str(doc.get("source_system") or "graph").strip().lower() or "graph"
    item_id = str(doc.get("source_item_id") or doc.get("id") or "unknown")
    return posixpath.join(GRAPH_REHYDRATED_STORAGE_PREFIX, source_system, f"{item_id}.txt")


def _rehydrate_graph_document_content(
    supabase_client,
    rag_client,
    doc: Dict[str, Any],
) -> str:
    storage_bucket = str(doc.get("storage_bucket") or "documents")
    file_path = str(doc.get("file_path") or "").strip()
    if file_path:
        try:
            payload = supabase_client.storage.from_(storage_bucket).download(file_path)
            content = _decode_storage_bytes(payload)
            if content:
                _upsert_rag_content_payload(
                    rag_client,
                    doc,
                    content=content,
                    storage_bucket=storage_bucket,
                    storage_path=file_path,
                    repair_source="storage_text",
                )
                return content
        except Exception as exc:
            logger.warning("[GraphEmbed] Storage rehydrate failed for %s: %s", doc.get("id"), exc)

    source_system = str(doc.get("source_system") or "").lower()
    source_drive_id = doc.get("source_drive_id")
    source_item_id = doc.get("source_item_id")
    if source_system not in {"onedrive", "sharepoint"} or not source_drive_id or not source_item_id:
        return ""

    try:
        from .client import get_graph_client
        from .onedrive import _extract_text

        graph = get_graph_client()
        if not graph.is_configured():
            return ""

        item = graph.get(f"/drives/{source_drive_id}/items/{source_item_id}")
        download_url = item.get("@microsoft.graph.downloadUrl", "")
        if not download_url:
            return ""

        raw_bytes = graph.download_bytes(download_url)
        name = str(doc.get("title") or item.get("name") or source_item_id)
        ext = os.path.splitext(name)[1].lower()
        content = _extract_text(raw_bytes, ext).replace("\x00", "").strip()
        if not content:
            return ""

        if not file_path:
            file_path = _fallback_storage_path(doc)
            try:
                supabase_client.storage.from_(storage_bucket).upload(
                    file_path,
                    content.encode("utf-8"),
                    {"content-type": "text/plain", "upsert": "true"},
                )
            except Exception:
                try:
                    supabase_client.storage.from_(storage_bucket).update(
                        file_path,
                        content.encode("utf-8"),
                        {"content-type": "text/plain", "upsert": "true"},
                    )
                except Exception as exc:
                    logger.warning(
                        "[GraphEmbed] Could not persist rehydrated storage text for %s: %s",
                        doc.get("id"),
                        exc,
                    )
            try:
                supabase_client.from_("document_metadata").update(
                    {
                        "storage_bucket": storage_bucket,
                        "file_path": file_path,
                    }
                ).eq("id", doc.get("id")).execute()
            except Exception as exc:
                logger.warning(
                    "[GraphEmbed] Could not backfill storage path for %s: %s",
                    doc.get("id"),
                    exc,
                )

        _upsert_rag_content_payload(
            rag_client,
            doc,
            content=content,
            storage_bucket=storage_bucket,
            storage_path=file_path,
            repair_source="graph_source",
        )
        return content
    except Exception as exc:
        logger.warning("[GraphEmbed] Graph rehydrate failed for %s: %s", doc.get("id"), exc)
        return ""


def _mark_graph_content_missing_error(supabase_client, rag_client, doc: Dict[str, Any]) -> None:
    metadata_id = str(doc.get("id") or "")
    if not metadata_id:
        return
    message = (
        "GRAPH_CONTENT_MISSING: document_metadata exists, but no RAG content, storage text, "
        "or Graph-downloadable payload was available to embed."
    )
    supabase_client.from_("document_metadata").update({"status": "error"}).eq("id", metadata_id).execute()
    rag_client.from_("rag_document_metadata").upsert(
        {
            "id": metadata_id,
            "app_document_id": metadata_id,
            "title": doc.get("title"),
            "source": doc.get("source"),
            "source_system": doc.get("source_system"),
            "source_item_id": doc.get("source_item_id"),
            "type": doc.get("type"),
            "category": doc.get("category"),
            "embedding_status": "error",
            "parsing_status": "error",
            "processing_metadata": {
                "embedding_error": {
                    "code": "graph_content_missing",
                    "message": message,
                    "intentional": False,
                }
            },
        }
    ).execute()




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
    source_system = doc.get("source_system") or ""
    if source_system == "email_attachment_legacy":
        return "email_attachment"
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
        if source_system == "sharepoint":
            return "sharepoint_document"
        return "onedrive_document"
    if category == "email_attachment":
        return "email_attachment"
    return "microsoft_graph"


def _source_processing_context(doc: Dict[str, Any]) -> SourceProcessingContext:
    metadata_id = str(doc.get("id") or "")
    source_system = str(doc.get("source_system") or doc.get("category") or "microsoft_graph")
    source_item_id = str(doc.get("source_item_id") or metadata_id)
    return SourceProcessingContext(
        source_system=source_system,
        source_item_id=source_item_id,
        content_hash=str(doc.get("content_hash") or ""),
        source_document_id=metadata_id,
        project_id=doc.get("project_id"),
        source_title=doc.get("title"),
        source_url=doc.get("source_web_url") or doc.get("source_path"),
        occurred_at=doc.get("date"),
        metadata={
            "category": doc.get("category"),
            "source": doc.get("source"),
            "type": doc.get("type"),
            "embedding_path": "microsoft_graph.embed_graph_document",
        },
    )


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
    """Embed a batch of texts via OpenAI."""
    if not texts:
        return []

    truncated = [t[:8000] for t in texts]
    usage_context = ModelUsageContext(stage="indexed_for_rag", operation="graph_embedding_batch")
    assert_background_model_budget_available(
        stage=usage_context.stage,
        operation=usage_context.operation,
        model=EMBEDDING_MODEL,
    )
    response = retry_ai_call(
        lambda: get_openai_client().embeddings.create(
            model=EMBEDDING_MODEL,
            input=truncated,
            dimensions=EMBEDDING_DIMENSIONS,
        ),
        provider_name="OpenAI",
        operation="graph embedding batch",
    )
    embeddings = [item.embedding for item in response.data]
    record_model_usage(
        usage_context,
        model=EMBEDDING_MODEL,
        response=response,
        input_items=len(texts),
        output_items=len(embeddings),
    )
    if len(embeddings) != len(texts):
        raise RuntimeError(f"expected {len(texts)} embeddings, got {len(embeddings)}")
    if any(len(e) != EMBEDDING_DIMENSIONS for e in embeddings):
        raise RuntimeError(f"one or more embeddings did not have {EMBEDDING_DIMENSIONS} dimensions")
    logger.info("[GraphEmbed] Embedded %d chunks via OpenAI with %s (dim=%d)", len(texts), EMBEDDING_MODEL, EMBEDDING_DIMENSIONS)
    return embeddings


def embed_graph_document(supabase_client, metadata_id: str) -> int:
    """
    Chunk and embed a single document_metadata row into document_chunks.
    Updates document_metadata.status to 'embedded' on success.
    Returns the number of chunks written.
    """
    rag_client = get_rag_write_client()

    def _clear_ingestion_error(stage: str) -> None:
        try:
            rag_client.from_("fireflies_ingestion_jobs").update(
                {"stage": stage, "error_message": None}
            ).eq("metadata_id", metadata_id).execute()
        except Exception as exc:
            logger.warning("[GraphEmbed] Could not clear ingestion error for %s: %s", metadata_id, exc)

    # Fetch document
    try:
        resp = (
            supabase_client.from_("document_metadata")
            .select(
                "id, title, category, source, date, participants, tags, project_id, type, "
                "status, source_system, source_item_id, source_drive_id, source_site_id, "
                "source_path, source_web_url, file_path, storage_bucket, content_hash"
            )
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

    title = doc.get("title") or "Untitled"
    source_context = _source_processing_context(doc)
    record_source_processing_status(
        source_context,
        status=status_for_project_assignment(doc.get("project_id")),
        metadata={"document_status": doc.get("status")},
    )
    if _is_interview_title(title):
        reason = (
            'INTENTIONALLY_EXCLUDED: Document title contains "Interview", '
            "so it is intentionally excluded from embedding/vectorization."
        )
        _mark_intentionally_excluded(supabase_client, rag_client, doc, reason)
        _clear_ingestion_error("done")
        record_source_processing_status(
            source_context,
            status="failed_permanent",
            error_code="interview_title_excluded",
            error_message=reason,
        )
        logger.info("[GraphEmbed] %s intentionally excluded from embedding: interview title", metadata_id)
        return 0

    try:
        rag_doc = (
            get_rag_read_client()
            .from_("rag_document_metadata")
            .select("content,raw_text")
            .eq("id", metadata_id)
            .single()
            .execute()
            .data
            or {}
        )
    except Exception as exc:
        logger.warning("[GraphEmbed] Failed to hydrate RAG metadata for %s: %s", metadata_id, exc)
        rag_doc = {}
    content = (rag_doc.get("content") or rag_doc.get("raw_text") or "").strip()
    if not content:
        content = _rehydrate_graph_document_content(supabase_client, rag_client, doc)
    if not content:
        if str(doc.get("source_system") or "").lower() in {"onedrive", "sharepoint"}:
            logger.error("[GraphEmbed] Document %s missing Graph content after rehydrate attempt", metadata_id)
            _mark_graph_content_missing_error(supabase_client, rag_client, doc)
            record_source_processing_status(
                source_context,
                status="failed_permanent",
                error_code="graph_content_missing",
                error_message="Graph document has no RAG content, storage text, or downloadable payload.",
            )
            return 0
        logger.warning("[GraphEmbed] Document %s has no content — skipping", metadata_id)
        supabase_client.from_("document_metadata").update({"status": "embedded"}).eq("id", metadata_id).execute()
        rag_client.from_("rag_document_metadata").update(
            {"embedding_status": "embedded"}
        ).eq("id", metadata_id).execute()
        _clear_ingestion_error("embedded")
        record_source_processing_status(
            source_context,
            status="failed_permanent",
            error_code="graph_content_empty",
            error_message="Graph source item had no embeddable text content.",
        )
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
        rag_client.from_("document_chunks").delete().eq("document_id", metadata_id).execute()
        supabase_client.from_("document_metadata").update(
            {"status": "skipped_low_content"}
        ).eq("id", metadata_id).execute()
        get_rag_write_client().from_("rag_document_metadata").update(
            {"embedding_status": "skipped"}
        ).eq("id", metadata_id).execute()
        _clear_ingestion_error("embedded")
        record_source_processing_status(
            source_context,
            status="failed_permanent",
            error_code="skipped_low_content",
            error_message=f"Substantive text length {substantive_chars} below minimum {min_chars}.",
        )
        return 0

    # Prepend title for better retrieval context
    full_text = f"[{title}]\n\n{content}"
    chunks = _split_text(full_text)
    if not chunks:
        supabase_client.from_("document_metadata").update({"status": "embedded"}).eq("id", metadata_id).execute()
        get_rag_write_client().from_("rag_document_metadata").update(
            {"embedding_status": "embedded"}
        ).eq("id", metadata_id).execute()
        _clear_ingestion_error("embedded")
        record_source_processing_status(
            source_context,
            status="failed_permanent",
            error_code="no_chunks",
            error_message="Text was present but produced no chunks.",
        )
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
        rag_client.from_("document_chunks").delete().eq("document_id", metadata_id).execute()
        # Upsert in batches of 50 to avoid payload limits
        batch_size = 50
        for start in range(0, len(rows), batch_size):
            rag_client.from_("document_chunks").upsert(rows[start:start + batch_size]).execute()
    except Exception as e:
        logger.error("[GraphEmbed] Failed to write chunks for %s: %s", metadata_id, e)
        supabase_client.from_("document_metadata").update(
            {"status": "error"}
        ).eq("id", metadata_id).execute()
        record_source_processing_status(
            source_context,
            status="failed_retryable",
            error_code=e.__class__.__name__,
            error_message=str(e),
        )
        return 0

    # Mark embedded in PM APP
    try:
        supabase_client.from_("document_metadata").update({
            "status": "embedded",
        }).eq("id", metadata_id).execute()
    except Exception as e:
        logger.warning("[GraphEmbed] Could not update PM APP status for %s: %s", metadata_id, e)

    # Mark embedded in RAG DB so the supplement scan doesn't re-process this doc
    try:
        get_rag_write_client().from_("rag_document_metadata").update(
            {"embedding_status": "embedded"}
        ).eq("id", metadata_id).execute()
    except Exception as e:
        logger.warning("[GraphEmbed] Could not update RAG embedding_status for %s: %s", metadata_id, e)

    _clear_ingestion_error("embedded")
    record_source_processing_status(
        source_context,
        status="indexed_for_rag",
        metadata={"chunk_count": len(rows), "source_type": source_type},
    )
    record_source_processing_status(source_context, status="complete")
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
        # Guardrail: the candidate query returning 0 should mean nothing is
        # actually pending. If document_metadata still has rows matching the
        # status filter, the candidate query has drifted from reality (e.g. a
        # column filter that no longer applies post-schema-change). Surface
        # that as a warning so it can't fail silently again — this is exactly
        # how the 2026-05-14 incident hid for five days.
        unfetchable_pending = _count_pending_status_rows(supabase_client)
        status_value = "warning" if unfetchable_pending > 0 else "succeeded"
        if unfetchable_pending > 0:
            logger.warning(
                "[GraphEmbed] No candidates returned but %d microsoft_graph rows still match the "
                "raw_ingested/segmented/compiled/error status filter — candidate query may be stale",
                unfetchable_pending,
            )
        else:
            logger.info("[GraphEmbed] No pending microsoft_graph documents to embed")
        _record_graph_embed_run(
            supabase_client,
            started_at=started_at,
            status=status_value,
            metadata={
                "limit": limit,
                "pending": 0,
                "unfetchable_pending": unfetchable_pending,
            },
            error_message=(
                f"{unfetchable_pending} rows match status filter but candidate query returned 0"
                if unfetchable_pending > 0
                else None
            ),
        )
        result: Dict[str, Any] = {"embedded": 0, "errors": 0}
        if unfetchable_pending > 0:
            result["unfetchable_pending"] = unfetchable_pending
        return result

    logger.info("[GraphEmbed] Processing %d pending microsoft_graph documents", len(docs))
    total_chunks = 0
    errors = 0
    by_category: Dict[str, int] = {}

    for doc in docs:
        doc_id = doc["id"]
        category = doc.get("category", "unknown")
        try:
            n = embed_graph_document(supabase_client, doc_id)
            if n <= 0:
                logger.error("[GraphEmbed] %s produced zero chunks; treating as failed embedding", doc_id)
                errors += 1
                continue
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


def _count_pending_status_rows(supabase_client) -> int:
    """Count microsoft_graph rows still flagged as needing embedding.

    Used as a divergence detector: if the candidate fetch returns 0 but this
    count is > 0, the candidate query is filtering out rows that should be
    embedded. Matches the same date window the candidate query uses (365
    days) so old, intentionally-excluded rows don't generate false alarms.

    Returns 0 on any error so the guardrail never breaks the run.
    """
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=365)).date().isoformat()
        resp = (
            supabase_client.from_("document_metadata")
            .select("id", count="exact", head=True)
            .eq("source", "microsoft_graph")
            .in_("status", ["raw_ingested", "segmented", "compiled", "error"])
            .gte("date", cutoff)
            .execute()
        )
        return int(getattr(resp, "count", None) or 0)
    except Exception as exc:
        logger.warning("[GraphEmbed] Pending-status count failed: %s", exc)
        return 0


def _fetch_graph_embedding_candidates(limit: int) -> Optional[List[Dict[str, Any]]]:
    """Fetch Graph docs that need embedding using SQL anti-joins when DB access is available."""
    if rag_supabase_configured():
        # In split-RAG mode the anti-join spans app DB document_metadata and RAG DB
        # document_chunks/rag_document_metadata. The local SQL fast path only has one
        # connection and cannot query both databases, so using it causes false
        # relation errors or stale candidate sets. Force the Supabase fallback,
        # which merges app-DB status scans with RAG-DB candidate scans explicitly.
        return None

    database_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not database_url:
        return None

    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except Exception as exc:
        logger.warning("[GraphEmbed] psycopg2 unavailable; falling back to Supabase scan: %s", exc)
        return None

    candidate_limit = max(limit * 4, limit)
    if rag_database_writes_enabled():
        # Post-RAG-split: document_metadata.content is always NULL because
        # SupabaseRagStore.upsert_document_metadata strips content/raw_text and
        # writes them to rag_document_metadata instead. Filtering by content
        # length here would always return zero rows. Trust status alone — the
        # embed step (embed_graph_document) hydrates content from
        # rag_document_metadata and marks empty docs as 'embedded' so they
        # aren't retried.
        query = """
        with pending as (
          select
            id,
            category,
            status,
            created_at,
            coalesce(captured_at, date, created_at::timestamptz) as source_at,
            captured_at,
            date
          from public.document_metadata
          where source = 'microsoft_graph'
            and status in ('raw_ingested', 'segmented', 'compiled', 'error')
            and coalesce(captured_at, date, created_at::timestamptz) >= now() - interval '365 days'
          order by captured_at desc nulls last,
            date desc nulls last,
            created_at desc nulls last
          limit %s
        ),
        completed_without_embeddings as (
          select
            dm.id,
            dm.category,
            dm.status,
            dm.created_at,
            coalesce(dm.captured_at, dm.date, dm.created_at::timestamptz) as source_at,
            dm.captured_at,
            dm.date
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
          order by dm.captured_at desc nulls last,
            dm.date desc nulls last,
            dm.created_at desc nulls last
          limit %s
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
        query_params = (candidate_limit, candidate_limit, limit)
    else:
        query = """
        with pending as (
          select
            id,
            category,
            status,
            created_at,
            coalesce(captured_at, date, created_at::timestamptz) as source_at,
            captured_at,
            date
          from public.document_metadata
          where source = 'microsoft_graph'
            and status in ('raw_ingested', 'segmented', 'compiled', 'error')
            and length(coalesce(content, '')) > 0
            and coalesce(captured_at, date, created_at::timestamptz) >= now() - interval '365 days'
          order by captured_at desc nulls last,
            date desc nulls last,
            created_at desc nulls last
          limit %s
        ),
        completed_without_embeddings as (
          select
            dm.id,
            dm.category,
            dm.status,
            dm.created_at,
            coalesce(dm.captured_at, dm.date, dm.created_at::timestamptz) as source_at,
            dm.captured_at,
            dm.date
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
          order by dm.captured_at desc nulls last,
            dm.date desc nulls last,
            dm.created_at desc nulls last
          limit %s
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
        query_params = (candidate_limit, candidate_limit, limit)
    conn = None
    try:
        conn = psycopg2.connect(database_url, sslmode="require")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("set local statement_timeout = '15s'")
            cur.execute(query, query_params)
            docs = [dict(row) for row in cur.fetchall()]
    finally:
        if conn is not None:
            conn.close()

    # Post-RAG-split supplement: PM APP status is already 'embedded'/'complete'
    # for emails/attachments processed by the pre-split path, so the SQL query
    # above won't find them. Always supplement with unembedded RAG DB rows.
    # This must run even when SQL found results (e.g. teams_message) because the
    # "not docs" guard was insufficient — any non-email result kept emails hidden.
    if rag_database_writes_enabled():
        try:
            from datetime import timedelta
            cutoff = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
            rag_resp = (
                get_rag_read_client()
                .from_("rag_document_metadata")
                .select("id, type, created_at")
                .is_("embedding_status", "null")
                .in_("type", ["email", "email_attachment", "teams_dm_conversation", "teams_dm"])
                .gte("created_at", cutoff)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            rag_docs = rag_resp.data or []
            if rag_docs:
                existing_ids = {d["id"] for d in docs}
                rag_candidates = [
                    {
                        "id": d["id"],
                        "category": d["type"],
                        "status": "repair",
                        "created_at": d["created_at"],
                    }
                    for d in rag_docs
                    if d["id"] not in existing_ids
                ]
                docs = (rag_candidates + docs)[:limit]
                logger.info(
                    "[GraphEmbed] RAG supplement: %d email/attachment/teams_dm candidates added",
                    len(rag_candidates),
                )
        except Exception as exc:
            logger.warning("[GraphEmbed] RAG supplement scan failed: %s", exc)

    return docs if docs else None


def _fetch_graph_embedding_candidates_via_supabase(
    supabase_client,
    limit: int,
) -> List[Dict[str, Any]]:
    """Fallback candidate scan when the backend only has Supabase API access."""
    rag_candidates: List[Dict[str, Any]] = []
    # Post-RAG-split fast path: query rag_document_metadata directly for rows
    # with embedding_status IS NULL. PM APP's status is already 'embedded'/'complete'
    # for these docs, so the per-row repair scan below would need to page through
    # thousands of rows. This is O(1) instead of O(N).
    if rag_database_writes_enabled():
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
            rag_resp = (
                get_rag_read_client()
                .from_("rag_document_metadata")
                .select("id, type, created_at")
                .is_("embedding_status", "null")
                .in_("type", ["email", "document", "email_attachment", "teams_dm_conversation", "teams_dm"])
                .gte("created_at", cutoff)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            rag_docs = rag_resp.data or []
            if rag_docs:
                logger.info("[GraphEmbed] RAG direct scan found %d unembedded docs", len(rag_docs))
                rag_candidates = [
                    {
                        "id": d["id"],
                        "category": d["type"],
                        "status": "repair",
                        "created_at": d["created_at"],
                        "date": d["created_at"][:10],
                    }
                    for d in rag_docs
                ]
        except Exception as exc:
            logger.warning("[GraphEmbed] RAG direct scan failed, continuing to repair scan: %s", exc)

    try:
        cutoff_iso = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
        # Post-RAG-split: document_metadata.content is always NULL because content
        # now lives in rag_document_metadata. Don't filter by content here — trust
        # status. embed_graph_document hydrates content from the RAG DB.
        pending_resp = (
            supabase_client.from_("document_metadata")
            .select("id, category, status, created_at, date")
            .eq("source", "microsoft_graph")
            .in_("status", ["raw_ingested", "segmented", "compiled", "error"])
            .gte("created_at", cutoff_iso)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        by_id: Dict[str, Dict[str, Any]] = {}
        for doc in (pending_resp.data or []):
            by_id[doc["id"]] = doc

        repair_scan_limit = max(limit * 3, 100)
        page_size = 500
        scanned = 0
        while len(by_id) < limit and scanned < repair_scan_limit:
            repair_resp = (
                supabase_client.from_("document_metadata")
                .select("id, category, status, created_at, date")
                .eq("source", "microsoft_graph")
                .in_("status", ["embedded", "complete"])
                .in_("category", ["email", "teams_message", "document"])
                .gte("created_at", cutoff_iso)
                .order("created_at", desc=True)
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
        )
        if rag_candidates:
            existing_ids = {str(row.get("id")) for row in docs}
            for candidate in rag_candidates:
                candidate_id = str(candidate.get("id"))
                if candidate_id not in existing_ids:
                    docs.append(candidate)
                    existing_ids.add(candidate_id)

        docs = sorted(
            docs,
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
            get_rag_write_client().from_("document_chunks")
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


def embed_pending_fireflies_meetings(limit: int = 25) -> Dict[str, Any]:
    """
    Embed Fireflies meetings that have content in rag_document_metadata but
    were never vectorized (embedding_status=null).

    These are missed by embed_pending_graph_documents because they have
    source='fireflies' (not 'microsoft_graph') and status='processed' (not
    'raw_ingested'). They also have no meeting_segments, so run_embedder
    would crash. This function chunks content directly from the RAG DB.
    """
    import hashlib as _hashlib

    started_at = datetime.now(timezone.utc)
    rag_client = get_rag_write_client()

    try:
        resp = (
            rag_client.from_("rag_document_metadata")
            .select("id,title,content,raw_text,content_length")
            .eq("type", "meeting")
            .is_("embedding_status", "null")
            .gt("content_length", 200)
            .limit(limit)
            .execute()
        )
        docs = resp.data or []
    except Exception as exc:
        logger.error("[FirefliesEmbed] Failed to fetch pending meetings: %s", exc)
        return {"embedded": 0, "errors": 1}

    if not docs:
        logger.info("[FirefliesEmbed] No pending Fireflies meetings to embed")
        return {"embedded": 0, "errors": 0}

    logger.info("[FirefliesEmbed] Processing %d pending Fireflies meetings", len(docs))
    embedded = 0
    errors = 0
    total_chunks = 0

    for doc in docs:
        doc_id = doc["id"]
        title = doc.get("title") or "Untitled"
        content = (doc.get("content") or doc.get("raw_text") or "").strip()

        if not content or len(content) < 200:
            logger.info("[FirefliesEmbed] %s skipped — no content", doc_id)
            rag_client.from_("rag_document_metadata").update(
                {"embedding_status": "skipped_low_content"}
            ).eq("id", doc_id).execute()
            continue

        try:
            full_text = f"[{title}]\n\n{content}"
            chunks = _split_text(full_text)
            if not chunks:
                continue

            embeddings = _batch_embed(chunks)

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
                    "content_hash": _hashlib.sha256(chunk_text.encode()).hexdigest()[:16],
                    "metadata": {"title": title, "chunk_index": i, "total_chunks": len(chunks)},
                })

            rag_client.from_("document_chunks").delete().eq("document_id", doc_id).execute()
            batch_size = 50
            for start in range(0, len(rows), batch_size):
                rag_client.from_("document_chunks").upsert(rows[start:start + batch_size]).execute()

            rag_client.from_("rag_document_metadata").update(
                {"embedding_status": "embedded"}
            ).eq("id", doc_id).execute()

            logger.info("[FirefliesEmbed] %s → %d chunks ('%s')", doc_id, len(rows), title[:60])
            _run_source_intelligence_compiler(get_supabase_client(), doc_id)
            embedded += 1
            total_chunks += len(rows)
        except Exception as exc:
            logger.error("[FirefliesEmbed] Error embedding %s: %s", doc_id, exc)
            errors += 1

        time.sleep(0.1)

    logger.info(
        "[FirefliesEmbed] Done — %d embedded (%d chunks), %d errors",
        embedded, total_chunks, errors,
    )
    return {"embedded": embedded, "total_chunks": total_chunks, "errors": errors}


def embed_pending_attachment_documents(supabase_client, limit: int = 50) -> Dict[str, Any]:
    """
    Embed email_attachment_legacy rows that have raw_text and no chunks yet.

    These were backfilled from email_attachments → document_metadata in the
    20260523130000 migration. They have source_system='email_attachment_legacy'
    and source=NULL, so they are invisible to embed_pending_graph_documents which
    filters on source='microsoft_graph'. This function handles them separately.

    Only rows with raw_text are useful to embed — attachments without extracted
    text (binary PDFs with no OCR) are skipped.

    Idempotent: rows already in document_chunks are skipped via _has_embedded_graph_chunks.
    """
    started_at = datetime.now(timezone.utc)

    try:
        # Fetch candidates: email_attachment_legacy rows with raw_text, not yet embedded
        resp = (
            supabase_client.from_("document_metadata")
            .select("id, category, source_system, status, file_name, title")
            .eq("source_system", "email_attachment_legacy")
            .not_.is_("raw_text", "null")
            .in_("status", ["active", "raw_ingested", "error"])
            .order("created_at", desc=True)
            .limit(limit * 2)  # fetch extra so we can filter out already-embedded ones
            .execute()
        )
        candidates = resp.data or []
    except Exception as exc:
        logger.error("[AttachEmbed] Failed to query candidates: %s", exc)
        return {"embedded": 0, "errors": 1}

    if not candidates:
        logger.info("[AttachEmbed] No email attachment candidates to embed")
        return {"embedded": 0, "errors": 0}

    # Filter out rows that already have chunks
    pending = [
        doc for doc in candidates
        if not _has_embedded_graph_chunks(supabase_client, doc["id"])
    ][:limit]

    if not pending:
        logger.info("[AttachEmbed] All candidates already embedded (%d checked)", len(candidates))
        return {"embedded": 0, "errors": 0}

    logger.info("[AttachEmbed] Embedding %d email attachment documents", len(pending))
    total_chunks = 0
    errors = 0

    for doc in pending:
        doc_id = doc["id"]
        try:
            n = embed_graph_document(supabase_client, doc_id)
            total_chunks += n
        except Exception as exc:
            logger.error("[AttachEmbed] Error embedding %s: %s", doc_id, exc)
            errors += 1
        time.sleep(0.1)

    logger.info(
        "[AttachEmbed] Done — %d embedded, %d errors, %d total chunks",
        len(pending) - errors,
        errors,
        total_chunks,
    )
    return {
        "embedded": len(pending) - errors,
        "total_chunks": total_chunks,
        "errors": errors,
    }


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
