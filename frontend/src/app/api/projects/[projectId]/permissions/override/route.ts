import { NextRequest, NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";
import { setPermissionOverride, removePermissionOverride, type PermissionModule, type PermissionLevel } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * POST /api/projects/[projectId]/permissions/override
 * Set a permission override for a user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    // Verify project access and require admin permissions
    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    // Parse request body
    const body = await request.json();
    const { person_id, module, level } = body;

    if (!person_id || !module || !level) {
      return NextResponse.json(
        { error: "person_id, module, and level are required" },
        { status: 400 }
      );
    }

    // Validate module and level
    const validModules: PermissionModule[] = [
      "directory", "budget", "contracts", "documents",
      "schedule", "submittals", "rfis", "change_orders"
    ];
    const validLevels: PermissionLevel[] = ["none", "read", "write", "admin"];

    if (!validModules.includes(module)) {
      return NextResponse.json(
        { error: `Invalid module. Must be one of: ${validModules.join(", ")}` },
        { status: 400 }
      );
    }

    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${validLevels.join(", ")}` },
        { status: 400 }
      );
    }

    // Set the override
    const result = await setPermissionOverride(
      projectIdNum,
      person_id,
      module,
      level
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to set permission override" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting permission override:", error);
    return NextResponse.json(
      { error: "Failed to set permission override" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/permissions/override
 * Remove a permission override for a user
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    // Verify project access and require admin permissions
    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("person_id");
    const module = searchParams.get("module");

    if (!personId || !module) {
      return NextResponse.json(
        { error: "person_id and module query parameters are required" },
        { status: 400 }
      );
    }

    // Validate module
    const validModules: PermissionModule[] = [
      "directory", "budget", "contracts", "documents",
      "schedule", "submittals", "rfis", "change_orders"
    ];

    if (!validModules.includes(module as PermissionModule)) {
      return NextResponse.json(
        { error: `Invalid module. Must be one of: ${validModules.join(", ")}` },
        { status: 400 }
      );
    }

    // Remove the override
    const result = await removePermissionOverride(
      projectIdNum,
      personId,
      module as PermissionModule
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to remove permission override" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing permission override:", error);
    return NextResponse.json(
      { error: "Failed to remove permission override" },
      { status: 500 }
    );
  }
}