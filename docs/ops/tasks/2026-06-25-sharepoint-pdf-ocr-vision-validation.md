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
- Render deploy live: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/render-backend-deploy-live-aai-669.json`
- Live backend batch 1 queued/polled: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-live-batch-aai-669.json`, `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-live-batch-second-poll-aai-669.json`
- Live backend batch 2 queued/polled/traced: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-live-batch-2-aai-669.json`, `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-live-batch-2-second-poll-aai-669.json`, `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-live-batch-2-pending-trace-aai-669.json`
- Direct canonical batch 3: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-direct-canonical-batch-3-aai-669.json`
- Orphan metadata guard and repair: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/rag-chunk-integrity-orphan-guard-aai-669.txt`, `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-orphan-metadata-repair-aai-669.json`, `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/rag-chunk-integrity-after-orphan-repair-aai-669.txt`
- Manual upload batch 4: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-manual-upload-batch-4-aai-669.json`
- Current inventory: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-candidates-after-manual-batch-4-aai-669.json`
- Graph vision download proof: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-vision-graph-download-proof-aai-669.json`
- Graph embed auto-vision proof: `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-vision-graph-embed-auto-proof-aai-669.json`

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
- Render deployed the embedder fix live on `alleato-backend` (`dep-d8uqhm3rjlhs73bkjld0`).
- Live backend batch 1 repaired 10/10 drawing uploads through `/api/pipeline/process`; each reached `complete`, `embedding_status='embedded'`, document chunks, and a vision chunk.
- Live backend batch 2 queued 20 rows; 11/20 reached embedded on the poll window, and tracing showed the remaining rows had fresh chunks/page intelligence but some were missing citation metadata.
- Added an orphan metadata guard to `scripts/verify/verify_rag_chunk_integrity.mjs` for document-like chunk source types.
- Repaired 34/34 recent orphan metadata rows with the canonical embedder; `node scripts/verify/verify_rag_chunk_integrity.mjs --days=2` now passes.
- Direct canonical batch 3 repaired 20/20 additional drawing/document embedding gaps.
- Manual upload batch 4 processed 19/19 PDF uploads with no row failures.
- Current active gaps after batch 4:
  - 66 active recent PDF/document gaps remain.
  - 12 are embedding gaps: 5 `.txt` test uploads and 7 OneDrive rows already marked `ocr_failed`.
  - 54 are vision gaps: 29 OneDrive embedded drawings, 22 Outlook attachments, and 3 drawing uploads.
- Fixed the Graph document vision path so OneDrive/SharePoint rows without stored original PDFs can download the source PDF through Microsoft Graph.
- Fixed Graph embedding so `document_page_intelligence` summaries become `vision_page_summary` vector chunks.
- OneDrive proof succeeded for `onedrive_01F674PXSIV6J6OA5TSFBYSDO6AXFJZJOF`: 25 pages analyzed from Graph and 25 embedded `vision_page_summary` chunks written alongside 22 OneDrive text chunks.
- Automatic Graph embed proof succeeded for `onedrive_01F674PXTBGWMDGWLXOJBZKUU35DJK3P37`: `embed_graph_document` ran vision internally and wrote 39 total chunks with page intelligence.

## Blockers

- Remaining embedding blockers:
  - 5 `.txt` manual test uploads are not PDF/OCR targets and should be marked terminal/not-vectorizable or excluded from this PDF gate.
  - 7 OneDrive drawing PDFs remain `ocr_failed`; they need Graph download/OCR failure inspection before reset/retry.
- Remaining vision blockers:
  - 28 OneDrive embedded drawing documents still need the Graph vision backfill after the proof row succeeded.
  - 22 Outlook attachments have embeddings but no vision/page-intelligence chunk.
  - 3 drawing uploads have embeddings but still lack the vision evidence required by this validation.
- Provider JSON-mode fallback warnings still occur during parser/extractor/compiler calls. They did not block the two-document proof run, but they remain observability noise and should be tracked separately if they cause extraction quality failures.
- PM app final projection writes remain intentionally disabled by `AppDbProjectionError`; ingestion completes and records the compiler projection as non-blocking.

## Root Cause

`run_embedder` selected metadata fields that excluded app `content` and `raw_text`, so documents without pre-existing RAG metadata did not embed OCR text. It also updated `rag_document_metadata` instead of upserting it, so chunks could exist without citation metadata.

## Prevention

`run_embedder` now selects app OCR text and storage/source fields and upserts `rag_document_metadata` with `app_document_id`, source metadata, project, locator fields, text, parsing status, and embedding status before completing the embedding stage.

`verify_rag_chunk_integrity.mjs` now fails when document-like chunks exist without a `rag_document_metadata` row, preventing searchable chunks from silently losing citation metadata.

`run_vision_analyzer` now falls back to Microsoft Graph source downloads for OneDrive/SharePoint rows that have `source_drive_id` and `source_item_id` but only store OCR text locally. Graph document embedding now invokes the vision analyzer for PDF-like Graph rows when page intelligence is absent, then embeds `document_page_intelligence` summaries as `vision_page_summary` chunks.

## Failure-Loud Guardrail

Do not infer OCR or AI vision readiness from metadata alone. A record only counts as validated when the evidence ties source metadata to text/page/image extraction state, chunks/embeddings, project disposition, and retrieval proof.
