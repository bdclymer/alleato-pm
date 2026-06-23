# Task: Drawings Status Filter

Status: Complete - Pushed
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-614 - https://linear.app/megankharrison/issue/AAI-614/add-drawings-review-queue-for-unpublished-revisions
Related Handoff: docs/ops/handoffs/2026-06-23-S83-drawings-status-filter.md

## Objective

Make the integrated Drawings `Draft` / `Published` status useful in the normal
Drawings toolbar by adding a status filter that works across table, grid, and
list views without reintroducing a separate review queue.

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

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/app/(main)/[projectId]/drawings/page.tsx' src/features/drawings/drawings-table-config.tsx src/features/drawings/__tests__/drawings-table-config.unit.test.ts --no-warn-ignored` | PASS | Targeted lint passed. |
| Static/type/lint      | `npm --prefix frontend run typecheck:changed` | PASS | Changed-file type debt check passed. |
| Targeted tests        | `npm --prefix frontend run test:unit -- --runTestsByPath src/features/drawings/__tests__/drawings-table-config.unit.test.ts src/lib/drawings/__tests__/drawing-log-row.unit.test.ts` | PASS | 2 suites, 3 tests passed. |
| Browser/user-flow     | `tests/agent-browser-runs/2026-06-23-drawings-status-filter/draft-filter-grid.png` and `draft-filter-body.txt` | PASS | `?status=draft&view=card` showed one draft drawing in normal grid. |
| Browser/user-flow     | `tests/agent-browser-runs/2026-06-23-drawings-status-filter/draft-filter-table.png` and `draft-filter-table-body.txt` | PASS | `?status=draft&view=table` showed Status = `Draft` for the seeded row. |
| DB/provider read-back | N/A | PASS | No database or provider changes in this slice. |
| DB/provider read-back | `tests/agent-browser-runs/2026-06-23-drawings-status-filter/seed-readback.json` | PASS | Fixture had published current revision and unpublished review revision. |
| DB/provider read-back | `tests/agent-browser-runs/2026-06-23-drawings-status-filter/cleanup-readback.txt` | PASS | Cleanup removed 1 drawing and 2 revisions. |
| End-to-end proof      | Browser artifacts above | PASS | URL status filter, grid state, and table status column work together. |

## Files Changed

- `frontend/src/app/(main)/[projectId]/drawings/page.tsx` - add `publishState` filter state and filtering logic.
- `frontend/src/features/drawings/drawings-table-config.tsx` - keep status vocabulary aligned to `Draft` / `Published`.
- `frontend/src/features/drawings/__tests__/drawings-table-config.unit.test.ts` - guard shared publish-state derivation and filter matching.
- `docs/ops/tasks/2026-06-23-drawings-status-filter.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S83-drawings-status-filter.md` - handoff.

## Risks / Gaps

- This only filters the current loaded Drawings page; server-side filtering by
  revision publication state remains a future optimization if projects exceed
  the configured page size.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
