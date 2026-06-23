# Task: Add Edit layout option to site-map

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - current Linear connector exposes comment/document tools only, not issue creation.
Related Handoff: N/A

## Objective

Make `/site-map?tab=form-pages&page=1` support `Edit` as a first-class Layout option so edit routes can be classified, filtered, grouped, bulk-edited, and edited in the detail panel separately from generic form pages.

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

- `Edit` appears anywhere the site-map Layout enum/options are rendered.
- Routes ending in `/edit` infer `Layout = Edit`.
- `Form Pages` still includes edit routes.
- Selecting, filtering, grouping, and bulk-setting Layout all use the same `LAYOUTS` source of truth.
- Failure-loudly behavior: TypeScript rejects any future option not included in `InventoryLayout`; route inference returns the explicit `Edit` layout instead of silently merging edit pages into `Form`.

## Files To Change

- `frontend/src/app/(admin)/site-map/site-map-client.tsx` - add `Edit` to the canonical layout type/options used by filters, table cells, bulk edit, and side panel.
- `frontend/src/app/(admin)/site-map/page.tsx` - infer `/edit` routes as `Edit`.
- `docs/ops/tasks/2026-06-22-sitemap-edit-layout-option.md` - task ledger.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/app/(admin)/site-map/site-map-client.tsx' 'src/app/(admin)/site-map/page.tsx' 'src/app/(admin)/site-map/__tests__/layout-options.test.ts'`; `git diff --check -- 'frontend/src/app/(admin)/site-map/site-map-client.tsx' 'frontend/src/app/(admin)/site-map/page.tsx' 'frontend/src/app/(admin)/site-map/__tests__/layout-options.test.ts' docs/ops/tasks/2026-06-22-sitemap-edit-layout-option.md` | Pass | No lint or whitespace output. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath 'src/app/(admin)/site-map/__tests__/layout-options.test.ts' --runInBand` | Pass | 1 suite, 1 test passed. |
| Browser/user-flow     | `frontend/tests/agent-browser-runs/2026-06-22-sitemap-edit-layout-option/VERIFICATION_SUMMARY.md`; `frontend/tests/agent-browser-runs/2026-06-22-sitemap-edit-layout-option/site-map-edit-layout-option.png` | Pass | Authenticated `/site-map?tab=form-pages&page=1`, verified `/invoice/edit` renders `Layout = Edit`, and the row Layout selector includes selected `Edit`. |
| DB/provider read-back | N/A | Pass | No database, migration, provider, or env change. |
| End-to-end proof      | `agent-browser --session sitemap-edit-layout eval "(() => { const rows=[...document.querySelectorAll('tr')]; const row=rows.find(r=>r.innerText.includes('/invoice/edit')); return row ? row.innerText : 'NOT_FOUND'; })()"` | Pass | Row text included `/invoice/edit`, `Workflow`, and `Edit`. |

## Files Changed

- `frontend/src/app/(admin)/site-map/site-map-client.tsx` - add `Edit` to the canonical layout type/options used by filters, table cells, bulk edit, and side panel.
- `frontend/src/app/(admin)/site-map/page.tsx` - infer `/edit` routes as `Edit`.
- `frontend/src/app/(admin)/site-map/__tests__/layout-options.test.ts` - guard the canonical option and inference contract.
- `docs/ops/tasks/2026-06-22-sitemap-edit-layout-option.md` - task ledger.
- `frontend/tests/agent-browser-runs/2026-06-22-sitemap-edit-layout-option/VERIFICATION_SUMMARY.md` - browser verification notes.
- `frontend/tests/agent-browser-runs/2026-06-22-sitemap-edit-layout-option/site-map-edit-layout-option.png` - browser verification screenshot.

## Risks / Gaps

- Linear issue creation is unavailable from the exposed connector set in this session.
- The checkout contains substantial unrelated dirty work; this task must only claim the sitemap layout option and task file.
- Existing staged sitemap detail-panel edits predated this task; this task did not revert or claim those changes.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
