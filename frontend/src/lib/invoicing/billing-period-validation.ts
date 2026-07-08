import type { BillingPeriod, CreateBillingPeriodInput } from "@/hooks/use-billing-periods";

type BillingPeriodDraftInput = {
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
};

type OpenBillingPeriodCandidate = Pick<
  BillingPeriod,
  "id" | "is_closed" | "period_number"
>;

export function findOpenBillingPeriod<T extends OpenBillingPeriodCandidate>(
  periods: T[],
  excludePeriodId?: string,
): T | null {
  return (
    periods.find(
      (period) =>
        period.id !== excludePeriodId &&
        period.is_closed !== true,
    ) ?? null
  );
}

export function validateBillingPeriodDraft(
  input: BillingPeriodDraftInput,
): string | null {
  if (!input.start_date) return "Billing period start date is required.";
  if (!input.end_date) return "Billing period end date is required.";
  if (!input.due_date) return "Billing period due date is required.";
  if (input.end_date < input.start_date) {
    return "Billing period end date must be on or after the start date.";
  }
  return null;
}

export function validateOpenBillingPeriodCreate(
  input: Pick<CreateBillingPeriodInput, "start_date" | "end_date" | "due_date">,
  periods: BillingPeriod[],
): string | null {
  const draftError = validateBillingPeriodDraft(input);
  if (draftError) return draftError;

  const openPeriod = findOpenBillingPeriod(periods);
  if (openPeriod) {
    return `Close open billing period BP-${String(openPeriod.period_number).padStart(3, "0")} before creating another one.`;
  }

  return null;
}
