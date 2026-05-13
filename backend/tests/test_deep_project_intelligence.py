import sys

import pytest

from src.services.agents.deep_project_intelligence import (
    REQUIRED_SOURCE_TYPES,
    build_project_status_contract_spike,
)
from src.services.agents.deep_project_intelligence_contracts import (
    DeepProjectIntelligenceRequest,
)
class _Store:
    def __init__(self, project=None, client=None):
        self.project = project
        self._client = client

    def get_project(self, project_id):
        if self.project and self.project.get("id") == project_id:
            return self.project
        return None


class _Result:
    def __init__(self, data):
        self.data = data


class _TableQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.rows = list(db.tables.get(table_name, []))
        self.limit_count = None

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.rows = [row for row in self.rows if row.get(key) == value]
        return self

    def in_(self, key, values):
        allowed = set(values)
        self.rows = [row for row in self.rows if row.get(key) in allowed]
        return self

    def order(self, key, desc=False):
        self.rows = sorted(self.rows, key=lambda row: row.get(key) or "", reverse=desc)
        return self

    def limit(self, count):
        self.limit_count = count
        return self

    def execute(self):
        rows = self.rows[: self.limit_count] if self.limit_count is not None else self.rows
        return _Result([dict(row) for row in rows])


class _FakeSupabase:
    def __init__(self, tables):
        self.tables = tables

    def table(self, table_name):
        return _TableQuery(self, table_name)


def _request():
    return DeepProjectIntelligenceRequest(
        userId="user-1",
        projectId=43,
        sessionId="session-1",
        question="What is the current risk/status on this project?",
    )


def _override_deep_agent_auth(app):
    """Override the admin dependency even when test conftest imports it as a mock."""
    for route in app.routes:
        if getattr(route, "path", None) == "/api/intelligence/deep-agent/project-status":
            for dependency in getattr(route, "dependant", None).dependencies:
                if dependency.name == "_":
                    app.dependency_overrides[dependency.call] = lambda: None
            return
    raise AssertionError("Deep Agents project-status route was not registered")


def _clear_overrides(app):
    for route in app.routes:
        if getattr(route, "path", None) == "/api/intelligence/deep-agent/project-status":
            for dependency in getattr(route, "dependant", None).dependencies:
                if dependency.name == "_":
                    app.dependency_overrides.pop(dependency.call, None)


def test_contract_spike_returns_explicit_missing_source_coverage():
    response = build_project_status_contract_spike(
        _request(),
        _Store({"id": 43, "name": "Westfield Collective"}),
    )

    assert response.mode == "contract_spike"
    assert response.project.name == "Westfield Collective"
    assert response.confidence == "low"
    assert response.evidence == []
    assert [source.source_type for source in response.sources_checked] == list(REQUIRED_SOURCE_TYPES)
    assert all(source.status == "missing" for source in response.sources_checked)
    assert all(source.record_count == 0 for source in response.sources_checked)
    assert response.tool_trace[0].status == "success"
    assert response.tool_trace[1].tool == "source_client"
    assert response.tool_trace[1].status == "skipped"


