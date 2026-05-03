// frontend/src/lib/ai/retrieval/__tests__/executor.test.ts
import { executeRetrievalPlan, type ExecutorDeps } from "../executor";
import type { RetrievalPlan } from "../types";

function makeStubDeps(opts: {
  delayEachMs?: number;
  externalSourceHangsMs?: number;
  externalTimeoutMs?: number;
} = {}): ExecutorDeps {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  return {
    loadIntelligencePacket: jest.fn(async () => {
      await delay(opts.delayEachMs ?? 0);
      return { id: "p1", cards: [], freshnessStatus: "fresh" } as never;
    }),
    loadProjectSnapshot: jest.fn(async () => {
      await delay(opts.delayEachMs ?? 0);
      return { sourceRef: "snap" } as never;
    }),
    runSemanticSearch: jest.fn(async () => ({ results: [] } as never)),
    runExternalSourceSearch: jest.fn(async () => {
      await delay(opts.externalSourceHangsMs ?? 0);
      return { source: "x", status: "ok", results: [] } as never;
    }),
    loadReusableBriefing: jest.fn(async () => null as never),
    runSourceSpecificRag: jest.fn(async () => null as never),
    buildBrandonDaily: jest.fn(async () => ({ packet: {} } as never)),
    externalTimeoutMs: opts.externalTimeoutMs ?? 3000,
  };
}

describe("executeRetrievalPlan", () => {
  it("runs only sources requested in plan", async () => {
    const plan: RetrievalPlan = {
      intent: "app_help",
      responseFormat: "app_help",
      sources: {},
      reason: "test",
    };
    const ctx = await executeRetrievalPlan(plan, makeStubDeps());
    expect(ctx.intelligencePacket).toBeUndefined();
    expect(ctx.projectSnapshot).toBeUndefined();
    expect(ctx.semanticVectorResults).toBeUndefined();
    expect(ctx.warnings).toEqual([]);
  });

  it("runs requested sources in parallel", async () => {
    const start = Date.now();
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: {
        intelligencePacket: { mode: "additive" },
        projectSnapshot: { reason: "intent" },
      },
      selectedProjectId: 67,
      reason: "test",
    };
    const ctx = await executeRetrievalPlan(plan, makeStubDeps({ delayEachMs: 200 }));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(380); // parallel ~200ms, not sequential 400ms
    expect(ctx.intelligencePacket).toBeDefined();
    expect(ctx.projectSnapshot).toBeDefined();
  });

  it("captures warnings instead of throwing when an external source times out", async () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: { externalSources: ["meetings", "teams", "email", "onedrive"] },
      selectedProjectId: 67,
      reason: "test",
    };
    const ctx = await executeRetrievalPlan(
      plan,
      makeStubDeps({ externalSourceHangsMs: 10000, externalTimeoutMs: 100 }),
      { sessionId: "s1", message: "test query" },
    );
    expect(ctx.warnings.length).toBe(4);
    expect(ctx.warnings[0].message).toMatch(/timeout/i);
    expect(ctx.warnings.map((w) => w.source).sort()).toEqual(["email", "meetings", "onedrive", "teams"]);
  });

  it("records durations for each source executed", async () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: {
        intelligencePacket: { mode: "additive" },
        semanticVectorSearch: { query: "test" },
      },
      selectedProjectId: 67,
      reason: "test",
    };
    const ctx = await executeRetrievalPlan(plan, makeStubDeps({ delayEachMs: 50 }));
    expect(typeof ctx.durationsMs.intelligence_packet).toBe("number");
    expect(typeof ctx.durationsMs.semantic_search).toBe("number");
    expect(ctx.durationsMs.intelligence_packet).toBeGreaterThanOrEqual(40);
  });
});
