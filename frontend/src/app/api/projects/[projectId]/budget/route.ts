import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BudgetLineItemsPayloadSchema } from "@/lib/schemas/budget";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * Cost types that count towards Job to Date Cost Detail (ALL approved types)
 * Per Procore: Invoice, Expense, Payroll, Subcontractor Invoice
 */
const JTD_COST_TYPES = [
  "Invoice",
  "Expense",
  "Payroll",
  "Subcontractor Invoice",
];

/**
 * Cost types that count towards Direct Costs (EXCLUDES Subcontractor Invoice)
 * Per Procore: Invoice, Expense, Payroll only
 */
const DIRECT_COST_TYPES = ["Invoice", "Expense", "Payroll"];

/**
 * Pending commitment statuses for Pending Cost Changes calculation
 * Per Procore definitions
 */
const PENDING_SUBCONTRACT_STATUSES = ["Out For Signature"];
const PENDING_PO_STATUSES = [
  "Processing",
  "Submitted",
  "Partially Received",
  "Received",
];

/**
 * Executed/Approved commitment statuses for Committed Costs calculation
 * Per Procore: Commitments with executed/approved status count towards committed costs
 */
const EXECUTED_SUBCONTRACT_STATUSES = ["approved", "executed", "complete", "Draft"];
const EXECUTED_PO_STATUSES = ["approved", "executed", "complete", "Draft"];

interface CostAggregation {
  jobToDateCostDetail: number;
  directCosts: number;
  pendingCostChanges: number;
  committedCosts: number;
}

interface DirectCostItem {
  cost_code_id: string | null;
  amount: number;
  cost_type: string | null;
  approved: boolean | null;
}

interface SOVItem {
  budget_code: string | null;
  amount: number | null;
}

interface ChangeOrderLineItem {
  cost_code_id: string | null;
  amount: number | null;
}

