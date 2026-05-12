from datetime import datetime, timedelta, timezone

from src.services.health.source_sync_health import (
    get_source_sync_health,
    persist_source_sync_alerts,
    record_sync_run,
    update_sync_run,
)


class _Result:
    def __init__(self, data):
        self.data = data


class _TableQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.rows = list(db.tables.setdefault(table_name, []))
        self.action = "select"
        self.payload = None
        self.limit_count = None

    def select(self, *_args):
        self.action = "select"
        return self

    def insert(self, payload):
        self.action = "insert"
        self.payload = payload
        return self

    def upsert(self, payload, **_kwargs):
        self.action = "upsert"
        self.payload = payload
        return self

    def update(self, payload):
        self.action = "update"
        self.payload = payload
        return self

    def eq(self, key, value):
        self.rows = [row for row in self.rows if row.get(key) == value]
        return self

    def in_(self, key, values):
        allowed = set(values)
        self.rows = [row for row in self.rows if row.get(key) in allowed]
        return self

    def order(self, key, desc=False):
        self.rows = sorted(self.rows, key=lambda row: row.get(key) or "", reverse=desc)
        return self

    def limit(self, value):
        self.limit_count = value
        return self

    def execute(self):
        table = self.db.tables.setdefault(self.table_name, [])
        if self.action == "insert":
            row = dict(self.payload)
            row.setdefault("id", self.db.next_id(self.table_name))
            table.append(row)
            return _Result([row])
        if self.action == "upsert":
            for row in table:
                if row.get("alert_key") == self.payload.get("alert_key"):
                    row.update(self.payload)
                    return _Result([dict(row)])
            row = dict(self.payload)
            row.setdefault("id", self.db.next_id(self.table_name))
            table.append(row)
            return _Result([row])
        if self.action == "update":
            updated = []
            matching_ids = {id(row) for row in self.rows}
            for row in table:
                if id(row) in matching_ids:
                    row.update(self.payload)
                    updated.append(dict(row))
            return _Result(updated)
        rows = self.rows[: self.limit_count] if self.limit_count is not None else self.rows
        return _Result([dict(row) for row in rows])


class _FakeSupabase:
    def __init__(self):
        self.tables = {}
        self.counters = {}

    def table(self, table_name):
        return _TableQuery(self, table_name)

    def next_id(self, table_name):
        self.counters[table_name] = self.counters.get(table_name, 0) + 1
        return f"{table_name}-{self.counters[table_name]}"


def _seed_empty_tables(supabase):
    for table in [
        "graph_sync_state",
        "document_metadata",
        "document_chunks",
        "fireflies_ingestion_jobs",
        "source_intelligence_jobs",
        "packet_refresh_jobs",
        "tasks",
        "source_sync_health_snapshots",
        "source_sync_runs",
        "graph_subscriptions",
        "project_documents",
        "system_alerts",
    ]:
        supabase.tables.setdefault(table, [])


def test_record_sync_run_writes_loud_run_ledger_row():
    supabase = _FakeSupabase()

    row = record_sync_run(
        supabase,
        source="outlook_email",
        resource_id="brandon@example.com",
        stage="source_sync",
        status="failed",
        items_seen=3,
        items_failed=1,
        error_code="GRAPH_THROTTLED",
        error_message="Graph returned 429.",
    )

    assert row["source"] == "outlook_email"
    assert row["resource_id"] == "brandon@example.com"
    assert row["stage"] == "source_sync"
    assert row["status"] == "failed"
    assert row["items_failed"] == 1
    assert row["error_message"] == "Graph returned 429."
    assert len(supabase.tables["source_sync_runs"]) == 1


def test_update_sync_run_finishes_existing_running_row():
    supabase = _FakeSupabase()
    started = datetime.now(timezone.utc)
    row = record_sync_run(
        supabase,
        source="fireflies",
        resource_id="fireflies_ingestion_jobs",
        stage="vectorization",
        status="running",
        started_at=started,
        items_seen=10,
    )

    updated = update_sync_run(
        supabase,
        row["id"],
        status="warning",
        items_seen=10,
        items_synced=8,
        items_skipped=2,
        items_failed=0,
        error_code="FIREFLIES_BACKLOG_NON_VECTORIZABLE",
        error_message="2 Fireflies backlog jobs marked non-vectorizable",
    )

    assert updated["id"] == row["id"]
    assert updated["status"] == "warning"
    assert updated["items_synced"] == 8
    assert updated["items_skipped"] == 2
    assert updated["finished_at"]
    assert len(supabase.tables["source_sync_runs"]) == 1


