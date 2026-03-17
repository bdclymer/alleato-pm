import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { AI_USER_ID, AI_USER_INFO } from "@/lib/liveblocks/ai-user";

/**
 * GET /api/liveblocks/users/search?text=john
 *
 * Returns user IDs matching the search text.
 * Called by the LiveblocksProvider's `resolveMentionSuggestions` callback.
 */
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? "";
  const normalised = text.trim().toLowerCase();

  // Always surface the AI user when the query matches its name (or is empty)
  const aiMatches =
    normalised.length === 0 ||
    AI_USER_INFO.name.toLowerCase().includes(normalised);

  try {
    const supabase = createServiceClient();

    let query = supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .limit(10);

    if (normalised.length > 0) {
      query = query.or(
        `full_name.ilike.%${text}%,email.ilike.%${text}%`,
      );
    }

    const { data: profiles } = await query;

    // Human user IDs
    const humanIds = (profiles ?? []).map((p) => p.id);

    // Prepend AI so it always shows at the top of the mention picker
    const userIds = aiMatches
      ? [AI_USER_ID, ...humanIds]
      : humanIds;

    return NextResponse.json(userIds);
  } catch (error) {
    console.error("[liveblocks/users/search] Error:", error);
    return NextResponse.json([]);
  }
}
