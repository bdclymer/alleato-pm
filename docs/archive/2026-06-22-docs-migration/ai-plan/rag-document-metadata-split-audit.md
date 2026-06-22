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

## 2026-05-14 Routing And Copy Update

The urgent moved tables have now been rerouted and re-copied:

- `rag_document_metadata`: `36,657 / 36,657` app rows copied and independently count-verified.
- `document_attribution_candidates`: `13,204 / 13,204`, count-verified.
- `fireflies_ingestion_jobs`: `27,241 / 27,241`, count-verified.
- `ingestion_dead_letter`: `17 / 17`, count-verified.
- `ingestion_jobs`: `436 / 436`, count-verified.
- `packet_refresh_jobs`: `1,540 / 1,540`, count-verified.
- `rag_pipeline_state`: `1 / 1`, count-verified.
- `source_intelligence_jobs`: `11,087 / 11,087`, count-verified.
- `source_signal_candidates`: `7,538 / 7,538`, count-verified.
- `source_sync_health_snapshots`: `330 / 330`, count-verified.
- `source_sync_runs`: `3,670 / 3,670`, count-verified.
- `document_chunks`: RAG DB has `106,827`; app DB has `103,955`. RAG is canonical for chunks.

Routing patched in this pass:

- Backend source sync health writes and reads moved to RAG clients.
- Backend intelligence compiler job/candidate/packet queues moved to RAG clients.
- Email and Teams compiler candidate cleanup/writes moved to RAG clients.
- `SupabaseRagStore` ingestion job writes moved to the RAG client.
- Fireflies scheduler/admin job status paths moved to RAG clients where they touch `fireflies_ingestion_jobs` or `source_sync_runs`.
- Frontend operations readiness, AI system health, project attribution review, source sync summary, and attribution promotion paths moved to RAG clients for moved tables.

Verification:

- Python compile passed for touched backend files.
- `cd frontend && npm run typecheck -- --pretty false` passed.
- Grep review found no confirmed app-client routing miss for the moved job/candidate/health tables in the checked production paths.

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

- [x] Add RAG DB migration for `public.rag_document_metadata`.
  - Script: `scripts/database/rag/20260514183000_create_rag_document_metadata.sql`
  - Applied to the RAG DB on 2026-05-14.
- [x] Add RAG-side indexes for source/project/date, embedding status, storage path, content hash, and summary embedding.
- [ ] Add backend repository helpers:
  - [x] `get_rag_read_client()`
  - [x] `get_rag_write_client()`
  - [x] `upsert_app_document_catalog(row)`
  - [x] `upsert_rag_document_metadata(row)`
  - [x] `fetch_rag_document_content(document_id)`
  - [ ] `fetch_source_catalog(document_ids)`
- [ ] Make the helpers fail loudly when RAG env vars are missing while RAG split flags are enabled.

### Phase 2: Fireflies First

- [x] Modify Fireflies ingestion so full transcript markdown goes to RAG DB metadata.
  - `SupabaseRagStore.upsert_document_metadata()` now splits large payload fields into `rag_document_metadata` and keeps app `document_metadata` as catalog/status.
- [ ] Keep app DB `document_metadata.content` as a compact preview or null after parity passes.
- [x] Backfill 2026 Fireflies RAG metadata from Supabase Storage without calling Fireflies.
  - Script now supports `--skip-app-content-update=true` so RAG metadata can be populated without rewriting large app DB `content`.
  - Executed on 2026-05-14 with:
    `npm run rag:backfill:fireflies-transcript-chunks -- --year=2026 --content-only=true --skip-app-content-update=true --limit=10000 --scan-limit=10000`
  - Result: processed `450`, skipped `150`, failed `0`; skipped rows were missing storage URL/file path during the selected repair pass.
- [ ] Verify every repairable Fireflies row has:
  - [ ] app DB skinny catalog row
  - [x] RAG DB full `content` / `raw_text` loaded for repaired rows.
    - Verification: `rag_document_metadata` rows = `450`; `raw_text` rows = `450`; transcript raw text length range = `35` to `236984`, average = `19467`.
  - [x] RAG DB embedded `meeting_transcript` chunks exist for indexed meetings.
    - Verification: `1250` Fireflies-like documents have embedded `meeting_transcript` chunks, `18987` embedded transcript chunks total.
  - [ ] app DB compact `rag_status` / `last_indexed_at`
- [ ] Add `rag-stats` row for app catalog vs RAG metadata vs chunks.

### 2026-05-14 Incident Verification

- [x] Suspended high-risk Render cron jobs during the app DB incident:
  `alleato-source-rag-health`, `alleato-graph-sync`,
  `alleato-teams-dm-sync`, `alleato-teams-channel-sync`,
  `alleato-source-sync-health`, `alleato-executive-daily-brief-evening`,
  `alleato-executive-daily-brief-morning`, `alleato-rag-health`, and
  `alleato-task-extraction`.
- [x] Verified `npm run verify:live-db-incident` passes after suspension:
  app DB, pooler, and REST are `ACTIVE_HEALTHY`; all listed Render crons are
  `suspended`; backend scheduler flags remain disabled.
