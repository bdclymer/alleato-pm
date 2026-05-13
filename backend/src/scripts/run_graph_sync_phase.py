#!/usr/bin/env python3
"""Run one bounded Microsoft Graph sync phase."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


PHASE_FLAGS = {
    "outlook": {
        "GRAPH_SYNC_OUTLOOK": "true",
        "GRAPH_SYNC_TEAMS": "false",
        "GRAPH_SYNC_TEAMS_DM": "false",
        "GRAPH_SYNC_ONEDRIVE": "false",
        "GRAPH_SYNC_SHAREPOINT": "false",
    },
    "teams": {
        "GRAPH_SYNC_OUTLOOK": "false",
        "GRAPH_SYNC_TEAMS": "true",
        "GRAPH_SYNC_TEAMS_DM": "false",
        "GRAPH_SYNC_ONEDRIVE": "false",
        "GRAPH_SYNC_SHAREPOINT": "false",
    },
    "teams-dm": {
        "GRAPH_SYNC_OUTLOOK": "false",
        "GRAPH_SYNC_TEAMS": "false",
        "GRAPH_SYNC_TEAMS_DM": "true",
        "GRAPH_SYNC_ONEDRIVE": "false",
        "GRAPH_SYNC_SHAREPOINT": "false",
    },
    "onedrive": {
        "GRAPH_SYNC_OUTLOOK": "false",
        "GRAPH_SYNC_TEAMS": "false",
        "GRAPH_SYNC_TEAMS_DM": "false",
        "GRAPH_SYNC_ONEDRIVE": "true",
        "GRAPH_SYNC_SHAREPOINT": "false",
    },
    "sharepoint": {
        "GRAPH_SYNC_OUTLOOK": "false",
        "GRAPH_SYNC_TEAMS": "false",
        "GRAPH_SYNC_TEAMS_DM": "false",
        "GRAPH_SYNC_ONEDRIVE": "false",
        "GRAPH_SYNC_SHAREPOINT": "true",
    },
}


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def main() -> int:
    _load_backend()

    parser = argparse.ArgumentParser(description="Run one Microsoft Graph sync phase")
    parser.add_argument("phase", choices=sorted(PHASE_FLAGS))
    parser.add_argument("--embed-limit", type=int, default=25)
    parser.add_argument("--teams-compiler-batch-size", type=int, default=25)
    parser.add_argument("--skip-embedding", action="store_true")
    parser.add_argument("--skip-teams-compiler", action="store_true")
    args = parser.parse_args()

    for key, value in PHASE_FLAGS[args.phase].items():
        os.environ[key] = value

    from src.services.integrations.microsoft_graph.sync import run_graph_sync
    from src.services.supabase_helpers import get_supabase_client

    result = run_graph_sync(
        get_supabase_client(),
        run_embedding=not args.skip_embedding,
        run_teams_compiler=not args.skip_teams_compiler,
        embed_limit=max(1, min(args.embed_limit, 25)),
        teams_compiler_batch_size=max(1, min(args.teams_compiler_batch_size, 100)),
    )
    result["phase"] = args.phase
    print(json.dumps(result, default=str, indent=2))
    return 1 if result.get("errors") else 0


if __name__ == "__main__":
    raise SystemExit(main())
