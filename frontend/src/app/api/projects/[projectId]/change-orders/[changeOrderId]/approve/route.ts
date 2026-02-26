import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import {
  canReviewGeneralChangeOrder,
  getReviewerAccessForProject,
  isReviewerAccessError,
} from "@/lib/change-orders/reviewer-access";

interface RouteParams {
  params: Promise<{ projectId: string; changeOrderId: string }>;
}

/**
 * POST /api/projects/[projectId]/change-orders/[changeOrderId]/approve
 * Approves a change order for any contract type
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId } = await params;
    const numericProjectId = Number(projectId);
    const reviewerAccess = await getReviewerAccessForProject(numericProjectId);
    if (isReviewerAccessError(reviewerAccess)) {
      return reviewerAccess;
    }
    const supabase = reviewerAccess.serviceClient;
    const requestSupabase = await createClient();
    const {
      data: { user },
    } = await requestSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the change order
    const { data: changeOrder, error: fetchError } = await supabase
      .from("change_orders")
      .select("id, amount, status, contract_id, project_id, designated_reviewer_id")
      .eq("id", Number(changeOrderId))
      .eq("project_id", Number(projectId))
      .single();

    if (fetchError || !changeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    if (
      !canReviewGeneralChangeOrder(
        reviewerAccess,
        changeOrder.designated_reviewer_id,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only admins or the designated reviewer can approve this change order",
        },
        { status: 403 },
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
      .from("change_orders")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: now,
        updated_at: now,
      })
      .eq("id", Number(changeOrderId))
      .eq("project_id", Number(projectId))
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

    // If this change order is linked to a contract, update the contract's revised value
    let contractUpdated = false;
    let newContractValue = null;

    if (changeOrder.contract_id) {
      const { data: contract } = await supabase
        .from("contracts")
        .select("id, revised_contract_amount")
        .eq("id", changeOrder.contract_id)
        .single();

      if (contract) {
        const newRevisedValue =
          (contract.revised_contract_amount || 0) + (changeOrder.amount || 0);

        const { error: contractUpdateError } = await supabase
          .from("contracts")
          .update({
            revised_contract_amount: newRevisedValue,
            updated_at: now,
          })
          .eq("id", changeOrder.contract_id);

        if (!contractUpdateError) {
          contractUpdated = true;
          newContractValue = newRevisedValue;
        }
      }
    }

    return NextResponse.json({
      ...updatedChangeOrder,
      contract_updated: contractUpdated,
      new_contract_value: newContractValue,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
