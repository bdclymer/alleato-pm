"""Tests for routing meeting-extracted decisions/risks/opportunities into the
packet-first intelligence layer (insight_cards) via the candidate -> promotion path.
"""

from src.services.intelligence import client as intelligence_client
from src.services.intelligence import compiler
from src.services.ops.db_pressure_guard import AppDbProjectionError
from src.services.pipeline import extractor, llm
from src.services.pipeline.models import (
    DecisionItem,
    InsightItem,
    OpportunityItem,
    RiskItem,
    StructuredData,
    TaskItem,
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


# ---------------------------------------------------------------------------
# Deep extraction (Part B/C/D) — full-transcript, evidence-linked, calibrated
# ---------------------------------------------------------------------------

def test_build_meeting_signal_payloads_prefers_deep_confidence_and_evidence():
    """Deep items drive the gate with calibrated confidence, surface the
    evidence quote as the card excerpt, and resolve via status_hint."""
    structured = StructuredData(
        risks=[
            RiskItem(
                description="Permit may slip causing a two-week delay to the slab pour",
                category="schedule",
                impact="high",
                evidence_quote="the permit is stuck at the city plan-check desk",
                confidence=0.92,
                status_hint="resolved",
            )
        ],
        insights=[
            InsightItem(
                description="Owner still undecided on the finish package",
                category="open_question",
                evidence_quote="we have not picked finishes yet",
                confidence=0.55,
                status_hint="new",
            )
        ],
    )

    payloads = extractor._build_meeting_signal_payloads(structured)
    by_type = {p["signal_type"]: p for p in payloads}

    risk = by_type["schedule_risk"]
    assert risk["confidence_score"] == 0.92  # calibrated, not heuristic
    assert risk["current_status"] == "resolved"  # status_hint -> supersede/close
    assert risk["excerpt"] == "the permit is stuck at the city plan-check desk"
    assert risk["extraction_json"]["status_hint"] == "resolved"

    insight = by_type["open_question"]
    assert insight["signal_type"] in compiler.INSIGHT_CARD_TYPES
    assert insight["confidence_score"] == 0.55  # below 0.85 -> stays needs_review
    assert insight["excerpt"] == "we have not picked finishes yet"


def test_extract_deep_meeting_intelligence_parses_evidence_confidence_status(monkeypatch):
    """The deep pass maps the model's structured output onto typed items with
    evidence_quote, clamped confidence, and a validated status_hint."""
    fake_output = {
        "what_changed": "Permit is now approved; finishes still open.",
        "decisions": [
            {
                "description": "Proceed with slab pour next week",
                "rationale": "permit cleared",
                "owner": "Sam",
                "evidence_quote": "let's pour the slab Tuesday",
                "confidence": 1.4,  # out of range -> clamped to 1.0
                "status_hint": "new",
            }
        ],
        "risks": [
            {
                "description": "Finish selection delay risks the punchlist date",
                "category": "schedule",
                "impact": "high",
                "evidence_quote": "finishes are holding us up",
                "confidence": "not-a-number",  # invalid -> default
                "status_hint": "bogus",  # invalid -> None
            }
        ],
        "tasks": [
            {
                "description": "Send the finish schedule to the owner",
                "assignee": "Sam",
                "dueDate": "2026-06-15",
                "priority": "high",
                "evidence_quote": "Sam will send the finish schedule",
                "confidence": 0.9,
                "status_hint": "new",
            }
        ],
    }
    monkeypatch.setattr(
        intelligence_client, "extract_with_retry", lambda messages, model=None, **_: dict(fake_output)
    )

    result = llm.extract_deep_meeting_intelligence(
        title="Weekly OAC",
        date="2026-06-10",
        participants=["Sam"],
        full_transcript="... long transcript ...",
        project_state="Currently tracked OPEN TASKS:\n- [high] Pull permit (Sam)",
        prior_context="",
        speaker_email_map={"Sam": "sam@alleatogroup.com"},
    )

    assert result.what_changed.startswith("Permit is now approved")
    decision = result.decisions[0]
    assert decision.confidence == 1.0  # clamped
    assert decision.evidence_quote == "let's pour the slab Tuesday"
    assert decision.status_hint == "new"

    risk = result.risks[0]
    assert risk.confidence == 0.6  # invalid -> default
    assert risk.status_hint is None  # invalid -> dropped

    task = result.tasks[0]
    assert task.confidence == 0.9
    assert task.evidence_quote == "Sam will send the finish schedule"
    assert task.assignee_email == "sam@alleatogroup.com"  # resolved from map


def test_extract_with_retry_omits_temperature_for_gpt5_family():
    """Guardrail: gpt-5 / o-series reject a non-default temperature with a 400 that
    extract_with_retry would otherwise swallow into a silent _extraction_failed.
    For those models the temperature kwarg must be omitted entirely."""
    assert intelligence_client._supports_custom_temperature("gpt-4o-mini") is True
    assert intelligence_client._supports_custom_temperature("gpt-5.5") is False
    assert intelligence_client._supports_custom_temperature("openai/gpt-5.5") is False
    assert intelligence_client._supports_custom_temperature("o3-mini") is False

    captured = {}

    class _FakeCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            msg = type("M", (), {"content": '{"ok": true}'})()
            return type("R", (), {"choices": [type("C", (), {"message": msg})()]})()

    class _FakeClient:
        chat = type("Chat", (), {"completions": _FakeCompletions()})()

    import src.services.intelligence.client as _ic
    orig = _ic._client
    _ic._client = lambda: _FakeClient()
    try:
        _ic.extract_with_retry([{"role": "user", "content": "x"}], model="gpt-5.5")
        assert "temperature" not in captured, "must not send temperature to gpt-5.5"
        captured.clear()
        _ic.extract_with_retry([{"role": "user", "content": "x"}], model="gpt-4o-mini")
        assert "temperature" in captured, "should send temperature to models that support it"
    finally:
        _ic._client = orig


def test_extract_deep_meeting_intelligence_returns_empty_on_failure(monkeypatch):
    monkeypatch.setattr(
        intelligence_client,
        "extract_with_retry",
        lambda messages, model=None, **_: {"_extraction_failed": True, "_errors": ["boom"]},
    )
    result = llm.extract_deep_meeting_intelligence(
        title="t", date=None, participants=[], full_transcript="x", project_state=""
    )
    assert result.decisions == [] and result.risks == [] and result.tasks == []


def test_merge_deep_and_rewriter_tasks_dedupes_overlap():
    deep = [TaskItem(description="Send the finish schedule to the owner", confidence=0.9)]
    rewriter = [
        TaskItem(description="Send finish schedule to owner for sign-off"),  # overlaps deep
        TaskItem(description="Order the long-lead switchgear from the vendor"),  # unique
    ]
    merged = extractor._merge_deep_and_rewriter_tasks(deep, rewriter)
    descriptions = [t.description for t in merged]
    assert "Order the long-lead switchgear from the vendor" in descriptions
    assert len(merged) == 2  # deep task kept, overlapping rewriter task dropped


class _FakeTaskTable:
    """Minimal Supabase table stub capturing the upserted task row."""

    def __init__(self, recorder):
        self._recorder = recorder

    def upsert(self, data, on_conflict=None):
        self._recorder["upserted"].append(data)
        return self

    def execute(self):
        return type("Resp", (), {"data": []})()


class _FakeTaskClient:
    def __init__(self, recorder):
        self._recorder = recorder

    def table(self, name):
        return _FakeTaskTable(self._recorder)


def _patch_employee_resolver(monkeypatch):
    from src.services import task_assignees

    resolved = task_assignees.ResolvedAssignee(
        person_id="p1", name="Sam", email="sam@alleatogroup.com",
        method="exact", confidence=0.99, person_type="employee",
    )
    monkeypatch.setattr(
        extractor, "TaskAssigneeResolver", lambda client: type("R", (), {"resolve": lambda self, n, e: resolved})()
    )


def test_upsert_task_low_confidence_deep_task_flagged_needs_review(monkeypatch):
    _patch_employee_resolver(monkeypatch)
    recorder = {"upserted": []}
    client = _FakeTaskClient(recorder)

    low = TaskItem(
        description="Maybe look into the elevator lead time at some point",
        assignee="Sam", confidence=0.4, evidence_quote="someone should check the elevator",
        status_hint="new",
    )
    extractor._upsert_task(client, low, "meeting-1", [42], 42)

    row = recorder["upserted"][0]
    assert row["status"] == "open"  # tasks table CHECK has no needs_review status
    assert row["extraction_source"] == "deep_extractor"
    assert row["extraction_model"] == "gpt-5.5"
    # tasks-quality trigger (migration 20260528000000) rejects AI tasks with a
    # null/empty extraction_prompt_version — deep tasks must set it.
    assert row["extraction_prompt_version"] == extractor.DEEP_EXTRACTION_PROMPT_VERSION
    assert row["title"]  # trigger also requires a non-empty title
    assert row["extraction_metadata"]["needs_review"] is True
    assert row["extraction_metadata"]["deep_confidence"] == 0.4
    assert row["extraction_metadata"]["evidence_quote"] == "someone should check the elevator"


def test_upsert_task_high_confidence_deep_task_auto_created(monkeypatch):
    _patch_employee_resolver(monkeypatch)
    recorder = {"upserted": []}
    client = _FakeTaskClient(recorder)

    high = TaskItem(
        description="Send the stamped permit set to the GC by Friday",
        assignee="Sam", confidence=0.95, evidence_quote="Sam, send the permit set Friday",
    )
    extractor._upsert_task(client, high, "meeting-1", [42], 42)

    row = recorder["upserted"][0]
    assert row["status"] == "open"
    assert row["extraction_source"] == "deep_extractor"
    assert row["extraction_prompt_version"] == extractor.DEEP_EXTRACTION_PROMPT_VERSION
    assert "needs_review" not in row["extraction_metadata"]
    assert row["extraction_metadata"]["deep_confidence"] == 0.95


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


def test_safe_promote_meeting_signals_treats_pm_projection_guard_as_non_blocking(monkeypatch):
    def _blocked(*_args, **_kwargs):
        raise AppDbProjectionError(
            "Blocked intelligence_promote_signal_candidate: final projection disabled"
        )

    monkeypatch.setattr(extractor, "_promote_meeting_signals", _blocked)

    result = extractor._safe_promote_meeting_signals(
        object(),
        "meeting-1",
        42,
        "2026-06-09T00:00:00Z",
        StructuredData(decisions=[DecisionItem(description="Approve the revised plan")]),
    )

    assert result["signals_written"] == 0
    assert result["signals_promoted"] == 0
    assert result["projection_status"] == "blocked"
    assert "final projection disabled" in result["projection_error"]
