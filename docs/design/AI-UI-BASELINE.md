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
7. For form line-item grids (SOV/cost/invoice line items), match the Direct Costs line-items visual pattern from `frontend/src/components/direct-costs/LineItemsManager.tsx`.
8. Do not use accordion presentation for the primary line-items block in forms.

## Line Items Pattern (Form Grids)

When implementing editable line-item tables in forms, use this as the default baseline:

- Container: subtle bordered shell with muted table backdrop
- Header: compact label typography (`text-[11px]`, normal weight, muted foreground)
- Rows: compact vertical rhythm and consistent input heights
- Totals: dedicated footer row with right-aligned currency totals
- Actions: primary `Add Line Item` button below the table

If fields differ from Direct Costs, keep behavior different but preserve this visual structure.

## Verification Before Merge

1. Run `npm run quality` in `frontend/`.
2. Run `/design-check` or `scripts/check-design-system.sh` for changed UI files.
3. Confirm no new violations in `.claude/design-audit/violations.json`.

## Canonical Rulebook

For full rules and examples, use `.claude/design-audit/design-system-rules.md`.
