/**
 * POST /api/cron/daily-flags
 *
 * Daily cron job that scans all active projects and auto-creates ai_insights
 * records for:
 *   1. Budget variances exceeding 10%
 *   2. Past-due RFIs
 *   3. Late schedule tasks
 *   4. Stale change events (unresolved > 7 days)
 *
 * Secured via CRON_SECRET env var (set in Vercel).
 * Vercel cron schedule: "0 6 * * *" (daily at 6am UTC)
 */

import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";
import { NextResponse } from "next/server";
import { GuardrailError } from "@/lib/guardrails/errors";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { logEvent } from "@/lib/guardrails/observability";

export const maxDuration = 120;

type InsightInsert = Database["public"]["Tables"]["ai_insights"]["Insert"];

interface FlagStats {
  budgetFlags: number;
  rfiFlags: number;
  scheduleFlags: number;
  changeEventFlags: number;
}

const BATCH_SIZE = 10;

export const POST = withApiGuardrails("/api/cron/daily-flags#POST", async ({ request, requestId }) => {
  // OWASP A07:2021 - Identification and Authentication Failures:
  // Always require CRON_SECRET; never skip validation when env var is unset.
  const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/cron/daily-flags#POST",
      message: "Unauthorized cron invocation.",
      status: 401,
      severity: "medium",
    });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Get active projects
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("archived", false);

  if (projectsError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/cron/daily-flags#POST",
      message: "Failed to fetch projects for daily flag job.",
      details: {
        reason: projectsError.message,
      },
      cause: projectsError,
    });
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json({ success: true, projectsChecked: 0, flagsCreated: 0, breakdown: { budgetFlags: 0, rfiFlags: 0, scheduleFlags: 0, changeEventFlags: 0 } });
  }

  const stats: FlagStats = { budgetFlags: 0, rfiFlags: 0, scheduleFlags: 0, changeEventFlags: 0 };
  let totalFlagsCreated = 0;

  // Process projects in batches
  for (let i = 0; i < projects.length; i += BATCH_SIZE) {
    const batch = projects.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (project) => {
      const insightsToInsert: InsightInsert[] = [];

      // Run all 4 checks in parallel for this project
      const [budgetResult, rfiResult, scheduleResult, ceResult] = await Promise.all([
        // a) Budget variance > 10%
        supabase
          .from("project_health_dashboard")
          .select("budget_utilization")
          .eq("id", project.id)
          .maybeSingle(),

        // b) Past-due RFIs
        supabase
          .from("rfis")
          .select("id, number, subject, due_date, status")
          .eq("project_id", project.id)
          .not("due_date", "is", null)
          .lt("due_date", todayStr)
          .not("status", "in", "(Closed,Answered,Void)"),

        // c) Late schedule tasks
        supabase
          .from("schedule_tasks")
          .select("id, name, finish_date, percent_complete, status, is_milestone")
          .eq("project_id", project.id)
          .not("finish_date", "is", null)
          .lt("finish_date", todayStr),

        // d) Stale change events (> 7 days unresolved)
        supabase
          .from("change_events")
          .select("id, number, title, status, created_at")
          .eq("project_id", project.id)
          .is("deleted_at", null)
          .lt("created_at", sevenDaysAgo)
          .not("status", "in", "(Approved,Rejected,Void,Closed)"),
      ]);

      // Process budget variance
      if (budgetResult.data?.budget_utilization && budgetResult.data.budget_utilization > 1.1) {
        const utilization = budgetResult.data.budget_utilization;
        const variancePercent = Math.round((utilization - 1) * 100);
        const severity = utilization > 1.2 ? "critical" : "warning";

        insightsToInsert.push({
          project_id: project.id,
          project_name: project.name,
          title: `Budget variance exceeds ${variancePercent}% on ${project.name}`,
          description: `Budget utilization is at ${Math.round(utilization * 100)}% — costs have exceeded the approved budget by ${variancePercent}%. Immediate review recommended.`,
          insight_type: "budget_variance",
          severity,
          status: "open",
          resolved: 0,
          financial_impact: null,
          confidence_score: 1.0,
          metadata: { budget_utilization: utilization, variance_percent: variancePercent },
          created_at: now.toISOString(),
        });
      }

      // Process past-due RFIs
      const overdueRfis = rfiResult.data?.filter((r) => r.due_date && r.status !== "Closed" && r.status !== "Answered" && r.status !== "Void") ?? [];
      if (overdueRfis.length > 0) {
        const rfiIds = overdueRfis.map((r) => r.id);
        const maxOverdueDays = Math.max(
          ...overdueRfis.map((r) => {
            const due = new Date(r.due_date!);
            return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          })
        );
        const severity = maxOverdueDays > 7 ? "critical" : "warning";

        insightsToInsert.push({
          project_id: project.id,
          project_name: project.name,
          title: `${overdueRfis.length} past-due RFI${overdueRfis.length > 1 ? "s" : ""} on ${project.name}`,
          description: `${overdueRfis.length} RFI${overdueRfis.length > 1 ? "s are" : " is"} past due (longest overdue: ${maxOverdueDays} days). Subjects: ${overdueRfis.slice(0, 3).map((r) => `#${r.number} "${r.subject}"`).join(", ")}${overdueRfis.length > 3 ? ` and ${overdueRfis.length - 3} more` : ""}.`,
          insight_type: "past_due_rfi",
          severity,
          status: "open",
          resolved: 0,
          timeline_impact_days: maxOverdueDays,
          confidence_score: 1.0,
          metadata: { rfi_ids: rfiIds, count: overdueRfis.length, max_overdue_days: maxOverdueDays },
          created_at: now.toISOString(),
        });
      }

      // Process late schedule tasks — filter out completed ones in code
      const lateTasks = (scheduleResult.data ?? []).filter((t) => {
        const complete = t.percent_complete != null && t.percent_complete >= 100;
        const doneStatus = t.status && ["complete", "Complete", "Completed", "Done"].includes(t.status);
        return !complete && !doneStatus;
      });

      if (lateTasks.length > 0) {
        const hasMilestone = lateTasks.some((t) => t.is_milestone === true);
        const maxLateDays = Math.max(
          ...lateTasks.map((t) => {
            const finish = new Date(t.finish_date!);
            return Math.floor((now.getTime() - finish.getTime()) / (1000 * 60 * 60 * 24));
          })
        );
        const severity = hasMilestone ? "critical" : "warning";

        insightsToInsert.push({
          project_id: project.id,
          project_name: project.name,
          title: `${lateTasks.length} late schedule task${lateTasks.length > 1 ? "s" : ""} on ${project.name}${hasMilestone ? " (includes milestones)" : ""}`,
          description: `${lateTasks.length} task${lateTasks.length > 1 ? "s are" : " is"} past their finish date (longest: ${maxLateDays} days late).${hasMilestone ? " This includes milestone tasks which may impact downstream deliverables." : ""} Examples: ${lateTasks.slice(0, 3).map((t) => `"${t.name}"`).join(", ")}${lateTasks.length > 3 ? ` and ${lateTasks.length - 3} more` : ""}.`,
          insight_type: "schedule_slippage",
          severity,
          status: "open",
          resolved: 0,
          timeline_impact_days: maxLateDays,
          confidence_score: 1.0,
          metadata: { task_ids: lateTasks.map((t) => t.id), count: lateTasks.length, has_milestone: hasMilestone, max_late_days: maxLateDays },
          created_at: now.toISOString(),
        });
      }

      // Process stale change events
      const staleCEs = ceResult.data ?? [];
      if (staleCEs.length > 0) {
        const maxStaleDays = Math.max(
          ...staleCEs.map((ce) => {
            const created = new Date(ce.created_at);
            return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          })
        );
        const severity = maxStaleDays > 30 ? "critical" : "warning";

        insightsToInsert.push({
          project_id: project.id,
          project_name: project.name,
          title: `${staleCEs.length} unresolved change event${staleCEs.length > 1 ? "s" : ""} on ${project.name}`,
          description: `${staleCEs.length} change event${staleCEs.length > 1 ? "s have" : " has"} been open for more than 7 days (oldest: ${maxStaleDays} days). Events: ${staleCEs.slice(0, 3).map((ce) => `#${ce.number} "${ce.title}"`).join(", ")}${staleCEs.length > 3 ? ` and ${staleCEs.length - 3} more` : ""}.`,
          insight_type: "unresolved_change_event",
          severity,
          status: "open",
          resolved: 0,
          timeline_impact_days: maxStaleDays,
          confidence_score: 1.0,
          metadata: { change_event_ids: staleCEs.map((ce) => ce.id), count: staleCEs.length, max_stale_days: maxStaleDays },
          created_at: now.toISOString(),
        });
      }

      // Dedup and insert
      for (const insight of insightsToInsert) {
        // Check if an unresolved insight with the same project + type already exists today
        const { data: existing } = await supabase
          .from("ai_insights")
          .select("id")
          .eq("project_id", insight.project_id!)
          .eq("insight_type", insight.insight_type!)
          .eq("resolved", 0)
          .gte("created_at", `${todayStr}T00:00:00.000Z`)
          .lte("created_at", `${todayStr}T23:59:59.999Z`)
          .limit(1);

        if (existing && existing.length > 0) {
          continue; // Skip duplicate
        }

        const { error: insertError } = await supabase
          .from("ai_insights")
          .insert(insight);

        if (insertError) {
          console.error(`[cron/daily-flags] Failed to insert insight for project ${project.id}:`, insertError);
          continue;
        }

        totalFlagsCreated++;
        if (insight.insight_type === "budget_variance") stats.budgetFlags++;
        else if (insight.insight_type === "past_due_rfi") stats.rfiFlags++;
        else if (insight.insight_type === "schedule_slippage") stats.scheduleFlags++;
        else if (insight.insight_type === "unresolved_change_event") stats.changeEventFlags++;
      }
    }));
  }

  logEvent({
    event: "background_job_completed",
    requestId,
    where: "/api/cron/daily-flags#POST",
    details: {
      checked: projects.length,
      flags_created: totalFlagsCreated,
      budget_flags: stats.budgetFlags,
      rfi_flags: stats.rfiFlags,
      schedule_flags: stats.scheduleFlags,
      change_event_flags: stats.changeEventFlags,
    },
  });

  return NextResponse.json({
    success: true,
    projectsChecked: projects.length,
    flagsCreated: totalFlagsCreated,
    breakdown: stats,
    runAt: now.toISOString(),
  });
});
