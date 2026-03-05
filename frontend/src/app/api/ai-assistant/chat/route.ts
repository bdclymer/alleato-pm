import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { after } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  createStrategistTools,
  getStrategistSystemPrompt,
  STRATEGIST_MODEL,
} from "@/lib/ai/orchestrator";

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
  const { id: sessionId, messages } = body as {
    id: string;
    messages: UIMessage[];
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

  // Build C-Suite Strategist tools — includes consultCFO + base project tools.
  // When the Strategist decides a question is financial, it calls consultCFO,
  // which spawns a separate CFO agent with financial tools. The Strategist
  // synthesizes the CFO's analysis with cross-functional context.
  const modelMessages = await convertToModelMessages(messages);
  const tools = createStrategistTools(user.id, {
    onTrace: (trace) => {
      toolTrace.push(trace);
    },
  });
  const systemPrompt = getStrategistSystemPrompt();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(STRATEGIST_MODEL),
        system: systemPrompt,
        messages: modelMessages,
        tools,
        // Strategist gets 7 steps to route, consult specialists, and synthesize.
        // Each specialist gets up to 5 internal tool-call steps.
        stopWhen: stepCountIs(7),
        // LangFuse AI Observability — traces appear at https://us.cloud.langfuse.com
        experimental_telemetry: {
          isEnabled: true,
          functionId: "strategist-chat",
          metadata: {
            userId: user.id,
            sessionId,
            agent: "strategist",
            architecture: "csuite",
          },
        },
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

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("session_id", sessionId);
    },
    onError: () => "An error occurred while generating a response. Please try again.",
  });

  // Flush Langfuse span processor AFTER the response is sent.
  // Without this, streamText spans are dropped because the batch processor
  // hasn't shipped them before the serverless function shuts down.
  after(async () => {
    const processor = (globalThis as Record<string, unknown>)
      .__langfuseSpanProcessor as
      | { forceFlush: () => Promise<void> }
      | undefined;
    if (processor) {
      await processor.forceFlush();
    }
  });

  return createUIMessageStreamResponse({ stream });
}
