# Prime Contracts — Verified Gap Analysis
**Method:** Live DOM crawl (Feb 23 2026) + support doc analysis vs codebase review
**Source of truth:** `procore-definitive-feature-list.md`
**Date:** 2026-02-23

---

## Overall Score: 7/10

| Category | Procore | We Have | Gap |
|----------|---------|---------|-----|
| Database fields | 21 core | 19 | Missing 2 |
| List columns | 18 | 10 | Missing 8 (all financial calcs) |
| Create form fields | 15 visible | 10 | Missing 5 in form |
| Financial calculations | 10 | 0 | ALL missing |
| Invoice/Payment infra | Yes | No | CRITICAL |
| Configure settings | 8 | 0 | None built |
| Change orders | Full | Basic | Partial |
| ERP Status | Yes | No | Low priority |

---

## What We Have ✅ (Confirmed Working)

### Database Schema (`prime_contracts` table)

All core fields exist and match Procore:

| Procore Field | Our Column | Status |
|--------------|-----------|--------|
| Contract # | `contract_number` | ✅ |
| Title | `title` | ✅ |
| Owner/Client | `client_id` | ✅ (was vendor_id — already fixed) |
| Status | `status` (prime_contract_status_v2 enum) | ✅ |
| Executed | `executed` (boolean) | ✅ |
| Executed Date | `executed_at` | ✅ |
| Contractor | `contractor_id` | ✅ |
| Architect/Engineer | `architect_engineer_id` | ✅ |
| Description | `description` | ✅ |
| Inclusions | `inclusions` | ✅ |
| Exclusions | `exclusions` | ✅ |
| Default Retainage | `retention_percentage` | ✅ |
| Original Contract Amount | `original_contract_value` | ✅ |
| Revised Contract Amount | `revised_contract_value` | ✅ (not auto-calculated) |
| Start Date | `start_date` | ✅ |
| Estimated Completion | `end_date` | ✅ |
| Substantial Completion | `substantial_completion_date` | ✅ |
| Actual Completion | `actual_completion_date` | ✅ |
| Signed Contract Received | `signed_contract_received_date` | ✅ |
| Contract Termination Date | `contract_termination_date` | ✅ |
| Private | `is_private` | ✅ |
| Payment Terms | `payment_terms` | ✅ DB only |
| Billing Schedule | `billing_schedule` | ✅ DB only |

### Status Enum

Both `database.local.types.ts` and `validation.ts` use the same values matching Procore:
- draft, out_for_bid, out_for_signature, approved, complete, terminated ✅

### API Routes

Full CRUD + line items + change orders (basic):
- GET/POST `/api/projects/[projectId]/contracts`
- GET/PUT/DELETE `/api/projects/[projectId]/contracts/[contractId]`
- GET/POST line-items routes
- GET/POST change-orders routes
- Approve/Reject change order routes

### UI Pages

- List page: `/[projectId]/prime-contracts/`
- Create form: `/[projectId]/prime-contracts/new`
- Detail view: `/[projectId]/prime-contracts/[contractId]`
- Edit form: `/[projectId]/prime-contracts/[contractId]/edit`

---

## What's Broken 🔴

### 1. Security: Permission Check Disabled

**File:** `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts:152`
**Issue:** Permission check commented out with TODO — anyone can edit any contract
**Fix:** Uncomment 4 lines

### 2. Payment Terms + Billing Schedule Not in Form

**File:** `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx`
**Issue:** payment_terms and billing_schedule are hardcoded `null` and have no form fields
**Fix:** Add two fields to the ContractForm component

### 3. No React Query Hook

**File:** `frontend/src/hooks/use-prime-contracts.ts` — DOES NOT EXIST
**Issue:** All pages use raw `fetch()` — no caching, loading states, error handling
**Fix:** Create hook following pattern from `use-commitments.ts`

### 4. database.types.ts is EMPTY

**File:** `frontend/src/types/database.types.ts` — 0 bytes
**Issue:** Running db:types generates an empty file. All code relies on `database.local.types.ts`
**Fix:** Run `npm run db:types` properly — check if Supabase project ID is correct

---

## What's Missing — Critical 🟠

### 5. Financial Calculated Columns (ALL 10 Missing)

Procore shows these in the Contract Summary section AND as list page columns.
**We show: $0 for all of them.**

| Field | Calculation |
|-------|------------|
| Approved Change Orders | SUM of approved CO amounts |
| Revised Contract Amount | Original + Approved COs (auto-calc) |
| Pending Change Orders | SUM of pending CO amounts |
| Pending Revised Contract Amount | Revised + Pending |
| Draft Change Orders | SUM of draft CO amounts |
| Invoices | SUM of payment_applications amounts |
| Payments Received | SUM of payments received |
| Percent Paid | Payments / Revised Contract Amount × 100 |
| Remaining Balance | Revised - Payments |

**Fix:** Create a materialized view or computed SQL view:
```sql
CREATE VIEW prime_contracts_with_financials AS
SELECT
  pc.*,
  COALESCE(approved.total, 0) AS approved_change_orders_amount,
  COALESCE(pending.total, 0) AS pending_change_orders_amount,
  COALESCE(draft.total, 0) AS draft_change_orders_amount,
  pc.original_contract_value + COALESCE(approved.total, 0) AS calculated_revised_value,
  -- invoices and payments require those tables to exist first
FROM prime_contracts pc
LEFT JOIN (...) approved ON ...
```

