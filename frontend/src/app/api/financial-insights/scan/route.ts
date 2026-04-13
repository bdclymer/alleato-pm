import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createAcumaticaClient } from "@/lib/acumatica/client";
import type { ProjectBudgetSummary } from "@/lib/acumatica/types";
import type { Database } from "@/types/database.types";

type AiInsightInsert = Database["public"]["Tables"]["ai_insights"]["Insert"];


/**
 * POST /api/financial-insights/scan
 *
 * Triggers a budget health scan across all projects that have an
 * acumatica_project_id. For each project it compares Alleato budget data
 * against Acumatica actuals and generates alerts for:
 *   - Budget overruns (actual > budget)
 *   - Budget mismatches (Alleato budget vs Acumatica revised budget >10% diff)
 *   - Negative net position (expenses > income)
 *
 * Returns: { scanned: number, alertsGenerated: number, errors: string[] }
 */
export const POST = withApiGuardrails(
  "financial-insights/scan#POST",
  async () => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "financial-insights/scan#POST", message: "Authentication required." });
  }

  const supabase = createServiceClient();
  const errors: string[] = [];
  let scannedCount = 0;
  let alertsGenerated = 0;

  try {
    // Fetch all projects that have an Acumatica project mapping.
    // The acumatica_project_id column stores the ERP project code (e.g. "25108").
    const { data: rawProjects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, budget, acumatica_project_id")
      .not("acumatica_project_id", "is", null)
      .neq("acumatica_project_id", "");

    if (projectsError) {
      console.error("[financial-insights/scan] Failed to fetch projects:", projectsError);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 },
      );
    }

    const projects = rawProjects ?? [];

    if (projects.length === 0) {
      return NextResponse.json({
        scanned: 0,
        alertsGenerated: 0,
        errors: ["No projects with acumatica_project_id found"],
      });
    }

    // Initialize Acumatica client
    const acumatica = createAcumaticaClient();
    try {
      await acumatica.login();
    } catch (loginErr) {
      console.error("[financial-insights/scan] Acumatica login failed:", loginErr);
      return NextResponse.json(
        {
          scanned: 0,
          alertsGenerated: 0,
          errors: [
            `Acumatica login failed: ${loginErr instanceof Error ? loginErr.message : String(loginErr)}`,
          ],
        },
        { status: 502 },
      );
    }

    // Process each project
    for (const project of projects) {
      const acumaticaProjectId = project.acumatica_project_id;
      if (!acumaticaProjectId) continue;

      const projectName = project.name ?? `Project ${project.id}`;

      try {
        scannedCount++;

        // 1. Fetch Alleato budget data
        const { data: budgetLines } = await supabase
          .from("budget_lines")
          .select("original_amount")
          .eq("project_id", project.id);

        const alleatoBudgetTotal = (budgetLines ?? []).reduce(
          (sum, line) => sum + (Number(line.original_amount) || 0),
          0,
        );

        // 2. Fetch Acumatica budget summary
        let acuSummary: ProjectBudgetSummary;
        try {
          acuSummary = await acumatica.getProjectBudgetSummary(acumaticaProjectId);
        } catch (acuErr) {
          const msg = `Acumatica fetch failed for project ${projectName} (${acumaticaProjectId}): ${acuErr instanceof Error ? acuErr.message : String(acuErr)}`;
          console.error(`[financial-insights/scan] ${msg}`);
          errors.push(msg);
          continue;
        }

        const alerts: AiInsightInsert[] = [];

        // 3a. Check: Budget Overrun — Acumatica actual cost > Alleato budget
        if (alleatoBudgetTotal > 0 && acuSummary.totals.actualCosts > alleatoBudgetTotal) {
          const overrunPercent = (acuSummary.totals.actualCosts / alleatoBudgetTotal) * 100;
          let severity: string;
          if (overrunPercent > 150) {
            severity = "critical";
          } else if (overrunPercent > 120) {
            severity = "warning";
          } else {
            severity = "info";
          }

          const overrunAmount = acuSummary.totals.actualCosts - alleatoBudgetTotal;

          alerts.push({
            title: `Budget Overrun: ${projectName}`,
            description: `Acumatica actual costs ($${acuSummary.totals.actualCosts.toLocaleString()}) exceed the Alleato budget ($${alleatoBudgetTotal.toLocaleString()}) by ${overrunPercent.toFixed(1)}%. Overrun amount: $${overrunAmount.toLocaleString()}.`,
            severity,
            insight_type: "budget_overrun",
            confidence_score: 0.95,
            financial_impact: overrunAmount,
            project_id: project.id,
            project_name: projectName,
            status: "open",
            business_impact: severity === "critical"
              ? "Severe cost overrun requiring immediate executive attention"
              : "Budget variance detected — review recommended",
            metadata: {
              alleato_budget: alleatoBudgetTotal,
              acumatica_actual: acuSummary.totals.actualCosts,
              overrun_percent: overrunPercent,
              acumatica_project_id: acumaticaProjectId,
              scan_timestamp: new Date().toISOString(),
            },
          });
        }

        // 3b. Check: Budget Mismatch — Alleato budget vs Acumatica revised budget >10%
        if (alleatoBudgetTotal > 0 && acuSummary.totals.revisedBudget > 0) {
          const diff = Math.abs(alleatoBudgetTotal - acuSummary.totals.revisedBudget);
          const diffPercent = (diff / alleatoBudgetTotal) * 100;

          if (diffPercent > 10) {
            alerts.push({
              title: `Budget Mismatch: ${projectName}`,
              description: `Alleato budget ($${alleatoBudgetTotal.toLocaleString()}) and Acumatica revised budget ($${acuSummary.totals.revisedBudget.toLocaleString()}) differ by ${diffPercent.toFixed(1)}% ($${diff.toLocaleString()}).`,
              severity: "warning",
              insight_type: "budget_mismatch",
              confidence_score: 0.9,
              financial_impact: diff,
              project_id: project.id,
              project_name: projectName,
              status: "open",
              business_impact: "Budget records are out of sync between systems — reconciliation needed",
              metadata: {
                alleato_budget: alleatoBudgetTotal,
                acumatica_revised_budget: acuSummary.totals.revisedBudget,
                difference_percent: diffPercent,
                acumatica_project_id: acumaticaProjectId,
                scan_timestamp: new Date().toISOString(),
              },
            });
          }
        }

        // 3c. Check: Negative Net Position — expenses > income
        if (acuSummary.totals.expenses > acuSummary.totals.income && acuSummary.totals.expenses > 0) {
          const deficit = acuSummary.totals.expenses - acuSummary.totals.income;
          const severity = deficit > 100_000 ? "critical" : "warning";

          alerts.push({
            title: `Negative Net Position: ${projectName}`,
            description: `Project expenses ($${acuSummary.totals.expenses.toLocaleString()}) exceed income ($${acuSummary.totals.income.toLocaleString()}) by $${deficit.toLocaleString()}.`,
            severity,
            insight_type: "negative_net_position",
            confidence_score: 0.95,
            financial_impact: deficit,
            project_id: project.id,
            project_name: projectName,
            status: "open",
            business_impact: severity === "critical"
              ? "Significant cash flow deficit — immediate review required"
              : "Project is currently operating at a loss",
            metadata: {
              acumatica_income: acuSummary.totals.income,
              acumatica_expenses: acuSummary.totals.expenses,
              deficit,
              acumatica_project_id: acumaticaProjectId,
              scan_timestamp: new Date().toISOString(),
            },
          });
        }

        // 4. Upsert alerts — use title + project_id as natural key to avoid duplicates
        for (const alert of alerts) {
          const { data: existing } = await supabase
            .from("ai_insights")
            .select("id")
            .eq("title", alert.title!)
            .eq("project_id", alert.project_id!)
            .maybeSingle();

          if (existing) {
            // Update existing alert with fresh data
            const { error: updateError } = await supabase
              .from("ai_insights")
              .update({
                description: alert.description,
                severity: alert.severity,
                confidence_score: alert.confidence_score,
                financial_impact: alert.financial_impact,
                status: alert.status,
                business_impact: alert.business_impact,
                metadata: alert.metadata,
              })
              .eq("id", existing.id);

            if (updateError) {
              console.error(`[financial-insights/scan] Failed to update alert for ${projectName}:`, updateError);
              errors.push(`Failed to update alert "${alert.title}": ${updateError.message}`);
            } else {
              alertsGenerated++;
            }
          } else {
            // Insert new alert
            const { error: insertError } = await supabase
              .from("ai_insights")
              .insert(alert);

            if (insertError) {
              console.error(`[financial-insights/scan] Failed to insert alert for ${projectName}:`, insertError);
              errors.push(`Failed to insert alert "${alert.title}": ${insertError.message}`);
            } else {
              alertsGenerated++;
            }
          }
        }
      } catch (projectErr) {
        const msg = `Unexpected error scanning project ${projectName} (ID: ${project.id}): ${projectErr instanceof Error ? projectErr.message : String(projectErr)}`;
        console.error(`[financial-insights/scan] ${msg}`);
        errors.push(msg);
      }
    }

    return NextResponse.json({
      scanned: scannedCount,
      alertsGenerated,
      errors,
    });
  } catch (err) {
    console.error("[financial-insights/scan] Unexpected error:", err);
    return NextResponse.json(
      {
        scanned: scannedCount,
        alertsGenerated,
        errors: [
          ...errors,
          `Top-level error: ${err instanceof Error ? err.message : String(err)}`,
        ],
      },
      { status: 500 },
    );
  }
  },
);