def test_contract_spike_reads_source_coverage_without_synthesis():
    client = _FakeSupabase(
        {
            "intelligence_targets": [
                {"id": "target-1", "project_id": 43, "updated_at": "2026-05-10T00:00:00Z"}
            ],
            "intelligence_packets": [
                {
                    "id": "packet-1",
                    "target_id": "target-1",
                    "packet_type": "project_status",
                    "executive_summary": "Packet says owner decisions are pending.",
                    "generated_at": "2026-05-11T00:00:00Z",
                }
            ],
            "document_metadata": [
                {
                    "id": "teams-1",
                    "project_id": 43,
                    "source_system": "teams",
                    "title": "Teams decision thread",
                    "overview": "Teams discussion found a schedule concern.",
                    "source_last_modified_at": "2026-05-12T00:00:00Z",
                },
                {
                    "id": "meeting-1",
                    "project_id": 43,
                    "source": "fireflies",
                    "title": "Owner meeting",
                    "summary": "Meeting covered budget exposure.",
                    "date": "2026-05-09T00:00:00Z",
                },
            ],
            "project_emails": [
                {
                    "id": 1,
                    "project_id": 43,
                    "subject": "Submittal follow-up",
                    "body_text": "Owner needs an answer.",
                    "received_at": "2026-05-08T00:00:00Z",
                }
            ],
            "project_documents": [
                {
                    "id": 2,
                    "project_id": 43,
                    "title": "Contract drawing",
                    "source_last_modified_at": "2026-05-07T00:00:00Z",
                }
            ],
            "acumatica_project_budgets": [
                {
                    "id": 3,
                    "project_id": 43,
                    "description": "Concrete budget",
                    "updated_at": "2026-05-06T00:00:00Z",
                }
            ],
            "schedule_tasks": [
                {
                    "id": "schedule-1",
                    "project_id": 43,
                    "name": "Milestone",
                    "finish_date": "2026-05-20T00:00:00Z",
                }
            ],
            "rfis": [
                {
                    "id": "rfi-1",
                    "project_id": 43,
                    "subject": "RFI 1",
                    "updated_at": "2026-05-05T00:00:00Z",
                }
            ],
            "submittals": [
                {
                    "id": "submittal-1",
                    "project_id": 43,
                    "title": "Submittal 1",
                    "updated_at": "2026-05-04T00:00:00Z",
                }
            ],
        }
    )

    response = build_project_status_contract_spike(
        _request(),
        _Store({"id": 43, "name": "Westfield Collective"}, client=client),
    )

    assert response.confidence == "medium"
    assert all(source.status == "checked" for source in response.sources_checked)
    assert [source.source_type for source in response.sources_checked] == list(REQUIRED_SOURCE_TYPES)
    assert len(response.evidence) >= 8
    assert response.evidence[0].source_type == "packet"
    assert response.tool_trace[1].tool == "packet_reader"
    assert response.tool_trace[-1].tool == "submittal_reader"
    assert response.recommended_actions[0].label == "Add Deep Agents synthesis on top of checked sources"


def test_deep_agents_runtime_can_synthesize_behind_contract():
    class _Agent:
        def invoke(self, payload):
            assert "messages" in payload
            return {"messages": [{"role": "assistant", "content": "Runtime synthesis from Deep Agents."}]}

    def create_agent(**kwargs):
        assert kwargs["model"] == "openai:gpt-5.4-mini"
        assert kwargs["tools"]
        assert "system_prompt" in kwargs
        return _Agent()

    response = build_project_status_contract_spike(
        _request(),
        _Store(
            {"id": 43, "name": "Westfield Collective"},
            client=_FakeSupabase({"intelligence_targets": []}),
        ),
        runtime="deep_agents",
        create_agent=create_agent,
    )

    assert response.mode == "deep_agents"
    assert response.answer == "Runtime synthesis from Deep Agents."
    assert response.tool_trace[-1].tool == "deepagents_runtime"
    assert response.tool_trace[-1].status == "success"


def test_deep_agents_runtime_invokes_installed_graph_with_bindable_model(monkeypatch):
    for module_name in list(sys.modules):
        if module_name == "langchain" or module_name.startswith("langchain."):
            monkeypatch.delitem(sys.modules, module_name, raising=False)

    deepagents = pytest.importorskip("deepagents")
    fake_chat_models = pytest.importorskip("langchain_core.language_models.fake_chat_models")

    class _BindableFakeChatModel(fake_chat_models.FakeListChatModel):
        def bind_tools(self, tools, *, tool_choice=None, **kwargs):
            assert tools
            return self

    response = build_project_status_contract_spike(
        _request(),
        _Store(
            {"id": 43, "name": "Westfield Collective"},
            client=_FakeSupabase(
                {
                    "intelligence_targets": [
                        {
                            "id": "target-1",
                            "project_id": 43,
                            "updated_at": "2026-05-10T00:00:00Z",
                        }
                    ],
                    "intelligence_packets": [
                        {
                            "id": "packet-1",
                            "target_id": "target-1",
                            "packet_type": "project_status",
                            "executive_summary": "Packet says owner decisions are pending.",
                            "generated_at": "2026-05-11T00:00:00Z",
                        }
                    ],
                }
            ),
        ),
        runtime="deep_agents",
        create_agent=deepagents.create_deep_agent,
        model=_BindableFakeChatModel(
            responses=[
                "Installed Deep Agents graph synthesized checked packet coverage."
            ]
        ),
    )

    assert response.mode == "deep_agents"
    assert response.answer == "Installed Deep Agents graph synthesized checked packet coverage."
    assert response.tool_trace[-1].tool == "deepagents_runtime"
    assert response.tool_trace[-1].status == "success"


