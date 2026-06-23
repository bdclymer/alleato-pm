import {
  EMPTY_GRAND_TOTALS,
  consumeCostAggregationOnce,
  normalizeBudgetCode,
  normalizeBudgetCodeLookupKey,
  reduceGrandTotals,
  type BudgetLineItem,
  type GrandTotals,
} from "./compute-grand-totals";

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

describe("normalizeBudgetCode", () => {
  it("returns the code unchanged when there is no dot", () => {
    expect(normalizeBudgetCode("03 00 00")).toBe("03 00 00");
  });

  it("strips the cost-type suffix added by the import route", () => {
    expect(normalizeBudgetCode("03 00 00.L")).toBe("03 00 00");
    expect(normalizeBudgetCode("01 00 00.M")).toBe("01 00 00");
    expect(normalizeBudgetCode("16 00 00.E")).toBe("16 00 00");
  });

  it("trims whitespace from the result", () => {
    expect(normalizeBudgetCode("03 00 00 .L")).toBe("03 00 00");
  });

  it("handles codes that are only a suffix (edge case)", () => {
    expect(normalizeBudgetCode(".L")).toBe("");
  });
});

describe("normalizeBudgetCodeLookupKey", () => {
  it("matches formatted Alleato budget codes to unformatted imported commitment codes", () => {
    expect(normalizeBudgetCodeLookupKey("09-9723")).toBe("099723");
    expect(normalizeBudgetCodeLookupKey("099723")).toBe("099723");
  });

  it("ignores cost-type suffixes while building comparison keys", () => {
    expect(normalizeBudgetCodeLookupKey("03 00 00.L")).toBe("030000");
    expect(normalizeBudgetCodeLookupKey("03-00-00")).toBe("030000");
  });
});

describe("reduceGrandTotals", () => {
  it("returns all zeros for an empty line-item array", () => {
    expect(reduceGrandTotals([])).toEqual(EMPTY_GRAND_TOTALS);
  });

  it("sums every numeric field across multiple lines", () => {
    const lines: BudgetLineItem[] = [
      makeLine({
        originalBudgetAmount: 100,
        budgetModifications: 10,
        approvedCOs: 5,
        revisedBudget: 115,
        jobToDateCostDetail: 40,
        directCosts: 30,
        pendingChanges: 2,
        projectedBudget: 117,
        committedCosts: 60,
        pendingCostChanges: 3,
        projectedCosts: 93,
        forecastToComplete: 24,
        estimatedCostAtCompletion: 117,
        projectedOverUnder: 0,
      }),
      makeLine({
        originalBudgetAmount: 200,
        budgetModifications: 20,
        approvedCOs: 10,
        revisedBudget: 230,
        jobToDateCostDetail: 80,
        directCosts: 70,
        pendingChanges: 5,
        projectedBudget: 235,
        committedCosts: 120,
        pendingCostChanges: 7,
        projectedCosts: 197,
        forecastToComplete: 38,
        estimatedCostAtCompletion: 235,
        projectedOverUnder: 0,
      }),
    ];

    const totals = reduceGrandTotals(lines);

    const expected: GrandTotals = {
      originalBudgetAmount: 300,
      budgetModifications: 30,
      approvedCOs: 15,
      revisedBudget: 345,
      jobToDateCostDetail: 120,
      directCosts: 100,
      pendingChanges: 7,
      projectedBudget: 352,
      committedCosts: 180,
      pendingCostChanges: 10,
      projectedCosts: 290,
      forecastToComplete: 62,
      estimatedCostAtCompletion: 352,
      projectedOverUnder: 0,
    };

    expect(totals).toEqual(expected);
  });

  it("does not mutate the EMPTY_GRAND_TOTALS constant between calls", () => {
    const snapshot = { ...EMPTY_GRAND_TOTALS };
    reduceGrandTotals([makeLine({ revisedBudget: 999, projectedCosts: 500 })]);
    expect(EMPTY_GRAND_TOTALS).toEqual(snapshot);
  });

  it("handles a line that produces a projectedOverUnder", () => {
    const totals = reduceGrandTotals([
      makeLine({
        revisedBudget: 100,
        projectedBudget: 100,
        projectedCosts: 120,
        forecastToComplete: 0,
        estimatedCostAtCompletion: 120,
        projectedOverUnder: -20,
      }),
    ]);

    expect(totals.projectedOverUnder).toBe(-20);
    expect(totals.revisedBudget).toBe(100);
    expect(totals.projectedCosts).toBe(120);
  });
});

describe("consumeCostAggregationOnce", () => {
  it("returns cost-code rollups only once for duplicate budget rows", () => {
    const consumed = new Set<string>();
    const costsByCode = {
      "09-9123": {
        jobToDateCostDetail: 100,
        directCosts: 25,
        pendingCostChanges: 50,
        committedCosts: 200,
        approvedBudgetChanges: 10,
        pendingBudgetChanges: 5,
      },
    };

    expect(
      consumeCostAggregationOnce("09-9123", costsByCode, consumed),
    ).toEqual(costsByCode["09-9123"]);
    expect(
      consumeCostAggregationOnce("09-9123", costsByCode, consumed),
    ).toEqual({
      jobToDateCostDetail: 0,
      directCosts: 0,
      pendingCostChanges: 0,
      committedCosts: 0,
      approvedBudgetChanges: 0,
      pendingBudgetChanges: 0,
    });
  });
});
