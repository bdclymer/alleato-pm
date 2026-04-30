export const EMBEDDING_MODEL = "text-embedding-3-large";
export const EMBEDDING_DIMENSIONS = 3072;
const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

export async function generateEmbedding(content: string): Promise<number[]> {
  if (!content.trim()) {
    throw new Error("Cannot embed empty content.");
  }

  const providers = embeddingProviders();
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const response = await fetch(`${provider.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: provider.model,
          input: content.slice(0, 8000),
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
      }
      const data = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
      const embedding = data.data?.[0]?.embedding;
      if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding?.length ?? 0}.`);
      }
      return embedding;
    } catch (error) {
      errors.push(`${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Embedding generation failed: ${errors.join(" | ")}`);
}

function embeddingProviders(): Array<{ name: string; baseUrl: string; apiKey: string; model: string }> {
  const providers: Array<{ name: string; baseUrl: string; apiKey: string; model: string }> = [];
  if (process.env.AI_GATEWAY_API_KEY) {
    providers.push({
      name: "AI Gateway",
      baseUrl: AI_GATEWAY_BASE_URL,
      apiKey: process.env.AI_GATEWAY_API_KEY,
      model: `openai/${EMBEDDING_MODEL}`,
    });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      model: EMBEDDING_MODEL,
    });
  }
  if (providers.length === 0) {
    throw new Error("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required for 3072-dim embeddings.");
  }
  return providers;
}
