# AAI-699 Event-Driven Intelligence Write Guard Evidence

Date: 2026-06-26

## Root Cause

The Outlook/Teams Graph sync path correctly calls `synthesize_new_comms_since(...)` after communication sync and embedding, but `project_synthesizer.py` still failed at the entrypoint-level PM high-churn guard before reaching the already-bounded projection writers.

The failed Outlook redrive evidence showed:

- `status: complete_with_errors`
- `outlook: 18`
- `embed.embedded: 10`
- `intelligence_extraction.error`: `Blocked project_synthesizer_event_driven`

## Active Code Path Inventory

- Graph sync trigger: `backend/src/services/integrations/microsoft_graph/sync.py`
- Event-driven intelligence entrypoint: `backend/src/services/intelligence/project_synthesizer.py::synthesize_new_comms_since`
- Daily backstop entrypoint: `backend/src/services/intelligence/project_synthesizer.py::run_synthesis_sweep`
- Candidate staging: `source_signal_candidates` via `get_rag_write_client()` in the AI/RAG database.
- Final PM projections:
  - `insight_cards`
  - `insight_card_targets`
  - `insight_card_evidence`
  - `intelligence_packets`
  - `tasks`
- Projection guard: `enforce_pm_app_final_projection_guard(...)`

## Change Made

- Removed the obsolete whole-entrypoint high-churn guard from the event-driven and daily sweep synthesizer paths.
- Added cumulative run-level PM projection budgeting before any task/card/packet PM-app projection rows are written.
- Added `pm_projection_rows` to event-driven and sweep summaries so redrive evidence exposes the actual PM projection volume.
- Added missing Graph cron `ALLOW_PM_APP_FINAL_PROJECTIONS=true` and `PM_APP_PROJECTION_MAX_TOTAL_ROWS=50` to `render.yaml`.

## Local Verification

Passed:

```bash
backend/.venv/bin/python -m compileall backend/src/services/intelligence/project_synthesizer.py backend/unit_tests/test_task_writer_titles.py
```

Passed:

```bash
cd backend && .venv/bin/python -m pytest unit_tests/test_task_writer_titles.py tests/test_db_pressure_guard.py tests/test_graph_sync_options.py -q
```

Result: `22 passed, 6 warnings`.

Passed:

```bash
cd backend && .venv/bin/python -m pytest tests/test_render_sync_blueprints.py -q
```

Result: `7 passed, 6 warnings`.

## Live Render Provider Evidence

Read-back before patch:

- Service: `alleato-graph-sync`
- Service id: `crn-d827dut7vvec73b33fa0`
- `ALLOW_PM_APP_FINAL_PROJECTIONS`: missing
- `PM_APP_PROJECTION_MAX_TOTAL_ROWS`: missing
- `APP_DB_PRESSURE_GUARD_REQUIRED`: `true`

Patched with Render single-key env-var API:

```text
PUT /v1/services/crn-d827dut7vvec73b33fa0/env-vars/ALLOW_PM_APP_FINAL_PROJECTIONS
PUT /v1/services/crn-d827dut7vvec73b33fa0/env-vars/PM_APP_PROJECTION_MAX_TOTAL_ROWS
```

Read-back after patch:

- `ALLOW_PM_APP_FINAL_PROJECTIONS`: `true`
- `PM_APP_PROJECTION_MAX_TOTAL_ROWS`: `50`

## Active-Window Redrive Proof

Outlook-only bounded sync:

```json
{
  "status": "complete",
  "total_synced": 2,
  "outlook": 2,
  "errors": [],
  "embed": {
    "embedded": 1,
    "total_chunks": 1,
    "errors": 0,
    "by_category": {
      "email": 1
    }
  },
  "intelligence_extraction": {
    "projects": 0,
    "emails": 0,
    "teams": 0,
    "cards_written": 0,
    "tasks_written": 0,
    "synthesis_packets_written": 0,
    "pm_projection_rows": {},
    "errors": []
  }
}
```

Microsoft assistant health after Outlook sync:

- `ok`: `true`
- cached intake latest received at: `2026-06-26T06:49:02+00:00`
- cached intake assignment method: `non_project:system_admin`
- sync ledger last sync at: `2026-06-26T07:29:09.347866+00:00`

Teams-only bounded sync:

```json
{
  "status": "complete",
  "total_synced": 1,
  "teams_dm": 1,
  "errors": [],
  "teams_channels_selected": 1,
  "teams_dm_users_selected": [
    "acannon@alleatogroup.com"
  ],
  "embed": {
    "embedded": 0,
    "errors": 0,
    "skipped_disabled": 9
  },
  "intelligence_extraction": {
    "projects": 0,
    "emails": 0,
    "teams": 0,
    "cards_written": 0,
    "tasks_written": 0,
    "synthesis_packets_written": 0,
    "pm_projection_rows": {},
    "errors": []
  }
}
```

The bounded redrives did not create task/card projections because the synced
items did not resolve to project-scoped new communication documents in the run
window. The production path still executed and surfaced `pm_projection_rows`
instead of failing behind the old high-churn guard.

## Notes

- The system Python environment is missing `python-multipart`; the repo `backend/.venv` has the declared backend dependencies and was used for route-level tests.
- The required Supabase type generation command failed locally before producing valid output. The generated types file was restored immediately and is not part of this slice.
