# AAI-705 Env And Database Cleanup Candidate Inventory

Date: 2026-06-26

This inventory is the deletion/removal gate for unused AI/RAG/pipeline
environment variables and orphaned database code. A candidate can only be
removed after repo, provider, route/service, and database evidence show it is
inactive or fully replaced.

## Candidate Table

| Candidate | Area | Evidence | Classification | Action |
| --- | --- | --- | --- | --- |
| `document_page_intelligence` | DB inventory drift / AI vision | Live MAIN table exists with 652 rows after `npm run db:inventory`; code references include backend OCR/vision writes in `backend/src/services/pipeline/vision_analyzer.py`, Graph embed/page-intelligence references, drawing intelligence route reads, submittal required-package reads, submittal AI review reads, and document-intelligence tool reads. | `document-active` | Documented in `docs/architecture/tables.yaml`; regenerated DB inventory. Do not delete. |
| `spec_drawing_links` | DB inventory drift / spec-drawing-submittal coverage | Live MAIN table exists with 0 rows after `npm run db:inventory`; migration and document-intelligence tools reference it for spec-to-drawing linkage. Empty but part of finalized spec/drawing/submittal coverage model. | `document-active` | Documented in `docs/architecture/tables.yaml`; regenerated DB inventory. Do not delete. |
| `rfi_responses` | DB inventory drift / RFI response workflow | Live MAIN table exists with 1 row after `npm run db:inventory`; active routes/services read/write it: public `/respond/rfi/[token]`, project RFI responses API, RFI email reply cron, and backend email ingestion. | `document-active` | Documented in `docs/architecture/tables.yaml`; regenerated DB inventory. Do not delete. |
| `rfi_response_tokens` | DB inventory drift / RFI no-login response auth | Live MAIN table exists with 4 rows after `npm run db:inventory`; active token generation and validation code references it in frontend RFI response-token helpers and public response API. | `document-active` | Documented in `docs/architecture/tables.yaml`; regenerated DB inventory. Do not delete. |
| `submittal_project_settings` | DB inventory drift / Submittals settings | Live MAIN table exists with 1 row after `npm run db:inventory`; active settings API and tests reference it. | `document-active` | Documented in `docs/architecture/tables.yaml`; regenerated DB inventory. Do not delete. |
| `submittal_ai_review_runs` | DB inventory drift / AI submittal review | Live MAIN table exists with 9 rows after `npm run db:inventory`; active submittal AI review service/verifiers reference it. | `document-active` | Documented in `docs/architecture/tables.yaml`; regenerated DB inventory. Do not delete. |
| `submittal_ai_review_checks` | DB inventory drift / AI submittal review findings | Live MAIN table exists with 20 rows after `npm run db:inventory`; active submittal AI review service/verifiers reference it. | `document-active` | Documented in `docs/architecture/tables.yaml`; regenerated DB inventory. Do not delete. |
| `idea_items` | DB inventory drift / idea inbox | Live MAIN table exists with 1 row after `npm run db:inventory`; active ideas server/page references it. | `document-active` | Documented in `docs/architecture/tables.yaml`; regenerated DB inventory. Do not delete. |
| `LEGACY_DAILY_DIGEST_ENABLED` | Env cleanup candidate | AAI-705 found the env referenced only by the disabled backend daily digest service/scheduler/API generation path. AAI-708 proved the canonical executive brief owner is the frontend AI Ops runner and removed the backend legacy path. | `deleted-by-aai-708` | Superseded by `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/legacy-daily-digest-removal-aai-708.md`. |
| `ENABLE_LEGACY_FIREFLIES_FILE_INGEST` | Env cleanup candidate | AAI-705 found the env referenced only by the disabled `/api/ingest/fireflies` route. AAI-706 proved no remaining live callers and removed the route/env together. | `deleted-by-aai-706` | Superseded by `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/legacy-fireflies-file-ingest-removal-aai-706.md`. |
| `GRAPH_API_INGESTION_ENABLED` | Env cleanup candidate | Render web service sets it to `false`; `backend/src/services/integrations/microsoft_graph/ingestion_control.py` uses it as a public fail-closed write-heavy Graph ingestion guard. `scripts/verify/verify-render-web-scheduler-disabled.mjs` and live DB incident verifier expect it false on the web service. | `provider-retain` | Retain. It is an active production pressure-guard, not unused config. |
| `OUTLOOK_SYNC_LEGACY_ATTACHMENTS`, `OUTLOOK_SYNC_LEGACY_LINKS`, `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS` | Env cleanup candidate | AAI-709 proved Outlook raw intake, intake attachments, and canonical RAG rows are the production owners; no Render schedule reference found for these gates. | `deleted` | Removed from `backend/src/services/integrations/microsoft_graph/outlook.py`; see `outlook-legacy-mirroring-removal-aai-709.md`. |
| `EMBEDDING_API_KEY`, `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL_CHOICE`, `EMBEDDING_PROVIDER`, `LLM_API_KEY`, `OPENAI_VECTOR_STORE_ID`, `RAG_PIPELINE_TYPE`, ChatKit public/domain keys, stale frontend AI query/streaming flags | Env cleanup candidate | AAI-737 used source/provider proof and key-name-only Vercel/Render readbacks. Current AI provider path is AI Gateway/OpenAI fallback plus RAG Supabase storage gates; these stale keys are not production owners. | `deleted` | Removed from Vercel/Render where present. Guarded by `npm run verify:deprecated-provider-env`. |
| `SUPABASE_DOCUMENTS_BUCKET`, `SUPABASE_MEETINGS_BUCKET` | Env cleanup candidate | AAI-737 found active references in Outlook attachment intake and Fireflies transcript backfill. | `active-keep` | Retain. These are not unused env keys. |
| `messages`, `chats`, `search_documents`, `ai_analysis_jobs`, `ai_models`, `document_executive_summaries`, `documents_rfis_links`, `documents_submittals_links` | DB cleanup candidate | AAI-737 proved no active runtime references or inbound dependencies; migration `20260627120000_drop_dead_ai_document_tables.sql` dropped them and DB inventory/types were regenerated afterward. | `deleted` | Dropped from MAIN database and removed from `docs/architecture/tables.yaml`; migration ledger verified. |
| `document_insights` | DB cleanup candidate | AAI-737 dry-run initially found a hard dependency: view `actionable_insights` depends on `document_insights`. | `blocked` | Retained and marked `blocked` in `docs/architecture/tables.yaml` until the dependent view is retired or migrated. |

