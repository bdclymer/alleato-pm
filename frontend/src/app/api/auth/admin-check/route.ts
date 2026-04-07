import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * Diagnostic endpoint to check admin status
 * GET /api/auth/admin-check
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: "Not logged in",
      }, { status: 401 });
    }

    // Check admin status in user_profiles
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, email, is_admin, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({
        authenticated: true,
        userId: user.id,
        email: user.email,
        error: "Failed to fetch user profile",
        details: profileError.message,
      }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({
        authenticated: true,
        userId: user.id,
        email: user.email,
        error: "User profile not found",
        hint: "User may need to complete profile setup",
      }, { status: 404 });
    }

    // Check if user has a person_id link
    const { data: authLink, error: authLinkError } = await supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: profile.email,
      fullName: profile.full_name,
      isAdmin: profile.is_admin === true,
      hasPersonLink: !!authLink?.person_id,
      personId: authLink?.person_id || null,
      adminAccess: {
        enabled: profile.is_admin === true,
        description: profile.is_admin
          ? "✅ You have super admin access to all projects"
          : "❌ You do not have admin access",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
