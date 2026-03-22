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

## UnifiedTablePage Props Structure

```tsx
<UnifiedTablePage
  header={{
    title: "Commitments",
    description: "Manage purchase orders and subcontracts",
    actions: <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create</Button>,
    //        ^^^ ONLY the primary Create/Add button. Nothing else.
  }}
  tabs={tabs}           // optional — TabItem[]
  toolbar={{
    totalItems,
    filteredItems: totalItems,
    selectedCount: tableState.selectedIds.length,
    searchValue: tableState.searchInput,
    onSearchChange: tableState.setSearchInput,
    searchPlaceholder: "Search commitments...",
    currentView: tableState.currentView,
    onViewChange: (view) => {
      tableState.setCurrentView(view);
      tableState.setSearchParams({ view });
    },
    filters: myFilters,            // FilterConfig[] — defines filter UI
    activeFilters,
    onFilterChange: handleFilterChange,
    onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
    columns: myColumnConfig,       // ColumnConfig[] — for column visibility toggle
    visibleColumns: tableState.visibleColumns,
    onColumnVisibilityChange: tableState.setVisibleColumns,
    onBulkDelete: tableState.selectedIds.length > 0
      ? () => setBulkDeleteDialogOpen(true)
      : undefined,
    customActions: <SomeIconButton />,  // extra icon buttons in toolbar icon row
  }}
  data={{
    items: sortedItems,
    isLoading,
    isFetching,
    error: resolvedError,
  }}
  table={{
    columns: tableColumns,          // TableColumn<T>[]
    onDelete: handleDeleteIntent,   // triggers default "⋯" dropdown with Delete
    getRowId: (item) => item.id,
    onRowClick: handleRowClick,
    activeRowId: null,
    stickyHeader: true,
  }}
  sorting={{
    sortBy: tableState.sortBy,
    sortDirection: tableState.sortDirection,
    onSortChange: (col, dir) => tableState.setSortBy(col),
  }}
  selection={{
    selectedIds: tableState.selectedIds,
    onSelectAll: handleSelectAll,
    onSelectRow: handleSelectRow,
  }}
  emptyState={{
    title: "No commitments",
    description: "Create your first commitment to get started.",
    filteredDescription: "No commitments match your current filters.",
    isFiltered: Boolean(tableState.debouncedSearch) || hasActiveFilters,
    action: <Button onClick={handleCreate}>Create Commitment</Button>,
  }}
  pagination={{
    page: tableState.page,
    totalPages,
    perPage: tableState.perPage,
    onPageChange: tableState.setPage,
    onPerPageChange: (val) => tableState.setPerPage(Number(val)),
  }}
  layout={{
    fullBleedTable: false,
  }}
  features={{
    enableSearch: true,
    enableFilters: true,
    enableColumnToggle: true,
    enableExport: true,
    enableBulkDelete: true,
    enableRowSelection: true,
    enableRowActions: true,
  }}
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
const tabs = [
  {
    label: "All",
    href: `/${projectId}/commitments`,
    count: totalItems,
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

---

## Delete Pattern

**Single delete** — use `table.onDelete` (renders default "⋯" menu):
```tsx
table={{ onDelete: handleDeleteIntent }}
```
Pair with `AlertDialog` state + the delete mutation hook.

**Bulk delete** — use `toolbar.onBulkDelete` + `AlertDialog`:
```tsx
toolbar={{ onBulkDelete: selectedIds.length > 0 ? () => setBulkDeleteDialogOpen(true) : undefined }}
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

### ALWAYS include all standard features
Every table page must have: row selection, row actions (edit + delete), bulk delete, search, filters, column visibility, pagination, export, empty state. No exceptions.

### Page is "use client"
All table pages are client components — they use hooks, router, and interactive state.

### Sort client-side when server pagination isn't used
```ts
const sortedItems = React.useMemo(() => {
  if (!tableState.sortBy) return items;
  const col = tableColumns.find((c) => c.id === tableState.sortBy);
  if (!col?.sortValue) return items;
  return [...items].sort((a, b) => {
    const va = col.sortValue!(a);
    const vb = col.sortValue!(b);
    if (va == null) return tableState.sortDirection === "asc" ? -1 : 1;
    if (vb == null) return tableState.sortDirection === "asc" ? 1 : -1;
    if (typeof va === "number" && typeof vb === "number")
      return tableState.sortDirection === "asc" ? va - vb : vb - va;
    return tableState.sortDirection === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });
}, [items, tableColumns, tableState.sortBy, tableState.sortDirection]);
```

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
