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
  metadata?: Record<string, unknown>;
};

export async function traceChatCompletion(params: TraceParams): Promise<void> {
  const lf = getClient();
  if (!lf) return;

  const trace = lf.trace({
    name: "ai-assistant-chat",
    userId: params.userId,
    sessionId: params.sessionId,
    input: params.input,
    output: params.output,
    metadata: params.metadata,
  });

  trace.generation({
    name: "streamText",
    model: params.modelId,
    input: params.input,
    output: params.output,
    usage: {
      input: params.usage?.inputTokens,
      output: params.usage?.outputTokens,
      unit: "TOKENS",
    },
  });

  await lf.flushAsync();
}
