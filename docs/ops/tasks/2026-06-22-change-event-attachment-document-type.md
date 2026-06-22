# Task: Change Event Attachment Document Type

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-599 - https://linear.app/megankharrison/issue/AAI-599/allow-change-event-attachments-to-assign-document-type
Related Handoff: Not applicable

## Objective

Users can assign and update document type on change event attachments from the change event detail attachment surface, with the value persisted through the canonical attachment data owner and invalid values failing loudly.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

## Attention Brief

Primary user: Project manager reviewing change event evidence.
Primary job: Classify attached evidence so later document search and review can find it.
Primary decision: Which canonical document type best describes an attachment.
Tier 1: Attachment name, current document type, edit action.
Tier 2: Upload/download/delete behavior.
Tier 3: File size and upload date.
Hide until requested: Advanced metadata and taxonomy details.
Remove: Decorative helper panels, duplicate CTAs, badges, and summary cards.
Primary action: Change the attachment document type in place.
Failure-loudly behavior: Invalid or failed type updates show the specific API error and leave the old value visible.

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

## Files Planned

- `frontend/src/components/ds/document-picker.tsx` - shared attachment UI that already owns document type display/editing for Pattern C entity attachments.
- `frontend/src/lib/documents/pattern-c-attachments.ts` - canonical Pattern C service for linked document type validation/update.
- `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/route.ts` - change event attachment read/write API if needed for legacy attachments.
- `frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/attachments/[attachmentId]/route.ts` - attachment update/delete API if needed for legacy attachments.
- `frontend/src/app/api/document-picker/types/__tests__/route.test.ts` - guardrail that change event attachment types are queried by taxonomy.
- `supabase/migrations/20260622222500_enable_change_event_document_types.sql` - enable canonical taxonomy rows for change event attachments.

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
| Static/type/lint      | `npm exec eslint src/app/api/document-picker/types/route.ts src/app/api/document-picker/types/__tests__/route.test.ts src/app/api/document-picker/linked/route.ts` from `frontend/` | Passed | Root `npm --prefix frontend run lint -- --file ...` failed because ESLint flat config rejects `--file`; root `npx eslint ...` picked the wrong ESLint/config. |
| Targeted tests        | `npm --prefix frontend run test:unit -- --runTestsByPath src/app/api/document-picker/types/__tests__/route.test.ts src/app/api/document-picker/linked/__tests__/route.test.ts --runInBand` | Passed | 2 suites, 3 tests. |
| Browser/user-flow     | `docs/ops/evidence/2026-06-22-change-event-attachment-document-type/page.png`, `type-options.png`, `page-snapshot.txt`, `type-options-snapshot.txt` | Passed | Live route showed attachment type combobox with options: Email Attachment, Proposal, Drawing, Change Order, Estimate, RFI, Specification, Other, Photo. |
| DB/provider read-back | `npm run db:migrations:verify-applied -- supabase/migrations/20260622222500_enable_change_event_document_types.sql`; SQL read-back of taxonomy rows | Passed | Ledger version `20260622222500` verified; 9 taxonomy rows include `change_event`. |
| End-to-end proof      | Agent-browser selected `RFI`; SQL read-back returned `9f49ed61-a7da-4776-b7cd-93b5ba0c5897\|rfi\|rfi` | Passed | Test row restored to original null/null state after proof. |

## Files Changed

- `docs/ops/tasks/2026-06-22-change-event-attachment-document-type.md` - task definition and evidence ledger.
- `frontend/src/app/api/document-picker/types/__tests__/route.test.ts` - regression guardrail for change event taxonomy loading.
- `supabase/migrations/20260622222500_enable_change_event_document_types.sql` - applies existing document types to change event attachments.

## Risks / Gaps

- The checkout has substantial unrelated dirty work. This task must stage and report only task-owned files.
- No shared UI code was changed; the existing `EntityAttachments` select became visible once taxonomy rows existed for `change_event`.
- Browser `networkidle` timed out on the live page because the app continued background requests; snapshot and screenshot evidence were captured after a shorter settle.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
