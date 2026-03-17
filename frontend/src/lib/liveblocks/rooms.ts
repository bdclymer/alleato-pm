/**
 * Liveblocks room ID utilities for Alleato PM.
 *
 * Each commentable entity gets its own Liveblocks room so threads are scoped
 * to that entity. Room IDs follow the format: alleato:{entityType}:{entityId}
 *
 * Example: "alleato:rfi:42", "alleato:submittal:108", "alleato:change-order:7"
 */

const ROOM_PREFIX = "alleato:";

/** Entity types that support comments */
export type CommentableEntityType =
  | "rfi"
  | "submittal"
  | "change-order"
  | "punch-item"
  | "observation"
  | "daily-log"
  | "meeting"
  | "drawing"
  | "specification"
  | "schedule-task"
  | "schedule"
  | "budget"
  | "budget-line"
  | "commitment"
  | "direct-cost"
  | "correspondence"
  | "action-plan"
  | "inspection"
  | "issue";

/** Build a deterministic Liveblocks room ID for a given entity */
export function getRoomId(
  entityType: CommentableEntityType,
  entityId: string | number,
): string {
  return `${ROOM_PREFIX}${entityType}:${entityId}`;
}

/** Parse a room ID back into its entity type and entity ID */
export function parseRoomId(
  roomId: string,
): { entityType: string; entityId: string } | null {
  if (!roomId.startsWith(ROOM_PREFIX)) return null;

  const remainder = roomId.slice(ROOM_PREFIX.length);
  const lastColon = remainder.lastIndexOf(":");
  if (lastColon === -1) return null;

  return {
    entityType: remainder.slice(0, lastColon),
    entityId: remainder.slice(lastColon + 1),
  };
}

/**
 * Human-readable label for an entity type (used in notification UI).
 * e.g. "change-order" → "Change Order"
 */
export function entityTypeLabel(entityType: string): string {
  return entityType
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
