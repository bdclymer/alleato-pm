"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { ChevronRight, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { TableColumn } from "./unified-table-page";

/* ────────────────────────────────────────────────────────────────────────────
 * MobileCardList — renders table rows as touch-friendly cards on small screens.
 *
 * Displayed at the sm breakpoint (< 640px). Each row becomes a card with:
 *   - First column as the bold title (rendered as-authored — e.g. avatar + name)
 *   - 2-3 detail columns as label / value pairs
 *   - Row actions via a "..." menu (if provided)
 *   - Chevron indicator when the card is clickable
 *
 * Cards animate in with a short, staggered slide-up on first mount. Because
 * keys are stable per row, only newly-added rows animate on re-render (existing
 * rows stay put during pagination/filtering), and the whole thing collapses to
 * a plain fade when the OS "reduce motion" setting is on.
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
  /** Default view handler — renders a simple "..." > View menu item when no custom rowActions */
  onView?: (item: T) => void;
  /** Default edit handler — renders a simple "..." > Edit menu item when no custom rowActions */
  onEdit?: (item: T) => void;
  /** Default delete handler — renders a simple "..." > Delete menu when no custom rowActions */
  onDelete?: (item: T) => void;
  hasRowActions: boolean;
}

// Cap the per-row entrance delay so a full page of rows still finishes its
// reveal quickly instead of trickling in.
const STAGGER_STEP = 0.028;
const STAGGER_MAX = 0.24;

export function MobileCardList<T>({
  items,
  columns,
  getRowId,
  activeRowId,
  onRowClick,
  isFetching,
  rowActions,
  onView,
  onEdit,
  onDelete,
  hasRowActions,
}: MobileCardListProps<T>) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "sm:hidden [&_button]:min-h-11 [&_button]:min-w-11",
        isFetching && "opacity-70",
      )}
    >
      <div className="flex flex-col gap-2.5">
        {items.map((item, index) => {
          const rowId = getRowId(item);
          const isActive = activeRowId === rowId;
          const isClickable = Boolean(onRowClick);

          // First column → card title. Next 2-3 → detail rows.
          const titleCol = columns[0];
          const detailCols = columns.slice(1, 4);

          return (
            <motion.div
              key={rowId}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 10 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                delay: Math.min(index * STAGGER_STEP, STAGGER_MAX),
                ease: [0.22, 1, 0.36, 1],
              }}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              className={cn(
                "rounded-2xl bg-card px-4 py-3.5 shadow-sm transition-colors",
                isClickable &&
                  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:bg-muted/40",
                isActive && "bg-primary/[0.05]",
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
              <div className="flex min-w-0 items-start gap-2">
                {/* Main content area */}
                <div className="min-w-0 flex-1">
                  {/* Title row — rendered exactly as the column authored it
                      (e.g. avatar + name). No layout overrides so avatar and
                      label stay adjacent instead of being pushed apart. */}
                  {titleCol && (
                    <div className="min-w-0 text-[15px] font-semibold leading-tight text-foreground [&_p]:truncate">
                      {titleCol.render(item)}
                    </div>
                  )}

                  {/* Detail rows: label / value pairs */}
                  {detailCols.length > 0 && (
                    <div className="mt-3 grid min-w-0 grid-cols-1 gap-y-1.5">
                      {detailCols.map((col) => (
                        <div
                          key={col.id}
                          className="grid min-w-0 grid-cols-[7rem_1fr] items-baseline gap-3"
                        >
                          <span className="text-[11px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
                            {col.label}
                          </span>
                          <span className="min-w-0 truncate text-sm text-foreground [&_*]:truncate">
                            {col.render(item)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row actions menu */}
                {hasRowActions && (
                  <div
                    className="-mr-2 -mt-1.5 flex-shrink-0"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {rowActions ? (
                      rowActions(item)
                    ) : onView || onEdit || onDelete ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(item)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                          )}
                          {onView && (onEdit || onDelete) ? (
                            <DropdownMenuSeparator />
                          ) : null}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onEdit && onDelete ? <DropdownMenuSeparator /> : null}
                          {onDelete && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDelete(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                )}

                {/* Chevron indicator for clickable cards (when no row actions) */}
                {isClickable && !hasRowActions && (
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
