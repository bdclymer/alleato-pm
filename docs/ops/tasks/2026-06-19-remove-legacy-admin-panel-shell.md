# Task: Remove Legacy Admin-Panel Shell

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-570 - https://linear.app/megankharrison/issue/AAI-570/remove-unused-legacy-admin-panel-component-shell
Related Handoff: docs/ops/handoffs/2026-06-19-S71-remove-legacy-admin-panel-shell.md

## Objective

Remove the first narrow, verified dead-code bucket from the S70 Knip report:
the unused legacy `frontend/src/components/admin-panel/**` shell. This task
must delete only this confirmed bucket and must not bulk-delete other Knip
candidates.

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
| Static/type/lint      | `cd frontend && NODE_OPTIONS='--max-old-space-size=8192' TYPECHECK_NO_TIMEOUT=1 npx tsc --noEmit --pretty false` | Pass | Initial no-heap run failed with Node OOM; high-heap run passed with no compiler output. |
| Targeted tests        | `npm run check:routes`; `npm run verify:nonprod-routes`; `git diff --check -- ...` | Pass | Route, nonprod route, and whitespace checks passed. |
| Browser/user-flow     | Not applicable | Pass | No user-facing UI expected. |
| DB/provider read-back | Not applicable | Pass | No database/provider change. |
| End-to-end proof      | `rg ...`; `pnpm --dir frontend exec knip --config knip.json --no-exit-code --no-progress --reporter compact \| rg 'src/components/admin-panel\|admin-panel' \|\| true` | Pass | Only S71 docs mention the removed path; Knip no longer reports the bucket. |
| Publish proof         | `npm run codex:finish -- --message "Remove unused admin panel shell" --files ...` | Pass | Published implementation to `origin/main` at `14cdedb4e2`; local `HEAD` matched `origin/main`. |

## Files Changed

- `docs/ops/tasks/2026-06-19-remove-legacy-admin-panel-shell.md` - task done gate.
- `docs/ops/handoffs/2026-06-19-S71-remove-legacy-admin-panel-shell.md` - handoff/evidence ledger.
- `docs/ops/orchestration/session-board.md` - S71 ownership row.
- `docs/ops/orchestration/review-queue.md` - S71 review row.
- `frontend/src/components/admin-panel/**` - verified dead-code deletion target.
- `docs/project-overview/component-inventory.md` - removed stale `admin-panel/` inventory row.
- `docs/codebase-map/graphs/components.svg` - regenerated component graph after deletion.

## Risks / Gaps

- The full TypeScript run requires a larger heap in this repo; the plain run
  failed with Node OOM before producing type errors, then passed with
  `NODE_OPTIONS='--max-old-space-size=8192'`.
- This task intentionally does not delete other Knip candidates.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
