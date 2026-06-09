"""Tests for the Microsoft Executive Assistant Deep Agents endpoint."""

from __future__ import annotations

from typing import Any

from src.services.agents.microsoft_executive_assistant import (
    MicrosoftExecutiveAssistantRequest,
    run_microsoft_executive_assistant,
)
from src.services.agents.microsoft_executive_assistant.agent import _inbox_request_kind, _microsoft_prompt
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


def test_microsoft_prompt_uses_mailbox_owner_not_megan_for_brandon_inbox():
    prompt = _microsoft_prompt(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            mailboxUserId="bclymer@alleatogroup.com",
            prompt="Can you tell me my last five emails?",
        )
    )

    assert "work for Brandon" in prompt
    assert "recommended next steps for Brandon" in prompt
    assert "Do not introduce Megan unless the prompt explicitly asks about Megan" in prompt
    assert "return exactly five emails in newest-first order" in prompt


def test_microsoft_prompt_adds_triage_guardrails_for_urgent_inbox_questions():
    prompt = _microsoft_prompt(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            mailboxUserId="bclymer@alleatogroup.com",
            prompt="Anything urgent in my inbox?",
        )
    )

    assert "confirmed urgent/action-needed" in prompt
    assert "important but not urgent" in prompt
    assert "Treat security notices, payment reminders, and admin notifications conservatively" in prompt
    assert "Do not propose a draft email or Teams escalation unless the user asked" in prompt


def test_inbox_request_kind_matches_eval_phrasing():
    assert _inbox_request_kind("What came in through Outlook today that needs my attention?") == "arrived_today"
    assert _inbox_request_kind("Show me any emails from today that need a reply.") == "reply_triage"


def test_run_microsoft_assistant_formats_last_five_deterministically():
    class LastFiveAgent:
        def invoke(self, *_args, **_kwargs):
            return {
                "messages": [
                    {
                        "type": "tool",
                        "name": "read_live_outlook_inbox",
                        "content": (
                            '{"ok":true,"source":"microsoft_graph_live","mailbox_user_id":"bclymer@alleatogroup.com","count":5,'
                            '"messages":['
                            '{"subject":"RE: ULTA update needed.","from":{"ignored":true},"from_name":"Walter Allen","from_email":"wallen@ulta.com","received_at":"2026-06-09T09:59:34Z","body_text":"Can you confirm by Thursday afternoon?","has_attachments":false},'
                            '{"subject":"Sign in to Perplexity","from_name":"Perplexity","from_email":"team@mail.perplexity.ai","received_at":"2026-06-09T09:37:58Z","body_text":"Your verification code is 12345.","has_attachments":false},'
                            '{"subject":"ERP Integrations Daily Summary","from_name":"Alleato Group notifications","from_email":"no-reply@alleatogroup.com","received_at":"2026-06-09T06:15:56Z","body_text":"Daily summary.","has_attachments":false},'
                            '{"subject":"[Reminder] Your payment is due in 1 day","from_name":"Ryan Niddel","from_email":"payments@example.com","received_at":"2026-06-09T03:54:13Z","body_text":"Payment is due in 1 day.","has_attachments":false},'
                            '{"subject":"RE: Exol Morrisville PA","from_name":"Steve Fischer","from_email":"steve.fischer@exol.com","received_at":"2026-06-09T02:59:12Z","body_text":"Please review the comments.","has_attachments":false}'
                            ']}'
                        ),
                    },
                    {"content": "freeform assistant output that should be ignored"},
                ]
            }

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            mailboxUserId="bclymer@alleatogroup.com",
            prompt="Can you tell me my last five emails?",
        ),
        create_agent=lambda **_kwargs: LastFiveAgent(),
    )

    assert response.answer.startswith("Your last five emails in bclymer@alleatogroup.com are:")
    assert "Megan" not in response.answer
    assert "Approvals needed" not in response.answer
    assert "draft" not in response.answer.lower()
    assert "Security-related email noted in the broader inbox" not in response.answer
    assert response.answer.count("Response path:") == 5
    assert "ERP Integrations Daily Summary" in response.answer
    assert "Response path: Ignore." in response.answer
    assert response.answer.count("Evidence:") == 5
    assert "Evidence: Can you confirm by Thursday afternoon?" in response.answer
    assert "Why:" not in response.answer


