"""Runtime tools for the Microsoft Executive Assistant backend agent."""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote, urlencode

from langchain_core.tools import tool


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


@tool
def draft_outlook_email_for_review(
    to_recipients: list[str],
    subject: str,
    body: str,
    cc_recipients: Optional[list[str]] = None,
    reply_to_graph_message_id: Optional[str] = None,
) -> str:
    """Prepare an Outlook email draft payload for Megan's review. Never sends."""
    if not to_recipients and not reply_to_graph_message_id:
        return "OUTLOOK_DRAFT_BLOCKED: Provide recipients or reply_to_graph_message_id before drafting."
    payload = {
        "action": "preview",
        "type": "outlook_email_draft",
        "approvalRequired": True,
        "approvalReason": "External communication requires Megan's review before any Outlook draft/send action.",
        "fields": {
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
    """Prepare a Teams private-message payload for Megan's review. Never posts."""
    if not _clean_text(recipient):
        return "TEAMS_DRAFT_BLOCKED: recipient must not be blank."
    payload = {
        "action": "preview",
        "type": "teams_private_message_draft",
        "approvalRequired": True,
        "approvalReason": "Teams messages require approval unless Megan explicitly approved the exact send action.",
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
