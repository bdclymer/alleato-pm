# TASKS: Invoicing

## Project Info
- **Feature:** invoicing
- **Started:** 2026-01-11
- **Status:** Partially Complete
- **Current Phase:** Verification Complete
- **Implementation:** ~35% complete (verified)
- **Last Updated:** 2026-01-11T04:00:00Z

---

## Deliverables Summary
- [~] Database schema complete (migration created, NOT applied)
- [~] API endpoints (owner: 100%, subcontractor: stubbed)
- [~] List pages (owner: complete, subcontractor: placeholder)
- [~] Detail pages (view: complete, edit: missing)
- [ ] Create/edit forms
- [~] Billing period management (API done, UI placeholder)
- [~] E2E Tests (24 written, blocked by pre-existing errors)
- [x] Verification report

---

## Critical Blockers

### BLOCKER 1: Database Migration NOT Applied
- Migration file exists: `supabase/migrations/20260111032127_add_subcontractor_invoices.sql`
- **Action Required:** Apply migration via Supabase dashboard
- Then: `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`

### BLOCKER 2: Pre-existing TypeScript Errors (47)
- Not invoicing-specific
- Blocks: dev server, tests, full build
- Affected: direct-costs, change-events, portfolio

### BLOCKER 3: Auth Setup
- Playwright auth uses non-existent `/dev-login` route
- Blocks: All e2e tests

---

## Phase Tasks

### Phase 1: Database & Schema
- [x] owner_invoices table exists (10 columns)
- [x] owner_invoice_line_items table exists (6 columns)
- [x] billing_periods table exists
- [x] subcontractor_invoices migration created
- [x] subcontractor_invoice_line_items migration created
- [x] RLS policies created (in migration)
- [ ] **BLOCKED:** Apply migration to database
- [ ] **BLOCKED:** Generate fresh Supabase types

### Phase 2: API Endpoints

#### Owner Invoices - COMPLETE
- [x] GET /api/projects/[projectId]/invoicing/owner - List owner invoices
- [x] POST /api/projects/[projectId]/invoicing/owner - Create owner invoice
- [x] GET /api/projects/[projectId]/invoicing/owner/[invoiceId] - Get details
- [x] PUT /api/projects/[projectId]/invoicing/owner/[invoiceId] - Update
- [x] DELETE /api/projects/[projectId]/invoicing/owner/[invoiceId] - Delete
- [x] POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/submit - Submit
- [x] POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/approve - Approve
- [x] FIX: `/api/invoices/route.ts` now queries `owner_invoices`

#### Subcontractor Invoices - STUBBED (needs migration)
- [~] GET /api/projects/[projectId]/invoicing/subcontractor - Returns 501
- [~] POST /api/projects/[projectId]/invoicing/subcontractor - Returns 501
- [~] GET /api/projects/[projectId]/invoicing/subcontractor/[invoiceId] - Returns 501
- [~] PUT /api/projects/[projectId]/invoicing/subcontractor/[invoiceId] - Returns 501
- [~] POST /api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/approve - Returns 501
- [~] POST /api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/pay - Returns 501

#### Billing Periods - COMPLETE
- [x] GET /api/projects/[projectId]/invoicing/billing-periods - List periods
- [x] POST /api/projects/[projectId]/invoicing/billing-periods - Create period
- [x] PUT /api/projects/[projectId]/invoicing/billing-periods/[periodId] - Update
- [x] DELETE /api/projects/[projectId]/invoicing/billing-periods/[periodId] - Delete

### Phase 3: Frontend - Main Invoicing Page
- [x] Create frontend/src/app/[projectId]/invoicing/page.tsx
- [x] Implement Owner/Subcontractor tab navigation
- [x] Create invoicing.config.tsx for table columns
- [x] Implement filtering (status, date range)
- [x] Implement sorting and pagination (via DataTablePage)
- [ ] Add export dropdown (PDF, Excel) - PLACEHOLDER
- [ ] Add "Create Invoice" actions - DROPDOWN EXISTS, FORM MISSING

### Phase 4: Frontend - Invoice Detail Pages
- [x] Create frontend/src/app/[projectId]/invoicing/[invoiceId]/page.tsx
- [x] Invoice header with status badge
- [x] Line items table (read-only)
- [x] Invoice totals section
- [x] Action buttons (Submit, Approve, Delete)
- [ ] Editable line items table
- [ ] Audit trail / change history section

