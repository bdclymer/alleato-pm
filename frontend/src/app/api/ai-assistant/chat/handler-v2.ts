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
import {
  createWeeklyMarketingContentWorkflow,
  type CmoWeeklyContentWorkflowResult,
} from "@/lib/ai/services/marketing-service";

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

function isCmoWeeklyContentWorkflowRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const asksForCalendar =
    normalized.includes("content calendar") ||
    normalized.includes("marketing plan") ||
    normalized.includes("weekly content") ||
    normalized.includes("next week's content") ||
    normalized.includes("next week content");
  const hasMarketingSourceLanguage = [
    "project win",
    "project wins",
    "owner update",
    "owner updates",
    "leadership thought",
    "leadership thoughts",
    "social",
    "linkedin",
    "case study",
    "testimonial",
    "campaign",
  ].some((phrase) => normalized.includes(phrase));

  return asksForCalendar && hasMarketingSourceLanguage;
}

function formatCmoWeeklyContentWorkflowResponse(
  result: CmoWeeklyContentWorkflowResult,
): string {
  const calendarLines = result.calendarItems.map((item, index) => {
    const source = result.sourceCandidates[index];
    return [
      `- ${item.planned_date}: ${item.channel} / ${item.funnel_stage}`,
      `  ${item.title}`,
      `  Source: ${source.citationText}`,
    ].join("\n");
  });

  return [
    "I created a CMO weekly content calendar draft and saved the draft assets for review.",
    "",
    `Week start: ${result.weekStartDate}`,
    `Source-backed intelligence items: ${result.intelligenceItems.length}`,
    `Calendar items: ${result.calendarItems.length}`,
    `Draft assets: ${result.assets.length}`,
    "",
    "Draft calendar:",
    ...calendarLines,
    "",
    `Review page: ${result.reviewHref}`,
    "",
    "These are drafts only. Nothing is approved or externally published until the review status is changed.",
  ].join("\n");
}

function writeTextResponse(
  writer: Parameters<Parameters<typeof createUIMessageStream>[0]["execute"]>[0]["writer"],
  id: string,
  content: string,
) {
  writer.write({ type: "text-start", id });
  writer.write({ type: "text-delta", id, delta: content });
  writer.write({ type: "text-end", id });
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

      if (isCmoWeeklyContentWorkflowRequest(lastUserContent)) {
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "knowledge",
            message: "Consulting CMO and saving weekly content drafts",
            status: "loading",
            timestamp: new Date().toISOString(),
          },
        } as never);

        if (lastUserContent.trim()) {
          await args.supabase.from("chat_history").insert({
            session_id: args.sessionId,
            user_id: args.user.id,
            role: "user",
            content: lastUserContent,
          });
        }

        const workflowResult = await createWeeklyMarketingContentWorkflow({
          createdBy: args.user.id,
          projectId: args.selectedProjectId ?? null,
        });
        const content = formatCmoWeeklyContentWorkflowResponse(workflowResult);

        writeTextResponse(writer, "strategist-cmo-weekly-content-v2", content);

        await args.supabase.from("chat_history").insert({
          session_id: args.sessionId,
          user_id: args.user.id,
          role: "assistant",
          content,
          metadata: {
            architecture: "retrieval-planner-v2",
            tool_trace: [
              {
                tool: "consultCMOPhase1Workflow",
                input: {
                  message: lastUserContent.slice(0, 240),
                  selectedProjectId: args.selectedProjectId ?? null,
                },
                output: {
                  weekStartDate: workflowResult.weekStartDate,
                  sourceCandidateCount: workflowResult.sourceCandidates.length,
                  intelligenceItemIds: workflowResult.intelligenceItems.map((item) => item.id),
                  calendarItemIds: workflowResult.calendarItems.map((item) => item.id),
                  assetIds: workflowResult.assets.map((asset) => asset.id),
                  reviewHref: workflowResult.reviewHref,
                },
                timestamp: new Date().toISOString(),
              },
            ],
          },
        });

        await args.supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("session_id", args.sessionId)
          .eq("user_id", args.user.id);

        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "complete",
            message: "CMO content calendar saved",
            status: "success",
            timestamp: new Date().toISOString(),
          },
        } as never);
        return;
      }

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
