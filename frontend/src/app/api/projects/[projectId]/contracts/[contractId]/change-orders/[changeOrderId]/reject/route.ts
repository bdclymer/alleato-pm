import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { rejectChangeOrderSchema } from "../../validation";
import { ZodError } from "zod";
import {
  canReviewContractChangeOrder,
  getReviewerAccessForProject,
  isReviewerAccessError,
} from "@/lib/change-orders/reviewer-access";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string; changeOrderId: string }>;
}

/**
 * POST /api/projects/[id]/contracts/[contractId]/change-orders/[changeOrderId]/reject
 * Rejects a change order with a reason
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, changeOrderId } = await params;
    const numericProjectId = Number(projectId);
    const guard = await requirePermission(numericProjectId, "contracts", "admin");
    if (guard.denied) return guard.response;

    const reviewerAccess = await getReviewerAccessForProject(numericProjectId);
    if (isReviewerAccessError(reviewerAccess)) {
      return reviewerAccess;
    }
    if (!canReviewContractChangeOrder(reviewerAccess)) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only admins or assigned reviewers can reject commitment change orders",
        },
        { status: 403 },
      );
    }

    const supabase = reviewerAccess.serviceClient;
    const body = await request.json();

    // Validate request body
    const validatedData = rejectChangeOrderSchema.parse(body);

    const requestSupabase = await createClient();
    const {
      data: { user },
    } = await requestSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify contract exists and belongs to project
    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    // Get the change order
    const { data: changeOrder } = await supabase
      .from("contract_change_orders")
      .select("id, status")
      .eq("id", changeOrderId)
      .eq("contract_id", contractId)
      .single();

    if (!changeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Check if already rejected
    if (changeOrder.status === "rejected") {
      return NextResponse.json(
        { error: "Change order is already rejected" },
        { status: 400 },
      );
    }

    // Update change order to rejected status
    const now = new Date().toISOString();
    const { data: updatedChangeOrder, error: updateError } = await supabase
      .from("contract_change_orders")
      .update({
        status: "rejected",
        approved_by: user.id,
        approved_date: now,
        rejection_reason: validatedData.rejection_reason,
      })
      .eq("id", changeOrderId)
      .eq("contract_id", contractId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to reject change order",
          details: updateError.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(updatedChangeOrder);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return apiErrorResponse(error);
  }
}
