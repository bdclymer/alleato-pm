# New Page Workflow

Use this sequence for every new page.

## 1. Pick the Archetype

1. Table/list page: `UnifiedTablePage`
2. Form page: `ProjectPageHeader` + `PageContainer` (+ `FormContainer` where needed)
3. Detail/content page: `ProjectPageHeader` + `PageContainer`

## 2. Build with Standard Imports

- Layout: `@/components/layout`
- DS components: `@/components/ds`
- Primitives: `@/components/ui/*`

## 3. Apply Token Rules

- Use semantic tokens only.
- Keep spacing on 8px rhythm (`space-y-2/4/6/8`, `gap-4/6`).
- Keep shadows at `shadow-xs` or `shadow-sm` only.

## 4. Enforce Interaction Rules

- Header `actions` contains one primary action only.
- Secondary actions (export/import/settings) go in toolbar.
- No placeholder controls without working handlers.

## 5. Run Quality Gates

1. `cd frontend && npm run quality`
2. `cd frontend && npm run check:routes` (when routes changed)
3. Run design audit/check command for touched files.

## 6. Done Criteria

- Matches `.claude/design-audit/design-system-rules.md`
- No new design violations
- Uses existing DS/components before creating new ones
