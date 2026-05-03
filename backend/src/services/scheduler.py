"""
Scheduled analysis engine — runs periodic jobs via APScheduler.

Currently registered jobs:
  - Fireflies sync: every 15 min, fetches new transcripts and ingests via pipeline
  - Daily digest: 6 PM daily, aggregates meetings into executive briefing
  - Acumatica financial sync: daily incremental ERP import into Supabase
  - Microsoft Graph sync: periodic incremental sync of Outlook/Teams/OneDrive

Future jobs (Phase 2+):
  - Project health scoring
  - Commitment tracker
  - Proactive risk escalation
"""
from __future__ import annotations

import logging
import os
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


def validate_scheduler_config() -> None:
    """Check required env vars before any jobs are registered.

    Raises ConfigurationError naming the missing var so a misconfigured
    deployment fails loudly at start-up rather than appearing healthy
    while silently skipping every run.
    """
    checks = [
        # (enabled_var, required_var, job_label)
        ("FIREFLIES_SYNC_ENABLED", "FIREFLIES_API_KEY", "Fireflies sync"),
        ("ACUMATICA_FINANCIAL_SYNC_ENABLED", "ACUMATICA_SERVICE_URL", "Acumatica financial sync"),
    ]
    for enabled_var, required_var, job_label in checks:
        job_enabled = os.getenv(enabled_var, "true").lower() not in ("0", "false", "no")
        if job_enabled and not os.getenv(required_var):
            raise ConfigurationError(
                f"{job_label} is enabled but {required_var} is not set. "
                f"Set {required_var} or disable the job with {enabled_var}=false."
            )


def init_scheduler() -> None:
    """Initialize and start the scheduler. Called from FastAPI startup."""
    global scheduler

    if os.getenv("DISABLE_SCHEDULER", "").lower() in ("1", "true", "yes"):
        logger.info("[Scheduler] Disabled via DISABLE_SCHEDULER env var")
        return

    validate_scheduler_config()
    scheduler = AsyncIOScheduler()

    # Fireflies transcript sync — every 15 minutes by default
    if os.getenv("FIREFLIES_SYNC_ENABLED", "true").lower() not in ("0", "false", "no"):
        sync_interval_minutes = max(5, int(os.getenv("FIREFLIES_SYNC_INTERVAL_MINUTES", "15")))
        sync_limit = max(1, int(os.getenv("FIREFLIES_SYNC_LIMIT", "10")))
        scheduler.add_job(
            run_fireflies_sync_job,
            IntervalTrigger(minutes=sync_interval_minutes),
            id="fireflies_sync",
            name="Fireflies Transcript Sync",
            replace_existing=True,
            max_instances=1,
            kwargs={"limit": sync_limit},
        )
        logger.info(
            "[Scheduler] Fireflies sync every %d min (limit=%d)",
            sync_interval_minutes, sync_limit,
        )

    # Daily digest at 6 PM (configurable via env)
    digest_hour = int(os.getenv("DAILY_DIGEST_HOUR", "18"))
    digest_minute = int(os.getenv("DAILY_DIGEST_MINUTE", "0"))

    scheduler.add_job(
        run_daily_digest_job,
        CronTrigger(hour=digest_hour, minute=digest_minute),
        id="daily_digest",
        name="Daily Meeting Digest",
        replace_existing=True,
    )

    if os.getenv("ACUMATICA_FINANCIAL_SYNC_ENABLED", "true").lower() not in ("0", "false", "no"):
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

    # Microsoft Graph sync (Outlook + Teams + OneDrive) — hourly by default
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
        graph_interval_minutes = max(5, int(os.getenv("GRAPH_SYNC_INTERVAL_MINUTES", "60")))
        scheduler.add_job(
            run_graph_sync_job,
            IntervalTrigger(minutes=graph_interval_minutes),
            id="graph_sync",
            name="Microsoft Graph Sync (Outlook / Teams / OneDrive)",
            replace_existing=True,
            max_instances=1,
        )
        logger.info(
            "[Scheduler] Microsoft Graph sync every %d min",
            graph_interval_minutes,
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

    if os.getenv("INTELLIGENCE_COMPILER_ENABLED", "true").lower() not in ("0", "false", "no"):
        compiler_interval_minutes = max(1, int(os.getenv("INTELLIGENCE_COMPILER_INTERVAL_MINUTES", "10")))
        source_limit = max(0, int(os.getenv("INTELLIGENCE_COMPILER_SOURCE_LIMIT", "10")))
        packet_limit = max(0, int(os.getenv("INTELLIGENCE_COMPILER_PACKET_LIMIT", "10")))
        max_processing_time_ms = max(1000, int(os.getenv("INTELLIGENCE_COMPILER_MAX_MS", "120000")))
        scheduler.add_job(
            run_intelligence_compiler_job,
            IntervalTrigger(minutes=compiler_interval_minutes),
            id="intelligence_compiler",
            name="AI Intelligence Compiler Queue",
            replace_existing=True,
            max_instances=1,
            kwargs={
                "source_limit": source_limit,
                "packet_limit": packet_limit,
                "max_processing_time_ms": max_processing_time_ms,
            },
        )
        logger.info(
            "[Scheduler] Intelligence compiler every %d min (source_limit=%d packet_limit=%d max_ms=%d)",
            compiler_interval_minutes,
            source_limit,
            packet_limit,
            max_processing_time_ms,
        )

    scheduler.start()
    logger.info(
        "[Scheduler] Started — daily digest at %02d:%02d",
        digest_hour, digest_minute,
    )


def shutdown_scheduler() -> None:
    """Gracefully shut down the scheduler."""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Shut down")


async def run_fireflies_sync_job(limit: int = 10) -> None:
    """Scheduled job: fetch recent Fireflies transcripts and ingest via pipeline."""
    import asyncio

    logger.info("[Scheduler] Running Fireflies sync (limit=%d)", limit)
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_fireflies_sync, limit)
        logger.info(
            "[Scheduler] Fireflies sync complete: %d processed, %d errors",
            result.get("processed", 0) - result.get("error_count", 0),
            result.get("error_count", 0),
        )
    except ConfigurationError as e:
        logger.critical("[Scheduler] Fireflies sync disabled — fix config and restart: %s", e)
        if scheduler:
            scheduler.remove_job("fireflies_sync")
    except Exception as e:
        logger.warning("[Scheduler] Fireflies sync failed (will retry): %s", e, exc_info=True)