def test_deep_agents_runtime_failure_falls_back_to_contract_answer():
    def create_agent(**_kwargs):
        raise RuntimeError("deepagents unavailable")

    response = build_project_status_contract_spike(
        _request(),
        _Store(
            {"id": 43, "name": "Westfield Collective"},
            client=_FakeSupabase({"intelligence_targets": []}),
        ),
        runtime="deep_agents",
        create_agent=create_agent,
    )

    assert response.mode == "contract_spike"
    assert "checked 0 source categories" in response.answer
    assert response.tool_trace[-1].tool == "deepagents_runtime"
    assert response.tool_trace[-1].status == "failed"
    assert "deepagents unavailable" in response.tool_trace[-1].detail


def test_contract_spike_fails_loudly_when_project_is_missing():
    response = build_project_status_contract_spike(_request(), _Store())

    assert response.confidence == "low"
    assert response.sources_checked[0].source_type == "project"
    assert response.sources_checked[0].status == "failed"
    assert "could not resolve project 43" in response.answer
    assert response.tool_trace[0].tool == "project_lookup"
    assert response.tool_trace[0].status == "failed"


def test_deep_agent_endpoint_is_feature_gated(client, mock_supabase_store, monkeypatch):
    monkeypatch.delenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED", raising=False)
    mock_supabase_store._client = None
    _override_deep_agent_auth(client.app)

    try:
        response = client.post(
            "/api/intelligence/deep-agent/project-status",
            json={
                "userId": "user-1",
                "projectId": 43,
                "sessionId": "session-1",
                "question": "What is the current risk/status on this project?",
            },
        )
    finally:
        _clear_overrides(client.app)

    assert response.status_code == 503
    assert "DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=true" in response.json()["detail"]
    mock_supabase_store.get_project.assert_not_called()


def test_deep_agent_endpoint_returns_contract_packet(client, mock_supabase_store, monkeypatch):
    monkeypatch.setenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED", "true")
    mock_supabase_store.get_project.return_value = {"id": 43, "name": "Westfield Collective"}
    mock_supabase_store._client = None
    _override_deep_agent_auth(client.app)

    try:
        response = client.post(
            "/api/intelligence/deep-agent/project-status",
            json={
                "userId": "user-1",
                "projectId": 43,
                "sessionId": "session-1",
                "question": "What is the current risk/status on this project?",
            },
        )
    finally:
        _clear_overrides(client.app)

    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "contract_spike"
    assert data["project"] == {"id": 43, "name": "Westfield Collective"}
    assert data["confidence"] == "low"
    assert data["sourcesChecked"][0]["sourceType"] == "packet"
    assert data["sourcesChecked"][0]["status"] == "missing"
    assert data["toolTrace"][0]["tool"] == "project_lookup"
    assert data["recommendedActions"][0]["ownerRole"] == "AI/backend"


def test_deep_agent_endpoint_returns_404_for_missing_project(client, mock_supabase_store, monkeypatch):
    monkeypatch.setenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED", "true")
    mock_supabase_store.get_project.return_value = None
    mock_supabase_store._client = None
    _override_deep_agent_auth(client.app)

    try:
        response = client.post(
            "/api/intelligence/deep-agent/project-status",
            json={
                "userId": "user-1",
                "projectId": 43,
                "question": "What is the current risk/status on this project?",
            },
        )
    finally:
        _clear_overrides(client.app)

    assert response.status_code == 404
    assert "could not resolve project 43" in response.json()["detail"]
