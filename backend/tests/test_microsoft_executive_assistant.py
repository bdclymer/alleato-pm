"""Tests for the Microsoft Executive Assistant Deep Agents endpoint."""

from __future__ import annotations

from typing import Any

from src.services.agents.microsoft_executive_assistant import (
    MicrosoftExecutiveAssistantRequest,
    run_microsoft_executive_assistant,
)
from src.services.agents.microsoft_executive_assistant.tools import read_live_outlook_inbox
from src.services.agents.microsoft_executive_assistant.triggers import (
    run_outlook_event_microsoft_executive_assistant,
    run_scheduled_microsoft_executive_assistant_check,
)


def _override_auth(app, path="/api/intelligence/microsoft-executive-assistant"):
    for route in app.routes:
        if getattr(route, "path", None) == path:
            for dependency in getattr(route, "dependant", None).dependencies:
                if dependency.name == "_":
                    app.dependency_overrides[dependency.call] = lambda: None
            return
    raise AssertionError(f"Microsoft assistant route was not registered: {path}")


def _clear_auth(app, path="/api/intelligence/microsoft-executive-assistant"):
    for route in app.routes:
        if getattr(route, "path", None) == path:
            for dependency in getattr(route, "dependant", None).dependencies:
                if dependency.name == "_":
                    app.dependency_overrides.pop(dependency.call, None)


def _route_endpoint(app, path="/api/intelligence/microsoft-executive-assistant"):
    for route in app.routes:
        if getattr(route, "path", None) == path:
            return route.endpoint
    raise AssertionError(f"Microsoft assistant route was not registered: {path}")


class _FakeAgent:
    def __init__(self, captured: dict[str, Any]):
        self.captured = captured

    def invoke(self, payload: dict[str, Any], config: dict[str, Any] | None = None):
        self.captured["payload"] = payload
        self.captured["config"] = config
        return {
            "messages": [
                {
                    "type": "tool",
                    "name": "read_live_outlook_inbox",
                    "content": (
                        '{"ok":true,"source":"microsoft_graph_live",'
                        '"mailbox_user_id":"megan@alleatogroup.com","count":1}'
                    ),
                },
                {
                    "content": (
                        "I checked Outlook context and prepared this draft for review.\n\n"
                        '{"action":"preview","type":"outlook_email_draft","approvalReason":"External communication requires Megan review."}'
                    )
                }
            ]
        }


def test_run_microsoft_assistant_uses_deep_agents_tools_memory_and_skills():
    captured: dict[str, Any] = {}

    def fake_create_agent(**kwargs):
        captured.update(kwargs)
        return _FakeAgent(captured)

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            sessionId="session-1",
            mailboxUserId="megan@alleatogroup.com",
            projectId=983,
            prompt="Triage today's urgent inbox items and draft replies.",
        ),
        create_agent=fake_create_agent,
    )

    assert response.mode == "deep_agents"
    assert response.orchestrator == "microsoft-executive-assistant"
    assert "email-drafting" in response.skills_loaded
    assert "inbox-triage" in response.skills_loaded
    assert response.tool_trace[0].tool == "read_live_outlook_inbox"
    assert response.tool_trace[0].source == "microsoft_graph_live"
    assert response.actions[0].action_type == "email_draft"
    assert captured["name"] == "microsoft-executive-assistant"
    assert any(
        getattr(tool, "name", getattr(tool, "__name__", "")) == "read_live_outlook_inbox"
        for tool in captured["tools"]
    )
    assert captured["memory"]
    assert captured["skills"]
    assert "microsoft_executive_assistant/runtime/AGENTS.md" in captured["memory"][0]
    assert "alleato-ai/skills" not in captured["memory"][0]
    assert "microsoft_executive_assistant/runtime/skills" in captured["skills"][0]
    assert "alleato-ai/skills" not in captured["skills"][0]
    assert captured["config"]["configurable"]["thread_id"] == "session-1"
    assert captured["config"]["configurable"]["mailbox_user_id"] == "megan@alleatogroup.com"
    prompt = captured["payload"]["messages"][0]["content"]
    assert "Microsoft operator request" in prompt
    assert "Draft email or Teams payloads for review only" in prompt
    assert "Project ID supplied by caller: 983" in prompt


def test_run_microsoft_assistant_fails_loudly_without_provider(monkeypatch):
    monkeypatch.delenv("AI_GATEWAY_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(userId="user-1", prompt="Check email")
    )

    assert response.mode == "unavailable"
    assert response.tool_trace[0].status == "failed"
    assert "AI_GATEWAY_API_KEY or OPENAI_API_KEY" in response.answer
    assert response.actions[0].action_type == "blocked"


