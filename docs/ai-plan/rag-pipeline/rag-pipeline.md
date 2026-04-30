# RAG + AI Assistant Source of Truth

Last updated: 2026-03-10
Owner: AI Platform

This document is the single operational reference for:
- Fireflies sync and markdown generation
- Document ingestion and pipeline execution
- Chunking, embedding, and extraction strategy
- AI assistant agents, prompts, and tool wiring
- Conversation memory and retrieval behavior
- Known quality failure modes and current fixes

## 1) Core Runtime Architecture

```text
Fireflies / Manual Upload / Local Folder
  -> document_metadata + storage object
  -> fireflies_ingestion_jobs enqueue (DB trigger)
  -> backend /api/pipeline/process
  -> Stage 1 parser router (meeting | document | financial)
  -> Stage 2 embedder
  -> Stage 3 extractor
  -> Stage 4 digest (non-blocking)
  -> documents / meeting_segments / risks / tasks / decisions / opportunities / meeting_digests

AI Assistant Chat Route (Next.js API)
  -> Strategist agent (system prompt)
  -> consultCFO sub-agent (system prompt)
  -> project+financial+operational+ERP tools
  -> streamed response + chat_history persistence
  -> post-response conversation memory generation
```

## 2) Which Chat Stack Is Primary

Primary production assistant path:
- Chat API route: [`frontend/src/app/api/ai-assistant/chat/route.ts`](../../frontend/src/app/api/ai-assistant/chat/route.ts)
- Orchestrator: [`frontend/src/lib/ai/orchestrator.ts`](../../frontend/src/lib/ai/orchestrator.ts)

Secondary/legacy parallel paths still in repo:
- Simple proxy route: [`frontend/src/app/api/rag-chat/route.ts`](../../frontend/src/app/api/rag-chat/route.ts)
- Backend chat endpoints: [`backend/src/api/main.py`](../../backend/src/api/main.py)

When debugging user-facing answer quality, start with the primary path above.

## 3) Agents and Prompts Currently Set Up

Configured today:
- Strategist (top-level): [`frontend/src/lib/ai/agents/strategist.ts`](../../frontend/src/lib/ai/agents/strategist.ts)
- CFO specialist: [`frontend/src/lib/ai/agents/cfo.ts`](../../frontend/src/lib/ai/agents/cfo.ts)
- Shared agent types: [`frontend/src/lib/ai/agents/types.ts`](../../frontend/src/lib/ai/agents/types.ts)

Important reality:
- Only `consultCFO` is currently live as a specialist tool in orchestrator.
- COO/CHRO/CRO/VPBD are planned but not active.

Why prompt files are in `frontend/`:
- They are executed server-side by Next.js API routes, not in browser client code.

## 4) Tool Wiring (What the Agents Can Actually Use)

Strategist tool construction:
- [`createStrategistTools()` in `frontend/src/lib/ai/orchestrator.ts`](../../frontend/src/lib/ai/orchestrator.ts)
- Includes:
  - `consultCFO` (sub-agent call)
  - Full `createProjectTools()` tool set for direct strategist use

Main tool registries:
- Core project tools: [`frontend/src/lib/ai/tools/project-tools.ts`](../../frontend/src/lib/ai/tools/project-tools.ts)
- Financial tools: [`frontend/src/lib/ai/tools/financial.ts`](../../frontend/src/lib/ai/tools/financial.ts)
- Operational tools: [`frontend/src/lib/ai/tools/operational.ts`](../../frontend/src/lib/ai/tools/operational.ts)
- Acumatica tools: [`frontend/src/lib/ai/tools/acumatica.ts`](../../frontend/src/lib/ai/tools/acumatica.ts)

High-impact tools relevant to RAG/assistant quality:
- `getPortfolioOverview`
- `getProjectsWithRisks` (portfolio risk ranking)
- `getProjectRiskAnalysis` (single-project drilldown)
- `getActionItemsAndInsights`
- `getMeetingsByDate`
- `searchDocuments`
- `recallPastConversations`

## 5) Why Risk Answers Were Weak and What Was Fixed

Observed failure mode:
- Query: "what projects have risks?"
- Bad behavior: model answered from `open_critical_items` only, which under-represents real risk.

