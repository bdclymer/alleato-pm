"""
Scheduled analysis engine — runs periodic jobs via APScheduler.

Currently registered jobs:
  - Fireflies sync: every 15 min, fetches new transcripts and ingests via pipeline
  - Fireflies pipeline backlog: periodic drain of stale raw_ingested/provider-error jobs
  - Daily digest: 6 PM daily, aggregates meetings into executive briefing
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

from .ai_transport import is_transient_ai_error_message

logger = logging.getLogger(__name__)

scheduler: Optional[AsyncIOScheduler] = None

FIREFLIES_RETRYABLE_ERROR_MARKERS = (
    "quota",
    "provider",
    "embedding failed",
    "rate limit",
    "429",
    "ai gateway",
    "openai",
)

NON_VECTORIZABLE_ERROR_PREFIX = "NON_VECTORIZABLE"
INTENTIONAL_EMBEDDING_EXCLUSION_PREFIX = "INTENTIONALLY_EXCLUDED"
INTENTIONAL_EMBEDDING_EXCLUSION_STATUS = "intentionally_excluded"
SHARED_PIPELINE_BACKLOG_SOURCE = "document_pipeline"
SHARED_PIPELINE_BACKLOG_RESOURCE_NAME = "Shared document pipeline backlog"
TEXT_COMPATIBLE_EXTENSIONS = {
    ".csv",
    ".doc",
    ".docx",
    ".md",
    ".pdf",
    ".txt",
    ".tsv",
    ".xls",
    ".xlsx",
}
NON_TEXT_EXTENSIONS = {
    ".bmp",
    ".gif",
    ".heic",
    ".jpeg",
    ".jpg",
    ".mov",
    ".mp3",
    ".mp4",
    ".png",
    ".svg",
    ".tif",
    ".tiff",
    ".wav",
    ".webp",
    ".zip",
}


def _is_interview_title(title: Optional[str]) -> bool:
    return "interview" in str(title or "").lower()


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

    # Fireflies transcript sync — every 15 minutes by default
    if _env_flag_enabled("FIREFLIES_SYNC_ENABLED"):
        if _log_job_misconfiguration(
            "Fireflies sync",
            "FIREFLIES_SYNC_ENABLED",
            ("FIREFLIES_API_KEY",),
        ):
            logger.info("[Scheduler] Fireflies sync job was not registered.")
        else:
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

    if os.getenv("FIREFLIES_PIPELINE_BACKLOG_ENABLED", "true").lower() not in ("0", "false", "no"):
        backlog_interval_minutes = max(
            5,
            int(os.getenv("FIREFLIES_PIPELINE_BACKLOG_INTERVAL_MINUTES", "10")),
        )
        backlog_limit = min(
            3,
            max(1, int(os.getenv("FIREFLIES_PIPELINE_BACKLOG_LIMIT", "3"))),
        )
        backlog_stale_minutes = max(
            1,
            int(os.getenv("FIREFLIES_PIPELINE_BACKLOG_STALE_MINUTES", "120")),
        )
        scheduler.add_job(
            run_fireflies_pipeline_backlog_job,
            IntervalTrigger(minutes=backlog_interval_minutes),
            id="fireflies_pipeline_backlog",
            name="Fireflies Pipeline Backlog Drain",
            replace_existing=True,
            max_instances=1,
            kwargs={"limit": backlog_limit, "stale_minutes": backlog_stale_minutes},
        )
        logger.info(
            "[Scheduler] Fireflies pipeline backlog every %d min (limit=%d stale_minutes=%d)",
            backlog_interval_minutes,
            backlog_limit,
            backlog_stale_minutes,
        )

    if _env_flag_enabled("LEGACY_DAILY_DIGEST_ENABLED", default="false"):
        # Legacy meeting digest only. Executive Daily Brief runs through the
        # frontend AI Ops gateway and ai_work_runs ledger.
        digest_hour = int(os.getenv("DAILY_DIGEST_HOUR", "18"))
        digest_minute = int(os.getenv("DAILY_DIGEST_MINUTE", "0"))

        scheduler.add_job(
            run_daily_digest_job,
            CronTrigger(hour=digest_hour, minute=digest_minute),
            id="daily_digest",
            name="Legacy Daily Meeting Digest",
            replace_existing=True,
        )
    else:
        logger.warning(
            "[Scheduler] Legacy daily digest disabled. Executive Daily Brief must run through the AI Ops gateway."
        )

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
    graph_subscription_setting = os.getenv("GRAPH_SUBSCRIPTIONS_ENABLED", "auto").lower()
    graph_subscription_configured = bool(
        graph_has_creds
        and _has_any_env("MICROSOFT_GRAPH_WEBHOOK_NOTIFICATION_URL", "GRAPH_WEBHOOK_NOTIFICATION_URL")
        and _has_any_env("MICROSOFT_GRAPH_WEBHOOK_CLIENT_STATE", "GRAPH_WEBHOOK_CLIENT_STATE")
    )
    graph_subscriptions_enabled = (
        graph_subscription_setting in ("1", "true", "yes")
        or (graph_subscription_setting == "auto" and graph_subscription_configured)
    )
    graph_webhook_drain_setting = os.getenv("GRAPH_WEBHOOK_DRAIN_ENABLED", "auto").lower()
    graph_webhook_drain_enabled = (
        graph_webhook_drain_setting in ("1", "true", "yes")
        or (graph_webhook_drain_setting == "auto" and graph_subscriptions_enabled)
    )
    if graph_subscriptions_enabled:
        subscription_interval_minutes = max(
            15,
            int(os.getenv("GRAPH_SUBSCRIPTION_RECONCILE_INTERVAL_MINUTES", "60")),
        )
        scheduler.add_job(
            run_graph_subscription_reconcile_job,
            IntervalTrigger(minutes=subscription_interval_minutes),
            id="graph_subscription_reconcile",
            name="Microsoft Graph Webhook Subscription Renewal",
            replace_existing=True,
            max_instances=1,
        )
        logger.info(
            "[Scheduler] Microsoft Graph subscription reconcile every %d min",
            subscription_interval_minutes,
        )
    elif graph_subscription_setting not in ("0", "false", "no") and graph_has_creds:
        logger.warning(
            "[Scheduler] Microsoft Graph subscription reconcile disabled because webhook URL/clientState are not configured."
        )

    if graph_webhook_drain_enabled:
        webhook_drain_interval_minutes = max(
            1,
            int(os.getenv("GRAPH_WEBHOOK_DRAIN_INTERVAL_MINUTES", "3")),
        )
        webhook_drain_limit = min(
            10,
            max(1, int(os.getenv("GRAPH_WEBHOOK_DRAIN_MAX_MAILBOXES", "3"))),
        )
        scheduler.add_job(
            run_graph_webhook_drain_job,
            IntervalTrigger(minutes=webhook_drain_interval_minutes),
            id="graph_webhook_drain",
            name="Microsoft Graph Webhook Mailbox Drain",
            replace_existing=True,
            max_instances=1,
            kwargs={"limit": webhook_drain_limit},
        )
        logger.info(
            "[Scheduler] Microsoft Graph webhook drain every %d min (limit=%d)",
            webhook_drain_interval_minutes,
            webhook_drain_limit,
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
        if full_sync_job_enabled:
            graph_interval_minutes = max(5, int(os.getenv("GRAPH_SYNC_INTERVAL_MINUTES", "60")))
            scheduler.add_job(
                run_graph_sync_job,
                IntervalTrigger(minutes=graph_interval_minutes),
                id="graph_sync",
                name="Microsoft Graph Sync (Outlook / Teams / SharePoint)",
                replace_existing=True,
                max_instances=1,
            )
            logger.info(
                "[Scheduler] Microsoft Graph sync every %d min",
                graph_interval_minutes,
            )
        else:
            logger.info(
                "[Scheduler] Heavy Microsoft Graph full sweep DISABLED "
                "(GRAPH_FULL_SYNC_JOB_ENABLED=false) — webhook drain + embedding remain active."
            )

        if os.getenv("GRAPH_EMBEDDING_ENABLED", "true").lower() not in ("0", "false", "no"):
            graph_embedding_interval_minutes = max(
                1,
                int(os.getenv("GRAPH_EMBEDDING_INTERVAL_MINUTES", "5")),
            )
            graph_embedding_limit = min(
                25,
                max(1, int(os.getenv("GRAPH_EMBEDDING_LIMIT", "25"))),
            )
            scheduler.add_job(
                run_graph_embedding_job,
                IntervalTrigger(minutes=graph_embedding_interval_minutes),
                id="graph_embedding",
                name="Microsoft Graph Pending Embedding",
                replace_existing=True,
                max_instances=1,
                kwargs={"limit": graph_embedding_limit},
            )
            logger.info(
                "[Scheduler] Microsoft Graph embedding every %d min (limit=%d)",
                graph_embedding_interval_minutes,
                graph_embedding_limit,
            )

        if os.getenv("OUTLOOK_ATTACHMENT_PROMOTION_ENABLED", "true").lower() not in ("0", "false", "no"):
            attachment_promotion_interval_minutes = max(
                5,
                int(os.getenv("OUTLOOK_ATTACHMENT_PROMOTION_INTERVAL_MINUTES", "30")),
            )
            attachment_promotion_limit = min(
                25,
                max(1, int(os.getenv("OUTLOOK_ATTACHMENT_PROMOTION_LIMIT", "25"))),
            )
            scheduler.add_job(
                run_outlook_attachment_promotion_job,
                IntervalTrigger(minutes=attachment_promotion_interval_minutes),
                id="outlook_attachment_promotion",
                name="Outlook Attachment Document Promotion",
                replace_existing=True,
                max_instances=1,
                kwargs={"limit": attachment_promotion_limit},
            )
            logger.info(
                "[Scheduler] Outlook attachment promotion every %d min (limit=%d)",
                attachment_promotion_interval_minutes,
                attachment_promotion_limit,
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


async def run_fireflies_pipeline_backlog_job(
    limit: int = 10,
    stale_minutes: int = 120,
) -> None:
    """Scheduled job: drain stale Fireflies pipeline rows left after ingestion."""
    import asyncio

    logger.info(
        "[Scheduler] Running Fireflies pipeline backlog drain (limit=%d stale_minutes=%d)",
        limit,
        stale_minutes,
    )
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            _run_fireflies_pipeline_backlog,
            limit,
            stale_minutes,
        )
        logger.info(
            "[Scheduler] Fireflies pipeline backlog complete: matched=%d processed=%d skipped=%d failed=%d",
            result.get("matched", 0),
            result.get("processed", 0),
            result.get("skipped", 0),
            result.get("failed", 0),
        )
        if result.get("failed", 0):
            failed_results = [
                item
                for item in result.get("results", [])
                if item.get("status") == "failed"
            ]
            logger.warning(
                "[Scheduler] Fireflies pipeline backlog failures: %s",
                failed_results[:5],
            )
    except Exception as e:
        logger.warning(
            "[Scheduler] Fireflies pipeline backlog failed (will retry): %s",
            e,
            exc_info=True,
        )


async def run_daily_digest_job() -> None:
    """
    Scheduled job: generate daily digest and send email.

    Runs in an async context via APScheduler's AsyncIOScheduler.
    """
    import asyncio

    if not _env_flag_enabled("LEGACY_DAILY_DIGEST_ENABLED", default="false"):
        logger.warning(
            "[Scheduler] Legacy daily digest skipped. Executive Daily Brief must run through the AI Ops gateway."
        )
        return

    logger.info("[Scheduler] Running legacy daily digest job")
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


def _run_fireflies_sync(limit: int = 10):
    """Synchronous wrapper for Fireflies transcript sync."""
    from .supabase_helpers import SupabaseRagStore, get_supabase_client
    from .ingestion.fireflies_pipeline import FirefliesIngestionPipeline

    _guard_background_app_db("fireflies_sync")
    client = get_supabase_client()
    store = SupabaseRagStore(client)
    pipeline = FirefliesIngestionPipeline(store)
    result = pipeline.sync_recent_transcripts(limit=limit)
    result["project_backfill"] = _maybe_run_comm_project_backfill(client)
    return result


def _is_retryable_fireflies_error(error_message: Optional[str]) -> bool:
    if not error_message:
        return False
    normalized = error_message.lower()
    return any(marker in normalized for marker in FIREFLIES_RETRYABLE_ERROR_MARKERS) or (
        is_transient_ai_error_message(normalized)
    )


def _parse_scheduler_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _find_fireflies_pipeline_backlog_jobs(
    supabase,
    rag_supabase,
    *,
    limit: int,
    stale_minutes: int,
) -> list[dict]:
    """Find stale non-Graph pipeline jobs, newest source records first."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    from .supabase_helpers import rag_database_writes_enabled

    if rag_database_writes_enabled():
        rows = _find_fireflies_pipeline_backlog_jobs_supabase(
            supabase,
            rag_supabase,
            limit=limit,
            cutoff=cutoff,
        )
    else:
        try:
            rows = _find_fireflies_pipeline_backlog_jobs_sql(limit=limit, cutoff=cutoff)
        except Exception:
            logger.warning(
                "[Scheduler] SQL backlog candidate query failed; falling back to Supabase scan",
                exc_info=True,
            )
            rows = _find_fireflies_pipeline_backlog_jobs_supabase(
                supabase,
                rag_supabase,
                limit=limit,
                cutoff=cutoff,
            )

    jobs: list[dict] = []
    for row in rows:
        if not row.get("metadata_id"):
            continue
        changed_at = _parse_scheduler_datetime(row.get("updated_at")) or _parse_scheduler_datetime(
            row.get("created_at")
        )
        if changed_at and changed_at > cutoff:
            continue
        stage = row.get("stage")
        error_message = row.get("error_message")
        if stage == "raw_ingested" and not error_message:
            jobs.append(row)
        elif stage == "error" and _is_retryable_fireflies_error(error_message):
            jobs.append(row)
        if len(jobs) >= limit:
            break
    return jobs


