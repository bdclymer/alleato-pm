# AAI-682 Retrieval Legacy Candidate Inventory

Date: 2026-06-25
Linear: AAI-682

## Verdict

No production retrieval implementation is safe to delete in this slice.

The grep pass found old-looking or standalone retrieval code, but import/route proof shows the important paths are still active. Deleting them now would break live assistant, backend agent, executive brief, memory/artifact, or local admin eval workflows.

## Active Production Paths To Keep

- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts`
  - Live assistant stream handler.
  - Uses `planRetrieval` and `executeRetrievalPlan`.
- `frontend/src/lib/ai/retrieval/deps.ts`
  - Production retrieval dependency adapter.
  - `runSemanticSearch` delegates to `createOperationalTools(...).semanticSearch`.
- `frontend/src/lib/ai/tools/operational.ts`
  - Canonical frontend semantic/document/meeting retrieval tools.
  - Calls `search_document_chunks` with project filters and service-role post-filter permission guards.
- `frontend/src/lib/ai/retrieval/source-specific-rag.ts`
  - Canonical source-specific retrieval for meetings, Outlook, Teams, OneDrive/SharePoint rows.
  - Receives `ToolScope` and blocks non-admin users with no project scope.
- `frontend/src/lib/ai/tools/document-intelligence.ts`
  - Active document/submittal/drawing intelligence tools.
  - Uses `search_document_chunks` for project-scoped drawing/spec context.
- `frontend/src/lib/executive/brandon-daily-update.ts`
  - Active executive daily brief source retrieval.
  - Uses `search_document_chunks` by source group and stores retrieval metadata.
- `frontend/src/lib/ai/services/ai-memory-service.ts`
  - Active memory retrieval path.
  - Uses `search_document_chunks` with `filter_source_types: ["ai_memory"]`.
- `frontend/src/lib/ai/services/workspace-artifact-service.ts`
  - Active workspace artifact retrieval path.
  - Uses `search_document_chunks` with `filter_source_types: ["workspace_artifact"]`.
- `frontend/src/lib/ai/services/agent-learning-service.ts`
  - Active agent learning retrieval path.
  - Uses `search_document_chunks` with `filter_source_types: ["agent_learning"]`.
- `backend/src/services/supabase_helpers.py`
  - Active backend `SupabaseRagStore` helper.
  - Used by `backend/src/api/main.py` for `/api/chat` semantic fallback.
- `backend/src/services/agents/alleato_ai_tools/rag.py`
  - Active backend agent RAG helper.
  - Imported by `backend/src/services/agents/alleato_ai_tools/__init__.py`, `research_agent/agent.py`, `microsoft_executive_assistant/tools.py`, and `graph_api.py`.

## Active Local Admin/Eval Paths To Keep

These are not production serving paths, but they are reachable from the local admin RAG eval route and backend docs. Do not delete without first replacing `/api/admin/rag-eval/run` and the documented local eval workflow.

- `backend/src/scripts/rag_eval.py`
  - Referenced by `frontend/src/app/api/admin/rag-eval/run/route.ts` as eval type `l1`.
- `backend/src/scripts/rag_answer_eval.py`
  - Referenced by `frontend/src/app/api/admin/rag-eval/run/route.ts` as eval type `l2`.
- `backend/src/scripts/rag_reranker_eval.py`
  - Referenced by `frontend/src/app/api/admin/rag-eval/run/route.ts` as eval type `reranker`.
- `backend/src/scripts/rag_source_coverage.py`
  - Referenced by `frontend/src/app/api/admin/rag-eval/run/route.ts` as eval type `coverage`.
- `backend/src/scripts/rag_e2e_eval.py`
  - Referenced by `frontend/src/app/api/admin/rag-eval/run/route.ts` as eval type `e2e`.

## Manual/Dev-Only Candidates Requiring Separate Cleanup Decision

These are not referenced by package scripts, provider schedules, or live routes in this pass. They are still documented/manual tools, so deletion should be handled in a separate cleanup slice that either migrates the workflow to `scripts/verify/*` or removes the docs that advertise them.

- `backend/src/scripts/eval_graph_sync.py`
  - Documented in `backend/README.md`.
  - No package/provider/live route reference found.
- `backend/src/scripts/eval_mine_emails.py`
  - Documented in `backend/README.md`.
  - No package/provider/live route reference found.
- `backend/src/scripts/backfill_contextual_embeddings.py`
  - Referenced by `backend/src/services/pipeline/contextualize.py`.
  - Still tied to the contextual retrieval pilot; do not delete until contextual retrieval is either finalized or explicitly retired.
- `backend/src/scripts/backfill_outlook_rag_metadata_to_app_documents.py`
  - Retired by AAI-732 after the replacement owner was proven:
    `backfill_outlook_intake_rag_documents()` plus
    `SupabaseRagStore.upsert_document_metadata()`.

## Deletion Decision

No deletion in AAI-682 from this inventory.

Reason:

- Active production import/route proof exists for core retrieval helpers.
- Admin eval route proof exists for the old `rag_eval*` scripts.
- Remaining manual/dev-only scripts require workflow replacement or documentation cleanup first.

## Guardrails Now Covering This

- `npm run rag:verify:retrieval-contract`
  - Live project/source filter proof, duplicate top-chunk proof, citation/reference proof, and static permission guard proof.
- `npm run rag:verify:client-boundary`
  - Frontend RAG-owned tables/RPCs must use the RAG service client.
- `npm run rag:verify:backend-client-boundary`
  - Backend RAG-owned tables must use AI DB resolver helpers.
- `npm run rag:verify:metadata-boundary`
  - AI/RAG paths may not read heavy body text from app `document_metadata`.
