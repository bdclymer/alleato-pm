# AI UI Baseline

This baseline is mandatory for every new or refactored page.

## Required Structure

```tsx
<>
  <ProjectPageHeader title="..." actions={<Button size="sm">Primary Action</Button>} />
  <PageContainer>{/* page content */}</PageContainer>
</>
```

## Hard Rules

1. Use semantic tokens only (`text-foreground`, `text-muted-foreground`, `bg-background`, `border-border`).
2. Use `UnifiedTablePage` for list/table pages.
3. Header actions contain only the primary create/add action.
4. No deprecated wrappers: `ProjectToolPage`, `AppShell`, `TableLayout`, `GenericDataTable`.
5. No dynamic Tailwind class construction.
6. No non-functional UI controls.

## Verification Before Merge

1. Run `npm run quality` in `frontend/`.
2. Run `/design-check` or `scripts/check-design-system.sh` for changed UI files.
3. Confirm no new violations in `.claude/design-audit/violations.json`.

## Canonical Rulebook

For full rules and examples, use `.claude/design-audit/design-system-rules.md`.