async def run_daily_digest_job() -> None:
    """
    Scheduled job: generate daily digest and send email.

    Runs in an async context via APScheduler's AsyncIOScheduler.
    """
    import asyncio

    logger.info("[Scheduler] Running daily digest job")
    try:
        # Run the sync digest function in a thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_digest_sync)
        logger.info(
            "[Scheduler] Daily digest complete: %d meetings, recap_id=%s",
            result.get("meeting_count", 0),
            result.get("recap_id"),
        )

        # Send email if recipients configured
        recipients = _get_daily_recipients()
        if recipients and result.get("recap_id"):
            _send_recap_email(recipients, result)
    except ConfigurationError as e:
        logger.critical("[Scheduler] Daily digest disabled — fix config and restart: %s", e)
        if scheduler:
            scheduler.remove_job("daily_digest")
    except Exception as e:
        logger.warning("[Scheduler] Daily digest job failed (will retry): %s", e, exc_info=True)


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


def _run_fireflies_sync(limit: int = 10):
    """Synchronous wrapper for Fireflies transcript sync."""
    from .supabase_helpers import SupabaseRagStore, get_supabase_client
    from .ingestion.fireflies_pipeline import FirefliesIngestionPipeline

    client = get_supabase_client()
    store = SupabaseRagStore(client)
    pipeline = FirefliesIngestionPipeline(store)
    result = pipeline.sync_recent_transcripts(limit=limit)
    result["project_backfill"] = _maybe_run_comm_project_backfill(client)
    return result


def _run_digest_sync():
    """Synchronous wrapper for daily digest generation."""
    from .daily_digest import run_daily_digest
    return run_daily_digest()


def _run_acumatica_financial_sync():
    """Synchronous wrapper for Acumatica ERP finance sync."""
    from .acumatica_sync import run_acumatica_financial_sync

    return run_acumatica_financial_sync()


