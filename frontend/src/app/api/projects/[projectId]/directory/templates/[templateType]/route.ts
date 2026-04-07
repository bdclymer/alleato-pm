import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { PermissionService } from "@/services/permissionService";
import { DirectoryAdminService } from "@/services/directoryAdminService";
import type { DirectoryTemplateType } from "@/services/directoryAdminService";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; templateType: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, templateType } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const type = (templateType as DirectoryTemplateType) || "users";

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
      "read",
    );

    const adminService = new DirectoryAdminService(serviceSupabase);
    const csv = await adminService.generateTemplateCsv(type);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="directory-${type}-template.csv"`,
      },
    });
  } catch (error) {
    console.error("[DirectoryTemplate] Failed", error);
    return apiErrorResponse(error);
  }
}
