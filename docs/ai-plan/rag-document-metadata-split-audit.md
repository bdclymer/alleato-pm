# RAG Document Metadata Split Audit

Date: 2026-05-14

## Decision

`document_metadata` should not be copied wholesale into the RAG database as-is.
It should be split into two contracts:

1. App DB: a skinny, app-facing source catalog.
2. RAG DB: full source payload, parsing state, summary embeddings, chunk provenance, and ingestion health.

This fixes the current partial split. `document_chunks` and
`fireflies_ingestion_jobs` are already routed to the RAG DB, but the large
`document_metadata.content` payload is still on the app DB. That means full
meeting transcripts, email bodies, Teams message text, OneDrive extracted text,
and some compiler inputs can still overload the operational database.

## Current Routing

| Surface | Current DB | Correct target | Status |
|---|---:|---:|---|
| `document_chunks` | RAG DB when `RAG_DATABASE_WRITES_ENABLED=true` | RAG DB | Done |
| `fireflies_ingestion_jobs` | RAG DB when `RAG_DATABASE_WRITES_ENABLED=true` | RAG DB | Done |
| `document_metadata` identity/catalog fields | App DB | App DB | Keep |
| `document_metadata.content` / `raw_text` | App DB | RAG DB | Must move |
| `document_metadata.summary_embedding` | App DB | RAG DB | Must move |
| `document_metadata.status` as processing state | App DB | RAG DB, with compact app mirror | Must split |
| `source_metadata` operational source pointers | App DB | App DB mirror plus RAG processing metadata | Must split |
| `source_sync_runs` detailed logs | App DB | RAG DB or compact health table | Follow-up |

## App DB Skinny Catalog

Keep only fields needed for app pages, permissions, source linking, and human
navigation:

- `id`
- `project_id`
- `project`
- `title`
- `type`
- `category`
- `source`
- `source_system`
- `source_item_id`
- `source_web_url`
- `url`
- `fireflies_id`
- `fireflies_link`
- `meeting_link`
- `storage_bucket`
- `file_path`
- `file_name`
- `source_drive_id`
- `source_site_id`
- `source_path`
- `date`
- `captured_at`
- `created_at`
- `updated_at`
- compact `summary` / `overview` only if used directly by app UI
- compact RAG health mirror fields such as `rag_status`, `last_indexed_at`, `rag_error_code`

The app DB should not own large raw text. After cutover, app pages that need a
full transcript should call a backend route that reads the source markdown from
Storage or the RAG DB.

## RAG DB Metadata Table

Create `public.rag_document_metadata` in the RAG DB.

Suggested contract:

```sql
create table if not exists public.rag_document_metadata (
  id text primary key,
  app_document_id text not null,
  project_id integer,
  source text,
  source_system text,
  source_item_id text,
  title text,
  type text,
  category text,
  source_web_url text,
  storage_bucket text,
  storage_path text,
  content text,
  raw_text text,
  content_hash text,
  content_length integer,
  summary text,
  overview text,
  summary_embedding extensions.halfvec(3072),
  parsing_status text,
  embedding_status text,
  processing_metadata jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_content_loaded_at timestamptz,
  last_indexed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
```

Required indexes:

```sql
create index if not exists idx_rag_document_metadata_project_source_date
  on public.rag_document_metadata (project_id, source, category, coalesce(last_synced_at, created_at) desc);

create index if not exists idx_rag_document_metadata_embedding_status
  on public.rag_document_metadata (embedding_status, source, category);

create index if not exists idx_rag_document_metadata_storage
  on public.rag_document_metadata (storage_bucket, storage_path)
  where storage_path is not null;

create index if not exists idx_rag_document_metadata_summary_embedding
  on public.rag_document_metadata
  using hnsw (summary_embedding extensions.halfvec_cosine_ops)
  where summary_embedding is not null;
```

## Repo Path Classification

### Backend Writes That Must Be Split First

These create or update full source text today and need to write large content to
RAG DB metadata while keeping only skinny catalog rows in the app DB:

