import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { GuardrailError } from "@/lib/guardrails/errors";

export type FinanceSpendCategory =
  | "audit_tax"
  | "controller_accounting_services"
  | "erp_accounting_software"
  | "payroll_timekeeping"
  | "finance_legal_compliance"
  | "other_finance_overhead";

export type FinanceSpendExclusionReason =
  | "project_cost"
  | "customer_refund"
  | "reversal_or_credit"
  | "duplicate_closure_entry"
  | "zero_dollar_adjustment"
  | "unclassified_operating_noise";

export type FinanceSpendBill = {
  id: number;
  referenceNbr: string;
  vendorId: string | null;
  vendorRef: string | null;
  date: string | null;
  month: string;
  status: string | null;
  description: string | null;
  amount: number;
  projectCode: string | null;
  category: FinanceSpendCategory | null;
  categoryLabel: string | null;
  confidence: number;
  classificationSource: string;
  included: boolean;
  exclusionReason: FinanceSpendExclusionReason | null;
  flags: string[];
};

export type FinanceSpendRollup = {
  generatedAt: string;
  window: {
    startDate: string;
    endDate: string;
    months: string[];
  };
  totals: {
    includedSpend: number;
    includedBillCount: number;
    excludedBillCount: number;
    uncertainBillCount: number;
  };
  monthlyTotals: Array<{ month: string; total: number; billCount: number }>;
  monthlyByCategory: Array<{
    month: string;
    category: FinanceSpendCategory;
    categoryLabel: string;
    total: number;
    billCount: number;
  }>;
  monthlyByVendor: Array<{
    month: string;
    vendorId: string;
    total: number;
    billCount: number;
  }>;
  exceptions: FinanceSpendBill[];
  includedBills: FinanceSpendBill[];
};

type Supabase = SupabaseClient<Database>;
type ApBillRow = Pick<
  Database["public"]["Tables"]["acumatica_ap_bills"]["Row"],
  | "id"
  | "reference_nbr"
  | "document_type"
  | "vendor_id"
  | "vendor_ref"
  | "project_code"
  | "project_id"
  | "date"
  | "status"
  | "description"
  | "amount"
  | "raw_payload"
>;
type RuleRow = Database["public"]["Tables"]["finance_spend_classification_rules"]["Row"];

