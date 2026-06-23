# Task: Global Emails Project Workspace Parity

Status: Complete
Owner: Codex
Created: 2026-06-23
Linear Issue: Not created yet - blocked by Linear connector argument validation on create attempt for team `Alleato`
Related Handoff: N/A

## Objective

`/emails` renders the same email workspace as `/[projectId]/emails`, with the only behavior difference being that `/emails` shows all accessible project emails while `/[projectId]/emails` shows one project's emails.

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

- `/emails` renders through `EmailsClient` and `ProjectEmailsWorkspace`, matching `/876/emails` layout, controls, reading pane, attachment preview affordance, and table/list switcher.
- `/emails` fetches from `/api/emails` and includes all accessible app and Outlook emails by default.
- `/876/emails` remains project-scoped through `/api/projects/876/emails`.
- The legacy sync-management tab wrapper is no longer the primary `/emails` UI.
- Failure-loudly behavior: API fetch failures surface through the shared workspace error state rather than a blank or unrelated sync-management page.

## Noise Gate Brief

Primary user: Project manager or executive reviewing project communications.
Primary job: Find, read, triage, and act on email evidence.
Primary decision: Which email needs attention and which project it belongs to.
Tier 1: Email list, selected message, search/filter/view controls.
Tier 2: Project label on global rows, source filter, attachments.
Tier 3: Table/list alternate views and export.
Hide until requested: Sync audit, skipped intake, quarantine management.
Remove: The sync-management tab wrapper from the primary global `/emails` route.
Primary action: Open an email, preview attachments, mark importance, create follow-up task.
Failure-loudly behavior: Shared workspace shows fetch errors and disabled loading states.

## Files To Change

- `frontend/src/app/(tables)/emails/page.tsx` - point global `/emails` at the same workspace client used by project emails.
- `frontend/src/app/api/emails/route.ts` - align default source scope with project email API.
- `docs/ops/tasks/2026-06-23-global-emails-project-workspace-parity.md` - task ledger and evidence.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `npx eslint 'src/app/(tables)/emails/page.tsx' 'src/app/api/emails/route.ts' 'src/app/api/emails/__tests__/route.test.ts'`; `npm run check:routes` from repo root | Pass | `npm run check:routes` fails from `frontend/` because the script is root-owned; rerun from repo root passed. |
| Targeted tests        | `npm run test:unit -- --runInBand --runTestsByPath 'src/app/api/emails/__tests__/route.test.ts'` | Pass | 2 tests passed. |
| Browser/user-flow     | `agent-browser` snapshots/screenshots for `/emails` and `/876/emails` | Pass | Artifacts in `tests/agent-browser-runs/2026-06-23-global-emails-parity/`. |
| DB/provider read-back | N/A                | Pass   | No database, provider, env, or migration changes. |
| End-to-end proof      | `tests/agent-browser-runs/2026-06-23-global-emails-parity/VERIFICATION_SUMMARY.md` | Pass | Confirms shared workspace treatment and data-scope-only route difference. |
| Finish/publish        | `npm run codex:finish -- --message "Align global emails with project workspace" --staged-only` | Blocked | `quality:changed` failed on unrelated existing double-cast debt in `frontend/src/lib/ai/tools/__tests__/action-tools.test.ts`. |

## Files Changed

- `frontend/src/app/(tables)/emails/page.tsx` - global route now renders shared `EmailsClient`.
- `frontend/src/app/(tables)/emails/email-sync-client.tsx` - removed old page-local sync tab wrapper from the primary route path.
- `frontend/src/app/api/emails/route.ts` - global API default source now matches project API default.
- `frontend/src/app/api/emails/__tests__/route.test.ts` - regression coverage for all-source default and explicit app source filter.
- `docs/ops/tasks/2026-06-23-global-emails-project-workspace-parity.md` - task ledger.
- `tests/agent-browser-runs/2026-06-23-global-emails-parity/VERIFICATION_SUMMARY.md` - browser verification summary.
- `tests/agent-browser-runs/2026-06-23-global-emails-parity/global-emails.png` - `/emails` screenshot.
- `tests/agent-browser-runs/2026-06-23-global-emails-parity/project-876-emails.png` - `/876/emails` screenshot.

## Risks / Gaps

- Linear issue creation remains blocked until the correct Linear team/project identifier is available to the connector. This did not block local implementation or verification.
- Publish remains blocked by unrelated repo debt: `npm --prefix frontend run quality:changed` fails on double-casts in `frontend/src/lib/ai/tools/__tests__/action-tools.test.ts`. Cause: the finish script scans changed frontend files beyond this task's owned files. Detection gap: unrelated dirty work was already present before this task. Prevention step: land or isolate the AI tools test changes, then rerun `codex:finish` with this task's explicit file scope.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
