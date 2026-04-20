"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiRow, SectionHeader, EmptyState } from "@/components/ds";
import {
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { ForecastToCompleteModal } from "@/components/budget/modals/ForecastToCompleteModal";
import { apiFetch } from "@/lib/api-client";

interface ForecastingTabProps {
  projectId: string;
}

interface ForecastData {
  summary: {
    totalOriginalBudget: number;
    totalRevisedBudget: number;
    totalProjectedBudget: number;
    totalProjectedCosts: number;
    totalProjectedCostToComplete: number;
    totalEstimatedCostAtCompletion: number;
    totalProjectedVariance: number;
    variancePercentage: number;
  };
  forecastByCostCode: Array<{
    budgetLineId: string;
    costCode: string;
    costCodeName: string;
    forecastMethod: "automatic" | "manual" | "lump_sum" | "monitored_resources";
    notes: string | null;
    projectedBudget: number;
    projectedCosts: number;
    projectedCostToComplete: number;
    estimatedCostAtCompletion: number;
    projectedVariance: number;
    forecastStartDate: string | null;
    forecastEndDate: string | null;
  }>;
  generatedAt: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function VarianceCell({ value }: { value: number }) {
  const positive = value >= 0;
  const neutral = value === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        neutral
          ? "text-muted-foreground"
          : positive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-destructive"
      )}
    >
      {neutral ? (
        <Minus className="h-3 w-3" />
      ) : positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {formatCurrency(Math.abs(value))}
    </span>
  );
}

