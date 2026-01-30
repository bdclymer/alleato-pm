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

interface DirectCostLineItem {
  id: string;
  projectId: string;
  project_id: number;
  cost_code_id: string | null;
  amount: number;
  cost_type: string | null;
  approved: boolean | null;
  approved_at: string | null;
  approved_by: string | null;
  description: string;
  vendor_name: string | null;
  invoice_number: string | null;
  transaction_date: string;
  created_at: string | null;
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
      .select("*")
      .eq("project_id", projectId)
      .order("transaction_date", { ascending: false });

    // Filter by cost_code_id if budgetLineId was provided
    if (costCodeId) {
      query = query.eq("cost_code_id", costCodeId);
    }

    // Filter by approval status if requested
    if (statusFilter === "approved") {
      query = query.eq("approved", true);
    } else if (statusFilter === "pending") {
      query = query.or("approved.eq.false,approved.is.null");
    }
    // 'all' or undefined = no filter

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

    for (const cost of (costs || []) as DirectCostLineItem[]) {
      const costType = cost.cost_type || "Invoice";
      const amount = cost.amount || 0;
      const isApproved = cost.approved === true;

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
    const transformedCosts = (costs || []).map((cost: DirectCostLineItem) => ({
      id: cost.id,
      description: cost.description,
      amount: cost.amount,
      costType: cost.cost_type,
      vendor: cost.vendor_name,
      invoiceNumber: cost.invoice_number,
      transactionDate: cost.transaction_date,
      approved: cost.approved,
      approvedAt: cost.approved_at,
      approvedBy: cost.approved_by,
      costCodeId: cost.cost_code_id,
    }));

    return NextResponse.json({
      costs: transformedCosts,
      totals: {
        jobToDateCostDetail,
        directCosts,
        pendingCosts,
        count: costs?.length || 0,
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
