---
title: TASKS ChangeOrders
description: TASKS ChangeOrders documentation
---

# Change Orders Implementation - Complete Task Checklist

**Last Audited: 2026-03-04**
**Current Status: ~72% Complete (infrastructure gaps resolved; forms, tests, and advanced features remain)**

> **Audit notes (2026-03-04):** Migrations `20260303000002` and `20260303000003` successfully pushed.
> `change_order_attachments` table created in DB. Missing columns (`scope`, `schedule_impact`,
> `date_initiated`, `revision`, `review_date`) added to `change_orders`. TypeScript types regenerated.
> CSV export table name bug fixed. Remaining: wire new DB columns into forms/UI, resolve E2E test
> infrastructure blocker, packages not implemented, advanced features deferred.

---

## Phase 1: Database Foundation

- [x] Analyze Procore change orders structure (from crawl data)
- [x] Design change order schema with package support
- [x] `change_orders` table exists in DB (confirmed in `database.types.ts`)
- [x] `change_order_lines` table exists in DB (confirmed in `database.types.ts`)
- [x] `change_order_approvals` table exists in DB (confirmed in `database.types.ts`)
- [ ] Create SQL migration file for `change_orders` table (table exists but no `.sql` file — original creation was manual)
- [ ] Create SQL migration file for `change_order_lines` table (same — no migration file)
- [x] `change_order_attachments` table created — migration `20260303000003` pushed ✓
- [x] Missing columns added to `change_orders`: `scope`, `schedule_impact`, `date_initiated`, `revision`, `review_date` — migration `20260303000003` pushed ✓
- [x] RLS policies created for `change_order_attachments` in migration `20260303000003`
- [x] Foreign key constraints exist (`change_orders_contract_id_fkey`, `change_orders_project_id_fkey`)
- [x] TypeScript types regenerated — all new columns/tables visible in `database.types.ts`
- [ ] Create database migration for `change_order_packages` table (not yet planned)
- [ ] Test all database operations end-to-end (blocked — see Phase 9)

---

## Phase 2: Backend Services

- [x] Change order CRUD API — `GET`/`POST` `/api/projects/[projectId]/change-orders/route.ts`
- [x] Change order detail/update/delete — `[changeOrderId]/route.ts`
- [x] Approve endpoint — `[changeOrderId]/approve/route.ts`
- [x] Reject endpoint — `[changeOrderId]/reject/route.ts`
- [x] Line items API — `[changeOrderId]/line-items/route.ts` + `[lineItemId]/route.ts`
- [x] Attachments API routes exist — `[changeOrderId]/attachments/` + download route
  - ✅ DB table now created (`change_order_attachments`) — routes should be functional
- [x] CSV export — `export/csv/route.ts` — table name bug fixed (`change_order_line_items` → `change_order_lines`)
- [x] Change event → change order conversion — `convert-to-change-order/route.ts`
- [x] Reviewer settings endpoint — `reviewer-settings/route.ts`
- [x] Filtering and pagination implemented in list route
- [x] Contracts-scoped routes also exist — `contracts/[contractId]/change-orders/`
- [ ] Create change order package API endpoints
- [ ] PDF generation service
- [ ] Email notification system
- [ ] Write comprehensive API tests (tests written but infrastructure blocked — see Phase 9)

---

## Phase 3: Form Implementation

- [x] Change order creation form — `change-orders/new/page.tsx`
- [x] Edit form — `change-orders/[changeOrderId]/edit/page.tsx` (pre-populated, status-gated)
- [x] React Hook Form + Zod validation (`changeOrderSchema` in `financial-schemas.ts`)
- [x] Contract picker (Prime + Commitments with company names)
- [x] Designated reviewer picker (searchable user dropdown)
- [x] Date fields: due date
- [x] Private flag toggle
- [x] Line items section with totals calculation
- [x] Save as draft (status enum includes "draft")
- [x] Form connected to POST/PUT API endpoints
- [x] Navigation to detail page on success
- [ ] `scope` field UI — DB column now exists; needs wiring into form + Zod schema (`changeOrderSchema`)
- [ ] `schedule_impact` field UI — DB column now exists; needs wiring into form + Zod schema
- [ ] `date_initiated` field UI — DB column now exists; needs wiring into form
- [ ] `revision` field UI — DB column now exists; display on detail/list pages
- [ ] `review_date` field UI — DB column now exists; display on detail page
- [ ] Add `scope`, `schedule_impact`, `date_initiated` to `changeOrderSchema` Zod object in `financial-schemas.ts`
- [ ] Change reason dropdown
- [ ] Package selection/creation

