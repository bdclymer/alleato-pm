# Design System Audit: Direct Costs

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 1 (list view; detail and form audited at code level)
- **Passed:** 0
- **Failed:** 1
- **Critical violations:** 8

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Direct Costs List View | http://localhost:3000/67/direct-costs | Uses UnifiedTablePage correctly; visual layout consistent. Hardcoded orange colors in BulkActionsToolbar; raw `<button>` in FiltersPanel; `text-white` in LineItemsManager; direct `@/components/ui/` imports in page files | FAIL | screenshots/design-audit-list.png |

## Violations Detail

### FAIL: Direct Costs (code-level)

#### Hardcoded `bg-orange-*` colors

1. **Hardcoded color** — `className="bg-orange-600 text-white hover:bg-orange-700"` at `frontend/src/components/direct-costs/BulkActionsToolbar.tsx:32` (AlertDialogAction for Reject) — should use `<Button variant="destructive">` or `bg-primary`
2. **Hardcoded color** — `hover:bg-orange-50 hover:border-orange-300` at `frontend/src/components/direct-costs/BulkActionsToolbar.tsx:32` (Reject button) — should use `hover:bg-accent`

#### Hardcoded `text-white` in non-tooltip context

3. **Hardcoded color** — `className="h-10 gap-2 bg-brand px-4 text-white hover:bg-brand-hover"` at `frontend/src/components/direct-costs/LineItemsManager.tsx:575` — use `<Button>` default variant (which is primary); the explicit `text-white` is redundant when using proper Button variant

#### Raw `<button>` elements

4. **Raw HTML** — Raw `<button type="button" ...>` elements used for filter pills in `frontend/src/components/direct-costs/FiltersPanel.tsx:58` (8 instances for each filter pill) — should use `<Button variant="ghost" size="sm">` from `@/components/ds`

#### Direct `@/components/ui/` imports in page files

5. **Direct ui/ import** — 7+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx:18-23` — all should come from `@/components/ds`
6. **Direct ui/ import** — 8+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/direct-costs/[costId]/page.tsx:7-33` — all should come from `@/components/ds`
7. **Direct ui/ import** — 2 direct `@/components/ui/` imports at `frontend/src/app/(main)/[projectId]/direct-costs/cost-code-hierarchy-view.tsx:8-9` — should use `@/components/ds`

#### Hardcoded `bg-destructive text-white`

8. **Hardcoded color** — `className="bg-destructive text-white hover:bg-destructive/90"` at `frontend/src/components/direct-costs/BulkActionsToolbar.tsx:32` (Delete AlertDialogAction) — should use `<Button variant="destructive">` which handles the foreground color automatically

## Cross-Page Consistency Issues
- List view visually matches other UnifiedTablePage tools (good)
- Direct Costs has inline status dropdowns in the table (Select components per row) which differs from other tools that show static status badges
- BulkActionsToolbar uses hardcoded orange for "Reject" action — inconsistent with how destructive/warning actions are styled elsewhere
- FiltersPanel is the only component across all 7 tools that uses raw `<button>` elements for filter pills
