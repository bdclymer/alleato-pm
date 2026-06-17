/**
 * Job Planner <-> Acumatica reconciliation analyzer.
 *
 * Pure functions: take Job Planner data (and, in Phase 2, Acumatica data) and
 * return findings. No network or DB access — this is the unit-tested core.
 *
 * Phase 1 (implemented): derive cross-system health from Job Planner's own
 * `externalObject` sync metadata.
 *   - unlinked records   -> never pushed to Acumatica (no externalObject)
 *   - post-sync drift    -> record modified in JP after its last Acumatica sync
 *   - value mismatch     -> live JP actuals differ from the Acumatica snapshot
 *                           (MED until verified against Acumatica in Phase 2)
 *   - budget-health      -> underwater cost basis / thin margin / overbilled
 */

import type {
  JpBudget,
  JpBudgetLine,
  JpChangeOrder,
  JpProject,
} from "@/lib/jobplanner/client";

export type FindingTier = "HIGH" | "MED" | "INFO";

export type FindingKind =
  | "unlinked-budget-line"
  | "drift-budget-line"
  | "value-mismatch-actuals"
  | "unlinked-cco"
  | "unlinked-pcco"
  | "underwater-budget"
  | "thin-margin"
  | "billed-over-contract";

export type ReconciliationFinding = {
  /** Stable fingerprint for cross-run dedup / triage. */
  fingerprint: string;
  jpProjectId: number;
  jpProjectName: string;
  state: string | null;
  recordType: "budget_line" | "commitment_co" | "prime_co" | "budget";
  recordRef: string;
  costCode: string | null;
  kind: FindingKind;
  tier: FindingTier;
  detail: string;
  amountCents: number | null;
  externalId: string | null;
};

export type ProjectReport = {
  jpProjectId: number;
  jpProjectName: string;
  state: string | null;
  lineCount: number;
  ccoCount: number;
  pccoCount: number;
  findings: ReconciliationFinding[];
};

export type ReconciliationSummary = {
  projects: number;
  totalFindings: number;
  highCount: number;
  byKind: Record<string, number>;
  dollarsAtRiskCents: number;
};

const THIN_MARGIN_PCT = 3;

