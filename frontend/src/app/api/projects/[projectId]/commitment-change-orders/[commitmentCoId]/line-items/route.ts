import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string }>;
}

/**
 * GET /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items
 *
 * Fetch all line items for a commitment change order, ordered by created_at ASC.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { commitmentCoId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("commitment_change_order_lines")
      .select("id, description, amount, cost_code_id, cost_type_id, budget_line_id, created_at")
      .eq("commitment_change_order_id", commitmentCoId)
      .order("created_at", { ascending: true });

    if (error) return apiErrorResponse(error);

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items
 *
 * Create a new line item on a commitment change order.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { commitmentCoId } = await params;
    const body = await request.json();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("commitment_change_order_lines")
      .insert({
        commitment_change_order_id: commitmentCoId,
        description: body.description ?? null,
        amount: body.amount ?? 0,
        cost_code_id: body.cost_code_id ?? null,
        cost_type_id: body.cost_type_id ?? null,
      })
      .select("id, description, amount, cost_code_id, cost_type_id, budget_line_id, created_at")
      .single();

    if (error) return apiErrorResponse(error);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
