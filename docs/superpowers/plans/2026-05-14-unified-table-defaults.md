# UnifiedTablePage — All Features ON By Default

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every feature in `UnifiedTablePage` work out of the box with zero caller wiring — callers opt out, not in.

**Architecture:** All changes are confined to `unified-table-page.tsx`. Internal state is added for sort, pagination, and column visibility. Each fix is independent and can be committed separately. No new files needed.

**Tech Stack:** React 19, TypeScript, shadcn/ui AlertDialog

---

## Files Modified

| File | What changes |
|------|-------------|
| `frontend/src/components/tables/unified/unified-table-page.tsx` | All 7 fixes |
| `frontend/src/components/tables/unified/index.ts` | Re-export `SortDirection` if not already exported |
| `.claude/skills/alleato-table-page/index.md` | Update skill docs to reflect new defaults |

---

## Task 1: Make `toolbar.selectedCount` optional

**Problem:** Internal selection state was added, but `toolbar.selectedCount` is still a required prop callers must pass manually. When a caller uses internal selection, they can only pass `0`, breaking the bulk delete button tooltip.

**File:** `frontend/src/components/tables/unified/unified-table-page.tsx`

- [ ] **Step 1: Make `selectedCount` optional in the `toolbar` type**

Find this block in `UnifiedTablePageProps`:
```ts
toolbar: {
  totalItems: number;
  filteredItems: number;
  selectedCount: number;
```

Replace with:
```ts
toolbar: {
  totalItems: number;
  filteredItems: number;
  selectedCount?: number;
```

- [ ] **Step 2: Derive effective selected count from internal state**

Find this line (just before the `hasRowSelection` const):
```ts
const hasRowSelection = resolvedFeatures.enableRowSelection;
```

Add one line above it:
```ts
const effectiveSelectedCount = toolbar.selectedCount ?? selectedIds.length;
const hasRowSelection = resolvedFeatures.enableRowSelection;
```

- [ ] **Step 3: Pass derived count to the toolbar**

In `renderTableToolbar`, find:
```ts
selectedCount={toolbar.selectedCount}
```

Replace with:
```ts
selectedCount={effectiveSelectedCount}
```

- [ ] **Step 4: Build and verify no type errors**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "unified-table-page" | head -20
```

Expected: no errors for this file.

- [ ] **Step 5: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/tables/unified/unified-table-page.tsx && git commit -m "feat(table): make toolbar.selectedCount optional, derive from internal selection state"
```

---

## Task 2: Bulk delete confirmation dialog

**Problem:** The auto-built `effectiveBulkDelete` calls `table.onDelete(item)` immediately for each selected item — no confirmation dialog, and it can fire N simultaneous API calls with no user warning.

**File:** `frontend/src/components/tables/unified/unified-table-page.tsx`

- [ ] **Step 1: Add bulk delete dialog state**

Find the existing single-delete state:
```ts
// Built-in delete confirmation dialog state
const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
const [itemToDelete, setItemToDelete] = React.useState<T | null>(null);
```

Add directly below it:
```ts
// Built-in bulk delete confirmation dialog state (used by the auto-built effectiveBulkDelete)
const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
```

- [ ] **Step 2: Simplify `effectiveBulkDelete` — it now just opens the dialog**

Find the current `effectiveBulkDelete` useMemo:
```ts
// Auto-built bulk delete: uses table.onDelete for each selected item so
// callers don't need to wire toolbar.onBulkDelete separately.
const effectiveBulkDelete = React.useMemo(() => {
  if (toolbar.onBulkDelete) return toolbar.onBulkDelete;
  if (!table.onDelete) return undefined;
  return () => {
    const itemsById = new Map(data.items.map((item) => [table.getRowId(item), item]));
    selectedIds.forEach((id) => {
      const item = itemsById.get(id);
      if (item) table.onDelete!(item);
    });
    // Clear selection after bulk delete
    handleSelectAll(false);
  };
}, [toolbar.onBulkDelete, table, data.items, selectedIds, handleSelectAll]);
```

