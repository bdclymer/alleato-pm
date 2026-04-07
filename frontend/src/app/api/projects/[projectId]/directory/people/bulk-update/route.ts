import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { PermissionService } from "@/services/permissionService";
import {
  DirectoryAdminService,
  type DirectoryBulkUpdatePayload,
} from "@/services/directoryAdminService";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;
    const serviceSupabase = authResult.serviceClient;

    // Still need regular auth client for permission check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissionService = new PermissionService(supabase);
    await permissionService.requirePermission(
      user.id,
      projectId,
      "directory",
      "write",
    );

    const payload = (await request.json()) as DirectoryBulkUpdatePayload;

    if (!payload?.personIds || payload.personIds.length === 0) {
      return NextResponse.json(
        { error: "personIds are required" },
        { status: 400 },
      );
    }

    const adminService = new DirectoryAdminService(serviceSupabase);
    const result = await adminService.bulkUpdatePeople(
      projectId,
      payload,
      user.id,
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[DirectoryBulkUpdate] Failed", error);
    return apiErrorResponse(error);
  }
}
