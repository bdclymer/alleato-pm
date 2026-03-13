"use client";

import { type ReactNode } from "react";
import { LiveList, LiveObject } from "@liveblocks/client";
import { RoomProvider } from "@liveblocks/react/suspense";
import {
  getRoomId,
  type CommentableEntityType,
} from "@/lib/liveblocks/rooms";

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

interface EntityRoomProps {
  /** The type of entity this room is for (e.g. "rfi", "submittal") */
  entityType: CommentableEntityType;
  /** The unique ID of the entity */
  entityId: string | number;
  children: ReactNode;
}

/**
 * Wraps children in a Liveblocks RoomProvider scoped to a specific entity.
 *
 * Usage:
 * ```tsx
 * <EntityRoom entityType="rfi" entityId={rfi.id}>
 *   <EntityComments entityTitle={rfi.subject} />
 * </EntityRoom>
 * ```
 *
 * Each entity type + ID combination maps to a unique Liveblocks room,
 * so threads and presence are isolated per entity.
 */
export function EntityRoom({
  entityType,
  entityId,
  children,
}: EntityRoomProps) {
  const roomId = getRoomId(entityType, entityId);

  return (
    <RoomProvider id={roomId} initialStorage={INITIAL_STORAGE}>
      {children}
    </RoomProvider>
  );
}
