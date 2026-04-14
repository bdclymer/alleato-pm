/**
 * Shared budget grand-totals computation.
 *
 * This is the single source of truth for "what are the current budget totals
 * for project N?". It is consumed by:
 *
 *   - GET /api/projects/[id]/budget            (main budget table)
 *   - GET /api/projects/[id]/budget/snapshots  ("current" comparison block)
 *   - POST /api/projects/[id]/budget/snapshots (captured grand_totals JSON)
 *
 * Every number that ends up in a snapshot or a budget grand-totals row flows
 * through this helper. Keep all money/aggregation logic here — do not
 * duplicate it in route handlers.
 *
 * Per Procore parity:
 *   - Job-to-Date cost detail includes Subcontractor Invoice
 *   - Direct Costs excludes Subcontractor Invoice
 *   - Committed Costs = executed subcontracts + POs + approved commitment COs
 *   - Pending Cost Changes = pending subcontracts + POs + pending commitment COs
 *   - Pending Budget Changes = pending prime contract COs
 */

import type { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Status + cost-type constants (kept in lock-step with Procore semantics)
// ---------------------------------------------------------------------------

/** Cost types that count towards Job to Date Cost Detail (ALL approved types) */
const JTD_COST_TYPES = [
  "Invoice",
  "Expense",
  "Payroll",
  "Subcontractor Invoice",
];

/** Cost types that count towards Direct Costs (EXCLUDES Subcontractor Invoice) */
const DIRECT_COST_TYPES = ["Invoice", "Expense", "Payroll"];
const APPROVED_DIRECT_COST_STATUSES = ["Approved"];

const PENDING_SUBCONTRACT_STATUSES = ["Out for Signature", "Pending"];
const PENDING_PO_STATUSES = ["Draft", "Sent", "Acknowledged"];

const EXECUTED_SUBCONTRACT_STATUSES = ["Approved", "Complete"];
const EXECUTED_PO_STATUSES = ["Approved", "Completed"];

// ---------------------------------------------------------------------------
// Internal row shapes
// ---------------------------------------------------------------------------

interface CostAggregation {
  jobToDateCostDetail: number;
  directCosts: number;
  pendingCostChanges: number;
  committedCosts: number;
  pendingBudgetChanges: number;
}

interface DirectCostParent {
  cost_type: string | null;
  status: string | null;
  project_id: number | null;
}

interface DirectCostWithRelations {
  budget_code_id: string | null;
  line_total: number | null;
  quantity: number | null;
  unit_cost: number | null;
  direct_costs: DirectCostParent | DirectCostParent[] | null;
}

function getDirectCostParent(
  raw: DirectCostWithRelations["direct_costs"],
): DirectCostParent | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

interface SOVItem {
  budget_code: string | null;
  amount: number | null;
}

interface ChangeOrderLineItem {
  cost_code_id: string | null;
  amount: number | null;
}

interface CommitmentChangeOrderLineItem {
  cost_code_id: string | null;
  amount: number | null;
}

// ---------------------------------------------------------------------------
// Budget-row fetch with v_budget_lines → budget_lines fallback
// ---------------------------------------------------------------------------

type BudgetRowSource = "view" | "table";
const BUDGET_LINES_VIEW = "v_budget_lines";
const PRIME_CHANGE_ORDER_LINES_TABLE = "change_order_lines";

// The `v_budget_lines` view exists in the database but is not yet included in
// the generated `Database` types. Cast the client to an untyped shape for the
// single call that needs it so we don't blow up the whole file with deep
// inference / "no overload" errors. This is a documented escape hatch; regen
// types once the view is added to the generator output.
type UntypedFrom = {
  from: (table: string) => {
    select: (query: string) => {
      eq: (
        column: string,
        value: unknown,
      ) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{
          data: Record<string, unknown>[] | null;
          error: unknown;
        }>;
      };
    };
  };
};

