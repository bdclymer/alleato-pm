# Prime Contracts: Implementation vs Procore Comparison Report

**Date:** 2026-01-11
**Procore Reference:** Prime-Contracts-Page-.md (crawl data from Dec 2025)
**Implementation Files:**
- Table Config: `src/config/tables/contracts.config.ts`
- Page: `src/app/[projectId]/contracts/page.tsx`
- Form: `src/components/domain/contracts/ContractForm.tsx`
- Database: `src/types/database.types.ts` (prime_contracts table)

---

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| **List Table Columns** | ⚠️ **PARTIAL** | 9/18 columns implemented (50%) |
| **Form Fields** | ⚠️ **PARTIAL** | Missing critical financial fields |
| **Financial Calculations** | ❌ **MISSING** | No change order aggregations |
| **Database Schema** | ⚠️ **PARTIAL** | Basic fields only, missing relationships |
| **Status Workflow** | ⚠️ **PARTIAL** | 5/6 Procore statuses |

**Overall Verdict:** ⚠️ **NEEDS SIGNIFICANT WORK** - Implementation is approximately **40% complete** compared to Procore.

---

## 📊 Section 1: List Table Columns Comparison

### Procore Columns (18 total)

| # | Procore Column | Type | Implementation Status | Notes |
|---|----------------|------|----------------------|-------|
| 1 | **Number** | String | ✅ `contract_number` | Match |
| 2 | **Owner / Client** | Reference | ⚠️ Partial | Has `vendor_name` (wrong entity) |
| 3 | **Title** | String | ✅ `title` | Match |
| 4 | **Status** | Enum | ✅ `status` | Partial match (see below) |
| 5 | **Executed** | Boolean | ❌ Missing | Critical field |
| 6 | **Original Contract Amount** | Currency | ✅ `original_contract_value` | Match |
| 7 | **Approved Change Orders** | Currency (calc) | ❌ Missing | Needs aggregation |
| 8 | **Revised Contract Amount** | Currency (calc) | ✅ `revised_contract_value` | Match (but calc missing) |
| 9 | **Pending Change Orders** | Currency (calc) | ❌ Missing | Needs aggregation |
| 10 | **Draft Change Orders** | Currency (calc) | ❌ Missing | Needs aggregation |
| 11 | **Invoiced** | Currency (calc) | ❌ Missing | Needs aggregation |
| 12 | **Payments Received** | Currency (calc) | ❌ Missing | Needs aggregation |
| 13 | **% Paid** | Percentage (calc) | ❌ Missing | Needs calculation |
| 14 | **Remaining Balance Outstanding** | Currency (calc) | ❌ Missing | Needs calculation |
| 15 | **Private** | Boolean | ❌ Missing | Privacy control |
| 16 | **Attachments** | Integer (count) | ❌ Missing | File count |
| 17 | Start Date | Date | ✅ `start_date` | Extra (not in Procore table) |
| 18 | End Date | Date | ✅ `end_date` | Extra (not in Procore table) |
| 19 | Description | Text | ✅ `description` | Extra (not in Procore table) |

### ✅ IMPLEMENTED CORRECTLY (9 columns)

| Column | Implementation | Match Quality |
|--------|----------------|---------------|
| Number | `contract_number` | ✅ Perfect |
| Title | `title` | ✅ Perfect |
| Status | `status` | ⚠️ Partial (missing statuses) |
| Original Value | `original_contract_value` | ✅ Perfect |
| Revised Value | `revised_contract_value` | ✅ Perfect (manual, not calculated) |
| Start Date | `start_date` | ✅ Bonus field |
| End Date | `end_date` | ✅ Bonus field |
| Description | `description` | ✅ Bonus field |
| Vendor | `vendor_name` | ⚠️ Wrong entity type |

### ❌ MISSING FROM IMPLEMENTATION (9 critical columns)

