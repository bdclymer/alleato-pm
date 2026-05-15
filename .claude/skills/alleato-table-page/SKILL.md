---
name: alleato-table-page
description: >
  Alleato PM table page pattern using UnifiedTablePage + useUnifiedTableState.
  Use when building or modifying any list/table page in the app. Covers imports,
  props, toolbar rules, header rules, config file pattern, and forbidden anti-patterns.
metadata:
  filePatterns:
    - "frontend/src/app/(main)/**/**/page.tsx"
    - "frontend/src/app/(main)/*/page.tsx"
    - "frontend/src/features/**/*table-config*"
    - "frontend/src/components/tables/**"
priority: 90
---

# Alleato Table Page Pattern

## Imports

```ts
// Main component + hook + types — always from the barrel
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
```

The barrel at `frontend/src/components/tables/unified/index.ts` re-exports everything.
Never import from `unified-table-page.tsx` or `table-toolbar.tsx` directly.

---

## useUnifiedTableState

Manages all table state: search, filters, pagination, sort, column visibility, selected rows, view mode.

```ts
const tableState = useUnifiedTableState({
  entityKey: "commitments",          // unique key for localStorage persistence
  searchParams,                       // from useSearchParams()
  pathname,                           // from usePathname()
  router,                             // from useRouter()
  defaults: {
    view: "table",                    // "table" | "card" | "list"
    allowedViews: ["table", "card", "list"],
    page: 1,
    perPage: 25,
    search: "",
    sortBy: "number",                 // column id to sort by default
    sortDirection: "asc",
    visibleColumns: myDefaultVisibleColumns,  // string[] of column ids
    filters: { status: undefined, type: undefined },
  },
});
```

**Key state fields:**
- `tableState.searchInput` / `tableState.setSearchInput` — raw search string (debounced internally)
- `tableState.debouncedSearch` — use this for API calls, not `searchInput`
- `tableState.page` / `tableState.setPage`
- `tableState.perPage` / `tableState.setPerPage`
- `tableState.sortBy` / `tableState.sortDirection`
- `tableState.visibleColumns` / `tableState.setVisibleColumns`
- `tableState.selectedIds` / `tableState.setSelectedIds`
- `tableState.currentView` / `tableState.setCurrentView`
- `tableState.activeFilters` / `tableState.setActiveFilters`
- `tableState.setSearchParams(obj)` — syncs state to URL query params

---

## Features are ON by default — opt out, not in

Every feature works with zero configuration. The only required props are `header`, `toolbar` (totalItems, filteredItems, searchValue, onSearchChange, currentView, onViewChange), `data`, `table.columns`, `table.getRowId`, and `emptyState`.

**What you do NOT need to wire manually:**
- `toolbar.selectedCount` — derived from internal selection state automatically
- `toolbar.onBulkDelete` — auto-built from `table.onDelete` (with confirmation dialog)
- `toolbar.onExport` — auto-built CSV from columns that define `csvValue`
- `sorting` prop — internal sort state; works as long as columns define `sortable`/`sortValue`
- `pagination` prop — defaults to 25 rows/page client-side automatically
- `toolbar.onColumnVisibilityChange` — auto-persists to localStorage by `header.title`

**To disable a feature:**
```tsx
features={{ enablePagination: false, enableSorting: false, enableExport: false }}
```

**To add Edit to the default row actions menu:**
```tsx
table={{ onEdit: (item) => router.push(`.../${item.id}/edit`), onDelete: handleDelete }}
```
This renders a "⋯" menu with Edit + Delete (separator between them) automatically.

---

## Minimal viable table page

```tsx
<UnifiedTablePage
  header={{
    title: "Commitments",
    description: "Manage purchase orders and subcontracts",
    actions: <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create</Button>,
  }}
  toolbar={{
    totalItems: items.length,
    filteredItems: items.length,
    searchValue: tableState.searchInput,
    onSearchChange: tableState.setSearchInput,
    searchPlaceholder: "Search commitments...",
    currentView: tableState.currentView,
    onViewChange: tableState.setCurrentView,
  }}
  data={{ items, isLoading, error }}
  table={{
    columns: tableColumns,
    onEdit: (item) => router.push(`commitments/${item.id}/edit`),
    onDelete: handleDelete,   // bulk delete + single delete both auto-wired
    getRowId: (item) => String(item.id),
    onRowClick: (item) => router.push(`commitments/${item.id}`),
  }}
  emptyState={{
    title: "No commitments",
    description: "Create your first commitment to get started.",
    filteredDescription: "No commitments match your current filters.",
    isFiltered: Boolean(tableState.debouncedSearch),
    action: <Button onClick={handleCreate}>Create Commitment</Button>,
  }}
/>
```

