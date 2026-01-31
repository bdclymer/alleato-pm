import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function handleLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Return JSON response instead of redirect
  // Client will handle the redirect
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function POST() {
  try {
    return await handleLogout();
  } catch (error) {
    console.error("[Logout] Error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}

export async function GET() {
  try {
    // For GET requests (direct navigation), do redirect
    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL(
        "/auth/login",
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      ),
    );
  } catch (error) {
    console.error("[Logout] Error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
