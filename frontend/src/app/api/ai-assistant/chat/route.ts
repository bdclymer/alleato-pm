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
  runPostResponseTasks,
} from "@/lib/ai/bot-core";

export const maxDuration = 120;

function extractTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(request: Request) {
  const user = await getApiRouteUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
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

  // Token usage tracking — populated inside execute(), read in onFinish()
  let totalUsage: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
  } | undefined;

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
                  usage: totalUsage
                    ? {
                        inputTokens: totalUsage.inputTokens ?? 0,
                        outputTokens: totalUsage.outputTokens ?? 0,
                        totalTokens: totalUsage.totalTokens ?? 0,
                      }
                    : null,
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
    },
    onError: () => {
      return "An error occurred while generating a response. Please try again.";
    },
  });

  // Post-response tasks — run AFTER the streaming response is sent.
  // Zero impact on user-facing latency.
  after(() => runPostResponseTasks(sessionId, user.id));

  return createUIMessageStreamResponse({ stream });
}
