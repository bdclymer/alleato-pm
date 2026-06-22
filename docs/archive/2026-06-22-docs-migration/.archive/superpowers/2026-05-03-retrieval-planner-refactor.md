# Retrieval Planner Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 7 overlapping `if (X)` retrieval branches in `frontend/src/app/api/ai-assistant/chat/route.ts` with a single planner → executor → prompt-assembler pipeline, so the agent fetches only what intent requires and never runs redundant retrieval.

**Architecture:** Three pure functions — `planRetrieval()` outputs a `RetrievalPlan` (what to fetch + which sub-agents to consult + response format), `executeRetrievalPlan()` runs the plan in parallel with per-source timeouts, `assembleSystemPromptFromContext()` builds the final prompt. Rolled out side-by-side behind `USE_RETRIEVAL_PLANNER=true` so the old code path stays as the safety net until evals confirm parity.

**Tech Stack:** TypeScript, Vercel AI SDK v6, Next.js 15 App Router, Vitest (unit tests), existing assistant eval suite (`docs/ai-plan/evals/`).

**Branch:** `refactor/retrieval-planner` (already created)

**Why this matters:** Current chat responses take 30–55 seconds because intent classification is decorative — the actual retrieval decisions are made by overlapping keyword regexes (`shouldForceBusinessRetrieval`) plus separate `if` blocks that all fire additively. A single status question runs the intelligence packet load AND the project briefing snapshot AND four external source searches that all time out for 12 wasted seconds. The planner makes one decision based on intent + context, executes only what's needed, and parallelizes everything that can be parallel.

---

## Phase 1 — Build the new system alongside the existing code

### Task 1: Define `RetrievalPlan` and `RetrievalContext` types

**Files:**
- Create: `frontend/src/lib/ai/retrieval/types.ts`

- [ ] **Step 1: Create the types file**

```ts
import type { AssistantIntent } from "@/lib/ai/intent-router";
import type { SourceSpecificRagKind } from "@/lib/ai/detect-rag-request";
import type { ProjectBriefingSnapshot } from "@/lib/ai/intelligence/project-briefing-snapshot";
import type { ExecutiveBriefingRetrievalPacket } from "@/lib/ai/executive-briefing-retrieval";
import type { ProjectIntelligencePacket } from "@/lib/ai/intelligence/packet-service";
import type { SemanticSearchOutput } from "@/lib/ai/tools/semantic-search-types";

export type ExternalSource = "meetings" | "teams" | "email" | "onedrive";
export type SubAgent = "cfo" | "coo" | "cro" | "chro" | "vpbd";

export type ResponseFormat =
  | "briefing_template"   // 7-section executive PM briefing
  | "conversational"      // natural answer
  | "rfi_preview"         // RFI action card
  | "brandon_daily"       // Brandon's daily executive update widget
  | "source_lookup"       // citation-grounded source answer
  | "source_specific_rag" // single-source RAG answer (Teams, meetings, etc.)
  | "app_help";           // how-to-use-the-app answer

export type RetrievalPlan = {
  intent: AssistantIntent;
  responseFormat: ResponseFormat;
  sources: {
    intelligencePacket?: { mode: "additive" | "replace" };
    projectSnapshot?: { reason: "intent" | "fallback" };
    semanticVectorSearch?: { query: string };
    externalSources?: ExternalSource[];
    sourceSpecificRag?: { kind: SourceSpecificRagKind };
    reusePriorBriefing?: boolean;
    brandonDailyUpdate?: boolean;
  };
  preconsult?: SubAgent[];
  selectedProjectId?: number;
  reason: string;
};

export type RetrievalContext = {
  intelligencePacket?: ProjectIntelligencePacket | null;
  intelligenceTargetSlug?: string;
  projectSnapshot?: ProjectBriefingSnapshot | null;
  semanticVectorResults?: SemanticSearchOutput | null;
  executiveBriefingRetrieval?: ExecutiveBriefingRetrievalPacket | null;
  sourceSpecificRagAnswer?: { content: string; rows: unknown[] } | null;
  brandonDailyUpdatePacket?: unknown;
  reusedFromPriorBriefing?: boolean;
  warnings: Array<{ source: string; message: string }>;
  durationsMs: Record<string, number>;
};
```

- [ ] **Step 2: Verify imports resolve**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep "retrieval/types" || echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/ai/retrieval/types.ts
git commit -m "feat(ai): add RetrievalPlan and RetrievalContext types"
```

---

### Task 2: Build `planRetrieval()` — the single source of truth for what to fetch

**Files:**
- Create: `frontend/src/lib/ai/retrieval/planner.ts`
- Create: `frontend/src/lib/ai/retrieval/__tests__/planner.test.ts`

- [ ] **Step 1: Write the failing tests first**

```ts
// frontend/src/lib/ai/retrieval/__tests__/planner.test.ts
import { describe, it, expect } from "vitest";
import { planRetrieval } from "../planner";

