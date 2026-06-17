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
 *
 * Every finding carries the evidence needed to review it by hand: the JP and
 * Acumatica values, the relevant dates, the resolved cost code, and the
 * Acumatica record id (externalId GUID + externalModel) to search in Acumatica.
 */

import type {
  JpBudget,
  JpBudgetLine,
  JpChangeOrder,
  JpCostCode,
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
  /** Resolved cost code, e.g. "013120 · Vice President" — null when not applicable. */
  costCodeLabel: string | null;
  kind: FindingKind;
  tier: FindingTier;
  detail: string;
  amountCents: number | null;
  /** Evidence for manual review. */
  jpValueCents: number | null;
  acuValueCents: number | null;
  jpModifiedOn: string | null;
  lastSyncedOn: string | null;
  externalId: string | null;
  externalModel: string | null;
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

function costCodeLabel(
  line: JpBudgetLine,
  codes: Map<number, JpCostCode>,
): string | null {
  if (line.costCodeId == null) return line.description || null;
  const cc = codes.get(line.costCodeId);
  if (!cc) return line.description || `cost code ${line.costCodeId}`;
  const name = cc.name && cc.name !== "Do Not Use" ? cc.name : line.description || "";
  return name ? `${cc.code} · ${name}` : cc.code;
}

export function analyzeProject(
  project: JpProject,
  budget: JpBudget | null,
  ccos: JpChangeOrder[],
  pccos: JpChangeOrder[],
  costCodes: JpCostCode[] = [],
): ProjectReport {
  const findings: ReconciliationFinding[] = [];
  const codeMap = new Map(costCodes.map((c) => [c.id, c]));

  const push = (
    f: Omit<ReconciliationFinding, "jpProjectId" | "jpProjectName" | "state" | "fingerprint">,
  ) => {
    findings.push({
      jpProjectId: project.projectId,
      jpProjectName: project.projectName,
      state: project.state ?? null,
      fingerprint: `${project.projectId}:${f.recordType}:${f.recordRef}:${f.kind}`,
      ...f,
    });
  };

  const lineItems = budget?.lineItems ?? [];

  for (const line of lineItems) {
    const label = costCodeLabel(line, codeMap);
    const display = label || `line ${line.id}`;
    const ref = String(line.id);
    const eo = line.externalObject;

    if (!eo) {
      push({
        recordType: "budget_line", recordRef: ref, kind: "unlinked-budget-line", tier: "HIGH",
        costCodeLabel: label,
        detail: `Budget line ${display} exists in Job Planner but was never pushed to Acumatica.`,
        amountCents: null, jpValueCents: liveActuals(line), acuValueCents: null,
        jpModifiedOn: line.modifiedOn, lastSyncedOn: null, externalId: null, externalModel: null,
      });
      continue;
    }

    const lastSync = parseDate(eo.lastSync);
    const modified = parseDate(line.modifiedOn);
    if (lastSync && modified && modified > lastSync) {
      push({
        recordType: "budget_line", recordRef: ref, kind: "drift-budget-line", tier: "HIGH",
        costCodeLabel: label,
        detail: `Budget line ${display} was edited in Job Planner after its last Acumatica sync.`,
        amountCents: null, jpValueCents: liveActuals(line), acuValueCents: Number(eo.data?.act_amt || 0),
        jpModifiedOn: line.modifiedOn, lastSyncedOn: eo.lastSync,
        externalId: eo.externalId, externalModel: eo.externalModel,
      });
    }

    const live = liveActuals(line);
    const pushed = Number(eo.data?.act_amt || 0);
    if (live !== pushed) {
      push({
        recordType: "budget_line", recordRef: ref, kind: "value-mismatch-actuals", tier: "MED",
        costCodeLabel: label,
        detail: `Budget line ${display} actual cost differs: Job Planner ${centsToUsd(live)} vs Acumatica ${centsToUsd(pushed)}.`,
        amountCents: live - pushed, jpValueCents: live, acuValueCents: pushed,
        jpModifiedOn: line.modifiedOn, lastSyncedOn: eo.lastSync,
        externalId: eo.externalId, externalModel: eo.externalModel,
      });
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
        push({
          recordType, recordRef: String(co.id), kind, tier: "HIGH", costCodeLabel: null,
          detail: `${label} change order #${co.number} (${centsToUsd(co.totalAmount)}) exists in Job Planner but is not linked to Acumatica.`,
          amountCents: co.totalAmount, jpValueCents: co.totalAmount, acuValueCents: null,
          jpModifiedOn: co.createdOn, lastSyncedOn: null, externalId: null, externalModel: null,
        });
      }
    }
  };
  scanChangeOrders(ccos, "commitment_co", "unlinked-cco", "Commitment");
  scanChangeOrders(pccos, "prime_co", "unlinked-pcco", "Prime-contract");

  if (budget) {
    const { revisedBudget, budgetedCost, contractAmount, budgetProfit, billedToDate } = budget;
    const budgetDates = {
      jpModifiedOn: null as string | null,
      lastSyncedOn: budget.externalObject?.lastSync ?? null,
      externalId: budget.externalObject?.externalId ?? null,
      externalModel: budget.externalObject?.externalModel ?? null,
    };
    if (Number(budgetedCost) > Number(revisedBudget)) {
      push({
        recordType: "budget", recordRef: "summary", kind: "underwater-budget", tier: "INFO",
        costCodeLabel: null,
        detail: `Budgeted cost ${centsToUsd(budgetedCost)} exceeds the revised budget ${centsToUsd(revisedBudget)} — projected to overspend by ${centsToUsd(budgetedCost - revisedBudget)}.`,
        amountCents: budgetedCost - revisedBudget, jpValueCents: budgetedCost, acuValueCents: revisedBudget,
        ...budgetDates,
      });
    }
    if (Number(contractAmount) > 0) {
      const marginPct = (Number(budgetProfit) / Number(contractAmount)) * 100;
      if (marginPct < THIN_MARGIN_PCT) {
        push({
          recordType: "budget", recordRef: "summary", kind: "thin-margin", tier: "INFO",
          costCodeLabel: null,
          detail: `Projected profit ${centsToUsd(budgetProfit)} is ${marginPct.toFixed(1)}% of the contract ${centsToUsd(contractAmount)} (below ${THIN_MARGIN_PCT}%).`,
          amountCents: budgetProfit, jpValueCents: budgetProfit, acuValueCents: null,
          ...budgetDates,
        });
      }
      if (Number(billedToDate) > Number(contractAmount)) {
        push({
          recordType: "budget", recordRef: "summary", kind: "billed-over-contract", tier: "INFO",
          costCodeLabel: null,
          detail: `Billed to date ${centsToUsd(billedToDate)} exceeds the contract ${centsToUsd(contractAmount)} — over by ${centsToUsd(billedToDate - contractAmount)}.`,
          amountCents: billedToDate - contractAmount, jpValueCents: billedToDate, acuValueCents: contractAmount,
          ...budgetDates,
        });
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
      if (finding.tier === "HIGH") dollarsAtRiskCents += Math.abs(finding.amountCents || 0);
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
