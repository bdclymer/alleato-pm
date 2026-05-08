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

      const systemPrompt = assembleSystemPromptFromContext(plan, retrievalCtx, baseSystemPrompt);

      const tools = createStrategistTools(args.user.id, {
        pinnedProjectId: args.selectedProjectId,
      });

      const result = streamText({
        model: getLanguageModel(args.activeModel),
        system: systemPrompt,
        messages: await convertToModelMessages(args.messages),
        tools,
        maxOutputTokens: 1500,
        stopWhen: stepCountIs(10),
      });

      writer.merge(result.toUIMessageStream({ originalMessages: args.messages }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
