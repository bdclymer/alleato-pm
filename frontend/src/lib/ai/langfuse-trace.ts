import { Langfuse } from "langfuse";

import { computeTraceScores } from "@/lib/ai/score-response-quality";

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
