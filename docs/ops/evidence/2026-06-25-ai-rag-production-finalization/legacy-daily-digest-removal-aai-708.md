# AAI-708 Legacy Daily Digest Removal Proof

Date: 2026-06-26

This evidence file is the deletion gate for the disabled backend legacy daily
digest generation path and `LEGACY_DAILY_DIGEST_ENABLED` escape hatch.

## Final Production Owner

The production executive daily brief generation owner is:

- Script/runtime: `frontend/scripts/run-executive-daily-brief.ts`
- Workflow/ledger: `frontend/src/lib/ai-ops/executive-daily-brief-workflow.ts`
  and `frontend/src/lib/ai-ops/executive-daily-brief-ledger.ts`
- API surfaces: frontend executive daily brief routes under
  `frontend/src/app/api/executive/daily-brief/**`
- Verification: `npm run rag:verify:executive-daily-brief-gateway` and
  `npm run rag:verify:executive-daily-brief-ledger-integration`

Render notes in `render.yaml` state the former executive brief Teams crons are
currently deactivated and must be re-enabled through the frontend runner and
`EXECUTIVE_DAILY_BRIEF_ENABLED`, not through backend legacy daily digest code.

## Deletion Candidate Inventory

| Candidate | Evidence | Classification | Action |
| --- | --- | --- | --- |
| `LEGACY_DAILY_DIGEST_ENABLED` | Only gates disabled backend daily digest route/service/scheduler generation. | `delete` | Remove with legacy backend generation path. |
| `POST /api/digests/daily/generate` | Returns `LEGACY_DAILY_DIGEST_DISABLED` unless env is true; imports `run_daily_digest` only when explicitly enabled. | `delete` | Remove route so backend no longer exposes a disabled legacy generation surface. |
| `backend/src/services/daily_digest.py::run_daily_digest(...)` | Disabled unless `LEGACY_DAILY_DIGEST_ENABLED=true`; no production Render schedule calls it. | `delete` | Remove service if no retained helpers remain. |
| `backend/src/services/scheduler.py` daily digest registration/job/wrapper | Registers `daily_digest` only when env is true; otherwise logs a disabled warning. | `delete` | Remove scheduler branch, job function, wrapper, and email helper tied to the deleted generation path. |
| `backend/scripts/generate_daily_recap.py` | Standalone legacy recap script exits unless `LEGACY_DAILY_RECAP_SCRIPT_ENABLED` is set and points users to the frontend runner. | `delete` | Remove disabled script after reference proof. |
| `GET /api/digests/daily/{date}` | Read-only lookup from `daily_recaps`; not a generation path. | `active-keep` | Retain unless separate UI/API proof retires historical daily recap reads. |

## Commands And Evidence Log

- `rg -n "LEGACY_DAILY_DIGEST_ENABLED|run_daily_digest|daily_digest|digests/daily|generate_daily_recap|executive-daily|executive briefing" backend frontend scripts docs render.yaml package.json -g '!frontend/src/components/dev-tools/db-inventory.generated.json'`
  - Found legacy backend generation references in `backend/src/services/daily_digest.py`, `backend/src/services/scheduler.py`, `backend/src/api/main.py`, `backend/scripts/generate_daily_recap.py`, backend docs, and scheduler tests.
  - Found canonical executive daily brief runner/verifiers in frontend scripts and package scripts.
- `rg -n "run_daily_digest|generate_recap_html|get_digest_recipients|send_digest_email|/api/digests/daily/generate|daily_digest" backend/tests backend/src backend/scripts frontend scripts render.yaml package.json -g '!frontend/src/components/dev-tools/db-inventory.generated.json'`
  - Found `generate_recap_html` is only imported by the legacy scheduler email helper, so the helper can be removed with the scheduler job.
- `rg -n "LEGACY_DAILY_DIGEST_ENABLED|run_daily_digest|daily_digest.py|generate_daily_recap.py|/api/digests/daily/generate|Legacy daily digest|legacy_daily_digest" backend/src backend/tests backend/API.md backend/README.md docs/architecture/AI-RAG-ARCHITECTURE.md scripts/verify/verify_rag_document_metadata_boundary.mjs render.yaml package.json -g '!frontend/src/components/dev-tools/db-inventory.generated.json'`
  - Passed after deletion; only the architecture note that names removed surfaces remains.
- `backend/.venv/bin/python -m compileall -q backend/src/api/main.py backend/src/services/scheduler.py backend/tests/test_scheduler_graph_jobs.py`
  - Passed.
- `backend/.venv/bin/python -m pytest backend/tests/test_scheduler_graph_jobs.py backend/tests/test_api_routes.py -q`
  - Passed: 27 tests.
- Delegated `cd frontend && npm run typecheck:changed`
  - Passed.
- `npm run rag:verify:metadata-boundary`
  - Passed.
- `npm run rag:verify:executive-daily-brief-gateway`
  - Passed.
- `npm run rag:verify:chat-architecture`
  - Passed.
