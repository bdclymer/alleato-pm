"""Microsoft Graph webhook notification handling."""

from __future__ import annotations

import hmac
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class GraphWebhookAuthError(ValueError):
    """Raised when a Graph webhook notification fails local validation."""


def expected_client_state() -> str:
    return (
        os.getenv("MICROSOFT_GRAPH_WEBHOOK_CLIENT_STATE")
        or os.getenv("GRAPH_WEBHOOK_CLIENT_STATE")
        or ""
    ).strip()


def validate_client_state(value: Optional[str]) -> None:
    expected = expected_client_state()
    if not expected:
        raise GraphWebhookAuthError(
            "MICROSOFT_GRAPH_WEBHOOK_CLIENT_STATE or GRAPH_WEBHOOK_CLIENT_STATE is required"
        )
    if not value or not hmac.compare_digest(str(value), expected):
        raise GraphWebhookAuthError("Invalid Microsoft Graph webhook clientState")


def notification_values(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    values = payload.get("value")
    if isinstance(values, list):
        return [value for value in values if isinstance(value, dict)]
    return []


def _source_from_resource(resource: str) -> str:
    lowered = resource.lower()
    if "/messages" in lowered and "/chats/" not in lowered and "/teams/" not in lowered:
        return "outlook_email"
    if "/teams/" in lowered or "/channels/" in lowered:
        return "teams_message"
    if "/chats/" in lowered:
        return "teams_chat_export"
    if "/drive" in lowered or "/sites/" in lowered:
        return "onedrive_file"
    return "microsoft_graph"


def _parse_outlook_message_resource(resource: str) -> Dict[str, Optional[str]]:
    normalized = str(resource or "").strip().lstrip("/")
    match = re.search(
        r"users/([^/]+)/(?:mailfolders/[^/]+/)?messages(?:/([^/?]+))?",
        normalized,
        flags=re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r"me/(?:mailfolders/[^/]+/)?messages(?:/([^/?]+))?",
            normalized,
            flags=re.IGNORECASE,
        )
        return {
            "mailbox": None,
            "message_id": match.group(1) if match else None,
        }
    return {"mailbox": match.group(1), "message_id": match.group(2)}


def _mailbox_from_subscription(supabase: Any, subscription_id: str) -> Optional[str]:
    if not subscription_id:
        return None
    try:
        response = (
            supabase.table("graph_subscriptions")
            .select("source, resource_id")
            .eq("graph_subscription_id", subscription_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if rows and rows[0].get("source") == "outlook_email":
            return rows[0].get("resource_id")
    except Exception as exc:
        logger.warning(
            "[GraphWebhook] Could not resolve mailbox for subscription=%s: %s",
            subscription_id,
            exc,
        )
    return None


def outlook_notification_work_item(
    notification: Dict[str, Any],
    *,
    supabase: Any = None,
) -> Optional[Dict[str, Optional[str]]]:
    """Return mailbox/message identifiers for an Outlook notification, if supported."""
    resource = str(notification.get("resource") or "")
    if _source_from_resource(resource) != "outlook_email":
        return None

    parsed = _parse_outlook_message_resource(resource)
    resource_data = notification.get("resourceData") or {}
    message_id = parsed.get("message_id") or resource_data.get("id")
    mailbox = parsed.get("mailbox")
    if supabase is not None and (not mailbox or "@" not in mailbox):
        mailbox = _mailbox_from_subscription(
            supabase,
            str(notification.get("subscriptionId") or ""),
        ) or mailbox

    if not mailbox:
        return None

    return {
        "mailbox": mailbox,
        "message_id": message_id,
        "subscription_id": notification.get("subscriptionId"),
        "change_type": notification.get("changeType"),
    }


def _record_webhook_notification(
    supabase: Any,
    notification: Dict[str, Any],
) -> None:
    from src.services.health.source_sync_health import record_sync_run

    resource = str(notification.get("resource") or "unknown")
    source = _source_from_resource(resource)
    lifecycle_event = notification.get("lifecycleEvent")
    status = "warning" if lifecycle_event else "queued"
    record_sync_run(
        supabase,
        source=source,
        resource_id=resource,
        resource_name=f"Graph notification: {resource}",
        stage="webhook",
        status=status,
        started_at=datetime.now(timezone.utc),
        finished_at=datetime.now(timezone.utc),
        items_seen=1,
        items_synced=0,
        metadata={
            "subscription_id": notification.get("subscriptionId"),
            "change_type": notification.get("changeType"),
            "tenant_id": notification.get("tenantId"),
            "lifecycle_event": lifecycle_event,
            "resource_data": notification.get("resourceData") or {},
        },
    )


def record_notification(supabase: Any, notification: Dict[str, Any]) -> None:
    """Record one accepted Graph notification into the source sync run ledger."""
    _record_webhook_notification(supabase, notification)


def _lifecycle_status(lifecycle_event: str) -> str:
    normalized = lifecycle_event.strip()
    if normalized == "reauthorizationRequired":
        return "renewal_due"
    if normalized == "subscriptionRemoved":
        return "removed"
    if normalized == "missed":
        return "missed"
    return "lifecycle_event"


def handle_lifecycle_event(supabase: Any, notification: Dict[str, Any]) -> bool:
    """Persist one Microsoft Graph lifecycle event against its subscription row."""
    validate_client_state(notification.get("clientState"))
    lifecycle_event = str(notification.get("lifecycleEvent") or "").strip()
    subscription_id = str(notification.get("subscriptionId") or "").strip()
    if not lifecycle_event or not subscription_id:
        return False

    now = datetime.now(timezone.utc).isoformat()
    status = _lifecycle_status(lifecycle_event)
    try:
        supabase.table("graph_subscriptions").update(
            {
                "status": status,
                "last_lifecycle_event_at": now,
                "last_error_message": (
                    f"Microsoft Graph lifecycle event: {lifecycle_event}"
                    if status in {"removed", "missed", "renewal_due"}
                    else None
                ),
            }
        ).eq("graph_subscription_id", subscription_id).execute()
    except Exception as exc:
        logger.warning(
            "[GraphWebhook] Could not update lifecycle status for subscription=%s event=%s: %s",
            subscription_id,
            lifecycle_event,
            exc,
        )

    record_notification(
        supabase,
        {
            **notification,
            "resource": subscription_id,
            "lifecycleEvent": lifecycle_event,
        },
    )
    return True


def process_graph_notification_realtime(supabase: Any, notification: Dict[str, Any]) -> Dict[str, Any]:
    """Process one accepted Graph notification into current assistant-readable state."""
    validate_client_state(notification.get("clientState"))
    work_item = outlook_notification_work_item(notification, supabase=supabase)
    if not work_item:
        return {"status": "ignored", "reason": "unsupported_resource"}

    from .sync import sync_outlook_mailbox_delta

    mailbox = str(work_item["mailbox"])
    result = sync_outlook_mailbox_delta(
        supabase,
        mailbox,
        reason="graph_webhook",
    )
    result["message_id"] = work_item.get("message_id")
    result["subscription_id"] = work_item.get("subscription_id")
    return result


def handle_graph_notifications(
    supabase: Any,
    payload: Dict[str, Any],
    *,
    on_realtime_notification: Optional[Callable[[Dict[str, Any]], bool]] = None,
) -> Dict[str, Any]:
    values = notification_values(payload)
    if not values:
        return {"status": "accepted", "notification_count": 0, "recorded": 0, "queued_realtime": 0}

    recorded = 0
    queued_realtime = 0
    for notification in values:
        validate_client_state(notification.get("clientState"))
        try:
            record_notification(supabase, notification)
            recorded += 1
        except Exception as exc:
            logger.warning(
                "[GraphWebhook] Could not record notification for subscription=%s resource=%s: %s",
                notification.get("subscriptionId"),
                notification.get("resource"),
                exc,
            )
        if on_realtime_notification and outlook_notification_work_item(notification, supabase=supabase):
            try:
                if on_realtime_notification(notification):
                    queued_realtime += 1
            except Exception as exc:
                logger.warning(
                    "[GraphWebhook] Could not enqueue realtime processing for subscription=%s resource=%s: %s",
                    notification.get("subscriptionId"),
                    notification.get("resource"),
                    exc,
                )

    return {
        "status": "accepted",
        "notification_count": len(values),
        "recorded": recorded,
        "queued_realtime": queued_realtime,
    }


def handle_graph_lifecycle_notifications(supabase: Any, payload: Dict[str, Any]) -> Dict[str, Any]:
    values = notification_values(payload)
    if not values:
        return {"status": "accepted", "notification_count": 0, "recorded": 0}

    recorded = 0
    for notification in values:
        if handle_lifecycle_event(supabase, notification):
            recorded += 1

    return {
        "status": "accepted",
        "notification_count": len(values),
        "recorded": recorded,
    }
