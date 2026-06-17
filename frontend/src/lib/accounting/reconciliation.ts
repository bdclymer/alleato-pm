/**
 * Job Planner <-> Acumatica reconciliation analyzer.
 *
 * Pure functions: take Job Planner data (Phase 1) and Acumatica actuals
 * (Phase 2) and return findings. No network or DB access — the unit-tested core.
 *
 * Phase 1 — cross-system health from Job Planner's own `externalObject` sync metadata:
 *   - unlinked records   -> never pushed to Acumatica (no externalObject)
 *   - post-sync drift    -> record modified in JP after its last Acumatica sync
 *   - value mismatch     -> live JP actuals differ from the Acumatica snapshot
 *                           (MED until confirmed in Phase 2)
 *   - budget-health      -> underwater cost basis / thin margin / overbilled
 *
 * Phase 2 — `applyAcumaticaActuals` checks each MED value-mismatch against the
 * real Acumatica ledger (synced `acumatica_project_budgets`), matched on
 * project + cost code + cost type. If the live JP actual equals the live
 * Acumatica actual, the finding was a false positive (stale snapshot) and is
 * cleared; if they genuinely differ, it is promoted to HIGH (confirmed).
 */

import type {
  JpBudget,
  JpBudgetLine,
  JpChangeOrder,
  JpCostCode,
  JpCostType,
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
  /** Resolved cost code, e.g. "013120 · Vice President". */
  costCodeLabel: string | null;
  /** Raw cost code, e.g. "013120" — for the Acumatica join. */
  costCode: string | null;
  /** Cost type letter (L/E/M/S/X) — for the Acumatica join. */
  costType: string | null;
  kind: FindingKind;
  tier: FindingTier;
  detail: string;
  amountCents: number | null;
  jpValueCents: number | null;
  acuValueCents: number | null;
  jpModifiedOn: string | null;
  lastSyncedOn: string | null;
  externalId: string | null;
  externalModel: string | null;
  /** True once the value has been verified against the live Acumatica ledger. */
  acumaticaChecked: boolean;
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
  acumaticaChecked: boolean;
  clearedByAcumatica: number;
};

/** Acumatica actuals keyed by `${projectCode}|${costCode}|${costType}` -> cents. */
export type AcumaticaActuals = {
  byKey: Map<string, number>;
  knownProjectCodes: Set<string>;
};

const THIN_MARGIN_PCT = 3;

