import itertools
from datetime import datetime, timedelta, timezone

import pytest

from src.services.intelligence.operating_summary import (
    _assert_summary_quality,
    _build_document_intelligence,
    _card_defs,
    _make_source,
    _persist_operating_cards,
    _quality_counts,
    _select_operating_sources,
    _source_aliases,
)


def _iso(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


class _FakeResponse:
    def __init__(self, data):
        self.data = data


class _FakeQuery:
    """Minimal in-memory stand-in for the supabase-py query builder."""

    def __init__(self, store, table):
        self._store = store
        self._table = table
        self._op = None
        self._payload = None
        self._filters = []

    def select(self, *_args):
        self._op = "select"
        return self

    def insert(self, payload):
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload):
        self._op = "update"
        self._payload = payload
        return self

    def delete(self):
        self._op = "delete"
        return self

    def eq(self, field, value):
        self._filters.append(("eq", field, value))
        return self

    def in_(self, field, values):
        self._filters.append(("in", field, list(values)))
        return self

    def limit(self, *_args):
        return self

    def _match(self, row):
        for kind, field, value in self._filters:
            if kind == "eq" and row.get(field) != value:
                return False
            if kind == "in" and row.get(field) not in value:
                return False
        return True

    def execute(self):
        rows = self._store.setdefault(self._table, [])
        if self._op == "select":
            return _FakeResponse([dict(row) for row in rows if self._match(row)])
        if self._op == "insert":
            payloads = self._payload if isinstance(self._payload, list) else [self._payload]
            created = []
            for payload in payloads:
                row = dict(payload)
                row.setdefault("id", f"{self._table}-{next(self._store['_seq'])}")
                rows.append(row)
                created.append(dict(row))
            return _FakeResponse(created)
        if self._op == "update":
            updated = []
            for row in rows:
                if self._match(row):
                    row.update(self._payload)
                    updated.append(dict(row))
            return _FakeResponse(updated)
        if self._op == "delete":
            self._store[self._table] = [row for row in rows if not self._match(row)]
            return _FakeResponse([])
        return _FakeResponse([])


class _FakeSupabase:
    def __init__(self):
        self.store = {"_seq": itertools.count(1)}

    def table(self, name):
        return _FakeQuery(self.store, name)


def _operating_card(key: str, title: str = "Card", card_type: str = "risk") -> dict:
    return {
        "key": key,
        "type": card_type,
        "title": title,
        "summary": f"{title} summary",
        "why": f"{title} matters",
        "section": "risks",
        "rank": 1,
        "nextAction": "Escalate the blocker",
        "sourceIds": ["document_metadata:meeting-1"],
    }


def test_persist_operating_cards_dedupes_supersedes_and_does_not_accumulate():
    supabase = _FakeSupabase()
    source = _make_source(
        category="meeting",
        source_id="document_metadata:meeting-1",
        record_id="meeting-1",
        title="Owner coordination meeting",
        project_name="Union Collective",
        captured_at=_iso(1),
        text="Summary: Permit schedule may slip.",
    )
    common = dict(
        target_id="target-1",
        source_by_id={source["id"]: source},
        confidence="high",
        latest_dates=[_iso(1)],
        project_label="Union Collective",
    )

    # First refresh inserts two cards.
    first = _persist_operating_cards(
        supabase,
        cards=[_operating_card("k1", "Permit slip"), _operating_card("k2", "Budget gap")],
        generated_at=_iso(2),
        **common,
    )
    assert len(first) == 2
    assert len(supabase.store["insight_cards"]) == 2
    first_seen_k1 = next(
        c["first_seen_at"]
        for c in supabase.store["insight_cards"]
        if c["metadata"]["normalized_signal_key"] == "k1"
    )

    # Second refresh with the SAME keys updates in place — no duplicate rows.
    _persist_operating_cards(
        supabase,
        cards=[_operating_card("k1", "Permit slip v2"), _operating_card("k2", "Budget gap")],
        generated_at=_iso(1),
        **common,
    )
    cards_after_second = supabase.store["insight_cards"]
    assert len(cards_after_second) == 2, "re-running must not insert duplicate cards"
    k1_after_second = next(c for c in cards_after_second if c["metadata"]["normalized_signal_key"] == "k1")
    assert k1_after_second["title"] == "Permit slip v2", "existing card should be updated in place"
    assert k1_after_second["first_seen_at"] == first_seen_k1, "first_seen_at must be preserved"
    # Evidence for the updated card is replaced, not appended.
    k1_evidence = [e for e in supabase.store["insight_card_evidence"] if e["insight_card_id"] == k1_after_second["id"]]
    assert len(k1_evidence) == 1, "evidence rows must not accumulate across refreshes"

    # Third refresh drops k2: it is superseded (resolved), k1 stays open and current.
    _persist_operating_cards(
        supabase,
        cards=[_operating_card("k1", "Permit slip v3")],
        generated_at=_iso(0),
        **common,
    )
    cards_after_third = supabase.store["insight_cards"]
    assert len(cards_after_third) == 2, "supersede must not insert or delete rows"
    k1_after_third = next(c for c in cards_after_third if c["metadata"]["normalized_signal_key"] == "k1")
    k2_after_third = next(c for c in cards_after_third if c["metadata"]["normalized_signal_key"] == "k2")
    assert k1_after_third["current_status"] == "open"
    assert k1_after_third["title"] == "Permit slip v3"
    assert k2_after_third["current_status"] == "resolved", "dropped card must be superseded, not left active"


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
            "immediateAttention": [
                {
                    "title": "Approve revised site plan",
                    "detail": "Owner sign-off is needed before civil coordination can settle.",
                    "priority": "high",
                    "sourceIds": ["document_metadata:meeting-1"],
                }
            ],
            "currentFocus": [
                {
                    "title": "Site design revision",
                    "status": "Revision Required",
                    "owner": "Andrew",
                    "summary": "Parking redesign is underway after ownership rejected the prior layout.",
                    "nextDecision": "Approve revised layout",
                    "riskSeverity": "high",
                    "sourceIds": ["document_metadata:meeting-1"],
                }
            ],
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
    immediate_attention_card = next(card for card in cards if card["key"] == "operating-immediate-attention")
    recommended_actions_card = next(card for card in cards if card["key"] == "operating-recommended-actions")

    assert len(set(next_actions)) > 3
    assert "Escalate unresolved permit-blocking decisions." in next_actions
    assert "Resolve: Finalize second-floor private room configuration" in next_actions
    assert immediate_attention_card["nextAction"] == "Approve revised site plan"
    assert "Site design revision" in recommended_actions_card["summary"]


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
