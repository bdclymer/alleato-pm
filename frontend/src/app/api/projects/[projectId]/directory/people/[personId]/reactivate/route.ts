import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DirectoryService } from "@/services/directoryService";
import { PermissionService } from "@/services/permissionService";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; personId: string }>;
}

/**
 * Handles POST requests to reactivate a person in a project's directory.
 *
 * @param request - The incoming Next.js request
 * @param params - Route parameters
 * @param params.id - ID of the project containing the person
 * @param params.personId - ID of the person to reactivate
 * @returns A JSON response: on success `{ success: true, message: 'Person reactivated successfully' }`; on authentication failure `{ error: 'Unauthorized' }` with status 401; on permission failure `{ error: 'Forbidden' }` with status 403; on unexpected errors `{ error: 'Internal server error' }` with status 500
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

    // Reactivate person
    const directoryService = new DirectoryService(supabase);
    await directoryService.reactivatePerson(projectId, personId);

    return NextResponse.json({
      success: true,
      message: "Person reactivated successfully",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
