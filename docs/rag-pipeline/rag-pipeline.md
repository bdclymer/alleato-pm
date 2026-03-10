# RAG Pipeline: Source of Truth

Last updated: 2026-03-10
Owner: Backend/AI Platform

This document is the authoritative reference for:
- Fireflies transcript sync and markdown generation
- RAG pipeline initiation and execution
- Chunking, embedding, and extraction strategy
- Chat conversation architecture and persistence
- Retrieval strategy used by agents
- Exact project files and tables involved

## 1) End-to-End Architecture

```text
Fireflies GraphQL
  -> backend/src/services/ingestion/fireflies_pipeline.py
  -> Supabase Storage bucket: meetings/*.md
  -> document_metadata upsert (raw content + metadata)
  -> DB trigger enqueue_document_metadata_rag_job
  -> POST /api/pipeline/process
  -> run_full_pipeline(metadata_id)
     Stage 1: parser/document_parser/financial_parser
     Stage 2: embedder
     Stage 3: extractor
     Stage 4: digest (non-blocking)
  -> tables: meeting_segments, documents, decisions, risks, tasks, opportunities, meeting_digests
```

## 2) Fireflies Sync Process

Primary sync path is native backend (not legacy Cloudflare worker):
- Endpoint: `POST /api/ingest/fireflies/recent`
- Request model: `FirefliesRecentSyncRequest` in `backend/src/api/main.py`

Sync implementation:
- File: `backend/src/services/ingestion/fireflies_pipeline.py`
- Class: `FirefliesIngestionPipeline`
- Flow:
  1. `sync_recent_transcripts(limit, project_id, dry_run, write_markdown_dir)` fetches transcript summaries.
  2. For each transcript ID, it fetches full transcript + Fireflies Apps outputs.
  3. It formats normalized markdown with rich sections and full transcript lines.
  4. It writes markdown to Supabase storage bucket `meetings`.
  5. It upserts `document_metadata` and transcript chunks for ingestion.

Important current behavior:
- Apps outputs are paginated and fetched fully (`limit=10`, `skip` loop), not capped to 5.
- Storage path uses sanitized filenames to support stable overwrite behavior.
- Re-sync is tolerant of duplicate ingestion job keys.

Legacy path status:
- Legacy worker exists at `backend/src/workers/ingest/index.ts`.
- `LEGACY_FIREFLIES_SYNC_ENABLED` is `false` in `backend/src/workers/ingest/wrangler.toml`.
- Legacy endpoints return guidance to use `/api/ingest/fireflies/recent`.

## 3) How the RAG Pipeline Is Initiated

### A) Automatic trigger (preferred)

1. A row is inserted into `document_metadata`.
2. Trigger function `enqueue_document_metadata_rag_job()` inserts `fireflies_ingestion_jobs` at stage `raw_ingested`.
3. Trigger reads `pipeline_url` from `pipeline_config` and calls FastAPI.

SQL migrations:
- `supabase/migrations/20260227000001_auto_trigger_pipeline_on_document_insert.sql`
- `supabase/migrations/20260227000002_pipeline_config_table.sql`

### B) Manual backend trigger

- Endpoint: `POST /api/pipeline/process`
- Payload: `{ "metadataId": "<uuid>" }`
- File: `backend/src/api/main.py`
- Execution uses bounded concurrency (`PIPELINE_MAX_CONCURRENCY`) via `_run_pipeline_limited`.

### C) Upload-triggered path (non-Fireflies docs)

- Route: `frontend/src/app/api/documents/upload/route.ts`
- Uploads document to storage bucket `documents` and inserts `document_metadata`.
- DB trigger then initiates the same backend pipeline.

### D) Legacy/manual UI path (exists but legacy-oriented)

- Route: `frontend/src/app/api/documents/trigger-pipeline/route.ts`
- UI page: `frontend/src/app/(main)/pipeline/page.tsx`
- This route triggers Cloudflare worker phase endpoints (`/parser/process`, `/embedder/process`, `/extractor/process`), not the native backend path.
- Treat as legacy/manual operational tooling unless intentionally used.

## 4) Pipeline Stages and Strategies

## Stage 1 Router

File: `backend/src/services/pipeline/orchestrator.py`

Routing logic:
- Meeting transcript -> `run_parser` (`parser.py`)
- Generic document (pdf/doc/docx/non-meeting category) -> `run_document_parser` (`document_parser.py`)
- Financial/tabular document (financial category or csv/tsv/xls/xlsx) -> `run_financial_parser` (`financial_parser.py`)

### Stage 1A: Meeting parser

File: `backend/src/services/pipeline/parser.py`

Strategy:
- Parse Fireflies markdown via `FirefliesIngestionPipeline.parse_markdown()`.
- Convert transcript segments to indexed lines.
- Generate meeting summary (`gpt-4o-mini`).
- Perform semantic segmentation into sections with decisions/risks/tasks (`gpt-4o-mini`, JSON mode).
- Upsert segments into `meeting_segments`.

Outputs:
- `meeting_segments`
- `document_metadata.overview`, `document_metadata.status = segmented`
- `fireflies_ingestion_jobs.stage = segmented`

