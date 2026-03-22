import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type ReviewerAccess = {
  userId: string;
  role: string | null;
  serviceClient: SupabaseClient;
};

type ReviewerAccessResult = ReviewerAccess | NextResponse;

/**
 * Authenticates the current user and returns their project role + a service
 * client for privileged DB operations. Returns a NextResponse error if the
 * user is not authenticated.
 */
export async function getReviewerAccessForProject(
  _projectId: number,
): Promise<ReviewerAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Look up user's role on this project via the correct tables:
  // auth user → people (via auth_user_id) → project_directory_memberships (via person_id + project_id)
  const { data: person } = await serviceClient
    .from("people")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let role: string | null = null;
  if (person) {
    const { data: membership } = await serviceClient
      .from("project_directory_memberships")
      .select("role")
      .eq("project_id", _projectId)
      .eq("person_id", person.id)
      .maybeSingle();
    role = membership?.role ?? null;
  }

  return {
    userId: user.id,
    role,
    serviceClient,
  };
}

/**
 * Type guard — returns true if the result is a NextResponse (i.e. an error).
 */
export function isReviewerAccessError(
  result: ReviewerAccessResult,
): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Returns true if the reviewer has permission to approve/reject contract
 * change orders. Currently allows any authenticated user with project access.
 */
export function canReviewContractChangeOrder(access: ReviewerAccess): boolean {
  // Admins can always review
  if (access.role === "admin" || access.role === "owner") return true;
  // Project managers and standard members can review
  if (access.role) return true;
  // No project membership — deny
  return false;
}
