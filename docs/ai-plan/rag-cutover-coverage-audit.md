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
