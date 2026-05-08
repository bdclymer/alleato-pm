import {
  streamText,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planRetrieval } from "@/lib/ai/retrieval/planner";
import { executeRetrievalPlan } from "@/lib/ai/retrieval/executor";
import { assembleSystemPromptFromContext } from "@/lib/ai/retrieval/system-prompt";
import { buildExecutorDeps } from "@/lib/ai/retrieval/deps";
import { assembleSystemPrompt } from "@/lib/ai/bot-core";
import { createStrategistTools } from "@/lib/ai/orchestrator";
import { getLanguageModel } from "@/lib/ai/providers";

type HandlerArgs = {
  user: { id: string };
  sessionId: string;
  messages: UIMessage[];
  selectedProjectId?: number;
  activeModel: string;
  supabase: SupabaseClient;
};

function extractTextFromParts(parts: UIMessage["parts"]): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => (p as { type?: string }).type === "text")
    .map((p) => ((p as { text?: string }).text ?? ""))
    .join(" ");
}

export async function handleChatV2(args: HandlerArgs): Promise<Response> {
  const lastUserMessage = [...args.messages].reverse().find((m) => m.role === "user");
  const lastUserContent = lastUserMessage ? extractTextFromParts(lastUserMessage.parts) : "";

  const plan = planRetrieval({
    message: lastUserContent,
    selectedProjectId: args.selectedProjectId,
    messages: args.messages,
  });

  const stream = createUIMessageStream({
    originalMessages: args.messages,
    execute: async ({ writer }) => {
      writer.write({
        type: "data-status",
        id: "strategist-status",
        data: {
          stage: "planning",
          message: `Plan: ${plan.reason}`,
          status: "loading",
          timestamp: new Date().toISOString(),
        },
      } as never);

      // Run base system prompt assembly (memory load + project context)
      // and retrieval execution IN PARALLEL — they don't depend on each other.
      const [baseSystemPrompt, retrievalCtx] = await Promise.all([
        assembleSystemPrompt({
          userId: args.user.id,
          messageText: lastUserContent,
          selectedProjectId: args.selectedProjectId,
          sessionId: args.sessionId,
          isFirstTurn: args.messages.length === 1,
        }),
        executeRetrievalPlan(
          plan,
          buildExecutorDeps({ supabase: args.supabase, userId: args.user.id }),
          { sessionId: args.sessionId, message: lastUserContent },
        ),
      ]);

      writer.write({
        type: "data-status",
        id: "strategist-status",
        data: {
          stage: "retrieval-complete",
          message: `Retrieved (${Object.keys(retrievalCtx.durationsMs).length} sources, ${retrievalCtx.warnings.length} warnings)`,
          status: retrievalCtx.warnings.length > 0 ? "warning" : "success",
          durations: retrievalCtx.durationsMs,
          timestamp: new Date().toISOString(),
        },
      } as never);

      const fullSystemPrompt = assembleSystemPromptFromContext(plan, retrievalCtx, baseSystemPrompt);
      // TEMP: bisect — try with minimal prompt to confirm whether prompt content itself triggers the error
      const minimalSystemPrompt = "You are Alleato, an AI assistant for construction project management. Answer the user's question briefly using available knowledge.";
      const systemPrompt = process.env.HANDLER_V2_MINIMAL_PROMPT === "true" ? minimalSystemPrompt : fullSystemPrompt;

      const tools = createStrategistTools(args.user.id, {
        pinnedProjectId: args.selectedProjectId,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("[handler-v2] streamText input", {
          plan_reason: plan.reason,
          system_prompt_chars: systemPrompt.length,
          system_prompt_approx_tokens: Math.round(systemPrompt.length / 4),
          retrieval_durations: retrievalCtx.durationsMs,
          warnings: retrievalCtx.warnings,
          has_intelligence_packet: Boolean(retrievalCtx.intelligencePacket),
          has_project_snapshot: Boolean(retrievalCtx.projectSnapshot),
          has_semantic_results: Boolean(retrievalCtx.semanticVectorResults),
          message_count: args.messages.length,
          tool_count: Object.keys(tools).length,
          model: args.activeModel,
        });
      }

      const result = streamText({
        model: getLanguageModel(args.activeModel),
        system: systemPrompt,
        messages: await convertToModelMessages(args.messages),
        // tools, // TEMP: testing if 102-tool registry causes finishReason:other
        maxOutputTokens: 4000,
        stopWhen: stepCountIs(10),
        onError: ({ error }) => {
          console.error("[handler-v2] streamText onError", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5).join("\n") : undefined,
          });
        },
        onFinish: ({ finishReason, usage, text, toolCalls }) => {
          console.log("[handler-v2] streamText onFinish", {
            finishReason,
            usage,
            text_chars: text?.length ?? 0,
            text_preview: text?.slice(0, 200) ?? "",
            tool_calls: toolCalls?.map((c) => c.toolName) ?? [],
          });
        },
      });

      writer.merge(result.toUIMessageStream({ originalMessages: args.messages }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
