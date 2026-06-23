export interface ChangeEventFinancialTotals {
  revenueRom: string | number | null | undefined;
  costRom: string | number | null | undefined;
  nonCommittedCost: string | number | null | undefined;
}

export function toCurrencyNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function calculateChangeEventOverUnder(
  totals: Pick<ChangeEventFinancialTotals, "revenueRom" | "costRom">,
): number {
  return toCurrencyNumber(totals.revenueRom) - toCurrencyNumber(totals.costRom);
}
