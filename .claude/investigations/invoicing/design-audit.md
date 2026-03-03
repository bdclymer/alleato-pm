# Design System Audit: Invoicing

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 1 (list view)
- **Passed:** 0
- **Failed:** 1
- **Critical violations:** 3

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Invoicing List View | http://localhost:3000/67/invoicing | Uses UnifiedTablePage correctly; visual layout consistent. No hardcoded colors in component files. Direct `@/components/ui/` imports in page and detail files | FAIL | screenshots/design-audit-list.png |

## Violations Detail

### FAIL: Invoicing (code-level)

#### Direct `@/components/ui/` imports in page file

1. **Direct ui/ import** — 5+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/invoicing/page.tsx:18-25` (AlertDialog, Button, DropdownMenu) — should use `@/components/ds`

#### Direct `@/components/ui/` imports in new/create page

2. **Direct ui/ import** — 8+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/invoicing/new/page.tsx:11-28` (Button, Card, Input, Select, Form) — should use `@/components/ds`

#### Direct `@/components/ui/` imports in detail page

3. **Direct ui/ import** — 15+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx:11-60` (Button, Card, Table, AlertDialog, Form, Input, Textarea, Select, Slideover, Separator, Text) — should use `@/components/ds`

## Cross-Page Consistency Issues
- List view is visually consistent with other UnifiedTablePage tools (good)
- Invoicing component files (`InvoiceLineItemsTable.tsx`, `InvoiceStatusBadge.tsx`) are clean — no hardcoded colors or banned shadows
- The only violation category is the systemic direct `@/components/ui/` import pattern shared by all 7 tools
- Invoicing has the highest density of direct ui/ imports in a single file (15+ in the detail page)
