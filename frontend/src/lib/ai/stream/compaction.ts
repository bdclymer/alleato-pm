import { generateText, type ModelMessage } from "ai";

export const CONTEXT_COMPACTION_SUMMARY_PREFIX =
  "[CONTEXT COMPACTION - REFERENCE ONLY]";
export const CONTEXT_COMPACTION_END_MARKER =
  "--- END OF CONTEXT SUMMARY - respond to the latest user message below, not this summary ---";

const DEFAULT_THRESHOLD_TOKENS = 90_000;
const DEFAULT_HARD_LIMIT_TOKENS = 120_000;
const DEFAULT_HEAD_MESSAGES = 4;
const DEFAULT_TAIL_MESSAGES = 12;
const DEFAULT_MAX_TOOL_RESULT_CHARS = 700;
const DEFAULT_SUMMARY_MODEL = "openai/gpt-4.1-mini";
const CHARS_PER_TOKEN = 4;

type SummarizeCompactionInput = {
  previousSummary: string | null;
  middleTranscript: string;
  maxOutputTokens: number;
  summaryModel?: string;
};

export type ContextCompactionMetadata = {
  enabled: boolean;
  status:
    | "disabled"
    | "under_threshold"
    | "compacted"
    | "failed_uncompacted";
  tokenEstimateBefore: number;
  tokenEstimateAfter: number;
  thresholdTokens: number;
  hardLimitTokens: number;
  headMessagesKept: number;
  tailMessagesKept: number;
  middleMessagesSummarized: number;
  previousSummaryRefreshed: boolean;
  bulkyToolResultsPruned: number;
  binaryReferencesReplaced: number;
  droppedMessages: number;
  failureReason?: string;
};

export type ContextCompactionResult = {
  messages: ModelMessage[];
  metadata: ContextCompactionMetadata;
};

export class ContextCompactionError extends Error {
  readonly code = "AI_CONTEXT_COMPACTION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "ContextCompactionError";
  }
}

export type ContextCompactionOptions = {
  enabled: boolean;
  systemPrompt: string;
  thresholdTokens?: number;
  hardLimitTokens?: number;
  headMessages?: number;
  tailMessages?: number;
  maxToolResultChars?: number;
  maxSummaryTokens?: number;
  summaryModel?: string;
  summarize?: (input: SummarizeCompactionInput) => Promise<string>;
};

function estimateTokensFromText(value: string): number {
  return Math.ceil(value.length / CHARS_PER_TOKEN);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "null";
  } catch {
    return "[unserializable]";
  }
}

function textFromContent(content: ModelMessage["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "reasoning") return part.text;
      if (part.type === "tool-call") {
        return `[tool-call:${part.toolName}] ${safeJson(part.input)}`;
      }
      if (part.type === "tool-result") {
        return `[tool-result:${part.toolName}] ${safeJson(part.output)}`;
      }
      if (part.type === "file") {
        return `[file:${part.filename ?? "unnamed"}:${part.mediaType}]`;
      }
      if (part.type === "image") {
        return `[image:${part.mediaType ?? "unknown"}]`;
      }
      if (part.type === "tool-approval-request") {
        return `[tool-approval-request:${part.toolCallId}]`;
      }
      if (part.type === "tool-approval-response") {
        return `[tool-approval-response:${part.toolCallId}:${part.approved ? "approved" : "denied"}]`;
      }
      return `[${part.type}]`;
    })
    .join("\n");
}

export function estimateModelMessagesTokens(messages: ModelMessage[]): number {
  return messages.reduce(
    (total, message) => total + estimateTokensFromText(textFromContent(message.content)),
    0,
  );
}

function isCompactionSummaryMessage(message: ModelMessage): boolean {
  return (
    message.role === "system" &&
    typeof message.content === "string" &&
    message.content.startsWith(CONTEXT_COMPACTION_SUMMARY_PREFIX)
  );
}

