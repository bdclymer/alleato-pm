# Design System Audit: Prime Contracts

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
| Prime Contracts List View | http://localhost:3000/67/prime-contracts | Uses UnifiedTablePage correctly; header/table/tabs consistent with other tools; no hardcoded colors in page file | PASS | screenshots/design-audit-list.png |
| Prime Contracts Detail | http://localhost:3000/67/prime-contracts/105 | Failed to load (data issue); screenshotted error state. Hardcoded colors in create/edit forms | FAIL | screenshots/design-audit-detail.png |

## Violations Detail

### FAIL: Prime Contracts Detail (code-level)

#### Hardcoded colors in create/edit form

1. **Hardcoded color** — `className="max-w-[1400px] bg-white rounded-lg border border-gray-200 p-8"` at `frontend/src/app/(main)/[projectId]/prime-contracts/new/page.tsx:165` — use `bg-card border-border`
2. **Hardcoded color** — `className="max-w-[1400px] bg-white rounded-lg border border-gray-200 p-8"` at `frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/edit/page.tsx:372` — same fix

## Cross-Page Consistency Issues
- List view uses the shared UnifiedTablePage pattern and is consistent with other tools
- Create/edit forms use hardcoded `bg-white border-gray-200` instead of semantic tokens
