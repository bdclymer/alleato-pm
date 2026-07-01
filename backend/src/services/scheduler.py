"""
Scheduled analysis engine — runs periodic jobs via APScheduler.

Currently registered jobs:
  - Acumatica financial sync: daily incremental ERP import into Supabase
  - Microsoft Graph sync: periodic incremental sync of Outlook/Teams/SharePoint
  - Microsoft Graph subscriptions: periodic webhook subscription creation/renewal
  - Microsoft Graph embedding: periodic vectorization of pending Graph documents
  - AI intelligence compiler: periodic drain of source and packet queue rows
  - Task extraction: daily, extracts action items from meetings/emails/Teams messages

Future jobs (Phase 2+):
  - Project health scoring
  - Commitment tracker
  - Proactive risk escalation
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler: Optional[AsyncIOScheduler] = None

class ConfigurationError(RuntimeError):
    """Raised when a required env var is absent at scheduler start-up.

    Catching this separately from generic exceptions lets job wrappers
    distinguish permanent misconfiguration (remove the job, log CRITICAL)
    from transient failures (keep scheduled, log WARNING).
    """


def _env_flag_enabled(name: str, default: str = "true") -> bool:
    return os.getenv(name, default).lower() not in ("0", "false", "no")


def _backend_api_only() -> bool:
    return os.getenv("BACKEND_API_ONLY", "").lower() in ("1", "true", "yes")


def _missing_required_vars(*names: str) -> list[str]:
    return [name for name in names if not os.getenv(name)]


def _has_any_env(*names: str) -> bool:
    return any(bool(os.getenv(name)) for name in names)


def _log_job_misconfiguration(job_label: str, enabled_var: str, required_vars: tuple[str, ...]) -> bool:
    missing = _missing_required_vars(*required_vars)
    if not missing:
        return False
    logger.critical(
        "[Scheduler] %s disabled — missing env var(s): %s. Set %s or disable the job with %s=false.",
        job_label,
        ", ".join(missing),
        ", ".join(required_vars),
        enabled_var,
    )
    return True


def _guard_background_app_db(job_name: str) -> None:
    from .ops.db_pressure_guard import enforce_app_db_pressure_guard

    enforce_app_db_pressure_guard(job_name)


def init_scheduler() -> None:
    """Initialize and start the scheduler. Called from FastAPI startup."""
    global scheduler

    if _backend_api_only():
        logger.critical(
            "[Scheduler] Refusing to start in-process jobs because BACKEND_API_ONLY=true. "
            "The web service is API-only; background work must run in explicit cron services."
        )
        return

    if os.getenv("DISABLE_SCHEDULER", "").lower() in ("1", "true", "yes"):
        logger.info("[Scheduler] Disabled via DISABLE_SCHEDULER env var")
        return

    scheduler = AsyncIOScheduler()

    if _env_flag_enabled("ACUMATICA_FINANCIAL_SYNC_ENABLED"):
        if _log_job_misconfiguration(
            "Acumatica financial sync",
            "ACUMATICA_FINANCIAL_SYNC_ENABLED",
            ("ACUMATICA_BASE_URL", "ACCOUNTING_USER", "ACCOUNTING_PASSWORD"),
        ):
            logger.info("[Scheduler] Acumatica financial sync job was not registered.")
        else:
            # Default cadence: once daily at 00:15 UTC.
            # Override with ACUMATICA_FINANCIAL_SYNC_CRON (5-field crontab).
            sync_cron = os.getenv("ACUMATICA_FINANCIAL_SYNC_CRON", "15 0 * * *")
            scheduler.add_job(
                run_acumatica_financial_sync_job,
                CronTrigger.from_crontab(sync_cron),
                id="acumatica_financial_sync",
                name="Acumatica Financial Sync",
                replace_existing=True,
                max_instances=1,
            )
            logger.info("[Scheduler] Acumatica financial sync cron: %s (UTC)", sync_cron)

    if _env_flag_enabled("SOURCE_SYNC_HEALTH_RECOMPUTE_ENABLED"):
        health_interval_minutes = max(
            5,
            int(os.getenv("SOURCE_SYNC_HEALTH_RECOMPUTE_INTERVAL_MINUTES", "15")),
        )
        scheduler.add_job(
            run_source_sync_health_recompute_job,
            IntervalTrigger(minutes=health_interval_minutes),
            id="source_sync_health_recompute",
            name="Source Sync Health Recompute",
            replace_existing=True,
            max_instances=1,
        )
        logger.info(
            "[Scheduler] Source sync health recompute every %d min",
            health_interval_minutes,
        )

    # Microsoft Graph sync (Outlook + Teams + SharePoint) — hourly by default
    # Auto-enable when Graph credentials are configured (unless explicitly disabled)
    graph_has_creds = bool(
        os.getenv("MICROSOFT_CLIENT_ID") and
        os.getenv("MICROSOFT_CLIENT_SECRET") and
        os.getenv("MICROSOFT_TENANT_ID")
    )
    graph_sync_setting = os.getenv("GRAPH_SYNC_ENABLED", "auto").lower()
    graph_sync_enabled = (
        graph_sync_setting in ("1", "true", "yes") or
        (graph_sync_setting == "auto" and graph_has_creds)
    )
    if graph_sync_enabled:
        # The heavy full mailbox sweep (run_graph_sync: Outlook/Teams/SharePoint for
        # ALL mailboxes) is the main DB-pressure source. It is decoupled from the
        # lightweight webhook drain so we can run real-time webhook freshness
        # WITHOUT the periodic heavy sweep. Set GRAPH_FULL_SYNC_JOB_ENABLED=false to
        # keep webhook ingestion + drain + embedding on while the heavy sweep stays
        # off. Defaults to enabled for backward compatibility.
        full_sync_job_enabled = os.getenv(
            "GRAPH_FULL_SYNC_JOB_ENABLED", "true"
        ).strip().lower() not in ("0", "false", "no", "off")
        if not full_sync_job_enabled:
            logger.info(
                "[Scheduler] Heavy Microsoft Graph full sweep DISABLED "
                "(GRAPH_FULL_SYNC_JOB_ENABLED=false) — webhook drain + embedding remain active."
            )

    else:
        if graph_has_creds:
            logger.warning(
                "[Scheduler] Microsoft Graph credentials ARE configured but sync is DISABLED "
                "(GRAPH_SYNC_ENABLED=%s). Set GRAPH_SYNC_ENABLED=true or remove the var to auto-enable.",
                graph_sync_setting,
            )
        else:
            logger.info("[Scheduler] Microsoft Graph sync disabled (no credentials configured)")

    scheduler.start()
    registered_jobs = scheduler.get_jobs() if hasattr(scheduler, "get_jobs") else getattr(scheduler, "jobs", [])
    logger.info("[Scheduler] Started with %d registered job(s)", len(registered_jobs))


def shutdown_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Shut down")


async def run_acumatica_financial_sync_job() -> None:
    """Scheduled job: incrementally sync Acumatica finance data into Supabase."""
    import asyncio

    logger.info("[Scheduler] Running Acumatica financial sync job")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_acumatica_financial_sync)
        logger.info("[Scheduler] Acumatica financial sync complete: %s", result.get("status"))
        if result.get("errors"):
            logger.warning("[Scheduler] Acumatica financial sync reported errors: %s", result["errors"])
    except ConfigurationError as e:
        logger.critical("[Scheduler] Acumatica financial sync disabled — fix config and restart: %s", e)
        if scheduler:
            scheduler.remove_job("acumatica_financial_sync")
    except Exception as e:
        logger.warning("[Scheduler] Acumatica financial sync failed (will retry): %s", e, exc_info=True)


async def run_source_sync_health_recompute_job() -> None:
    """Scheduled job: persist current source-sync snapshots and active alerts."""
    import asyncio

    logger.info("[Scheduler] Running source sync health recompute job")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_source_sync_health_recompute)
        logger.info(
            "[Scheduler] Source sync health recompute complete: snapshots=%d alerts_upserted=%d alerts_resolved=%d overall=%s",
            result.get("updatedSnapshots", 0),
            result.get("routedAlerts", {}).get("upserted", 0),
            result.get("routedAlerts", {}).get("resolved", 0),
            result.get("health", {}).get("status"),
        )
    except Exception as e:
        logger.warning("[Scheduler] Source sync health recompute failed (will retry): %s", e, exc_info=True)


def _run_acumatica_financial_sync():
    """Synchronous wrapper for Acumatica ERP finance sync."""
    from .acumatica_sync import run_acumatica_financial_sync

    _guard_background_app_db("acumatica_financial_sync")
    return run_acumatica_financial_sync()


def _run_source_sync_health_recompute() -> dict:
    """Synchronous wrapper for source-sync health persistence."""
    from .health.source_sync_health import (
        MAX_RECOMPUTE_ALERT_WRITES,
        MAX_RECOMPUTE_SNAPSHOT_WRITES,
        get_source_sync_health,
        persist_source_sync_alerts,
        update_source_health_snapshot,
    )
    from .supabase_helpers import get_supabase_client

    _guard_background_app_db("source_sync_health_recompute")
    client = get_supabase_client()
    health = get_source_sync_health(client)
    updated = 0
    for source in health.get("sources", [])[:MAX_RECOMPUTE_SNAPSHOT_WRITES]:
        update_source_health_snapshot(client, source)
        updated += 1
    routed_alerts = persist_source_sync_alerts(
        client,
        health.get("alerts", [])[:MAX_RECOMPUTE_ALERT_WRITES],
        resolve_missing=False,
    )
    return {
        "status": "completed",
        "updatedSnapshots": updated,
        "routedAlerts": routed_alerts,
        "writeCaps": {
            "snapshots": MAX_RECOMPUTE_SNAPSHOT_WRITES,
            "alerts": MAX_RECOMPUTE_ALERT_WRITES,
            "resolveMissing": False,
        },
        "health": health,
    }
