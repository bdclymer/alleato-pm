#!/usr/bin/env python3
"""Cron entry point for the domain (company_process) packet compiler.

For each active intelligence_targets row with target_type='company_process',
pulls recent communications, asks an LLM to synthesize an executive packet
plus recurring findings, and upserts intelligence_packets / insight_cards /
insight_card_evidence in the MAIN Supabase project.

Schedule via Render. Recommended cadence: ~4×/day to match
alleato-packet-refresh-periodic (the project-level refresher), so the
'what's going on with accounting?' answer is never more than ~6h stale.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=60,
        help="How many days back to scan document_metadata for source material",
    )
    parser.add_argument(
        "--doc-limit",
        type=int,
        default=150,
        help="Maximum documents per target",
    )
    parser.add_argument(
        "--target-slug",
        default=None,
        help="If set, compile only this slug (single-target debug run)",
    )
    args = parser.parse_args()

    _load_backend()

    from src.services.intelligence.domain_compiler import (
        compile_all_domain_packets,
        compile_domain_packet,
        DOMAIN_COMPILER_VERSION,
    )
    from src.services.ops.db_pressure_guard import enforce_app_db_pressure_guard
    from src.services.supabase_helpers import get_supabase_client

    enforce_app_db_pressure_guard("domain_packet_compiler")

    supabase = get_supabase_client()

    print(
        json.dumps(
            {
                "event": "domain_packet_compiler_start",
                "compiler_version": DOMAIN_COMPILER_VERSION,
                "lookback_days": args.lookback_days,
                "doc_limit": args.doc_limit,
                "target_slug": args.target_slug,
            }
        ),
        flush=True,
    )

    if args.target_slug:
        target_row = (
            supabase.table("intelligence_targets")
            .select("id, slug")
            .eq("target_type", "company_process")
            .eq("slug", args.target_slug)
            .maybe_single()
            .execute()
        )
        target = getattr(target_row, "data", None)
        if not target:
            print(
                json.dumps(
                    {
                        "event": "domain_packet_compiler_target_not_found",
                        "slug": args.target_slug,
                    }
                ),
                flush=True,
            )
            return 1
        result = compile_domain_packet(
            supabase,
            target["id"],
            lookback_days=args.lookback_days,
            doc_limit=args.doc_limit,
        )
        print(json.dumps({"event": "domain_packet_compiled", "result": result}, default=str), flush=True)
        return 0 if result.get("status") in ("compiled", "skipped_no_documents") else 1

    summary = compile_all_domain_packets(
        supabase,
        lookback_days=args.lookback_days,
        doc_limit=args.doc_limit,
    )
    print(json.dumps({"event": "domain_packet_compiler_complete", "summary": summary}, default=str), flush=True)
    return 0 if summary.get("status") in ("ok", "partial") and summary.get("succeeded", 0) > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