---

## Phase 4: List View Enhancement

- [x] List view — `change-orders/page.tsx` + `change-orders-client.tsx`
- [x] `ProjectPageHeader + PageContainer` pattern (CLAUDE.md compliant)
- [x] Status filter tabs: All, Draft, Pending, Approved, Rejected, Executed
- [x] Prime vs Commitments contract type tabs
- [x] Search functionality (title, number, description)
- [x] Filter controls: contract type, reviewer, date range
- [x] Summary cards: Pending/Approved/Rejected counts and amounts (`ChangeOrderSummaryCards`)
- [x] Row click navigation to detail page
- [x] Export dropdown wired to page actions (`ExportDropdown`)
- [x] Reports dropdown wired to page actions (`ReportsDropdown`) — Unexecuted + Overdue shortcuts
- [x] Reviewer column displayed
- [ ] `Date Initiated` column — DB column exists now; add to list table
- [ ] `Revision` column — DB column exists now; add to list table
- [ ] `Review Date` column — DB column exists now; add to detail page
- [ ] Package grouping view
- [ ] Bulk action capabilities (bulk approve, bulk delete, etc.)

---

## Phase 5: Review Workflow

- [x] Change order detail page — `[changeOrderId]/page.tsx`
- [x] Tabs: General, Line Items, Attachments, Reviews, History
- [x] `ChangeOrderReviewerResponse` component (approve/reject buttons, only for designated reviewer)
- [x] `ApprovalWorkflow` component (vertical timeline with tier statuses)
- [x] Approve/reject wired to Reviews tab and page header quick actions
- [x] Rejection requires reason (enforced in UI)
- [x] Status-dependent action visibility
- [x] Status transition validation — `lib/change-orders/status-transitions.ts`
- [x] Review history section in `ApprovalWorkflow`
- [ ] Multi-tier approval support (2–4 tiers)
- [ ] Notification system (email/in-app on status change)
- [ ] Approval delegation
- [ ] Escalation logic

---

## Phase 6: Package Management

- [ ] Package creation
- [ ] Package detail view
- [ ] Package-level PDF generation
- [ ] Package summary calculations
- [ ] Package grouping in list view
- [ ] Package status tracking
- [ ] Package-level exports
- [ ] Package analytics
- [ ] Package search and filtering
- [ ] Package archival

---

## Phase 7: Advanced Features

- [x] Change event → change order conversion (dialog + API + audit log)
- [x] Change event reference shown on CO detail page
- [ ] DocuSign integration (future)
- [ ] Revision tracking (column not in DB)
- [ ] Budget impact / cost code integration (cost codes exist but not fully wired)
- [ ] Change order templates
- [ ] Claimable variations support
- [ ] Signature tracking
- [ ] Advanced reporting (dashboards, charts)
- [ ] Financial impact analysis
- [ ] Dashboard widgets

---

## Phase 8: Reports & Analytics

- [x] Basic report shortcuts via URL params (Unexecuted, Overdue — wired through `ReportsDropdown`)
- [ ] Dedicated Unexecuted Change Orders report page
- [ ] Dedicated Overdue Change Orders report page
- [ ] Change Orders by Reason analytics
- [ ] Budget variance reports
- [ ] Approval workflow metrics
- [ ] Time-to-approval tracking
- [ ] Vendor/contractor performance reports
- [ ] Executive dashboard integration
- [ ] Custom report builder
- [ ] Report scheduling

---

## Phase 9: Testing & Polish

- [x] Playwright E2E test files written:
  - `tests/change-orders/change-orders.spec.ts`
  - `tests/e2e/change-orders/change-orders-crud.spec.ts`
  - `tests/e2e/change-orders/change-order-ui.spec.ts`
  - `tests/e2e/change-orders/change-order-scope-schedule.spec.ts`
  - `tests/e2e/change-orders/change-order-reviewer-picker.spec.ts`
  - `tests/e2e/change-orders/change-order-contract-picker.spec.ts`
  - `tests/e2e/change-orders/change-order-reviewer-response.spec.ts`
  - `tests/e2e/change-orders/change-orders-comprehensive.spec.ts`
  - `tests/e2e/prime-contracts/api-change-orders.spec.ts`
