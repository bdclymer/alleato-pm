"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 25, 50, 100],
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  if (pageCount <= 1) return null;

  const pages = buildPageList(pageIndex + 1, pageCount);

  return (
    <div className="flex flex-col items-center justify-between gap-4 pt-6 md:flex-row">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(val) => table.setPageSize(Number(val))}
        >
          <SelectTrigger className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav className="text-foreground">
        <ul className="flex flex-wrap items-center justify-center gap-1 text-muted-foreground">
          <li>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs font-medium text-muted-foreground"
              onClick={() => table.previousPage()}
              disabled={!canPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
          </li>

          {pages.map((page, i) =>
            page === "…" ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis positional key
              <li key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs">
                …
              </li>
            ) : (
              <li key={page}>
                <Button
                  type="button"
                  onClick={() => table.setPageIndex((page as number) - 1)}
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "rounded-full text-xs",
                    page === pageIndex + 1
                      ? "bg-accent font-semibold text-primary hover:bg-accent hover:text-primary"
                      : "text-muted-foreground hover:text-primary",
                  )}
                  aria-current={page === pageIndex + 1 ? "page" : undefined}
                >
                  {page}
                </Button>
              </li>
            ),
          )}

          <li>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs font-medium text-muted-foreground"
              onClick={() => table.nextPage()}
              disabled={!canNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [];

  const push = (n: number) => pages.push(n);
  const ellipsis = () => {
    if (pages[pages.length - 1] !== "…") pages.push("…");
  };

  push(1);
  if (current > 3) ellipsis();
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    push(i);
  }
  if (current < total - 2) ellipsis();
  push(total);

  return pages;
}