def test_run_microsoft_assistant_formats_urgent_inbox_into_action_buckets():
    class UrgentInboxAgent:
        def invoke(self, *_args, **_kwargs):
            return {
                "messages": [
                    {
                        "type": "tool",
                        "name": "read_live_outlook_inbox",
                        "content": (
                            '{"ok":true,"source":"microsoft_graph_live","mailbox_user_id":"bclymer@alleatogroup.com","count":4,'
                            '"messages":['
                            '{"subject":"RE: ULTA update needed.","from_name":"Walter Allen","from_email":"wallen@ulta.com","received_at":"2026-06-09T09:59:34Z","body_text":"Can you confirm by Thursday afternoon?","has_attachments":false},'
                            '{"subject":"Microsoft 365 security: You have messages in quarantine","from_name":"Microsoft 365","from_email":"quarantine@messaging.microsoft.com","received_at":"2026-06-09T08:00:00Z","body_text":"Review 1 quarantined message.","has_attachments":false},'
                            '{"subject":"FYI--approaching spend limit","from_name":"Capital One Business","from_email":"alerts@capitalone.com","received_at":"2026-06-09T07:00:00Z","body_text":"You are approaching your spend limit.","has_attachments":false},'
                            '{"subject":"Sign in to Perplexity","from_name":"Perplexity","from_email":"team@mail.perplexity.ai","received_at":"2026-06-09T06:00:00Z","body_text":"Your verification code is 12345.","has_attachments":false}'
                            ']}'
                        ),
                    },
                    {"content": "freeform assistant output that should be ignored"},
                ]
            }

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            mailboxUserId="bclymer@alleatogroup.com",
            prompt="Anything urgent in my inbox today?",
        ),
        create_agent=lambda **_kwargs: UrgentInboxAgent(),
    )

    assert "Alert now" in response.answer
    assert "Reply" not in response.answer or "Alert now" in response.answer
    assert "Watch" in response.answer
    assert "Ignore/noise" in response.answer
    assert "Recommended next steps for Brandon" in response.answer
    assert "Draft Teams message" not in response.answer
    assert "Megan" not in response.answer


def test_run_microsoft_assistant_limits_this_morning_to_same_day_morning_messages():
    class MorningInboxAgent:
        def invoke(self, *_args, **_kwargs):
            return {
                "messages": [
                    {
                        "type": "tool",
                        "name": "read_live_outlook_inbox",
                        "content": (
                            '{"ok":true,"source":"microsoft_graph_live","mailbox_user_id":"bclymer@alleatogroup.com","count":4,'
                            '"messages":['
                            '{"subject":"RE: ULTA update needed.","from_name":"Walter Allen","from_email":"wallen@ulta.com","received_at":"2026-06-09T09:59:34Z","body_text":"Can you confirm by Thursday afternoon?","has_attachments":false},'
                            '{"subject":"Sign in to Perplexity","from_name":"Perplexity","from_email":"team@mail.perplexity.ai","received_at":"2026-06-09T09:37:58Z","body_text":"Your verification code is 12345.","has_attachments":false},'
                            '{"subject":"Champaign Pay App","from_name":"Glendon Griesbaum","from_email":"ggriesbaum@niemannfoods.com","received_at":"2026-06-08T20:39:00Z","body_text":"Reminder to keep invoicing timely.","has_attachments":false},'
                            '{"subject":"Acumatica maintenance","from_name":"Revive Support","from_email":"support@reviveerp.com","received_at":"2026-06-08T18:47:00Z","body_text":"Scheduled maintenance notice.","has_attachments":false}'
                            ']}'
                        ),
                    },
                    {"content": "freeform assistant output that should be ignored"},
                ]
            }

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            mailboxUserId="bclymer@alleatogroup.com",
            prompt="What are the important emails this morning?",
        ),
        create_agent=lambda **_kwargs: MorningInboxAgent(),
    )

    assert "Important emails this morning" in response.answer
    assert "Walter Allen" in response.answer
    assert "Perplexity" in response.answer
    assert "Glendon Griesbaum" not in response.answer
    assert "Revive Support" not in response.answer


def test_run_microsoft_assistant_arrived_today_separates_action_needed_from_informational():
    class TodayInboxAgent:
        def invoke(self, *_args, **_kwargs):
            return {
                "messages": [
                    {
                        "type": "tool",
                        "name": "read_live_outlook_inbox",
                        "content": (
                            '{"ok":true,"source":"microsoft_graph_live","mailbox_user_id":"bclymer@alleatogroup.com","count":4,'
                            '"messages":['
                            '{"subject":"RE: ULTA update needed.","from_name":"Walter Allen","from_email":"wallen@ulta.com","received_at":"2026-06-09T09:59:34Z","body_text":"Can you confirm by Thursday afternoon?","has_attachments":false},'
                            '{"subject":"RE: Exol Morrisville PA","from_name":"Steve Fischer","from_email":"steve.fischer@exol.com","received_at":"2026-06-09T02:59:12Z","body_text":"Please review the comments and reply.","has_attachments":false},'
                            '{"subject":"ERP Integrations Daily Summary","from_name":"Alleato Group notifications","from_email":"no-reply@alleatogroup.com","received_at":"2026-06-09T06:15:56Z","body_text":"Daily summary.","has_attachments":false},'
                            '{"subject":"[Reminder] Your payment is due in 1 day","from_name":"Ryan Niddel","from_email":"payments@example.com","received_at":"2026-06-09T03:54:13Z","body_text":"Payment is due in 1 day.","has_attachments":false}'
                            ']}'
                        ),
                    },
                    {"content": "freeform assistant output that should be ignored"},
                ]
            }

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            mailboxUserId="bclymer@alleatogroup.com",
            prompt="What Outlook emails arrived today that matter?",
        ),
        create_agent=lambda **_kwargs: TodayInboxAgent(),
    )

    assert "Action needed" in response.answer
    assert "Watch / informational" in response.answer
    assert "ERP Integrations Daily Summary" in response.answer
    assert "Response path: Ignore" in response.answer or "Response path: Watch" in response.answer
    assert "Recommended next steps for Brandon" not in response.answer


