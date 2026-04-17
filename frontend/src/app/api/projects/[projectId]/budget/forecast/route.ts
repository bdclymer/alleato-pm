import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions-guard";
import { z } from "zod";
import { computeBudgetGrandTotals } from "@/lib/budget/compute-grand-totals";
import type { ForecastMethod } from "@/types/budget";

const forecastMethodSchema = z.enum([
  "automatic",
  "manual",
  "lump_sum",
  "monitored_resources",
]);

const saveForecastSchema = z.object({
  budgetLineId: z.string().uuid("budgetLineId must be a valid UUID"),
  forecastMethod: forecastMethodSchema,
  forecastAmount: z.number().min(0).optional(),
  notes: z.string().max(10000).nullable().optional(),
});

// Parses and validates route project ids for forecast endpoints.
function parseProjectId(projectId: string, where: string): number {
  const parsed = parseInt(projectId, 10);
  if (Number.isNaN(parsed)) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where,
      message: "Invalid project ID.",
      details: [{ path: "projectId", message: "Project ID must be numeric." }],
    });
  }
  return parsed;
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
    const projectIdNum = parseProjectId(
      projectId,
      "projects/[projectId]/budget/forecast#GET",
    );

    const guard = await requirePermission(projectIdNum, "budget", "read");
    if (guard.denied) return guard.response;

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

/**
 * POST /api/projects/[id]/budget/forecast
 *
 * Persists per-line FTC settings and values.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/budget/forecast#POST",
  async ({ request, params }) => {
    const { projectId } = await params;
    const where = "projects/[projectId]/budget/forecast#POST";
    const projectIdNum = parseProjectId(projectId, where);

    const guard = await requirePermission(projectIdNum, "budget", "write");
    if (guard.denied) return guard.response;

    const body = await request.json();
    const parsed = saveForecastSchema.safeParse(body);
    if (!parsed.success) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where,
        message: "Invalid forecast payload.",
        details: parsed.error.flatten(),
      });
    }

    const { budgetLineId, forecastMethod, forecastAmount, notes } = parsed.data;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where,
        message: "Authentication required.",
      });
    }

    const { data: line, error: lineError } = await supabase
      .from("budget_lines")
      .select("id, project_id")
      .eq("id", budgetLineId)
      .single();

    if (lineError || !line) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where,
        message: "Budget line item not found.",
        status: 404,
        severity: "low",
      });
    }

    if (line.project_id !== projectIdNum) {
      throw new GuardrailError({
        code: "AUTH_FORBIDDEN",
        where,
        message: "Budget line does not belong to this project.",
      });
    }

    const { lineItems } = await computeBudgetGrandTotals(supabase, projectIdNum);
    const budgetLine = lineItems.find((item) => item.id === budgetLineId);
    if (!budgetLine) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where,
        message: "Budget line could not be resolved for forecast save.",
        status: 404,
        severity: "low",
      });
    }

    const autoForecast = Math.max(
      0,
      Number(budgetLine.projectedBudget) - Number(budgetLine.projectedCosts),
    );
    const resolvedAmount = resolveForecastAmount(
      forecastMethod,
      autoForecast,
      forecastAmount,
    );

    const today = new Date().toISOString().slice(0, 10);

    // Sensitive data-write path: forecast mode impacts financial rollups.
    const { error: methodUpdateError } = await supabase
      .from("budget_lines")
      .update({
        default_ftc_method: forecastMethod,
        forecasting_enabled: true,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", budgetLineId)
      .eq("project_id", projectIdNum);

    if (methodUpdateError) {
      throw methodUpdateError;
    }

    const { error: existingDeleteError } = await supabase
      .from("cost_forecasts")
      .delete()
      .eq("budget_item_id", budgetLineId)
      .eq("forecast_date", today);

    if (existingDeleteError) {
      throw existingDeleteError;
    }

    const { error: insertError } = await supabase
      .from("cost_forecasts")
      .insert({
        budget_item_id: budgetLineId,
        forecast_date: today,
        forecast_to_complete: resolvedAmount,
        notes: notes ?? null,
        created_by: user.id,
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      data: {
        budgetLineId,
        forecastMethod,
        forecastAmount: resolvedAmount,
        notes: notes ?? null,
      },
    });
  },
);

// Resolves a safe FTC amount from the selected method and optional user input.
function resolveForecastAmount(
  method: ForecastMethod,
  autoForecast: number,
  userAmount?: number,
): number {
  if (method === "automatic") {
    return autoForecast;
  }
  if (typeof userAmount === "number" && Number.isFinite(userAmount) && userAmount >= 0) {
    return userAmount;
  }
  return autoForecast;
}
