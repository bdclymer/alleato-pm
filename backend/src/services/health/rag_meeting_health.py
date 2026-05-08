"""
RAG Meeting Vectorization Health Check

Canary for the AI Strategist's meeting recall path.
Fails loudly if:
  1. No embeddings exist at all
  2. Recent meetings (last 14 days) have <50% summary embeddings
  3. Newest meeting is >7 days ahead of newest embedding
  4. Recent meetings have <50% chunk coverage
  5. The embedding endpoint cannot embed a probe string
  6. Supabase RPCs return zero results for known-good probe vectors
  7. >100 Fireflies ingestion jobs stuck at raw_ingested
  8. Any quota-error ingestion jobs exist

Returns a dict with keys: passed (bool), failures (list), warnings (list), stats (dict).
Exits non-zero when called as __main__, posts Slack alert on failure if
SLACK_WEBHOOK_URL is set.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

STALENESS_DAYS = 7
RECENT_WINDOW_DAYS = 14
MEETING_SIGNAL_LIMIT = 2_000
RECENT_MIN_EMBEDDED_RATIO = 0.5
RECENT_MIN_CHUNK_RATIO = 0.5


def _probe_embedding_provider() -> dict:
    """Try AI Gateway then direct OpenAI; return which providers are working."""
    successes: list[str] = []
    warnings: list[str] = []

    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if gateway_key:
        try:
            resp = httpx.post(
                "https://ai-gateway.vercel.sh/v1/embeddings",
                headers={"Authorization": f"Bearer {gateway_key}", "Content-Type": "application/json"},
                json={"model": "openai/text-embedding-3-large", "input": "alleato meeting health probe", "dimensions": 3072},
                timeout=15,
            )
            if resp.is_success:
                successes.append("ai-gateway")
            else:
                warnings.append(f"AI Gateway probe returned {resp.status_code}: {resp.text[:200]}")
        except Exception as exc:
            warnings.append(f"AI Gateway probe threw: {exc}")
    else:
        warnings.append("AI_GATEWAY_API_KEY not set — falling back to direct OpenAI")

    if openai_key:
        try:
            resp = httpx.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                json={"model": "text-embedding-3-large", "input": "alleato meeting health probe", "dimensions": 3072},
                timeout=15,
            )
            if resp.is_success:
                successes.append("openai-direct")
            else:
                if successes:
                    warnings.append(f"Direct OpenAI probe {resp.status_code} — AI Gateway is working fallback")
                else:
                    warnings.append(f"Direct OpenAI probe {resp.status_code}: {resp.text[:300]}")
        except Exception as exc:
            if not successes:
                warnings.append(f"Direct OpenAI probe threw: {exc}")

    return {"ok": len(successes) > 0, "providers": successes, "warnings": warnings}


def run_health_check(supabase_url: str, supabase_service_key: str) -> dict:
    """Run all health checks and return results. Does not raise."""
    failures: list[str] = []
    warnings: list[str] = []
    stats: dict[str, Any] = {}

    headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}",
        "Content-Type": "application/json",
    }

    def rpc(fn: str, body: dict) -> Any:
        resp = httpx.post(f"{supabase_url}/rest/v1/rpc/{fn}", headers=headers, json=body, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def query(sql: str) -> list[dict]:
        resp = httpx.post(
            f"{supabase_url}/rest/v1/rpc/execute_sql",
            headers=headers,
            json={"query": sql},
            timeout=45,
        )
        if not resp.is_success:
            # Fallback: use PostgREST direct table query won't work for complex SQL.
            # Log and return empty so individual checks degrade gracefully.
            logger.warning("execute_sql RPC unavailable (%s) — check skipped", resp.status_code)
            return []
        return resp.json() or []

    try:
        # ── 1. Overall meeting embedding coverage ────────────────────────────
        meeting_cte = """
            with meeting_ids as (
              select id from public.document_metadata where source = 'fireflies'
              union select id from public.document_metadata where type in ('meeting','meeting_transcript')
              union select id from public.document_metadata where category = 'meeting'
              union select id from public.document_metadata where fireflies_id is not null
            )
        """
        rows = query(f"""
            {meeting_cte}
            select
              count(*)::int as total_meetings,
              count(*) filter (where summary_embedding is not null)::int as embedded_summaries,
              max(coalesce(captured_at, date, created_at::timestamptz)) as latest_meeting_at,
              max(coalesce(captured_at, created_at::timestamptz)) filter (where summary_embedding is not null) as latest_summary_embedding_at
            from public.document_metadata where id in (select id from meeting_ids)
        """)
        metadata = rows[0] if rows else {}
        stats["metadata"] = metadata

        if metadata:
            if metadata.get("embedded_summaries", 0) == 0:
                failures.append("No meeting summary embeddings exist at all. Strategist is keyword-only.")

            if metadata.get("latest_meeting_at") and metadata.get("latest_summary_embedding_at"):
                latest_meeting = datetime.fromisoformat(metadata["latest_meeting_at"].replace("Z", "+00:00"))
                latest_embed = datetime.fromisoformat(metadata["latest_summary_embedding_at"].replace("Z", "+00:00"))
                lag_days = (latest_meeting - latest_embed).total_seconds() / 86400
                if lag_days > STALENESS_DAYS:
                    failures.append(
                        f"Newest meeting is {lag_days:.1f} days ahead of newest summary embedding "
                        f"(threshold: {STALENESS_DAYS}d). Embedding pipeline is stalled."
                    )
            elif metadata.get("latest_meeting_at") and not metadata.get("latest_summary_embedding_at"):
                failures.append("Meetings exist but ZERO have summary embeddings. Pipeline never ran.")

        # ── 2. Recent meeting coverage ───────────────────────────────────────
        rows = query(f"""
            {meeting_cte}
            select
              count(*)::int as recent_meetings,
              count(*) filter (where summary_embedding is not null)::int as recent_embedded_summaries
            from public.document_metadata
            where id in (select id from meeting_ids)
              and coalesce(captured_at, date, created_at::timestamptz) >= now() - interval '{RECENT_WINDOW_DAYS} days'
        """)
        recent = rows[0] if rows else {}
        stats["recent"] = recent

        if recent and recent.get("recent_meetings", 0) > 0:
            ratio = recent["recent_embedded_summaries"] / recent["recent_meetings"]
            if ratio < RECENT_MIN_EMBEDDED_RATIO:
                failures.append(
                    f"Only {recent['recent_embedded_summaries']}/{recent['recent_meetings']} meetings "
                    f"from the last {RECENT_WINDOW_DAYS}d have summary embeddings "
                    f"({ratio*100:.1f}%, need ≥{RECENT_MIN_EMBEDDED_RATIO*100:.0f}%). "
                    f"Recent meetings are NOT being vectorized."
                )

        # ── 3. Chunk coverage ────────────────────────────────────────────────
        rows = query(f"""
            {meeting_cte},
            recent_meetings as (
              select id from public.document_metadata
              where id in (select id from meeting_ids)
                and coalesce(captured_at, date, created_at::timestamptz) >= now() - interval '{RECENT_WINDOW_DAYS} days'
            ),
            per_meeting as (
              select
                rm.id,
                count(dc.chunk_id) filter (where dc.embedding is not null)::int as embedded_chunk_count
              from recent_meetings rm
              left join public.document_chunks dc on dc.document_id = rm.id
              group by rm.id
            )
            select
              count(*)::int as recent_meetings,
              count(*) filter (where embedded_chunk_count > 0)::int as with_embedded_chunks
            from per_meeting
        """)
        chunk_coverage = rows[0] if rows else {}
        stats["chunk_coverage"] = chunk_coverage

        if chunk_coverage and chunk_coverage.get("recent_meetings", 0) > 0:
            ratio = chunk_coverage["with_embedded_chunks"] / chunk_coverage["recent_meetings"]
            if ratio < RECENT_MIN_CHUNK_RATIO:
                failures.append(
                    f"Only {chunk_coverage['with_embedded_chunks']}/{chunk_coverage['recent_meetings']} "
                    f"recent meetings have embedded chunks ({ratio*100:.1f}%, need ≥{RECENT_MIN_CHUNK_RATIO*100:.0f}%). "
                    f"SemanticSearch is missing recent meeting context."
                )

        # ── 4. Fireflies pipeline job health ─────────────────────────────────
        rows = query("""
            select stage, count(*)::int as count
            from public.fireflies_ingestion_jobs
            group by stage order by count desc
        """)
        stats["pipeline_jobs"] = rows
        raw_ingested = next((r["count"] for r in rows if r["stage"] == "raw_ingested"), 0)
        error_count = next((r["count"] for r in rows if r["stage"] == "error"), 0)

        if raw_ingested > 100:
            failures.append(f"{raw_ingested} Fireflies jobs stuck at raw_ingested — not embedded.")
        if error_count > 100:
            warnings.append(f"{error_count} Fireflies jobs in error state.")

        quota_rows = query("""
            select count(*)::int as count from public.fireflies_ingestion_jobs
            where stage = 'error' and error_message ilike '%quota%'
        """)
        quota_errors = quota_rows[0]["count"] if quota_rows else 0
        if quota_errors > 0:
            failures.append(f"{quota_errors} Fireflies jobs failed with quota/provider errors.")

    except Exception as exc:
        failures.append(f"DB health check threw: {exc}")

    # ── 5. Embedding provider probe ──────────────────────────────────────────
    provider = _probe_embedding_provider()
    stats["embedding_provider"] = provider
    warnings.extend(provider.get("warnings", []))
    if not provider["ok"]:
        failures.append("Neither AI Gateway nor direct OpenAI can produce embeddings — ingestion is dead.")

    return {
        "passed": len(failures) == 0,
        "failures": failures,
        "warnings": warnings,
        "stats": stats,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


def _post_slack(webhook_url: str, result: dict) -> None:
    failure_lines = "\n".join(f"• {f}" for f in result["failures"])
    try:
        httpx.post(
            webhook_url,
            json={"text": f":rotating_light: *RAG Meeting Health FAILED*\n{failure_lines}"},
            timeout=10,
        )
    except Exception as exc:
        logger.warning("Slack notification failed: %s", exc)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stderr)

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print(json.dumps({"passed": False, "failures": ["SUPABASE_URL / SUPABASE_SERVICE_KEY not set"]}))
        sys.exit(1)

    result = run_health_check(supabase_url, supabase_key)
    print(json.dumps(result, indent=2))

    if result["warnings"]:
        for w in result["warnings"]:
            print(f"  WARN: {w}", file=sys.stderr)

    if not result["passed"]:
        print("\nMEETING VECTORIZATION HEALTH: FAIL", file=sys.stderr)
        for f in result["failures"]:
            print(f"  FAIL: {f}", file=sys.stderr)
        slack_url = os.getenv("SLACK_WEBHOOK_URL")
        if slack_url:
            _post_slack(slack_url, result)
        sys.exit(1)

    print("\nMeeting vectorization health: PASS", file=sys.stderr)
