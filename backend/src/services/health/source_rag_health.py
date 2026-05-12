"""Multi-source RAG/source health watchdog.

This is the scheduled gate for source freshness, embedding coverage, compiler
backlog, and alert persistence across Fireflies, Microsoft Graph, Teams,
OneDrive/SharePoint, and task extraction.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List

import httpx

from src.services.health.source_sync_health import (
    get_source_sync_health,
    persist_source_sync_alerts,
    update_source_health_snapshot,
)
from src.services.supabase_helpers import get_supabase_client


WATCHED_SOURCES = {
    "fireflies",
    "outlook_email",
    "teams_message",
    "teams_chat_export",
    "onedrive_file",
    "sharepoint_file",
    "task_extraction",
    "vectorization",
    "intelligence_compiler",
}


def _compact_alert(alert: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "severity": alert.get("severity"),
        "code": alert.get("code"),
        "source": alert.get("source"),
        "resourceId": alert.get("resourceId"),
        "message": alert.get("message"),
        "detectedAt": alert.get("detectedAt"),
    }


def _trigger_remediation_task(report: Dict[str, Any]) -> Dict[str, Any]:
    """Optionally dispatch to an external task runner.

    Render gets the immediate failing cron and persisted Supabase alert either
    way. A webhook lets Trigger.dev/Codex/another cloud task runner attach later
    without changing health detection.
    """
    webhook_url = os.getenv("RAG_HEALTH_REMEDIATION_WEBHOOK_URL")
    if not webhook_url:
        return {"triggered": False, "reason": "RAG_HEALTH_REMEDIATION_WEBHOOK_URL not set"}

    headers = {"Content-Type": "application/json"}
    token = os.getenv("RAG_HEALTH_REMEDIATION_WEBHOOK_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    payload = {
        "event": "rag_source_health_degraded",
        "repository": "MeganHarrison/alleato-pm",
        "branch": "main",
        "report": report,
    }
    response = httpx.post(webhook_url, headers=headers, json=payload, timeout=20)
    response.raise_for_status()
    return {"triggered": True, "statusCode": response.status_code}


def run_source_rag_health_check(*, trigger_remediation: bool = True) -> Dict[str, Any]:
    supabase = get_supabase_client()
    health = get_source_sync_health(supabase)

    snapshot_writes = 0
    for source in health.get("sources", [])[:25]:
        update_source_health_snapshot(supabase, source)
        snapshot_writes += 1

    alert_result = persist_source_sync_alerts(supabase, health.get("alerts", []))

    watched_alerts: List[Dict[str, Any]] = [
        alert
        for alert in health.get("alerts", [])
        if str(alert.get("source") or "") in WATCHED_SOURCES
    ]
    critical_alerts = [alert for alert in watched_alerts if alert.get("severity") == "critical"]
    warning_alerts = [alert for alert in watched_alerts if alert.get("severity") == "warning"]
    unhealthy_sources = [
        source
        for source in health.get("sources", [])
        if str(source.get("source") or "") in WATCHED_SOURCES
        and source.get("status") in {"critical", "warning", "unknown"}
    ]

    report = {
        "passed": not critical_alerts and not unhealthy_sources and health.get("status") == "healthy",
        "status": health.get("status"),
        "generatedAt": health.get("generatedAt"),
        "snapshotWrites": snapshot_writes,
        "alertPersistence": alert_result,
        "counts": health.get("counts", {}),
        "unhealthySources": [
            {
                "source": source.get("source"),
                "resourceId": source.get("resourceId"),
                "resourceName": source.get("resourceName"),
                "status": source.get("status"),
                "staleMinutes": source.get("staleMinutes"),
                "unembeddedCount": source.get("unembeddedCount"),
                "uncompiledCount": source.get("uncompiledCount"),
                "lastErrorMessage": source.get("lastErrorMessage"),
            }
            for source in unhealthy_sources[:20]
        ],
        "criticalAlerts": [_compact_alert(alert) for alert in critical_alerts[:20]],
        "warningAlerts": [_compact_alert(alert) for alert in warning_alerts[:20]],
        "recentRuns": health.get("recentRuns", [])[:10],
    }

    if not report["passed"] and trigger_remediation:
        try:
            report["remediation"] = _trigger_remediation_task(report)
        except Exception as exc:
            report["remediation"] = {"triggered": False, "error": str(exc)}

    return report


def main() -> int:
    report = run_source_rag_health_check()
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report.get("passed") else 1


if __name__ == "__main__":
    sys.exit(main())
