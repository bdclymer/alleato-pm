from __future__ import annotations

import json
import os
import sys
from base64 import urlsafe_b64decode
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


def _jwt_role_for_key(value: str) -> str | None:
    parts = value.split(".")
    if len(parts) != 3:
        return None
    try:
        payload = json.loads(urlsafe_b64decode(parts[1] + "=" * (-len(parts[1]) % 4)).decode("utf-8"))
    except Exception:  # noqa: BLE001 - best-effort claim inspection only
        return None
    role = payload.get("role")
    return str(role) if role else None


def _assert_service_role_key(env_name: str, fallback_env_name: str | None = None) -> None:
    value = os.getenv(env_name)
    resolved_name = env_name
    if not value and fallback_env_name:
        value = os.getenv(fallback_env_name)
        resolved_name = fallback_env_name
    if not value:
        suffix = f" or {fallback_env_name}" if fallback_env_name else ""
        raise RuntimeError(f"Missing required Supabase service credential: {env_name}{suffix}")

    role = _jwt_role_for_key(value)
    if role and role != "service_role":
        raise RuntimeError(
            f"{resolved_name} is configured with JWT role '{role}', not 'service_role'. "
            "The direct Graph sync owner will hit row-level security errors until this "
            "service is redeployed with the correct service-role key."
        )


def main() -> int:
    load_env()
    _assert_service_role_key("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY")
    _assert_service_role_key("RAG_SUPABASE_SERVICE_ROLE_KEY", "RAG_SUPABASE_SERVICE_KEY")

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
