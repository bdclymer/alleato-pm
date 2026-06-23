# Task: Email Attachment Proposal Type

Status: Complete
Owner: Codex
Created: 2026-06-23
Linear Issue: Not created yet - blocked by prior Linear connector argument validation on team lookup
Related Handoff: N/A

## Objective

Email attachment type pickers include `Proposal` wherever the email attachment type options are defined.

## Acceptance Criteria

- `Proposal` is present in the email workspace attachment type picker.
- `Proposal` is present in the email attachments page type picker.
- `Proposal` is present in the legacy email inbox reading pane type picker.
- No database, provider, or migration changes are required.

## Noise Gate Brief

Primary user: Project manager classifying email attachments.
Primary job: Label proposal attachments without custom entry workarounds.
Primary decision: Whether an attachment is a proposal.
Tier 1: Type option list.
Remove: Nothing; this is a missing semantic option.
Failure-loudly behavior: Targeted lint catches syntax/import issues in the edited files.

## Evidence

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Static/type/lint | `npx eslint 'src/features/emails/project-emails-workspace.tsx' 'src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx' 'src/app/(tables)/email-inbox/email-reading-pane.tsx'` | Pass | Exits 0 with existing warning: raw search input at `project-emails-workspace.tsx:1147`. |
| Targeted tests | N/A | Pass | Static option-list change only. |
| Browser/user-flow | Not run | Deferred | Existing browser evidence covers picker location; this is a static option addition. |
| DB/provider read-back | N/A | Pass | No database/provider changes. |

## Files Changed

- `frontend/src/features/emails/project-emails-workspace.tsx` - add `Proposal` to workspace attachment types.
- `frontend/src/app/(main)/[projectId]/email-attachments/email-attachments-client.tsx` - add `Proposal` to attachment page types.
- `frontend/src/app/(tables)/email-inbox/email-reading-pane.tsx` - add `Proposal` to legacy inbox attachment types.
- `docs/ops/tasks/2026-06-23-email-attachment-proposal-type.md` - task ledger.

## Risks / Gaps

- Existing unrelated warning remains in `frontend/src/features/emails/project-emails-workspace.tsx`: raw search input should eventually move to `ExpandingSearch`.

## Final Status

- [x] Evidence is recorded.
- [x] Final response includes what is done, what remains, and recommended next steps.
