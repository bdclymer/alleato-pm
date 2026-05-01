import type { SovLineItem } from "@/lib/schemas/create-subcontract-schema";
import type { BudgetCode } from "./types";

// Subcontract SOV stores budget codes as TEXT (no FK constraint), but the
// SOV form's BudgetCodeSelector dropdown options are keyed on
// project_budget_codes.id. These helpers bridge the two so an existing SOV
// row's stored text is reconciled to a real dropdown option on edit, and a
// stale stored code (no longer in project_budget_codes) still renders rather
// than collapsing the dropdown to its empty placeholder.

export function reconcileSovBudgetCodes(
  lines: SovLineItem[],
  budgetCodes: BudgetCode[],
): { lines: SovLineItem[]; changed: boolean } {
  if (budgetCodes.length === 0) return { lines, changed: false };
  let changed = false;
  const next = lines.map((line) => {
    if (line.isGroup || (line.budgetCodeId && line.budgetCodeLabel)) return line;
    const storedCode = `${line.budgetCode ?? ""}`.trim();
    if (!storedCode) return line;
    const matched = budgetCodes.find(
      (c) =>
        c.id === storedCode ||
        c.code === storedCode ||
        c.fullLabel === storedCode,
    );
    if (!matched) return line;
    changed = true;
    return {
      ...line,
      budgetCodeId: matched.id,
      budgetCode: matched.code,
      budgetCodeLabel: matched.fullLabel,
    };
  });
  return { lines: changed ? next : lines, changed };
}

export function synthesizeMissingBudgetCodes(
  lines: SovLineItem[],
  budgetCodes: BudgetCode[],
): BudgetCode[] {
  const existing = new Set(
    budgetCodes.flatMap((c) => [c.id, c.code, c.fullLabel]),
  );
  const synthetic: BudgetCode[] = [];
  for (const line of lines) {
    if (line.isGroup) continue;
    const code = `${line.budgetCode ?? ""}`.trim();
    if (!code || existing.has(code)) continue;
    existing.add(code);
    synthetic.push({
      id: code,
      code,
      costType: null,
      description: "",
      fullLabel: code,
    });
  }
  return synthetic;
}
