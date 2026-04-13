import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
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
export const GET = withApiGuardrails("/api/financial-insights/alerts#GET", async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/financial-insights/alerts#GET",
      message: "Unauthorized request.",
      status: 401,
    });
  }

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
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where: "/api/financial-insights/alerts#GET",
        message: "Invalid project_id; must be a number.",
        status: 400,
        details: { project_id: projectId },
      });
    }
    query = query.eq("project_id", projectIdNum);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/financial-insights/alerts#GET",
      message: "Failed to fetch financial alerts.",
      details: { reason: error.message },
    });
  }

  return NextResponse.json({
    alerts: data ?? [],
    total: count ?? 0,
  });
});