| File | Current behavior | Change needed |
|---|---|---|
| `backend/src/services/supabase_helpers.py` | `SupabaseRagStore.upsert_document_metadata()` writes all metadata to app DB; chunks use RAG DB. | Add `upsert_rag_document_metadata()` and `upsert_app_document_catalog()`; make ingestion call both. |
| `backend/src/services/ingestion/fireflies_pipeline.py` | Formats rich Fireflies markdown and upserts it through `SupabaseRagStore`. | Store full markdown/content in RAG DB; app DB keeps pointers, title, source URL, date, project. |
| `backend/src/services/pipeline/document_parser.py` | Reads/updates `document_metadata` with parsing output. | Read/write RAG metadata for payload/parsing; mirror only compact status to app DB. |
| `backend/src/services/pipeline/embedder.py` | Reads `document_metadata.content` and writes chunks. | Read source content from RAG metadata or Storage; write status to RAG metadata and compact app mirror. |
| `backend/src/services/integrations/microsoft_graph/outlook.py` | Inserts email content into `document_metadata`. | Store full email/thread body in RAG metadata; app DB stores subject, sender/date/project/source IDs. |
| `backend/src/services/integrations/microsoft_graph/teams.py` | Inserts Teams message/conversation content into `document_metadata`. | Store full message/conversation text in RAG metadata; app DB stores Teams channel/chat IDs and compact preview. |
| `backend/src/services/integrations/microsoft_graph/onedrive.py` | Extracts text and inserts capped content into `document_metadata`. | Store extracted text in RAG metadata and Storage; app DB stores file identity/path/project. |
| `scripts/ingestion/ingest_local_documents.py` | Writes local knowledge rows to `document_metadata`. | Use the same split writer; do not add new full-content app DB writes. |
| `scripts/ingestion/ingest_knowledge_base_folder.py` | Syncs knowledge-base files into `document_metadata`. | Store payload in RAG DB, app DB keeps searchable catalog only if UI needs it. |

### Backend Readers That Need A RAG Metadata Repository

These currently read `document_metadata.content` directly and must be moved to a
shared repository that can hydrate full text from RAG DB or Storage:

| File | Why it matters |
|---|---|
| `backend/src/services/daily_digest.py` | Uses meeting content to generate digest signals. |
| `backend/src/services/task_extraction.py` | Reads communication content for tasks/actions. |
| `backend/src/services/intelligence/compiler.py` | Processes document source text into intelligence artifacts. |
| `backend/src/services/intelligence/email_compiler.py` | Reads email thread `content` from `document_metadata`. |
| `backend/src/services/intelligence/teams_compiler.py` | Reads Teams conversation rows and compiler state. |
| `backend/src/services/integrations/microsoft_graph/embed.py` | Reads Graph document content before chunking. |
| `backend/src/services/scheduler.py` | Classifies non-vectorizable rows and backlog jobs using content and file pointers. |
| `backend/src/services/health/rag_meeting_health.py` | Should report app catalog health separately from RAG payload/chunk health. |

### Frontend / API Readers To Keep On App DB

These should keep using app DB skinny metadata because they are UI/catalog
surfaces, not raw-payload processors:

| File/surface | Keep fields |
|---|---|
| `frontend/src/app/(admin)/document-metadata/*` | catalog fields, compact summaries, RAG status mirror; no raw full transcript by default |
| `frontend/src/app/(main)/[projectId]/meetings/*` | title/date/project/source links/compact summary; full transcript route hydrates from backend |
| `frontend/src/app/api/document-metadata/[docId]/content/route.ts` | change to backend/RAG hydration route instead of app DB `content` |
| `frontend/src/lib/ai/task-source-review.ts` | keep source title/project/date joins from app DB |
| `frontend/src/lib/ai/intelligence/packet-service.ts` | keep source attribution metadata; source text should come from RAG retrieval or compiler outputs |
| `frontend/src/lib/ai/services/project-operating-summary-sources.ts` | keep compact metadata queries; move content-heavy fallbacks to backend/RAG route |

### Frontend / API Readers That Must Stop Pulling App DB Content

These are AI/RAG surfaces and should read chunks or RAG metadata, not full
`document_metadata.content` from the app DB:

| File | Change needed |
|---|---|
| `frontend/src/lib/executive/brandon-daily-update.ts` | `loadMetadata()` and fallback metadata queries select `content/raw_text`; replace with RAG metadata hydration or chunk-only excerpts. |
| `frontend/src/lib/ai/retrieval/source-specific-rag.ts` | Metadata lookup can stay app DB, but raw content fallback must move to RAG DB/Storage. |
| `frontend/src/lib/ai/preflights.ts` | Same source-specific split as above. |
| `frontend/src/lib/ai/tools/operational.ts` | Meeting search by summary uses `document_metadata.summary_embedding`; move that RPC to RAG DB metadata. |
| `frontend/src/lib/ai/tools/project-tools.ts` | Project tools should not select full content from app DB. |
| `frontend/src/app/api/ai-assistant/timeline/route.ts` | Keep timeline metadata; avoid raw payload queries. |

