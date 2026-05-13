# Handoff: 2026-05-07 — Fireflies Pipeline Backlog Drain

## Intake Block

1) Session ID: S37
2) Task ID: AAI-339
3) Linear issue: AAI-339
4) Linear URL: https://linear.app/megankharrison/issue/AAI-339/execute-real-time-source-sync-and-intelligence-observability-prp
5) Current status: Deployed to main
6) Files changed (absolute paths):
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/backend/src/services/scheduler.py`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/backend/src/services/health/source_sync_health.py`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/backend/tests/test_scheduler_graph_jobs.py`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/backend/tests/test_source_sync_health.py`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/frontend/src/app/api/admin/source-sync/status/route.ts`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/frontend/src/components/ai-intelligence/source-sync-health-panel.tsx`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/docs/PRPs/real-time-source-sync-intelligence-observability/TASKS.md`
   - `/Users/meganharrison/.codex/worktrees/source-sync-remediation-clean/docs/ops/handoffs/2026-05-07-S37-fireflies-backlog-drain.md`
7) Commands run and outcome (pass/fail counts):
   - `python -m pytest backend/tests/test_scheduler_graph_jobs.py` — pass, 4 passed.
   - `python -m py_compile backend/src/services/scheduler.py` — pass.
   - Live read-only count before bounded drain: `done|8572`, `embedded|14`, `error|3985`, `raw_ingested|24341` after one proof run.
   - `PYTHONPATH=backend python - <<'PY' ... _run_fireflies_pipeline_backlog(limit=1, stale_minutes=120)` — pass; matched 1, processed 1, failed 0, moved metadata `8614cd93-dd4f-53b0-8b02-87fb9b61274c` from `raw_ingested` through pipeline status `done`.
   - `npm run rag:verify:meetings` — expected fail after proof run; raw backlog now 24341, done count 8572, recent summary embedding coverage still 14/84.
   - Direct push to `main` — pass; `54ed2a3e1` added scheduled backlog drain, `43d41c619` fixed failure-only warning logging.
   - Render deploy `dep-d7uid67avr4c73cn9c80` — pass; live on commit `43d41c619cf6559b312dd29c6c3af68b1390bcac`, finished `2026-05-07T23:58:19.175495Z`.
   - Historical backend health check used a retired Render backend service, which is no longer active. Current tooling must use `https://alleato-backend-rbnj.onrender.com`.
   - Production scheduler first interval — pass with surfaced failures; Fireflies backlog matched 10, processed 8, failed 2; Graph embedding succeeded; intelligence compiler claimed 2 and succeeded 2.
   - `python -m pytest backend/tests/test_source_sync_health.py backend/tests/test_scheduler_graph_jobs.py` — pass, 9 passed.
   - `python -m py_compile backend/src/services/health/source_sync_health.py backend/src/services/scheduler.py` — pass.
   - `python -m pytest backend/tests/test_scheduler_graph_jobs.py backend/tests/test_source_sync_health.py` — pass after non-vectorizable classifier, 10 passed.
   - `npm run check:routes` — pass.
   - `npx eslint src/components/ai-intelligence/source-sync-health-panel.tsx src/app/api/admin/source-sync/status/route.ts` — pass.
   - `cd frontend && npm run typecheck` — fail on unrelated existing TypeScript debt outside this source-sync slice.
8) Evidence artifacts (screenshot/video/report/log paths):
   - Live drain output in this session: `{'status': 'ok', 'limit': 1, 'stale_minutes': 120, 'matched': 1, 'processed': 1, 'failed': 0, 'results': [{'fireflies_id': '8614cd93-dd4f-53b0-8b02-87fb9b61274c', 'metadata_id': '8614cd93-dd4f-53b0-8b02-87fb9b61274c', 'status': 'processed', 'pipeline_status': 'done', 'previous_stage': 'raw_ingested'}]}`
   - Meeting verifier output in this session: 1575 total meetings, 1422 embedded summaries, 84 recent meetings, 14 recent embedded summaries, 25298/25298 embedded chunks, 24341 raw_ingested jobs, 3985 error jobs.
   - Production ledger row: `fireflies/vectorization/failed`, `items_seen=10`, `items_synced=8`, `items_failed=2`, `created_at=2026-05-07 23:55:00+00`.
   - Production ledger row: `microsoft_graph/vectorization/succeeded`, `items_seen=0`, `items_synced=0`, `items_failed=0`, `created_at=2026-05-07 23:53:41+00`.
   - Production ledger row: `intelligence_compiler/intelligence_compile/succeeded`, `items_seen=2`, `items_synced=2`, `items_failed=0`, `created_at=2026-05-07 23:48:49+00`.
   - Live source-sync health payload from the updated backend function returned 20 recent run rows and 25 stuck item rows.
9) Top 3 findings (frontend-visible issues first):
   - The source-sync page is accurately surfacing a real backlog, but the prior implementation had no automatic scheduled drain for stale Fireflies pipeline rows.
   - A bounded live drain proves the normal full pipeline can advance at least one stale row from `raw_ingested` to `done`.
   - Meeting health still fails because the backlog is large; deploy cadence and batch sizing are now the next operational levers.
10) Recommended next action (one line): Deploy the non-vectorizable Fireflies classifier, then add admin retry/mark-reference-only actions for stuck rows.
11) Handoff file path: docs/ops/handoffs/2026-05-07-S37-fireflies-backlog-drain.md
12) Migration ledger evidence: No new migration in this slice.

## Linear Updates

- Kickoff/milestone comment: Posted comment `2e5574e7-0623-4233-a50a-56a0758666e7`.
- Completion/blocker comment: Posted direct-main deployment updates before this final handoff refresh.

## Current Status

Implemented and deployed a scheduled Fireflies pipeline backlog drain in `backend/src/services/scheduler.py`. The scheduler now registers `fireflies_pipeline_backlog` by default, every 10 minutes, capped by `FIREFLIES_PIPELINE_BACKLOG_LIMIT` and `FIREFLIES_PIPELINE_BACKLOG_STALE_MINUTES`. It processes stale `raw_ingested` rows and retryable provider/quota failures through the normal `run_full_pipeline` path, records a `source_sync_runs` row using stage `vectorization`, and logs failures loudly. Production also required setting `FIREFLIES_API_KEY` and `ACUMATICA_FINANCIAL_SYNC_ENABLED=false` on Render so unrelated scheduler validation stopped blocking Microsoft/Fireflies/intelligence jobs.

## Exact Next Step

Deploy the source-sync UI visibility extension, then continue monitoring `source_sync_runs` and scheduler logs. The first production interval proved the drain works and exposed two image-only failures: `standard-beach-court-dimensions.jpg` and `Mech Screening Picture.png`. The updated health function also shows additional financial parser stuck rows that should be handled explicitly.
The next code slice adds a scheduler preflight classifier so unsupported binary/image/audio/video/archive files and financial/tabular rows missing `document_metadata.file_path` are marked `NON_VECTORIZABLE`, counted as skipped in `source_sync_runs`, and removed from expensive retry loops.

## Known Pitfalls

- Do not retry all `error` jobs blindly; the code only retries provider/quota/embedding-related failures.
- Many old `raw_ingested` rows may represent generic documents, not only meetings; they still use the same `fireflies_ingestion_jobs` queue.
- One local live run needed the main repo `.env` because the clean worktree does not have an `.env` file.
- The meeting verifier still fails until enough recent rows receive `summary_embedding`; one processed row is proof of mechanism, not completion of backlog.
- The first production backlog run found image-only files that cannot be processed by the current text extractor; those should become explicit stuck-file UI rows rather than invisible pipeline failures.

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
