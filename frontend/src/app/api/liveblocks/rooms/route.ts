import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import {
  parseRoomId,
  entityTypeLabel,
} from "@/lib/liveblocks/rooms";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

/**
 * Build a navigable URL from a parsed room entity type + entity ID.
 *
 * Project-scoped entities use entityId = "project-{projectId}" and live at
 * /{projectId}/{entityType}.  Record-scoped entities (RFIs, submittals, etc.)
 * use a numeric entityId and live at /{projectId}/{entityType}/{entityId} —
 * but since the room ID doesn't carry the projectId for those, we fall back to
 * a relative path that at least lands on the right tool page.
 */
function buildRoomUrl(entityType: string, entityId: string): string {
  const projectMatch = entityId.match(/^project-(\d+)$/);
  if (projectMatch) {
    // e.g. alleato:budget:project-67 → /67/budget
    return `/${projectMatch[1]}/${entityType}`;
  }
  // Numeric entity IDs don't carry the project — best we can do without DB lookup
  return `/${entityType}/${entityId}`;
}

/**
 * GET /api/liveblocks/rooms?roomIds=alleato:rfi:1,alleato:submittal:2
 *
 * Resolves Liveblocks room IDs to display metadata.
 * Called by the LiveblocksProvider's `resolveRoomsInfo` callback.
 *
 * Returns an array of { id, name, url } for each room.
 */
export async function GET(request: NextRequest) {
  const roomIdsParam = request.nextUrl.searchParams.get("roomIds");
  if (!roomIdsParam) {
    return NextResponse.json([]);
  }

  const roomIds = roomIdsParam.split(",").filter(Boolean);
  if (roomIds.length === 0) {
    return NextResponse.json([]);
  }

  const results = await Promise.allSettled(
    roomIds.map(async (roomId) => {
      const parsed = parseRoomId(roomId);
      if (!parsed) {
        return { id: roomId, name: roomId };
      }

      try {
        // Try to get room metadata from Liveblocks
        const room = await liveblocks.getRoom(roomId);
        const metaTitle =
          room.metadata?.title ??
          room.metadata?.name ??
          null;

        const title =
          typeof metaTitle === "string" && metaTitle.length > 0
            ? metaTitle
            : `${entityTypeLabel(parsed.entityType)} #${parsed.entityId}`;

        return {
          id: roomId,
          name: title,
          url: buildRoomUrl(parsed.entityType, parsed.entityId),
        };
      } catch {
        // Room may not exist yet — fall back to parsed ID
        return {
          id: roomId,
          name: `${entityTypeLabel(parsed.entityType)} #${parsed.entityId}`,
          url: buildRoomUrl(parsed.entityType, parsed.entityId),
        };
      }
    }),
  );

  const rooms = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { id: "", name: "Unknown" },
  );

  return NextResponse.json(rooms);
}
