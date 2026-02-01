import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ForecastParams {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * GET /api/projects/[id]/budget/forecast
 *
 * Calculates budget forecast based on current trends
 * Returns:
 * - Projected budget (revised budget + pending changes)
 * - Projected costs (direct + committed + pending cost changes)
 * - Projected variance
 * - Forecast by cost code
 */
export async function GET(request: NextRequest, { params }: ForecastParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch budget summary data
    const { data: budgetLines, error: budgetError } = await supabase
      .from("budget_lines")
      .select(
        `
        id,
        cost_code_id,
        original_amount,
        revised_budget,
        direct_costs,
        committed_costs,
        cost_codes (
          code,
          name
        )
      `,
      )
      .eq("project_id", parseInt(projectId, 10));

    if (budgetError) {
      return NextResponse.json(
        { error: "Failed to fetch budget data" },
        { status: 500 },
      );
    }

    // Calculate forecasts
    let totalProjectedBudget = 0;
    let totalProjectedCosts = 0;
    let totalOriginalBudget = 0;
    let totalRevisedBudget = 0;

    const forecastByCostCode: Array<{
      costCode: string;
      costCodeName: string;
      projectedBudget: number;
      projectedCosts: number;
      projectedVariance: number;
    }> = [];

    budgetLines?.forEach((line) => {
      const original = Number(line.original_amount) || 0;
      const revised = Number(line.revised_budget) || original;
      const directCosts = Number(line.direct_costs) || 0;
      const committedCosts = Number(line.committed_costs) || 0;

      // Projected budget = revised budget (includes approved changes)
      const projectedBudget = revised;

      // Projected costs = direct + committed costs
      const projectedCosts = directCosts + committedCosts;

      // Variance = projected budget - projected costs
      const projectedVariance = projectedBudget - projectedCosts;

      totalOriginalBudget += original;
      totalRevisedBudget += revised;
      totalProjectedBudget += projectedBudget;
      totalProjectedCosts += projectedCosts;

      const costCode = line.cost_codes as unknown as {
        code: string;
        name: string;
      } | null;

      if (costCode) {
        forecastByCostCode.push({
          costCode: costCode.code,
          costCodeName: costCode.name,
          projectedBudget,
          projectedCosts,
          projectedVariance,
        });
      }
    });

    const totalProjectedVariance = totalProjectedBudget - totalProjectedCosts;

    return NextResponse.json({
      summary: {
        totalOriginalBudget,
        totalRevisedBudget,
        totalProjectedBudget,
        totalProjectedCosts,
        totalProjectedVariance,
        variancePercentage:
          totalProjectedBudget > 0
            ? (totalProjectedVariance / totalProjectedBudget) * 100
            : 0,
      },
      forecastByCostCode,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
