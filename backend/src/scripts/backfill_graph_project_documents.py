#!/usr/bin/env python3
"""Promote assigned OneDrive/SharePoint metadata rows into project_documents."""

from __future__ import annotations

import argparse
import json

from src.services.env_loader import load_env
from src.services.integrations.microsoft_graph.project_document_backfill import (
    run_graph_project_document_backfill,
)
from src.services.supabase_helpers import get_supabase_client


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_env()
    result = run_graph_project_document_backfill(
        get_supabase_client(),
        limit=max(1, args.limit),
        dry_run=args.dry_run,
    )
    print(json.dumps(result, indent=2, default=str))
    return 1 if result.get("failed") else 0


if __name__ == "__main__":
    raise SystemExit(main())