type PendingChangeOrderLinesClient = {
  from: (table: string) => {
    select: (query: string) => {
      eq: (
        column: string,
        value: number,
      ) => {
        like: (
          nextColumn: string,
          pattern: string,
        ) => Promise<{ data: ChangeOrderLineItem[] | null; error: unknown }>;
      };
    };
  };
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function fetchBudgetRows(
  supabase: SupabaseServerClient,
  projectIdNum: number,
): Promise<{
  data: Record<string, unknown>[] | null;
  error: unknown;
  source: BudgetRowSource;
}> {
  const untypedClient = supabase as unknown as UntypedFrom;
  const viewResult = await untypedClient
    .from(BUDGET_LINES_VIEW)
    .select(
      `
      *,
      cost_code:cost_codes(id, title, division_id),
      cost_type:cost_code_types(code, description),
      sub_job:sub_jobs(code, name)
    `,
    )
    .eq("project_id", projectIdNum)
    .order("cost_code_id", { ascending: true });

  if (!viewResult.error) {
    return {
      data: (viewResult.data as Record<string, unknown>[] | null) ?? [],
      error: null,
      source: "view",
    };
  }

  const serializedError = JSON.stringify(viewResult.error);
  const isMissingView =
    serializedError.includes("v_budget_lines") ||
    serializedError.includes(BUDGET_LINES_VIEW) ||
    serializedError.includes("PGRST205") ||
    serializedError.includes("schema cache");

  if (!isMissingView) {
    return {
      data: null,
      error: viewResult.error,
      source: "view",
    };
  }

  console.warn(
    "[budget] Falling back to budget_lines because v_budget_lines is unavailable",
    viewResult.error,
  );

  const tableResult = await supabase
    .from("budget_lines")
    .select(
      `
      *,
      cost_code:cost_codes(id, title, division_id),
      cost_type:cost_code_types(code, description),
      sub_job:sub_jobs(code, name)
    `,
    )
    .eq("project_id", projectIdNum)
    .order("cost_code_id", { ascending: true });

  return {
    data: (tableResult.data as Record<string, unknown>[] | null) ?? [],
    error: tableResult.error,
    source: "table",
  };
}

async function fetchPendingPrimeChangeOrderLines(
  supabase: SupabaseServerClient,
  projectIdNum: number,
) {
  const runtimeClient = supabase as unknown as PendingChangeOrderLinesClient;
  const result = await runtimeClient
    .from(PRIME_CHANGE_ORDER_LINES_TABLE)
    .select("cost_code_id, amount, change_orders!inner(status, project_id)")
    .eq("change_orders.project_id", projectIdNum)
    .like("change_orders.status", "Pending%");

  const serializedError = JSON.stringify(result.error);
  const isMissingTable =
    serializedError.includes(PRIME_CHANGE_ORDER_LINES_TABLE) ||
    serializedError.includes("PGRST205") ||
    serializedError.includes("schema cache");

  if (result.error && isMissingTable) {
    return { data: [], error: null };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Pure reducers — tested directly, no DB dependency
// ---------------------------------------------------------------------------

/**
 * Empty grand-totals object. Exported so callers can compare against it for
 * "no budget data yet" detection.
 */
export const EMPTY_GRAND_TOTALS: GrandTotals = {
  originalBudgetAmount: 0,
  budgetModifications: 0,
  approvedCOs: 0,
  revisedBudget: 0,
  jobToDateCostDetail: 0,
  directCosts: 0,
  pendingChanges: 0,
  projectedBudget: 0,
  committedCosts: 0,
  pendingCostChanges: 0,
  projectedCosts: 0,
  forecastToComplete: 0,
  estimatedCostAtCompletion: 0,
  projectedOverUnder: 0,
};

export interface BudgetLineItem {
  id: string;
  description: string;
  costCode: string;
  costCodeDescription: string;
  costType: string;
  division: string;
  divisionTitle: string;
  subJob: string;
  originalBudgetAmount: number;
  budgetModifications: number;
  approvedCOs: number;
  revisedBudget: number;
  jobToDateCostDetail: number;
  directCosts: number;
  pendingChanges: number;
  projectedBudget: number;
  committedCosts: number;
  pendingCostChanges: number;
  projectedCosts: number;
  forecastToComplete: number;
  estimatedCostAtCompletion: number;
  projectedOverUnder: number;
}

export type GrandTotals = Omit<
  BudgetLineItem,
  | "id"
  | "description"
  | "costCode"
  | "costCodeDescription"
  | "costType"
  | "division"
  | "divisionTitle"
  | "subJob"
>;

/**
 * Reduce an array of line items into their summed grand totals.
 * Pure function — safe to unit-test.
 */
export function reduceGrandTotals(lineItems: BudgetLineItem[]): GrandTotals {
  return lineItems.reduce<GrandTotals>(
    (totals, item) => ({
      originalBudgetAmount:
        totals.originalBudgetAmount + item.originalBudgetAmount,
      budgetModifications:
        totals.budgetModifications + item.budgetModifications,
      approvedCOs: totals.approvedCOs + item.approvedCOs,
      revisedBudget: totals.revisedBudget + item.revisedBudget,
      jobToDateCostDetail:
        totals.jobToDateCostDetail + item.jobToDateCostDetail,
      directCosts: totals.directCosts + item.directCosts,
      pendingChanges: totals.pendingChanges + item.pendingChanges,
      projectedBudget: totals.projectedBudget + item.projectedBudget,
      committedCosts: totals.committedCosts + item.committedCosts,
      pendingCostChanges:
        totals.pendingCostChanges + item.pendingCostChanges,
      projectedCosts: totals.projectedCosts + item.projectedCosts,
      forecastToComplete: totals.forecastToComplete + item.forecastToComplete,
      estimatedCostAtCompletion:
        totals.estimatedCostAtCompletion + item.estimatedCostAtCompletion,
      projectedOverUnder:
        totals.projectedOverUnder + item.projectedOverUnder,
    }),
    { ...EMPTY_GRAND_TOTALS },
  );
}

// ---------------------------------------------------------------------------
// Orchestrator — fetches all 10 sources and returns line items + grand totals
// ---------------------------------------------------------------------------

export interface ComputeGrandTotalsResult {
  lineItems: BudgetLineItem[];
  grandTotals: GrandTotals;
  /** Informational: which data source the per-line budget rows came from. */
  source: BudgetRowSource;
}

export class BudgetFetchError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super("Failed to fetch budget data for grand-totals computation");
    this.name = "BudgetFetchError";
    this.cause = cause;
  }
}

export async function computeBudgetGrandTotals(
  supabase: SupabaseServerClient,
  projectIdNum: number,
): Promise<ComputeGrandTotalsResult> {
  const [
    budgetRowsResult,
    directCostsRes,
    projectCostCodesRes,
    subcontractSovRes,
    poSovRes,
    pendingPrimeChangeOrdersRes,
    executedSubcontractSovRes,
    executedPoSovRes,
    pendingCommitmentCOsRes,
    approvedCommitmentCOsRes,
  ] = await Promise.all([
    fetchBudgetRows(supabase, projectIdNum),
    supabase
      .from("direct_cost_line_items")
      .select(
        `
        budget_code_id,
        line_total,
        quantity,
        unit_cost,
        direct_costs!inner(
          cost_type,
          status,
          project_id
        )
      `,
      )
      .eq("direct_costs.project_id", projectIdNum)
      .in("direct_costs.status", APPROVED_DIRECT_COST_STATUSES),

    supabase
      .from("project_cost_codes")
      .select("id, cost_code_id")
      .eq("project_id", projectIdNum),

    supabase
      .from("subcontract_sov_items")
      .select("budget_code, amount, subcontracts!inner(status, project_id)")
      .eq("subcontracts.project_id", projectIdNum)
      .in("subcontracts.status", PENDING_SUBCONTRACT_STATUSES),

    supabase
      .from("purchase_order_sov_items")
      .select(
        "budget_code, amount, purchase_orders!inner(status, project_id)",
      )
      .eq("purchase_orders.project_id", projectIdNum)
      .in("purchase_orders.status", PENDING_PO_STATUSES),

    fetchPendingPrimeChangeOrderLines(supabase, projectIdNum),

    supabase
      .from("subcontract_sov_items")
      .select("budget_code, amount, subcontracts!inner(status, project_id)")
      .eq("subcontracts.project_id", projectIdNum)
      .in("subcontracts.status", EXECUTED_SUBCONTRACT_STATUSES),

    supabase
      .from("purchase_order_sov_items")
      .select(
        "budget_code, amount, purchase_orders!inner(status, project_id)",
      )
      .eq("purchase_orders.project_id", projectIdNum)
      .in("purchase_orders.status", EXECUTED_PO_STATUSES),

    supabase
      .from("commitment_change_order_lines")
      .select(
        `
        cost_code_id,
        amount,
        commitment_change_orders!inner(
          status,
          commitments!inner(project_id)
        )
      `,
      )
      .eq("commitment_change_orders.commitments.project_id", projectIdNum)
      .like("commitment_change_orders.status", "Pending%"),

    supabase
      .from("commitment_change_order_lines")
      .select(
        `
        cost_code_id,
        amount,
        commitment_change_orders!inner(
          status,
          commitments!inner(project_id)
        )
      `,
      )
      .eq("commitment_change_orders.commitments.project_id", projectIdNum)
      .eq("commitment_change_orders.status", "Approved"),
  ]);

  if (budgetRowsResult.error) {
    throw new BudgetFetchError(budgetRowsResult.error);
  }

  // ---- Aggregate costs by cost_code_id across all sources ----
  const costsByCode: Record<string, CostAggregation> = {};
  const ensureCostEntry = (codeId: string) => {
    if (!costsByCode[codeId]) {
      costsByCode[codeId] = {
        jobToDateCostDetail: 0,
        directCosts: 0,
        pendingCostChanges: 0,
        committedCosts: 0,
        pendingBudgetChanges: 0,
      };
    }
  };

  // Translation map: project_cost_codes.id -> cost_codes.id
  const pccToCostCodeId: Record<string, string> = {};
  for (const pcc of projectCostCodesRes.data || []) {
    if (pcc.id && pcc.cost_code_id) {
      pccToCostCodeId[pcc.id] = pcc.cost_code_id;
    }
  }

  // Direct costs (approved only) → JTD + Direct Costs
  for (const cost of (directCostsRes.data || []) as DirectCostWithRelations[]) {
    const codeId = cost.budget_code_id
      ? (pccToCostCodeId[cost.budget_code_id] ?? null)
      : null;
    if (!codeId) continue;
    ensureCostEntry(codeId);

    const directCost = getDirectCostParent(cost.direct_costs);
    const costType = directCost?.cost_type || "Invoice";
    const amount =
      cost.line_total ?? (cost.quantity ?? 0) * (cost.unit_cost ?? 0);

    if (JTD_COST_TYPES.includes(costType)) {
      costsByCode[codeId].jobToDateCostDetail += amount;
    }
    if (DIRECT_COST_TYPES.includes(costType)) {
      costsByCode[codeId].directCosts += amount;
    }
  }

  // Pending Cost Changes: subcontracts, POs, commitment COs
  for (const item of (subcontractSovRes.data || []) as SOVItem[]) {
    const codeId = item.budget_code;
    if (!codeId) continue;
    ensureCostEntry(codeId);
    costsByCode[codeId].pendingCostChanges += item.amount || 0;
  }
  for (const item of (poSovRes.data || []) as SOVItem[]) {
    const codeId = item.budget_code;
    if (!codeId) continue;
    ensureCostEntry(codeId);
    costsByCode[codeId].pendingCostChanges += item.amount || 0;
  }
  for (const item of (pendingCommitmentCOsRes.data ||
    []) as CommitmentChangeOrderLineItem[]) {
    const codeId = item.cost_code_id;
    if (!codeId) continue;
    ensureCostEntry(codeId);
    costsByCode[codeId].pendingCostChanges += item.amount || 0;
  }

  // Pending Budget Changes: pending prime contract COs
  for (const item of (pendingPrimeChangeOrdersRes.data ||
    []) as ChangeOrderLineItem[]) {
    const codeId = item.cost_code_id;
    if (!codeId) continue;
    ensureCostEntry(codeId);
    costsByCode[codeId].pendingBudgetChanges += item.amount || 0;
  }

  // Committed Costs: executed subs + POs + approved commitment COs
  for (const item of (executedSubcontractSovRes.data || []) as SOVItem[]) {
    const codeId = item.budget_code;
    if (!codeId) continue;
    ensureCostEntry(codeId);
    costsByCode[codeId].committedCosts += item.amount || 0;
  }
  for (const item of (executedPoSovRes.data || []) as SOVItem[]) {
    const codeId = item.budget_code;
    if (!codeId) continue;
    ensureCostEntry(codeId);
    costsByCode[codeId].committedCosts += item.amount || 0;
  }
  for (const item of (approvedCommitmentCOsRes.data ||
    []) as CommitmentChangeOrderLineItem[]) {
    const codeId = item.cost_code_id;
    if (!codeId) continue;
    ensureCostEntry(codeId);
    costsByCode[codeId].committedCosts += item.amount || 0;
  }

  // ---- Map budget rows to full line items ----
  const usingBudgetTableFallback = budgetRowsResult.source === "table";

  const lineItems: BudgetLineItem[] = (budgetRowsResult.data || []).map(
    (item: Record<string, unknown>) => {
      const costCode = item.cost_code as
        | { id?: string; title?: string; division_id?: string }
        | undefined;
      const costType = item.cost_type as
        | { code?: string; description?: string }
        | undefined;
      const subJob = item.sub_job as
        | { code?: string; name?: string }
        | undefined;
      const costCodeId = item.cost_code_id as string;

      const costData = costsByCode[costCodeId] || {
        jobToDateCostDetail: 0,
        directCosts: 0,
        pendingCostChanges: 0,
        committedCosts: 0,
        pendingBudgetChanges: 0,
      };

      const originalBudgetAmount =
        parseFloat(item.original_amount as string) || 0;
      const budgetModifications = usingBudgetTableFallback
        ? 0
        : parseFloat(item.budget_mod_total as string) || 0;
      const approvedCOs = usingBudgetTableFallback
        ? 0
        : parseFloat(item.approved_co_total as string) || 0;
      const revisedBudget = usingBudgetTableFallback
        ? originalBudgetAmount + budgetModifications + approvedCOs
        : parseFloat(item.revised_budget as string) || 0;

      const projectedBudget = revisedBudget + costData.pendingBudgetChanges;
      const projectedCosts =
        costData.directCosts +
        costData.committedCosts +
        costData.pendingCostChanges;
      const forecastToComplete = Math.max(0, projectedBudget - projectedCosts);
      const estimatedCostAtCompletion = projectedCosts + forecastToComplete;
      const projectedOverUnder = projectedBudget - estimatedCostAtCompletion;

      return {
        id: item.id as string,
        description:
          (item.description as string) ||
          `${costCodeId} - ${costCode?.title || ""} ${costType?.code ? `(${costType.code})` : ""}`,
        costCode: costCodeId,
        costCodeDescription: costCode?.title || "",
        costType: costType?.code || "",
        division: costCode?.division_id || "",
        divisionTitle: "",
        subJob: subJob?.name || "",

        originalBudgetAmount,
        budgetModifications,
        approvedCOs,
        revisedBudget,

        jobToDateCostDetail: costData.jobToDateCostDetail,
        directCosts: costData.directCosts,
        pendingChanges: costData.pendingBudgetChanges,
        projectedBudget,
        committedCosts: costData.committedCosts,
        pendingCostChanges: costData.pendingCostChanges,
        projectedCosts,
        forecastToComplete,
        estimatedCostAtCompletion,
        projectedOverUnder,
      };
    },
  );

  const grandTotals = reduceGrandTotals(lineItems);

  return {
    lineItems,
    grandTotals,
    source: budgetRowsResult.source,
  };
}
