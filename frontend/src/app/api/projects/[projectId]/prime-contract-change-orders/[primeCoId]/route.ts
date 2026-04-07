import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; primeCoId: string }>;
}

/**
 * GET /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]
 * Returns the PCCO with related contract info and line items.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, primeCoId } = await params;
    const numericId = Number(primeCoId);

    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 404 });
    }

    const supabase = await createClient();

    // Fetch the PCCO
    const { data, error } = await supabase
      .from("prime_contract_change_orders")
      .select("*")
      .eq("id", numericId)
      .eq("project_id", Number(projectId))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    // Fetch line items for this PCCO
    const { data: lineItems } = await supabase
      .from("pcco_line_items")
      .select("*")
      .eq("pcco_id", numericId)
      .order("id", { ascending: true });

    // Fetch contract info if linked
    let contractInfo = null;
    if (data.prime_contract_id) {
      const { data: contract } = await supabase
        .from("prime_contracts")
        .select("id, contract_number, title, original_contract_value, revised_contract_value")
        .eq("id", data.prime_contract_id)
        .single();
      contractInfo = contract;
    }

    return NextResponse.json({
      ...data,
      line_items: lineItems ?? [],
      contract: contractInfo,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, primeCoId } = await params;
    const numericId = Number(primeCoId);

    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 404 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Strip out fields that shouldn't be directly updated
    const { line_items: _li, contract: _c, id: _id, project_id: _pid, ...updateData } = body;

    const { data, error } = await supabase
      .from("prime_contract_change_orders")
      .update(updateData)
      .eq("id", numericId)
      .eq("project_id", Number(projectId))
      .select("*")
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, primeCoId } = await params;
    const numericId = Number(primeCoId);

    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 404 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("prime_contract_change_orders")
      .delete()
      .eq("id", numericId)
      .eq("project_id", Number(projectId));

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