def test_get_source_sync_health_surfaces_stale_graph_and_vector_backlog():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)
    old = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
    recent = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    supabase.tables["graph_sync_state"] = [
        {
            "source": "outlook_email",
            "resource_id": "brandon@example.com",
            "resource_name": "Brandon mailbox",
            "last_sync_at": old,
            "sync_status": "success",
            "error_message": None,
            "items_synced": 4,
            "updated_at": old,
        }
    ]
    supabase.tables["document_metadata"] = [
        {
            "id": "doc-1",
            "source_system": "microsoft_graph",
            "category": "outlook_email",
            "status": "uploaded",
            "created_at": recent,
        },
        {
            "id": "doc-2",
            "source_system": "microsoft_graph",
            "category": "outlook_email",
            "status": "uploaded",
            "created_at": recent,
        },
    ]
    supabase.tables["document_chunks"] = [
        {"document_id": "doc-1", "chunk_id": "chunk-1"},
    ]
    supabase.tables["source_intelligence_jobs"] = [
        {"source_document_id": "doc-1", "status": "succeeded", "updated_at": recent},
        {"source_document_id": "doc-2", "status": "queued", "updated_at": recent},
    ]

    health = get_source_sync_health(supabase)

    assert health["status"] == "degraded"
    assert health["counts"]["unembedded"] == 1
    assert health["counts"]["uncompiled"] == 1
    outlook = next(row for row in health["sources"] if row["source"] == "outlook_email")
    assert outlook["status"] in {"warning", "critical"}
    assert outlook["unembeddedCount"] == 1
    assert outlook["uncompiledCount"] == 1
    assert health["alerts"]


def test_get_source_sync_health_includes_recent_runs_and_stuck_items():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)
    old = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
    recent = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    supabase.tables["source_sync_runs"] = [
        {
            "id": "run-1",
            "source": "fireflies",
            "resource_id": "fireflies_ingestion_jobs",
            "resource_name": "Fireflies meetings",
            "stage": "vectorization",
            "status": "failed",
            "started_at": recent,
            "finished_at": recent,
            "items_seen": 10,
            "items_synced": 8,
            "items_failed": 2,
            "error_code": "BACKLOG_FAILED",
            "error_message": "2 Fireflies backlog jobs failed",
            "metadata": {"limit": 10},
        }
    ]
    supabase.tables["document_metadata"] = [
        {
            "id": "doc-image",
            "title": "Mech Screening Picture.png",
            "type": "image/png",
            "category": "file",
            "status": "error",
            "project_id": 43,
            "created_at": old,
        }
    ]
    supabase.tables["fireflies_ingestion_jobs"] = [
        {
            "fireflies_id": "ff-image",
            "metadata_id": "doc-image",
            "stage": "error",
            "error_message": "Cannot extract text from file: Mech Screening Picture.png",
            "last_attempt_at": recent,
            "updated_at": recent,
        }
    ]

    health = get_source_sync_health(supabase)

    assert health["recentRuns"][0]["source"] == "fireflies"
    assert health["recentRuns"][0]["itemsFailed"] == 2
    assert health["stuckItems"][0]["resourceName"] == "Mech Screening Picture.png"
    assert health["stuckItems"][0]["status"] == "failed"
    assert health["counts"]["stuckItems"] == 1


def test_get_source_sync_health_attributes_shared_queue_stuck_items_by_real_source():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)
    recent = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    supabase.tables["document_metadata"] = [
        {
            "id": "doc-email",
            "title": "Owner email thread",
            "source": "microsoft_graph",
            "source_system": "microsoft_graph",
            "category": "outlook_email",
            "type": "email",
            "status": "error",
            "created_at": recent,
        },
        {
            "id": "doc-teams",
            "title": "Teams DM conversation",
            "source": "microsoft_graph",
            "source_system": "microsoft_graph",
            "category": "teams_message",
            "type": "teams_dm_conversation",
            "status": "error",
            "created_at": recent,
        },
    ]
    supabase.tables["fireflies_ingestion_jobs"] = [
        {
            "fireflies_id": "outlook_1",
            "metadata_id": "doc-email",
            "stage": "error",
            "error_message": "Server disconnected",
            "last_attempt_at": recent,
            "updated_at": recent,
        },
        {
            "fireflies_id": "teamsdm_1",
            "metadata_id": "doc-teams",
            "stage": "error",
            "error_message": "ConnectionTerminated",
            "last_attempt_at": recent,
            "updated_at": recent,
        },
    ]

    health = get_source_sync_health(supabase)

    stuck_sources = {item["resourceId"]: item["source"] for item in health["stuckItems"]}
    assert stuck_sources["doc-email"] == "outlook_email"
    assert stuck_sources["doc-teams"] == "teams_chat_export"


