"use client";

import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { type RoadmapItem, type RoadmapPhase, PHASE_META } from "@/lib/schemas/roadmap-schema";
import { RoadmapItemActions } from "./roadmap-item-actions";

interface RoadmapTimelineItemProps {
  item: RoadmapItem;
  phase: RoadmapPhase;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function RoadmapTimelineItem({
  item,
  phase,
  dragHandleProps,
  isDragging,
  onEdit,
  onDelete,
  isDeleting,
}: RoadmapTimelineItemProps) {
  const meta = PHASE_META[phase];

  return (
    <div
      className={cn(
        "group relative flex gap-6 pb-8",
        isDragging && "opacity-50"
      )}
    >
      {/* Dot */}
      <div className="relative flex flex-col items-center">
        <span
          className={cn(
            "mt-1.5 h-3 w-3 rounded-full shrink-0 ring-2 ring-background",
            meta.dotColor
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground leading-snug pr-2">
            {item.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <span
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <RoadmapItemActions
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          </div>
        </div>

        {item.description && (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}

        {item.bullet_points && item.bullet_points.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {item.bullet_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
