#!/usr/bin/env python3
"""Repair raw-source corruption in project_current_state (PM APP).

The L2 rolling-state synthesizer used to project a raw source document (an
email with headers, &nbsp; entities, signatures) into the Project Intelligence
read fields when it had no real synthesis. The synthesizer is now guarded
(`_safe_summary` in backend/src/services/intelligence/compiler.py) so those
fields are either synthesized prose or NULL — never a raw source.

This one-off script applies the SAME guard to existing rows so the corrupted
data is repaired the way a fresh synthesis run would now produce it: any read
field that still reads as a raw source is set to NULL; clean prose is kept.
It reuses the real guard from the compiler so the repair can never drift from
the write-path contract.

Usage:
    # from repo root, with backend/.env present
    python scripts/intelligence/repair-raw-source-current-state.py            # dry run
    python scripts/intelligence/repair-raw-source-current-state.py --apply    # write
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND))


def _load_env() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


READ_FIELDS = ("current_summary", "financial_read", "schedule_read", "field_read")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write changes (default: dry run)")
    args = parser.parse_args()

    _load_env()

    # Reuse the real guard so repair == write-path contract (no drift).
    from src.services.intelligence.compiler import _looks_like_raw_source, _safe_summary

    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    if not key:
        print("Missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY", file=sys.stderr)
        return 1
    ref = url.split("//")[1].split(".")[0]
    print(f"PM APP project ref: {ref}  (expected lgveqfnpkxvzbnnwuled)")

    sb = create_client(url, key)
    rows = (
        sb.table("project_current_state")
        .select("project_id," + ",".join(READ_FIELDS))
        .execute()
        .data
    )

    repaired = 0
    field_changes = {field: 0 for field in READ_FIELDS}
    for row in rows:
        updates = {}
        for field in READ_FIELDS:
            value = row.get(field)
            if value and _looks_like_raw_source(value):
                # _safe_summary strips entities; if it's still raw it returns
                # None. A raw email never survives — exactly the new contract.
                updates[field] = _safe_summary(value)
                field_changes[field] += 1
        if not updates:
            continue
        repaired += 1
        pid = row["project_id"]
        nulled = [f for f, v in updates.items() if v is None]
        kept = [f for f, v in updates.items() if v is not None]
        print(f"  project {pid}: null -> {nulled}" + (f"; sanitized -> {kept}" if kept else ""))
        if args.apply:
            sb.table("project_current_state").update(updates).eq("project_id", pid).execute()

    print()
    print(f"rows needing repair: {repaired}")
    print(f"field changes: {field_changes}")
    print("MODE: APPLIED" if args.apply else "MODE: DRY RUN (re-run with --apply to write)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
