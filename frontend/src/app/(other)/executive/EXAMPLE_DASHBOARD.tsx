"use client";

/**
 * Executive Dashboard - Example Implementation
 *
 * This demonstrates how to create a leadership-focused view that transforms
 * raw project intelligence into strategic insights.
 *
 * To use:
 * 1. Rename to: ui/app/executive/page.tsx
 * 2. Ensure lib/executiveIntelligence.ts exists (already created)
 * 3. The dashboard will show company-wide health metrics, patterns, and priorities
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  getCompanyRiskHeatMap,
  getAllProjectHealthScores,
  detectPatterns,
  generateExecutiveSummary,
  type RiskHeatMap,
  type ProjectHealthScore,
  type Pattern,
  type ExecutiveSummary,
} from "@/lib/executiveIntelligence";

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [heatMap, setHeatMap] = useState<RiskHeatMap | null>(null);
  const [healthScores, setHealthScores] = useState<ProjectHealthScore[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExecutiveData() {
      try {
        const [summaryData, heatMapData, scoresData, patternsData] =
          await Promise.all([
            generateExecutiveSummary(),
            getCompanyRiskHeatMap(),
            getAllProjectHealthScores(),
            detectPatterns(),
          ]);

        setSummary(summaryData);
        setHeatMap(heatMapData);
        setHealthScores(scoresData);
        setPatterns(patternsData);
      } catch (error) {

        console.error("Failed to load dashboard data:", error);

        toast.error("Failed to load dashboard data", { description: "Please try again." });

      } finally {
        setLoading(false);
      }
    }

    loadExecutiveData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-muted p-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
            <p className="mt-4 text-sm text-foreground">
              Loading executive intelligence...
            </p>
          </div>
        </div>
      </main>
    );
  }

  const projectsNeedingAttention = healthScores
    .filter((p) => p.status === "critical" || p.status === "at_risk")
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-muted p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Executive Dashboard
            </h1>
            <p className="text-sm text-zinc-500">
              Strategic intelligence · Updated {summary?.date}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-violet-600">
              {summary?.company_health_score}
            </div>
            <div className="text-xs text-zinc-600">Company Health Score</div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-4 gap-4">
          {/* Critical Risks */}
          <div className="bg-background rounded-lg border-2 border-destructive p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-red-900">
                Critical Risks
              </h3>
              {heatMap?.trending === "increasing" && (
                <span className="text-red-600">↑</span>
              )}
            </div>
            <div className="text-4xl font-bold text-destructive mt-2">
              {heatMap?.critical || 0}
            </div>
            <p className="text-xs text-destructive mt-1">
              Require immediate attention
            </p>
            {heatMap?.trend_percentage !== 0 && (
              <div className="mt-2 text-xs text-destructive">
                {heatMap?.trend_percentage && heatMap.trend_percentage > 0
                  ? "+"
                  : ""}
                {heatMap?.trend_percentage}% vs. 30 days ago
              </div>
            )}
          </div>

          {/* Elevated Risks */}
          <div className="bg-background rounded-lg border border-yellow-500 p-6">
            <h3 className="text-sm font-medium text-yellow-900">
              Elevated Risks
            </h3>
            <div className="text-4xl font-bold text-yellow-700 mt-2">
              {heatMap?.elevated || 0}
            </div>
            <p className="text-xs text-yellow-800 mt-1">Monitor closely</p>
          </div>

          {/* Projects at Risk */}
          <div className="bg-background rounded-lg border border-orange-500 p-6">
            <h3 className="text-sm font-medium text-orange-900">
              Projects at Risk
            </h3>
            <div className="text-4xl font-bold text-orange-700 mt-2">
              {summary?.projects_at_risk || 0}
            </div>
            <p className="text-xs text-orange-800 mt-1">
              of {healthScores.length} total projects
            </p>
          </div>

          {/* Patterns Detected */}
          <div className="bg-background rounded-lg border border-purple-500 p-6">
            <h3 className="text-sm font-medium text-purple-900">
              Patterns Detected
            </h3>
            <div className="text-4xl font-bold text-purple-700 mt-2">
              {patterns.length}
            </div>
            <p className="text-xs text-purple-800 mt-1">
              Systemic issues identified
            </p>
          </div>
        </div>

        {/* Risk Heat Map by Category */}
        <div className="bg-background rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Risk Distribution by Category
          </h2>
          <div className="space-y-4">
            {Object.entries(heatMap?.by_category || {})
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <div key={category} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-foreground capitalize">
                    {category}
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-3 relative">
                    <div
                      className="bg-gradient-to-r from-destructive to-destructive/80 h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (count / (heatMap?.total || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-semibold text-foreground">
                    {count}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Strategic Patterns */}
        {patterns.length > 0 && (
          <div className="bg-background rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              🔍 Strategic Patterns Detected
            </h2>
            <div className="space-y-4">
              {patterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    pattern.severity === "high"
                      ? "border-destructive bg-destructive/10"
                      : pattern.severity === "medium"
                        ? "border-yellow-500 bg-yellow-50"
                        : "border-blue-500 bg-blue-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {pattern.description}
                      </h3>
                      <p className="text-sm text-foreground mt-1">
                        Affects {pattern.affected_projects.length} projects ·
                        Occurred {pattern.frequency} times
                      </p>
                      <div className="mt-4 bg-background/60 rounded p-4">
                        <p className="text-xs font-medium text-purple-900">
                          💡 Recommendation:
                        </p>
                        <p className="text-sm text-purple-800 mt-1">
                          {pattern.recommendation}
                        </p>
                      </div>
                      {pattern.evidence.length > 0 && (
                        <details className="mt-2 text-xs text-foreground">
                          <summary className="cursor-pointer font-medium">
                            View evidence ({pattern.evidence.length} examples)
                          </summary>
                          <ul className="mt-2 space-y-1 pl-4">
                            {pattern.evidence.map((evidence, i) => (
                              <li key={i} className="list-disc">
                                {evidence}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                    <span
                      className={`px-4 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                        pattern.severity === "high"
                          ? "bg-destructive/10 text-destructive"
                          : pattern.severity === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {pattern.severity} severity
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Needing Attention */}
        <div className="bg-background rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            ⚠️ Projects Needing Attention
          </h2>
          {projectsNeedingAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              All projects are healthy! 🎉
            </p>
          ) : (
            <div className="space-y-4">
              {projectsNeedingAttention.map((project) => (
                <Link
                  key={project.project_id}
                  href={`/projects/${project.project_id}`}
                  className={`block p-4 rounded-lg border-l-4 hover:shadow-md transition ${
                    project.status === "critical"
                      ? "border-destructive bg-destructive/10 hover:bg-destructive/20"
                      : project.status === "at_risk"
                        ? "border-warning bg-warning/10 hover:bg-warning/20"
                        : "border-success bg-success/10 hover:bg-success/20"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {project.project_name}
                      </h3>
                      <div className="flex gap-4 mt-2 text-xs text-foreground">
                        <span>
                          {project.open_risks_count} open risks (
                          {project.critical_risks_count} critical)
                        </span>
                        <span>{project.overdue_tasks_count} overdue tasks</span>
                        <span>
                          Last meeting: {project.last_meeting_days_ago} days ago
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-3xl font-bold ${
                          project.status === "critical"
                            ? "text-destructive"
                            : project.status === "at_risk"
                              ? "text-warning"
                              : "text-success"
                        }`}
                      >
                        {project.health_score}
                      </div>
                      <div className="text-xs text-foreground capitalize">
                        {project.status}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Priorities & Quick Wins */}
        <div className="grid grid-cols-2 gap-6">
          {/* Top Priorities */}
          <div className="bg-destructive/10 rounded-lg border border-destructive/20 p-6">
            <h3 className="text-lg font-semibold text-destructive mb-4">
              🔥 Top Priorities
            </h3>
            {summary?.top_priorities && summary.top_priorities.length > 0 ? (
              <ul className="space-y-2">
                {summary.top_priorities.map((priority, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-destructive flex items-start gap-2"
                  >
                    <span className="font-bold">{idx + 1}.</span>
                    <span>{priority}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-destructive">No critical priorities</p>
            )}
          </div>

          {/* Quick Wins */}
          <div className="bg-success/10 rounded-lg border border-success/20 p-6">
            <h3 className="text-lg font-semibold text-success mb-4">
              ✨ Quick Wins Available
            </h3>
            {summary?.quick_wins && summary.quick_wins.length > 0 ? (
              <ul className="space-y-2">
                {summary.quick_wins.map((win, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-success flex items-start gap-2"
                  >
                    <span className="font-bold">•</span>
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-success">
                Focus on top priorities first
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
