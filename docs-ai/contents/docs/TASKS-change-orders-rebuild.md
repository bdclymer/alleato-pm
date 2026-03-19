# TASKS: Change Orders Rebuild — Source of Truth

**Created:** 2026-03-19
**Last Updated:** 2026-03-19
**Status:** In Progress — Phase 1 + Phase 3 + Phase 4 complete

---

## Phase 1: Delete Legacy Code & Tables

All of these target the `change_orders` table (0 rows, being dropped).

### 1.1 Delete legacy API routes
- [x] Delete entire directory: `api/projects/[projectId]/change-orders/[changeOrderId]/` (route.ts, approve/, reject/, line-items/, attachments/)
- [x] Delete `api/projects/[projectId]/change-orders/route.ts` (list/create for legacy table)
- [x] Delete `api/projects/[projectId]/change-orders/export/csv/route.ts`
- [x] Delete `api/projects/[projectId]/change-orders/reviewer-settings/route.ts`

### 1.2 Delete legacy UI pages
- [x] Delete `(main)/[projectId]/change-orders/[changeOrderId]/page.tsx` (old detail page)
- [x] Delete `(main)/[projectId]/change-orders/new/page.tsx` (creates into legacy table)
- [x] Delete `(main)/[projectId]/change-orders/reviewer-settings-dialog.tsx`

### 1.3 Delete legacy hooks & libs
- [x] Delete `hooks/use-change-orders.ts` (direct Supabase queries on `change_orders`)
- [x] Delete `lib/change-orders/status-transitions.ts`
- [x] Delete `lib/change-orders/reviewer-access.ts`

### 1.4 Delete legacy domain components
- [x] Delete `components/domain/change-orders/ApprovalWorkflow.tsx`
- [x] Delete `components/domain/change-orders/ChangeOrderDetail.tsx`
- [x] Delete `components/domain/change-orders/ChangeOrderReviewerResponse.tsx`
- [x] Delete `components/domain/change-orders/ChangeOrderSummaryCards.tsx`
- [x] Delete `components/domain/change-orders/ExportDropdown.tsx`
- [x] Delete `components/domain/change-orders/FileUploadZone.tsx`
- [x] Delete `components/domain/change-orders/LineItemsTable.tsx`
- [x] Delete `components/domain/change-orders/ReportsDropdown.tsx`

### 1.5 Delete test/nonprod pages
- [x] Delete `(main)/test-change-order-reviewer/page.nonprod.tsx`
- [x] Delete `(other)/test-approval-workflow/page.nonprod.tsx`
- [x] Delete `(main)/test-line-items/page.nonprod.tsx`

### 1.6 Fix files with mixed references (keep file, update reference)
- [x] `(main)/[projectId]/home/page.tsx` — replace legacy `change_orders` query with `prime_contract_change_orders` + `contract_change_orders`
- [x] `(main)/[projectId]/home/project-home-client.tsx` — update ChangeOrder type
- [x] `(main)/[projectId]/home/project-home-redesign.tsx` — update ChangeOrder type
- [x] `api/projects/[projectId]/change-events/[changeEventId]/convert-to-change-order/route.ts` — insert into real table instead of `change_orders`
- [x] `api/projects/[projectId]/checklist/route.ts` — update query to real tables
- [x] `api/table-update/route.ts` — update `change_orders` switch case
- [x] `lib/supabase/queries.ts` — update query
- [x] `lib/documents/record-documents.ts` — update legacy query (keep prime/contract queries)
- [x] `lib/ai/tools/financial.ts` — update 3 queries to use real tables
- [x] `lib/ai/tools/project-tools.ts` — update query
- [x] `lib/ai/tools/operational.ts` — update query
- [x] `lib/navigation-config.ts` — kept change_orders module name as route label
- [x] `lib/table-registry.ts` — updated entry
- [x] `lib/permissions.ts` — kept `change_orders` as permission module name
- [x] `lib/sitemap-utils.ts` — updated URLs
- [x] `services/permissionService.ts` — kept as permission module name
- [x] `hooks/data/index.ts` — removed re-export of deleted hook
- [x] `types/index.ts` — removed ChangeOrder/ChangeOrderInsert types
- [x] `types/database-extensions.ts` — removed ChangeOrder type
- [x] `api/projects/[projectId]/permissions/override/route.ts` — kept module name
- [x] `api/dev/schema/route.ts` — updated schema list
- [x] `components/domain/users/UserPermissionsManager.tsx` — kept module name
- [x] `hooks/use-project-permissions.ts` — kept module name
- [x] `tests/helpers/db.ts` — removed legacy change_orders helper functions

### 1.7 Drop legacy database tables (migration)
- [x] Created migration `20260319000001_drop_legacy_change_order_tables.sql`
- [x] Dropped: `change_order_approvals`, `change_order_attachments`, `change_order_costs`, `change_order_lines`, `change_orders`
- [x] Dropped: `prime_potential_change_orders` (0 rows, 0 code refs)
- [x] Dropped: `change_event_rfq_attachments` (0 rows, 0 code refs)
- [x] Regenerated TypeScript types — build compiles clean

---

## Phase 2: Wire Existing Features to Real Tables

