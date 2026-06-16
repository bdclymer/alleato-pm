"""Regression tests for Fireflies task extraction.

The legacy regex-based `_build_task_rows_from_action_items` produced the bug
this suite was originally written against: third-person Fireflies action
items copied verbatim into the tasks table with whoever was named in the text
assigned as owner. That path is now replaced by `fireflies_task_rewriter`.

These tests guard the rewriter's deterministic helpers (no LLM call) so the
narration-detection regex doesn't regress.
"""
from __future__ import annotations

import pytest

from src.services.ingestion.fireflies_task_rewriter import (
    _build_user_prompt,
    _looks_like_narration,
    _normalize_priority,
    _valid_iso_date,
)
from src.services.ingestion.fireflies_pipeline import FirefliesIngestionPipeline


# Real Fireflies action_items string for the Goodwill Kokomo design meeting —
# the meeting that surfaced the assignee-loss bug. Owners are grouped under
# **Name** headers with their items beneath.
GOODWILL_ACTION_ITEMS = """
**Colin Nicoski**
Deliver the CAD file by midweek to maintain the project schedule (00:22)
Lead the submission process for BZA variances and subsequent development plans (05:02)

**Jerome / DKGR**
Send the latest building footprint and updated shell drawings (00:56)

**Nick Jepson**
Verify scheduling urgency with Goodwill regarding variance submission (04:07)

**Nick Jepson / Team**
Confirm if there is any push to proceed with drawings prior to the July BZA meeting (03:45)
"""


class TestGroupedActionItemParsing:
    def test_preserves_assignee_per_item(self):
        pairs = FirefliesIngestionPipeline._parse_grouped_action_items(GOODWILL_ACTION_ITEMS)
        assert [p["assignee"] for p in pairs] == [
            "Colin Nicoski",
            "Colin Nicoski",
            "Jerome / DKGR",
            "Nick Jepson",
            "Nick Jepson / Team",
        ]
        # Owner headers must NOT leak into item text (the old bug kept them out
        # of the list entirely; the new behavior keeps them as the assignee).
        assert all(not p["text"].startswith("**") for p in pairs)
        assert pairs[0]["text"].startswith("Deliver the CAD file")

    def test_items_before_any_header_are_unassigned(self):
        pairs = FirefliesIngestionPipeline._parse_grouped_action_items(
            "Floating item with no owner\n**Owner**\nOwned item"
        )
        assert pairs[0] == {"assignee": None, "text": "Floating item with no owner"}
        assert pairs[1] == {"assignee": "Owner", "text": "Owned item"}

    def test_list_input_has_no_assignee(self):
        pairs = FirefliesIngestionPipeline._parse_grouped_action_items(["a", "b"])
        assert pairs == [
            {"assignee": None, "text": "a"},
            {"assignee": None, "text": "b"},
        ]

    def test_empty_dict_returns_empty(self):
        assert FirefliesIngestionPipeline._parse_grouped_action_items({}) == []


class TestActionItemsStorageRoundTrip:
    def test_storage_format_then_structured_parse_recovers_owners(self):
        pairs = FirefliesIngestionPipeline._parse_grouped_action_items(GOODWILL_ACTION_ITEMS)
        stored = FirefliesIngestionPipeline._format_action_items_storage(pairs)
        # Stored value carries the owner headers so the UI can group by assignee.
        assert "**Colin Nicoski**" in stored
        assert "**Nick Jepson**" in stored
        assert "- Deliver the CAD file by midweek" in stored

        # Re-parsing the stored markdown (as the parser does on re-ingest) must
        # recover the same owner→item pairs.
        pipeline = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)
        sections = {"Action Items": stored}
        flat = [p["text"] for p in pairs]
        recovered = pipeline._parse_action_items_structured(sections, flat)
        assert [p["assignee"] for p in recovered] == [p["assignee"] for p in pairs]

    def test_structured_parse_falls_back_to_unassigned_on_count_mismatch(self):
        # Legacy inline format collapses to a single grouped item; flat parser
        # recovers more, so we fall back to owner-less pairs rather than mislabel.
        pipeline = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)
        sections = {"Action Items": "- item one (29:49) - item two (08:36)"}
        flat = ["item one (29:49)", "item two (08:36)"]
        recovered = pipeline._parse_action_items_structured(sections, flat)
        assert recovered == [
            {"assignee": None, "text": "item one (29:49)"},
            {"assignee": None, "text": "item two (08:36)"},
        ]


class TestRewriterOwnerHint:
    def test_user_prompt_includes_fireflies_owner(self):
        prompt = _build_user_prompt(
            title="Goodwill Kokomo Weekly Design Meeting",
            source_date="2026-06-01",
            participants=["Nick Jepson"],
            speaker_email_map={},
            action_items=["Verify scheduling urgency with Goodwill"],
            notes_context="",
            item_owners=["Nick Jepson"],
        )
        assert "[Fireflies owner: Nick Jepson] Verify scheduling urgency" in prompt

    def test_user_prompt_omits_hint_when_owner_missing(self):
        prompt = _build_user_prompt(
            title="m",
            source_date=None,
            participants=[],
            speaker_email_map={},
            action_items=["Do the thing"],
            notes_context="",
            item_owners=[None],
        )
        assert "- Do the thing" in prompt
        assert "Fireflies owner" not in prompt


