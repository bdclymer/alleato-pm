from datetime import datetime, timedelta, timezone

import pytest

from src.services.intelligence.operating_summary import (
    _assert_summary_quality,
    _build_document_intelligence,
    _card_defs,
    _make_source,
    _quality_counts,
    _select_operating_sources,
    _source_aliases,
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


def test_card_defs_do_not_duplicate_one_next_action_across_every_section():
    cards = _card_defs(
        {
            "headline": "Union Collective has permit and budget pressure.",
            "currentExecutiveRead": "Design is active and decisions need to close.",
            "context": "Permit drawings and budget reconciliation are the current pressure points.",
            "sourceIds": ["document_metadata:meeting-1"],
            "whatChanged": [
                {
                    "title": "Permit package deadline tightened",
                    "impact": "Open design items now threaten the June permit target.",
                    "sourceIds": ["document_metadata:meeting-1"],
                }
            ],
            "risks": [
                {
                    "title": "Permit schedule may slip",
                    "recommendedAction": "Escalate unresolved permit-blocking decisions.",
                    "sourceIds": ["document_metadata:meeting-1"],
                }
            ],
            "openDecisions": [
                {
                    "title": "Finalize second-floor private room configuration",
                    "sourceIds": ["document_metadata:meeting-1"],
                }
            ],
            "moneyImpact": {
                "summary": "Scope growth needs current estimate reconciliation.",
                "sourceIds": ["document_metadata:meeting-1"],
            },
            "promisesMade": [
                {
                    "title": "Permit drawings due June 11",
                    "sourceIds": ["document_metadata:meeting-1"],
                }
            ],
            "recommendedActions": [
                {
                    "title": "Lock remaining design decisions",
                    "reason": "Needed for permit readiness.",
                    "sourceIds": ["document_metadata:meeting-1"],
                },
                {
                    "title": "Reconcile budget and current estimate",
                    "reason": "Scope growth needs cost control.",
                    "sourceIds": ["document_metadata:meeting-1"],
                },
            ],
            "projectControls": {
                "tasks": [
                    {
                        "title": "Maintain master decision log",
                        "sourceIds": ["document_metadata:meeting-1"],
                    }
                ]
            },
            "scheduleAndProcurement": {
                "summary": "Permit path is tight.",
                "sourceIds": ["document_metadata:meeting-1"],
            },
        }
    )

    next_actions = [card.get("nextAction") for card in cards if card.get("nextAction")]

    assert len(set(next_actions)) > 3
    assert "Escalate unresolved permit-blocking decisions." in next_actions
    assert "Resolve: Finalize second-floor private room configuration" in next_actions


def test_source_aliases_accept_common_model_citation_formats():
    assert _source_aliases(1) == ["S001", "S01", "S1"]
    assert _source_aliases(12) == ["S012", "S12"]


def test_document_intelligence_extracts_latest_obligations_conflicts_and_evidence():
    drawing_old = _make_source(
        category="drawing",
        source_id="drawing:A201-old",
        record_id="A201-old",
        title="A-201 Floor Plan",
        project_name="Union Collective",
        captured_at=_iso(10),
        text="Drawing: A-201 Floor Plan. Status: superseded by revised owner plan.",
    )
    drawing_new = _make_source(
        category="drawing",
        source_id="drawing:A201-new",
        record_id="A201-new",
        title="A-201 Floor Plan",
        project_name="Union Collective",
        captured_at=_iso(1),
        text="Drawing: A-201 Floor Plan. Revision Date: current.",
    )
    specification = _make_source(
        category="specification",
        source_id="specification:081113",
        record_id="081113",
        title="08 11 13 Hollow Metal Doors",
        project_name="Union Collective",
        captured_at=_iso(2),
        text="Specification requires approved door hardware submittals before fabrication and inspection.",
    )

    doc_intel = _build_document_intelligence([drawing_old, drawing_new, specification])

    assert doc_intel["schema"] == "project_document_intelligence_v1"
    assert doc_intel["documentSourceCount"] == 3
    assert doc_intel["latestByCategory"][0]["latest"]["sourceId"] == "drawing:A201-new"
    assert doc_intel["revisionSignals"][0]["latest"]["sourceId"] == "drawing:A201-new"
    assert doc_intel["conflictSignals"][0]["sourceIds"] == ["drawing:A201-old"]
    assert doc_intel["obligations"][0]["sourceIds"] == ["specification:081113"]
    assert doc_intel["evidencePointers"][0]["sourceId"] == "drawing:A201-new"


def test_card_defs_adds_document_intelligence_card_from_source_set():
    source = _make_source(
        category="specification",
        source_id="specification:081113",
        record_id="081113",
        title="08 11 13 Hollow Metal Doors",
        project_name="Union Collective",
        captured_at=_iso(2),
        text="Specification requires approved door hardware submittals before fabrication.",
    )
    source_set = {"documentIntelligence": _build_document_intelligence([source])}

    cards = _card_defs(
        {
            "headline": "Union Collective has document obligations.",
            "currentExecutiveRead": "Spec obligations need to be tracked.",
            "context": "Document intelligence is needed.",
            "sourceIds": ["specification:081113"],
        },
        source_set,
    )

    doc_card = next(card for card in cards if card["key"] == "operating-document-intelligence")
    assert doc_card["type"] == "requirement"
    assert doc_card["section"] == "documents"
    assert "obligation" in doc_card["summary"].lower()
