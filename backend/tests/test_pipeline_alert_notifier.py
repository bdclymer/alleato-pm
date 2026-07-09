"""Tests for the outcome-based pipeline alert gate.

Guards the 2026-06-23 incident: a source failing every run must page, while a
degraded-but-partially-working source (warning runs) must NOT page.
"""

from datetime import datetime, timedelta, timezone

from src.services.health import pipeline_alert_notifier as notifier


class _Query:
    def __init__(self, rows):
        self._rows = rows

    def select(self, *_a, **_k):
        return self

    def gte(self, *_a, **_k):
        return self

    def order(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def execute(self):
        return type("R", (), {"data": self._rows})()


class _Client:
    def __init__(self, rows):
        self._rows = rows

    def from_(self, _table):
        return _Query(self._rows)


def _runs(now, specs):
    """specs: list of (source, status, minutes_ago)."""
    rows = []
    for source, status, mins in specs:
        started = (now - timedelta(minutes=mins)).isoformat()
        rows.append(
            {
                "source": source,
                "stage": "vectorization",
                "status": status,
                "items_failed": 25 if status == "failed" else 0,
                "started_at": started,
                "finished_at": started,
                "error_message": "25 graph documents failed embedding" if status == "failed" else None,
            }
        )
    return rows


def test_pages_on_total_failure(monkeypatch):
    now = datetime(2026, 6, 23, 22, 40, tzinfo=timezone.utc)
    rows = _runs(now, [("microsoft_graph", "failed", m) for m in (5, 10, 20, 30)])
    monkeypatch.setattr(notifier, "get_rag_read_client", lambda: _Client(rows))

    alerts = notifier.evaluate_pipeline_outcomes(now)
    assert len(alerts) == 1
    assert alerts[0]["source"] == "microsoft_graph"
    assert alerts[0]["failed"] == 4


def test_pages_graph_downstream_failures_as_their_own_lane(monkeypatch):
    now = datetime(2026, 7, 7, 4, 10, tzinfo=timezone.utc)
    rows = _runs(now, [
        ("microsoft_graph_source_sync", "succeeded", 30),
        ("microsoft_graph_source_sync", "succeeded", 20),
        ("microsoft_graph_downstream", "failed", 30),
        ("microsoft_graph_downstream", "failed", 20),
    ])
    monkeypatch.setattr(notifier, "get_rag_read_client", lambda: _Client(rows))

    alerts = notifier.evaluate_pipeline_outcomes(now)
    assert len(alerts) == 1
    assert alerts[0]["source"] == "microsoft_graph_downstream"
    assert alerts[0]["label"] == "Microsoft Graph downstream enrichment"
    assert alerts[0]["failed"] == 2


def test_no_page_when_partial_success_present(monkeypatch):
    now = datetime(2026, 6, 23, 22, 40, tzinfo=timezone.utc)
    # Fireflies: some failed runs but every run still synced something (warning).
    rows = _runs(now, [("fireflies", "warning", m) for m in (5, 20, 45)])
    monkeypatch.setattr(notifier, "get_rag_read_client", lambda: _Client(rows))

    assert notifier.evaluate_pipeline_outcomes(now) == []


def test_no_page_when_a_run_succeeded(monkeypatch):
    now = datetime(2026, 6, 23, 22, 40, tzinfo=timezone.utc)
    rows = _runs(now, [
        ("microsoft_graph", "failed", 30),
        ("microsoft_graph", "failed", 20),
        ("microsoft_graph", "succeeded", 5),  # recovered
    ])
    monkeypatch.setattr(notifier, "get_rag_read_client", lambda: _Client(rows))

    assert notifier.evaluate_pipeline_outcomes(now) == []


def test_single_failure_does_not_page(monkeypatch):
    now = datetime(2026, 6, 23, 22, 40, tzinfo=timezone.utc)
    rows = _runs(now, [("microsoft_graph", "failed", 5)])  # one blip, tolerated
    monkeypatch.setattr(notifier, "get_rag_read_client", lambda: _Client(rows))

    assert notifier.evaluate_pipeline_outcomes(now) == []


def test_project_intelligence_staleness_alert_fires_when_stale(monkeypatch):
    """A stale project_current_state must produce a page-worthy alert descriptor
    (issue #759 — silent 2-week staleness had no alert)."""
    monkeypatch.setattr(
        "src.services.health.project_intelligence_staleness_check.check_project_intelligence_staleness",
        lambda: {
            "healthy": False,
            "project_current_state_staleness_days": 15,
            "alerts": [
                {"table": "project_current_state", "message": "project_current_state narratives are stale: 15 days old"}
            ],
        },
    )
    alert = notifier._project_intelligence_staleness_alert()
    assert alert is not None
    assert alert["source"] == "project_intelligence_staleness"
    assert alert["failed"] == 15
    assert "15 days" in alert["reason"]


def test_project_intelligence_staleness_alert_silent_when_fresh(monkeypatch):
    monkeypatch.setattr(
        "src.services.health.project_intelligence_staleness_check.check_project_intelligence_staleness",
        lambda: {"healthy": True},
    )
    assert notifier._project_intelligence_staleness_alert() is None


def test_project_intelligence_staleness_alert_never_raises(monkeypatch):
    """Best-effort: a failing check must return None, never take down the notifier."""
    def _boom():
        raise RuntimeError("db down")

    monkeypatch.setattr(
        "src.services.health.project_intelligence_staleness_check.check_project_intelligence_staleness",
        _boom,
    )
    assert notifier._project_intelligence_staleness_alert() is None
