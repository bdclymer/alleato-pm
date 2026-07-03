export type BudgetChangeStatus = "draft" | "pending" | "approved" | "void";
export type BudgetChangeAction = "submit" | "approve" | "reject" | "void";

export interface BudgetChangeLine {
  id: string;
  costCodeId: string;
  costTypeId: string;
  costTypeCode?: string;
  subJobId: string | null;
  amount: number;
  description: string | null;
  costCodeTitle: string;
}

export interface BudgetChangeRecord {
  id: string;
  number: string;
  title: string;
  reason: string | null;
  amount: number;
  status: BudgetChangeStatus;
  effectiveDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  lines: BudgetChangeLine[];
}

export interface BudgetChangeStatusOption {
  label: string;
  value: BudgetChangeStatus;
  action?: BudgetChangeAction;
}

export function formatBudgetChangeStatus(status: BudgetChangeStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "void":
      return "Void";
    default:
      return status;
  }
}

export function getBudgetChangeStatusOptions(
  status: BudgetChangeStatus,
): BudgetChangeStatusOption[] {
  switch (status) {
    case "draft":
      return [
        { value: "draft", label: "Draft" },
        {
          value: "pending",
          label: "Submit for approval",
          action: "submit",
        },
      ];
    case "pending":
      return [
        { value: "pending", label: "Pending approval" },
        { value: "approved", label: "Approve", action: "approve" },
        { value: "draft", label: "Return to draft", action: "reject" },
      ];
    case "approved":
      return [{ value: "approved", label: "Approved" }];
    case "void":
      return [{ value: "void", label: "Void" }];
    default:
      return [{ value: status, label: status }];
  }
}

export function formatBudgetChangeLineLabel(
  line: BudgetChangeLine | null | undefined,
): string {
  if (!line) return "Not set";
  const codeWithType = line.costTypeCode
    ? `${line.costCodeId}.${line.costTypeCode}`
    : line.costCodeId;
  return line.costCodeTitle
    ? `${codeWithType} - ${line.costCodeTitle}`
    : codeWithType;
}

export function getBudgetChangeEndpoints(
  lines: BudgetChangeLine[],
): { from: BudgetChangeLine | null; to: BudgetChangeLine | null } {
  const from = lines.find((line) => line.amount < 0) ?? null;
  const to = lines.find((line) => line.amount > 0) ?? null;
  return { from, to };
}

export function getBudgetChangeTransferAmount(
  change: Pick<BudgetChangeRecord, "amount" | "lines">,
): number {
  const positive = change.lines.find((line) => line.amount > 0);
  const negative = change.lines.find((line) => line.amount < 0);

  if (positive) return Math.abs(positive.amount);
  if (negative) return Math.abs(negative.amount);
  return Math.abs(change.amount);
}

export function getBudgetChangeSearchText(
  change: BudgetChangeRecord,
): string {
  const lineText = change.lines
    .map((line) =>
      [
        line.costCodeId,
        line.costTypeCode,
        line.costCodeTitle,
        line.description,
      ]
        .filter(Boolean)
        .join(" "),
    )
    .join(" ");

  return [
    change.number,
    change.title,
    change.reason,
    change.status,
    lineText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getBulkActionSelectionCounts(
  changes: BudgetChangeRecord[],
  selectedIds: string[],
): Record<BudgetChangeAction, number> {
  const selected = changes.filter((change) => selectedIds.includes(change.id));

  return {
    submit: selected.filter((change) => change.status === "draft").length,
    approve: selected.filter((change) => change.status === "pending").length,
    reject: selected.filter((change) => change.status === "pending").length,
    void: selected.filter((change) => change.status === "approved").length,
  };
}
