import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { InviteService } from "@/services/inviteService";
import { PermissionService } from "@/services/permissionService";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; personId: string }>;
}

/**
 * Resends an invitation for a specific person within a project after verifying the requester's identity and write permission on the project's directory.
 *
 * @param request - The incoming Next.js request object.
 * @param params.id - The ID of the project containing the person to re-invite.
 * @param params.personId - The ID of the person whose invite should be resent.
 * @returns A JSON NextResponse: on success contains the invite operation result; on failure contains an `error` message and an appropriate HTTP status (401 for unauthorized, 403 for forbidden, 400 for bad request, 500 for internal server error).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, personId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const permissionService = new PermissionService(supabase);
    const hasPermission = await permissionService.hasPermission(
      user.id,
      projectId,
      "directory",
      "write",
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Resend invite
    const inviteService = new InviteService(supabase);
    const result = await inviteService.resendInvite(projectId, personId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to resend invite" },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
