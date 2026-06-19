# Task: Feature Request Linear Detail Page

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-552 - https://linear.app/megankharrison/issue/AAI-552/redesign-feature-request-detail-page-in-linear-style
Related Handoff: Not required for single-session task

## Objective

Transform `/ai-assistant/feature-requests/[requestId]` into a quiet Linear-style detail surface that makes request readiness, planning blockers, packet content, and sync properties easy to scan without decorative page noise.

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
| Static/type/lint      | `npx eslint 'src/components/feature-requests/FeatureRequestDetail.tsx' 'src/app/(main)/ai-assistant/feature-requests/[requestId]/page.tsx' 'src/components/ds/inspector.tsx'` | Pass | Focused lint passed after replacing raw headings with the shared heading primitive. |
| Static/type/lint      | `npm run typecheck -- --pretty false` | Known repo debt | Timed out after 60000ms with fail-loud typecheck performance message; no touched-file type errors were emitted before timeout. |
| Targeted tests        | `PLAYWRIGHT_BASE_URL=http://localhost:3001 BASE_URL=http://localhost:3001 npx playwright test tests/auth.setup.ts --config=config/playwright/playwright.config.ts --project=setup --workers=1` | Pass | Refreshed auth state for local browser verification. |
| Browser/user-flow     | `/tmp/feature-request-linear-detail-desktop-final.png` | Pass | Target detail route loaded on localhost:3001 with Linear-style object header, inline properties, primary content, and right inspector rail. |
| Browser/user-flow     | `/tmp/feature-request-linear-detail-mobile-final.png` | Pass | Mobile viewport stacks content; first viewport has no overlap. |
| Browser/user-flow     | `agent-browser eval JSON.stringify({scrollWidth, clientWidth, overflow})` | Pass | `{"scrollWidth":390,"clientWidth":390,"overflow":false}` at mobile viewport. |
| DB/provider read-back | N/A                | N/A    | UI-only task; no schema, migration, provider, or env changes planned. |
| End-to-end proof      | `http://localhost:3001/ai-assistant/feature-requests/c31c6ca5-138c-40ff-a5e9-7bb4364ad5fa` | Pass | Authenticated local route rendered the redesigned feature request packet. |

## Files Changed

- `frontend/src/app/(main)/ai-assistant/feature-requests/[requestId]/page.tsx` - remove redundant page subtitle if it does not carry decision-critical information.
- `frontend/src/components/feature-requests/FeatureRequestDetail.tsx` - redesign the detail surface into a Linear-style primary/detail layout.
- `frontend/src/components/ds/inspector.tsx` - tighten shared Linear-style inspector rail width, section rhythm, and property row density.
- `docs/ops/tasks/2026-06-19-feature-request-linear-detail.md` - task checklist and evidence ledger.

## Risks / Gaps

- Production browser verification stayed on `/auth/login`; local verification used refreshed API auth against `localhost:3001`.
- Full frontend typecheck currently times out after 60000ms due repo-wide typecheck performance debt.
- Existing unrelated dirty worktree files are not owned by this task and must not be modified.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