### Stage 1B: Generic document parser

File: `backend/src/services/pipeline/document_parser.py`

Strategy:
- Extract text from PDF/DOCX/text.
- Generate summary via LLM.
- Segment content semantically (line-indexed).
- Reuse same downstream shape by writing to `meeting_segments`.

### Stage 1C: Financial parser

File: `backend/src/services/pipeline/financial_parser.py`

Strategy:
- Parse CSV/TSV/XLS/XLSX into dataframes.
- Persist normalized row data into `document_rows` (`dataset_id = metadata_id`).
- Create text summaries/sections into `meeting_segments` for downstream embedding.
- Update `document_metadata` with synthesized overview + extracted text content.

## Stage 2: Embedder

File: `backend/src/services/pipeline/embedder.py`

Chunking strategy:
- Transcript chunks:
  - Target size: `CHUNK_TARGET_CHARS = 3000`
  - Overlap: `CHUNK_OVERLAP_CHARS = 500`
  - Sentence-aware splitting (`_split_sentences`) and overlap tail carry-forward.
- Adds `meeting_summary` chunk and per-segment `segment_summary` chunks.
- Adds section-aware chunks from rich Fireflies sections:
  - Summary, Short Summary, Gist, Bullet Gist, Shorthand Bullet, Outline, Action Items
  - Notes subtopics (`notes_topic` doc type)

Embedding strategy:
- Model: `text-embedding-3-small`
- Batch embedding via `llm.batch_embed`
- Segment summaries also embedded to `meeting_segments.summary_embedding`

Storage strategy:
- Upsert to `documents` with metadata:
  - `doc_type`, `chunk_index`, `segment_index`, `segment_id`, `content_hash`, `participants`
- Dedup/update behavior via `content_hash` lookup for existing docs per `file_id`.

Outputs:
- `documents`
- `meeting_segments.summary_embedding`
- `document_metadata.status = embedded`
- `fireflies_ingestion_jobs.stage = chunked -> embedded`

## Stage 3: Extractor

File: `backend/src/services/pipeline/extractor.py`

Extraction strategy:
- Collect raw decisions/risks/tasks from `meeting_segments`.
- Add action items from metadata.
- Re-parse rich Notes and Action Items sections for enhanced context.
- Build speaker->email map and pass into LLM prompt.
- Normalize/dedupe and enrich structured items using `gpt-4o-mini` (JSON mode).
- Priority/date inference rules are prompt-driven.

Structured outputs:
- `decisions` (upsert on `metadata_id,description`)
- `risks` (upsert on `metadata_id,description`)
- `tasks` (upsert on `metadata_id,description`, source_system=`fireflies`, includes `project_ids`, optional `assignee_email`)
- `opportunities` (upsert on `metadata_id,description`)

Finalization:
- `fireflies_ingestion_jobs.stage = done`
- `document_metadata.status = complete`

## Stage 4: Digest (non-blocking)

File: `backend/src/services/pipeline/digest.py`

Strategy:
- Reads Stage 3 outputs.
- If enough extracted content exists, generates executive digest JSON via LLM.
- Upserts to `meeting_digests`.
- Failures are logged but do not fail pipeline completion.

## 5) Models and Prompting

LLM/embedding file:
- `backend/src/services/pipeline/llm.py`

Current models:
- Chat model: `gpt-4o-mini`
- Embeddings: `text-embedding-3-small`

Prompting patterns:
- Segmentation and structured extraction run in JSON mode.
- Extraction prompt explicitly enforces dedupe and extraction from both raw segment items and notes/action-items context.
- Due-date and priority heuristics are encoded in prompt instructions.

## 6) Retrieval Strategies Used by RAG Agents

### Vector semantic retrieval

File: `backend/src/services/alleato_agent_workflow/tools/vector_search.py`

Methods:
- `search_meetings`
- `search_decisions`
- `search_risks`
- `search_opportunities`
- `search_all_knowledge`

Behavior:
- Generate query embedding.
- Query Supabase RPC match functions with thresholding.
- Return similarity-ranked results with source references.

### Structured retrieval (non-vector)

File: `backend/src/services/alleato_agent_workflow/tools/retrieval.py`

Methods:
- `get_recent_meetings`, `get_tasks_and_decisions`, `get_project_insights`, `list_all_projects`, `get_project_details`

Behavior:
- Direct table reads for deterministic project/task/risk/decision context.

### Hybrid fallback retrieval utility

File: `backend/src/services/alleato_agent_workflow/rag_tools.py`

Behavior in `company_rag_search`:
- Try vector search first.
- Fall back to keyword `ilike` search.
- Fall back to recent chunks if still empty.

## 7) Chat Conversations and Memory

There are multiple chat paths in this codebase. They are not equivalent.

### A) Persisted AI Assistant conversations (primary product chat memory)

This is the path used by the in-app assistant UI and widget:
- Frontend API stream route: `frontend/src/app/api/ai-assistant/chat/route.ts`
- Conversation CRUD:
  - `frontend/src/app/api/ai-assistant/conversations/route.ts`
  - `frontend/src/app/api/ai-assistant/conversations/[sessionId]/route.ts`
  - `frontend/src/app/api/ai-assistant/messages/[sessionId]/route.ts`