Sorting, pagination (25/page), export, bulk delete, row selection, column visibility — all automatic.

---

## Full props example (when URL-synced state is needed)

```tsx
<UnifiedTablePage
  header={{
    title: "Commitments",
    description: "Manage purchase orders and subcontracts",
    actions: <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create</Button>,
  }}
  tabs={tabs}           // optional — TabItem[]
  toolbar={{
    totalItems,
    filteredItems: totalItems,
    // selectedCount is optional — omit it and the component derives it internally
    searchValue: tableState.searchInput,
    onSearchChange: tableState.setSearchInput,
    searchPlaceholder: "Search commitments...",
    currentView: tableState.currentView,
    onViewChange: (view) => {
      tableState.setCurrentView(view);
      tableState.setSearchParams({ view });
    },
    filters: myFilters,
    activeFilters,
    onFilterChange: handleFilterChange,
    onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
    customActions: <SomeIconButton />,
  }}
  data={{
    items: sortedItems,
    isLoading,
    isFetching,
    error: resolvedError,
  }}
  table={{
    columns: tableColumns,
    onEdit: (item) => router.push(`${item.id}/edit`),
    onDelete: handleDelete,
    getRowId: (item) => String(item.id),
    onRowClick: handleRowClick,
    activeRowId: null,
    stickyHeader: true,
  }}
  emptyState={{
    title: "No commitments",
    description: "Create your first commitment to get started.",
    filteredDescription: "No commitments match your current filters.",
    isFiltered: Boolean(tableState.debouncedSearch) || hasActiveFilters,
    action: <Button onClick={handleCreate}>Create Commitment</Button>,
  }}
  layout={{ fullBleedTable: true }}
/>
```

---

## TableColumn Definition

```ts
export type TableColumn<T> = {
  id: string;
  label: string;
  defaultVisible?: boolean;
  alwaysVisible?: boolean;
  render: (item: T) => ReactNode;
  csvValue?: (item: T) => string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number | null | undefined;
  width?: number;           // preferred pixel width
};
```

**Column config pattern** — separate columns config file is the standard:

```ts
// features/commitments/commitments-table-config.ts
export const commitmentColumns: ColumnConfig[] = [
  { id: "number", label: "#", alwaysVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "amount", label: "Amount", defaultVisible: true },
];

export const commitmentDefaultVisibleColumns = commitmentColumns
  .filter((c) => c.defaultVisible || c.alwaysVisible)
  .map((c) => c.id);

export function buildCommitmentTableColumns(projectId: string): TableColumn<CommitmentListItem>[] {
  return [
    { id: "number", label: "#", alwaysVisible: true, sortable: true,
      sortValue: (item) => item.number,
      render: (item) => <span>{item.number}</span> },
    // ...
  ];
}
```

---

## FilterConfig

```ts
export const commitmentFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",         // "select" | "multiSelect" | "dateRange" | "text" | "boolean" | "date" | "number"
    options: [
      { value: "draft", label: "Draft" },
      { value: "approved", label: "Approved" },
    ],
  },
  {
    id: "type",
    label: "Type",
    type: "select",
    options: [
      { value: "subcontract", label: "Subcontract" },
      { value: "purchase_order", label: "Purchase Order" },
    ],
  },
];
```

---

## Tabs Pattern

```ts
// NO counts in tab labels — never add count prop
const tabs = [
  {
    label: "All",
    href: `/${projectId}/commitments`,
    isActive: !activeFilters.type,
  },
  {
    label: "Subcontracts",
    href: `/${projectId}/commitments?type=subcontract`,
    isActive: activeFilters.type === "subcontract",
  },
  {
    label: "Recycle Bin",
    href: `/${projectId}/commitments/recycle-bin`,
  },
];
```

**`activeFilters` must be derived from `searchParams` via `useMemo`, NOT from `tableState.activeFilters`:**

