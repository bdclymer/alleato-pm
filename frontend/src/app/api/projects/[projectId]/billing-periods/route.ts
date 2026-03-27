import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ projectId: string }> };

// GET /api/projects/[projectId]/billing-periods
// Fetches contract_billing_periods for all prime contracts in the project
export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // Get prime contracts for this project
    const { data: contracts, error: contractError } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("project_id", projectIdNum);

    if (contractError) {
      return NextResponse.json(
        { error: "Failed to fetch contracts", details: contractError.message },
        { status: 500 },
      );
    }

    const contractIds = (contracts ?? []).map((c) => c.id);
    if (contractIds.length === 0) {
      return NextResponse.json({ items: [], total: 0 });
    }

    // Fetch billing periods for those contracts
    const { data, error } = await supabase
      .from("contract_billing_periods")
      .select("*")
      .in("contract_id", contractIds)
      .order("start_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch billing periods", details: error.message },
        { status: 500 },
      );
    }

    const items = (data ?? []).map((bp) => ({
      id: bp.id,
      contract_id: bp.contract_id,
      period_number: bp.period_number,
      start_date: bp.start_date,
      end_date: bp.end_date,
      billing_date: bp.billing_date,
      status: bp.status,
      work_completed: Number(bp.work_completed ?? 0),
      stored_materials: Number(bp.stored_materials ?? 0),
      current_payment_due: Number(bp.current_payment_due ?? 0),
      retention_percentage: Number(bp.retention_percentage ?? 0),
      retention_amount: Number(bp.retention_amount ?? 0),
      net_payment_due: Number(bp.net_payment_due ?? 0),
      notes: bp.notes,
      created_at: bp.created_at,
      updated_at: bp.updated_at,
    }));

    return NextResponse.json({ items, total: items.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/projects/[projectId]/billing-periods
export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectIdNum = parseInt(projectId, 10);
    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const body = await request.json();
    const { contract_id, start_date, end_date, billing_date, period_number } = body;

    if (!contract_id || !start_date || !end_date || !billing_date) {
      return NextResponse.json(
        { error: "contract_id, start_date, end_date, and billing_date are required" },
        { status: 400 },
      );
    }

    // Verify contract belongs to project
    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", contract_id)
      .eq("project_id", projectIdNum)
      .maybeSingle();

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found in this project" },
        { status: 404 },
      );
    }

    // Auto-generate period_number if not provided
    let finalPeriodNumber = period_number;
    if (!finalPeriodNumber) {
      const { data: maxPeriod } = await supabase
        .from("contract_billing_periods")
        .select("period_number")
        .eq("contract_id", contract_id)
        .order("period_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      finalPeriodNumber = (maxPeriod?.period_number ?? 0) + 1;
    }

    const { data, error } = await supabase
      .from("contract_billing_periods")
      .insert({
        contract_id,
        period_number: finalPeriodNumber,
        start_date,
        end_date,
        billing_date,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create billing period", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