### 6. Invoice / Payment Applications Infrastructure (MISSING)

Procore has:
- **payment_applications** table — tracks owner invoices
- **payments** table — tracks payments received on a prime contract

We have:
- No `payment_applications` table for prime contracts
- No `payments` table linked to prime contracts

**Impact:** The "Invoices" and "Payments Received" columns on the list page will always be $0.
**Impact:** "Create Invoice" and "Create Payment" actions don't work.

**Fix:** Create these tables (new migration needed):
- `prime_contract_payment_applications` (invoice tracking)
- `prime_contract_payments` (payment tracking)

### 7. "Access for Non-Admin Users" Not Saved

**Issue:** The create form has `is_private` and user-access list, but we only save `is_private` — the allowed_users array is never persisted.
**Fix:** Add `allowed_user_ids` array column or a join table `prime_contract_allowed_users`

### 8. List Page Shows $0 for All Financial Columns

**Cause:** The list page doesn't query the calculated financial data — it only fetches the base prime_contracts row.
**Fix:** Requires #5 above (view/computed columns) to be implemented first.

---

## What's Missing — Medium Priority 🟡

### 9. Configure Tab / Settings Page (NOT BUILT)

Procore's configure tab has 8 settings. We have none of these:

| Setting | Priority |
|---------|----------|
| Number of CO Tiers (1 or 2) | High — affects CO workflow |
| Allow standard users to create PCCOs | High |
| Allow standard users to create PCOs | High |
| SOV always editable | Medium |
| Show markup on CO PDF exports | Low |
| Show markup on invoice PDF/CSV | Low |
| Default distributions | Low |

### 10. Change Events Integration

Procore's "Create Change Event" action creates an entry in the change_events tool (separate tool). We need to verify our change events tool integration.

### 11. ERP Status Column

`erpStatus` appears in the list page. System-managed field reflecting accounting sync status. **Low priority** — only relevant when ERP integration is built.

### 12. Additional Configurable Date Fields

These appear when admin configures them:
- Contract Date (effective date)
- Execution Date (signing date)
- Issued On Date
- Returned Date
- Letter of Intent Date
- Approval Letter Date

These are all optional in Procore. Not needed for MVP.

---

## What's Different — Our Design Choices

| Procore | Ours | Notes |
|---------|------|-------|
| Single-page detail (sections) | Tabbed detail view | Our tabs are fine — just different layout |
| `vendor` ag-grid column | `vendor_id` in DB | Column name is fine; display name should be "Vendor/Contractor" |
| No billing schedule field | billing_schedule in DB | We ADDED this — it's not in Procore's visible form |

---

## Priority Fix List (Updated + Verified)

### Priority 1 — Security (XS, do now)
1. **Re-enable permission check** — `route.ts:152` — Uncomment 4 lines

### Priority 2 — Data Accuracy (S, 1-2 hours)
2. **Fix database.types.ts** — Run `npm run db:types` correctly
3. **Add payment_terms + billing_schedule to create/edit form** — `ContractForm.tsx`
4. **Create `use-prime-contracts.ts` hook** — Follow commitments hook pattern

### Priority 3 — Financial Calculations (M, 4-6 hours)
5. **Create DB view `prime_contracts_with_financials`** — Calculates CO amounts, revised value
6. **Update list page to query the view** — Display real numbers instead of $0
7. **Update detail page Contract Summary** — Show all 10 financial fields from view

### Priority 4 — Invoice/Payment Infrastructure (L, 1-2 days)
8. **Create `prime_contract_payment_applications` table** — New migration
9. **Create `prime_contract_payments` table** — New migration
10. **Create API routes** for both tables
11. **Create UI** for invoices and payments sub-sections

### Priority 5 — Configure Settings (M, 4-6 hours)
12. **Build configure tab UI** — 8 settings with project-level storage

### Priority 6 — Verified Testing (M, 1 day)
13. **E2E tests** for create, edit, approve, change orders workflows
14. **Integration test** for financial calculation accuracy

---

## Revised Completeness Score

| Category | Score |
|----------|-------|
| Database schema | 9/10 (missing optional date fields, missing payment/invoice tables) |
| Form fields | 7/10 (missing payment_terms, billing_schedule in form; missing access list) |
| API routes | 9/10 (missing invoice/payment routes) |
| Financial calculations | 0/10 (none implemented) |
| List page display | 6/10 ($0 for 8 columns) |
| Detail page | 7/10 (missing Contract Summary calculations) |
| Configure settings | 0/10 |
| Security | 3/10 (permission check disabled) |
| Testing | 0/10 |

**Overall: 7/10 structure, 4/10 financial accuracy**

---

## Files That Need Changes

| File | Change |
|------|--------|
| `frontend/src/app/api/projects/[projectId]/contracts/[contractId]/route.ts` | Uncomment permission check (line ~152) |
| `frontend/src/components/domain/contracts/ContractForm.tsx` | Add payment_terms, billing_schedule fields |
| `frontend/src/hooks/use-prime-contracts.ts` | Create (does not exist) |
| `supabase/migrations/` | New migration: prime_contracts_with_financials view |
| `supabase/migrations/` | New migration: prime_contract_payment_applications table |
| `supabase/migrations/` | New migration: prime_contract_payments table |
| `frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx` | Use view with financial columns |
| `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx` | Show Contract Summary section |
