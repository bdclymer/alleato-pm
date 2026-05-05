"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { EmptyState } from "@/components/ds";
import { ErrorState } from "@/components/ds/error-state";
import { Lightbulb } from "lucide-react";
import { BOARD_STATUSES, BOARD_STATUS_LABELS, type BoardStatus } from "@/lib/admin-feedback/constants";
import { useProductBoard } from "./use-product-board";
import { BoardColumn } from "./board-column";
import { BoardCardOverlay } from "./board-card";

interface ProductBoardClientProps {
  readonly?: boolean;
}

export function ProductBoardClient({ readonly }: ProductBoardClientProps) {
  const { items, isLoading, error, activeId, setActiveId, updateStatus } = useProductBoard();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const activeItem = items.find((i) => i.id === activeId);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const newStatus = over.id as BoardStatus;
    const item = items.find((i) => i.id === active.id);
    if (!item || item.board_status === newStatus) return;
    updateStatus(item.id, newStatus);
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-6">
        {BOARD_STATUSES.map((status) => (
          <div
            key={status}
            className="w-72 flex-none animate-pulse rounded-2xl bg-muted/60 h-64"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Couldn't load the board" description={error.message} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb />}
        title="No feature requests yet"
        description="Submit ideas via the feedback button — they'll appear here automatically."
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6">
        {BOARD_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            label={BOARD_STATUS_LABELS[status]}
            items={items.filter((i) => i.board_status === status)}
            readonly={readonly}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
        {activeItem ? <BoardCardOverlay item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
