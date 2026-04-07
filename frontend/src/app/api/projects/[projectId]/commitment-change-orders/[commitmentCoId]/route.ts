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
 * verified against the project via prime_contracts join.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentCoId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("contract_change_orders")
      .select(`
        *,
        prime_contracts!inner(project_id)
      `)
      .eq("id", commitmentCoId)
      .eq("prime_contracts.project_id", Number(projectId))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    // Strip the joined prime_contracts object before returning
    const { prime_contracts: _pc, ...coData } = data;
    return NextResponse.json(coData);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
