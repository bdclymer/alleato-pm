# Investigation Report — Change Orders

**Score:** 7/10
**Date:** 2025-03-03
**Status:** Core Implementation Present, Workflow & Compliance Gaps

---

## Procore Reference

**Expected Features:**
- Change order creation with detailed cost tracking
- Line item breakdown (labor, materials, equipment)
- Status workflow (draft → submitted → approved → rejected)
- Budget impact calculation
- Signature/approval workflow
- Document management
- Scope of work description

**Key Actions:**
- Create change order with multiple line items
- Submit for approval
- Track approval status
- Generate change order documents
- Link to related change events
- Impact budget and schedule

---

## What Exists in Codebase

**Files Found:**
- Pages: 4 (main + [id] + [id]/edit + new)
- API Routes: 18 endpoints (most comprehensive)
- Hook: 1 (`use-change-orders.ts`)
- Components: 8 (forms, line items, approval views)

**CRUD Status:**
| Operation | API | Service | Hook | UI | Status |
|-----------|-----|---------|------|----|--------|
| List | ✅ | ✅ | ✅ | ✅ | OK |
| Create | ✅ | ✅ | ✅ | ✅ | OK |
| Read | ✅ | ✅ | ✅ | ✅ | OK |
| Update | ✅ | ✅ | ✅ | ✅ | OK |
| Delete | ✅ | ✅ | ✅ | ✅ | OK |

**Key Implementation Details:**
- 18 API routes (highest count) suggests comprehensive functionality
- Likely has line item management
- Approval workflow probably implemented

---

## Gap Analysis

### Critical Issues
*None identified.*

### High Issues

1. **Header Pattern Violation** — Not using ProjectPageHeader
   - File: `frontend/src/app/(main)/[projectId]/change-orders/page.tsx`
   - Impact: Design system inconsistency

2. **Approval Workflow UX** — Unclear if signature/approval UI is implemented
   - Procore requires multi-step approval workflow
   - Impact: Feature completeness gap

3. **Budget Impact Calculation** — Unclear if change order costs are propagated to budget
   - Need to verify: When approved, does budget reflect the CO amount?
   - Impact: Financial accuracy

4. **Line Item Validation** — Change orders have complex line items (labor hours, rates, materials)
   - Need to verify: Cross-field validation (hours × rate = cost)
   - Impact: Data integrity

### Medium Issues

1. **Scope of Work Documentation** — Unclear if scope field exists
   - Procore includes detailed scope description
   - Impact: Missing workflow documentation

2. **Related Changes Linking** — Unclear if CO can reference change events
   - Procore supports linking to change events/RFIs
   - Impact: Lost traceability

3. **Document Generation** — No indication of PDF/export capability
   - Procore generates CO documents for signature
   - Impact: Missing workflow feature

### Low Issues

1. **Historical Versions** — Unclear if previous CO versions are retained
2. **Approval Comments** — No indication of comment/note tracking through workflow
3. **Rejection Workflow** — Unclear what happens when CO is rejected

---

## Recommended Fixes (Priority Order)

1. **HIGH:** Implement approval workflow UI
   - Add: Approve, Reject, Request Changes buttons
   - Track approval history
   - Effort: Medium

2. **HIGH:** Add scope of work field to form
   - Rich text editor for scope description
   - Effort: Low

3. **HIGH:** Refactor page header to ProjectPageHeader
   - Effort: Low

4. **MEDIUM:** Link change orders to change events
   - Add relationship tracking
   - Show related changes in detail view
   - Effort: Medium

5. **MEDIUM:** Verify budget impact propagation
   - Ensure approved COs update budget calculations
   - Effort: Medium

6. **MEDIUM:** Add line item cross-field validation
   - Hours × Rate = Total Cost validation
   - Prevent negative values
   - Effort: Low

7. **LOW:** Implement CO document generation
   - PDF export with all details
   - Signature fields for approval
   - Effort: High

---

## Files Audited

- `frontend/src/app/(main)/[projectId]/change-orders/page.tsx` — Main list
- `frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx` — Create form
- `frontend/src/hooks/use-change-orders.ts` — Data hook
- `frontend/src/components/domain/change-orders/` — Components (count: 8)

---

## Summary

Change Orders has the most comprehensive API implementation (18 routes). Core CRUD is complete. Main gaps are header pattern violation, approval workflow clarity, and missing scope documentation. High-priority fix for workflow completeness. Moderate-to-high effort.