Replace with:
```ts
// Auto-built bulk delete: opens confirmation dialog, then deletes after confirm.
// Callers don't need to wire toolbar.onBulkDelete — providing table.onDelete is enough.
const effectiveBulkDelete = React.useMemo(() => {
  if (toolbar.onBulkDelete) return toolbar.onBulkDelete;
  if (!table.onDelete) return undefined;
  return () => setBulkDeleteDialogOpen(true);
}, [toolbar.onBulkDelete, table.onDelete]);

const handleBulkDeleteConfirm = React.useCallback(() => {
  if (!table.onDelete) return;
  const itemsById = new Map(data.items.map((item) => [table.getRowId(item), item]));
  selectedIds.forEach((id) => {
    const item = itemsById.get(id);
    if (item) table.onDelete!(item);
  });
  handleSelectAll(false);
  setBulkDeleteDialogOpen(false);
}, [data.items, selectedIds, table, handleSelectAll]);
```

- [ ] **Step 3: Add the bulk delete AlertDialog to the JSX**

Find the existing single-item delete dialog (near end of file):
```tsx
      {table.onDelete && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
```

Add a new dialog directly after the closing `)}` of that dialog:
```tsx
      {!toolbar.onBulkDelete && table.onDelete && (
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {selectedIds.length} {selectedIds.length === 1 ? "item" : "items"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedIds.length} selected{" "}
                {selectedIds.length === 1 ? "item" : "items"}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete {selectedIds.length} {selectedIds.length === 1 ? "item" : "items"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
```

