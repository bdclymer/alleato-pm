import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string; lineItemId: string }>;
}

/**
 * PUT /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items/[lineItemId]
 *
 * Update an existing line item.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { commitmentCoId, lineItemId } = await params;
    const body = await request.json();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("commitment_change_order_lines")
      .update({
        description: body.description ?? null,
        amount: body.amount ?? 0,
        cost_code_id: body.cost_code_id ?? null,
        cost_type_id: body.cost_type_id ?? null,
      })
      .eq("id", lineItemId)
      .eq("commitment_change_order_id", commitmentCoId)
      .select("id, description, amount, cost_code_id, cost_type_id, budget_line_id, created_at")
      .single();

    if (error) return apiErrorResponse(error);

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items/[lineItemId]
 *
 * Delete a line item.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { commitmentCoId, lineItemId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from("commitment_change_order_lines")
      .delete()
      .eq("id", lineItemId)
      .eq("commitment_change_order_id", commitmentCoId);

    if (error) return apiErrorResponse(error);

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
