"""Cron entrypoint: send Brandon's daily email triage digest via Teams.

Runs at 7:00 AM ET (12:00 UTC). Queries outlook_email_intake for the prior
calendar day, groups by triage_action, and sends a summary Teams DM so Brandon
starts the day with a clear picture of yesterday's inbox activity.
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "/app")

from src.services.env_loader import load_env

load_env()

import httpx

from src.services.supabase_helpers import get_supabase_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_DEFAULT_TEAMS_USER_ID = "1854b4b0-3e8e-4d69-86df-32cdb3c80ee0"


def _app_base_url() -> str:
    return (
        os.getenv("NEXT_PUBLIC_APP_URL")
        or os.getenv("APP_BASE_URL")
        or "https://projects.alleatogroup.com"
    ).rstrip("/")


def _send_teams_dm(message: str) -> bool:
    service_key = os.getenv("NOTIFICATION_SERVICE_KEY")
    user_id = os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_TEAMS_USER_ID") or _DEFAULT_TEAMS_USER_ID
    if not service_key:
        logger.warning("NOTIFICATION_SERVICE_KEY not set — cannot send Teams digest")
        return False
    try:
        resp = httpx.post(
            f"{_app_base_url()}/api/bot/proactive/teams",
            headers={"Authorization": f"Bearer {service_key}"},
            json={"userId": user_id, "message": message},
            timeout=15,
        )
        if resp.status_code >= 400:
            logger.warning("Teams DM HTTP %s: %s", resp.status_code, resp.text[:200])
            return False
        return True
    except Exception as exc:
        logger.warning("Teams DM failed: %s", exc)
        return False


def generate_email_digest(mailbox: str, date: datetime) -> str:
    """Query outlook_email_intake for `date` and return a formatted digest string."""
    client = get_supabase_client()

    day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    rows = (
        client.table("outlook_email_intake")
        .select("subject,from_email,from_name,triage_action,received_at")
        .eq("mailbox_user_id", mailbox)
        .gte("received_at", day_start.isoformat())
        .lt("received_at", day_end.isoformat())
        .order("received_at", desc=True)
        .execute()
    ).data or []

    total = len(rows)
    triaged = [r for r in rows if r.get("triage_action")]
    untriaged = total - len(triaged)

    buckets: dict[str, list[dict]] = {
        "urgent": [],
        "reply_needed": [],
        "delegate": [],
        "fyi": [],
        "watch": [],
        "delete": [],
    }
    for r in triaged:
        action = (r.get("triage_action") or "").lower()
        if action in buckets:
            buckets[action].append(r)

    date_label = date.strftime("%A, %B %-d")

    def sender(r: dict) -> str:
        return r.get("from_name") or r.get("from_email") or "unknown"

    def bullet_list(items: list[dict], max_items: int = 4) -> str:
        lines = []
        for item in items[:max_items]:
            subj = (item.get("subject") or "(no subject)")[:60]
            lines.append(f"  • {subj} — {sender(item)}")
        if len(items) > max_items:
            lines.append(f"  … and {len(items) - max_items} more")
        return "\n".join(lines)

    sections = [f"📬 Email digest for {date_label} — {total} email(s) received"]

    if buckets["urgent"]:
        sections.append(f"\n⚡ Urgent ({len(buckets['urgent'])})\n{bullet_list(buckets['urgent'])}")

    if buckets["reply_needed"]:
        sections.append(
            f"\n↩ Reply Needed ({len(buckets['reply_needed'])})\n{bullet_list(buckets['reply_needed'])}"
        )

    if buckets["delegate"]:
        sections.append(f"\n→ To Delegate ({len(buckets['delegate'])})")

    if buckets["fyi"] or buckets["watch"]:
        fyi_count = len(buckets["fyi"]) + len(buckets["watch"])
        sections.append(f"\n📋 FYI / Watch ({fyi_count})")

    if untriaged:
        sections.append(f"\n⏳ Not yet triaged: {untriaged}")

    if total == 0:
        sections.append("\nNo emails received — inbox clear.")

    return "\n".join(sections)


def main() -> None:
    mailbox = (
        os.getenv("MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX")
        or (os.getenv("MICROSOFT_SYNC_USERS", "").split(",")[0].strip())
    )
    if not mailbox:
        logger.error("No mailbox configured — set MICROSOFT_EXECUTIVE_ASSISTANT_MAILBOX")
        sys.exit(1)

    # Prior calendar day in UTC (close enough for ET overlap at 7 AM)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    digest = generate_email_digest(mailbox, yesterday)
    logger.info("Digest:\n%s", digest)

    sent = _send_teams_dm(digest)
    if not sent:
        logger.error("Failed to send digest via Teams DM")
        sys.exit(1)

    logger.info("Email digest sent successfully for %s", mailbox)


if __name__ == "__main__":
    main()
