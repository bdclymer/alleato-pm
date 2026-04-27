"use client";

import { useState, useCallback } from "react";
import { PageShell } from "@/components/layout";
import { ErrorState } from "@/components/ds/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRoadmapItemsByPhase,
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
  useDeleteRoadmapItem,
  useReorderRoadmapItems,
} from "@/hooks/use-roadmap-items";
import {
  ROADMAP_PHASES,
  type RoadmapPhase,
  type RoadmapItem,
  type CreateRoadmapItemInput,
} from "@/lib/schemas/roadmap-schema";
import { RoadmapPhaseCard } from "@/components/domain/roadmap/roadmap-phase-card";
import { RoadmapTimeline } from "@/components/domain/roadmap/roadmap-timeline";
import { RoadmapItemForm } from "@/components/domain/roadmap/roadmap-item-form";

export default function RoadmapPage() {
  const { grouped, isLoading, isError, error } = useRoadmapItemsByPhase();
  const createItem = useCreateRoadmapItem();
  const updateItem = useUpdateRoadmapItem();
  const deleteItem = useDeleteRoadmapItem();
  const reorderItems = useReorderRoadmapItems();

  const [activePhase, setActivePhase] = useState<RoadmapPhase>("in_progress");
  const [formOpen, setFormOpen] = useState(false);
  const [formPhase, setFormPhase] = useState<RoadmapPhase>("immediate");
  const [editingItem, setEditingItem] = useState<RoadmapItem | undefined>(undefined);

  const scrollToPhase = useCallback((phase: RoadmapPhase) => {
    setActivePhase(phase);
    document.getElementById(`phase-${phase}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleAddToPhase = useCallback((phase: RoadmapPhase) => {
    setEditingItem(undefined);
    setFormPhase(phase);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((item: RoadmapItem) => {
    setEditingItem(item);
    setFormPhase(item.phase as RoadmapPhase);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteItem.mutateAsync(id);
    },
    [deleteItem]
  );

  const handleFormSubmit = useCallback(
    async (data: CreateRoadmapItemInput) => {
      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, ...data });
      } else {
        await createItem.mutateAsync(data);
      }
    },
    [editingItem, createItem, updateItem]
  );

  const handleReorder = useCallback(
    (updates: Array<{ id: string; sort_order: number }>) => {
      reorderItems.mutate(updates);
    },
    [reorderItems]
  );

  if (isError) {
    return (
      <PageShell variant="content" title="Roadmap">
        <ErrorState
          title="Could not load roadmap"
          description={error?.message ?? "An unexpected error occurred."}
        />
      </PageShell>
    );
  }

  return (
    <PageShell variant="content" title="Roadmap">
      <div className="flex gap-8 min-h-0">
        {/* Left: Phase cards */}
        <aside className="w-64 shrink-0 flex flex-col gap-3 pt-1">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))
            : ROADMAP_PHASES.map((phase) => (
                <RoadmapPhaseCard
                  key={phase}
                  phase={phase}
                  itemCount={grouped[phase].length}
                  isActive={activePhase === phase}
                  onClick={() => scrollToPhase(phase)}
                  onAddClick={() => handleAddToPhase(phase)}
                />
              ))}
        </aside>

        {/* Right: Timeline */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <RoadmapTimeline
              grouped={grouped}
              onAddToPhase={handleAddToPhase}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReorder={handleReorder}
              isDeleting={deleteItem.isPending}
            />
          )}
        </main>
      </div>

      <RoadmapItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultPhase={formPhase}
        existingItem={editingItem}
        onSubmit={handleFormSubmit}
        isPending={createItem.isPending || updateItem.isPending}
      />
    </PageShell>
  );
}
