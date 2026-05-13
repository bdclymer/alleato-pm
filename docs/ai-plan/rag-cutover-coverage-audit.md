# RAG Database Cutover Coverage Audit

Date: 2026-05-13

## Current State

The first isolated RAG slice is live on the new Supabase project for:

- `public.document_chunks`
- `public.fireflies_ingestion_jobs`
- `public.search_document_chunks`

Backend ingestion writes can be routed with:

- `RAG_SUPABASE_URL`
- `RAG_SUPABASE_SERVICE_ROLE_KEY`
- `RAG_DATABASE_WRITES_ENABLED=true`

Frontend/server-side assistant reads can be routed with:

- `RAG_SUPABASE_URL`
- `RAG_SUPABASE_SERVICE_ROLE_KEY`
- `RAG_DATABASE_READS_ENABLED=true`

## Covered

- Fireflies pipeline job writes route through `get_rag_write_client()` when writes are enabled.
- Microsoft Graph chunk writes route through `get_rag_write_client()` when writes are enabled.
- Backend pipeline backlog reads use the RAG client for `fireflies_ingestion_jobs` when writes are enabled, then join operational metadata from the app DB.
- AI assistant broad `semanticSearch` uses the RAG client for `search_document_chunks` when reads are enabled.
- AI assistant document intelligence spec lookups use the RAG client for `search_document_chunks` when reads are enabled.
- AI assistant email, Teams, and external document helper searches use the RAG client for chunk vector search when reads are enabled.
- Executive daily brief chunk retrieval uses the RAG client for `search_document_chunks` when reads are enabled.
- Operations readiness fallback health reads chunk presence from the RAG client when reads are enabled.
- Source RAG health reads chunk rows and Fireflies jobs from the RAG client when reads are enabled.
- Render backend and suspended sync/health cron YAMLs now declare the RAG env vars required before reactivation.

## Still App DB By Design

These remain on the app database because they are operational data, permissions, or app-owned knowledge rather than the high-churn chunk/job store:

- `document_metadata`
- `project_documents`
- `projects`, `project_members`, `users`, directory and financial tables
- AI session/message history
- assistant guardrails and project permission checks
- `search_all_knowledge`, insights, memory, and company knowledge tables

## Known Remaining Gaps

- `backend/src/services/health/rag_meeting_health.py` still performs SQL that joins `document_metadata` to `document_chunks` and `fireflies_ingestion_jobs` inside one database. It needs a split health implementation before `alleato-rag-health` is re-enabled.
- `backend/render.yaml` is not a full mirror of the root Render blueprint. The root `render.yaml` includes executive brief cron definitions; `backend/render.yaml` does not.
- Older one-off verification and backfill scripts still point at the app database unless they are explicitly passed or patched for the RAG env. Treat those scripts as not cut over until audited individually.
- Vercel must have the same RAG read env vars as local for production AI assistant chat. Render env changes do not configure the Vercel frontend.
- RAG-side `search_document_chunks` derives permissions from chunk metadata. Rows without `metadata.project_id` can be returned for admins but are filtered out for non-admin project-scoped users.

## Completion Checklist

Use this as the closeout list for the RAG database isolation work. Do not treat the cutover as fully complete until every open item is checked or explicitly deferred with an owner.

### Done

- [x] Move the first high-churn RAG tables to the isolated Supabase project: `document_chunks` and `fireflies_ingestion_jobs`.
- [x] Install the RAG-side `search_document_chunks` RPC.
- [x] Route backend Fireflies and Microsoft Graph chunk/job writes through the RAG database when `RAG_DATABASE_WRITES_ENABLED=true`.
- [x] Route AI assistant broad semantic chunk search through the RAG database when `RAG_DATABASE_READS_ENABLED=true`.
- [x] Route AI assistant document/spec, email, Teams, and external document helper searches through the RAG database.
- [x] Route executive daily brief chunk retrieval through the RAG database.
- [x] Route source-sync fallback health chunk/job reads through the RAG database where already split-safe.
- [x] Add RAG env declarations to repo Render blueprints for backend and RAG-related cron services.
- [x] Add RAG env vars to live Render services through the Render API.
- [x] Trigger a live Render backend deploy for commit `aa9b0fc72` so the backend can load the new RAG env vars.

