import type { ModelMessage } from "ai";
import {
  CONTEXT_COMPACTION_SUMMARY_PREFIX,
  ContextCompactionError,
  maybeCompactModelMessages,
} from "../compaction";

function user(content: string): ModelMessage {
  return { role: "user", content };
}

function assistant(content: ModelMessage["content"]): ModelMessage {
  return { role: "assistant", content };
}

function system(content: string): ModelMessage {
  return { role: "system", content };
}

describe("context compaction", () => {
  it("returns an under-threshold no-op without calling the summarizer", async () => {
    const summarize = jest.fn(async () => "summary");
    const messages = [user("short"), assistant("small")];

    const result = await maybeCompactModelMessages(messages, {
      enabled: true,
      systemPrompt: "system prompt must stay outside compaction",
      thresholdTokens: 10_000,
      hardLimitTokens: 20_000,
      summarize,
    });

    expect(result.messages).toBe(messages);
    expect(result.metadata.status).toBe("under_threshold");
    expect(summarize).not.toHaveBeenCalled();
  });

  it("preserves system, head, and tail messages while summarizing the middle", async () => {
    const messages: ModelMessage[] = [
      system("developer safety instruction"),
      user("head user"),
      assistant("head assistant"),
      user("middle user " + "x".repeat(400)),
      assistant("middle assistant " + "y".repeat(400)),
      user("recent user"),
      assistant("recent assistant"),
    ];

    const result = await maybeCompactModelMessages(messages, {
      enabled: true,
      systemPrompt: "VERBATIM SYSTEM PROMPT",
      thresholdTokens: 10,
      hardLimitTokens: 10_000,
      headMessages: 3,
      tailMessages: 2,
      summarize: async ({ middleTranscript }) => {
        expect(middleTranscript).toContain("middle user");
        expect(middleTranscript).toContain("middle assistant");
        return "middle summary";
      },
    });

    expect(result.metadata.status).toBe("compacted");
    expect(result.metadata.headMessagesKept).toBe(3);
    expect(result.metadata.tailMessagesKept).toBe(2);
    expect(result.messages[0]).toEqual(messages[0]);
    expect(result.messages[1]).toEqual(messages[1]);
    expect(result.messages[2]).toEqual(messages[2]);
    expect(result.messages.at(-2)).toEqual(messages.at(-2));
    expect(result.messages.at(-1)).toEqual(messages.at(-1));
    expect(
      result.messages.some(
        (message) =>
          message.role === "system" &&
          typeof message.content === "string" &&
          message.content.startsWith(CONTEXT_COMPACTION_SUMMARY_PREFIX) &&
          message.content.includes("middle summary"),
      ),
    ).toBe(true);
  });

  it("refreshes an existing compaction summary instead of stacking summaries", async () => {
    const existingSummary = system(
      `${CONTEXT_COMPACTION_SUMMARY_PREFIX}\nold summary`,
    );
    const messages: ModelMessage[] = [
      user("head"),
      existingSummary,
      assistant("middle " + "x".repeat(500)),
      user("tail user"),
      assistant("tail assistant"),
    ];

    const result = await maybeCompactModelMessages(messages, {
      enabled: true,
      systemPrompt: "system",
      thresholdTokens: 10,
      hardLimitTokens: 10_000,
      headMessages: 1,
      tailMessages: 2,
      summarize: async ({ previousSummary }) => {
        expect(previousSummary).toContain("old summary");
        return "refreshed summary";
      },
    });

    const summaryMessages = result.messages.filter(
      (message) =>
        message.role === "system" &&
        typeof message.content === "string" &&
        message.content.startsWith(CONTEXT_COMPACTION_SUMMARY_PREFIX),
    );
    expect(result.metadata.previousSummaryRefreshed).toBe(true);
    expect(summaryMessages).toHaveLength(1);
    expect(summaryMessages[0]?.content).toContain("refreshed summary");
  });

  it("summarizes bulky historical tool results and replaces old binary references", async () => {
    const messages: ModelMessage[] = [
      user("head"),
      assistant([
        {
          type: "tool-result",
          toolCallId: "call-1",
          toolName: "searchExternalDocuments",
          output: { type: "text", value: "a".repeat(2_000) },
        },
        {
          type: "file",
          data: "data:application/pdf;base64,abc",
          filename: "old.pdf",
          mediaType: "application/pdf",
        },
        {
          type: "image",
          image: "data:image/png;base64,abc",
          mediaType: "image/png",
        },
      ]),
      user("tail"),
      assistant("tail answer"),
    ];

    const result = await maybeCompactModelMessages(messages, {
      enabled: true,
      systemPrompt: "system",
      thresholdTokens: 10,
      hardLimitTokens: 10_000,
      headMessages: 1,
      tailMessages: 2,
      maxToolResultChars: 100,
      summarize: async ({ middleTranscript }) => {
        expect(middleTranscript).toContain("historical tool result pruned");
        expect(middleTranscript).toContain("historical file omitted: old.pdf");
        expect(middleTranscript).toContain("historical image omitted");
        return "summary";
      },
    });

    expect(result.metadata.bulkyToolResultsPruned).toBe(1);
    expect(result.metadata.binaryReferencesReplaced).toBe(2);
  });

  it("throws a specific compaction error when summarization fails over the hard limit", async () => {
    await expect(
      maybeCompactModelMessages(
        [
          user("head"),
          assistant("middle " + "x".repeat(2_000)),
          user("tail"),
        ],
        {
          enabled: true,
          systemPrompt: "system",
          thresholdTokens: 10,
          hardLimitTokens: 20,
          headMessages: 1,
          tailMessages: 1,
          summarize: async () => {
            throw new Error("summarizer down");
          },
        },
      ),
    ).rejects.toThrow(ContextCompactionError);
  });
});
