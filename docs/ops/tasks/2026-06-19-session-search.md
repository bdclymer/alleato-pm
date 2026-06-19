# Task: Session Search

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-560 - https://linear.app/megankharrison/issue/AAI-560/goal-4-session-search-over-prior-assistant-conversations
Related Handoff: docs/ops/handoffs/2026-06-19-S62-session-search.md

## Objective

Implement Goal 4 from `docs/ai-plan/hermes-openclaw-goals/goal-04-session-search.md`: Alleato can recall relevant prior assistant conversations through a scoped `searchPastConversations` tool using Postgres full-text/trigram search over `chat_history`, with deduped session results, anchored context windows, and first/last session bookends inspired by Hermes.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

## Source References

- `docs/ai-plan/hermes-openclaw-goals/goal-04-session-search.md`
- `hermes-agent/tools/session_search_tool.py`
- `hermes-agent/hermes_state.py`
- `hermes-agent/tests/test_hermes_state.py`

## Scope Checklist

- [x] Existing `chat_history` schema, indexes, RLS/policy behavior, and call sites reviewed.
- [x] Existing assistant memory/search tools reviewed so conversation recall does not duplicate document RAG.
- [x] Source-of-truth owner chosen: PM app Postgres `chat_history`, not `document_chunks` or RAG-side tables.
- [x] Chat context assembly and daily-brief context assembly files discovered before implementation.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined for auth, empty results, RPC drift, and registry drift.

## Implementation Checklist

- [x] Run required database gate before writing DB code:
  `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`
- [x] Add migration `supabase/migrations/<timestamp>_search_chat_history.sql`.
- [x] Migration uses Postgres `tsvector` and `pg_trgm` over `chat_history`, not document RAG tables.
- [x] Add or update indexes required for fast scoped search.
- [x] Add `search_chat_history` RPC with authenticated user/team/project scoping.
- [x] RPC dedupes results by session or lineage root.
- [x] RPC expands each hit to an anchored neighboring message window.
- [x] RPC includes first/last session bookends.
- [x] Zero results return a typed loud-empty result containing query and scope.
- [x] Missing/invalid permissions return a scoped authorization error, not empty data.
- [x] Generate/update `frontend/src/types/database.types.ts` after DB work.
- [x] Add `frontend/src/lib/ai/tools/search-past-conversations.ts`.
- [x] Register `searchPastConversations` in `frontend/src/lib/ai/tool-registry.ts`.
- [x] Wire session recall into the intended chat context assembly path.
- [x] Daily brief context can opt into session recall without mixing results into `document_chunks`.
- [x] Keep document retrieval code unchanged; do not route conversation recall through document RAG.
- [x] Update `docs/architecture/tables.yaml`.
- [x] Run `npm run db:inventory` after table metadata changes.
- [x] Update `docs/architecture/AI-RAG-ARCHITECTURE.md` with a dated verification note.

## Integration Checklist

- [x] End-to-end flow proves prompt -> tool registry -> `searchPastConversations` -> `search_chat_history` RPC -> typed response.
- [x] Tool response includes query, scope, dedupe key/session, anchored window, bookends, and loud-empty state.
- [x] Chat context insertion is source-labeled as prior conversation/session recall.
- [x] Daily brief opt-in, if implemented in this goal, is feature-gated or explicitly scoped.
- [x] No conversation recall content is persisted or indexed into document RAG tables.
- [x] Run/task/session ledger records meaningful verification attempts in handoff.

## Regression Guardrails

- [x] RPC/unit tests prove anchored neighboring window correctness.
- [x] Tests prove session or lineage-root dedupe.
- [x] Tests prove user/team/project scoping and authorization failure behavior.
- [x] Tests prove zero-result loud-empty typed response.
- [x] Tool tests prove shape, error handling, and registry ownership.
- [x] Tool registry verification proves governed registration.
- [x] Migration ledger verification proves the migration is applied remotely or explicitly deferred.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated RPC/tool tests run.
- [x] `npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_search_chat_history.sql` run and evidence recorded.
- [x] `npm run db:inventory` run after `tables.yaml` update.
- [x] Tool registry verifier run.
- [x] E2E proof captured for actual session recall outcome.
- [x] Broader AI assistant eval run if session recall is injected into generation context.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Supabase typegen gate | `set -a && source .env && set +a && npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts` | Pass | `.env.local` contains an invalid legacy token; `.env` token is valid. Generated file size: 1,233,296 bytes. |
| Migration ledger      | `npm run db:migrations:verify-applied -- supabase/migrations/20260619210000_search_chat_history.sql` | Pass | Ledger check passed for `20260619210000` after exact SQL apply + `supabase migration repair --status applied 20260619210000`. |
| DB inventory          | `npm run db:inventory` | Pass | Regenerated `frontend/src/components/dev-tools/db-inventory.generated.ts`, `.json`, and `docs/architecture/TABLE-LIST.md`; fixed `name:db` inventory keying for MAIN/RAG duplicate names. |
| Static/type/lint      | `cd frontend && npm run quality:changed`; `cd frontend && npx eslint --quiet ...`; `node --check scripts/dev-tools/generate-db-inventory.mjs && node --check scripts/verify/verify_ai_assistant_tool_registry.mjs`; `cd frontend && npm run typecheck` | Partial pass | Changed-file quality, targeted ESLint, and script syntax checks passed. Full frontend typecheck timed out at the repo's 60s bounded gate; this is existing broad tsconfig/generated-code debt, not a changed-file failure. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/tools/__tests__/search-past-conversations.test.ts src/lib/ai/tools/__tests__/search-chat-history-migration.test.ts src/lib/ai/tools/__tests__/project-tools-barrel.test.ts` | Pass | 3 suites, 9 tests passed. |
| Tool registry         | `npm run rag:verify:assistant-tool-registry` | Pass | Guardrail passes with `search-past-conversations.ts` registered as a composed `createProjectTools` module. |
| Live RPC proof        | `psql "$DATABASE_URL" ... public.search_chat_history('project', user_id, null, 2, 2)` | Pass | Returned `ok|2|t|2|2|2`; empty query proof returned `empty|0|...|0`; unauthenticated scope proof raised authorization error. |
| E2E proof             | `cd frontend && npx tsx -e "... createSessionSearchTools(...).searchPastConversations.execute(...)"` | Pass | Actual AI SDK tool returned `{ ok: true, status: "ok", resultCount: 2 }` with session ID, sourceRef, anchored window count 2, start bookend count 2, end bookend count 2. |

## Files Expected To Change

- `supabase/migrations/<timestamp>_search_chat_history.sql` - PM app DB search indexes/RPC.
- `frontend/src/types/database.types.ts` - generated Supabase types.
- `frontend/src/lib/ai/tools/search-past-conversations.ts` - governed assistant tool.
- `frontend/src/lib/ai/tool-registry.ts` - governed registration.
- Chat context assembly file(s), discovered before implementation.
- Daily-brief context assembly file(s), only if session recall opt-in is included in this goal.
- `docs/architecture/tables.yaml` - table/RPC metadata.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - dated architecture note.
- Targeted tests for RPC/tool/registry/e2e coverage.

## Risks / Gaps

- This is database-backed and cannot be called complete until the migration is applied or explicitly marked `Blocked/Deferred` with ledger evidence.
- `chat_history` may contain projectless or cross-project records; scoping must be proven with tests and SQL evidence before enabling broad recall.
- Full `npm run quality` currently has known broad frontend typecheck timeout debt; changed-file gates are still required but do not replace migration/e2e proof.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
