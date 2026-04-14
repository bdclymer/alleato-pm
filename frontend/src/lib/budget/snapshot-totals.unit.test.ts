import {
  flattenSnapshotTotals,
  type SnapshotGrandTotalsJson,
} from "./snapshot-totals";

const FALLBACK = "2026-01-01T00:00:00.000Z";

describe("flattenSnapshotTotals", () => {
  it("returns zeros with the fallback date when grandTotals is null", () => {
    expect(flattenSnapshotTotals(null, FALLBACK)).toEqual({
      snapshot_date: FALLBACK,
      total_budget: 0,
      total_costs: 0,
      variance: 0,
    });
  });

  it("returns zeros with the fallback date when grandTotals is undefined", () => {
    expect(flattenSnapshotTotals(undefined, FALLBACK)).toEqual({
      snapshot_date: FALLBACK,
      total_budget: 0,
      total_costs: 0,
      variance: 0,
    });
  });

  it("reads the legacy compact shape verbatim", () => {
    const input: SnapshotGrandTotalsJson = {
      snapshot_date: "2025-06-01T00:00:00.000Z",
      total_budget: 500,
      total_costs: 320,
      variance: 180,
    };
    expect(flattenSnapshotTotals(input, FALLBACK)).toEqual({
      snapshot_date: "2025-06-01T00:00:00.000Z",
      total_budget: 500,
      total_costs: 320,
      variance: 180,
    });
  });

  it("derives variance from total_budget - total_costs when legacy variance is missing", () => {
    const input: SnapshotGrandTotalsJson = {
      total_budget: 1000,
      total_costs: 700,
    };
    expect(flattenSnapshotTotals(input, FALLBACK).variance).toBe(300);
  });

  it("prefers the parity shape when revisedBudget is present", () => {
    const input: SnapshotGrandTotalsJson = {
      snapshot_date: "2026-02-01T00:00:00.000Z",
      // Legacy keys also present (POST handler writes both) — should be ignored
      total_budget: 999,
      total_costs: 888,
      variance: 111,
      // Parity keys — these are the truth
      revisedBudget: 1200,
      projectedCosts: 850,
    };
    const result = flattenSnapshotTotals(input, FALLBACK);
    expect(result).toEqual({
      snapshot_date: "2026-02-01T00:00:00.000Z",
      total_budget: 1200,
      total_costs: 850,
      variance: 350,
    });
  });

  it("prefers the parity shape when only projectedCosts is present", () => {
    const input: SnapshotGrandTotalsJson = {
      projectedCosts: 500,
      // revisedBudget missing → treated as 0 in the parity branch
      total_budget: 9999, // legacy key should be ignored
    };
    const result = flattenSnapshotTotals(input, FALLBACK);
    expect(result.total_budget).toBe(0);
    expect(result.total_costs).toBe(500);
    expect(result.variance).toBe(-500);
  });

  it("uses fallbackDate when snapshot_date is not embedded in grand_totals", () => {
    const input: SnapshotGrandTotalsJson = {
      revisedBudget: 100,
      projectedCosts: 50,
    };
    expect(flattenSnapshotTotals(input, FALLBACK).snapshot_date).toBe(
      FALLBACK,
    );
  });

  it("handles a negative variance (projected over budget) in the parity shape", () => {
    const input: SnapshotGrandTotalsJson = {
      revisedBudget: 100,
      projectedCosts: 130,
    };
    expect(flattenSnapshotTotals(input, FALLBACK).variance).toBe(-30);
  });
});
