---
title: TASKS CHANGE EVENTS
description: TASKS CHANGE EVENTS documentation
---

# TASKS: Change Events Reality Checklist

**Status:** In Progress (core flow blocked)
**Last Updated:** 2026-01-19
**Actual Completion:** ~52% (line items, attachments, revenue, and approvals remain broken)

## Phase 1: Database Foundation

- [x] `change_events`, `change_event_line_items`, `change_event_attachments`, `change_event_history`, and `change_event_approvals` tables defined with UUID PKs, constraints, and indexes via `/frontend/drizzle/migrations/0001_create_change_events.sql`
- [x] `change_events_summary` materialized view and helper SQL functions exist
- [x] Triggers enforce updated timestamps and audit history (logs status changes) and refresh the view
- [x] `get_next_change_event_number` provides the sequential numbering helper used by the backend
- [x] RLS policies are defined in `/frontend/supabase/migrations/20260110142750_add_change_events_rls.sql`

## Phase 2: API Surface (Partial)

- [x] Collection (`GET/POST /api/projects/[projectId]/change-events`) and detail (`GET/PATCH/DELETE`) routes are implemented and respond when given UUIDs
- [ ] Line item subroutes (`/line-items`, `/line-items/{id}`) currently cast `changeEventId` to `parseInt` and never return rows; fix to accept the UUID string and keep `lineItemId` as a UUID
- [ ] Attachment subroutes (list/upload/download/delete/bulk) also parse `changeEventId` as integers and expect a single `file` form field while the UI posts `files`; the endpoints always fail until the ID and payload shape align
- [ ] History endpoint parses `changeEventId` as a number and therefore returns an empty audit trail; switch the query to use the UUID
- [ ] Approval endpoints referenced by the UI are missing; implement the REST surface (create/update/retrieve) backed by `change_event_approvals`
- [?] RFQ endpoints for listing, creating, and recording responses exist but the UI has not been wired to them; confirm their behavior once the front-end hooks are added

## Phase 3: Frontend Pages & Components (Broken)

- [ ] Normalize every page and API call to treat `changeEventId` as the UUID string; the list/detail/edit pages `parseInt` the ID and never load data when the backend uses UUIDs
- [ ] `ChangeEventForm` (new page) bypasses the API by inserting directly via Supabase and never submits `lineItemRevenueSource`, `expectingRevenue`, or attachment metadata; switch it to call the documented API once IDs are in sync
- [ ] Revenue selector options currently emit slug values (`match_latest_cost`, `percentage_markup`, `manual_entry`, `fixed_amount`); map them to the backend enum (`Match Latest Cost`, `Latest Cost`, `Latest Price`) before submitting
- [ ] Attachments panel posts under the `files` key while the API expects `file`; align the payload and ensure downloads/deletes reference UUIDs instead of integers
- [ ] `ChangeEventApprovalWorkflow` posts to non-existent `/approvals` routes and hard-codes numeric approver IDs; either implement the backend or retire the component until an API exists
- [ ] RFQ creation and response panels exist but do not yet POST to `/rfqs`/`responses`; hook them up once the API path stabilizes

## Phase 4: Testing & Verification

- [?] Playwright specifications under `/frontend/tests/e2e/change-events-*.spec.ts` rely on the broken UUID/attachment/approval flows; rerun them when the endpoints start returning actual data
- [ ] Document any new regression scenarios triggered by the fix (line items, attachments, revenue, approvals)

## Production Readiness

- [ ] Ensure change-event detail/edit views can load real data (requires the UUID parsing fix)
- [ ] Confirm attachments can upload/download via Supabase storage after the payload/ID shape is corrected
- [ ] Revalidate revenue calculations once the option mapping is fixed
- [ ] Implement or remove the approval workflow UI before calling the feature production-ready
- [ ] Update monitoring/operational docs to reflect the revised architecture

**Actual Completion:** ~52% (not the 85% that was previously claimed)
