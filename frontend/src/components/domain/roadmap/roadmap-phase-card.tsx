"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { type RoadmapPhase, PHASE_META, ROADMAP_PHASES } from "@/lib/schemas/roadmap-schema";

interface RoadmapPhaseCardProps {
  phase: RoadmapPhase;
  itemCount: number;
  isActive: boolean;
  onClick: () => void;
  onAddClick: () => void;
}

export function RoadmapPhaseCard({
  phase,
  itemCount,
  isActive,
  onClick,
  onAddClick,
}: RoadmapPhaseCardProps) {
  const meta = PHASE_META[phase];
  const phaseNumber = ROADMAP_PHASES.indexOf(phase) + 1;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "group w-full h-auto text-left px-4 py-4 rounded-lg border-l-4 transition-all justify-start",
        "bg-muted/30 hover:bg-muted/50",
        isActive ? cn("bg-muted/60 shadow-xs", meta.cardColor) : "border-l-transparent"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Phase {phaseNumber}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{meta.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? "feature" : "features"}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onAddClick();
          }}
          aria-label={`Add feature to ${meta.label}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Button>
  );
}
