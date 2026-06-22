# Task: Separate Sitemap Pages And API Tabs

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-588 - https://linear.app/megankharrison/issue/AAI-588/separate-sitemap-route-inventory-into-pages-and-api-tabs
Related Handoff: N/A

## Objective

Update the internal `/site-map` Page Access table so frontend page routes and API routes are visible in separate tabs while continuing to share the same generated route inventory table.

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

- [x] `/site-map` has separate top-level tabs for All, Pages, API, Table Pages, Form Pages, Project Pages, and Needs Review.
- [x] Existing route-type filters continue to work against page routes.
- [x] API routes are not described as generated pages in the table header copy.
- [x] Search, filters, grouping, details panel, and selection continue to operate on the active tab dataset.
- [x] The change uses the existing `UnifiedTablePage` and local sitemap route inventory shape.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files To Change

- `frontend/src/app/(admin)/site-map/site-map-client.tsx` - add API/page tabs and route-kind-aware copy.
- `frontend/src/app/api/admin/eval-runs/route.ts` - unblock finish guardrail by making existing eval-run filesystem fallbacks report warnings instead of silent catches.
- `docs/ops/tasks/2026-06-22-sitemap-pages-api-tabs.md` - task ledger and verification evidence.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior, or targeted static validation recorded.
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
| Static/type/lint      | `cd frontend && npx eslint 'src/app/(admin)/site-map/site-map-client.tsx'`; `cd frontend && npx eslint 'src/app/(admin)/site-map/site-map-client.tsx' 'src/app/api/admin/eval-runs/route.ts'` | Pass | No lint output. |
| Targeted tests        | `node` CSV count check against `docs/reports/route-inventory.csv`; `git diff --check -- 'frontend/src/app/(admin)/site-map/site-map-client.tsx' docs/ops/tasks/2026-06-22-sitemap-pages-api-tabs.md` | Pass | Existing inventory split: `all=387`, `pages=174`, `api=211`; no whitespace errors. |
| Browser/user-flow     | `agent-browser` against `http://localhost:3001/site-map`; screenshots in `frontend/tests/agent-browser-runs/2026-06-22-sitemap-pages-api-tabs/` | Pass | Verified All, Pages, and API tabs render; API tab shows `/api/...` rows and excludes page row; Pages tab shows page row and excludes `/api/...` row. |
| DB/provider read-back | N/A | Pass | No database, provider, migration, or env changes. |
| End-to-end proof      | `frontend/tests/agent-browser-runs/2026-06-22-sitemap-pages-api-tabs/all-tab.png`, `api-tab.png`, `pages-tab.png` | Pass | Authenticated browser verification on the existing local dev server at port 3001. |

## Files Changed

- `docs/ops/tasks/2026-06-22-sitemap-pages-api-tabs.md` - task definition and evidence.
- `frontend/src/app/(admin)/site-map/site-map-client.tsx` - route-kind-aware Pages/API/Form tabs and active tab count copy.
- `frontend/src/app/api/admin/eval-runs/route.ts` - structured warnings for eval-run filesystem fallback failures so `codex:finish` guardrails fail loudly.

## Risks / Gaps

- The underlying `docs/reports/route-inventory.csv` may be stale; this task changes how the existing inventory is viewed, not how it is generated.
- The checkout has substantial unrelated dirty files owned by other work; this task owns only the sitemap client and this task ledger.
- `codex:finish` initially blocked on an unrelated silent-catch guardrail in `frontend/src/app/api/admin/eval-runs/route.ts`; only the catch diagnostics are staged for this task, while the preexisting import edit in that file remains unstaged.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
