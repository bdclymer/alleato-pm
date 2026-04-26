import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
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
import { createToolGuardrails } from "@/lib/ai/tools/guardrails";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";

export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Tool-loop diagnostic — captured via onStepFinish, persisted per message.
// Gives us finish reason, warnings, step count, and tool call count without
// touching live stream latency.
// ---------------------------------------------------------------------------
type StepDiagnostic = {
  stepNumber: number;
  finishReason: string;
  toolCallCount: number;
  toolCallNames: string[];
  warningCount: number;
  warnings: string[];
  inputTokens: number | undefined;
  outputTokens: number | undefined;
};

type LoopDiagnostic = {
  steps: StepDiagnostic[];
  totalStepCount: number;
  totalToolCallCount: number;
  finalFinishReason: string;
  totalWarningCount: number;
};

function buildLoopDiagnostic(steps: StepDiagnostic[]): LoopDiagnostic {
  return {
    steps,
    totalStepCount: steps.length,
    totalToolCallCount: steps.reduce((n, s) => n + s.toolCallCount, 0),
    finalFinishReason: steps.at(-1)?.finishReason ?? "unknown",
    totalWarningCount: steps.reduce((n, s) => n + s.warningCount, 0),
  };
}

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

function shouldForceBusinessRetrieval(message: string): boolean {
  const normalized = message.toLowerCase();
  if (normalized.length < 20) return false;

  return [
    "project",
    "briefing",
    "brief",
    "status",
    "latest",
    "update",
    "risk",
    "budget",
    "cost",
    "schedule",
    "meeting",
    "email",
    "teams",
    "oneDrive".toLowerCase(),
    "acumatica",
    "invoice",
    "commitment",
    "change order",
    "rfi",
    "submittal",
    "owner",
    "vendor",
    "exol",
  ].some((keyword) => normalized.includes(keyword));
}