class TestNarrationDetection:
    @pytest.mark.parametrize(
        "text",
        [
            "Provide support and coaching to Brandon Clymer regarding the deluge system",
            "Inform Brandon once Ben's answers are ready",
            "Brandon Clymer asked Katie Conner about overdue payments",
            "Coordinate with Sarah on contract edits",
            "Coordinate scheduling of a detailed discussion call",
        ],
    )
    def test_rejects_narration_shapes(self, text: str):
        assert _looks_like_narration(text), f"Expected narration to be flagged: {text!r}"

    @pytest.mark.parametrize(
        "text",
        [
            "Escalate Katie Conner's overdue payment",
            "Send updated CAD with trays to Brandon",
            "Submit RFI #042 about door swing",
            "Schedule fire marshal inspection for week of June 10",
        ],
    )
    def test_accepts_imperative_tasks(self, text: str):
        assert not _looks_like_narration(text), f"Imperative task should not be flagged: {text!r}"


class TestPriorityNormalization:
    @pytest.mark.parametrize(
        "raw,expected",
        [
            ("high", "high"),
            ("Medium", "medium"),
            ("LOW", "low"),
            ("urgent", "high"),
            ("", None),
            (None, None),
            ("not-a-priority", None),
        ],
    )
    def test_normalize(self, raw, expected):
        assert _normalize_priority(raw) == expected


class TestDateValidation:
    @pytest.mark.parametrize(
        "raw,expected",
        [
            ("2026-05-21", "2026-05-21"),
            ("not-a-date", None),
            ("", None),
            (None, None),
            ("2026/05/21", None),
        ],
    )
    def test_valid_iso_date(self, raw, expected):
        assert _valid_iso_date(raw) == expected


class _FakeMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _FakeChoice:
    def __init__(self, content: str) -> None:
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content: str) -> None:
        self.choices = [_FakeChoice(content)]


class _FakeOpenAIClient:
    """Minimal stand-in for the OpenAI client returning a canned chat response."""

    def __init__(self, content: str) -> None:
        self._content = content
        self.chat = self  # type: ignore[assignment]
        self.completions = self  # type: ignore[assignment]

    def create(self, *args, **kwargs):  # noqa: ANN002, ANN003 - test stub
        return _FakeResponse(self._content)


class TestMeetingMemoryExtraction:
    """Guards the meeting → ai_memories path against structural code bugs.

    Regression: `_extract_meeting_memories` referenced `_openai_provider_configs`,
    `_client_for_provider`, and `_model_for_provider` — none of which exist in the
    module — so every meeting ingest raised NameError. It was swallowed by the
    caller's try/except, silently disabling memory extraction for every Fireflies
    meeting. This test exercises the chat path so that class of bug can't recur
    undetected.
    """

    def test_extraction_reaches_chat_without_undefined_helpers(self, monkeypatch):
        from src.services.ingestion import fireflies_pipeline

        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setattr(
            fireflies_pipeline,
            "get_openai_client",
            lambda: _FakeOpenAIClient("[]"),
        )

        pipeline = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)
        # An empty "[]" response returns before any Supabase/embedder access, so
        # __init__ collaborators are not needed. Before the fix this raised
        # NameError: name '_openai_provider_configs' is not defined.
        result = pipeline._extract_meeting_memories(
            document_id="doc-1",
            project_id=1009,
            title="Weekly Design Sync",
            content="We agreed to ship the CAD file by Friday.",
            action_items=["Deliver the CAD file by Friday"],
        )
        assert result is None

    def test_valid_memory_runs_full_parse_path(self, monkeypatch):
        from src.services.ingestion import fireflies_pipeline

        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        # Clear Supabase creds so the method stops at the storage guard *after*
        # parsing + validating memories — exercising the JSON/validation path
        # without any network write.
        monkeypatch.delenv("SUPABASE_URL", raising=False)
        monkeypatch.delenv("NEXT_PUBLIC_SUPABASE_URL", raising=False)
        monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
        memory_json = (
            '[{"type": "commitment", "content": "Colin delivers the CAD file by '
            'Friday.", "importance": 0.8, "confidence": 0.9}]'
        )
        monkeypatch.setattr(
            fireflies_pipeline,
            "get_openai_client",
            lambda: _FakeOpenAIClient(memory_json),
        )

        pipeline = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)
        # Returns at the missing-Supabase-creds guard, never touching the network.
        result = pipeline._extract_meeting_memories(
            document_id="doc-2",
            project_id=1009,
            title="Weekly Design Sync",
            content="Colin will deliver the CAD file by Friday.",
            action_items=[],
        )
        assert result is None


class _SkipGuardStore:
    def find_document_by_hash(self, content_hash):  # noqa: ANN001
        return {"id": "doc-existing", "project_id": 1009, "fireflies_id": "ff-123"}

    def find_document_by_fireflies_id(self, fireflies_id):  # noqa: ANN001
        raise AssertionError("exact-content skip should not need Fireflies-id lookup")


class _UnexpectedWorkEmbedder:
    def embed(self, texts):  # noqa: ANN001
        raise AssertionError("unchanged transcripts must not be re-embedded")


class TestIngestShortCircuitsUnchangedTranscript:
    def test_exact_content_reingest_skips_llm_and_embedding_work(self):
        pipeline = FirefliesIngestionPipeline.__new__(FirefliesIngestionPipeline)
        pipeline.store = _SkipGuardStore()
        pipeline.embedder = _UnexpectedWorkEmbedder()
        pipeline._fireflies_api_key = None
        pipeline._project_assigner = None

        markdown = """# Weekly Design Sync

**Fireflies ID:** ff-123
**Date:** 2026-06-16

## Summary
No material updates.

## Action Items
- Follow up with architect

## Transcript
[00:01] **Brandon**: Quick project check-in.
"""

        result = pipeline.ingest_markdown_text(markdown, dry_run=False)

        assert result.document_id == "doc-existing"
        assert result.skipped is True
        assert result.dry_run is False
        assert result.action_item_count == 1
        assert result.chunk_count == 0