| Missing Column | Type | Impact | Formula/Source |
|----------------|------|--------|----------------|
| **Owner/Client** | Reference | 🔴 **HIGH** | Should reference `clients` table, not `vendors` |
| **Executed** | Boolean | 🔴 **HIGH** | Controls editability & workflow |
| **Approved Change Orders** | Currency | 🔴 **HIGH** | `SUM(prime_contract_change_orders WHERE status='approved')` |
| **Pending Change Orders** | Currency | 🟡 **MEDIUM** | `SUM(prime_contract_change_orders WHERE status='pending')` |
| **Draft Change Orders** | Currency | 🟢 **LOW** | `SUM(prime_contract_change_orders WHERE status='draft')` |
| **Invoiced** | Currency | 🔴 **HIGH** | `SUM(owner_invoice_line_items)` |
| **Payments Received** | Currency | 🔴 **HIGH** | `SUM(payment_transactions)` |
| **% Paid** | Percentage | 🔴 **HIGH** | `(Payments Received ÷ Revised Contract) × 100` |
| **Remaining Balance** | Currency | 🔴 **HIGH** | `Revised Contract − Payments Received` |
| **Private** | Boolean | 🟡 **MEDIUM** | Privacy/permissions control |
| **Attachments** | Integer | 🟢 **LOW** | `COUNT(attachments WHERE entity_type='prime_contract')` |

---

## 🚨 Section 2: Critical Issues

### Issue #1: Wrong Entity Type (Owner vs Vendor)

**Problem:**
- Procore uses **Owner/Client** (the entity paying the contractor)
- Implementation uses **Vendor** (typically subcontractors/suppliers)

**Impact:** ❌ **CRITICAL** - Semantic mismatch in business logic

**Current Code:**
```typescript
// contracts.config.ts line 32-42
{
  id: "vendor_name",
  label: "Vendor",
  defaultVisible: true,
  type: "text",
  sortable: true,
  renderConfig: {
    type: "nested",
    path: "vendor.name",
    fallback: "--",
  },
}

// Database schema
vendor_id: string | null  // ← WRONG: should be owner_id or client_id
```

**Required Fix:**
1. Change database column from `vendor_id` to `client_id`
2. Update table config to show "Owner/Client" instead of "Vendor"
3. Update form to use client selector instead of vendor selector
4. Add migration to rename column

---

### Issue #2: Missing Financial Calculations

**Problem:** Procore table shows **8 calculated financial columns** that are completely missing:

| Calculation | Formula | Purpose |
|-------------|---------|---------|
| Approved COs | `SUM(change_orders WHERE status='approved')` | Impacts revised contract |
| Pending COs | `SUM(change_orders WHERE status='pending')` | Forecast-only |
| Draft COs | `SUM(change_orders WHERE status='draft')` | Internal planning |
| Invoiced | `SUM(invoice_line_items)` | Billing progress |
| Payments Received | `SUM(payments)` | Cash flow |
| % Paid | `(Payments ÷ Revised) × 100` | Payment progress |
| Remaining Balance | `Revised − Payments` | Accounts receivable |
| Revised Contract | `Original + Approved COs` | Total contract value |

**Impact:** ❌ **CRITICAL** - Cannot track financial progress without these

**Required Fix:**
1. Create database view or API endpoint that aggregates these values
2. Add columns to table config
3. Ensure calculations match Procore formulas exactly

---

### Issue #3: Missing "Executed" Field

**Problem:**
- Procore has "Executed" boolean field (Yes/No)
- Indicates if contract has been fully executed/signed
- Controls workflow and editability

**Impact:** 🔴 **HIGH** - Missing critical workflow state

**Current Database Schema:**
```typescript
// Database does NOT have executed field
// Only has: status, start_date, end_date
```

**Required Fix:**
1. Add `executed_at` timestamp column to database (nullable)
2. Add `executed` computed field to API responses (boolean: `executed_at != null`)
3. Add to form as checkbox
4. Add to table as boolean column

---

### Issue #4: Status Workflow Mismatch

**Procore Statuses (from reference):**
1. Draft
2. Approved
3. Executed
4. (Implied: Pending, Void/Cancelled)

**Implementation Statuses:**
```typescript
const CONTRACT_STATUSES = [
  { value: "draft", label: "Draft" },           // ✅ Match
  { value: "pending", label: "Pending" },       // ✅ Match
  { value: "out_for_signature", label: "Out for Signature" }, // ⚠️ Not in Procore
  { value: "approved", label: "Approved" },     // ✅ Match
  { value: "complete", label: "Complete" },     // ⚠️ Should be "Executed"
  { value: "void", label: "Void" },            // ⚠️ Should be "Cancelled"
];

// Database allows: draft, active, completed, cancelled, on_hold
```

