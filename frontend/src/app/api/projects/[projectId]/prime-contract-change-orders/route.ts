import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/prime-contract-change-orders
 * List all PCCOs for a project
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prime_contract_change_orders")
      .select("*")
      .eq("project_id", Number(projectId))
      .order("created_at", { ascending: false });

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[projectId]/prime-contract-change-orders
 * Create a new PCCO
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("prime_contract_change_orders")
      .insert({
        pcco_number: body.pcco_number,
        title: body.title,
        status: body.status || "proposed",
        total_amount: body.total_amount ?? 0,
        contract_id: body.contract_id ?? null,
        executed: body.executed ?? false,
        project_id: Number(projectId),
      })
      .select("*")
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
