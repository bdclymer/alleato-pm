"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { Zap, AlertTriangle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardItem } from "./use-product-board";

const severityIcon = {
  high: <AlertTriangle className="h-3 w-3 text-destructive" />,
  medium: <Zap className="h-3 w-3 text-yellow-500" />,
  low: <Minus className="h-3 w-3 text-muted-foreground" />,
};

interface BoardCardProps {
  item: BoardItem;
  isDragging?: boolean;
  readonly?: boolean;
}

export function BoardCard({ item, isDragging, readonly }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } =
    useSortable({ id: item.id, disabled: readonly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!readonly ? attributes : {})}
      {...(!readonly ? listeners : {})}
      className={cn(
        "group relative rounded-xl bg-background p-3.5 select-none",
        !readonly && "cursor-grab active:cursor-grabbing",
        "transition-shadow duration-150",
        isSorting || isDragging
          ? "shadow-sm opacity-50"
          : "shadow-xs hover:shadow-sm"
      )}
    >
      <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
        {item.title}
      </p>

      {item.comment && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {item.comment}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </span>
        {item.severity && (
          <span className="flex items-center gap-1">
            {severityIcon[item.severity as keyof typeof severityIcon] ?? null}
          </span>
        )}
      </div>
    </div>
  );
}

export function BoardCardOverlay({ item }: { item: BoardItem }) {
  return (
    <div className="rounded-xl bg-background p-3.5 shadow-sm rotate-1 scale-[1.02] opacity-90">
      <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
        {item.title}
      </p>
      {item.comment && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {item.comment}
        </p>
      )}
    </div>
  );
}
