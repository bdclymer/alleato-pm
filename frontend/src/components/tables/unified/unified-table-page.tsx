"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SimplePagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableToolbar, type ColumnConfig, type FilterConfig, type ViewMode } from "./table-toolbar";
import { ChevronDown, ChevronUp, GripVertical, Pin, PinOff } from "lucide-react";

interface TabItem {
  label: string;
  href: string;
  count?: number;
  isActive?: boolean;
  testId?: string;
  countTestId?: string;
}

export interface TableColumn<T> extends ColumnConfig {
  render: (item: T) => ReactNode;
  csvValue?: (item: T) => string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number | null | undefined;
  editable?: boolean;
  editValue?: (item: T) => string;
  onEdit?: (item: T, value: string) => void | Promise<void>;
}

export type SortDirection = "asc" | "desc";

export interface UnifiedTableFeatures {
  enableSearch?: boolean;
  enableViews?: boolean;
  enableFilters?: boolean;
  enableColumnToggle?: boolean;
  enableExport?: boolean;
  enableBulkDelete?: boolean;
  enableRowSelection?: boolean;
  enableRowActions?: boolean;
  enableColumnReorder?: boolean;
  enableRowReorder?: boolean;
  enableColumnPinning?: boolean;
  enableVirtualization?: boolean;
  enableInlineEditing?: boolean;
}

export interface UnifiedTablePageProps<T> {
  header: {
    title: string;
    description?: string;
    actions?: ReactNode;
  };
  tabs?: TabItem[];
  toolbar: {
    totalItems: number;
    filteredItems: number;
    selectedCount: number;
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
    enabledViews?: ViewMode[];
    filters?: FilterConfig[];
    activeFilters?: Record<string, string | number | boolean | string[] | null | undefined>;
    onFilterChange?: (filters: Record<string, string | number | boolean | string[] | null | undefined>) => void;
    onClearFilters?: () => void;
    columns?: ColumnConfig[];
    visibleColumns?: string[];
    onColumnVisibilityChange?: (columns: string[]) => void;
    onExport?: () => void;
    onBulkDelete?: () => void;
    mobilePanelActions?: ReactNode;
  };
  data: {
    items: T[];
    isLoading: boolean;
    isFetching?: boolean;
    error?: Error | null;
  };
  table: {
    columns: TableColumn<T>[];
    rowActions?: (item: T) => ReactNode;
    getRowId: (item: T) => string;
    onRowClick?: (item: T) => void;
    activeRowId?: string | null;
    onTableKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>, visibleItems: T[]) => void;
    stickyHeader?: boolean;
    onRowOrderChange?: (orderedRowIds: string[]) => void;
  };
  sorting?: {
    sortBy: string | null;
    sortDirection: SortDirection;
    onSortChange: (sortBy: string, direction: SortDirection) => void;
  };
  selection?: {
    selectedIds: string[];
    onSelectAll: (checked: boolean) => void;
    onSelectRow: (id: string, checked: boolean) => void;
  };
  views?: {
    card?: (item: T) => ReactElement;
    list?: (item: T) => ReactElement;
  };
  emptyState: {
    title: string;
    description: string;
    filteredDescription: string;
    isFiltered: boolean;
    action?: ReactNode;
  };
  pagination?: {
    page: number;
    totalPages: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: string) => void;
    clientSide?: boolean;
  };
  footerTotals?: {
    /** Label shown in the first visible column (default: "Totals") */
    label?: string;
    /** Map of column ID → rendered value for the footer row */
    values: Record<string, ReactNode>;
  };
  topContent?: ReactNode;
  sidePanel?: {
    content: ReactNode;
    widthClassName?: string;
  };
  features?: UnifiedTableFeatures;
}

