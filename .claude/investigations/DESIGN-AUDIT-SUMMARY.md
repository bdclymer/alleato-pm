# Financial Tools Design System Audit -- Summary

**Date:** 2026-03-03
**Tools Audited:** 7/7
**Auditor:** design-review agent

## Overview

| Tool | Pages Audited | Passed | Failed | Top Violation | Audit File |
|------|--------------|--------|--------|---------------|------------|
| Budget | 1 | 0 | 1 | Hardcoded `bg-orange-*` / `text-white` in 12+ modal files | .claude/investigations/budget/design-audit.md |
| Prime Contracts | 2 | 1 | 1 | `bg-white border-gray-200` in create/edit forms | .claude/investigations/prime-contracts/design-audit.md |
| Commitments | 2 | 0 | 2 | Direct `@/components/ui/` imports; `text-gray-500` in ChangeOrdersTab | .claude/investigations/commitments/design-audit.md |
| Change Events | 1 | 0 | 1 | Direct `@/components/ui/` imports in page and detail files | .claude/investigations/change-events/design-audit.md |
| Change Orders | 2 | 0 | 2 | Direct `@/components/ui/` imports (14+ in new/page.tsx) | .claude/investigations/change-orders/design-audit.md |
| Direct Costs | 1 | 0 | 1 | `bg-orange-600 text-white` in BulkActionsToolbar; raw `<button>` in FiltersPanel | .claude/investigations/direct-costs/design-audit.md |
| Invoicing | 1 | 0 | 1 | Direct `@/components/ui/` imports (15+ in detail page) | .claude/investigations/invoicing/design-audit.md |

**Totals: 10 pages audited. 1 passed. 9 failed.**

## Most Common Violations (Across All Tools)

1. **Direct `@/components/ui/` imports instead of `@/components/ds`** -- Found in **ALL 7 tools**, 20+ page files. This is the single most pervasive violation. Every page file imports Button, Card, Input, etc. directly from `@/components/ui/` instead of the barrel export at `@/components/ds`. This is a **systemic architectural violation**.

2. **Hardcoded `bg-orange-*` / `text-orange-*` instead of `bg-primary` / `text-primary`** -- Found in **2 tools** (Budget, Direct Costs), 20+ instances. Budget modals are the worst offender with `bg-orange-500 hover:bg-orange-600 text-white` repeated across 8+ modal files.

3. **Hardcoded `text-white` / `bg-slate-900`** -- Found in **1 tool** (Budget), 10+ instances. Budget modal headers use a custom dark header pattern with `bg-slate-900 text-white` that is not part of the design system. The `text-white` on Button overrides is also unnecessary when using the proper Button variant.

4. **Hardcoded `text-gray-*` / `bg-gray-*` / `border-gray-*`** -- Found in **3 tools** (Budget, Prime Contracts, Commitments), 10+ instances. Should use semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `border-input`).

5. **Banned shadows (`shadow-lg`, `shadow-md`)** -- Found in **1 tool** (Budget), 4 instances. `hover:shadow-lg` in snapshots-tab.tsx and `hover:shadow-md` in BudgetModificationsModal.tsx. Max allowed is `shadow-sm`.

6. **Raw HTML elements (`<button>`, `<input>`)** -- Found in **2 tools** (Budget, Direct Costs), 10+ instances. Raw `<button>` elements in FiltersPanel.tsx filter pills and raw `<input type="checkbox">` in BudgetLineItemCreatorModal.tsx. Should use `<Button>` and `<Checkbox>` from `@/components/ds`.

## Cross-Tool Consistency Issues

### Positive: Shared UnifiedTablePage Pattern
- 6 of 7 tools (all except Budget) use the shared `UnifiedTablePage` component for their list views
- All list views have consistent header layout: project name eyebrow, tool title, description, action buttons
- Tab navigation, toolbar (search, grid/list toggle, filter, columns), and table footer (totals row) are consistent
- This is the strongest area of design system compliance

### Negative: Budget is an Outlier
- Budget uses a completely custom page structure (`BudgetPageHeader` + `BudgetTabs` + `BudgetFilters` + `BudgetTable`)
- Budget modals use a unique dark header (`bg-slate-900`) not seen in any other tool
- Budget has its own `budget-button.tsx` component that duplicates the standard Button
- Budget has the most violations by a wide margin (27+ vs 3-8 for other tools)

### Negative: Import Architecture is Universally Broken
- The `@/components/ds` barrel export exists but NO page file actually uses it
- Every single page file imports directly from `@/components/ui/`
- This defeats the purpose of the design system barrel export
- This is the #1 priority to fix because it affects all 7 tools and all page files

### Negative: Inconsistent Status Display Approach
- Direct Costs uses inline `<Select>` dropdowns for status in the table (changeable per row)
- Other tools use static status badges (`StatusBadge` pattern)
- This is a UX inconsistency but may be intentional for Direct Costs workflow

## Priority Fix Recommendations

### P0 -- Systemic (All 7 Tools)
1. **Migrate all `@/components/ui/` imports to `@/components/ds`** in page files. This is ~20+ files across all tools. A find-and-replace refactor.

### P1 -- Budget-Specific (Worst Offender)
2. **Replace all `bg-orange-500 hover:bg-orange-600 text-white`** with `<Button>` default variant in Budget modal files (8+ files)
3. **Replace `bg-slate-900 text-white`** modal headers with design-system-compliant pattern in `BaseModal.tsx`, `BaseSidebar.tsx`, `original-budget-edit-modal.tsx`
4. **Replace `hover:shadow-lg`** with `hover:shadow-sm` in `snapshots-tab.tsx`
5. **Replace raw `<input type="checkbox">`** with `<Checkbox>` in `BudgetLineItemCreatorModal.tsx`

### P2 -- Component-Level (2-3 Tools)
6. **Replace `bg-white border-gray-200`** with `bg-card border-border` in Prime Contracts create/edit forms
7. **Replace `text-gray-500`** with `text-muted-foreground` in Commitments `ChangeOrdersTab.tsx`
8. **Replace raw `<button>`** with `<Button>` in Direct Costs `FiltersPanel.tsx`
9. **Replace `bg-orange-600 text-white`** with `<Button variant="destructive">` in Direct Costs `BulkActionsToolbar.tsx`

### P3 -- Shared Table Components
10. **Replace `hover:shadow-md`** with `hover:shadow-sm` in `generic-editable-table.tsx` and `generic-table-factory.tsx`
11. **Replace `bg-white`, `text-gray-*`** with semantic tokens in `generic-table-factory.tsx` (grid card view)

## Verdict

**FAIL** -- 9 pages across 7 tools have violations. The systemic `@/components/ui/` import pattern means every single tool fails the Design System Gate. Budget is the worst offender with 27+ violations spanning hardcoded colors, banned shadows, raw HTML elements, and a completely custom (non-standard) page/modal architecture.
