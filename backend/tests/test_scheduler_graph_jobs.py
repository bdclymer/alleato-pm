import sys
import types

try:
    import apscheduler  # noqa: F401
except ModuleNotFoundError:
    apscheduler_module = types.ModuleType("apscheduler")
    schedulers_module = types.ModuleType("apscheduler.schedulers")
    schedulers_asyncio_module = types.ModuleType("apscheduler.schedulers.asyncio")
    triggers_module = types.ModuleType("apscheduler.triggers")
    triggers_cron_module = types.ModuleType("apscheduler.triggers.cron")
    triggers_interval_module = types.ModuleType("apscheduler.triggers.interval")

    class _FakeAsyncIOScheduler:
        pass

    class _FakeCronTrigger:
        def __init__(self, *_args, **_kwargs):
            pass

        @classmethod
        def from_crontab(cls, *_args, **_kwargs):
            return cls()

    class _FakeIntervalTrigger:
        def __init__(self, *_args, **_kwargs):
            pass

    schedulers_asyncio_module.AsyncIOScheduler = _FakeAsyncIOScheduler
    triggers_cron_module.CronTrigger = _FakeCronTrigger
    triggers_interval_module.IntervalTrigger = _FakeIntervalTrigger
    sys.modules.setdefault("apscheduler", apscheduler_module)
    sys.modules.setdefault("apscheduler.schedulers", schedulers_module)
    sys.modules.setdefault("apscheduler.schedulers.asyncio", schedulers_asyncio_module)
    sys.modules.setdefault("apscheduler.triggers", triggers_module)
    sys.modules.setdefault("apscheduler.triggers.cron", triggers_cron_module)
    sys.modules.setdefault("apscheduler.triggers.interval", triggers_interval_module)

from src.services import scheduler


class _RecordingScheduler:
    def __init__(self):
        self.jobs = []
        self.running = False

    def add_job(self, func, trigger, id=None, name=None, replace_existing=None, max_instances=None, kwargs=None):
        self.jobs.append(
            {
                "func": func,
                "trigger": trigger,
                "id": id,
                "name": name,
                "replace_existing": replace_existing,
                "max_instances": max_instances,
                "kwargs": kwargs or {},
            }
        )

    def start(self):
        self.running = True


def test_scheduled_graph_sync_defaults_to_fetch_only(monkeypatch):
    calls = {}
    client = object()

    monkeypatch.delenv("GRAPH_SYNC_RUN_EMBEDDING_INLINE", raising=False)
    monkeypatch.delenv("GRAPH_SYNC_RUN_COMPILER_INLINE", raising=False)
    monkeypatch.setattr(
        "src.services.supabase_helpers.get_supabase_client",
        lambda: client,
    )
    monkeypatch.setattr(
        "src.services.integrations.microsoft_graph.sync.run_graph_sync",
        lambda supabase_client, **kwargs: calls.setdefault(
            "sync",
            {"client": supabase_client, **kwargs, "total_synced": 0},
        ),
    )
    monkeypatch.setattr(
        scheduler,
        "_maybe_run_comm_project_backfill",
        lambda supabase_client: {"client_matches": supabase_client is client},
    )

    result = scheduler._run_graph_sync()

    assert result["run_embedding"] is False
    assert result["project_backfill"] == {"client_matches": True}


def test_scheduled_graph_embedding_uses_pending_worker(monkeypatch):
    client = object()
    calls = {}

    monkeypatch.setattr(
        "src.services.supabase_helpers.get_supabase_client",
        lambda: client,
    )
    monkeypatch.setattr(
        "src.services.integrations.microsoft_graph.embed.embed_pending_graph_documents",
        lambda supabase_client, limit: calls.setdefault(
            "embed",
            {"client": supabase_client, "limit": limit, "embedded": 0, "errors": 0},
        ),
    )

    result = scheduler._run_graph_embedding(limit=17)

    assert result == {"client": client, "limit": 17, "embedded": 0, "errors": 0}


