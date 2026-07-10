"use client";

import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/media-query.css";

import * as React from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import {
  ClientSideSuspense,
  RoomProvider,
  useEditThreadMetadata,
  useSelf,
  useThreads,
} from "@liveblocks/react/suspense";
import type { ThreadData } from "@liveblocks/client";
import { CommentPin, FloatingComposer, FloatingThread } from "@liveblocks/react-ui";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DataRef,
  type DragEndEvent,
} from "@dnd-kit/core";

import { Button } from "@/components/ui/button";
import { usePageCommentsStore } from "@/lib/stores/page-comments-store";

// This overlay mounts on top of the app. A comments/connection failure must
// never take the app down with it — swallow errors and render nothing.
class SilentBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* intentionally silent — comments are non-critical */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// One shared comment room per page URL, so everyone on the same page sees the
// same pins. Path segments become a stable, colon-delimited room id.
function pageRoomId(pathname: string): string {
  const clean = (pathname || "/")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\//g, ":");
  return `alleato:page:${clean || "root"}`;
}

// Base above app chrome; per-thread zIndex is added on top of this.
const Z_BASE = 2147483000;

// Highest zIndex across all threads, so opening/dragging a pin can raise it
// above its neighbours (mirrors the Liveblocks canvas-comments example).
function useMaxZIndex(): number {
  const { threads } = useThreads();
  return React.useMemo(() => {
    let max = 0;
    for (const thread of threads) {
      const z = thread.metadata.zIndex ?? 0;
      if (z > max) max = z;
    }
    return max;
  }, [threads]);
}

// A single draggable thread: the native Liveblocks CommentPin (author avatar,
// not a chat icon) wrapped in a FloatingThread that opens the full thread — with
// its built-in reply composer — on click. Drag the pin to reposition it.
function DraggableThread({
  thread,
  maxZIndex,
}: {
  thread: ThreadData;
  maxZIndex: number;
}) {
  // Auto-open a thread the moment it's created.
  const defaultOpen = React.useMemo(
    () => Date.now() - new Date(thread.createdAt).getTime() <= 200,
    [thread.createdAt],
  );
  const [open, setOpen] = React.useState(defaultOpen);

  const { isDragging, attributes, listeners, setNodeRef, transform } =
    useDraggable({ id: thread.id, data: { thread } });

  const baseX = thread.metadata.x ?? 0;
  const baseY = thread.metadata.y ?? 0;
  const x = transform ? transform.x + baseX : baseX;
  const y = transform ? transform.y + baseY : baseY;
  const z =
    open || isDragging ? maxZIndex + 1 : thread.metadata.zIndex ?? 0;

  return (
    <FloatingThread
      thread={thread}
      open={open}
      onOpenChange={setOpen}
      side="right"
      style={{ pointerEvents: isDragging ? "none" : "auto" }}
    >
      <div
        ref={setNodeRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          zIndex: Z_BASE + z,
        }}
      >
        <CommentPin
          userId={thread.comments[0]?.userId}
          corner="top-left"
          {...listeners}
          {...attributes}
        />
      </div>
    </FloatingThread>
  );
}

