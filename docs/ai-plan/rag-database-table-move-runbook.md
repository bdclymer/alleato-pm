# RAG Database Table Move Runbook

Date: 2026-05-13

## Purpose

Copy the first high-risk RAG tables from the production app Supabase database into the new AI/RAG Supabase project without interrupting app workflows.

This is a copy-and-cutover process, not an in-place move. The source app database stays intact until parity checks pass and the application has been switched to read/write RAG data from the new database.

## First Slice

Move these first:

- `public.document_chunks`
- `public.fireflies_ingestion_jobs`
- RAG-only `public.document_metadata` fields, preferably into a new AI/RAG-side table instead of blindly moving the whole app-facing table
- vector search RPCs used by AI retrieval

Do not move operational tables in this slice:

- `projects`
- budgets/contracts/commitments/change orders/invoices
- directory/permissions
- `project_documents`
- `emails`
- `email_attachments`

## Required Safety Rules

- Do not run destructive commands against the source database.
- Do not drop app DB tables during initial migration.
- Do not use `--clean` or `--if-exists` against the source database.
- Do not paste production database URLs into committed files.
- Use env vars for database URLs.
- Add `sslmode=require` to Supabase direct Postgres URLs when using `pg_dump`, `pg_restore`, or `psql`.
- Rotate any database password that was pasted into chat or logs after the move is complete.

## Environment Variables

Set these in the shell only. Do not commit them.

```bash
export APP_DB_URL='postgresql://postgres:<app-db-password>@db.<app-project-ref>.supabase.co:5432/postgres?sslmode=require'
export RAG_DB_URL='postgresql://postgres:<rag-db-password>@db.<rag-project-ref>.supabase.co:5432/postgres?sslmode=require'
```

## Phase 1: Prepare The Target AI/RAG Database

Enable required extensions on the target project:

```bash
psql "$RAG_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;
SQL
```

Confirm `halfvec` is available:

```bash
psql "$RAG_DB_URL" -v ON_ERROR_STOP=1 -c "select 'extensions.halfvec'::regtype;"
```

## Phase 2: Dump The First Tables From The App DB

Use a custom-format dump so large vector data does not become a huge plain SQL file.

The guarded helper for this first slice is:

```bash
APP_DB_URL="$APP_DB_URL" \
RAG_DB_URL="$RAG_DB_URL" \
scripts/database/move-rag-first-slice.sh
```

For a dump-only rehearsal:

```bash
APP_DB_URL="$APP_DB_URL" \
RAG_DB_URL="$RAG_DB_URL" \
SKIP_RESTORE=1 \
scripts/database/move-rag-first-slice.sh
```

Manual commands are below for review or one-off recovery.

```bash
mkdir -p /tmp/alleato-rag-db-move

pg_dump "$APP_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --table=public.document_chunks \
  --table=public.fireflies_ingestion_jobs \
  --file=/tmp/alleato-rag-db-move/rag-first-slice.dump
```

Create a schema-only preview for review:

```bash
pg_restore \
  --schema-only \
  --file=/tmp/alleato-rag-db-move/rag-first-slice.schema.sql \
  /tmp/alleato-rag-db-move/rag-first-slice.dump
```

Review the schema before restoring:

```bash
sed -n '1,240p' /tmp/alleato-rag-db-move/rag-first-slice.schema.sql
```

## Phase 3: Restore Into The AI/RAG DB

For the initial restore into a new empty target project:

```bash
pg_restore "$RAG_DB_URL" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  /tmp/alleato-rag-db-move/rag-first-slice.dump
```

If the target tables already exist and must be reloaded, do not use a broad destructive restore. Truncate only the target RAG tables after confirming no app traffic depends on them:

```bash
psql "$RAG_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
truncate table public.document_chunks restart identity cascade;
truncate table public.fireflies_ingestion_jobs restart identity cascade;
SQL

pg_restore "$RAG_DB_URL" \
  --data-only \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  /tmp/alleato-rag-db-move/rag-first-slice.dump
```

## Phase 4: Copy RAG Metadata Without Moving The Whole App Table

Do not blindly move all of `document_metadata` first. Create a RAG-side processing table that keeps the heavy/search/processing fields separate from the app-facing document index.

Exact columns must be confirmed against the live schema, but the target shape should follow this contract:

```sql
create table if not exists public.rag_document_metadata (
  id text primary key,
  app_document_id text,
  project_id integer,
  source text,
  source_system text,
  source_item_id text,
  title text,
  file_name text,
  source_web_url text,
  storage_bucket text,
  storage_path text,
  content_hash text,
  parsing_status text,
  embedding_status text,
  summary text,
  summary_embedding extensions.halfvec(3072),
  source_metadata jsonb not null default '{}'::jsonb,
  processing_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_indexed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
```

Then copy from the app DB with a bounded script or `postgres_fdw`. Prefer a script for the first pass because the source and target schemas should intentionally diverge.

Validation query for candidate columns:

```bash
psql "$APP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'document_metadata'
order by ordinal_position;
SQL
```

## Phase 5: Restore Vector Search RPCs

Dump only the needed function definitions from source, then review before applying.

```bash
pg_dump "$APP_DB_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file=/tmp/alleato-rag-db-move/source-schema.sql
```