def _find_fireflies_pipeline_backlog_jobs_sql(*, limit: int, cutoff: datetime) -> list[dict]:
    """Use Postgres ordering so small batches repair newest source data first."""
    database_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL or SUPABASE_DB_URL is required for SQL backlog selection")

    import psycopg2
    from psycopg2.extras import RealDictCursor

    candidate_limit = max(limit * 20, limit)
    query = """
        with candidate_jobs as (
          select
            fireflies_id,
            metadata_id,
            stage,
            error_message,
            created_at,
            updated_at
          from public.fireflies_ingestion_jobs
          where stage in ('raw_ingested', 'error')
            and metadata_id <> ''
            and updated_at <= %s
          order by updated_at desc
          limit %s
        )
        select
          fij.fireflies_id,
          fij.metadata_id,
          fij.stage,
          fij.error_message,
          fij.created_at,
          fij.updated_at,
          coalesce(dm.captured_at, dm.date, dm.created_at::timestamptz) as source_at
        from candidate_jobs fij
        join public.document_metadata dm on dm.id = fij.metadata_id
        where coalesce(dm.source, '') <> 'microsoft_graph'
          and coalesce(dm.captured_at, dm.date, dm.created_at::timestamptz) >= now() - interval '365 days'
        order by dm.captured_at desc nulls last,
          dm.date desc nulls last,
          dm.created_at desc nulls last,
          fij.updated_at desc
        limit %s
    """
    conn = None
    try:
        conn = psycopg2.connect(database_url, sslmode="require")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("set local statement_timeout = '15s'")
            cur.execute(query, (cutoff, candidate_limit, limit))
            return [dict(row) for row in cur.fetchall()]
    finally:
        if conn is not None:
            conn.close()


