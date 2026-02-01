import { NextRequest, NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { assignPermissionTemplate } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * POST /api/projects/[projectId]/permissions/assign
 * Assign a permission template to a user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    // Verify project access and require admin permissions for directory
    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    // Parse request body
    const body = await request.json();
    const { person_id, template_id } = body;

    if (!person_id || !template_id) {
      return NextResponse.json(
        { error: "person_id and template_id are required" },
        { status: 400 }
      );
    }

    // Assign the template
    const result = await assignPermissionTemplate(
      projectIdNum,
      person_id,
      template_id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to assign template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error assigning permission template:", error);
    return NextResponse.json(
      { error: "Failed to assign permission template" },
      { status: 500 }
    );
  }
}