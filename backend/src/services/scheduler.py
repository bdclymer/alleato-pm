"""
Scheduled analysis engine — runs periodic jobs via APScheduler.

Currently registered jobs:
  - Fireflies sync: every 15 min, fetches new transcripts and ingests via pipeline
  - Daily digest: 6 PM daily, aggregates meetings into executive briefing
  - Acumatica financial sync: periodic incremental ERP import into Supabase

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


def init_scheduler() -> None:
    """Initialize and start the scheduler. Called from FastAPI startup."""
    global scheduler

    if os.getenv("DISABLE_SCHEDULER", "").lower() in ("1", "true", "yes"):
        logger.info("[Scheduler] Disabled via DISABLE_SCHEDULER env var")
        return

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
        sync_interval_hours = max(1, int(os.getenv("ACUMATICA_FINANCIAL_SYNC_INTERVAL_HOURS", "4")))
        sync_minute = int(os.getenv("ACUMATICA_FINANCIAL_SYNC_MINUTE", "15"))
        scheduler.add_job(
            run_acumatica_financial_sync_job,
            CronTrigger(hour=f"*/{sync_interval_hours}", minute=sync_minute),
            id="acumatica_financial_sync",
            name="Acumatica Financial Sync",
            replace_existing=True,
            max_instances=1,
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
    except Exception as e:
        logger.error("[Scheduler] Fireflies sync failed: %s", e, exc_info=True)


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
    except Exception as e:
        logger.error("[Scheduler] Daily digest job failed: %s", e, exc_info=True)


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
    except Exception as e:
        logger.error("[Scheduler] Acumatica financial sync failed: %s", e, exc_info=True)


def _run_fireflies_sync(limit: int = 10):
    """Synchronous wrapper for Fireflies transcript sync."""
    from .supabase_helpers import SupabaseRagStore, get_supabase_client
    from .ingestion.fireflies_pipeline import FirefliesIngestionPipeline

    client = get_supabase_client()
    store = SupabaseRagStore(client)
    pipeline = FirefliesIngestionPipeline(store)
    return pipeline.sync_recent_transcripts(limit=limit)


def _run_digest_sync():
    """Synchronous wrapper for daily digest generation."""
    from .daily_digest import run_daily_digest
    return run_daily_digest()


def _run_acumatica_financial_sync():
    """Synchronous wrapper for Acumatica ERP finance sync."""
    from .acumatica_sync import run_acumatica_financial_sync

    return run_acumatica_financial_sync()


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
