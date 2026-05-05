"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { Zap, AlertTriangle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogDescription,
  MorphingDialogClose,
  MorphingDialogContainer,
} from "@/components/motion/morphing-dialog";
import { BOARD_STATUS_LABELS } from "@/lib/admin-feedback/constants";
import type { BoardItem } from "./use-product-board";

const severityConfig = {
  high: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "High", className: "text-destructive" },
  medium: { icon: <Zap className="h-3.5 w-3.5" />, label: "Medium", className: "text-yellow-500" },
  low: { icon: <Minus className="h-3.5 w-3.5" />, label: "Low", className: "text-muted-foreground" },
};

interface BoardCardProps {
  item: BoardItem;
  readonly?: boolean;
}

export function BoardCard({ item, readonly }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: readonly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const severity = item.severity ? severityConfig[item.severity as keyof typeof severityConfig] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity duration-150",
        isDragging && "opacity-50"
      )}
    >
      <MorphingDialog
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
      >
        <MorphingDialogTrigger
          {...(!readonly ? attributes : {})}
          {...(!readonly ? listeners : {})}
          style={{ borderRadius: "12px" }}
          className={cn(
            "w-full text-left bg-background p-3.5 select-none block",
            !readonly && "cursor-grab active:cursor-grabbing",
            "transition-shadow duration-150",
            "hover:shadow-sm"
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
            {severity && (
              <span className={cn("flex items-center gap-1", severity.className)}>
                {severity.icon}
              </span>
            )}
          </div>
        </MorphingDialogTrigger>

        <MorphingDialogContainer>
          <MorphingDialogContent
            style={{ borderRadius: "20px" }}
            className="relative w-120 bg-background"
          >
            <div className="p-7">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {BOARD_STATUS_LABELS[item.board_status]}
                </span>
                {severity && (
                  <span className={cn("flex items-center gap-1 text-xs font-medium", severity.className)}>
                    {severity.icon}
                    {severity.label} priority
                  </span>
                )}
              </div>

              <MorphingDialogTitle className="mt-3 text-xl font-semibold leading-snug text-foreground">
                {item.title}
              </MorphingDialogTitle>

              {item.page_title && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted from {item.page_title}
                </p>
              )}

              <MorphingDialogDescription
                className="mt-4 text-sm leading-relaxed text-muted-foreground"
                variants={{
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: 8 },
                }}
              >
                {item.comment}
              </MorphingDialogDescription>

              <p className="mt-6 text-xs text-muted-foreground/60">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>

            <MorphingDialogClose className="text-muted-foreground hover:text-foreground" />
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
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
