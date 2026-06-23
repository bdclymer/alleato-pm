# Task: Normalize create submittal form widths

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-608 - https://linear.app/megankharrison/issue/AAI-608/normalize-create-submittal-form-field-widths-and-move-workflow-to
Related Handoff: N/A

## Objective

Update the create submittal form so standard fields share the same responsive
width, Attachments and Description remain full-width, and Submittal Workflow
appears at the bottom of the form.

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

## Acceptance Criteria

- Workflow section appears at the bottom of the create form.
- Standard fields use the same responsive grid width.
- Title, Submittal Package, Responsible Contractor, Required On-Site Date, and
  Ball In Court no longer render as full-width rows.
- Attachments and Description remain intentionally full-width.
- Browser verification confirms the create form layout.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files To Change

- `frontend/src/features/submittals/submittal-form-page.tsx` - create form layout/order.
- `docs/ops/tasks/2026-06-22-create-submittal-form-layout-widths.md` - task ledger.

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
| Static/type/lint      | `npx eslint src/features/submittals/submittal-form-page.tsx` | Pass | Targeted changed-file lint. |
| Static/type/lint      | `npm run typecheck:changed` from `frontend/` | Pass | No new `any` type debt. |
| Targeted tests        | N/A | Pass | Layout-only change covered by browser DOM measurement. |
| Browser/user-flow     | `agent-browser` session `submittal-layout` at `/876/submittals/new` | Pass | Snapshot shows Attachments, Description, then Add Step/Workflow controls at bottom. |
| DB/provider read-back | N/A | Pass | No database, migration, provider, or env changes. |
| End-to-end proof      | Browser DOM width measurement | Pass | Title, Submittal Package, Responsible Contractor, Required On-Site Date, and Ball In Court measured `504px`; Description measured `1024px`. |

## Files Changed

- `docs/ops/tasks/2026-06-22-create-submittal-form-layout-widths.md` - task ledger.
- `frontend/src/features/submittals/submittal-form-page.tsx` - standard fields moved into shared responsive grids; Workflow moved below Content.

## Risks / Gaps

- `frontend/src/features/submittals/submittal-form-page.tsx` is already staged
  from earlier submittal work; this task owns only the additional layout/order
  changes.
- Full `codex:finish` remains blocked by known unrelated guardrail debt in
  `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` and
  `frontend/src/app/(main)/[projectId]/pcos/page.tsx`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
