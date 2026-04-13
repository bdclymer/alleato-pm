import { withApiGuardrails } from "@/lib/guardrails/api";
import { getPostLoginRedirect } from "@/lib/auth/post-login-router";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const GET = withApiGuardrails(
  "auth/post-login-redirect#GET",
  async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ redirect: "/" });
    }

    const redirect = await getPostLoginRedirect(supabase, user.id);
    return NextResponse.json({ redirect });
  },
);
