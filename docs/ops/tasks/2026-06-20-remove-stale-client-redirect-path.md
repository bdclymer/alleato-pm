# Task: Remove Stale Client Redirect Path

Status: Complete
Owner: Codex
Created: 2026-06-20
Linear Issue: AAI-575 - https://linear.app/megankharrison/issue/AAI-575/remove-unused-stale-clientredirect-permission-path
Related Handoff: docs/ops/handoffs/2026-06-20-S74-remove-stale-client-redirect-path.md

## Objective

Remove the unused `ClientRedirect` permission path and its `useIsClient` hook
after proving active client access is owned by server-side project membership
checks and the client dashboard route. Update stale documentation so future work
does not reason against a dead permission wrapper.

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
| Browser/user-flow     | Not applicable | Pass | No frontend surface should change; this removes unused client code. |
| DB/provider read-back | Not applicable | Pass | No database/provider change. |
| End-to-end proof      | `rg ...`; `pnpm --dir frontend exec knip --config knip.json --no-exit-code --no-progress --reporter compact \| rg 'src/components/auth/client-redirect\\.tsx\|src/hooks/use-is-client\\.ts\|client-redirect\|use-is-client' \|\| true`; `test ! -e ...` | Pass | No live imports remain, Knip no longer reports the two files, and both files are absent. |
| Publish proof         | `npm run codex:finish -- --message "Remove stale client redirect path" --files ...` | Pass | Published implementation to `origin/main` at `f2885f0539`. |

## Files Changed

- `docs/ops/tasks/2026-06-20-remove-stale-client-redirect-path.md` - task done gate.
- `docs/ops/handoffs/2026-06-20-S74-remove-stale-client-redirect-path.md` - handoff/evidence ledger.
- `docs/ops/orchestration/session-board.md` - S74 ownership row.
- `docs/ops/orchestration/review-queue.md` - S74 review row.
- `frontend/src/components/auth/client-redirect.tsx` - stale unused redirect wrapper deletion target.
- `frontend/src/hooks/use-is-client.ts` - stale unused hook deletion target.
- `docs/directory-auth-permissions.md` - replace stale active `ClientRedirect` claims with current ownership.
- `docs/project-overview/component-inventory.md` - remove stale `use-is-client` row.
- `docs/reports/route-inventory.csv` - remove stale dependency entries for deleted `client-redirect.tsx`.
- `docs/ops/tasks/2026-06-20-remove-legacy-client-contact-components.md` - update S73 deferral note now that S74 owns the permission cleanup.
- `docs/ops/handoffs/2026-06-20-S73-remove-legacy-client-contact-components.md` - update S73 deferral note now that S74 owns the permission cleanup.

## Risks / Gaps

- This removes an unused client-side wrapper, not the active server-side project
  membership guard or the client dashboard route guard.
- Existing unrelated worktree dirt is out of scope and must not be staged.
- Existing generated `frontend/src/components/dev-tools/db-inventory.generated.json`
  has unrelated local changes and still contains scanned references; it is not
  touched in this slice.
- Remaining references to the removed path are historical S73/S74 documentation
  notes and the S74 permissions-doc correction that explicitly says the old path
  was removed.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
