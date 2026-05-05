"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { EmptyState } from "@/components/ds";
import { ErrorState } from "@/components/ds/error-state";
import { Lightbulb } from "lucide-react";
import { BOARD_STATUSES, BOARD_STATUS_LABELS, type BoardStatus } from "@/lib/admin-feedback/constants";
import { useProductBoard, type BoardItem } from "./use-product-board";
import { BoardColumn } from "./board-column";
import { BoardCard, BoardCardOverlay } from "./board-card";
import { BoardFilterBar, type BoardFilters } from "./board-filter-bar";
import { loadCardViewSettings, saveCardViewSettings, type CardViewSettings } from "./card-view-settings";

interface ProductBoardClientProps {
  readonly?: boolean;
}

function filterItems(items: BoardItem[], filters: BoardFilters): BoardItem[] {
  return items.filter((item) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.comment?.toLowerCase().includes(q)) return false;
    }
    if (filters.assigneeId && item.assignee_id !== filters.assigneeId) return false;
    if (filters.priority && item.severity !== filters.priority) return false;
    if (filters.labelColor) {
      const meta = (item.metadata as { labels?: { color: string }[] } | null) ?? {};
      if (!meta.labels?.some((l) => l.color === filters.labelColor)) return false;
    }
    return true;
  });
}

export function ProductBoardClient({ readonly }: ProductBoardClientProps) {
  const { items, isLoading, error, activeId, setActiveId, updateStatus, reorder } = useProductBoard();
  const [filters, setFilters] = useState<BoardFilters>({});
  const [cardSettings, setCardSettings] = useState<CardViewSettings>(loadCardViewSettings);

  function updateCardSettings(patch: Partial<CardViewSettings>) {
    setCardSettings((prev) => {
      const next = { ...prev, ...patch };
      saveCardViewSettings(next);
      return next;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const filteredItems = useMemo(() => filterItems(items, filters), [items, filters]);
  const activeItem = items.find((i) => i.id === activeId);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const draggedItem = items.find((i) => i.id === active.id);
    if (!draggedItem) return;

    // Resolve target column — over.id is either a BoardStatus or a card id
    let targetStatus: BoardStatus;
    let overItem: BoardItem | undefined;

    if ((BOARD_STATUSES as readonly string[]).includes(over.id as string)) {
      targetStatus = over.id as BoardStatus;
    } else {
      overItem = items.find((i) => i.id === over.id);
      if (!overItem) return;
      targetStatus = overItem.board_status;
    }

    const sameColumn = draggedItem.board_status === targetStatus;
    const columnItems = items
      .filter((i) => i.board_status === targetStatus)
      .sort((a, b) => a.position - b.position);

    if (sameColumn && overItem) {
      // Within-column reorder
      const oldIndex = columnItems.findIndex((i) => i.id === active.id);
      const newIndex = columnItems.findIndex((i) => i.id === over.id);
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(columnItems, oldIndex, newIndex);
      const moved = reordered[newIndex];
      const prev = reordered[newIndex - 1];
      const next = reordered[newIndex + 1];

      let newPosition: number;
      if (!prev) newPosition = (next?.position ?? 1000) / 2;
      else if (!next) newPosition = (prev.position ?? 0) + 1000;
      else newPosition = (prev.position + next.position) / 2;

      reorder(moved.id, newPosition);
    } else {
      // Cross-column move — place at bottom of target column
      const bottomPosition = columnItems.length > 0
        ? columnItems[columnItems.length - 1].position + 1000
        : 1000;
      updateStatus(draggedItem.id, targetStatus, bottomPosition);
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4 pb-6">
        {BOARD_STATUSES.map((status) => (
          <div key={status} className="animate-pulse rounded-2xl bg-muted/60 h-64" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState title="Couldn't load the board" description={error.message} />;

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
    <div className="flex flex-col gap-4">
      <BoardFilterBar items={items} filters={filters} onChange={setFilters} cardSettings={cardSettings} onCardSettingsChange={updateCardSettings} />

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-4 pb-6">
          {BOARD_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              label={BOARD_STATUS_LABELS[status]}
              items={filteredItems
                .filter((i) => i.board_status === status)
                .sort((a, b) => a.position - b.position)}
              allItems={items
                .filter((i) => i.board_status === status)
                .sort((a, b) => a.position - b.position)}
              readonly={readonly}
              cardSettings={cardSettings}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
          {activeItem ? <BoardCardOverlay item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
