import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Direct Costs API Endpoint
 *
 * Returns direct cost data for a project or specific budget line.
 * Implements Procore cost calculation rules:
 * - Job to Date Cost Detail = ALL approved types (Invoice, Expense, Payroll, Subcontractor Invoice)
 * - Direct Costs = Approved types EXCLUDING Subcontractor Invoice
 */

// Cost types that count towards Job to Date (all approved)
const JTD_COST_TYPES = [
  "Invoice",
  "Expense",
  "Payroll",
  "Subcontractor Invoice",
];

// Cost types that count towards Direct Costs (excludes Subcontractor Invoice)
const DIRECT_COST_TYPES = ["Invoice", "Expense", "Payroll"];
const APPROVED_DIRECT_COST_STATUSES = ["Approved", "Paid"];

interface DirectCostWithRelations {
  id: string;
  budget_code_id: string | null;
  line_total: number | null;
  quantity: number | null;
  unit_cost: number | null;
  description: string | null;
  direct_costs:
    | {
        cost_type: string | null;
        status: string | null;
        vendor_id: string | null;
        invoice_number: string | null;
        date: string | null;
        vendors:
          | {
              name: string;
            }[]
          | null;
      }[]
    | null;
}

interface CostBreakdown {
  Invoice: number;
  Expense: number;
  Payroll: number;
  "Subcontractor Invoice": number;
}

// GET /api/projects/[id]/budget/direct-costs
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

    const { searchParams } = new URL(request.url);
    const budgetLineId = searchParams.get("budgetLineId");
    const statusFilter = searchParams.get("status"); // 'approved', 'pending', 'all'

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If budgetLineId is provided, get the cost_code_id from budget_lines
    let costCodeId: string | null = null;
    if (budgetLineId) {
      const { data: budgetLine, error: lineError } = await supabase
        .from("budget_lines")
        .select("cost_code_id")
        .eq("id", budgetLineId)
        .single();

      if (lineError || !budgetLine) {
        return NextResponse.json(
          { error: "Budget line not found" },
          { status: 404 },
        );
      }
      costCodeId = budgetLine.cost_code_id;
    }

    // Build query for direct_cost_line_items
    let query = supabase
      .from("direct_cost_line_items")
      .select(
        `
        id,
        budget_code_id,
        line_total,
        quantity,
        unit_cost,
        description,
        direct_costs!inner(
          cost_type,
          status,
          project_id,
          vendor_id,
          invoice_number,
          date,
          vendors (
            name
          )
        )
      `,
      )
      .eq("direct_costs.project_id", projectIdNum)
      .order("direct_costs.date", { ascending: false });

    // Filter by cost_code_id if budgetLineId was provided
    if (costCodeId) {
      query = query.eq("budget_code_id", costCodeId);
    }

    const { data: costs, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch direct costs" },
        { status: 500 },
      );
    }

    // Calculate aggregates using Procore cost rules
    let jobToDateCostDetail = 0;
    let directCosts = 0;
    let pendingCosts = 0;

    const breakdown: CostBreakdown = {
      Invoice: 0,
      Expense: 0,
      Payroll: 0,
      "Subcontractor Invoice": 0,
    };

    const isApprovedStatus = (status: string | null) =>
      status ? APPROVED_DIRECT_COST_STATUSES.includes(status) : false;

    const filteredCosts = (costs || []).filter((cost: DirectCostWithRelations) => {
      const directCost = cost.direct_costs?.[0];
      const status = directCost?.status || null;
      if (statusFilter === "approved") {
        return isApprovedStatus(status);
      }
      if (statusFilter === "pending") {
        return !isApprovedStatus(status);
      }
      return true;
    });

    for (const cost of filteredCosts as DirectCostWithRelations[]) {
      const directCost = cost.direct_costs?.[0];
      const costType = directCost?.cost_type || "Invoice";
      const amount =
        cost.line_total ?? (cost.quantity ?? 0) * (cost.unit_cost ?? 0);
      const isApproved = isApprovedStatus(directCost?.status || null);

      if (isApproved) {
        // Job to Date Cost Detail = ALL approved types (includes Subcontractor Invoice)
        if (JTD_COST_TYPES.includes(costType)) {
          jobToDateCostDetail += amount;

          // Track breakdown by type
          if (costType in breakdown) {
            breakdown[costType as keyof CostBreakdown] += amount;
          }
        }

        // Direct Costs = EXCLUDE Subcontractor Invoice
        if (DIRECT_COST_TYPES.includes(costType)) {
          directCosts += amount;
        }
      } else {
        // Pending (not yet approved)
        pendingCosts += amount;
      }
    }

    // Transform costs for frontend
    const transformedCosts = (filteredCosts || []).map(
      (cost: DirectCostWithRelations) => {
        const directCost = cost.direct_costs?.[0];
        const amount =
          cost.line_total ?? (cost.quantity ?? 0) * (cost.unit_cost ?? 0);
        const status = isApprovedStatus(directCost?.status || null)
          ? "approved"
          : "pending";
        const vendor = directCost?.vendors?.[0]?.name || null;

        return {
          id: cost.id,
          description: cost.description || "",
          amount,
          costType: directCost?.cost_type || null,
          vendor,
          invoiceNumber: directCost?.invoice_number || null,
          transactionDate: directCost?.date || null,
          approved: status === "approved",
          approvedAt: null,
          approvedBy: null,
          costCodeId: cost.budget_code_id,
          status,
          payments: 0,
          incurredDate: directCost?.date || null,
        };
      },
    );

    return NextResponse.json({
      costs: transformedCosts,
      totals: {
        jobToDateCostDetail,
        directCosts,
        pendingCosts,
        count: transformedCosts.length,
      },
      breakdown,
      meta: {
        costCodeId,
        projectId,
        statusFilter: statusFilter || "all",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
