# AAI-703 Legacy Cleanup Candidate Inventory

Date: 2026-06-26

This inventory is the deletion gate for remaining AI/RAG legacy implementation
candidates. A candidate can only be deleted after import, route, provider, and
database-write proof show it is inactive or fully replaced.

## Candidate Table

| Candidate | Area | Evidence | Classification | Action |
| --- | --- | --- | --- | --- |
| `backend/src/scripts/eval_graph_sync.py` | Microsoft Graph/RAG eval | Import/reference proof: no package, route, Render, backend service, frontend source, or active docs reference outside its own docstring, stale `backend/README.md`, prior AAI-682 evidence, and generated DB inventory metadata. Route proof: not referenced by `frontend/src/app/api/admin/rag-eval/run/route.ts`; admin eval uses `rag_eval.py`, `rag_answer_eval.py`, `rag_reranker_eval.py`, `rag_source_coverage.py`, and `rag_e2e_eval.py`. Provider proof: not referenced in `render.yaml`. Database proof: read-only health/eval queries against `graph_sync_state` and `document_chunks`; no production writes. | `delete` | Deleted script; removed README advertising; generated DB inventory refresh required to drop stale filePath references. |
| `backend/src/scripts/eval_mine_emails.py` | Historical email-mining eval bootstrap | Import/reference proof: no package, route, Render, backend service, frontend source, or active docs reference outside its own docstring, stale `backend/README.md`, prior AAI-682 evidence, and generated DB inventory metadata. Route proof: not referenced by admin eval route or live assistant routes. Provider proof: not referenced in `render.yaml`. Database proof: optional manual writes to `eval_scenarios_raw`, a bootstrap/eval table, not a production ingestion/vectorization path. | `delete` | Deleted script; removed README advertising; generated DB inventory refresh required to drop stale filePath references. |
| `backend/src/scripts/backfill_contextual_embeddings.py` | Contextual retrieval pilot/backfill | AAI-734 replacement/retirement proof: no direct callers, no route, no package script, no Render schedule, no checked Render env enabling `RAG_EMBEDDING_VARIANT`, and live frontend RAG paths use `search_document_chunks`. Database proof: the script wrote only the pilot `document_chunks.chunk_context`, `embedding_contextual`, and `contextualized_at` fields. | `delete` | Retired in AAI-734 with the pilot helper, backend contextual variant switch, generated RAG types, and RAG cleanup migration. |
| `backend/src/scripts/backfill_outlook_rag_metadata_to_app_documents.py` | Outlook RAG-to-app catalog bridge | AAI-732 replacement proof: live Outlook sync plus `backfill_outlook_intake_rag_documents()` call `SupabaseRagStore.upsert_document_metadata()`, which writes app catalog metadata and RAG metadata through the shared path. Route proof: manual CLI only. Provider proof: not scheduled in `render.yaml`. Database proof: direct SQL incident bridge with `app.allow_outlook_ingestion_write`. | `delete` | Deleted in AAI-732; current repair owner is the canonical Outlook intake/RAG path plus promotion freshness monitor. |
| `backend/src/scripts/rag_eval.py` | Local admin RAG eval | Route proof: used by `frontend/src/app/api/admin/rag-eval/run/route.ts` for eval type `l1`; route is local-admin gated and disabled on Vercel. | `active-keep` | Kept. |
| `backend/src/scripts/rag_answer_eval.py` | Local admin RAG eval | Route proof: used by `frontend/src/app/api/admin/rag-eval/run/route.ts` for eval type `l2`; route is local-admin gated and disabled on Vercel. | `active-keep` | Kept. |
| `backend/src/scripts/rag_reranker_eval.py` | Local admin RAG eval | Route proof: used by `frontend/src/app/api/admin/rag-eval/run/route.ts` for eval type `reranker`; route is local-admin gated and disabled on Vercel. | `active-keep` | Kept. |
| `backend/src/scripts/rag_source_coverage.py` | Local admin RAG eval | Route proof: used by `frontend/src/app/api/admin/rag-eval/run/route.ts` for eval type `coverage`; route is local-admin gated and disabled on Vercel. | `active-keep` | Kept. |
| `backend/src/scripts/rag_e2e_eval.py` | Local admin RAG eval | Route proof: used by `frontend/src/app/api/admin/rag-eval/run/route.ts` for eval type `e2e`; route is local-admin gated and disabled on Vercel. | `active-keep` | Kept. |

## Commands And Evidence Log

- `rg --files backend/src/scripts | rg '(eval_|rag_|backfill_)'`
  - Listed RAG/admin eval scripts and manual backfills.
- `rg -n "eval_graph_sync|eval_mine_emails|backfill_contextual_embeddings|backfill_outlook_rag_metadata_to_app_documents|rag_eval|rag_answer_eval|rag_reranker_eval|rag_source_coverage|rag_e2e_eval" backend frontend scripts docs package.json render.yaml`
  - Found active admin eval route references for `rag_*` scripts.
  - Found contextual retrieval was a manual pilot only; AAI-734 retires it.
  - Found architecture/handoff references for the Outlook bridge.
  - Found no package/render/live route references for `eval_graph_sync.py` or `eval_mine_emails.py`.
- `rg -n "eval_graph_sync|eval_mine_emails" package.json render.yaml backend/src frontend/src scripts supabase docs/architecture docs/ops docs/tasks -g '!frontend/src/components/dev-tools/db-inventory.generated.json'`
  - Only stale README/prior-evidence/self references remained for the deleted eval scripts.
- `sed -n '1,150p' frontend/src/app/api/admin/rag-eval/run/route.ts`
  - Confirmed the maintained local admin eval contract does not use the deleted eval scripts.
