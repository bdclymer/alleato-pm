import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions-guard";
import { normalizeBudgetCodeLookupKey } from "@/lib/budget/compute-grand-totals";

type CommitmentStatusFilter = Set<string>;

/**
 * Resolve budget cost code from query params.
 */
async function resolveCostCodeId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectIdNum: number,
  budgetLineId: string | null,
  costCodeParam: string | null,
): Promise<string | null> {
  if (costCodeParam && costCodeParam.trim().length > 0) return costCodeParam;
  if (!budgetLineId) return null;

  const { data: budgetLine, error } = await supabase
    .from("budget_lines")
    .select("cost_code_id")
    .eq("id", budgetLineId)
    .eq("project_id", projectIdNum)
    .single();

  if (error || !budgetLine) return null;
  return budgetLine.cost_code_id ?? null;
}

async function resolveMatchingBudgetCodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectIdNum: number,
  costCodeId: string,
): Promise<string[]> {
  const { data: budgetLines, error } = await supabase
    .from("budget_lines")
    .select("cost_code_id")
    .eq("project_id", projectIdNum);

  if (error) throw error;

  const lookupKey = normalizeBudgetCodeLookupKey(costCodeId);
  const matchingCodes = new Set<string>([costCodeId]);

  for (const line of budgetLines ?? []) {
    const lineCostCode = line.cost_code_id;
    if (
      lineCostCode &&
      normalizeBudgetCodeLookupKey(lineCostCode) === lookupKey
    ) {
      matchingCodes.add(lineCostCode);
    }
  }

  for (const code of Array.from(matchingCodes)) {
    const normalized = normalizeBudgetCodeLookupKey(code);
    if (normalized) matchingCodes.add(normalized);
  }

  return Array.from(matchingCodes);
}

/**
 * GET /api/projects/[projectId]/budget/commitments
 * Returns committed subcontract/PO rows for one budget cost code.
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/budget/commitments#GET",
  async ({ request, params }) => {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const guard = await requirePermission(projectIdNum, "budget", "read");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const budgetLineId = searchParams.get("budgetLineId");
    const costCodeParam = searchParams.get("costCode");
    const statusParam = searchParams.get("status") ?? "approved,complete";
    const statusFilter: CommitmentStatusFilter = new Set(
      statusParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );

    const costCodeId = await resolveCostCodeId(
      supabase,
      projectIdNum,
      budgetLineId,
      costCodeParam,
    );
    if (!costCodeId) {
      return NextResponse.json({ commitments: [] });
    }

    let matchingBudgetCodes: string[];
    try {
      matchingBudgetCodes = await resolveMatchingBudgetCodes(
        supabase,
        projectIdNum,
        costCodeId,
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to resolve matching budget codes",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    const [subcontractsRes, purchaseOrdersRes] = await Promise.all([
      supabase
        .from("subcontract_sov_items")
        .select(
          `
          id,
          amount,
          description,
          budget_code,
          subcontract_id,
          subcontracts!inner(
            id,
            project_id,
            status,
            contract_number,
            created_at
          )
        `,
        )
        .eq("subcontracts.project_id", projectIdNum)
        .in("budget_code", matchingBudgetCodes),
      supabase
        .from("purchase_order_sov_items")
        .select(
          `
          id,
          amount,
          description,
          budget_code,
          purchase_order_id,
          purchase_orders!inner(
            id,
            project_id,
            status,
            contract_number,
            created_at
          )
        `,
        )
        .eq("purchase_orders.project_id", projectIdNum)
        .in("budget_code", matchingBudgetCodes),
    ]);

    if (subcontractsRes.error || purchaseOrdersRes.error) {
      return NextResponse.json(
        {
          error: "Failed to fetch commitments",
          details: subcontractsRes.error?.message ?? purchaseOrdersRes.error?.message,
        },
        { status: 500 },
      );
    }

    const commitments = [
      ...(subcontractsRes.data ?? [])
        .filter((row) => {
          const parent = Array.isArray(row.subcontracts)
            ? row.subcontracts[0]
            : row.subcontracts;
          return parent?.status
            ? statusFilter.has(parent.status.toLowerCase())
            : false;
        })
        .map((row) => {
          const parent = Array.isArray(row.subcontracts)
            ? row.subcontracts[0]
            : row.subcontracts;

          return {
            id: row.id,
            commitmentNumber: parent?.contract_number || "",
            vendor: null,
            description: row.description || "",
            amount: Number(row.amount) || 0,
            status: parent?.status || "",
            type: "subcontract" as const,
            executedDate: parent?.created_at || null,
            changeOrders: 0,
          };
        }),
      ...(purchaseOrdersRes.data ?? [])
        .filter((row) => {
          const parent = Array.isArray(row.purchase_orders)
            ? row.purchase_orders[0]
            : row.purchase_orders;
          return parent?.status
            ? statusFilter.has(parent.status.toLowerCase())
            : false;
        })
        .map((row) => {
          const parent = Array.isArray(row.purchase_orders)
            ? row.purchase_orders[0]
            : row.purchase_orders;

          return {
            id: row.id,
            commitmentNumber: parent?.contract_number || "",
            vendor: null,
            description: row.description || "",
            amount: Number(row.amount) || 0,
            status: parent?.status || "",
            type: "purchase_order" as const,
            executedDate: parent?.created_at || null,
            changeOrders: 0,
          };
        }),
    ];

    return NextResponse.json({ commitments });
  },
);
