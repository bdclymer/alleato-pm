# AAI-706 Legacy Fireflies File Ingest Removal Proof

Date: 2026-06-26

This evidence file is the deletion gate for the disabled legacy Fireflies
file-ingest route and `ENABLE_LEGACY_FIREFLIES_FILE_INGEST` escape hatch.

## Final Production Owner

The production Fireflies ingestion owner is:

- FastAPI manual/admin route: `POST /api/ingest/fireflies/recent`
- Route implementation: `backend/src/api/main.py::ingest_recent_fireflies_endpoint`
- Pipeline implementation: `backend/src/services/ingestion/fireflies_pipeline.py::sync_recent_transcripts`
- Scheduled trigger: `render.yaml` cron `alleato-fireflies-sync`
- Scheduler implementation: `backend/src/services/scheduler.py::_run_fireflies_sync`

## Deletion Candidate Inventory

| Candidate | Evidence | Classification | Action |
| --- | --- | --- | --- |
| `POST /api/ingest/fireflies` | `backend/src/api/main.py` route returned HTTP 410 unless `ENABLE_LEGACY_FIREFLIES_FILE_INGEST=true`; route called only `pipeline.ingest_file(...)`. | `delete` | Remove route entirely. |
| `IngestRequest` | Used only by deleted `POST /api/ingest/fireflies` route. | `delete` | Remove request model. |
| `ENABLE_LEGACY_FIREFLIES_FILE_INGEST` | Only referenced in deleted route and env docs. | `delete` | Remove code and docs reference. |
| `FirefliesIngestionPipeline.ingest_file(...)` | `rg "ingest_file\\("` showed only the method definition and deleted route call. | `delete` | Remove method to prevent local file-ingest resurrection. |
| Legacy route tests | `backend/tests/test_api_routes.py` and `backend/tests/test_ingestion.py` asserted the disabled/env-enabled legacy behavior. | `delete/replace` | Replace with canonical recent-sync coverage plus 404 assertion for removed route. |
| Public OpenAPI route entry | `frontend/public/openapi.json` and `frontend/public/openapi.yaml` advertised the deleted route. | `delete` | Remove stale public API entry. |
| API/env docs | `backend/API.md` and `docs/reference/ENV-VARS.md` advertised the deleted route/env. | `delete/update` | Remove stale route/env rows and keep recent route. |

## Active Paths Retained

| Path | Reason |
| --- | --- |
| `POST /api/ingest/fireflies/recent` | Canonical manual/admin trigger for syncing recent Fireflies transcripts from the API. |
| `FirefliesIngestionPipeline.sync_recent_transcripts(...)` | Canonical production pipeline invoked by route and scheduler. |
| `FirefliesIngestionPipeline.ingest_markdown_text(...)` | Shared internal ingestion routine used by the canonical Fireflies API sync after formatting transcripts. |
| `render.yaml` cron `alleato-fireflies-sync` | Production scheduled trigger for Fireflies sync. |

## Commands And Evidence Log

- `rg -n "ENABLE_LEGACY_FIREFLIES_FILE_INGEST|/api/ingest/fireflies|IngestRequest|ingest_file\\(" backend frontend scripts docs render.yaml package.json -g '!frontend/src/components/dev-tools/db-inventory.generated.json'`
  - Found route/model/env references in `backend/src/api/main.py`, tests, public OpenAPI files, and docs.
  - Found only one runtime caller for `ingest_file`: the deleted route.
- `rg -n "ingest_file\\(" backend frontend scripts docs -g '!frontend/src/components/dev-tools/db-inventory.generated.json'`
  - Confirmed `ingest_file` had no callers outside the deleted route.
- `backend/README.md`
  - Already documents only `/api/ingest/fireflies/recent` for the Fireflies manual trigger.
- `rg -n 'ENABLE_LEGACY_FIREFLIES_FILE_INGEST|ingest_file\\(|class IngestRequest|@app\\.post\\("/api/ingest/fireflies"|`POST /api/ingest/fireflies`|\\| POST \\| `/api/ingest/fireflies`' backend frontend scripts docs render.yaml package.json -g '!docs/ops/**' -g '!frontend/src/components/dev-tools/db-inventory.generated.json'`
  - Passed with no matches after deletion in live code/current docs.
- `backend/.venv/bin/python -m compileall -q backend/src/api/main.py backend/src/services/ingestion/fireflies_pipeline.py backend/tests/conftest.py backend/tests/test_api_routes.py backend/tests/test_ingestion.py`
  - Passed.
- `backend/.venv/bin/python -m pytest backend/tests/test_api_routes.py backend/tests/test_ingestion.py -q`
  - Passed: 19 tests.
- Delegated `cd frontend && npm run typecheck:changed`
  - Passed.
- `node -e "JSON.parse(require('fs').readFileSync('frontend/public/openapi.json','utf8')); console.log('openapi json ok')"`
  - Passed.
- `npm run rag:verify:meetings`
  - Passed. Recent policy window: 75 recent meetings, 75 with embedded chunks. Direct OpenAI probe still warns on quota, but AI Gateway provider probe is OK.
- `npm run rag:verify:chat-architecture`
  - Passed.
