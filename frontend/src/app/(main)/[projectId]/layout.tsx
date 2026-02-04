import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Server-side layout guard for project-scoped pages.
 * Verifies the current user has an active membership in the requested project.
 * Super admins bypass all checks and get access to all projects.
 * Redirects to access-denied if not authorized.
 *
 * Uses the service role client for authorization queries to avoid RLS issues
 * where the anon key client can't reliably read user_profiles in production.
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

  // Anon client for authentication (verifies JWT from cookie)
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Service role client for authorization queries (bypasses RLS)
  const serviceClient = createServiceClient();

  // CHECK FOR SUPER ADMIN FIRST - they bypass all other checks
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  // If user is a super admin, grant access immediately
  if (profile?.is_admin === true) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  // For non-admin users, verify profile and project membership
  // Look up person_id from auth user
  const { data: authLink } = await serviceClient
    .from("users_auth")
    .select("person_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!authLink) {
    redirect("/access-denied?reason=no-profile");
  }

  // Check for active membership in this project
  const { data: membership } = await serviceClient
    .from("project_directory_memberships")
    .select("id, permission_template_id, user_type")
    .eq("person_id", authLink.person_id)
    .eq("project_id", projectIdNum)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    redirect("/access-denied?reason=no-project-access");
  }

  return <div className="flex flex-1 flex-col">{children}</div>;
}
