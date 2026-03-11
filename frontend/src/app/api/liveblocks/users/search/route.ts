import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/liveblocks/users/search?text=john
 *
 * Returns user IDs matching the search text.
 * Called by the LiveblocksProvider's `resolveMentionSuggestions` callback.
 */
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? "";

  try {
    const supabase = createServiceClient();

    let query = supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .limit(10);

    if (text.trim().length > 0) {
      // Search by name or email (case-insensitive)
      query = query.or(
        `full_name.ilike.%${text}%,email.ilike.%${text}%`,
      );
    }

    const { data: profiles } = await query;

    // Return just the user IDs — Liveblocks resolves display info via resolveUsers
    const userIds = (profiles ?? []).map((p) => p.id);

    return NextResponse.json(userIds);
  } catch (error) {
    console.error("[liveblocks/users/search] Error:", error);
    return NextResponse.json([]);
  }
}
