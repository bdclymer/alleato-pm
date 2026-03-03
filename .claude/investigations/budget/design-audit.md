# Design System Audit: Budget

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 1 (list view — primary page with tabs; modals audited at code level)
- **Passed:** 0
- **Failed:** 1
- **Critical violations:** 27+

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Budget List View | http://localhost:3000/67/budget | Hardcoded colors in 12+ component files; banned shadows; raw HTML elements; direct ui/ imports in page file; hardcoded `bg-orange-*` throughout modals | FAIL | screenshots/design-audit-list.png |

## Violations Detail

### FAIL: Budget List View (and supporting components)

#### Direct `@/components/ui/` imports in page file (should use `@/components/ds`)

1. **Direct ui/ import** — `import { Skeleton } from "@/components/ui/skeleton"` at `frontend/src/app/(main)/[projectId]/budget/page.tsx:38` — should be `import { Skeleton } from "@/components/ds"`
2. **Direct ui/ import** — `import { ... } from "@/components/ui/alert-dialog"` at `frontend/src/app/(main)/[projectId]/budget/page.tsx:42-49` — should be `import { ... } from "@/components/ds"`
3. **Direct ui/ import** — `import { Button } from "@/components/ui/button"` at `frontend/src/app/(main)/[projectId]/budget/page.tsx:50` — should be `import { Button } from "@/components/ds"`

#### Hardcoded `text-white` (non-tooltip context)

4. **Hardcoded color** — `className="bg-brand hover:bg-brand/90 text-white flex-1 min-w-[100px]"` at `frontend/src/components/budget/budget-page-header.tsx:125` — should use `<Button>` default variant (which is primary) without manual className override
5. **Hardcoded color** — `className="bg-brand hover:bg-brand/90 text-white"` at `frontend/src/components/budget/budget-page-header.tsx:222` — same fix: use `<Button>` default variant

#### Hardcoded `bg-slate-900`, `text-white` on modal headers

6. **Hardcoded color** — `className="bg-slate-900 text-white px-6 py-4 flex-shrink-0"` at `frontend/src/components/budget/original-budget-edit-modal.tsx:232` — should use `bg-foreground text-background` or design system dialog header pattern
7. **Hardcoded color** — `className="bg-slate-900/95 text-white px-6 py-4 ..."` at `frontend/src/components/budget/modals/BaseModal.tsx:67` — same fix
8. **Hardcoded color** — `className="bg-slate-900 text-white px-6 py-4 flex-shrink-0"` at `frontend/src/components/budget/modals/BaseSidebar.tsx:47` — same fix

#### Hardcoded `bg-orange-*` / `text-orange-*` (should use `bg-primary` / `text-primary`)

9. **Hardcoded color** — `className="bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/original-budget-edit-modal.tsx:642` — should use `<Button>` (default variant is primary/orange already)
10. **Hardcoded color** — `"bg-orange-500 text-white"` at `frontend/src/components/budget/modals/DirectCostsModal.tsx:179` — use `bg-primary text-primary-foreground`
11. **Hardcoded color** — `"bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/modals/CreateBudgetLineItemsModal.tsx:166` — use `<Button>` default variant
12. **Hardcoded color** — `"bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/modals/OriginalBudgetModal.tsx:356` — same fix
13. **Hardcoded color** — `"bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/modals/UnlockBudgetModal.tsx:61` — same fix
14. **Hardcoded color** — `"bg-orange-500 hover:bg-orange-600 text-white"` at `frontend/src/components/budget/modals/ForecastToCompleteModal.tsx:341` — same fix
15. **Hardcoded color** — `"bg-orange-500 text-white"` at `frontend/src/components/budget/modals/BudgetModificationsModal.tsx:294` — use `bg-primary text-primary-foreground`
16. **Hardcoded color** — `"bg-orange-500 text-white"` at `frontend/src/components/budget/modals/CommittedCostsModal.tsx:178` — same
17. **Hardcoded color** — `"bg-orange-500 text-white"` at `frontend/src/components/budget/modals/PendingCostChangesModal.tsx:194` — same
18. **Hardcoded color** — Multiple `text-orange-600`, `bg-orange-50`, `border-orange-200` across `OriginalBudgetModal.tsx`, `ForecastToCompleteModal.tsx`, `PendingCostChangesModal.tsx`, `CreateBudgetLineItemsModal.tsx` — use `text-primary`, `bg-primary/10`, `border-primary/20`

#### Hardcoded `text-gray-*` / `bg-gray-*` / `border-gray-*`

19. **Hardcoded color** — `className="... text-gray-700"` at `frontend/src/components/budget/BudgetLineItemCreatorModal.tsx:617` — use `text-foreground`
20. **Hardcoded color** — `className="rounded border-gray-300"` at `frontend/src/components/budget/BudgetLineItemCreatorModal.tsx:622` — use `border-input`
21. **Hardcoded color** — `className="text-sm font-semibold text-gray-900"` at `frontend/src/components/budget/InlineBudgetLineItemCreator.tsx:423` — use `text-foreground`
22. **Hardcoded color** — `className="bg-white rounded-lg p-4 border border-gray-200"` at `frontend/src/components/budget/InlineBudgetLineItemCreator.tsx:450` — use `bg-card border-border`
23. **Hardcoded color** — `hover:border-gray-400` at `frontend/src/components/budget/ImportBudgetModal.tsx:294` — use `hover:border-foreground/30`

#### Raw HTML elements (should use design system components)

24. **Raw HTML** — `<input type="checkbox" ...>` at `frontend/src/components/budget/BudgetLineItemCreatorModal.tsx:618-622` — use `<Checkbox>` from `@/components/ds`
25. **Raw HTML** — `<button onClick={onClose} ...>` at `frontend/src/components/budget/original-budget-edit-modal.tsx:240` — use `<Button variant="ghost" size="icon">`

#### Banned shadows

26. **Banned shadow** — `hover:shadow-lg` at `frontend/src/components/budget/snapshots-tab.tsx:150` — use `hover:shadow-sm` max
27. **Banned shadow** — `hover:shadow-lg` at `frontend/src/components/budget/snapshots-tab.tsx:219` — same fix
28. **Banned shadow** — `hover:shadow-md` at `frontend/src/components/budget/modals/BudgetModificationsModal.tsx:328` — use `hover:shadow-sm`
29. **Banned shadow** — `shadow-lg shadow-orange-200/50` at `frontend/src/components/budget/modals/CreateBudgetLineItemsModal.tsx:154` — remove entirely

#### Arbitrary spacing

30. **Arbitrary spacing** — `min-w-[100px]` at `frontend/src/components/budget/budget-page-header.tsx:125` — use standard sizing
31. **Arbitrary spacing** — Multiple `w-[400px]`, `max-h-[400px]`, `w-[500px]`, `max-w-[1400px]` across modal files — acceptable for modal sizing constraints

## Cross-Page Consistency Issues
- Budget uses a custom `BudgetPageHeader` instead of the shared `ProjectPageHeader` + `PageContainer` pattern used by other financial tools
- Budget modals use a custom dark `bg-slate-900` header pattern (`BaseModal.tsx`, `BaseSidebar.tsx`) not seen in any other tool
- Budget has its own `budget-button.tsx` component with hardcoded `text-white` instead of using the standard `<Button>` component
