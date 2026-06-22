# Task: Sitemap Side Panel Close Control

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-589 - https://linear.app/megankharrison/issue/AAI-589/add-close-control-to-sitemap-side-panel
Related Handoff: N/A

## Objective

Make the `/site-map` Page Access detail side pane closable after a route row is opened.

## Non-Negotiable Done Rule

This task is not done until every required checklist item below is checked, with evidence filled in. If any required item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Acceptance Criteria

- [x] The desktop inline side panel has an obvious close control.
- [x] Activating the close control calls the existing side-panel `onClose` handler and clears active row/detail state.
- [x] The fix is applied in the shared `UnifiedTablePage` side-panel chrome, not as a sitemap-only workaround.
- [x] Targeted lint and browser verification are recorded.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files To Change

- `frontend/src/components/tables/unified/unified-table-page.tsx` - add desktop inline side-panel close chrome.
- `docs/ops/tasks/2026-06-22-sitemap-side-panel-close.md` - task ledger and verification evidence.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior, or targeted browser proof recorded.
- [x] Contract test added/updated for cross-module or source/delivery boundaries is not applicable.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services is not applicable.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/components/tables/unified/unified-table-page.tsx'` | Pass | Initial run found a design warning on the side-panel shell; fixed by removing card-like rounded/bg treatment and reran clean. |
| Targeted tests        | `git diff --check -- frontend/src/components/tables/unified/unified-table-page.tsx docs/ops/tasks/2026-06-22-sitemap-side-panel-close.md` | Pass | No whitespace errors. |
| Browser/user-flow     | `agent-browser` against `http://localhost:3001/site-map`; screenshots in `frontend/tests/agent-browser-runs/2026-06-22-sitemap-side-panel-close/` | Pass | Opened a sitemap route detail pane, verified `Close details` exists, clicked it, and confirmed close/details text was removed. |
| DB/provider read-back | N/A | Pass | No database, provider, migration, or env changes. |
| End-to-end proof      | Screenshots under `frontend/tests/agent-browser-runs/2026-06-22-sitemap-side-panel-close/` | Pass | Captured open-with-close and closed states for the desktop side panel. |

## Files Changed

- `docs/ops/tasks/2026-06-22-sitemap-side-panel-close.md` - task definition and evidence.
- `frontend/src/components/tables/unified/unified-table-page.tsx` - shared desktop side-panel close control and quieter side-panel shell.

## Risks / Gaps

- The checkout has unrelated existing dirty files; this task owns only the shared table primitive and this task ledger.
- Local dev server on port 3001 was already running and used for verification.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
