# Table System

Consolidated reference for all table pages. Every data list page uses `UnifiedTablePage`.

---

## Why UnifiedTablePage

Before this system, 20+ table pages were built inconsistently — different toolbar patterns, inconsistent filter UI, repeated mistakes. UnifiedTablePage standardizes:
- Consistent toolbar (search, views, filters, columns, export, bulk delete)
- CRUD by default
- Config-driven — new table = config + hook, no custom JSX for standard behavior
- Same keyboard shortcuts everywhere — users learn once

---

## Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ Page Title                              [+ Add Entity]  │  ← Header (primary action ONLY)
├─────────────────────────────────────────────────────────┤
│ [Tab 1] [Tab 2] [Tab 3]                                 │  ← Optional tabs
├─────────────────────────────────────────────────────────┤
│ 🔍  [≡][▦][▤]  [Filter]  [⋮⋮]  [↓]  [🗑]      47 items │  ← Toolbar (everything else)
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Table / Card / List view                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    [<] Page 1 of 5 [>]                  │
└─────────────────────────────────────────────────────────┘
```

**Critical rule:** Add button stays in **header** (page-level action). All table controls stay in **toolbar** (data-level). Filters in popover, not inline.

---

## Toolbar Elements

| Element | Behavior |
|---------|----------|
| **Search** | Icon by default, expands to input on click, collapses on blur if empty |
| **Views** | 3 icon toggle (table/card/list), no labels |
| **Filter** | Icon opens popover with all filters, badge shows active count |
| **Columns** | Icon opens dropdown to show/hide columns |
| **Export** | Icon triggers CSV/Excel export |
| **Delete** | Disabled until rows selected, turns red when active |
| **Count** | Right-aligned — "X items" or "X of Y" when filtered |

---

## UnifiedTablePage API

```tsx
import { UnifiedTablePage } from "@/components/tables/unified";

<UnifiedTablePage
  header={{
    title: "Entity Name",
    actions: <Button size="sm">+ Create</Button>,  // PRIMARY ACTION ONLY
  }}
  tabs={[
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
  ]}
  toolbar={{
    onSearch: (query) => setSearch(query),
    onExport: () => exportCSV(),
    features: {
      enableExport: true,
      enableBulkDelete: true,
      enableColumnVisibility: true,
    },
  }}
  data={{
    items,
    isLoading,
    isFetching,
  }}
  table={{
    columns,
    getRowId: (row) => row.id,
    onRowClick: (row) => router.push(`/${projectId}/entity/${row.id}`),
  }}
  sorting={{
    sortBy: sortField,
    sortDirection: sortDir,
    onSort: (field, dir) => { setSortField(field); setSortDir(dir); },
  }}
  emptyState={{
    title: "No items yet",
    description: "Create your first item to get started",
    filteredDescription: "No items match your filters",
    isFiltered: search.length > 0,
  }}
/>
```

---

## Reference Implementations

| File | What it demonstrates |
|------|---------------------|
| `commitments/page.tsx` | Tabs, footer totals, row selection |
| `change-events/page.tsx` | Tabs, bulk delete, export |
| `invoicing/page.tsx` | KpiRow as topContent |
| `rfis/rfis-client.tsx` | Standard implementation |
| `submittals/page.tsx` | Standard with filters |
| `direct-costs/cost-code-hierarchy-view.tsx` | Hierarchical/grouped rows |
| `daily-log/daily-log-client.tsx` | Simple table, no filters |

---

## Cell Types

All table cells must use one of these standard types. Never build one-off cell renderers for standard data.

| Cell type | What it shows | How to implement |
|-----------|--------------|-----------------|
| Text | Plain string | `row.name` |
| Meta | Secondary smaller text below | `<div><p>{primary}</p><p className="text-xs text-muted-foreground">{secondary}</p></div>` |
| Avatar + name | Photo/initial + name | `<AvatarStack avatars={[...]} />` |
| Status | Colored pill | `<StatusBadge status={row.status} />` |
| Status dot | Compact dot + label | `<StatusDot status={row.status} />` |
| Date | Formatted date | `format(new Date(row.date), "MMM d, yyyy")` |
| Money | Currency value | `formatCurrency(row.amount)` with `font-mono tabular-nums` |
| Icon only | Action or category icon | `<Icon className="h-4 w-4 text-muted-foreground" />` |
| Progress | Progress bar | `<Progress value={row.pct} />` |
| Empty/null | Dash for missing data | `row.value ?? "—"` |

---

## Row States

```
Focused (keyboard J/K):  2px left border (--primary color) + bg-accent/5
Hovered:                 bg-muted (subtle 2–3% shift)
Selected (checkbox):     bg-accent/10, checkmark visible
Default:                 bg-card, text-foreground / text-muted-foreground
```

---

## Density Options

| Density | Row height | Cell padding | When to use |
|---------|-----------|--------------|-------------|
| standard | 53px | `px-3 py-3` | Default — most pages |
| compact | 40px | `px-3 py-2` | High-density tables, log views |
| comfortable | 64px | `px-3 py-4` | Detail-heavy rows with multi-line content |

---

## Table Accessibility Checklist

Before shipping any table page:

**Structure**
- [ ] Page header contains title and one primary action
- [ ] Filters and view controls are in the toolbar, not the header

**Behavior**
- [ ] Sorting: columns sort on header click, direction visible
- [ ] Column visibility can be configured via toolbar
- [ ] Row selection supports bulk actions
- [ ] Pagination and total count always visible

**Cell types**
- [ ] Null/empty cells show "—" consistently
- [ ] Long text truncates with tooltip, not word-wrap (unless intentional)
- [ ] Currency values are right-aligned and use `tabular-nums`

**States**
- [ ] Loading skeleton mirrors the table layout (same columns)
- [ ] Empty state for "no data" is different from "no results for filter"
- [ ] Error state is actionable (retry button or contact link)

**Keyboard / Accessibility**
- [ ] Table header cells are keyboard navigable
- [ ] Sort controls have `aria-sort` labels
- [ ] Selection checkboxes are labeled
- [ ] Row actions menu is keyboard accessible
- [ ] J/K keys move row focus in the list

---

## Deprecated — Never Use

```
DataTablePage       → use UnifiedTablePage
GenericDataTable    → use UnifiedTablePage
TableLayout         → use PageShell variant="table"
AppShell            → deprecated
```
