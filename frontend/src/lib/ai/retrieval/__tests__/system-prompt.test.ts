// frontend/src/lib/ai/retrieval/__tests__/system-prompt.test.ts
import { assembleSystemPromptFromContext } from "../system-prompt";
import type { RetrievalPlan, RetrievalContext } from "../types";

describe("assembleSystemPromptFromContext", () => {
  it("adds tool-routing guidance when nothing was pre-fetched", () => {
    const plan: RetrievalPlan = {
      intent: "app_help",
      responseFormat: "app_help",
      sources: {},
      reason: "test",
    };
    const ctx: RetrievalContext = { warnings: [], durationsMs: {} };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE_PROMPT");
    expect(prompt).toContain("No Pre-fetched Context");
    expect(prompt).toContain("Use your available tools to answer");
    expect(prompt).toContain("BASE_PROMPT");
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

  it("includes structured Outlook inbox results separately from source-specific RAG", () => {
    const plan: RetrievalPlan = {
      intent: "source_lookup",
      responseFormat: "recent_email_inbox",
      sources: {
        recentEmails: {
          daysBack: 0,
          limit: 50,
          reason: "structured_outlook_inbox_query",
        },
      },
      reason: "structured_outlook_inbox_query",
    };
    const ctx: RetrievalContext = {
      recentEmailInbox: {
        count: 1,
        threads: [{ latestSubject: "Owner approval needed", latestPreview: "Please respond today." }],
      },
      warnings: [],
      durationsMs: {},
    };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE");
    expect(prompt).toContain("Structured Outlook Inbox Result");
    expect(prompt).toContain("outlook_email_intake");
    expect(prompt).toContain("Owner approval needed");
    expect(prompt).not.toContain("Source-Specific RAG Result");
  });

  it("renders latest-available email fallback metadata for stale same-day windows", () => {
    const plan: RetrievalPlan = {
      intent: "source_lookup",
      responseFormat: "recent_email_inbox",
      sources: {
        recentEmails: {
          daysBack: 0,
          limit: 50,
          reason: "structured_outlook_inbox_query",
        },
      },
      reason: "structured_outlook_inbox_query",
    };
    const ctx: RetrievalContext = {
      recentEmailInbox: {
        count: 5,
        latestAvailableFallback: true,
        requestedWindowEmpty: true,
        latestAvailableReceivedAt: "2026-05-18T16:55:09Z",
        summary:
          "No emails are synced in the requested today window; latest available synced mailbox messages returned instead.",
        threads: [
          {
            latestSubject: "Re: RI-3959-0012 May Final Pay App",
            latestPreview: "This has already been resolved. Thanks!",
          },
        ],
      },
      warnings: [],
      durationsMs: {},
    };

    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE");

    expect(prompt).toContain("latestAvailableFallback: true");
    expect(prompt).toContain("requestedWindowEmpty: true");
    expect(prompt).toContain("latestAvailableReceivedAt: 2026-05-18T16:55:09Z");
    expect(prompt).toContain("latest available synced mailbox messages");
    expect(prompt).toContain("RI-3959-0012");
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
      semanticVectorResults: { results: [{ content: "abc", sourceTable: "doc" }] } as never,
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

  // ---------------------------------------------------------------------
  // Regression guards: prompt size budget
  //
  // Bug: V2 returned empty model output ("finishReason: other") because the
  // assembled system prompt was ~52K chars / ~13K tokens — the AI Gateway
  // bailed out of the request before producing any output. Root cause was
  // JSON.stringify(value, null, 2) on every retrieved source, plus full
  // 5000-char meeting transcripts repeated 8× in the vector results.
  // ---------------------------------------------------------------------

  it("renders vector results compactly — never JSON.stringify with whitespace indent", () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: { semanticVectorSearch: { query: "x" } },
      reason: "test",
    };
    const longContent = "A".repeat(5000);
    const ctx: RetrievalContext = {
      semanticVectorResults: {
        query: "x",
        resultCount: 8,
        results: Array.from({ length: 8 }, (_, i) => ({
          content: longContent,
          sourceTable: "meeting_transcript",
          recordId: `rec-${i}`,
          sourceDocumentId: `doc-${i}`,
          sourceChunkId: `chunk-${i}`,
          similarity: 0.5,
          finalScore: 0.5,
          projectIds: [42],
          metadata: { chunk_index: i, foo: "bar".repeat(500) },
          createdAt: "2025-01-01",
        })),
      } as never,
      warnings: [],
      durationsMs: {},
    };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE");

    // Markdown rendering, not pretty-printed JSON
    expect(prompt).toContain("### [1] meeting_transcript");
    expect(prompt).toContain("[truncated]");
    expect(prompt).not.toMatch(/\n {2}"content": /); // no 2-space-indented JSON
  });

  it("caps total assembled prompt under the retrieval budget even with bloated sources", () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: {
        intelligencePacket: { mode: "additive" },
        projectSnapshot: { reason: "intent" },
        semanticVectorSearch: { query: "x" },
        externalSources: ["meetings"],
      },
      reason: "test",
    };
    const huge = "x".repeat(50_000);
    const ctx: RetrievalContext = {
      intelligencePacket: { executiveSummary: huge, cards: [{ title: huge }] } as never,
      projectSnapshot: { huge } as never,
      semanticVectorResults: {
        results: Array.from({ length: 12 }, () => ({
          content: huge,
          sourceTable: "meeting_transcript",
          similarity: 0.4,
        })),
      } as never,
      executiveBriefingRetrieval: { sources: [{ huge }] } as never,
      warnings: [],
      durationsMs: {},
    };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE");

    // Retrieval block capped at ~30K + base prompt + a little structural overhead.
    // 35_000 leaves comfortable headroom over the 30_000 cap for separators.
    expect(prompt.length).toBeLessThan(35_000);
    expect(prompt).toContain("BASE");
  });

  it("limits semantic results to top N even if executor returned more", () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: { semanticVectorSearch: { query: "x" } },
      reason: "test",
    };
    const ctx: RetrievalContext = {
      semanticVectorResults: {
        results: Array.from({ length: 20 }, (_, i) => ({
          content: `result-${i}`,
          sourceTable: "doc",
          similarity: 0.5,
        })),
      } as never,
      warnings: [],
      durationsMs: {},
    };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE");
    expect(prompt).toContain("### [1] doc");
    expect(prompt).toContain("### [8] doc");
    expect(prompt).not.toContain("### [9] doc");
  });

  it("renders intelligence packet without packetJson or evidence blobs", () => {
    const plan: RetrievalPlan = {
      intent: "latest_status",
      responseFormat: "briefing_template",
      sources: { intelligencePacket: { mode: "additive" } },
      reason: "test",
    };
    const ctx: RetrievalContext = {
      intelligencePacket: {
        id: "p1",
        targetId: "t1",
        executiveSummary: "summary text",
        packetJson: { huge: "x".repeat(20_000) },
        cards: [
          {
            title: "Risks",
            summary: "risk summary",
            evidence: [{ huge: "x".repeat(20_000) }],
            metadata: { huge: "x".repeat(20_000) },
          },
        ],
      } as never,
      warnings: [],
      durationsMs: {},
    };
    const prompt = assembleSystemPromptFromContext(plan, ctx, "BASE");

    expect(prompt).toContain("summary text");
    expect(prompt).toContain("Risks");
    expect(prompt).not.toContain("packetJson");
    // Heavy fields should not be dumped into the prompt — `xxxx...` is the
    // 20K-char filler used for evidence/metadata/packetJson in the fixture.
    expect(prompt).not.toContain("xxxxxxxxxx");
    expect(prompt.length).toBeLessThan(5_000);
  });
});
