import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildLiveblocksUserInfo } from "@/lib/liveblocks/user-info";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  const user = await getApiRouteUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fullName = user.user_metadata?.full_name ?? user.email ?? "Unknown";
  let email = user.email ?? "";
  try {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.full_name) {
      fullName = profile.full_name;
    }

    if (profile?.email) {
      email = profile.email;
    }
  } catch {
    // Continue with auth metadata fallback
  }

  const userInfo = buildLiveblocksUserInfo({
    email,
    fullName,
    id: user.id,
  });

  const session = liveblocks.prepareSession(user.id, {
    userInfo,
  });

  // Grant full access to all alleato rooms (comments, threads, notifications)
  session.allow("alleato:*", session.FULL_ACCESS);
  // Grant full access to issue tracker rooms
  session.allow("liveblocks:examples:*", session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
