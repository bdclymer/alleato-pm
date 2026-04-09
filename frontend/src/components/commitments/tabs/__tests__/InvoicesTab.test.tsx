/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { InvoicesTab } from "../InvoicesTab";

describe("InvoicesTab", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("renders retainage-aware summary values in read-only mode", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        summary: {
          total_contract_amount: 10000,
          gross_billed_to_date: 3500,
          retainage_percentage: 10,
          retainage_held: 350,
          net_billed_to_date: 3150,
          remaining_to_invoice: 6500,
          net_remaining_balance: 6850,
          percent_invoiced: 35,
        },
        line_items: [
          {
            id: "line-1",
            line_number: 1,
            budget_code: "01 00 00",
            description: "Labor",
            scheduled_value: 5000,
            gross_billed_to_date: 2000,
            retainage_percentage: 10,
            retainage_held: 200,
            net_billed_to_date: 1800,
            remaining_amount: 3000,
            percent_complete: 40,
          },
        ],
      }),
    } as Response);

    (globalThis as typeof globalThis & { fetch: typeof fetchMock }).fetch =
      fetchMock;

    render(<InvoicesTab commitmentId="commitment-1" projectId="42" />);

    expect(fetchMock).toHaveBeenCalledWith("/api/commitments/commitment-1/invoices");

    expect(await screen.findByText("Read-only view")).toBeInTheDocument();
    expect(screen.getByText("Net remaining balance: $6,850.00")).toBeInTheDocument();
  });
});
