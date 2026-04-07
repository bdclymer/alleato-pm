import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DirectoryService } from "@/services/directoryService";
import { PermissionService } from "@/services/permissionService";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; personId: string }>;
}

/**
 * Handle POST requests to deactivate a person in a project's directory.
 *
 * @param request - The incoming HTTP request
 * @param params - Route parameters
 * @param params.id - The ID of the project containing the person
 * @param params.personId - The ID of the person to deactivate
 * @returns A JSON response: on success `{ success: true, message: 'Person deactivated successfully' }`; on failure an object with an `error` message describing the problem
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

    // Deactivate person
    const directoryService = new DirectoryService(supabase);
    await directoryService.deactivatePerson(projectId, personId);

    return NextResponse.json({
      success: true,
      message: "Person deactivated successfully",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
