import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/commitment-change-orders
 *
 * Returns all change orders across all commitments for a project.
 * Joins contract_change_orders → commitments_unified via contract_id = commitments_unified.id
 * and filters by commitments_unified.project_id.
 *
 * Response shape:
 * {
 *   data: Array<{
 *     id, number, title, status, amount, requested_date, approved_date,
 *     commitment_id, commitment_number
 *   }>,
 *   meta: { total_count, total_amount }
 * }
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Fetch all commitments for the project first, then fetch their change orders.
    // We do a two-step query because contract_change_orders has no project_id column.
    const { data: commitments, error: commitmentsError } = await supabase
      .from("commitments_unified")
      .select("id, contract_number")
      .eq("project_id", Number(projectId))
      .is("deleted_at", null);

    if (commitmentsError) {
      return apiErrorResponse(commitmentsError);
    }

    if (!commitments || commitments.length === 0) {
      return NextResponse.json({ data: [], meta: { total_count: 0, total_amount: 0 } });
    }

    const commitmentIds = commitments.map((c) => c.id).filter(Boolean) as string[];

    const { data: changeOrders, error: coError } = await supabase
      .from("contract_change_orders")
      .select(
        "id, change_order_number, description, status, amount, requested_date, approved_date, contract_id",
      )
      .in("contract_id", commitmentIds)
      .order("requested_date", { ascending: false });

    if (coError) {
      return apiErrorResponse(coError);
    }

    // Build a map of commitment id → contract_number for enriching the response
    const commitmentMap = new Map(
      commitments.map((c) => [c.id, c.contract_number ?? ""]),
    );

    const data = (changeOrders ?? []).map((co) => ({
      id: co.id,
      number: co.change_order_number,
      title: co.description,
      status: co.status?.toLowerCase() ?? "draft",
      amount: Number(co.amount) || 0,
      requested_date: co.requested_date,
      approved_date: co.approved_date,
      commitment_id: co.contract_id,
      commitment_number: commitmentMap.get(co.contract_id) ?? null,
    }));

    const totalAmount = data.reduce((sum, co) => sum + co.amount, 0);

    return NextResponse.json({
      data,
      meta: {
        total_count: data.length,
        total_amount: totalAmount,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
