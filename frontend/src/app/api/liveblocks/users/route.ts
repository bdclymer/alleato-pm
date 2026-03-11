import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/liveblocks/users?userIds=id1,id2
 *
 * Resolves Liveblocks user IDs to display names and avatars.
 * Called by the LiveblocksProvider's `resolveUsers` callback.
 */
export async function GET(request: NextRequest) {
  const userIds = request.nextUrl.searchParams.get("userIds");
  if (!userIds) {
    return NextResponse.json([]);
  }

  const ids = userIds.split(",").filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  try {
    const supabase = createServiceClient();

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", ids);

    // Build a map for fast lookup
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p]),
    );

    // Return users in the same order as requested
    const users = ids.map((id) => {
      const profile = profileMap.get(id);
      return {
        name: profile?.full_name ?? profile?.email ?? "Unknown",
      };
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[liveblocks/users] Error resolving users:", error);
    return NextResponse.json([]);
  }
}
