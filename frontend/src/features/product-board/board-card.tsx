"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { Zap, AlertTriangle, Minus } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogContainer,
} from "@/components/motion/morphing-dialog";
import { BoardItemDialog } from "./board-item-dialog";
import type { BoardItem } from "./use-product-board";

const severityConfig = {
  high: { icon: <AlertTriangle className="h-3 w-3" />, className: "text-destructive" },
  medium: { icon: <Zap className="h-3 w-3" />, className: "text-yellow-500" },
  low: { icon: <Minus className="h-3 w-3" />, className: "text-muted-foreground" },
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

  const severity = item.severity
    ? severityConfig[item.severity as keyof typeof severityConfig]
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("transition-opacity duration-150", isDragging && "opacity-40")}
    >
      <MorphingDialog transition={{ type: "spring", stiffness: 220, damping: 28 }}>
        <motion.div
          whileHover={!isDragging ? { y: -3, scale: 1.015 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          <MorphingDialogTrigger
            {...(!readonly ? attributes : {})}
            {...(!readonly ? listeners : {})}
            style={{ borderRadius: "12px" }}
            className={cn(
              "w-full text-left bg-background p-3.5 select-none block",
              "shadow-xs transition-shadow duration-200 hover:shadow-sm",
              !readonly && "cursor-pointer"
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
                <span className={cn("flex items-center", severity.className)}>
                  {severity.icon}
                </span>
              )}
            </div>
          </MorphingDialogTrigger>
        </motion.div>

        <MorphingDialogContainer>
          <MorphingDialogContent
            style={{ borderRadius: "20px" }}
            className="relative w-full max-w-3xl bg-background overflow-hidden"
          >
            {/* inline style for vh-based height — not in 8px grid token set */}
            <div style={{ maxHeight: "88vh", overflow: "hidden" }}>
              <BoardItemDialog item={item} />
            </div>
          </MorphingDialogContent>
        </MorphingDialogContainer>
      </MorphingDialog>
    </div>
  );
}

export function BoardCardOverlay({ item }: { item: BoardItem }) {
  return (
    <div className="rounded-xl bg-background p-3.5 shadow-sm rotate-1 scale-[1.02] opacity-95">
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
