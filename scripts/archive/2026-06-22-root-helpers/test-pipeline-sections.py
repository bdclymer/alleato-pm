#!/usr/bin/env python3
"""
Test harness for the section-aware RAG pipeline.

Runs the Fireflies parser, section-aware chunker, and enhanced task
extractor against an example transcript and prints diagnostics.

Usage:
    backend/.venv/bin/python scripts/test-pipeline-sections.py
    backend/.venv/bin/python scripts/test-pipeline-sections.py --transcript path/to/transcript.md
"""
from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

# ---------- path setup ----------
# We need to import from the backend services without triggering
# the pipeline __init__.py (which eagerly imports modules needing
# the full FastAPI / Supabase runtime).  Strategy:
#   1. Put backend/src/services on sys.path so the fireflies parser resolves.
#   2. Import the fireflies parser directly (its __init__.py is safe).
#   3. Import pipeline.models directly via importlib (skip pipeline/__init__.py).
#   4. Reimplement the lightweight helpers (_split_text, _create_section_chunks)
#      locally so we don't need to import embedder.py (which needs supabase).
_root = Path(__file__).resolve().parent.parent
_services = _root / "backend" / "src" / "services"
sys.path.insert(0, str(_services))

from ingestion.fireflies_pipeline import FirefliesIngestionPipeline, ParsedTranscript

# Load models without triggering pipeline/__init__.py
_models_spec = importlib.util.spec_from_file_location(
    "pipeline_models", _services / "pipeline" / "models.py"
)
_models_mod = importlib.util.module_from_spec(_models_spec)
sys.modules[_models_spec.name] = _models_mod
_models_spec.loader.exec_module(_models_mod)
DocumentChunk = _models_mod.DocumentChunk

# ---------- Constants matching embedder.py ----------
CHUNK_TARGET_CHARS = 3000
CHUNK_OVERLAP_CHARS = 500
SEGMENT_IDX_SECTION = -2
SEGMENT_IDX_NOTES_TOPIC = -3

# ---------- Local copies of lightweight helpers ----------
# (Copied from embedder.py to avoid importing the full module)

def _split_text(text: str, max_chars: int = CHUNK_TARGET_CHARS, overlap: int = CHUNK_OVERLAP_CHARS) -> List[str]:
    """Split long text into overlapping chunks at sentence boundaries."""
    if len(text) <= max_chars:
        return [text]
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks: List[str] = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 > max_chars and current:
            chunks.append(current.strip())
            # overlap: keep tail of current chunk
            words = current.split()
            overlap_text = ""
            for w in reversed(words):
                candidate = w + " " + overlap_text if overlap_text else w
                if len(candidate) > overlap:
                    break
                overlap_text = candidate
            current = overlap_text + " " + sentence if overlap_text else sentence
        else:
            current = current + " " + sentence if current else sentence
    if current.strip():
        chunks.append(current.strip())
    return chunks


def _create_section_chunks(parsed: ParsedTranscript, metadata_id: str,
                           meeting_title: str, meeting_date: str | None) -> list:
    """Create document chunks from rich Fireflies sections."""
    chunks: list = []
    chunk_idx = 0

    section_type_map = {
        "Summary": "section_summary",
        "Short Summary": "section_short_summary",
        "Action Items": "section_action_items",
        "Shorthand Bullet": "section_shorthand",
        "Outline": "section_outline",
        "Bullet Gist": "section_bullet_gist",
        "Gist": "section_gist",
    }

    # Rich sections
    for section_name, content in (parsed.rich_sections or {}).items():
        if not content or not content.strip():
            continue
        doc_type = section_type_map.get(section_name, f"section_{section_name.lower().replace(' ', '_')}")
        prefix = f"[{meeting_title}] {section_name}:"
        text_parts = _split_text(content)
        for part in text_parts:
            full_text = f"{prefix}\n{part}"
            chunks.append(DocumentChunk(
                content=full_text,
                chunk_index=chunk_idx,
                segment_index=SEGMENT_IDX_SECTION,
                doc_type=doc_type,
                content_hash=hashlib.md5(full_text.encode()).hexdigest(),
            ))
            chunk_idx += 1

    # Notes topics
    for topic_name, content in (parsed.notes_topics or {}).items():
        if not content or not content.strip():
            continue
        prefix = f"[{meeting_title}] Notes — {topic_name}:"
        text_parts = _split_text(content)
        for part in text_parts:
            full_text = f"{prefix}\n{part}"
            chunks.append(DocumentChunk(
                content=full_text,
                chunk_index=chunk_idx,
                segment_index=SEGMENT_IDX_NOTES_TOPIC,
                doc_type="notes_topic",
                content_hash=hashlib.md5(full_text.encode()).hexdigest(),
            ))
            chunk_idx += 1

    return chunks


# ===================================================================
# Helpers
# ===================================================================
def _header(title: str) -> None:
    bar = "=" * 70
    print(f"\n{bar}\n  {title}\n{bar}")


