"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useOthers, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { LiveList, LiveObject } from "@liveblocks/client";
import { getRoomId } from "@/lib/liveblocks/rooms";
import { useEntityContext } from "@/components/header/comments-sidebar";

// ── Cursor SVG ────────────────────────────────────────────────────────────────

function CursorSvg({ color }: { color: string }) {
  return (
    <svg
      width="18"
      height="22"
      viewBox="0 0 18 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-sm"
    >
      <path
        d="M0.716636 0.384401L17.3333 8.45107L9.19997 10.6344L5.19997 18.884L0.716636 0.384401Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Single cursor ─────────────────────────────────────────────────────────────

interface CursorProps {
  x: number;
  y: number;
  name?: string | null;
  color: string;
}

function Cursor({ x, y, name, color }: CursorProps) {
  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, x, y }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        // Smooth spring for position
        x: { type: "spring", stiffness: 500, damping: 40, restDelta: 0.01 },
        y: { type: "spring", stiffness: 500, damping: 40, restDelta: 0.01 },
        // Snap for opacity/scale
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 },
      }}
    >
      <CursorSvg color={color} />
      {name && (
        <div
          className="absolute left-4 top-4 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white leading-tight"
          style={{ backgroundColor: color }}
        >
          {name}
        </div>
      )}
    </motion.div>
  );
}

// ── Inner (needs room context) ────────────────────────────────────────────────

function LiveCursorsInner() {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      updateMyPresence({ cursor: { x: e.clientX, y: e.clientY } });
    },
    [updateMyPresence]
  );

  const handleMouseLeave = React.useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  React.useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  const activeCursors = others.filter((o) => o.presence.cursor != null);

  return (
    <AnimatePresence>
      {activeCursors.map((user) => {
        const cursor = user.presence.cursor!;
        const color = user.info?.color ?? "#6366f1";
        const name = user.info?.name ?? null;
        return (
          <Cursor
            key={user.connectionId}
            x={cursor.x}
            y={cursor.y}
            name={name}
            color={color}
          />
        );
      })}
    </AnimatePresence>
  );
}

// ── Initial storage (matches liveblocks.config.ts) ───────────────────────────

const INITIAL_STORAGE = {
  meta: new LiveObject({ title: "" }),
  properties: new LiveObject({
    progress: "none" as const,
    priority: "none" as const,
    assignedTo: "none",
  }),
  labels: new LiveList<string>([]),
  links: new LiveList<string>([]),
};

// ── Public component ──────────────────────────────────────────────────────────

/**
 * Renders other users' cursors as a fixed overlay over the entire viewport.
 * Tracks the local user's cursor and broadcasts it via Liveblocks presence.
 * Scoped to the same entity room as the avatar stack + comments.
 */
export function LiveCursors() {
  const entityContext = useEntityContext();

  if (!entityContext) return null;

  const roomId = getRoomId(entityContext.entityType, entityContext.entityId);

  return (
    <ClientSideSuspense fallback={null}>
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null }}
        initialStorage={INITIAL_STORAGE}
      >
        <LiveCursorsInner />
      </RoomProvider>
    </ClientSideSuspense>
  );
}
