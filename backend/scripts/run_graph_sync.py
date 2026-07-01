from __future__ import annotations

import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.services.env_loader import load_env
from src.services.integrations.microsoft_graph.sync import run_graph_sync
from src.services.supabase_helpers import get_supabase_client


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _bounded_int_env(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        value = default
    return max(minimum, min(value, maximum))


def main() -> int:
    load_env()

    result = run_graph_sync(
        get_supabase_client(),
        run_outlook=_bool_env("GRAPH_SYNC_OUTLOOK", True),
        run_teams=_bool_env("GRAPH_SYNC_TEAMS", False),
        run_onedrive=_bool_env("GRAPH_SYNC_ONEDRIVE", False),
        run_sharepoint=_bool_env("GRAPH_SYNC_SHAREPOINT", True),
        run_embedding=_bool_env("GRAPH_SYNC_RUN_EMBEDDING", True),
        embed_limit=_bounded_int_env("GRAPH_EMBEDDING_LIMIT", 25, 1, 25),
        verify_outlook_persisted_count=_bool_env("GRAPH_VERIFY_OUTLOOK_PERSISTED_COUNT", True),
    )
    print(json.dumps(result, indent=2, default=str))
    errors = result.get("errors", [])
    return 1 if errors and int(result.get("total_synced", 0) or 0) == 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