Extract and review functions used by retrieval:

```bash
rg -n "CREATE (OR REPLACE )?FUNCTION public\\.(search_document_chunks|match_document_metadata_by_summary|search_all_knowledge|search_knowledge_base|full_text_search_meetings)" /tmp/alleato-rag-db-move/source-schema.sql
```

Apply only reviewed function SQL to the AI/RAG DB. Do not blindly restore the entire app schema.

## Phase 6: Parity Checks

Run counts on both databases:

```bash
psql "$APP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select 'document_chunks' as table_name, count(*) from public.document_chunks
union all
select 'fireflies_ingestion_jobs', count(*) from public.fireflies_ingestion_jobs;
SQL

psql "$RAG_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select 'document_chunks' as table_name, count(*) from public.document_chunks
union all
select 'fireflies_ingestion_jobs', count(*) from public.fireflies_ingestion_jobs;
SQL
```

Check embedding coverage:

```bash
psql "$RAG_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select
  count(*) as total_chunks,
  count(*) filter (where embedding is not null) as embedded_chunks,
  count(*) filter (where embedding is null) as missing_embeddings
from public.document_chunks;
SQL
```

Check source/job stage distribution:

```bash
psql "$RAG_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select stage, count(*)
from public.fireflies_ingestion_jobs
group by stage
order by count(*) desc;
SQL
```

Check project/source distribution:

```bash
psql "$RAG_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select source_type, count(*)
from public.document_chunks
group by source_type
order by count(*) desc;
SQL
```

Run the repo guardrails that catch silent RAG corruption:

```bash
npm run rag:verify:chunk-integrity -- --days=1
npm run rag:verify:repaired-meeting-retrieval
```

Expected result:

- `rag:verify:chunk-integrity` returns `RAG chunk integrity: PASS`.
- `rag:verify:repaired-meeting-retrieval` returns `Repaired meeting transcript retrieval: PASS`.
- Any `showing 50 of N sentences` marker in `document_chunks` is a hard failure.
- Missing embeddings are a hard failure.
- Legacy non-sequential chunk indexes are reported as warnings unless running with `--strict-indexes=true`.

## Phase 7: Application Cutover

Add explicit database configuration:

```text
APP_DATABASE_URL=current production app database
RAG_DATABASE_URL=new AI/RAG database
RAG_SUPABASE_URL=new AI/RAG Supabase API URL
RAG_SUPABASE_SERVICE_ROLE_KEY=new AI/RAG Supabase service-role key
```

Then update code ownership:

- ingestion writers use `RAG_DATABASE_URL` for chunks, embeddings, and job queues
- source health writes compact summaries to the app DB
- AI retrieval reads vector candidates from the AI/RAG DB
- AI retrieval hydrates authoritative project permissions and business records from the app DB

Do this behind a feature flag:

```text
RAG_DATABASE_READS_ENABLED=false
RAG_DATABASE_WRITES_ENABLED=false
RAG_DATABASE_DUAL_WRITE_ENABLED=true
```

Backend ingestion writes use `RAG_DATABASE_WRITES_ENABLED`. Keep it `false`
until `RAG_SUPABASE_URL` and `RAG_SUPABASE_SERVICE_ROLE_KEY` are configured in
Render; when the flag is `true`, missing RAG Supabase credentials are a hard
configuration failure rather than a silent fallback to the app database.

RAG retrieval reads use `RAG_DATABASE_READS_ENABLED`. Before enabling it, install
the RAG-side chunk search RPC:

```bash
psql "$RAG_DB_URL" -v ON_ERROR_STOP=1 \
  -f scripts/database/rag/install-search-document-chunks-rpc.sql
```

This RPC intentionally uses `document_chunks.metadata` for document fields
because the isolated RAG database does not own the full app-facing
`document_metadata` table.

Recommended switch order:

1. Enable dual writes.
2. Compare row counts and recent job/chunk parity.
3. Enable RAG reads for admin-only or staging traffic.
4. Enable RAG reads for production AI assistant.
5. Disable old app DB writes for RAG chunks/jobs.
6. Keep old app DB tables read-only for a rollback window.
7. Archive or drop old app DB RAG tables only after the rollback window closes.

## Rollback

Rollback should be a feature-flag change, not a database restore.

If RAG DB reads fail:

```text
RAG_DATABASE_READS_ENABLED=false
```

If RAG DB writes fail:

```text
RAG_DATABASE_WRITES_ENABLED=false
RAG_DATABASE_DUAL_WRITE_ENABLED=false
```

The app DB tables remain intact until the final retirement phase, so rollback returns reads/writes to the current path.

## Done Criteria

- Target AI/RAG DB has required extensions.
- `document_chunks` count matches source.
- `fireflies_ingestion_jobs` count matches source.
- Embedding coverage matches source.
- Source/job stage distribution matches source.
- `npm run rag:verify:chunk-integrity -- --days=1` passes.
- `npm run rag:verify:repaired-meeting-retrieval` passes.
- Vector search RPCs exist and return expected results.
- App DB health page reads compact summaries, not raw chunk/job queues.
- AI assistant can retrieve from RAG DB and hydrate app DB records.
- Operational app pages work when RAG DB access is disabled.
- Pasted or exposed database credentials have been rotated.
