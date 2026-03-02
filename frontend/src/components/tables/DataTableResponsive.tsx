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
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePaginationResponsive } from "./DataTablePaginationResponsive";
import { DataTableToolbarResponsive } from "./DataTableToolbarResponsive";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface DataTableResponsiveProps<TData, TValue> {
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
  mobileColumns?: string[]; // Columns to show on mobile
  mobileCardRenderer?: (row: TData) => React.ReactNode; // Custom mobile card renderer
}

export function DataTableResponsive<TData, TValue>({
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
}: DataTableResponsiveProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Default mobile card renderer
  const defaultMobileCardRenderer = (row: any) => {
    const displayColumns = mobileColumns || ["name", "status"]; // Default columns
    return (
      <div className="space-y-2">
        {displayColumns.map((col) => {
          const column = columns.find((c: any) => c.accessorKey === col);
          if (!column || !row[col]) return null;

          return (
            <div key={col} className="flex justify-between">
              <span className="text-sm text-muted-foreground capitalize">
                {col.replace(/_/g, " ")}:
              </span>
              <span className="text-sm font-medium">
                {typeof row[col] === "object"
                  ? JSON.stringify(row[col])
                  : row[col]}
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
      <div className="space-y-4">
        {rows.map((row) => (
          <Card
            key={row.id}
            className={cn(
              "p-4",
              onRowClick &&
                "cursor-pointer hover:bg-muted/50 transition-colors",
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
        ))}
      </div>
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
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* DEPRECATION WARNING - Remove after migration */}
      <div className="bg-destructive text-white px-4 py-4 rounded-md font-semibold text-center">
        ⚠️ DEPRECATED: This page uses legacy DataTableResponsive. Migrate to GenericDataTable + TableLayout
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
