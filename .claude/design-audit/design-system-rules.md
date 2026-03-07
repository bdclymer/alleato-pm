# Design System Rules — Alleato PM

> Source of truth for UI enforcement. Last updated: 2026-03-07.
> These rules are enforced by `/design-audit`, `/design-fix`, and `/design-check`.

---

## Core Philosophy

**Space is expensive real estate.** Every element must answer three questions:
1. What does the user need to know right now?
2. What might they want to do?
3. How can we communicate this in the cleanest possible way?

If an element cannot answer at least one of these questions, it does not belong on the page. Remove it.

---

## Page Layout — MANDATORY PATTERN

All project tool pages MUST use exactly this structure:

```tsx
import { ProjectPageHeader, PageContainer } from "@/components/layout";

<>
  <ProjectPageHeader
    title="Tool Name"
    actions={<Button size="sm">Primary Action</Button>}
  />
  <PageContainer>
    {/* page content */}
  </PageContainer>
</>
```

**Rules:**
- `ProjectPageHeader` is ALWAYS outside and above `PageContainer`
- `PageContainer` wraps content only, never the header
- Descriptions are globally suppressed in `PageHeader` — do not rely on them rendering
- NEVER use `ProjectToolPage` (deprecated wrapper)
- NEVER use `AppShell` from `@/components/layouts` (deprecated)
- NEVER use `TableLayout` (deprecated)
- NEVER use `GenericDataTable` (deprecated)

---

## List Pages — UnifiedTablePage Pattern

All list/table pages MUST use `UnifiedTablePage` from `@/components/tables/unified`.

```tsx
<UnifiedTablePage
  header={{
    title: "Entity Name",
    actions: <Button size="sm">Create</Button>,  // PRIMARY ACTION ONLY
  }}
  tabs={tabs}
  toolbar={{ ... }}  // search, filters, column visibility, export go HERE
  data={{ items, isLoading, isFetching }}
  table={{ columns, getRowId, onRowClick }}
  sorting={{ ... }}
  emptyState={{ title, description, filteredDescription, isFiltered }}
/>
```

**Header actions rule — CRITICAL:**
- Header `actions` prop = ONE thing only: the primary create/add button
- Export, import, settings, bulk actions = NEVER in header actions
- Export belongs in `toolbar.onExport` with `features.enableExport = true`
- Secondary actions belong in the toolbar

**Pages currently using UnifiedTablePage (reference implementations):**
- `commitments/page.tsx` — with tabs, footer totals, selection
- `change-events/page.tsx` — with tabs, bulk delete, export
- `invoicing/page.tsx` — with KpiRow topContent
- `rfis/rfis-client.tsx`
- `submittals/page.tsx`
- `direct-costs/cost-code-hierarchy-view.tsx` — hierarchical rows
- `daily-log/daily-log-client.tsx` — simple table, no filters

---

## Component Import Rules

| Need | Import From | Example |
|------|------------|---------|
| Page header | `@/components/layout` | `ProjectPageHeader` |
| Page container | `@/components/layout` | `PageContainer` |
| Status display | `@/components/ds` | `<StatusBadge status="Draft" />` |
| Status dot (tables) | `@/components/ds` | `<StatusDot status="Approved" />` |
| KPI metrics | `@/components/ds` | `<KpiRow metrics={[...]} />` |
| Empty states | `@/components/ds` | `<EmptyState icon={...} title="..." description="..." />` |
| Section titles | `@/components/ds` | `<SectionHeader title="..." count={5} />` |
| Base primitives | `@/components/ui/{component}` | `Button`, `Input`, `Select` |

**NEVER:**
- Import `DataTablePage` (deprecated)
- Use `GenericDataTable` (deprecated)
- Use `TableLayout` (deprecated)
- Use `AppShell` from `@/components/layouts` (deprecated)
- Add custom one-off components that duplicate ds/ or ui/ components

---

## Color Token Rules

**Use semantic tokens ONLY. No raw Tailwind color classes.**