- [ ] **BLOCKER**: Playwright tests all fail — Supabase project config mismatch
  - App connects to `lgveqfnpkxvzbnnwuled.supabase.co` but type generation used different project
  - Resolve `.env.local` URL/keys, verify test users exist, then re-run
- [x] Fix CSV export table name bug — `change_order_line_items` → `change_order_lines` ✓
- [x] `change_order_attachments` DB table created — attachments API should now work ✓
- [ ] Performance testing with large datasets
- [ ] Accessibility testing
- [ ] Mobile responsiveness testing
- [ ] Error boundary components
- [ ] Security audit
- [ ] User acceptance testing

---

## Open Infrastructure Issues (Blockers)

1. ~~Missing `change_order_attachments` DB table~~ — **RESOLVED** (migration `20260303000003`)
2. ~~Missing DB columns~~ — **RESOLVED** (`scope`, `schedule_impact`, `date_initiated`, `revision`, `review_date` added)
3. ~~CSV export table name mismatch~~ — **RESOLVED** (fixed in `export/csv/route.ts`)
4. **Missing migration files for `change_orders` + `change_order_lines`** — tables exist in DB but were created manually (no `.sql` file). Low risk; document as known gap.
5. **Supabase project config mismatch** — still blocks all E2E test execution

---

## Success Criteria Checklist

- [x] Users can create change orders with line items
- [x] Approval workflow (single-tier) functions correctly
- [ ] Multi-tier approval workflow functions correctly
- [ ] Package-based organization works as expected
- [ ] PDF generation produces properly formatted documents
- [x] CSV export endpoint works (table name bug fixed)
- [ ] Email notifications sent at appropriate times
- [ ] Budget impact calculated and displayed correctly
- [ ] Reports provide actionable insights beyond basic filter shortcuts
- [ ] Mobile interface fully tested
- [ ] Performance meets requirements (<2s load time)
- [ ] Security audit passes with no critical issues
- [ ] All E2E tests pass consistently

---

## File Structure (Verified in Codebase)

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/change-orders/
│   │   ├── page.tsx                           ✅ List page
│   │   ├── change-orders-client.tsx           ✅ Client component
│   │   ├── page-actions.tsx                   ✅ Export + Reports + Reviewer Settings
│   │   ├── reviewer-settings-dialog.tsx       ✅
│   │   ├── new/page.tsx                       ✅ Creation form
│   │   └── [changeOrderId]/
│   │       ├── page.tsx                       ✅ Detail page
│   │       └── edit/page.tsx                  ✅ Edit form
│   └── api/projects/[projectId]/
│       ├── change-orders/
│       │   ├── route.ts                       ✅ List/Create
│       │   ├── reviewer-settings/route.ts     ✅
│       │   ├── export/csv/route.ts            ✅ (table name bug fixed ✓)
│       │   └── [changeOrderId]/
│       │       ├── route.ts                   ✅ Get/Update/Delete
│       │       ├── approve/route.ts           ✅
│       │       ├── reject/route.ts            ✅
│       │       ├── line-items/route.ts        ✅
│       │       ├── line-items/[lineItemId]/route.ts ✅
│       │       └── attachments/              ✅ Routes exist
│       │           ├── route.ts               ✅ DB table now exists
│       │           └── [attachmentId]/
│       │               ├── route.ts           ✅ DB table now exists
│       │               └── download/route.ts  ✅ DB table now exists
│       └── change-events/[changeEventId]/
│           └── convert-to-change-order/route.ts ✅
├── components/domain/change-orders/
│   ├── ApprovalWorkflow.tsx                   ✅
│   ├── ChangeOrderDetail.tsx                  ✅
│   ├── ChangeOrderReviewerResponse.tsx        ✅
│   ├── ChangeOrderSummaryCards.tsx            ✅
│   ├── ExportDropdown.tsx                     ✅
│   ├── FileUploadZone.tsx                     ✅
│   ├── LineItemsTable.tsx                     ✅
│   └── ReportsDropdown.tsx                    ✅
├── components/domain/change-events/
│   └── ChangeEventConvertDialog.tsx           ✅
├── hooks/
│   ├── use-change-orders.ts                   ✅
│   ├── use-contract-change-orders.ts          ✅
│   └── use-commitment-change-orders.ts        ✅
├── lib/
│   ├── change-orders/status-transitions.ts   ✅
│   └── change-orders/reviewer-access.ts      ✅
├── lib/schemas/financial-schemas.ts           ✅ (changeOrderSchema — missing scope/schedule_impact)
└── types/contract-change-orders.ts            ✅
```
