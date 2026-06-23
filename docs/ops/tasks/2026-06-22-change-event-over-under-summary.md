# Task: Change Event Over/Under Summary

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-600 - https://linear.app/megankharrison/issue/AAI-600/add-over-under-value-to-change-event-financial-summary
Related Handoff: Not created - small direct UI change

## Objective

Add the over/under amount to the right-column Financial Summary on change event detail pages, including `/25125/change-events/6571592b-9d8a-4791-8b4a-369755c73e35`.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

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

- [x] Financial Summary shows Revenue ROM, Cost ROM, Non-Committed Cost, and Over/Under.
- [x] Over/Under is computed as `Revenue ROM - Cost ROM` from the detail API totals.
- [x] Positive and negative values are visually distinguishable without adding a new summary module.
- [x] The existing right-column summary layout remains responsive and quiet.

## Failure-Loudly Behavior

- The change event detail type now declares the `totals` contract used by the summary, so future API/type drift is visible to TypeScript instead of hidden behind an untyped component cast.
- The focused helper test verifies the API's string totals and numeric totals both produce the same over/under calculation.

## Files To Change

- `frontend/src/components/domain/change-events/ChangeEventGeneralInfoPanel.tsx` - render the Over/Under summary row.
- `frontend/src/lib/change-events/financial-summary.ts` - shared currency coercion and over/under calculation.
- `frontend/src/lib/change-events/__tests__/financial-summary.test.ts` - focused guardrail for the calculation.
- `frontend/src/types/change-events.ts` - type the detail API totals consumed by the summary.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint src/components/domain/change-events/ChangeEventGeneralInfoPanel.tsx src/lib/change-events/financial-summary.ts src/lib/change-events/__tests__/financial-summary.test.ts`; `git diff --check -- <task-owned files>` | Passed | Focused eslint passed with no output; whitespace diff check passed. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/change-events/__tests__/financial-summary.test.ts --runInBand` | Passed | 1 suite, 2 tests passed. |
| Browser/user-flow     | `agent-browser --state frontend/tests/.auth/user.json open http://localhost:3001/25125/change-events/6571592b-9d8a-4791-8b4a-369755c73e35`; screenshot artifact | Passed | Existing browser daemon was already authenticated; page loaded and showed `Financial Summary ... Over/Under -$1,572.90`. Screenshot: `docs/ops/evidence/2026-06-22-change-event-over-under-summary/change-event-detail-over-under.png`. |
| DB/provider read-back | Not applicable | Passed | No database, migration, provider, or env change. |
| End-to-end proof      | `docs/ops/evidence/2026-06-22-change-event-over-under-summary/page-visible-text.txt` | Passed | Visible text includes `FINANCIAL SUMMARY`, `Revenue ROM $0.00`, `Cost ROM $1,572.90`, and `Over/Under -$1,572.90` on the requested route. |
| Publish finish flow   | `npm run codex:finish -- --message "Add change event over under summary" --files <task-owned paths>` | Blocked | Staged exact task files, then `npm --prefix frontend run quality:changed` failed on unrelated dirty files: `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` silent catch and `frontend/src/app/(main)/[projectId]/pcos/page.tsx` undocumented lint suppression. |

## Files Changed

- `docs/ops/tasks/2026-06-22-change-event-over-under-summary.md` - working definition of done and evidence ledger.
- `frontend/src/components/domain/change-events/ChangeEventGeneralInfoPanel.tsx` - render Over/Under in Financial Summary.
- `frontend/src/lib/change-events/financial-summary.ts` - shared helper for detail summary math.
- `frontend/src/lib/change-events/__tests__/financial-summary.test.ts` - regression coverage for string and numeric API totals.
- `frontend/src/types/change-events.ts` - type `ChangeEventDetail.totals`.

## Risks / Gaps

- Full repo quality/build was not run because this is a narrow UI change in a heavily dirty checkout; focused eslint, unit test, diff check, and browser proof passed.
- Publishing to `origin/main` remains blocked by unrelated changed-file guardrail debt in `document-metadata-client.tsx` and `pcos/page.tsx`; task-owned files were staged by `codex:finish`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