**Issues:**
- ⚠️ "Executed" status missing (critical workflow state)
- ⚠️ "out_for_signature" not in Procore
- ⚠️ "complete" should be "executed"
- ⚠️ "void" should be "cancelled"
- ⚠️ Database uses different statuses than form

**Required Fix:**
1. Align statuses between form, database, and Procore
2. Add "Executed" status
3. Remove "out_for_signature" or map to Procore equivalent
4. Ensure database schema matches

---

## 📋 Section 3: Form Fields Comparison

### Procore Form Fields (from create page)

**From crawl metadata:** 79 clickables, 17 dropdowns on create page

**Critical Form Fields:**

| Field Group | Procore Fields | Implementation Status |
|-------------|----------------|----------------------|
| **General Info** | Number, Title, Owner/Client, Status, Executed, Retainage % | ⚠️ Partial (missing executed, wrong entity) |
| **Financial** | Original Amount, Revised Amount (calculated) | ⚠️ Manual revised (should be calculated) |
| **Dates** | Start Date, Est. Completion, Substantial Completion, Actual Completion, Signed Received, Termination | ⚠️ Partial (only start/end implemented) |
| **Schedule of Values** | SOV line items, Accounting Method | ✅ Implemented |
| **Inclusions/Exclusions** | Text fields | ✅ Implemented |
| **Privacy** | Private flag, Allowed Users, SOV visibility | ⚠️ Partial (form has it, DB missing) |
| **Attachments** | File uploads | ⚠️ Partial (form has it, no storage) |

### ❌ MISSING Critical Form Fields

| Field | Type | Impact | Required By |
|-------|------|--------|-------------|
| **Executed checkbox** | Boolean | 🔴 HIGH | Workflow control |
| **Owner/Client selector** | Dropdown | 🔴 HIGH | Replace vendor field |
| **Architect/Engineer** | Dropdown | 🟡 MEDIUM | Procore has this |
| **Contract Company ID** | Dropdown | 🟡 MEDIUM | Multi-company support |
| **Estimated Completion Date** | Date | 🟡 MEDIUM | Project tracking |
| **Substantial Completion Date** | Date | 🟡 MEDIUM | Milestone tracking |
| **Actual Completion Date** | Date | 🟡 MEDIUM | Project closeout |
| **Signed Contract Received Date** | Date | 🟡 MEDIUM | Admin tracking |
| **Contract Termination Date** | Date | 🟢 LOW | Cancellation tracking |

---

## 🎯 Section 4: Database Schema Comparison

### Procore Implied Schema vs Implementation

| Field | Procore Type | Implementation Type | Match | Notes |
|-------|--------------|---------------------|-------|-------|
| `id` | BIGINT | string (UUID) | ⚠️ Different | UUID is better |
| `number` | VARCHAR | string (`contract_number`) | ✅ Match | - |
| `title` | VARCHAR | string | ✅ Match | - |
| `owner_client_id` | BIGINT | ❌ Missing | ❌ Critical | Has `vendor_id` instead |
| `status` | ENUM | string | ⚠️ Partial | Different values |
| `executed` | BOOLEAN | ❌ Missing | ❌ Critical | Should add `executed_at` |
| `original_amount` | DECIMAL | number (`original_contract_value`) | ✅ Match | - |
| `revised_amount` | DECIMAL (calc) | number (`revised_contract_value`) | ⚠️ Manual | Should be calculated |
| `start_date` | DATE | string | ✅ Match | - |
| `end_date` | DATE | string | ✅ Match | - |
| `retention_percentage` | DECIMAL | number | ✅ Match | - |
| `payment_terms` | VARCHAR | string | ✅ Match | - |
| `billing_schedule` | VARCHAR | string | ✅ Match | - |
| `description` | TEXT | string | ✅ Match | - |
| `is_private` | BOOLEAN | ❌ Missing | ❌ Critical | Privacy control |
| `created_by` | UUID | string | ✅ Match | - |
| `created_at` | TIMESTAMP | string | ✅ Match | - |
| `updated_at` | TIMESTAMP | string | ✅ Match | - |

### ❌ Missing Database Fields

