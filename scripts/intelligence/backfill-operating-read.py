#!/usr/bin/env python3
"""Backfill LLM-synthesized rolling-state reads into project_current_state.

The compiler now produces real synthesized prose for the Project Intelligence
read fields (`synthesize_operating_read` in
`backend/src/services/intelligence/compiler.py`); fresh ingestion fills them
automatically. This one-off backfill regenerates them NOW for projects whose
read fields are empty/null (e.g. rows the raw-source repair nulled out), so the
dashboard shows real content without waiting for the next ingestion cycle.

For each project it pulls the most recent day of `source_syntheses` (RAG DB),
runs the SAME synthesis the pipeline uses, and writes the guarded result into
`project_current_state` (PM APP). Idempotent and fail-open per project.

Usage (from repo root, with backend/.env present):
    python scripts/intelligence/backfill-operating-read.py                 # dry run, all empty rows
    python scripts/intelligence/backfill-operating-read.py --apply         # write
    python scripts/intelligence/backfill-operating-read.py --apply --project 1009
    python scripts/intelligence/backfill-operating-read.py --apply --all   # include rows that already have prose
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

READ_FIELDS = ("current_summary", "financial_read", "schedule_read", "field_read")


def _load_env() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write changes (default: dry run)")
    parser.add_argument("--project", type=int, help="Only this project id")
    parser.add_argument("--all", action="store_true", help="Include rows that already have a current_summary")
    parser.add_argument("--limit", type=int, default=0, help="Cap number of projects (0 = no cap)")
    args = parser.parse_args()

    _load_env()
    os.environ.setdefault("INTELLIGENCE_OPERATING_SYNTHESIS_ENABLED", "true")

    from src.services.intelligence import compiler as C
    from src.services.supabase_helpers import get_rag_read_client, get_supabase_client

    pm = get_supabase_client()
    rag = get_rag_read_client()

    query = pm.table("project_current_state").select("project_id," + ",".join(READ_FIELDS))
    if args.project:
        query = query.eq("project_id", args.project)
    rows = query.execute().data or []

    targets = []
    for row in rows:
        has_prose = any(row.get(f) for f in READ_FIELDS)
        if args.all or not has_prose:
            targets.append(row["project_id"])
    if args.limit:
        targets = targets[: args.limit]

    print(f"candidate projects: {len(targets)} (mode={'ALL' if args.all else 'empty-only'})")
    synthesized = 0
    for pid in targets:
        synth_rows = (
            rag.table("source_syntheses")
            .select(
                "id,source_family,source_document_id,source_title,source_occurred_at,"
                "executive_summary,source_quotes,financial_signals,schedule_signals"
            )
            .eq("project_id", pid)
            .order("source_occurred_at", desc=True)
            .limit(12)
            .execute()
            .data
        ) or []
        if not synth_rows:
            print(f"  project {pid}: no source_syntheses — skipped")
            continue
        inputs = C._operating_synthesis_inputs(synth_rows)
        read = C.synthesize_operating_read(
            project_id=pid, project_label=C._project_label(pm, pid), inputs=inputs
        )
        if not read:
            print(f"  project {pid}: synthesis returned nothing usable — skipped")
            continue
        synthesized += 1
        filled = [f for f in READ_FIELDS if read.get(f)]
        print(f"  project {pid}: synthesized {filled}")
        print(f"      summary: {(read.get('current_summary') or '')[:140]}")
        if args.apply:
            update = {f: read.get(f) for f in READ_FIELDS}
            update["updated_at"] = C._utc_now()
            pm.table("project_current_state").update(update).eq("project_id", pid).execute()

    print()
    print(f"projects synthesized: {synthesized}")
    print("MODE: APPLIED" if args.apply else "MODE: DRY RUN (re-run with --apply to write)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