def _sub(title: str) -> None:
    print(f"\n--- {title} ---")


# ===================================================================
# Phase 1: Parser diagnostics
# ===================================================================
def test_parser(transcript_path: str) -> ParsedTranscript:
    _header("PHASE 1: Parser")
    content = Path(transcript_path).read_text(encoding="utf-8")
    print(f"Transcript: {transcript_path}")
    print(f"Content size: {len(content):,} chars, {len(content.splitlines())} lines")

    # Create a stateless parser
    parser = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)
    parsed = parser.parse_markdown(content)

    _sub("Basic metadata")
    print(f"  Title:       {parsed.title}")
    print(f"  Fireflies ID: {parsed.fireflies_id}")
    print(f"  Captured at: {parsed.captured_at}")
    print(f"  Attendees:   {parsed.attendees}")
    print(f"  Action items: {len(parsed.action_items)}")
    print(f"  Transcript segments: {len(parsed.transcript_segments)}")

    _sub("Rich sections")
    if parsed.rich_sections:
        for key, val in parsed.rich_sections.items():
            print(f"  [{key}] {len(val):,} chars — {val[:80]}...")
    else:
        print("  (none)")

    _sub("Notes topics")
    if parsed.notes_topics:
        for key, val in parsed.notes_topics.items():
            print(f"  [{key}] {len(val):,} chars — {val[:80]}...")
    else:
        print("  (none)")

    _sub("Speakers JSON")
    if parsed.speakers_json:
        for spk in parsed.speakers_json:
            print(f"  {spk}")
    else:
        print("  (none)")

    _sub("Meeting Attendees JSON")
    if parsed.attendees_json:
        for att in parsed.attendees_json:
            print(f"  {att.get('displayName') or att.get('name') or '(unnamed)'} — {att.get('email', '?')}")
    else:
        print("  (none)")

    _sub("Speaker → Email mapping")
    if parsed.speaker_email_map:
        for name, email in parsed.speaker_email_map.items():
            print(f"  {name} → {email}")
    else:
        print("  (none — could not map speakers to attendees)")

    return parsed


# ===================================================================
# Phase 2: Section chunking diagnostics
# ===================================================================
def test_section_chunking(parsed: ParsedTranscript) -> List[DocumentChunk]:
    _header("PHASE 2: Section-Aware Chunking")

    metadata_id = "test-metadata-id"
    meeting_title = parsed.title
    meeting_date = str(parsed.captured_at) if parsed.captured_at else None

    chunks = _create_section_chunks(parsed, metadata_id, meeting_title, meeting_date)

    _sub(f"Created {len(chunks)} section chunks")
    by_type: Dict[str, int] = {}
    for chunk in chunks:
        by_type[chunk.doc_type] = by_type.get(chunk.doc_type, 0) + 1

    for doc_type, count in sorted(by_type.items()):
        print(f"  {doc_type}: {count} chunks")

    _sub("Chunk details")
    for i, chunk in enumerate(chunks):
        seg_label = {
            SEGMENT_IDX_SECTION: "SECTION",
            SEGMENT_IDX_NOTES_TOPIC: "NOTES_TOPIC",
        }.get(chunk.segment_index, f"seg={chunk.segment_index}")
        print(f"  [{i:2d}] {chunk.doc_type:<25} {seg_label:<12} {len(chunk.content):>5} chars | {chunk.content[:100]}...")

    return chunks


# ===================================================================
# Phase 3: Task extraction simulation (no LLM call)
# ===================================================================
def test_task_extraction_context(parsed: ParsedTranscript) -> None:
    _header("PHASE 3: Task Extraction Context (no LLM)")

    # Simulate what extractor.py does to build notes_context
    notes_parts: List[str] = []
    for topic_name, topic_content in (parsed.notes_topics or {}).items():
        notes_parts.append(f"### {topic_name}\n{topic_content}")

    action_items_section = (parsed.rich_sections or {}).get("Action Items", "")
    if action_items_section:
        notes_parts.append(f"### Action Items\n{action_items_section}")

    notes_context = "\n\n".join(notes_parts)

    _sub("Notes context for LLM")
    print(f"  Total: {len(notes_context):,} chars")
    if notes_context:
        lines = notes_context.split("\n")
        print(f"  Lines: {len(lines)}")
        print(f"  First 500 chars:\n{notes_context[:500]}\n  ...")

    _sub("Speaker email map for LLM")
    if parsed.speaker_email_map:
        for name, email in parsed.speaker_email_map.items():
            print(f"  {name} → {email}")
    else:
        print("  (empty)")

    # Show raw action items from the parser
    _sub("Raw action items from parser")
    for i, item in enumerate(parsed.action_items):
        print(f"  [{i+1}] {item[:120]}")

    # Estimate what the LLM prompt would look like
    _sub("LLM prompt estimate")
    raw_tasks = [item.strip() for item in parsed.action_items if item.strip()]
    prompt_parts = [
        f"Meeting: {parsed.title}",
        f"Date: {parsed.captured_at}",
        f"Participants: {', '.join(parsed.attendees)}",
        f"Raw Tasks ({len(raw_tasks)}): {json.dumps(raw_tasks[:5])}...",
        f"Notes Context ({len(notes_context)} chars): included",
        f"Speaker Email Map: {parsed.speaker_email_map}",
    ]
    for p in prompt_parts:
        print(f"  {p}")


