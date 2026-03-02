"""
Stage 2 – Chunk and embed.

Reads segments from ``meeting_segments``, creates overlapping text chunks
(matching the TS chunker logic), batch-embeds everything via OpenAI, and
stores the results in the ``documents`` table.

Also embeds segment summaries and writes them back to ``meeting_segments``.
"""
from __future__ import annotations

import datetime
import hashlib
import logging
import re
from typing import Any, Dict, List, Optional

from ..supabase_helpers import get_supabase_client
from ..ingestion.fireflies_pipeline import FirefliesIngestionPipeline
from .models import DocumentChunk, MeetingSegment, TranscriptLine
from . import llm

logger = logging.getLogger(__name__)

CHUNK_TARGET_CHARS = 3000   # ~750 tokens
CHUNK_OVERLAP_CHARS = 500   # ~125 tokens

# Stateless parser instance for content re-parsing.
_parser = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)


def _hash_content(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _split_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)
    return [p.strip() for p in parts if p.strip()]


def _chunk_segment(
    segment: MeetingSegment,
    all_lines: List[TranscriptLine],
) -> List[DocumentChunk]:
    """Split a segment's transcript lines into overlapping chunks."""
    segment_lines = [
        l for l in all_lines
        if l.index >= segment.start_index and l.index <= segment.end_index
    ]
    if not segment_lines:
        return []

    full_text = "\n".join(f"{l.speaker}: {l.text}" for l in segment_lines)
    sentences = _split_sentences(full_text)
    chunks: List[DocumentChunk] = []
    current: List[str] = []
    current_len = 0
    chunk_index = 0

    for sentence in sentences:
        slen = len(sentence)
        if current_len + slen > CHUNK_TARGET_CHARS and current:
            chunk_text = " ".join(current)
            chunks.append(
                DocumentChunk(
                    content=chunk_text,
                    chunk_index=chunk_index,
                    segment_index=segment.segment_index,
                    doc_type="chunk",
                    content_hash=_hash_content(chunk_text),
                )
            )
            chunk_index += 1
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
        chunk_text = " ".join(current)
        chunks.append(
            DocumentChunk(
                content=chunk_text,
                chunk_index=chunk_index,
                segment_index=segment.segment_index,
                doc_type="chunk",
                content_hash=_hash_content(chunk_text),
            )
        )

    return chunks