| Field | Type | Purpose | Impact |
|-------|------|---------|--------|
| `client_id` | UUID FK | Reference to owner/client | 🔴 **CRITICAL** |
| `executed_at` | TIMESTAMP | When contract was executed | 🔴 **CRITICAL** |
| `is_private` | BOOLEAN | Privacy/permissions control | 🟡 **MEDIUM** |
| `estimated_completion_date` | DATE | Project planning | 🟡 **MEDIUM** |
| `substantial_completion_date` | DATE | Milestone tracking | 🟡 **MEDIUM** |
| `actual_completion_date` | DATE | Project closeout | 🟡 **MEDIUM** |
| `signed_contract_received_date` | DATE | Admin tracking | 🟢 **LOW** |
| `contract_termination_date` | DATE | Cancellation tracking | 🟢 **LOW** |
| `architect_engineer_id` | UUID FK | A/E reference | 🟢 **LOW** |
| `contract_company_id` | UUID FK | Multi-company support | 🟢 **LOW** |

### ✅ Good: Existing Relationships

The database already has related tables for:
- `prime_contract_change_orders` - Change order tracking
- `prime_contract_sovs` - Schedule of values

**But:** No aggregation views or computed columns for financial calculations

---

## 📊 Section 5: Financial Calculation Requirements

### Critical Formulas (from Procore)

**Procore enforces these non-negotiable rules:**

```typescript
// 1. Revised Contract Amount
revised_contract_amount = original_amount + SUM(approved_change_orders)

// 2. Remaining Balance
remaining_balance = revised_contract_amount - payments_received

// 3. % Paid
percent_paid = (payments_received / revised_contract_amount) × 100
// Must guard divide-by-zero

// 4. Change Orders by Status
approved_cos = SUM(change_orders WHERE status = 'approved')
pending_cos = SUM(change_orders WHERE status = 'pending')
draft_cos = SUM(change_orders WHERE status = 'draft')

// 5. Important Rules
// - Pending/Draft COs NEVER affect Revised Contract
// - Only Approved COs affect Revised Contract
// - Revised Contract is the source of truth for billing
```

**Current Implementation:**
- ❌ No aggregation queries
- ❌ `revised_contract_value` is manually entered (wrong!)
- ❌ No payment tracking
- ❌ No invoice tracking
- ❌ No change order aggregation

**Required Implementation:**
1. Create database view or API that calculates all aggregations
2. Make `revised_contract_value` computed (not editable)
3. Add payment and invoice tracking
4. Add change order status aggregations

---

## 🚨 CRITICAL ISSUES SUMMARY

### 🔴 BLOCKING ISSUES (Must Fix)

| # | Issue | Impact | Complexity |
|---|-------|--------|-----------|
| 1 | **Wrong entity type (Vendor → Owner/Client)** | Data model fundamentally wrong | 🔴 HIGH |
| 2 | **Missing financial calculations** | Cannot track contract progress | 🔴 HIGH |
| 3 | **Missing "Executed" field** | Workflow incomplete | 🟡 MEDIUM |
| 4 | **No payment tracking** | Cannot calculate % paid or remaining | 🔴 HIGH |
| 5 | **Manual revised contract value** | Should be calculated from COs | 🟡 MEDIUM |

### 🟡 NON-BLOCKING ISSUES (Should Fix)

| # | Issue | Impact | Complexity |
|---|-------|--------|-----------|
| 6 | **Missing date fields** | Limited milestone tracking | 🟢 LOW |
| 7 | **Missing privacy controls** | No permission management | 🟡 MEDIUM |
| 8 | **Status workflow mismatch** | Confusing for users | 🟢 LOW |
| 9 | **Missing attachments count** | No file visibility | 🟢 LOW |

---

## ✅ ACTION PLAN

### Phase 1: Critical Data Model Fixes (Required for MVP)

**1. Fix Owner/Client Entity Type** (🔴 CRITICAL - 2-3 hours)
   ```sql
   -- Migration
   ALTER TABLE prime_contracts
   RENAME COLUMN vendor_id TO client_id;

   ALTER TABLE prime_contracts
   ADD CONSTRAINT fk_client
   FOREIGN KEY (client_id) REFERENCES clients(id);
   ```
   - Update all TypeScript types
   - Update form to use client selector
   - Update table config

**2. Add "Executed" Field** (🔴 CRITICAL - 1 hour)
   ```sql
   ALTER TABLE prime_contracts
   ADD COLUMN executed_at TIMESTAMP DEFAULT NULL;
   ```
   - Add checkbox to form
   - Add boolean column to table (computed: `executed_at != null`)
   - Update status workflow