- [ ] **Step 4: Verify no type errors**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "unified-table-page" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/tables/unified/unified-table-page.tsx && git commit -m "feat(table): bulk delete shows confirmation dialog before firing deletes"
```

---

## Task 3: Default CSV export when `onExport` not provided

**Problem:** `enableExport: true` by default but the toolbar only renders the export button when `toolbar.onExport` is provided. The feature flag is meaningless without the callback.

**File:** `frontend/src/components/tables/unified/unified-table-page.tsx`

- [ ] **Step 1: Add `effectiveOnExport` derived value**

Find the `toolbarColumns` useMemo (around line 430):
```ts
const toolbarColumns: ColumnConfig[] = React.useMemo(
```

Add a new `useMemo` directly below the `toolbarColumns` block (after its closing `)`):
```ts
// Auto-built CSV exporter: used when toolbar.onExport is not provided.
// Only exports columns that define csvValue — columns without it are silently skipped.
const effectiveOnExport = React.useMemo(() => {
  if (toolbar.onExport) return toolbar.onExport;
  if (!resolvedFeatures.enableExport) return undefined;
  const exportableCols = visibleColumns
    .map((id) => table.columns.find((c) => c.id === id))
    .filter((c): c is TableColumn<T> => Boolean(c?.csvValue));
  if (exportableCols.length === 0) return undefined;
  return () => {
    const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const headers = exportableCols.map((c) => escape(c.label)).join(",");
    const rows = rowOrderedItems.map((item) =>
      exportableCols.map((c) => escape(String(c.csvValue!(item) ?? ""))).join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${header.title.toLowerCase().replace(/\s+/g, "-")}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
}, [toolbar.onExport, resolvedFeatures.enableExport, visibleColumns, table.columns, rowOrderedItems, header.title]);
```

- [ ] **Step 2: Pass `effectiveOnExport` to the toolbar instead of `toolbar.onExport`**

In `renderTableToolbar`, find:
```ts
onExport={toolbar.onExport}
```

Replace with:
```ts
onExport={effectiveOnExport}
```

- [ ] **Step 3: Verify no type errors**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "unified-table-page" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/tables/unified/unified-table-page.tsx && git commit -m "feat(table): auto-build CSV export when toolbar.onExport not provided"
```

---

## Task 4: Add `table.onEdit` to default row actions menu

**Problem:** The default "⋯" menu (rendered when `table.onDelete` is provided but no `table.rowActions`) only has Delete. Every table should have Edit + Delete by default.

**File:** `frontend/src/components/tables/unified/unified-table-page.tsx`

- [ ] **Step 1: Add `onEdit` to the `table` prop interface**

Find in `UnifiedTablePageProps`:
```ts
table: {
  columns: TableColumn<T>[];
  defaultPinnedLeftColumns?: string[];
  defaultPinnedRightColumns?: string[];
  rowActions?: (item: T) => ReactNode;
  /** Called when user clicks Delete in the default row-actions menu. When provided without custom rowActions, renders a default "⋯" dropdown with Delete. */
  onDelete?: (item: T) => void;
```

Replace with:
```ts
table: {
  columns: TableColumn<T>[];
  defaultPinnedLeftColumns?: string[];
  defaultPinnedRightColumns?: string[];
  rowActions?: (item: T) => ReactNode;
  /** Called when user clicks Edit in the default row-actions menu. */
  onEdit?: (item: T) => void;
  /** Called when user clicks Delete in the default row-actions menu. When provided without custom rowActions, renders a default "⋯" dropdown with Edit + Delete. */
  onDelete?: (item: T) => void;
```

- [ ] **Step 2: Update `hasRowActions` to include `onEdit`**

Find:
```ts
const hasRowActions = resolvedFeatures.enableRowActions && Boolean(table.rowActions || table.onDelete);
```

Replace with:
```ts
const hasRowActions = resolvedFeatures.enableRowActions && Boolean(table.rowActions || table.onDelete || table.onEdit);
```

- [ ] **Step 3: Update the default row actions dropdown to include Edit**

Find the default row actions render block (inside the `{hasRowActions && (` TableCell):
```tsx
{table.rowActions ? table.rowActions(item) : table.onDelete ? (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        className="text-destructive"
        onClick={() => handleDeleteIntent(item)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
) : null}
```

Replace with:
```tsx
{table.rowActions ? table.rowActions(item) : (table.onDelete || table.onEdit) ? (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {table.onEdit && (
        <DropdownMenuItem onClick={() => table.onEdit!(item)}>
          Edit
        </DropdownMenuItem>
      )}
      {table.onEdit && table.onDelete && <DropdownMenuSeparator />}
      {table.onDelete && (
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => handleDeleteIntent(item)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
) : null}
```

- [ ] **Step 4: Verify no type errors**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "unified-table-page" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/tables/unified/unified-table-page.tsx && git commit -m "feat(table): add table.onEdit — default row actions menu now shows Edit + Delete"
```

---

## Task 5: Internal sort state (no `sorting` prop required)

**Problem:** Sorting is entirely opt-in — no feature flag, no internal state. If `sorting` is not passed, column headers don't sort even though columns define `sortValue` and `sortable`.

**File:** `frontend/src/components/tables/unified/unified-table-page.tsx`

- [ ] **Step 1: Add `enableSorting` to `UnifiedTableFeatures`**

Find:
```ts
export interface UnifiedTableFeatures {
  enableSearch?: boolean;
```

Add `enableSorting` as the first entry:
```ts
export interface UnifiedTableFeatures {
  enableSorting?: boolean;
  enableSearch?: boolean;
```

- [ ] **Step 2: Add `enableSorting` to `resolvedFeatures`**

Find:
```ts
const resolvedFeatures: Required<UnifiedTableFeatures> = {
  enableSearch: features?.enableSearch ?? true,
```

Add as the first entry:
```ts
const resolvedFeatures: Required<UnifiedTableFeatures> = {
  enableSorting: features?.enableSorting ?? true,
  enableSearch: features?.enableSearch ?? true,
```

- [ ] **Step 3: Add internal sort state**

Find the internal selection state block:
```ts
// Internal selection state — used when the parent does not supply a selection prop
const [internalSelectedIds, setInternalSelectedIds] = React.useState<string[]>([]);
```

Add internal sort state directly above it:
```ts
// Internal sort state — used when the parent does not supply a sorting prop
const [internalSortBy, setInternalSortBy] = React.useState<string | null>(null);
const [internalSortDirection, setInternalSortDirection] = React.useState<SortDirection>("asc");
```

- [ ] **Step 4: Derive effective sorting from internal or external state**

Find this line (just below the `handleSelectRow` block):
```ts
const hasRowSelection = resolvedFeatures.enableRowSelection;
```

Add the effective sorting derivation directly above it:
```ts
const effectiveSorting = React.useMemo(() => {
  if (sorting) return sorting;
  if (!resolvedFeatures.enableSorting) return undefined;
  return {
    sortBy: internalSortBy,
    sortDirection: internalSortDirection,
    onSortChange: (col: string, dir: SortDirection) => {
      setInternalSortBy(col);
      setInternalSortDirection(dir);
    },
  };
}, [sorting, resolvedFeatures.enableSorting, internalSortBy, internalSortDirection]);
```

- [ ] **Step 5: Replace all direct `sorting` references with `effectiveSorting`**

Do a targeted search-and-replace within `unified-table-page.tsx`. The occurrences of `sorting` that need to change are:

**In `sortedItems` useMemo** — find:
```ts
  if (!sorting?.sortBy) return data.items;
  const column = table.columns.find((col) => col.id === sorting.sortBy);
```
Replace with:
```ts
  if (!effectiveSorting?.sortBy) return data.items;
  const column = table.columns.find((col) => col.id === effectiveSorting.sortBy);
```
And find:
```ts
      if (valueA == null) return sorting.sortDirection === "asc" ? -1 : 1;
      if (valueB == null) return sorting.sortDirection === "asc" ? 1 : -1;
      ...
      return sorting.sortDirection === "asc" ? comparison : -comparison;
```
Replace each `sorting.sortDirection` with `effectiveSorting!.sortDirection`.

**In `rowOrderedItems` and `rowOrderIds` effects** — find:
```ts
  const isManualRowOrderEnabled = resolvedFeatures.enableRowReorder && !sorting?.sortBy;
```
Replace with:
```ts
  const isManualRowOrderEnabled = resolvedFeatures.enableRowReorder && !effectiveSorting?.sortBy;
```
And the two subsequent `sorting?.sortBy` checks in that block.

**In the row drag props** — find:
```ts
    draggable={
      resolvedFeatures.enableRowReorder &&
      !sorting?.sortBy &&
```
Replace with:
```ts
    draggable={
      resolvedFeatures.enableRowReorder &&
      !effectiveSorting?.sortBy &&
```

**In the `onDragOver` and `onDrop` of rows** — same pattern, replace `sorting?.sortBy` with `effectiveSorting?.sortBy`.

**In `handleSortClick`** — find:
```ts
  const handleSortClick = (columnId: string) => {
    if (!sorting) return;
    const nextDirection =
      sorting.sortBy === columnId && sorting.sortDirection === "asc" ? "desc" : "asc";
    sorting.onSortChange(columnId, nextDirection);
  };
```
Replace with:
```ts
  const handleSortClick = (columnId: string) => {
    if (!effectiveSorting) return;
    const nextDirection =
      effectiveSorting.sortBy === columnId && effectiveSorting.sortDirection === "asc" ? "desc" : "asc";
    effectiveSorting.onSortChange(columnId, nextDirection);
  };
```

**In `renderSortIcon`** — find:
```ts
    if (!sorting || sorting.sortBy !== columnId) {
    ...
    return sorting.sortDirection === "asc" ? (
```
Replace with:
```ts
    if (!effectiveSorting || effectiveSorting.sortBy !== columnId) {
    ...
    return effectiveSorting.sortDirection === "asc" ? (
```

**In the column header `aria-sort`** — find:
```ts
            aria-sort={
              isSortable
                ? sorting?.sortBy === column.id
                  ? sorting.sortDirection === "asc"
```
Replace with:
```ts
            aria-sort={
              isSortable
                ? effectiveSorting?.sortBy === column.id
                  ? effectiveSorting.sortDirection === "asc"
```

**In `renderTableToolbar` / `TableToolbar` call** — find:
```ts
      sortBy={sorting?.sortBy}
      sortDirection={sorting?.sortDirection}
      onSortChange={sorting?.onSortChange}
```
Replace with:
```ts
      sortBy={effectiveSorting?.sortBy}
      sortDirection={effectiveSorting?.sortDirection}
      onSortChange={effectiveSorting?.onSortChange}
```

**In the sort dropdown inside column header dropdown menus** — find both:
```ts
                                      sorting?.onSortChange(column.id, "asc");
                                      sorting?.onSortChange(column.id, "desc");
```
Replace with:
```ts
                                      effectiveSorting?.onSortChange(column.id, "asc");
                                      effectiveSorting?.onSortChange(column.id, "desc");
```

**In `isSortable`** — find:
```ts
                      const isSortable = column.sortable !== false && Boolean(sorting);
```
Replace with:
```ts
                      const isSortable = column.sortable !== false && Boolean(effectiveSorting);
```

- [ ] **Step 6: Verify no type errors**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "unified-table-page" | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/tables/unified/unified-table-page.tsx && git commit -m "feat(table): internal sort state — sorting works without passing the sorting prop"
```

---

## Task 6: Internal pagination state (no `pagination` prop required)

**Problem:** Pagination is entirely opt-in — no feature flag, no internal state. Tables without `pagination` render all rows in one shot.

**File:** `frontend/src/components/tables/unified/unified-table-page.tsx`

- [ ] **Step 1: Add `enablePagination` to `UnifiedTableFeatures`**

Find:
```ts
export interface UnifiedTableFeatures {
  enableSorting?: boolean;
  enableSearch?: boolean;
```

Add:
```ts
export interface UnifiedTableFeatures {
  enableSorting?: boolean;
  enablePagination?: boolean;
  enableSearch?: boolean;
```

- [ ] **Step 2: Add `enablePagination` to `resolvedFeatures`**

Find:
```ts
const resolvedFeatures: Required<UnifiedTableFeatures> = {
  enableSorting: features?.enableSorting ?? true,
  enableSearch: features?.enableSearch ?? true,
```

Add:
```ts
const resolvedFeatures: Required<UnifiedTableFeatures> = {
  enableSorting: features?.enableSorting ?? true,
  enablePagination: features?.enablePagination ?? true,
  enableSearch: features?.enableSearch ?? true,
```

- [ ] **Step 3: Add internal pagination state**

Find the internal sort state added in Task 5:
```ts
// Internal sort state — used when the parent does not supply a sorting prop
const [internalSortBy, setInternalSortBy] = React.useState<string | null>(null);
const [internalSortDirection, setInternalSortDirection] = React.useState<SortDirection>("asc");
```

Add internal pagination state directly below:
```ts
// Internal pagination state — used when the parent does not supply a pagination prop
const [internalPage, setInternalPage] = React.useState(1);
const [internalPerPage, setInternalPerPage] = React.useState(25);
```

- [ ] **Step 4: Replace `paginatedItems` to use effective pagination**

Find the `paginatedItems` useMemo:
```ts
  const paginatedItems = React.useMemo(() => {
    if (!pagination?.clientSide) return rowOrderedItems;
    const start = (pagination.page - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return rowOrderedItems.slice(start, end);
  }, [pagination?.clientSide, pagination?.page, pagination?.perPage, rowOrderedItems]);
```

Replace with:
```ts
  // Determine whether to slice client-side:
  // - Caller passes pagination with clientSide: true → slice using their page/perPage
  // - No pagination prop + enablePagination: true → slice using internal page/perPage
  const shouldClientPaginate = pagination?.clientSide || (!pagination && resolvedFeatures.enablePagination);
  const activePage = pagination?.page ?? internalPage;
  const activePerPage = pagination?.perPage ?? internalPerPage;

  const paginatedItems = React.useMemo(() => {
    if (!shouldClientPaginate) return rowOrderedItems;
    const start = (activePage - 1) * activePerPage;
    return rowOrderedItems.slice(start, start + activePerPage);
  }, [shouldClientPaginate, activePage, activePerPage, rowOrderedItems]);
```

- [ ] **Step 5: Replace the pagination render block**

Find the pagination render:
```tsx
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-4 items-center justify-between pt-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(pagination.perPage)} onValueChange={pagination.onPerPageChange}>
              <SelectTrigger variant="inline" size="sm" className="h-8 w-16 px-1">
                <SelectValue placeholder={String(pagination.perPage)} />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 150].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SimplePagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
```

Replace with:
```tsx
      {(() => {
        const paginProps = pagination ?? (resolvedFeatures.enablePagination ? {
          page: internalPage,
          totalPages: Math.max(1, Math.ceil(rowOrderedItems.length / internalPerPage)),
          perPage: internalPerPage,
          onPageChange: setInternalPage,
          onPerPageChange: (val: string) => {
            setInternalPerPage(Number(val));
            setInternalPage(1);
          },
        } : null);
        if (!paginProps || paginProps.totalPages <= 1) return null;
        return (
          <div className="flex flex-col gap-4 items-center justify-between pt-6 md:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <Select value={String(paginProps.perPage)} onValueChange={paginProps.onPerPageChange}>
                <SelectTrigger variant="inline" size="sm" className="h-8 w-16 px-1">
                  <SelectValue placeholder={String(paginProps.perPage)} />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100, 150].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SimplePagination
              currentPage={paginProps.page}
              totalPages={paginProps.totalPages}
              onPageChange={paginProps.onPageChange}
            />
          </div>
        );
      })()}
```

- [ ] **Step 6: Verify no type errors**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "unified-table-page" | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/tables/unified/unified-table-page.tsx && git commit -m "feat(table): internal pagination — 25 rows/page by default with no pagination prop needed"
```

---

## Task 7: Column visibility auto-persists to localStorage

**Problem:** When `toolbar.onColumnVisibilityChange` is not provided, column show/hide is silently dropped (no-op). Changes appear to work (UI updates) but reset on next render.

**File:** `frontend/src/components/tables/unified/unified-table-page.tsx`

- [ ] **Step 1: Add internal column visibility state**

Find the line where `rawVisibleColumns` is derived:
```ts
  // Always include alwaysVisible columns even if stale localStorage omits them
  const rawVisibleColumns = toolbar.visibleColumns ?? toolbarColumns.map((column) => column.id);
```

Add internal state and a stable storage key directly above this block:
```ts
  // Internal column visibility — persisted to localStorage when the caller
  // does not supply toolbar.visibleColumns / toolbar.onColumnVisibilityChange.
  const colStorageKey = `alleato:cols:${header.title}`;
  const [internalVisibleColumns, setInternalVisibleColumns] = React.useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(colStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as unknown;
          if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
        }
      } catch { /* ignore */ }
    }
    // Default: columns marked defaultVisible or alwaysVisible
    const baseCols = (toolbar.columns ?? table.columns) as Array<{ id: string; defaultVisible?: boolean; alwaysVisible?: boolean }>;
    return baseCols.filter((c) => c.defaultVisible !== false || c.alwaysVisible).map((c) => c.id);
  });
```

- [ ] **Step 2: Wire `rawVisibleColumns` to use internal state as fallback**

Change:
```ts
  const rawVisibleColumns = toolbar.visibleColumns ?? toolbarColumns.map((column) => column.id);
```

To:
```ts
  const rawVisibleColumns = toolbar.visibleColumns ?? internalVisibleColumns;
```

- [ ] **Step 3: Replace the `handleColumnVisibilityChange` no-op with localStorage persistence**

Find:
```ts
  const handleColumnVisibilityChange =
    toolbar.onColumnVisibilityChange ??
    (() => {
      // no-op by default so pages without column picker don't need wiring
    });
```

Replace with:
```ts
  const handleColumnVisibilityChange = React.useCallback(
    (columns: string[]) => {
      if (toolbar.onColumnVisibilityChange) {
        toolbar.onColumnVisibilityChange(columns);
      } else {
        setInternalVisibleColumns(columns);
        try {
          localStorage.setItem(colStorageKey, JSON.stringify(columns));
        } catch { /* ignore */ }
      }
    },
    [toolbar.onColumnVisibilityChange, colStorageKey],
  );
```

- [ ] **Step 4: Verify no type errors**

```bash
cd /Users/meganharrison/Documents/alleato-pm/frontend && npx tsc --noEmit --project tsconfig.json 2>&1 | grep "unified-table-page" | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add frontend/src/components/tables/unified/unified-table-page.tsx && git commit -m "feat(table): column visibility persists to localStorage when not externally managed"
```

---

## Task 8: Full quality gate

- [ ] **Step 1: Run the full quality check via sub-agent**

Delegate to a background sub-agent:
```
Run `cd /Users/meganharrison/Documents/alleato-pm/frontend && npm run quality` and report: pass/fail, any error lines, which files.
```

Expected: pass. Fix any failures before proceeding.

- [ ] **Step 2: Update the `alleato-table-page` skill to reflect new defaults**

File: `/Users/meganharrison/Documents/alleato-pm/.claude/skills/alleato-table-page/index.md`

In the "ALWAYS include all standard features" section, update the rule to say:

```markdown
### Standard features are ON by default — opt out with `features={{ ... }}`

Every feature is enabled automatically. You do not need to wire:
- `toolbar.selectedCount` — derived from internal selection state
- `toolbar.onBulkDelete` — auto-built from `table.onDelete`
- `toolbar.onExport` — auto-built CSV from columns with `csvValue`
- `sorting` prop — internal sort state, works if columns define `sortable`/`sortValue`
- `pagination` prop — defaults to 25 rows/page client-side
- `toolbar.onColumnVisibilityChange` — auto-persists to localStorage

To disable a feature:
```tsx
features={{ enablePagination: false, enableSorting: false }}
```

Minimum viable table page now only requires: `header`, `toolbar` (search/view state), `data`, `table.columns`, `table.getRowId`, `emptyState`.
```

- [ ] **Step 3: Final commit with skill update**

```bash
cd /Users/meganharrison/Documents/alleato-pm && git add .claude/skills/alleato-table-page/ && git commit -m "docs(table): update alleato-table-page skill — all features now default ON"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `toolbar.selectedCount` optional → Task 1
- [x] Bulk delete confirmation dialog → Task 2
- [x] Default CSV export → Task 3
- [x] `table.onEdit` in default row actions → Task 4
- [x] Internal sort state → Task 5
- [x] Internal pagination state → Task 6
- [x] Column visibility localStorage → Task 7

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `effectiveSorting` is `typeof sorting` (same shape) — all field accesses match
- `SortDirection` is used consistently across Tasks 5 and where `sorting.sortDirection` was accessed
- `paginProps` in Task 6 has `page`, `totalPages`, `perPage`, `onPageChange`, `onPerPageChange` — same shape as `pagination` prop
- `internalVisibleColumns` is `string[]` — same type as `toolbar.visibleColumns`

**Dependency order:** Tasks 1→2→3→4→5→6→7 are all independent (each targets a different piece of state/behavior). They can be done in any order. Task 8 must be last.
