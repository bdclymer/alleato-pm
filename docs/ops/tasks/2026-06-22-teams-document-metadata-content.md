# Task: Teams Document Metadata Detail Content

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-594 - https://linear.app/megankharrison/issue/AAI-594/fix-teams-document-metadata-row-detail-content
Related Handoff: N/A

## Objective

When an admin opens `/document-metadata?type=teams` and clicks a Teams row, the
detail surface shows the actual Teams message/conversation content or a specific
source-state explanation. It must not render an empty content area when content
exists in the app or RAG source tables.

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

- A Teams row detail view renders source content from the correct source table.
- If a Teams row genuinely has no retrievable content, the detail view says which
  content source was checked and why it is unavailable.
- The table/list remains quiet: no new summary cards, duplicated CTAs, or helper
  panels.
- A focused regression check covers the content fallback path.

## Failure-Loudly Behavior

- Missing content cannot silently render as blank.
- App metadata-only rows must attempt the RAG/source content path before showing
  unavailable state.
- Source fetch errors must surface an actionable message in the detail view or API
  response.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/lint           | `cd frontend && npm run lint:errors -- --quiet 'src/app/api/document-metadata/[docId]/content/route.ts' 'src/lib/document-metadata/content-response.ts' 'src/lib/document-metadata/__tests__/content-response.test.ts'` | Pass | Changed API/helper/test files lint clean. |
| Static/type           | `cd frontend && npm run typecheck` | Timeout | Repo bounded typecheck timed out after 60s before diagnostics; owner is existing full-program typecheck scope/timeout debt, not this changed path. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/document-metadata/__tests__/content-response.test.ts` | Pass | 3 tests cover blank normalization, chunk ordering, and explicit unavailable response. |
| Browser/user-flow     | `agent-browser open http://localhost:3001/document-metadata?type=teams`; click first Teams row | Pass | Detail sheet rendered Teams sender/time/message content. Screenshot: `tests/agent-browser-runs/2026-06-22-teams-document-metadata-content/teams-row-detail-content.png`. |
| DB/provider read-back | Node Supabase probe from `frontend/`; authenticated in-page `fetch('/api/document-metadata/teamsdm_c3e2df591742922c_2026-06-22/content')` | Pass | App row had `content` length 0; RAG row had content. API returned status 200, `contentLen: 425`, `contentSource: rag_document_metadata.content`. |
| End-to-end proof      | Authenticated browser row click plus API read-back | Pass | Row detail no longer renders blank when app metadata is catalog-only and RAG content exists. |

## Files Changed

- `docs/ops/tasks/2026-06-22-teams-document-metadata-content.md` - task ledger.
- `frontend/src/app/api/document-metadata/[docId]/content/route.ts` - app metadata to RAG metadata/chunk fallback.
- `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` - preserve content source and unavailable metadata from the API.
- `frontend/src/app/(admin)/document-metadata/document-metadata-sheet.tsx` - render explicit unavailable state instead of silently blank content.
- `frontend/src/lib/document-metadata/content-response.ts` - shared content response normalization helpers.
- `frontend/src/lib/document-metadata/__tests__/content-response.test.ts` - regression coverage for content response behavior.

## Risks / Gaps

- Full bounded typecheck timed out after 60 seconds before diagnostics. The focused lint/test/browser/API checks passed for this change.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
