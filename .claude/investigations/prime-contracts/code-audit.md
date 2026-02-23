# Prime Contracts — Code Audit
Generated: 2026-02-23 | Score: 6/10 | Status: PARTIAL

## Summary
- **Completeness:** 6/10
- **Critical Issues:** 3
- **Column Parity:** 25/28 (89%) — missing ERP Status; partial Payment Terms, Billing Schedule

## Files Found

### Pages (4)
| File | Status |
|------|--------|
| `/prime-contracts/page.tsx` | ✅ List page with table, filters |
| `/prime-contracts/new/page.tsx` | ✅ Create form |
| `/prime-contracts/[contractId]/page.tsx` | ✅ Detail with tabs (Overview, SOV, Change Orders, Markups) |
| `/prime-contracts/[contractId]/edit/page.tsx` | ✅ Edit form |

### API Routes (13)
Full CRUD implemented at `/api/projects/[projectId]/contracts/`:
- GET/POST (list + create) ✅
- GET/PUT/DELETE per `[contractId]` ✅
- GET/POST line items ✅
- PATCH/DELETE line item ✅
- GET/POST change orders ✅
- POST attachments ✅

### Hooks
- `use-contracts.ts` — generic hook (queries wrong table, likely dead code)
- `use-contract-change-orders.ts` — change orders hook
- ❌ **NO** `use-prime-contracts.ts` — pages use raw `fetch()` directly

### Services
- ❌ No service class — pages call API directly

### Components
- `ContractForm.tsx` — main form (~1000 lines) ✅
- `ScheduleOfValuesGrid.tsx` ✅
- `ScheduleOfValuesRow.tsx` ✅
- `CostCodeSelector.tsx` ✅
- `ImportFromBudgetModal.tsx` ✅

### Database
- `prime_contracts` table ✅ (18 columns)
- `contract_financial_summary_mv` (materialized view) ✅
- `contract_line_items` ✅
- `contract_change_orders` ✅
- `contract_attachments` ✅

---

## CRUD Status

| Operation | API Route | Hook | UI | Status |
|-----------|-----------|------|----|--------|
| List | ✅ | ❌ raw fetch | ✅ | ⚠️ Works but no caching |
| Create | ✅ | ❌ raw fetch | ✅ | ⚠️ Works but fields missing |
| Detail | ✅ | ❌ raw fetch | ✅ | ⚠️ Works but 71KB component |
| Update | ✅ | ❌ raw fetch | ✅ | ⚠️ Payment terms always null |
| Delete | ✅ | ❌ raw fetch | ✅ | ⚠️ Permission check disabled |

---

## Column Parity (vs Procore Reference)

| Procore Column | DB | API | UI | Status |
|---------------|-----|-----|-----|--------|
| Contract Number | ✅ `contract_number` | ✅ | ✅ | OK |
| Title | ✅ `title` | ✅ | ✅ | OK |
| Owner/Client | ✅ `client_id` | ✅ | ✅ | OK |
| Contractor | ✅ `vendor_id` | ✅ | ✅ | OK |
| Architect/Engineer | ✅ `architect_engineer_id` | ✅ | ✅ | OK |
| Status | ✅ `status` | ✅ | ✅ | ⚠️ TYPE MISMATCH (see Critical Issue #1) |
| ERP Status | ❌ missing | ❌ | ❌ | **MISSING** |
| Executed | ✅ `executed` | ✅ | ✅ | OK |
| Amount | ✅ `original_contract_value` | ✅ | ✅ | OK |
| Start Date | ✅ `start_date` | ✅ | ✅ | OK |
| End/Completion Dates (5) | ✅ | ✅ | ✅ | OK |
| Retainage % | ✅ `retention_percentage` | ✅ | ✅ | OK |
| Payment Terms | ✅ `payment_terms` | ✅ | ⚠️ always null | **PARTIAL** |
| Billing Schedule | ✅ `billing_schedule` | ✅ | ⚠️ always null | **PARTIAL** |
| Description | ✅ | ✅ | ✅ | OK |
| Inclusions/Exclusions | ✅ | ✅ | ✅ | OK |
| Privacy | ✅ `is_private` | ✅ | ✅ | OK |
| SOV Line Items | ✅ table | ✅ | ✅ | OK |
| Change Orders | ✅ table | ✅ | ✅ | OK |
| Attachments | ✅ table | ✅ | ✅ | OK |

---

## Critical Issues

### 1. Status Enum Mismatch — Type Definition vs Validation vs UI
**Files:** `types/prime-contracts.ts`, `api/contracts/validation.ts`, `table-config.tsx`
- `types/prime-contracts.ts` defines: `draft | active | completed | cancelled | on_hold`
- `validation.ts` (Zod schema) uses: `draft | out_for_bid | out_for_signature | approved | complete | terminated`
- `table-config.tsx` (UI labels) uses the validation values (correct)
- **Result:** TypeScript types lie. Runtime uses validation values. DB schema unknown until `npm run db:types`.

### 2. No Hooks / Service Layer — Raw fetch() in Every Page
**Files:** `page.tsx:108`, `[contractId]/page.tsx:188`, `new/page.tsx:31`
- All pages call `fetch()` directly with manual loading/error state
- No React Query caching, no deduplication, no optimistic updates
- Pattern violates project conventions

### 3. Permission Check Commented Out (SECURITY)
**File:** `route.ts:152-166`
```typescript
// DEVELOPMENT: Permission check disabled for easier testing
// TODO: Re-enable this in production
```
- Any authenticated user can create/edit/delete contracts for any project
- Must be re-enabled before production

---

## High Issues

4. Payment terms and billing schedule always submit as `null` (form fields ignored in `new/page.tsx:31-65`)
5. Detail page is 71KB / 1000+ lines — mixing 4 different concerns
6. Materialized view (`contract_financial_summary_mv`) has no documented refresh policy or cache invalidation
7. Menu navigation: prime contracts may not appear in the project sidebar menu

---

## Low Issues
8. Inconsistent error handling (some `toast.error()`, some `alert()`, some silent)
9. No optimistic updates on mutations
10. Generic `use-contracts.ts` hook appears to be dead code