function summarizeToolOutput(output: unknown, maxChars: number): {
  output: unknown;
  pruned: boolean;
} {
  const serialized = safeJson(output);
  if (serialized.length <= maxChars) return { output, pruned: false };

  return {
    output: {
      type: "text",
      value: `[historical tool result pruned: ${serialized.length} chars, preview=${serialized
        .slice(0, maxChars)
        .replace(/\s+/g, " ")}]`,
    },
    pruned: true,
  };
}

function sanitizeHistoricalMessage(
  message: ModelMessage,
  maxToolResultChars: number,
): {
  message: ModelMessage;
  bulkyToolResultsPruned: number;
  binaryReferencesReplaced: number;
} {
  if (typeof message.content === "string" || !Array.isArray(message.content)) {
    return {
      message,
      bulkyToolResultsPruned: 0,
      binaryReferencesReplaced: 0,
    };
  }

  let bulkyToolResultsPruned = 0;
  let binaryReferencesReplaced = 0;
  const content = message.content.map((part) => {
    if (part.type === "file") {
      binaryReferencesReplaced += 1;
      return {
        type: "text" as const,
        text: `[historical file omitted: ${part.filename ?? "unnamed"} (${part.mediaType})]`,
      };
    }
    if (part.type === "image") {
      binaryReferencesReplaced += 1;
      return {
        type: "text" as const,
        text: `[historical image omitted: ${part.mediaType ?? "unknown media type"}]`,
      };
    }
    if (part.type === "tool-result") {
      const summarized = summarizeToolOutput(part.output, maxToolResultChars);
      if (summarized.pruned) bulkyToolResultsPruned += 1;
      return {
        ...part,
        output: summarized.output,
      };
    }
    return part;
  });

  return {
    message: { ...message, content } as ModelMessage,
    bulkyToolResultsPruned,
    binaryReferencesReplaced,
  };
}

function serializeForSummary(messages: ModelMessage[], maxToolResultChars: number): {
  transcript: string;
  bulkyToolResultsPruned: number;
  binaryReferencesReplaced: number;
} {
  let bulkyToolResultsPruned = 0;
  let binaryReferencesReplaced = 0;
  const transcript = messages
    .map((message, index) => {
      const sanitized = sanitizeHistoricalMessage(message, maxToolResultChars);
      bulkyToolResultsPruned += sanitized.bulkyToolResultsPruned;
      binaryReferencesReplaced += sanitized.binaryReferencesReplaced;
      return `[#${index + 1} ${sanitized.message.role}]\n${textFromContent(sanitized.message.content)}`;
    })
    .join("\n\n");

  return { transcript, bulkyToolResultsPruned, binaryReferencesReplaced };
}

async function defaultSummarizeCompaction({
  previousSummary,
  middleTranscript,
  maxOutputTokens,
  summaryModel,
}: SummarizeCompactionInput): Promise<string> {
  const { getLanguageModel } = await import("@/lib/ai/providers");
  const result = await generateText({
    model: getLanguageModel(summaryModel ?? DEFAULT_SUMMARY_MODEL),
    system: [
      "You summarize old AI assistant chat turns for future context.",
      "The summary is reference-only. Do not continue the conversation.",
      "Preserve decisions, file paths, commands, errors, project names, source facts, and unresolved blockers.",
      "Do not convert old user asks into active instructions.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          previousSummary
            ? `<previous-summary>\n${previousSummary}\n</previous-summary>\n\nRefresh that summary with these older turns.`
            : "Create a compact reference summary from these older turns.",
          "<older-turns>",
          middleTranscript,
          "</older-turns>",
        ].join("\n"),
      },
    ],
    maxOutputTokens,
  });

  return result.text.trim();
}

function createSummaryMessage(summary: string): ModelMessage {
  return {
    role: "system",
    content: [
      CONTEXT_COMPACTION_SUMMARY_PREFIX,
      "Earlier messages were compacted into the summary below. Treat it as background reference only. The latest user message after this summary is the active task.",
      "",
      summary,
      "",
      CONTEXT_COMPACTION_END_MARKER,
    ].join("\n"),
  };
}

