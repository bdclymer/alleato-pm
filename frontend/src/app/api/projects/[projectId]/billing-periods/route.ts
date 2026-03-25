import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ projectId: string }> };

// GET /api/projects/[projectId]/billing-periods
export async function GET(
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

    // Fetch billing periods with invoice counts
    const { data, error } = await supabase
      .from("billing_periods")
      .select("*")
      .eq("project_id", projectIdNum)
      .order("start_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch billing periods", details: error.message },
        { status: 500 },
      );
    }

    // Get invoice counts and totals per billing period
    const periodIds = (data ?? []).map((bp) => bp.id);
    let invoiceStats: Record<string, { count: number; total_invoiced: number; total_paid: number }> = {};

    if (periodIds.length > 0) {
      const { data: invoices } = await supabase
        .from("owner_invoices")
        .select("billing_period_id, amount, paid_amount")
        .in("billing_period_id", periodIds);

      if (invoices) {
        for (const inv of invoices) {
          const bpId = inv.billing_period_id;
          if (!bpId) continue;
          if (!invoiceStats[bpId]) {
            invoiceStats[bpId] = { count: 0, total_invoiced: 0, total_paid: 0 };
          }
          invoiceStats[bpId].count += 1;
          invoiceStats[bpId].total_invoiced += Number(inv.amount ?? 0);
          invoiceStats[bpId].total_paid += Number(inv.paid_amount ?? 0);
        }
      }
    }

    const items = (data ?? []).map((bp) => {
      const stats = invoiceStats[bp.id] ?? { count: 0, total_invoiced: 0, total_paid: 0 };
      return {
        id: bp.id,
        period_number: bp.period_number,
        start_date: bp.start_date,
        end_date: bp.end_date,
        is_closed: bp.is_closed ?? false,
        closed_date: bp.closed_date,
        closed_by: bp.closed_by,
        created_at: bp.created_at,
        updated_at: bp.updated_at,
        invoice_count: stats.count,
        total_invoiced: stats.total_invoiced,
        total_paid: stats.total_paid,
      };
    });

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
    const { start_date, end_date, period_number } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 },
      );
    }

    // Auto-generate period_number if not provided
    let finalPeriodNumber = period_number;
    if (!finalPeriodNumber) {
      const { data: maxPeriod } = await supabase
        .from("billing_periods")
        .select("period_number")
        .eq("project_id", projectIdNum)
        .order("period_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      finalPeriodNumber = (maxPeriod?.period_number ?? 0) + 1;
    }

    const { data, error } = await supabase
      .from("billing_periods")
      .insert({
        project_id: projectIdNum,
        start_date,
        end_date,
        period_number: finalPeriodNumber,
        is_closed: false,
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
