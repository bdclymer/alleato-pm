"""
Stage 1 – Parse and segment.

Fetches raw content from document_metadata, parses it with the Fireflies
markdown parser, then calls the LLM to:
  1. Generate a meeting summary
  2. Semantically segment the transcript

Stores segments in ``meeting_segments`` and advances the job stage to
``segmented``.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from ..supabase_helpers import get_supabase_client
from ..ingestion.fireflies_pipeline import FirefliesIngestionPipeline
from .models import MeetingSegment, TranscriptLine
from . import llm

logger = logging.getLogger(__name__)

# Stateless – parse_markdown needs no store/embedder.
_parser = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)


def _format_transcript_for_llm(lines: List[TranscriptLine]) -> str:
    """Format as [index] [timestamp] Speaker: text (matches TS formatTranscriptForLLM)."""
    parts: List[str] = []
    for line in lines:
        ts = f"[{line.timestamp}] " if line.timestamp else ""
        parts.append(f"[{line.index}] {ts}{line.speaker}: {line.text}")
    return "\n".join(parts)


def run_parser(metadata_id: str) -> Dict[str, Any]:
    """
    Parse a document_metadata row and segment its transcript.

    Returns:
        dict with metadataId, segmentCount, meetingSummaryLength
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
    if not content:
        raise ValueError(f"No content in document_metadata: {metadata_id}")

    title = metadata.get("title") or "Untitled Meeting"
    logger.info("[Parser] Processing: %s (%s)", title, metadata_id)

    # 2. Parse markdown using the existing Fireflies parser
    parsed = _parser.parse_markdown(content)

    # 3. Convert transcript segments to indexed TranscriptLine objects
    transcript_lines: List[TranscriptLine] = [
        TranscriptLine(
            index=i,
            timestamp=seg.timestamp or "",
            speaker=seg.speaker or "Unknown",
            text=seg.text,
        )
        for i, seg in enumerate(parsed.transcript_segments)
    ]

    # 4. Generate meeting summary (pass existing Fireflies summary as context)
    excerpt = "\n".join(
        f"[{l.timestamp}] {l.speaker}: {l.text}"
        for l in transcript_lines[:200]
    )
    meeting_summary = llm.generate_meeting_summary(
        transcript_excerpt=excerpt,
        title=title,
        existing_summary=parsed.summary or parsed.overview,
    )
    logger.info("[Parser] Generated summary: %d chars", len(meeting_summary))

    # 5. Segment the transcript via LLM
    formatted_transcript = _format_transcript_for_llm(transcript_lines)
    segment_dicts = llm.segment_transcript(formatted_transcript, title)
    logger.info("[Parser] Created %d segments", len(segment_dicts))

    # 6. Convert to MeetingSegment objects
    segments: List[MeetingSegment] = [
        MeetingSegment(
            segment_index=i,
            title=s.get("title", f"Segment {i}"),
            start_index=s.get("start_index", 0),
            end_index=s.get("end_index", 0),
            summary=s.get("summary", ""),
            decisions=s.get("decisions") or [],
            risks=s.get("risks") or [],
            tasks=s.get("tasks") or [],
        )
        for i, s in enumerate(segment_dicts)
    ]

    # 7. Upsert segments to meeting_segments
    for seg in segments:
        client.table("meeting_segments").upsert(
            {
                "metadata_id": metadata_id,
                "segment_index": seg.segment_index,
                "title": seg.title,
                "start_index": seg.start_index,
                "end_index": seg.end_index,
                "summary": seg.summary,
                "decisions": seg.decisions,
                "risks": seg.risks,
                "tasks": seg.tasks,
            },
            on_conflict="metadata_id,segment_index",
        ).execute()

    # 8. Update document_metadata with generated summary
    client.table("document_metadata").update(
        {"overview": meeting_summary, "status": "segmented"}
    ).eq("id", metadata_id).execute()

    # 9. Advance job stage to 'segmented'
    client.table("fireflies_ingestion_jobs").update(
        {"stage": "segmented"}
    ).eq("metadata_id", metadata_id).execute()

    return {
        "metadataId": metadata_id,
        "segmentCount": len(segments),
        "meetingSummaryLength": len(meeting_summary),
    }
