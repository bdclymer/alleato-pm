from datetime import datetime, timedelta, timezone

import pytest

from src.services.intelligence.operating_summary import (
    _assert_summary_quality,
    _make_source,
    _quality_counts,
    _select_operating_sources,
)


def _iso(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def test_source_quality_marks_raw_email_dump():
    source = _make_source(
        category="email",
        source_id="document_metadata:email-1",
        record_id="email-1",
        title="Union Collective: CAD Files",
        project_name="Union Collective",
        captured_at=_iso(1),
        text=(
            "Subject: Union Collective: CAD Files Date: 2026-05-18T19:20:31Z "
            "From: Andrew Cannon <acannon@alleatogroup.com> To: Jerome <jerome@example.com> "
            "Please send the CAD files by EOD today."
        ),
    )

    assert source["sourceQuality"]["label"] == "raw_dump"


def test_select_operating_sources_prioritizes_recent_meetings_before_email():
    meeting = _make_source(
        category="meeting",
        source_id="document_metadata:meeting-1",
        record_id="meeting-1",
        title="Owner coordination meeting",
        project_name="Union Collective",
        captured_at=_iso(3),
        text="Summary: Owner team agreed the site plan needs revised earthwork calculations.",
    )
    email = _make_source(
        category="email",
        source_id="document_metadata:email-1",
        record_id="email-1",
        title="Recent email",
        project_name="Union Collective",
        captured_at=_iso(1),
        text="Summary: Recent owner email about CAD files.",
    )
    stale_meeting = _make_source(
        category="meeting",
        source_id="document_metadata:meeting-stale",
        record_id="meeting-stale",
        title="Old meeting",
        project_name="Union Collective",
        captured_at=_iso(220),
        text="Summary: Old context.",
    )

    selected = _select_operating_sources([email, stale_meeting, meeting])

    assert [source["id"] for source in selected] == [
        "document_metadata:meeting-1",
        "document_metadata:email-1",
    ]


def test_summary_quality_rejects_raw_source_text():
    with pytest.raises(ValueError, match="raw source text"):
        _assert_summary_quality(
            {
                "headline": "Subject: Union Collective CAD Files",
                "currentExecutiveRead": (
                    "Subject: Union Collective: CAD Files Date: 2026-05-18 From: Andrew To: Jerome"
                ),
            }
        )


def test_quality_counts_tracks_metadata_and_clean_sources():
    clean = _make_source(
        category="task",
        source_id="task:1",
        record_id="1",
        title="Confirm CAD files",
        project_name="Union Collective",
        captured_at=_iso(1),
        text="Task: Confirm CAD files. Status: open. Priority: high.",
    )
    metadata_only = _make_source(
        category="email",
        source_id="document_metadata:email-2",
        record_id="email-2",
        title="Accepted meeting",
        project_name="Union Collective",
        captured_at=_iso(1),
        text="Subject: Accepted: Union Collective Date: 2026-05-18 From: a@example.com To: b@example.com",
    )

    counts = _quality_counts([clean, metadata_only])

    assert counts["clean_source"] == 1
    assert counts["metadata_only"] == 1
