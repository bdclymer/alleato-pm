import { Langfuse } from "langfuse";

import { computeTraceScores } from "@/lib/ai/score-response-quality";
import { judgeChatResponse, shouldRunJudge } from "@/lib/ai/llm-judge";

let _client: Langfuse | null = null;

function getClient(): Langfuse | null {
  if (!process.env.LANGFUSE_SECRET_KEY) return null;
  if (!_client) {
    _client = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://us.cloud.langfuse.com",
      flushAt: 1,
    });
  }
  return _client;
}

type TraceParams = {
  userId: string;
  sessionId: string;
  modelId: string;
  input: string;
  output: string;
  generationName?: string;
  usage?: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number };
  intent?: string;
  qualityScore?: number;
  qualityReasons?: string[];
  wasRetried?: boolean;
  retryReason?: string;
  stepCount?: number;
  toolCallNames?: string[];
  selectedProjectId?: number | null;
  /**
   * Full tool trace (with per-call `output`/`error`) when available. Enables the
   * rich response-quality score and the `tool_failure` score. Omit it and the
   * scores fall back to a lightweight estimate from output + tool names.
   */
  toolTrace?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
};

export type TraceToolCall = {
  name: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
};

/**
 * Attach derived quality scores to an EXISTING Langfuse trace by id — used for the
 * streamText synthesis path, where the trace, generation, tool spans, model, and
 * token usage are already captured automatically by the `@langfuse/otel` span
 * processor (via `experimental_telemetry`). This function therefore creates no
 * trace and no generation; it only scores, which avoids the duplicate-trace
 * problem the old `traceChatCompletion` would cause on the OTel path.
 *
 * `traceId` comes from `getActiveTraceId()` captured inside the active root span.
 * When Langfuse is not configured (or no active trace), this is a safe no-op.
 *
 * Scores mirror `traceChatCompletion`: `response_quality` (NUMERIC 0–1),
 * `answered` (BOOLEAN), and `tool_failure` (BOOLEAN, only with a rich `toolTrace`).
 * Quality that the legacy path expressed as tags (`deflected`, `low_quality`,
 * `high_quality`) is intentionally represented as scores here — scores are the
 * filterable/alertable primitive, and trace tags on an OTel-owned trace can only
 * be set at span-creation time via `propagateAttributes`.
 */
export async function scoreChatTrace(params: {
  traceId: string | undefined;
  output: string;
  toolCallNames?: string[];
  toolTrace?: Array<Record<string, unknown>>;
}): Promise<void> {
  const lf = getClient();
  if (!lf || !params.traceId) return;

  const scores = computeTraceScores({
    output: params.output,
    toolCallNames: params.toolCallNames,
    toolTrace: params.toolTrace,
  });
  const comment = scores.reasons.join("; ").slice(0, 500);

  lf.score({
    traceId: params.traceId,
    name: "response_quality",
    value: scores.responseQuality,
    dataType: "NUMERIC",
    comment,
  });
  lf.score({
    traceId: params.traceId,
    name: "answered",
    value: scores.answered ? 1 : 0,
    dataType: "BOOLEAN",
    comment: scores.answered
      ? "substantive answer"
      : "empty response or meta-commentary deflection",
  });
  if (scores.toolFailure !== null) {
    lf.score({
      traceId: params.traceId,
      name: "tool_failure",
      value: scores.toolFailure ? 1 : 0,
      dataType: "BOOLEAN",
      comment,
    });
  }

  await lf.flushAsync();
}

/**
 * Run the code-owned LLM judge on a SAMPLE of responses and attach its scores to
 * an existing trace by id. Gated by `shouldRunJudge()` (env flag + sample rate),
 * so this is a safe no-op until explicitly enabled. Best-effort: judge failures
 * are swallowed and never affect the response.
 *
 * Scores: `llm_relevance`, `llm_specificity`, `llm_completeness` (all NUMERIC 0–1).
 * `llm_relevance` is the semantic counterpart to the heuristic `answered` score —
 * it catches deflection/off-topic answers the keyword check can't see.
 */
export async function maybeJudgeAndScore(params: {
  traceId: string | undefined;
  question: string;
  answer: string;
}): Promise<void> {
  const lf = getClient();
  if (!lf || !params.traceId || !params.answer.trim()) return;
  if (!shouldRunJudge()) return;

  try {
    const result = await judgeChatResponse({
      question: params.question,
      answer: params.answer,
    });
    const comment = result.reasoning.slice(0, 500);
    for (const [name, value] of [
      ["llm_relevance", result.relevance],
      ["llm_specificity", result.specificity],
      ["llm_completeness", result.completeness],
    ] as const) {
      lf.score({ traceId: params.traceId, name, value, dataType: "NUMERIC", comment });
    }
    await lf.flushAsync();
  } catch (error) {
    console.warn(
      "[langfuse] LLM judge failed (non-fatal)",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function traceChatCompletion(params: TraceParams): Promise<void> {
  const lf = getClient();
  if (!lf) return;

  // Derived scores (no extra LLM calls) attached to every trace below so
  // production traffic is continuously scored, not just observed.
  const scores = computeTraceScores({
    output: params.output,
    toolCallNames: params.toolCallNames,
    toolTrace: params.toolTrace,
  });
  // Prefer an explicit upstream qualityScore (0–100); else use the derived one.
  const qualityScore = params.qualityScore ?? scores.responseQuality * 100;

  const tags: string[] = [];
  if (params.intent) tags.push(`intent:${params.intent}`);
  if (params.wasRetried) tags.push("retried");
  if (!scores.answered) tags.push("deflected");
  if (qualityScore < 60) tags.push("low_quality");
  if (qualityScore >= 80) tags.push("high_quality");

  const traceMetadata: Record<string, unknown> = {
    intent: params.intent ?? "unknown",
    qualityScore,
    qualityReasons: params.qualityReasons ?? scores.reasons,
    wasRetried: params.wasRetried ?? false,
    retryReason: params.retryReason,
    stepCount: params.stepCount,
    toolCallNames: params.toolCallNames,
    selectedProjectId: params.selectedProjectId,
    ...params.metadata,
  };

  const trace = lf.trace({
    name: "ai-assistant-chat",
    userId: params.userId,
    sessionId: params.sessionId,
    input: params.input,
    output: params.output || null,
    tags,
    metadata: traceMetadata,
  });

  trace.generation({
    name: params.generationName ?? "streamText",
    model: params.modelId,
    input: params.input,
    output: params.output || null,
    usage: {
      input: params.usage?.inputTokens,
      output: params.usage?.outputTokens,
      unit: "TOKENS",
    },
    metadata: {
      cachedInputTokens: params.usage?.cachedInputTokens,
      stepCount: params.stepCount,
      toolCallNames: params.toolCallNames,
      intent: params.intent,
      ...params.metadata,
    },
  });

  // Attach derived scores so every trace is queryable/alertable on quality.
  const scoreComment = scores.reasons.join("; ").slice(0, 500);
  trace.score({
    name: "response_quality",
    value: scores.responseQuality,
    dataType: "NUMERIC",
    comment: scoreComment,
  });
  trace.score({
    name: "answered",
    value: scores.answered ? 1 : 0,
    dataType: "BOOLEAN",
    comment: scores.answered
      ? "substantive answer"
      : "empty response or meta-commentary deflection",
  });
  if (scores.toolFailure !== null) {
    trace.score({
      name: "tool_failure",
      value: scores.toolFailure ? 1 : 0,
      dataType: "BOOLEAN",
      comment: scoreComment,
    });
  }

  await lf.flushAsync();
}
