import { ApiError } from "@/lib/api-client";
import {
  formatBudgetCreateError,
  formatBudgetUpdateError,
} from "./update-budget-line-item";

describe("formatBudgetCreateError", () => {
  it("preserves the server error message for budget creation failures", () => {
    const error = new Error("Budget line items are locked by accounting sync.");

    expect(formatBudgetCreateError(error)).toBe(
      "Budget line items are locked by accounting sync.",
    );
  });

  it("includes the request id when budget creation fails through apiFetch", () => {
    const error = new ApiError(500, {
      error_message: "Budget creation failed because the budget is locked.",
      request_id: "req_budget_create_123",
    });

    expect(formatBudgetCreateError(error)).toBe(
      "Budget creation failed because the budget is locked. | Request ID: req_budget_create_123",
    );
  });
});

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
