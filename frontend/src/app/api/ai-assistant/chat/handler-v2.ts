import {
  streamText,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { waitUntil } from "@vercel/functions";
import { traceChatCompletion } from "@/lib/ai/langfuse-trace";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planRetrieval } from "@/lib/ai/retrieval/planner";
import { executeRetrievalPlan } from "@/lib/ai/retrieval/executor";
import { assembleSystemPromptFromContext } from "@/lib/ai/retrieval/system-prompt";
import { buildExecutorDeps } from "@/lib/ai/retrieval/deps";
import { assembleSystemPrompt } from "@/lib/ai/bot-core";
import { createStrategistTools } from "@/lib/ai/orchestrator";
import { getLanguageModel } from "@/lib/ai/providers";
import type { TaskSummaryWidgetPayload } from "@/lib/ai/assistant-widgets";
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

type GeneratedTaskSummaryItem = TaskSummaryWidgetPayload["items"][number];

type GeneratedTaskSummaryAnswer = {
  content: string;
  widget: TaskSummaryWidgetPayload;
  traceOutput: Record<string, unknown>;
};

function extractTextFromParts(parts: UIMessage["parts"]): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => (p as { type?: string }).type === "text")
    .map((p) => ((p as { text?: string }).text ?? ""))
    .join(" ");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function isGeneratedTasksTodayRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const mentionsTasks = /\b(tasks?|to-?dos?|action items?|follow-?ups?)\b/.test(normalized);
  const asksGenerated =
    /\b(generated|created|added|made|logged|entered)\b/.test(normalized) ||
    normalized.includes("new tasks");
  const mentionsToday = /\btoday\b/.test(normalized);
  return mentionsTasks && asksGenerated && mentionsToday;
}

function getEasternDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function getEasternOffset(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date);
  const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT-05";
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return "-05:00";
  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = (match[3] ?? "00").padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function addUtcDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return getEasternDateString(date);
}

function easternDayRange(date = new Date()): {
  startIso: string;
  endIso: string;
  label: string;
} {
  const dateString = getEasternDateString(date);
  const nextDateString = addUtcDays(dateString, 1);
  const startOffset = getEasternOffset(new Date(`${dateString}T12:00:00Z`));
  const endOffset = getEasternOffset(new Date(`${nextDateString}T12:00:00Z`));
  return {
    startIso: new Date(`${dateString}T00:00:00${startOffset}`).toISOString(),
    endIso: new Date(`${nextDateString}T00:00:00${endOffset}`).toISOString(),
    label: new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
  };
}

function formatShortDate(value?: string | null): string | null {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(Number(year), Number(month) - 1, Number(day)));
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildTaskHref(item: Pick<GeneratedTaskSummaryItem, "id" | "projectId">): string {
  const base = item.projectId ? `/${item.projectId}/tasks` : "/tasks";
  return `${base}?task=${encodeURIComponent(item.id)}`;
}

function createGeneratedTasksTodayAnswer(params: {
  rows: Record<string, unknown>[];
  dateLabel: string;
  startIso: string;
  endIso: string;
}): GeneratedTaskSummaryAnswer {
  const allItems = params.rows.map((row, index): GeneratedTaskSummaryItem => {
    const metadata = asRecord(row.document_metadata);
    const project = asRecord(row.projects);
    const id = asString(row.id) ?? `task-${index}`;
    const projectId =
      typeof row.project_id === "number"
        ? row.project_id
        : typeof metadata.project_id === "number"
          ? metadata.project_id
          : null;
    const item: GeneratedTaskSummaryItem = {
      id,
      title:
        asString(row.title) ??
        asString(row.description)?.slice(0, 120) ??
        "Untitled task",
      description: asString(row.description),
      status: asString(row.status),
      priority: asString(row.priority),
      dueDate: asString(row.due_date),
      assigneeName: asString(row.assignee_name) ?? asString(row.assignee_email),
      projectId,
      projectName: asString(project.name),
      sourceTitle: asString(metadata.title) ?? asString(row.file_name),
      sourceSystem: asString(row.source_system) ?? asString(metadata.source_system),
      sourceDate:
        asString(metadata.date) ??
        asString(metadata.captured_at) ??
        asString(metadata.created_at),
      createdAt: asString(row.created_at) ?? new Date().toISOString(),
      href: "",
    };
    item.href = buildTaskHref(item);
    return item;
  });
  const items = allItems.slice(0, 25);

  const lines = [
    `I checked the Tasks page source of truth: \`public.tasks.created_at\` for ${params.dateLabel}.`,
    "",
  ];

  if (allItems.length === 0) {
    lines.push("No task rows were created today in the Tasks table.");
  } else {
    lines.push(`Found ${allItems.length} task${allItems.length === 1 ? "" : "s"} generated today.`);
    lines.push(
      ...allItems.slice(0, 12).map((item) => {
        const owner = item.assigneeName ? ` | Owner: ${item.assigneeName}` : "";
        const project = item.projectName ? ` | Project: ${item.projectName}` : "";
        const due = item.dueDate ? ` | Due: ${formatShortDate(item.dueDate)}` : "";
        const source = item.sourceTitle ? ` | Source: ${item.sourceTitle}` : "";
        return `- **${item.title}**${project}${owner}${due}${source}`;
      }),
    );
  }

  lines.push(
    "",
    "This answer is not inferred from meeting transcripts. It is a direct task-table lookup.",
  );

  return {
    content: lines.join("\n"),
    widget: {
      type: "task_summary",
      id: "generated-tasks-today",
      title: "Tasks generated today",
      subtitle:
        allItems.length > items.length
          ? `Direct lookup from the Tasks page table. Showing latest ${items.length}.`
          : "Direct lookup from the Tasks page table",
      totalCount: allItems.length,
      dateLabel: params.dateLabel,
      emptyState: "No task rows were created today in the Tasks table.",
      items,
    },
    traceOutput: {
      sourceOfTruth: "public.tasks.created_at",
      startIso: params.startIso,
      endIso: params.endIso,
      resultCount: allItems.length,
      taskIds: allItems.map((item) => item.id),
    },
  };
}

