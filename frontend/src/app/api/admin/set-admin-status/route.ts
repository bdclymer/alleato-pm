import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify the requesting user is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requesting user is admin
    const { data: requestingUserProfile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!requestingUserProfile?.is_admin) {
      return NextResponse.json(
        { error: "Only admins can modify admin status" },
        { status: 403 }
      );
    }

    // Get the target user's auth_user_id and new admin status
    const body = await request.json();
    const { auth_user_id, is_admin } = body;

    if (!auth_user_id || typeof is_admin !== "boolean") {
      return NextResponse.json(
        { error: "auth_user_id and is_admin are required" },
        { status: 400 }
      );
    }

    // Update the user_profiles table
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ is_admin, updated_at: new Date().toISOString() })
      .eq("id", auth_user_id);

    if (updateError) {
      console.error("[SetAdminStatus] Error updating profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update admin status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${is_admin ? "granted" : "removed"} admin access`,
    });
  } catch (error) {
    console.error("[SetAdminStatus] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
