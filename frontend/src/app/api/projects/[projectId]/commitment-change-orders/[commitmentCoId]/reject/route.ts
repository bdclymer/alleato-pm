import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentCoId: string }>;
}

/**
 * POST /api/projects/[projectId]/commitment-change-orders/[commitmentCoId]/reject
 * Reject a commitment change order. Requires a rejection_reason in the body.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const rejectionReason = body.rejection_reason;

    if (
      !rejectionReason ||
      typeof rejectionReason !== "string" ||
      rejectionReason.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "rejection_reason is required" },
        { status: 400 },
      );
    }

    // Fetch the CCO
    const { data: co, error: coError } = await supabase
      .from("contract_change_orders")
      .select("id, status, contract_id")
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

    if (co.status === "rejected") {
      return NextResponse.json(
        { error: "Already rejected" },
        { status: 400 },
      );
    }

    // Reject
    const { data: updated, error: updateError } = await supabase
      .from("contract_change_orders")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
      })
      .eq("id", commitmentCoId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to reject", details: updateError.message },
        { status: 400 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
