"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { BoardCard } from "./board-card";
import type { BoardItem } from "./use-product-board";
import type { BoardStatus } from "@/lib/admin-feedback/constants";

const COLUMN_ACCENT: Record<BoardStatus, string> = {
  submitted: "bg-muted/60",
  in_review: "bg-blue-50/60 dark:bg-blue-950/20",
  planned: "bg-violet-50/60 dark:bg-violet-950/20",
  in_progress: "bg-amber-50/60 dark:bg-amber-950/20",
  shipped: "bg-emerald-50/60 dark:bg-emerald-950/20",
};

const COUNT_PILL: Record<BoardStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  in_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  planned: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  shipped: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

interface BoardColumnProps {
  status: BoardStatus;
  label: string;
  items: BoardItem[];
  isOver?: boolean;
  readonly?: boolean;
}

export function BoardColumn({ status, label, items, readonly }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 flex-none flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
            COUNT_PILL[status]
          )}
        >
          {items.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-col gap-2.5 rounded-2xl p-2.5 transition-colors duration-150",
          COLUMN_ACCENT[status],
          isOver && "ring-2 ring-primary/40 ring-offset-1"
        )}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <BoardCard key={item.id} item={item} readonly={readonly} />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-xs text-muted-foreground/50">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
