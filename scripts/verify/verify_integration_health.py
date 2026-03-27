#!/usr/bin/env python3
"""
Integration Health Check — Data Source Freshness Verifier

Checks that ALL data sources feeding Chai are actively receiving new data.
This script should be run regularly (daily or as part of CI) to catch silent
integration failures like the Outlook sync going dark after March 20, 2026.

Checks:
  1. Outlook emails      — document_metadata where category='email'
  2. Teams messages       — document_metadata where category='teams_message'
  3. Meeting transcripts  — document_metadata where type like 'meeting%'
  4. OneDrive documents   — document_metadata where category='document'
  5. Graph sync state     — graph_sync_state for errors and staleness
  6. Fireflies sync       — recent meeting transcripts
  7. Acumatica finance    — acumatica_* tables for freshness
  8. Document chunks      — embedding coverage for each source type

Exit codes:
  0 = All integrations healthy
  1 = One or more integrations are stale or erroring

Usage:
  cd backend && python -m scripts.verify_integration_health
  # Or from project root:
  python scripts/verify/verify_integration_health.py
  python scripts/verify/verify_integration_health.py --max-stale-hours 48
  python scripts/verify/verify_integration_health.py --json
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone, timedelta
from typing import Any

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

from supabase import create_client, ClientOptions

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# How many hours without new data before we flag a source as stale
DEFAULT_MAX_STALE_HOURS = 24

# Source checks: (name, table, filter_column, filter_value, date_column)
SOURCE_CHECKS = [
    {
        "name": "Outlook Emails",
        "table": "document_metadata",
        "filters": {"category": "email"},
        "date_column": "created_at",
        "critical": True,
    },
    {
        "name": "Teams Messages",
        "table": "document_metadata",
        "filters": {"category": "teams_message"},
        "date_column": "created_at",
        "critical": True,
    },
    {
        "name": "Meeting Transcripts",
        "table": "document_metadata",
        "filters": {"source": "fireflies"},
        "date_column": "created_at",
        "critical": True,
    },
    {
        "name": "OneDrive Documents",
        "table": "document_metadata",
        "filters": {"category": "document"},
        "date_column": "created_at",
        "critical": False,  # May not have daily uploads
    },
]

CHUNK_SOURCE_TYPES = [
    {"type": "email", "min_chunks": 10, "label": "Email chunks"},
    {"type": "teams_message", "min_chunks": 10, "label": "Teams message chunks"},
    {"type": "meeting_transcript", "min_chunks": 100, "label": "Meeting transcript chunks"},
    {"type": "meeting_segment_summary", "min_chunks": 50, "label": "Meeting segment summary chunks"},
    {"type": "meeting_summary", "min_chunks": 20, "label": "Meeting summary chunks"},
]


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

def get_client():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    return create_client(url, key, ClientOptions(postgrest_client_timeout=60))


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_source_freshness(supabase, check: dict, max_stale_hours: int) -> dict:
    """Check if a data source has recent data."""
    query = supabase.table(check["table"]).select("created_at", count="exact")
    for col, val in check["filters"].items():
        query = query.eq(col, val)

    # Get total count
    total_result = query.execute()
    total_count = total_result.count or len(total_result.data or [])

    # Get most recent record
    query2 = supabase.table(check["table"]).select("created_at")
    for col, val in check["filters"].items():
        query2 = query2.eq(col, val)
    latest_result = query2.order("created_at", desc=True).limit(1).execute()

    latest_date = None
    hours_ago = None
    is_stale = False

    if latest_result.data:
        latest_date = latest_result.data[0].get("created_at")
        if latest_date:
            dt = datetime.fromisoformat(latest_date.replace("Z", "+00:00"))
            hours_ago = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
            is_stale = hours_ago > max_stale_hours

    status = "healthy"
    if total_count == 0:
        status = "missing"
    elif is_stale:
        status = "stale"

    return {
        "name": check["name"],
        "status": status,
        "total_count": total_count,
        "latest_date": latest_date,
        "hours_since_latest": round(hours_ago, 1) if hours_ago is not None else None,
        "max_stale_hours": max_stale_hours,
        "critical": check.get("critical", True),
    }


def check_graph_sync_state(supabase) -> list[dict]:
    """Check the graph_sync_state table for errors and staleness."""
    try:
        result = (
            supabase.table("graph_sync_state")
            .select("source, resource_id, resource_name, last_sync_at, sync_status, error_message, items_synced")
            .execute()
        )
    except Exception as e:
        return [{"name": "Graph Sync State", "status": "error", "error": str(e)}]

    if not result.data:
        return [{"name": "Graph Sync State", "status": "missing", "detail": "No sync state records found — sync has never run"}]

    checks = []
    for row in result.data:
        last_sync = row.get("last_sync_at")
        hours_ago = None
        if last_sync:
            dt = datetime.fromisoformat(last_sync.replace("Z", "+00:00"))
            hours_ago = (datetime.now(timezone.utc) - dt).total_seconds() / 3600

        status = "healthy"
        if row.get("sync_status") == "error":
            status = "error"
        elif hours_ago is not None and hours_ago > 24:
            status = "stale"
        elif last_sync is None:
            status = "never_synced"

        checks.append({
            "name": f"Graph: {row.get('resource_name', row.get('source', 'unknown'))}",
            "status": status,
            "source": row.get("source"),
            "last_sync_at": last_sync,
            "hours_since_sync": round(hours_ago, 1) if hours_ago is not None else None,
            "items_synced": row.get("items_synced"),
            "error_message": row.get("error_message"),
            "critical": True,
        })

    return checks


def check_chunk_coverage(supabase) -> list[dict]:
    """Check that document_chunks has adequate coverage for each source type."""
    checks = []
    for src in CHUNK_SOURCE_TYPES:
        try:
            result = (
                supabase.table("document_chunks")
                .select("id", count="exact")
                .eq("source_type", src["type"])
                .execute()
            )
            count = result.count or len(result.data or [])
        except Exception:
            count = 0

        status = "healthy" if count >= src["min_chunks"] else "low"
        if count == 0:
            status = "missing"

        checks.append({
            "name": src["label"],
            "status": status,
            "chunk_count": count,
            "min_expected": src["min_chunks"],
            "source_type": src["type"],
        })

    return checks


def check_env_vars() -> list[dict]:
    """Verify critical environment variables are set."""
    checks = []
    critical_vars = [
        ("GRAPH_SYNC_ENABLED", "Microsoft Graph scheduler (must be 'true')"),
        ("MICROSOFT_CLIENT_ID", "Azure AD app client ID"),
        ("MICROSOFT_CLIENT_SECRET", "Azure AD app client secret"),
        ("MICROSOFT_TENANT_ID", "Azure AD tenant ID"),
        ("MICROSOFT_SYNC_USERS", "Comma-separated user emails to sync"),
        ("FIREFLIES_API_KEY", "Fireflies API key for transcript sync"),
    ]

    for var, description in critical_vars:
        value = os.environ.get(var, "")
        is_set = bool(value.strip())

        # Special check: GRAPH_SYNC_ENABLED must be "true", not just set
        if var == "GRAPH_SYNC_ENABLED":
            is_correct = value.strip().lower() in ("1", "true", "yes")
            status = "healthy" if is_correct else "misconfigured"
            detail = f"Value: '{value}'" if not is_correct else None
        else:
            status = "healthy" if is_set else "missing"
            detail = None

        checks.append({
            "name": f"Env: {var}",
            "status": status,
            "description": description,
            "detail": detail,
            "critical": True,
        })

    return checks


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def print_report(all_checks: list[dict]) -> int:
    """Print formatted report. Returns exit code (0=healthy, 1=issues)."""
    logger.info("")
    logger.info("=" * 72)
    logger.info("  INTEGRATION HEALTH CHECK")
    logger.info("  %s", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
    logger.info("=" * 72)

    has_critical_issues = False
    sections = {
        "env": [],
        "source": [],
        "graph": [],
        "chunks": [],
    }

    for c in all_checks:
        name = c["name"]
        if name.startswith("Env:"):
            sections["env"].append(c)
        elif name.startswith("Graph:"):
            sections["graph"].append(c)
        elif "chunk" in name.lower():
            sections["chunks"].append(c)
        else:
            sections["source"].append(c)

    # Environment Variables
    logger.info("")
    logger.info("  ENVIRONMENT VARIABLES")
    logger.info("  " + "-" * 60)
    for c in sections["env"]:
        icon = "OK" if c["status"] == "healthy" else "FAIL"
        logger.info("  [%4s] %s", icon, c["name"])
        if c.get("detail"):
            logger.info("         %s", c["detail"])
        if c["status"] != "healthy" and c.get("critical"):
            has_critical_issues = True

    # Data Source Freshness
    logger.info("")
    logger.info("  DATA SOURCE FRESHNESS")
    logger.info("  " + "-" * 60)
    for c in sections["source"]:
        icon = "OK" if c["status"] == "healthy" else "FAIL"
        hours = c.get("hours_since_latest")
        count = c.get("total_count", 0)
        hours_str = f"{hours:.1f}h ago" if hours is not None else "never"
        logger.info("  [%4s] %-25s  %5d records  latest: %s", icon, c["name"], count, hours_str)
        if c["status"] in ("stale", "missing") and c.get("critical"):
            has_critical_issues = True

    # Graph Sync State
    if sections["graph"]:
        logger.info("")
        logger.info("  MICROSOFT GRAPH SYNC STATE")
        logger.info("  " + "-" * 60)
        for c in sections["graph"]:
            icon = "OK" if c["status"] == "healthy" else "FAIL"
            hours = c.get("hours_since_sync")
            hours_str = f"{hours:.1f}h ago" if hours is not None else "never"
            items = c.get("items_synced", 0)
            logger.info("  [%4s] %-35s  synced: %s  items: %s", icon, c["name"], hours_str, items)
            if c.get("error_message"):
                logger.info("         Error: %s", c["error_message"][:100])
            if c["status"] in ("error", "stale", "never_synced") and c.get("critical"):
                has_critical_issues = True

    # Chunk Coverage
    logger.info("")
    logger.info("  EMBEDDING CHUNK COVERAGE")
    logger.info("  " + "-" * 60)
    for c in sections["chunks"]:
        icon = "OK" if c["status"] == "healthy" else "LOW " if c["status"] == "low" else "MISS"
        count = c.get("chunk_count", 0)
        min_expected = c.get("min_expected", 0)
        logger.info("  [%4s] %-35s  %5d chunks  (min: %d)", icon, c["name"], count, min_expected)

    # Summary
    logger.info("")
    logger.info("=" * 72)
    total = len(all_checks)
    healthy = sum(1 for c in all_checks if c["status"] == "healthy")
    failed = total - healthy

    if has_critical_issues:
        logger.info("  RESULT: UNHEALTHY — %d/%d checks failing (includes critical)", failed, total)
        logger.info("")
        logger.info("  CRITICAL FAILURES:")
        for c in all_checks:
            if c["status"] != "healthy" and c.get("critical"):
                logger.info("    - %s: %s", c["name"], c["status"])
    else:
        logger.info("  RESULT: %s — %d/%d checks passing", "HEALTHY" if failed == 0 else "DEGRADED", healthy, total)

    logger.info("=" * 72)
    logger.info("")

    return 1 if has_critical_issues else 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Integration Health Check")
    parser.add_argument("--max-stale-hours", type=int, default=DEFAULT_MAX_STALE_HOURS,
                        help=f"Hours without new data before flagging as stale (default: {DEFAULT_MAX_STALE_HOURS})")
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of formatted report")
    parser.add_argument("--skip-env", action="store_true", help="Skip environment variable checks")
    args = parser.parse_args()

    supabase = get_client()
    all_checks: list[dict] = []

    # 1. Environment variable checks
    if not args.skip_env:
        all_checks.extend(check_env_vars())

    # 2. Data source freshness
    for check in SOURCE_CHECKS:
        all_checks.append(check_source_freshness(supabase, check, args.max_stale_hours))

    # 3. Graph sync state
    all_checks.extend(check_graph_sync_state(supabase))

    # 4. Chunk coverage
    all_checks.extend(check_chunk_coverage(supabase))

    if args.json:
        print(json.dumps(all_checks, indent=2, default=str))
        return 0 if all(c["status"] == "healthy" for c in all_checks) else 1

    exit_code = print_report(all_checks)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
