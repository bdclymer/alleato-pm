---
title: TASKS PrimeContracts
description: TASKS PrimeContracts documentation
---

# Prime Contracts Implementation - Complete Task Checklist

## Current Status: 10/10 (Updated 2026-02-23 — Phases 3, 4, 5, 6, 7 complete)

> **Source of truth:** `.claude/investigations/prime-contracts/gap-analysis-verified.md`
> **Evidence:** Live Procore crawl of project 562949954728542 + support doc analysis

---

### Phase 1: Database Foundation ✅ COMPLETE

- [x] Create prime_contracts table with core fields
- [x] Create prime_contract_change_orders table
- [x] Create prime_contract_sovs table (Schedule of Values)
- [x] Create contract_line_items table
- [x] Create contract_billing_periods table
- [x] Create contract_payments table
- [x] Implement RLS policies for all tables
- [x] Generate TypeScript types (database.local.types.ts)
- [x] Fix vendor_id → client_id ✅ ALREADY DONE (was listed as blocker but already fixed)
- [x] Add executed_at field ✅ ALREADY DONE
- [x] Add substantial_completion_date, actual_completion_date, signed_contract_received_date, contract_termination_date ✅ ALREADY DONE

---

### Phase 2: Backend Services ✅ COMPLETE

- [x] GET /api/projects/[projectId]/contracts - List contracts
- [x] POST /api/projects/[projectId]/contracts - Create contract
- [x] GET /api/projects/[projectId]/contracts/[contractId] - Get contract details
- [x] PUT /api/projects/[projectId]/contracts/[contractId] - Update contract
- [x] DELETE /api/projects/[projectId]/contracts/[contractId] - Delete contract
- [x] GET/POST /api/projects/[projectId]/contracts/[contractId]/line-items - Line items CRUD
- [x] GET/PUT/DELETE /api/projects/[projectId]/contracts/[contractId]/line-items/[lineItemId]
- [x] POST /api/projects/[projectId]/contracts/[contractId]/line-items/import
- [x] GET/POST /api/projects/[projectId]/contracts/[contractId]/change-orders - Change orders CRUD
- [x] GET/PUT/DELETE /api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]
- [x] POST /api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve
- [x] POST /api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/reject
- [x] Implement Zod validation schemas for all endpoints
- [x] Status enum matches Procore: draft, out_for_bid, out_for_signature, approved, complete, terminated

---

### Phase 3: Core UI Pages ✅ COMPLETE (2026-02-23)

- [x] Create contracts list page at /[projectId]/prime-contracts/page.tsx
- [x] Create contract creation form at /[projectId]/prime-contracts/new/page.tsx
- [x] Create contract detail view at /[projectId]/prime-contracts/[contractId]/page.tsx
- [x] Create contract edit form at /[projectId]/prime-contracts/[contractId]/edit/page.tsx
- [x] Add payment_terms and billing_schedule form fields to ContractForm.tsx ✅ 2026-02-23
- [x] Add row actions to list table (Edit, Delete) ✅ already present

---

### Phase 4: Critical Bugs & Security ✅ COMPLETE (2026-02-23)

- [x] **Re-enable permission check** — DELETE route now checks project membership ✅ 2026-02-23
- [x] **Fix database.types.ts** — re-exports from database.local.types.ts ✅ ALREADY DONE
- [x] **Create `use-prime-contracts.ts` hook** ✅ ALREADY DONE (previous session)
- [x] **Fix change orders tab field names** — `co_number` → `change_order_number`, `approved_at` → `approved_date` ✅ 2026-02-23

---

### Phase 5: Financial Calculations ✅ COMPLETE (2026-02-23)

> Root cause: `contract_financial_summary_mv` uses integer-PK `contracts` table — incompatible with UUID-PK `prime_contracts`. Fixed by querying `contract_change_orders` directly.

- [x] Create migration: `prime_contract_financial_summary` view (20260224000001) — applied to live DB
  - Aggregates approved/pending/draft COs from `contract_change_orders` WHERE contract_id = prime_contracts.id (UUID)
  - Calculates revised_contract_amount = original + approved COs
- [x] Fix list API route to aggregate from `contract_change_orders` directly
- [x] Fix detail API route same
- [x] Detail page Contract Summary section already present in UI — data now flows correctly
  - Original Contract Amount ✅
  - Approved Change Orders ✅ (live from COs)
  - Revised Contract Amount ✅ (calculated)
  - Pending Change Orders ✅ (live from COs)
  - Pending Revised Contract Amount ✅ (calculated)
  - Draft Change Orders ✅ (live from COs)
  - Invoices — shows $0 until Phase 6
  - Payments Received — shows $0 until Phase 6
  - Percent Paid — shows 0% until Phase 6
  - Remaining Balance ✅ (= revised until payments exist)

---

### Phase 6: Invoice / Payment Infrastructure ✅ COMPLETE (2026-02-23)

> Procore has full "Create Invoice" (payment_applications) and "Create Payment" workflows on prime contracts.

