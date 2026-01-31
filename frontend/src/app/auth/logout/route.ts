import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function handleLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL(
      "/auth/login",
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
  );
}

export async function POST() {
  try {
    return await handleLogout();
  } catch (error) {
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}

export async function GET() {
  try {
    return await handleLogout();
  } catch (error) {
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
