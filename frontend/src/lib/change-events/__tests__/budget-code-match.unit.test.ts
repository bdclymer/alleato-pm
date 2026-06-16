import {
  findBudgetCode,
  resolveBudgetCodeFromSov,
} from "@/lib/change-events/budget-code-match";
import type { BudgetCodeOption, CommitmentSovLineItem } from "@/components/domain/change-events/change-event-form/types";

const budgetCodes: BudgetCodeOption[] = [
  {
    id: "project-budget-code-042200",
    code: "04-2200",
    legacyCostCodeId: "04-2200",
    description: "Concrete Unit Masonry-Block",
    costType: "S",
    costTypeId: "cost-type-subcontract",
    fullLabel: "04-2200.S - Concrete Unit Masonry-Block",
  },
  {
    id: "project-budget-code-013126",
    code: "01-3126",
    legacyCostCodeId: "01-3126",
    description: "Project Management",
    costType: "S",
    costTypeId: "cost-type-subcontract",
    fullLabel: "01-3126.S - Project Management",
  },
];

function sovLine(overrides: Partial<CommitmentSovLineItem>): CommitmentSovLineItem {
  return {
    id: "sov-line-1",
    budget_code: "04-2200",
    description: "Concrete Unit Masonry-Block",
    line_number: 1,
    ...overrides,
  };
}

describe("change-event budget-code matching", () => {
  it("matches canonical project budget-code IDs", () => {
    expect(findBudgetCode("project-budget-code-042200", budgetCodes)?.id).toBe(
      "project-budget-code-042200",
    );
  });

  it("matches formatted and unformatted legacy cost-code text", () => {
    expect(findBudgetCode("042200", budgetCodes)?.id).toBe("project-budget-code-042200");
    expect(findBudgetCode("04.2200", budgetCodes)?.id).toBe("project-budget-code-042200");
    expect(findBudgetCode("04/2200", budgetCodes)?.id).toBe("project-budget-code-042200");
  });

  it("matches descriptions and full-label prefixes", () => {
    expect(findBudgetCode("concrete unit masonry-block", budgetCodes)?.id).toBe(
      "project-budget-code-042200",
    );
    expect(findBudgetCode("01-3126.s", budgetCodes)?.id).toBe("project-budget-code-013126");
  });

  it("resolves a single commitment SOV code to a selector ID", () => {
    expect(resolveBudgetCodeFromSov([sovLine({ budget_code: "042200" })], budgetCodes)).toEqual({
      budgetCodeId: "project-budget-code-042200",
      description: "Concrete Unit Masonry-Block",
    });
  });

  it("fails loudly when multiple commitment SOV budget codes are present", () => {
    expect(
      resolveBudgetCodeFromSov(
        [
          sovLine({ id: "sov-line-1", budget_code: "04-2200" }),
          sovLine({ id: "sov-line-2", budget_code: "01-3126" }),
        ],
        budgetCodes,
      ),
    ).toEqual({ reason: "multiple_codes" });
  });
});
