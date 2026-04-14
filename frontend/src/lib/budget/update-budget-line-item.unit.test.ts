import { ApiError } from "@/lib/api-client";
import { formatBudgetUpdateError } from "./update-budget-line-item";

describe("formatBudgetUpdateError", () => {
  it("preserves the server error message and request id for support/debugging", () => {
    const error = new ApiError(500, {
      error_message: "Budget line update failed because the record is locked.",
      request_id: "req_budget_123",
    });

    expect(formatBudgetUpdateError(error)).toBe(
      "Budget line update failed because the record is locked. | Request ID: req_budget_123",
    );
  });

  it("falls back to a stable message when the thrown value is opaque", () => {
    expect(formatBudgetUpdateError(null)).toBe(
      "An unexpected error occurred while saving the budget line.",
    );
  });
});
