import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

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
export const GET = withApiGuardrails(
  "projects/[projectId]/budget/forecast#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const origin = request.nextUrl.origin;
    const budgetResponse = await fetch(`${origin}/api/projects/${projectId}/budget`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (!budgetResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch budget data" },
        { status: budgetResponse.status },
      );
    }

    const budgetData = (await budgetResponse.json()) as {
      lineItems?: Array<{
        originalBudgetAmount?: number;
        revisedBudget?: number;
        projectedBudget?: number;
        projectedCosts?: number;
        projectedOverUnder?: number;
        forecastToComplete?: number;
        estimatedCostAtCompletion?: number;
        forecastStartDate?: string | null;
        forecastEndDate?: string | null;
        costCode?: string;
        costCodeDescription?: string;
      }>;
    };

    // Calculate forecasts
    let totalProjectedBudget = 0;
    let totalProjectedCosts = 0;
    let totalProjectedCostToComplete = 0;
    let totalEstimatedCostAtCompletion = 0;
    let totalOriginalBudget = 0;
    let totalRevisedBudget = 0;

    const forecastByCostCode: Array<{
      costCode: string;
      costCodeName: string;
      projectedBudget: number;
      projectedCosts: number;
      projectedCostToComplete: number;
      estimatedCostAtCompletion: number;
      projectedVariance: number;
      forecastStartDate: string | null;
      forecastEndDate: string | null;
    }> = [];

    (budgetData.lineItems ?? []).forEach((line) => {
      const original = Number(line.originalBudgetAmount) || 0;
      const revised = Number(line.revisedBudget) || original;
      const projectedBudget = Number(line.projectedBudget) || revised;
      const projectedCosts = Number(line.projectedCosts) || 0;
      const projectedCostToComplete =
        Number(line.forecastToComplete) || Math.max(0, projectedBudget - projectedCosts);
      const estimatedCostAtCompletion =
        Number(line.estimatedCostAtCompletion) || projectedCosts + projectedCostToComplete;
      const projectedVariance =
        Number(line.projectedOverUnder) || projectedBudget - estimatedCostAtCompletion;

      totalOriginalBudget += original;
      totalRevisedBudget += revised;
      totalProjectedBudget += projectedBudget;
      totalProjectedCosts += projectedCosts;
      totalProjectedCostToComplete += projectedCostToComplete;
      totalEstimatedCostAtCompletion += estimatedCostAtCompletion;

      if (line.costCode) {
        forecastByCostCode.push({
          costCode: line.costCode,
          costCodeName: line.costCodeDescription || "",
          projectedBudget,
          projectedCosts,
          projectedCostToComplete,
          estimatedCostAtCompletion,
          projectedVariance,
          // Date columns for time-phased forecasting (Procore parity).
          // Backed by future budget_lines.forecast_start_date / forecast_end_date columns;
          // null until the schema migration lands and lines are populated.
          forecastStartDate: line.forecastStartDate ?? null,
          forecastEndDate: line.forecastEndDate ?? null,
        });
      }
    });

    const totalProjectedVariance = totalProjectedBudget - totalEstimatedCostAtCompletion;

    return NextResponse.json({
      summary: {
        totalOriginalBudget,
        totalRevisedBudget,
        totalProjectedBudget,
        totalProjectedCosts,
        totalProjectedCostToComplete,
        totalEstimatedCostAtCompletion,
        totalProjectedVariance,
        variancePercentage:
          totalProjectedBudget > 0
            ? (totalProjectedVariance / totalProjectedBudget) * 100
            : 0,
      },
      forecastByCostCode,
      generatedAt: new Date().toISOString(),
    });
    },
);
