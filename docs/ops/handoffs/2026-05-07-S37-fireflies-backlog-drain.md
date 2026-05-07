# Handoff: 2026-05-07 — Fireflies Pipeline Backlog Drain

## Intake Block

1) Session ID: S37
2) Task ID: AAI-339
3) Linear issue: AAI-339
4) Linear URL: https://linear.app/megankharrison/issue/AAI-339/execute-real-time-source-sync-and-intelligence-observability-prp
5) Current status: Pending Review
6) Files changed (absolute paths):
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/backend/src/services/scheduler.py`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/backend/tests/test_scheduler_graph_jobs.py`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/docs/PRPs/real-time-source-sync-intelligence-observability/TASKS.md`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/docs/ops/handoffs/2026-05-07-S37-fireflies-backlog-drain.md`
7) Commands run and outcome (pass/fail counts):
   - `python -m pytest backend/tests/test_scheduler_graph_jobs.py` — pass, 4 passed.
   - `python -m py_compile backend/src/services/scheduler.py` — pass.
   - Live read-only count before bounded drain: `done|8572`, `embedded|14`, `error|3985`, `raw_ingested|24341` after one proof run.
   - `PYTHONPATH=backend python - <<'PY' ... _run_fireflies_pipeline_backlog(limit=1, stale_minutes=120)` — pass; matched 1, processed 1, failed 0, moved metadata `8614cd93-dd4f-53b0-8b02-87fb9b61274c` from `raw_ingested` through pipeline status `done`.
   - `npm run rag:verify:meetings` — expected fail after proof run; raw backlog now 24341, done count 8572, recent summary embedding coverage still 14/84.
8) Evidence artifacts (screenshot/video/report/log paths):
   - Live drain output in this session: `{'status': 'ok', 'limit': 1, 'stale_minutes': 120, 'matched': 1, 'processed': 1, 'failed': 0, 'results': [{'fireflies_id': '8614cd93-dd4f-53b0-8b02-87fb9b61274c', 'metadata_id': '8614cd93-dd4f-53b0-8b02-87fb9b61274c', 'status': 'processed', 'pipeline_status': 'done', 'previous_stage': 'raw_ingested'}]}`
   - Meeting verifier output in this session: 1575 total meetings, 1422 embedded summaries, 84 recent meetings, 14 recent embedded summaries, 25298/25298 embedded chunks, 24341 raw_ingested jobs, 3985 error jobs.
9) Top 3 findings (frontend-visible issues first):
   - The source-sync page is accurately surfacing a real backlog, but the prior implementation had no automatic scheduled drain for stale Fireflies pipeline rows.
   - A bounded live drain proves the normal full pipeline can advance at least one stale row from `raw_ingested` to `done`.
   - Meeting health still fails because the backlog is large; deploy cadence and batch sizing are now the next operational levers.
10) Recommended next action (one line): Deploy the Fireflies backlog scheduler, tune `FIREFLIES_PIPELINE_BACKLOG_LIMIT`, and monitor `npm run rag:verify:meetings` until recent summary embedding coverage reaches the threshold.
11) Handoff file path: docs/ops/handoffs/2026-05-07-S37-fireflies-backlog-drain.md
12) Migration ledger evidence: No new migration in this slice.

## Linear Updates

- Kickoff/milestone comment: Posted comment `2e5574e7-0623-4233-a50a-56a0758666e7`.
- Completion/blocker comment: TBD

## Current Status

Implemented a scheduled Fireflies pipeline backlog drain in `backend/src/services/scheduler.py`. The scheduler now registers `fireflies_pipeline_backlog` by default, every 10 minutes, capped by `FIREFLIES_PIPELINE_BACKLOG_LIMIT` and `FIREFLIES_PIPELINE_BACKLOG_STALE_MINUTES`. It processes stale `raw_ingested` rows and retryable provider/quota failures through the normal `run_full_pipeline` path, records a `source_sync_runs` row using stage `vectorization`, and logs failures loudly.

## Exact Next Step

Push this remediation branch, deploy it to Render, then start with a conservative `FIREFLIES_PIPELINE_BACKLOG_LIMIT=10` and increase only after provider and DB latency are stable.

## Known Pitfalls

- Do not retry all `error` jobs blindly; the code only retries provider/quota/embedding-related failures.
- Many old `raw_ingested` rows may represent generic documents, not only meetings; they still use the same `fireflies_ingestion_jobs` queue.
- One local live run needed the main repo `.env` because the clean worktree does not have an `.env` file.
- The meeting verifier still fails until enough recent rows receive `summary_embedding`; one processed row is proof of mechanism, not completion of backlog.

## Resume Commands

```bash
cd /Users/meganharrison/.codex/worktrees/source-sync-remediation-clean
python -m pytest backend/tests/test_scheduler_graph_jobs.py
python -m py_compile backend/src/services/scheduler.py
cd /Users/meganharrison/Documents/alleato-pm && set -a; source .env; set +a; npm run rag:verify:meetings
```

## Evidence

- Scheduler implementation: `backend/src/services/scheduler.py`
- Scheduler tests: `backend/tests/test_scheduler_graph_jobs.py`
- PRP task log: `docs/PRPs/real-time-source-sync-intelligence-observability/TASKS.md`
