/**
 * Regression tests for tool-utils.ts shared infrastructure.
 *
 * Covers:
 * - getOpenAI(): AI Gateway vs OPENAI_API_KEY fallback (HIGH-1 from PR #292 review)
 * - withWriteTrace(): must re-throw — not swallow — errors (HIGH-2 from PR #292 review)
 * - withTrace(): must return structured {error} instead of re-throwing
 * - asNumber(): edge-case coverage for budget total calculations
 *
 * @see CLAUDE.md Rules 14 & 15 — Bug Fix Completion Gate + Regression Test Gate
 * @see frontend/src/lib/ai/tools/tool-utils.ts
 */

import { withTrace, withWriteTrace, asNumber } from "../tool-utils";
import type { ToolTracePayload } from "../tool-utils";

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
