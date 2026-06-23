# Task: Drawings Integrated Draft State

Status: Complete - Pending Push
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-614 - https://linear.app/megankharrison/issue/AAI-614/add-drawings-review-queue-for-unpublished-revisions
Related Handoff: docs/ops/handoffs/2026-06-23-S82-drawings-integrated-draft-state.md

## Objective

Replace the separate top-of-page Drawings review queue with integrated draft
state in the existing Drawings grid/table/list surfaces. Unpublished revisions
must appear in the normal Drawings surface and be visually marked as `Draft`;
published revisions must be marked as `Published`.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Acceptance Criteria

- [x] Remove the separate top-of-page Review Queue table.
- [x] Drawings page fetches review-current rows so draft revisions appear in the normal grid/table/list.
- [x] Grid cards visually distinguish draft revisions without creating a separate dashboard section.
- [x] Table/list state text says `Draft` or `Published`, not `Unpublished`.
- [x] Existing confirm/publish actions still work through row actions.
- [x] Targeted checks and browser evidence prove the integrated draft state.

## Evidence

| Check             | Command / artifact | Result | Notes |
| ----------------- | ------------------ | ------ | ----- |
| Static/type/lint  | `cd frontend && npx eslint 'src/app/(main)/[projectId]/drawings/page.tsx' src/features/drawings/drawings-table-config.tsx src/hooks/use-drawings.ts src/lib/drawings/__tests__/drawing-log-row.unit.test.ts --no-warn-ignored` | PASS | No lint errors in the changed source/test files. |
| Static/type/lint  | `npm --prefix frontend run typecheck:changed` | PASS | Changed-file typecheck completed. |
| Targeted tests    | `npm --prefix frontend run test:unit -- --runTestsByPath src/lib/drawings/__tests__/drawing-log-row.unit.test.ts` | PASS | Proves revision-level `isPublished` wins over the logical drawing publish flag. |
| Browser/user-flow | `tests/agent-browser-runs/2026-06-23-drawings-integrated-draft-state/grid-draft.png` and `grid-body.txt` | PASS | Normal grid shows the seeded draft revision with no `Review queue` text. |
| Browser/user-flow | `tests/agent-browser-runs/2026-06-23-drawings-integrated-draft-state/table-draft.png` and `table-body.txt` | PASS | Normal table shows `Status` = `Draft` for `CODEX-DRAFT-0623`; no `Unpublished` or `Review queue` text. |
| DB read-back      | `tests/agent-browser-runs/2026-06-23-drawings-integrated-draft-state/seed-readback.json` | PASS | Seeded a published revision 0 plus draft review revision 1 for browser proof. |
| DB read-back      | `tests/agent-browser-runs/2026-06-23-drawings-integrated-draft-state/cleanup-readback.txt` | PASS | Cleanup removed 1 drawing and 2 revisions. |

## Files Changed

- `frontend/src/app/(main)/[projectId]/drawings/page.tsx` - remove separate queue and fetch review-current rows in the main log.
- `frontend/src/features/drawings/drawings-table-config.tsx` - integrated Draft/Published labels and grid styling.
- `frontend/src/hooks/use-drawings.ts` - remove the queue-only bulk publish hook and keep row-level publish status feedback.
- `frontend/src/lib/drawings/__tests__/drawing-log-row.unit.test.ts` - guard revision-level publish state mapping.
- `frontend/src/lib/drawings/review-queue.ts` - deleted separate queue helper.
- `frontend/src/lib/drawings/__tests__/review-queue.unit.test.ts` - deleted queue-only test.
- `docs/ops/tasks/2026-06-23-drawings-integrated-draft-state.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S82-drawings-integrated-draft-state.md` - handoff.

## Risks / Gaps

- OCR metadata editing and batch review edit controls remain follow-up Procore parity work.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Final response includes what is done, what remains, and recommended next steps.
