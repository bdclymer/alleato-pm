import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/dev/make-admin
 *
 * Sets the currently logged-in user as an app admin.
 * Only available in development mode.
 *
 * This creates/updates the user_profiles row with is_admin = true,
 * which causes PermissionService.hasPermission to bypass all checks.
 */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 403 },
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated. Log in first." },
        { status: 401 },
      );
    }

    // Upsert user_profiles with is_admin = true
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: user.id,
          email: user.email || "",
          is_admin: true,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to set admin: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${user.email} is now an app admin`,
      user_id: user.id,
      profile: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/dev/make-admin
 *
 * Check current admin status.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 403 },
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      is_admin: profile?.is_admin || false,
      profile,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
