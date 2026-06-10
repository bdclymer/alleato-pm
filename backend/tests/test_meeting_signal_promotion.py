"""Tests for routing meeting-extracted decisions/risks/opportunities into the
packet-first intelligence layer (insight_cards) via the candidate -> promotion path.
"""

from src.services.intelligence import compiler
from src.services.pipeline import extractor
from src.services.pipeline.models import (
    DecisionItem,
    OpportunityItem,
    RiskItem,
    StructuredData,
)


def test_meeting_signal_confidence_promotes_only_rich_items():
    rich = extractor._meeting_signal_confidence(
        "Permit package likely slips four to six weeks", "fire marshal rejected twice"
    )
    thin = extractor._meeting_signal_confidence("short", None)
    assert rich >= 0.85, "well-formed items should clear the promotion bar"
    assert thin < 0.85, "thin items should stay in the review queue"


def test_build_meeting_signal_payloads_maps_types_within_allowed_card_types():
    structured = StructuredData(
        decisions=[
            DecisionItem(
                description="Approve the revised site plan layout for parking",
                rationale="Owner rejected the prior layout",
            )
        ],
        risks=[
            RiskItem(
                description="Permit package likely slips four to six weeks",
                category="schedule",
                impact="June permit target at risk",
            ),
            RiskItem(
                description="Steel cost escalation threatens the budget line",
                category="cost",
                impact="Budget overrun",
            ),
            RiskItem(description="Vendor coordination gap on submittals", category="coordination"),
        ],
        opportunities=[
            OpportunityItem(
                description="Value-engineer the mechanical scope to recover budget",
                type="cost_savings",
            )
        ],
    )

    payloads = extractor._build_meeting_signal_payloads(structured)

    assert [p["signal_type"] for p in payloads] == [
        "decision",
        "schedule_risk",
        "financial_exposure",
        "risk",
        "initiative_signal",
    ]
    for payload in payloads:
        # card_type is constrained by a DB CHECK mirroring INSIGHT_CARD_TYPES.
        assert payload["signal_type"] in compiler.INSIGHT_CARD_TYPES
        assert payload["normalized_signal_key"]
        assert 0.0 <= payload["confidence_score"] <= 1.0


def test_promote_meeting_signals_skips_without_project():
    structured = StructuredData(decisions=[DecisionItem(description="x" * 50)])
    result = extractor._promote_meeting_signals(object(), "meeting-1", None, None, structured)
    assert result["signals_written"] == 0
    assert result["skipped_reason"] == "no project attribution"


class _FakeRagChain:
    def __init__(self, recorder):
        self._recorder = recorder
        self._op = None
        self._eqs = []

    def table(self, name):
        self._table = name
        self._op = None
        self._eqs = []
        return self

    def delete(self):
        self._op = "delete"
        return self

    def eq(self, field, value):
        self._eqs.append((field, value))
        return self

    def execute(self):
        if self._op == "delete":
            self._recorder["deleted"].append(dict(self._eqs))
        return type("Resp", (), {"data": []})()


def test_promote_meeting_signals_writes_clears_prior_and_promotes_high_confidence(monkeypatch):
    recorder = {"deleted": [], "candidates": [], "promoted": []}

    monkeypatch.setattr(extractor, "get_rag_write_client", lambda: _FakeRagChain(recorder))
    monkeypatch.setattr(
        compiler, "ensure_client_project_target", lambda client, pid, **_: {"id": f"target-{pid}"}
    )

    def _fake_write_candidate(client, **kwargs):
        candidate_id = f"cand-{len(recorder['candidates'])}"
        recorder["candidates"].append(kwargs)
        status = "candidate" if kwargs["confidence_score"] >= 0.85 else "needs_review"
        return {"id": candidate_id, "status": status}

    def _fake_promote(client, candidate_id, **_):
        recorder["promoted"].append(candidate_id)
        return {"status": "promoted", "insight_card_id": f"card-{candidate_id}"}

    monkeypatch.setattr(compiler, "write_source_signal_candidate", _fake_write_candidate)
    monkeypatch.setattr(compiler, "promote_signal_candidate", _fake_promote)

    structured = StructuredData(
        decisions=[
            DecisionItem(
                description="Approve the revised parking layout before civil coordination",
                rationale="Owner rejected the prior layout",
            )
        ],
        risks=[RiskItem(description="ok", category="schedule")],  # thin -> needs_review
    )

    result = extractor._promote_meeting_signals(
        object(), "meeting-1", 42, "2026-06-09T00:00:00Z", structured
    )

    assert result["target_id"] == "target-42"
    # Idempotency: prior candidates for this meeting + compiler version are cleared first.
    assert recorder["deleted"] == [
        {
            "source_document_id": "meeting-1",
            "compiler_version": extractor.MEETING_PACKET_COMPILER_VERSION,
        }
    ]
    assert result["signals_written"] == 2
    # Only the rich decision clears the 0.85 bar; the thin risk stays needs_review.
    assert result["signals_promoted"] == 1
    assert len(recorder["promoted"]) == 1
