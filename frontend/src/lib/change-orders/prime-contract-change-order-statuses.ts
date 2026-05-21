export const PRIME_CONTRACT_CHANGE_ORDER_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "not_pricing", label: "Not Pricing" },
  { value: "pending_pricing", label: "Pending Pricing" },
  { value: "pending_in_review", label: "Pending In Review" },
  { value: "pending_revised", label: "Pending Revised" },
  { value: "pending_proceeding", label: "Pending Proceeding" },
  { value: "pending_not_proceeding", label: "Pending Not Proceeding" },
  { value: "no_charge", label: "No Charge" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "void", label: "Void" },
] as const;

export type PrimeContractChangeOrderStatus =
  (typeof PRIME_CONTRACT_CHANGE_ORDER_STATUSES)[number]["value"];

export function primeContractChangeOrderStatusLabel(status: string | null | undefined) {
  return (
    PRIME_CONTRACT_CHANGE_ORDER_STATUSES.find((option) => option.value === status)
      ?.label ?? "Draft"
  );
}

export function normalizePrimeContractChangeOrderStatus(
  status: string | null | undefined,
): PrimeContractChangeOrderStatus {
  if (
    PRIME_CONTRACT_CHANGE_ORDER_STATUSES.some((option) => option.value === status)
  ) {
    return status as PrimeContractChangeOrderStatus;
  }

  if (status === "proposed") return "pending";
  if (status === "out_for_signature") return "pending_in_review";
  if (status === "executed") return "approved";
  return "draft";
}
