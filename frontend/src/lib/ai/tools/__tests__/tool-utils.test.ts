/**
 * Regression tests for tool-utils.ts shared infrastructure.
 *
 * Covers:
 * - getOpenAI(): AI Gateway vs OPENAI_API_KEY fallback (HIGH-1 from PR #292 review)
 * - withWriteTrace(): must re-throw — not swallow — errors (HIGH-2 from PR #292 review)
 * - withTrace(): must return structured {error} instead of re-throwing
 * - asNumber(): edge-case coverage for budget total calculations
 * - isBriefingQuery(): PM briefing intent detection (#294 regression)
 * - rankBriefingSourcePriority(): source ranking correctness (#294 regression)
 * - isMissingBudgetViewError(): budget view error detection (#294 regression)
 *
 * @see CLAUDE.md Rules 14 & 15 — Bug Fix Completion Gate + Regression Test Gate
 * @see frontend/src/lib/ai/tools/tool-utils.ts
 */

import OpenAI from "openai";
import { withTrace, withWriteTrace, asNumber, isBriefingQuery, rankBriefingSourcePriority, generateEmbedding, EMBEDDING, rerankWithLLM } from "../tool-utils";
import type { ToolTracePayload } from "../tool-utils";
import { isMissingBudgetViewError } from "../financial";

// ---------------------------------------------------------------------------
// asNumber
// ---------------------------------------------------------------------------

