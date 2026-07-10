import type { BillingPeriod } from "@/hooks/use-billing-periods";

import {
  findOpenBillingPeriod,
  validateBillingPeriodDraft,
  validateOpenBillingPeriodCreate,
} from "../billing-period-validation";

const basePeriod: BillingPeriod = {
  id: "bp-1",
  project_id: 876,
  name: "Period 1",
  start_date: "2026-06-01",
  end_date: "2026-06-30",
  due_date: "2026-07-05",
  is_closed: false,
  period_number: 1,
  closed_by: null,
  closed_date: null,
  created_at: null,
  updated_at: null,
};

describe("billing-period-validation", () => {
  it("requires due date", () => {
    expect(
      validateBillingPeriodDraft({
        start_date: "2026-06-01",
        end_date: "2026-06-30",
        due_date: undefined,
      }),
    ).toBe("Billing period due date is required.");
  });

  it("rejects end dates before start dates", () => {
    expect(
      validateBillingPeriodDraft({
        start_date: "2026-06-30",
        end_date: "2026-06-01",
        due_date: "2026-07-05",
      }),
    ).toBe("Billing period end date must be on or after the start date.");
  });

  it("finds the current open period", () => {
    expect(findOpenBillingPeriod([basePeriod])?.id).toBe("bp-1");
    expect(
      findOpenBillingPeriod(
        [{ ...basePeriod, is_closed: true }, { ...basePeriod, id: "bp-2" }],
        "bp-2",
      ),
    ).toBeNull();
  });

  it("blocks creating a second open billing period", () => {
    expect(
      validateOpenBillingPeriodCreate(
        {
          start_date: "2026-07-01",
          end_date: "2026-07-31",
          due_date: "2026-08-05",
        },
        [basePeriod],
      ),
    ).toBe("Close open billing period BP-001 before creating another one.");
  });
});
