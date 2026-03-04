# Design System Audit: Commitments

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 2 (list view, detail error state)
- **Passed:** 1
- **Failed:** 1
- **Critical violations:** 2

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Commitments List View | http://localhost:3000/67/commitments | Uses UnifiedTablePage correctly; visual layout consistent | PASS | screenshots/design-audit-list.png |
| Commitments Detail | http://localhost:3000/67/commitments/SC-2025-001 | Data not found (ID mismatch). Hardcoded colors in ChangeOrdersTab component | FAIL | screenshots/design-audit-detail.png |

## Violations Detail

### FAIL: Commitments Detail (code-level)

#### Hardcoded colors in component files

1. **Hardcoded color** — `className="h-4 w-4 text-gray-500"` at `frontend/src/components/commitments/tabs/ChangeOrdersTab.tsx:234` — use `text-muted-foreground`
2. **Hardcoded color** — `className="text-gray-500"` at `frontend/src/components/commitments/tabs/ChangeOrdersTab.tsx:237` — use `text-muted-foreground`

## Cross-Page Consistency Issues
- List view visually matches other UnifiedTablePage tools (good)
- `ChangeOrdersTab` component uses hardcoded gray colors instead of semantic tokens