def _find_fireflies_pipeline_backlog_jobs_supabase(
    supabase,
    rag_supabase,
    *,
    limit: int,
    cutoff: datetime,
) -> list[dict]:
    raw_response = (
        rag_supabase.table("fireflies_ingestion_jobs")
        .select("fireflies_id, metadata_id, stage, error_message, created_at, updated_at")
        .eq("stage", "raw_ingested")
        .neq("metadata_id", "")
        .lte("updated_at", cutoff.isoformat())
        .order("updated_at", desc=True)
        .limit(limit * 10)
        .execute()
    )
    error_response = (
        rag_supabase.table("fireflies_ingestion_jobs")
        .select("fireflies_id, metadata_id, stage, error_message, created_at, updated_at")
        .eq("stage", "error")
        .neq("metadata_id", "")
        .lte("updated_at", cutoff.isoformat())
        .order("updated_at", desc=True)
        .limit(limit * 10)
        .execute()
    )
    rows = [*(raw_response.data or []), *(error_response.data or [])]
    metadata_ids = [row.get("metadata_id") for row in rows if row.get("metadata_id")]
    if not metadata_ids:
        return []

    metadata_response = (
        supabase.table("document_metadata")
        .select("id, source, captured_at, date, created_at")
        .in_("id", metadata_ids)
        .execute()
    )
    metadata_by_id = {
        row.get("id"): row
        for row in (metadata_response.data or [])
        if row.get("id")
    }

    filtered_rows: list[dict] = []
    min_source_at = datetime.now(timezone.utc) - timedelta(days=365)
    for row in rows:
        metadata = metadata_by_id.get(row.get("metadata_id"))
        if not metadata:
            continue
        if str(metadata.get("source") or "") == "microsoft_graph":
            continue
        source_at = (
            _parse_scheduler_datetime(metadata.get("captured_at"))
            or _parse_scheduler_datetime(metadata.get("date"))
            or _parse_scheduler_datetime(metadata.get("created_at"))
        )
        if source_at and source_at < min_source_at:
            continue
        filtered_rows.append({**row, "source_at": source_at.isoformat() if source_at else None})

    return filtered_rows


