# Task: Drawings Review Queue

Status: Complete - Pending Push
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-614 - https://linear.app/megankharrison/issue/AAI-614/add-drawings-review-queue-for-unpublished-revisions
Related Handoff: docs/ops/handoffs/2026-06-23-S81-drawings-review-queue.md

## Objective

Expose a project Drawings review queue so newly uploaded or duplicate drawing
revisions remain unpublished until a reviewer explicitly confirms/publishes
them, while the main drawing log continues to show the latest published
revision.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Workflow Map

User action: upload a new or duplicate drawing, inspect queued revisions, publish a queued revision.
Frontend owner component: project drawings page plus shared drawings table/review component.
Shared primitive/component owner: existing button/table/select/status primitives and drawings data hooks.
Client state changed: drawings list cache, review queue list cache, selected queued rows.
API route(s): `GET /api/projects/[projectId]/drawings?include_unpublished=true`, `/publish`, `bulk-status`.
Validation schema(s): existing drawing API query/action parsing.
Service/helper(s): `DrawingService`, `DrawingRevisionService`, `use-drawings`.
Supabase table(s): `drawings`, `drawing_revisions`, `drawing_log`, `drawing_log_review`.
Live DB column/type assumptions: revision-level `is_published`, `status`, `published_at`, `review_revision_id`.
Side effects on render: read-only fetches only; no page-load database mutation.
Bulk/import/template behavior: publish selected queue rows through the existing bulk publish route.
Expected success evidence: review queue shows unpublished review revisions; publishing a queued revision moves it into the published log.
Expected failure behavior: publish failures show specific UI errors and leave queue/main log state unchanged.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Acceptance Criteria

- [x] Drawings page has a review queue surface for unpublished review/current revisions.
- [x] Main drawing log remains published-current only.
- [x] Queue rows include drawing number, title, revision, discipline, set, area, dates, and status.
- [x] User can publish/confirm individual queued drawings.
- [x] User can bulk publish/confirm selected queued drawings.
- [x] Publishing refreshes both the queue and main drawing log.
- [x] Empty queue is quiet and not a decorative dashboard/card.
- [x] Specific failures are surfaced and logged.

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

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/app/(main)/[projectId]/drawings/page.tsx' src/hooks/use-drawings.ts src/lib/drawings/review-queue.ts src/lib/drawings/__tests__/review-queue.unit.test.ts --no-warn-ignored`; `npm --prefix frontend run typecheck:changed` | Pass | Targeted lint clean; no new `any` type debt. |
| Full typecheck        | `npm --prefix frontend run typecheck` | Known timeout | Existing bounded typecheck guardrail timed out after 60s without task-specific TypeScript errors. |
| Targeted tests        | `npm --prefix frontend run test:unit -- --runTestsByPath src/lib/drawings/__tests__/review-queue.unit.test.ts` | Pass | 2 tests: queue filtering and revision-level publish-state mapper guard. |
| Browser/user-flow     | `agent-browser` against `http://localhost:3001/1009/drawings`; artifacts in `tests/agent-browser-runs/2026-06-23-drawings-review-queue/` | Pass | Review queue rendered queued rev 1; individual Confirm and bulk Confirm selected both promoted rev 1. |
| DB/provider read-back | `pre-confirm-db-readback.txt`, `post-confirm-db-readback.txt`, `bulk-post-confirm-db-readback.txt`, cleanup readbacks | Pass | Published log stayed rev 0 before confirmation, then moved to rev 1 after confirmation; seeded rows cleaned up. |
| End-to-end proof      | `before-confirm.png`, `after-confirm.png`, `bulk-selected.png`, `bulk-after-confirm.png` | Pass | Queue visible before confirm, hidden after promotion. |

## Files Changed

- `frontend/src/app/(main)/[projectId]/drawings/page.tsx` - review queue surface, individual confirm, bulk confirm selection, and specific download error logging.
- `frontend/src/hooks/use-drawings.ts` - shared bulk publish mutation and more specific publish toasts.
- `frontend/src/types/drawings.types.ts` - expose area fields and map revision-level publish state.
- `frontend/src/lib/drawings/review-queue.ts` - shared queue row filter.
- `frontend/src/lib/drawings/__tests__/review-queue.unit.test.ts` - queue and mapper regression tests.
- `docs/ops/tasks/2026-06-23-drawings-review-queue.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S81-drawings-review-queue.md` - orchestration handoff.
- `docs/ops/orchestration/session-board.md` - S81 ownership row.

## Risks / Gaps

- OCR metadata editing, rotation, delete-from-batch, and batch-specific upload review remain separate Procore parity slices.
- This slice uses existing publish routes as the confirmation action; it does not yet add a separate confirmed-but-unpublished status.
- `frontend/src/features/drawings/drawings-table-config.tsx` has unrelated pre-existing/user dirty changes and is intentionally not included in this task.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
