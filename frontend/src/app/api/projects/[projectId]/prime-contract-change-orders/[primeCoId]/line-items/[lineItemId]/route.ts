import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; primeCoId: string; lineItemId: string }>;
}

/**
 * PUT /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/line-items/[lineItemId]
 * Update a line item. Recalculates line_amount = quantity * unit_cost.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, primeCoId, lineItemId } = await params;

    const guard = await requirePermission(Number(projectId), "change_orders", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the PCCO belongs to the requested project
    const { data: pcco, error: pccoError } = await supabase
      .from("prime_contract_change_orders")
      .select("id")
      .eq("id", Number(primeCoId))
      .eq("project_id", Number(projectId))
      .single();

    if (pccoError || !pcco) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { description, cost_code, quantity, uom, unit_cost } = body as {
      description?: string;
      cost_code?: string;
      quantity?: number;
      uom?: string;
      unit_cost?: number;
    };

    const qty = quantity ?? 0;
    const uc = unit_cost ?? 0;
    const lineAmount = qty * uc;

    const { data: lineItem, error } = await supabase
      .from("pcco_line_items")
      .update({
        description: description ?? null,
        cost_code: cost_code ?? null,
        quantity: qty,
        uom: uom ?? null,
        unit_cost: uc,
        line_amount: lineAmount,
      })
      .eq("id", Number(lineItemId))
      .eq("pcco_id", Number(primeCoId))
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data: lineItem });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/line-items/[lineItemId]
 * Delete a line item.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, primeCoId, lineItemId } = await params;

    const guard = await requirePermission(Number(projectId), "change_orders", "admin");
    if (guard.denied) return guard.response;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the PCCO belongs to the requested project
    const { data: pcco, error: pccoError } = await supabase
      .from("prime_contract_change_orders")
      .select("id")
      .eq("id", Number(primeCoId))
      .eq("project_id", Number(projectId))
      .single();

    if (pccoError || !pcco) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("pcco_line_items")
      .delete()
      .eq("id", Number(lineItemId))
      .eq("pcco_id", Number(primeCoId));

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
