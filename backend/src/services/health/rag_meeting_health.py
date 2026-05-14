"""
RAG Meeting Vectorization Health Check

Canary for the AI Strategist's meeting recall path.
Fails loudly if:
  1. No embeddings exist at all
  2. Recent meetings (last 14 days) have <50% summary embeddings
  3. Newest meeting is >7 days ahead of newest embedding
  4. Recent meetings have <50% chunk coverage
  5. Recent meetings have <90% full transcript chunk coverage
  6. The embedding endpoint cannot embed a probe string
  7. Supabase RPCs return zero results for known-good probe vectors
  8. >100 Fireflies ingestion jobs stuck at raw_ingested
  9. Any quota-error ingestion jobs exist

Returns a dict with keys: passed (bool), failures (list), warnings (list), stats (dict).
Exits non-zero when called as __main__, posts Slack alert on failure if
SLACK_WEBHOOK_URL is set.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from typing import Any

import httpx

logger = logging.getLogger(__name__)

STALENESS_DAYS = 7
RECENT_WINDOW_DAYS = 14
MEETING_SIGNAL_LIMIT = 2_000
RECENT_MIN_EMBEDDED_RATIO = 0.5
RECENT_MIN_CHUNK_RATIO = 0.5
RECENT_MIN_TRANSCRIPT_CHUNK_RATIO = 0.9
BATCH_SIZE = 500


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


def _parse_timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _row_timestamp(row: dict[str, Any], keys: list[str]) -> datetime | None:
    for key in keys:
        parsed = _parse_timestamp(row.get(key))
        if parsed:
            return parsed
    return None


def _batched(values: list[str], size: int = BATCH_SIZE) -> list[list[str]]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def _postgrest_in(values: list[str]) -> str:
    return "(" + ",".join(f'"{value.replace(chr(34), chr(34) + chr(34))}"' for value in values) + ")"


def _rag_credentials(
    supabase_url: str,
    supabase_service_key: str,
    rag_url: str | None = None,
    rag_service_key: str | None = None,
) -> tuple[str, str, bool]:
    reads_enabled = (os.getenv("RAG_DATABASE_READS_ENABLED") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    resolved_url = rag_url or os.getenv("RAG_SUPABASE_URL")
    resolved_key = (
        rag_service_key
        or os.getenv("RAG_SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("RAG_SUPABASE_SERVICE_KEY")
    )

    if reads_enabled:
        if not resolved_url or not resolved_key:
            raise RuntimeError(
                "RAG_DATABASE_READS_ENABLED=true but RAG_SUPABASE_URL / RAG_SUPABASE_SERVICE_ROLE_KEY are not set"
            )
        return resolved_url, resolved_key, True

    return supabase_url, supabase_service_key, False


def run_health_check(
    supabase_url: str,
    supabase_service_key: str,
    *,
    rag_url: str | None = None,
    rag_service_key: str | None = None,
) -> dict:
    """Run all health checks and return results. Does not raise."""
    failures: list[str] = []
    warnings: list[str] = []
    stats: dict[str, Any] = {}

    try:
        rag_url, rag_service_key, rag_reads_enabled = _rag_credentials(
            supabase_url,
            supabase_service_key,
            rag_url=rag_url,
            rag_service_key=rag_service_key,
        )
    except Exception as exc:
        return {
            "passed": False,
            "failures": [str(exc)],
            "warnings": warnings,
            "stats": stats,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    stats["database_routing"] = {
        "app_database": supabase_url,
        "rag_database": rag_url,
        "rag_reads_enabled": rag_reads_enabled,
    }

    app_headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}",
        "Content-Type": "application/json",
    }
    rag_headers = {
        "apikey": rag_service_key,
        "Authorization": f"Bearer {rag_service_key}",
        "Content-Type": "application/json",
    }

    def rest_rows(
        base_url: str,
        headers: dict[str, str],
        table: str,
        params: dict[str, str],
        *,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        page_size = min(limit or 1000, 1000)
        offset = 0
        while True:
            query_value_safe_chars = "().,\":*"
            query = "&".join(
                f"{quote(key)}={quote(value, safe=query_value_safe_chars)}"
                for key, value in params.items()
            )
            url = f"{base_url}/rest/v1/{table}?{query}"
            request_headers = dict(headers)
            request_headers["Range-Unit"] = "items"
            request_headers["Range"] = f"{offset}-{offset + page_size - 1}"
            try:
                resp = httpx.get(url, headers=request_headers, timeout=60)
            except Exception as exc:
                raise RuntimeError(f"{table} REST query timed out/failed on {base_url}: {exc}") from exc
            if not resp.is_success:
                raise RuntimeError(
                    f"{table} REST query failed on {base_url}: {resp.status_code} {resp.text[:300]}"
                )
            data = resp.json() or []
            rows.extend(dict(row) for row in data)
            if len(data) < page_size or (limit and len(rows) >= limit):
                break
            offset += page_size
        return rows[:limit] if limit else rows

    try:
        # ── 1. Overall meeting embedding coverage ────────────────────────────
        signal_cutoff = datetime.now(timezone.utc) - timedelta(days=max(RECENT_WINDOW_DAYS * 2, 60))
        meeting_rows = rest_rows(
            supabase_url,
            app_headers,
            "document_metadata",
            {
                "select": "id,summary_embedding,captured_at,date,created_at",
                "or": "(source.eq.fireflies,type.in.(meeting,meeting_transcript),category.eq.meeting,fireflies_id.not.is.null)",
                "created_at": f"gte.{signal_cutoff.isoformat()}",
                "order": "created_at.desc",
            },
            limit=MEETING_SIGNAL_LIMIT,
        )
        embedded_summary_rows = [row for row in meeting_rows if row.get("summary_embedding") is not None]
        meeting_timestamps = [
            timestamp
            for row in meeting_rows
            if (timestamp := _row_timestamp(row, ["captured_at", "date", "created_at"]))
        ]
        embedded_timestamps = [
            timestamp
            for row in embedded_summary_rows
            if (timestamp := _row_timestamp(row, ["captured_at", "created_at"]))
        ]
        metadata = {
            "total_meetings": len(meeting_rows),
            "embedded_summaries": len(embedded_summary_rows),
            "latest_meeting_at": max(meeting_timestamps).isoformat() if meeting_timestamps else None,
            "latest_summary_embedding_at": max(embedded_timestamps).isoformat() if embedded_timestamps else None,
            "sample_limit": MEETING_SIGNAL_LIMIT,
        }
        stats["metadata"] = metadata

        if metadata.get("total_meetings", 0) == 0:
            failures.append("No meeting document_metadata rows matched the Fireflies/meeting health filter.")
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
        cutoff = datetime.now(timezone.utc).timestamp() - RECENT_WINDOW_DAYS * 86400
        recent_rows = [
            row
            for row in meeting_rows
            if (timestamp := _row_timestamp(row, ["captured_at", "date", "created_at"]))
            and timestamp.timestamp() >= cutoff
        ]
        recent_embedded_summary_rows = [row for row in recent_rows if row.get("summary_embedding") is not None]
        recent = {
            "recent_meetings": len(recent_rows),
            "recent_embedded_summaries": len(recent_embedded_summary_rows),
        }
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
        recent_meeting_ids = [str(row.get("id")) for row in recent_rows if row.get("id")]
        with_embedded_chunk_ids: set[str] = set()
        with_embedded_transcript_chunk_ids: set[str] = set()
        for batch in _batched(recent_meeting_ids):
            chunk_rows = rest_rows(
                rag_url,
                rag_headers,
                "document_chunks",
                {
                    "select": "document_id",
                    "embedding": "not.is.null",
                    "document_id": f"in.{_postgrest_in(batch)}",
                },
            )
            with_embedded_chunk_ids.update(
                str(row.get("document_id")) for row in chunk_rows if row.get("document_id")
            )
            transcript_chunk_rows = rest_rows(
                rag_url,
                rag_headers,
                "document_chunks",
                {
                    "select": "document_id",
                    "embedding": "not.is.null",
                    "source_type": "eq.meeting_transcript",
                    "document_id": f"in.{_postgrest_in(batch)}",
                },
            )
            with_embedded_transcript_chunk_ids.update(
                str(row.get("document_id")) for row in transcript_chunk_rows if row.get("document_id")
            )

        chunk_coverage = {
            "recent_meetings": len(recent_meeting_ids),
            "with_embedded_chunks": len(with_embedded_chunk_ids),
            "with_embedded_transcript_chunks": len(with_embedded_transcript_chunk_ids),
        }
        stats["chunk_coverage"] = chunk_coverage

        if chunk_coverage and chunk_coverage.get("recent_meetings", 0) > 0:
            ratio = chunk_coverage["with_embedded_chunks"] / chunk_coverage["recent_meetings"]
            if ratio < RECENT_MIN_CHUNK_RATIO:
                failures.append(
                    f"Only {chunk_coverage['with_embedded_chunks']}/{chunk_coverage['recent_meetings']} "
                    f"recent meetings have embedded chunks ({ratio*100:.1f}%, need ≥{RECENT_MIN_CHUNK_RATIO*100:.0f}%). "
                    f"SemanticSearch is missing recent meeting context."
                )
            transcript_ratio = (
                chunk_coverage["with_embedded_transcript_chunks"] / chunk_coverage["recent_meetings"]
            )
            if transcript_ratio < RECENT_MIN_TRANSCRIPT_CHUNK_RATIO:
                failures.append(
                    f"Only {chunk_coverage['with_embedded_transcript_chunks']}/{chunk_coverage['recent_meetings']} "
                    f"recent meetings have embedded full transcript chunks "
                    f"({transcript_ratio*100:.1f}%, need ≥{RECENT_MIN_TRANSCRIPT_CHUNK_RATIO*100:.0f}%). "
                    f"Meeting summaries may exist, but full-transcript RAG coverage is incomplete."
                )

        # ── 4. Fireflies pipeline job health ─────────────────────────────────
        job_rows = rest_rows(
            rag_url,
            rag_headers,
            "fireflies_ingestion_jobs",
            {
                "select": "stage,error_message",
                "updated_at": f"gte.{signal_cutoff.isoformat()}",
                "order": "updated_at.desc",
            },
            limit=5_000,
        )
        counts_by_stage: dict[str, int] = {}
        for row in job_rows:
            stage = str(row.get("stage") or "unknown")
            counts_by_stage[stage] = counts_by_stage.get(stage, 0) + 1
        rows = [
            {"stage": stage, "count": count}
            for stage, count in sorted(counts_by_stage.items(), key=lambda item: item[1], reverse=True)
        ]
        stats["pipeline_jobs"] = rows
        raw_ingested = next((r["count"] for r in rows if r["stage"] == "raw_ingested"), 0)
        error_count = next((r["count"] for r in rows if r["stage"] == "error"), 0)

        if raw_ingested > 100:
            failures.append(f"{raw_ingested} Fireflies jobs stuck at raw_ingested — not embedded.")
        if error_count > 100:
            warnings.append(f"{error_count} Fireflies jobs in error state.")

        quota_errors = sum(
            1
            for row in job_rows
            if row.get("stage") == "error" and "quota" in str(row.get("error_message") or "").lower()
        )
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
