# AAI-720 DB Pressure Guard Buckets Evidence

Generated: 2026-06-26T13:16:00Z

## Evidence

## Live App DB Pressure Snapshot

Command:

```bash
ALLEATO_ENV_FILE=/Users/meganharrison/Documents/alleato-pm/.env npm run verify:app-db-pressure
```

Result:

```json
{
  "ok": true,
  "snapshot": {
    "total_connections": 35,
    "active_connections": 1,
    "idle_in_transaction_connections": 0,
    "long_running_active_connections": 1,
    "max_query_age_seconds": 779586,
    "app_client_connections": 3,
    "app_active_connections": 0,
    "app_idle_in_transaction_connections": 0,
    "app_long_running_active_connections": 0,
    "platform_connections": 32,
    "connection_buckets": {
      "app_or_external": 3,
      "supabase_storage": 2,
      "postgres_internal": 9,
      "supabase_realtime": 6,
      "supabase_supavisor": 2,
      "supabase_platform_other": 2,
      "supabase_postgrest_pool": 11
    }
  }
}
```

Interpretation:

- Raw total is at the old threshold (`35`), but app/client pressure is low (`3` app/external clients, `0` app-active, `0` app-idle-in-transaction, `0` app-long-running-active).
- Platform baseline is the dominant count (`32` platform connections), so raw total alone should be diagnostic by default, not the sole blocker.
- The guard still fails closed for active pressure, app idle transactions, app long-running active queries, app/client connection spikes, and can still block raw total if `APP_DB_PRESSURE_BLOCK_ON_RAW_TOTAL=true` is explicitly set.

## Focused Local Verification

Command:

```bash
PYTHONPATH=backend /Users/meganharrison/Documents/alleato-pm/backend/.venv/bin/python -m pytest backend/tests/test_db_pressure_guard.py -q
```

Result:

```text
14 passed, 6 warnings in 0.08s
```

Warnings were FastAPI `on_event` deprecations from `backend/src/api/main.py`, unrelated to this slice.

## Regression Covered

- High Supabase platform baseline with low app pressure is allowed.
- App/client connection pressure is blocked.
- Raw total blocking remains available only by explicit `APP_DB_PRESSURE_BLOCK_ON_RAW_TOTAL=true`.
- The bucket query escapes psycopg `%` patterns for `LIKE 'realtime%%'` and `LIKE 'Supavisor%%'`.
