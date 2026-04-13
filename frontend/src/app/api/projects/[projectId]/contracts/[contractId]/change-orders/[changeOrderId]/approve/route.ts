import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { approveChangeOrderSchema } from "../../validation";
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
 * POST /api/projects/[id]/contracts/[contractId]/change-orders/[changeOrderId]/approve
 * Approves a change order and updates the contract value
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve#POST",
  async ({ request, params }) => {
  
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
            "Forbidden: Only admins or assigned reviewers can approve commitment change orders",
        },
        { status: 403 },
      );
    }

    const supabase = reviewerAccess.serviceClient;
    const requestSupabase = await createClient();
    const {
      data: { user },
    } = await requestSupabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve#POST", message: "Authentication required." });
    }

    // Verify contract exists and belongs to project
    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id, original_contract_value")
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
      .select("id, amount, status")
      .eq("id", changeOrderId)
      .eq("contract_id", contractId)
      .single();

    if (!changeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Check if already approved
    if (changeOrder.status === "approved") {
      return NextResponse.json(
        { error: "Change order is already approved" },
        { status: 400 },
      );
    }

    // Update change order to approved status
    const now = new Date().toISOString();
    const { data: updatedChangeOrder, error: updateError } = await supabase
      .from("contract_change_orders")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_date: now,
      })
      .eq("id", changeOrderId)
      .eq("contract_id", contractId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to approve change order",
          details: updateError.message,
        },
        { status: 400 },
      );
    }

    const { data: approvedOrders, error: approvedOrdersError } = await supabase
      .from("contract_change_orders")
      .select("amount")
      .eq("contract_id", contractId)
      .eq("status", "approved");

    if (approvedOrdersError) {
      return NextResponse.json(
        {
          error: "Change order approved but failed to recalculate contract value",
          details: approvedOrdersError.message,
        },
        { status: 400 },
      );
    }

    const approvedTotal = (approvedOrders || []).reduce(
      (sum, order) => sum + (order.amount ?? 0),
      0,
    );
    const newRevisedValue = (contract.original_contract_value || 0) + approvedTotal;
    const { error: contractUpdateError } = await supabase
      .from("prime_contracts")
      .update({ revised_contract_value: newRevisedValue })
      .eq("id", contractId);

    if (contractUpdateError) {
      return NextResponse.json(
        {
          error: "Change order approved but failed to update contract value",
          details: contractUpdateError.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ...updatedChangeOrder,
      contract_updated: true,
      new_contract_value: newRevisedValue,
    });
    },
);
