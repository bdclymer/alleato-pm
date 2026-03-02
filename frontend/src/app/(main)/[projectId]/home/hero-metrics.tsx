"use client";

import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import Link from "next/link";

interface HeroMetricsProps {
  projectId: string;
  totalBudget: number;
  committed: number;
  spent: number;
  forecastedCost: number;
  changeOrdersTotal: number;
  activeTasks: number;
}

export function HeroMetrics({
  projectId,
  totalBudget,
  committed,
  spent,
  forecastedCost,
  changeOrdersTotal,
  activeTasks,
}: HeroMetricsProps) {
  // Calculate key metrics
  const remainingBudget = totalBudget - spent;
  const budgetUtilization = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
  const variance = totalBudget - forecastedCost;
  const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6 lg:mb-12 mb-8">
      {/* Primary Metric - Budget Remaining */}
      <Link
        href={`/${projectId}/budget`}
        className="w-full border border-neutral-200 bg-background p-4 transition-all duration-300 hover:border-brand hover:shadow-md md:w-1/3 md:p-6 group cursor-pointer"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
              Budget Remaining
            </p>
            <div className="flex items-center gap-1 text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="font-medium">View Budget</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-4xl md:text-5xl font-light tabular-nums tracking-tight text-brand">
              {formatCurrency(remainingBudget)}
            </p>
            <div className="flex items-baseline gap-4 text-sm text-neutral-600">
              <span className="font-medium tabular-nums">
                {budgetUtilization.toFixed(1)}% utilized
              </span>
              <span className="text-neutral-400">•</span>
              <span className="tabular-nums">
                {formatCurrency(spent)} of {formatCurrency(totalBudget)}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Forecast Variance */}
      <div className="w-full border border-neutral-200 bg-background p-4 transition-all duration-300 hover:border-brand hover:shadow-sm md:w-1/3 md:p-6">
        <div className="space-y-4">
          <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
            Forecast Variance
          </p>
          <div className="space-y-2">
            <p
              className={`text-3xl md:text-4xl font-light tabular-nums tracking-tight ${
                variance >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {variance >= 0 ? "+" : ""}
              {formatCurrency(variance)}
            </p>
            <div className="flex items-center gap-2">
              {variance >= 0 ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs font-medium text-success tabular-nums">
                    {variancePercent.toFixed(1)}% under
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs font-medium text-destructive tabular-nums">
                    {Math.abs(variancePercent).toFixed(1)}% over
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Orders */}
      <div className="w-full border border-neutral-200 bg-background p-4 transition-all duration-300 hover:border-brand hover:shadow-sm md:w-1/3 md:p-6">
        <div className="space-y-4">
          <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
            Change Orders
          </p>
          <div className="space-y-1">
            <p className="text-3xl md:text-4xl font-light tabular-nums tracking-tight text-neutral-900">
              {changeOrdersTotal}
            </p>
            <p className="text-xs text-neutral-500">Approved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