### 2.1 CSV Export
- [x] Create export route for PCCOs at `/api/projects/[projectId]/prime-contract-change-orders/export`
- [x] Create export route for CCOs at `/api/projects/[projectId]/commitment-change-orders/export`
- [x] Add "Export CSV" button to page-actions.tsx (tab-aware, downloads correct file per tab)

### 2.2 Reports
- [ ] Wire "Unexecuted" filter to PCCOs (executed=false AND status=Approved)
- [ ] Wire "Overdue" filter to appropriate date fields

### 2.3 Convert Change Event → Change Order
- [x] Updated `convert-to-change-order/route.ts` to insert into `prime_contract_change_orders` or `contract_change_orders` based on type selection (done by fix-mixed-refs agent)

---

## Phase 3: PCCO Detail Page Enhancements

### 3.1 Approval workflow for PCCOs
- [x] Create approve API: `api/projects/[projectId]/prime-contract-change-orders/[id]/approve`
- [x] Create reject API: `api/projects/[projectId]/prime-contract-change-orders/[id]/reject`
- [x] Add approval UI to prime CO detail page (approve/reject buttons, rejection reason dialog)
- [ ] Recalculate contract revised value on approval (match CCO pattern)

### 3.2 Create new PCCO form
- [x] Create page at `(main)/[projectId]/change-orders/prime/new/page.tsx`
- [x] Form fields: pcco_number, title, status, total_amount
- [x] Submit to `api/projects/[projectId]/prime-contract-change-orders` (POST route created)
- [x] Add POST handler to prime CO collection API route
- [x] Update "Create Change Order" button in page-actions to route to correct form per tab

### 3.3 PCCO line items (future — no table yet)
- [ ] Design and create `pcco_line_items` table (or decide to skip — Acumatica may not sync these)
- [ ] Create API routes for PCCO line items
- [ ] Add Line Items tab to prime CO detail page

---

## Phase 4: CCO Detail Page Enhancements

### 4.1 Approval UI for CCOs
- [x] Add approval/rejection UI to commitment CO detail page (approve/reject buttons, rejection reason dialog)
- [x] Wire to existing approve/reject APIs at `/contracts/[contractId]/change-orders/[id]/approve|reject`
- [x] Show rejection reason when rejected (was already there)
- [x] Approval history — covered by existing status/approved_date/rejection_reason fields displayed on detail page (no separate approval log table exists for these CO types)

### 4.2 Create new CCO form
- [x] Create page at `(main)/[projectId]/change-orders/commitment/new/page.tsx`
- [x] Form fields: change_order_number, description, amount, contract_id (dropdown)
- [x] Submit to existing `api/projects/[projectId]/contracts/[contractId]/change-orders` POST route
- [x] Update "Create Change Order" button per tab

### 4.3 CCO line items
- [x] Wire `commitment_change_order_lines` table to CCO detail page (direct Supabase query)
- [x] Add Line Items section to commitment CO detail page (read-only display with totals)
- [ ] Create API routes for commitment CO line items CRUD (not needed yet — no line items exist)

---

## Phase 5: Shared Features for Both Types

### 5.1 Attachments
- [x] Design: per-type tables (`pcco_attachments` + `cco_attachments`) following `change_event_attachments` pattern
- [x] Created migration `20260319000002_create_change_order_attachment_tables.sql`
- [x] Tables created in Supabase with RLS policies and indexes
- [x] Types regenerated
- [x] Create attachment API for PCCOs (GET list, POST upload, DELETE)
- [x] Create attachment API for CCOs (GET list, POST upload, DELETE)
- [x] Add Attachments section to PCCO detail page
- [x] Add Attachments section to CCO detail page

### 5.2 Budget integration
- [ ] Approved PCCOs should update prime contract revised value
- [ ] Verify approved CCOs update commitment revised value (API already does this)
- [ ] Display budget impact on detail pages

### 5.3 Reviewer settings
- [ ] Determine if reviewer settings are needed for real tables (PCCOs from Procore have designated reviewers; our synced data may not)
- [ ] If needed, adapt reviewer-settings-dialog for new context

---

## Phase 6: Future / Lower Priority

- [ ] Multi-tier approval workflow (2-4 tiers)
- [ ] Package-based organization (PCO numbering)
- [ ] PDF generation
- [ ] Email notifications on status changes
- [ ] Revision tracking
- [ ] Batch operations (bulk approve/delete)
- [ ] Templates
- [ ] Advanced reporting dashboards
- [ ] DocuSign integration

---

## Implementation Order (Fastest Path)

**Batch 1 — Delete legacy (parallelizable, 30 min)**
1.1 through 1.7 can mostly be done in parallel

**Batch 2 — Wire existing features (1-2 hrs)**
2.1, 2.2, 2.3 in parallel

**Batch 3 — PCCO enhancements (2-3 hrs)**
3.1 approval → 3.2 create form (sequential, approval first)

**Batch 4 — CCO enhancements (1-2 hrs)**
4.1 approval UI → 4.2 create form (sequential)

**Batch 5 — Shared features (2-3 hrs)**
5.1 attachments, 5.2 budget integration

**Phase 6 deferred to future sprints.**