export async function maybeCompactModelMessages(
  messages: ModelMessage[],
  options: ContextCompactionOptions,
): Promise<ContextCompactionResult> {
  const thresholdTokens = options.thresholdTokens ?? DEFAULT_THRESHOLD_TOKENS;
  const hardLimitTokens = options.hardLimitTokens ?? DEFAULT_HARD_LIMIT_TOKENS;
  const headMessages = options.headMessages ?? DEFAULT_HEAD_MESSAGES;
  const tailMessages = options.tailMessages ?? DEFAULT_TAIL_MESSAGES;
  const maxToolResultChars =
    options.maxToolResultChars ?? DEFAULT_MAX_TOOL_RESULT_CHARS;
  const maxSummaryTokens = options.maxSummaryTokens ?? 1_500;
  const tokenEstimateBefore =
    estimateTokensFromText(options.systemPrompt) + estimateModelMessagesTokens(messages);

  const baseMetadata = {
    enabled: options.enabled,
    tokenEstimateBefore,
    tokenEstimateAfter: tokenEstimateBefore,
    thresholdTokens,
    hardLimitTokens,
    headMessagesKept: 0,
    tailMessagesKept: 0,
    middleMessagesSummarized: 0,
    previousSummaryRefreshed: false,
    bulkyToolResultsPruned: 0,
    binaryReferencesReplaced: 0,
    droppedMessages: 0,
  };

  if (!options.enabled) {
    return { messages, metadata: { ...baseMetadata, status: "disabled" } };
  }

  if (tokenEstimateBefore < thresholdTokens) {
    return { messages, metadata: { ...baseMetadata, status: "under_threshold" } };
  }

  const existingSummaryIndex = messages.findIndex(isCompactionSummaryMessage);
  const existingSummary =
    existingSummaryIndex >= 0 && typeof messages[existingSummaryIndex]?.content === "string"
      ? (messages[existingSummaryIndex]?.content as string)
      : null;
  const withoutExistingSummary =
    existingSummaryIndex >= 0
      ? messages.filter((_, index) => index !== existingSummaryIndex)
      : messages;

  if (withoutExistingSummary.length < headMessages + tailMessages + 1) {
    return { messages, metadata: { ...baseMetadata, status: "under_threshold" } };
  }

  const head = withoutExistingSummary.slice(0, headMessages);
  const tail = withoutExistingSummary.slice(-tailMessages);
  const middle = withoutExistingSummary.slice(headMessages, -tailMessages);
  const serialized = serializeForSummary(middle, maxToolResultChars);

  try {
    const summarize = options.summarize ?? defaultSummarizeCompaction;
    const summary = await summarize({
      previousSummary: existingSummary,
      middleTranscript: serialized.transcript,
      maxOutputTokens: maxSummaryTokens,
      summaryModel: options.summaryModel,
    });
    const compactedMessages = [...head, createSummaryMessage(summary), ...tail];
    const tokenEstimateAfter =
      estimateTokensFromText(options.systemPrompt) +
      estimateModelMessagesTokens(compactedMessages);

    return {
      messages: compactedMessages,
      metadata: {
        ...baseMetadata,
        status: "compacted",
        tokenEstimateAfter,
        headMessagesKept: head.length,
        tailMessagesKept: tail.length,
        middleMessagesSummarized: middle.length,
        previousSummaryRefreshed: Boolean(existingSummary),
        bulkyToolResultsPruned: serialized.bulkyToolResultsPruned,
        binaryReferencesReplaced: serialized.binaryReferencesReplaced,
        droppedMessages: Math.max(0, messages.length - compactedMessages.length),
      },
    };
  } catch (error) {
    const failureReason =
      error instanceof Error ? error.message : "Unknown context compaction failure";
    if (tokenEstimateBefore >= hardLimitTokens) {
      throw new ContextCompactionError(
        `Context compaction failed above hard token limit: ${failureReason}`,
      );
    }

    return {
      messages,
      metadata: {
        ...baseMetadata,
        status: "failed_uncompacted",
        failureReason,
      },
    };
  }
}
