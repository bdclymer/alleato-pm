"""Unit tests for native Teams meeting transcript ingestion.

Covers the pure, deterministic pieces of
``services.integrations.microsoft_graph.meeting_transcripts``:
  - WebVTT parsing (voice tags, missing speaker, multi-line cues, long meetings)
  - the Fireflies-markdown builder round-tripping through the REAL parser
  - deterministic document-id keying
These run without network/DB — the heavy ingest path is exercised end-to-end
elsewhere (it reuses the proven Fireflies pipeline unchanged).
"""
from __future__ import annotations

import pytest

from src.services.integrations.microsoft_graph.meeting_transcripts import (
    _meeting_doc_key,
    _seconds_to_stamp,
    build_meeting_markdown,
    parse_vtt,
)
from src.services.ingestion.fireflies_pipeline import FirefliesIngestionPipeline

# Stateless parser (mirrors pipeline/extractor.py's reuse — no __init__ side effects).
_parser = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)


SAMPLE_VTT = """WEBVTT

00:00:00.000 --> 00:00:04.500
<v Brandon Clymer>Let's kick off the weekly OPS sync.</v>

00:00:04.500 --> 00:00:09.000
<v Jane Dawson>I'll cover the estimating backlog first.</v>

00:00:09.000 --> 00:00:12.000
No speaker tag on this cue.
"""


def test_parse_vtt_extracts_speaker_timestamp_text():
    cues = parse_vtt(SAMPLE_VTT)
    assert len(cues) == 3
    assert cues[0] == ("00:00", "Brandon Clymer", "Let's kick off the weekly OPS sync.")
    assert cues[1] == ("00:04", "Jane Dawson", "I'll cover the estimating backlog first.")


def test_parse_vtt_handles_missing_voice_tag():
    cues = parse_vtt(SAMPLE_VTT)
    # Third cue has no <v> tag → speaker is None but text is preserved.
    assert cues[2][1] is None
    assert cues[2][2] == "No speaker tag on this cue."


def test_parse_vtt_handles_multiline_cue_and_crlf():
    vtt = (
        "WEBVTT\r\n\r\n"
        "00:01:05.000 --> 00:01:10.000\r\n"
        "<v Speaker A>First line\r\nsecond line.</v>\r\n"
    )
    cues = parse_vtt(vtt)
    assert len(cues) == 1
    assert cues[0][0] == "01:05"
    assert cues[0][1] == "Speaker A"
    assert "First line" in cues[0][2] and "second line." in cues[0][2]


def test_parse_vtt_empty_input():
    assert parse_vtt("") == []
    assert parse_vtt("WEBVTT\n") == []


def test_seconds_to_stamp_supports_meetings_over_99_minutes():
    # 2h05m30s → 125:30. The fireflies parser regex must accept 3-digit minutes.
    assert _seconds_to_stamp(2 * 3600 + 5 * 60 + 30) == "125:30"


def test_meeting_doc_key_is_deterministic_and_namespaced():
    key1 = _meeting_doc_key("MSPdummyMeetingId==")
    key2 = _meeting_doc_key("MSPdummyMeetingId==")
    assert key1 == key2
    assert key1.startswith("teamsmtg_")
    assert _meeting_doc_key("other-id") != key1


def test_built_markdown_round_trips_through_fireflies_parser():
    cues = parse_vtt(SAMPLE_VTT)
    doc_key = _meeting_doc_key("meeting-123")
    markdown = build_meeting_markdown(
        title="Weekly OPS (Estimators)",
        date_iso="2026-06-22T18:30:00+00:00",
        meeting_doc_key=doc_key,
        attendees=["Brandon Clymer", "Jane Dawson"],
        cues=cues,
        organizer_email="mcalcetero@alleatogroup.com",
    )

    parsed = _parser.parse_markdown(markdown)

    # Title, deterministic id, attendees, and transcript segments all recovered.
    assert parsed.title == "Weekly OPS (Estimators)"
    assert parsed.fireflies_id == doc_key  # drives document_id downstream
    assert "Brandon Clymer" in parsed.attendees
    assert len(parsed.transcript_segments) >= 2
    assert parsed.transcript_segments[0].speaker == "Brandon Clymer"
    assert parsed.transcript_segments[0].timestamp == "00:00"


def test_long_meeting_timestamp_parses_as_transcript_segment():
    cues = [("125:30", "Speaker A", "A point made two hours in.")]
    markdown = build_meeting_markdown(
        title="Long Meeting",
        date_iso="2026-06-22T18:30:00+00:00",
        meeting_doc_key=_meeting_doc_key("long-1"),
        attendees=["Speaker A"],
        cues=cues,
    )
    parsed = _parser.parse_markdown(markdown)
    assert len(parsed.transcript_segments) == 1
    seg = parsed.transcript_segments[0]
    assert seg.timestamp == "125:30"
    assert seg.speaker == "Speaker A"
    assert seg.text == "A point made two hours in."
