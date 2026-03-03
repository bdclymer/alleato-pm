# Investigation Report — Invoicing

**Score:** 5/10
**Date:** 2025-03-03
**Status:** Minimal Implementation, Major Gaps & Wrong Pattern

---

## Procore Reference

**Expected Features (Invoicing):**
- Invoice generation from change orders and direct costs
- Invoice tracking (draft, submitted, paid)
- Payment status tracking
- Tax calculation
- Line item details (description, amount, taxes)
- Invoice PDF generation
- Payment history
- Late payment alerts

**Key Actions:**
- Create invoice from CO/direct costs
- Submit to client
- Track payment
- Generate invoice documents
- Record payments
- View payment history

---

## What Exists in Codebase

**Files Found:**
- Pages: 3 (main + [invoiceId] + new)
- API Routes: 4 endpoints (minimal)
- Hook: 1 (`use-invoicing.ts`)
- Components: 2 (minimal)

**CRUD Status:**
| Operation | API | Service | Hook | UI | Status |
|-----------|-----|---------|------|----|--------|
| List | ✅ | ✅ | ✅ | ✅ | OK |
| Create | ✅ | ✅ | ✅ | ✅ | OK |
| Read | ✅ | ✅ | ✅ | ✅ | OK |
| Update | ❌ | ❌ | ⚠️ | ❌ | BROKEN |
| Delete | ❌ | ❌ | ❌ | ❌ | BROKEN |

**Key Implementation Details:**
- Uses old DataTablePage pattern (deprecated vs UnifiedTablePage)
- Only 4 API routes (least comprehensive)
- Minimal components (2 vs 8-50 for other tools)
- Invoice detail exists but update/delete missing

---

## Gap Analysis

### Critical Issues

1. **WRONG TABLE COMPONENT PATTERN** — Uses deprecated DataTablePage instead of UnifiedTablePage
   - Impact: Inconsistent with 5 of 7 other financial tools
   - Evidence: Invoice list uses legacy pattern while others use unified
   - Risk: Future maintenance burden, inconsistent UX

2. **MISSING UPDATE FUNCTIONALITY** — No PUT endpoint for invoice updates
   - Users cannot modify draft invoices
   - Impact: Must delete and recreate to change invoice
   - Evidence: Only 4 routes, no [invoiceId] PUT in API

3. **MISSING DELETE FUNCTIONALITY** — No DELETE endpoint
   - Users cannot remove invoices
   - Impact: Data cleanup impossible

4. **INCOMPLETE PAYMENT TRACKING** — No indication of payment status or history
   - Procore has paid/pending status, payment records
   - Impact: Missing critical accounting feature

### High Issues

1. **No Invoice Generation Logic** — Unclear if invoices auto-calculate from COs/direct costs
   - Procore generates invoices with totals, taxes
   - Impact: Manual entry required, error-prone

2. **Missing Tax Calculation** — No indication of tax handling
   - Procore calculates tax on line items
   - Impact: Incorrect invoice amounts

3. **Header Pattern Violation** — Not using ProjectPageHeader
   - Additional inconsistency with other financial tools

4. **No PDF Generation** — Invoicing requires document generation
   - Users cannot create invoice documents for clients
   - Impact: Feature incomplete for real use

5. **Form Clarity** — Create form unclear - what fields are required?
   - Invoice number? Due date? Line items?
   - Impact: UX confusion

### Medium Issues

1. **No Payment Recording** — Users cannot record payments received
   - Impact: Can't track payment status

2. **Database Schema** — Unclear if invoices table has all required columns
   - Need: invoice_number, due_date, tax_amount, paid_amount, etc.
   - Impact: Missing fields could break workflow

3. **Relationship to Budget** — Invoices should link to budget/commitments
   - Unclear if these relationships exist
   - Impact: Lost traceability

---

## Recommended Fixes (Priority Order)

1. **CRITICAL:** Migrate from DataTablePage to UnifiedTablePage
   - Unify with other financial tools
   - Effort: Medium (refactor list view, hooks)

2. **CRITICAL:** Implement UPDATE functionality
   - Add PUT route: `/api/projects/[projectId]/invoicing/[invoiceId]`
   - Only allow updates to draft invoices
   - Effort: Low

3. **CRITICAL:** Implement DELETE functionality
   - Add DELETE route for invoice removal
   - Soft-delete with restore option
   - Effort: Low

4. **HIGH:** Implement payment tracking
   - Add payment status field (draft, submitted, paid, overdue)
   - Add payment recording UI
   - Add payment history view
   - Effort: Medium

5. **HIGH:** Refactor page header to ProjectPageHeader
   - Effort: Low

6. **HIGH:** Add tax calculation
   - Implement tax rate field
   - Auto-calculate tax on line items
   - Update totals
   - Effort: Low-Medium

7. **MEDIUM:** Implement invoice generation from COs/direct costs
   - Create route for generating invoice from CO
   - Pre-populate line items
   - Effort: Medium

8. **MEDIUM:** Add PDF generation
   - Use library (PDFKit, jsPDF) for invoice documents
   - Include all invoice details
   - Effort: Medium-High

9. **LOW:** Add proper date validation (due dates, payment dates)
10. **LOW:** Implement multi-currency support if needed

---

## Files Audited

- `frontend/src/app/(main)/[projectId]/invoicing/page.tsx` — Main list (uses DataTablePage)
- `frontend/src/app/(main)/[projectId]/invoicing/new/page.tsx` — Create form
- `frontend/src/hooks/use-invoicing.ts` — Data hook
- `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx` — Detail view
- Git status showing: invoicing is active work area

---

## Summary

Invoicing is the least developed financial tool with major architectural and functional gaps:

**Architecture Problem:** Uses deprecated DataTablePage instead of UnifiedTablePage like other tools

**Functional Gaps:**
- No update/delete operations
- No payment tracking
- No tax calculation
- No PDF generation
- Unclear invoice generation logic

**Effort:** High (14+ distinct fixes needed)

**Priority:** MODERATE - Not as critical as Prime Contracts or Direct Costs, but significant work needed. Consider refactoring this entire tool to use UnifiedTablePage pattern and match other financial tools' structure.

**Recommendation:** This tool may benefit from complete re-implementation to match architecture of other financial tools (Budget, Commitments, etc.).
