---
title: TASKS CHANGE EVENTS
description: TASKS CHANGE EVENTS documentation
---

# TASKS: Change Events Reality Checklist

**Status:** Testing complete — monitoring docs remaining
**Last Updated:** 2026-03-04
**Actual Completion:** ~98% (Playwright re-run passed; monitoring/operational docs remaining)

## Phase 1: Database Foundation

- [x] `change_events`, `change_event_line_items`, `change_event_attachments`, `change_event_history`, and `change_event_approvals` tables defined with UUID PKs, constraints, and indexes via `/frontend/drizzle/migrations/0001_create_change_events.sql`
- [x] `change_events_summary` materialized view and helper SQL functions exist
- [x] Triggers enforce updated timestamps and audit history (logs status changes) and refresh the view
- [x] `get_next_change_event_number` provides the sequential numbering helper used by the backend
- [x] RLS policies are defined in `/frontend/supabase/migrations/20260110142750_add_change_events_rls.sql`

## Phase 2: API Surface

- [x] Collection (`GET/POST /api/projects/[projectId]/change-events`) and detail (`GET/PATCH/DELETE`) routes are implemented and respond when given UUIDs
- [x] Line item subroutes (`/line-items`, `/line-items/{id}`) — UUID fix applied; `changeEventId` is now passed as the UUID string and queries return rows correctly; bulk reorder (PATCH) also implemented
- [x] Attachment subroutes (list/upload/download/delete) — UUID fix applied; upload handler now accepts both `file` and `files` field names for compatibility; IDs reference UUIDs
- [x] History endpoint — UUID fix applied; `changeEventId` is now used as the UUID string so audit trail returns actual records
- [x] Approval endpoints — fully implemented (GET list, POST create, PATCH update status) backed by `change_event_approvals`; `approvals/route.ts` exists at `/api/projects/[projectId]/change-events/[changeEventId]/approvals`
- [x] Convert-to-change-order endpoint exists at `/api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order`
- [x] RFQ endpoints exist (list/create at `/change-events/rfqs` and response submission at `/rfqs/[rfqId]/responses`); `use-change-event-rfqs.ts` hook wires them to the UI
- [x] RFQ close/update endpoint (`PATCH /rfqs/[rfqId]`) — implemented in `rfqs/[rfqId]/route.ts`
- [x] RFQ detail endpoint (`GET /rfqs/[rfqId]`) — implemented in `rfqs/[rfqId]/route.ts` (returns RFQ with responses)
- [x] RFQ delete endpoint (`DELETE /rfqs/[rfqId]`) — implemented in `rfqs/[rfqId]/route.ts` (Draft only)

## Phase 3: Frontend Pages & Components

- [x] Detail page (`[changeEventId]/page.tsx`) — `changeEventId` is now treated as a UUID string; data loads from API correctly
- [x] Edit page (`[changeEventId]/edit/page.tsx`) — `changeEventId` treated as UUID string; edit form loads existing data via API
- [x] New page (`new/page.tsx`) — form submission now calls the API via `fetch` (not direct Supabase insert); `expectingRevenue` and `lineItemRevenueSource` are sent
- [x] `ChangeEventApprovalWorkflow` — wired to real `/approvals` API endpoints; uses actual `currentUserId` instead of hardcoded numeric IDs
- [x] `ChangeEventConvertDialog` — component exists and is wired in the detail page; convert-to-change-order flow is functional
- [x] `ChangeEventRfqForm` and `ChangeEventRfqResponseForm` — components exist and `use-change-event-rfqs` hook calls actual API endpoints
- [x] **Revenue source enum mismatch — FIXED** — `ChangeEventRevenueSection` options now aligned to the API's `LineItemRevenueSource` enum: "Match Latest Cost", "Latest Cost", "Latest Price". Slug↔display maps updated accordingly. Old invalid options ("Manual Entry", "Percentage Markup", "Fixed Amount") removed.
- [x] **RFQ panel wired into detail page** — "RFQs" tab added to `[changeEventId]/page.tsx`; uses `useProjectChangeEventRfqs` hook, renders `ChangeEventRfqForm` for creation, and lists existing RFQs filtered to the current change event.

## Phase 4: Testing & Verification

- [x] Playwright test files exist: `tests/e2e/change-events/` contains 5 spec files (`change-events-api.spec.ts`, `change-events-ui.spec.ts`, `change-events-comprehensive.spec.ts`, `change-events-e2e.spec.ts`, `change-events-browser-verification.spec.ts`) plus `tests/change-events/change-events.spec.ts`
- [x] **Re-run all Playwright change-event specs** — completed 2026-03-04: **42 passed, 13 skipped, 0 failed** (100% pass rate on non-skipped tests, well above 80% gate)
- [x] **Regression findings documented** — Root cause of all prior form-page test failures identified and fixed: `DevAutoFillForms.tsx` had a bug where `enhanceForm()` never set `data-dev-autofill-enhanced` on the `<form>` element (only on the child row div), causing an infinite `MutationObserver` loop on any page with a form. Fixed by adding `form.setAttribute(FORM_ENHANCED_ATTR, "true")` before `form.prepend(row)`. List page was unaffected (no `<form>`). Skipped tests (13) are intentionally pending implementation: summary tab, RFQs tab on list, and recycle bin tab.

## Production Readiness

- [x] Change-event detail/edit views load real data (UUID parsing fixed)
- [x] Attachments upload via Supabase storage (file/files key compatibility fixed, UUID IDs used)
- [x] Approval workflow is backed by a real API (GET/POST/PATCH implemented)
- [x] Revenue source enum mismatch resolved — calculations can now be validated end-to-end
- [x] RFQ panel wired into detail page — RFQ creation and listing functional
- [ ] Update monitoring/operational docs to reflect the revised architecture

**Actual Completion: ~98%**
- Core CRUD (create, read, update, delete): ✅ Working
- Line items: ✅ UUID fixed, queries return data
- Attachments upload/download: ✅ Working
- History/audit trail: ✅ Working
- Approvals API + UI: ✅ Implemented
- Convert to Change Order: ✅ Implemented
- Revenue source submission: ✅ Enum mismatch resolved
- RFQ UI in detail page: ✅ Tab wired with list + creation form
- RFQ detail/close/delete endpoints: ✅ Implemented
- Tests verified post-fix: ✅ 42 passed / 13 skipped / 0 failed (2026-03-04)
- DevAutoFillForms infinite loop bug: ✅ Fixed in `src/components/dev/DevAutoFillForms.tsx`
- Monitoring/operational docs: ❌ Not yet written
