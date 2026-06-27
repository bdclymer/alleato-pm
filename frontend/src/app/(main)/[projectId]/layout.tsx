import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isOwnerEmail } from "@/lib/auth/owner";

/**
 * Cached authorization check per user+project pair.
 *
 * Access is membership-scoped for EVERYONE except the workspace owner (handled
 * in the layout below). A user may be attached to a project two ways — a direct
 * directory membership OR a project-role assignment — and either grants access.
 * This MUST stay in sync with the visibility rules in `GET /api/projects`, or a
 * project can appear in the portfolio list yet 404 when opened.
 *
 * Result is cached for 60 seconds to avoid redundant DB round-trips on every
 * navigation within the same project.
 */
function getProjectAuthorization(userId: string, projectId: number) {
  return unstable_cache(
    async () => {
      const serviceClient = createServiceClient();

      const { data: authLink } = await serviceClient
        .from("users_auth")
        .select("person_id")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (!authLink?.person_id) {
        return { authorized: false, reason: "no-profile" } as const;
      }

      // Active directory membership grants access.
      const { data: membership } = await serviceClient
        .from("project_directory_memberships")
        .select("id")
        .eq("person_id", authLink.person_id)
        .eq("project_id", projectId)
        .eq("status", "active")
        .maybeSingle();

      if (membership) {
        return { authorized: true, isAdmin: false } as const;
      }

      // A project-role assignment also grants access (mirrors /api/projects).
      const { data: roleMembership } = await serviceClient
        .from("project_role_members")
        .select("id, project_role:project_roles!inner(project_id)")
        .eq("person_id", authLink.person_id)
        .eq("project_roles.project_id", projectId)
        .maybeSingle();

      if (roleMembership) {
        return { authorized: true, isAdmin: false } as const;
      }

      return { authorized: false, reason: "no-project-access" } as const;
    },
    // Cache key: unique per user + project so entries never cross-contaminate.
    [`project-auth-${userId}-${projectId}`],
    { revalidate: 60 },
  )();
}

/**
 * Server-side layout guard for project-scoped pages.
 * Verifies the current user has an active membership in the requested project.
 * Only the workspace owner bypasses membership checks and reaches every project;
 * admins are membership-scoped just like everyone else.
 * Redirects to access-denied if not authorized.
 *
 * Optimizations vs the previous version:
 * - Result cached 60 s per user+project (saves ~600ms on repeat navigations)
 * - Uses the service role client to bypass RLS for reliable auth queries
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);

  if (isNaN(projectIdNum)) {
    redirect("/access-denied?reason=invalid-project");
  }

  // Read auth from the cookie JWT — zero network calls.
  const user = await getApiRouteUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Only the workspace owner sees every project. Admins are membership-scoped.
  if (isOwnerEmail(user.email)) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  const result = await getProjectAuthorization(user.id, projectIdNum);

  if (!result.authorized) {
    redirect(`/access-denied?reason=${result.reason}`);
  }

  return <div className="flex flex-1 flex-col">{children}</div>;
}
