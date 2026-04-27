"use client";

import { MapIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ds/empty-state";
import {
  ROADMAP_PHASES,
  PHASE_META,
  type RoadmapPhase,
  type RoadmapItem,
} from "@/lib/schemas/roadmap-schema";
import { RoadmapSortableList } from "./roadmap-sortable-list";

interface RoadmapTimelineProps {
  grouped: Record<RoadmapPhase, RoadmapItem[]>;
  onAddToPhase: (phase: RoadmapPhase) => void;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  onReorder: (updates: Array<{ id: string; sort_order: number }>) => void;
  isDeleting: boolean;
}

export function RoadmapTimeline({
  grouped,
  onAddToPhase,
  onEdit,
  onDelete,
  onReorder,
  isDeleting,
}: RoadmapTimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-1 top-2 bottom-0 w-px bg-border" aria-hidden />

      <div className="flex flex-col">
        {ROADMAP_PHASES.map((phase) => {
          const items = grouped[phase];
          const meta = PHASE_META[phase];

          return (
            <section key={phase} id={`phase-${phase}`} className="scroll-mt-8 pb-10">
              {/* Phase heading */}
              <div className="flex items-center gap-3 mb-6">
                <span
                  className={`h-3 w-3 rounded-full shrink-0 ${meta.dotColor} ring-2 ring-background`}
                />
                <p className="text-base font-semibold text-foreground">{meta.label}</p>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "feature" : "features"}
                </span>
              </div>

              {/* Items or empty state */}
              <div className="pl-9">
                {items.length === 0 ? (
                  <EmptyState
                    icon={<MapIcon className="h-5 w-5" />}
                    title="No features yet"
                    description={`Add the first feature to the ${meta.label} phase.`}
                    action={
                      <Button size="sm" onClick={() => onAddToPhase(phase)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add feature
                      </Button>
                    }
                  />
                ) : (
                  <RoadmapSortableList
                    phase={phase}
                    items={items}
                    onReorder={onReorder}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
