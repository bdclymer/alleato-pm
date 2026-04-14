/**
 * Executive Intelligence - Strategic insights for leadership
 *
 * Transforms raw project intelligence into actionable strategic insights:
 * - Company-wide risk heat maps
 * - Project health scoring
 * - Pattern detection across projects
 * - Predictive risk analysis
 */

import { createClient } from "@supabase/supabase-js";
import { listAllRisks, listProjectRisks, type Task } from "./projectIntelligence";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ============================================================================
// TYPES
// ============================================================================

export interface RiskHeatMap {
  critical: number; // high likelihood + high impact
  elevated: number; // high likelihood OR high impact
  moderate: number; // medium on both
  low: number;
  total: number;
  by_category: {
    [category: string]: number;
  };
  trending: "increasing" | "stable" | "decreasing";
  trend_percentage: number; // e.g., +15 = 15% more risks than 30 days ago
}

export interface ProjectHealthScore {
  project_id: number;
  project_name: string;
  health_score: number; // 0-100
  status: "healthy" | "at_risk" | "critical";
  open_risks_count: number;
  critical_risks_count: number;
  overdue_tasks_count: number;
  last_meeting_days_ago: number;
  trend: "improving" | "stable" | "declining";
}

export interface Pattern {
  pattern_type:
    | "recurring_risk"
    | "systemic_bottleneck"
    | "resource_constraint"
    | "client_issue";
  description: string;
  affected_projects: Array<{ id: number; name: string }>;
  frequency: number;
  severity: "high" | "medium" | "low";
  recommendation: string;
  evidence: string[];
}

export interface ExecutiveSummary {
  date: string;
  company_health_score: number;
  projects_at_risk: number;
  critical_risks: number;
  patterns_detected: number;
  top_priorities: string[];
  quick_wins: string[];
}

// ============================================================================
// RISK HEAT MAP
// ============================================================================

export async function getCompanyRiskHeatMap(): Promise<RiskHeatMap> {
  // Get all open risks across all projects
  const currentRisks = (await listAllRisks()).filter(
    (risk) => risk.status === "open",
  );

  // Calculate risk severity
  const critical =
    currentRisks?.filter((r) => r.likelihood === "high" && r.impact === "high")
      .length || 0;

  const elevated =
    currentRisks?.filter(
      (r) =>
        (r.likelihood === "high" && r.impact !== "high") ||
        (r.likelihood !== "high" && r.impact === "high"),
    ).length || 0;

  const moderate =
    currentRisks?.filter(
      (r) => r.likelihood === "medium" && r.impact === "medium",
    ).length || 0;

  const total = currentRisks?.length || 0;
  const low = total - critical - elevated - moderate;

  // Category breakdown
  const byCategory: { [key: string]: number } = {};
  currentRisks?.forEach((risk) => {
    const category = risk.category || "Uncategorized";
    byCategory[category] = (byCategory[category] || 0) + 1;
  });

  // Trending analysis (compare to 30 days ago)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const historicalCount = currentRisks.filter(
    (risk) => new Date(risk.created_at) <= thirtyDaysAgo,
  ).length;
  const trendPercentage =
    historicalCount > 0
      ? Math.round(((total - historicalCount) / historicalCount) * 100)
      : 0;

  const trending =
    trendPercentage > 10
      ? "increasing"
      : trendPercentage < -10
        ? "decreasing"
        : "stable";

  return {
    critical,
    elevated,
    moderate,
    low,
    total,
    by_category: byCategory,
    trending,
    trend_percentage: trendPercentage,
  };
}

// ============================================================================
// PROJECT HEALTH SCORING
// ============================================================================