def run_embedder(metadata_id: str) -> Dict[str, Any]:
    """
    Chunk and embed a document's segments.

    Returns:
        dict with metadataId, chunkCount, segmentCount
    """
    client = get_supabase_client()

    # 1. Fetch metadata
    resp = (
        client.table("document_metadata")
        .select("*")
        .eq("id", metadata_id)
        .single()
        .execute()
    )
    metadata = resp.data
    if not metadata:
        raise ValueError(f"document_metadata not found: {metadata_id}")

    content = metadata.get("content") or metadata.get("raw_text")
    meeting_summary = metadata.get("overview") or ""
    title = metadata.get("title") or "Untitled"
    project_id = metadata.get("project_id")
    started_at = metadata.get("started_at") or metadata.get("captured_at")
    participants = metadata.get("participants_array") or []

    logger.info("[Embedder] Processing: %s (%s)", title, metadata_id)

    # 2. Fetch segments
    seg_resp = (
        client.table("meeting_segments")
        .select("*")
        .eq("metadata_id", metadata_id)
        .order("segment_index")
        .execute()
    )
    segment_rows = seg_resp.data or []
    if not segment_rows:
        raise ValueError(f"No segments found for metadata_id: {metadata_id}")

    # 3. Convert rows to MeetingSegment objects
    segments: List[MeetingSegment] = [
        MeetingSegment(
            segment_index=row["segment_index"],
            title=row["title"],
            start_index=row["start_index"],
            end_index=row["end_index"],
            summary=row.get("summary") or "",
            decisions=row.get("decisions") or [],
            risks=row.get("risks") or [],
            tasks=row.get("tasks") or [],
        )
        for row in segment_rows
    ]

    # 4. Parse content to get indexed transcript lines for chunking
    transcript_lines: List[TranscriptLine] = []
    if content:
        try:
            parsed = _parser.parse_markdown(content)
            transcript_lines = [
                TranscriptLine(
                    index=i,
                    timestamp=seg.timestamp or "",
                    speaker=seg.speaker or "Unknown",
                    text=seg.text,
                )
                for i, seg in enumerate(parsed.transcript_segments)
            ]
        except Exception as exc:
            logger.warning("[Embedder] Failed to parse content: %s", exc)

    # 5. Create all chunks
    all_chunks: List[DocumentChunk] = []
    for seg in segments:
        all_chunks.extend(_chunk_segment(seg, transcript_lines))

    # Add meeting-level summary chunk
    if meeting_summary:
        all_chunks.append(
            DocumentChunk(
                content=meeting_summary,
                chunk_index=0,
                segment_index=-1,
                doc_type="meeting_summary",
                content_hash=_hash_content(meeting_summary),
            )
        )

    # Add segment summary chunks
    for seg in segments:
        if seg.summary:
            all_chunks.append(
                DocumentChunk(
                    content=seg.summary,
                    chunk_index=0,
                    segment_index=seg.segment_index,
                    doc_type="segment_summary",
                    content_hash=_hash_content(seg.summary),
                )
            )

    logger.info("[Embedder] Created %d chunks", len(all_chunks))

    # 6. Mark job as chunked before expensive embedding calls
    client.table("fireflies_ingestion_jobs").update(
        {"stage": "chunked"}
    ).eq("metadata_id", metadata_id).execute()

    # 7. Batch embed all chunks
    chunk_texts = [c.content for c in all_chunks]
    chunk_embeddings = llm.batch_embed(chunk_texts)
    for i, chunk in enumerate(all_chunks):
        chunk.embedding = chunk_embeddings[i] if i < len(chunk_embeddings) else None

    # 8. Embed segment summaries
    seg_summaries = [s.summary or s.title for s in segments]
    seg_embeddings = llm.batch_embed(seg_summaries)
    for i, seg in enumerate(segments):
        if i < len(seg_embeddings):
            seg.summary_embedding = seg_embeddings[i]

    # 9. Build segment ID map for chunk → segment FK
    segment_id_map: Dict[int, str] = {
        row["segment_index"]: row["id"] for row in segment_rows
    }

    # 10. Write segment embeddings back to DB
    for seg in segments:
        seg_id = segment_id_map.get(seg.segment_index)
        if seg_id and seg.summary_embedding:
            client.table("meeting_segments").update(
                {"summary_embedding": seg.summary_embedding}
            ).eq("id", seg_id).execute()

    # 11. Store chunks in documents table
    # Build existing content-hash map once to avoid per-chunk SELECT load.
    existing_docs_by_hash = _get_existing_docs_by_hash(client, metadata_id)
    for chunk in all_chunks:
        seg_id = segment_id_map.get(chunk.segment_index) if chunk.segment_index >= 0 else None
        _upsert_document(
            client,
            chunk=chunk,
            metadata_id=metadata_id,
            segment_id=seg_id,
            started_at=started_at,
            participants=participants,
            project_id=project_id,
            existing_doc_id=existing_docs_by_hash.get(chunk.content_hash or ""),
        )

    # 12. Update metadata status
    client.table("document_metadata").update(
        {"status": "embedded"}
    ).eq("id", metadata_id).execute()

    # 13. Advance job stage
    client.table("fireflies_ingestion_jobs").update(
        {"stage": "embedded"}
    ).eq("metadata_id", metadata_id).execute()

    return {
        "metadataId": metadata_id,
        "chunkCount": len(all_chunks),
        "segmentCount": len(segments),
    }


def _upsert_document(
    client,
    chunk: DocumentChunk,
    metadata_id: str,
    segment_id: Optional[str],
    started_at: Optional[str],
    participants: List[str],
    project_id: Optional[int],
    existing_doc_id: Optional[str],
) -> None:
    file_date: Optional[str] = None
    if started_at:
        try:
            file_date = datetime.datetime.fromisoformat(started_at).isoformat()
        except Exception:
            pass

    doc_data: Dict[str, Any] = {
        "file_id": metadata_id,
        "content": chunk.content,
        "embedding": chunk.embedding,
        "source": "fireflies",
        "file_date": file_date,
        "project_id": project_id,
        "processing_status": "complete",
        "metadata": {
            "doc_type": chunk.doc_type,
            "chunk_index": chunk.chunk_index,
            "segment_index": chunk.segment_index,
            "segment_id": segment_id,
            "content_hash": chunk.content_hash,
            "participants": participants,
        },
    }

    if existing_doc_id:
        client.table("documents").update(doc_data).eq("id", existing_doc_id).execute()
    else:
        client.table("documents").insert(doc_data).execute()


def _get_existing_docs_by_hash(client, metadata_id: str) -> Dict[str, str]:
    """Fetch all existing docs for a file once and map content_hash -> doc id."""
    existing_resp = (
        client.table("documents")
        .select("id,metadata")
        .eq("file_id", metadata_id)
        .execute()
    )
    existing = existing_resp.data or []
    by_hash: Dict[str, str] = {}
    for row in existing:
        metadata = row.get("metadata") or {}
        content_hash = metadata.get("content_hash")
        row_id = row.get("id")
        if content_hash and row_id:
            by_hash[content_hash] = row_id
    return by_hash