## Implementation Checklist

### Phase 1: Schema And Repository Boundary

- [ ] Add RAG DB migration for `public.rag_document_metadata`.
- [ ] Add RAG-side indexes for source/project/date, embedding status, storage path, and summary embedding.
- [ ] Add backend repository helpers:
  - [ ] `get_rag_metadata_read_client()`
  - [ ] `get_rag_metadata_write_client()`
  - [ ] `upsert_app_document_catalog(row)`
  - [ ] `upsert_rag_document_metadata(row)`
  - [ ] `fetch_rag_document_content(document_id)`
  - [ ] `fetch_source_catalog(document_ids)`
- [ ] Make the helpers fail loudly when RAG env vars are missing while RAG split flags are enabled.

### Phase 2: Fireflies First

- [ ] Modify Fireflies ingestion so full transcript markdown goes to RAG DB metadata.
- [ ] Keep app DB `document_metadata.content` as a compact preview or null after parity passes.
- [ ] Backfill 2026 Fireflies RAG metadata from Supabase Storage without calling Fireflies.
- [ ] Verify every repairable Fireflies row has:
  - [ ] app DB skinny catalog row
  - [ ] RAG DB full `content` with `## Transcript`
  - [ ] RAG DB embedded `meeting_transcript` chunks
  - [ ] app DB compact `rag_status` / `last_indexed_at`
- [ ] Add `rag-stats` row for app catalog vs RAG metadata vs chunks.

### Phase 3: Microsoft Graph Content

- [ ] Update Outlook ingestion to write full email body/thread text to RAG metadata.
- [ ] Update Teams ingestion to write full message/conversation text to RAG metadata.
- [ ] Update OneDrive ingestion to write extracted text to RAG metadata and Storage.
- [ ] Update Graph embedding candidate selection so it reads candidate IDs from app DB but payload/content from RAG metadata.
- [ ] Verify emails, Teams, OneDrive each show source counts for synced, RAG metadata present, chunked, embedded.

### Phase 4: Consumers And Fallbacks

- [ ] Update `daily_digest.py`, `task_extraction.py`, `compiler.py`, `email_compiler.py`, and `teams_compiler.py` to hydrate content from RAG metadata/Storage.
- [ ] Update executive brief fallback logic so it does not select `content/raw_text` from app DB.
- [ ] Move `match_document_metadata_by_summary` or replacement summary search to the RAG DB.
- [ ] Keep app DB metadata hydration to titles, dates, source URLs, and project IDs only.

### Phase 5: App DB De-Load

- [ ] Stop new writes to app DB `document_metadata.content`, `raw_text`, and `summary_embedding`.
- [ ] Add a migration or maintenance job to null or compact old app DB payload columns after parity.
- [ ] Replace admin content viewer with a backend route that reads RAG metadata or Storage.
- [ ] Add health check that fails if a new large app DB `document_metadata.content` row is written after cutover.

## Acceptance Criteria

- [ ] App DB can answer catalog/UI metadata queries without reading full source text.
- [ ] RAG DB owns all full transcripts, email bodies, Teams message content, OneDrive extracted text, summary embeddings, chunks, and ingestion job state.
- [ ] AI assistant retrieval still cites app DB catalog metadata but gets excerpts/chunks from the RAG DB.
- [ ] Fireflies does not need to be re-synced to repair transcript content; storage-backed rebuilds are sufficient.
- [ ] Health checks separately report:
  - [ ] app DB catalog availability
  - [ ] RAG DB metadata availability
  - [ ] RAG DB chunk/vector availability
  - [ ] storage source availability
- [ ] Cron jobs are bounded and cannot scan or embed more than their configured limits.

## Immediate Next Slice

Do Fireflies metadata split before emails/Teams:

1. Add `rag_document_metadata` to the RAG DB.
2. Extend `scripts/backfill-fireflies-transcript-chunks-from-storage.mjs` to upsert full storage markdown into `rag_document_metadata.content`.
3. Verify the RAG metadata count and `## Transcript` coverage for 2026 Fireflies meetings.
4. Only after parity, stop relying on app DB `document_metadata.content` for Fireflies.