export async function calculateProjectHealth(
  projectId: number,
): Promise<ProjectHealthScore> {
  // Get project info
  const { data: projectData } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (!projectData) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Get all risks for this project
  const risks = (await listProjectRisks(projectId)).filter(
    (risk) => risk.status === "open",
  );

  // Get all tasks for this project
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .contains("project_ids", [projectId])
    .in("status", ["open", "in_progress"]);

  // Calculate health score (starts at 100)
  let score = 100;

  // Critical risks: -15 points each
  const criticalRisks =
    risks?.filter((r) => r.likelihood === "high" && r.impact === "high") || [];
  score -= criticalRisks.length * 15;

  // Elevated risks: -8 points each
  const elevatedRisks =
    risks?.filter(
      (r) =>
        (r.likelihood === "high" && r.impact !== "high") ||
        (r.likelihood !== "high" && r.impact === "high"),
    ) || [];
  score -= elevatedRisks.length * 8;

  // Moderate risks: -3 points each
  const moderateRisks =
    risks?.filter((r) => r.likelihood === "medium" && r.impact === "medium") ||
    [];
  score -= moderateRisks.length * 3;

  // Overdue tasks: -5 points each
  const overdueTasks =
    tasks?.filter((t) => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }) || [];
  score -= overdueTasks.length * 5;

  // Check last meeting date
  const { data: lastMeeting } = await supabase
    .from("document_metadata")
    .select("date")
    .eq("project_id", projectId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const daysSinceLastMeeting = lastMeeting
    ? Math.floor(
        (Date.now() - new Date(lastMeeting.date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 999;

  // Deduct for stale projects (no meeting in 14+ days)
  if (daysSinceLastMeeting > 14) {
    score -= 10;
  }

  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine status
  const status = score >= 75 ? "healthy" : score >= 50 ? "at_risk" : "critical";

  return {
    project_id: projectId,
    project_name: projectData.name,
    health_score: score,
    status,
    open_risks_count: risks.length || 0,
    critical_risks_count: criticalRisks.length,
    overdue_tasks_count: overdueTasks.length,
    last_meeting_days_ago: daysSinceLastMeeting,
    trend: "stable", // TODO: Implement historical comparison
  };
}

export async function getAllProjectHealthScores(): Promise<
  ProjectHealthScore[]
> {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  if (!projects) return [];

  const healthScores = await Promise.all(
    projects.map((p) => calculateProjectHealth(p.id)),
  );

  return healthScores.sort((a, b) => a.health_score - b.health_score);
}

// ============================================================================
// PATTERN DETECTION
// ============================================================================

export async function detectPatterns(): Promise<Pattern[]> {
  const patterns: Pattern[] = [];

  // Get all risks
  const allRisks = (await listAllRisks()).filter((risk) => risk.status === "open");

  if (!allRisks || allRisks.length === 0) return patterns;

  // Pattern 1: Recurring risk categories
  const categoryGroups: { [key: string]: typeof allRisks } = {};
  allRisks.forEach((risk) => {
    const category = risk.category || "Uncategorized";
    if (!categoryGroups[category]) categoryGroups[category] = [];
    categoryGroups[category].push(risk);
  });

  Object.entries(categoryGroups).forEach(([category, risks]) => {
    if (risks.length >= 3) {
      const projectIds = [...new Set(risks.flatMap((r) => r.project_ids))];

      patterns.push({
        pattern_type: "recurring_risk",
        description: `${category} risks appearing across ${projectIds.length} projects`,
        affected_projects: projectIds.map((id) => ({
          id,
          name: `Project ${id}`,
        })), // TODO: Fetch names
        frequency: risks.length,
        severity: risks.some(
          (r) => r.likelihood === "high" && r.impact === "high",
        )
          ? "high"
          : "medium",
        recommendation: `Consider creating a company-wide mitigation strategy for ${category} risks`,
        evidence: risks.slice(0, 3).map((r) => r.description),
      });
    }
  });

  // Pattern 2: Specific keyword patterns (e.g., "permit", "delay", "approval")
  const keywords = ["permit", "delay", "approval", "resource", "client"];

  keywords.forEach((keyword) => {
    const matchingRisks = allRisks.filter((r) =>
      r.description.toLowerCase().includes(keyword),
    );

    if (matchingRisks.length >= 3) {
      const projectIds = [
        ...new Set(matchingRisks.flatMap((r) => r.project_ids)),
      ];

      patterns.push({
        pattern_type: "systemic_bottleneck",
        description: `"${keyword}" mentioned in ${matchingRisks.length} risks across ${projectIds.length} projects`,
        affected_projects: projectIds.map((id) => ({
          id,
          name: `Project ${id}`,
        })),
        frequency: matchingRisks.length,
        severity: "high",
        recommendation: `Investigate root cause of ${keyword}-related issues and create standardized mitigation approach`,
        evidence: matchingRisks.slice(0, 3).map((r) => r.description),
      });
    }
  });

  // Pattern 3: Resource constraints (same assignee on multiple overdue tasks)
  const { data: allTasks } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["open", "in_progress"]);

  if (allTasks) {
    const tasksByAssignee: { [key: string]: typeof allTasks } = {};
    allTasks.forEach((task) => {
      const assignee = task.assignee_name || "Unassigned";
      if (!tasksByAssignee[assignee]) tasksByAssignee[assignee] = [];
      tasksByAssignee[assignee].push(task);
    });

    Object.entries(tasksByAssignee).forEach(([assignee, tasks]) => {
      const overdueTasks = tasks.filter(
        (t) => t.due_date && new Date(t.due_date) < new Date(),
      );

      if (overdueTasks.length >= 5 && assignee !== "Unassigned") {
        const projectIds = [
          ...new Set(overdueTasks.flatMap((t) => t.project_ids)),
        ];

        patterns.push({
          pattern_type: "resource_constraint",
          description: `${assignee} has ${overdueTasks.length} overdue tasks across ${projectIds.length} projects`,
          affected_projects: projectIds.map((id) => ({
            id,
            name: `Project ${id}`,
          })),
          frequency: overdueTasks.length,
          severity: "high",
          recommendation: `Redistribute workload or provide additional resources to ${assignee}`,
          evidence: overdueTasks
            .slice(0, 3)
            .map((t) => `${t.description} (due: ${t.due_date})`),
        });
      }
    });
  }

  return patterns;
}

// ============================================================================
// EXECUTIVE SUMMARY
// ============================================================================

export async function generateExecutiveSummary(): Promise<ExecutiveSummary> {
  const heatMap = await getCompanyRiskHeatMap();
  const allHealthScores = await getAllProjectHealthScores();
  const patterns = await detectPatterns();

  const projectsAtRisk = allHealthScores.filter(
    (p) => p.status === "at_risk" || p.status === "critical",
  ).length;

  // Calculate company health score (average of all project scores)
  const companyHealthScore =
    allHealthScores.length > 0
      ? Math.round(
          allHealthScores.reduce((sum, p) => sum + p.health_score, 0) /
            allHealthScores.length,
        )
      : 0;

  // Identify top priorities (worst projects)
  const topPriorities = allHealthScores
    .filter((p) => p.status === "critical")
    .slice(0, 3)
    .map((p) => `${p.project_name} (health: ${p.health_score})`);

  // Identify quick wins (projects close to healthy status)
  const quickWins = allHealthScores
    .filter((p) => p.status === "at_risk" && p.health_score >= 60)
    .slice(0, 3)
    .map(
      (p) =>
        `${p.project_name} (needs ${75 - p.health_score} points to be healthy)`,
    );

  return {
    date: new Date().toISOString().split("T")[0],
    company_health_score: companyHealthScore,
    projects_at_risk: projectsAtRisk,
    critical_risks: heatMap.critical,
    patterns_detected: patterns.length,
    top_priorities: topPriorities,
    quick_wins: quickWins,
  };
}
