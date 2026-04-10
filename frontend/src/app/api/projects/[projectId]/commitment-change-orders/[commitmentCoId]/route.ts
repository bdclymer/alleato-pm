import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string }>;
}

/**
 * GET /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]
 *
 * Direct lookup of a contract_change_orders row by UUID,
 * verified against the project via the linked commitment.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentCoId } = await params;
    const supabase = await createClient();

    // Fetch the change order
    const { data: co, error: coError } = await supabase
      .from("contract_change_orders")
      .select("*")
      .eq("id", commitmentCoId)
      .single();

    if (coError) {
      if (coError.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return apiErrorResponse(coError);
    }

    // Verify the linked commitment belongs to this project
    const { data: commitment, error: commitmentError } = await supabase
      .from("commitments_unified")
      .select("id, project_id, contract_number")
      .eq("id", co.contract_id)
      .is("deleted_at", null)
      .single();

    if (commitmentError || !commitment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (commitment.project_id !== Number(projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...co,
      commitment_number: commitment.contract_number,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]
 * Update a commitment change order.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentCoId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the CCO exists and belongs to this project
    const { data: existing, error: fetchError } = await supabase
      .from("contract_change_orders")
      .select("id, contract_id")
      .eq("id", commitmentCoId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: commitment } = await supabase
      .from("commitments_unified")
      .select("id, project_id")
      .eq("id", existing.contract_id)
      .is("deleted_at", null)
      .single();

    if (!commitment || commitment.project_id !== Number(projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();

    // Strip fields that shouldn't be directly updated
    const {
      id: _id,
      created_at: _ca,
      updated_at: _ua,
      commitment_number: _cn,
      ...updateData
    } = body;

    const { data, error } = await supabase
      .from("contract_change_orders")
      .update(updateData)
      .eq("id", commitmentCoId)
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
 * DELETE /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]
 * Delete a commitment change order.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentCoId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the CCO exists and belongs to this project
    const { data: existing, error: fetchError } = await supabase
      .from("contract_change_orders")
      .select("id, contract_id")
      .eq("id", commitmentCoId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: commitment } = await supabase
      .from("commitments_unified")
      .select("id, project_id")
      .eq("id", existing.contract_id)
      .is("deleted_at", null)
      .single();

    if (!commitment || commitment.project_id !== Number(projectId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("contract_change_orders")
      .delete()
      .eq("id", commitmentCoId);

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
