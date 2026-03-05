"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";

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
import { ChevronDown, ChevronUp } from "lucide-react";

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
    stickyHeader?: boolean;
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

  const paginatedItems = React.useMemo(() => {
    if (!pagination?.clientSide) return sortedItems;
    const start = (pagination.page - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return sortedItems.slice(start, end);
  }, [pagination?.clientSide, pagination?.page, pagination?.perPage, sortedItems]);

  const allSelected =
    sortedItems.length > 0 &&
    sortedItems.every((item) => selectedIds.includes(table.getRowId(item)));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const showEmptyState = !data.isLoading && !data.error && sortedItems.length === 0;
  const showTable = !data.isLoading && !data.error && sortedItems.length > 0;

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

  return (
    <>
      <PageHeader title={header.title} description={header.description} actions={header.actions} />

      <PageContainer className="pt-2 sm:pt-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
            <div className="overflow-x-auto">
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
                    {table.columns
                      .filter((column) => visibleColumns.includes(column.id))
                      .map((column) => {
                        const isSortable = column.sortable !== false && Boolean(sorting);
                        return (
                          <TableHead
                            key={column.id}
                            className={cn(
                              isSortable && "cursor-pointer select-none group/th",
                            )}
                            onClick={() => {
                              if (isSortable) {
                                handleSortClick(column.id);
                              }
                            }}
                          >
                            <div className="flex items-center">
                              {column.label}
                              {isSortable && renderSortIcon(column.id)}
                            </div>
                          </TableHead>
                        );
                      })}
                    {hasRowActions && <TableHead className="w-[50px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow
                      key={table.getRowId(item)}
                      className={cn(
                        "cursor-pointer",
                        selectedIds.includes(table.getRowId(item)) && "bg-muted/50",
                      )}
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
                      {table.columns
                        .filter((column) => visibleColumns.includes(column.id))
                        .map((column) => (
                          <TableCell key={column.id}>{column.render(item)}</TableCell>
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
                      {table.columns
                        .filter((column) => visibleColumns.includes(column.id))
                        .map((column, index) => {
                          const value = footerTotals.values[column.id];
                          // Show label in first visible column if no explicit value
                          if (index === 0 && !value) {
                            return (
                              <TableCell key={column.id} className="font-semibold">
                                {footerTotals.label ?? "Totals"}
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={column.id} className="font-semibold">
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedItems.map((item) => {
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
            {sortedItems.map((item) => {
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
      </PageContainer>
    </>
  );
}
