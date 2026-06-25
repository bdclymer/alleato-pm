# SharePoint PDF OCR Vision Validation

Date: 2026-06-25
Linear: AAI-669
Parent: AAI-636
Status: In Progress - Root Cause Fixed, Backfill Remaining

## Objective

Validate the production SharePoint and uploaded-document/PDF processing pipeline from source metadata through OCR, image/page extraction, embeddings, project assignment, and RAG retrieval.

## Scope

- SharePoint and Microsoft Graph document metadata in app and RAG databases.
- Uploaded PDFs/documents where source metadata identifies uploaded/document intake.
- OCR status, extracted text, image/page intelligence, chunks, embeddings, and retrieval evidence.
- Finalization progress ledger.

## Done Checklist

- [x] Create Linear issue before coding/provider operations.
- [x] Create task markdown before coding/provider operations.
- [x] Inventory recent SharePoint and uploaded PDF/document records.
- [x] Verify download/storage pointers exist for sampled SharePoint/PDF records.
- [x] Verify OCR eligibility and OCR output state.
- [x] Verify image extraction/page intelligence/AI vision coverage where applicable.
- [x] Verify chunks and embeddings exist for eligible records.
- [x] Verify project assignment or manual-review disposition exists.
- [x] Verify at least one sample is retrievable through RAG with citation/reference metadata.
- [x] Document blockers with cause, detection gap, prevention step, owner, and next action.
- [x] Update central AI/RAG finalization `TASKS.md`.
- [x] Publish code/docs/evidence if code/docs change.

## Evidence

- Inventory: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/sharepoint-pdf-ocr-vision-inventory-aai-669.json`
- Family coverage and SharePoint retrieval proof: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/sharepoint-pdf-family-coverage-aai-669.json`
- Bounded requeue batch: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/sharepoint-pdf-requeue-batch-aai-669.json`
- First poll after requeue: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/sharepoint-pdf-requeue-poll-aai-669.json`
- Second poll after requeue: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/sharepoint-pdf-requeue-second-poll-aai-669.json`
- Patched local pipeline proof: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/sharepoint-pdf-local-pipeline-proof-aai-669.json`
- Patched local pipeline postcheck: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/sharepoint-pdf-local-pipeline-postcheck-aai-669.json`
- Source lifecycle after fix: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-lifecycle-after-pdf-embedder-fix-aai-669.txt`

Key results:

- SharePoint: 191 recent records, 191 with locators, 190 embedded, 1 intentionally excluded, SharePoint source-specific retrieval returned the probe document with similarity 1 and citation metadata.
- Manual uploads: 32 recent records, 10 processable/complete/segmented, 22 still `uploaded`.
- Drawing uploads: 90 recent records, 90 with project and locator, 90 with OCR text, but 27 were still `raw_ingested` and 2 were `ocr_failed` before the bounded recovery.
- OneDrive: 45 recent records, 38 embedded, 7 `ocr_failed`.
- Outlook attachments: 159 recent records, 105 embedded, 54 `metadata_only`.
- Bounded backend requeue accepted 10 drawing uploads.
- Requeue proved app-side parser/vision progressed, but also exposed the root cause: app status could move to `complete` or `embedded` while RAG metadata was missing.
- Local patched pipeline proof fixed the root cause for two drawings:
  - `[012] A410 - INTERIOR ELEVATIONS.pdf`: 38 embedded chunks, 18 document chunks, 1 vision chunk, RAG metadata content length 5173.
  - `[015] PD101 - FIRST FLOOR PLUMBING.pdf`: 12 embedded chunks, 5 document chunks, 1 vision chunk, RAG metadata content length 3498.

## Blockers

- Backend deployment/backfill remains required for all affected records. The code fix is local until published and deployed.
- Existing affected rows must be re-driven after deployment:
  - recent drawing uploads with `raw_ingested`/`segmented`/`ocr_failed`
  - recent manual PDF uploads with `uploaded`/`segmented`
  - recent OneDrive PDFs with `ocr_failed`
  - recent Outlook attachments with `metadata_only`
- Provider JSON-mode fallback warnings still occur during parser/extractor/compiler calls. They did not block the two-document proof run, but they remain observability noise and should be tracked separately if they cause extraction quality failures.
- PM app final projection writes remain intentionally disabled by `AppDbProjectionError`; ingestion completes and records the compiler projection as non-blocking.

## Root Cause

`run_embedder` selected metadata fields that excluded app `content` and `raw_text`, so documents without pre-existing RAG metadata did not embed OCR text. It also updated `rag_document_metadata` instead of upserting it, so chunks could exist without citation metadata.

## Prevention

`run_embedder` now selects app OCR text and storage/source fields and upserts `rag_document_metadata` with `app_document_id`, source metadata, project, locator fields, text, parsing status, and embedding status before completing the embedding stage.

## Failure-Loud Guardrail

Do not infer OCR or AI vision readiness from metadata alone. A record only counts as validated when the evidence ties source metadata to text/page/image extraction state, chunks/embeddings, project disposition, and retrieval proof.