def _run_fireflies_full_pipeline(metadata_id: str) -> dict:
    from .pipeline import run_full_pipeline

    return run_full_pipeline(metadata_id=metadata_id)


def _file_extension(*values: Optional[str]) -> str:
    for value in values:
        if not value or "." not in value:
            continue
        suffix = value.rsplit(".", 1)[-1].strip().lower()
        if suffix:
            return f".{suffix.split('?', 1)[0].split('#', 1)[0]}"
    return ""


def _classify_non_vectorizable_fireflies_item(client, metadata_id: str) -> Optional[dict]:
    """Return a non-vectorizable reason before expensive pipeline work starts."""
    try:
        response = (
            client.table("document_metadata")
            .select("*")
            .eq("id", metadata_id)
            .single()
            .execute()
        )
    except Exception:
        return None

    metadata = response.data or {}
    if not metadata:
        return None

    title = metadata.get("title") or ""
    if _is_interview_title(title):
        return {
            "code": "interview_title_excluded",
            "intentional": True,
            "embedding_status": INTENTIONAL_EMBEDDING_EXCLUSION_STATUS,
            "message": (
                f"{INTENTIONAL_EMBEDDING_EXCLUSION_PREFIX}: Meeting title contains "
                '"Interview", so it is intentionally excluded from embedding/vectorization.'
            ),
            "metadata": {"title": title},
        }

    file_name = metadata.get("file_name") or title
    file_path = metadata.get("file_path") or ""
    url = metadata.get("url") or ""
    category = str(metadata.get("category") or "").lower()
    doc_type = str(metadata.get("type") or "").lower()
    content = (metadata.get("content") or metadata.get("raw_text") or "").strip()
    extension = _file_extension(file_name, file_path, url)

    if (
        extension in NON_TEXT_EXTENSIONS
        or category in {"image", "photo", "video", "audio"}
        or doc_type.startswith(("image/", "video/", "audio/"))
    ):
        label = file_name or title or metadata_id
        return {
            "code": "unsupported_file_type",
            "message": (
                f"{NON_VECTORIZABLE_ERROR_PREFIX}: Cannot extract searchable text from "
                f"{label}. Upload an OCR/text/PDF/DOCX version or keep it as a reference-only source."
            ),
            "metadata": {
                "extension": extension or None,
                "category": category or None,
                "type": doc_type or None,
            },
        }

    is_financial = category in {"financial", "financial_document", "budget", "estimate"} or extension in {
        ".csv",
        ".tsv",
        ".xls",
        ".xlsx",
    }
    if is_financial and not file_path:
        return {
            "code": "missing_file_path",
            "message": (
                f"{NON_VECTORIZABLE_ERROR_PREFIX}: Financial/tabular document is missing "
                "document_metadata.file_path, so the parser cannot download the source file."
            ),
            "metadata": {
                "extension": extension or None,
                "category": category or None,
                "type": doc_type or None,
            },
        }

    if extension and extension not in TEXT_COMPATIBLE_EXTENSIONS and not content:
        return {
            "code": "unsupported_file_extension",
            "message": (
                f"{NON_VECTORIZABLE_ERROR_PREFIX}: Unsupported source file extension "
                f"{extension}; no inline text content is available to vectorize."
            ),
            "metadata": {
                "extension": extension,
                "category": category or None,
                "type": doc_type or None,
            },
        }

    return None


