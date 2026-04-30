import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service";
import { type ToolGuardrails } from "./guardrails";

// ---------------------------------------------------------------------------
// Embedding config registry
// ---------------------------------------------------------------------------
// Index dimensions are schema-bound. Changing a model requires a matching
// pgvector index migration (e.g. halfvec(3072) → re-index all rows).

export const EMBEDDING = {
  /** halfvec(3072) — document_chunks, document_metadata, knowledge tables */
  LARGE: { model: "text-embedding-3-large", dimensions: 3072 } as const,
  /** vector(1536) — ai_memories.embedding */
  SMALL: { model: "text-embedding-3-small", dimensions: 1536 } as const,
} as const;

/**
 * Generate an embedding and return it JSON-stringified for use in RPC args.
 * NOTE: The return value is already a JSON string — do NOT wrap it in JSON.stringify() again.
 * Pass the result directly as the RPC argument (e.g. `query_embedding: queryEmbedding`).
 */
export async function generateEmbedding(
  openai: OpenAI,
  input: string,
  config: typeof EMBEDDING.LARGE | typeof EMBEDDING.SMALL,
): Promise<string> {
  const modelId = process.env.AI_GATEWAY_API_KEY
    ? `openai/${config.model}`
    : config.model;
  const resp = await openai.embeddings.create({
    model: modelId,
    input,
    ...(config.dimensions !== 1536 ? { dimensions: config.dimensions } : {}),
  });
  if (!resp.data[0]?.embedding) {
    throw new Error(
      `Embedding API returned empty data for model ${modelId}. Check API key and gateway config.`,
    );
  }
  return JSON.stringify(resp.data[0].embedding);
}

// ---------------------------------------------------------------------------
// Briefing & reranking helpers (shared by semanticSearch + searchMeetingsByTopic)
// ---------------------------------------------------------------------------

/** Keywords that signal a PM briefing intent — used to tune ranking and recall. */
export function isBriefingQuery(query: string): boolean {
  const q = query.toLowerCase();
  return [
    "latest", "brief", "briefing", "catch me up", "update",
    "what's happening", "what is happening", "status", "how is", "how's",
    "progress", "any news", "what happened", "recent", "risk", "risks",
    "tracking", "right now", "should know",
  ].some((kw) => q.includes(kw));
}

export function rankBriefingSourcePriority(sourceTable: string): number {
  if (sourceTable === "meeting_transcript") return 0;
  if (sourceTable === "meeting_summary") return 1;
  if (sourceTable === "email") return 2;
  if (sourceTable === "teams_channel") return 3;
  if (sourceTable === "teams_message") return 4;
  if (sourceTable === "teams_dm") return 5;
  if (sourceTable === "insight") return 6;
  if (sourceTable === "knowledge_base") return 7;
  return 8;
}

