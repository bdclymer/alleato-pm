/**
 * @jest-environment jsdom
 *
 * Guardrail for the SOV totals-alignment bug class.
 *
 * The Schedule of Values footer once emitted one cell too many, shifting the
 * Billed and Remaining totals a column to the right. That bug was invisible to
 * TypeScript and ESLint. This test renders the real component and asserts the
 * footer/body column spans match the header in BOTH accounting methods, so the
 * drift cannot recur silently.
 */

import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ScheduleOfValuesTab } from "../ScheduleOfValuesTab";
import { assertTableColumnIntegrity } from "@/test-utils/table-column-integrity";

// The component fetches budget-code options via these hooks; stub them so the
// render is synchronous and data-independent.
jest.mock("@/hooks/use-cost-codes", () => ({
  useCostCodes: () => ({ options: [], isLoading: false }),
}));
jest.mock("@/hooks/use-project-budget-codes", () => ({
  useProjectBudgetCodes: () => ({ options: [], isLoading: false }),
}));

const lineItems = [
  {
    id: "line-1",
    line_number: 1,
    budget_code: "024113",
    description: "Demolition",
    amount: 25120,
    billed_to_date: 0,
    quantity: 4,
    uom: "EA",
    unit_cost: 6280,
  },
  {
    id: "line-2",
    line_number: 2,
    budget_code: "033000",
    description: "Concrete",
    amount: 18000,
    billed_to_date: 5000,
    quantity: 2,
    uom: "EA",
    unit_cost: 9000,
  },
];

function renderTab(accountingMethod: "amount" | "unit") {
  return render(
    <ScheduleOfValuesTab
      lineItems={lineItems}
      projectId={25125}
      commitmentId="test-commitment"
      commitmentType="subcontract"
      accountingMethod={accountingMethod}
    />,
  );
}

describe("ScheduleOfValuesTab column integrity", () => {
  it("keeps header, body, and footer aligned in amount mode (7 columns)", () => {
    const { container } = renderTab("amount");
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(assertTableColumnIntegrity(table as HTMLTableElement)).toBe(7);
  });

  it("keeps header, body, and footer aligned in unit mode (10 columns)", () => {
    const { container } = renderTab("unit");
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(assertTableColumnIntegrity(table as HTMLTableElement)).toBe(10);
  });
});
