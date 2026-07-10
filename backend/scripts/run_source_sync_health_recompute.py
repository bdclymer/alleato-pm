from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.services.env_loader import load_env
from src.services.health.source_sync_health_recompute import (
    run_source_sync_health_recompute,
)


def main() -> int:
    load_env()
    result = run_source_sync_health_recompute()
    print(json.dumps(result, indent=2, default=str))
    status = str(result.get("health", {}).get("status") or "").lower()
    return 0 if status in {"", "healthy"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
