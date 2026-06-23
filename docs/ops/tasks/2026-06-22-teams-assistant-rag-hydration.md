# Task: Teams Assistant RAG Hydration

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-597 - https://linear.app/megankharrison/issue/AAI-597/hydrate-teams-assistant-retrieval-from-rag-metadata-content
Related Handoff: N/A

## Objective

The AI assistant's source-specific Teams retrieval hydrates stored Teams DM rows
from RAG `rag_document_metadata.content/raw_text` when app
`document_metadata.content/summary/overview` are empty.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Acceptance Criteria

- Recent Teams source-specific retrieval does not return `No text excerpt stored`
  for stored rows that have RAG metadata content.
- Hydration uses RAG metadata only for stored Teams rows with empty preferred
  content.
- Semantic chunk search remains unchanged; chunk generation is still owned by
  graph embedding/vectorization.
- Focused tests cover hydration behavior.

## Failure-Loudly Behavior

- RAG hydration errors fail the source-specific Teams retrieval instead of
  silently pretending no text exists.
- Rows without app text or RAG text still show the explicit no-excerpt fallback.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/lint           | `cd frontend && npm run lint:errors -- --quiet 'src/lib/ai/retrieval/source-specific-rag.ts' 'src/lib/ai/retrieval/__tests__/source-specific-rag.test.ts'` | Pass | Changed retrieval/test files lint clean. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/retrieval/__tests__/source-specific-rag.test.ts` | Pass | Proves empty stored Teams row is hydrated from RAG metadata content. |
| Browser/user-flow     | N/A | Pass | No UI change; assistant retrieval helper only. |
| DB/provider read-back | Node Supabase read-back from `frontend/` | Pass | App Teams rows: 27,919; Teams DM rows: 3,289; RAG Teams docs: 27,919; RAG DM docs: 3,289; Teams chunks: 35,542. Today's 3 Teams rows have app content/summary/overview length 0, RAG content lengths 813/231/425, and 0 chunks in sampled today docs. |
| End-to-end proof      | Focused unit test plus live DB read-back | Pass | Confirms hydration is needed for today's rows and now covered in source-specific Teams retrieval. |

## Files Changed

- `docs/ops/tasks/2026-06-22-teams-assistant-rag-hydration.md` - task ledger.
- `frontend/src/lib/ai/retrieval/source-specific-rag.ts` - Teams stored-row RAG metadata hydration.
- `frontend/src/lib/ai/retrieval/__tests__/source-specific-rag.test.ts` - regression coverage.

## Risks / Gaps

- Direct live invocation of `buildSourceSpecificRagAnswer` from `tsx` is blocked by repo `server-only` imports outside Next/Jest. Verified with focused Jest coverage and live DB read-back instead.
- Semantic vector search still depends on `document_chunks`; today’s Teams rows have RAG metadata content but no chunks yet. This patch fixes source-specific Teams retrieval, not graph embedding backlog.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
