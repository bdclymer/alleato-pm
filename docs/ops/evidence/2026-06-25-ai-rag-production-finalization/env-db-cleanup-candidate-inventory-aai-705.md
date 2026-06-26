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
| `LEGACY_DAILY_DIGEST_ENABLED` | Env cleanup candidate | Code references in `backend/src/services/daily_digest.py`, `backend/src/services/scheduler.py`, and `/api/digests/daily/generate`; architecture doc records the legacy digest route is intentionally default-blocked unless this env is explicitly true. | `migrate-first` | Retain for now as a fail-closed compatibility gate. Removing it requires deleting the legacy daily digest route/job path and updating gateway guardrails in a separate proof slice. |
| `ENABLE_LEGACY_FIREFLIES_FILE_INGEST` | Env cleanup candidate | Code reference in `/api/ingest/fireflies`; route returns HTTP 410 unless this env is explicitly true and instructs callers to use `/api/ingest/fireflies/recent`. | `migrate-first` | Retain for now as an explicit disabled legacy escape hatch. Removing it requires deleting the file-ingest route and proving no callers remain. |
| `GRAPH_API_INGESTION_ENABLED` | Env cleanup candidate | Render web service sets it to `false`; `backend/src/services/integrations/microsoft_graph/ingestion_control.py` uses it as a public fail-closed write-heavy Graph ingestion guard. `scripts/verify/verify-render-web-scheduler-disabled.mjs` and live DB incident verifier expect it false on the web service. | `provider-retain` | Retain. It is an active production pressure-guard, not unused config. |
| `OUTLOOK_SYNC_LEGACY_ATTACHMENTS`, `OUTLOOK_SYNC_LEGACY_LINKS`, `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS` | Env cleanup candidate | Code references in `backend/src/services/integrations/microsoft_graph/outlook.py`; architecture notes Outlook raw intake is canonical and `OUTLOOK_SYNC_LEGACY_PROJECT_EMAILS` is opt-in compatibility mirroring. No Render schedule reference found in this pass. | `migrate-first` | Retain until a separate Outlook legacy-mirroring removal proves there are no emergency/operator callers and removes the code gates together. |

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