Root causes:
1. No dedicated portfolio-level risk tool.
2. Prompt guidance did not force risk-specific tool usage.
3. Model often defaulted to `getPortfolioOverview` for risk questions.

Implemented fix:
- Added `getProjectsWithRisks` in [`frontend/src/lib/ai/tools/project-tools.ts`](../../frontend/src/lib/ai/tools/project-tools.ts)
  - Aggregates `risks`, unresolved `ai_insights`, `project_issue_summary`, and `project_health_dashboard`
  - Returns ranked projects with explicit risk signals and `riskScore`
- Updated strategist prompt in [`frontend/src/lib/ai/agents/strategist.ts`](../../frontend/src/lib/ai/agents/strategist.ts)
  - Adds mandatory workflow for portfolio risk queries
- Updated CFO prompt in [`frontend/src/lib/ai/agents/cfo.ts`](../../frontend/src/lib/ai/agents/cfo.ts)
  - Adds `getProjectsWithRisks` + risk-query strategy
- Expanded routing keywords in [`frontend/src/lib/ai/orchestrator.ts`](../../frontend/src/lib/ai/orchestrator.ts)
  - Adds `risk`, `risky`, `issue`, `critical items`, `exposure`

## 6) Fireflies Sync Process

Primary API entrypoint:
- Endpoint: `POST /api/ingest/fireflies/recent`
- File: [`backend/src/api/main.py`](../../backend/src/api/main.py)

Sync implementation:
- Service: [`backend/src/services/ingestion/fireflies_pipeline.py`](../../backend/src/services/ingestion/fireflies_pipeline.py)
- Behavior:
  - Fetch recent transcript summaries
  - Pull full transcript + apps outputs
  - Normalize markdown with rich sections + transcript lines
  - Upload markdown to Supabase Storage (`meetings` bucket)
  - Upsert `document_metadata`
  - Create/advance ingestion job row

Legacy Cloudflare workers were removed. Fireflies ingestion runs through the
native Render/FastAPI backend path only.

## 7) How the RAG Pipeline Is Initiated

Automatic (preferred):
1. Insert/update `document_metadata`
2. DB trigger enqueues `fireflies_ingestion_jobs`
3. Triggered call hits backend pipeline endpoint

Pipeline endpoint:
- `POST /api/pipeline/process`
- File: [`backend/src/api/main.py`](../../backend/src/api/main.py)

Trigger + config migrations:
- [`supabase/migrations/20260227000001_auto_trigger_pipeline_on_document_insert.sql`](../../supabase/migrations/20260227000001_auto_trigger_pipeline_on_document_insert.sql)
- [`supabase/migrations/20260227000002_pipeline_config_table.sql`](../../supabase/migrations/20260227000002_pipeline_config_table.sql)

Manual document upload path (UI/API):
- [`frontend/src/app/api/documents/upload/route.ts`](../../frontend/src/app/api/documents/upload/route.ts)

Manual local folder ingestion:
- Script: [`scripts/ingestion/ingest_local_documents.py`](../../scripts/ingestion/ingest_local_documents.py)
- Typical command:
  - `python3 scripts/ingestion/ingest_local_documents.py --source-dir "<folder>" --process-now`

## 8) Stage Details and Strategies

Stage router:
- [`backend/src/services/pipeline/orchestrator.py`](../../backend/src/services/pipeline/orchestrator.py)
- Routes by category/extension:
  - Meeting transcript -> `parser.py`
  - Generic docs (pdf/doc/docx/text/markdown) -> `document_parser.py`
  - Tabular finance docs (csv/tsv/xls/xlsx) -> `financial_parser.py`

Stage 1A - Meeting parser:
- [`backend/src/services/pipeline/parser.py`](../../backend/src/services/pipeline/parser.py)
- Parses Fireflies markdown, segments semantically, extracts raw decisions/risks/tasks.

Stage 1B - Generic document parser:
- [`backend/src/services/pipeline/document_parser.py`](../../backend/src/services/pipeline/document_parser.py)
- Extracts text (PDF/DOCX/plain), generates summary, segments to `meeting_segments`.
- Hardened for empty extracts + null-byte sanitation.

