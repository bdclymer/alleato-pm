# Design System Audit: Budget

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 1 (list view — primary page with tabs; modals audited at code level)
- **Passed:** 0
- **Failed:** 1
- **Critical violations:** 24+

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Budget List View | http://localhost:3000/67/budget | Hardcoded colors in 12+ component files; banned shadows; raw HTML elements; hardcoded `bg-orange-*` throughout modals | FAIL | screenshots/design-audit-list.png |

## Violations Detail

### FAIL: Budget List View (and supporting components)

#### Hardcoded `text-white` (non-tooltip context)

1. **Hardcoded color** — `className="bg-brand hover:bg-brand/90 text-white flex-1 min-w-[100px]"` at `frontend/src/components/budget/budget-page-header.tsx:125` — should use `<Button>` default variant (which is primary) without manual className override
2. **Hardcoded color** — `className="bg-brand hover:bg-brand/90 text-white"` at `frontend/src/components/budget/budget-page-header.tsx:222` — same fix: use `<Button>` default variant

#### Hardcoded `bg-slate-900`, `text-white` on modal headers

1. **Hardcoded color** — `className="bg-slate-900 text-white px-6 py-4 flex-shrink-0"` at `frontend/src/components/budget/original-budget-edit-modal.tsx:232` — should use `bg-foreground text-background` or design system dialog header pattern
2. **Hardcoded color** — `className="bg-slate-900/95 text-white px-6 py-4 ..."` at `frontend/src/components/budget/modals/BaseModal.tsx:67` — same fix
3. **Hardcoded color** — `className="bg-slate-900 text-white px-6 py-4 flex-shrink-0"` at `frontend/src/components/budget/modals/BaseSidebar.tsx:47` — same fix

#### Hardcoded `bg-orange-*` / `text-orange-*` (should use `bg-primary` / `text-primary`)

1. **Hardcoded color** — `className="bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/original-budget-edit-modal.tsx:642` — should use `<Button>` (default variant is primary/orange already)
2. **Hardcoded color** — `"bg-orange-500 text-white"` at `frontend/src/components/budget/modals/DirectCostsModal.tsx:179` — use `bg-primary text-primary-foreground`
3. **Hardcoded color** — `"bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/modals/CreateBudgetLineItemsModal.tsx:166` — use `<Button>` default variant
4. **Hardcoded color** — `"bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/modals/OriginalBudgetModal.tsx:356` — same fix
5. **Hardcoded color** — `"bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/modals/UnlockBudgetModal.tsx:61` — same fix
6. **Hardcoded color** — `"bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/modals/ForecastToCompleteModal.tsx:341` — same fix
7. **Hardcoded color** — `"bg-orange-500 text-white"` at `frontend/src/components/budget/modals/BudgetModificationsModal.tsx:294` — use `bg-primary text-primary-foreground`
8. **Hardcoded color** — `"bg-orange-500 text-white"` at `frontend/src/components/budget/modals/CommittedCostsModal.tsx:178` — same
9. **Hardcoded color** — `"bg-orange-500 text-white"` at `frontend/src/components/budget/modals/PendingCostChangesModal.tsx:194` — same
10. **Hardcoded color** — Multiple `text-orange-600`, `bg-orange-50`, `border-orange-200` across `OriginalBudgetModal.tsx`, `ForecastToCompleteModal.tsx`, `PendingCostChangesModal.tsx`, `CreateBudgetLineItemsModal.tsx` — use `text-primary`, `bg-primary/10`, `border-primary/20`

#### Hardcoded `text-gray-*` / `bg-gray-*` / `border-gray-*`

1. **Hardcoded color** — `className="... text-gray-700"` at `frontend/src/components/budget/BudgetLineItemCreatorModal.tsx:617` — use `text-foreground`
2. **Hardcoded color** — `className="rounded border-gray-300"` at `frontend/src/components/budget/BudgetLineItemCreatorModal.tsx:622` — use `border-input`
3. **Hardcoded color** — `className="text-sm font-semibold text-gray-900"` at `frontend/src/components/budget/InlineBudgetLineItemCreator.tsx:423` — use `text-foreground`
4. **Hardcoded color** — `className="bg-white rounded-lg p-4 border border-gray-200"` at `frontend/src/components/budget/InlineBudgetLineItemCreator.tsx:450` — use `bg-card border-border`
5. **Hardcoded color** — `hover:border-gray-400` at `frontend/src/components/budget/ImportBudgetModal.tsx:294` — use `hover:border-foreground/30`

#### Raw HTML elements (should use design system components)

1. **Raw HTML** — `<input type="checkbox" ...>` at `frontend/src/components/budget/BudgetLineItemCreatorModal.tsx:618-622` — use `<Checkbox>` from `@/components/ds`
2. **Raw HTML** — `<button onClick={onClose} ...>` at `frontend/src/components/budget/original-budget-edit-modal.tsx:240` — use `<Button variant="ghost" size="icon">`

#### Banned shadows

1. **Banned shadow** — `hover:shadow-lg` at `frontend/src/components/budget/snapshots-tab.tsx:150` — use `hover:shadow-sm` max
2. **Banned shadow** — `hover:shadow-lg` at `frontend/src/components/budget/snapshots-tab.tsx:219` — same fix
3. **Banned shadow** — `hover:shadow-md` at `frontend/src/components/budget/modals/BudgetModificationsModal.tsx:328` — use `hover:shadow-sm`
4. **Banned shadow** — `shadow-lg shadow-orange-200/50` at `frontend/src/components/budget/modals/CreateBudgetLineItemsModal.tsx:154` — remove entirely

#### Arbitrary spacing

1. **Arbitrary spacing** — `min-w-[100px]` at `frontend/src/components/budget/budget-page-header.tsx:125` — use standard sizing
2. **Arbitrary spacing** — Multiple `w-[400px]`, `max-h-[400px]`, `w-[500px]`, `max-w-[1400px]` across modal files — acceptable for modal sizing constraints

## Cross-Page Consistency Issues
- Budget uses a custom `BudgetPageHeader` instead of the shared `ProjectPageHeader` + `PageContainer` pattern used by other financial tools
- Budget modals use a custom dark `bg-slate-900` header pattern (`BaseModal.tsx`, `BaseSidebar.tsx`) not seen in any other tool
- Budget has its own `budget-button.tsx` component with hardcoded `text-white` instead of using the standard `<Button>` component
