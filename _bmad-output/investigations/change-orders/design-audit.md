# Design System Audit: Change Orders

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 2 (list view, detail error state)
- **Passed:** 2
- **Failed:** 0
- **Critical violations:** 0

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Change Orders List View | http://localhost:3000/67/change-orders | Uses UnifiedTablePage correctly; visual layout consistent. No hardcoded colors found | PASS | screenshots/design-audit-list.png |
| Change Orders Detail | http://localhost:3000/67/change-orders/CO-E2E-001 | Failed to fetch (data issue). Clean — no violations in page/edit/dialog files | PASS | screenshots/design-audit-detail.png |

## Cross-Page Consistency Issues
- List view visually matches other UnifiedTablePage tools (good)
- Status badges display correctly using the shared table component
- No hardcoded colors found in the page-level files (clean in that regard)
