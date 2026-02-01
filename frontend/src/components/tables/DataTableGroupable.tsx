"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  GroupingState,
  ExpandedState,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { DataTablePaginationResponsive } from "./DataTablePaginationResponsive";
import { DataTableToolbarResponsive } from "./DataTableToolbarResponsive";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface DataTableGroupableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  showToolbar?: boolean;
  showPagination?: boolean;
  onRowClick?: (row: TData) => void;
  className?: string;
  searchKey?: string;
  searchPlaceholder?: string;
  filterOptions?: {
    column: string;
    title: string;
    options: {
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }[];
  }[];
  mobileColumns?: string[];
  mobileCardRenderer?: (row: TData) => React.ReactNode;
  groupBy?: string; // Column ID to group by
  showGrandTotal?: boolean; // Whether to show grand totals footer row
  currencyColumns?: string[]; // Column IDs that contain currency values to sum
}

export function DataTableGroupable<TData, TValue>({
  columns,
  data,
  showToolbar = true,
  showPagination = true,
  onRowClick,
  className,
  searchKey,
  searchPlaceholder,
  filterOptions,
  mobileColumns,
  mobileCardRenderer,
  groupBy,
  showGrandTotal = false,
  currencyColumns = [],
}: DataTableGroupableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const [grouping, setGrouping] = React.useState<GroupingState>(
    groupBy ? [groupBy] : [],
  );
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  // Initialize column visibility from localStorage
  const storageKey = "commitments-column-visibility";
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return {};
          }
        }
      }
      return {};
    });

  // Persist column visibility to localStorage when it changes
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility]);

  // Update grouping when groupBy prop changes
  React.useEffect(() => {
    setGrouping(groupBy ? [groupBy] : []);
    setExpanded({}); // Reset expanded state when grouping changes
  }, [groupBy]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
      expanded,
    },
  });

  // Calculate grand totals for currency columns
  const grandTotals = React.useMemo(() => {
    if (!showGrandTotal || currencyColumns.length === 0) return {};

    const totals: Record<string, number> = {};

    // Get filtered data (respects search and filters)
    const filteredRows = table.getFilteredRowModel().rows;

    // Initialize totals for each currency column
    currencyColumns.forEach((columnId) => {
      totals[columnId] = 0;
    });

    // Sum up values from filtered data
    filteredRows.forEach((row) => {
      currencyColumns.forEach((columnId) => {
        const value = row.getValue(columnId);
        if (typeof value === "number") {
          totals[columnId] += value;
        }
      });
    });

    return totals;
  }, [showGrandTotal, currencyColumns, table]);

  // Default mobile card renderer
  const defaultMobileCardRenderer = (row: TData) => {
    const displayColumns = mobileColumns || ["name", "status"];

    return (
      <div className="space-y-2">
        {displayColumns.map((col) => {
          const rowData = row as Record<string, unknown>;
          const column = columns.find((c) => {
            const colDef = c as { accessorKey?: string };
            return colDef.accessorKey === col;
          });

          if (!column || !rowData[col]) return null;

          return (
            <div key={col} className="flex justify-between">
              <span className="text-sm text-muted-foreground capitalize">
                {col.replace(/_/g, " ")}:
              </span>
              <span className="text-sm font-medium">
                {typeof rowData[col] === "object"
                  ? JSON.stringify(rowData[col])
                  : String(rowData[col])}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMobileView = () => {
    const rows = table.getRowModel().rows;

    if (!rows?.length) {
      return (
        <Card className="p-8 text-center text-muted-foreground">
          No results found.
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {rows.map((row) => {
          // Group header row
          if (row.getIsGrouped()) {
            const groupValue = row.getValue(grouping[0]) as string;
            const subRowCount = row.subRows?.length || 0;

            return (
              <Card
                key={row.id}
                className="p-4 bg-muted/50 cursor-pointer"
                onClick={() => row.toggleExpanded()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {row.getIsExpanded() ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {groupValue || "—"} ({subRowCount})
                    </span>
                  </div>
                </div>
              </Card>
            );
          }

          // Regular row
          return (
            <Card
              key={row.id}
              className={cn(
                "p-4",
                onRowClick &&
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                row.depth > 0 && "ml-6", // Indent grouped rows
              )}
              onClick={() => onRowClick?.(row.original)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {mobileCardRenderer
                    ? mobileCardRenderer(row.original)
                    : defaultMobileCardRenderer(row.original)}
                </div>
                {onRowClick && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground mt-1 ml-2" />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderGroupHeaderCell = (row: Row<TData>) => {
    const groupValue = row.getValue(grouping[0]) as string;
    const subRowCount = row.subRows?.length || 0;

    return (
      <TableCell colSpan={columns.length} className="bg-muted/50 font-medium">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => row.toggleExpanded()}
          className="h-8 w-full justify-start"
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4 mr-2" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2" />
          )}
          <span className="capitalize">
            {groupValue || "—"}{" "}
            <span className="text-muted-foreground">({subRowCount} items)</span>
          </span>
        </Button>
      </TableCell>
    );
  };

  const renderGrandTotalFooter = () => {
    if (!showGrandTotal) return null;

    const visibleColumns = table.getVisibleFlatColumns();

    return (
      <TableFooter>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          {visibleColumns.map((column, index) => {
            const columnId = column.id;

            // First column shows "Grand Total" label
            if (index === 0) {
              return (
                <TableCell key={columnId} className="font-bold">
                  Grand Total
                </TableCell>
              );
            }

            // Currency columns show formatted totals
            if (
              currencyColumns.includes(columnId) &&
              grandTotals[columnId] !== undefined
            ) {
              return (
                <TableCell key={columnId} className="font-bold">
                  {formatCurrency(grandTotals[columnId])}
                </TableCell>
              );
            }

            // Other columns show empty cell with dash
            return (
              <TableCell key={columnId} className="text-muted-foreground">
                —
              </TableCell>
            );
          })}
        </TableRow>
      </TableFooter>
    );
  };

  const renderDesktopView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              // Group header row
              if (row.getIsGrouped()) {
                return (
                  <TableRow key={row.id}>{renderGroupHeaderCell(row)}</TableRow>
                );
              }

              // Regular data row
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {renderGrandTotalFooter()}
      </Table>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* DEPRECATION WARNING - Remove after migration */}
      <div className="bg-destructive text-white px-4 py-3 rounded-md font-semibold text-center">
        ⚠️ DEPRECATED: This page uses legacy DataTableGroupable. Migrate to GenericDataTable + TableLayout
      </div>
      {showToolbar && (
        <DataTableToolbarResponsive
          table={table}
          searchKey={searchKey}
          searchPlaceholder={searchPlaceholder}
          filterOptions={filterOptions}
        />
      )}

      {/* Mobile view */}
      <div className="block lg:hidden">{renderMobileView()}</div>

      {/* Desktop view */}
      <div className="hidden lg:block">{renderDesktopView()}</div>

      {showPagination && <DataTablePaginationResponsive table={table} />}
    </div>
  );
}
