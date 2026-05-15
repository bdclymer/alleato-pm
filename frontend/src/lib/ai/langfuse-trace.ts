import { Langfuse } from "langfuse";

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
  usage?: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number };
  intent?: string;
  qualityScore?: number;
  qualityReasons?: string[];
  wasRetried?: boolean;
  retryReason?: string;
  stepCount?: number;
  toolCallNames?: string[];
  selectedProjectId?: number | null;
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

  const tags: string[] = [];
  if (params.intent) tags.push(`intent:${params.intent}`);
  if (params.wasRetried) tags.push("retried");
  if ((params.qualityScore ?? 100) < 60) tags.push("low_quality");
  if ((params.qualityScore ?? 100) >= 80) tags.push("high_quality");

  const traceMetadata: Record<string, unknown> = {
    intent: params.intent ?? "unknown",
    qualityScore: params.qualityScore,
    qualityReasons: params.qualityReasons,
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
    name: "streamText",
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

  await lf.flushAsync();
}
