# Design System Audit: Commitments

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
| Commitments List View | http://localhost:3000/67/commitments | Uses UnifiedTablePage correctly; visual layout consistent. Direct `@/components/ui/` imports in page file | FAIL | screenshots/design-audit-list.png |
| Commitments Detail | http://localhost:3000/67/commitments/SC-2025-001 | Data not found (ID mismatch). Direct `@/components/ui/` imports in detail page; hardcoded colors in ChangeOrdersTab component | FAIL | screenshots/design-audit-detail.png |

## Violations Detail

### FAIL: Commitments List View (code-level)

#### Direct `@/components/ui/` imports in page file

1. **Direct ui/ import** — `import { ... } from "@/components/ui/alert-dialog"` at `frontend/src/app/(main)/[projectId]/commitments/page.tsx:18` — should use `@/components/ds`
2. **Direct ui/ import** — `import { Button } from "@/components/ui/button"` at `frontend/src/app/(main)/[projectId]/commitments/page.tsx:19` — should use `@/components/ds`
3. **Direct ui/ import** — `import { ... } from "@/components/ui/dropdown-menu"` at `frontend/src/app/(main)/[projectId]/commitments/page.tsx:25` — should use `@/components/ds`

### FAIL: Commitments Detail (code-level)

#### Direct `@/components/ui/` imports

4. **Direct ui/ import** — 10+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/commitments/[commitmentId]/page.tsx:19-29` — all should come from `@/components/ds`

#### Hardcoded colors in component files

5. **Hardcoded color** — `className="h-4 w-4 text-gray-500"` at `frontend/src/components/commitments/tabs/ChangeOrdersTab.tsx:234` — use `text-muted-foreground`
6. **Hardcoded color** — `className="text-gray-500"` at `frontend/src/components/commitments/tabs/ChangeOrdersTab.tsx:237` — use `text-muted-foreground`

#### Direct `@/components/ui/` imports in settings/configure pages

7. **Direct ui/ import** — 15+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/commitments/configure/page.tsx:9-31` — should use `@/components/ds`
8. **Direct ui/ import** — 10+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/commitments/settings/page.tsx:9-27` — should use `@/components/ds`

## Cross-Page Consistency Issues
- List view visually matches other UnifiedTablePage tools (good)
- Detail and settings pages have excessive direct ui/ imports
- `ChangeOrdersTab` component uses hardcoded gray colors instead of semantic tokens