```ts
const activeFilters = useMemo<Record<string, FilterValue>>(
  () => ({
    type: searchParams.get("type") || undefined,
    status: searchParams.get("status") || undefined,
  }),
  [searchParams],
);
```

---

## Delete Pattern

**Single delete** — provide `table.onDelete`. The component renders a built-in "⋯" menu with Delete and a confirmation dialog automatically. No separate AlertDialog state needed in the page.

```tsx
table={{ onDelete: (item) => deleteItem(item.id) }}
```

**Edit + Delete** — provide both. The built-in "⋯" menu shows Edit first, then a separator, then Delete.

```tsx
table={{
  onEdit: (item) => router.push(`${item.id}/edit`),
  onDelete: (item) => deleteItem(item.id),
}}
```

**Bulk delete** — automatic when `table.onDelete` is provided. Selecting rows and clicking the trash icon in the toolbar shows a "Delete N items?" confirmation dialog before deleting. No manual `toolbar.onBulkDelete` wiring needed.

**Custom bulk delete** — override with `toolbar.onBulkDelete` to handle confirmation yourself:
```tsx
toolbar={{ onBulkDelete: selectedIds.length > 0 ? () => setMyBulkDeleteOpen(true) : undefined }}
```

---

## File Organization

| File | Location |
|------|----------|
| Page component | `frontend/src/app/(main)/[projectId]/<tool>/page.tsx` |
| Table config | `frontend/src/features/<tool>/<tool>-table-config.ts` |
| Hook | `frontend/src/hooks/use-<tool>-query.ts` |
| API route | `frontend/src/app/api/projects/[projectId]/<tool>/route.ts` |
| Domain components | `frontend/src/components/domain/<tool>/` |

---

## MANDATORY RULES

### Header actions = ONLY the primary Create/Add button
```tsx
// CORRECT
actions: <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create</Button>

// WRONG — filters, export, column toggles do NOT belong here
actions: <><FilterButton /><ExportButton /><CreateButton /></>
```

Toolbar (`toolbar.customActions`) is where extra icon buttons go (e.g., ERP sync, refresh).

### NEVER use these deprecated patterns
- `DataTablePage` — legacy, replaced by `UnifiedTablePage`
- `ProjectToolPage` — deprecated wrapper
- `PageHeader` from `@/components/design-system` — use `header` prop of `UnifiedTablePage`
- Generic `[id]` route params — always use `[projectId]`, `[contractId]`, etc.

### Standard features are automatic — do NOT wire them manually unless you need URL-sync
Row selection, bulk delete (with confirmation), search, column visibility (persisted to localStorage), pagination (25/page), export (CSV from `csvValue` columns), and sorting are all ON by default. You only need to wire these manually when you want URL-sync via `useUnifiedTableState`.

### Edit and Delete via `table.onEdit` / `table.onDelete` — no `rowActions` boilerplate
Providing `table.onEdit` and/or `table.onDelete` auto-builds the "⋯" menu. Only use `table.rowActions` when you need custom menu items beyond Edit/Delete.

### Page is "use client"
All table pages are client components — they use hooks, router, and interactive state.

### Sorting is automatic — no `sorting` prop needed
Define `sortable: true` and `sortValue` on columns. The component handles sort state internally. Column headers are clickable, sort arrows appear, ascending/descending works out of the box.

```ts
{ id: "amount", label: "Amount", sortable: true, sortValue: (item) => item.amount, render: ... }
```

Pass the `sorting` prop only when you need sort state in the URL (via `useUnifiedTableState`).

### Pagination is automatic — no `pagination` prop needed
Defaults to 25 rows/page with client-side slicing. Pass `pagination` prop only when integrating server-side pagination or URL-synced page state.

---

## Quick Reference

| What | Value |
|------|-------|
| Barrel import | `@/components/tables/unified` |
| Main component | `UnifiedTablePage` |
| State hook | `useUnifiedTableState` |
| Column type | `TableColumn<T>` |
| Filter type | `FilterConfig` |
| Filter value type | `FilterValue` |
| Column config type | `ColumnConfig` |
| Good example | `frontend/src/app/(main)/[projectId]/commitments/page.tsx` |
| Table config example | `frontend/src/features/commitments/commitments-table-config.ts` |
