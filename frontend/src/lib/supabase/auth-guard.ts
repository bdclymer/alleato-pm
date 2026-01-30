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

  const { data: authLink, error: authLinkError } = await serviceClient
    .from("users_auth")
    .select("person_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (authLinkError || !authLink) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 403 },
    );
  }

  // Step 3: Verify active membership in the project
  const { data: membership, error: membershipError } = await serviceClient
    .from("project_directory_memberships")
    .select("id, person_id, project_id, permission_template_id")
    .eq("person_id", authLink.person_id)
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
 * Type guard to check if verifyProjectAccess returned an error response.
 */
export function isAuthError(
  result: AuthGuardResult | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
