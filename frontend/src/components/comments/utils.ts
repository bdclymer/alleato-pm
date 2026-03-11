import { parseRoomId } from "@/lib/liveblocks/rooms";

/**
 * Extract entity type and entity ID from a Liveblocks room ID.
 * Thin wrapper over parseRoomId for use inside comment components.
 */
export function getIssueIdFromRoom(
  roomId: string,
): { entityType: string; entityId: string } | null {
  return parseRoomId(roomId);
}
