"""Source sync and intelligence health aggregation.

This service intentionally reads from the existing ingestion tables first. The
new health tables provide a durable run ledger, but the admin status endpoint
must still explain the current system even before every producer is wired.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


STALE_SYNC_MINUTES = 120
STALE_FIREFLIES_MINUTES = 240
STALE_EXTRACTION_MINUTES = 24 * 60
EMBEDDING_BACKLOG_WARNING = 25
COMPILER_BACKLOG_WARNING = 25
FAILED_JOB_WARNING = 1
DOCUMENT_HEALTH_SAMPLE_LIMIT = 2500
CHUNK_HEALTH_SAMPLE_LIMIT = 5000
JOB_HEALTH_SAMPLE_LIMIT = 5000
MAX_RETURNED_SOURCES = 80
MAX_RETURNED_ALERTS = 80
MAX_RETURNED_STUCK_ITEMS = 25
MAX_RECOMPUTE_SNAPSHOT_WRITES = 25
MAX_RECOMPUTE_ALERT_WRITES = 25
ALERT_TEXT_LIMIT = 1200
ALERT_RESOURCE_ID_LIMIT = 500

GRAPH_SOURCE_LABELS = {
    "outlook_email": "Outlook email",
    "teams_message": "Teams channel messages",
    "teams_chat_export": "Teams direct messages",
    "onedrive_file": "OneDrive documents",
    "sharepoint_file": "SharePoint documents",
}

DOCUMENT_SOURCE_LABELS = {
    "fireflies": "Fireflies meetings",
    "microsoft_graph": "Microsoft Graph documents",
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _single_row(response: Any) -> Optional[Dict[str, Any]]:
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def _limit_text(value: Any, limit: int = ALERT_TEXT_LIMIT) -> str:
    text = str(value or "")
    if len(text) <= limit:
        return text
    if limit <= 3:
        return text[:limit]
    return f"{text[:limit - 3]}..."


def _alert_metadata(alert: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "detected_at": alert.get("detectedAt"),
        "code": _limit_text(alert.get("code"), 120),
        "source": _limit_text(alert.get("source"), 120),
        "resourceId": _limit_text(alert.get("resourceId"), ALERT_RESOURCE_ID_LIMIT),
        "severity": _alert_severity(alert),
    }


def _parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str):
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _age_minutes(value: Optional[datetime], now: datetime) -> Optional[int]:
    if not value:
        return None
    return max(0, int((now - value).total_seconds() // 60))


def _table_rows(
    supabase: Any,
    table: str,
    columns: str = "*",
    *,
    limit: int = 10000,
    order_by: Optional[str] = None,
    desc: bool = False,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    page_size = min(limit or 1000, 1000)
    offset = 0

    while True:
        query = supabase.table(table).select(columns)
        if order_by:
            query = query.order(order_by, desc=desc)
        if hasattr(query, "range"):
            query = query.range(offset, offset + page_size - 1)
        elif limit:
            query = query.limit(limit)
        response = query.execute()
        data = response.data or []
        rows.extend(dict(row) for row in data)
        if not hasattr(query, "range") or len(data) < page_size or (limit and len(rows) >= limit):
            break
        offset += page_size

    return rows[:limit] if limit else rows


def _sorted_sources(sources: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    status_rank = {"critical": 0, "warning": 1, "unknown": 2, "healthy": 3}
    return sorted(
        sources,
        key=lambda source: (
            status_rank.get(str(source.get("status")), 4),
            source.get("source") or "",
            source.get("resourceName") or "",
        ),
    )


def _limited_rows(rows: Sequence[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    return list(rows[:limit])


def _counter(rows: Iterable[Dict[str, Any]], key: str, fallback: str = "unknown") -> Dict[str, int]:
    counts: Counter[str] = Counter()
    for row in rows:
        value = row.get(key) or fallback
        counts[str(value)] += 1
    return dict(counts)


def _source_key(document: Dict[str, Any]) -> str:
    category = document.get("category") or document.get("type")
    source_system = document.get("source_system") or document.get("source")
    if category in GRAPH_SOURCE_LABELS:
        return str(category)
    if source_system == "fireflies" or document.get("fireflies_id"):
        return "fireflies"
    if source_system in {"microsoft_graph", "graph"}:
        return "microsoft_graph"
    return str(source_system or category or "unknown")


def _source_name(source: str, resource_name: Optional[str] = None) -> str:
    if resource_name:
        return resource_name
    return GRAPH_SOURCE_LABELS.get(source) or DOCUMENT_SOURCE_LABELS.get(source) or source.replace("_", " ").title()


def _health_status(
    *,
    stale_minutes: Optional[int],
    stale_threshold: int,
    last_error: Optional[str],
    unprocessed: int = 0,
    unembedded: int = 0,
    uncompiled: int = 0,
) -> str:
    if last_error:
        return "critical"
    if stale_minutes is None:
        return "unknown"
    if stale_minutes > stale_threshold * 2:
        return "critical"
    if (
        stale_minutes > stale_threshold
        or unembedded >= EMBEDDING_BACKLOG_WARNING
        or uncompiled >= COMPILER_BACKLOG_WARNING
        or unprocessed > 0
    ):
        return "warning"
    return "healthy"


def _source_row(
    *,
    source: str,
    resource_id: str,
    resource_name: Optional[str],
    status: str,
    last_sync_at: Optional[datetime],
    last_success_at: Optional[datetime],
    last_error_at: Optional[datetime],
    last_error_message: Optional[str],
    items_synced: int,
    stale_minutes: Optional[int],
    unprocessed_count: int,
    unembedded_count: int,
    uncompiled_count: int,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "source": source,
        "resourceId": resource_id,
        "resourceName": _source_name(source, resource_name),
        "status": status,
        "lastSyncAt": _iso(last_sync_at),
        "lastSuccessAt": _iso(last_success_at),
        "lastErrorAt": _iso(last_error_at),
        "lastErrorMessage": last_error_message,
        "itemsSynced": items_synced,
        "staleMinutes": stale_minutes,
        "unprocessedCount": unprocessed_count,
        "unembeddedCount": unembedded_count,
        "uncompiledCount": uncompiled_count,
        "metadata": metadata or {},
    }


def record_sync_run(
    supabase: Any,
    *,
    source: str,
    stage: str,
    status: str,
    resource_id: str = "default",
    resource_name: Optional[str] = None,
    started_at: Optional[datetime] = None,
    finished_at: Optional[datetime] = None,
    items_seen: int = 0,
    items_synced: int = 0,
    items_created: int = 0,
    items_updated: int = 0,
    items_skipped: int = 0,
    items_failed: int = 0,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    payload = {
        "source": source,
        "resource_id": resource_id,
        "resource_name": resource_name,
        "stage": stage,
        "status": status,
        "started_at": _iso(started_at or _utcnow()),
        "finished_at": _iso(finished_at),
        "items_seen": items_seen,
        "items_synced": items_synced,
        "items_created": items_created,
        "items_updated": items_updated,
        "items_skipped": items_skipped,
        "items_failed": items_failed,
        "error_code": error_code,
        "error_message": error_message,
        "metadata": metadata or {},
    }
    response = supabase.table("source_sync_runs").insert(payload).execute()
    rows = response.data or []
    return dict(rows[0]) if rows else payload


def update_source_health_snapshot(
    supabase: Any,
    source_health: Dict[str, Any],
) -> Dict[str, Any]:
    payload = {
        "source": source_health["source"],
        "resource_id": source_health["resourceId"],
        "resource_name": source_health["resourceName"],
        "status": source_health["status"],
        "last_sync_at": source_health.get("lastSyncAt"),
        "last_success_at": source_health.get("lastSuccessAt"),
        "last_error_at": source_health.get("lastErrorAt"),
        "last_error_message": source_health.get("lastErrorMessage"),
        "items_synced": source_health.get("itemsSynced", 0),
        "unprocessed_count": source_health.get("unprocessedCount", 0),
        "unembedded_count": source_health.get("unembeddedCount", 0),
        "uncompiled_count": source_health.get("uncompiledCount", 0),
        "stale_minutes": source_health.get("staleMinutes"),
        "metadata": source_health.get("metadata") or {},
        "generated_at": _iso(_utcnow()),
    }
    response = (
        supabase.table("source_sync_health_snapshots")
        .upsert(payload, on_conflict="source,resource_id")
        .execute()
    )
    rows = response.data or []
    return dict(rows[0]) if rows else payload


def detect_source_sync_alerts(
    sources: Sequence[Dict[str, Any]],
    pipeline: Dict[str, Dict[str, int]],
    now: datetime,
) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    for source in sources:
        if source["status"] in {"critical", "warning", "unknown"}:
            severity = "critical" if source["status"] == "critical" else "warning"
            reason = source.get("lastErrorMessage")
            if not reason and source.get("staleMinutes") is not None:
                reason = f"Last sync is {source['staleMinutes']} minutes old."
            if not reason:
                reason = "No successful sync timestamp is available."
            if source.get("lastErrorMessage"):
                code = "source_sync_error"
            elif source.get("staleMinutes") is not None:
                code = "source_sync_stale"
            elif source["source"] == "task_extraction":
                code = "task_extraction_stale"
            else:
                code = f"source_sync_{source['status']}"
            alerts.append(
                {
                    "severity": severity,
                    "code": code,
                    "source": source["source"],
                    "resourceId": source["resourceId"],
                    "message": f"{source['resourceName']}: {reason}",
                    "detectedAt": _iso(now),
                }
            )

    unembedded_total = sum(pipeline.get("unembeddedBySource", {}).values())
    if unembedded_total >= EMBEDDING_BACKLOG_WARNING:
        alerts.append(
            {
                "severity": "warning",
                "code": "embedding_backlog",
                "source": "vectorization",
                "resourceId": "document_chunks",
                "message": f"{unembedded_total} ingested documents do not have chunks yet.",
                "detectedAt": _iso(now),
            }
        )

    compiler_backlog = sum(
        count
        for status, count in pipeline.get("sourceJobsByStatus", {}).items()
        if status in {"queued", "running", "failed"}
    )
    if compiler_backlog >= COMPILER_BACKLOG_WARNING:
        alerts.append(
            {
                "severity": "warning",
                "code": "compiler_backlog",
                "source": "intelligence_compiler",
                "resourceId": "source_intelligence_jobs",
                "message": f"{compiler_backlog} compiler jobs are queued, running, or failed.",
                "detectedAt": _iso(now),
            }
        )

    failed_packet_jobs = pipeline.get("packetJobsByStatus", {}).get("failed", 0)
    if failed_packet_jobs >= FAILED_JOB_WARNING:
        alerts.append(
            {
                "severity": "warning",
                "code": "packet_refresh_failed",
                "source": "intelligence_compiler",
                "resourceId": "packet_refresh_jobs",
                "message": f"{failed_packet_jobs} packet refresh job(s) failed.",
                "detectedAt": _iso(now),
            }
        )

    graph_subscription_statuses = pipeline.get("graphSubscriptionsByStatus", {})
    removed_subscriptions = graph_subscription_statuses.get("removed", 0) + graph_subscription_statuses.get("missed", 0)
    if removed_subscriptions:
        alerts.append(
            {
                "severity": "critical",
                "code": "graph_subscription_removed",
                "source": "microsoft_graph",
                "resourceId": "graph_subscriptions",
                "message": f"{removed_subscriptions} Graph subscription(s) were removed or missed notifications.",
                "detectedAt": _iso(now),
            }
        )
    expiring_subscriptions = graph_subscription_statuses.get("renewal_due", 0)
    if expiring_subscriptions:
        alerts.append(
            {
                "severity": "warning",
                "code": "graph_subscription_expiring",
                "source": "microsoft_graph",
                "resourceId": "graph_subscriptions",
                "message": f"{expiring_subscriptions} Graph subscription(s) require renewal or reauthorization.",
                "detectedAt": _iso(now),
            }
        )

    return alerts


def _alert_key(alert: Dict[str, Any]) -> str:
    return "source_sync:{code}:{source}:{resource}".format(
        code=str(alert.get("code") or "unknown"),
        source=str(alert.get("source") or "unknown"),
        resource=str(alert.get("resourceId") or ""),
    )


def _alert_severity(alert: Dict[str, Any]) -> str:
    severity = str(alert.get("severity") or "warning").lower()
    return severity if severity in {"info", "warning", "critical"} else "warning"


def persist_source_sync_alerts(
    supabase: Any,
    alerts: Sequence[Dict[str, Any]],
    *,
    resolve_missing: bool = True,
) -> Dict[str, int]:
    """Upsert active source-sync alerts and resolve alerts that disappeared."""
    now = _utcnow().isoformat()
    active_keys = {_alert_key(alert) for alert in alerts}
    upserted = 0
    resolved = 0

    for alert in alerts:
        alert_key = _alert_key(alert)
        payload = {
            "alert_key": alert_key,
            "category": "source_sync",
            "code": _limit_text(alert.get("code") or "source_sync_alert", 120),
            "severity": _alert_severity(alert),
            "source": _limit_text(alert.get("source") or "unknown", 120),
            "resource_id": _limit_text(alert.get("resourceId") or "", ALERT_RESOURCE_ID_LIMIT),
            "title": _limit_text(str(alert.get("code") or "Source sync alert").replace("_", " ").title(), 180),
            "message": _limit_text(alert.get("message") or "Source sync alert detected."),
            "status": "active",
            "last_seen_at": now,
            "resolved_at": None,
            "metadata": _alert_metadata(alert),
        }
        existing = _single_row(
            supabase.table("system_alerts")
            .select("id,first_seen_at")
            .eq("alert_key", alert_key)
            .limit(1)
            .execute()
        )
        if existing and existing.get("first_seen_at"):
            payload["first_seen_at"] = existing["first_seen_at"]
        else:
            payload["first_seen_at"] = now
        supabase.table("system_alerts").upsert(payload, on_conflict="alert_key").execute()
        upserted += 1

    if resolve_missing:
        existing_active = (
            supabase.table("system_alerts")
            .select("id,alert_key")
            .eq("category", "source_sync")
            .eq("status", "active")
            .limit(1000)
            .execute()
        )
        for row in existing_active.data or []:
            if row.get("alert_key") in active_keys:
                continue
            supabase.table("system_alerts").update(
                {"status": "resolved", "resolved_at": now, "last_seen_at": now}
            ).eq("id", row["id"]).execute()
            resolved += 1

    return {"upserted": upserted, "resolved": resolved}


def _document_health(
    documents: Sequence[Dict[str, Any]],
    chunk_document_ids: set[str],
    compiled_document_ids: set[str],
    now: datetime,
) -> Tuple[Dict[str, Dict[str, int]], List[Dict[str, Any]]]:
    source_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    latest_by_source: Dict[str, datetime] = {}

    for document in documents:
        source = _source_key(document)
        source_counts[source]["total"] += 1
        status = str(document.get("status") or "unknown")
        source_counts[source][f"status:{status}"] += 1
        document_id = str(document.get("id"))
        if document_id not in chunk_document_ids:
            source_counts[source]["unembedded"] += 1
        if document_id not in compiled_document_ids:
            source_counts[source]["uncompiled"] += 1
        captured = (
            _parse_datetime(document.get("captured_at"))
            or _parse_datetime(document.get("date"))
            or _parse_datetime(document.get("source_last_modified_at"))
            or _parse_datetime(document.get("created_at"))
        )
        if captured and (source not in latest_by_source or captured > latest_by_source[source]):
            latest_by_source[source] = captured

    rows: List[Dict[str, Any]] = []
    for source, counts in source_counts.items():
        if source in GRAPH_SOURCE_LABELS or source in DOCUMENT_SOURCE_LABELS:
            last_seen = latest_by_source.get(source)
            stale_threshold = STALE_FIREFLIES_MINUTES if source == "fireflies" else STALE_SYNC_MINUTES
            stale = _age_minutes(last_seen, now)
            rows.append(
                _source_row(
                    source=source,
                    resource_id="document_metadata",
                    resource_name=_source_name(source),
                    status=_health_status(
                        stale_minutes=stale,
                        stale_threshold=stale_threshold,
                        last_error=None,
                        unembedded=counts.get("unembedded", 0),
                        uncompiled=counts.get("uncompiled", 0),
                    ),
                    last_sync_at=last_seen,
                    last_success_at=last_seen,
                    last_error_at=None,
                    last_error_message=None,
                    items_synced=counts.get("total", 0),
                    stale_minutes=stale,
                    unprocessed_count=counts.get("status:uploaded", 0),
                    unembedded_count=counts.get("unembedded", 0),
                    uncompiled_count=counts.get("uncompiled", 0),
                    metadata={"source": "document_metadata"},
                )
            )
    return {key: dict(value) for key, value in source_counts.items()}, rows


def _recent_run_rows(sync_runs: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for run in sync_runs[:20]:
        rows.append(
            {
                "id": str(run.get("id") or ""),
                "source": str(run.get("source") or "unknown"),
                "stage": str(run.get("stage") or "unknown"),
                "status": str(run.get("status") or "unknown"),
                "resourceId": str(run.get("resource_id") or "default"),
                "resourceName": run.get("resource_name"),
                "startedAt": run.get("started_at"),
                "finishedAt": run.get("finished_at"),
                "itemsSeen": int(run.get("items_seen") or 0),
                "itemsSynced": int(run.get("items_synced") or 0),
                "itemsFailed": int(run.get("items_failed") or 0),
                "errorCode": run.get("error_code"),
                "errorMessage": run.get("error_message"),
                "metadata": run.get("metadata") or {},
            }
        )
    return rows


def _stuck_item_rows(
    fireflies_jobs: Sequence[Dict[str, Any]],
    documents: Sequence[Dict[str, Any]],
    now: datetime,
) -> List[Dict[str, Any]]:
    document_by_id = {str(row.get("id")): row for row in documents if row.get("id")}
    stuck: List[Dict[str, Any]] = []
    stuck_stages = {"pending", "raw_ingested", "segmented", "chunked", "embedded", "structured_extracted", "error"}

    for job in fireflies_jobs:
        stage = str(job.get("stage") or "unknown")
        if stage not in stuck_stages:
            continue
        updated_at = _parse_datetime(job.get("updated_at")) or _parse_datetime(job.get("last_attempt_at"))
        age = _age_minutes(updated_at, now)
        if stage != "error" and (age is None or age < STALE_FIREFLIES_MINUTES):
            continue

        metadata_id = str(job.get("metadata_id") or "")
        document = document_by_id.get(metadata_id, {})
        error_message = job.get("error_message")
        is_non_vectorizable = isinstance(error_message, str) and error_message.startswith("NON_VECTORIZABLE")
        stuck.append(
            {
                "source": "fireflies",
                "resourceId": metadata_id or str(job.get("fireflies_id") or ""),
                "resourceName": document.get("title") or job.get("fireflies_id") or metadata_id or "Fireflies item",
                "stage": stage,
                "status": "not_vectorizable" if is_non_vectorizable else "failed" if stage == "error" else "stale",
                "ageMinutes": age,
                "lastAttemptAt": job.get("last_attempt_at") or job.get("updated_at"),
                "errorMessage": error_message,
                "metadata": {
                    "firefliesId": job.get("fireflies_id"),
                    "metadataId": metadata_id or None,
                    "documentStatus": document.get("status"),
                    "documentType": document.get("type"),
                    "documentCategory": document.get("category"),
                    "projectId": document.get("project_id"),
                    "documentUrl": document.get("url"),
                },
            }
        )

    stuck.sort(
        key=lambda row: (
            row["status"] != "failed",
            -(row.get("ageMinutes") or 0),
            str(row.get("resourceName") or ""),
        )
    )
    return stuck[:25]


def get_source_sync_health(supabase: Any) -> Dict[str, Any]:
    now = _utcnow()

    graph_states = _table_rows(
        supabase,
        "graph_sync_state",
        "source,resource_id,resource_name,last_sync_at,sync_status,error_message,items_synced,updated_at",
        order_by="last_sync_at",
        desc=True,
    )
    documents = _table_rows(
        supabase,
        "document_metadata",
        "id,title,url,source,source_system,category,type,status,captured_at,date,created_at,source_last_modified_at,fireflies_id,project_id",
        limit=DOCUMENT_HEALTH_SAMPLE_LIMIT,
    )
    chunks = _table_rows(
        supabase,
        "document_chunks",
        "document_id,chunk_id",
        limit=CHUNK_HEALTH_SAMPLE_LIMIT,
    )
    fireflies_jobs = _table_rows(
        supabase,
        "fireflies_ingestion_jobs",
        "fireflies_id,stage,error_message,last_attempt_at,updated_at,metadata_id",
        limit=JOB_HEALTH_SAMPLE_LIMIT,
    )
    source_jobs = _table_rows(
        supabase,
        "source_intelligence_jobs",
        "status,source_document_id,last_error,queued_at,started_at,finished_at,updated_at",
        limit=JOB_HEALTH_SAMPLE_LIMIT,
    )
    packet_jobs = _table_rows(
        supabase,
        "packet_refresh_jobs",
        "status,last_error,queued_at,started_at,finished_at,updated_at",
    )
    tasks = _table_rows(
        supabase,
        "tasks",
        "id,metadata_id,source_system,extraction_source,created_at,updated_at",
    )
    snapshots = _table_rows(
        supabase,
        "source_sync_health_snapshots",
        "source,resource_id,resource_name,status,last_sync_at,last_success_at,last_error_at,last_error_message,items_synced,unprocessed_count,unembedded_count,uncompiled_count,stale_minutes,metadata",
    )
    subscriptions = _table_rows(
        supabase,
        "graph_subscriptions",
        "source,resource_id,resource_name,status,expiration_at,last_notification_at,last_error_message",
    )
    sync_runs = _table_rows(
        supabase,
        "source_sync_runs",
        "id,source,resource_id,resource_name,stage,status,started_at,finished_at,items_seen,items_synced,items_failed,error_code,error_message,metadata",
        limit=50,
        order_by="started_at",
        desc=True,
    )

    chunk_document_ids = {str(row.get("document_id")) for row in chunks if row.get("document_id")}
    compiled_document_ids = {
        str(row.get("source_document_id"))
        for row in source_jobs
        if row.get("source_document_id") and row.get("status") in {"succeeded", "skipped"}
    }

    document_counts, document_sources = _document_health(
        documents,
        chunk_document_ids,
        compiled_document_ids,
        now,
    )

    sources: List[Dict[str, Any]] = []
    for state in graph_states:
        last_sync = _parse_datetime(state.get("last_sync_at"))
        last_error = state.get("error_message") if state.get("sync_status") == "error" else None
        stale = _age_minutes(last_sync, now)
        source = str(state.get("source") or "microsoft_graph")
        sources.append(
            _source_row(
                source=source,
                resource_id=str(state.get("resource_id") or "default"),
                resource_name=state.get("resource_name"),
                status=_health_status(
                    stale_minutes=stale,
                    stale_threshold=STALE_SYNC_MINUTES,
                    last_error=last_error,
                    unembedded=document_counts.get(source, {}).get("unembedded", 0),
                    uncompiled=document_counts.get(source, {}).get("uncompiled", 0),
                ),
                last_sync_at=last_sync,
                last_success_at=last_sync if not last_error else None,
                last_error_at=_parse_datetime(state.get("updated_at")) if last_error else None,
                last_error_message=last_error,
                items_synced=int(state.get("items_synced") or 0),
                stale_minutes=stale,
                unprocessed_count=document_counts.get(source, {}).get("status:uploaded", 0),
                unembedded_count=document_counts.get(source, {}).get("unembedded", 0),
                uncompiled_count=document_counts.get(source, {}).get("uncompiled", 0),
                metadata={"syncStatus": state.get("sync_status")},
            )
        )

    sources.extend(document_sources)

    latest_fireflies = max(
        (
            parsed
            for parsed in (_parse_datetime(row.get("updated_at")) for row in fireflies_jobs)
            if parsed
        ),
        default=None,
    )
    if fireflies_jobs and not any(row["source"] == "fireflies" for row in sources):
        fireflies_errors = [row.get("error_message") for row in fireflies_jobs if row.get("error_message")]
        stale = _age_minutes(latest_fireflies, now)
        sources.append(
            _source_row(
                source="fireflies",
                resource_id="fireflies_ingestion_jobs",
                resource_name="Fireflies meetings",
                status=_health_status(
                    stale_minutes=stale,
                    stale_threshold=STALE_FIREFLIES_MINUTES,
                    last_error=fireflies_errors[0] if fireflies_errors else None,
                ),
                last_sync_at=latest_fireflies,
                last_success_at=latest_fireflies if not fireflies_errors else None,
                last_error_at=latest_fireflies if fireflies_errors else None,
                last_error_message=fireflies_errors[0] if fireflies_errors else None,
                items_synced=len(fireflies_jobs),
                stale_minutes=stale,
                unprocessed_count=sum(1 for row in fireflies_jobs if row.get("stage") != "complete"),
                unembedded_count=document_counts.get("fireflies", {}).get("unembedded", 0),
                uncompiled_count=document_counts.get("fireflies", {}).get("uncompiled", 0),
                metadata={"source": "fireflies_ingestion_jobs"},
            )
        )

    if tasks:
        latest_task = max(
            (
                parsed
                for parsed in (_parse_datetime(row.get("updated_at")) for row in tasks)
                if parsed
            ),
            default=None,
        )
        stale = _age_minutes(latest_task, now)
        sources.append(
            _source_row(
                source="task_extraction",
                resource_id="tasks",
                resource_name="Task extraction",
                status=_health_status(
                    stale_minutes=stale,
                    stale_threshold=STALE_EXTRACTION_MINUTES,
                    last_error=None,
                ),
                last_sync_at=latest_task,
                last_success_at=latest_task,
                last_error_at=None,
                last_error_message=None,
                items_synced=len(tasks),
                stale_minutes=stale,
                unprocessed_count=0,
                unembedded_count=0,
                uncompiled_count=0,
                metadata={"source": "tasks.updated_at"},
            )
        )

    for snapshot in snapshots:
        snapshot_source = str(snapshot.get("source") or "unknown")
        snapshot_resource = str(snapshot.get("resource_id") or "default")
        if any(
            row["source"] == snapshot_source and row["resourceId"] == snapshot_resource
            for row in sources
        ):
            continue
        sources.append(
            _source_row(
                source=snapshot_source,
                resource_id=snapshot_resource,
                resource_name=snapshot.get("resource_name"),
                status=str(snapshot.get("status") or "unknown"),
                last_sync_at=_parse_datetime(snapshot.get("last_sync_at")),
                last_success_at=_parse_datetime(snapshot.get("last_success_at")),
                last_error_at=_parse_datetime(snapshot.get("last_error_at")),
                last_error_message=snapshot.get("last_error_message"),
                items_synced=int(snapshot.get("items_synced") or 0),
                stale_minutes=snapshot.get("stale_minutes"),
                unprocessed_count=int(snapshot.get("unprocessed_count") or 0),
                unembedded_count=int(snapshot.get("unembedded_count") or 0),
                uncompiled_count=int(snapshot.get("uncompiled_count") or 0),
                metadata=snapshot.get("metadata") or {},
            )
        )

    pipeline = {
        "documentMetadataBySource": _counter(documents, "source_system"),
        "documentMetadataByCategory": _counter(documents, "category"),
        "documentMetadataByStatus": _counter(documents, "status"),
        "unembeddedBySource": {
            source: counts.get("unembedded", 0)
            for source, counts in document_counts.items()
            if counts.get("unembedded", 0) > 0
        },
        "uncompiledBySource": {
            source: counts.get("uncompiled", 0)
            for source, counts in document_counts.items()
            if counts.get("uncompiled", 0) > 0
        },
        "firefliesJobsByStage": _counter(fireflies_jobs, "stage"),
        "sourceJobsByStatus": _counter(source_jobs, "status"),
        "packetJobsByStatus": _counter(packet_jobs, "status"),
        "tasksBySourceSystem": _counter(tasks, "source_system"),
        "graphSubscriptionsByStatus": _counter(subscriptions, "status"),
    }

    alerts = detect_source_sync_alerts(sources, pipeline, now)
    stuck_items = _stuck_item_rows(fireflies_jobs, documents, now)
    sorted_sources = _sorted_sources(sources)
    unhealthy = any(source["status"] in {"warning", "critical", "unknown"} for source in sources)
    status = "degraded" if unhealthy or alerts else "healthy"

    return {
        "status": status,
        "healthy": status == "healthy",
        "generatedAt": _iso(now),
        "thresholds": {
            "staleSyncMinutes": STALE_SYNC_MINUTES,
            "staleFirefliesMinutes": STALE_FIREFLIES_MINUTES,
            "staleExtractionMinutes": STALE_EXTRACTION_MINUTES,
            "embeddingBacklogWarning": EMBEDDING_BACKLOG_WARNING,
            "compilerBacklogWarning": COMPILER_BACKLOG_WARNING,
            "failedJobWarning": FAILED_JOB_WARNING,
            "documentHealthSampleLimit": DOCUMENT_HEALTH_SAMPLE_LIMIT,
            "chunkHealthSampleLimit": CHUNK_HEALTH_SAMPLE_LIMIT,
            "jobHealthSampleLimit": JOB_HEALTH_SAMPLE_LIMIT,
            "maxReturnedSources": MAX_RETURNED_SOURCES,
            "maxReturnedAlerts": MAX_RETURNED_ALERTS,
            "maxReturnedStuckItems": MAX_RETURNED_STUCK_ITEMS,
        },
        "sources": _limited_rows(sorted_sources, MAX_RETURNED_SOURCES),
        "pipeline": pipeline,
        "alerts": _limited_rows(alerts, MAX_RETURNED_ALERTS),
        "recentRuns": _recent_run_rows(sync_runs),
        "stuckItems": _limited_rows(stuck_items, MAX_RETURNED_STUCK_ITEMS),
        "counts": {
            "sources": len(sources),
            "alerts": len(alerts),
            "documents": len(documents),
            "chunks": len(chunks),
            "unembedded": sum(pipeline["unembeddedBySource"].values()),
            "uncompiled": sum(pipeline["uncompiledBySource"].values()),
            "tasks": len(tasks),
            "graphSubscriptions": len(subscriptions),
            "stuckItems": len(stuck_items),
        },
    }
