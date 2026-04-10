import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string }>;
}

/**
 * POST /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/approve
 * Approve a commitment change order. Updates status and recalculates commitment revised value.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentCoId } = await params;
    const projectIdNum = Number(projectId);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requirePermission(projectIdNum, "contracts", "admin");
    if (guard.denied) return guard.response;

    // Fetch the CCO
    const { data: co, error: coError } = await supabase
      .from("contract_change_orders")
      .select("id, status, amount, contract_id")
      .eq("id", commitmentCoId)
      .single();

    if (coError || !co) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify the linked commitment belongs to this project
    const { data: commitment } = await supabase
      .from("commitments_unified")
      .select("id, project_id")
      .eq("id", co.contract_id)
      .is("deleted_at", null)
      .single();

    if (!commitment || commitment.project_id !== projectIdNum) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (co.status === "approved") {
      return NextResponse.json(
        { error: "Already approved" },
        { status: 400 },
      );
    }

    // Approve
    const { data: updated, error: updateError } = await supabase
      .from("contract_change_orders")
      .update({
        status: "approved",
        approved_date: new Date().toISOString().split("T")[0],
        approved_by: user.id,
      })
      .eq("id", commitmentCoId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to approve", details: updateError.message },
        { status: 400 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
