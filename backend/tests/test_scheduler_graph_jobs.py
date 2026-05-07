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