### Phase 5: Frontend - Create/Edit Forms - NOT STARTED
- [ ] Create owner invoice form (link to SOV)
- [ ] Create subcontractor invoice form (link to commitment)
- [ ] Line items management (add/remove/edit)
- [ ] Billing period selector
- [ ] Retention percentage input
- [ ] Form validation with Zod schemas

### Phase 6: Frontend - Components
- [x] Create frontend/src/components/invoicing/ directory
- [x] InvoiceStatusBadge component
- [x] InvoiceLineItemsTable component
- [ ] BillingPeriodSelector component
- [ ] InvoiceApprovalPanel component
- [ ] InvoiceExportMenu component
- [ ] InvoiceFilterPanel component

### Phase 7: Hooks & State - NOT STARTED
- [ ] Create useInvoices() hook
- [ ] Create useOwnerInvoices() hook
- [ ] Create useSubcontractorInvoices() hook
- [ ] Create useBillingPeriods() hook
- [ ] Update financial-store.ts if needed

### Phase 8: Billing Period Management
- [x] Billing periods tab exists
- [ ] Create/edit billing period modal
- [ ] Period date validation (no overlaps)
- [ ] Associate invoices with periods

### Phase 9: Testing
- [x] Create frontend/tests/e2e/invoicing.spec.ts (24 tests)
- [x] Test structure for owner invoice list
- [x] Test structure for subcontractor invoice list
- [x] Test structure for invoice detail page
- [ ] Test create owner invoice flow
- [ ] Test create subcontractor invoice flow
- [ ] Test approval workflow
- [ ] Test export functionality
- [ ] Test billing period management
- [ ] **BLOCKED:** All tests blocked by pre-existing errors

### Phase 10: Verification
- [x] Verification report generated
- [ ] npm run quality passes - BLOCKED (pre-existing errors)
- [ ] All e2e tests pass - BLOCKED
- [ ] Matches Procore reference screenshots - NOT VERIFIED

---

## Files Created This Session

### Database
- `supabase/migrations/20260111032127_add_subcontractor_invoices.sql` (16KB)

### API Routes (11 files)
- `frontend/src/app/api/projects/[projectId]/invoicing/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/submit/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/approve/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/billing-periods/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/billing-periods/[periodId]/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/approve/route.ts`
- `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/pay/route.ts`

### Frontend Pages
- `frontend/src/app/[projectId]/invoicing/page.tsx` (9.2KB)
- `frontend/src/app/[projectId]/invoicing/[invoiceId]/page.tsx`

### Config & Components
- `frontend/src/config/tables/invoicing.config.tsx`
- `frontend/src/components/invoicing/InvoiceStatusBadge.tsx`
- `frontend/src/components/invoicing/InvoiceLineItemsTable.tsx`
- `frontend/src/components/invoicing/index.ts`

### Tests
- `frontend/tests/e2e/invoicing.spec.ts` (24 tests)

### Documentation
- `documentation/*project-mgmt/active/invoicing/RESEARCH.md`
- `documentation/*project-mgmt/active/invoicing/PLANS.md`
- `documentation/*project-mgmt/active/invoicing/TASKS.md`
- `documentation/*project-mgmt/active/invoicing/STATUS.md`
- `documentation/*project-mgmt/active/invoicing/API-REFERENCE.md`
- `documentation/*project-mgmt/active/invoicing/DATABASE-SCHEMA-SUMMARY.md`
- `documentation/*project-mgmt/active/invoicing/TEST-RESULTS.md`
- `documentation/*project-mgmt/active/invoicing/VERIFICATION-REPORT.md`
- `documentation/*project-mgmt/active/invoicing/VERIFICATION-SUMMARY.md`
- `documentation/*project-mgmt/active/invoicing/worker-done-*.md` (3 files)

---

## Next Steps (Priority Order)

1. **Apply database migration** - Unblocks subcontractor invoices
2. **Regenerate TypeScript types** - Unblocks type safety
3. **Fix pre-existing TypeScript errors** - Unblocks dev server
4. **Implement create/edit invoice forms** - Core feature
5. **Implement remaining components** - UI polish
6. **Run and pass e2e tests** - Quality gate
7. **Generate HTML verification report** - Final deliverable

---

## Notes

### What Works Now
- Owner invoice list view with tabs
- Owner invoice detail view with approve/submit/delete
- Billing periods API (full CRUD)
- Status badges, line items table display

### What Needs Migration First
- All subcontractor invoice functionality
- TypeScript types for new tables

### Dependencies
- Commitments module (for linking subcontractor invoices)
- Schedule of Values (for owner invoice line items)
- Prime Contracts (for owner invoice association)