def test_fireflies_backlog_drain_processes_retryable_jobs(monkeypatch):
    client = object()
    processed = []
    recorded = []
    jobs = [
        {
            "fireflies_id": "ff-1",
            "metadata_id": "doc-1",
            "stage": "raw_ingested",
            "error_message": None,
        },
        {
            "fireflies_id": "ff-2",
            "metadata_id": "doc-2",
            "stage": "error",
            "error_message": "OpenAI quota exceeded",
        },
    ]

    monkeypatch.setattr(
        "src.services.supabase_helpers.get_supabase_client",
        lambda: client,
    )
    monkeypatch.setattr(
        scheduler,
        "_close_abandoned_fireflies_backlog_runs",
        lambda stale_minutes: 3,
    )
    monkeypatch.setattr(
        scheduler,
        "_find_fireflies_pipeline_backlog_jobs",
        lambda supabase_client, rag_supabase, *, limit, stale_minutes: jobs,
    )
    monkeypatch.setattr(
        scheduler,
        "_run_fireflies_full_pipeline",
        lambda metadata_id: processed.append(metadata_id) or {"status": "done"},
    )
    monkeypatch.setattr(
        scheduler,
        "_start_fireflies_backlog_run",
        lambda supabase_client, result: "run-1",
    )
    monkeypatch.setattr(
        scheduler,
        "_record_fireflies_backlog_run",
        lambda supabase_client, result: recorded.append((supabase_client, result)),
    )

    result = scheduler._run_fireflies_pipeline_backlog(limit=10, stale_minutes=120)

    assert processed == ["doc-1", "doc-2"]
    assert result["matched"] == 2
    assert result["processed"] == 2
    assert result["failed"] == 0
    assert result["status"] == "ok"
    assert result["run_id"] == "run-1"
    assert result["auto_closed_runs"] == 3
    assert recorded[0][0] is client
    assert recorded[0][1]["matched"] == 2


def test_fireflies_backlog_marks_non_vectorizable_items_without_pipeline(monkeypatch):
    client = object()
    marked = []
    recorded = []
    jobs = [
        {
            "fireflies_id": "ff-image",
            "metadata_id": "doc-image",
            "stage": "raw_ingested",
            "error_message": None,
        }
    ]

    monkeypatch.setattr(
        "src.services.supabase_helpers.get_supabase_client",
        lambda: client,
    )
    monkeypatch.setattr(
        scheduler,
        "_close_abandoned_fireflies_backlog_runs",
        lambda stale_minutes: 1,
    )
    monkeypatch.setattr(
        scheduler,
        "_find_fireflies_pipeline_backlog_jobs",
        lambda supabase_client, rag_supabase, *, limit, stale_minutes: jobs,
    )
    monkeypatch.setattr(
        scheduler,
        "_classify_non_vectorizable_fireflies_item",
        lambda supabase_client, metadata_id: {
            "code": "unsupported_file_type",
            "message": "NON_VECTORIZABLE: Cannot extract searchable text from image.png.",
            "metadata": {"extension": ".png"},
        },
    )
    monkeypatch.setattr(
        scheduler,
        "_mark_fireflies_item_non_vectorizable",
        lambda supabase_client, *, metadata_id, reason: marked.append(
            (supabase_client, metadata_id, reason["code"])
        ),
    )
    monkeypatch.setattr(
        scheduler,
        "_run_fireflies_full_pipeline",
        lambda metadata_id: (_ for _ in ()).throw(AssertionError("pipeline should not run")),
    )
    monkeypatch.setattr(
        scheduler,
        "_start_fireflies_backlog_run",
        lambda supabase_client, result: "run-2",
    )
    monkeypatch.setattr(
        scheduler,
        "_record_fireflies_backlog_run",
        lambda supabase_client, result: recorded.append((supabase_client, result)),
    )

    result = scheduler._run_fireflies_pipeline_backlog(limit=10, stale_minutes=120)

    assert marked == [(client, "doc-image", "unsupported_file_type")]
    assert result["matched"] == 1
    assert result["processed"] == 0
    assert result["skipped"] == 1
    assert result["failed"] == 0
    assert result["status"] == "warning"
    assert result["run_id"] == "run-2"
    assert result["auto_closed_runs"] == 1
    assert result["results"][0]["status"] == "skipped"
    assert recorded[0][1]["skipped"] == 1


