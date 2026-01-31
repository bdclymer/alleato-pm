import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPostLoginRedirect } from "@/lib/auth/post-login-router";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ redirect: "/" });
    }

    const redirect = await getPostLoginRedirect(supabase, user.id);
    return NextResponse.json({ redirect });
  } catch {
    return NextResponse.json({ redirect: "/" });
  }
}