function extractLookupTerms(message: string): string[] {
  const capitalizedPhrases =
    message.match(/\b[A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,3}/g) ?? [];
  const wordTerms =
    message.match(/\b[A-Za-z][A-Za-z0-9&.'-]{3,}\b/g) ?? [];
  const ignored = new Set([
    "give",
    "project",
    "manager",
    "briefing",
    "data",
    "missing",
    "explain",
    "checked",
    "next",
    "best",
    "move",
    "status",
    "latest",
  ]);

  return [...capitalizedPhrases, ...wordTerms]
    .map((term) => term.trim().replace(/[?.!,;:]+$/g, ""))
    .filter((term) => term.length >= 4)
    .filter((term) => !ignored.has(term.toLowerCase()))
    .slice(0, 12);
}

async function buildBusinessContextPreflight(params: {
  userId: string;
  message: string;
  selectedProjectId?: number;
}): Promise<{
  promptInjection: string;
  trace: Record<string, unknown>;
}> {
  const supabase = createServiceClient();
  const guardrails = createToolGuardrails(params.userId, {
    pinnedProjectId: params.selectedProjectId,
  });
  const scope = await guardrails.getScope();
  const terms = extractLookupTerms(params.message);
  const projectMatches: Array<Record<string, unknown>> = [];

  if (typeof params.selectedProjectId === "number") {
    const access = await guardrails.enforceProjectAccess(params.selectedProjectId);
    if (access.ok) {
      const { data } = await supabase
        .from("projects")
        .select("id, name, project_number, phase, current_phase, client, health_status, completion_percentage, summary")
        .eq("id", params.selectedProjectId)
        .maybeSingle();
      if (data) projectMatches.push(data as Record<string, unknown>);
    }
  }

  for (const term of terms) {
    if (projectMatches.length >= 5) break;

    let query = supabase
      .from("projects")
      .select("id, name, project_number, phase, current_phase, client, health_status, completion_percentage, summary")
      .ilike("name", `%${term}%`)
      .limit(5);

    if (!scope.isAdmin && scope.allowedProjectIds.length > 0) {
      query = query.in("id", scope.allowedProjectIds);
    }

    const { data } = await query;
    for (const project of data ?? []) {
      if (!projectMatches.some((match) => match.id === project.id)) {
        projectMatches.push(project as Record<string, unknown>);
      }
    }
  }

  const primaryProject = projectMatches[0];
  let recentMeetings: Array<Record<string, unknown>> = [];
  let budgetRows = 0;

  let openRfiCount = 0;
  let openChangeEventCount = 0;

  if (typeof primaryProject?.id === "number") {
    const [meetingsResult, budgetResult, rfiResult, ceResult] = await Promise.allSettled([
      supabase
        .from("document_metadata")
        .select("title, date, summary, overview, category")
        .eq("project_id", primaryProject.id)
        .or("type.eq.meeting,category.eq.meeting")
        .order("date", { ascending: false })
        .limit(10),
      supabase
        .from("budget_lines")
        .select("id", { count: "exact", head: true })
        .eq("project_id", primaryProject.id),
      supabase
        .from("rfis")
        .select("id", { count: "exact", head: true })
        .eq("project_id", primaryProject.id)
        .in("status", ["open", "draft", "in_review"]),
      supabase
        .from("change_events")
        .select("id", { count: "exact", head: true })
        .eq("project_id", primaryProject.id)
        .not("status", "in", '("approved","void","rejected")'),
    ]);

    if (meetingsResult.status === "fulfilled") {
      recentMeetings = ((meetingsResult.value.data ?? []) as Array<Record<string, unknown>>)
        .map((meeting) => ({
          title: meeting.title,
          date: meeting.date,
          summary: String(meeting.summary ?? meeting.overview ?? "").slice(0, 400),
        }));
    }

    if (budgetResult.status === "fulfilled") {
      budgetRows = budgetResult.value.count ?? 0;
    }
    if (rfiResult.status === "fulfilled") {
      openRfiCount = rfiResult.value.count ?? 0;
    }
    if (ceResult.status === "fulfilled") {
      openChangeEventCount = ceResult.value.count ?? 0;
    }
  }

  const promptInjection = [
    "## Server Retrieval Preflight",
    "Before model tool routing, the server performed a lightweight project lookup so project/status prompts do not fail with zero retrieval.",
    `Lookup terms tried: ${terms.length ? terms.join(", ") : "none"}`,
    projectMatches.length
      ? `Project matches: ${projectMatches
          .slice(0, 5)
          .map((project) => `${project.name ?? "Unnamed"} (#${project.id})`)
          .join("; ")}`
      : "Project matches: none",
    primaryProject
      ? `Primary project context: ${JSON.stringify({
          id: primaryProject.id,
          name: primaryProject.name,
          projectNumber: primaryProject.project_number,
          phase: primaryProject.phase ?? primaryProject.current_phase,
          client: primaryProject.client,
          healthStatus: primaryProject.health_status,
          completionPct: primaryProject.completion_percentage,
          summary: primaryProject.summary,
          recentMeetings,
          budgetRows,
          openRfiCount,
          openChangeEventCount,
        })}`
      : "Primary project context: unavailable",
    "Use this preflight only as a starting point. Still call the appropriate tools for a substantive answer. If tools fail, explain both this preflight and the failed deeper retrieval.",
  ].join("\n");

  return {
    promptInjection,
    trace: {
      tool: "serverBusinessContextPreflight",
      input: {
        terms,
        selectedProjectId: params.selectedProjectId ?? null,
      },
      output: {
        projectMatchCount: projectMatches.length,
        primaryProjectId: primaryProject?.id ?? null,
        recentMeetingCount: recentMeetings.length,
        budgetRows,
        openRfiCount,
        openChangeEventCount,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

function createStrategistFailureResponse(params: {
  cause: string;
  selectedProjectId?: number;
  toolTrace: Array<Record<string, unknown>>;
  userMessage?: string;
}): string {
  const failedTools = params.toolTrace
    .filter((trace) => trace.error)
    .map((trace) => String(trace.tool ?? "unknown tool"));
  const successfulTools = params.toolTrace
    .filter((trace) => trace.output && !trace.error)
    .map((trace) => String(trace.tool ?? "unknown tool"));

  const sourceSummary =
    failedTools.length > 0 || successfulTools.length > 0
      ? `I checked ${successfulTools.length} source${successfulTools.length === 1 ? "" : "s"} successfully` +
        (failedTools.length > 0
          ? `, but ${failedTools.join(", ")} failed before I could finish the answer.`
          : ".")
      : "I did not get far enough to retrieve project, meeting, email, Teams, OneDrive, or Acumatica context.";

  const projectHint = params.selectedProjectId
    ? "The pinned project context was included, so the failure is in retrieval or generation rather than project selection."
    : "No project was pinned, so a narrower project or topic would reduce retrieval ambiguity on the retry.";

  const scopedFollowUp = params.userMessage
    ? `I still need a successful retrieval pass before I can give a sourced strategic read on: "${params.userMessage.slice(0, 180)}${params.userMessage.length > 180 ? "..." : ""}".`
    : "I still need a successful retrieval pass before I can give a sourced strategic read.";

  return [
    "I hit a retrieval/generation failure before I could give you a trustworthy strategist answer.",
    "",
    `What happened: ${params.cause}`,
    `What I could confirm: ${sourceSummary}`,
    `What that means: ${projectHint}`,
    scopedFollowUp,
    "",
    "The right next move is to retry the same question with the project or decision you care about most. If this repeats, the persisted tool trace now shows exactly which source failed instead of leaving the chat blank.",
  ].join("\n");
}

async function generateRecoveryResponse(params: {
  userMessage: string;
  cause: string;
  selectedProjectId?: number;
  toolTrace: Array<Record<string, unknown>>;
}): Promise<string> {
  const fallback = createStrategistFailureResponse(params);
  const traceSummary = params.toolTrace
    .slice(-12)
    .map((trace) => ({
      tool: trace.tool,
      hasOutput: Boolean(trace.output),
      error: trace.error,
    }));

  try {
    const result = await generateText({
      model: getLanguageModel(STRATEGIST_MODEL),
      system:
        "You are Alleato's Chief Strategist. The primary tool-enabled run failed to produce final text. " +
        "Write a concise, natural recovery response to the user. Do not pretend data was retrieved. " +
        "Do not say 'as an AI' or 'please try again'. Explain what failed, what was and was not checked, " +
        "and the best next move. If there is partial tool trace, use it. If there is no trace, say retrieval did not start.",
      messages: [
        {
          role: "user",
          content: [
            `Original user message: ${params.userMessage}`,
            `Failure cause: ${params.cause}`,
            `Pinned project id: ${params.selectedProjectId ?? "none"}`,
            `Tool trace summary: ${JSON.stringify(traceSummary)}`,
            `Baseline fallback to improve:\n${fallback}`,
          ].join("\n\n"),
        },
      ],
    });

    return result.text.trim() || fallback;
  } catch {
    return fallback;
  }
}

async function persistAssistantMessage(params: {
  supabase: ReturnType<typeof createServiceClient>;
  sessionId: string;
  userId: string;
  content: string;
  toolTrace: Array<Record<string, unknown>>;
  memoryUsage?: MemoryUsageSummary;
  learningUsage?: BotLearningUsageSummary;
  totalUsage?: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
  };
  responseQuality: ResponseQuality;
  councilMode?: boolean;
  loopDiagnostic?: LoopDiagnostic;
}) {
  const {
    supabase,
    sessionId,
    userId,
    content,
    toolTrace,
    memoryUsage,
    learningUsage,
    totalUsage,
    responseQuality,
    councilMode,
    loopDiagnostic,
  } = params;

  await supabase.from("chat_history").insert({
    session_id: sessionId,
    user_id: userId,
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
        loop_diagnostic: loopDiagnostic ?? null,
      }),
    ),
  });
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

    // Accumulated per-step diagnostics — populated by onStepFinish.
    const stepDiagnostics: StepDiagnostic[] = [];

    let streamErrorMessage: string | undefined;

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
    const forceBusinessRetrieval = shouldForceBusinessRetrieval(lastUserContent);

    let systemPrompt = await assembleSystemPrompt({
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

    if (forceBusinessRetrieval) {
      const preflight = await buildBusinessContextPreflight({
        userId: user.id,
        message: lastUserContent,
        selectedProjectId,
      });
      toolTrace.push(preflight.trace);
      systemPrompt = `${preflight.promptInjection}\n\n---\n\n${systemPrompt}`;
    }
    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const result = streamText({
          model: getLanguageModel(STRATEGIST_MODEL),
          system: systemPrompt,
          messages: modelMessages,
          tools: tools as unknown as ToolSet,
          // Strategist gets enough steps to route, consult specialists, and synthesize.
          // Each specialist gets up to 5 internal tool-call steps.
          stopWhen: stepCountIs(10),
          prepareStep: ({ stepNumber }) => {
            if (!forceBusinessRetrieval || stepNumber !== 0) return undefined;

            return {
              toolChoice: "required",
              activeTools: [
                "findProject",
                "getProjectDetails",
                "semanticSearch",
                "searchMeetingsByTopic",
                "searchEmails",
                "searchTeamsMessages",
                "queryBudgetData",
                "queryCommitments",
                "queryChangeOrders",
                "getProjectBudgetSummary",
                "consultCOO",
                "consultCFO",
              ],
            };
          },
          onError: ({ error }) => {
            streamErrorMessage =
              error instanceof Error ? error.message : String(error);
          },
          onStepFinish: ({ stepNumber, finishReason, usage, warnings, toolCalls }) => {
            // warnings are CallWarning = { type: "unsupported"; feature: string; details?: string }
            const warningMessages = (warnings ?? []).map((w) =>
              w.type === "unsupported"
                ? `unsupported:${w.feature}${w.details ? `:${w.details}` : ""}`
                : String(w),
            );
            stepDiagnostics.push({
              stepNumber,
              finishReason,
              toolCallCount: toolCalls.length,
              toolCallNames: toolCalls.map((tc) => tc.toolName),
              warningCount: warningMessages.length,
              warnings: warningMessages,
              inputTokens: usage?.inputTokens,
              outputTokens: usage?.outputTokens,
            });
          },
        });

        writer.merge(
          result.toUIMessageStream({
            originalMessages: messages,
            // Keep the stream open so we can append a visible fallback when a
            // tool-only run finishes without final assistant text.
            sendFinish: false,
          }),
        );

        let content = (await result.text).trim();
        const totalUsage = await result.totalUsage;

        if (!content) {
          const cause = streamErrorMessage
            ? `The model stream reported: ${streamErrorMessage}`
            : "The model/tool run completed without returning final assistant text.";
          content = createStrategistFailureResponse({
            cause,
            selectedProjectId,
            toolTrace,
            userMessage: lastUserContent,
          });
          content = await generateRecoveryResponse({
            userMessage: lastUserContent,
            cause,
            selectedProjectId,
            toolTrace,
          });

          const fallbackTextId = "strategist-failure-response";
          writer.write({ type: "text-start", id: fallbackTextId });
          writer.write({
            type: "text-delta",
            id: fallbackTextId,
            delta: content,
          });
          writer.write({ type: "text-end", id: fallbackTextId });
        }

        const responseQuality = scoreResponseQuality({
          toolTrace,
          content,
        });
        await persistAssistantMessage({
          supabase,
          sessionId,
          userId: user.id,
          content,
          toolTrace,
          memoryUsage,
          learningUsage,
          totalUsage,
          responseQuality,
          councilMode,
          loopDiagnostic: buildLoopDiagnostic(stepDiagnostics),
        });

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
            responseQualityScore: responseQuality.score,
            learnings: learningUsage.learnings,
          });
        }
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        return createStrategistFailureResponse({
          cause: message,
          selectedProjectId,
          toolTrace,
          userMessage: lastUserContent,
        });
      },
    });

    // Post-response tasks — run AFTER the streaming response is sent.
    // Zero impact on user-facing latency.
    after(() => runPostResponseTasks(sessionId, user.id));

    return createUIMessageStreamResponse({ stream });
  },
);
