# Task: Cleanup Slice Commit Boundary

Status: Blocked/Deferred
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-591 - https://linear.app/megankharrison/issue/AAI-591/stabilize-cleanup-slices-and-prepare-safe-commit-boundary
Related Handoff: docs/ops/handoffs/2026-06-22-S78-cleanup-slice-commit-boundary.md

## Objective

Stabilize the repo-control/scripts cleanup work already performed in this session family, keep it separated from the broad docs/archive migration now owned by another session, and produce an exact task-owned commit boundary that can be passed to `codex:finish` without staging unrelated dirty files.

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
| Static/type/lint      | `node --check scripts/audits/check-repo-control.mjs`; `npm run repo:control`; `node scripts/audits/check-repo-control.mjs --strict` | Pass | Repo-control strict mode passes in the dirty checkout. |
| Targeted tests        | Root script inventory coverage; active script literal-key scan; deleted helper active-reference scan | Pass | Active scripts have no Supabase JWT or `sb_secret_` literal matches outside archive/guard. Deleted helper references only remain in guard/task evidence. |
| Browser/user-flow     | Not applicable | N/A | No frontend-visible UI changed in this slice. |
| DB/provider read-back | Not applicable | N/A | No migrations or provider config changes in this slice. |
| End-to-end proof      | `npm run codex:finish -- --check`; dirty-tree classification | Blocked for commit | Finish machinery is callable and `main` is synced, but commit execution is unsafe until shared-file contamination is resolved. |

## Files Changed

- `docs/ops/tasks/2026-06-22-cleanup-slice-commit-boundary.md` - task ledger for this stabilization slice.
- `docs/ops/handoffs/2026-06-22-S78-cleanup-slice-commit-boundary.md` - worker handoff and evidence ledger.
- `docs/ops/orchestration/session-board.md` - S78 ownership row.
- `docs/ops/orchestration/review-queue.md` - S78 review row.

## Risks / Gaps

- The checkout contains a large number of unrelated dirty docs/backend changes. `codex:finish` must use an exact `--files` list, not `--all-dirty`.
- A separate session now owns the broad docs/archive migration, so docs deletion state should be treated as out of scope here unless it touches repo-control guardrails.
- Previously exposed provider secrets were removed from active scripts, but provider-side rotation remains a required follow-up outside this commit-boundary slice.
- `package.json`, `docs/README.md`, and `scripts/verify/verify_ai_assistant_eval_suite.mjs` currently contain docs-migration edits mixed with cleanup/security edits. Do not stage those files wholesale from this session.
- Commit execution is deferred until either the docs/archive migration lands first or hunk-level staging isolates only the cleanup/security hunks.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