def test_run_microsoft_assistant_fails_loudly_on_empty_runtime_response():
    class EmptyAgent:
        def invoke(self, *_args, **_kwargs):
            return {"messages": [{"content": ""}]}

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(userId="user-1", prompt="Check email"),
        create_agent=lambda **_kwargs: EmptyAgent(),
    )

    assert response.mode == "unavailable"
    assert response.tool_trace[0].status == "failed"
    assert "empty response" in response.answer


def test_live_inbox_tool_reports_graph_configuration_failure(monkeypatch):
    class FakeGraph:
        def is_configured(self):
            return False

    monkeypatch.setattr(
        "src.services.integrations.microsoft_graph.live_mail.get_graph_client",
        lambda: FakeGraph(),
    )

    result = read_live_outlook_inbox("megan@alleatogroup.com", None, 5)

    assert "OUTLOOK_LIVE_INBOX_FAILED" in result
    assert "Microsoft Graph credentials" in result


def test_microsoft_assistant_route_is_feature_gated(client, monkeypatch):
    _override_auth(client.app)
    monkeypatch.setenv("DEEP_AGENTS_MICROSOFT_EXECUTIVE_ASSISTANT_ENABLED", "false")
    try:
        response = client.post(
            "/api/intelligence/microsoft-executive-assistant",
            json={"userId": "user-1", "prompt": "Check email"},
        )
    finally:
        _clear_auth(client.app)

    assert response.status_code == 503
    assert "DEEP_AGENTS_MICROSOFT_EXECUTIVE_ASSISTANT_ENABLED=true" in response.json()["detail"]


def test_microsoft_assistant_route_returns_payload(client, monkeypatch):
    _override_auth(client.app)
    monkeypatch.setenv("DEEP_AGENTS_MICROSOFT_EXECUTIVE_ASSISTANT_ENABLED", "true")

    def fake_run(request, *, model):
        assert request.prompt == "Check email"
        assert model == "openai:gpt-5.4-mini"
        return run_microsoft_executive_assistant(
            request,
            create_agent=lambda **kwargs: _FakeAgent({}),
            model=model,
        )

    monkeypatch.setitem(_route_endpoint(client.app).__globals__, "run_microsoft_executive_assistant", fake_run)
    try:
        response = client.post(
            "/api/intelligence/microsoft-executive-assistant",
            json={"userId": "user-1", "sessionId": "session-1", "prompt": "Check email"},
        )
    finally:
        _clear_auth(client.app)

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "deep_agents"
    assert body["toolTrace"][0]["status"] == "success"


def test_scheduled_trigger_is_feature_gated(monkeypatch):
    monkeypatch.setenv("MICROSOFT_EXECUTIVE_ASSISTANT_SCHEDULED_ENABLED", "false")

    result = run_scheduled_microsoft_executive_assistant_check()

    assert result["status"] == "skipped"
    assert "SCHEDULED_ENABLED" in result["reason"]


def test_scheduled_trigger_runs_specialist_when_enabled(monkeypatch):
    captured: dict[str, Any] = {}
    monkeypatch.setenv("MICROSOFT_EXECUTIVE_ASSISTANT_SCHEDULED_ENABLED", "true")
    monkeypatch.setenv("MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX", "megan@alleatogroup.com")

    def fake_runner(request, *, model):
        captured["request"] = request
        captured["model"] = model
        return run_microsoft_executive_assistant(
            request,
            create_agent=lambda **kwargs: _FakeAgent({}),
            model=model,
        )

    result = run_scheduled_microsoft_executive_assistant_check(runner=fake_runner)

    assert result["status"] == "completed"
    assert captured["request"].trigger == "scheduled_check"
    assert captured["request"].mailbox_user_id == "megan@alleatogroup.com"


def test_outlook_event_trigger_runs_after_webhook_when_enabled(monkeypatch):
    captured: dict[str, Any] = {}
    monkeypatch.setenv("MICROSOFT_EXECUTIVE_ASSISTANT_WEBHOOK_ENABLED", "true")

    def fake_runner(request, *, model):
        captured["request"] = request
        captured["model"] = model
        return run_microsoft_executive_assistant(
            request,
            create_agent=lambda **kwargs: _FakeAgent({}),
            model=model,
        )

    result = run_outlook_event_microsoft_executive_assistant(
        sync_result={"mailbox": "megan@alleatogroup.com", "message_id": "abc123"},
        runner=fake_runner,
    )

    assert result["status"] == "completed"
    assert result["messageId"] == "abc123"
    assert captured["request"].trigger == "outlook_event"
    assert captured["request"].mailbox_user_id == "megan@alleatogroup.com"
