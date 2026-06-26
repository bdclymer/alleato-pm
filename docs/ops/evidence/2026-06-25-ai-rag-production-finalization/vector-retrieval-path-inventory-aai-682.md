# AAI-682 Vector Retrieval Path Inventory

Date: 2026-06-25
Linear: AAI-682

## Active Retrieval Paths

- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts`
  - Live assistant stream handler.
  - Calls `planRetrieval`, `executeRetrievalPlan`, direct source-specific fast paths, project packet fast paths, and AI SDK tool synthesis.
- `frontend/src/lib/ai/retrieval/planner.ts`
  - Chooses source-specific RAG before generic source lookup.
  - Routes project operating context, source health, app-help, recent emails, Teams, and broad executive prompts.
- `frontend/src/lib/ai/retrieval/executor.ts`
  - Executes planned retrieval sources and records durations/warnings.
  - Calls semantic search, source-specific RAG, recent email, app expert, reusable briefing, project packet, project snapshot, and external source paths.
- `frontend/src/lib/ai/retrieval/deps.ts`
  - Wires executor interfaces to production tools and source-specific retrieval.
- `frontend/src/lib/ai/retrieval/source-specific-rag.ts`
  - Canonical source-specific retrieval for meetings, Outlook, Teams, and OneDrive/SharePoint-backed source rows.
- `frontend/src/lib/ai/tools/operational.ts`
  - Production semantic search tool.
  - Calls `public.search_document_chunks` with project filters, optional hybrid ranking, and service-role permission gating.
- `backend/src/services/supabase_helpers.py`
  - Backend RAG search helper for backend agents and scripts.
- `backend/src/services/agents/alleato_ai_tools/rag.py`
  - Backend agent RAG tool using `search_document_chunks`; still needs separate deletion/migration proof before any cleanup.
- `frontend/src/lib/executive/brandon-daily-update.ts`
  - Executive daily brief retrieval uses `search_document_chunks` for source groups.
- `frontend/src/lib/ai/tools/document-intelligence.ts`
  - Submittal/document intelligence semantic lookup uses `search_document_chunks`.

## Active RAG Search Contract

- `scripts/database/rag/migrations/20260619223000_hybrid_rag_ranking.sql`
  - Adds `document_chunk_retrieval_telemetry` and hybrid score columns.
- `scripts/database/rag/migrations/20260624200000_search_document_chunks_lower_ivfflat_probes.sql`
  - Current `public.search_document_chunks` function body.
  - Uses `filter_source_types`, `filter_project_id`, `ranking_mode`, `query_text`, and telemetry fields.

## Baseline Findings

- `npm run rag:verify:source-specific`: passed.
- `npm run rag:verify:chunk-integrity -- --days=2`: initially passed, but did not catch low-content placeholder chunks.
- `npm run rag:verify:hybrid-ranking`: initially failed because the verifier sampled low-content placeholder chunks that had been embedded.
- `npm run rag:verify:response-contract`: passed.
- `npm run rag:verify:assistant-tool-registry`: passed.
- `npm run rag:verify:assistant-operational-readiness`: initially failed on a missing archived eval-suite path.

## Root Cause Repaired

The document parser converted documents with less than 50 extracted characters into fake searchable summaries:

`Minimal extract for '<title>'. Parsed content was only 0 characters and may require OCR or a different source format.`

The embedder then vectorized those fake summaries as `meeting_summary`, `meeting_segment_summary`, `meeting_summary_embed`, and `teams_channel` chunks. Hybrid ranking was not broken; it was correctly retrieving indexed junk.

## Data Repair

- Deleted 67 live RAG placeholder chunks.
- Updated 16 placeholder-only `rag_document_metadata` rows to `embedding_status='skipped_low_content'`.
- Mirrored `status='skipped_low_content'` to 16 app `document_metadata` rows.
- Mixed documents with real chunks kept their valid chunks; only placeholder chunks were deleted.

Evidence:

- `minimal-extract-repair-plan-aai-682.json`
- `minimal-extract-repair-applied-aai-682.json`

## Guardrails Added

- `backend/src/services/pipeline/document_parser.py`
  - Low-content documents no longer create fake segments or fake summaries.
- `backend/src/services/pipeline/embedder.py`
  - No-segment documents can still embed vision page summaries.
  - Documents with no searchable text and no vision become explicit `skipped_low_content` terminal rows and stale chunks are deleted.
- `scripts/verify/verify_rag_chunk_integrity.mjs`
  - Low-content placeholder chunks are now fatal.
- `backend/tests/test_document_low_content_pipeline.py`
  - Regression proves low-content documents do not call embedding and delete stale placeholder chunks.

## Remaining Blocker

`npm run rag:verify:assistant-operational-readiness` now reaches real assertions and fails because the current live assistant handler does not attach the canonical `backendDeepAgentExecutiveBriefing` bridge/tool trace. The architecture and active eval suite still require that workflow for broad no-project executive prompts.

This is not hidden by AAI-682. It needs either:

- migration/restoration of the executive Deep Agents bridge/tool trace, or
- an explicit architecture and eval-suite update if that workflow was intentionally retired.
