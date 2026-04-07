import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DirectoryService } from "@/services/directoryService";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; personId: string }> },
) {
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

    // Get user permissions
    const directoryService = new DirectoryService(supabase);
    const permissions = await directoryService.getUserPermissions(
      projectId,
      personId,
    );

    return NextResponse.json(
      {
        user_id: personId,
        permissions: permissions.override_permissions,
        template_permissions: permissions.template_permissions,
        effective_permissions: permissions.effective_permissions,
      },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; personId: string }> },
) {
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

    // Parse request body
    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Permissions array is required" },
        { status: 400 },
      );
    }

    // Update user permissions
    const directoryService = new DirectoryService(supabase);
    await directoryService.updateUserPermissions(
      projectId,
      personId,
      permissions,
      user.id,
    );

    return NextResponse.json(
      {
        user_id: personId,
        permissions_updated: permissions.length,
        message: "Permissions updated successfully",
        updated_at: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
