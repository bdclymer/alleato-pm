import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PermissionGuardProps {
  projectId: number;
  module: string;
  requiredPermission?: "read" | "write" | "admin";
  children: React.ReactNode;
}

/**
 * Server component that checks if the current user has a specific module
 * permission for a project. Redirects to /access-denied if not authorized.
 *
 * Usage in a page.tsx:
 *   <PermissionGuard projectId={projectIdNum} module="budget">
 *     <BudgetContent />
 *   </PermissionGuard>
 */
export async function PermissionGuard({
  projectId,
  module,
  requiredPermission = "read",
  children,
}: PermissionGuardProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Check app admin — bypass all permissions
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin === true) {
    return <>{children}</>;
  }

  // Get person_id
  const { data: authLink } = await supabase
    .from("users_auth")
    .select("person_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!authLink) {
    redirect("/access-denied?reason=no-profile");
  }

  // Get membership with template
  const { data: membership } = await supabase
    .from("project_directory_memberships")
    .select(
      `
      permission_template:permission_templates(rules_json)
    `
    )
    .eq("person_id", authLink.person_id)
    .eq("project_id", projectId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    redirect("/access-denied?reason=no-project-access");
  }

   
  const template = membership.permission_template as any;
  const rulesJson = Array.isArray(template)
    ? template[0]?.rules_json
    : template?.rules_json;
  const rules = (rulesJson as Record<string, string[]>) || {};
  const modulePerms = rules[module] || [];

  // Check hierarchical: admin > write > read
  let hasPermission = false;
  if (modulePerms.includes("admin")) {
    hasPermission = true;
  } else if (
    requiredPermission === "write" &&
    modulePerms.includes("write")
  ) {
    hasPermission = true;
  } else if (requiredPermission === "read") {
    hasPermission =
      modulePerms.includes("read") ||
      modulePerms.includes("write") ||
      modulePerms.includes("admin");
  } else {
    hasPermission = modulePerms.includes(requiredPermission);
  }

  if (!hasPermission) {
    redirect("/access-denied?reason=insufficient-permissions");
  }

  return <>{children}</>;
}
