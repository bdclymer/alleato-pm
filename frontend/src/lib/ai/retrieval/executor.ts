// frontend/src/lib/ai/retrieval/executor.ts
import type { RetrievalPlan, RetrievalContext, ExternalSource } from "./types";

export type ExecutorDeps = {
  loadIntelligencePacket: (projectId: number) => Promise<unknown>;
  loadProjectSnapshot: (projectId: number) => Promise<unknown>;
  runSemanticSearch: (query: string) => Promise<unknown>;
  runExternalSourceSearch: (
    source: ExternalSource,
    query: string,
    projectId?: number,
  ) => Promise<unknown>;
  loadReusableBriefing: (sessionId: string) => Promise<unknown>;
  runSourceSpecificRag: (kind: string, message: string) => Promise<unknown>;
  buildBrandonDaily: () => Promise<unknown>;
  externalTimeoutMs?: number;
};

type TimeoutMarker = { __timeout: true; label: string };

function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T | TimeoutMarker> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ __timeout: true, label }), ms);
    p.then((v) => {
      clearTimeout(timer);
      resolve(v);
    }).catch((e) => {
      clearTimeout(timer);
      resolve({ __timeout: true, label: `${label}: ${(e as Error).message}` });
    });
  });
}

function isTimeout(value: unknown): value is TimeoutMarker {
  return typeof value === "object" && value !== null && "__timeout" in value;
}

export async function executeRetrievalPlan(
  plan: RetrievalPlan,
  deps: ExecutorDeps,
  ctx?: { sessionId?: string; message?: string },
): Promise<RetrievalContext> {
  const warnings: RetrievalContext["warnings"] = [];
  const durations: Record<string, number> = {};
  const result: RetrievalContext = { warnings, durationsMs: durations };

  const tasks: Array<Promise<void>> = [];
  const externalTimeout = deps.externalTimeoutMs ?? 3000;

  const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      durations[label] = Date.now() - start;
    }
  };

  if (plan.sources.brandonDailyUpdate) {
    tasks.push(
      time("brandon_daily", async () => {
        result.brandonDailyUpdatePacket = await deps.buildBrandonDaily();
      }),
    );
  }

  if (plan.sources.intelligencePacket && plan.selectedProjectId) {
    const projectId = plan.selectedProjectId;
    tasks.push(
      time("intelligence_packet", async () => {
        result.intelligencePacket = (await deps.loadIntelligencePacket(projectId)) as never;
      }),
    );
  }

  if (plan.sources.projectSnapshot && plan.selectedProjectId) {
    const projectId = plan.selectedProjectId;
    tasks.push(
      time("project_snapshot", async () => {
        result.projectSnapshot = (await deps.loadProjectSnapshot(projectId)) as never;
      }),
    );
  }

  if (plan.sources.semanticVectorSearch) {
    const query = plan.sources.semanticVectorSearch.query;
    tasks.push(
      time("semantic_search", async () => {
        result.semanticVectorResults = (await deps.runSemanticSearch(query)) as never;
      }),
    );
  }

  if (plan.sources.externalSources && plan.sources.externalSources.length > 0) {
    const sources = plan.sources.externalSources;
    const query = ctx?.message ?? "";
    tasks.push(
      time("external_sources", async () => {
        const sourceResults = await Promise.all(
          sources.map(async (src) => {
            const r = await withTimeout(
              deps.runExternalSourceSearch(src, query, plan.selectedProjectId),
              externalTimeout,
              src,
            );
            if (isTimeout(r)) {
              warnings.push({ source: src, message: `timeout after ${externalTimeout}ms` });
              return null;
            }
            return r;
          }),
        );
        result.executiveBriefingRetrieval = {
          sources: sourceResults.filter(Boolean),
        } as never;
      }),
    );
  }

  if (plan.sources.sourceSpecificRag) {
    const kind = plan.sources.sourceSpecificRag.kind;
    const message = ctx?.message ?? "";
    tasks.push(
      time("source_specific_rag", async () => {
        result.sourceSpecificRagAnswer = (await deps.runSourceSpecificRag(kind, message)) as never;
      }),
    );
  }

  if (plan.sources.reusePriorBriefing && ctx?.sessionId) {
    const sessionId = ctx.sessionId;
    tasks.push(
      time("reuse_prior_briefing", async () => {
        const reused = await deps.loadReusableBriefing(sessionId);
        if (reused) {
          result.reusedFromPriorBriefing = true;
          const r = reused as { snapshot?: unknown; executiveRetrieval?: unknown };
          result.projectSnapshot = (r.snapshot ?? null) as never;
          result.executiveBriefingRetrieval = (r.executiveRetrieval ?? null) as never;
        }
      }),
    );
  }

  await Promise.allSettled(tasks);
  return result;
}
