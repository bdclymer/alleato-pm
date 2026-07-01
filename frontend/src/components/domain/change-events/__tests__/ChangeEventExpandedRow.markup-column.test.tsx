/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ChangeEventExpandedRow } from "../ChangeEventExpandedRow";
import { apiFetch } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiFetch: jest.fn(),
}));

jest.mock("@/lib/report-non-critical-failure", () => ({
  reportNonCriticalFailure: jest.fn(),
}));

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("ChangeEventExpandedRow markup column placement", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation((url: string) => {
      if (url.includes("/line-items")) {
        return Promise.resolve({
          data: [
            {
              id: "li-1",
              description: "Test line item",
              costRom: 100000,
              revenueRom: 100000,
              nonCommittedCost: null,
              quantity: 1,
              unitCost: 100000,
              unitOfMeasure: null,
              contractId: null,
            },
          ],
        }) as ReturnType<typeof apiFetch>;
      }
      if (url.includes("/vertical-markup")) {
        return Promise.resolve({
          markups: [
            {
              id: "mk-1",
              markup_type: "fee",
              percentage: 10,
              calculation_order: 1,
              compound: false,
            },
          ],
        }) as ReturnType<typeof apiFetch>;
      }
      return Promise.resolve(null) as ReturnType<typeof apiFetch>;
    });
  });

  it("renders markup amounts in the revenue column, not the cost column", async () => {
    const context = {
      columns: [
        { id: "number_title" },
        { id: "cost_rom" },
        { id: "revenue_prime_pco" },
      ],
      hasSelection: false,
      hasActions: false,
    };

    render(
      <table>
        <tbody>
          <ChangeEventExpandedRow
            changeEventId="ce-1"
            projectId={1}
            colSpan={3}
            expectingRevenue
            context={context}
          />
        </tbody>
      </table>,
    );

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());

    const markupAmount = await screen.findByText("$10,000.00");
    const markupRow = markupAmount.closest("tr");
    expect(markupRow).not.toBeNull();

    const cells = markupRow!.querySelectorAll("td");
    // columns rendered in order: number_title, cost_rom, revenue_prime_pco
    expect(cells[1].textContent).toContain("--");
    expect(cells[2].textContent).toContain("$10,000.00");
  });
});