async def run_graph_sync_job() -> None:
    """Scheduled job: incrementally sync Outlook, Teams, and OneDrive via Microsoft Graph."""
    import asyncio

    logger.info("[Scheduler] Running Microsoft Graph sync job")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_graph_sync)
        logger.info(
            "[Scheduler] Microsoft Graph sync complete: %d total synced (outlook=%d, teams=%d, onedrive=%d)",
            result.get("total_synced", 0),
            result.get("outlook", 0),
            result.get("teams", 0),
            result.get("onedrive", 0),
        )
        if result.get("errors"):
            logger.warning("[Scheduler] Graph sync reported errors: %s", result["errors"])
    except ConfigurationError as e:
        logger.critical("[Scheduler] Microsoft Graph sync disabled — fix config and restart: %s", e)
        if scheduler:
            scheduler.remove_job("graph_sync")
    except Exception as e:
        logger.warning("[Scheduler] Microsoft Graph sync failed (will retry): %s", e, exc_info=True)


async def run_intelligence_compiler_job(
    source_limit: int = 10,
    packet_limit: int = 10,
    max_processing_time_ms: int = 120000,
) -> None:
    """Scheduled job: drain queued source intelligence and packet refresh jobs."""
    import asyncio

    logger.info(
        "[Scheduler] Running intelligence compiler job (source_limit=%d packet_limit=%d)",
        source_limit,
        packet_limit,
    )
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            _run_intelligence_compiler,
            source_limit,
            packet_limit,
            max_processing_time_ms,
        )
        logger.info("[Scheduler] Intelligence compiler complete: %s", result)
        if result.get("source_jobs_failed") or result.get("packet_jobs_failed"):
            logger.warning("[Scheduler] Intelligence compiler reported failures: %s", result)
    except Exception as e:
        logger.warning("[Scheduler] Intelligence compiler failed (will retry): %s", e, exc_info=True)


def _run_graph_sync():
    """Synchronous wrapper for Microsoft Graph sync."""
    from .supabase_helpers import get_supabase_client
    from .integrations.microsoft_graph.sync import run_graph_sync

    client = get_supabase_client()
    result = run_graph_sync(client)
    result["project_backfill"] = _maybe_run_comm_project_backfill(client)
    return result


def _run_intelligence_compiler(
    source_limit: int = 10,
    packet_limit: int = 10,
    max_processing_time_ms: int = 120000,
) -> dict:
    """Synchronous wrapper for queued AI intelligence compiler work."""
    from .supabase_helpers import get_supabase_client
    from .intelligence.compiler import run_intelligence_compiler_batch

    client = get_supabase_client()
    return run_intelligence_compiler_batch(
        client,
        source_limit=source_limit,
        packet_limit=packet_limit,
        max_processing_time_ms=max_processing_time_ms,
    )


def _maybe_run_comm_project_backfill(client) -> dict:
    """Run bounded communication project assignment after ingestion jobs."""
    if os.getenv("COMM_PROJECT_BACKFILL_AFTER_SYNC", "true").lower() in ("0", "false", "no"):
        return {"status": "skipped", "reason": "disabled"}

    from .ingestion.communication_project_backfill import run_incremental_project_backfill

    result = run_incremental_project_backfill(client)
    if result.get("failed"):
        logger.warning("[Scheduler] Communication project backfill reported errors: %s", result)
    else:
        logger.info(
            "[Scheduler] Communication project backfill complete: scanned=%d assigned=%d",
            result.get("scanned", 0),
            result.get("assigned", 0),
        )
    return result


def _get_daily_recipients() -> list[str]:
    """Get daily digest email recipients from env var."""
    raw = os.getenv("DAILY_DIGEST_RECIPIENTS", "")
    if not raw:
        return []
    return [email.strip() for email in raw.split(",") if email.strip()]


def _send_recap_email(recipients: list[str], result: dict) -> None:
    """Send the daily recap email to configured recipients."""
    from .email_service import send_daily_recap_email
    from .daily_digest import generate_recap_html

    recap_text = result.get("recap_text", "")
    recap_html = generate_recap_html(recap_text)

    from datetime import datetime
    date_str = datetime.now().strftime("%B %d, %Y")

    send_result = send_daily_recap_email(
        to_emails=recipients,
        date_str=date_str,
        recap_html=recap_html,
        meeting_count=result.get("meeting_count", 0),
    )
    if send_result.get("success"):
        logger.info("[Scheduler] Daily recap email sent to %d recipients", len(recipients))
    else:
        logger.warning("[Scheduler] Daily recap email failed: %s", send_result.get("error"))
