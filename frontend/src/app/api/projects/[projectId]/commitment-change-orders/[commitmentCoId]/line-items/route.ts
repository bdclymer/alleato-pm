import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string }>;
}

/**
 * GET /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items
 *
 * Fetch all line items for a commitment change order, ordered by created_at ASC.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items#GET",
  async ({ request, params }) => {
  
    const { commitmentCoId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("commitment_change_order_lines")
      .select("id, description, amount, cost_code_id, cost_type_id, budget_line_id, created_at")
      .eq("commitment_change_order_id", commitmentCoId)
      .order("created_at", { ascending: true });

    if (error) return apiErrorResponse(error);

    return NextResponse.json({ data: data ?? [] });
    },
);

/**
 * POST /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items
 *
 * Create a new line item on a commitment change order.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/commitment-change-orders/[commitmentCoId]/line-items#POST",
  async ({ request, params }) => {
  
    const { projectId, commitmentCoId } = await params;
    const projectIdNum = Number(projectId);

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

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
    },
);
