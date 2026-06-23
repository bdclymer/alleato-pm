import { getBudgetLineLabel } from "../budget-table";
import type { BudgetLineItem } from "@/types/budget";

function makeLine(overrides: Partial<BudgetLineItem>): BudgetLineItem {
  return {
    id: "budget-line-1",
    costCode: "09-9123",
    costCodeDescription: "Painting",
    costType: "R",
    description: "Paint Walls",
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

describe("getBudgetLineLabel", () => {
  it("keeps division or cost-code descriptions out of the compact budget-code label", () => {
    const label = getBudgetLineLabel(
      makeLine({
        costCode: "02-0000",
        costCodeDescription: "Existing Conditions",
        costType: "R",
        description: "Existing Conditions",
      }),
    );

    expect(label.codeLabel).toBe("02-0000.R");
    expect(label.codeLabel).not.toContain("Existing Conditions");
    expect(label.description).toBe("");
  });

  it("shows the actual budget-line description when it adds information", () => {
    const label = getBudgetLineLabel(
      makeLine({
        costCode: "09-9123",
        costCodeDescription: "Painting",
        costType: "R",
        description: "PC-001 SOV (6 rows)",
      }),
    );

    expect(label.codeLabel).toBe("09-9123.R");
    expect(label.description).toBe("PC-001 SOV (6 rows)");
  });

  it("suppresses generic division fallback labels on grouped rows", () => {
    const label = getBudgetLineLabel(
      makeLine({
        costCode: "50",
        costCodeDescription: undefined,
        costType: undefined,
        description: "Division 50",
        children: [makeLine({ id: "child-line" })],
      }),
    );

    expect(label.codeLabel).toBe("50");
    expect(label.description).toBe("");
    expect(label.fullLabel).toBe("50");
  });
});
