import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side layout guard for project-scoped pages.
 * Verifies the current user has an active membership in the requested project.
 * Redirects to access-denied if not authorized.
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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Look up person_id from auth user
  const { data: authLink } = await supabase
    .from("users_auth")
    .select("person_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!authLink) {
    redirect("/access-denied?reason=no-profile");
  }

  // Check for active membership in this project
  const { data: membership } = await supabase
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