### Must Finish Before Calling This Complete

- [ ] Confirm the Render backend deploy for commit `aa9b0fc72` reaches `live`.
- [ ] Add the production Vercel env vars: `RAG_SUPABASE_URL`, `RAG_SUPABASE_SERVICE_ROLE_KEY`, and `RAG_DATABASE_READS_ENABLED=true`.
- [ ] Redeploy the Vercel frontend after those env vars are set.
- [ ] Run production assistant smoke prompts that prove RAG reads are coming from the new database:
  - [ ] broad semantic search
  - [ ] Teams search
  - [ ] email search
  - [ ] OneDrive/spec document search
  - [ ] project-filtered search
- [ ] Rewrite `backend/src/services/health/rag_meeting_health.py` so it does not join app DB `document_metadata` to RAG DB chunk/job tables inside one SQL query.
- [ ] Verify `alleato-rag-health` against the split implementation before re-enabling that cron.
- [ ] Audit and either patch or label the one-off RAG scripts that still default to the app database:
  - [ ] `scripts/test-rag-terminal.mjs`
  - [ ] `scripts/verify/verify_rag_pm_briefing_quality.mjs`
  - [ ] `scripts/backfill-recent-meeting-chunks.mjs`
  - [ ] `scripts/ingestion/import_sharepoint_rfis_from_documents.mjs`
- [ ] Run a final source/job parity check between app DB and RAG DB before removing old app-DB chunk/job dependencies.
- [ ] Rotate the RAG database password that was pasted into chat, then update local, Render, and Vercel env vars.

### Keep Suspended Until These Pass

- [ ] Keep `alleato-graph-sync` suspended until backend deploy is live and RAG write smoke passes.
- [ ] Keep `alleato-teams-channel-sync` suspended until backend deploy is live and RAG write smoke passes.
- [ ] Keep `alleato-teams-dm-sync` suspended until backend deploy is live and RAG write smoke passes.
- [ ] Keep `alleato-rag-health` suspended until `rag_meeting_health.py` is split-safe.
- [ ] Keep `alleato-source-rag-health` suspended until the health output is validated against the new RAG database.
- [ ] Keep executive daily brief crons suspended until Vercel/frontend RAG reads and the Render backend deploy are confirmed.

### Acceptance Criteria

- [ ] Render live env verification shows all RAG-relevant services have the required RAG keys and flags.
- [ ] Vercel production env verification shows AI assistant read keys and `RAG_DATABASE_READS_ENABLED=true`.
- [ ] Production AI assistant answer citations include Teams/email/document chunks returned through the RAG database.
- [ ] Source health checks fail loudly if the RAG database is missing or unreachable.
- [ ] App DB health stays stable during a controlled single-run reactivation of one write-producing cron.

## Reactivation Checklist

Before re-enabling any suspended Render cron that touches RAG data:

1. Confirm the service has `RAG_SUPABASE_URL` and `RAG_SUPABASE_SERVICE_ROLE_KEY` set in Render.
2. Confirm write-producing jobs have `RAG_DATABASE_WRITES_ENABLED=true`.
3. Confirm health/read jobs have `RAG_DATABASE_READS_ENABLED=true`.
4. Run a dry-run or single low-volume execution first.
5. Verify app DB health stays stable while RAG DB chunk/job counts increase or health checks read from the RAG DB.

Before calling AI assistant chat fully cut over in production:

1. Set Vercel env vars for `RAG_SUPABASE_URL`, `RAG_SUPABASE_SERVICE_ROLE_KEY`, and `RAG_DATABASE_READS_ENABLED=true`.
2. Redeploy the frontend.
3. Run assistant smoke prompts covering broad semantic search, Teams, email, OneDrive/spec document search, and project-filtered search.
