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
    <div className={cn("sm:hidden", isFetching && "opacity-70")}>
      <div className="divide-y divide-border">
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
                "flex items-center gap-2 px-4 py-3 min-h-[3.25rem] transition-colors",
                isClickable &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                isActive ? "bg-muted" : isClickable && "active:bg-muted/60",
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
              {/* Main content area */}
              <div className="flex-1 min-w-0">
                {/* Title row */}
                {titleCol && (
                  <div className="text-sm font-semibold text-foreground truncate">
                    {React.Children.toArray(titleCol.render(item))}
                  </div>
                )}

                {/* Detail rows: label-value pairs */}
                {detailCols.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {detailCols.map((col) => (
                      <span
                        key={col.id}
                        className="inline-flex items-center gap-1 text-xs truncate max-w-48"
                      >
                        <span className="text-muted-foreground">{col.label}:</span>
                        <span className="text-foreground/80">
                          {React.Children.toArray(col.render(item))}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Row actions menu */}
              {hasRowActions && (
                <div
                  className="flex-shrink-0"
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
          );
        })}
      </div>
    </div>
  );
}
