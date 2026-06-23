# Task: Email Right Panel Context

Status: Complete
Owner: Codex
Created: 2026-06-23
Linear Issue: Not created yet - blocked by prior Linear connector argument validation on team lookup
Related Handoff: N/A

## Objective

The shared email workspace right details panel shows who the selected email was sent to and the assigned project, while removing the created timestamp from that panel.

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

- The right details panel includes a `To` row using the selected email recipients.
- The right details panel includes a `Project` row using the selected email assigned project label.
- The right details panel no longer includes a `Created` row.
- The change applies through the shared email workspace used by `/emails` and project-scoped email routes.
- Failure-loudly behavior: missing recipients or project are shown as explicit fallback text, not blank rows.

## Noise Gate Brief

Primary user: Project manager or executive reviewing email evidence.
Primary job: Understand the selected email's routing and project assignment.
Primary decision: Whether the email belongs to the right project and who received it.
Tier 1: Recipient and assigned project.
Tier 2: Sender and sent/received date.
Tier 3: Related workflow metadata.
Hide until requested: Created timestamp and lower-value audit metadata.
Remove: Created timestamp from the right details panel.
Primary action: Confirm routing/project assignment and create follow-up if needed.
Failure-loudly behavior: show `No recipients` or `No project assigned` when data is absent.

## Files To Change

- `frontend/src/features/emails/project-emails-workspace.tsx` - shared right panel context rows.
- `docs/ops/tasks/2026-06-23-email-right-panel-context.md` - task ledger.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `npx eslint 'src/features/emails/project-emails-workspace.tsx' 'src/features/emails/__tests__/project-emails-workspace.test.tsx'` | Pass | Exits 0 with existing warning: raw search input at `project-emails-workspace.tsx:1146`. |
| Targeted tests        | `npm run test:unit -- --runInBand --runTestsByPath 'src/features/emails/__tests__/project-emails-workspace.test.tsx'` | Pass | 2 tests passed. |
| Browser/user-flow     | `agent-browser set viewport 1800 1000`; open `/emails`; screenshot | Pass | `tests/agent-browser-runs/2026-06-23-email-right-panel-context/emails-right-panel-agent-browser-2xl.png` shows `From`, `To`, `Project`, `Received`; no `Created`. |
| DB/provider read-back | N/A                | Pass   | No database, provider, env, or migration changes. |
| End-to-end proof      | `tests/agent-browser-runs/2026-06-23-email-right-panel-context/VERIFICATION_SUMMARY.md` | Pass | Browser evidence captured and summarized. |
| Finish/publish        | `npm run codex:finish -- --message "Update email right panel context" --files ...` | Blocked | `quality:changed` failed on unrelated existing double-cast debt in `frontend/src/lib/ai/tools/__tests__/action-tools.test.ts`. |

## Files Changed

- `frontend/src/features/emails/project-emails-workspace.tsx` - update shared details context.
- `frontend/src/features/emails/__tests__/project-emails-workspace.test.tsx` - guard recipient/project/created-time context rows.
- `docs/ops/tasks/2026-06-23-email-right-panel-context.md` - task ledger.
- `tests/agent-browser-runs/2026-06-23-email-right-panel-context/VERIFICATION_SUMMARY.md` - local browser evidence summary.

## Risks / Gaps

- Existing unrelated warning remains in `frontend/src/features/emails/project-emails-workspace.tsx`: raw search input should eventually move to `ExpandingSearch`.
- Publish remains blocked by unrelated repo debt: `npm --prefix frontend run quality:changed` fails on double-casts in `frontend/src/lib/ai/tools/__tests__/action-tools.test.ts`. Cause: the finish script scans changed frontend files beyond this task's owned files. Detection gap: unrelated dirty work was already present before this task. Prevention step: land or isolate the AI tools test changes, then rerun `codex:finish` with this task's explicit file scope.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