export function UnifiedTablePage<T>({
  header,
  tabs,
  toolbar,
  data,
  table,
  sorting,
  selection,
  views,
  emptyState,
  pagination,
  footerTotals,
  topContent,
  sidePanel,
  features,
}: UnifiedTablePageProps<T>): ReactElement {
  const resolvedFeatures: Required<UnifiedTableFeatures> = {
    enableSearch: features?.enableSearch ?? true,
    enableViews: features?.enableViews ?? true,
    enableFilters: features?.enableFilters ?? true,
    enableColumnToggle: features?.enableColumnToggle ?? true,
    enableExport: features?.enableExport ?? true,
    enableBulkDelete: features?.enableBulkDelete ?? true,
    enableRowSelection: features?.enableRowSelection ?? true,
    enableRowActions: features?.enableRowActions ?? true,
    enableColumnReorder: features?.enableColumnReorder ?? true,
    enableRowReorder: features?.enableRowReorder ?? true,
    enableColumnPinning: features?.enableColumnPinning ?? true,
    enableVirtualization: features?.enableVirtualization ?? false,
    enableInlineEditing: features?.enableInlineEditing ?? false,
  };
  const selectedIds = selection?.selectedIds ?? [];
  const hasSelectionApi = Boolean(selection);
  const handleSelectAll = selection?.onSelectAll ?? (() => undefined);
  const handleSelectRow = selection?.onSelectRow ?? (() => undefined);
  const hasRowSelection = resolvedFeatures.enableRowSelection && hasSelectionApi;
  const hasRowActions = resolvedFeatures.enableRowActions && Boolean(table.rowActions);

  const canRenderCardView =
    resolvedFeatures.enableViews && toolbar.currentView === "card" && Boolean(views?.card);
  const canRenderListView =
    resolvedFeatures.enableViews && toolbar.currentView === "list" && Boolean(views?.list);
  const shouldRenderTableView =
    toolbar.currentView === "table" || (!canRenderCardView && !canRenderListView);
  const toolbarColumns: ColumnConfig[] = React.useMemo(
    () =>
      toolbar.columns ??
      table.columns.map((column) => ({
        id: column.id,
        label: column.label,
        defaultVisible: column.defaultVisible,
        alwaysVisible: column.alwaysVisible,
      })),
    [table.columns, toolbar.columns],
  );
  const visibleColumns = toolbar.visibleColumns ?? toolbarColumns.map((column) => column.id);
  const activeFilters = toolbar.activeFilters ?? {};
  const handleFilterChange =
    toolbar.onFilterChange ??
    (() => {
      // no-op by default so pages without filters don't need wiring
    });
  const handleClearFilters =
    toolbar.onClearFilters ??
    (() => {
      // no-op by default so pages without filters don't need wiring
    });
  const handleColumnVisibilityChange =
    toolbar.onColumnVisibilityChange ??
    (() => {
      // no-op by default so pages without column picker don't need wiring
    });
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>(visibleColumns);
  const [columnPinning, setColumnPinning] = React.useState<{ left: string[]; right: string[] }>({
    left: [],
    right: [],
  });
  const [draggedColumnId, setDraggedColumnId] = React.useState<string | null>(null);
  const [rowOrderIds, setRowOrderIds] = React.useState<string[]>([]);
  const [draggedRowId, setDraggedRowId] = React.useState<string | null>(null);
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; columnId: string } | null>(null);
  const [editingValue, setEditingValue] = React.useState("");
  const [inlineEdits, setInlineEdits] = React.useState<Record<string, string>>({});
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const resizeStateRef = React.useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [isResizingColumn, setIsResizingColumn] = React.useState(false);
  const hasUserManagedColumnOrderRef = React.useRef(false);

  const sortedItems = React.useMemo(() => {
    if (!sorting?.sortBy) return data.items;
    const column = table.columns.find((col) => col.id === sorting.sortBy);
    const getSortValue = column?.sortValue;
    if (!getSortValue) return data.items;

    const sorted = [...data.items].sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return sorting.sortDirection === "asc" ? -1 : 1;
      if (valueB == null) return sorting.sortDirection === "asc" ? 1 : -1;

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sorting.sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      const comparison = String(valueA).localeCompare(String(valueB));
      return sorting.sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data.items, sorting?.sortBy, sorting?.sortDirection, table.columns]);

  React.useEffect(() => {
    if (!hasUserManagedColumnOrderRef.current) {
      setColumnOrder(visibleColumns);
      return;
    }

    setColumnOrder((prev) => {
      const nextVisible = new Set(visibleColumns);
      const preserved = prev.filter((id) => nextVisible.has(id));
      const additions = visibleColumns.filter((id) => !preserved.includes(id));
      return [...preserved, ...additions];
    });
  }, [visibleColumns]);

  const rowOrderedItems = React.useMemo(() => {
    const isManualRowOrderEnabled = resolvedFeatures.enableRowReorder && !sorting?.sortBy;
    if (!isManualRowOrderEnabled) return sortedItems;
    if (rowOrderIds.length === 0) return sortedItems;

    const byId = new Map(sortedItems.map((item) => [table.getRowId(item), item]));
    const ordered = rowOrderIds.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
    const orderedIds = new Set(ordered.map((item) => table.getRowId(item)));
    const remaining = sortedItems.filter((item) => !orderedIds.has(table.getRowId(item)));
    return [...ordered, ...remaining];
  }, [resolvedFeatures.enableRowReorder, rowOrderIds, sortedItems, sorting?.sortBy, table]);

  React.useEffect(() => {
    if (!resolvedFeatures.enableRowReorder || sorting?.sortBy) {
      setRowOrderIds([]);
      return;
    }

    const nextIds = rowOrderedItems.map((item) => table.getRowId(item));
    setRowOrderIds((prev) => {
      if (prev.length === 0) return nextIds;
      const seen = new Set(nextIds);
      const preserved = prev.filter((id) => seen.has(id));
      const additions = nextIds.filter((id) => !preserved.includes(id));
      return [...preserved, ...additions];
    });
  }, [resolvedFeatures.enableRowReorder, rowOrderedItems, sorting?.sortBy, table]);

  const paginatedItems = React.useMemo(() => {
    if (!pagination?.clientSide) return rowOrderedItems;
    const start = (pagination.page - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return rowOrderedItems.slice(start, end);
  }, [pagination?.clientSide, pagination?.page, pagination?.perPage, rowOrderedItems]);

  const allSelected =
    rowOrderedItems.length > 0 &&
    rowOrderedItems.every((item) => selectedIds.includes(table.getRowId(item)));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const showEmptyState = !data.isLoading && !data.error && rowOrderedItems.length === 0;
  const showTable = !data.isLoading && !data.error && rowOrderedItems.length > 0;

  const handleSortClick = (columnId: string) => {
    if (!sorting) return;
    const nextDirection =
      sorting.sortBy === columnId && sorting.sortDirection === "asc" ? "desc" : "asc";
    sorting.onSortChange(columnId, nextDirection);
  };

  const renderSortIcon = (columnId: string) => {
    if (!sorting || sorting.sortBy !== columnId) {
      return <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground/0 group-hover/th:text-muted-foreground transition-colors" />;
    }

    return sorting.sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  const hideColumn = React.useCallback(
    (columnId: string) => {
      if (visibleColumns.length <= 1) return;
      handleColumnVisibilityChange(visibleColumns.filter((existingId) => existingId !== columnId));
    },
    [handleColumnVisibilityChange, visibleColumns],
  );

  const orderedVisibleColumns = React.useMemo(() => {
    const visibleSet = new Set(visibleColumns);
    const fromOrder = columnOrder.filter((id) => visibleSet.has(id));
    const missing = visibleColumns.filter((id) => !fromOrder.includes(id));
    const merged = [...fromOrder, ...missing];
    const leftPinned = columnPinning.left.filter((id) => merged.includes(id));
    const rightPinned = columnPinning.right.filter((id) => merged.includes(id));
    const unpinned = merged.filter((id) => !leftPinned.includes(id) && !rightPinned.includes(id));
    return [...leftPinned, ...unpinned, ...rightPinned]
      .map((id) => table.columns.find((column) => column.id === id))
      .filter((column): column is TableColumn<T> => Boolean(column));
  }, [columnOrder, columnPinning.left, columnPinning.right, table.columns, visibleColumns]);

  const leftPinnedOffsets = React.useMemo(() => {
    let offset = hasRowSelection ? 40 : 0;
    const result: Record<string, number> = {};
    for (const column of orderedVisibleColumns) {
      if (!columnPinning.left.includes(column.id)) continue;
      result[column.id] = offset;
      offset += columnWidths[column.id] ?? 180;
    }
    return result;
  }, [columnPinning.left, columnWidths, hasRowSelection, orderedVisibleColumns]);

  const rightPinnedOffsets = React.useMemo(() => {
    let offset = hasRowActions ? 50 : 0;
    const result: Record<string, number> = {};
    for (let index = orderedVisibleColumns.length - 1; index >= 0; index -= 1) {
      const column = orderedVisibleColumns[index];
      if (!columnPinning.right.includes(column.id)) continue;
      result[column.id] = offset;
      offset += columnWidths[column.id] ?? 180;
    }
    return result;
  }, [columnPinning.right, columnWidths, hasRowActions, orderedVisibleColumns]);

  const pinColumn = React.useCallback((columnId: string) => {
    setColumnPinning((prev) => {
      if (prev.left.includes(columnId)) {
        return {
          left: prev.left.filter((id) => id !== columnId),
          right: prev.right.filter((id) => id !== columnId),
        };
      }
      return {
        left: [...prev.left.filter((id) => id !== columnId), columnId],
        right: prev.right.filter((id) => id !== columnId),
      };
    });
  }, []);

  const handleColumnDrop = React.useCallback(
    (targetColumnId: string) => {
      if (!draggedColumnId || draggedColumnId === targetColumnId) return;
      const currentOrder = orderedVisibleColumns.map((column) => column.id);
      const oldIndex = currentOrder.indexOf(draggedColumnId);
      const newIndex = currentOrder.indexOf(targetColumnId);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = [...currentOrder];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      hasUserManagedColumnOrderRef.current = true;
      setColumnOrder(reordered);
      handleColumnVisibilityChange(reordered);
    },
    [draggedColumnId, handleColumnVisibilityChange, orderedVisibleColumns],
  );

  const handleRowDrop = React.useCallback(
    (targetRowId: string) => {
      if (!draggedRowId || draggedRowId === targetRowId) return;
      const currentOrder = rowOrderedItems.map((item) => table.getRowId(item));
      const oldIndex = currentOrder.indexOf(draggedRowId);
      const newIndex = currentOrder.indexOf(targetRowId);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = [...currentOrder];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      setRowOrderIds(reordered);
      table.onRowOrderChange?.(reordered);
    },
    [draggedRowId, rowOrderedItems, table],
  );

  const getPinnedStyle = React.useCallback(
    (columnId: string): React.CSSProperties | undefined => {
      if (!resolvedFeatures.enableColumnPinning) return undefined;
      if (columnPinning.left.includes(columnId)) {
        return {
          position: "sticky",
          left: leftPinnedOffsets[columnId] ?? 0,
          zIndex: 2,
          background: "hsl(var(--background))",
        };
      }
      if (columnPinning.right.includes(columnId)) {
        return {
          position: "sticky",
          right: rightPinnedOffsets[columnId] ?? 0,
          zIndex: 2,
          background: "hsl(var(--background))",
        };
      }
      return undefined;
    },
    [
      columnPinning.left,
      columnPinning.right,
      leftPinnedOffsets,
      resolvedFeatures.enableColumnPinning,
      rightPinnedOffsets,
    ],
  );

  const commitInlineEdit = React.useCallback(
    async (item: T, column: TableColumn<T>, rowId: string, value: string) => {
      const cellKey = `${rowId}::${column.id}`;
      setInlineEdits((prev) => ({ ...prev, [cellKey]: value }));
      if (column.onEdit) {
        await column.onEdit(item, value);
      }
      setEditingCell(null);
      setEditingValue("");
    },
    [],
  );

  const rowVirtualizer = useVirtualizer({
    count: paginatedItems.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 52,
    overscan: 8,
    enabled: resolvedFeatures.enableVirtualization,
  });

  const handleTableKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    table.onTableKeyDown?.(event, paginatedItems);
    if (event.defaultPrevented || paginatedItems.length === 0) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Tab") return;
    if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
      return;
    }

    event.preventDefault();
    const currentIndex = table.activeRowId
      ? paginatedItems.findIndex((item) => table.getRowId(item) === table.activeRowId)
      : -1;
    const step = event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey) ? -1 : 1;
    const fallbackStart = step > 0 ? 0 : paginatedItems.length - 1;
    const nextIndex =
      currentIndex < 0
        ? fallbackStart
        : Math.min(Math.max(currentIndex + step, 0), paginatedItems.length - 1);
    const nextItem = paginatedItems[nextIndex];
    if (!nextItem) return;
    table.onRowClick?.(nextItem);
  };

  const handleColumnResizeStart = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const headerCell = event.currentTarget.closest("th");
      if (!(headerCell instanceof HTMLElement)) return;

      resizeStateRef.current = {
        columnId,
        startX: event.clientX,
        startWidth: headerCell.getBoundingClientRect().width,
      };
      setIsResizingColumn(true);
    },
    [],
  );

  React.useEffect(() => {
    if (!isResizingColumn) return;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const deltaX = event.clientX - resizeState.startX;
      const nextWidth = Math.max(120, resizeState.startWidth + deltaX);
      setColumnWidths((prev) => ({
        ...prev,
        [resizeState.columnId]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      resizeStateRef.current = null;
      setIsResizingColumn(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingColumn]);

  const leftPaneContent = (
    <>
      <PageHeader title={header.title} description={header.description} actions={header.actions} />
      <div className="pt-2 sm:pt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {tabs && <PageTabs tabs={tabs} variant="inline" className="lg:flex-1" />}
        <TableToolbar
          className="w-full lg:w-auto"
          totalItems={toolbar.totalItems}
          filteredItems={toolbar.filteredItems}
          selectedCount={toolbar.selectedCount}
          searchValue={toolbar.searchValue}
          onSearchChange={toolbar.onSearchChange}
          searchPlaceholder={toolbar.searchPlaceholder}
          currentView={toolbar.currentView}
          onViewChange={toolbar.onViewChange}
          enabledViews={toolbar.enabledViews}
          filters={toolbar.filters}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          columns={toolbarColumns}
          visibleColumns={visibleColumns}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onExport={toolbar.onExport}
          onBulkDelete={toolbar.onBulkDelete}
          mobilePanelActions={toolbar.mobilePanelActions}
          enableSearch={resolvedFeatures.enableSearch}
          enableViews={resolvedFeatures.enableViews}
          enableFilters={resolvedFeatures.enableFilters}
          enableColumnToggle={resolvedFeatures.enableColumnToggle}
          enableExport={resolvedFeatures.enableExport}
          enableBulkDelete={resolvedFeatures.enableBulkDelete && hasRowSelection}
        />
      </div>

      {data.isLoading && (
        <div className="mt-4 space-y-2 py-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {data.error && (
        <div className="mt-4 text-center py-12">
          <p className="text-destructive">{data.error.message}</p>
        </div>
      )}

      {topContent && <div className="mt-4 space-y-4">{topContent}</div>}

      {showEmptyState && (
        <div className="mt-4">
          <EmptyState
            title={emptyState.title}
            description={
              emptyState.isFiltered
                ? emptyState.filteredDescription
                : emptyState.description
            }
            action={emptyState.isFiltered ? undefined : emptyState.action}
          />
        </div>
      )}

      {showTable && shouldRenderTableView && (
        <div className={cn("mt-4", data.isFetching && "opacity-70")}>
          <div
            className={cn(
              "overflow-x-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/70",
              sidePanel ? "mx-0 pl-0" : "-mx-4 sm:-mx-6 lg:-mx-8 lg:pl-2",
            )}
            tabIndex={0}
            onKeyDown={handleTableKeyDown}
            ref={tableScrollRef}
            style={resolvedFeatures.enableVirtualization ? { maxHeight: 640, overflowY: "auto" } : undefined}
          >
            <Table>
              <TableHeader className={cn(table.stickyHeader && "sticky top-0 z-20")}>
                <TableRow>
                  {hasRowSelection && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                      />
                    </TableHead>
                  )}
                  {orderedVisibleColumns.map((column) => {
                      const isSortable = column.sortable !== false && Boolean(sorting);
                      const isHideable = !column.alwaysVisible;
                      const width = columnWidths[column.id];
                      const isPinnedLeft = columnPinning.left.includes(column.id);
                      const pinnedStyle = getPinnedStyle(column.id);
                      const columnStyle =
                        width || pinnedStyle
                          ? ({ width, minWidth: width, ...pinnedStyle } as React.CSSProperties)
                          : undefined;
                      return (
                          <TableHead
                            key={column.id}
                            className={cn(
                              "relative text-center align-middle",
                              isSortable && "cursor-pointer select-none group/th",
                              isPinnedLeft && "shadow-[2px_0_0_hsl(var(--border))]",
                            )}
                          style={columnStyle}
                          draggable={resolvedFeatures.enableColumnReorder}
                          onDragStart={() => setDraggedColumnId(column.id)}
                          onDragOver={(event) => {
                            if (!resolvedFeatures.enableColumnReorder) return;
                            event.preventDefault();
                          }}
                          onDrop={() => {
                            if (!resolvedFeatures.enableColumnReorder) return;
                            handleColumnDrop(column.id);
                            setDraggedColumnId(null);
                          }}
                          onDragEnd={() => setDraggedColumnId(null)}
                          onClick={() => {
                            if (isSortable) {
                              handleSortClick(column.id);
                            }
                          }}
                          onContextMenu={(event) => {
                            if (!isHideable) return;
                            event.preventDefault();
                            hideColumn(column.id);
                          }}
                          title={isHideable ? "Right-click to hide column" : undefined}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                              {resolvedFeatures.enableColumnReorder && (
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span>{column.label}</span>
                              {isSortable && renderSortIcon(column.id)}
                              {resolvedFeatures.enableColumnPinning && (
                                <button
                                  type="button"
                                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    pinColumn(column.id);
                                  }}
                                  aria-label={
                                    columnPinning.left.includes(column.id)
                                      ? `Unpin ${column.label}`
                                      : `Pin ${column.label}`
                                  }
                                  title={
                                    columnPinning.left.includes(column.id)
                                      ? "Unpin column"
                                      : "Pin column"
                                  }
                                >
                                  {columnPinning.left.includes(column.id) ? (
                                    <PinOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Pin className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none"
                            onMouseDown={(event) => handleColumnResizeStart(event, column.id)}
                            aria-hidden="true"
                          />
                        </TableHead>
                      );
                    })}
                  {hasRowActions && <TableHead className="w-[50px]" />}
                </TableRow>
              </TableHeader>
              <TableBody
                style={
                  resolvedFeatures.enableVirtualization
                    ? ({
                        position: "relative",
                        height: `${rowVirtualizer.getTotalSize()}px`,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                {(resolvedFeatures.enableVirtualization
                  ? rowVirtualizer.getVirtualItems().map((virtualRow) => ({
                      item: paginatedItems[virtualRow.index],
                      key: table.getRowId(paginatedItems[virtualRow.index]!),
                      style: {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        height: `${virtualRow.size}px`,
                      } as React.CSSProperties,
                    }))
                  : paginatedItems.map((item) => ({
                      item,
                      key: table.getRowId(item),
                      style: undefined,
                    }))).map(({ item, key, style }) => (
                  <TableRow
                    key={key}
                    className={cn(
                      "cursor-pointer transition-colors duration-150",
                      table.activeRowId === table.getRowId(item) && "bg-accent/50",
                      selectedIds.includes(table.getRowId(item)) && "bg-muted/50",
                    )}
                    style={style}
                    draggable={
                      resolvedFeatures.enableRowReorder &&
                      !sorting?.sortBy &&
                      !resolvedFeatures.enableVirtualization
                    }
                    onDragStart={() => setDraggedRowId(table.getRowId(item))}
                    onDragOver={(event) => {
                      if (!(resolvedFeatures.enableRowReorder && !sorting?.sortBy)) return;
                      event.preventDefault();
                    }}
                    onDrop={() => {
                      if (!(resolvedFeatures.enableRowReorder && !sorting?.sortBy)) return;
                      handleRowDrop(table.getRowId(item));
                      setDraggedRowId(null);
                    }}
                    onDragEnd={() => setDraggedRowId(null)}
                    onClick={() => table.onRowClick?.(item)}
                  >
                    {hasRowSelection && (
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(table.getRowId(item))}
                          onCheckedChange={(checked) =>
                            handleSelectRow(table.getRowId(item), Boolean(checked))
                          }
                        />
                      </TableCell>
                    )}
                    {orderedVisibleColumns.map((column) => (
                        <TableCell
                          key={column.id}
                          style={
                            columnWidths[column.id] || getPinnedStyle(column.id)
                              ? ({
                                  width: columnWidths[column.id],
                                  minWidth: columnWidths[column.id],
                                  ...getPinnedStyle(column.id),
                                } as React.CSSProperties)
                              : undefined
                          }
                          onDoubleClick={() => {
                            if (!resolvedFeatures.enableInlineEditing) return;
                            if (!column.editable || !column.editValue) return;
                            const rowId = table.getRowId(item);
                            const cellKey = `${rowId}::${column.id}`;
                            setEditingCell({ rowId, columnId: column.id });
                            setEditingValue(inlineEdits[cellKey] ?? column.editValue(item));
                          }}
                        >
                          {editingCell?.rowId === table.getRowId(item) &&
                          editingCell.columnId === column.id &&
                          resolvedFeatures.enableInlineEditing &&
                          column.editable &&
                          column.editValue ? (
                            <input
                              className="h-7 w-full rounded border border-border bg-background px-2 text-xs"
                              value={editingValue}
                              autoFocus
                              onChange={(event) => setEditingValue(event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              onBlur={() =>
                                commitInlineEdit(
                                  item,
                                  column,
                                  table.getRowId(item),
                                  editingValue,
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void commitInlineEdit(
                                    item,
                                    column,
                                    table.getRowId(item),
                                    editingValue,
                                  );
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  setEditingCell(null);
                                  setEditingValue("");
                                }
                              }}
                            />
                          ) : column.editable && column.editValue ? (
                            <span className="block truncate">
                              {inlineEdits[`${table.getRowId(item)}::${column.id}`] ??
                                column.editValue(item)}
                            </span>
                          ) : (
                            column.render(item)
                          )}
                        </TableCell>
                      ))}
                    {hasRowActions && (
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        {table.rowActions?.(item)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              {footerTotals && (
                <TableFooter>
                  <TableRow className="bg-muted/50 font-medium">
                    {hasRowSelection && <TableCell />}
                    {orderedVisibleColumns.map((column, index) => {
                        const width = columnWidths[column.id];
                        const columnStyle = width
                          ? ({ width, minWidth: width, ...getPinnedStyle(column.id) } as React.CSSProperties)
                          : undefined;
                        const value = footerTotals.values[column.id];
                        if (index === 0 && !value) {
                          return (
                            <TableCell key={column.id} className="font-semibold" style={columnStyle}>
                              {footerTotals.label ?? "Totals"}
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={column.id} className="font-semibold" style={columnStyle}>
                            {value ?? null}
                          </TableCell>
                        );
                      })}
                    {hasRowActions && <TableCell />}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>
      )}

      {showTable && canRenderCardView && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rowOrderedItems.map((item) => {
            const CardView = views?.card;
            return (
              <React.Fragment key={table.getRowId(item)}>
                {CardView ? CardView(item) : null}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {showTable && canRenderListView && (
        <div className="mt-4 space-y-1">
          {rowOrderedItems.map((item) => {
            const ListView = views?.list;
            return (
              <React.Fragment key={table.getRowId(item)}>
                {ListView ? ListView(item) : null}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-4 items-center justify-between pt-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(pagination.perPage)} onValueChange={pagination.onPerPageChange}>
              <SelectTrigger className="h-8 w-[90px]">
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
    </>
  );

  return (
    <PageContainer className={cn(sidePanel && "pt-0")}>
      {sidePanel ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10 lg:min-h-[calc(100vh-7.5rem)]">
          <div className="min-w-0">{leftPaneContent}</div>
          <aside
            className={cn(
              "hidden lg:block lg:sticky lg:top-0 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto bg-[hsl(var(--surface-alt))] rounded-lg",
              sidePanel.widthClassName,
            )}
          >
            {sidePanel.content}
          </aside>
        </div>
      ) : (
        leftPaneContent
      )}
    </PageContainer>
  );
}