export function centsToUsd(cents: number | null | undefined): string {
  return (Number(cents || 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Derive the Acumatica project code from a Job Planner project name
 *  ("24-115 Westfield Collective" -> "24115"). Returns null when no job number. */
export function acumaticaProjectCode(jpProjectName: string): string | null {
  const match = jpProjectName.match(/(\d{2})\s*-\s*(\d{2,3})/);
  return match ? `${match[1]}${match[2]}` : null;
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
  costTypes: JpCostType[] = [],
): ProjectReport {
  const findings: ReconciliationFinding[] = [];
  const codeMap = new Map(costCodes.map((c) => [c.id, c]));
  const typeMap = new Map(costTypes.map((t) => [t.id, t]));

  const push = (
    f: Partial<ReconciliationFinding> &
      Pick<ReconciliationFinding, "recordType" | "recordRef" | "kind" | "tier" | "detail">,
  ) => {
    findings.push({
      jpProjectId: project.projectId,
      jpProjectName: project.projectName,
      state: project.state ?? null,
      fingerprint: `${project.projectId}:${f.recordType}:${f.recordRef}:${f.kind}`,
      costCodeLabel: null,
      costCode: null,
      costType: null,
      amountCents: null,
      jpValueCents: null,
      acuValueCents: null,
      jpModifiedOn: null,
      lastSyncedOn: null,
      externalId: null,
      externalModel: null,
      acumaticaChecked: false,
      ...f,
    });
  };

  const lineItems = budget?.lineItems ?? [];

  for (const line of lineItems) {
    const label = costCodeLabel(line, codeMap);
    const display = label || `line ${line.id}`;
    const ref = String(line.id);
    const rawCode = line.costCodeId != null ? codeMap.get(line.costCodeId)?.code ?? null : null;
    const typeLetter = line.costTypeId != null ? typeMap.get(line.costTypeId)?.code ?? null : null;
    const eo = line.externalObject;

    if (!eo) {
      push({
        recordType: "budget_line", recordRef: ref, kind: "unlinked-budget-line", tier: "HIGH",
        costCodeLabel: label, costCode: rawCode, costType: typeLetter,
        detail: `Budget line ${display} exists in Job Planner but was never pushed to Acumatica.`,
        jpValueCents: liveActuals(line), jpModifiedOn: line.modifiedOn,
      });
      continue;
    }

    const lastSync = parseDate(eo.lastSync);
    const modified = parseDate(line.modifiedOn);
    if (lastSync && modified && modified > lastSync) {
      push({
        recordType: "budget_line", recordRef: ref, kind: "drift-budget-line", tier: "HIGH",
        costCodeLabel: label, costCode: rawCode, costType: typeLetter,
        detail: `Budget line ${display} was edited in Job Planner after its last Acumatica sync.`,
        jpValueCents: liveActuals(line), acuValueCents: Number(eo.data?.act_amt || 0),
        jpModifiedOn: line.modifiedOn, lastSyncedOn: eo.lastSync,
        externalId: eo.externalId, externalModel: eo.externalModel,
      });
    }

    const live = liveActuals(line);
    const pushed = Number(eo.data?.act_amt || 0);
    if (live !== pushed) {
      push({
        recordType: "budget_line", recordRef: ref, kind: "value-mismatch-actuals", tier: "MED",
        costCodeLabel: label, costCode: rawCode, costType: typeLetter,
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
          recordType, recordRef: String(co.id), kind, tier: "HIGH",
          detail: `${label} change order #${co.number} (${centsToUsd(co.totalAmount)}) exists in Job Planner but is not linked to Acumatica.`,
          amountCents: co.totalAmount, jpValueCents: co.totalAmount, jpModifiedOn: co.createdOn,
        });
      }
    }
  };
  scanChangeOrders(ccos, "commitment_co", "unlinked-cco", "Commitment");
  scanChangeOrders(pccos, "prime_co", "unlinked-pcco", "Prime-contract");

  if (budget) {
    const { revisedBudget, budgetedCost, contractAmount, budgetProfit, billedToDate } = budget;
    const eo = budget.externalObject;
    const dates = {
      lastSyncedOn: eo?.lastSync ?? null,
      externalId: eo?.externalId ?? null,
      externalModel: eo?.externalModel ?? null,
    };
    if (Number(budgetedCost) > Number(revisedBudget)) {
      push({
        recordType: "budget", recordRef: "summary", kind: "underwater-budget", tier: "INFO",
        detail: `Budgeted cost ${centsToUsd(budgetedCost)} exceeds the revised budget ${centsToUsd(revisedBudget)} — projected to overspend by ${centsToUsd(budgetedCost - revisedBudget)}.`,
        amountCents: budgetedCost - revisedBudget, jpValueCents: budgetedCost, acuValueCents: revisedBudget,
        ...dates,
      });
    }
    if (Number(contractAmount) > 0) {
      const marginPct = (Number(budgetProfit) / Number(contractAmount)) * 100;
      if (marginPct < THIN_MARGIN_PCT) {
        push({
          recordType: "budget", recordRef: "summary", kind: "thin-margin", tier: "INFO",
          detail: `Projected profit ${centsToUsd(budgetProfit)} is ${marginPct.toFixed(1)}% of the contract ${centsToUsd(contractAmount)} (below ${THIN_MARGIN_PCT}%).`,
          amountCents: budgetProfit, jpValueCents: budgetProfit, ...dates,
        });
      }
      if (Number(billedToDate) > Number(contractAmount)) {
        push({
          recordType: "budget", recordRef: "summary", kind: "billed-over-contract", tier: "INFO",
          detail: `Billed to date ${centsToUsd(billedToDate)} exceeds the contract ${centsToUsd(contractAmount)} — over by ${centsToUsd(billedToDate - contractAmount)}.`,
          amountCents: billedToDate - contractAmount, jpValueCents: billedToDate, acuValueCents: contractAmount, ...dates,
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

/**
 * Phase 2: verify the raw "value mismatch" candidates against the live Acumatica
 * ledger (synced actuals). In Alleato's workflow, actual costs are recorded in
 * Acumatica (AP bills), not Job Planner — so a JP-vs-Acumatica actuals difference
 * is only a genuine discrepancy when BOTH systems recorded an actual and they
 * still differ. We therefore:
 *   - clear   when JP actual == Acumatica actual (agree)
 *   - drop    when one side is zero (expected: cost lives only in Acumatica, or
 *             a JP line not yet costed) or when the line can't be matched
 *   - keep    (HIGH, confirmed) only when both are non-zero and differ
 */
export function applyAcumaticaActuals(
  reports: ProjectReport[],
  actuals: AcumaticaActuals,
): { reports: ProjectReport[]; cleared: number } {
  let cleared = 0;
  const enriched = reports.map((report) => {
    const projectCode = acumaticaProjectCode(report.jpProjectName);
    const projectKnown = projectCode != null && actuals.knownProjectCodes.has(projectCode);

    const next: ReconciliationFinding[] = [];
    for (const finding of report.findings) {
      if (finding.kind !== "value-mismatch-actuals") {
        next.push(finding);
        continue;
      }
      if (!projectKnown || !finding.costCode || !finding.costType) {
        cleared += 1; // can't verify against Acumatica -> not a confirmed discrepancy
        continue;
      }
      const acu = actuals.byKey.get(`${projectCode}|${finding.costCode}|${finding.costType}`) ?? 0;
      const jp = finding.jpValueCents ?? 0;
      if (jp === acu || jp === 0 || acu === 0) {
        cleared += 1; // agree, or one-sided (expected: actuals live in Acumatica)
        continue;
      }
      next.push({
        ...finding,
        tier: "HIGH",
        acumaticaChecked: true,
        acuValueCents: acu,
        amountCents: jp - acu,
        detail: `${finding.costCodeLabel ?? "Budget line"} actual cost is recorded differently in each system: Job Planner ${centsToUsd(jp)} vs Acumatica ${centsToUsd(acu)} (Δ ${centsToUsd(jp - acu)}).`,
      });
    }
    return { ...report, findings: next };
  });
  return { reports: enriched, cleared };
}

export function summarize(
  reports: ProjectReport[],
  opts: { acumaticaChecked?: boolean; cleared?: number } = {},
): ReconciliationSummary {
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
    acumaticaChecked: opts.acumaticaChecked ?? false,
    clearedByAcumatica: opts.cleared ?? 0,
  };
}