def _mark_fireflies_item_non_vectorizable(
    client,
    *,
    metadata_id: str,
    reason: dict,
) -> None:
    from .supabase_helpers import get_rag_write_client

    error_message = str(reason.get("message") or NON_VECTORIZABLE_ERROR_PREFIX)[:500]
    intentional = bool(reason.get("intentional"))
    embedding_status = (
        str(reason.get("embedding_status"))
        if reason.get("embedding_status")
        else INTENTIONAL_EMBEDDING_EXCLUSION_STATUS
        if intentional
        else "not_vectorizable"
    )
    rag_client = get_rag_write_client()
    rag_client.table("fireflies_ingestion_jobs").update(
        {
            "stage": "done" if intentional else "error",
            "error_message": None if intentional else error_message,
        }
    ).eq("metadata_id", metadata_id).execute()
    try:
        rag_client.table("rag_document_metadata").upsert(
            {
                "id": metadata_id,
                "app_document_id": metadata_id,
                "embedding_status": embedding_status,
                "processing_metadata": {
                    "embedding_exclusion": {
                        "code": reason.get("code"),
                        "message": error_message,
                        "intentional": intentional,
                    }
                },
            }
        ).execute()
    except Exception:
        logger.warning(
            "[Scheduler] Could not mark rag_document_metadata embedding_status for %s",
            metadata_id,
            exc_info=True,
        )
    try:
        app_update = {"status": embedding_status}
        if not intentional:
            app_update["overview"] = error_message
        client.table("document_metadata").update(app_update).eq("id", metadata_id).execute()
    except Exception:
        logger.warning(
            "[Scheduler] Could not mark document_metadata non-vectorizable for %s",
            metadata_id,
            exc_info=True,
        )


