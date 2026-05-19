/**
 * Response quality scoring for the RAG chat pipeline.
 *
 * Extracted from route.ts for independent unit-testability.
 * @see frontend/src/app/api/ai-assistant/chat/route.ts — call sites
 */

export type ResponseQuality = {
  confidence: "high" | "medium" | "low";
  sourceQuality: "high" | "medium" | "low";
  score: number;
  reasons: string[];
  hasMetaCommentary: boolean;
};

/**
 * Phrases that indicate the AI is stalling instead of answering.
 * Array.some() — a single occurrence is enough to flag the response.
 */
export const META_COMMENTARY_PHRASES = [
  "let me search for",
  "let me look that up",
  "let me find",
  "let me check on", // was: "let me check" — too broad (matches "Let me check: [actual data]")
  "i'll search for",
  "i'll look that up",
  "i'll look into",
  "i'll find",
  "i can look it up",
  "i searched broadly",
  "tell me the project name",
  "give me the project name",
  "provide the project name",
  "searching for that", // was: "searching for" — too broad (matches "I found what you were searching for")
  "looking that up",
  "give me a moment",
  "one moment while i", // was: also had broader "one moment" below — removed as it caused false positives
  "pulling that information",
  "retrieving that for you",
  "give me a second",
  "let me pull up",
];

const SOURCE_BEARING_TOOLS = new Set([
  "clientProjectIntelligencePacket",
  "sourceSpecificRagRetrieval",
  "semanticSearch",
  "searchMeetingsByTopic",
  "searchTeamsMessages",
  "searchEmails",
  "searchExternalDocuments",
  "getProjectBriefingSnapshot",
  "cachedProjectBriefingSnapshot",
  "cachedExecutiveRetrievalPacket",
  "backendDeepAgentExecutiveBriefing",
  "backendDeepAgentProjectStatus",
  "backendDeepAgentResearch",
  "deepagents_runtime",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numericCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function arrayCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function countSourceBearingRecords(entry: Record<string, unknown>): number {
  if (entry.error) return 0;
  const toolName = typeof entry.tool === "string" ? entry.tool : "";
  if (!SOURCE_BEARING_TOOLS.has(toolName)) return 0;

  const output = asRecord(entry.output);
  if (!output) return 0;

  const directCount = Math.max(
    numericCount(output.cardCount),
    numericCount(output.rowCount),
    numericCount(output.totalResults),
    numericCount(output.resultCount),
    arrayCount(output.rows),
    arrayCount(output.results),
  );

  if (directCount > 0) return directCount;

  const sources = Array.isArray(output.sources) ? output.sources : [];
  return sources.reduce((count, source) => {
    const sourceRecord = asRecord(source);
    const sourceOutput = asRecord(sourceRecord?.output);
    return count + Math.max(
      numericCount(sourceRecord?.resultCount),
      numericCount(sourceOutput?.totalResults),
      arrayCount(sourceOutput?.results),
      arrayCount(sourceOutput?.rows),
    );
  }, 0);
}

export function scoreResponseQuality(params: {
  toolTrace: Array<Record<string, unknown>>;
  content: string;
}): ResponseQuality {
  const reasons: string[] = [];
  const trace = params.toolTrace;
  const successfulToolCalls = trace.filter((t) => !t.error).length;
  const failedToolCalls = trace.filter((t) => t.error).length;
  const sourceRefsInText = (params.content.match(/\[Source:/g) ?? []).length;
  const sourceBearingRecordCount = trace.reduce(
    (count, entry) => count + countSourceBearingRecords(entry),
    0,
  );
  const hasCompiledPacket = trace.some((entry) => {
    if (entry.tool !== "clientProjectIntelligencePacket" || entry.error) return false;
    const output = entry.output as { cardCount?: unknown } | undefined;
    return typeof output?.cardCount === "number" && output.cardCount >= 3;
  });

  const normalizedContent = params.content.toLowerCase();
  const hasMetaCommentary = META_COMMENTARY_PHRASES.some((phrase) =>
    normalizedContent.includes(phrase),
  );

  let score = 50;

  if (hasCompiledPacket) {
    score += 25;
    reasons.push("compiled intelligence packet with multiple evidence cards");
  } else if (successfulToolCalls >= 3) {
    score += 25;
    reasons.push("multiple successful tool calls");
  } else if (successfulToolCalls >= 1) {
    score += 12;
    reasons.push("at least one successful tool call");
  } else {
    reasons.push("no successful tool calls");
  }

  if (sourceRefsInText >= 2) {
    score += 15;
    reasons.push("multiple source citations");
  } else if (sourceRefsInText === 1) {
    score += 8;
    reasons.push("single source citation");
  } else if (sourceBearingRecordCount > 0) {
    reasons.push(
      `retrieval trace included ${sourceBearingRecordCount} source-bearing record(s) without inline citations`,
    );
  } else {
    reasons.push("no source citations in final response");
  }

  if (failedToolCalls > 0) {
    score -= Math.min(20, failedToolCalls * 5);
    reasons.push(`${failedToolCalls} tool call failure(s)`);
  }

  if (hasMetaCommentary) {
    score -= 30;
    reasons.push("meta-commentary detected: model narrated intent instead of answering");
  }

  score = Math.max(0, Math.min(100, score));

  const confidence: ResponseQuality["confidence"] =
    score >= 80 ? "high" : score >= 60 ? "medium" : "low";
  const sourceQuality: ResponseQuality["sourceQuality"] =
    sourceRefsInText >= 2 || sourceBearingRecordCount >= 2
      ? "high"
      : sourceRefsInText === 1 || sourceBearingRecordCount === 1
        ? "medium"
        : "low";

  return { confidence, sourceQuality, score, reasons, hasMetaCommentary };
}
