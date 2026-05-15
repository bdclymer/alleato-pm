import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getIsAdmin } from "@/lib/auth/current-user";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * Diagnostic endpoint to check admin status
 * GET /api/auth/admin-check
 */
export const GET = withApiGuardrails(
  "auth/admin-check#GET",
  async () => {
  
    const supabase = await createClient();

    // Use deduplicated getCurrentUser() — avoids redundant getUser() in the same request
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        error: "Not logged in",
      }, { status: 401 });
    }

    // Read is_admin from JWT claim — no DB round-trip needed.
    // NOTE: until the custom_access_token_hook is registered in Supabase Dashboard,
    // this will always return false. See docs/deployment/AUTH-JWT-HOOK-RUNBOOK.md.
    const isAdmin = await getIsAdmin();

    // Check if user has a person_id link
    const { data: authLink } = await supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      isAdmin,
      hasPersonLink: !!authLink?.person_id,
      personId: authLink?.person_id || null,
      adminAccess: {
        enabled: isAdmin,
        description: isAdmin
          ? "You have super admin access to all projects"
          : "You do not have admin access",
        source: "jwt_claim",
      },
    });
    },
);
