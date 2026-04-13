import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildLiveblocksUserInfo } from "@/lib/liveblocks/user-info";

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY?.trim();
  if (!secret) {
    throw new GuardrailError({
      code: "MISSING_ENV_VAR",
      where: "/api/liveblocks-auth#createLiveblocksClient",
      message: "LIVEBLOCKS_SECRET_KEY is required.",
      status: 500,
      details: { missing: ["LIVEBLOCKS_SECRET_KEY"] },
    });
  }

  return new Liveblocks({ secret });
}

export const POST = withApiGuardrails("/api/liveblocks-auth#POST", async () => {
  const liveblocks = createLiveblocksClient();

  const user = await getApiRouteUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/liveblocks-auth#POST",
      message: "Unauthorized request.",
      status: 401,
    });
  }

  let fullName = (user as Record<string, any>).user_metadata?.full_name ?? user.email ?? "Unknown";
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
});
