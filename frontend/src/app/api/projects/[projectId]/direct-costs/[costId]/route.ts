/** * ============================================================================= * INDIVIDUAL DIRECT COST API ENDPOINTS * ============================================================================= * * API endpoints for individual direct cost operations: * - GET: Fetch single direct cost with full details * - PUT: Update existing direct cost * - DELETE: Soft delete direct cost */ import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DirectCostUpdateSchema,
  type DirectCostWithLineItems,
} from "@/lib/schemas/direct-costs";
import { DirectCostService } from "@/lib/services/direct-cost-service";
import { requirePermission } from "@/lib/permissions-guard"; // =============================================================================
// GET - Fetch Single Direct Cost
// =============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; costId: string }> },
) {
  try {
    const { projectId, costId } = await params;

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    const service = new DirectCostService(supabase);

    const directCost = await service.getById(projectId, costId);
    if (!directCost) {
      return NextResponse.json(
        { error: "Direct cost not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(directCost);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch direct cost" },
      { status: 500 },
    );
  }
} // =============================================================================
// PUT - Update Direct Cost
// =============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; costId: string }> },
) {
  try {
    const { projectId, costId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "budget", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    const body = await request.json();

    // Add the ID to the body for validation
    const dataWithId = { ...body, id: costId };

    // Validate request data
    const validation = DirectCostUpdateSchema.safeParse(dataWithId);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: validation.error.format() },
        { status: 400 },
      );
    }

    const service = new DirectCostService(supabase);

    // Update the direct cost
    const updatedCost = await service.update(
      projectId,
      costId,
      validation.data,
    );
    if (!updatedCost) {
      return NextResponse.json(
        { error: "Direct cost not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedCost);
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Direct cost not found" },
          { status: 404 },
        );
      }

      if (error.message.includes("permission")) {
        return NextResponse.json(
          { error: "Insufficient permissions to update direct cost" },
          { status: 403 },
        );
      }

      if (error.message.includes("foreign key")) {
        return NextResponse.json(
          { error: "Invalid reference to budget code, vendor, or employee" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update direct cost" },
      { status: 500 },
    );
  }
} // =============================================================================
// DELETE - Soft Delete Direct Cost
// =============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; costId: string }> },
) {
  try {
    const { projectId, costId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const guard = await requirePermission(projectIdNum, "budget", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    const service = new DirectCostService(supabase);

    const success = await service.delete(projectId, costId);

    if (!success) {
      return NextResponse.json(
        { error: "Direct cost not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Direct cost not found" },
          { status: 404 },
        );
      }

      if (error.message.includes("permission")) {
        return NextResponse.json(
          { error: "Insufficient permissions to delete direct cost" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to delete direct cost" },
      { status: 500 },
    );
  }
}
