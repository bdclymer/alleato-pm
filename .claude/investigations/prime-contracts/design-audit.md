# Design System Audit: Prime Contracts

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 2 (list view, detail error state)
- **Passed:** 1
- **Failed:** 1
- **Critical violations:** 4

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Prime Contracts List View | http://localhost:3000/67/prime-contracts | Uses UnifiedTablePage correctly; header/table/tabs consistent with other tools; no hardcoded colors in page file | PASS | screenshots/design-audit-list.png |
| Prime Contracts Detail | http://localhost:3000/67/prime-contracts/105 | Failed to load (data issue); screenshotted error state. Direct `@/components/ui/` imports in page source | FAIL | screenshots/design-audit-detail.png |

## Violations Detail

### FAIL: Prime Contracts Detail (code-level)

#### Direct `@/components/ui/` imports in page file

1. **Direct ui/ import** — `import { Badge } from "@/components/ui/badge"` at `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx:33` — should be `import { Badge } from "@/components/ds"`
2. **Direct ui/ import** — `import { Button } from "@/components/ui/button"` at `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx:34` — should be `import { Button } from "@/components/ds"`
3. **Direct ui/ import** — 15+ direct `@/components/ui/` imports across lines 33-68 of the detail page — all should come from `@/components/ds`

#### Hardcoded colors in create/edit form

4. **Hardcoded color** — `className="max-w-[1400px] bg-white rounded-lg border border-gray-200 p-8"` at `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx:165` — use `bg-card border-border`
5. **Hardcoded color** — `className="max-w-[1400px] bg-white rounded-lg border border-gray-200 p-8"` at `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/edit/page.tsx:372` — same fix

#### Direct `@/components/ui/` imports in configure page

6. **Direct ui/ import** — 6 direct `@/components/ui/` imports at `frontend/src/app/(main)/[projectId]/prime-contracts/configure/page.tsx:8-13` — should use `@/components/ds`

## Cross-Page Consistency Issues
- List view uses the shared UnifiedTablePage pattern and is consistent with other tools
- Detail page has excessive direct ui/ imports that should be routed through ds/ barrel
- Create/edit forms use hardcoded `bg-white border-gray-200` instead of semantic tokens