- [x] Stopped local AI eval processes that were hitting the app DB during the incident.
- [x] Do not resume Render crons until Fireflies consumers no longer require
  app DB full-text `document_metadata.content` and Graph/email/Teams content
  writers use RAG metadata for full payloads.
  - Fireflies/parser/embedder/extractor/financial parser now hydrate/write full text through RAG metadata.
  - Graph Outlook/Teams/OneDrive ingestion writes new full body/content payloads through the split helper.
  - Remaining cron resume gate is runtime smoke plus batch-limit verification, not known app-DB full-text routing.

### 2026-05-14 AI / Source Table Migration

- [x] Created missing AI/source tables in the RAG DB.
  - Script: `scripts/database/rag/20260514193000_create_missing_ai_source_tables.sql`
- [x] Copied current app DB rows into the RAG DB with a repeatable bounded copy script.
  - Script: `scripts/database/rag/copy-ai-source-tables-to-rag.mjs`
- [x] Verified row parity after copy:

| Table | App DB Rows | RAG DB Rows |
|---|---:|---:|
| `document_attribution_candidates` | 13204 | 13204 |
| `fireflies_ingestion_jobs` | 27241 | 27241 |
| `ingestion_dead_letter` | 17 | 17 |
| `ingestion_jobs` | 436 | 436 |
| `packet_refresh_jobs` | 1540 | 1540 |
| `rag_pipeline_state` | 1 | 1 |
| `source_intelligence_jobs` | 11087 | 11087 |
| `source_signal_candidates` | 7538 | 7538 |
| `source_sync_health_snapshots` | 330 | 330 |
| `source_sync_runs` | 3670 | 3670 |

- [x] Update backend writers/readers so these tables use the RAG DB clients
  before Render crons are resumed.
- [x] Update checked frontend/admin/assistant health readers so these tables use
  the RAG DB clients when `RAG_DATABASE_READS_ENABLED=true`.

### Phase 3: Microsoft Graph Content

- [x] Update Outlook ingestion to write full email body/thread text to RAG metadata.
- [x] Update Teams ingestion to write full message/conversation text to RAG metadata.
- [x] Update OneDrive ingestion to write extracted text to RAG metadata and Storage.
- [x] Update Graph embedding candidate selection so it reads candidate IDs from app DB but payload/content from RAG metadata.
- [ ] Verify emails, Teams, OneDrive each show source counts for synced, RAG metadata present, chunked, embedded.

### Phase 4: Consumers And Fallbacks

- [x] Update `daily_digest.py`, `task_extraction.py`, `compiler.py`, `email_compiler.py`, and `teams_compiler.py` to hydrate content from RAG metadata/Storage.
  - Pipeline parser/embedder/extractor hydration is done.
  - Daily digest, task extraction, packet compiler, Outlook email compiler, and Teams compiler now read full content from RAG metadata.
- [ ] Update executive brief fallback logic so it does not select `content/raw_text` from app DB.
- [ ] Move `match_document_metadata_by_summary` or replacement summary search to the RAG DB.
- [x] Keep app DB metadata hydration to titles, dates, source URLs, and project IDs only in checked AI/RAG paths.
  - Broad `document_metadata.select("*")` reads were removed from the checked pipeline/helper paths.

### Phase 5: App DB De-Load

- [x] Stop new writes to app DB `document_metadata.content`, `raw_text`, and `summary_embedding` in checked Fireflies, pipeline, Outlook, Teams, and OneDrive ingestion paths.
- [ ] Add a migration or maintenance job to null or compact old app DB payload columns after parity.
- [ ] Replace admin content viewer with a backend route that reads RAG metadata or Storage.
- [x] Add health check that fails if app DB `document_metadata` broad/heavy reads return in AI/RAG paths.
  - Command: `npm run rag:verify:metadata-boundary`
- [ ] Add live data health check that fails if a new large app DB `document_metadata.content` row is written after cutover.

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

## 2026-05-14 Full-Content Boundary Verification

- Python compile passed for the touched backend RAG split files.
- `cd frontend && npm run typecheck -- --pretty false` passed.
- `npm run rag:verify:metadata-boundary` passed.
- The metadata-boundary guardrail checks the AI/RAG backend and frontend paths for forbidden app DB `document_metadata.select("*")` reads and app DB metadata selects of `content`, `raw_text`, or `summary_embedding`.
- [x] Cron jobs are bounded and cannot scan or embed more than their configured limits.
  - Graph delta fetches now cap pages/items by default.
  - Render `alleato-graph-sync`, `alleato-teams-channel-sync`, and `alleato-teams-dm-sync` have live cap env vars set through the Render API.
  - `node -r dotenv/config scripts/verify/verify-render-web-scheduler-disabled.mjs` passed.
  - `npm run verify:live-db-incident` passed after the live Render env update; app DB, pooler, and REST are healthy and high-risk crons remain suspended.

## Immediate Next Slice

Deploy the code-level Graph delta caps, then resume Render crons in this order:

1. `alleato-source-sync-health`
2. `alleato-rag-health`
3. `alleato-source-rag-health`
4. `alleato-teams-dm-sync`
5. `alleato-teams-channel-sync`
6. `alleato-graph-sync`

After each resume, run the live DB incident verifier and inspect the cron output before enabling the next one.