def test_fireflies_backlog_marks_interview_title_intentionally_excluded(monkeypatch):
    client = object()
    marked = []
    recorded = []
    jobs = [
        {
            "fireflies_id": "ff-interview",
            "metadata_id": "doc-interview",
            "stage": "error",
            "error_message": "OpenAI quota exceeded",
        }
    ]

    monkeypatch.setattr(
        "src.services.supabase_helpers.get_supabase_client",
        lambda: client,
    )
    monkeypatch.setattr(
        scheduler,
        "_close_abandoned_fireflies_backlog_runs",
        lambda stale_minutes: 0,
    )
    monkeypatch.setattr(
        scheduler,
        "_find_fireflies_pipeline_backlog_jobs",
        lambda supabase_client, rag_supabase, *, limit, stale_minutes: jobs,
    )
    monkeypatch.setattr(
        scheduler,
        "_classify_non_vectorizable_fireflies_item",
        lambda supabase_client, metadata_id: {
            "code": "interview_title_excluded",
            "intentional": True,
            "embedding_status": "intentionally_excluded",
            "message": 'INTENTIONALLY_EXCLUDED: Meeting title contains "Interview".',
            "metadata": {"title": "PM Interview - Candidate"},
        },
    )
    monkeypatch.setattr(
        scheduler,
        "_mark_fireflies_item_non_vectorizable",
        lambda supabase_client, *, metadata_id, reason: marked.append(
            (supabase_client, metadata_id, reason["embedding_status"], reason["intentional"])
        ),
    )
    monkeypatch.setattr(
        scheduler,
        "_run_fireflies_full_pipeline",
        lambda metadata_id: (_ for _ in ()).throw(AssertionError("pipeline should not run")),
    )
    monkeypatch.setattr(
        scheduler,
        "_start_fireflies_backlog_run",
        lambda supabase_client, result: "run-interview",
    )
    monkeypatch.setattr(
        scheduler,
        "_record_fireflies_backlog_run",
        lambda supabase_client, result: recorded.append((supabase_client, result)),
    )

    result = scheduler._run_fireflies_pipeline_backlog(limit=10, stale_minutes=120)

    assert marked == [(client, "doc-interview", "intentionally_excluded", True)]
    assert result["matched"] == 1
    assert result["processed"] == 0
    assert result["skipped"] == 1
    assert result["failed"] == 0
    assert result["results"][0]["skip_code"] == "interview_title_excluded"
    assert result["status"] == "warning"
    assert result["run_id"] == "run-interview"
    assert result["auto_closed_runs"] == 0
    assert result["results"][0]["status"] == "skipped"
    assert recorded[0][1]["skipped"] == 1


def test_fireflies_backlog_retry_filter_only_allows_provider_failures():
    assert scheduler._is_retryable_fireflies_error("OpenAI quota exceeded")
    assert scheduler._is_retryable_fireflies_error("Fireflies embedding failed across all providers")
    assert scheduler._is_retryable_fireflies_error("Server disconnected")
    assert scheduler._is_retryable_fireflies_error("StreamIDTooLowError: 395 is lower than 397")
    assert not scheduler._is_retryable_fireflies_error("No segments found for metadata_id")
    assert not scheduler._is_retryable_fireflies_error(None)


def test_start_fireflies_backlog_run_records_shared_pipeline_source(monkeypatch):
    recorded = {}

    monkeypatch.setattr(
        "src.services.health.source_sync_health.record_sync_run",
        lambda *_args, **kwargs: recorded.update(kwargs) or {"id": "run-shared"},
    )

    run_id = scheduler._start_fireflies_backlog_run(object(), {"matched": 4, "limit": 10, "stale_minutes": 120})

    assert run_id == "run-shared"
    assert recorded["source"] == scheduler.SHARED_PIPELINE_BACKLOG_SOURCE
    assert recorded["resource_name"] == scheduler.SHARED_PIPELINE_BACKLOG_RESOURCE_NAME


def test_init_scheduler_registers_acumatica_job_with_runtime_envs(monkeypatch):
    recording_scheduler = _RecordingScheduler()

    monkeypatch.setattr(scheduler, "AsyncIOScheduler", lambda: recording_scheduler)
    monkeypatch.delenv("DISABLE_SCHEDULER", raising=False)
    monkeypatch.setenv("FIREFLIES_SYNC_ENABLED", "false")
    monkeypatch.setenv("FIREFLIES_PIPELINE_BACKLOG_ENABLED", "false")
    monkeypatch.setenv("ACUMATICA_FINANCIAL_SYNC_ENABLED", "true")
    monkeypatch.setenv("ACUMATICA_BASE_URL", "https://example.acumatica.com")
    monkeypatch.setenv("ACCOUNTING_USER", "sync-user")
    monkeypatch.setenv("ACCOUNTING_PASSWORD", "secret")
    monkeypatch.delenv("ACUMATICA_SERVICE_URL", raising=False)
    monkeypatch.setenv("SOURCE_SYNC_HEALTH_RECOMPUTE_ENABLED", "false")
    monkeypatch.setenv("GRAPH_SYNC_ENABLED", "false")
    monkeypatch.setenv("GRAPH_SUBSCRIPTIONS_ENABLED", "false")
    monkeypatch.setenv("INTELLIGENCE_COMPILER_ENABLED", "false")
    monkeypatch.setenv("TASK_EXTRACTION_ENABLED", "false")

    scheduler.init_scheduler()

    job_ids = {job["id"] for job in recording_scheduler.jobs}
    assert "daily_digest" in job_ids
    assert "acumatica_financial_sync" in job_ids
    assert recording_scheduler.running is True


