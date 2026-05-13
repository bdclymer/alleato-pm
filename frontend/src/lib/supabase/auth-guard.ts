import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface ProjectMembership {
  membershipId: string;
  personId: string;
  authUserId: string;
  projectId: number;
  permissionTemplateId: string | null;
  userType: string | null;
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
    // Backfill users_auth link for future lookups
    await serviceClient
      .from("users_auth")
      .upsert(
        { auth_user_id: user.id, person_id: personByEmail.id },
        { onConflict: "auth_user_id" },
      );
    return personByEmail.id;
  }

  // No matching person — auto-provision one so authenticated users always have
  // a valid people row (required for FK columns like submitted_by, reviewed_by).
  const emailLocal = user.email.split("@")[0] || "User";
  const nameParts = emailLocal.split(/[._-]+/).filter(Boolean);
  const firstName = nameParts[0] ? nameParts[0][0].toUpperCase() + nameParts[0].slice(1) : "User";
  const lastName = nameParts[1]
    ? nameParts[1][0].toUpperCase() + nameParts[1].slice(1)
    : "Account";

  const { data: created, error: createError } = await serviceClient
    .from("people")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: normalizedEmail,
      person_type: "employee",
      auth_user_id: user.id,
    })
    .select("id")
    .single();

  if (createError || !created) {
    return null;
  }

  await serviceClient
    .from("users_auth")
    .upsert(
      { auth_user_id: user.id, person_id: created.id },
      { onConflict: "auth_user_id" },
    );

  return created.id;
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
  // Step 1: Verify authentication from the cookie JWT. API routes should not
  // pay a Supabase Auth network round trip for every project-scoped request.
  const user = await getApiRouteUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 2: Check if user is app admin (bypass project membership checks)
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin === true) {
    const adminPersonId =
      (await resolvePersonIdFromAuth(serviceClient, {
        id: user.id,
        email: user.email,
      })) || user.id;

    return {
      membership: {
        membershipId: `super-admin:${user.id}:${projectId}`,
        personId: adminPersonId,
        authUserId: user.id,
        projectId,
        permissionTemplateId: null,
        userType: "developer",
      },
      serviceClient,
    };
  }

  // Step 3: Look up person_id from auth user for non-admin users
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

  // Step 4: Verify active membership in the project
  const { data: membership, error: membershipError } = await serviceClient
    .from("project_directory_memberships")
    .select("id, person_id, project_id, permission_template_id, user_type")
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
      userType: membership.user_type,
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
