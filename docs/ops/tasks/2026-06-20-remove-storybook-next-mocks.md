# Task: Remove Storybook Next Mock Shims

Status: Complete
Owner: Codex
Created: 2026-06-20
Linear Issue: AAI-572 - https://linear.app/megankharrison/issue/AAI-572/remove-unused-storybook-next-mock-shims
Related Handoff: docs/ops/handoffs/2026-06-20-S72-remove-storybook-next-mocks.md

## Objective

Remove the second narrow, verified dead-code bucket from the S70 Knip report:
the unused Storybook Next mock shim files
`frontend/.storybook/mocks/next-link.tsx` and
`frontend/.storybook/mocks/next-navigation.ts`. This task must not delete
`frontend/src/App.tsx` because live code still imports it.

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
| Static/type/lint      | `cd frontend && NODE_OPTIONS='--max-old-space-size=8192' TYPECHECK_NO_TIMEOUT=1 npx tsc --noEmit --pretty false`; `git diff --check -- ...` | Pass | High-heap TypeScript passed with no compiler output; whitespace check passed. |
| Targeted tests        | `npm run check:routes`; `npm run verify:nonprod-routes` | Pass | Route conflict and nonprod route manifest checks passed. |
| Browser/user-flow     | Not applicable | Pass | No user-facing UI expected; Storybook shims are not runtime app UI. |
| DB/provider read-back | Not applicable | Pass | No database/provider change. |
| End-to-end proof      | `rg ...`; `pnpm --dir frontend exec knip --config knip.json --no-exit-code --no-progress --reporter compact \| rg '\\.storybook/mocks/(next-link\|next-navigation)\|next-link\|next-navigation' \|\| true`; `test ! -e ...` | Pass | No live references remain, Knip no longer reports the two mocks, and both files are absent. |

## Files Changed

- `docs/ops/tasks/2026-06-20-remove-storybook-next-mocks.md` - task done gate.
- `docs/ops/handoffs/2026-06-20-S72-remove-storybook-next-mocks.md` - handoff/evidence ledger.
- `docs/ops/orchestration/session-board.md` - S72 ownership row.
- `docs/ops/orchestration/review-queue.md` - S72 review row.
- `frontend/.storybook/mocks/next-link.tsx` - verified unused Storybook shim deletion target.
- `frontend/.storybook/mocks/next-navigation.ts` - verified unused Storybook shim deletion target.

## Risks / Gaps

- S70 also flags `frontend/src/App.tsx`, but it is not part of this task
  because `frontend/src/components/layouts/provider-component.tsx` still imports
  it.
- No unrelated failures observed in this slice.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
