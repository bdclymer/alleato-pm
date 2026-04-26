"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { ChevronRight, MoreHorizontal, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { TableColumn } from "./unified-table-page";

/* ────────────────────────────────────────────────────────────────────────────
 * MobileCardList — renders table rows as touch-friendly cards on small screens.
 *
 * Displayed at the sm breakpoint (< 640px). Each row becomes a card with:
 *   - First column as the bold title
 *   - 2-3 detail columns as label:value pairs
 *   - Row actions via a "..." menu (if provided)
 *   - Chevron indicator when the card is clickable
 * ──────────────────────────────────────────────────────────────────────────── */

interface MobileCardListProps<T> {
  items: T[];
  columns: TableColumn<T>[];
  getRowId: (item: T) => string;
  activeRowId?: string | null;
  onRowClick?: (item: T) => void;
  isFetching?: boolean;
  /** Custom row actions renderer (same as the desktop table) */
  rowActions?: (item: T) => ReactNode;
  /** Default delete handler — renders a simple "..." > Delete menu when no custom rowActions */
  onDelete?: (item: T) => void;
  hasRowActions: boolean;
}

export function MobileCardList<T>({
  items,
  columns,
  getRowId,
  activeRowId,
  onRowClick,
  isFetching,
  rowActions,
  onDelete,
  hasRowActions,
}: MobileCardListProps<T>) {
  return (
    <div className={cn("sm:hidden [&_button]:min-h-11 [&_button]:min-w-11", isFetching && "opacity-70")}>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const rowId = getRowId(item);
          const isActive = activeRowId === rowId;
          const isClickable = Boolean(onRowClick);

          // First column → card title. Next 2-3 → detail rows.
          const titleCol = columns[0];
          const detailCols = columns.slice(1, 4);

          return (
            <div
              key={rowId}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              className={cn(
                "rounded-md border border-border/60 bg-background px-3 py-3 transition-colors",
                isClickable &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                isActive ? "bg-muted" : isClickable && "active:bg-muted/50",
              )}
              onClick={isClickable ? () => onRowClick?.(item) : undefined}
              onKeyDown={
                isClickable
                  ? (event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onRowClick?.(item);
                    }
                  : undefined
              }
            >
              <div className="flex min-w-0 items-start gap-3">
                {/* Main content area */}
                <div className="min-w-0 flex-1">
                  {/* Title row */}
                {titleCol && (
                  <div className="truncate text-sm font-semibold text-foreground [&>div]:w-full [&>div]:justify-between">
                    {React.Children.toArray(titleCol.render(item))}
                  </div>
                )}

                  {/* Detail rows: label-value pairs */}
                  {detailCols.length > 0 && (
                    <div className="mt-1.5 grid min-w-0 grid-cols-1 gap-1">
                      {detailCols.map((col) => (
                        <div key={col.id} className="grid min-w-0 grid-cols-[7.5rem_1fr] gap-2 text-xs">
                          <span className="truncate text-muted-foreground">{col.label}</span>
                          <span className="min-w-0 truncate text-foreground/80">
                            {React.Children.toArray(col.render(item))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row actions menu */}
                {hasRowActions && (
                  <div
                    className="-mr-1 -mt-1 flex-shrink-0"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {rowActions ? (
                      rowActions(item)
                    ) : onDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                )}

                {/* Chevron indicator for clickable cards (when no row actions) */}
                {isClickable && !hasRowActions && (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
