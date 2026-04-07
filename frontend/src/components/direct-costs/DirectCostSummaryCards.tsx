"use client";

import * as React from "react";
import {
  SummaryCardGrid,
  formatCurrencyValue,
  formatNumberValue,
} from "@/components/ds/summary-card-grid";
import {
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stats interface matching the expected data structure
 */
interface DirectCostStats {
  total_costs: number;
  draft_count: number;
  approved_count: number;
  pending_count: number;
  total_amount: number;
  avg_cost: number;
}

interface DirectCostSummaryCardsProps {
  projectId: number;
  stats: DirectCostStats;
  isLoading?: boolean;
}

/**
 * DirectCostSummaryCards - Dashboard summary cards showing Direct Costs metrics
 *
 * Displays key metrics and statistics for direct costs in a responsive grid layout.
 * Uses the standardized SummaryCardGrid component for consistency.
 *
 * @example
 * ```tsx
 * <DirectCostSummaryCards
 *   projectId={123}
 *   stats={{
 *     total_costs: 45,
 *     draft_count: 12,
 *     approved_count: 28,
 *     pending_count: 5,
 *     total_amount: 125000.50,
 *     avg_cost: 2777.79
 *   }}
 * />
 * ```
 */
export function DirectCostSummaryCards({
  stats,
  isLoading = false,
}: DirectCostSummaryCardsProps) {
  if (isLoading) {
    return <DirectCostSummaryCardsSkeleton />;
  }

  const cards = [
    {
      id: "total-costs",
      label: "Total Direct Costs",
      value: formatNumberValue(stats.total_costs),
      icon: <FileText className="h-5 w-5" />,
      subtitle: "All recorded costs",
    },
    {
      id: "total-amount",
      label: "Total Amount",
      value: formatCurrencyValue(stats.total_amount),
      icon: <DollarSign className="h-5 w-5" />,
      subtitle: "Sum of all costs",
    },
    {
      id: "avg-cost",
      label: "Average Cost",
      value: formatCurrencyValue(stats.avg_cost),
      icon: <TrendingUp className="h-5 w-5" />,
      subtitle: "Per direct cost",
    },
    {
      id: "approved",
      label: "Approved",
      value: formatNumberValue(stats.approved_count),
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      subtitle: `${getPercentage(stats.approved_count, stats.total_costs)}% of total`,
    },
    {
      id: "pending",
      label: "Pending",
      value: formatNumberValue(stats.pending_count),
      icon: <Clock className="h-5 w-5 text-yellow-600" />,
      subtitle: `${getPercentage(stats.pending_count, stats.total_costs)}% of total`,
    },
    {
      id: "draft",
      label: "Draft",
      value: formatNumberValue(stats.draft_count),
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
      subtitle: `${getPercentage(stats.draft_count, stats.total_costs)}% of total`,
    },
  ];

  return <SummaryCardGrid cards={cards} columns={3} size="md" />;
}

/**
 * Loading skeleton for DirectCostSummaryCards
 */
function DirectCostSummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/50 text-card-foreground flex flex-col gap-6 rounded-xl p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Helper to calculate percentage
 */
function getPercentage(value: number, total: number): string {
  if (total === 0) return "0";
  return ((value / total) * 100).toFixed(0);
}
