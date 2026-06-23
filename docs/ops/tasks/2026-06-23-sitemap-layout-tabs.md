# Task: Split site-map layout tabs

Status: Complete
Owner: Codex
Created: 2026-06-23
Linear Issue: Not created - current Linear connector exposes comment/document tools only, not issue creation.
Related Handoff: N/A

## Objective

Update `/site-map` so layout-specific tabs are exact: `Table Pages` only shows routes with `layout = Table`, `Form Pages` only shows routes with `layout = Form`, and separate `Detail Pages` and `Edit Pages` tabs show routes with `layout = Detail` and `layout = Edit`.

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

- `Detail Pages` and `Edit Pages` render as top-level site-map tabs.
- `Table Pages` includes only page routes whose `layout` is `Table`.
- `Form Pages` includes only page routes whose `layout` is `Form`.
- `Edit Pages` includes only page routes whose `layout` is `Edit`.
- `Detail Pages` includes only page routes whose `layout` is `Detail`.
- Failure-loudly behavior: the tab contract is covered by a focused unit test that fails if the tab labels disappear or tab matching returns to route/type heuristics.

## Files To Change

- `frontend/src/app/(admin)/site-map/site-map-client.tsx` - add layout tabs and exact layout tab matching.
- `frontend/src/app/(admin)/site-map/__tests__/layout-options.test.ts` - extend the tab contract guardrail.
- `docs/ops/tasks/2026-06-23-sitemap-layout-tabs.md` - task ledger.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/app/(admin)/site-map/site-map-client.tsx' 'src/app/(admin)/site-map/__tests__/layout-options.test.ts'`; `git diff --check -- 'frontend/src/app/(admin)/site-map/site-map-client.tsx' 'frontend/src/app/(admin)/site-map/__tests__/layout-options.test.ts' docs/ops/tasks/2026-06-23-sitemap-layout-tabs.md` | Pass | No lint or whitespace output. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath 'src/app/(admin)/site-map/__tests__/layout-options.test.ts' --runInBand` | Pass | 1 suite, 2 tests passed. |
| Browser/user-flow     | `frontend/tests/agent-browser-runs/2026-06-23-sitemap-layout-tabs/VERIFICATION_SUMMARY.md`; `frontend/tests/agent-browser-runs/2026-06-23-sitemap-layout-tabs/edit-pages-tab.png` | Pass | Authenticated `/site-map`; verified `Detail Pages` and `Edit Pages` tabs render and sampled rows in Table/Form/Detail/Edit tabs match the selected layout only. |
| DB/provider read-back | N/A | Pass | No database, migration, provider, or env change. |
| End-to-end proof      | DOM row extraction across `table-pages`, `form-pages`, `detail-pages`, and `edit-pages` | Pass | Sampled visible rows returned only `Table`, `Form`, `Detail`, and `Edit` respectively. |

## Files Changed

- `frontend/src/app/(admin)/site-map/site-map-client.tsx` - add `Detail Pages` and `Edit Pages` tabs; make Table/Form/Detail/Edit tabs match exact `route.layout`.
- `frontend/src/app/(admin)/site-map/__tests__/layout-options.test.ts` - guard the strict layout tab contract.
- `docs/ops/tasks/2026-06-23-sitemap-layout-tabs.md` - task ledger.
- `frontend/tests/agent-browser-runs/2026-06-23-sitemap-layout-tabs/VERIFICATION_SUMMARY.md` - browser verification notes.
- `frontend/tests/agent-browser-runs/2026-06-23-sitemap-layout-tabs/edit-pages-tab.png` - browser verification screenshot.

## Risks / Gaps

- Linear issue creation is unavailable from the exposed connector set in this session.
- The checkout contains substantial unrelated dirty work; this task must only claim the sitemap tab contract.
- Existing staged sitemap detail-panel edits predate this task and are not owned by this task.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
