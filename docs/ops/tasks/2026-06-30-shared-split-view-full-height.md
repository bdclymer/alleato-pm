# Shared Split View Full Height

## Metadata
- Linear: AAI-769 https://linear.app/megankharrison/issue/AAI-769/fix-shared-split-view-pages-to-use-full-available-viewport-height
- Priority: High
- Status: Complete
- Owner: Codex

## Problem
`https://projects.alleatogroup.com/emails` is cut off mid-screen. The same split-view layout is reused by multiple surfaces, so the fix must live in the shared split-view owner instead of the email page.

## Root Cause
- Evidence gathered: `UnifiedTablePage` wraps split renderers with `flex flex-1 min-h-0`, and its `PageContainer` only adds `flex flex-col min-h-0` for split mode. The dedicated email inbox root also relied on `h-full`, which collapses when ancestors do not provide a concrete height.
- Cause: no shared split-mode wrapper owns the available viewport height. When an ancestor does not provide a concrete height, `flex-1`/`h-full` can collapse to content height and leave blank screen below.
- Detection gap: the existing unit guardrails covered header/mobile toolbar behavior, but not the split-view viewport-height contract.
- Prevention step: export shared split-view class contracts and assert they include viewport-height and overflow containment.

## Scope
- [x] Patch `UnifiedTablePage` so all `views.split` consumers inherit a full-height split container.
- [x] Patch the dedicated email inbox split root used by `/emails?tab=...` and `/outlook-draft-feedback`.
- [x] Preserve existing email, tasks, and insights split-view renderers.
- [x] Add targeted unit guardrails for the shared split-view height contracts.
- [x] Run targeted test/lint verification.
- [x] Record evidence and remaining risk.

## Out Of Scope
- No email data/API changes.
- No page-local `/emails` styling override.
- No unrelated table inline-edit changes from the dirty source checkout.

## Evidence
- Changed `frontend/src/components/tables/unified/unified-table-page.tsx` to export and use shared split-view height classes for `views.split`.
- Changed `frontend/src/features/emails/inbox/email-inbox-client.tsx` to use the same viewport-height split contract for the dedicated `/emails?tab=...` inbox surface.
- Added `frontend/src/components/tables/unified/__tests__/unified-table-page.test.ts` assertions for split container height, min-height, overflow containment, and bottom padding removal.
- Added `frontend/src/features/emails/inbox/__tests__/email-inbox-client.test.ts` assertions for the inbox split root height contract.
- Passed: `cd frontend && npm run test:unit -- --runTestsByPath src/components/tables/unified/__tests__/unified-table-page.test.ts src/features/emails/inbox/__tests__/email-inbox-client.test.ts`.
- Passed: `cd frontend && npx eslint src/components/tables/unified/unified-table-page.tsx src/components/tables/unified/__tests__/unified-table-page.test.ts src/features/emails/inbox/email-inbox-client.tsx src/features/emails/inbox/__tests__/email-inbox-client.test.ts`.
- Passed: `git diff --check -- frontend/src/components/tables/unified/unified-table-page.tsx frontend/src/components/tables/unified/__tests__/unified-table-page.test.ts frontend/src/features/emails/inbox/email-inbox-client.tsx frontend/src/features/emails/inbox/__tests__/email-inbox-client.test.ts docs/ops/tasks/2026-06-30-shared-split-view-full-height.md`.
- Browser auth proof attempted in the source checkout: `agent-browser` redirected to `/auth/login?callbackUrl=%2Femails%3Ftab%3Dbrandon-queue`; saved `alleato-test` auth profile did not sign in. Authenticated screenshot proof remains blocked by local auth/session state.

## Noise Gate
- Primary user: Brandon/admin email reviewer.
- Primary job: scan messages and inspect a selected thread without losing context.
- Primary decision: which message needs attention and what action to take.
- Tier 1: split list and detail pane filling the available workspace.
- Tier 2: selected state, row content, reading pane.
- Tier 3: tabs, filters, secondary actions.
- Hide until requested: advanced/secondary metadata.
- Remove: clipped split wrapper behavior and blank unused screen area.
- Primary action: select a row and act from the reading pane.
- Failure-loudly behavior: unit guardrails check the shared split wrappers own viewport height.

## Verification
- [x] `cd frontend && npm run test:unit -- --runTestsByPath src/components/tables/unified/__tests__/unified-table-page.test.ts src/features/emails/inbox/__tests__/email-inbox-client.test.ts`
- [x] `cd frontend && npx eslint src/components/tables/unified/unified-table-page.tsx src/components/tables/unified/__tests__/unified-table-page.test.ts src/features/emails/inbox/email-inbox-client.tsx src/features/emails/inbox/__tests__/email-inbox-client.test.ts`
- [x] Targeted file inspection confirms the split fix is shared, not page-local.