describe("asNumber()", () => {
  it("returns finite numbers as-is", () => {
    expect(asNumber(42)).toBe(42);
    expect(asNumber(3.14)).toBeCloseTo(3.14);
    expect(asNumber(0)).toBe(0);
    expect(asNumber(-100)).toBe(-100);
  });

  it("returns 0 for non-finite numbers", () => {
    expect(asNumber(Infinity)).toBe(0);
    expect(asNumber(-Infinity)).toBe(0);
    expect(asNumber(NaN)).toBe(0);
  });

  it("parses numeric strings", () => {
    expect(asNumber("42")).toBe(42);
    expect(asNumber("3.14")).toBeCloseTo(3.14);
    expect(asNumber("0")).toBe(0);
  });

  it("returns 0 for non-numeric strings", () => {
    expect(asNumber("abc")).toBe(0);
    expect(asNumber("")).toBe(0);
    expect(asNumber("$500")).toBe(0); // bare $ not a number
  });

  it("returns 0 for null, undefined, and objects", () => {
    expect(asNumber(null)).toBe(0);
    expect(asNumber(undefined)).toBe(0);
    expect(asNumber({})).toBe(0);
    expect(asNumber([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isBriefingQuery
// ---------------------------------------------------------------------------

describe("isBriefingQuery (#294 regression)", () => {
  it.each([
    "give me the latest on Vermillion",
    "catch me up on the project",
    "what's happening with the schedule",
    "project status update",
    "how is the budget tracking",
    "any news on the RFIs",
    "what happened last week",
    "what are the current risks",
    "right now what should I know",
    "can you give me a brief",
    "give me a briefing",
    "what's the progress on submittals",
    "how's the project going",
  ])("returns true for briefing query: %s", (query) => {
    expect(isBriefingQuery(query)).toBe(true);
  });

  it.each([
    "show me budget line items",
    "list all change orders",
    "which vendor submitted invoice 123",
    "export the cost codes",
    "search for RFI number 42",
    "create a new subcontract",
    "get the schedule tasks",
  ])("returns false for non-briefing query: %s", (query) => {
    expect(isBriefingQuery(query)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isBriefingQuery("PROJECT STATUS")).toBe(true);
    expect(isBriefingQuery("Latest Update")).toBe(true);
    expect(isBriefingQuery("CATCH ME UP")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// withTrace (read tools — swallows errors, returns structured {error})
// ---------------------------------------------------------------------------

describe("withTrace()", () => {
  it("returns the executor result on success and fires onTrace", async () => {
    const traces: ToolTracePayload[] = [];
    const traced = withTrace(
      "testTool",
      { onTrace: (t) => traces.push(t) },
      async () => ({ value: 42 }),
      "guidance text",
    );

    const result = await traced({});
    expect(result).toEqual({ value: 42 });
    expect(traces).toHaveLength(1);
    expect(traces[0].tool).toBe("testTool");
    expect(traces[0].output).toEqual({ value: 42 });
    expect(traces[0].error).toBeUndefined();
  });

  it("returns structured {error} instead of re-throwing (Rule 1 guard)", async () => {
    const traces: ToolTracePayload[] = [];
    const traced = withTrace(
      "testTool",
      { onTrace: (t) => traces.push(t) },
      async () => {
        throw new Error("Query failed");
      },
      "Check your project access",
    );

    // Must NOT throw
    const result = await traced({});
    expect(result).toMatchObject({
      error: "Query failed",
      source: "testTool",
      guidance: "Check your project access",
    });
    expect(traces).toHaveLength(1);
    expect(traces[0].error).toBe("Query failed");
  });
});

// ---------------------------------------------------------------------------
// rankBriefingSourcePriority
// ---------------------------------------------------------------------------

describe("rankBriefingSourcePriority (#294 regression)", () => {
  it("meeting_transcript ranks highest (0)", () => {
    expect(rankBriefingSourcePriority("meeting_transcript")).toBe(0);
  });

  it("maintains expected descending priority order", () => {
    const transcript = rankBriefingSourcePriority("meeting_transcript");
    const summary = rankBriefingSourcePriority("meeting_summary");
    const email = rankBriefingSourcePriority("email");
    const teams = rankBriefingSourcePriority("teams_channel");
    const knowledge = rankBriefingSourcePriority("knowledge_base");
    expect(transcript).toBeLessThan(summary);
    expect(summary).toBeLessThan(email);
    expect(email).toBeLessThan(teams);
    expect(teams).toBeLessThan(knowledge);
  });

  it("unknown source tables fall to default (8)", () => {
    expect(rankBriefingSourcePriority("unknown_table")).toBe(8);
    expect(rankBriefingSourcePriority("")).toBe(8);
    expect(rankBriefingSourcePriority("slack_message")).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// withWriteTrace (mutation tools — re-throws errors so they surface loudly)
//
// HIGH-2 regression guard: if withWriteTrace is ever changed to swallow errors
// (matching withTrace behavior), mutation failures (create RFI, create change
// order, update project status) would silently vanish from the AI stream.
// ---------------------------------------------------------------------------

describe("withWriteTrace()", () => {
  it("returns the executor result on success and fires onTrace", async () => {
    const traces: ToolTracePayload[] = [];
    const traced = withWriteTrace(
      "writeTool",
      { onTrace: (t) => traces.push(t) },
      async () => ({ created: true }),
    );

    const result = await traced({});
    expect(result).toEqual({ created: true });
    expect(traces).toHaveLength(1);
    expect(traces[0].tool).toBe("writeTool");
    expect(traces[0].output).toEqual({ created: true });
    expect(traces[0].error).toBeUndefined();
  });

  it("re-throws errors — does not swallow them (HIGH-2 regression guard)", async () => {
    const traces: ToolTracePayload[] = [];
    const traced = withWriteTrace(
      "writeTool",
      { onTrace: (t) => traces.push(t) },
      async () => {
        throw new Error("DB constraint violation");
      },
    );

    await expect(traced({})).rejects.toThrow("DB constraint violation");

    // Trace must be recorded even though error was re-thrown
    expect(traces).toHaveLength(1);
    expect(traces[0].error).toBe("DB constraint violation");
  });

  it("re-throws non-Error rejections (e.g. string throws)", async () => {
    const traces: ToolTracePayload[] = [];
    const traced = withWriteTrace(
      "writeTool",
      { onTrace: (t) => traces.push(t) },
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      async () => { throw "string rejection"; },
    );

    await expect(traced({})).rejects.toBe("string rejection");
    expect(traces[0].error).toBeDefined(); // some message recorded, not undefined
  });
});

// ---------------------------------------------------------------------------
// getOpenAI() — tested via module isolation to reset the lazy singleton
// HIGH-1 regression guard: fallback from AI_GATEWAY_API_KEY → OPENAI_API_KEY
// ---------------------------------------------------------------------------

describe("getOpenAI()", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    // Reset env to original state, then let each test override
    process.env = { ...ORIG_ENV };
  });

  afterAll(() => {
    process.env = ORIG_ENV;
  });

  it("uses AI Gateway baseURL when AI_GATEWAY_API_KEY is set", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-gateway-key";
    delete process.env.OPENAI_API_KEY;

    const { getOpenAI } = await import("../tool-utils");
    const client = getOpenAI();
    // The OpenAI client stores the baseURL on its internal config
    const baseURL = (client as unknown as { baseURL: string }).baseURL;
    expect(baseURL).toContain("ai-gateway.vercel.sh");
  });

  it("falls back to OPENAI_API_KEY when AI_GATEWAY_API_KEY is absent (HIGH-1 regression guard)", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    process.env.OPENAI_API_KEY = "test-openai-key";

    const { getOpenAI } = await import("../tool-utils");
    expect(() => getOpenAI()).not.toThrow();
  });

  it("throws a descriptive error when neither key is set", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { getOpenAI } = await import("../tool-utils");
    expect(() => getOpenAI()).toThrow("AI_GATEWAY_API_KEY or OPENAI_API_KEY not set");
  });
});

// ---------------------------------------------------------------------------
// isMissingBudgetViewError
// ---------------------------------------------------------------------------

describe("isMissingBudgetViewError (#294 regression)", () => {
  it("detects PGRST205 error code", () => {
    expect(isMissingBudgetViewError({ code: "PGRST205", message: "schema cache error" })).toBe(true);
  });

  it("detects v_budget_lines mention in message", () => {
    expect(isMissingBudgetViewError({ message: "relation v_budget_lines does not exist" })).toBe(true);
  });

  it("detects schema cache mention", () => {
    expect(isMissingBudgetViewError({ message: "schema cache lookup failed" })).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isMissingBudgetViewError({ message: "permission denied for table budget_lines" })).toBe(false);
    expect(isMissingBudgetViewError({ message: "fetch failed" })).toBe(false);
    expect(isMissingBudgetViewError({ message: "timeout" })).toBe(false);
  });

  it("handles null and undefined gracefully", () => {
    expect(isMissingBudgetViewError(null)).toBe(false);
    expect(isMissingBudgetViewError(undefined)).toBe(false);
  });

  it("handles non-object errors", () => {
    expect(isMissingBudgetViewError("schema cache")).toBe(true);
    expect(isMissingBudgetViewError("some other string error")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateEmbedding — H1 regression guard (#294 review)
//
// Guards:
// 1. Gateway prefix "openai/<model>" applied when AI_GATEWAY_API_KEY is set
// 2. Bare model name used when no gateway key
// 3. dimensions omitted for SMALL config (vector(1536) default)
// 4. dimensions included for LARGE config (halfvec(3072))
// 5. Return value is JSON-stringified (do NOT double-stringify)
// 6. Empty API response throws with actionable message
// ---------------------------------------------------------------------------

describe("generateEmbedding() (#294 H1 regression guard)", () => {
  const FAKE_LARGE = Array.from({ length: 3072 }, (_, i) => i * 0.001);
  const FAKE_SMALL = Array.from({ length: 1536 }, () => 0);

  const ORIG_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIG_ENV };
  });

  function mockOpenAI(embedding: number[] = FAKE_LARGE): OpenAI {
    return {
      embeddings: {
        create: jest.fn().mockResolvedValue({ data: [{ embedding }] }),
      },
    } as unknown as OpenAI;
  }

  it("returns a JSON-stringified array", async () => {
    const openai = mockOpenAI();
    const result = await generateEmbedding(openai, "hello", EMBEDDING.LARGE);
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toEqual(FAKE_LARGE);
  });

  it("applies gateway prefix when AI_GATEWAY_API_KEY is set", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-key";
    const openai = mockOpenAI();
    await generateEmbedding(openai, "hello", EMBEDDING.LARGE);
    const call = (openai.embeddings.create as jest.Mock).mock.calls[0][0];
    expect(call.model).toBe("openai/text-embedding-3-large");
  });

  it("uses bare model name when AI_GATEWAY_API_KEY is absent", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    const openai = mockOpenAI();
    await generateEmbedding(openai, "hello", EMBEDDING.LARGE);
    const call = (openai.embeddings.create as jest.Mock).mock.calls[0][0];
    expect(call.model).toBe("text-embedding-3-large");
  });

  it("omits dimensions for SMALL config (vector(1536) default)", async () => {
    const openai = mockOpenAI(FAKE_SMALL);
    await generateEmbedding(openai, "hello", EMBEDDING.SMALL);
    const call = (openai.embeddings.create as jest.Mock).mock.calls[0][0];
    expect(call.dimensions).toBeUndefined();
  });

  it("includes dimensions:3072 for LARGE config (halfvec(3072))", async () => {
    const openai = mockOpenAI();
    await generateEmbedding(openai, "hello", EMBEDDING.LARGE);
    const call = (openai.embeddings.create as jest.Mock).mock.calls[0][0];
    expect(call.dimensions).toBe(3072);
  });

  it("throws when API returns empty embedding data", async () => {
    const openai = {
      embeddings: { create: jest.fn().mockResolvedValue({ data: [] }) },
    } as unknown as OpenAI;
    await expect(generateEmbedding(openai, "hello", EMBEDDING.LARGE)).rejects.toThrow(
      "Embedding API returned empty data",
    );
  });
});

// ---------------------------------------------------------------------------
// rerankWithLLM — H2 regression guard (#294 review)
//
// Guards:
// 1. Parses plain JSON array from LLM response
// 2. Strips markdown code fences before parsing
// 3. Filters out-of-bound and non-numeric indices silently
// 4. Falls back to original order on API or parse failure (no throw)
// 5. Respects topK limit
// ---------------------------------------------------------------------------

describe("rerankWithLLM() (#294 H2 regression guard)", () => {
  const candidates = [
    { content: "Budget variance for Vermillion", sourceTable: "meeting_transcript" },
    { content: "Submittal log update", sourceTable: "email" },
    { content: "Schedule delay notice", sourceTable: "teams_channel" },
  ];

  function mockChat(content: string): OpenAI {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content } }],
          }),
        },
      },
    } as unknown as OpenAI;
  }

  it("parses a plain JSON array from LLM response", async () => {
    const result = await rerankWithLLM(mockChat("[2, 0, 1]"), "query", candidates, 3);
    expect(result).toEqual([2, 0, 1]);
  });

  it("strips markdown fences before parsing", async () => {
    const result = await rerankWithLLM(mockChat("```json\n[1, 0]\n```"), "query", candidates, 3);
    expect(result).toEqual([1, 0]);
  });

  it("strips markdown fences without language specifier", async () => {
    const result = await rerankWithLLM(mockChat("```\n[0, 2]\n```"), "query", candidates, 3);
    expect(result).toEqual([0, 2]);
  });

  it("filters out-of-bound indices silently", async () => {
    const result = await rerankWithLLM(mockChat("[100, -1, 0]"), "query", candidates, 3);
    expect(result).toEqual([0]);
  });

  it("filters non-numeric values", async () => {
    const result = await rerankWithLLM(mockChat('[2, "text", 1]'), "query", candidates, 3);
    expect(result).toEqual([2, 1]);
  });

  it("falls back to original order on API error (no throw)", async () => {
    const openai = {
      chat: {
        completions: { create: jest.fn().mockRejectedValue(new Error("API error")) },
      },
    } as unknown as OpenAI;
    const result = await rerankWithLLM(openai, "query", candidates, 3);
    expect(result).toEqual([0, 1, 2]);
  });

  it("falls back to original order on JSON parse failure (no throw)", async () => {
    const result = await rerankWithLLM(mockChat("not valid json"), "query", candidates, 3);
    expect(result).toEqual([0, 1, 2]);
  });

  it("respects topK limit", async () => {
    const result = await rerankWithLLM(mockChat("[2, 1, 0]"), "query", candidates, 2);
    expect(result).toHaveLength(2);
    expect(result).toEqual([2, 1]);
  });
});
