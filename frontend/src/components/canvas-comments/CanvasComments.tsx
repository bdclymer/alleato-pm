"use client";

import * as React from "react";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useThreads, useEditThreadMetadata } from "@liveblocks/react/suspense";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ThreadData } from "@liveblocks/client";
import { MessageSquarePlus, X } from "lucide-react";
import { DraggableThread } from "./DraggableThread";
import { PlaceThreadButton } from "./PlaceThreadButton";
import { useMaxZIndex } from "./useMaxZIndex";
import { cn } from "@/lib/utils";

// ── Shared room ID for canvas feedback ───────────────────────────────────────

const CANVAS_ROOM_ID = "alleato:canvas:global-feedback";

// ── Public toggle button + overlay ───────────────────────────────────────────

/**
 * Full-page canvas comments overlay. Drop into a layout — it renders:
 * - A floating toggle button (bottom-right)
 * - All existing comment pins (always visible)
 * - Comment placement mode when activated
 */
export function CanvasComments() {
  const [isActive, setIsActive] = React.useState(false);

  // Escape key deactivates
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsActive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ClientSideSuspense fallback={null}>
      <RoomProvider id={CANVAS_ROOM_ID} initialPresence={{ cursor: null }}>
        <CanvasCommentsInner
          isActive={isActive}
          onToggle={() => setIsActive((v) => !v)}
          onDeactivate={() => setIsActive(false)}
        />
      </RoomProvider>
    </ClientSideSuspense>
  );
}

// ── Inner (needs room context) ────────────────────────────────────────────────

interface CanvasCommentsInnerProps {
  isActive: boolean;
  onToggle: () => void;
  onDeactivate: () => void;
}

function CanvasCommentsInner({ isActive, onToggle, onDeactivate }: CanvasCommentsInnerProps) {
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();
  const maxZIndex = useMaxZIndex();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragEnd = React.useCallback(
    ({ active, delta }: DragEndEvent) => {
      const thread = (active.data as { current?: { thread: ThreadData } }).current?.thread;
      if (!thread) return;
      editThreadMetadata({
        threadId: thread.id,
        metadata: {
          x: (thread.metadata.x ?? 0) + delta.x,
          y: (thread.metadata.y ?? 0) + delta.y,
          zIndex: maxZIndex + 1,
        },
      });
    },
    [editThreadMetadata, maxZIndex]
  );

  // Threads that have canvas coordinates
  const canvasThreads = threads.filter(
    (t) => t.metadata.x !== undefined && t.metadata.y !== undefined
  );

  return (
    <>
      {/* ── Draggable thread pins (always visible) ──────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-[9990]">
        <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
          {canvasThreads.map((thread) => (
            <div key={thread.id} className="pointer-events-auto">
              <DraggableThread thread={thread} />
            </div>
          ))}
        </DndContext>
      </div>

      {/* ── Comment placement overlay (active only in comment mode) ─── */}
      <PlaceThreadButton isActive={isActive} onDeactivate={onDeactivate} />

      {/* ── Floating toggle button ──────────────────────────────────── */}
      <FloatingToggle isActive={isActive} onToggle={onToggle} threadCount={canvasThreads.length} />
    </>
  );
}

// ── Floating toggle button ────────────────────────────────────────────────────

function FloatingToggle({
  isActive,
  onToggle,
  threadCount,
}: {
  isActive: boolean;
  onToggle: () => void;
  threadCount: number;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-[99999] flex flex-col items-end gap-2">
      {/* Tooltip */}
      {isActive && (
        <div className="bg-foreground text-background text-xs px-2.5 py-1.5 rounded-md shadow-md whitespace-nowrap">
          Click anywhere to place a comment · <kbd className="opacity-60">Esc</kbd> to cancel
        </div>
      )}

      <button
        onClick={onToggle}
        title={isActive ? "Exit comment mode (Esc)" : "Add a comment"}
        className={cn(
          "relative flex items-center justify-center w-11 h-11 rounded-full shadow-lg transition-all duration-200",
          isActive
            ? "bg-foreground text-background scale-110"
            : "bg-background text-foreground border border-border hover:border-foreground/30 hover:shadow-xl hover:scale-105"
        )}
      >
        {isActive ? (
          <X className="w-4.5 h-4.5" />
        ) : (
          <MessageSquarePlus className="w-5 h-5" />
        )}

        {/* Badge showing comment count */}
        {!isActive && threadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full flex items-center justify-center tabular-nums">
            {threadCount > 99 ? "99+" : threadCount}
          </span>
        )}
      </button>
    </div>
  );
}
