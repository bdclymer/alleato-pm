// frontend/src/lib/ai/retrieval/__tests__/system-prompt.test.ts
import { assembleSystemPromptFromContext } from "../system-prompt";
import type { RetrievalPlan, RetrievalContext } from "../types";

describe("assembleSystemPromptFromContext", () => {
  it("returns base prompt unchanged when nothing was retrieved", () => {
    const plan: RetrievalPlan = {
      intent: "app_help",
      responseFormat: "app_help",
      sources: {},
      reason: "test",
    };
    const ctx: RetrievalContext = { warnings: [], durationsMs: {} };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE_PROMPT");
    expect(prompt).toBe("BASE_PROMPT");
  });

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
    expect(prompt).not.toContain("Vector Search Results");
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
    expect(prompt).toContain("BASE");
  });

  it("orders sections deterministically: packet → snapshot → vector → briefing → rag → warnings → BASE", () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: {
        intelligencePacket: { mode: "additive" },
        projectSnapshot: { reason: "intent" },
        semanticVectorSearch: { query: "x" },
      },
      reason: "test",
    };
    const ctx: RetrievalContext = {
      intelligencePacket: { id: "p1" } as never,
      projectSnapshot: { sourceRef: "snap" } as never,
      semanticVectorResults: { results: [] } as never,
      warnings: [{ source: "meetings", message: "timeout" }],
      durationsMs: {},
    };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE");

    const idxPacket = prompt.indexOf("Current Project Intelligence Packet");
    const idxSnapshot = prompt.indexOf("Project Briefing Snapshot");
    const idxVector = prompt.indexOf("Vector Search Results");
    const idxWarnings = prompt.indexOf("Sources Unavailable");
    const idxBase = prompt.indexOf("BASE");

    expect(idxPacket).toBeGreaterThan(-1);
    expect(idxSnapshot).toBeGreaterThan(idxPacket);
    expect(idxVector).toBeGreaterThan(idxSnapshot);
    expect(idxWarnings).toBeGreaterThan(idxVector);
    expect(idxBase).toBeGreaterThan(idxWarnings);
  });
});
