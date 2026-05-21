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
    _looks_like_narration,
    _normalize_priority,
    _valid_iso_date,
)


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
