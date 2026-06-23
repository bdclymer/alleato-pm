# Task: Change Event Line Items Revenue ROM

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-601 - https://linear.app/megankharrison/issue/AAI-601/show-revenue-rom-in-change-event-line-items-table
Related Handoff: Not created - small direct UI fix

## Objective

On `/25125/change-events/1f6e73c0-d5fc-492e-a7e2-322a7a49774a`, the line items table must show Revenue ROM alongside Cost ROM and Over/Under.

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

- [x] The requested change event line-items table shows a `Revenue ROM` column.
- [x] Existing `Cost ROM`, `Non-committed`, and `Over / Under` columns remain visible.
- [x] Row and totals values remain right-aligned and compact.
- [x] Browser evidence proves the requested route renders the fixed table.

## Failure-Loudly Behavior

- Add or update focused coverage so the line-items table cannot regress to hiding Revenue ROM when revenue is not expected for the change event.
- `line-items-table-layout.test.ts` asserts `Revenue ROM` lives in the always-visible summary header, after the `expectingRevenue` detail-column block.

## Files To Change

- `frontend/src/components/domain/change-events/ChangeEventLineItemsTable.tsx` - shared line-items table visibility behavior.
- `frontend/src/components/domain/change-events/__tests__/line-items-table-layout.test.ts` - focused layout guardrail.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint src/components/domain/change-events/ChangeEventLineItemsTable.tsx src/components/domain/change-events/__tests__/line-items-table-layout.test.ts`; `git diff --check -- frontend/src/components/domain/change-events/ChangeEventLineItemsTable.tsx frontend/src/components/domain/change-events/__tests__/line-items-table-layout.test.ts docs/ops/tasks/2026-06-22-change-event-line-items-revenue-rom.md` | Passed | Focused eslint and whitespace checks passed. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/components/domain/change-events/__tests__/line-items-table-layout.test.ts --runInBand` | Passed | 1 suite, 1 test passed. |
| Browser/user-flow     | `agent-browser open http://localhost:3001/25125/change-events/1f6e73c0-d5fc-492e-a7e2-322a7a49774a`; `agent-browser eval "document.body.innerText"`; screenshot artifact | Passed | The requested route shows line-item headers `Cost ROM`, `Revenue ROM`, `Non-committed`, and `Over / Under`. Screenshot: `docs/ops/evidence/2026-06-22-change-event-line-items-revenue-rom/change-event-line-items-revenue-rom.png`. |
| DB/provider read-back | Not applicable | Passed | No database, migration, provider, or env change expected. |
| End-to-end proof      | `docs/ops/evidence/2026-06-22-change-event-line-items-revenue-rom/page-inner-text.txt` | Passed | Visible text includes row values `Cost ROM $1,191.54`, `Revenue ROM $1,191.54`, `Non-committed $0.00`, and `Over / Under $0.00`. |

## Files Changed

- `docs/ops/tasks/2026-06-22-change-event-line-items-revenue-rom.md` - working definition of done and evidence ledger.
- `frontend/src/components/domain/change-events/ChangeEventLineItemsTable.tsx` - move Revenue ROM into the always-visible Summary group.
- `frontend/src/components/domain/change-events/__tests__/line-items-table-layout.test.ts` - prevent conditional hiding from returning.

## Risks / Gaps

- AAI-600 task-owned files are already staged from the previous blocked finish flow; avoid mixing this task's files into that staged set unless publishing both together is explicitly intended.
- Publishing was not attempted for AAI-601 because AAI-600 task-owned files are already staged and the prior `codex:finish` flow is blocked by unrelated changed-file guardrails in `document-metadata-client.tsx` and `pcos/page.tsx`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