/** Rerank candidates using LLM as cross-encoder. Returns indices sorted by relevance. */
export async function rerankWithLLM(
  openai: OpenAI,
  query: string,
  candidates: Array<{ content: string; sourceTable: string }>,
  topK: number = 10,
): Promise<number[]> {
  try {
    const candidateList = candidates
      .slice(0, 20)
      .map((c, i) => `[${i}] (${c.sourceTable}) ${c.content.substring(0, 300)}`)
      .join("\n\n");

    const briefingHint = isBriefingQuery(query)
      ? " For project status or briefing queries, prefer recent meeting transcripts, emails, and Teams messages over general reference documents."
      : "";

    const response = await openai.chat.completions.create({
      model: process.env.AI_GATEWAY_API_KEY ? "openai/gpt-4.1-mini" : "gpt-4.1-mini",
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content:
            "You are a relevance judge for a construction project management assistant. " +
            "Given a query and numbered text passages, return ONLY a JSON array of passage " +
            "indices sorted by relevance to the query, most relevant first. " +
            "Include only passages that are actually relevant." +
            briefingHint +
            " Example output: [3, 0, 7, 1]",
        },
        {
          role: "user",
          content: `Query: ${query}\n\nPassages:\n${candidateList}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() || "[]";
    const jsonText = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const indices = JSON.parse(jsonText) as number[];
    return indices
      .filter((i) => typeof i === "number" && i >= 0 && i < candidates.length)
      .slice(0, topK);
  } catch (err) {
    // Reranking failed — fall back to vector-similarity order.
    // Log so gateway/API issues don't go unnoticed in production.
    console.error("[rerankWithLLM] fallback to original order:", err instanceof Error ? err.message : err);
    return candidates.slice(0, topK).map((_, i) => i);
  }
}

export type ToolTracePayload = {
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  timestamp: string;
};

export function asNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function withTrace<TInput extends Record<string, unknown>, TResult>(
  name: string,
  options: { onTrace?: (trace: ToolTracePayload) => void },
  execute: (input: TInput) => Promise<TResult>,
  errorGuidance: string,
): (input: TInput) => Promise<TResult> {
  return async (input: TInput): Promise<TResult> => {
    try {
      const output = await execute(input);
      options.onTrace?.({
        tool: name,
        input,
        output,
        timestamp: new Date().toISOString(),
      });
      return output;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown tool error";
      options.onTrace?.({
        tool: name,
        input,
        error: message,
        timestamp: new Date().toISOString(),
      });
      return {
        error: message,
        source: name,
        guidance: errorGuidance,
      } as TResult;
    }
  };
}

/** Lazy OpenAI singleton — AI Gateway with OPENAI_API_KEY fallback. */
let _openai: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_openai) {
    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (gatewayKey) {
      _openai = new OpenAI({ apiKey: gatewayKey, baseURL: "https://ai-gateway.vercel.sh/v1" });
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("AI_GATEWAY_API_KEY or OPENAI_API_KEY not set");
      _openai = new OpenAI({ apiKey });
    }
  }
  return _openai;
}

export function getOpenAIModelId(modelId: string): string {
  return process.env.AI_GATEWAY_API_KEY ? `openai/${modelId}` : modelId;
}

/**
 * withWriteTrace — for mutation tools.
 * Re-throws on error so failures surface loudly in the stream rather than
 * returning a silent structured {error} response. Contrast with withTrace
 * (read tools) which catches and returns structured errors.
 */
export function withWriteTrace<TInput extends Record<string, unknown>, TResult>(
  name: string,
  options: { onTrace?: (trace: ToolTracePayload) => void },
  execute: (input: TInput) => Promise<TResult>,
): (input: TInput) => Promise<TResult> {
  return async (input: TInput): Promise<TResult> => {
    try {
      const output = await execute(input);
      options.onTrace?.({ tool: name, input, output, timestamp: new Date().toISOString() });
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      options.onTrace?.({ tool: name, input, error: message, timestamp: new Date().toISOString() });
      throw error;
    }
  };
}

export async function resolveProject(
  supabase: ReturnType<typeof createServiceClient>,
  guardrails: ToolGuardrails,
  projectId?: number,
  projectName?: string,
): Promise<{ id: number; name: string } | { error: string }> {
  const scopedProjectIds = await guardrails.getScopedProjectIds(projectId);
  if (scopedProjectIds.length === 0) {
    return { error: "You do not have access to that project." };
  }

  const effectiveProjectId =
    typeof projectId === "number" && Number.isFinite(projectId)
      ? projectId
      : scopedProjectIds.length === 1
        ? scopedProjectIds[0]
        : undefined;

  if (effectiveProjectId) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", effectiveProjectId)
      .single();
    if (error || !data) return { error: `Project ${effectiveProjectId} not found` };
    return { id: data.id, name: data.name ?? "" };
  }
  if (projectName) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", scopedProjectIds)
      .ilike("name", `%${projectName}%`)
      .limit(1)
      .single();
    if (error || !data)
      return { error: `No project found matching "${projectName}"` };
    return { id: data.id, name: data.name ?? "" };
  }
  return { error: "Provide either projectId or projectName" };
}
