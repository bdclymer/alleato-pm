"use client";

import React, { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Download, MoreVertical, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "./loading-state";
import { EmptyState } from "@/components/ds";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableColumn<T = any> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}

interface FinancialDataTableProps<T = any> {
  title?: string;
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  loadingMessage?: string;
  emptyIcon?: LucideIcon;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onExport?: (format: "csv" | "pdf" | "excel") => void;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  className?: string;
  tableClassName?: string;
}

export function FinancialDataTable<T extends { id?: string | number }>({
  title,
  data,
  columns,
  loading = false,
  loadingMessage = "Loading data...",
  emptyIcon,
  emptyMessage = "No data found",
  emptyActionLabel,
  onEmptyAction,
  onExport,
  onRowClick,
  actions,
  className,
  tableClassName,
}: FinancialDataTableProps<T>) {
  if (loading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ? <>{React.createElement(emptyIcon)}</> : <Inbox />}
        title={emptyMessage}
        description=""
        action={
          emptyActionLabel && onEmptyAction ? (
            <Button size="sm" variant="outline" onClick={onEmptyAction}>
              <Plus />
              {emptyActionLabel}
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className={className}>
      {(title || onExport) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onExport("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("pdf")}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("excel")}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={cn("w-full", tableClassName)}>
          <thead className="border-b">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "pb-4 text-left text-sm font-medium",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
              {actions && <th className="pb-4 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row, index) => (
              <tr
                key={row.id || index}
                className={cn(
                  "group",
                  onRowClick && "hover:bg-muted cursor-pointer",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "py-4 text-sm",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {column.accessor(row)}
                  </td>
                ))}
                {actions && (
                  <td className="py-4">
                    <div onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
