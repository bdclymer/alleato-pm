"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type RoadmapItem, type RoadmapPhase } from "@/lib/schemas/roadmap-schema";
import { RoadmapTimelineItem } from "./roadmap-timeline-item";

interface SortableItemProps {
  item: RoadmapItem;
  phase: RoadmapPhase;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

function SortableItem({ item, phase, onEdit, onDelete, isDeleting }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <RoadmapTimelineItem
        item={item}
        phase={phase}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

interface RoadmapSortableListProps {
  phase: RoadmapPhase;
  items: RoadmapItem[];
  onReorder: (updates: Array<{ id: string; sort_order: number }>) => void;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function RoadmapSortableList({
  phase,
  items,
  onReorder,
  onEdit,
  onDelete,
  isDeleting,
}: RoadmapSortableListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);

      onReorder(reordered.map((item, idx) => ({ id: item.id, sort_order: idx })));
    },
    [items, onReorder]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem
            key={item.id}
            item={item}
            phase={phase}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