def _close_abandoned_fireflies_backlog_runs(stale_minutes: int = 120) -> int:
    """Fail loudly on orphaned backlog runs that never wrote a terminal status."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=max(stale_minutes, 1))
    try:
        from .supabase_helpers import get_rag_write_client

        client = get_rag_write_client()
        rows = (
            client.table("source_sync_runs")
            .select("id, metadata")
            .eq("resource_id", "fireflies_ingestion_jobs")
            .eq("stage", "vectorization")
            .eq("status", "running")
            .lte("started_at", cutoff.isoformat())
            .limit(100)
            .execute()
        ).data or []
        closed = 0
        for row in rows:
            metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
            client.table("source_sync_runs").update(
                {
                    "status": "failed",
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "error_code": "ABANDONED_RUNNING_ROW",
                    "error_message": (
                        "Shared document pipeline backlog run was left running and was "
                        "auto-closed by a later scheduler pass."
                    ),
                    "metadata": {
                        **metadata,
                        "auto_closed": True,
                        "auto_closed_reason": "abandoned_running_row",
                        "auto_closed_at": datetime.now(timezone.utc).isoformat(),
                    },
                }
            ).eq("id", row["id"]).execute()
            closed += 1
        return closed
    except Exception:
        logger.warning(
            "[Scheduler] Failed to auto-close abandoned shared pipeline backlog rows",
            exc_info=True,
        )
        return 0


def _record_fireflies_backlog_run(client, result: dict) -> None:
    try:
        from .health.source_sync_health import record_sync_run, update_sync_run

        failed = result.get("failed", 0)
        skipped = result.get("skipped", 0)
        status = "failed" if failed else "warning" if skipped else "succeeded"
        error_code = (
            "FIREFLIES_BACKLOG_FAILURE"
            if failed
            else "FIREFLIES_BACKLOG_NON_VECTORIZABLE"
            if skipped
            else None
        )
        error_message = (
            f"{failed} Fireflies backlog jobs failed"
            if failed
            else f"{skipped} Fireflies backlog jobs marked non-vectorizable"
            if skipped
            else None
        )
        metadata = {
            "limit": result.get("limit"),
            "stale_minutes": result.get("stale_minutes"),
            "results": result.get("results", [])[:20],
        }
        run_id = result.get("run_id")
        if run_id:
            update_sync_run(
                client,
                run_id,
                status=status,
                items_seen=result.get("matched", 0),
                items_synced=result.get("processed", 0),
                items_skipped=skipped,
                items_failed=failed,
                error_code=error_code,
                error_message=error_message,
                metadata=metadata,
            )
        else:
            record_sync_run(
                client,
                source=SHARED_PIPELINE_BACKLOG_SOURCE,
                resource_id="fireflies_ingestion_jobs",
                resource_name=SHARED_PIPELINE_BACKLOG_RESOURCE_NAME,
                stage="vectorization",
                status=status,
                items_seen=result.get("matched", 0),
                items_synced=result.get("processed", 0),
                items_skipped=skipped,
                items_failed=failed,
                error_code=error_code,
                error_message=error_message,
                metadata=metadata,
            )
    except Exception:
        logger.warning(
            "[Scheduler] Failed to record Fireflies backlog source_sync_run",
            exc_info=True,
        )


def _start_fireflies_backlog_run(client, result: dict) -> Optional[str]:
    try:
        from .health.source_sync_health import record_sync_run

        row = record_sync_run(
            client,
            source=SHARED_PIPELINE_BACKLOG_SOURCE,
            resource_id="fireflies_ingestion_jobs",
            resource_name=SHARED_PIPELINE_BACKLOG_RESOURCE_NAME,
            stage="vectorization",
            status="running",
            items_seen=result.get("matched", 0),
            metadata={
                "limit": result.get("limit"),
                "stale_minutes": result.get("stale_minutes"),
                "message": "Fireflies backlog drain started.",
            },
        )
        return row.get("id")
    except Exception:
        logger.warning(
            "[Scheduler] Failed to record Fireflies backlog start row",
            exc_info=True,
        )
        return None


def _run_fireflies_pipeline_backlog(limit: int = 10, stale_minutes: int = 120) -> dict:
    """Drain stale shared document-pipeline rows through the normal full pipeline."""
    from .supabase_helpers import get_rag_write_client, get_supabase_client

    _guard_background_app_db("fireflies_pipeline_backlog")
    client = get_supabase_client()
    rag_client = get_rag_write_client()
    auto_closed_runs = _close_abandoned_fireflies_backlog_runs(stale_minutes=stale_minutes)
    jobs = _find_fireflies_pipeline_backlog_jobs(
        client,
        rag_client,
        limit=limit,
        stale_minutes=stale_minutes,
    )
    result = {
        "status": "ok",
        "limit": limit,
        "stale_minutes": stale_minutes,
        "matched": len(jobs),
        "processed": 0,
        "skipped": 0,
        "failed": 0,
        "auto_closed_runs": auto_closed_runs,
        "results": [],
    }
    result["run_id"] = _start_fireflies_backlog_run(client, result)
    if not jobs:
        _record_fireflies_backlog_run(client, result)
        return result

    for job in jobs:
        metadata_id = job.get("metadata_id")
        fireflies_id = job.get("fireflies_id")
        try:
            non_vectorizable = _classify_non_vectorizable_fireflies_item(client, metadata_id)
            if non_vectorizable:
                _mark_fireflies_item_non_vectorizable(
                    client,
                    metadata_id=metadata_id,
                    reason=non_vectorizable,
                )
                result["skipped"] += 1
                result["results"].append(
                    {
                        "fireflies_id": fireflies_id,
                        "metadata_id": metadata_id,
                        "status": "skipped",
                        "skip_code": non_vectorizable.get("code"),
                        "previous_stage": job.get("stage"),
                        "error": non_vectorizable.get("message"),
                    }
                )
                continue
            pipeline_result = _run_fireflies_full_pipeline(metadata_id)
            result["processed"] += 1
            result["results"].append(
                {
                    "fireflies_id": fireflies_id,
                    "metadata_id": metadata_id,
                    "status": "processed",
                    "pipeline_status": pipeline_result.get("status"),
                    "previous_stage": job.get("stage"),
                }
            )
        except Exception as exc:
            result["failed"] += 1
            logger.error(
                "[Scheduler] Fireflies backlog job failed metadata_id=%s fireflies_id=%s: %s",
                metadata_id,
                fireflies_id,
                exc,
                exc_info=True,
            )
            result["results"].append(
                {
                    "fireflies_id": fireflies_id,
                    "metadata_id": metadata_id,
                    "status": "failed",
                    "previous_stage": job.get("stage"),
                    "error": str(exc)[:500],
                }
            )

    result["status"] = "failed" if result["failed"] else "warning" if result["skipped"] else "ok"
    _record_fireflies_backlog_run(client, result)
    return result


def _run_digest_sync():
    """Synchronous wrapper for daily digest generation."""
    from .daily_digest import run_daily_digest
    _guard_background_app_db("daily_digest")
    return run_daily_digest()


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


async def run_graph_sync_job() -> None:
    """Scheduled job: fetch changed Outlook, Teams, and SharePoint rows via Microsoft Graph."""
    import asyncio

    logger.info("[Scheduler] Running Microsoft Graph fetch-only sync job")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_graph_sync)
        logger.info(
            "[Scheduler] Microsoft Graph fetch-only sync complete: %d total synced (outlook=%d, teams=%d, sharepoint=%d)",
            result.get("total_synced", 0),
            result.get("outlook", 0),
            result.get("teams", 0),
            result.get("sharepoint", 0),
        )
        if result.get("errors"):
            logger.warning("[Scheduler] Graph sync reported errors: %s", result["errors"])
    except ConfigurationError as e:
        logger.critical("[Scheduler] Microsoft Graph sync disabled — fix config and restart: %s", e)
        if scheduler:
            scheduler.remove_job("graph_sync")
    except Exception as e:
        logger.warning("[Scheduler] Microsoft Graph sync failed (will retry): %s", e, exc_info=True)


async def run_graph_subscription_reconcile_job() -> None:
    """Scheduled job: create or renew Microsoft Graph webhook subscriptions."""
    import asyncio

    logger.info("[Scheduler] Running Microsoft Graph subscription reconcile job")
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_graph_subscription_reconcile)
        logger.info("[Scheduler] Microsoft Graph subscription reconcile complete: %s", result)
        if result.get("errors"):
            logger.warning("[Scheduler] Graph subscription reconcile reported errors: %s", result["errors"])
    except Exception as e:
        logger.warning("[Scheduler] Microsoft Graph subscription reconcile failed (will retry): %s", e, exc_info=True)


async def run_graph_webhook_drain_job(limit: int = 3) -> None:
    """Scheduled job: drain queued Outlook mailboxes from Graph webhook notifications."""
    import asyncio

    logger.info("[Scheduler] Running Microsoft Graph webhook drain job (limit=%d)", limit)
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_graph_webhook_drain, limit)
        logger.info("[Scheduler] Microsoft Graph webhook drain complete: %s", result)
        if result.get("failed"):
            logger.warning("[Scheduler] Graph webhook drain reported failures: %s", result)
    except Exception as e:
        logger.warning("[Scheduler] Microsoft Graph webhook drain failed (will retry): %s", e, exc_info=True)


async def run_graph_embedding_job(limit: int = 100) -> None:
    """Scheduled job: vectorize pending Graph document rows without fetching new source data."""
    import asyncio

    logger.info("[Scheduler] Running Microsoft Graph embedding job (limit=%d)", limit)
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_graph_embedding, limit)
        logger.info("[Scheduler] Microsoft Graph embedding complete: %s", result)
        if result.get("errors"):
            logger.warning("[Scheduler] Graph embedding reported errors: %s", result)
    except Exception as e:
        logger.warning("[Scheduler] Graph embedding failed (will retry): %s", e, exc_info=True)


async def run_outlook_attachment_promotion_job(limit: int = 25) -> None:
    """Scheduled job: promote important Outlook attachments into project documents."""
    import asyncio

    logger.info("[Scheduler] Running Outlook attachment promotion job (limit=%d)", limit)
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _run_outlook_attachment_promotion, limit)
        logger.info("[Scheduler] Outlook attachment promotion complete: %s", result)
        if result.get("failed"):
            logger.warning("[Scheduler] Outlook attachment promotion had failures: %s", result.get("failures"))
    except Exception as e:
        logger.warning("[Scheduler] Outlook attachment promotion failed (will retry): %s", e, exc_info=True)


def _run_graph_sync():
    """Synchronous wrapper for Microsoft Graph fetch-only sync."""
    from .supabase_helpers import get_supabase_client
    from .integrations.microsoft_graph.sync import run_graph_sync

    _guard_background_app_db("graph_sync")
    client = get_supabase_client()
    run_inline_embedding = os.getenv("GRAPH_SYNC_RUN_EMBEDDING_INLINE", "false").lower() in (
        "1",
        "true",
        "yes",
    )
    result = run_graph_sync(
        client,
        run_embedding=run_inline_embedding,
    )
    result["project_backfill"] = _maybe_run_comm_project_backfill(client)
    return result


def _run_outlook_attachment_promotion(limit: int = 25) -> dict:
    """Synchronous wrapper for Outlook attachment document promotion."""
    from .supabase_helpers import get_supabase_client
    from .integrations.microsoft_graph.attachment_promotion import promote_outlook_intake_attachments

    _guard_background_app_db("outlook_attachment_promotion")
    return promote_outlook_intake_attachments(get_supabase_client(), limit=limit)


def _run_graph_subscription_reconcile() -> dict:
    """Synchronous wrapper for Graph webhook subscription lifecycle maintenance."""
    from .supabase_helpers import get_supabase_client
    from .integrations.microsoft_graph.subscriptions import ensure_subscriptions

    _guard_background_app_db("graph_subscription_reconcile")
    client = get_supabase_client()
    renew_within_hours = max(
        1,
        min(int(os.getenv("GRAPH_SUBSCRIPTION_RENEW_WITHIN_HOURS", "12")), 24),
    )
    expiration_hours = max(
        1,
        min(int(os.getenv("GRAPH_SUBSCRIPTION_EXPIRATION_HOURS", "48")), 48),
    )
    return ensure_subscriptions(
        client,
        renew_within_hours=renew_within_hours,
        expiration_hours=expiration_hours,
    )


def _run_graph_webhook_drain(limit: int = 3) -> dict:
    """Synchronous wrapper for draining queued Outlook webhook mailbox work."""
    from .supabase_helpers import get_supabase_client
    from .integrations.microsoft_graph.sync import drain_pending_outlook_mailboxes

    _guard_background_app_db("graph_webhook_drain")
    return drain_pending_outlook_mailboxes(get_supabase_client(), limit=limit)


def _run_graph_embedding(limit: int = 100) -> dict:
    """Synchronous wrapper for pending Microsoft Graph vectorization work."""
    from .supabase_helpers import get_supabase_client
    from .integrations.microsoft_graph.embed import embed_pending_graph_documents

    _guard_background_app_db("graph_embedding")
    client = get_supabase_client()
    return embed_pending_graph_documents(client, limit=limit)


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