def test_run_microsoft_assistant_reply_triage_excludes_automated_summary_mail():
    class ReplyInboxAgent:
        def invoke(self, *_args, **_kwargs):
            return {
                "messages": [
                    {
                        "type": "tool",
                        "name": "read_live_outlook_inbox",
                        "content": (
                            '{"ok":true,"source":"microsoft_graph_live","mailbox_user_id":"bclymer@alleatogroup.com","count":4,'
                            '"messages":['
                            '{"subject":"RE: ULTA update needed.","from_name":"Walter Allen","from_email":"wallen@ulta.com","received_at":"2026-06-09T09:59:34Z","body_text":"Can you confirm by Thursday afternoon?","has_attachments":false},'
                            '{"subject":"Alleato Group: ERP Integrations Daily Summary","from_name":"Alleato Group","from_email":"alleato_group_notifications@us02.procoretech.com","received_at":"2026-06-09T06:15:56Z","body_text":"Do not reply to this email. 2 vendors available to sync.","has_attachments":false},'
                            '{"subject":"RE: Exol Morrisville PA","from_name":"Steve Fischer","from_email":"steve.fischer@exol.com","received_at":"2026-06-09T02:20:00Z","body_text":"Will review asap and provide feedback.","has_attachments":false},'
                            '{"subject":"Sign in to Perplexity","from_name":"Perplexity","from_email":"team@mail.perplexity.ai","received_at":"2026-06-09T09:37:58Z","body_text":"Your verification code is 12345.","has_attachments":false}'
                            ']}'
                        ),
                    },
                    {"content": "freeform assistant output that should be ignored"},
                ]
            }

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            mailboxUserId="bclymer@alleatogroup.com",
            prompt="Show me any emails from today that need a reply.",
        ),
        create_agent=lambda **_kwargs: ReplyInboxAgent(),
    )

    assert "Emails that most likely need a reply" in response.answer
    assert "ERP Integrations Daily Summary" not in response.answer
    assert "Sign in to Perplexity" not in response.answer
    assert "RE: Exol Morrisville PA" in response.answer
    assert "Action: Reply." in response.answer
    assert "Action: Alert now." in response.answer


def test_run_microsoft_assistant_dedupes_same_thread_and_reports_thread_activity():
    class ReplyInboxAgent:
        def invoke(self, *_args, **_kwargs):
            return {
                "messages": [
                    {
                        "type": "tool",
                        "name": "read_live_outlook_inbox",
                        "content": (
                            '{"ok":true,"source":"microsoft_graph_live","mailbox_user_id":"bclymer@alleatogroup.com","count":4,'
                            '"messages":['
                            '{"subject":"RE: Exol Morrisville PA","from_name":"Steve Fischer","from_email":"steve.fischer@exol.com","received_at":"2026-06-09T02:59:12Z","body_text":"Please review the comments and reply with your approval today.","has_attachments":false},'
                            '{"subject":"RE: Exol Morrisville PA","from_name":"Steve Fischer","from_email":"steve.fischer@exol.com","received_at":"2026-06-09T02:20:00Z","body_text":"Will review asap and provide feedback.","has_attachments":false},'
                            '{"subject":"RE: ULTA update needed.","from_name":"Walter Allen","from_email":"wallen@ulta.com","received_at":"2026-06-09T09:59:34Z","body_text":"Can you confirm by Thursday afternoon?","has_attachments":false},'
                            '{"subject":"Alleato Group: ERP Integrations Daily Summary","from_name":"Alleato Group","from_email":"alleato_group_notifications@us02.procoretech.com","received_at":"2026-06-09T06:15:56Z","body_text":"Do not reply to this email. 2 vendors available to sync.","has_attachments":false}'
                            ']}'
                        ),
                    },
                    {"content": "freeform assistant output that should be ignored"},
                ]
            }

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(
            userId="user-1",
            mailboxUserId="bclymer@alleatogroup.com",
            prompt="Show me any emails from today that need a reply.",
        ),
        create_agent=lambda **_kwargs: ReplyInboxAgent(),
    )

    assert response.answer.count("RE: Exol Morrisville PA") == 1
    assert "Thread activity: 2 messages in this subject thread." in response.answer
    assert "Evidence: Please review the comments and reply with your approval today." in response.answer


def test_run_microsoft_assistant_fails_loudly_without_provider(monkeypatch):
    monkeypatch.delenv("AI_GATEWAY_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    response = run_microsoft_executive_assistant(
        MicrosoftExecutiveAssistantRequest(userId="user-1", prompt="Check email")
    )

    assert response.mode == "unavailable"
    assert response.tool_trace[0].status == "failed"
    assert "OPENAI_API_KEY is required for the Microsoft Executive Assistant." in response.answer
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
