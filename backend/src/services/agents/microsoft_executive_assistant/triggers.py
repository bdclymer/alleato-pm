"""Trigger adapters for the Microsoft Executive Assistant specialist."""

from __future__ import annotations

import os
from typing import Any, Callable, Optional

from src.services.agents.microsoft_executive_assistant.agent import run_microsoft_executive_assistant
from src.services.agents.microsoft_executive_assistant.contracts import (
    MicrosoftExecutiveAssistantRequest,
    MicrosoftExecutiveAssistantResponse,
)
from src.services.pipeline.config import MODEL_BRANDON_EMAIL


Runner = Callable[..., MicrosoftExecutiveAssistantResponse]


def _flag_enabled(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _operator_user_id() -> str:
    return os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_USER_ID", "system:microsoft-executive-assistant")


def _operator_mailbox(explicit: Optional[str] = None) -> Optional[str]:
    return (
        explicit
        or os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX")
        or os.getenv("AI_ASSISTANT_DEFAULT_OUTLOOK_MAILBOX")
        or os.getenv("OUTLOOK_OPERATOR_MAILBOX")
        or (os.getenv("MICROSOFT_SYNC_USERS", "").split(",")[0].strip() or None)
    )


def _model() -> str:
    configured = os.getenv("DEEP_AGENTS_MICROSOFT_EXECUTIVE_ASSISTANT_MODEL")
    return configured or f"openai:{MODEL_BRANDON_EMAIL}"


def run_scheduled_microsoft_executive_assistant_check(
    *,
    runner: Runner = run_microsoft_executive_assistant,
) -> dict[str, Any]:
    """Run the 15-minute inbox/operator check when explicitly enabled."""
    if not _flag_enabled("MICROSOFT_EXECUTIVE_ASSISTANT_SCHEDULED_ENABLED", default=False):
        return {
            "status": "skipped",
            "reason": "MICROSOFT_EXECUTIVE_ASSISTANT_SCHEDULED_ENABLED is not true",
        }

    mailbox = _operator_mailbox()
    if not mailbox:
        return {
            "status": "blocked",
            "reason": "No Microsoft Executive Assistant mailbox is configured.",
        }

    request = MicrosoftExecutiveAssistantRequest(
        userId=_operator_user_id(),
        sessionId="microsoft-executive-assistant:scheduled-check",
        prompt=(
            "Run the 15-minute Microsoft executive assistant check:\n"
            "1. Call read_live_outlook_inbox with unread_only=true to fetch recent unread messages.\n"
            "2. For EACH email, classify it with one of: urgent, reply_needed, delegate, fyi, watch, delete.\n"
            "3. Call write_email_triage for each classified email (pass graph_message_id, triage_action, "
            "and a one-sentence triage_reason). This persists your decision and tags the email in Outlook.\n"
            "4. For urgent or reply_needed items, prepare a concise Teams escalation draft if AUTO_TEAMS_ALERT is active.\n"
            "5. Avoid duplicate recommendations for emails already triaged (teams_alert_sent_at is set).\n"
            "Do not skip write_email_triage — it is required for every classified email."
        ),
        mailboxUserId=mailbox,
        trigger="scheduled_check",
        maxMessages=int(os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_MAX_MESSAGES", "25")),
    )
    response = runner(request, model=_model())
    return {
        "status": "completed" if response.mode == "deep_agents" else "failed",
        "mode": response.mode,
        "orchestrator": response.orchestrator,
        "mailbox": mailbox,
        "actions": [action.model_dump(by_alias=True) for action in response.actions],
        "toolTrace": [trace.model_dump(by_alias=True) for trace in response.tool_trace],
    }


def run_outlook_event_microsoft_executive_assistant(
    *,
    sync_result: dict[str, Any],
    runner: Runner = run_microsoft_executive_assistant,
) -> dict[str, Any]:
    """Run a guarded Outlook-event specialist pass after Graph webhook sync."""
    if not _flag_enabled("MICROSOFT_EXECUTIVE_ASSISTANT_WEBHOOK_ENABLED", default=False):
        return {
            "status": "skipped",
            "reason": "MICROSOFT_EXECUTIVE_ASSISTANT_WEBHOOK_ENABLED is not true",
        }

    mailbox = _operator_mailbox(str(sync_result.get("mailbox") or "") or None)
    if not mailbox:
        return {"status": "blocked", "reason": "Webhook sync result did not include a mailbox."}

    message_id = sync_result.get("message_id")
    request = MicrosoftExecutiveAssistantRequest(
        userId=_operator_user_id(),
        sessionId=f"microsoft-executive-assistant:outlook-event:{message_id or mailbox}",
        prompt=(
            "A Microsoft Graph Outlook webhook just completed delta sync. Review the new or changed mailbox item, "
            "classify urgency, prepare a concise Teams escalation draft only if the item is urgent, and prepare any "
            "email reply draft for Megan's review. Do not send or mutate Microsoft records.\n\n"
            f"Webhook sync result: {sync_result}"
        ),
        mailboxUserId=mailbox,
        trigger="outlook_event",
        maxMessages=int(os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_EVENT_MAX_MESSAGES", "10")),
    )
    response = runner(request, model=_model())
    return {
        "status": "completed" if response.mode == "deep_agents" else "failed",
        "mode": response.mode,
        "orchestrator": response.orchestrator,
        "mailbox": mailbox,
        "messageId": message_id,
        "actions": [action.model_dump(by_alias=True) for action in response.actions],
        "toolTrace": [trace.model_dump(by_alias=True) for trace in response.tool_trace],
    }