- UI entrypoints:
  - `frontend/src/components/ai-assistant/rag-chat-page.tsx`
  - `frontend/src/components/chat/simple-rag-chat.tsx`
  - `frontend/src/components/chat/ai-chat-widget.tsx` (mounted in `frontend/src/app/layout.tsx`)

Persistence behavior:
- Conversation metadata stored in `conversations`.
- Message history stored in `chat_history`.
- After each streamed response, `generateConversationMemory()` summarizes and embeds conversation context:
  - File: `frontend/src/lib/ai/services/conversation-memory.ts`
  - Writes to `memories` table (`memory_type = conversation_summary`).
- Recall tool uses semantic search RPC:
  - `search_conversation_memories` (migration: `supabase/migrations/20260306000001_conversation_memories.sql`)
  - Invoked from `frontend/src/lib/ai/tools/operational.ts` (`recallPastConversations`).

### B) ChatKit thread state in backend memory (not durable)

These ChatKit endpoints keep thread state in Python process memory:
- `/chatkit`, `/chatkit/state`, `/chatkit/bootstrap`
- `/rag-chatkit`, `/rag-chatkit/state`, `/rag-chatkit/bootstrap`
- File: `backend/src/api/main.py`

Storage behavior:
- Uses in-memory stores (`backend/src/services/memory_store.py` and in-process dict/singleton state).
- Thread/event/agent context is lost on backend restart unless separately persisted by another path.

### C) Simple backend RAG proxy path

- `frontend/src/app/api/rag-chat/route.ts` proxies to backend `/api/chat`.
- Backend `/api/chat` (`backend/src/api/main.py`) does retrieval and returns JSON reply/sources.
- This path is useful fallback/simple mode but does not itself create durable conversation history records.

## 8) Canonical File Map

### Ingestion and sync
- `backend/src/services/ingestion/fireflies_pipeline.py`
- `backend/src/services/supabase_helpers.py`
- `backend/src/api/main.py`

### Pipeline core
- `backend/src/services/pipeline/__init__.py`
- `backend/src/services/pipeline/orchestrator.py`
- `backend/src/services/pipeline/parser.py`
- `backend/src/services/pipeline/document_parser.py`
- `backend/src/services/pipeline/financial_parser.py`
- `backend/src/services/pipeline/embedder.py`
- `backend/src/services/pipeline/extractor.py`
- `backend/src/services/pipeline/digest.py`
- `backend/src/services/pipeline/llm.py`
- `backend/src/services/pipeline/models.py`

### Retrieval and agent-side RAG tools
- `backend/src/services/alleato_agent_workflow/rag_tools.py`
- `backend/src/services/alleato_agent_workflow/tools/vector_search.py`
- `backend/src/services/alleato_agent_workflow/tools/retrieval.py`
- `backend/src/services/alleato_agent_workflow/rag_debug_tracer.py`

### Chat conversation stack
- `frontend/src/app/api/ai-assistant/chat/route.ts`
- `frontend/src/app/api/ai-assistant/conversations/route.ts`
- `frontend/src/app/api/ai-assistant/conversations/[sessionId]/route.ts`
- `frontend/src/app/api/ai-assistant/messages/[sessionId]/route.ts`
- `frontend/src/lib/ai/services/conversation-memory.ts`
- `frontend/src/lib/ai/tools/operational.ts` (`recallPastConversations`)
- `frontend/src/components/ai-assistant/rag-chat-page.tsx`
- `frontend/src/components/chat/simple-rag-chat.tsx`
- `frontend/src/components/chat/ai-chat-widget.tsx`
- `backend/src/api/main.py` (`/chatkit`, `/rag-chatkit`, `/api/chat`)
- `backend/src/services/memory_store.py`

### Triggering and UI
- `frontend/src/app/api/documents/upload/route.ts`
- `frontend/src/app/api/documents/status/route.ts`
- `frontend/src/app/api/documents/trigger-pipeline/route.ts` (legacy/manual worker trigger)
- `frontend/src/app/(main)/pipeline/page.tsx` (legacy/manual pipeline UI)

### DB trigger/config migrations
- `supabase/migrations/20260227000001_auto_trigger_pipeline_on_document_insert.sql`
- `supabase/migrations/20260227000002_pipeline_config_table.sql`
- `supabase/migrations/20260301000001_meeting_digests.sql`
- `supabase/migrations/20260306000001_conversation_memories.sql`

## 9) Operational Notes

- Preferred sync endpoint for Fireflies: `POST /api/ingest/fireflies/recent`.
- Preferred pipeline executor: backend `run_full_pipeline` via `/api/pipeline/process`.
- For persistent conversation history + memory recall, use the `/api/ai-assistant/*` stack.
- `/chatkit` and `/rag-chatkit` expose thread state but are in-memory by default.
- Legacy Cloudflare ingest worker sync is disabled by default.
- If docs or runtime behavior diverge, trust code paths listed in section 7 and update this file.