async function loadGeneratedTasksTodayAnswer(params: {
  supabase: SupabaseClient;
  selectedProjectId?: number | null;
}): Promise<GeneratedTaskSummaryAnswer> {
  const range = easternDayRange();
  let query = params.supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      status,
      due_date,
      priority,
      project_id,
      assignee_name,
      assignee_email,
      source_system,
      created_at,
      file_name,
      projects (id, name),
      document_metadata:tasks_metadata_id_fkey (
        id,
        title,
        source_system,
        date,
        captured_at,
        created_at,
        project_id
      )
    `)
    .gte("created_at", range.startIso)
    .lt("created_at", range.endIso)
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.selectedProjectId != null) {
    query = query.eq("project_id", params.selectedProjectId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Generated-today task lookup failed: ${error.message}`);
  }

  return createGeneratedTasksTodayAnswer({
    rows: (data ?? []) as Record<string, unknown>[],
    dateLabel: range.label,
    startIso: range.startIso,
    endIso: range.endIso,
  });
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

      if (isGeneratedTasksTodayRequest(lastUserContent)) {
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "knowledge",
            message: "Checking the Tasks table for rows created today",
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

        try {
          const answer = await loadGeneratedTasksTodayAnswer({
            supabase: args.supabase,
            selectedProjectId: args.selectedProjectId,
          });
          const dataPart = {
            type: "data-assistant-widget",
            id: "assistant-widget-generated-tasks-today",
            data: { widget: answer.widget },
          };
          writer.write(dataPart as never);
          writeTextResponse(writer, "strategist-generated-tasks-today-v2", answer.content);

          await args.supabase.from("chat_history").insert({
            session_id: args.sessionId,
            user_id: args.user.id,
            role: "assistant",
            content: answer.content,
            metadata: {
              architecture: "retrieval-planner-v2",
              tool_trace: [
                {
                  tool: "getGeneratedTasksToday",
                  input: {
                    message: lastUserContent.slice(0, 240),
                    selectedProjectId: args.selectedProjectId ?? null,
                  },
                  output: answer.traceOutput,
                  timestamp: new Date().toISOString(),
                },
              ],
              data_parts: [dataPart],
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
              message: "Task register checked",
              status: "success",
              timestamp: new Date().toISOString(),
            },
          } as never);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          const content = `I tried to check the Tasks page source of truth, but the task-table lookup failed: ${detail}`;
          writeTextResponse(writer, "strategist-generated-tasks-today-error-v2", content);
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "error",
              message: "Task register lookup failed",
              status: "error",
              timestamp: new Date().toISOString(),
            },
          } as never);
          await args.supabase.from("chat_history").insert({
            session_id: args.sessionId,
            user_id: args.user.id,
            role: "assistant",
            content,
            metadata: {
              architecture: "retrieval-planner-v2",
              tool_trace: [
                {
                  tool: "getGeneratedTasksToday",
                  input: {
                    message: lastUserContent.slice(0, 240),
                    selectedProjectId: args.selectedProjectId ?? null,
                  },
                  error: detail,
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          });
        }
        return;
      }

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
        sessionId: args.sessionId,
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

      const modelMessages = await convertToModelMessages(args.messages);
      const lastUserMessage = modelMessages.findLast((m) => m.role === "user");
      const inputText = lastUserMessage
        ? (lastUserMessage.content as { text?: string }[] | string | undefined)
          && typeof lastUserMessage.content === "string"
          ? lastUserMessage.content
          : (lastUserMessage.content as { type: string; text?: string }[])
              ?.filter((p) => p.type === "text")
              .map((p) => p.text ?? "")
              .join(" ") ?? ""
        : "";

      const result = streamText({
        model: getLanguageModel(args.activeModel),
        system: systemPrompt,
        messages: modelMessages,
        // tools, // TEMP: testing if 102-tool registry causes finishReason:other
        maxOutputTokens: 4000,
        stopWhen: stepCountIs(10),
        experimental_telemetry: {
          isEnabled: process.env.PHOENIX_TRACING === "true",
          functionId: "ai-assistant-chat-v2",
        },
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
          waitUntil(traceChatCompletion({
            userId: args.user.id,
            sessionId: args.sessionId,
            modelId: args.activeModel,
            input: inputText,
            output: text ?? "",
            usage,
          }));
        },
      });

      writer.merge(result.toUIMessageStream({ originalMessages: args.messages }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
