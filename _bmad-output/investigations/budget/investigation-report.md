# Investigation Report — Budget

**Score:** 8/10
**Date:** 2025-03-03
**Status:** Substantially Complete with Minor Gaps

---

## Procore Reference

**Table Columns (from Procore DOM analysis):**
- Calculation Method
- Unit Qty
- UOM (Unit of Measure)
- Unit Cost
- Original Budget

**Key Actions Available:**
- Create new budget line items
- Export budget data
- Resend to ERP
- Unlock Budget
- Analyze Variance (fullscreen view)
- Search functionality
- Filter and clear filters

**Features:**
- Budget variance tracking
- Line item management
- Budget modifications
- Cost rollup calculations

---

## What Exists in Codebase

**Files Found:**
- Pages: 3 (main page + line-item/new + setup)
- API Routes: 16 comprehensive endpoints
- Hook: 1 (`use-budget-data.ts`)
- Components: 50+ (BudgetTable, BudgetLineItemModal, modals, filters, etc.)

**CRUD Status:**
| Operation | API | Service | Hook | UI | Status |
|-----------|-----|---------|------|----|--------|
| List | ✅ | ✅ | ✅ | ✅ | OK |
| Create | ✅ | ✅ | ✅ | ✅ | OK |
| Read | ✅ | ✅ | ✅ | ✅ | OK |
| Update | ✅ | ✅ | ✅ | ✅ | OK |
| Delete | ✅ | ✅ | ✅ | ✅ | OK |

**Key Implementation Details:**
- Uses custom `BudgetPageHeader` component (not `ProjectPageHeader`)
- Extensive modal system for line item creation/editing
- Modification tracking with modals
- Multiple tabs: Main, Modifications, Cost Codes, Forecasting, Snapshots, Change History
- Import functionality for bulk budget creation
- Unlock dialog for budget protection

---

## Gap Analysis

### Critical Issues (Blockers)
*None identified. Budget is substantially complete.*

### High Issues
1. **Header Pattern Violation** — Uses custom `BudgetPageHeader` instead of standard `ProjectPageHeader` + `PageContainer` pattern
   - File: `frontend/src/app/(main)/[projectId]/budget/page.tsx`
   - Impact: Inconsistent with other project pages; violates design system gate

2. **Missing Procore Feature Parity** — No "Analyze Variance" fullscreen mode visible in main UI
   - Procore has dedicated variance analysis view
   - Current implementation may not expose this feature prominently

### Medium Issues
1. **Component Organization** — 50 budget components could benefit from better organization into subfolders (modals/, tabs/, forms/)
2. **API Response Inconsistency** — Budget data API uses SQL views (mv_budget_rollup) which may differ from Procore's calculation method
3. **No Validation for Budget Amounts** — Form fields lack client-side validation for negative amounts, incorrect UOM

### Low Issues
1. **Missing Help Text** — Budget columns lack tooltips explaining calculation method, UOM, etc.
2. **Date Format** — No explicit date formatting specification in UI

---

## Recommended Fixes (Priority Order)

1. **CRITICAL:** Refactor page header to use standard `ProjectPageHeader` + `PageContainer` pattern
   - Current: Custom `BudgetPageHeader`
   - Target: `import { ProjectPageHeader, PageContainer } from "@/components/layout"`
   - Effort: Low (wrapper component)

2. **HIGH:** Add Analyze Variance fullscreen mode
   - Create new route: `/[projectId]/budget/analyze-variance`
   - Expose button in header actions
   - Effort: Medium

3. **HIGH:** Add budget amount validation (client-side)
   - Validate: positive numbers, correct decimal places
   - Update `budget-line-item-form.tsx` with Zod schema validation
   - Effort: Low

4. **MEDIUM:** Reorganize components into logical folders
   - `modals/` for all modal components
   - `tabs/` for tab components
   - `forms/` for form components
   - Effort: Low (refactoring only)

5. **LOW:** Add field-level tooltips and help text
   - Use `<Tooltip>` component from `@/components/ds`
   - Effort: Low

---

## Files Audited

- `frontend/src/app/(main)/[projectId]/budget/page.tsx` — Main page structure and imports
- `frontend/src/hooks/use-budget-data.ts` — Data fetching hook
- `scripts/screenshot-capture/outputs/analysis-json/goodwill_bart_-_budget.json` — Procore reference
- `frontend/src/components/budget/*.tsx` — Component implementations

---

## Summary

Budget is the most complete financial tool. All CRUD operations are implemented with good UI/UX. The main gap is the header pattern violation and missing variance analysis feature. Fixes are straightforward and low-risk.
