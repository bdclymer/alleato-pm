import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions-guard";

type TypeFilter = "all" | "commitment" | "change_order";

const PENDING_SUBCONTRACT_STATUSES = ["out for signature", "pending"];
const PENDING_PO_STATUSES = ["draft", "sent", "acknowledged"];

interface RuntimeCommitmentsClient {
  from: (tableName: "commitments") => {
    select: (selectedColumns: "id") => {
      eq: (column: "project_id", value: number) => {
        in: (
          column: "id",
          values: string[],
        ) => Promise<{
          data: Array<{ id: string }> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

type PendingRowsResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

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

/**
 * GET /api/projects/[projectId]/budget/pending-cost-changes
 * Returns pending commitments and pending commitment CO rows.
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/budget/pending-cost-changes#GET",
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
    const requestedType = (searchParams.get("type") ?? "all") as TypeFilter;
    const typeFilter: TypeFilter =
      requestedType === "commitment" || requestedType === "change_order"
        ? requestedType
        : "all";

    const costCodeId = await resolveCostCodeId(
      supabase,
      projectIdNum,
      budgetLineId,
      costCodeParam,
    );
    if (!costCodeId) {
      return NextResponse.json({ changes: [] });
    }

    const queries: Array<Promise<PendingRowsResult>> = [];

    if (typeFilter === "all" || typeFilter === "commitment") {
      queries.push(
        (async () => {
          const { data, error } = await supabase
            .from("subcontract_sov_items")
            .select(
              `
              id,
              amount,
              description,
              subcontract_id,
              subcontracts!inner(
                project_id,
                status,
                contract_number,
                created_at
              )
            `,
            )
            .eq("subcontracts.project_id", projectIdNum)
            .eq("budget_code", costCodeId)
            .in("subcontracts.status", PENDING_SUBCONTRACT_STATUSES);

          return {
            data: (data as unknown[] | null) ?? null,
            error: error ? { message: error.message } : null,
          };
        })(),
      );

      queries.push(
        (async () => {
          const { data, error } = await supabase
            .from("purchase_order_sov_items")
            .select(
              `
              id,
              amount,
              description,
              purchase_order_id,
              purchase_orders!inner(
                project_id,
                status,
                contract_number,
                created_at
              )
            `,
            )
            .eq("purchase_orders.project_id", projectIdNum)
            .eq("budget_code", costCodeId)
            .in("purchase_orders.status", PENDING_PO_STATUSES);

          return {
            data: (data as unknown[] | null) ?? null,
            error: error ? { message: error.message } : null,
          };
        })(),
      );
    }

    const results = await Promise.all(queries);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      return NextResponse.json(
        { error: "Failed to fetch pending cost changes", details: failed.error.message },
        { status: 500 },
      );
    }

    let index = 0;
    const changes: Array<{
      id: string;
      number: string;
      description: string;
      amount: number;
      status: string;
      type: "commitment" | "commitment_change_order";
      commitmentType?: "subcontract" | "purchase_order";
      requestedDate: string | null;
    }> = [];

    if (typeFilter === "all" || typeFilter === "commitment") {
      const subcontractRows = (results[index++].data ?? []) as Array<Record<string, unknown>>;
      const poRows = (results[index++].data ?? []) as Array<Record<string, unknown>>;

      for (const row of subcontractRows) {
        const parent = Array.isArray(row.subcontracts)
          ? row.subcontracts[0]
          : row.subcontracts;
        const parentObj = parent as Record<string, unknown> | null;
        changes.push({
          id: String(row.id),
          number: String(parentObj?.contract_number ?? ""),
          description: String(row.description ?? ""),
          amount: Number(row.amount) || 0,
          status: String(parentObj?.status ?? "pending"),
          type: "commitment",
          commitmentType: "subcontract",
          requestedDate: (parentObj?.created_at as string | null) ?? null,
        });
      }

      for (const row of poRows) {
        const parent = Array.isArray(row.purchase_orders)
          ? row.purchase_orders[0]
          : row.purchase_orders;
        const parentObj = parent as Record<string, unknown> | null;
        changes.push({
          id: String(row.id),
          number: String(parentObj?.contract_number ?? ""),
          description: String(row.description ?? ""),
          amount: Number(row.amount) || 0,
          status: String(parentObj?.status ?? "pending"),
          type: "commitment",
          commitmentType: "purchase_order",
          requestedDate: (parentObj?.created_at as string | null) ?? null,
        });
      }
    }

    if (typeFilter === "all" || typeFilter === "change_order") {
      const { data: coLineRows, error: coLineError } = await supabase
        .from("commitment_change_order_lines")
        .select("id, amount, description, commitment_change_order_id")
        .eq("cost_code_id", costCodeId);

      if (coLineError) {
        return NextResponse.json(
          { error: "Failed to fetch pending cost changes", details: coLineError.message },
          { status: 500 },
        );
      }

      const changeOrderIds = Array.from(
        new Set(
          (coLineRows ?? [])
            .map((row) => row.commitment_change_order_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        ),
      );

      if (changeOrderIds.length > 0) {
        const { data: coParents, error: coParentError } = await supabase
          .from("contract_change_orders")
          .select("id, contract_id, change_order_number, status, requested_date, created_at")
          .in("id", changeOrderIds)
          .like("status", "Pending%");

        if (coParentError) {
          return NextResponse.json(
            { error: "Failed to fetch pending cost changes", details: coParentError.message },
            { status: 500 },
          );
        }

        const commitmentIds = Array.from(
          new Set(
            (coParents ?? [])
              .map((row) => row.contract_id)
              .filter((id): id is string => typeof id === "string" && id.length > 0),
          ),
        );

        let allowedCommitmentIds = new Set<string>();
        if (commitmentIds.length > 0) {
          const runtimeSupabase = supabase as unknown as RuntimeCommitmentsClient;
          const { data: commitments, error: commitmentsError } = await runtimeSupabase
            .from("commitments")
            .select("id")
            .eq("project_id", projectIdNum)
            .in("id", commitmentIds);

          if (commitmentsError) {
            return NextResponse.json(
              {
                error: "Failed to fetch pending cost changes",
                details: commitmentsError.message,
              },
              { status: 500 },
            );
          }

          allowedCommitmentIds = new Set((commitments ?? []).map((row) => row.id));
        }

        const parentById = new Map(
          (coParents ?? [])
            .filter((row) => allowedCommitmentIds.has(row.contract_id))
            .map((row) => [row.id, row]),
        );

        for (const row of coLineRows ?? []) {
          const parent = parentById.get(row.commitment_change_order_id);
          if (!parent) continue;

          changes.push({
            id: String(row.id),
            number: parent.change_order_number ?? "",
            description: String(row.description ?? ""),
            amount: Number(row.amount) || 0,
            status: parent.status ?? "pending",
            type: "commitment_change_order",
            requestedDate: parent.requested_date ?? parent.created_at ?? null,
          });
        }
      }
    }

    return NextResponse.json({ changes });
  },
);
