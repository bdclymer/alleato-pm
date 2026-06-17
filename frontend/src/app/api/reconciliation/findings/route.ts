/**
 * GET /api/reconciliation/findings
 *
 * Runs the Job Planner sync-health reconciliation (Phase 1) across all projects
 * and returns findings + summary. Results are cached in-process for a few
 * minutes so the admin page is snappy; pass ?refresh=1 to force a fresh run.
 *
 * Phase 1 reads Job Planner only. Phase 2 (true Acumatica diff + persistence to
 * `reconciliation_runs`/`reconciliation_findings` + daily cron + Teams digest)
 * is intentionally not wired yet — this route exists so the UI can be evaluated
 * against live data first.
 */

import { NextResponse } from "next/server";

import {
  getBudget,
  getCommitmentChangeOrders,
  getCostCodes,
  getPrimeContractChangeOrders,
  listProjects,
  type JpBudget,
  type JpChangeOrder,
  type JpCostCode,
} from "@/lib/jobplanner/client";
import {
  analyzeProject,
  summarize,
  type ProjectReport,
} from "@/lib/accounting/reconciliation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SKIP_PROJECT_NAMES = new Set(["JobPlanner test", "Training Library"]);
const CONCURRENCY = 5;
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  generatedAt: string;
  reports: ProjectReport[];
};
let cache: CacheEntry | null = null;
let cacheAt = 0;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function runReconciliation(): Promise<CacheEntry> {
  const projects = (await listProjects()).filter(
    (p) => !SKIP_PROJECT_NAMES.has(p.projectName),
  );

  const reports = await mapWithConcurrency(projects, CONCURRENCY, async (project) => {
    try {
      const [budget, ccos, pccos, costCodes] = await Promise.all([
        getBudget(project.projectId).catch(() => null as JpBudget | null),
        getCommitmentChangeOrders(project.projectId).catch(() => [] as JpChangeOrder[]),
        getPrimeContractChangeOrders(project.projectId).catch(() => [] as JpChangeOrder[]),
        getCostCodes(project.projectId).catch(() => [] as JpCostCode[]),
      ]);
      return analyzeProject(project, budget, ccos, pccos, costCodes);
    } catch (err) {
      logger.warn({
        msg: "reconciliation: project scan failed",
        projectId: project.projectId,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        jpProjectId: project.projectId,
        jpProjectName: project.projectName,
        state: project.state ?? null,
        lineCount: 0,
        ccoCount: 0,
        pccoCount: 0,
        findings: [],
      } satisfies ProjectReport;
    }
  });

  return { generatedAt: new Date().toISOString(), reports };
}

export async function GET(request: Request) {
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  try {
    if (refresh || !cache || Date.now() - cacheAt > CACHE_TTL_MS) {
      cache = await runReconciliation();
      cacheAt = Date.now();
    }
    const findings = cache.reports.flatMap((r) => r.findings);
    return NextResponse.json({
      generatedAt: cache.generatedAt,
      summary: summarize(cache.reports),
      findings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reconciliation failed";
    logger.error({ msg: "reconciliation: run failed", error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
