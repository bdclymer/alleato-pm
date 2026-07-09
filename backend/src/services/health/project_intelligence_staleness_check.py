"""Staleness health check for project intelligence narratives.

Monitors max(project_current_state.updated_at) and intelligence_packets
generation freshness. Silent staleness (2+ weeks) is the failure mode this
guards against (incident #759).

Alerts if:
- project_current_state max updated_at is older than N days (default 2).
- intelligence_packets max generated_at is older than N days (default 2).
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# How old is "stale" for narrative tables?
DEFAULT_MAX_STALENESS_DAYS = 2


def check_project_intelligence_staleness() -> dict:
    """Check if project intelligence narratives are stale."""
    from ..supabase_helpers import get_supabase_client

    max_staleness_days = int(os.getenv("PROJECT_INTELLIGENCE_STALENESS_CHECK_DAYS", str(DEFAULT_MAX_STALENESS_DAYS)))
    max_staleness = timedelta(days=max_staleness_days)
    now = datetime.now(timezone.utc)

    client = get_supabase_client()

    result: dict = {
        "check": "project_intelligence_staleness",
        "max_allowed_staleness_days": max_staleness_days,
        "timestamp": now.isoformat(),
        "healthy": True,
        "alerts": [],
    }

    # Check project_current_state staleness
    try:
        current_state_rows = (
            client.table("project_current_state")
            .select("updated_at")
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        if current_state_rows:
            last_update_str = current_state_rows[0]["updated_at"]
            # Parse ISO timestamp
            last_update = datetime.fromisoformat(last_update_str.replace("Z", "+00:00"))
            staleness = now - last_update
            result["project_current_state_last_update"] = last_update_str
            result["project_current_state_staleness_days"] = staleness.days

            if staleness > max_staleness:
                result["healthy"] = False
                result["alerts"].append({
                    "table": "project_current_state",
                    "last_update": last_update_str,
                    "staleness_days": staleness.days,
                    "message": f"project_current_state narratives are stale: {staleness.days} days old",
                })
        else:
            result["project_current_state_last_update"] = None
            result["project_current_state_staleness_days"] = None
    except Exception as e:  # noqa: BLE001
        logger.error("[ProjectIntelligenceStalenessCheck] Failed to check project_current_state: %s", e)
        result["healthy"] = False
        result["alerts"].append({
            "table": "project_current_state",
            "error": str(e),
        })

    # Check intelligence_packets staleness (for the synthesis version)
    try:
        packet_rows = (
            client.table("intelligence_packets")
            .select("generated_at")
            .eq("compiler_version", "project_intelligence_synthesis_v1")
            .eq("packet_type", "current")
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        if packet_rows:
            last_gen_str = packet_rows[0]["generated_at"]
            # Parse ISO timestamp
            last_gen = datetime.fromisoformat(last_gen_str.replace("Z", "+00:00"))
            staleness = now - last_gen
            result["intelligence_packets_last_generated"] = last_gen_str
            result["intelligence_packets_staleness_days"] = staleness.days

            if staleness > max_staleness:
                result["healthy"] = False
                result["alerts"].append({
                    "table": "intelligence_packets",
                    "last_generated": last_gen_str,
                    "staleness_days": staleness.days,
                    "message": f"intelligence_packets syntheses are stale: {staleness.days} days old",
                })
        else:
            result["intelligence_packets_last_generated"] = None
            result["intelligence_packets_staleness_days"] = None
    except Exception as e:  # noqa: BLE001
        logger.error("[ProjectIntelligenceStalenessCheck] Failed to check intelligence_packets: %s", e)
        result["healthy"] = False
        result["alerts"].append({
            "table": "intelligence_packets",
            "error": str(e),
        })

    return result


def _post_slack(webhook_url: str, result: dict[str, Any]) -> None:
    """Post staleness alert to Slack."""
    try:
        alerts_text = "\n".join(
            f"• {alert.get('table')}: {alert.get('message', alert.get('error'))}"
            for alert in result.get("alerts", [])
        )
        text = (
            f"⚠️ Project Intelligence Staleness Alert\n\n"
            f"{alerts_text}\n\n"
            f"Max allowed staleness: {result.get('max_allowed_staleness_days')} days\n"
            f"Checked at: {result.get('timestamp')}"
        )
        httpx.post(webhook_url, json={"text": text}, timeout=10)
    except Exception as exc:  # noqa: BLE001
        logger.warning("[ProjectIntelligenceStalenessCheck] Slack notification failed: %s", exc)


def _post_teams(result: dict[str, Any]) -> bool:
    """Send staleness alert as a Teams DM via the proactive-bot bridge."""
    base_url = (
        os.getenv("NEXT_PUBLIC_APP_URL")
        or os.getenv("APP_BASE_URL")
        or "https://projects.alleatogroup.com"
    ).rstrip("/")
    service_key = os.getenv("NOTIFICATION_SERVICE_KEY")
    if not service_key:
        logger.warning("[ProjectIntelligenceStalenessCheck] NOTIFICATION_SERVICE_KEY not set — cannot send Teams alert")
        return False

    alerts_text = "\n".join(
        f"• {alert.get('table')}: {alert.get('message', alert.get('error'))}"
        for alert in result.get("alerts", [])
    )
    message = (
        f"⚠️ Project Intelligence Staleness Alert\n\n"
        f"{alerts_text}\n\n"
        f"Max allowed staleness: {result.get('max_allowed_staleness_days')} days"
    )

    try:
        resp = httpx.post(
            f"{base_url}/api/bot/proactive/teams",
            headers={"Authorization": f"Bearer {service_key}"},
            json={"userId": "1854b4b0-3e8e-4d69-86df-32cdb3c80ee0", "message": message},
            timeout=15,
        )
        resp.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("[ProjectIntelligenceStalenessCheck] Teams notification failed: %s", exc)
        return False


if __name__ == "__main__":
    import sys

    result = check_project_intelligence_staleness()
    print(json.dumps(result, indent=2, default=str))

    if not result["healthy"]:
        slack_url = os.getenv("SLACK_WEBHOOK_URL")
        if slack_url:
            _post_slack(slack_url, result)
        teams_sent = _post_teams(result)
        logger.info(
            "[ProjectIntelligenceStalenessCheck] Alerts sent — slack=%s, teams=%s",
            "yes" if slack_url else "no-webhook",
            "yes" if teams_sent else "failed",
        )

    sys.exit(0 if result["healthy"] else 1)
