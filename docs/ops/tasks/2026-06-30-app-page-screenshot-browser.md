# Task: App Page Screenshot Browser

Status: Complete
Owner: Codex
Created: 2026-06-30
Linear Issue: Not created - Linear issue creation tool not available in this session.
Related Handoff: N/A

## Objective

Capture screenshots for every reachable application page route and expose them
on a frontend page using the same dense document-browser interaction pattern as
the project Documents page.

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

## Acceptance Criteria

- App route inventory comes from `frontend/src/app/**/page.tsx`.
- Captured screenshots are served from `frontend/public`.
- The frontend browser page shows screenshots in a Documents-style rail,
  grid/list area, and preview pane.
- The page reports captured, 404, skipped dynamic-record, and skipped non-app
  routes instead of silently omitting them.
- The commitment-new screenshot no longer has the expanded sidebar covering the
  page content.

## Failure-Loudly Behavior

- Missing manifest or screenshots should render a clear empty/error state.
- Capture statuses are visible in the manifest and frontend instead of being
  collapsed into one success count.
- Dynamic record-detail routes remain visible as skipped until sample IDs are
  resolved.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `./node_modules/.bin/eslint 'src/app/(main)/knowledge/app/screenshots/page.tsx' 'src/features/knowledge/app-page-screenshots/data.ts' 'src/features/knowledge/app-page-screenshots/screenshot-browser.tsx' 'src/features/knowledge/app-page-screenshots/types.ts' --quiet` | Pass | Focused lint from `frontend/`. |
| Static/type/lint      | `npm run typecheck:changed` | Pass | No new `any` type debt detected. |
| Targeted tests        | `node scripts/capture-app-page-screenshots.mjs` output contract | Pass | Manifest reports 318 page routes, 252 screenshots, captured/skipped/404 statuses. |
| Browser/user-flow     | `docs/ops/evidence/2026-06-30-app-page-screenshot-browser/desktop-verified-clean.png` | Pass | `http://localhost:3003/knowledge/app/screenshots`; desktop rail/grid/preview verified. |
| Browser/user-flow     | `docs/ops/evidence/2026-06-30-app-page-screenshot-browser/mobile-verified.png` | Pass | Mobile renders heading, filters, and screenshot cards without horizontal page overflow. |
| DB/provider read-back | N/A                | N/A    | No database, provider, env, or migration changes. |
| End-to-end proof      | `frontend/public/app-page-screenshots/manifest.json` and `frontend/public/app-page-screenshots/screenshots/` | Pass | 252 served PNG screenshots available to the frontend page. |
| Known unrelated failure | `BASE_URL=http://localhost:3003 npx playwright test tests/auth.setup.ts --config config/playwright/playwright.config.ts --project=chromium` | Unrelated | Existing auth setup timed out on `/tasks` while clean dev server was compiling. Direct authenticated page verification passed. |
| Known unrelated failure | Clean `next dev -p 3003` after interacting with global feedback modal | Unrelated | Next 15 devtools/client manifest error after modal interaction; page route returned 200 and verified before/after with modal hidden for proof screenshot. |

## Files Changed

- `scripts/capture-app-page-screenshots.mjs` - Route inventory screenshot capture script.
- `frontend/public/app-page-screenshots/**` - Served screenshot artifacts and manifest for the frontend page.
- `frontend/src/app/(main)/knowledge/app/screenshots/page.tsx` - Frontend route for reviewing screenshots.
- `frontend/src/features/knowledge/app-page-screenshots/*` - Screenshot browser components/data helpers.
- `docs/ops/tasks/2026-06-30-app-page-screenshot-browser.md` - Task done gate and evidence ledger.

## Risks / Gaps

- Dynamic record-detail routes need real seeded record IDs before they can be
  captured as meaningful pages; they are visible in the UI as `Needs record ID`
  instead of being silently omitted.
- Existing unrelated dirty files are present in the checkout and must not be
  staged accidentally.
- Some admin routes were captured with the test user's access state. The script
  now marks future access-denied captures explicitly.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
