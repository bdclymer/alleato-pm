import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions-guard";

type ChangeOrderStatusFilter = "approved" | "pending" | "all";
const PRIME_CHANGE_ORDER_LINES_TABLE = "change_order_lines";

interface RuntimePrimeChangeOrderLinesClient {
  from: (tableName: string) => {
    select: (selectedColumns: string) => {
      eq: (column: string, value: number | string) => {
        eq: (column: string, value: string) => {
          like: (
            column: string,
            pattern: string,
          ) => Promise<{
            data: Array<Record<string, unknown>> | null;
            error: unknown;
          }>;
        };
      };
    };
  };
}

/**
 * Resolve a budget cost code for filtering from explicit query param or budget line id.
 */
async function resolveCostCodeId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectIdNum: number,
  budgetLineId: string | null,
  costCodeParam: string | null,
): Promise<string | null> {
  if (costCodeParam && costCodeParam.trim().length > 0) {
    return costCodeParam;
  }
  if (!budgetLineId) {
    return null;
  }

  const { data: budgetLine, error } = await supabase
    .from("budget_lines")
    .select("cost_code_id")
    .eq("id", budgetLineId)
    .eq("project_id", projectIdNum)
    .single();

  if (error || !budgetLine) {
    return null;
  }

  return budgetLine.cost_code_id ?? null;
}

/**
 * GET /api/projects/[projectId]/budget/change-orders
 * Returns budget-related prime change orders scoped by cost code.
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/budget/change-orders#GET",
  async ({ request, params }) => {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const guard = await requirePermission(projectIdNum, "budget", "read");
    if (guard.denied) return guard.response;

    const { searchParams } = new URL(request.url);
    const budgetLineId = searchParams.get("budgetLineId");
    const costCodeParam = searchParams.get("costCode");
    const statusParam = (searchParams.get("status") ?? "all").toLowerCase();
    const statusFilter: ChangeOrderStatusFilter =
      statusParam === "approved" || statusParam === "pending" ? statusParam : "all";

    const supabase = await createClient();
    const costCodeId = await resolveCostCodeId(
      supabase,
      projectIdNum,
      budgetLineId,
      costCodeParam,
    );

    if (!costCodeId) {
      return NextResponse.json({ changeOrders: [] });
    }

    // Query runtime table with an untyped client because this table is missing in generated TS types.
    const runtimeSupabase =
      supabase as unknown as RuntimePrimeChangeOrderLinesClient;
    const query = runtimeSupabase
      .from(PRIME_CHANGE_ORDER_LINES_TABLE)
      .select(
        `
        id,
        amount,
        description,
        cost_code_id,
        change_orders!inner(
          id,
          change_order_number,
          title,
          status,
          submitted_by,
          submitted_at,
          approved_by,
          approved_at,
          created_at,
          project_id
        )
      `,
      )
      .eq("change_orders.project_id", projectIdNum)
      .eq("cost_code_id", costCodeId);

    const statusPattern =
      statusFilter === "approved"
        ? "approved"
        : statusFilter === "pending"
          ? "Pending%"
          : "%";
    const result = await query.like("change_orders.status", statusPattern);

    const errStr = JSON.stringify(result.error);
    const isMissingTable =
      errStr.includes(PRIME_CHANGE_ORDER_LINES_TABLE) ||
      errStr.includes("PGRST205") ||
      errStr.includes("schema cache");
    if (result.error && isMissingTable) {
      return NextResponse.json({ changeOrders: [] });
    }

    const { data, error } = result;
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch change orders", details: String(error) },
        { status: 500 },
      );
    }

    const changeOrders = (data ?? []).map((rawLine) => {
      const line = rawLine as Record<string, unknown>;
      const coRaw = Array.isArray(line.change_orders)
        ? line.change_orders[0]
        : line.change_orders;
      const co =
        (coRaw as {
          id?: string;
          change_order_number?: string;
          title?: string;
          status?: string;
          submitted_by?: string;
          submitted_at?: string;
          approved_by?: string;
          approved_at?: string;
          created_at?: string;
        } | null) ?? null;

      return {
        id: String(line.id ?? ""),
        changeOrderNumber: co?.change_order_number || co?.id || "",
        description: String(line.description ?? co?.title ?? ""),
        amount: Number(line.amount ?? 0) || 0,
        status: co?.status || "unknown",
        requestedDate: co?.submitted_at || co?.created_at || null,
        requestedBy: co?.submitted_by || null,
        approvedDate: co?.approved_at || null,
        approvedBy: co?.approved_by || null,
        contractNumber: "-",
      };
    });

    return NextResponse.json({ changeOrders });
  },
);
