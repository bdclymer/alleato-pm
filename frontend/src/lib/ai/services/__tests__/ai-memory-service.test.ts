jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
  createRagServiceClient: jest.fn(),
}));

jest.mock("@/lib/ai/provider-config", () => ({
  getOpenAICompatibleClientConfig: jest.fn(() => ({ apiKey: "test-key" })),
  getOpenAIModelId: jest.fn((modelId: string) => modelId),
}));

jest.mock("@/lib/ai/insight-cards", () => ({
  resolveTargetIdsForProjects: jest.fn(),
}));

import {
  buildMemoryContextPayload,
  rankMemoriesForRecall,
  scoreMemoryForRecall,
  type AiMemory,
} from "../ai-memory-service";

function memory(overrides: Partial<AiMemory>): AiMemory {
  return {
    id: overrides.id ?? "memory-1",
    type: overrides.type ?? "fact",
    content: overrides.content ?? "Default memory",
    confidence: overrides.confidence ?? 0.9,
    importance: overrides.importance ?? 0.5,
    project_id: overrides.project_id ?? null,
    meeting_id: overrides.meeting_id ?? null,
    source: overrides.source ?? "conversation",
    visibility: overrides.visibility ?? "private",
    created_at: overrides.created_at ?? "2026-05-18T12:00:00.000Z",
    similarity: overrides.similarity,
  };
}

describe("AI memory recall ranking", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-19T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("weights recency ahead of semantic similarity for default recall", () => {
    const freshMemory = memory({
      id: "fresh",
      content: "Fresh source-quality rule",
      created_at: "2026-05-18T12:00:00.000Z",
      similarity: 0.55,
      importance: 0.4,
    });
    const staleMemory = memory({
      id: "stale",
      content: "Older but semantically similar rule",
      created_at: "2026-01-01T12:00:00.000Z",
      similarity: 0.95,
      importance: 1,
    });

    expect(rankMemoriesForRecall([staleMemory, freshMemory])[0].id).toBe("fresh");
  });

  it("boosts selected-project memories and explains the ranking inputs", () => {
    const selectedProjectMemory = memory({
      id: "selected-project",
      project_id: 983,
      created_at: "2026-05-10T12:00:00.000Z",
      similarity: 0.6,
    });
    const otherProjectMemory = memory({
      id: "other-project",
      project_id: 42,
      created_at: "2026-05-10T12:00:00.000Z",
      similarity: 0.6,
    });

    const ranked = rankMemoriesForRecall(
      [otherProjectMemory, selectedProjectMemory],
      { projectId: 983 },
    );

    expect(ranked[0].id).toBe("selected-project");
    expect(ranked[0].ranking_reason).toContain("project=selected");
    expect(scoreMemoryForRecall(selectedProjectMemory, { projectId: 983 }).reason).toContain(
      "freshness=",
    );
  });

  it("exposes selected memory ranking metadata for the debugger payload", () => {
    const payload = buildMemoryContextPayload(
      [],
      [
        memory({
          id: "project-fact",
          project_id: 983,
          content: "Ulta Fresno owner updates should prioritize meeting transcripts.",
          created_at: "2026-05-18T12:00:00.000Z",
          similarity: 0.72,
        }),
      ],
      [],
      { projectId: 983 },
    );

    expect(payload.block).toContain("Ulta Fresno owner updates");
    expect(payload.selected[0]).toMatchObject({
      id: "project-fact",
      ranking_reason: expect.stringContaining("project=selected"),
    });
    expect(payload.selected[0].ranking_score).toBeGreaterThan(0);
  });
});