Stage 1C - Financial parser:
- [`backend/src/services/pipeline/financial_parser.py`](../../backend/src/services/pipeline/financial_parser.py)
- Header inference + row normalization for CSV/XLSX.
- Persists structured rows to `document_rows`.
- Generates text summaries for embedding compatibility.
- Hardened for null-byte sanitation and cleaner row keys.

Stage 2 - Embedder:
- [`backend/src/services/pipeline/embedder.py`](../../backend/src/services/pipeline/embedder.py)
- Chunking strategy:
  - `CHUNK_TARGET_CHARS = 3000`
  - `CHUNK_OVERLAP_CHARS = 500`
  - Sentence-aware splitting with overlap carry-forward
- Adds summary/section chunks for richer retrieval.

Stage 3 - Extractor:
- [`backend/src/services/pipeline/extractor.py`](../../backend/src/services/pipeline/extractor.py)
- Normalizes and upserts:
  - `decisions`
  - `risks`
  - `tasks`
  - `opportunities`

Stage 4 - Digest (non-blocking):
- [`backend/src/services/pipeline/digest.py`](../../backend/src/services/pipeline/digest.py)

LLM + embeddings:
- [`backend/src/services/pipeline/llm.py`](../../backend/src/services/pipeline/llm.py)
- Current defaults:
  - Chat: `gpt-4o-mini`
  - Embeddings: `text-embedding-3-small`

## 9) Retrieval Strategy Used by the Assistant

For the primary assistant (`/api/ai-assistant/chat`), retrieval is tool-driven:
- Structured SQL reads from project + financial + risk + meeting tables
- Full-text/keyword search via `searchDocuments`
- Conversation memory semantic recall via `recallPastConversations`

Conversation memory implementation:
- Generation: [`frontend/src/lib/ai/services/conversation-memory.ts`](../../frontend/src/lib/ai/services/conversation-memory.ts)
- Recall tool: [`frontend/src/lib/ai/tools/operational.ts`](../../frontend/src/lib/ai/tools/operational.ts)

Secondary backend RAG utilities exist for other chat paths:
- [`backend/src/services/alleato_agent_workflow/rag_tools.py`](../../backend/src/services/alleato_agent_workflow/rag_tools.py)
- [`backend/src/services/alleato_agent_workflow/tools/vector_search.py`](../../backend/src/services/alleato_agent_workflow/tools/vector_search.py)
- [`backend/src/services/alleato_agent_workflow/tools/retrieval.py`](../../backend/src/services/alleato_agent_workflow/tools/retrieval.py)

## 10) Data Tables Most Relevant to Quality

Ingestion/pipeline:
- `document_metadata`
- `fireflies_ingestion_jobs`
- `meeting_segments`
- `document_rows`
- `documents`

Structured extracted intelligence:
- `risks`
- `tasks`
- `decisions`
- `opportunities`
- `meeting_digests`
- `ai_insights`

Portfolio context:
- `projects`
- `project_health_dashboard`
- `project_issue_summary`

Assistant memory:
- `chat_history`
- `conversation_memories` (via memory service + RPC search)

## 11) Debugging Checklist for "Bad Answers"

1. Confirm the request path is primary assistant:
   - [`frontend/src/app/api/ai-assistant/chat/route.ts`](../../frontend/src/app/api/ai-assistant/chat/route.ts)
2. Inspect tool trace in `chat_history.metadata.tool_trace` for the session.
3. Verify correct tool was called:
   - Risk portfolio query should call `getProjectsWithRisks`.
4. If tool call is wrong, adjust prompt instructions before changing SQL.
5. If tool output is thin, inspect table freshness:
   - `risks`, `ai_insights`, `document_metadata`, `project_health_dashboard`.
6. Re-run ingestion for failed docs if extraction is stale.

## 12) Commands (Operational)

Local folder ingestion:
```bash
python3 scripts/ingestion/ingest_local_documents.py \
  --source-dir "/absolute/path/to/folder" \
  --process-now
```

Dry-run local folder scan:
```bash
python3 scripts/ingestion/ingest_local_documents.py \
  --source-dir "/absolute/path/to/folder" \
  --dry-run
```

Manual pipeline run for one metadata row:
```bash
curl -X POST "$BACKEND_URL/api/pipeline/process" \
  -H "Content-Type: application/json" \
  -d '{"metadataId":"<uuid>"}'
```