| Instead of | Use |
|-----------|-----|
| `text-neutral-500`, `text-gray-500` | `text-muted-foreground` |
| `text-neutral-900`, `text-gray-900` | `text-foreground` |
| `border-neutral-200`, `border-gray-200` | `border-border` |
| `bg-white` | `bg-background` |
| `bg-gray-50`, `bg-neutral-50` | `bg-muted` |
| `text-brand`, `text-orange-500` | `text-primary` |
| `bg-emerald-50 border-emerald-200` | `bg-success/5 border-success/20` |
| `bg-amber-50 border-amber-200` | `bg-warning/5 border-warning/20` |
| `bg-blue-500` | `bg-primary` |
| `ring-blue-500` | `ring-primary` |
| `bg-purple-100 text-purple-800` | `bg-muted text-foreground` or `StatusBadge` |

**Shadow rules:** Only `shadow-xs` and `shadow-sm` are allowed. Never `shadow-md`, `shadow-lg`, `shadow-xl`.

**Dynamic class construction is BANNED:**
```tsx
// WRONG — Tailwind tree-shakes dynamic classes in production
className={`text-${color}-600`}

// CORRECT — static mapping
const colorMap = { parse: "text-primary", embed: "text-muted-foreground" };
className={colorMap[phase]}
```

---

## Visual Noise Rules

**Cards must earn their place.** A Card is justified when it:
- Groups multiple related actions (e.g., a form section)
- Represents a distinct interactive object (e.g., a Kanban card)
- Contains content the user will repeatedly reference

**Cards are NOT justified for:**
- Wrapping a filter toolbar (use inline flex layout)
- Wrapping a single paragraph of placeholder "coming soon" text (use `EmptyState`)
- Showing developer-internal metadata (bucket names, folder paths, internal IDs)
- Displaying a legend that explains the UI (if the UI needs a legend, simplify the UI)
- Repeating data that is already visible elsewhere on the same page

**Stat cards:** Replace 3-column stat card grids with `<KpiRow>` from `@/components/ds`. `KpiRow` is lighter weight and integrates with the page flow without adding border noise.

---

## Non-Functional UI Rules

**Never ship UI that does nothing.**
- A button with no `onClick` is worse than no button
- A dropdown with empty `DropdownMenuItem` items must be removed or implemented
- Placeholder tabs that show no content must be hidden or implemented

---

## Global Header Rules

- Brand label: "ALLEATO" (not "PROCORE")
- Only include buttons that have working functionality
- Current non-functional items removed: "Favorites", "Apps / Select an App"

---

## TypeScript Rules (Design System Scope)

- NEVER use `any` type — use `unknown` if necessary, or define a proper interface
- All component props must be typed explicitly
- Status strings passed to `StatusBadge` must match known status values

---

## What Was Audited & Fixed (2026-03-07)

**22 violations fixed.** Key changes:
- `global-header.tsx` — "ALLEATO" brand, removed non-functional buttons
- `hero-metrics.tsx` — semantic color tokens
- `drawings/board/page.tsx` — design token colors, removed duplicate stat cards
- `pipeline/page.tsx` — fixed header order, removed status legend, fixed dynamic class bug
- `photos/page.tsx` — removed internal storage metadata card
- `drawings/areas/page.tsx` — KpiRow for stats, removed duplicate "Selected Area Details"
- `rfis/rfis-client.tsx` — export removed from header actions
- `commitments/page.tsx` — export removed from header actions
- `submittals/page.tsx` — export removed from header actions
- `documents/page.tsx` — Card "coming soon" → EmptyState
- `daily-log/page.tsx` — migrated from GenericDataTable to UnifiedTablePage
- `specifications/page.tsx` — removed Card filter wrapper, fixed `any` type

**3 violations deferred (require page redesign):**
- V001: Home page (`page-tools-grid.tsx`) — still uses AppShell
- V002: `page-test.tsx` — still uses AppShell (dev file, delete candidate)
- V005: Budget Setup (`budget/setup/page.tsx`) — bespoke header

---

## Files Referenced

| Purpose | Path |
|---------|------|
| Violations log | `.claude/design-audit/violations.json` |
| Full audit report | `docs-ai/contents/docs/reports/design-audit-2026-03-07.md` |
| Design tokens | `frontend/src/design-system/spacing.ts` |
| DS components | `frontend/src/components/ds/` |
| Layout components | `frontend/src/components/layout/` |
| UI primitives | `frontend/src/components/ui/` |
| Page header | `frontend/src/components/layout/page-header-unified.tsx` |
| Page container | `frontend/src/components/layout/PageContainer.tsx` |
