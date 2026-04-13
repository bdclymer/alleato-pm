import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildLiveblocksUserInfo } from "@/lib/liveblocks/user-info";
import { AI_USER_ID, AI_USER_INFO } from "@/lib/liveblocks/ai-user";

/**
 * GET /api/liveblocks/users?userIds=id1,id2
 *
 * Resolves Liveblocks user IDs to display names and avatars.
 * Called by the LiveblocksProvider's `resolveUsers` callback.
 */
export const GET = withApiGuardrails(
  "liveblocks/users#GET",
  async ({ request }) => {
  const userIds = request.nextUrl.searchParams.get("userIds");
  if (!userIds) {
    return NextResponse.json([]);
  }

  const ids = userIds.split(",").filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  // Separate AI user from real users so we don't hit the DB for it
  const humanIds = ids.filter((id) => id !== AI_USER_ID);

  try {
    const supabase = createServiceClient();

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", humanIds.length > 0 ? humanIds : ["__none__"]);

    // Build a map for fast lookup
    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p]),
    );

    // Return users in the same order as requested, injecting AI info where needed
    const users = ids.map((id) => {
      if (id === AI_USER_ID) return AI_USER_INFO;
      const profile = profileMap.get(id);
      return buildLiveblocksUserInfo({
        email: profile?.email,
        fullName: profile?.full_name,
        id,
      });
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[liveblocks/users] Error resolving users:", error);
    return NextResponse.json([]);
  }
  },
);