function CostBar({ budget, costs }: { budget: number; costs: number }) {
  const pct = budget > 0 ? Math.min(100, (costs / budget) * 100) : 0;
  const tone =
    pct > 100 ? "bg-destructive" : pct > 85 ? "bg-amber-400" : "bg-primary/50";

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
      { }
      <div
        className={cn("h-full rounded-full transition-all", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* KPI row skeleton */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-6 py-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="overflow-hidden rounded-lg border border-border">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-6 px-5 py-4 border-b border-border last:border-0"
            >
              <Skeleton className="h-4 w-16 shrink-0" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ForecastingTab({ projectId }: ForecastingTabProps) {
  const [loading, setLoading] = React.useState(true);
  const [recalculating, setRecalculating] = React.useState(false);
  const [forecast, setForecast] = React.useState<ForecastData | null>(null);
  const [selectedLine, setSelectedLine] =
    React.useState<ForecastData["forecastByCostCode"][number] | null>(null);
  const [showFtcEditor, setShowFtcEditor] = React.useState(false);

  const fetchForecast = React.useCallback(
    async (showRecalc = false) => {
      try {
        if (showRecalc) setRecalculating(true);
        else setLoading(true);

        const data = await apiFetch<ForecastData>(
          `/api/projects/${projectId}/budget/forecast`,
        );
        setForecast(data);
        if (showRecalc) toast.success("Forecast updated");
      } catch {
        toast.error("Could not load budget forecast — please refresh");
      } finally {
        setLoading(false);
        setRecalculating(false);
      }
    },
    [projectId]
  );

  React.useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const summary = forecast?.summary;
  const items = forecast?.forecastByCostCode ?? [];
  const variancePct = summary?.variancePercentage ?? 0;
  const isOverBudget = (summary?.totalProjectedVariance ?? 0) < 0;

  const kpiMetrics = [
    {
      label: "Projected Budget",
      value: formatCurrency(summary?.totalProjectedBudget ?? 0),
      context: "Revised + pending changes",
    },
    {
      label: "Projected Costs",
      value: formatCurrency(summary?.totalProjectedCosts ?? 0),
      context: "Direct costs + committed",
    },
    {
      label: "Cost to Complete",
      value: formatCurrency(summary?.totalProjectedCostToComplete ?? 0),
      context: "Forecast remaining (FTC)",
    },
    {
      label: "Est. Cost at Completion",
      value: formatCurrency(summary?.totalEstimatedCostAtCompletion ?? 0),
      context: `Variance ${isOverBudget ? "−" : "+"}${formatCurrency(Math.abs(summary?.totalProjectedVariance ?? 0))} · ${Math.abs(variancePct).toFixed(1)}%`,
      delta: summary
        ? {
            value: `${Math.abs(variancePct).toFixed(1)}%`,
            positive: !isOverBudget,
          }
        : undefined,
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => fetchForecast(true)}
        disabled={recalculating}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", recalculating && "animate-spin")}
        />
        Recalculate
      </Button>
      <Button
        size="sm"
        onClick={() => toast.info("Export coming soon")}
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Export
      </Button>
    </div>
  );

  const handleForecastSave = React.useCallback(
    async (data: {
      budgetLineId: string;
      forecastMethod: string;
      forecastAmount: number;
      notes?: string | null;
      lineItems?: Array<{
        id?: string;
        description: string;
        quantity: number;
        units: string;
        unitCost: number;
        utilizationRate?: number | null;
        startDate?: string | null;
        endDate?: string | null;
        unitsRemainingMode?: "weeks" | "months";
        sortOrder?: number;
      }>;
    }) => {
      await apiFetch(`/api/projects/${projectId}/budget/forecast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      toast.success("Forecast saved");
      await fetchForecast();
    },
    [projectId, fetchForecast],
  );

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      {/* KPI metrics */}
      <KpiRow metrics={kpiMetrics} />

      {/* Cost code breakdown */}
      <div className="space-y-3">
        <SectionHeader
          title="Forecast by Cost Code"
          count={items.length}
          action={headerActions}
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="h-8 w-8" />}
            title="No forecast data"
            description="Add budget lines to generate cost code forecasts."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <div className="w-max min-w-full">
              {/* Table header */}
              <div className="grid grid-cols-[minmax(220px,1fr)_repeat(4,120px)_repeat(2,110px)_110px_120px] gap-4 border-b border-border bg-muted/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Cost Code</span>
                <span className="text-right">Projected Budget</span>
                <span className="text-right">Projected Costs</span>
                <span className="text-right">Cost to Complete</span>
                <span className="text-right">Est. at Completion</span>
                <span className="text-right">Forecast Start</span>
                <span className="text-right">Forecast End</span>
                <span className="text-right">Method</span>
                <span className="text-right">Variance</span>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-border">
                {items.map((item) => {
                  const pct =
                    item.projectedBudget > 0
                      ? (item.projectedCosts / item.projectedBudget) * 100
                      : 0;

                  return (
                    <div
                      key={item.budgetLineId || `${item.costCode}-${item.costCodeName}`}
                      className="grid grid-cols-[minmax(220px,1fr)_repeat(4,120px)_repeat(2,110px)_110px_120px] gap-4 px-5 py-3.5 items-center hover:bg-muted/30 transition-colors"
                    >
                      {/* Code + name */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">
                            {item.costCode}
                          </span>
                          <span className="truncate text-sm font-medium text-foreground">
                            {item.costCodeName}
                          </span>
                        </div>
                        <CostBar
                          budget={item.projectedBudget}
                          costs={item.projectedCosts}
                        />
                        <span className="text-[11px] text-muted-foreground/60">
                          {pct.toFixed(0)}% of budget used
                        </span>
                      </div>

                      {/* Projected Budget */}
                      <div className="text-right text-sm tabular-nums text-foreground/80">
                        {formatCurrency(item.projectedBudget)}
                      </div>

                      {/* Projected Costs */}
                      <div className="text-right text-sm tabular-nums text-foreground/80">
                        {formatCurrency(item.projectedCosts)}
                      </div>

                      {/* Projected Cost to Complete */}
                      <div className="text-right text-sm tabular-nums text-foreground/80">
                        {formatCurrency(item.projectedCostToComplete)}
                      </div>

                      {/* Estimated Cost at Completion */}
                      <div className="text-right text-sm tabular-nums font-medium text-foreground">
                        {formatCurrency(item.estimatedCostAtCompletion)}
                      </div>

                      {/* Forecast Start */}
                      <div className="text-right text-xs tabular-nums text-muted-foreground">
                        {formatDate(item.forecastStartDate)}
                      </div>

                      {/* Forecast End */}
                      <div className="text-right text-xs tabular-nums text-muted-foreground">
                        {formatDate(item.forecastEndDate)}
                      </div>

                      {/* Method */}
                      <div className="text-right text-xs text-muted-foreground capitalize">
                        {item.forecastMethod.replace("_", " ")}
                      </div>

                      {/* Variance */}
                      <div className="text-right text-sm flex items-center justify-end gap-2">
                        <VarianceCell value={item.projectedVariance} />
                        {item.budgetLineId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLine(item);
                              setShowFtcEditor(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer summary */}
              {items.length > 0 && (
                <div className="grid grid-cols-[minmax(220px,1fr)_repeat(4,120px)_repeat(2,110px)_110px_120px] gap-4 border-t border-border bg-muted/40 px-5 py-3 text-sm font-semibold">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-right tabular-nums">
                    {formatCurrency(summary?.totalProjectedBudget ?? 0)}
                  </span>
                  <span className="text-right tabular-nums">
                    {formatCurrency(summary?.totalProjectedCosts ?? 0)}
                  </span>
                  <span className="text-right tabular-nums">
                    {formatCurrency(summary?.totalProjectedCostToComplete ?? 0)}
                  </span>
                  <span className="text-right tabular-nums">
                    {formatCurrency(summary?.totalEstimatedCostAtCompletion ?? 0)}
                  </span>
                  <span className="text-right text-xs text-muted-foreground">—</span>
                  <span className="text-right text-xs text-muted-foreground">—</span>
                  <span className="text-right text-xs text-muted-foreground">—</span>
                  <div className="text-right">
                    <VarianceCell value={summary?.totalProjectedVariance ?? 0} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {forecast?.generatedAt && (
          <p className="text-[11px] text-muted-foreground/50 text-right">
            Last calculated{" "}
            {new Date(forecast.generatedAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {selectedLine && (
        <ForecastToCompleteModal
          open={showFtcEditor}
          onClose={() => {
            setShowFtcEditor(false);
            setSelectedLine(null);
          }}
          budgetLineId={selectedLine.budgetLineId}
          projectId={projectId}
          costCode={selectedLine.costCode}
          currentData={{
            forecastMethod: selectedLine.forecastMethod,
            forecastAmount: selectedLine.projectedCostToComplete,
            projectedBudget: selectedLine.projectedBudget,
            projectedCosts: selectedLine.projectedCosts,
            notes: selectedLine.notes ?? undefined,
          }}
          onSave={handleForecastSave}
        />
      )}
    </div>
  );
}
