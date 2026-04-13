/** * ============================================================================= * INDIVIDUAL DIRECT COST API ENDPOINTS * ============================================================================= * * API endpoints for individual direct cost operations: * - GET: Fetch single direct cost with full details * - PUT: Update existing direct cost * - DELETE: Soft delete direct cost */ import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import {
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
export const GET = withApiGuardrails<{ projectId: string; costId: string }>(
  "projects/[projectId]/direct-costs/[costId]#GET",
  async ({ request, params }) => {
  
    const { projectId, costId } = await params;

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/direct-costs/[costId]#GET", message: "Authentication required." });
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
    },
); // =============================================================================
// PUT - Update Direct Cost
// =============================================================================
export const PUT = withApiGuardrails<{ projectId: string; costId: string }>(
  "projects/[projectId]/direct-costs/[costId]#PUT",
  async ({ request, params }) => {
  
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
    },
); // =============================================================================
// DELETE - Soft Delete Direct Cost
// =============================================================================
export const DELETE = withApiGuardrails<{ projectId: string; costId: string }>(
  "projects/[projectId]/direct-costs/[costId]#DELETE",
  async ({ request, params }) => {
  
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
    },
);