def test_get_source_sync_health_reports_task_extraction_freshness():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)
    recent = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    supabase.tables["tasks"] = [
        {
            "id": "task-1",
            "metadata_id": "doc-1",
            "source_system": "fireflies",
            "extraction_source": "scheduled_task_extraction",
            "created_at": recent,
            "updated_at": recent,
        }
    ]

    health = get_source_sync_health(supabase)

    task_source = next(row for row in health["sources"] if row["source"] == "task_extraction")
    assert task_source["status"] == "healthy"
    assert task_source["itemsSynced"] == 1
    assert health["pipeline"]["tasksBySourceSystem"]["fireflies"] == 1


def test_get_source_sync_health_alerts_when_graph_docs_missing_project_documents():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)
    recent = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    supabase.tables["document_metadata"] = [
        {
            "id": "onedrive_drive-item-1",
            "title": "Scope.txt",
            "source": "microsoft_graph",
            "source_system": "microsoft_graph",
            "category": "document",
            "type": "document",
            "status": "embedded",
            "project_id": 25125,
            "created_at": recent,
            "tags": "onedrive,txt",
        },
        {
            "id": "sharepoint_drive-item-2",
            "title": "RFI.pdf",
            "source": "microsoft_graph",
            "source_system": "sharepoint",
            "source_item_id": "drive-item-2",
            "category": "document",
            "type": "document",
            "status": "embedded",
            "project_id": 25125,
            "created_at": recent,
        },
    ]
    supabase.tables["project_documents"] = [
        {
            "id": 1,
            "project_id": 25125,
            "source_system": "sharepoint",
            "source_item_id": "drive-item-2",
            "deleted_at": None,
        }
    ]

    health = get_source_sync_health(supabase)

    promotion = health["pipeline"]["graphProjectDocumentPromotion"]
    assert promotion["promoted"] == 1
    assert promotion["missing"] == 1
    assert promotion["missing_onedrive"] == 1
    assert any(alert["code"] == "graph_project_document_promotion_gap" for alert in health["alerts"])


def test_get_source_sync_health_caps_returned_sources_and_alerts():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)
    old = (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat()
    supabase.tables["source_sync_health_snapshots"] = [
        {
            "source": "teams_message",
            "resource_id": f"channel-{index}",
            "resource_name": f"Teams Channel {index}",
            "status": "critical",
            "last_sync_at": old,
            "last_success_at": old,
            "last_error_at": None,
            "last_error_message": None,
            "items_synced": 0,
            "unprocessed_count": 0,
            "unembedded_count": 100,
            "uncompiled_count": 100,
            "stale_minutes": 480,
            "metadata": {},
        }
        for index in range(120)
    ]

    health = get_source_sync_health(supabase)

    assert health["counts"]["sources"] == 120
    assert health["counts"]["alerts"] >= 120
    assert len(health["sources"]) == health["thresholds"]["maxReturnedSources"]
    assert len(health["alerts"]) == health["thresholds"]["maxReturnedAlerts"]


def test_persist_source_sync_alerts_upserts_and_resolves():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)

    first = persist_source_sync_alerts(
        supabase,
        [
            {
                "severity": "warning",
                "code": "embedding_backlog",
                "source": "vectorization",
                "resourceId": "document_chunks",
                "message": "Backlog detected.",
                "detectedAt": "2026-05-07T00:00:00+00:00",
            }
        ],
    )
    second = persist_source_sync_alerts(supabase, [])

    assert first == {"upserted": 1, "resolved": 0}
    assert second == {"upserted": 0, "resolved": 1}
    alert = supabase.tables["system_alerts"][0]
    assert alert["alert_key"] == "source_sync:embedding_backlog:vectorization:document_chunks"
    assert alert["status"] == "resolved"
    assert alert["resolved_at"]


def test_persist_source_sync_alerts_bounds_payload_fields():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)

    persist_source_sync_alerts(
        supabase,
        [
            {
                "severity": "critical",
                "code": "source_sync_error",
                "source": "teams_chat",
                "resourceId": "chat:" + ("a" * 1200),
                "message": "Client error " + ("403 Forbidden " * 200),
                "detectedAt": "2026-05-07T00:00:00+00:00",
            }
        ],
    )

    alert = supabase.tables["system_alerts"][0]
    assert len(alert["resource_id"]) <= 500
    assert len(alert["message"]) <= 1200
    assert isinstance(alert["metadata"]["source"], str)
    assert len(alert["metadata"]["resourceId"]) <= 500


def test_persist_source_sync_alerts_can_skip_resolving_missing_alerts():
    supabase = _FakeSupabase()
    _seed_empty_tables(supabase)
    supabase.tables["system_alerts"] = [
        {
            "id": "existing-alert",
            "alert_key": "source_sync:old:source:resource",
            "category": "source_sync",
            "status": "active",
        }
    ]

    result = persist_source_sync_alerts(supabase, [], resolve_missing=False)

    assert result == {"upserted": 0, "resolved": 0}
    assert supabase.tables["system_alerts"][0]["status"] == "active"
