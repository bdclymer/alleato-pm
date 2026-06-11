import {
  calculateBudgetModificationActivityTotal,
  calculateGrandTotals,
} from "./budget-grouping";
import type { BudgetLineItem } from "@/types/budget";

function makeLine(overrides: Partial<BudgetLineItem>): BudgetLineItem {
  return {
    id: "line-1",
    description: "Test line",
    costCode: "01-100",
    costCodeDescription: "General Conditions",
    costType: "L",
    division: "01",
    divisionTitle: "",
    subJob: "",
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
    ...overrides,
  };
}

describe("budget grouping totals", () => {
  it("keeps financial grand totals signed", () => {
    const totals = calculateGrandTotals([
      makeLine({ budgetModifications: 100 }),
      makeLine({ id: "line-2", budgetModifications: -100 }),
    ]);

    expect(totals.budgetModifications).toBe(0);
  });

  it("calculates gross budget-modification activity for the visible footer", () => {
    const activity = calculateBudgetModificationActivityTotal([
      makeLine({ budgetModifications: 100 }),
      makeLine({ id: "line-2", budgetModifications: -100 }),
    ]);

    expect(activity).toBe(200);
  });

  it("uses displayed grouped rows for budget-modification activity", () => {
    const activity = calculateBudgetModificationActivityTotal([
      makeLine({
        id: "division-01",
        budgetModifications: -50,
        children: [
          makeLine({ id: "line-1", budgetModifications: 25 }),
          makeLine({ id: "line-2", budgetModifications: -75 }),
        ],
      }),
    ]);

    expect(activity).toBe(50);
  });
});
