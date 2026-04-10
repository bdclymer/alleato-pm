import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; primeCoId: string }>;
}

/**
 * GET /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/line-items
 * Returns all line items for a PCCO, ordered by created_at ASC
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, primeCoId } = await params;
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

    const { data: lineItems, error } = await supabase
      .from("pcco_line_items")
      .select("*")
      .eq("pcco_id", Number(primeCoId))
      .order("created_at", { ascending: true });

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data: lineItems ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/line-items
 * Create a new line item. Calculates line_amount = quantity * unit_cost.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, primeCoId } = await params;
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
      .insert({
        pcco_id: Number(primeCoId),
        description: description ?? null,
        cost_code: cost_code ?? null,
        quantity: qty,
        uom: uom ?? null,
        unit_cost: uc,
        line_amount: lineAmount,
      })
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ data: lineItem }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
