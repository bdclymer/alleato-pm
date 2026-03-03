# Design System Audit: Change Orders

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 2 (list view, detail error state)
- **Passed:** 0
- **Failed:** 2
- **Critical violations:** 5

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Change Orders List View | http://localhost:3000/67/change-orders | Uses UnifiedTablePage correctly; visual layout consistent. No hardcoded colors in list page itself. Direct `@/components/ui/` imports in page-actions and new/edit pages | FAIL | screenshots/design-audit-list.png |
| Change Orders Detail | http://localhost:3000/67/change-orders/CO-E2E-001 | Failed to fetch (data issue). Direct `@/components/ui/` imports throughout detail and edit pages | FAIL | screenshots/design-audit-detail.png |

## Violations Detail

### FAIL: Change Orders List View (code-level — supporting pages)

#### Direct `@/components/ui/` imports in page-actions

1. **Direct ui/ import** — `import { Button } from "@/components/ui/button"` at `frontend/src/app/(main)/[projectId]/change-orders/page-actions.tsx:5` — should use `@/components/ds`

#### Direct `@/components/ui/` imports in new/create page

2. **Direct ui/ import** — 14+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/change-orders/new/page.tsx:11-37` (Button, Card, Input, Textarea, Checkbox, RadioGroup, Label, Select, Form, Alert) — all should come from `@/components/ds`

### FAIL: Change Orders Detail (code-level)

#### Direct `@/components/ui/` imports in detail page

3. **Direct ui/ import** — 8+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/page.tsx:9-22` — all should come from `@/components/ds`

#### Direct `@/components/ui/` imports in edit page

4. **Direct ui/ import** — 10+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/change-orders/[changeOrderId]/edit/page.tsx:11-31` — all should come from `@/components/ds`

#### Direct `@/components/ui/` imports in reviewer settings dialog

5. **Direct ui/ import** — 8+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/change-orders/reviewer-settings-dialog.tsx:6-25` — all should come from `@/components/ds`

## Cross-Page Consistency Issues
- List view visually matches other UnifiedTablePage tools (good)
- Status badges display correctly using the shared table component
- Create/edit forms have the most direct ui/ imports of any tool (14+ in new/page.tsx)
- No hardcoded colors found in the page-level files (clean in that regard)
