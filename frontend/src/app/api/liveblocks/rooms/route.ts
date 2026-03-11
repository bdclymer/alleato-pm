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
          url: `/${parsed.entityType}/${parsed.entityId}`,
        };
      } catch {
        // Room may not exist yet — fall back to parsed ID
        return {
          id: roomId,
          name: `${entityTypeLabel(parsed.entityType)} #${parsed.entityId}`,
          url: `/${parsed.entityType}/${parsed.entityId}`,
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
