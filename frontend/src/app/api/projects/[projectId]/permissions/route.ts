import { NextRequest, NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { loadUserPermissions } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/permissions
 * Get the current user's permissions for this project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    // Verify project access
    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    // Load user permissions
    const permissions = await loadUserPermissions(projectIdNum, authResult.membership.authUserId);

    if (!permissions) {
      return NextResponse.json(
        { error: "No permissions found for this project" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: permissions });
  } catch (error) {
    console.error("Error loading permissions:", error);
    return NextResponse.json(
      { error: "Failed to load permissions" },
      { status: 500 }
    );
  }
}