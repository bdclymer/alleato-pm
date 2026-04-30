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
  "searching for that", // was: "searching for" — too broad (matches "I found what you were searching for")
  "looking that up",
  "give me a moment",
  "one moment while i", // was: also had broader "one moment" below — removed as it caused false positives
  "pulling that information",
  "retrieving that for you",
  "give me a second",
  "let me pull up",
];

export function scoreResponseQuality(params: {
  toolTrace: Array<Record<string, unknown>>;
  content: string;
}): ResponseQuality {
  const reasons: string[] = [];
  const trace = params.toolTrace;
  const successfulToolCalls = trace.filter((t) => !t.error).length;
  const failedToolCalls = trace.filter((t) => t.error).length;
  const sourceRefsInText = (params.content.match(/\[Source:/g) ?? []).length;
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
    sourceRefsInText >= 2 ? "high" : sourceRefsInText === 1 ? "medium" : "low";

  return { confidence, sourceQuality, score, reasons, hasMetaCommentary };
}
