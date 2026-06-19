"""Runtime tools for the Microsoft Executive Assistant backend agent."""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote, urlencode

import httpx
from langchain_core.tools import tool

logger = logging.getLogger(__name__)


def _json(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, default=str)


def _bounded_int(value: int, *, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, int(value)))


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _invoke_tool(candidate: Any, payload: dict[str, Any]) -> str:
    if hasattr(candidate, "invoke"):
        return str(candidate.invoke(payload))
    if hasattr(candidate, "func"):
        try:
            return str(candidate.func(**payload))
        except TypeError:
            return str(candidate.func(*payload.values()))
    return str(candidate(**payload))


@tool
def read_live_outlook_inbox(
    mailbox_user_id: str,
    since_iso: Optional[str] = None,
    limit: int = 25,
) -> str:
    """Read recent live Outlook inbox messages through Microsoft Graph."""
    try:
        from src.services.integrations.microsoft_graph.live_mail import list_live_outlook_inbox

        result = list_live_outlook_inbox(
            mailbox_user_id=mailbox_user_id,
            since_iso=since_iso,
            limit=_bounded_int(limit, minimum=1, maximum=100),
        )
        return _json({"ok": True, **result})
    except Exception as exc:
        return _json(
            {
                "ok": False,
                "error": (
                    "OUTLOOK_LIVE_INBOX_FAILED: Microsoft Graph live inbox read failed. "
                    f"Failed capability: read_live_outlook_inbox. Detail: {type(exc).__name__}: {exc}"
                ),
            }
        )


@tool
def search_outlook_emails(
    query: str,
    from_address: Optional[str] = None,
    date_from: Optional[str] = None,
    max_results: int = 10,
) -> str:
    """Search synced Outlook email content in the Alleato RAG corpus."""
    trimmed = _clean_text(query)
    if not trimmed:
        return "EMAIL_SEARCH_FAILED: query must not be blank."
    try:
        from src.services.agents.alleato_ai_tools.graph_api import search_emails

        return _invoke_tool(
            search_emails,
            {
                "query": trimmed,
                "from_address": from_address,
                "date_from": date_from,
                "max_results": _bounded_int(max_results, minimum=1, maximum=20),
            },
        )
    except Exception as exc:
        return f"EMAIL_SEARCH_FAILED: Failed capability: search_outlook_emails. Detail: {type(exc).__name__}: {exc}"


@tool
def search_microsoft_teams_messages(
    query: str,
    channel: Optional[str] = None,
    date_from: Optional[str] = None,
    max_results: int = 10,
) -> str:
    """Search synced Microsoft Teams messages in the Alleato RAG corpus."""
    trimmed = _clean_text(query)
    if not trimmed:
        return "TEAMS_SEARCH_FAILED: query must not be blank."
    try:
        from src.services.agents.alleato_ai_tools.graph_api import search_teams_messages

        return _invoke_tool(
            search_teams_messages,
            {
                "query": trimmed,
                "channel": channel,
                "date_from": date_from,
                "max_results": _bounded_int(max_results, minimum=1, maximum=20),
            },
        )
    except Exception as exc:
        return f"TEAMS_SEARCH_FAILED: Failed capability: search_microsoft_teams_messages. Detail: {type(exc).__name__}: {exc}"


@tool
def search_microsoft_files(query: str, date_from: Optional[str] = None, max_results: int = 10) -> str:
    """Search Microsoft/SharePoint/OneDrive files already indexed into Alleato RAG."""
    trimmed = _clean_text(query)
    if not trimmed:
        return "MICROSOFT_FILE_SEARCH_FAILED: query must not be blank."
    try:
        from src.services.agents.alleato_ai_tools.rag import _format_results, retrieve

        rows = retrieve(
            query=trimmed,
            source_types=["document", "email_attachment"],
            date_from=date_from,
            max_results=_bounded_int(max_results, minimum=1, maximum=20),
        )
        return _format_results(rows)
    except Exception as exc:
        return f"MICROSOFT_FILE_SEARCH_FAILED: Failed capability: search_microsoft_files. Detail: {type(exc).__name__}: {exc}"