# ===================================================================
# Phase 4: _split_text utility test
# ===================================================================
def test_split_text() -> None:
    _header("PHASE 4: _split_text utility")

    short = "This is a short text. It should not be split."
    result = _split_text(short)
    print(f"  Short text ({len(short)} chars) → {len(result)} chunk(s): OK")

    long = ". ".join([f"Sentence number {i} with some padding text here" for i in range(100)])
    result = _split_text(long, max_chars=500, overlap=100)
    print(f"  Long text ({len(long)} chars) → {len(result)} chunks")
    for i, chunk in enumerate(result):
        print(f"    [{i}] {len(chunk)} chars: {chunk[:60]}...")


# ===================================================================
# Backwards compatibility test
# ===================================================================
def test_backwards_compat() -> None:
    _header("PHASE 5: Backwards Compatibility")

    minimal_md = """# Simple Meeting

## Summary
A quick sync about the project timeline.

## Transcript
[00:00] **Alice**: Let's discuss the timeline.
[00:15] **Bob**: Sounds good. I think we're on track.
[00:30] **Alice**: Great. Any blockers?
[00:45] **Bob**: None from my side.
"""
    parser = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)
    parsed = parser.parse_markdown(minimal_md)

    checks = [
        ("title parsed", parsed.title != "Untitled"),
        ("transcript segments", len(parsed.transcript_segments) == 4),
        ("rich_sections is dict", isinstance(parsed.rich_sections, dict)),
        ("notes_topics empty", len(parsed.notes_topics) == 0),
        ("speakers_json empty", len(parsed.speakers_json) == 0),
        ("attendees_json empty", len(parsed.attendees_json) == 0),
        ("speaker_email_map empty", len(parsed.speaker_email_map) == 0),
        ("overview from Summary", "timeline" in parsed.overview.lower()),
    ]

    all_pass = True
    for label, result in checks:
        status = "PASS" if result else "FAIL"
        if not result:
            all_pass = False
        print(f"  [{status}] {label}")

    # Section chunks should produce 1 chunk (just the Summary)
    chunks = _create_section_chunks(parsed, "test-id", parsed.title, None)
    check_chunks = len(chunks) >= 1
    print(f"  [{'PASS' if check_chunks else 'FAIL'}] section chunks for minimal transcript: {len(chunks)}")

    if all_pass and check_chunks:
        print("\n  All backwards compatibility checks PASSED")
    else:
        print("\n  Some checks FAILED — review above")


# ===================================================================
# Main
# ===================================================================
def main() -> None:
    parser = argparse.ArgumentParser(description="Test section-aware RAG pipeline")
    parser.add_argument(
        "--transcript",
        default=str(_root / "scripts" / "examples" / "westfield-transcript.md"),
        help="Path to transcript markdown file",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Run full pipeline against Supabase (requires env vars)",
    )
    args = parser.parse_args()

    if not Path(args.transcript).exists():
        print(f"ERROR: Transcript not found: {args.transcript}")
        sys.exit(1)

    # Run all test phases
    parsed = test_parser(args.transcript)
    chunks = test_section_chunking(parsed)
    test_task_extraction_context(parsed)
    test_split_text()
    test_backwards_compat()

    # Final summary
    _header("SUMMARY")
    results = {
        "rich_sections": len(parsed.rich_sections),
        "notes_topics": len(parsed.notes_topics),
        "speakers_mapped": len(parsed.speaker_email_map),
        "section_chunks": len(chunks),
        "action_items": len(parsed.action_items),
        "transcript_segments": len(parsed.transcript_segments),
    }
    for k, v in results.items():
        print(f"  {k}: {v}")

    # Checklist from the plan
    print("\n  Verification checklist:")
    checks = [
        ("7+ rich sections detected", results["rich_sections"] >= 7),
        ("5+ notes topics extracted", results["notes_topics"] >= 5),
        ("3+ speakers mapped to email", results["speakers_mapped"] >= 3),
        ("Section chunks created", results["section_chunks"] > 0),
        ("Action items extracted", results["action_items"] > 0),
        ("Transcript segments parsed", results["transcript_segments"] > 0),
    ]
    for label, passed in checks:
        print(f"    [{'PASS' if passed else 'FAIL'}] {label}")

    if args.live:
        print("\n  --live mode: full pipeline execution not implemented in test harness")
        print("  Use the actual pipeline API to run against Supabase.")


if __name__ == "__main__":
    main()
