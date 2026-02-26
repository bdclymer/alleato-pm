import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface ProjectMembership {
  membershipId: string;
  personId: string;
  authUserId: string;
  projectId: number;
  permissionTemplateId: string | null;
}

interface AuthGuardResult {
  membership: ProjectMembership;
  serviceClient: ReturnType<typeof createServiceClient>;
}

async function resolvePersonIdFromAuth(
  serviceClient: ReturnType<typeof createServiceClient>,
  user: { id: string; email?: string | null },
): Promise<string | null> {
  const { data: authLink, error: authLinkError } = await serviceClient
    .from("users_auth")
    .select("person_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!authLinkError && authLink?.person_id) {
    return authLink.person_id;
  }

  // Backward-compatibility fallback for accounts created before users_auth linkage.
  const { data: personByAuthId, error: personByAuthIdError } = await serviceClient
    .from("people")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!personByAuthIdError && personByAuthId?.id) {
    return personByAuthId.id;
  }

  if (!user.email) {
    return null;
  }

  // Last-resort fallback for environments where auth_user_id was never backfilled.
  const normalizedEmail = user.email.toLowerCase();
  const { data: personByEmail, error: personByEmailError } = await serviceClient
    .from("people")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (!personByEmailError && personByEmail?.id) {
    return personByEmail.id;
  }

  return null;
}

/**
 * Verifies the current user is authenticated AND is an active member of the specified project.
 * Returns the service client only after authorization is confirmed.
 *
 * Use this in any API route that needs `createServiceClient()` for a project-scoped operation.
 *
 * @throws Returns a NextResponse with 401 or 403 status on failure.
 */
export async function verifyProjectAccess(
  projectId: number,
): Promise<AuthGuardResult | NextResponse> {
  // Step 1: Verify authentication
  const authSupabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 2: Look up person_id from auth user
  const serviceClient = createServiceClient();
  const personId = await resolvePersonIdFromAuth(serviceClient, {
    id: user.id,
    email: user.email,
  });

  if (!personId) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 403 },
    );
  }

  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin === true) {
    return {
      membership: {
        membershipId: `super-admin:${user.id}:${projectId}`,
        personId,
        authUserId: user.id,
        projectId,
        permissionTemplateId: null,
      },
      serviceClient,
    };
  }

  // Step 3: Verify active membership in the project
  const { data: membership, error: membershipError } = await serviceClient
    .from("project_directory_memberships")
    .select("id, person_id, project_id, permission_template_id")
    .eq("person_id", personId)
    .eq("project_id", projectId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json(
      { error: "You do not have access to this project" },
      { status: 403 },
    );
  }

  return {
    membership: {
      membershipId: membership.id,
      personId: membership.person_id,
      authUserId: user.id,
      projectId: membership.project_id,
      permissionTemplateId: membership.permission_template_id,
    },
    serviceClient,
  };
}

/**
 * Verifies the user has a specific module-level permission for a project.
 * Extends verifyProjectAccess with permission template checks.
 *
 * App admins bypass all permission checks.
 */
export async function verifyProjectPermission(
  projectId: number,
  module: string,
  requiredLevel: "read" | "write" | "admin" = "read",
): Promise<AuthGuardResult | NextResponse> {
  const result = await verifyProjectAccess(projectId);
  if (isAuthError(result)) return result;

  const { membership, serviceClient } = result;

  // Check if user is an app admin (bypass all permission checks)
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("is_admin")
    .eq("id", membership.authUserId)
    .maybeSingle();

  if (profile?.is_admin === true) {
    return result;
  }

  // No template assigned — deny access
  if (!membership.permissionTemplateId) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  // Fetch the permission template
  const { data: template } = await serviceClient
    .from("permission_templates")
    .select("rules_json")
    .eq("id", membership.permissionTemplateId)
    .maybeSingle();

  if (!template?.rules_json) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  const rules = template.rules_json as Record<string, string[]>;
  const modulePerms = rules[module] || [];

  // Check hierarchical permissions: admin > write > read
  let hasPermission = false;
  if (modulePerms.includes("admin")) {
    hasPermission = true;
  } else if (requiredLevel === "write" && modulePerms.includes("write")) {
    hasPermission = true;
  } else if (requiredLevel === "read") {
    hasPermission =
      modulePerms.includes("read") ||
      modulePerms.includes("write") ||
      modulePerms.includes("admin");
  } else {
    hasPermission = modulePerms.includes(requiredLevel);
  }

  if (!hasPermission) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  return result;
}

/**
 * Type guard to check if verifyProjectAccess returned an error response.
 */
export function isAuthError(
  result: AuthGuardResult | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
