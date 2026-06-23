# Task: Email Table Side Panel Mail Parity

Status: Complete
Owner: Codex
Created: 2026-06-23
Linear Issue: Not created yet - blocked by prior Linear connector argument validation on team lookup
Related Handoff: N/A

## Objective

The `/emails` table-view side panel uses the same selected-email panel component, formatting, attachment preview behavior, and actions as the center panel in mail view.

## Acceptance Criteria

- Table view side panel no longer uses the older `EmailDetailPanel` formatting.
- Mail view center panel and table view side panel render through one shared component.
- Shared panel includes the same header fields, attachment preview/type/download controls, summarize, project assignment, importance, and create-task actions.
- The layout-specific wrapper can differ, but the email content/action surface must be shared.
- Failure-loudly behavior: missing selected email renders the shared empty state instead of an inconsistent panel.

## Noise Gate Brief

Primary user: Project manager triaging emails across mail/table views.
Primary job: Read and act on a selected email without losing context.
Primary decision: Which message needs action and which project/type it belongs to.
Tier 1: Subject, sender, recipient, project, body, attachments, action bar.
Tier 2: Summary and task creation.
Tier 3: Details sheet and delete/edit actions when allowed.
Hide until requested: legacy side-panel-only formatting.
Remove: Duplicate table-specific email detail panel treatment.
Primary action: Review the email, preview attachments, classify attachments, assign project, summarize, mark importance, create task.
Failure-loudly behavior: shared component owns empty and disabled states consistently.

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Static/type/lint | `cd frontend && npx eslint 'src/app/(main)/[projectId]/emails/emails-client.tsx' 'src/features/emails/project-emails-workspace.tsx' 'src/components/tables/unified/unified-table-page.tsx'` | Pass | Existing `design-system/no-raw-search-input` warning remains in the pre-existing email search input. |
| Targeted tests | `cd frontend && npm run test:unit -- --runInBand --runTestsByPath 'src/features/emails/__tests__/project-emails-workspace.test.tsx'` | Pass | 2 tests passed. |
| Browser/user-flow | `tests/agent-browser-runs/2026-06-23-email-table-side-panel-mail-parity/table-side-panel-selected.png` | Pass | Table row selection opens a mail-formatted side panel with From, To, Project, body, attachments, and action bar. |
| Browser/user-flow | `tests/agent-browser-runs/2026-06-23-email-table-side-panel-mail-parity/mail-view-reading-panel-selected.png` | Pass | Mail view center pane renders the same selected-email reading surface. |
| DB/provider read-back | N/A | Pass | No database/provider changes. |

## Files Changed

- `frontend/src/features/emails/project-emails-workspace.tsx` - extract and reuse selected-email reading panel.
- `frontend/src/app/(main)/[projectId]/emails/emails-client.tsx` - table side panel uses shared reading panel.
- `frontend/src/components/tables/unified/unified-table-page.tsx` - add opt-in side-panel content wrapper and close-row controls for shared panel parity.
- `docs/ops/tasks/2026-06-23-email-table-side-panel-mail-parity.md` - task ledger.

## Risks / Gaps

- Existing unrelated dirty files and known `codex:finish` blocker remain outside this task, so these changes are not pushed from this turn.

## Final Status

- [x] Evidence is recorded.
- [x] Final response includes what is done, what remains, and recommended next steps.
