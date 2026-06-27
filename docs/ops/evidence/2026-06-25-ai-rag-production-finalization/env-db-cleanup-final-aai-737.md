# AAI-737 Env And Orphan Database Cleanup Final Proof

Date: 2026-06-27

This evidence file closes the Phase 12 cleanup gate for unused AI/RAG/pipeline
environment variables and orphaned database code. Candidates are removable only
after source, route/service, provider, and database evidence prove they are
inactive or fully replaced.

## Method

- Secret values must never be printed.
- Provider checks record key presence/status only.
- Source scans exclude `.env*` values except for key-name inventory when needed.
- Empty tables are not deletion candidates by default; ownership, migrations,
  and product workflow references decide.

## Env Candidate Classifications

### Deleted From Providers

Vercel stale/deprecated key names removed from the project environment:

- `EMBEDDING_API_KEY`
- `EMBEDDING_BASE_URL`
- `EMBEDDING_MODEL_CHOICE`
- `EMBEDDING_PROVIDER`
- `LLM_API_KEY`
- `OPENAI_VECTOR_STORE_ID`
- `RAG_PIPELINE_TYPE`
- `KNOWLEDGE_CHATKIT_API_DOMAIN_KEY`
- `NEXT_PUBLIC_CHATKIT_DOMAIN_KEY`
- `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID`
- `NEXT_PUBLIC_ENABLE_AI_QUERIES`
- `NEXT_PUBLIC_ENABLE_STREAMING`
- `NEXT_PUBLIC_LANGFUSE_HOST_WITH_PROJECT`

Render stale/deprecated key names removed from cron/service environments:

- `EMBEDDING_BASE_URL`
- `EMBEDDING_MODEL_CHOICE`
- `EMBEDDING_PROVIDER`
- `NEXT_PUBLIC_ENABLE_AI_QUERIES`
- `NEXT_PUBLIC_ENABLE_STREAMING`
- `RAG_PIPELINE_TYPE`

Provider removal used key-name-only readback. Secret values were not printed.

### Retained

- `AI_GATEWAY_API_KEY`, `OPENAI_API_KEY`, and current AI provider keys remain active provider paths.
- `RAG_SUPABASE_URL`, `RAG_SUPABASE_SERVICE_ROLE_KEY`, and RAG database read/write gates remain active RAG storage paths.
- Langfuse keys remain active observability paths.
- `GRAPH_API_INGESTION_ENABLED` remains a fail-closed production pressure guard for write-heavy Graph ingestion.
- `SUPABASE_DOCUMENTS_BUCKET` remains active because Outlook attachment intake references it.
- `SUPABASE_MEETINGS_BUCKET` remains active because Fireflies transcript chunk backfill reads it.

### Removed From Docs

Removed stale Outlook legacy env rows from `docs/reference/ENV-VARS.md`:

- `OUTLOOK_SYNC_LEGACY_ATTACHMENTS`
- `OUTLOOK_SYNC_LEGACY_LINKS`
- `OUTLOOK_MAX_LINKS_PER_EMAIL`

## Database Candidate Classifications

### Dropped

Migration:

- `supabase/migrations/20260627120000_drop_dead_ai_document_tables.sql`

Dropped MAIN tables after source, generated inventory, and dependency proof:

- `messages`
- `chats`
- `search_documents`
- `ai_analysis_jobs`
- `ai_models`
- `document_executive_summaries`
- `documents_rfis_links`
- `documents_submittals_links`

Readback after applying the migration showed all eight tables missing from the
MAIN database and the migration ledger recorded version `20260627120000`.

### Retained / Blocked

- `document_insights` retained and marked `blocked` in `docs/architecture/tables.yaml` because the `actionable_insights` view depends on it.
- `notes` retained for a separate proof slice because source references still exist.
- `ai_retrieval_weights`, `ai_task_feedback`, and `ai_review_feedback` retained because AI feedback/training paths reference them.
- `workspace_artifacts` retained because artifact service and RAG sync paths reference it.
- MAIN `ingestion_jobs` / `ingestion_dead_letter` mirrors retained for a separate MAIN-only decision.
- `document_user_access` and `document_group_access` retained because the target architecture still includes RLS-backed document access.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Provider stale env guard | PASS | `npm run verify:deprecated-provider-env` returned no deprecated provider env key names. |
| Source/env static scan | PASS | `rg` over runtime/docs for deleted env names returned no matches outside the new guardrail inventory. |
| Migration ledger | PASS | `npm run db:migrations:verify-applied -- supabase/migrations/20260627120000_drop_dead_ai_document_tables.sql` passed for version `20260627120000`. |
| DB inventory regeneration | PASS | `npm run db:inventory` regenerated `docs/architecture/TABLE-LIST.md` and dev-tools inventory with 452 tables. |
| DB inventory check-only | PASS | `npm run db:inventory -- --check-only` passed schema drift check. |
| Supabase types | PASS | `npm run db:types` regenerated `frontend/src/types/database.types.ts` via postgres-meta fallback. |
| Removed-table static scan | PASS | Dropped table names are absent from generated types/inventory and `tables.yaml`; only the drop migration contains them. |
| Changed-file typecheck | PASS | Delegated to subagents `019f08f9-5d5d-7dd3-8148-1d70d09d9a8d` and `019f08fa-5504-7960-9e88-43a5d0df1aac`; both reported `npm run typecheck:changed` PASS. |