// GET /api/projects/[id]/budget - Fetch budget data for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Fetch all data sources in parallel for performance
    const [
      budgetLinesRes,
      directCostsRes,
      subcontractSovRes,
      poSovRes,
      changeOrdersRes,
      executedSubcontractSovRes,
      executedPoSovRes,
    ] = await Promise.all([
      // Budget lines from materialized view
      supabase
        .from("v_budget_lines")
        .select(
          `
          *,
          cost_code:cost_codes(id, title, division_id),
          cost_type:cost_code_types(code, description),
          sub_job:sub_jobs(code, name)
        `,
        )
        .eq("project_id", projectIdNum)
        .order("cost_code_id", { ascending: true }),

      // Direct costs for JTD and Direct Cost calculations
      supabase
        .from("direct_cost_line_items")
        .select("cost_code_id, amount, cost_type, approved")
        .eq("project_id", projectIdNum),

      // Subcontract SOV items with pending status for Pending Cost Changes
      supabase
        .from("subcontract_sov_items")
        .select("budget_code, amount, subcontracts!inner(status, project_id)")
        .eq("subcontracts.project_id", projectId)
        .in("subcontracts.status", PENDING_SUBCONTRACT_STATUSES),

      // PO SOV items with pending statuses for Pending Cost Changes
      supabase
        .from("purchase_order_sov_items")
        .select(
          "budget_code, amount, purchase_orders!inner(status, project_id)",
        )
        .eq("purchase_orders.project_id", projectId)
        .in("purchase_orders.status", PENDING_PO_STATUSES),

      // Pending change orders for Pending Cost Changes
      supabase
        .from("change_order_lines")
        .select("cost_code_id, amount, change_orders!inner(status, project_id)")
        .eq("change_orders.project_id", projectId)
        .like("change_orders.status", "Pending%"),

      // Executed/Approved Subcontract SOV items for Committed Costs
      supabase
        .from("subcontract_sov_items")
        .select("budget_code, amount, subcontracts!inner(status, project_id)")
        .eq("subcontracts.project_id", projectId)
        .in("subcontracts.status", EXECUTED_SUBCONTRACT_STATUSES),

      // Executed/Approved PO SOV items for Committed Costs
      supabase
        .from("purchase_order_sov_items")
        .select(
          "budget_code, amount, purchase_orders!inner(status, project_id)",
        )
        .eq("purchase_orders.project_id", projectId)
        .in("purchase_orders.status", EXECUTED_PO_STATUSES),
    ]);

    if (budgetLinesRes.error) {
      return apiErrorResponse(budgetLinesRes.error);
    }

    // Build cost aggregation by cost_code_id
    const costsByCode: Record<string, CostAggregation> = {};

    // Initialize helper function
    const ensureCostEntry = (codeId: string) => {
      if (!costsByCode[codeId]) {
        costsByCode[codeId] = {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
        };
      }
    };

    // SOURCE 1 & 2: Direct Costs (approved only)
    // Per Procore:
    // - JTD Cost Detail = ALL approved types including Subcontractor Invoice
    // - Direct Costs = Approved types EXCLUDING Subcontractor Invoice
    for (const cost of (directCostsRes.data || []) as DirectCostItem[]) {
      const codeId = cost.cost_code_id;
      if (!codeId) continue;

      ensureCostEntry(codeId);

      if (cost.approved !== true) continue;

      const costType = cost.cost_type || "Invoice";
      const amount = cost.amount || 0;

      // Job to Date = ALL approved types (includes Subcontractor Invoice)
      if (JTD_COST_TYPES.includes(costType)) {
        costsByCode[codeId].jobToDateCostDetail += amount;
      }

      // Direct Costs = EXCLUDE Subcontractor Invoice
      if (DIRECT_COST_TYPES.includes(costType)) {
        costsByCode[codeId].directCosts += amount;
      }
    }

    // SOURCE 3: Pending Cost Changes from Subcontracts
    for (const item of (subcontractSovRes.data || []) as SOVItem[]) {
      const codeId = item.budget_code; // budget_code references cost code
      if (!codeId) continue;
      ensureCostEntry(codeId);
      costsByCode[codeId].pendingCostChanges += item.amount || 0;
    }

    // SOURCE 3: Pending Cost Changes from Purchase Orders
    for (const item of (poSovRes.data || []) as SOVItem[]) {
      const codeId = item.budget_code;
      if (!codeId) continue;
      ensureCostEntry(codeId);
      costsByCode[codeId].pendingCostChanges += item.amount || 0;
    }

    // SOURCE 3: Pending Cost Changes from Change Orders
    for (const item of (changeOrdersRes.data || []) as ChangeOrderLineItem[]) {
      const codeId = item.cost_code_id;
      if (!codeId) continue;
      ensureCostEntry(codeId);
      costsByCode[codeId].pendingCostChanges += item.amount || 0;
    }

    // SOURCE 4: Committed Costs from Executed Subcontracts
    // Per Procore: Committed Costs = Sum of SOV amounts from executed/approved commitments
    for (const item of (executedSubcontractSovRes.data || []) as SOVItem[]) {
      const codeId = item.budget_code;
      if (!codeId) continue;
      ensureCostEntry(codeId);
      costsByCode[codeId].committedCosts += item.amount || 0;
    }

    // SOURCE 4: Committed Costs from Executed Purchase Orders
    for (const item of (executedPoSovRes.data || []) as SOVItem[]) {
      const codeId = item.budget_code;
      if (!codeId) continue;
      ensureCostEntry(codeId);
      costsByCode[codeId].committedCosts += item.amount || 0;
    }

    // Transform to frontend format with real cost data
    const lineItems = (budgetLinesRes.data || []).map(
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

        // Get cost data for this line item
        const costData = costsByCode[costCodeId] || {
          jobToDateCostDetail: 0,
          directCosts: 0,
          pendingCostChanges: 0,
          committedCosts: 0,
        };

        // Core budget values
        const originalBudgetAmount =
          parseFloat(item.original_amount as string) || 0;
        const budgetModifications =
          parseFloat(item.budget_mod_total as string) || 0;
        const approvedCOs = parseFloat(item.approved_co_total as string) || 0;
        const revisedBudget = parseFloat(item.revised_budget as string) || 0;

        // Calculated fields
        const forecastToComplete = Math.max(
          0,
          revisedBudget - costData.jobToDateCostDetail,
        );
        const estimatedCostAtCompletion =
          costData.jobToDateCostDetail + forecastToComplete;
        const projectedOverUnder = revisedBudget - estimatedCostAtCompletion;

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

          // Core budget values from view
          originalBudgetAmount,
          budgetModifications,
          approvedCOs,
          revisedBudget,

          // Cost tracking fields with real data
          jobToDateCostDetail: costData.jobToDateCostDetail,
          directCosts: costData.directCosts,
          pendingChanges: costData.pendingCostChanges,
          projectedBudget: revisedBudget,
          committedCosts: costData.committedCosts,
          pendingCostChanges: costData.pendingCostChanges,
          projectedCosts: costData.directCosts + costData.committedCosts + costData.pendingCostChanges,
          forecastToComplete,
          estimatedCostAtCompletion,
          projectedOverUnder,
        };
      },
    );

    // Calculate grand totals from line items
    const grandTotals = lineItems.reduce(
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
        pendingCostChanges: totals.pendingCostChanges + item.pendingCostChanges,
        projectedCosts: totals.projectedCosts + item.projectedCosts,
        forecastToComplete: totals.forecastToComplete + item.forecastToComplete,
        estimatedCostAtCompletion:
          totals.estimatedCostAtCompletion + item.estimatedCostAtCompletion,
        projectedOverUnder: totals.projectedOverUnder + item.projectedOverUnder,
      }),
      {
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
      },
    );

    return NextResponse.json({
      lineItems,
      grandTotals,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// POST /api/projects/[id]/budget - Create budget line items
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = BudgetLineItemsPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const normalizedLineItems = parsed.data.lineItems.map((item) => ({
      costCodeId: item.costCodeId,
      costTypeId: item.costType ?? null,
      qty: item.qty && item.qty !== "" ? parseFloat(item.qty) : null,
      uom: item.uom ?? null,
      unitCost:
        item.unitCost && item.unitCost !== ""
          ? parseFloat(item.unitCost)
          : null,
      amount: parseFloat(item.amount),
      description: item.description ?? null,
    }));

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 },
      );
    }

    // Look up cost code IDs from the code strings or IDs
    const costCodes = normalizedLineItems.map((item) => item.costCodeId);
    const { data: costCodeData, error: codeError } = await supabase
      .from("cost_codes")
      .select("id")
      .in("id", costCodes);

    if (codeError) {
      return apiErrorResponse(codeError);
    }

    // Create a map of code ID to verify existence
    const validCostCodeIds = new Set((costCodeData || []).map((cc) => cc.id));

    // Look up cost type IDs if provided
    const costTypeIds = normalizedLineItems
      .map((item) => item.costTypeId)
      .filter((id): id is string => id !== null);

    let validCostTypeIds = new Set<string>();
    if (costTypeIds.length > 0) {
      const { data: costTypeData, error: typeError } = await supabase
        .from("cost_code_types")
        .select("id")
        .in("id", costTypeIds);

      if (typeError) {
        return apiErrorResponse(typeError);
      }
      validCostTypeIds = new Set((costTypeData || []).map((ct) => ct.id));
    }

    // Create budget_lines using new schema
    const results = [];

    for (const item of normalizedLineItems) {
      if (!validCostCodeIds.has(item.costCodeId)) {
        throw new Error(`Cost code not found: ${item.costCodeId}`);
      }

      if (item.costTypeId && !validCostTypeIds.has(item.costTypeId)) {
        throw new Error(`Cost type not found: ${item.costTypeId}`);
      }

      // Create or update budget_line
      // First try to find existing budget_line
      let query = supabase
        .from("budget_lines")
        .select("id, original_amount")
        .eq("project_id", projectIdNum)
        .eq("cost_code_id", item.costCodeId)
        .is("sub_job_id", null);

      if (item.costTypeId) {
        query = query.eq("cost_type_id", item.costTypeId);
      } else {
        query = query.is("cost_type_id", null);
      }

      const { data: existingBudgetLine } = await query.maybeSingle();

      let budgetLine: { id: string };
      if (existingBudgetLine) {
        // Update existing budget line - add to original amount
        const newAmount =
          (existingBudgetLine.original_amount || 0) + item.amount;
        const { data: updatedLine, error: updateError } = await supabase
          .from("budget_lines")
          .update({
            original_amount: newAmount,
          })
          .eq("id", existingBudgetLine.id)
          .select()
          .single();

        if (updateError) {
          return apiErrorResponse(updateError);
        }
        budgetLine = updatedLine;
      } else {
        // Create new budget_line
        const { data: newBudgetLine, error: blError } = await supabase
          .from("budget_lines")
          .insert({
            project_id: projectId,
            cost_code_id: item.costCodeId,
            cost_type_id: item.costTypeId ?? null,
            sub_job_id: null,
            description: item.description || null,
            original_amount: item.amount || 0,
            quantity: item.qty,
            unit_of_measure: item.uom,
            unit_cost: item.unitCost,
            created_by: user?.id,
          })
          .select()
          .single();

        if (blError) {
          return apiErrorResponse(blError);
        }
        budgetLine = newBudgetLine;
      }

      results.push(budgetLine);
    }

    // Calculate total budget from created line items and update project
    const totalBudget = normalizedLineItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    if (totalBudget > 0) {
      const { error: projectUpdateError } = await supabase
        .from("projects")
        .update({
          original_budget: totalBudget,
          current_budget: totalBudget,
        })
        .eq("id", projectId);

      if (projectUpdateError) {
        // Don't fail the request - line items were created successfully
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      totalBudget,
      message: `Successfully created ${results.length} budget line(s)`,
    });
  } catch (error: unknown) {
    return apiErrorResponse(error);
  }
}
