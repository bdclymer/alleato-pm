import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/commitment-change-orders/export
 * Export CCOs as CSV
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");

    let query = supabase
      .from("contract_change_orders")
      .select(`
        *,
        prime_contracts!inner(project_id)
      `)
      .eq("prime_contracts.project_id", Number(projectId))
      .order("change_order_number");

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch", details: error.message },
        { status: 400 },
      );
    }

    const rows = data || [];
    const headers = [
      "CO Number",
      "Description",
      "Status",
      "Amount",
      "Requested Date",
      "Approved Date",
      "Created",
    ];

    const csvRows = rows.map((co) => [
      co.change_order_number || "",
      `"${(co.description || "").replace(/"/g, '""')}"`,
      co.status || "",
      co.amount ?? 0,
      co.requested_date || "",
      co.approved_date || "",
      co.created_at ? new Date(co.created_at).toLocaleDateString() : "",
    ]);

    const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join(
      "\n",
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="commitment-change-orders.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
