import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { after } from "next/server";
import { context, trace } from "@opentelemetry/api";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  buildCouncilModePromptInjection,
  createStrategistTools,
  getStrategistSystemPrompt,
  STRATEGIST_MODEL,
} from "@/lib/ai/orchestrator";
import {
  generateConversationMemory,
  getRecentConversationSummaries,
  buildRecentConversationsBlock,
} from "@/lib/ai/services/conversation-memory";
import {
  getMemoriesForSession,
  buildMemoryContextBlock,
} from "@/lib/ai/services/ai-memory-service";
import { extractAndStoreMemories } from "@/lib/ai/services/memory-extraction";

export const maxDuration = 120;

function extractTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function isPortfolioRiskQuery(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasRiskLanguage =
    normalized.includes("risk") ||
    normalized.includes("risky") ||
    normalized.includes("at risk") ||
    normalized.includes("critical item") ||
    normalized.includes("critical items") ||
    normalized.includes("exposure");
  const hasPortfolioLanguage =
    normalized.includes("project") ||
    normalized.includes("projects") ||
    normalized.includes("portfolio") ||
    normalized.includes("jobs");
  return hasRiskLanguage && hasPortfolioLanguage;
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
  const lastUserContent = lastUserMessage
    ? extractTextFromParts(lastUserMessage.parts)
    : "";

  // Inject user memories into the system prompt.
  // Preferences are always included. Semantically relevant facts/lessons/
  // context/commitments are retrieved based on the current message.
  let systemPrompt = getStrategistSystemPrompt();
  if (lastUserContent) {
    try {
      // Run memory fetches in parallel — typed memories + recent session summaries.
      // Recent summaries are only injected on the FIRST turn of a session
      // (messages.length === 1) so they don't bloat every subsequent turn.
      const isFirstTurn = messages.length === 1;

      const [{ preferences, relevant, team }, recentSummaries] =
        await Promise.all([
          getMemoriesForSession({
            userId: user.id,
            firstMessage: lastUserContent,
          }),
          isFirstTurn
            ? getRecentConversationSummaries(user.id, sessionId, 3)
            : Promise.resolve([]),
        ]);

      const memoryBlock = buildMemoryContextBlock(preferences, relevant, team);
      const recentBlock = buildRecentConversationsBlock(recentSummaries);

      // Layer the context blocks before the main system prompt:
      // [Recent conversations] → [Typed memories] → [System prompt]
      // This order ensures the AI reads the most personal/recent context first.
      const contextParts = [recentBlock, memoryBlock].filter(Boolean);
      if (contextParts.length > 0) {
        systemPrompt = contextParts.join("\n\n") + "\n\n---\n\n" + systemPrompt;
      }
    } catch {
      // Memory injection failure is non-fatal — continue without it
    }
  }

  // Selected project context — injected when user pins a project in the UI.
  // Tells the AI to default all project-specific questions to this project
  // without requiring explicit disambiguation.
  if (selectedProjectId) {
    try {
      const { data: project } = await supabase
        .from("projects")
        .select("name, project_number, phase, client, health_status")
        .eq("id", selectedProjectId)
        .single();

      if (project) {
        const projectLine = [
          project.name,
          project.project_number ? `#${project.project_number}` : null,
          project.phase ? `Phase: ${project.phase}` : null,
          project.client ? `Client: ${project.client}` : null,
          project.health_status ? `Status: ${project.health_status}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

        systemPrompt +=
          `\n\n## Active Project Context\n` +
          `The user has pinned: **${projectLine}**\n` +
          `Assume all project-specific questions refer to this project unless the user explicitly mentions a different one. ` +
          `Skip disambiguation steps and go straight to retrieving data for this project.`;
      }
    } catch {
      // Non-fatal — continue without project context
    }
  }

  if (lastUserContent && isPortfolioRiskQuery(lastUserContent)) {
    systemPrompt +=
      "\n\n## Runtime Risk Routing Override\n" +
      "For THIS request, you MUST call consultCFO before any other tool. " +
      "Then ensure CFO analysis includes getProjectsWithRisks output before final answer.";
  }

  // Council Mode — multi-voice C-Suite session.
  // Overrides the normal synthesize-and-present flow: each specialist speaks
  // in their own voice, labeled with their icon, and the Strategist adds only
  // a brief closing synthesis. Inspired by BMAD party-mode.
  if (councilMode) {
    systemPrompt += buildCouncilModePromptInjection();
  }
  const tracer = trace.getTracer("ai-assistant");
  const requestSpan = tracer.startSpan("ai-assistant.chat.request");
  let requestSpanEnded = false;
  const endRequestSpan = () => {
    if (requestSpanEnded) return;
    requestSpanEnded = true;
    requestSpan.end();
  };
  requestSpan.setAttribute("user.id", user.id);
  requestSpan.setAttribute("session.id", sessionId);
  // Compatibility keys used by some Langfuse views/indexers.
  requestSpan.setAttribute("langfuse.user.id", user.id);
  requestSpan.setAttribute("langfuse.session.id", sessionId);
  requestSpan.setAttribute("langfuse.trace.metadata.route", "ai-assistant.chat");

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = context.with(
        trace.setSpan(context.active(), requestSpan),
        () =>
          streamText({
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
          }),
      );

      writer.merge(result.toUIMessageStream());

      // Await totalUsage AFTER merge — resolves when stream completes.
      // totalUsage accumulates across ALL agent steps (not just the last),
      // which is correct for multi-step agents using stopWhen.
      totalUsage = await result.totalUsage;
      requestSpan.setAttribute(
        "langfuse.trace.metadata.token_total",
        totalUsage?.totalTokens ?? 0,
      );
      requestSpan.setAttribute("langfuse.trace.metadata.status", "ok");
      endRequestSpan();
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

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("session_id", sessionId);
    },
    onError: () => {
      requestSpan.setAttribute("langfuse.trace.metadata.status", "error");
      endRequestSpan();
      return "An error occurred while generating a response. Please try again.";
    },
  });

  // Post-response tasks — run AFTER the streaming response is sent.
  // Zero impact on user-facing latency.
  after(async () => {
    // Ensure the request span is always closed before flushing telemetry,
    // including client disconnect/abort paths.
    endRequestSpan();

    // 1. Flush Langfuse span processor so streamText spans aren't dropped
    //    when the serverless function shuts down.
    const processor = (globalThis as Record<string, unknown>)
      .__langfuseSpanProcessor as
      | { forceFlush: () => Promise<void> }
      | undefined;
    if (processor) {
      await processor.forceFlush();
    }

    // 2. Generate conversation memory — summarize + embed this conversation
    //    so the AI can recall it in future sessions.
    try {
      await generateConversationMemory(sessionId, user.id);
    } catch (e) {
      console.error("[conversation-memory] failed:", e);
    }

    // 3. Extract and store durable typed memories (facts, preferences,
    //    lessons, commitments, context) from this conversation.
    try {
      await extractAndStoreMemories(sessionId, user.id);
    } catch (e) {
      console.error("[memory-extraction] failed:", e);
    }
  });

  return createUIMessageStreamResponse({ stream });
}
