/**
 * Budget-snapshot totals adapter.
 *
 * Historic `budget_snapshots.grand_totals` rows use a compact legacy shape
 * (total_budget / total_costs / variance). Rows written by the current
 * POST /api/projects/[id]/budget/snapshots handler use the full Procore-
 * parity GrandTotals shape. This module normalizes both into the compact
 * UI shape so the snapshots list renders consistently regardless of when
 * the row was written.
 */

/**
 * Shape of the `grand_totals` JSON column on `budget_snapshots`.
 * All fields are optional because rows predating Procore parity only have
 * the legacy compact keys, and rows written after parity have both families
 * (so legacy consumers keep working during the migration).
 */
export interface SnapshotGrandTotalsJson {
  snapshot_date?: string;
  // Legacy compact shape (pre-parity)
  total_budget?: number;
  total_costs?: number;
  variance?: number;
  // Full parity shape (current)
  originalBudgetAmount?: number;
  budgetModifications?: number;
  approvedCOs?: number;
  revisedBudget?: number;
  jobToDateCostDetail?: number;
  directCosts?: number;
  pendingChanges?: number;
  projectedBudget?: number;
  committedCosts?: number;
  pendingCostChanges?: number;
  projectedCosts?: number;
  forecastToComplete?: number;
  estimatedCostAtCompletion?: number;
  projectedOverUnder?: number;
}

export interface FlatSnapshotTotals {
  snapshot_date: string;
  total_budget: number;
  total_costs: number;
  variance: number;
}

/**
 * Flatten a snapshot row's grand_totals JSON into the compact shape the UI
 * has always consumed, regardless of whether the row was written with the
 * legacy (total_budget/total_costs/variance) or the current full-parity shape.
 *
 * Parity-shape mapping:
 *   total_budget -> revisedBudget
 *   total_costs  -> projectedCosts
 *   variance     -> revisedBudget - projectedCosts
 *
 * Legacy-shape pass-through:
 *   total_budget, total_costs, variance read directly; variance is
 *   derived from total_budget - total_costs if missing.
 */
export function flattenSnapshotTotals(
  grandTotals: SnapshotGrandTotalsJson | null | undefined,
  fallbackDate: string,
): FlatSnapshotTotals {
  const t = grandTotals ?? {};

  // Prefer the parity shape when present — it carries the full truth.
  if (
    typeof t.revisedBudget === "number" ||
    typeof t.projectedCosts === "number"
  ) {
    const total_budget = Number(t.revisedBudget ?? 0);
    const total_costs = Number(t.projectedCosts ?? 0);
    return {
      snapshot_date: t.snapshot_date ?? fallbackDate,
      total_budget,
      total_costs,
      variance: total_budget - total_costs,
    };
  }

  // Legacy shape
  const total_budget = Number(t.total_budget ?? 0);
  const total_costs = Number(t.total_costs ?? 0);
  return {
    snapshot_date: t.snapshot_date ?? fallbackDate,
    total_budget,
    total_costs,
    variance: Number(t.variance ?? total_budget - total_costs),
  };
}