@tool
def list_outlook_calendar_events(
    mailbox_user_id: str,
    start_iso: str,
    end_iso: Optional[str] = None,
    limit: int = 25,
) -> str:
    """List Outlook calendar events in a date window through Microsoft Graph."""
    try:
        from src.services.integrations.microsoft_graph.client import get_graph_client

        graph = get_graph_client()
        if not graph.is_configured():
            return _json(
                {
                    "ok": False,
                    "error": (
                        "OUTLOOK_CALENDAR_UNAVAILABLE: Microsoft Graph credentials are not configured. "
                        "Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID."
                    ),
                }
            )

        start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        end = (
            datetime.fromisoformat(end_iso.replace("Z", "+00:00"))
            if end_iso
            else start + timedelta(days=1)
        )
        params = {
            "startDateTime": start.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "endDateTime": end.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "$select": "id,subject,start,end,organizer,attendees,webLink,isCancelled,showAs",
            "$orderby": "start/dateTime",
            "$top": str(_bounded_int(limit, minimum=1, maximum=50)),
        }
        path = f"/users/{quote(mailbox_user_id.strip().lower())}/calendarView?{urlencode(params)}"
        data = graph.get(path)
        events = data.get("value") if isinstance(data, dict) else []
        return _json(
            {
                "ok": True,
                "source": "microsoft_graph_calendar",
                "mailboxUserId": mailbox_user_id.strip().lower(),
                "count": len(events or []),
                "events": events or [],
            }
        )
    except Exception as exc:
        return _json(
            {
                "ok": False,
                "error": (
                    "OUTLOOK_CALENDAR_FAILED: Microsoft Graph calendar read failed. "
                    f"Failed capability: list_outlook_calendar_events. Detail: {type(exc).__name__}: {exc}"
                ),
            }
        )


def _auto_draft_enabled() -> bool:
    return os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_AUTO_DRAFT", "true").lower() in {"1", "true", "yes"}


def _auto_teams_alert_enabled() -> bool:
    return os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_AUTO_TEAMS_ALERT", "true").lower() in {"1", "true", "yes"}


def _notification_service_key() -> Optional[str]:
    return os.getenv("NOTIFICATION_SERVICE_KEY") or None


def _app_base_url() -> str:
    return (
        os.getenv("NEXT_PUBLIC_APP_URL")
        or os.getenv("APP_BASE_URL")
        or "https://projects.alleatogroup.com"
    ).rstrip("/")


def _operator_teams_user_id() -> Optional[str]:
    return (
        os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_TEAMS_USER_ID")
        or os.getenv("AI_HEALTH_ALERT_TEAMS_USER_ID")
        or None
    )


def _send_teams_dm(message: str) -> dict[str, Any]:
    """Post a Teams DM via the Archon bot proactive endpoint. Best-effort, never raises."""
    service_key = _notification_service_key()
    user_id = _operator_teams_user_id()
    if not service_key or not user_id:
        missing = []
        if not service_key:
            missing.append("NOTIFICATION_SERVICE_KEY")
        if not user_id:
            missing.append("MICROSOFT_EXECUTIVE_ASSISTANT_TEAMS_USER_ID")
        logger.warning("[ExecAssistant] Teams DM skipped — missing env: %s", ", ".join(missing))
        return {"sent": False, "reason": f"missing_env:{','.join(missing)}"}
    try:
        resp = httpx.post(
            f"{_app_base_url()}/api/bot/proactive/teams",
            headers={"Authorization": f"Bearer {service_key}"},
            json={"userId": user_id, "message": message},
            timeout=15,
        )
        if resp.status_code >= 400:
            logger.warning("[ExecAssistant] Teams DM HTTP %s: %s", resp.status_code, resp.text[:200])
            return {"sent": False, "http_status": resp.status_code}
        return {"sent": True, "http_status": resp.status_code}
    except Exception as exc:
        logger.warning("[ExecAssistant] Teams DM failed: %s", exc)
        return {"sent": False, "error": str(exc)}


