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

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ScheduleOfValuesTab } from "../ScheduleOfValuesTab";
import { apiFetch } from "@/lib/api-client";
import { assertTableColumnIntegrity } from "@/test-utils/table-column-integrity";

// The component fetches budget-code options from the cost_codes table; stub it
// so the render is synchronous and data-independent.
jest.mock("@/hooks/use-cost-codes", () => ({
  useCostCodes: () => ({ options: [], isLoading: false }),
}));

jest.mock("@/lib/api-client", () => ({
  apiFetch: jest.fn(async () => ({ budgetCodes: [] })),
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

function renderTabWithSummary() {
  return render(
    <ScheduleOfValuesTab
      lineItems={lineItems}
      projectId={25125}
      commitmentId="test-commitment"
      commitmentType="subcontract"
      accountingMethod="amount"
      summary={{
        subtotal: 43120,
        originalContract: 43120,
        approvedChanges: 1250,
        contractTotal: 44370,
        billedToDate: 5000,
        amountRemaining: 39370,
        currentRetainage: 555.56,
      }}
    />,
  );
}

describe("ScheduleOfValuesTab column integrity", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  async function waitForBudgetCodes() {
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  }

  it("keeps header, body, and footer aligned in amount mode (7 columns)", async () => {
    const { container } = renderTab("amount");
    await waitForBudgetCodes();
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(assertTableColumnIntegrity(table as HTMLTableElement)).toBe(7);
  });

  it("keeps header, body, and footer aligned in unit mode (10 columns)", async () => {
    const { container } = renderTab("unit");
    await waitForBudgetCodes();
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(assertTableColumnIntegrity(table as HTMLTableElement)).toBe(10);
  });

  it("renders the commitment SOV financial summary rows", async () => {
    renderTabWithSummary();
    await waitForBudgetCodes();

    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Original Contract")).toBeInTheDocument();
    expect(screen.getByText("Approved Changes")).toBeInTheDocument();
    expect(screen.getByText("Contract Total")).toBeInTheDocument();
    expect(screen.getAllByText("Billed to Date").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Amount Remaining")).toBeInTheDocument();
    expect(screen.getByText("Current Retainage")).toBeInTheDocument();
    expect(screen.getByText("$44,370.00")).toBeInTheDocument();
    expect(screen.getByText("$555.56")).toBeInTheDocument();
  });
});
