import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/financial-insights/alerts
 *
 * Returns financial alerts from the ai_insights table.
 *
 * Query params:
 *   ?status=open         — filter by status (default: "open")
 *   ?severity=critical   — optional severity filter
 *   ?project_id=67       — optional project filter
 *   ?limit=50            — pagination limit (default: 50, max: 200)
 */
export async function GET(request: NextRequest) {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") ?? "open";
    const severity = searchParams.get("severity");
    const projectId = searchParams.get("project_id");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);

    const supabase = createServiceClient();

    // Build the query — financial insights use insight_type values that
    // start with "budget_" or specific financial types.
    const financialInsightTypes = [
      "budget_overrun",
      "budget_mismatch",
      "cash_gap",
      "negative_net_position",
      "financial_anomaly",
      "cost_overrun",
    ];

    let query = supabase
      .from("ai_insights")
      .select("*", { count: "exact" })
      .in("insight_type", financialInsightTypes)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (severity) {
      query = query.eq("severity", severity);
    }

    if (projectId) {
      const projectIdNum = parseInt(projectId, 10);
      if (Number.isNaN(projectIdNum)) {
        return NextResponse.json(
          { error: "Invalid project_id — must be a number" },
          { status: 400 },
        );
      }
      query = query.eq("project_id", projectIdNum);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[financial-insights/alerts] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch financial alerts" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      alerts: data ?? [],
      total: count ?? 0,
    });
  } catch (err) {
    console.error("[financial-insights/alerts] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
