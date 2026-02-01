"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { BudgetLineItem, BudgetGrandTotals } from "@/types/budget";

interface UseBudgetDataReturn {
  budgetData: BudgetLineItem[];
  grandTotals: BudgetGrandTotals;
  loading: boolean;
  error: string | null;
  refetchBudgetData: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing budget data from SQL views
 * Uses pre-calculated values from mv_budget_rollup and v_budget_grand_totals
 */
export function useBudgetData(projectId: string): UseBudgetDataReturn {
  const [budgetData, setBudgetData] = useState<BudgetLineItem[]>([]);
  const [grandTotals, setGrandTotals] = useState<BudgetGrandTotals>({
    originalBudgetAmount: 0,
    budgetModifications: 0,
    approvedCOs: 0,
    revisedBudget: 0,
    jobToDateCostDetail: 0,
    directCosts: 0,
    pendingChanges: 0,
    projectedBudget: 0,
    committedCosts: 0,
    pendingCostChanges: 0,
    projectedCosts: 0,
    forecastToComplete: 0,
    estimatedCostAtCompletion: 0,
    projectedOverUnder: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetchBudgetData = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/budget`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Data from SQL views is already calculated - no manual calculations needed
      setBudgetData(data.lineItems || []);
      setGrandTotals(data.grandTotals || {
        originalBudgetAmount: 0,
        budgetModifications: 0,
        approvedCOs: 0,
        revisedBudget: 0,
        jobToDateCostDetail: 0,
        directCosts: 0,
        pendingChanges: 0,
        projectedBudget: 0,
        committedCosts: 0,
        pendingCostChanges: 0,
        projectedCosts: 0,
        forecastToComplete: 0,
        estimatedCostAtCompletion: 0,
        projectedOverUnder: 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch budget data";
      setError(errorMessage);
      console.error("Budget data fetch error:", err);
      toast.error("Failed to load budget", {
        description: "Please try again."
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetchBudgetData();
  }, [refetchBudgetData]);

  return {
    budgetData,
    grandTotals,
    loading,
    error,
    refetchBudgetData,
  };
}