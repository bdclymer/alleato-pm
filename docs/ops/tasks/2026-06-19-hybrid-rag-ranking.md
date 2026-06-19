# Task: Hybrid RAG Ranking

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-561 - https://linear.app/megankharrison/issue/AAI-561/goal-5-hybrid-rag-ranking-telemetry-and-evaluation
Related Handoff: docs/ops/handoffs/2026-06-19-S63-hybrid-rag-ranking.md

## Objective

Implement Goal 5 from `docs/ai-plan/hermes-openclaw-goals/goal-05-hybrid-rag-ranking.md`: Alleato document retrieval can compare a flag-gated hybrid ranking score that blends vector similarity, full-text score, recall frequency, and recency decay without regressing answer quality or removing pure-cosine fallback.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

## Source References

- `docs/ai-plan/hermes-openclaw-goals/goal-05-hybrid-rag-ranking.md`
- `openclaw/extensions/memory-core/src/short-term-promotion.ts`
- `openclaw/extensions/memory-core/src/short-term-promotion.test.ts`
- `openclaw/packages/memory-host-sdk/src/host/types.ts`
- `openclaw/extensions/memory-core/src/memory/hybrid.ts`
- `openclaw/extensions/memory-core/src/memory/hybrid.test.ts`

## Scope Checklist

- [x] Existing RAG migration path and AI Database migration ledger process reviewed.
- [x] Existing `search_document_chunks` RPC/function shape and callers reviewed.
- [x] Existing retrieval weighting code reviewed: `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts`.
- [x] OpenClaw hybrid scoring and promotion references reviewed before implementation.
- [x] Source-of-truth owner chosen for recall telemetry.
- [x] Acceptance criteria written as observable behavior.
- [x] Failure-loudly behavior defined for missing score components, migration/readback failure, eval regression, and telemetry write failure.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Add AI Database migration under `scripts/database/rag/migrations/`.
- [x] Migration adds recall count / last recalled at columns or a normalized retrieval telemetry table.
- [x] Migration is reversible or includes explicit rollback plan.
- [x] Apply migration to the AI Database and verify ledger/readback; do not leave migration local-only.
- [x] Update `search_document_chunks` or equivalent retrieval path to return vector score and text score or a clearly named hybrid score with components.
- [x] Add flag-gated hybrid ranking while preserving pure-cosine fallback.
- [x] Recall telemetry updates avoid hot-write contention and fail loudly/inspectably on write failure.
- [x] Add/update recency decay and score blending logic in shared retrieval code.
- [x] Update `docs/architecture/AI-RAG-ARCHITECTURE.md`.
- [x] Update `docs/architecture/tables.yaml`.
- [x] Run `npm run db:inventory` after table metadata changes.

## Integration Checklist

- [x] End-to-end retrieval path can return score components/hybrid score when enabled.
- [x] Default mode remains pure cosine unless eval gates pass.
- [x] Degraded ranking mode is visible when a component cannot compute.
- [x] No PM APP write pressure is introduced for high-churn RAG telemetry.
- [x] Run/task/session ledger records meaningful verification attempts.

## Regression Guardrails

- [x] Unit tests cover recency decay.
- [x] Unit tests cover score blending.
- [x] Tests cover feature-flag fallback to pure cosine.
- [x] Tests cover degraded ranking result when components are missing.
- [x] Targeted retrieval eval compares hybrid vs pure-cosine and records outcome.
- [x] Migration readback verifies the AI Database schema/telemetry path.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated tests run.
- [x] AI Database migration readback run.
- [x] `npm run db:inventory` run.
- [x] Retrieval eval run and outcome recorded.
- [x] End-to-end proof captured for actual hybrid-vs-cosine comparison.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| RAG migration path    | `scripts/database/rag/migrations/20260619223000_hybrid_rag_ranking.sql`; `psql "$RAG_DATABASE_URL" -v ON_ERROR_STOP=1 -c "begin" -f ... -c "rollback"` | Passed | Migration syntax/idempotency checked in rollback transaction; wrapper `scripts/database/rag/install-search-document-chunks-rpc.sql` reapplies the canonical migration. |
| DB/provider read-back | `psql "$RAG_DATABASE_URL" ...` | Passed | Ledger row `20260619223000|hybrid_rag_ranking`; exactly one `search_document_chunks` function remains; telemetry columns `last_recalled_at,recall_count` verified. |
| DB inventory          | `npm run db:inventory` | Passed | Schema drift check passed for MAIN and RAG; regenerated `docs/architecture/TABLE-LIST.md`, `frontend/src/components/dev-tools/db-inventory.generated.ts`, and JSON. |
| Static/type/lint      | `cd frontend && npm run quality:changed` | Passed | No new ESLint debt, no new `any`, unsafe-pattern guard passed, no changed API routes. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/retrieval/__tests__/retrieval-weight-scoring.test.ts --runInBand` | Passed | 1 suite, 7 tests. |
| Retrieval eval        | `npm run rag:verify:hybrid-ranking` | Passed | Live AI Gateway embedding + RAG RPC: vectorHits=16, hybridHits=16, same top chunk, score components present. |
| End-to-end proof      | `npm run rag:verify:hybrid-ranking` | Passed | Telemetry readback found recent hybrid recall rows; `telemetryRecallCount=16`. |

## Known Unrelated Worktree Dirt

- `backend/src/services/agents/microsoft_executive_assistant/tools.py`, `render.yaml`, `frontend/src/types/database.types.ts`, `frontend/src/components/dev-tools/page-schema-fk.generated.ts`, `supabase/.temp/cli-latest`, `supabase/migrations/20260619220000_outlook_email_triage_columns.sql`, `AGENT_ACTION_LAYER_CONTRACT.md`, and `backend/src/scripts/run_email_digest.py` were already dirty or generated by unrelated local work and are not owned by Goal 5.

## Files Expected To Change

- `scripts/database/rag/migrations/<timestamp>_hybrid_rag_ranking.sql` - AI Database telemetry/schema/RPC update.
- `frontend/src/lib/ai/retrieval/retrieval-weight-scoring.ts` - hybrid score component logic if owned here.
- `frontend/src/lib/ai/retrieval/__tests__/retrieval-weight-scoring.test.ts` - recency/score blending tests.
- RAG search RPC/caller files discovered during inspection.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - dated architecture note.
- `docs/architecture/tables.yaml` - RAG table/RPC metadata.
- `docs/architecture/TABLE-LIST.md` and DB inventory generated artifacts if `npm run db:inventory` regenerates them.
- Focused retrieval eval artifact/script if existing eval coverage is insufficient.

## Risks / Gaps

- AI Database migrations do not use the PM APP Supabase migration ledger path. The exact RAG migration ledger/readback process must be verified before closeout.
- Hybrid ranking must stay default-off until eval comparison proves no regression.
- Recall telemetry writes can become high-churn; batching/normalization may be safer than per-hit row updates.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