describe("planRetrieval", () => {
  it("status question with selected project → packet + snapshot, no external sources", () => {
    const plan = planRetrieval({
      message: "What's the status of the Vermillion Rise Warehouse project?",
      selectedProjectId: 67,
      messages: [{ role: "user", content: "What's the status of the Vermillion Rise Warehouse project?" } as never],
    });
    expect(plan.responseFormat).toBe("briefing_template");
    expect(plan.sources.intelligencePacket).toBeDefined();
    expect(plan.sources.projectSnapshot).toBeDefined();
    expect(plan.sources.externalSources).toBeUndefined();
  });

  it("source lookup question → source_lookup format with vector search only", () => {
    const plan = planRetrieval({
      message: "Show me the meeting where we discussed the slab pour timeline",
      messages: [{ role: "user", content: "Show me the meeting where we discussed the slab pour timeline" } as never],
    });
    expect(plan.responseFormat).toBe("source_lookup");
    expect(plan.sources.semanticVectorSearch).toBeDefined();
    expect(plan.sources.intelligencePacket).toBeUndefined();
  });

  it("app help question → app_help format with no retrieval", () => {
    const plan = planRetrieval({
      message: "How do I create a change order in the app?",
      messages: [{ role: "user", content: "How do I create a change order in the app?" } as never],
    });
    expect(plan.responseFormat).toBe("app_help");
    expect(Object.keys(plan.sources).length).toBe(0);
  });

  it("brandon daily update request → brandon_daily format", () => {
    const plan = planRetrieval({
      message: "give me the brandon daily update",
      messages: [{ role: "user", content: "give me the brandon daily update" } as never],
    });
    expect(plan.responseFormat).toBe("brandon_daily");
    expect(plan.sources.brandonDailyUpdate).toBe(true);
  });

  it("financial question → conversational + preconsult CFO", () => {
    const plan = planRetrieval({
      message: "What's our exposure on pending change orders across all projects?",
      messages: [{ role: "user", content: "What's our exposure on pending change orders across all projects?" } as never],
    });
    expect(plan.preconsult).toContain("cfo");
  });

  it("follow-up question reuses prior briefing context", () => {
    const plan = planRetrieval({
      message: "what's the source for the slab pour update?",
      messages: [
        { role: "user", content: "give me a briefing on Vermillion Rise" } as never,
        { role: "assistant", content: "**Hard Facts**\n- Project: Vermillion Rise..." } as never,
        { role: "user", content: "what's the source for the slab pour update?" } as never,
      ],
    });
    expect(plan.sources.reusePriorBriefing).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/ai/retrieval/__tests__/planner.test.ts`
Expected: 6 failures, "Cannot find module '../planner'"

- [ ] **Step 3: Implement `planRetrieval()`**

```ts
// frontend/src/lib/ai/retrieval/planner.ts
import type { UIMessage } from "ai";
import {
  classifyAssistantIntent,
  shouldUsePacketFirstIntent,
  type AssistantIntent,
} from "@/lib/ai/intent-router";
import { detectSourceSpecificRagRequest } from "@/lib/ai/detect-rag-request";
import type { RetrievalPlan, ResponseFormat, SubAgent } from "./types";

type PlanInput = {
  message: string;
  selectedProjectId?: number;
  messages: UIMessage[];
};

const FOLLOWUP_PHRASES = [
  /\b(source|cite|citation|evidence)\b/i,
  /\b(why|how come|why did)\b/i,
  /\b(more detail|elaborate|expand)\b/i,
];

const FINANCIAL_KEYWORDS = /\b(budget|cost|margin|invoice|payment|exposure|cash|retention|forecast)\b/i;
const PEOPLE_KEYWORDS = /\b(who|stretched|capacity|staffing|on the team|assigned)\b/i;
const RISK_KEYWORDS = /\b(risk|worried|blocker|delay|issue|exposure)\b/i;
const BD_KEYWORDS = /\b(pipeline|new business|win rate|hit rate|lead|opportunity)\b/i;

function detectPreconsult(message: string): SubAgent[] {
  const agents: SubAgent[] = [];
  if (FINANCIAL_KEYWORDS.test(message)) agents.push("cfo");
  if (PEOPLE_KEYWORDS.test(message)) agents.push("chro");
  if (RISK_KEYWORDS.test(message)) agents.push("coo");
  if (BD_KEYWORDS.test(message)) agents.push("vpbd");
  return agents;
}

function isFollowUp(messages: UIMessage[]): boolean {
  if (messages.length < 3) return false;
  const last = messages[messages.length - 1];
  const lastText = typeof last.content === "string" ? last.content : "";
  return FOLLOWUP_PHRASES.some((re) => re.test(lastText));
}

function isBrandonDaily(message: string): boolean {
  return /brandon.{0,12}(daily|update|brief)/i.test(message);
}

export function planRetrieval(input: PlanInput): RetrievalPlan {
  const { message, selectedProjectId, messages } = input;
  const intent = classifyAssistantIntent(message);
  const sourceSpecific = detectSourceSpecificRagRequest(message);

  // 1. Brandon's daily — highest priority deterministic widget
  if (isBrandonDaily(message)) {
    return {
      intent,
      responseFormat: "brandon_daily",
      sources: { brandonDailyUpdate: true },
      reason: "brandon_daily_keyword",
    };
  }

  // 2. App-help — no retrieval needed
  if (intent === "app_help") {
    return {
      intent,
      responseFormat: "app_help",
      sources: {},
      reason: "app_help_intent",
    };
  }

  // 3. Source-specific RAG (Teams, meetings, email, etc.)
  if (sourceSpecific) {
    return {
      intent,
      responseFormat: "source_specific_rag",
      sources: { sourceSpecificRag: { kind: sourceSpecific.kind } },
      reason: `source_specific_rag_${sourceSpecific.kind}`,
    };
  }

  // 4. Source-lookup intent
  if (intent === "source_lookup") {
    return {
      intent,
      responseFormat: "source_lookup",
      sources: { semanticVectorSearch: { query: message } },
      reason: "source_lookup_intent",
    };
  }

  // 5. Follow-up to a prior briefing — reuse context
  if (isFollowUp(messages)) {
    return {
      intent,
      responseFormat: "conversational",
      sources: { reusePriorBriefing: true },
      preconsult: detectPreconsult(message),
      selectedProjectId,
      reason: "followup_to_prior_briefing",
    };
  }

  // 6. Packet-first intents (status, briefing, financial, change mgmt, etc.)
  if (shouldUsePacketFirstIntent(intent) && selectedProjectId) {
    return {
      intent,
      responseFormat: "briefing_template",
      sources: {
        intelligencePacket: { mode: "additive" },
        projectSnapshot: { reason: "intent" },
        semanticVectorSearch: { query: message },
      },
      preconsult: detectPreconsult(message),
      selectedProjectId,
      reason: "packet_first_with_project",
    };
  }

  // 7. Default conversational — let model call tools as needed
  return {
    intent,
    responseFormat: "conversational",
    sources: {},
    preconsult: detectPreconsult(message),
    selectedProjectId,
    reason: "conversational_fallback",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/ai/retrieval/__tests__/planner.test.ts`
Expected: 6 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ai/retrieval/planner.ts frontend/src/lib/ai/retrieval/__tests__/planner.test.ts
git commit -m "feat(ai): add planRetrieval() — single-decision retrieval planner"
```

---

### Task 3: Build `executeRetrievalPlan()` — parallel executor with per-source timeouts

**Files:**
- Create: `frontend/src/lib/ai/retrieval/executor.ts`
- Create: `frontend/src/lib/ai/retrieval/__tests__/executor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/ai/retrieval/__tests__/executor.test.ts
import { describe, it, expect, vi } from "vitest";
import { executeRetrievalPlan } from "../executor";
import type { RetrievalPlan } from "../types";

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
    // Two 200ms sources running in parallel should take ~200ms, not 400ms
    expect(elapsed).toBeLessThan(380);
    expect(ctx.intelligencePacket).toBeDefined();
    expect(ctx.projectSnapshot).toBeDefined();
  });

  it("captures warnings instead of throwing when a source times out", async () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: { externalSources: ["meetings", "teams", "email", "onedrive"] },
      selectedProjectId: 67,
      reason: "test",
    };
    const ctx = await executeRetrievalPlan(plan, makeStubDeps({ externalSourceHangsMs: 10000, externalTimeoutMs: 100 }));
    expect(ctx.warnings.length).toBe(4);
    expect(ctx.warnings[0].message).toMatch(/timeout/i);
  });
});

function makeStubDeps(opts: { delayEachMs?: number; externalSourceHangsMs?: number; externalTimeoutMs?: number } = {}) {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  return {
    loadIntelligencePacket: vi.fn(async () => { await delay(opts.delayEachMs ?? 0); return { id: "p1", cards: [], freshnessStatus: "fresh" } as never; }),
    loadProjectSnapshot: vi.fn(async () => { await delay(opts.delayEachMs ?? 0); return { sourceRef: "snap" } as never; }),
    runSemanticSearch: vi.fn(async () => ({ results: [] } as never)),
    runExternalSourceSearch: vi.fn(async () => { await delay(opts.externalSourceHangsMs ?? 0); return { source: "x", status: "ok", results: [] } as never; }),
    loadReusableBriefing: vi.fn(async () => null as never),
    runSourceSpecificRag: vi.fn(async () => null as never),
    buildBrandonDaily: vi.fn(async () => ({ packet: {} } as never)),
    externalTimeoutMs: opts.externalTimeoutMs ?? 3000,
  };
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/ai/retrieval/__tests__/executor.test.ts`
Expected: 3 failures, "Cannot find module '../executor'"

- [ ] **Step 3: Implement `executeRetrievalPlan()`**

```ts
// frontend/src/lib/ai/retrieval/executor.ts
import type { RetrievalPlan, RetrievalContext, ExternalSource } from "./types";

export type ExecutorDeps = {
  loadIntelligencePacket: (projectId: number) => Promise<unknown>;
  loadProjectSnapshot: (projectId: number) => Promise<unknown>;
  runSemanticSearch: (query: string) => Promise<unknown>;
  runExternalSourceSearch: (source: ExternalSource, query: string, projectId?: number) => Promise<unknown>;
  loadReusableBriefing: (sessionId: string) => Promise<unknown>;
  runSourceSpecificRag: (kind: string, message: string) => Promise<unknown>;
  buildBrandonDaily: () => Promise<unknown>;
  externalTimeoutMs?: number;
};

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | { __timeout: true; label: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ __timeout: true, label }), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }).catch((e) => { clearTimeout(timer); resolve({ __timeout: true, label: `${label}: ${(e as Error).message}` }); });
  });
}

function isTimeout(value: unknown): value is { __timeout: true; label: string } {
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
    try { return await fn(); } finally { durations[label] = Date.now() - start; }
  };

  if (plan.sources.brandonDailyUpdate) {
    tasks.push(time("brandon_daily", async () => {
      result.brandonDailyUpdatePacket = await deps.buildBrandonDaily();
    }));
  }

  if (plan.sources.intelligencePacket && plan.selectedProjectId) {
    tasks.push(time("intelligence_packet", async () => {
      result.intelligencePacket = (await deps.loadIntelligencePacket(plan.selectedProjectId!)) as never;
    }));
  }

  if (plan.sources.projectSnapshot && plan.selectedProjectId) {
    tasks.push(time("project_snapshot", async () => {
      result.projectSnapshot = (await deps.loadProjectSnapshot(plan.selectedProjectId!)) as never;
    }));
  }

  if (plan.sources.semanticVectorSearch) {
    tasks.push(time("semantic_search", async () => {
      result.semanticVectorResults = (await deps.runSemanticSearch(plan.sources.semanticVectorSearch!.query)) as never;
    }));
  }

  if (plan.sources.externalSources && plan.sources.externalSources.length > 0) {
    const query = ctx?.message ?? "";
    tasks.push(time("external_sources", async () => {
      const sourceResults = await Promise.all(
        plan.sources.externalSources!.map(async (src) => {
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
      result.executiveBriefingRetrieval = { sources: sourceResults.filter(Boolean) } as never;
    }));
  }

  if (plan.sources.sourceSpecificRag) {
    tasks.push(time("source_specific_rag", async () => {
      result.sourceSpecificRagAnswer = (await deps.runSourceSpecificRag(plan.sources.sourceSpecificRag!.kind, ctx?.message ?? "")) as never;
    }));
  }

  if (plan.sources.reusePriorBriefing && ctx?.sessionId) {
    tasks.push(time("reuse_prior_briefing", async () => {
      const reused = await deps.loadReusableBriefing(ctx.sessionId!);
      if (reused) {
        result.reusedFromPriorBriefing = true;
        const r = reused as { snapshot?: unknown; executiveRetrieval?: unknown };
        result.projectSnapshot = (r.snapshot ?? null) as never;
        result.executiveBriefingRetrieval = (r.executiveRetrieval ?? null) as never;
      }
    }));
  }

  await Promise.allSettled(tasks);
  return result;
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/ai/retrieval/__tests__/executor.test.ts`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ai/retrieval/executor.ts frontend/src/lib/ai/retrieval/__tests__/executor.test.ts
git commit -m "feat(ai): add executeRetrievalPlan() — parallel executor with per-source timeouts"
```

---

### Task 4: Build `assembleSystemPromptFromContext()` — assembles final system prompt from plan + context

**Files:**
- Create: `frontend/src/lib/ai/retrieval/system-prompt.ts`
- Create: `frontend/src/lib/ai/retrieval/__tests__/system-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { assembleSystemPromptFromContext } from "../system-prompt";
import type { RetrievalPlan, RetrievalContext } from "../types";

describe("assembleSystemPromptFromContext", () => {
  it("includes only sections for sources that returned data", () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: { intelligencePacket: { mode: "additive" } },
      reason: "test",
    };
    const ctx: RetrievalContext = {
      intelligencePacket: { id: "p1", cards: [{ title: "Risks" }] } as never,
      warnings: [],
      durationsMs: {},
    };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE_PROMPT");
    expect(prompt).toContain("Current Project Intelligence Packet");
    expect(prompt).toContain("BASE_PROMPT");
    expect(prompt).not.toContain("Project Briefing Snapshot");
  });

  it("includes warnings list when sources timed out", () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: { externalSources: ["meetings", "teams"] },
      reason: "test",
    };
    const ctx: RetrievalContext = {
      warnings: [
        { source: "meetings", message: "timeout after 3000ms" },
        { source: "teams", message: "timeout after 3000ms" },
      ],
      durationsMs: {},
    };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE");
    expect(prompt).toMatch(/sources unavailable/i);
    expect(prompt).toContain("meetings");
    expect(prompt).toContain("teams");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/ai/retrieval/__tests__/system-prompt.test.ts`
Expected: 2 failures

- [ ] **Step 3: Implement assembler**

```ts
// frontend/src/lib/ai/retrieval/system-prompt.ts
import type { RetrievalPlan, RetrievalContext } from "./types";

export function assembleSystemPromptFromContext(
  plan: RetrievalPlan,
  ctx: RetrievalContext,
  basePrompt: string,
): string {
  const parts: string[] = [];

  if (ctx.intelligencePacket) {
    parts.push(
      `# Current Project Intelligence Packet\n\nA pre-rendered intelligence packet is available below. Use it as your primary evidence. Layer your own analysis, recommendations, and follow-up questions on top.\n\n${JSON.stringify(ctx.intelligencePacket, null, 2)}`,
    );
  }

  if (ctx.projectSnapshot) {
    parts.push(`# Project Briefing Snapshot\n\n${JSON.stringify(ctx.projectSnapshot, null, 2)}`);
  }

  if (ctx.semanticVectorResults) {
    parts.push(`# Vector Search Results\n\n${JSON.stringify(ctx.semanticVectorResults, null, 2)}`);
  }

  if (ctx.executiveBriefingRetrieval) {
    parts.push(`# Recent Communication Signals\n\n${JSON.stringify(ctx.executiveBriefingRetrieval, null, 2)}`);
  }

  if (ctx.sourceSpecificRagAnswer) {
    parts.push(`# Source-Specific RAG Result\n\n${ctx.sourceSpecificRagAnswer.content}`);
  }

  if (ctx.warnings.length > 0) {
    const lines = ctx.warnings.map((w) => `- ${w.source}: ${w.message}`).join("\n");
    parts.push(`# Sources Unavailable\nThe following sources were attempted and did not return in time. Acknowledge this gap in your answer and proceed with what you have.\n${lines}`);
  }

  if (parts.length === 0) {
    return basePrompt;
  }

  return `${parts.join("\n\n---\n\n")}\n\n---\n\n${basePrompt}`;
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/lib/ai/retrieval/__tests__/system-prompt.test.ts`
Expected: 2 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ai/retrieval/system-prompt.ts frontend/src/lib/ai/retrieval/__tests__/system-prompt.test.ts
git commit -m "feat(ai): add assembleSystemPromptFromContext() — single-source-of-truth prompt assembly"
```

---

### Task 5: Wire dependencies — adapter functions that bridge new executor to existing services

**Files:**
- Create: `frontend/src/lib/ai/retrieval/deps.ts`

- [ ] **Step 1: Create the deps adapter**

This file maps the executor's `ExecutorDeps` interface to the existing service functions in the codebase, so we don't duplicate the loaders.

```ts
// frontend/src/lib/ai/retrieval/deps.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveIntelligenceTarget, loadCurrentIntelligencePacket } from "@/lib/ai/intelligence/packet-service";
import { loadProjectBriefingSnapshot } from "@/lib/ai/intelligence/project-briefing-snapshot";
import { runSemanticSearch as runSemanticSearchTool } from "@/lib/ai/tools/semantic-search-impl";
import { runExternalSourceSearch as runExternalSourceSearchImpl } from "@/lib/ai/executive-briefing-retrieval";
import { generateBrandonDailyUpdate } from "@/lib/executive/brandon-daily-update";
import { loadReusableBriefingContext } from "./reusable-briefing-loader"; // extracted from chat/route.ts
import type { ExecutorDeps } from "./executor";

export function buildExecutorDeps(opts: { supabase: SupabaseClient; userId: string }): ExecutorDeps {
  return {
    loadIntelligencePacket: async (projectId: number) => {
      const target = await resolveIntelligenceTarget({ query: String(projectId), selectedProjectId: projectId, supabase: opts.supabase });
      if (!target) return null;
      return loadCurrentIntelligencePacket({ targetId: target.id, supabase: opts.supabase });
    },
    loadProjectSnapshot: (projectId) => loadProjectBriefingSnapshot({ projectId, supabase: opts.supabase, userId: opts.userId }),
    runSemanticSearch: (query) => runSemanticSearchTool({ query, userId: opts.userId }),
    runExternalSourceSearch: (source, query, projectId) => runExternalSourceSearchImpl({ source, query, projectId, supabase: opts.supabase }),
    loadReusableBriefing: (sessionId) => loadReusableBriefingContext({ supabase: opts.supabase, sessionId, projectName: undefined }),
    runSourceSpecificRag: () => Promise.resolve(null), // wired in Task 6
    buildBrandonDaily: () => generateBrandonDailyUpdate({ windowDays: 2 }),
    externalTimeoutMs: 3000,
  };
}
```

- [ ] **Step 2: Verify imports compile**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep "retrieval/deps" | head`
Expected: empty (or only errors about not-yet-extracted symbols which we'll fix in next task)

- [ ] **Step 3: Extract `loadReusableBriefingContext` and `runSemanticSearchTool` from chat/route.ts**

These are currently inline in `chat/route.ts`. Move each to its own file under `frontend/src/lib/ai/retrieval/` so they can be imported by both the new executor and the old route during the side-by-side period.

For each: copy the function, update its imports, re-export from old location for backwards compatibility.

- [ ] **Step 4: Verify both old and new code paths still compile**

Run: `cd frontend && npm run typecheck`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/ai/retrieval/deps.ts frontend/src/lib/ai/retrieval/reusable-briefing-loader.ts frontend/src/lib/ai/retrieval/semantic-search-impl.ts frontend/src/app/api/ai-assistant/chat/route.ts
git commit -m "feat(ai): extract reusable retrieval deps for new planner pipeline"
```

---

### Task 6: Build the new chat handler — uses planner pipeline, lives behind env flag

**Files:**
- Create: `frontend/src/app/api/ai-assistant/chat/handler-v2.ts`
- Modify: `frontend/src/app/api/ai-assistant/chat/route.ts` (add env flag dispatch at top of POST)

- [ ] **Step 1: Implement `handleChatV2`**

This is the new handler. It:
1. Calls `planRetrieval()` with the message + history
2. Calls `executeRetrievalPlan()` with the plan
3. Calls `assembleSystemPromptFromContext()` to build the final prompt
4. Calls `streamText()` with the assembled prompt + the strategist tools
5. Streams `data-status` events from the executor's `durationsMs` so the UI shows real progress

Skeleton (full version is ~250 lines; expand inline during execution):

```ts
// frontend/src/app/api/ai-assistant/chat/handler-v2.ts
import { streamText, stepCountIs, createUIMessageStream, createUIMessageStreamResponse, convertToModelMessages, type UIMessage } from "ai";
import { planRetrieval } from "@/lib/ai/retrieval/planner";
import { executeRetrievalPlan } from "@/lib/ai/retrieval/executor";
import { assembleSystemPromptFromContext } from "@/lib/ai/retrieval/system-prompt";
import { buildExecutorDeps } from "@/lib/ai/retrieval/deps";
import { assembleSystemPrompt } from "@/lib/ai/bot-core";
import { createStrategistTools } from "@/lib/ai/orchestrator";
import { getLanguageModel } from "@/lib/ai/providers";

export async function handleChatV2(opts: {
  user: { id: string };
  sessionId: string;
  messages: UIMessage[];
  selectedProjectId?: number;
  activeModel: string;
  supabase: import("@supabase/supabase-js").SupabaseClient;
}) {
  const lastUserMessage = [...opts.messages].reverse().find((m) => m.role === "user");
  const lastUserContent = lastUserMessage ? extractTextFromParts(lastUserMessage.parts) : "";

  const plan = planRetrieval({ message: lastUserContent, selectedProjectId: opts.selectedProjectId, messages: opts.messages });

  const stream = createUIMessageStream({
    originalMessages: opts.messages,
    execute: async ({ writer }) => {
      writer.write({ type: "data-status", id: "strategist-status", data: { stage: "planning", message: `Plan: ${plan.reason}`, status: "loading", timestamp: new Date().toISOString() } });

      const [baseSystemPrompt, retrievalCtx] = await Promise.all([
        assembleSystemPrompt({ userId: opts.user.id, messageText: lastUserContent, selectedProjectId: opts.selectedProjectId, sessionId: opts.sessionId, isFirstTurn: opts.messages.length === 1 }),
        executeRetrievalPlan(plan, buildExecutorDeps({ supabase: opts.supabase, userId: opts.user.id }), { sessionId: opts.sessionId, message: lastUserContent }),
      ]);

      writer.write({ type: "data-status", id: "strategist-status", data: { stage: "retrieval-complete", message: `Retrieved in ${Math.max(...Object.values(retrievalCtx.durationsMs))}ms`, status: "success", durations: retrievalCtx.durationsMs, timestamp: new Date().toISOString() } });

      const systemPrompt = assembleSystemPromptFromContext(plan, retrievalCtx, baseSystemPrompt);

      const tools = createStrategistTools(opts.user.id, { pinnedProjectId: opts.selectedProjectId });

      const result = streamText({
        model: getLanguageModel(opts.activeModel),
        system: systemPrompt,
        messages: await convertToModelMessages(opts.messages),
        tools,
        maxOutputTokens: 1500,
        stopWhen: stepCountIs(10),
      });

      writer.merge(result.toUIMessageStream({ originalMessages: opts.messages }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function extractTextFromParts(parts: UIMessage["parts"]): string { /* copy from route.ts */ return ""; }
```

- [ ] **Step 2: Add env-flag dispatch to existing route**

In `frontend/src/app/api/ai-assistant/chat/route.ts`, at the top of the POST handler (after auth + body parse), add:

```ts
if (process.env.USE_RETRIEVAL_PLANNER === "true") {
  return handleChatV2({ user, sessionId, messages, selectedProjectId, activeModel, supabase });
}
```

- [ ] **Step 3: Set env flag in `.env.local` and restart dev**

```bash
echo "USE_RETRIEVAL_PLANNER=true" >> /Users/meganharrison/Documents/alleato-pm/frontend/.env.local
```

Then restart the dev server.

- [ ] **Step 4: Send the same status question and time it**

In preview: send "What's the status of the Vermillion Rise Warehouse project?" and capture `POST /api/ai-assistant/chat ... in {N}ms` from the server log.

Expected: under 25s (down from 44s).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/api/ai-assistant/chat/handler-v2.ts frontend/src/app/api/ai-assistant/chat/route.ts
git commit -m "feat(ai): add handler-v2 behind USE_RETRIEVAL_PLANNER flag"
```

---

## Phase 2 — Verify

### Task 7: Run the eval suite against both paths

**Files:**
- Modify: `frontend/scripts/run-evals.ts` (or whatever the eval entry point is — locate first)

- [ ] **Step 1: Locate the eval suite**

```bash
find /Users/meganharrison/Documents/alleato-pm -path "*/evals/*" -name "*.ts" -not -path "*/node_modules/*" | head -20
```

If no runnable eval suite exists yet, fall back to a smaller verification set: 10 representative messages from `docs/ai-plan/evals/EVAL-SUITE-FIRST-RUN-FINDINGS-2026-05-02.md`.

- [ ] **Step 2: Run evals with old path (USE_RETRIEVAL_PLANNER=false), capture baseline**

Save output to `verify-output/evals-old.json` (gitignored).

- [ ] **Step 3: Run evals with new path (USE_RETRIEVAL_PLANNER=true), capture comparison**

Save output to `verify-output/evals-new.json`.

- [ ] **Step 4: Compare**

Generate a diff report showing per-question:
- Old latency vs new latency
- Old answer vs new answer
- Citations present in both

Expected criteria for cutover:
- Median latency: new ≤ 60% of old
- p95 latency: new ≤ 70% of old
- No question answered correctly by old that fails on new

- [ ] **Step 5: Commit the comparison report**

```bash
git add docs/ai-plan/evals/2026-05-03-retrieval-planner-comparison.md
git commit -m "docs(ai): retrieval planner eval comparison — old vs new"
```

---

### Task 8: A/B verification in preview

**Files:** None — this is a verification task.

- [ ] **Step 1: With `USE_RETRIEVAL_PLANNER=true`, send these 5 messages in preview and time each:**

1. "What's the status of the Vermillion Rise Warehouse project?"
2. "What's our exposure on pending change orders?"
3. "Show me the meeting where we discussed the slab pour timeline"
4. "How do I create a change order in the app?"
5. "Give me Brandon's daily update"

Record total response time + which retrieval sources fired (from `data-status` events).

- [ ] **Step 2: With `USE_RETRIEVAL_PLANNER=false`, send the same 5 messages and time them**

- [ ] **Step 3: Document results inline as a comment in this plan, then proceed only if all 5 are within tolerance**

---

## Phase 3 — Cut over and clean up

### Task 9: Flip default to new path

**Files:**
- Modify: `frontend/src/app/api/ai-assistant/chat/route.ts`

- [ ] **Step 1: Invert the env flag default**

Change the gate from `if (process.env.USE_RETRIEVAL_PLANNER === "true")` to `if (process.env.USE_RETRIEVAL_PLANNER !== "false")`. This makes the new path the default; the old path remains accessible only by explicit opt-out.

- [ ] **Step 2: Deploy preview, run smoke test**

In preview, send 3 of the messages from Task 8 with no env flag set. Confirm new path runs.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(ai): make retrieval planner the default chat path"
```

---

### Task 10: Delete the old branching code

**Files:**
- Modify: `frontend/src/app/api/ai-assistant/chat/route.ts`

This is the cleanup pass. After at least 48 hours running on the new path with no incidents, delete the old code.

- [ ] **Step 1: Delete the 7 `if` branches**

Remove these blocks from `route.ts`:
- The `brandonDailyUpdateWidgetRequest` block (~lines 2705–2792)
- The `sourceSpecificRagRequest` block (~2793–2862)
- The `assistantIntent === "source_lookup"` block (~2863–2983)
- The `isRfiActionRequest` block (~2984–3134)
- The `shouldUsePacketFirstIntent(assistantIntent)` block (~3135–3207)
- The `forceBusinessRetrieval` block (~3208–3653)
- The streamText fallback at the bottom (~3654–3955)

All of this is replaced by `handleChatV2`.

- [ ] **Step 2: Delete `shouldForceBusinessRetrieval` regex helper**

Remove function at `chat/route.ts:1545`. Also remove its callsites and the `forceBusinessRetrieval` variable.

- [ ] **Step 3: Delete the env flag**

Remove the env-flag dispatch entirely. `handleChatV2` becomes the only handler.

- [ ] **Step 4: Delete unused helpers**

After Phase 3 cleanup, run a dead-code grep to find helpers that no longer have callers and remove them.

```bash
cd frontend && npx ts-prune | grep "ai-assistant/chat/route"
```

- [ ] **Step 5: Verify file size**

```bash
wc -l frontend/src/app/api/ai-assistant/chat/route.ts
```

Expected: ≤ 1,200 lines (down from 3,955).

- [ ] **Step 6: Run full typecheck and tests**

```bash
cd frontend && npm run typecheck && npx vitest run
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git commit -am "refactor(ai): remove legacy retrieval branching from chat route"
```

---

### Task 11: Remove `USE_RETRIEVAL_PLANNER` env flag from `.env.local`

- [ ] **Step 1: Strip the flag**

```bash
sed -i.bak '/USE_RETRIEVAL_PLANNER/d' /Users/meganharrison/Documents/alleato-pm/frontend/.env.local
```

- [ ] **Step 2: Confirm it's gone**

```bash
grep USE_RETRIEVAL_PLANNER /Users/meganharrison/Documents/alleato-pm/frontend/.env.local || echo CLEAN
```

Expected: `CLEAN`

- [ ] **Step 3: Update PR description / changelog**

Note the env flag is no longer needed.

---

## Self-review checklist (run before merging)

- [ ] All 6 planner tests pass
- [ ] All 3 executor tests pass
- [ ] All 2 system-prompt tests pass
- [ ] Eval suite shows ≥ 40% latency reduction at p50
- [ ] No question regresses on factual accuracy
- [ ] `chat/route.ts` is ≤ 1,200 lines
- [ ] `shouldForceBusinessRetrieval` regex helper is deleted
- [ ] No callsites reference the deleted `if` branches
- [ ] Typecheck clean, lint clean

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Planner misroutes a question that the old keyword regex handled correctly | Eval suite in Task 7 catches this. If found, add a regression test + fix planner. |
| External-source timeout (3s) is too aggressive — drops legitimate slow queries | Make timeout configurable per source via env; start at 3s and tune from eval results. |
| Sub-agent preconsult adds latency we didn't have before | Preconsult is OFF by default in the planner — only enabled when financial/people/risk/BD keywords are detected. The model can still call sub-agents during streamText if it needs to. |
| Reusable-briefing follow-up detection is too eager and reuses stale context | Test in Task 1 covers this; existing `briefingContextMatchesProject` guard remains in place. |
