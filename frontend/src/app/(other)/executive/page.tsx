"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
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

function RiskBar({ count, total }: { count: number; total: number }) {
  const percentage = Math.min(100, (count / (total || 1)) * 100);
  return (
    <div className="flex-1 bg-neutral-100 rounded-full h-2 relative overflow-hidden">
      <div
        className="bg-gradient-to-r from-destructive to-destructive/80 h-2 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

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
      } finally {
        setLoading(false);
      }
    }

    loadExecutiveData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-neutral-500">
          Loading executive intelligence...
        </div>
      </div>
    );
  }

  const projectsNeedingAttention = healthScores
    .filter((p) => p.status === "critical" || p.status === "at_risk")
    .slice(0, 8);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Hero Metrics Section */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-6 mb-8">
        {/* Company Health Score */}
        <div className="w-full border border-neutral-200 bg-background p-4 transition-all duration-300 hover:border-brand hover:shadow-sm md:w-1/4 md:p-6">
          <div className="space-y-3">
            <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
              Company Health
            </p>
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl font-light tabular-nums tracking-tight text-brand">
                {summary?.company_health_score || 0}
              </p>
              <p className="text-xs text-neutral-500">Portfolio score</p>
            </div>
          </div>
        </div>

        {/* Critical Risks */}
        <div className="w-full border border-neutral-200 bg-background p-4 transition-all duration-300 hover:border-destructive hover:shadow-sm md:w-1/4 md:p-6">
          <div className="space-y-3">
            <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
              Critical Risks
            </p>
            <div className="space-y-2">
              <p className="text-3xl md:text-4xl font-light tabular-nums tracking-tight text-destructive">
                {heatMap?.critical || 0}
              </p>
              <div className="flex items-center gap-1.5">
                {heatMap?.trending === "increasing" ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs font-medium text-destructive tabular-nums">
                      {heatMap?.trend_percentage && heatMap.trend_percentage > 0
                        ? "+"
                        : ""}
                      {heatMap?.trend_percentage || 0}% vs 30d
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-neutral-500">
                    Require immediate action
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Projects at Risk */}
        <div className="w-full border border-neutral-200 bg-background p-4 transition-all duration-300 hover:border-brand hover:shadow-sm md:w-1/4 md:p-6">
          <div className="space-y-3">
            <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
              Projects at Risk
            </p>
            <div className="space-y-1">
              <p className="text-3xl md:text-4xl font-light tabular-nums tracking-tight text-warning">
                {summary?.projects_at_risk || 0}
              </p>
              <p className="text-xs text-neutral-500">
                of {healthScores.length} total
              </p>
            </div>
          </div>
        </div>

        {/* Patterns Detected */}
        <div className="w-full border border-neutral-200 bg-background p-4 transition-all duration-300 hover:border-brand hover:shadow-sm md:w-1/4 md:p-6">
          <div className="space-y-3">
            <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
              Pattern Insights
            </p>
            <div className="space-y-1">
              <p className="text-3xl md:text-4xl font-light tabular-nums tracking-tight text-neutral-900">
                {patterns.length}
              </p>
              <p className="text-xs text-neutral-500">Systemic issues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Strategic Priorities Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Priorities */}
            <div className="border border-neutral-200 bg-background p-5">
              <h3 className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500 mb-4">
                Top Priorities
              </h3>
              {summary?.top_priorities && summary.top_priorities.length > 0 ? (
                <ul className="space-y-2.5">
                  {summary.top_priorities.slice(0, 5).map((priority) => (
                    <li
                      key={priority}
                      className="flex items-start gap-3 text-sm text-neutral-700"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-2xs font-semibold text-destructive">
                        {summary.top_priorities.indexOf(priority) + 1}
                      </span>
                      <span className="leading-relaxed">{priority}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400">
                  No critical priorities at this time
                </p>
              )}
            </div>

            {/* Quick Wins */}
            <div className="border border-neutral-200 bg-background p-5">
              <h3 className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500 mb-4">
                Quick Wins Available
              </h3>
              {summary?.quick_wins && summary.quick_wins.length > 0 ? (
                <ul className="space-y-2.5">
                  {summary.quick_wins.slice(0, 5).map((win) => (
                    <li
                      key={win}
                      className="flex items-start gap-3 text-sm text-neutral-700"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success mt-0.5" />
                      <span className="leading-relaxed">{win}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400">
                  Focus on top priorities first
                </p>
              )}
            </div>
          </div>

          {/* Strategic Patterns */}
          {patterns.length > 0 && (
            <div className="border border-neutral-200 bg-background p-5">
              <h3 className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500 mb-4">
                Strategic Pattern Analysis
              </h3>
              <div className="space-y-4">
                {patterns.slice(0, 3).map((pattern) => (
                  <div
                    key={`${pattern.description}-${pattern.frequency}`}
                    className={`border-l-2 pl-4 ${
                      pattern.severity === "high"
                        ? "border-destructive"
                        : pattern.severity === "medium"
                          ? "border-warning"
                          : "border-info"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-medium text-neutral-900 text-sm">
                          {pattern.description}
                        </h4>
                        <p className="text-xs text-neutral-500">
                          {pattern.affected_projects.length} projects ·{" "}
                          {pattern.frequency} occurrences
                        </p>
                        <div className="bg-neutral-50 rounded px-3 py-2">
                          <p className="text-xs font-medium text-neutral-700">
                            Recommendation: {pattern.recommendation}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-1 rounded text-2xs font-semibold uppercase tracking-wider ${
                          pattern.severity === "high"
                            ? "bg-destructive/10 text-destructive"
                            : pattern.severity === "medium"
                              ? "bg-warning/10 text-warning"
                              : "bg-info/10 text-info"
                        }`}
                      >
                        {pattern.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Distribution */}
          <div className="border border-neutral-200 bg-background p-5">
            <h3 className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500 mb-4">
              Risk Distribution by Category
            </h3>
            <div className="space-y-3">
              {Object.entries(heatMap?.by_category || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center gap-4">
                    <div className="w-28 text-xs font-medium text-neutral-600 capitalize">
                      {category}
                    </div>
                    <RiskBar count={count} total={heatMap?.total || 1} />
                    <div className="w-8 text-right text-xs font-semibold text-neutral-700 tabular-nums">
                      {count}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Projects Needing Attention */}
          <div className="border border-neutral-200 bg-background p-5">
            <h3 className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500 mb-4">
              Projects Requiring Attention
            </h3>
            {projectsNeedingAttention.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-sm text-neutral-500">
                  All projects are healthy
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projectsNeedingAttention.map((project) => (
                  <Link
                    key={project.project_id}
                    href={`/${project.project_id}/home`}
                    className={`block border-l-2 pl-4 pr-4 py-3 transition-all duration-200 hover:bg-neutral-50 ${
                      project.status === "critical"
                        ? "border-destructive"
                        : "border-warning"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-1">
                        <h4 className="font-medium text-neutral-900 text-sm">
                          {project.project_name}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {project.critical_risks_count} critical,{" "}
                            {project.open_risks_count} total risks
                          </span>
                          <span>
                            {project.overdue_tasks_count} overdue tasks
                          </span>
                          <span>
                            Last meeting {project.last_meeting_days_ago}d ago
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-2xl font-light tabular-nums ${
                            project.status === "critical"
                              ? "text-destructive"
                              : "text-warning"
                          }`}
                        >
                          {project.health_score}
                        </div>
                        <div className="text-2xs text-neutral-500 uppercase tracking-wider">
                          {project.status}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