def test_init_scheduler_registers_graph_subscription_reconcile_job(monkeypatch):
    recording_scheduler = _RecordingScheduler()

    monkeypatch.setattr(scheduler, "AsyncIOScheduler", lambda: recording_scheduler)
    monkeypatch.delenv("DISABLE_SCHEDULER", raising=False)
    monkeypatch.setenv("FIREFLIES_SYNC_ENABLED", "false")
    monkeypatch.setenv("FIREFLIES_PIPELINE_BACKLOG_ENABLED", "false")
    monkeypatch.setenv("ACUMATICA_FINANCIAL_SYNC_ENABLED", "false")
    monkeypatch.setenv("SOURCE_SYNC_HEALTH_RECOMPUTE_ENABLED", "false")
    monkeypatch.setenv("GRAPH_SYNC_ENABLED", "false")
    monkeypatch.setenv("GRAPH_SUBSCRIPTIONS_ENABLED", "auto")
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "client-id")
    monkeypatch.setenv("MICROSOFT_CLIENT_SECRET", "secret")
    monkeypatch.setenv("MICROSOFT_TENANT_ID", "tenant-id")
    monkeypatch.setenv("MICROSOFT_GRAPH_WEBHOOK_NOTIFICATION_URL", "https://example.com/api/graph/webhooks/notifications")
    monkeypatch.setenv("MICROSOFT_GRAPH_WEBHOOK_CLIENT_STATE", "client-state")
    monkeypatch.setenv("INTELLIGENCE_COMPILER_ENABLED", "false")
    monkeypatch.setenv("TASK_EXTRACTION_ENABLED", "false")

    scheduler.init_scheduler()

    jobs_by_id = {job["id"]: job for job in recording_scheduler.jobs}
    assert "graph_subscription_reconcile" in jobs_by_id
    assert jobs_by_id["graph_subscription_reconcile"]["name"] == "Microsoft Graph Webhook Subscription Renewal"
    assert recording_scheduler.running is True


def test_run_graph_subscription_reconcile_uses_configured_bounds(monkeypatch):
    client = object()
    calls = {}

    monkeypatch.setenv("GRAPH_SUBSCRIPTION_RENEW_WITHIN_HOURS", "9")
    monkeypatch.setenv("GRAPH_SUBSCRIPTION_EXPIRATION_HOURS", "36")
    monkeypatch.setattr(
        "src.services.supabase_helpers.get_supabase_client",
        lambda: client,
    )
    monkeypatch.setattr(
        "src.services.integrations.microsoft_graph.subscriptions.ensure_subscriptions",
        lambda supabase_client, **kwargs: calls.setdefault(
            "ensure",
            {"client": supabase_client, **kwargs, "checked": 0},
        ),
    )

    result = scheduler._run_graph_subscription_reconcile()

    assert result["client"] is client
    assert result["renew_within_hours"] == 9
    assert result["expiration_hours"] == 36


def test_run_source_sync_health_recompute_persists_snapshots_and_alerts(monkeypatch):
    calls = {"snapshots": [], "alerts": []}
    client = object()

    monkeypatch.setattr(
        "src.services.supabase_helpers.get_supabase_client",
        lambda: client,
    )
    monkeypatch.setattr(
        "src.services.health.source_sync_health.get_source_sync_health",
        lambda supabase_client: {
            "status": "warning",
            "sources": [
                {"source": "fireflies", "resourceId": "recent_transcripts"},
                {"source": "microsoft_graph", "resourceId": "graph_embed"},
            ],
            "alerts": [
                {"code": "source_sync_stale", "source": "fireflies", "resourceId": "recent_transcripts"},
            ],
        },
    )
    monkeypatch.setattr(
        "src.services.health.source_sync_health.update_source_health_snapshot",
        lambda supabase_client, source: calls["snapshots"].append((supabase_client, source)),
    )
    monkeypatch.setattr(
        "src.services.health.source_sync_health.persist_source_sync_alerts",
        lambda supabase_client, alerts, resolve_missing: calls["alerts"].append(
            (supabase_client, alerts, resolve_missing)
        ) or {"upserted": len(alerts), "resolved": 0},
    )

    result = scheduler._run_source_sync_health_recompute()

    assert result["status"] == "completed"
    assert result["updatedSnapshots"] == 2
    assert calls["snapshots"] == [
        (client, {"source": "fireflies", "resourceId": "recent_transcripts"}),
        (client, {"source": "microsoft_graph", "resourceId": "graph_embed"}),
    ]
    assert calls["alerts"] == [
        (
            client,
            [{"code": "source_sync_stale", "source": "fireflies", "resourceId": "recent_transcripts"}],
            False,
        )
    ]
