from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.services.acumatica_sync import run_acumatica_financial_sync
from src.services.ops.db_pressure_guard import enforce_app_db_pressure_guard


if __name__ == "__main__":
    enforce_app_db_pressure_guard("acumatica_financial_sync")
    result = run_acumatica_financial_sync()
    print(json.dumps(result, indent=2))
