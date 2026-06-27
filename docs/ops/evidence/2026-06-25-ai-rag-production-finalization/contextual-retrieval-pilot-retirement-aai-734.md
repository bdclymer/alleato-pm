# AAI-734 Contextual Retrieval Pilot Retirement Proof

Date: 2026-06-27

This evidence file is the deletion gate for the remaining AAI-703
`migrate-first` candidate: `backend/src/scripts/backfill_contextual_embeddings.py`.

## Decision

Retire the contextual retrieval pilot instead of migrating it into production.

Reason: the final AI/RAG architecture must not retain dormant feature-flagged or
manual-only alternate retrieval paths. The implemented contextual path is not
automatic, is not scheduled, is not used by the live frontend RAG tools, and is
not enabled on checked Render backend/cron services.

## Proof Matrix

| Area | Evidence | Decision |
| --- | --- | --- |
| Import/caller proof | No direct callers found in backend, frontend, scripts, docs, package scripts, or Render manifest. The script only imports pipeline helpers and `batch_embed`. | Safe to delete script if pilot is retired. |
| Route/API proof | No `contextual-backfill` route exists under backend or frontend source. | Remove stale architecture route claim. |
| Provider proof | Secret-safe Render API read-back checked Alleato backend/cron services; none set `RAG_EMBEDDING_VARIANT` or `CONTEXTUAL_RETRIEVAL_MODEL`. `render.yaml` has no contextual backfill job. | Not production-enabled. |
| Package proof | Root `package.json` has no contextual embedding script. | Not a maintained local workflow. |
| Database-write proof | The script writes only `document_chunks.chunk_context`, `embedding_contextual`, and `contextualized_at`; reset mode nulls the same fields. | Remove unused pilot DB artifacts through RAG migration. |
| Retrieval proof | Frontend RAG paths call `search_document_chunks`. Backend agent helper defaults to `baseline`; current callers do not pass `variant`. | Remove contextual variant selection so retrieval has one production RPC. |
| Docs proof | `AI-RAG-ARCHITECTURE.md` claimed old `contextual_prefix` / `is_contextualized` columns and a nonexistent `POST /admin/documents/contextual-backfill` endpoint. | Replace with retired-pilot status. |

## Retired Items

- `backend/src/scripts/backfill_contextual_embeddings.py`
- `backend/src/services/pipeline/contextualize.py`
- Backend agent `RAG_EMBEDDING_VARIANT=contextual` selection path.
- RAG DB pilot artifacts:
  - `document_chunks.chunk_context`
  - `document_chunks.embedding_contextual`
  - `document_chunks.contextualized_at`
  - `document_chunks_embedding_contextual_hnsw`
  - `search_document_chunks_contextual`

## Replacement Owner

Production retrieval remains the finalized baseline/hybrid RAG path:

- `search_document_chunks` is the single semantic retrieval RPC.
- `frontend/src/lib/ai/tools/operational.ts` owns frontend semantic search.
- `frontend/src/lib/ai/retrieval/source-specific-rag.ts` owns source-specific RAG.
- `backend/src/services/agents/alleato_ai_tools/rag.py` owns backend agent RAG access through `search_document_chunks`.

## Commands And Evidence Log

- Subagent code proof: `019f08dd-1239-74d2-bf7e-3777add9acce`
  - Found no direct callers.
  - Found no package or Render route.
  - Confirmed baseline is the backend default and live callers do not pass `variant`.
- Subagent docs/provider proof: `019f08dd-2da7-7ea1-ae9b-215050080163`
  - Found no Render/package/backend docs owner.
  - Found stale `AI-RAG-ARCHITECTURE.md` contextual-backfill claims.
- Secret-safe Render API scan:
  - Checked 11 Alleato backend/cron services.
  - Found no `RAG_EMBEDDING_VARIANT`.
  - Found no `CONTEXTUAL_RETRIEVAL_MODEL`.

## Verification

- `backend/.venv/bin/python -m py_compile backend/src/services/agents/alleato_ai_tools/rag.py backend/src/services/supabase_helpers.py`
  - Passed.
- `node --check scripts/verify/verify_rag_client_boundary.mjs`
  - Passed.
- Delegated changed-file typecheck:
  - Agent: `019f08e0-dab8-7610-8d3d-b512222cecbf`
  - Command: `cd frontend && npm run typecheck:changed`
  - Result: passed with no new `any` debt.
- RAG migration dry run:
  - `psql "$RAG_DATABASE_URL" -v ON_ERROR_STOP=1 -c "begin" -f scripts/database/rag/migrations/20260627114000_retire_contextual_retrieval_pilot.sql -c "rollback"`
  - Passed.
- RAG migration apply:
  - `psql "$RAG_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/database/rag/migrations/20260627114000_retire_contextual_retrieval_pilot.sql`
  - Passed.
- RAG migration ledger/read-back:
  - `supabase_migrations.schema_migrations` contains `20260627114000|retire_contextual_retrieval_pilot`.
  - Retired `document_chunks` pilot columns count: `0`.
  - Retired `search_document_chunks_contextual` function count: `0`.
  - Retired `document_chunks_embedding_contextual_hnsw` index count: `0`.
- `npm run db:inventory`
  - Passed and regenerated generated inventory artifacts after the RAG schema cleanup.
- `npm run db:inventory -- --check-only`
  - Passed schema drift check.
- `rg -n "search_document_chunks_contextual|embedding_contextual|chunk_context|contextualized_at" frontend/src/components/dev-tools/db-inventory.generated.json frontend/src/components/dev-tools/db-inventory.generated.ts docs/architecture/TABLE-LIST.md frontend/src/types/rag-database.types.ts`
  - Passed with no matches.
- `npm run rag:verify:client-boundary`
  - Passed.
- `npm run rag:verify:retrieval-contract`
  - Passed with live baseline retrieval returning 8 results and metadata references intact.