// The new-comment composer, anchored to a pin at the clicked coordinates.
function NewThreadComposer({
  coords,
  maxZIndex,
  onDone,
}: {
  coords: { x: number; y: number };
  maxZIndex: number;
  onDone: () => void;
}) {
  const creatorId = useSelf((me) => me.id);
  return (
    <FloatingComposer
      defaultOpen
      metadata={{ x: coords.x, y: coords.y, zIndex: maxZIndex + 1 }}
      onComposerSubmit={onDone}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate3d(${coords.x}px, ${coords.y}px, 0)`,
          zIndex: Z_BASE + maxZIndex + 1,
        }}
      >
        <CommentPin userId={creatorId ?? undefined} corner="top-left" />
      </div>
    </FloatingComposer>
  );
}

// Rendered while the comments layer is active. Existing pins are always visible,
// clickable, and draggable (view mode); the page stays usable. Only after "Add
// comment" does the page become a click-to-place surface, until one is placed.
function OverlayInner() {
  const setActive = usePageCommentsStore((state) => state.setActive);
  const { threads } = useThreads();
  const editThreadMetadata = useEditThreadMetadata();
  const maxZIndex = useMaxZIndex();
  const [mode, setMode] = React.useState<"view" | "placing" | "placed">("view");
  const [coords, setCoords] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const pins = threads.filter(
    (thread) =>
      typeof thread.metadata.x === "number" &&
      typeof thread.metadata.y === "number",
  );

  // A tiny drag threshold keeps a plain click on the pin (open thread) distinct
  // from a drag (reposition).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 3 } }),
  );

  const onDragEnd = React.useCallback(
    ({ active, delta }: DragEndEvent) => {
      const thread = (active.data as DataRef<{ thread: ThreadData }>).current
        ?.thread;
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
    [editThreadMetadata, maxZIndex],
  );

  const exit = React.useCallback(() => {
    setMode("view");
    setActive(false);
  }, [setActive]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Esc backs out of placement first, then closes the layer.
      setMode((current) => {
        if (current !== "view") return "view";
        setActive(false);
        return current;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActive]);

  const overlay = (
    <>
      {/* Toolbar: count, add action, and exit. */}
      <div
        className="fixed left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg"
        style={{ zIndex: Z_BASE + 100000 }}
      >
        {mode === "placing" ? (
          <>
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Click anywhere to place your comment
          </>
        ) : (
          <>
            <span>
              {pins.length === 0
                ? "No comments on this page yet"
                : `${pins.length} comment${pins.length === 1 ? "" : "s"} on this page`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("placing")}
              className="ml-1 h-6 gap-1 rounded-full px-2 text-background hover:bg-background/20 hover:text-background"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Add comment
            </Button>
          </>
        )}
        <span className="opacity-60">· Esc</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close comments"
          onClick={exit}
          className="ml-1 h-5 w-5 rounded-full text-background hover:bg-background/20 hover:text-background"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Existing pins — always visible, clickable, and draggable. */}
      <DndContext onDragEnd={onDragEnd} sensors={sensors}>
        {pins.map((thread) => (
          <DraggableThread
            key={thread.id}
            thread={thread}
            maxZIndex={maxZIndex}
          />
        ))}
      </DndContext>

      {/* Placement surface — only while adding, so normal page clicks are never
          intercepted in view mode. */}
      {mode === "placing" ? (
        <div
          className="bg-foreground/5"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: Z_BASE + 50000,
            cursor: "crosshair",
          }}
          onClick={(event) => {
            setCoords({
              x: event.clientX + window.scrollX,
              y: event.clientY + window.scrollY,
            });
            setMode("placed");
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            setMode("view");
          }}
        />
      ) : null}

      {/* The new-comment composer at the placed location. */}
      {mode === "placed" ? (
        <NewThreadComposer
          coords={coords}
          maxZIndex={maxZIndex}
          onDone={() => setMode("view")}
        />
      ) : null}
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

// Global page-comments layer, backed by Liveblocks, scoped to the current page
// URL. Toggled from the header comment icon (usePageCommentsStore). Consumes the
// app-level CollaborationProvider (mounted in the (main) layout) and adds only a
// RoomProvider for the current page's room while the layer is active. Gated by
// NEXT_PUBLIC_PAGE_COMMENTS.
export function PageCommentsOverlay() {
  const pathname = usePathname();
  const active = usePageCommentsStore((state) => state.active);

  if (process.env.NEXT_PUBLIC_PAGE_COMMENTS !== "on") return null;
  if (!active) return null;

  return (
    <SilentBoundary>
      <RoomProvider id={pageRoomId(pathname)}>
        <ClientSideSuspense fallback={null}>
          <OverlayInner />
        </ClientSideSuspense>
      </RoomProvider>
    </SilentBoundary>
  );
}
