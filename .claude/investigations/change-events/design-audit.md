# Design System Audit: Change Events

**Date:** 2026-03-03
**Auditor:** design-review agent
**Design System Ref:** frontend/src/design-system/tokens.md

## Summary

- **Pages audited:** 1 (list view with empty state)
- **Passed:** 0
- **Failed:** 1
- **Critical violations:** 3

## Audit Results

| Name | URL | Notes | Pass/Fail | Screenshot |
|------|-----|-------|-----------|------------|
| Change Events List View (Empty State) | http://localhost:3000/67/change-events | Uses UnifiedTablePage correctly; empty state displays. Direct `@/components/ui/` imports in page file and detail page | FAIL | screenshots/design-audit-list.png |

## Violations Detail

### FAIL: Change Events List View (code-level)

#### Direct `@/components/ui/` imports in page file

1. **Direct ui/ import** — `import { Button } from "@/components/ui/button"` at `frontend/src/app/(main)/[projectId]/change-events/page.tsx:9` — should use `@/components/ds`
2. **Direct ui/ import** — `import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"` at `frontend/src/app/(main)/[projectId]/change-events/page.tsx:27` — should use `@/components/ds`
3. **Direct ui/ import** — `import { Text } from "@/components/ui/text"` at `frontend/src/app/(main)/[projectId]/change-events/page.tsx:28` — should use `@/components/ds`

#### Direct `@/components/ui/` imports in detail page

4. **Direct ui/ import** — 10+ direct `@/components/ui/` imports across `frontend/src/app/(main)/[projectId]/change-events/[changeEventId]/page.tsx:8-22` — all should come from `@/components/ds`

## Cross-Page Consistency Issues
- List view visually consistent with other UnifiedTablePage tools (good)
- Empty state uses the proper pattern with icon, title, description, and action button
- Header pattern is consistent with other tools
