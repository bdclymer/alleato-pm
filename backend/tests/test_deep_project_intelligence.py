from src.services.agents.deep_project_intelligence import (
    REQUIRED_SOURCE_TYPES,
    build_project_status_contract_spike,
)
from src.services.agents.deep_project_intelligence_contracts import (
    DeepProjectIntelligenceRequest,
)
class _Store:
    def __init__(self, project=None):
        self.project = project

    def get_project(self, project_id):
        if self.project and self.project.get("id") == project_id:
            return self.project
        return None


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
    assert response.tool_trace[1].status == "skipped"


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
