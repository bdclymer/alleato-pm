import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; primeCoId: string }>;
}

/**
 * POST /api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/approve
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    // Fetch the PCCO
    const { data: co } = await supabase
      .from("prime_contract_change_orders")
      .select("id, status, total_amount, contract_id")
      .eq("id", numericId)
      .eq("project_id", Number(projectId))
      .single();

    if (!co) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (co.status === "Approved") {
      return NextResponse.json(
        { error: "Already approved" },
        { status: 400 },
      );
    }

    // Approve
    const { data: updated, error: updateError } = await supabase
      .from("prime_contract_change_orders")
      .update({
        status: "Approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", numericId)
      .eq("project_id", Number(projectId))
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to approve", details: updateError.message },
        { status: 400 },
      );
    }

    // Recalculate contract revised amount if PCCO is linked to a contract
    if (updated.contract_id) {
      const { data: contract } = await supabase
        .from("prime_contracts")
        .select("id, original_contract_value")
        .eq("id", updated.contract_id)
        .single();

      if (contract) {
        const { data: approvedPCCOs } = await supabase
          .from("prime_contract_change_orders")
          .select("total_amount")
          .eq("contract_id", updated.contract_id)
          .eq("status", "Approved");

        const approvedTotal = (approvedPCCOs || []).reduce(
          (sum, row) => sum + (row.total_amount ?? 0),
          0,
        );

        const newRevisedAmount =
          (contract.original_contract_value ?? 0) + approvedTotal;

        await supabase
          .from("prime_contracts")
          .update({ revised_contract_value: newRevisedAmount })
          .eq("id", updated.contract_id);
      }
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
