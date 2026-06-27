# AAI-732 Outlook RAG-To-App Bridge Retirement Proof

Date: 2026-06-27

This evidence file is the deletion gate for:

- `backend/src/scripts/backfill_outlook_rag_metadata_to_app_documents.py`

## Final Production Owner

The production Outlook document projection owner is:

- Raw intake: `outlook_email_intake`
- Canonical document write: `SupabaseRagStore.upsert_document_metadata(...)`
- RAG metadata write: `SupabaseRagStore.upsert_rag_document_metadata(...)`
- Bounded intake repair: `backfill_outlook_intake_rag_documents(...)`
- Freshness monitoring: `backend/src/services/health/outlook_promotion_freshness.py`

## Replacement Proof

- `SupabaseRagStore.upsert_document_metadata(...)` writes the app-facing
  `document_metadata` catalog payload first and then writes full RAG payloads
  to `rag_document_metadata` when content/raw text exists.
- `backend/src/services/integrations/microsoft_graph/outlook.py` uses
  `SupabaseRagStore(...).upsert_document_metadata(...)` during live Outlook
  sync and in `backfill_outlook_intake_rag_documents(...)`.
- `backfill_outlook_intake_rag_documents(...)` repairs imported Outlook intake
  rows that lack `document_metadata_id` by creating the canonical Outlook
  document row and updating intake vectorization status to `pending`.
- `outlook_promotion_freshness.py` remains the fail-loud monitor for the
  incident class where intake is fresh but document metadata promotion is stale.

## Candidate Reference Proof

- `backend/src/scripts/backfill_outlook_rag_metadata_to_app_documents.py`
  - Manual CLI only.
  - No package script reference found.
  - No Render schedule reference found.
  - No frontend route/API reference found.
  - No backend service import reference found.
  - Writes app `document_metadata` directly through SQL with the incident-era
    `app.allow_outlook_ingestion_write` bypass setting.
- Current non-self references before deletion:
  - Historical architecture incident note.
  - Outdated email sync rebuild plan.
  - AAI-703/AAI-682 cleanup inventories.
  - Generated DB inventory file-path metadata.

## Retained Paths

| Path | Classification | Reason |
| --- | --- | --- |
| `SupabaseRagStore.upsert_document_metadata(...)` | `active-keep` | Canonical app catalog plus RAG metadata write owner. |
| `backfill_outlook_intake_rag_documents(...)` | `active-keep` | Bounded repair path for Outlook intake rows missing document metadata. |
| `outlook_promotion_freshness.py` | `active-keep` | Monitoring guardrail for intake/document promotion drift. |

## Planned Verification

## Deletion Result

- Deleted `backend/src/scripts/backfill_outlook_rag_metadata_to_app_documents.py`.
- Updated current architecture/rebuild docs so the retired bridge is not
  advertised as a current repair path.
- Updated AAI-703 and AAI-682 cleanup inventories to point to AAI-732 and the
  replacement owner.
- Added `training_docs` and `training_doc_assets` to `tables.yaml` as dormant
  support tables because `npm run db:inventory` found them in MAIN and no repo
  code references were found.
- Regenerated DB inventory so generated metadata no longer references the
  deleted script.

## Verification Log

- `backend/.venv/bin/python -m py_compile backend/src/services/integrations/microsoft_graph/outlook.py backend/src/services/supabase_helpers.py backend/src/services/health/outlook_promotion_freshness.py backend/src/services/health/pipeline_alert_notifier.py`
  - Passed.
- `npm run db:inventory`
  - Initial run failed before regeneration because MAIN had undocumented
    `training_docs` and `training_doc_assets` tables.
  - Added dormant table stubs to `docs/architecture/tables.yaml`.
  - Rerun passed schema drift, processed 460 tables, and regenerated
    `frontend/src/components/dev-tools/db-inventory.generated.ts`,
    `frontend/src/components/dev-tools/db-inventory.generated.json`, and
    `docs/architecture/TABLE-LIST.md`.
- `rg -n "backfill_outlook_rag_metadata_to_app_documents" frontend/src/components/dev-tools/db-inventory.generated.json frontend/src/components/dev-tools/db-inventory.generated.ts docs/architecture/TABLE-LIST.md docs/architecture/tables.yaml`
  - Passed with zero matches.
- `rg -n "backfill_outlook_intake_rag_documents|SupabaseRagStore\\(.*\\)\\.upsert_document_metadata|upsert_document_metadata\\(" backend/src/services/integrations/microsoft_graph/outlook.py backend/src/services/supabase_helpers.py`
  - Confirmed active replacement owner references in Outlook sync/backfill and
    shared store.
- `MICROSOFT_SYNC_USERS=bclymer@alleatogroup.com ... run_graph_sync_phase.py outlook --embed-limit 25`
  - Initial reason: `npm run verify:microsoft-assistant-health -- --json`
    found cached intake stale behind live Graph.
  - Result: 17 Outlook rows synced, 2 email chunks embedded, vectorization
    statuses updated, and phase-level errors remained empty.
  - The run exposed repeated row-level attachment RAG warnings from Graph 400s
    on the `/microsoft.graph.fileAttachment` cast endpoint.
  - Fix: `_fetch_file_attachment_detail(...)` now uses the generic attachment
    endpoint with `contentBytes` selected, preserving path-id escaping.
- `npm run verify:microsoft-assistant-health -- --json`
  - Passed after scoped sync: cached intake latest matched Graph latest within 2
    minutes.
- `npm run verify:graph-subscriptions -- --json`
  - Passed: 11 expected Outlook subscriptions, 11 active, 0 stale.
