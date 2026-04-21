import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
  type ToolSet,
} from "ai";
import { after } from "next/server";

import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  createStrategistTools,
  STRATEGIST_MODEL,
} from "@/lib/ai/orchestrator";
import {
  assembleSystemPrompt,
  type BotLearningUsageSummary,
  type MemoryUsageSummary,
  runPostResponseTasks,
} from "@/lib/ai/bot-core";
import { recordAgentLearningUsages } from "@/lib/ai/services/agent-learning-service";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";

export const maxDuration = 120;

type ResponseQuality = {
  confidence: "high" | "medium" | "low";
  sourceQuality: "high" | "medium" | "low";
  score: number;
  reasons: string[];
};

function scoreResponseQuality(params: {
  toolTrace: Array<Record<string, unknown>>;
  content: string;
}): ResponseQuality {
  const reasons: string[] = [];
  const trace = params.toolTrace;
  const successfulToolCalls = trace.filter((t) => !t.error).length;
  const failedToolCalls = trace.filter((t) => t.error).length;
  const sourceRefsInText = (params.content.match(/\[Source:/g) ?? []).length;

  let score = 50;
  if (successfulToolCalls >= 3) {
    score += 25;
    reasons.push("multiple successful tool calls");
  } else if (successfulToolCalls >= 1) {
    score += 12;
    reasons.push("at least one successful tool call");
  } else {
    reasons.push("no successful tool calls");
  }

  if (sourceRefsInText >= 2) {
    score += 15;
    reasons.push("multiple source citations");
  } else if (sourceRefsInText === 1) {
    score += 8;
    reasons.push("single source citation");
  } else {
    reasons.push("no source citations in final response");
  }

  if (failedToolCalls > 0) {
    score -= Math.min(20, failedToolCalls * 5);
    reasons.push(`${failedToolCalls} tool call failure(s)`);
  }

  score = Math.max(0, Math.min(100, score));

  const confidence: ResponseQuality["confidence"] =
    score >= 80 ? "high" : score >= 60 ? "medium" : "low";
  const sourceQuality: ResponseQuality["sourceQuality"] =
    sourceRefsInText >= 2 ? "high" : sourceRefsInText === 1 ? "medium" : "low";

  return { confidence, sourceQuality, score, reasons };
}

function extractTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export const POST = withApiGuardrails(
  "ai-assistant/chat#POST",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/chat#POST",
        message: "Unauthorized",
        status: 401,
      });
    }

    const body = await request.json();
    const { id: sessionId, messages, councilMode, selectedProjectId } = body as {
      id: string;
      messages: UIMessage[];
      councilMode?: boolean;
      selectedProjectId?: number;
    };

    if (!sessionId || !messages?.length) {
      return new Response("session id and messages are required", {
        status: 400,
      });
    }

    const supabase = createServiceClient();
    const toolTrace: Array<Record<string, unknown>> = [];
    let memoryUsage: MemoryUsageSummary | undefined;
    let learningUsage: BotLearningUsageSummary | undefined;

    // Token usage tracking — populated inside execute(), read in onFinish()
    let totalUsage: {
      inputTokens: number | undefined;
      outputTokens: number | undefined;
      totalTokens: number | undefined;
    } | undefined;
    let latestResponseQuality: ResponseQuality | undefined;

    // Persist the latest user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      const content = extractTextFromParts(lastUserMessage.parts);
      if (content.trim()) {
        await supabase.from("chat_history").insert({
          session_id: sessionId,
          user_id: user.id,
          role: "user",
          content,
        });
      }
    }

    // Build tools and system prompt using shared bot-core logic
    const modelMessages = await convertToModelMessages(messages);
    const tools = createStrategistTools(user.id, {
      onTrace: (trace) => {
        toolTrace.push(trace);
      },
      pinnedProjectId: selectedProjectId,
    });
    const lastUserContent = lastUserMessage
      ? extractTextFromParts(lastUserMessage.parts)
      : "";

    const systemPrompt = await assembleSystemPrompt({
      userId: user.id,
      messageText: lastUserContent,
      selectedProjectId,
      councilMode,
      sessionId,
      isFirstTurn: messages.length === 1,
      onMemoryUsage: (usage) => {
        memoryUsage = usage;
      },
      onLearningUsage: (usage) => {
        learningUsage = usage;
      },
    });
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: getLanguageModel(STRATEGIST_MODEL),
          system: systemPrompt,
          messages: modelMessages,
          tools: tools as unknown as ToolSet,
          // Strategist gets 7 steps to route, consult specialists, and synthesize.
          // Each specialist gets up to 5 internal tool-call steps.
          stopWhen: stepCountIs(7),
        });

        writer.merge(result.toUIMessageStream());

        // Await totalUsage AFTER merge — resolves when stream completes.
        // totalUsage accumulates across ALL agent steps (not just the last),
        // which is correct for multi-step agents using stopWhen.
        totalUsage = await result.totalUsage;
      },
      onFinish: async ({ messages: finishedMessages }) => {
        // Persist assistant messages
        for (const msg of finishedMessages) {
          if (msg.role === "assistant") {
            const content = extractTextFromParts(msg.parts);
            if (content.trim()) {
              const responseQuality = scoreResponseQuality({
                toolTrace,
                content,
              });
              latestResponseQuality = responseQuality;
              await supabase.from("chat_history").insert({
                session_id: sessionId,
                user_id: user.id,
                role: "assistant",
                content,
                metadata: JSON.parse(
                  JSON.stringify({
                    tool_trace: toolTrace,
                    model: STRATEGIST_MODEL,
                    architecture: "csuite",
                    councilMode: councilMode ?? false,
                    memory_usage: memoryUsage
                      ? {
                          totalUsed: memoryUsage.totalUsed,
                          preferencesUsed: memoryUsage.preferencesUsed,
                          relevantUsed: memoryUsage.relevantUsed,
                          teamUsed: memoryUsage.teamUsed,
                          recentConversationsUsed: memoryUsage.recentConversationsUsed,
                          memories: memoryUsage.memories.map((memory) => ({
                            id: memory.id,
                            type: memory.type,
                            content:
                              memory.content.length > 240
                                ? `${memory.content.slice(0, 240)}...`
                                : memory.content,
                          })),
                        }
                      : null,
                    learning_usage: learningUsage
                      ? {
                          totalUsed: learningUsage.totalUsed,
                          learnings: learningUsage.learnings.map((learning) => ({
                            id: learning.id,
                            title: learning.title,
                            source: learning.source,
                          })),
                        }
                      : null,
                    usage: totalUsage
                      ? {
                          inputTokens: totalUsage.inputTokens ?? 0,
                          outputTokens: totalUsage.outputTokens ?? 0,
                          totalTokens: totalUsage.totalTokens ?? 0,
                        }
                      : null,
                    response_quality: responseQuality,
                  }),
                ),
              });
            }
          }
        }

        // Update conversation timestamp — scope to user to prevent cross-user update
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("session_id", sessionId)
          .eq("user_id", user.id);

        if (learningUsage?.learnings.length) {
          await recordAgentLearningUsages({
            sessionId,
            userId: user.id,
            messageText: lastUserContent,
            responseQualityScore: latestResponseQuality?.score,
            learnings: learningUsage.learnings,
          });
        }
      },
      onError: () => {
        return "An error occurred while generating a response. Please try again.";
      },
    });

    // Post-response tasks — run AFTER the streaming response is sent.
    // Zero impact on user-facing latency.
    after(() => runPostResponseTasks(sessionId, user.id));

    return createUIMessageStreamResponse({ stream });
  },
);
