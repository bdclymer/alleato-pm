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
import { Button } from "@/components/ui/button";
import { Lightbulb, LayoutGrid, Table2 } from "lucide-react";
import { ExpandableSearch } from "@/components/tables/unified/table-toolbar";
import { cn } from "@/lib/utils";
import { BOARD_STATUSES, BOARD_STATUS_LABELS, type BoardStatus } from "@/lib/admin-feedback/constants";
import { useProductBoard, type BoardItem } from "./use-product-board";
import { BoardColumn } from "./board-column";
import { BoardCard, BoardCardOverlay } from "./board-card";
import { BoardFilterBar, type BoardFilters } from "./board-filter-bar";
import { loadCardViewSettings, saveCardViewSettings, type CardViewSettings } from "./card-view-settings";
import { BoardUnifiedTable } from "./board-unified-table";

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

type ViewMode = "board" | "table";

export function ProductBoardClient({ readonly }: ProductBoardClientProps) {
  const { items, isLoading, error, activeId, setActiveId, updateStatus, reorder } = useProductBoard();
  const [filters, setFilters] = useState<BoardFilters>({});
  const [cardSettings, setCardSettings] = useState<CardViewSettings>(loadCardViewSettings);
  const [viewMode, setViewMode] = useState<ViewMode>("board");

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

  const viewToggle = (
    <div className="flex items-center rounded-lg bg-muted p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("board")}
        className={cn(
          "h-7 gap-1.5 px-2.5 text-xs",
          viewMode === "board"
            ? "bg-background text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Board
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("table")}
        className={cn(
          "h-7 gap-1.5 px-2.5 text-xs",
          viewMode === "table"
            ? "bg-background text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Table2 className="h-3.5 w-3.5" />
        Table
      </Button>
    </div>
  );

  const toolbar = (
    <div className="flex items-center gap-1">
      {viewToggle}
      <div className="flex-1" />
      <ExpandableSearch
        value={filters.search ?? ""}
        onChange={(v) => setFilters((f) => ({ ...f, search: v || undefined }))}
        placeholder="Search cards…"
      />
      <BoardFilterBar
        items={items}
        filters={filters}
        onChange={setFilters}
        cardSettings={cardSettings}
        onCardSettingsChange={updateCardSettings}
      />
    </div>
  );

  // Table view — UnifiedTablePage handles its own loading/error/empty states
  if (viewMode === "table") {
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        <BoardUnifiedTable
          items={items}
          isLoading={isLoading}
          error={error instanceof Error ? error : error ? new Error("Failed to load board") : null}
        />
      </div>
    );
  }

  // Board view early returns
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        <div className="grid grid-cols-4 gap-4 pb-6">
          {BOARD_STATUSES.map((status) => (
            <div key={status} className="animate-pulse rounded-2xl bg-muted/60 h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState title="Couldn't load the board" description={error.message} />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        <EmptyState
          icon={<Lightbulb />}
          title="No feature requests yet"
          description="Submit ideas via the feedback button — they'll appear here automatically."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar}

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
