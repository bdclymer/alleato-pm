import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service";
import { type ToolGuardrails } from "./guardrails";

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