## Commands And Evidence Log

- `npm run db:inventory`
  - Before this slice, failed schema drift because eight live MAIN tables were missing from `docs/architecture/tables.yaml`.
  - After documenting the tables, passed schema drift, processed 458 tables, and regenerated:
    - `frontend/src/components/dev-tools/db-inventory.generated.ts`
    - `frontend/src/components/dev-tools/db-inventory.generated.json`
    - `docs/architecture/TABLE-LIST.md`
- `npm run db:inventory -- --check-only`
  - Passed schema drift check with 458 YAML entries and no output writes.
- `node -e "JSON.parse(require('fs').readFileSync('frontend/src/components/dev-tools/db-inventory.generated.json','utf8')); console.log('json ok')"`
  - Passed JSON validity after regeneration.
- `rg -n "document_page_intelligence|idea_items|rfi_response_tokens|rfi_responses|spec_drawing_links|submittal_ai_review_checks|submittal_ai_review_runs|submittal_project_settings" docs/architecture frontend/src backend/src scripts supabase package.json render.yaml`
  - Proved all eight DB drift candidates have active migrations and/or route/service/tool references.
- Compact env inventory generated from source references for AI/RAG/provider variables.
  - First classified candidates are fail-closed/provider-retained or migrate-first gates, not safe deletes.
- AAI-737 final cleanup:
  - `npm run verify:deprecated-provider-env`
    - Passed with no deprecated provider env key names found.
  - `npm run db:migrations:verify-applied -- supabase/migrations/20260627120000_drop_dead_ai_document_tables.sql`
    - Passed remote migration ledger check for version `20260627120000`.
  - `npm run db:inventory`
    - Regenerated inventory after eight table drops.
  - `npm run db:inventory -- --check-only`
    - Passed schema drift check with 452 table entries.
  - `npm run db:types`
    - Regenerated Supabase types after table drops.
