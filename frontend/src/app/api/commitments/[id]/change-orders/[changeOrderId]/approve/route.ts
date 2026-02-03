import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/commitments/[id]/change-orders/[changeOrderId]/approve
 *
 * Approves a pending or draft change order. Sets the status to "approved",
 * records the approval timestamp and approving user. After approval,
 * recalculates commitment change order totals by status.
 *
 * The revised contract amount is automatically calculated as:
 * Original Amount + Sum of All Approved Change Orders
 *
 * @route POST /api/commitments/[id]/change-orders/[changeOrderId]/approve
 * @param {string} id - Commitment UUID (contract_id)
 * @param {string} changeOrderId - Change order UUID to approve
 *
 * @returns {object} 200 - Approval result:
 *   {
 *     success: true,
 *     message: "Change order approved successfully",
 *     data: {
 *       changeOrder: ApprovedChangeOrderRecord,
 *       totals: { approved: number, pending: number, draft: number, total: number }
 *     }
 *   }
 * @returns {object} 400 - Already approved/executed, or invalid status for approval
 * @returns {object} 401 - Unauthorized (no user session)
 * @returns {object} 404 - Change order not found or doesn't belong to commitment
 * @returns {object} 500 - Internal server error
 *
 * @businessRule Only change orders with status "pending" or "draft" can be approved
 * @businessRule Already approved/executed change orders return 400
 * @businessRule Void change orders cannot be approved
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; changeOrderId: string }> },
) {
  try {
    const { id: commitmentId, changeOrderId } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the change order exists and belongs to this commitment
    const { data: changeOrder, error: fetchError } = await supabase
      .from("contract_change_orders")
      .select("id, status, amount, contract_id")
      .eq("id", changeOrderId)
      .eq("contract_id", commitmentId)
      .single();

    if (fetchError || !changeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Check if already approved
    if (changeOrder.status === "approved" || changeOrder.status === "executed") {
      return NextResponse.json(
        {
          error: "Already approved",
          message: "This change order has already been approved",
        },
        { status: 400 },
      );
    }

    // Check if in a valid state to approve (must be pending or draft)
    if (changeOrder.status !== "pending" && changeOrder.status !== "draft") {
      return NextResponse.json(
        {
          error: "Invalid status",
          message: `Cannot approve a change order with status: ${changeOrder.status}`,
        },
        { status: 400 },
      );
    }

    // Approve the change order
    const { data: approvedCO, error: updateError } = await supabase
      .from("contract_change_orders")
      .update({
        status: "approved",
        approved_date: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", changeOrderId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Calculate new totals for the commitment
    const { data: allChangeOrders } = await supabase
      .from("contract_change_orders")
      .select("status, amount")
      .eq("contract_id", commitmentId);

    const totals = {
      approved: 0,
      pending: 0,
      draft: 0,
      total: 0,
    };

    if (allChangeOrders) {
      for (const co of allChangeOrders) {
        const amount = Number(co.amount) || 0;
        totals.total += amount;

        if (co.status === "approved" || co.status === "executed") {
          totals.approved += amount;
        } else if (co.status === "pending") {
          totals.pending += amount;
        } else if (co.status === "draft") {
          totals.draft += amount;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Change order approved successfully",
      data: {
        changeOrder: approvedCO,
        totals: totals,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