def _create_graph_draft(
    *,
    mailbox: str,
    to_recipients: list[str],
    subject: str,
    body: str,
    cc_recipients: list[str],
    reply_to_message_id: Optional[str],
) -> dict[str, Any]:
    """Create an Outlook draft in the mailbox via Microsoft Graph. Best-effort, never raises."""
    try:
        from src.services.integrations.microsoft_graph.client import get_graph_client

        graph = get_graph_client()
        if not graph.is_configured():
            return {"created": False, "reason": "graph_not_configured"}

        safe_mailbox = mailbox.strip().lower()

        if reply_to_message_id:
            # Threaded reply draft — lands in Drafts folder, pre-threads the conversation
            reply_resp = graph.post(
                f"/users/{quote(safe_mailbox)}/messages/{reply_to_message_id}/createReply",
                {},
            )
            draft_id = reply_resp.get("id")
            if not draft_id:
                return {"created": False, "reason": "no_draft_id_from_createReply"}
            # Patch the draft body now that we have the draft ID
            graph.patch(
                f"/users/{quote(safe_mailbox)}/messages/{draft_id}",
                {"body": {"contentType": "Text", "content": body}},
            )
        else:
            # Standalone new draft
            recipient_objects = [{"emailAddress": {"address": r}} for r in to_recipients]
            cc_objects = [{"emailAddress": {"address": c}} for c in cc_recipients]
            msg_payload: dict[str, Any] = {
                "subject": subject,
                "body": {"contentType": "Text", "content": body},
                "toRecipients": recipient_objects,
                "isDraft": True,
            }
            if cc_objects:
                msg_payload["ccRecipients"] = cc_objects
            reply_resp = graph.post(f"/users/{quote(safe_mailbox)}/messages", msg_payload)
            draft_id = reply_resp.get("id")
            if not draft_id:
                return {"created": False, "reason": "no_draft_id_from_new_message"}

        return {"created": True, "draftId": draft_id, "mailbox": safe_mailbox}
    except Exception as exc:
        logger.warning("[ExecAssistant] Graph draft creation failed: %s", exc)
        return {"created": False, "error": str(exc)}


@tool
def draft_outlook_email_for_review(
    to_recipients: list[str],
    subject: str,
    body: str,
    mailbox_user_id: Optional[str] = None,
    cc_recipients: Optional[list[str]] = None,
    reply_to_graph_message_id: Optional[str] = None,
) -> str:
    """Create an Outlook email draft in the operator's Drafts folder for review. Never sends.

    When MICROSOFT_EXECUTIVE_ASSISTANT_AUTO_DRAFT is true (default), the draft is written
    directly to the Outlook Drafts folder via Microsoft Graph so Brandon can find it in
    Outlook and send or edit it. The draft is never sent automatically.
    """
    if not to_recipients and not reply_to_graph_message_id:
        return "OUTLOOK_DRAFT_BLOCKED: Provide recipients or reply_to_graph_message_id before drafting."

    mailbox = (
        mailbox_user_id
        or os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX")
        or (os.getenv("MICROSOFT_SYNC_USERS", "").split(",")[0].strip() or None)
    )

    graph_result: dict[str, Any] = {"created": False, "reason": "auto_draft_disabled"}
    if _auto_draft_enabled() and mailbox:
        graph_result = _create_graph_draft(
            mailbox=mailbox,
            to_recipients=to_recipients,
            subject=subject,
            body=body,
            cc_recipients=cc_recipients or [],
            reply_to_message_id=reply_to_graph_message_id,
        )

    payload = {
        "action": "draft_created" if graph_result.get("created") else "preview",
        "type": "outlook_email_draft",
        "approvalRequired": True,
        "approvalReason": "Draft saved to Outlook Drafts — Brandon reviews and sends from Outlook.",
        "graphResult": graph_result,
        "fields": {
            "mailbox": mailbox,
            "toRecipients": to_recipients,
            "ccRecipients": cc_recipients or [],
            "subject": subject,
            "body": body,
            "replyToGraphMessageId": reply_to_graph_message_id,
        },
    }
    return _json(payload)


@tool
def draft_teams_message_for_review(recipient: str, message: str, urgency: str = "normal") -> str:
    """Send or prepare a Teams DM for Brandon's awareness.

    When urgency is "urgent" and MICROSOFT_EXECUTIVE_ASSISTANT_AUTO_TEAMS_ALERT is true
    (default), the message is sent immediately via the Archon bot. For non-urgent items,
    a preview payload is returned for human review.
    """
    if not _clean_text(recipient):
        return "TEAMS_DRAFT_BLOCKED: recipient must not be blank."

    teams_result: dict[str, Any] = {"sent": False, "reason": "non_urgent_or_disabled"}
    is_urgent = urgency.lower() in {"urgent", "high"}
    if is_urgent and _auto_teams_alert_enabled():
        teams_result = _send_teams_dm(message)

    payload = {
        "action": "sent" if teams_result.get("sent") else "preview",
        "type": "teams_private_message_draft",
        "approvalRequired": not teams_result.get("sent"),
        "teamsResult": teams_result,
        "fields": {
            "recipient": recipient,
            "message": message,
            "urgency": urgency,
        },
    }
    return _json(payload)


def microsoft_executive_assistant_tools() -> list[Any]:
    """Return the Microsoft specialist's runtime tools."""
    return [
        read_live_outlook_inbox,
        search_outlook_emails,
        search_microsoft_teams_messages,
        search_microsoft_files,
        list_outlook_calendar_events,
        draft_outlook_email_for_review,
        draft_teams_message_for_review,
    ]
