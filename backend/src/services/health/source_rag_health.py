"""Multi-source RAG/source health watchdog.

This is the scheduled gate for source freshness, embedding coverage, compiler
backlog, and alert persistence across Fireflies, Microsoft Graph, Teams,
SharePoint, and task extraction.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import httpx

from src.services.health.source_sync_health import (
    get_source_sync_health,
    persist_source_sync_alerts,
    update_source_health_snapshot,
)
from src.services.supabase_helpers import get_supabase_client
from src.services.supabase_helpers import get_rag_read_client


WATCHED_SOURCES = {
    "fireflies",
    "outlook_email",
    "teams_message",
    "teams_chat_export",
    "sharepoint_file",
    "task_extraction",
    "vectorization",
    "intelligence_compiler",
}

DEFAULT_ALERT_TEAMS_USER_ID = "1854b4b0-3e8e-4d69-86df-32cdb3c80ee0"
LIFECYCLE_LOOKBACK_HOURS = int(os.getenv("RAG_HEALTH_LIFECYCLE_LOOKBACK_HOURS", "24"))
MAX_PACKET_AGE_HOURS = int(os.getenv("RAG_HEALTH_MAX_PACKET_AGE_HOURS", "36"))
TERMINAL_DOCUMENT_STATUSES = {
    "intentionally_excluded",
    "deleted_no_transcript",
    "metadata_only",
    "not_vectorizable",
    "skipped",
    "skipped_low_content",
    "graph_content_missing",
    "graph_content_empty",
    "no_chunks",
    "ocr_failed",
}


def _iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _newest(values: List[Any]) -> str | None:
    parsed = [value for value in (_parse_datetime(value) for value in values) if value]
    if not parsed:
        return None
    return _iso(max(parsed))


def _coverage_status(count: int, total: int) -> str:
    if total == 0:
        return "unknown"
    if count == total:
        return "healthy"
    if count > 0:
        return "warning"
    return "critical"


def _source_family(row: Dict[str, Any]) -> str | None:
    source = str(row.get("source") or "").lower()
    category = str(row.get("category") or "").lower()
    doc_type = str(row.get("type") or "").lower()
    row_id = str(row.get("id") or "").lower()
    source_item_id = str(row.get("source_item_id") or "").lower()

    if source == "fireflies":
        return "meetings"
    if source != "microsoft_graph":
        return None
    if category == "teams_message" or "teams" in doc_type:
        return "teams"
    if category == "email" or doc_type in {"email", "email_attachment"} or row_id.startswith("outlook_"):
        return "emails"
    if (
        row_id.startswith("sharepoint_")
        or source_item_id.startswith("sharepoint_")
        or source_item_id.startswith("sites/")
        or "sharepoint" in source_item_id
        or "driveitem" in source_item_id
        or category == "document"
    ):
        return "sharepoint"
    return None


def _stage_alert(
    *,
    family: str,
    stage: str,
    severity: str,
    count: int,
    total: int,
    owner: str,
    latest_at: str | None,
    total_excluded: int = 0,
    message: str | None = None,
) -> Dict[str, Any]:
    exclusion_text = ""
    if total_excluded:
        exclusion_text = f" Excluded from this stage: {total_excluded}."
    alert_text = (
        f"{message} Owner: {owner}. Latest: {latest_at or 'never'}.{exclusion_text}"
        if message
        else (
            f"{family}: {stage} coverage is {count}/{total}. "
            f"Owner: {owner}. Latest: {latest_at or 'never'}.{exclusion_text}"
        )
    )
    return {
        "severity": severity,
        "code": f"rag_lifecycle_{stage}",
        "source": family,
        "resourceId": f"rag-lifecycle:{family}",
        "message": alert_text,
        "detectedAt": _iso(datetime.now(timezone.utc)),
    }


def _is_terminal_vectorization_status(status: Any) -> bool:
    return str(status or "").strip().lower() in TERMINAL_DOCUMENT_STATUSES


def _is_terminal_vectorization_row(
    row: Dict[str, Any],
    rag_metadata_by_id: Dict[str, Dict[str, Any]],
) -> bool:
    if _is_terminal_vectorization_status(row.get("status")):
        return True
    rag_metadata = rag_metadata_by_id.get(str(row.get("id") or ""))
    if not rag_metadata:
        return False
    return (
        _is_terminal_vectorization_status(rag_metadata.get("embedding_status"))
        or _is_terminal_vectorization_status(rag_metadata.get("parsing_status"))
    )


def _latest_job_metadata_by_document_id(job_rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    metadata_by_id: Dict[str, Dict[str, Any]] = {}
    for row in sorted(job_rows, key=lambda item: str(item.get("updated_at") or ""), reverse=True):
        document_id = str(row.get("source_document_id") or "")
        if not document_id or document_id in metadata_by_id:
            continue
        metadata = row.get("metadata")
        clean_metadata = metadata if isinstance(metadata, dict) else {}
        metadata_by_id[document_id] = {**clean_metadata, "_updated_at": row.get("updated_at")}
    return metadata_by_id


def _is_project_required_row(row: Dict[str, Any], job_metadata_by_id: Dict[str, Dict[str, Any]]) -> bool:
    if row.get("project_id") is not None:
        return True
    metadata = job_metadata_by_id.get(str(row.get("id") or "")) or {}
    if metadata.get("project_required") is True:
        return True
    if metadata.get("project_required") is False:
        return False
    applicability = str(metadata.get("project_applicability") or "")
    if applicability in {"internal_project", "multi_project_review", "not_project_applicable"}:
        return False
    if applicability in {"single_project", "project_assignment_review"}:
        return True
    return True


def _has_task_extraction_outcome(document_id: str, task_ids: set[str], job_metadata_by_id: Dict[str, Dict[str, Any]]) -> bool:
    if document_id in task_ids:
        return True
    metadata = job_metadata_by_id.get(document_id) or {}
    status = str(metadata.get("task_extraction_status") or "").strip().lower()
    return status in {"tasks_created", "no_actionable_tasks"}


def _load_recent_rag_lifecycle_alerts(app_client: Any) -> Dict[str, Any]:
    """Return lifecycle coverage and alerts for the minimum trusted RAG path.

    This deliberately duplicates the operator-facing source-sync matrix at the
    backend health layer so scheduled cron alerts do not depend on someone
    opening the admin page.
    """
    now = datetime.now(timezone.utc)
    cutoff = _iso(now - timedelta(hours=LIFECYCLE_LOOKBACK_HOURS))
    packet_cutoff = _iso(now - timedelta(hours=MAX_PACKET_AGE_HOURS))
    rag_client = get_rag_read_client()

    app_source_rows = (
        app_client.table("document_metadata")
        .select("id,title,source,category,type,status,project_id,source_item_id,fireflies_id,created_at,date,source_last_modified_at,deleted_at")
        .is_("deleted_at", "null")
        .gte("created_at", cutoff)
        .in_("source", ["fireflies", "microsoft_graph"])
        .order("created_at", desc=True)
        .limit(2000)
        .execute()
    ).data or []

    app_source_ids = {str(row.get("id")) for row in app_source_rows if row.get("id")}
    rag_email_source_rows = (
        rag_client.table("rag_document_metadata")
        .select("id,title,source,type,source_system,source_item_id,source_web_url,created_at,updated_at,project_id,parsing_status")
        .eq("source", "microsoft_graph")
        .in_("type", ["email", "email_attachment"])
        .gte("updated_at", cutoff)
        .order("updated_at", desc=True)
        .limit(2000)
        .execute()
    ).data or []
    rag_only_email_rows = [
        {
            "id": row.get("id"),
            "title": row.get("title"),
            "source": row.get("source"),
            "category": "email_attachment" if row.get("type") == "email_attachment" else "email",
            "type": row.get("type"),
            "status": row.get("parsing_status") or "raw_ingested",
            "project_id": row.get("project_id"),
            "source_item_id": row.get("source_item_id"),
            "fireflies_id": None,
            "created_at": row.get("created_at"),
            "date": row.get("created_at"),
            "source_last_modified_at": row.get("updated_at"),
            "deleted_at": None,
        }
        for row in rag_email_source_rows
        if row.get("id") and str(row.get("id")) not in app_source_ids
    ]

    source_rows = [*app_source_rows, *rag_only_email_rows]
    source_rows = [
        {**row, "family": _source_family(row)}
        for row in source_rows
        if _source_family(row)
    ]
    source_ids = [str(row.get("id")) for row in source_rows if row.get("id")]

    def _batched(values: List[str], size: int = 100) -> List[List[str]]:
        return [values[index:index + size] for index in range(0, len(values), size)]

    chunk_rows: List[Dict[str, Any]] = []
    task_rows: List[Dict[str, Any]] = []
    evidence_rows: List[Dict[str, Any]] = []
    rag_metadata_rows: List[Dict[str, Any]] = []
    job_rows: List[Dict[str, Any]] = []
    if source_ids:
        for batch in _batched(source_ids):
            rag_metadata_rows.extend((
                rag_client.table("rag_document_metadata")
                .select("id,embedding_status,parsing_status")
                .in_("id", batch)
                .limit(1000)
                .execute()
            ).data or [])
            job_rows.extend((
                rag_client.table("source_processing_jobs")
                .select("source_document_id,metadata,updated_at")
                .in_("source_document_id", batch)
                .order("updated_at", desc=True)
                .limit(1000)
                .execute()
            ).data or [])
            chunk_rows.extend((
                rag_client.table("document_chunks")
                .select("document_id,source_type,updated_at")
                .in_("document_id", batch)
                .not_.is_("embedding", "null")
                .limit(1000)
                .execute()
            ).data or [])
            task_rows.extend((
                app_client.table("tasks")
                .select("metadata_id,project_id,created_at")
                .in_("metadata_id", batch)
                .gte("created_at", cutoff)
                .limit(1000)
                .execute()
            ).data or [])
            evidence_rows.extend((
                app_client.table("insight_card_evidence")
                .select("source_document_id,created_at")
                .in_("source_document_id", batch)
                .gte("created_at", cutoff)
                .limit(1000)
                .execute()
            ).data or [])

    packet_rows = (
        app_client.table("intelligence_packets")
        .select("id,generated_at")
        .eq("packet_type", "current")
        .gte("generated_at", packet_cutoff)
        .order("generated_at", desc=True)
        .limit(100)
        .execute()
    ).data or []

    embedded_ids = {str(row.get("document_id")) for row in chunk_rows if row.get("document_id")}
    embedded_meeting_transcript_ids = {
        str(row.get("document_id"))
        for row in chunk_rows
        if row.get("document_id") and row.get("source_type") == "meeting_transcript"
    }
    rag_metadata_by_id = {
        str(row.get("id")): row
        for row in rag_metadata_rows
        if row.get("id")
    }
    job_metadata_by_id = _latest_job_metadata_by_document_id(job_rows)
    task_ids = {str(row.get("metadata_id")) for row in task_rows if row.get("metadata_id")}
    evidence_ids = {
        str(row.get("source_document_id"))
        for row in evidence_rows
        if row.get("source_document_id")
    }
    has_fresh_packets = bool(packet_rows)
    latest_packet_at = _newest([row.get("generated_at") for row in packet_rows])
    family_labels = {
        "meetings": "Meeting transcripts",
        "teams": "Teams messages",
        "emails": "Emails",
        "sharepoint": "SharePoint files",
    }
    family_summaries: List[Dict[str, Any]] = []
    lifecycle_alerts: List[Dict[str, Any]] = []

    for family, label in family_labels.items():
        rows = [row for row in source_rows if row.get("family") == family]
        ids = {str(row.get("id")) for row in rows if row.get("id")}
        total = len(rows)
        vectorization_excluded_rows = [
            row
            for row in rows
            if _is_terminal_vectorization_row(row, rag_metadata_by_id)
        ]
        vectorization_excluded_ids = {
            str(row.get("id"))
            for row in vectorization_excluded_rows
            if row.get("id")
        }
        vectorization_required_ids = ids - vectorization_excluded_ids
        project_required_ids = {
            str(row.get("id"))
            for row in rows
            if row.get("id")
            and str(row.get("id")) not in vectorization_excluded_ids
            and _is_project_required_row(row, job_metadata_by_id)
        }
        vectorized_ids = embedded_meeting_transcript_ids if family == "meetings" else embedded_ids
        vectorized_count = sum(1 for row_id in vectorization_required_ids if row_id in vectorized_ids)
        vectorized_message = (
            f"{vectorized_count}/{len(vectorization_required_ids)} Fireflies metadata rows have "
            "embedded meeting_transcript chunks and are searchable by the AI assistant."
            if family == "meetings"
            else f"{vectorized_count}/{len(vectorization_required_ids)} have embedded chunks and are searchable by the AI assistant."
        )
        stages = [
            {
                "stage": "synced",
                "count": total,
                "total": total,
                "status": "healthy" if total else "unknown",
                "owner": "source adapter",
                "latestAt": _newest([row.get("source_last_modified_at") or row.get("date") or row.get("created_at") for row in rows]),
            },
            {
                "stage": "vectorized",
                "count": vectorized_count,
                "total": len(vectorization_required_ids),
                "excluded": len(vectorization_excluded_ids),
                "owner": "RAG embedder",
                "latestAt": _newest([
                    row.get("updated_at")
                    for row in chunk_rows
                    if str(row.get("document_id")) in vectorization_required_ids
                    and (family != "meetings" or row.get("source_type") == "meeting_transcript")
                ]),
                "message": vectorized_message,
            },
            {
                "stage": "project_assigned",
                "count": sum(
                    1
                    for row in rows
                    if str(row.get("id")) in project_required_ids
                    and row.get("project_id") is not None
                ),
                "total": len(project_required_ids),
                "excluded": total - len(project_required_ids),
                "owner": "project attribution",
                "latestAt": _newest([row.get("created_at") for row in rows]),
            },
            {
                "stage": "tasks_extracted",
                "count": sum(
                    1
                    for row_id in project_required_ids
                    if _has_task_extraction_outcome(row_id, task_ids, job_metadata_by_id)
                ),
                "total": len(project_required_ids),
                "excluded": total - len(project_required_ids),
                "owner": "task extractor",
                "latestAt": _newest(
                    [row.get("created_at") for row in task_rows if str(row.get("metadata_id")) in project_required_ids]
                    + [
                        metadata.get("_updated_at")
                        for row_id, metadata in job_metadata_by_id.items()
                        if row_id in project_required_ids
                        and _has_task_extraction_outcome(row_id, task_ids, job_metadata_by_id)
                    ]
                ),
            },
            {
                "stage": "project_intelligence_updated",
                "count": sum(1 for row_id in project_required_ids if row_id in evidence_ids),
                "total": len(project_required_ids),
                "excluded": total - len(project_required_ids),
                "owner": "intelligence compiler",
                "latestAt": _newest([row.get("created_at") for row in evidence_rows if str(row.get("source_document_id")) in project_required_ids]) or latest_packet_at,
                "forceCritical": not has_fresh_packets,
            },
        ]

        for stage in stages:
            status = _coverage_status(int(stage["count"]), int(stage["total"]))
            if stage.get("forceCritical"):
                status = "critical"
            stage["status"] = status
            if status in {"warning", "critical"}:
                lifecycle_alerts.append(
                    _stage_alert(
                        family=family,
                        stage=str(stage["stage"]),
                        severity="critical" if status == "critical" else "warning",
                        count=int(stage["count"]),
                        total=int(stage["total"]),
                        owner=str(stage["owner"]),
                        latest_at=stage.get("latestAt"),
                        total_excluded=int(stage.get("excluded") or 0),
                        message=stage.get("message"),
                    )
                )

        family_summaries.append(
            {
                "family": family,
                "label": label,
                "totalSources": total,
                "stages": stages,
            }
        )

    return {
        "generatedAt": _iso(now),
        "lookbackHours": LIFECYCLE_LOOKBACK_HOURS,
        "maxPacketAgeHours": MAX_PACKET_AGE_HOURS,
        "status": "degraded" if lifecycle_alerts else "healthy",
        "sources": family_summaries,
        "alerts": lifecycle_alerts,
        "latestPacketAt": latest_packet_at,
    }


def _teams_alert_text(report: Dict[str, Any]) -> str:
    critical = report.get("criticalAlerts", [])
    warning = report.get("warningAlerts", [])
    lifecycle = report.get("ragLifecycle", {})
    lines = [
        "RAG pipeline health is degraded.",
        f"Checked: {report.get('generatedAt')}",
        f"Critical: {len(critical)} | Warning: {len(warning)}",
    ]
    latest_packet = lifecycle.get("latestPacketAt")
    if latest_packet:
        lines.append(f"Newest current Project Intelligence packet: {latest_packet}")
    lines.append("")
    lines.append("Top issues:")
    for alert in [*critical, *warning][:8]:
        lines.append(f"- [{alert.get('severity')}] {alert.get('message')}")
    return "\n".join(lines)


def _post_teams_alert(report: Dict[str, Any]) -> Dict[str, Any]:
    base_url = (
        os.getenv("NEXT_PUBLIC_APP_URL")
        or os.getenv("APP_BASE_URL")
        or "https://projects.alleatogroup.com"
    ).rstrip("/")
    service_key = os.getenv("NOTIFICATION_SERVICE_KEY")
    user_id = os.getenv("RAG_HEALTH_ALERT_TEAMS_USER_ID", DEFAULT_ALERT_TEAMS_USER_ID)
    if not service_key:
        return {"status": "blocked", "channel": "teams", "reason": "NOTIFICATION_SERVICE_KEY not set"}
    try:
        response = httpx.post(
            f"{base_url}/api/bot/proactive/teams",
            headers={"Authorization": f"Bearer {service_key}"},
            json={"userId": user_id, "message": _teams_alert_text(report)},
            timeout=15,
        )
        if response.status_code >= 400:
            return {
                "status": "failed",
                "channel": "teams",
                "httpStatus": response.status_code,
                "detail": response.text[:300],
            }
        payload = response.json()
        return {
            "status": "sent" if payload.get("sent") else "blocked",
            "channel": "teams",
            "detail": payload.get("reason") or "sent",
        }
    except Exception as exc:
        return {"status": "failed", "channel": "teams", "error": str(exc)}


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
    from src.services.ops.db_pressure_guard import enforce_app_db_pressure_guard

    enforce_app_db_pressure_guard("source_rag_health")

    supabase = get_supabase_client()
    health = get_source_sync_health(supabase)
    rag_lifecycle = _load_recent_rag_lifecycle_alerts(supabase)
    combined_alerts = [
        *health.get("alerts", []),
        *rag_lifecycle.get("alerts", []),
    ]

    snapshot_writes = 0
    for source in health.get("sources", [])[:25]:
        update_source_health_snapshot(supabase, source)
        snapshot_writes += 1

    alert_result = persist_source_sync_alerts(supabase, combined_alerts)

    watched_alerts: List[Dict[str, Any]] = [
        alert
        for alert in combined_alerts
        if str(alert.get("source") or "") in WATCHED_SOURCES
        or str(alert.get("source") or "") in {"meetings", "teams", "emails", "sharepoint"}
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
        "ragLifecycle": rag_lifecycle,
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
        report["notification"] = _post_teams_alert(report)
        try:
            report["remediation"] = _trigger_remediation_task(report)
        except Exception as exc:
            report["remediation"] = {"triggered": False, "error": str(exc)}
    elif report["passed"]:
        report["notification"] = {"status": "skipped", "channel": "teams", "reason": "health passed"}

    return report


def main() -> int:
    report = run_source_rag_health_check()
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report.get("passed") else 1


if __name__ == "__main__":
    sys.exit(main())
