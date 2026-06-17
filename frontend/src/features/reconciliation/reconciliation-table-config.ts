import type { FilterConfig } from "@/components/tables/unified";
import type { FindingKind, FindingTier } from "@/lib/accounting/reconciliation";

export const tierLabels: Record<FindingTier, string> = {
  HIGH: "High",
  MED: "Medium",
  INFO: "Info",
};

export const kindLabels: Record<FindingKind, string> = {
  "unlinked-budget-line": "Unlinked budget line",
  "drift-budget-line": "Post-sync drift",
  "value-mismatch-actuals": "Value mismatch",
  "unlinked-cco": "Unlinked commitment CO",
  "unlinked-pcco": "Unlinked prime CO",
  "underwater-budget": "Underwater budget",
  "thin-margin": "Thin margin",
  "billed-over-contract": "Billed over contract",
};

export const reconciliationFilters: FilterConfig[] = [
  {
    id: "tier",
    label: "Confidence",
    type: "select",
    options: [
      { value: "HIGH", label: "High" },
      { value: "MED", label: "Medium" },
      { value: "INFO", label: "Info" },
    ],
  },
  {
    id: "kind",
    label: "Finding type",
    type: "select",
    options: (Object.keys(kindLabels) as FindingKind[]).map((value) => ({
      value,
      label: kindLabels[value],
    })),
  },
];