export function centsToUsd(cents: number | null | undefined): string {
  return (Number(cents || 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function liveActuals(line: JpBudgetLine): number {
  const values = line.directCostValues || {};
  return Object.values(values).reduce((sum, v) => sum + Number(v?.amount || 0), 0);
}

export function analyzeProject(
  project: JpProject,
  budget: JpBudget | null,
  ccos: JpChangeOrder[],
  pccos: JpChangeOrder[],
): ProjectReport {
  const findings: ReconciliationFinding[] = [];
  const base = {
    jpProjectId: project.projectId,
    jpProjectName: project.projectName,
    state: project.state ?? null,
  };

  const push = (
    recordType: ReconciliationFinding["recordType"],
    recordRef: string,
    kind: FindingKind,
    tier: FindingTier,
    detail: string,
    opts: { amountCents?: number | null; costCode?: string | null; externalId?: string | null } = {},
  ) => {
    findings.push({
      ...base,
      recordType,
      recordRef,
      kind,
      tier,
      detail,
      costCode: opts.costCode ?? null,
      amountCents: opts.amountCents ?? null,
      externalId: opts.externalId ?? null,
      fingerprint: `${project.projectId}:${recordType}:${recordRef}:${kind}`,
    });
  };

  const lineItems = budget?.lineItems ?? [];

  for (const line of lineItems) {
    const costCode = line.costCodeId ? `costCode ${line.costCodeId}` : null;
    const label = line.description || costCode || `line ${line.id}`;
    const ref = String(line.id);
    const eo = line.externalObject;

    if (!eo) {
      push("budget_line", ref, "unlinked-budget-line", "HIGH",
        `Budget line "${label}" has no Acumatica linkage (never pushed).`,
        { costCode });
      continue;
    }

    const lastSync = parseDate(eo.lastSync);
    const modified = parseDate(line.modifiedOn);
    if (lastSync && modified && modified > lastSync) {
      push("budget_line", ref, "drift-budget-line", "HIGH",
        `Budget line "${label}" edited in JP after last Acumatica sync (modified ${modified.toISOString().slice(0, 10)} > synced ${lastSync.toISOString().slice(0, 10)}).`,
        { costCode, externalId: eo.externalId });
    }

    const live = liveActuals(line);
    const pushed = Number(eo.data?.act_amt || 0);
    if (live !== pushed) {
      push("budget_line", ref, "value-mismatch-actuals", "MED",
        `Budget line "${label}" actuals: JP ${centsToUsd(live)} vs Acumatica snapshot ${centsToUsd(pushed)} (Δ ${centsToUsd(live - pushed)}).`,
        { costCode, amountCents: live - pushed, externalId: eo.externalId });
    }
  }

  const scanChangeOrders = (
    rows: JpChangeOrder[],
    recordType: "commitment_co" | "prime_co",
    kind: "unlinked-cco" | "unlinked-pcco",
    label: string,
  ) => {
    for (const co of rows) {
      if (!co.externalObject) {
        push(recordType, String(co.id), kind, "HIGH",
          `${label} change order #${co.number} (${centsToUsd(co.totalAmount)}) has no Acumatica linkage.`,
          { amountCents: co.totalAmount });
      }
    }
  };
  scanChangeOrders(ccos, "commitment_co", "unlinked-cco", "Commitment");
  scanChangeOrders(pccos, "prime_co", "unlinked-pcco", "Prime-contract");

  if (budget) {
    const { revisedBudget, budgetedCost, contractAmount, budgetProfit, billedToDate } = budget;
    if (Number(budgetedCost) > Number(revisedBudget)) {
      push("budget", "summary", "underwater-budget", "INFO",
        `Budgeted cost ${centsToUsd(budgetedCost)} exceeds revised budget ${centsToUsd(revisedBudget)} (over by ${centsToUsd(budgetedCost - revisedBudget)}).`,
        { amountCents: budgetedCost - revisedBudget });
    }
    if (Number(contractAmount) > 0) {
      const marginPct = (Number(budgetProfit) / Number(contractAmount)) * 100;
      if (marginPct < THIN_MARGIN_PCT) {
        push("budget", "summary", "thin-margin", "INFO",
          `Budget profit ${centsToUsd(budgetProfit)} is ${marginPct.toFixed(1)}% of contract ${centsToUsd(contractAmount)} (below ${THIN_MARGIN_PCT}%).`);
      }
      if (Number(billedToDate) > Number(contractAmount)) {
        push("budget", "summary", "billed-over-contract", "INFO",
          `Billed to date ${centsToUsd(billedToDate)} exceeds contract ${centsToUsd(contractAmount)} (over by ${centsToUsd(billedToDate - contractAmount)}).`,
          { amountCents: billedToDate - contractAmount });
      }
    }
  }

  return {
    jpProjectId: project.projectId,
    jpProjectName: project.projectName,
    state: project.state ?? null,
    lineCount: lineItems.length,
    ccoCount: ccos.length,
    pccoCount: pccos.length,
    findings,
  };
}

export function summarize(reports: ProjectReport[]): ReconciliationSummary {
  const byKind: Record<string, number> = {};
  let highCount = 0;
  let dollarsAtRiskCents = 0;
  for (const report of reports) {
    for (const finding of report.findings) {
      byKind[finding.kind] = (byKind[finding.kind] || 0) + 1;
      if (finding.tier === "HIGH") highCount += 1;
      if (finding.tier !== "INFO") dollarsAtRiskCents += Math.abs(finding.amountCents || 0);
    }
  }
  return {
    projects: reports.length,
    totalFindings: reports.reduce((n, r) => n + r.findings.length, 0),
    highCount,
    byKind,
    dollarsAtRiskCents,
  };
}
