import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  const user = await getApiRouteUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the user profile for display name
  let name = user.email ?? "Unknown";
  try {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.full_name) {
      name = profile.full_name;
    }
  } catch {
    // Continue with email as fallback name
  }

  const { status, body } = await liveblocks.identifyUser(
    user.id,
    {
      userInfo: {
        name,
      },
    },
  );

  return new Response(body, { status });
}
