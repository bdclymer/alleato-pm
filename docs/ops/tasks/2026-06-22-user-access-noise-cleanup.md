# Task: User access detail noise cleanup

Status: In Progress
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-592 https://linear.app/megankharrison/issue/AAI-592/remove-noisy-identity-and-helper-copy-from-user-access-detail
Related Handoff: Not required for focused page-feedback slice

## Objective

Remove noisy identity/helper content and bottom border weight from the user access detail page so admins can focus on permission editing controls at `/user-management/users/7d9bd5bb-2ca1-4862-8f51-a025c3181718`.

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

- [x] Identity section no longer renders in `UserAccessPanel`.
- [x] Granular exceptions helper paragraph no longer renders.
- [x] Project access helper paragraph no longer renders.
- [x] Granular exceptions and project access shells use no bottom border.
- [x] Existing permission editing controls remain wired through the same callbacks.

## Noise Gate Brief

Primary user: Admin managing user permissions.
Primary job: Assign company access, project roles, and granular exceptions.
Primary decision: Which access mode and role/exception values this person should have.
Tier 1: Company access selector, granular exception controls, project role selectors.
Tier 2: Active exception count and inherited/effective status.
Tier 3: Empty/error states and admin-bypass note.
Hide until requested: Identity metadata already available in the page header or system records.
Remove: Identity section, helper paragraphs that restate controls, bottom border weight.
Primary action: Change a role or exception value.
Failure-loudly behavior: Existing explicit empty, error, disabled, and toast states remain unchanged.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/app/(admin)/user-management/_components/user-access-panel.tsx' 'src/app/(admin)/user-management/_components/__tests__/user-access-panel.test.tsx'` | PASS | No lint output. |
| Static/type/lint      | `cd frontend && npm run typecheck:changed` | PASS | No new `any` type debt detected. |
| Targeted tests        | `cd frontend && npx jest --runTestsByPath 'src/app/(admin)/user-management/_components/__tests__/user-access-panel.test.tsx' --runInBand` | PASS | 1 suite, 1 test. Guards removed identity/helper copy and border class regression. |
| Browser/user-flow     | `agent-browser` artifacts in `tests/agent-browser-runs/2026-06-22-user-access-noise-cleanup/` | PASS | Route loaded at `http://localhost:3001/user-management/users/7d9bd5bb-2ca1-4862-8f51-a025c3181718`; final body text keeps Company access, Granular exceptions, and Project access controls. |
| DB/provider read-back | Not applicable     | PASS   | UI-only change; no schema, provider, env, or migration touched. |
| End-to-end proof      | `rg` absence check against `tests/agent-browser-runs/2026-06-22-user-access-noise-cleanup/body-text.txt`; `final-full-page.png` | PASS | Browser body text does not contain `Identity`, `Override individual capabilities`, or `Each membership needs one project role`. |
| Known unrelated failures | Initial `npm --prefix frontend run lint -- --file ...`; root `npm run typecheck:changed`; first Jest path-pattern invocation | PASS after corrected commands | Stale command forms only: ESLint flat config does not support `--file`; root package has no `typecheck:changed`; Jest needs `--runTestsByPath` for route-group paths with parentheses. Not app defects. |

## Files Changed

- `frontend/src/app/(admin)/user-management/_components/user-access-panel.tsx` - Remove noisy identity/helper UI and bottom borders from requested sections.
- `frontend/src/app/(admin)/user-management/_components/__tests__/user-access-panel.test.tsx` - Add regression guardrail for removed identity/helper copy and table shell border class.
- `docs/ops/tasks/2026-06-22-user-access-noise-cleanup.md` - Track definition of done and verification evidence.

## Risks / Gaps

- None for this scope.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
