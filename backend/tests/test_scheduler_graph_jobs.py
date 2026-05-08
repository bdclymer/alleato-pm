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
    assert result["run_teams_compiler"] is False
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
        "_find_fireflies_pipeline_backlog_jobs",
        lambda supabase_client, *, limit, stale_minutes: jobs,
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
        "_find_fireflies_pipeline_backlog_jobs",
        lambda supabase_client, *, limit, stale_minutes: jobs,
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
    assert result["results"][0]["status"] == "skipped"
    assert recorded[0][1]["skipped"] == 1


def test_fireflies_backlog_retry_filter_only_allows_provider_failures():
    assert scheduler._is_retryable_fireflies_error("OpenAI quota exceeded")
    assert scheduler._is_retryable_fireflies_error("Fireflies embedding failed across all providers")
    assert not scheduler._is_retryable_fireflies_error("No segments found for metadata_id")
    assert not scheduler._is_retryable_fireflies_error(None)