const CATEGORY_LABELS: Record<FinanceSpendCategory, string> = {
  audit_tax: "Audit / tax",
  controller_accounting_services: "Controller / accounting services",
  erp_accounting_software: "ERP / accounting software",
  payroll_timekeeping: "Payroll / timekeeping",
  finance_legal_compliance: "Finance legal / compliance",
  other_finance_overhead: "Other finance overhead",
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthKey(value: string | null): string {
  if (!value) return "undated";
  return value.slice(0, 7);
}

function trailingMonthKeys(months: number, now = new Date()): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  cursor.setUTCMonth(cursor.getUTCMonth() - (months - 1));
  for (let i = 0; i < months; i += 1) {
    keys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function startDateForTrailingMonths(months: number, now = new Date()): string {
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  cursor.setUTCMonth(cursor.getUTCMonth() - (months - 1));
  return cursor.toISOString().slice(0, 10);
}

function normalizedText(row: ApBillRow): string {
  return [
    row.vendor_id,
    row.vendor_ref,
    row.reference_nbr,
    row.document_type,
    row.status,
    row.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

function isProjectSpecific(row: ApBillRow): boolean {
  const code = (row.project_code ?? "").trim().toUpperCase();
  return Boolean(row.project_id || (code && code !== "X" && code !== "NONPROJECT" && code !== "NON-PROJECT"));
}

function duplicateSignature(row: ApBillRow): string {
  return [
    (row.vendor_id ?? "").trim().toUpperCase(),
    (row.vendor_ref ?? "").trim().toUpperCase(),
    (row.reference_nbr ?? "").trim().toUpperCase(),
    row.date ?? "",
    roundMoney(Number(row.amount ?? 0)).toFixed(2),
    (row.description ?? "").trim().toUpperCase(),
  ].join("|");
}

function classifyBill(row: ApBillRow, rules: RuleRow[], seenSignatures: Set<string>): FinanceSpendBill {
  const amount = roundMoney(Number(row.amount ?? 0));
  const searchable = normalizedText(row);
  const flags: string[] = [];
  let category: FinanceSpendCategory | null = null;
  let confidence = 0;
  let classificationSource = "no_matching_rule";
  let included = true;
  let exclusionReason: FinanceSpendExclusionReason | null = null;

  const signature = duplicateSignature(row);
  const isDuplicate = seenSignatures.has(signature);
  seenSignatures.add(signature);

  const matchingRule = rules.find((rule) =>
    searchable.includes(rule.match_text.trim().toUpperCase()),
  );

  if (matchingRule) {
    category = matchingRule.category as FinanceSpendCategory;
    confidence = Number(matchingRule.confidence ?? 0);
    classificationSource = `rule:${matchingRule.rule_name}`;
    if (matchingRule.exclude) {
      included = false;
      exclusionReason = "unclassified_operating_noise";
      flags.push(matchingRule.exclusion_reason ?? "Classification rule excludes this bill.");
    }
  }

  if (isProjectSpecific(row)) {
    included = false;
    exclusionReason = "project_cost";
    flags.push("Project-coded AP bill excluded from accounting/finance overhead.");
  }

  if (amount === 0) {
    included = false;
    exclusionReason = "zero_dollar_adjustment";
    flags.push("Zero-dollar adjustment excluded from spend totals.");
  }

  if (amount < 0 || /\b(reversal|reverse|credit memo|refund|overpayment|void|voided)\b/i.test(searchable)) {
    included = false;
    exclusionReason = "reversal_or_credit";
    flags.push("Potential reversal, credit, refund, overpayment, or void entry.");
  }

  if (/\b(customer refund|client refund)\b/i.test(searchable)) {
    included = false;
    exclusionReason = "customer_refund";
    flags.push("Customer refund excluded from finance overhead spend.");
  }

  if (isDuplicate) {
    included = false;
    exclusionReason = "duplicate_closure_entry";
    flags.push("Duplicate AP bill signature excluded from spend totals.");
  }

  if (!category) {
    if (included) {
      included = false;
      exclusionReason = "unclassified_operating_noise";
    }
    flags.push("No accounting/finance classification rule matched.");
  }

  if (included && confidence < 0.85) {
    flags.push("Classification confidence is below review threshold.");
  }

  return {
    id: row.id,
    referenceNbr: row.reference_nbr,
    vendorId: row.vendor_id,
    vendorRef: row.vendor_ref,
    date: row.date,
    month: monthKey(row.date),
    status: row.status,
    description: row.description,
    amount,
    projectCode: row.project_code,
    category,
    categoryLabel: category ? CATEGORY_LABELS[category] : null,
    confidence,
    classificationSource,
    included,
    exclusionReason,
    flags,
  };
}

function pushSum<TKey extends string>(
  map: Map<TKey, { total: number; billCount: number }>,
  key: TKey,
  amount: number,
) {
  const current = map.get(key) ?? { total: 0, billCount: 0 };
  current.total = roundMoney(current.total + amount);
  current.billCount += 1;
  map.set(key, current);
}

export async function buildFinanceSpendRollup(
  supabase: Supabase,
  months = 12,
): Promise<FinanceSpendRollup> {
  const startDate = startDateForTrailingMonths(months);
  const endDate = new Date().toISOString().slice(0, 10);
  const monthKeys = trailingMonthKeys(months);

  const [billsResult, rulesResult] = await Promise.all([
    supabase
      .from("acumatica_ap_bills")
      .select("id, reference_nbr, document_type, vendor_id, vendor_ref, project_code, project_id, date, status, description, amount, raw_payload")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true }),
    supabase
      .from("finance_spend_classification_rules")
      .select("*")
      .eq("active", true)
      .order("priority", { ascending: true }),
  ]);

  const errors = [billsResult.error, rulesResult.error].filter(Boolean);
  if (errors.length > 0) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "buildFinanceSpendRollup",
      message: "Failed to load finance spend source data.",
      details: { reasons: errors.map((error) => error?.message).filter(Boolean) },
    });
  }

  const seenSignatures = new Set<string>();
  const classified = (billsResult.data ?? []).map((row) =>
    classifyBill(row, rulesResult.data ?? [], seenSignatures),
  );
  const includedBills = classified.filter((bill) => bill.included);
  const exceptions = classified.filter((bill) => !bill.included || bill.flags.length > 0);

  const monthlyTotalMap = new Map<string, { total: number; billCount: number }>();
  const categoryMap = new Map<string, { total: number; billCount: number }>();
  const vendorMap = new Map<string, { total: number; billCount: number }>();

  for (const key of monthKeys) {
    monthlyTotalMap.set(key, { total: 0, billCount: 0 });
  }

  for (const bill of includedBills) {
    pushSum(monthlyTotalMap, bill.month, bill.amount);
    if (bill.category) {
      pushSum(categoryMap, `${bill.month}|${bill.category}`, bill.amount);
    }
    pushSum(vendorMap, `${bill.month}|${bill.vendorId ?? "Unknown vendor"}`, bill.amount);
  }

  return {
    generatedAt: new Date().toISOString(),
    window: { startDate, endDate, months: monthKeys },
    totals: {
      includedSpend: roundMoney(includedBills.reduce((sum, bill) => sum + bill.amount, 0)),
      includedBillCount: includedBills.length,
      excludedBillCount: classified.length - includedBills.length,
      uncertainBillCount: classified.filter((bill) => bill.confidence < 0.85 || bill.flags.length > 0).length,
    },
    monthlyTotals: monthKeys.map((month) => ({
      month,
      total: monthlyTotalMap.get(month)?.total ?? 0,
      billCount: monthlyTotalMap.get(month)?.billCount ?? 0,
    })),
    monthlyByCategory: [...categoryMap.entries()].map(([key, value]) => {
      const [month, category] = key.split("|") as [string, FinanceSpendCategory];
      return {
        month,
        category,
        categoryLabel: CATEGORY_LABELS[category],
        total: value.total,
        billCount: value.billCount,
      };
    }),
    monthlyByVendor: [...vendorMap.entries()].map(([key, value]) => {
      const [month, vendorId] = key.split("|");
      return { month, vendorId, total: value.total, billCount: value.billCount };
    }),
    exceptions: exceptions
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 200),
    includedBills: includedBills
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 200),
  };
}