**3. Add Financial Aggregation View** (🔴 CRITICAL - 3-4 hours)
   ```sql
   CREATE VIEW prime_contracts_financial AS
   SELECT
     pc.*,
     COALESCE(SUM(CASE WHEN pco.status = 'approved' THEN pco.amount ELSE 0 END), 0) as approved_change_orders,
     COALESCE(SUM(CASE WHEN pco.status = 'pending' THEN pco.amount ELSE 0 END), 0) as pending_change_orders,
     COALESCE(SUM(CASE WHEN pco.status = 'draft' THEN pco.amount ELSE 0 END), 0) as draft_change_orders,
     (pc.original_contract_value + COALESCE(SUM(CASE WHEN pco.status = 'approved' THEN pco.amount ELSE 0 END), 0)) as calculated_revised_value
   FROM prime_contracts pc
   LEFT JOIN prime_contract_change_orders pco ON pco.prime_contract_id = pc.id
   GROUP BY pc.id;
   ```
   - Add columns to table config
   - Update API to use view
   - Make revised_contract_value read-only (calculated)

**4. Add Payment/Invoice Tracking** (🔴 CRITICAL - 4-5 hours)
   - Ensure `owner_invoices` and `payment_transactions` tables exist
   - Add aggregation to financial view
   - Add columns: Invoiced, Payments Received, % Paid, Remaining Balance
   - Implement formulas from Procore

### Phase 2: Nice-to-Have Improvements (Post-MVP)

**5. Add Missing Date Fields** (🟡 MEDIUM - 1 hour)
   - Add to database schema
   - Add to form
   - Optional display in table

**6. Add Privacy Controls** (🟡 MEDIUM - 2 hours)
   - Add `is_private` boolean to database
   - Add privacy toggle to form
   - Add to table

**7. Fix Status Workflow** (🟢 LOW - 1 hour)
   - Align form, database, and Procore statuses
   - Update badge variants

---

## 📊 FINAL SCORING

| Category | Weight | Score | Weighted Score |
|----------|--------|-------|----------------|
| List Table Columns | 35% | 50% (9/18) | 17.5% |
| Form Fields | 25% | 55% (partial) | 13.8% |
| Financial Calculations | 25% | 0% (none) | 0.0% |
| Database Schema | 10% | 60% (basic fields) | 6.0% |
| Status Workflow | 5% | 70% (mostly there) | 3.5% |
| **TOTAL** | **100%** | **-** | **40.8%** |

**Procore Match Score:** 40.8% (Grade: F)

**Verdict:**
- ❌ **DATA MODEL:** Wrong entity type (vendor vs owner/client)
- ❌ **FINANCIALS:** No calculations whatsoever
- ❌ **WORKFLOW:** Missing "Executed" state
- ⚠️ **FIELDS:** About half of critical fields present
- ✅ **BASICS:** Core CRUD and basic table working

**Recommendation:**
- **Immediate:** Fix critical data model issues (#1-4 above)
- **Short-term:** Add financial calculations
- **Long-term:** Add remaining fields and privacy controls

**Estimated Effort:** 10-15 hours to reach 80% Procore match

---

## 🔍 VERIFICATION EVIDENCE

### Table Config Evidence
- ✅ File read: `src/config/tables/contracts.config.ts` (156 lines)
- ✅ 9 columns defined vs 18 in Procore
- ❌ No financial aggregation columns

### Database Evidence
- ✅ File read: `src/types/database.types.ts`
- ⚠️ `prime_contracts` table has basic fields only
- ❌ `vendor_id` instead of `client_id` (wrong entity)
- ❌ No `executed_at` or `is_private` fields

### Form Evidence
- ✅ File read: `src/components/domain/contracts/ContractForm.tsx`
- ✅ Comprehensive form with SOV, dates, privacy
- ⚠️ Uses vendor selector instead of client selector
- ⚠️ Status options don't fully match Procore

### Procore Reference Evidence
- ✅ File read: `documentation/*project-mgmt/active/prime-contracts/Prime-Contracts-Page-.md`
- ✅ Complete column list with formulas
- ✅ Financial integrity rules documented

---

**Report Generated:** 2026-01-11
**Next Step:** Fix critical data model issues (owner/client, executed field, financial calculations)
**Difficulty:** 🔴 **HIGH** - Requires database migration and significant refactoring
