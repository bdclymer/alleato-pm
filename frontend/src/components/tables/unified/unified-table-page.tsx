"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { SimplePagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableToolbar, type ColumnConfig, type FilterConfig, type ViewMode } from "./table-toolbar";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

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
    activeFilters: Record<string, string | number | boolean | null | undefined>;
    onFilterChange: (filters: Record<string, string | number | boolean | null | undefined>) => void;
    onClearFilters: () => void;
    columns: ColumnConfig[];
    visibleColumns: string[];
    onColumnVisibilityChange: (columns: string[]) => void;
    onExport?: () => void;
    onBulkDelete?: () => void;
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
  };
  sorting?: {
    sortBy: string | null;
    sortDirection: SortDirection;
    onSortChange: (sortBy: string, direction: SortDirection) => void;
  };
  selection: {
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
  };
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
}: UnifiedTablePageProps<T>): ReactElement {
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

  const allSelected =
    sortedItems.length > 0 &&
    sortedItems.every((item) => selection.selectedIds.includes(table.getRowId(item)));
  const someSelected = selection.selectedIds.length > 0 && !allSelected;

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
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />;
    }

    return sorting.sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  return (
    <>
      <PageHeader title={header.title} description={header.description} actions={header.actions} />

      <PageContainer>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
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
            activeFilters={toolbar.activeFilters}
            onFilterChange={toolbar.onFilterChange}
            onClearFilters={toolbar.onClearFilters}
            columns={toolbar.columns}
            visibleColumns={toolbar.visibleColumns}
            onColumnVisibilityChange={toolbar.onColumnVisibilityChange}
            onExport={toolbar.onExport}
            onBulkDelete={toolbar.onBulkDelete}
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

        {showTable && toolbar.currentView === "table" && (
          <div className={cn("mt-4 border rounded-lg", data.isFetching && "opacity-70")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => selection.onSelectAll(Boolean(checked))}
                    />
                  </TableHead>
                  {table.columns
                    .filter((column) => toolbar.visibleColumns.includes(column.id))
                    .map((column) => {
                      const isSortable = column.sortable !== false && Boolean(sorting);
                      return (
                        <TableHead
                          key={column.id}
                          className={cn(
                            isSortable && "cursor-pointer select-none",
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
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item) => (
                  <TableRow
                    key={table.getRowId(item)}
                    className={cn(
                      "cursor-pointer",
                      selection.selectedIds.includes(table.getRowId(item)) && "bg-muted/50",
                    )}
                    onClick={() => table.onRowClick?.(item)}
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selection.selectedIds.includes(table.getRowId(item))}
                        onCheckedChange={(checked) =>
                          selection.onSelectRow(table.getRowId(item), Boolean(checked))
                        }
                      />
                    </TableCell>
                    {table.columns
                      .filter((column) => toolbar.visibleColumns.includes(column.id))
                      .map((column) => (
                        <TableCell key={column.id}>{column.render(item)}</TableCell>
                      ))}
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {table.rowActions?.(item)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {showTable && toolbar.currentView === "card" && views?.card && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedItems.map((item) => (
              <React.Fragment key={table.getRowId(item)}>
                {views.card(item)}
              </React.Fragment>
            ))}
          </div>
        )}

        {showTable && toolbar.currentView === "list" && views?.list && (
          <div className="mt-4 space-y-1">
            {sortedItems.map((item) => (
              <React.Fragment key={table.getRowId(item)}>
                {views.list(item)}
              </React.Fragment>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 items-center justify-between pt-6 md:flex-row">
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
