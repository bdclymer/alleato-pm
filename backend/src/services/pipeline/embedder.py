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
from .config import CHUNK_TARGET_CHARS, CHUNK_OVERLAP_CHARS

logger = logging.getLogger(__name__)

# Segment index conventions for non-transcript chunks
SEGMENT_IDX_MEETING_SUMMARY = -1
SEGMENT_IDX_SECTION = -2
SEGMENT_IDX_NOTES_TOPIC = -3

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


def _split_text(text: str, max_chars: int = CHUNK_TARGET_CHARS, overlap: int = CHUNK_OVERLAP_CHARS) -> List[str]:
    """Split text into overlapping chunks at sentence boundaries."""
    if len(text) <= max_chars:
        return [text]

    sentences = _split_sentences(text)
    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for sentence in sentences:
        slen = len(sentence)
        if current_len + slen > max_chars and current:
            chunks.append(" ".join(current))
            # Keep overlap tail
            overlap_parts: List[str] = []
            overlap_len = 0
            for s in reversed(current):
                if overlap_len + len(s) <= overlap:
                    overlap_parts.insert(0, s)
                    overlap_len += len(s)
                else:
                    break
            current = overlap_parts
            current_len = overlap_len
        current.append(sentence)
        current_len += slen

    if current:
        chunks.append(" ".join(current))
    return chunks


def _create_section_chunks(
    parsed,
    metadata_id: str,
    meeting_title: str,
    meeting_date: Optional[str],
) -> List[DocumentChunk]:
    """Create embedder-ready chunks from rich Fireflies markdown sections.

    Produces chunks for Summary, Short Summary, Action Items, Shorthand Bullet,
    Outline, and individual Notes topics.
    """
    chunks: List[DocumentChunk] = []

    # Map of section names → doc_type for single-chunk sections
    section_doc_types = {
        "Summary": "section_summary",
        "Short Summary": "section_short_summary",
        "Action Items": "section_action_items",
        "Shorthand Bullet": "section_shorthand",
        "Outline": "section_outline",
        "Bullet Gist": "section_bullet_gist",
        "Gist": "section_gist",
    }

    chunk_idx = 0
    rich_sections = getattr(parsed, "rich_sections", {}) or {}
    notes_topics = getattr(parsed, "notes_topics", {}) or {}

    for section_name, doc_type in section_doc_types.items():
        content = rich_sections.get(section_name, "").strip()
        if not content:
            continue

        # Prefix with context for better RAG retrieval
        prefix = f"[{meeting_title}] {section_name}:\n\n"
        text_parts = _split_text(prefix + content)

        for part_idx, text in enumerate(text_parts):
            chunks.append(DocumentChunk(
                content=text,
                chunk_index=chunk_idx,
                segment_index=SEGMENT_IDX_SECTION,
                doc_type=doc_type,
                content_hash=_hash_content(text),
            ))
            chunk_idx += 1

    # Notes topics — each sub-heading gets its own chunk(s)
    for topic_name, topic_content in notes_topics.items():
        if not topic_content.strip():
            continue

        prefix = f"[{meeting_title}] Notes — {topic_name}:\n\n"
        text_parts = _split_text(prefix + topic_content)

        for part_idx, text in enumerate(text_parts):
            chunks.append(DocumentChunk(
                content=text,
                chunk_index=chunk_idx,
                segment_index=SEGMENT_IDX_NOTES_TOPIC,
                doc_type="notes_topic",
                content_hash=_hash_content(text),
            ))
            chunk_idx += 1

    logger.info("[Embedder] Created %d section chunks from rich sections", len(chunks))
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
    parsed = None  # Hoisted so section chunking can reuse it
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

    # Add section-aware chunks from rich Fireflies sections
    if parsed is not None:
        try:
            section_chunks = _create_section_chunks(
                parsed, metadata_id, title, started_at
            )
            all_chunks.extend(section_chunks)
        except Exception as exc:
            logger.warning("[Embedder] Failed to create section chunks: %s", exc)

    logger.info("[Embedder] Created %d chunks (transcript + sections)", len(all_chunks))

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

    # 10. (Segment summary_embedding column was dropped in migration 20260320100000.
    #      Segment summary embeddings are now stored as document_chunks rows with
    #      source_type='meeting_segment_summary' — written in step 11 below.)

    # 11. Store chunks in document_chunks table (unified RAG table)
    # Build existing content-hash map once to avoid per-chunk SELECT load.
    existing_chunks_by_hash = _get_existing_chunks_by_hash(client, metadata_id)
    for chunk in all_chunks:
        seg_id = segment_id_map.get(chunk.segment_index) if chunk.segment_index >= 0 else None
        _upsert_chunk(
            client,
            chunk=chunk,
            metadata_id=metadata_id,
            segment_id=seg_id,
            started_at=started_at,
            participants=participants,
            project_id=project_id,
            title=title,
            existing_chunk_id=existing_chunks_by_hash.get(chunk.content_hash or ""),
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


def _doc_type_to_source_type(doc_type: str) -> str:
    """Map pipeline doc_type to document_chunks.source_type."""
    mapping = {
        "chunk": "meeting_transcript",
        "meeting_summary": "meeting_summary",
        "segment_summary": "meeting_segment_summary",
        "notes_topic": "meeting_notes",
    }
    if doc_type in mapping:
        return mapping[doc_type]
    if doc_type.startswith("section_"):
        return "meeting_section"
    return "meeting_transcript"


def _upsert_chunk(
    client,
    chunk: DocumentChunk,
    metadata_id: str,
    segment_id: Optional[str],
    started_at: Optional[str],
    participants: List[str],
    project_id: Optional[int],
    title: str,
    existing_chunk_id: Optional[str],
) -> None:
    source_type = _doc_type_to_source_type(chunk.doc_type)
    seg_idx = str(chunk.segment_index) if chunk.segment_index is not None else "0"
    chunk_idx = str(chunk.chunk_index) if chunk.chunk_index is not None else "0"

    chunk_id = (
        existing_chunk_id
        or f"{metadata_id}__ff_{chunk.doc_type}_{seg_idx}_{chunk_idx}"
    )

    chunk_data: Dict[str, Any] = {
        "chunk_id": chunk_id,
        "document_id": metadata_id,
        "chunk_index": chunk.chunk_index,
        "text": chunk.content,
        "embedding": chunk.embedding,
        "source_type": source_type,
        "content_hash": chunk.content_hash,
        "metadata": {
            "doc_type": chunk.doc_type,
            "chunk_index": chunk.chunk_index,
            "segment_index": chunk.segment_index,
            "segment_id": segment_id,
            "content_hash": chunk.content_hash,
            "participants": participants,
            "project_id": project_id,
            "title": title,
            "file_date": started_at,
        },
    }

    try:
        client.table("document_chunks").upsert(
            chunk_data, on_conflict="chunk_id"
        ).execute()
    except Exception as exc:
        logger.warning("[Embedder] Failed to upsert chunk %s: %s", chunk_id, exc)


def _get_existing_chunks_by_hash(client, metadata_id: str) -> Dict[str, str]:
    """Fetch all existing chunks for a document and map content_hash -> chunk_id."""
    existing_resp = (
        client.table("document_chunks")
        .select("chunk_id,content_hash")
        .eq("document_id", metadata_id)
        .execute()
    )
    existing = existing_resp.data or []
    by_hash: Dict[str, str] = {}
    for row in existing:
        content_hash = row.get("content_hash")
        cid = row.get("chunk_id")
        if content_hash and cid:
            by_hash[content_hash] = cid
    return by_hash
