from datetime import datetime, timedelta, timezone

from src.services.health.source_sync_health import (
    get_source_sync_health,
    record_sync_run,
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
        "graph_subscriptions",
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
