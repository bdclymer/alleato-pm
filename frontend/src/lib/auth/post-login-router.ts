import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Determines the best redirect path after login based on user's memberships.
 *
 * - Client with 1 project → /{projectId}/client-dashboard
 * - Subcontractor with 1 project → /{projectId}/home
 * - Employee/developer with 1 project → /{projectId}/home
 * - Multiple projects → / (portfolio page, already filtered by membership)
 * - No memberships → / (will show empty state)
 */
export async function getPostLoginRedirect(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string> {
  try {
    // Look up person_id
    const { data: authLink } = await supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (!authLink) {
      return "/";
    }

    // Get active memberships with user_type
    const { data: memberships } = await supabase
      .from("project_directory_memberships")
      .select("project_id, user_type")
      .eq("person_id", authLink.person_id)
      .eq("status", "active");

    if (!memberships || memberships.length === 0) {
      return "/";
    }

    // Single project — route based on user type
    if (memberships.length === 1) {
      const m = memberships[0];
      if (m.user_type === "client") {
        return `/${m.project_id}/client-dashboard`;
      }
      return `/${m.project_id}/home`;
    }

    // Multiple projects — portfolio page (filtered by API)
    return "/";
  } catch {
    return "/";
  }
}