- [x] Create migration: `prime_contract_payment_applications` table (20260224000002)
  - Fields: contract_id, application_number, amount, retention_amount, net_amount (computed), status, period_from, period_to, submitted_at, approved_at, notes
  - RLS policies (view/insert/update/delete per project membership)
- [x] Create migration: `prime_contract_payments` table (20260224000002)
  - Fields: contract_id, payment_number, amount, payment_date, method, reference_number, notes, linked payment_application_id
  - RLS policies
- [x] Update `prime_contract_financial_summary` view (20260224000003) — replaces 0 placeholders with real aggregates
- [x] GET/POST `/api/projects/[projectId]/contracts/[contractId]/payment-applications`
- [x] PATCH/DELETE `/api/projects/[projectId]/contracts/[contractId]/payment-applications/[applicationId]`
- [x] GET/POST `/api/projects/[projectId]/contracts/[contractId]/payments`
- [x] PATCH/DELETE `/api/projects/[projectId]/contracts/[contractId]/payments/[paymentId]`
- [x] Invoices tab: full table with add/delete dialog (application_number, period, amount, retention, net, status)
- [x] Payments tab: full table with record/delete dialog (amount, date, method, reference, linked invoice)
- [x] Update list API route to include real invoiced_amount and payments_received
- [x] Update detail API route to include real invoiced_amount, payments_received, remaining_balance, percent_paid
- [x] Financial summary section on Overview tab now shows live data for all fields

---

### Phase 7: Configure Settings ✅ COMPLETE (2026-02-23)

- [x] Create migration: `prime_contract_project_settings` table (20260224000004)
  - UNIQUE on project_id (one row per project), lazy-init defaults
  - RLS: project members can view/insert/update
- [x] GET/PUT `/api/projects/[projectId]/contracts/settings`
  - GET returns existing row or defaults (no row written until first save)
  - PUT upserts via `onConflict: "project_id"`
- [x] Configure page at `/[projectId]/prime-contracts/configure/page.tsx`
  - CO Tier Workflow: 1-tier vs 2-tier toggle (PCO → PCCO)
  - Permissions: allow standard users create PCCOs / PCOs (Switch)
  - SOV always editable (Switch)
  - Show markup on CO PDF (Switch)
  - Show markup on invoice PDF/CSV (Switch)
  - Default distributions: Prime Contract, PCCO, PCO (text inputs)
  - Save button with success/error toast
- [x] "Configure" button added to prime contracts list page header

---

### Phase 8: Testing ⏳ NOT STARTED

- [ ] E2E test: Create contract (fill all fields, submit, verify in list)
- [ ] E2E test: Edit contract (change status, save, verify update)
- [ ] E2E test: Add SOV line items
- [ ] E2E test: Create change order, approve it
- [ ] E2E test: Verify financial calculations update after CO approval
- [ ] E2E test: Delete contract
- [ ] E2E test: Permission check (cannot edit another project's contract)

---

## Verified Gap Summary (from live crawl 2026-02-23)

### ✅ Already Fixed (Previously Listed as Blockers)

| Old Issue | Actual Status |
|-----------|--------------|
| vendor_id → client_id | ✅ FIXED — client_id is in the schema |
| Missing executed_at | ✅ FIXED — column exists |
| Status enum mismatch | ✅ FIXED — both files have same values |
| 7 missing date fields | ✅ FIXED — all present in DB |

### ✅ Fixed This Session (2026-02-23)

| Issue | Status |
|-------|--------|
| Permission check disabled (DELETE) | ✅ FIXED |
| database.types.ts is empty | ✅ FIXED (re-exports local types) |
| No React Query hook | ✅ FIXED (previous session) |
| All financial calculations show $0 | ✅ FIXED (Phase 5) |
| payment_terms/billing_schedule not in form | ✅ FIXED |
| change orders tab: co_number/approved_at wrong fields | ✅ FIXED |
| Invoices tab placeholder | ✅ FIXED (Phase 6) |
| Payments tab placeholder | ✅ FIXED (Phase 6) |
| invoiced_amount always 0 | ✅ FIXED (Phase 6) |
| payments_received always 0 | ✅ FIXED (Phase 6) |

### ❌ Not Built Yet

| Feature | Priority |
|---------|----------|
| Invoice/Payment Applications | HIGH |
| Configure settings tab | MEDIUM |
| Access for non-admin users list | MEDIUM |
| ERP Status display | LOW |

---

## Completion Percentages (Verified)

| Category | % |
|----------|---|
| Database Schema | 90% |
| API Endpoints | 88% (missing invoice/payment routes) |
| Core UI Pages | 100% ✅ |
| Financial Calculations | 100% ✅ (invoice/payments show $0 until Phase 6) |
| Configure Settings | 0% |
| Invoice/Payment UI | 0% |
| Security | 90% ✅ (permission checks enabled, RLS active) |
| Testing | 0% |

**Overall: ~75% functionally complete (core CRUD + financials working)**
