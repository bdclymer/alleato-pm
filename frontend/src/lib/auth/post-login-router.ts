import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type PostLoginSupabaseClient = Pick<SupabaseClient<Database>, "from">;

/**
 * Landing path for a single membership, based on its user_type.
 * Mirrors the redirect logic in app/(main)/[projectId]/home/page.tsx so a
 * subcontractor lands directly on /my-work (their only accessible surface)
 * rather than bouncing through /home first.
 */
function landingForMembership(projectId: number, userType: string | null): string {
  if (userType === "client") {
    return `/${projectId}/client-dashboard`;
  }
  if (userType === "subcontractor") {
    return `/${projectId}/my-work`;
  }
  return `/${projectId}/home`;
}

/**
 * If a path targets a project-scoped route (/{projectId}/...), return that
 * numeric projectId. Otherwise null (company-wide routes like /, /ai, /projects
 * have their own guards and are always safe to honor).
 */
function projectIdFromPath(path: string): number | null {
  const firstSegment = path.replace(/^\/+/, "").split(/[/?#]/, 1)[0];
  if (!firstSegment || !/^\d+$/.test(firstSegment)) {
    return null;
  }
  return parseInt(firstSegment, 10);
}

/**
 * Determines the best redirect path after login based on the user's memberships.
 *
 * - Client with 1 project → /{projectId}/client-dashboard
 * - Subcontractor with 1 project → /{projectId}/my-work
 * - Employee/developer with 1 project → /{projectId}/home
 * - Multiple projects → / (portfolio page, already filtered by membership)
 * - No memberships → / (will show empty state)
 *
 * `callbackUrl` (the page the user was trying to reach before login) is honored
 * ONLY when the user can actually access it. A callbackUrl pointing at a project
 * the user is not an active member of is dropped — otherwise login would shove
 * them straight into an Access Denied wall (e.g. a subcontractor invited to one
 * project landing on whatever project the browser was last viewing).
 */
export async function getPostLoginRedirect(
  supabase: PostLoginSupabaseClient,
  userId: string,
  callbackUrl?: string | null,
): Promise<string> {
  try {
    // Admins can reach any project — honor their callbackUrl as-is.
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();
    const isAdmin = profile?.is_admin === true;

    // Look up person_id
    const { data: authLink } = await supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    // Get active memberships with user_type (none for admins is fine)
    const memberships = authLink
      ? (
          await supabase
            .from("project_directory_memberships")
            .select("project_id, user_type")
            .eq("person_id", authLink.person_id)
            .eq("status", "active")
        ).data ?? []
      : [];

    const memberProjectIds = new Set(memberships.map((m) => m.project_id));

    // Honor an explicit callbackUrl only when the user can access it.
    if (callbackUrl && callbackUrl !== "/") {
      const targetProjectId = projectIdFromPath(callbackUrl);
      const isProjectScoped = targetProjectId !== null;
      const canAccessTarget =
        !isProjectScoped || isAdmin || memberProjectIds.has(targetProjectId);
      if (canAccessTarget) {
        return callbackUrl;
      }
      // Otherwise fall through to a membership-based default below.
    }

    if (isAdmin) {
      // Admin with no specific destination → portfolio.
      return "/";
    }

    if (memberships.length === 0) {
      return "/";
    }

    if (memberships.length === 1) {
      const m = memberships[0];
      return landingForMembership(m.project_id, m.user_type);
    }

    // Multiple projects — portfolio page (filtered by API)
    return "/";
  } catch {
    return "/";
  }
}
