import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.json(
        { error: "Failed to fetch", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
        status: body.status || "Proposed",
        total_amount: body.total_amount ?? 0,
        contract_id: body.contract_id ?? null,
        executed: body.executed ?? false,
        project_id: Number(projectId),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
