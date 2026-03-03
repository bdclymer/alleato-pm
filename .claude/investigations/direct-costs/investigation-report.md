# Investigation Report — Direct Costs

**Score:** 6/10
**Date:** 2025-03-03
**Status:** Functional but Incomplete, Form & API Gaps

---

## Procore Reference

**Expected Features (Direct Costs):**
- Labor costs tracking
- Material costs tracking
- Equipment costs tracking
- Cost allocation to budget line items
- Status workflow
- Invoice and payment tracking
- Vendor/supplier management

**Key Actions:**
- Add direct costs
- Categorize by type (labor, materials, equipment)
- Link to budget codes
- Track cost status (pending, approved, paid)
- Generate reports

---

## What Exists in Codebase

**Files Found:**
- Pages: 3 (main + [costId] + new)
- API Routes: 5 endpoints (minimal)
- Hook: 1 (`use-direct-costs.ts`)
- Components: 10 (forms, modals, detail views)

**CRUD Status:**
| Operation | API | Service | Hook | UI | Status |
|-----------|-----|---------|------|----|--------|
| List | ✅ | ✅ | ✅ | ✅ | OK |
| Create | ✅ | ✅ | ✅ | ✅ | OK |
| Read | ✅ | ✅ | ✅ | ✅ | OK |
| Update | ⚠️ | ⚠️ | ✅ | ✅ | PARTIAL |
| Delete | ❌ | ❌ | ✅ | ❌ | BROKEN |

**Key Implementation Details:**
- Only 5 API routes (minimum viable)
- Form-based creation exists
- Detail view exists
- Limited API surface suggests incomplete CRUD

---

## Gap Analysis

### Critical Issues

1. **Missing Delete Functionality** — No DELETE API route
   - Users cannot remove incorrect cost entries
   - Impact: Data cleanup impossible, audit trail broken
   - Evidence: 5 API routes, no /[costId] DELETE endpoint likely

2. **Minimal API Coverage** — Only 5 routes for complete feature
   - Likely missing: Bulk operations, filtering, export
   - Impact: Feature limitations vs Procore

3. **Form Hang Bug** — Memory from project notes indicates DirectCostForm hangs
   - File: `frontend/src/components/direct-costs/DirectCostForm.tsx`
   - Impact: Feature unusable in current state
   - Evidence: Modified in git status, mentioned in debugging notes

### High Issues

1. **Header Pattern Violation** — Not using ProjectPageHeader
   - Impact: Design system inconsistency

2. **Cost Type Validation** — Form may not properly validate cost types
   - Need: Labor hours + rate validation, material quantity validation
   - Impact: Data quality issues

3. **Budget Link Validation** — Unclear if direct costs properly link to budget codes
   - Procore requires budget code allocation
   - Impact: Budget tracking accuracy

4. **No Bulk Upload** — Procore supports importing multiple costs
   - Impact: Missing batch functionality

### Medium Issues

1. **Cost Status Workflow** — Unclear if status transitions are validated
   - Need: Approved → Paid workflow
   - Impact: Workflow integrity

2. **Vendor Validation** — Unclear if vendor references are validated
   - Need: Vendor must exist in directory
   - Impact: Data consistency

3. **Missing Line Item Support** — No indication of multiple cost items per entry
   - Procore allows bundling multiple cost items
   - Impact: UI/UX limitation

### Low Issues

1. **Date Validation** — No indication of date range validation
2. **Currency Handling** — Unclear if multi-currency is supported
3. **Approval Comments** — No comment field in workflow

---

## Recommended Fixes (Priority Order)

1. **CRITICAL:** Fix DirectCostForm hang
   - Debug performance issue causing timeout
   - Check for: Infinite loops, circular dependencies, N+1 queries
   - File: `frontend/src/components/direct-costs/DirectCostForm.tsx`
   - Effort: High (debugging required)

2. **CRITICAL:** Implement DELETE functionality
   - Add DELETE route: `/api/projects/[projectId]/direct-costs/[costId]`
   - Add soft-delete with restore capability
   - Effort: Low

3. **HIGH:** Add cost type validation
   - Validate labor entries (hours as decimal, rate > 0)
   - Validate material entries (quantity, unit price)
   - Validate equipment entries (hours, daily rate)
   - Effort: Low

4. **HIGH:** Refactor page header to ProjectPageHeader
   - Effort: Low

5. **MEDIUM:** Implement bulk cost import
   - CSV upload for multiple costs
   - Validation and error reporting
   - Effort: Medium-High

6. **MEDIUM:** Add cost status workflow
   - Implement approval workflow (pending → approved → paid)
   - Effort: Low-Medium

7. **MEDIUM:** Verify budget code linking
   - Ensure costs propagate to budget calculations
   - Test: Cost amount appears in budget's "Job To Date Cost"
   - Effort: Medium

---

## Files Audited

- `frontend/src/app/(main)/[projectId]/direct-costs/page.tsx` — Main list
- `frontend/src/app/(main)/[projectId]/direct-costs/new/page.tsx` — Create form
- `frontend/src/components/direct-costs/DirectCostForm.tsx` — Problem form component
- `frontend/src/components/direct-costs/LineItemsManager.tsx` — Line item management
- `frontend/src/hooks/use-direct-costs.ts` — Data hook

---

## Summary

Direct Costs is partially functional but has critical issues blocking usability:
1. Form hangs on creation
2. No delete functionality
3. Missing approval workflow

**Highest priority for fixes** among the 7 tools due to form performance bug. Must resolve before production use. Moderate-to-high effort required.
