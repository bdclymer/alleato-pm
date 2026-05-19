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
import {
  assembleSystemPrompt,
  runPostResponseTasks,
  type MemoryUsageSummary,
} from "@/lib/ai/bot-core";
import { createStrategistTools } from "@/lib/ai/orchestrator";
import { getLanguageModel } from "@/lib/ai/providers";
import { scoreResponseQuality } from "@/lib/ai/score-response-quality";
import type { TaskSummaryWidgetPayload } from "@/lib/ai/assistant-widgets";
import {
  buildDeepAgentExecutiveEvidenceWidget,
  buildDeepAgentMemoryCandidateWidget,
  buildDeepAgentResearchEvidenceWidget,
  buildDeepAgentSourceEvidenceWidget,
  fetchDeepAgentExecutiveBriefing,
  fetchDeepAgentProjectStatus,
  fetchDeepAgentResearch,
  formatDeepAgentExecutiveBriefingContext,
  formatDeepAgentExecutiveDirectResponse,
  formatDeepAgentProjectStatusContext,
  formatDeepAgentProjectDirectResponse,
  formatDeepAgentResearchContext,
  formatDeepAgentResearchDirectResponse,
  shouldUseDeepAgentExecutiveBridge,
  shouldUseDeepAgentExecutiveDirectResponse,
  shouldUseDeepAgentProjectDirectResponse,
  shouldUseDeepAgentProjectStatusBridge,
  shouldUseDeepAgentResearchBridge,
  shouldUseDeepAgentResearchDirectResponse,
} from "@/lib/ai/deep-agent-project-status";
import {
  createWeeklyMarketingContentWorkflow,
  type CmoWeeklyContentWorkflowResult,
} from "@/lib/ai/services/marketing-service";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_AI_ASSISTANT_MODEL,
  isDeepAgentsStrategistModelId,
  isAiAssistantModelId,
} from "@/lib/ai/assistant-models";
import { GuardrailError } from "@/lib/guardrails/errors";
import type { Json } from "@/types/database.types";

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

function microsoftAssistantBackendUrl(): string {
  const value = (
    (process.env.NODE_ENV === "development"
      ? process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000"
      : process.env.BACKEND_URL || process.env.PYTHON_BACKEND_URL || "")
  )
    .replace(/\/+$/, "")
    .trim();
  try {
    new URL(value);
  } catch {
    throw new Error(
      "Missing or invalid backend URL. Set BACKEND_URL or PYTHON_BACKEND_URL before using the Microsoft Executive Assistant.",
    );
  }
  return value;
}

function microsoftAssistantAdminApiKey(): string {
  const value = process.env.ADMIN_API_KEY?.trim();
  if (!value) {
    throw new Error(
      "ADMIN_API_KEY is required to call the backend Microsoft Executive Assistant.",
    );
  }
  return value;
}

function defaultMicrosoftMailbox(): string | undefined {
  return (
    process.env.AI_ASSISTANT_DEFAULT_OUTLOOK_MAILBOX?.trim() ||
    process.env.OUTLOOK_OPERATOR_MAILBOX?.trim() ||
    process.env.MICROSOFT_SYNC_USERS?.split(",")[0]?.trim() ||
    undefined
  );
}

function isMicrosoftSpecialistDelegationPlan(reason: string): boolean {
  return reason.startsWith("microsoft_specialist_delegation_");
}

function extractTextFromParts(parts: UIMessage["parts"]): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => (p as { type?: string }).type === "text")
    .map((p) => (p as { text?: string }).text ?? "")
    .join(" ");
}

function toJsonValue(value: unknown): Json | undefined {
  if (value === null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map(toJsonValue)
      .filter((item): item is Json => item !== undefined);
  }
  if (value && typeof value === "object") {
    const objectValue: { [key: string]: Json | undefined } = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      objectValue[key] = toJsonValue(item);
    });
    return objectValue;
  }
  return undefined;
}

function extractPersistableDataParts(message: UIMessage): Json[] {
  return message.parts
    .filter((part) => {
      const type = (part as { type?: string }).type;
      return typeof type === "string" && type.startsWith("data-");
    })
    .map(toJsonValue)
    .filter((part): part is Json => part !== undefined);
}

function buildResponseQualityMetadata(params: {
  toolTrace: Array<Record<string, unknown>>;
  content: string;
}) {
  return scoreResponseQuality(params);
}

function createBackendBridgeTrace(params: {
  tool: string;
  status: "success" | "failed" | "skipped";
  message: string;
  selectedProjectId?: number | null;
  durationMs?: number;
  detail?: string | null;
}) {
  return {
    tool: params.tool,
    toolName: params.tool,
    agent: "frontend-ai-assistant",
    status: params.status,
    durationMs: params.durationMs ?? 0,
    detail: params.detail ?? null,
    input: {
      message: params.message.slice(0, 240),
      selectedProjectId: params.selectedProjectId ?? null,
    },
    timestamp: new Date().toISOString(),
  };
}

function mapBackendPacketTrace(
  packetTrace: Array<{
    tool: string;
    agent: string;
    status: string;
    durationMs: number;
    detail?: string | null;
  }>,
  params: {
    message: string;
    selectedProjectId?: number | null;
  },
) {
  return packetTrace.map((trace) => ({
    tool: trace.tool,
    toolName: trace.tool,
    agent: trace.agent,
    status: trace.status,
    durationMs: trace.durationMs,
    detail: trace.detail,
    input: {
      message: params.message.slice(0, 240),
      selectedProjectId: params.selectedProjectId ?? null,
    },
    timestamp: new Date().toISOString(),
  }));
}

function traceDurationMs(trace: Record<string, unknown>): number | null {
  const raw = trace.durationMs ?? trace.duration_ms;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0
    ? Math.round(raw)
    : null;
}

function summarizeToolTiming(toolTrace: Array<Record<string, unknown>>) {
  const timed = toolTrace
    .map((trace) => {
      const durationMs = traceDurationMs(trace);
      const tool = trace.toolName ?? trace.tool;
      if (durationMs === null || typeof tool !== "string") return null;
      return {
        tool,
        agent:
          typeof trace.agent === "string" ? trace.agent : "unknown-agent",
        status:
          typeof trace.status === "string" ? trace.status : "unknown-status",
        durationMs,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const slowest = [...timed]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 8);

  return {
    totalMeasuredMs: timed.reduce((sum, item) => sum + item.durationMs, 0),
    slowest,
    failedCount: timed.filter((item) => item.status === "failed").length,
  };
}

function buildRecentEmailTrace(
  raw: unknown,
  message: string,
): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const appliedFilter =
    record.appliedFilter && typeof record.appliedFilter === "object"
      ? (record.appliedFilter as Record<string, unknown>)
      : null;
  return {
    tool: "getRecentEmails",
    toolName: "getRecentEmails",
    status: record.error ? "failed" : "success",
    input: {
      message: message.slice(0, 240),
      mailbox: appliedFilter?.email ?? null,
      direction: appliedFilter?.direction ?? null,
      since: appliedFilter?.since ?? null,
      timeZone: appliedFilter?.timeZone ?? null,
    },
    output: {
      source: record.source ?? null,
      count: record.count ?? 0,
      threadCount: record.threadCount ?? 0,
      summary: record.summary ?? null,
      dataCutoffNote: record.dataCutoffNote ?? null,
      graphLive: record.graphLive ?? null,
      graphLiveError: record.graphLiveError ?? null,
      mailboxResolutionNote: record.mailboxResolutionNote ?? null,
      latestAvailableFallback: record.latestAvailableFallback ?? null,
      requestedWindowEmpty: record.requestedWindowEmpty ?? null,
      latestAvailableReceivedAt: record.latestAvailableReceivedAt ?? null,
      appliedFilter,
      error: record.error ?? null,
    },
    timestamp: new Date().toISOString(),
  };
}

function buildLiveToolTrace(
  trace: Record<string, unknown>,
  message: string,
): Record<string, unknown> | null {
  const tool = asString(trace.tool);
  if (!tool) return null;

  if (tool === "getRecentEmails") {
    const emailTrace = buildRecentEmailTrace(trace.output, message);
    if (emailTrace) return emailTrace;
  }

  const input = asRecord(trace.input);
  const output = asRecord(trace.output);
  const response = asRecord(trace.response);
  const responseToolTrace = Array.isArray(response.toolTrace)
    ? response.toolTrace.filter((item) => item && typeof item === "object")
    : [];
  const microsoftLiveTrace = responseToolTrace.find((item) => {
    const record = item as Record<string, unknown>;
    return record.source === "microsoft_graph_live" || asRecord(record.output).source === "microsoft_graph_live";
  }) as Record<string, unknown> | undefined;
  const error = asString(trace.error);

  return {
    tool,
    toolName: tool,
    status: error ? "failed" : "success",
    input: {
      message: message.slice(0, 240),
      selectedProjectId: input.projectId ?? input.selectedProjectId ?? null,
    },
    output:
      trace.output === undefined
        ? undefined
        : {
            source: output.source ?? microsoftLiveTrace?.source ?? asRecord(microsoftLiveTrace?.output).source ?? null,
            count: output.count ?? null,
            summary: output.summary ?? null,
            error: output.error ?? error ?? null,
            orchestrator: response.orchestrator ?? null,
            mode: response.mode ?? null,
            actionCount: Array.isArray(response.actions) ? response.actions.length : null,
            toolTrace: responseToolTrace,
          },
    error,
    timestamp: asString(trace.timestamp) ?? new Date().toISOString(),
  };
}

async function fetchMicrosoftExecutiveAssistant(params: {
  userId: string;
  sessionId: string;
  question: string;
  selectedProjectId?: number;
}) {
  const response = await fetch(
    `${microsoftAssistantBackendUrl()}/api/intelligence/microsoft-executive-assistant`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Admin-Api-Key": microsoftAssistantAdminApiKey(),
      },
      body: JSON.stringify({
        userId: params.userId,
        sessionId: params.sessionId,
        prompt: params.question,
        mailboxUserId: defaultMicrosoftMailbox(),
        projectId: params.selectedProjectId,
        trigger: "strategist_delegation",
      }),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : body?.detail?.answer ??
          `Microsoft Executive Assistant failed with HTTP ${response.status}.`;
    throw new Error(detail);
  }
  return body as Record<string, unknown>;
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
  const mentionsTasks = /\b(tasks?|to-?dos?|action items?|follow-?ups?)\b/.test(
    normalized,
  );
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
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function getEasternOffset(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date);
  const value =
    parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT-05";
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

function buildTaskHref(
  item: Pick<GeneratedTaskSummaryItem, "id" | "projectId">,
): string {
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
      sourceSystem:
        asString(row.source_system) ?? asString(metadata.source_system),
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
    lines.push(
      `Found ${allItems.length} task${allItems.length === 1 ? "" : "s"} generated today.`,
    );
    lines.push(
      ...allItems.slice(0, 12).map((item) => {
        const owner = item.assigneeName ? ` | Owner: ${item.assigneeName}` : "";
        const project = item.projectName
          ? ` | Project: ${item.projectName}`
          : "";
        const due = item.dueDate
          ? ` | Due: ${formatShortDate(item.dueDate)}`
          : "";
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
    .select(
      `
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
    `,
    )
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
  writer: Parameters<
    Parameters<typeof createUIMessageStream>[0]["execute"]
  >[0]["writer"],
  id: string,
  content: string,
) {
  writer.write({ type: "text-start", id });
  writer.write({ type: "text-delta", id, delta: content });
  writer.write({ type: "text-end", id });
}

// Why: deep-agent and Microsoft-specialist fetches can take 40–60s. Without
// any bytes on the wire during that window, browsers / HTTP/2 / dev middleware
// silently kill the stream and the client renders "Failed to fetch" even though
// the server is still working. Periodic data-status writes keep the stream alive
// and double as visible "still working…" feedback for the user.
async function withKeepAlive<T>(
  writer: Parameters<
    Parameters<typeof createUIMessageStream>[0]["execute"]
  >[0]["writer"],
  options: { statusId: string; stage: string; message: string; intervalMs?: number },
  task: () => Promise<T>,
): Promise<T> {
  const intervalMs = options.intervalMs ?? 3_000;
  const interval = setInterval(() => {
    writer.write({
      type: "data-status",
      id: options.statusId,
      data: {
        stage: options.stage,
        message: options.message,
        status: "loading",
        timestamp: new Date().toISOString(),
      },
    } as never);
  }, intervalMs);
  try {
    return await task();
  } finally {
    clearInterval(interval);
  }
}

function summarizeDeepAgentSourceCoverage(
  sourcesChecked: Array<{
    sourceType: string;
    status: string;
    recordCount: number;
  }>,
): Record<string, unknown>[] {
  return sourcesChecked.map((source) => ({
    sourceType: source.sourceType,
    status: source.status,
    recordCount: source.recordCount,
  }));
}

function assistantMaxOutputTokens(planReason: string): number {
  const raw = Number(process.env.AI_ASSISTANT_MAX_OUTPUT_TOKENS);
  const requested = Number.isFinite(raw) && raw > 0 ? raw : 8_000;
  const bounded = Math.min(Math.max(Math.round(requested), 4_000), 12_000);
  if (planReason === "executive_deep_agent_broad_operator_question") {
    return Math.max(bounded, 8_000);
  }
  return bounded;
}

function buildAnswerDebugMetadata(params: {
  orchestrator: string;
  plan: ReturnType<typeof planRetrieval>;
  toolTrace: Array<Record<string, unknown>>;
  memoryUsage?: MemoryUsageSummary | null;
  sourceCoverage?: Array<Record<string, unknown>>;
  evidenceCount?: number;
  outputPolicy?: Record<string, unknown>;
}): Record<string, unknown> {
  const toolNames = params.toolTrace
    .map((trace) => trace.toolName ?? trace.tool)
    .filter((tool): tool is string => typeof tool === "string");
  return {
    orchestrator: params.orchestrator,
    retrievalPlan: {
      intent: params.plan.intent,
      reason: params.plan.reason,
      responseFormat: params.plan.responseFormat,
      sources: Object.keys(params.plan.sources),
    },
    memory:
      params.memoryUsage ??
      {
        status: "not_loaded_in_frontend",
        reason:
          "This answer was produced by a delegated specialist/direct Deep Agents path; inspect delegated trace and backend memory metadata for specialist-side context.",
      },
    sources: {
      toolNames,
      toolCallCount: toolNames.length,
      timing: summarizeToolTiming(params.toolTrace),
      sourceCoverage: params.sourceCoverage ?? [],
      evidenceCount: params.evidenceCount ?? null,
    },
    outputPolicy: params.outputPolicy ?? null,
  };
}

async function persistDirectDeepAgentResponse(params: {
  supabase: SupabaseClient;
  sessionId: string;
  userId: string;
  content: string;
  metadata: Json;
  responseLabel: string;
  sourceDebug: Record<string, unknown>;
  trace: {
    input: string;
    intent: string;
    modelId: string;
    selectedProjectId?: number | null;
    toolTrace: Array<Record<string, unknown>>;
  };
}): Promise<void> {
  const { error: assistantError } = await params.supabase
    .from("chat_history")
    .insert({
      session_id: params.sessionId,
      user_id: params.userId,
      role: "assistant",
      content: params.content,
      metadata: params.metadata,
    });

  if (assistantError) {
    throw new Error(
      `Persisting the Deep Agents ${params.responseLabel} response failed: ${assistantError.message}`,
    );
  }

  const { error: conversationError } = await params.supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("session_id", params.sessionId)
    .eq("user_id", params.userId);

  if (conversationError) {
    throw new Error(
      `Updating the Deep Agents ${params.responseLabel} conversation failed: ${conversationError.message}`,
    );
  }

  waitUntil(
    traceChatCompletion({
      userId: params.userId,
      sessionId: params.sessionId,
      modelId: params.trace.modelId,
      input: params.trace.input,
      output: params.content,
      generationName: `directDeepAgent:${params.responseLabel}`,
      intent: params.trace.intent,
      selectedProjectId: params.trace.selectedProjectId ?? null,
      toolCallNames: params.trace.toolTrace
        .map((trace) => trace.toolName ?? trace.tool)
        .filter((tool): tool is string => typeof tool === "string"),
      stepCount: params.trace.toolTrace.length,
      metadata: {
        architecture: "render-backend-deep-agents-v1",
        responseLabel: params.responseLabel,
        tracePath: "direct-deep-agent-response",
        sourceDebug: params.sourceDebug,
      },
    }),
  );

  waitUntil(runPostResponseTasks(params.sessionId, params.userId));
}

async function runChatV2(args: HandlerArgs): Promise<Response> {
  const lastUserMessage = [...args.messages]
    .reverse()
    .find((m) => m.role === "user");
  const lastUserContent = lastUserMessage
    ? extractTextFromParts(lastUserMessage.parts)
    : "";
  let responseAlreadyPersisted = false;
  let memoryUsage: MemoryUsageSummary | null = null;
  let finishMetadata: {
    finishReason?: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    toolCallNames: string[];
    stepCount: number;
  } | null = null;
  const bridgeToolTrace: Array<Record<string, unknown>> = [];
  const backendDeepAgentContextBlocks: string[] = [];
  const liveToolTrace: Array<Record<string, unknown>> = [];
  let latestRetrievalCtx: Awaited<
    ReturnType<typeof executeRetrievalPlan>
  > | null = null;

  const plan = planRetrieval({
    message: lastUserContent,
    selectedProjectId: args.selectedProjectId,
    messages: args.messages,
  });
  const selectedDeepAgentsStrategist = isDeepAgentsStrategistModelId(
    args.activeModel,
  );
  const synthesisModel = selectedDeepAgentsStrategist
    ? DEFAULT_AI_ASSISTANT_MODEL
    : args.activeModel;

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
          writeTextResponse(
            writer,
            "strategist-generated-tasks-today-v2",
            answer.content,
          );

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
          responseAlreadyPersisted = true;

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
          writeTextResponse(
            writer,
            "strategist-generated-tasks-today-error-v2",
            content,
          );
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
          responseAlreadyPersisted = true;
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
                  intelligenceItemIds: workflowResult.intelligenceItems.map(
                    (item) => item.id,
                  ),
                  calendarItemIds: workflowResult.calendarItems.map(
                    (item) => item.id,
                  ),
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
        responseAlreadyPersisted = true;

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

      if (lastUserContent.trim()) {
        const { error } = await args.supabase.from("chat_history").insert({
          session_id: args.sessionId,
          user_id: args.user.id,
          role: "user",
          content: lastUserContent,
          metadata: {
            architecture: "retrieval-planner-v2",
            client_message_id: lastUserMessage?.id ?? null,
          },
        });

        if (error) {
          throw new Error(
            `Persisting the user message failed: ${error.message}`,
          );
        }
      }

      if (isMicrosoftSpecialistDelegationPlan(plan.reason)) {
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "microsoft-specialist",
            message: "Delegating Microsoft operator work",
            status: "loading",
            timestamp: new Date().toISOString(),
          },
        } as never);

        const microsoftBridgeStarted = Date.now();
        const response = await withKeepAlive(
          writer,
          {
            statusId: "strategist-status",
            stage: "microsoft-specialist",
            message: "Still delegating to Microsoft operator…",
          },
          () =>
            fetchMicrosoftExecutiveAssistant({
              userId: args.user.id,
              sessionId: args.sessionId,
              question: lastUserContent,
              selectedProjectId: args.selectedProjectId,
            }),
        );
        const microsoftBridgeDurationMs =
          Date.now() - microsoftBridgeStarted;
        const content =
          typeof response.answer === "string"
            ? response.answer
            : "The Microsoft Executive Assistant returned no answer.";
        const trace = buildLiveToolTrace(
          {
            tool: "consultMicrosoftExecutiveAssistant",
            input: {
              question: lastUserContent,
              projectId: args.selectedProjectId ?? null,
              mailboxUserId: defaultMicrosoftMailbox() ?? null,
            },
            response,
            output: {
              summary: content.slice(0, 500),
            },
          },
          lastUserContent,
        );
        const toolTrace = trace
          ? [{ ...trace, durationMs: microsoftBridgeDurationMs }]
          : [];
        const sourceDebug = buildAnswerDebugMetadata({
          orchestrator: "microsoft-executive-assistant",
          plan,
          toolTrace,
        });

        writeTextResponse(writer, "strategist-microsoft-executive-assistant", content);

        await args.supabase.from("chat_history").insert({
          session_id: args.sessionId,
          user_id: args.user.id,
          role: "assistant",
          content,
          metadata: {
            architecture: "retrieval-planner-v2",
            delegated_orchestrator: "microsoft-executive-assistant",
            tool_trace: toolTrace,
            response_quality: buildResponseQualityMetadata({
              toolTrace,
              content,
            }),
            source_debug: sourceDebug,
            retrieval_plan: {
              intent: plan.intent,
              reason: plan.reason,
              responseFormat: plan.responseFormat,
              sources: Object.keys(plan.sources),
            },
          } as Json,
        });

        await args.supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("session_id", args.sessionId)
          .eq("user_id", args.user.id);

        responseAlreadyPersisted = true;
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "complete",
            message: "Microsoft Executive Assistant answer returned",
            status: "success",
            timestamp: new Date().toISOString(),
          },
        } as never);
        return;
      }

      if (
        shouldUseDeepAgentResearchBridge({
          intent: plan.intent,
        }) ||
        (selectedDeepAgentsStrategist && plan.intent === "external_research")
      ) {
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "backend-deep-agents",
            message: "Checking Render Deep Agents research",
            status: "loading",
            timestamp: new Date().toISOString(),
          },
        } as never);

        try {
          const researchBridgeStarted = Date.now();
          const packet = await withKeepAlive(
            writer,
            {
              statusId: "strategist-status",
              stage: "backend-deep-agents",
              message: "Still working with Render Deep Agents research…",
            },
            () =>
              fetchDeepAgentResearch({
                userId: args.user.id,
                sessionId: args.sessionId,
                question: lastUserContent,
                projectId: args.selectedProjectId ?? null,
                maxSearches: 5,
              }),
          );
          const researchBridgeDurationMs =
            Date.now() - researchBridgeStarted;

          if (shouldUseDeepAgentResearchDirectResponse(packet)) {
            const content = formatDeepAgentResearchDirectResponse(packet);
            const widget = buildDeepAgentResearchEvidenceWidget(packet);
            const dataParts = widget
              ? [
                  {
                    type: "data-assistant-widget",
                    id: "assistant-widget-deep-agent-research",
                    data: { widget },
                  },
                ]
              : [];

            const toolTrace = [
              createBackendBridgeTrace({
                tool: "backendDeepAgentResearch",
                status: "success",
                message: lastUserContent,
                selectedProjectId: args.selectedProjectId ?? null,
                durationMs: researchBridgeDurationMs,
              }),
              ...mapBackendPacketTrace(packet.toolTrace, {
                message: lastUserContent,
                selectedProjectId: args.selectedProjectId ?? null,
              }),
            ];

            await persistDirectDeepAgentResponse({
              supabase: args.supabase,
              sessionId: args.sessionId,
              userId: args.user.id,
              content,
              responseLabel: "research",
              sourceDebug: buildAnswerDebugMetadata({
                orchestrator: "backend-deep-agent-research",
                plan,
                toolTrace,
                sourceCoverage: packet.sources.map((source) => ({
                  sourceType: source.sourceType,
                  title: source.title,
                  url: source.url ?? null,
                })),
                evidenceCount: packet.sources.length,
              }),
              trace: {
                input: lastUserContent,
                intent: plan.intent,
                modelId:
                  process.env.DEEP_AGENTS_RESEARCH_MODEL ??
                  "render-backend-deep-agents",
                selectedProjectId: args.selectedProjectId ?? null,
                toolTrace,
              },
              metadata: {
                architecture: "render-backend-deep-agents-v1",
                model: process.env.DEEP_AGENTS_RESEARCH_MODEL ?? null,
                provider_path: "render-backend-ai-gateway",
                backend_deep_agent: {
                  endpoint: "research",
                  mode: packet.mode,
                  orchestrator: packet.orchestrator,
                  source_count: packet.sources.length,
                  skills_loaded: packet.skillsLoaded,
                },
                retrieval_plan: {
                  intent: plan.intent,
                  reason: plan.reason,
                  responseFormat: plan.responseFormat,
                  sources: Object.keys(plan.sources),
                },
                tool_trace: toolTrace,
                response_quality: buildResponseQualityMetadata({
                  toolTrace,
                  content,
                }),
                source_debug: buildAnswerDebugMetadata({
                  orchestrator: "backend-deep-agent-research",
                  plan,
                  toolTrace,
                  sourceCoverage: packet.sources.map((source) => ({
                    sourceType: source.sourceType,
                    title: source.title,
                    url: source.url ?? null,
                  })),
                  evidenceCount: packet.sources.length,
                }),
                data_parts: dataParts,
              } as Json,
            });

            responseAlreadyPersisted = true;
            dataParts.forEach((dataPart) => writer.write(dataPart as never));
            writeTextResponse(
              writer,
              "strategist-deep-agent-research",
              content,
            );
            writer.write({
              type: "data-status",
              id: "strategist-status",
              data: {
                stage: "complete",
                message: "Render Deep Agents research answer returned",
                status: "success",
                timestamp: new Date().toISOString(),
              },
            } as never);
            return;
          }

          backendDeepAgentContextBlocks.push(formatDeepAgentResearchContext(packet));
          bridgeToolTrace.push(
            createBackendBridgeTrace({
              tool: "backendDeepAgentResearch",
              status: "success",
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId ?? null,
              detail:
                "Backend research packet returned context for local synthesis.",
            }),
            ...mapBackendPacketTrace(packet.toolTrace, {
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId ?? null,
            }),
          );
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "backend-deep-agents",
              message:
                "Render Deep Agents returned research context but not a direct answer; using local synthesis",
              status: "warning",
              timestamp: new Date().toISOString(),
            },
          } as never);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          bridgeToolTrace.push(
            createBackendBridgeTrace({
              tool: "backendDeepAgentResearch",
              status: "failed",
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId ?? null,
              detail,
            }),
          );
          console.error("[handler-v2] Deep Agents research bridge failed", {
            message: detail,
            intent: plan.intent,
          });
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "backend-deep-agents",
              message: `Render Deep Agents research bridge failed; falling back to local retrieval: ${detail}`,
              status: "warning",
              timestamp: new Date().toISOString(),
            },
          } as never);
        }
      }

      if (
        (shouldUseDeepAgentProjectStatusBridge({
          intent: plan.intent,
          selectedProjectId: args.selectedProjectId ?? null,
        }) ||
          (selectedDeepAgentsStrategist &&
            plan.intent !== "external_research" &&
            typeof args.selectedProjectId === "number")) &&
        typeof args.selectedProjectId === "number"
      ) {
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "project-intelligence-packet",
            message: "Checking current compiled project intelligence packet",
            status: "loading",
            timestamp: new Date().toISOString(),
          },
        } as never);

        try {
          const usedPacketFastPath = await tryWriteProjectPacketFastPath({
            supabase: args.supabase,
            writer,
            userId: args.user.id,
            sessionId: args.sessionId,
            selectedProjectId: args.selectedProjectId,
            message: lastUserContent,
            plan,
          });

          if (usedPacketFastPath) {
            responseAlreadyPersisted = true;
            return;
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          bridgeToolTrace.push(
            createBackendBridgeTrace({
              tool: "clientProjectIntelligencePacket",
              status: "failed",
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId,
              detail,
            }),
          );
          console.error("[handler-v2] Project packet fast path failed", {
            message: detail,
            selectedProjectId: args.selectedProjectId,
            intent: plan.intent,
          });
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "project-intelligence-packet",
              message: `Project packet fast path failed; falling back to Render Deep Agents: ${detail}`,
              status: "warning",
              timestamp: new Date().toISOString(),
            },
          } as never);
        }

        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "backend-deep-agents",
            message: "Checking Render Deep Agents project intelligence",
            status: "loading",
            timestamp: new Date().toISOString(),
          },
        } as never);

        try {
          const projectIdForBridge = args.selectedProjectId;
          const packet = await withKeepAlive(
            writer,
            {
              statusId: "strategist-status",
              stage: "backend-deep-agents",
              message: "Still working with Render Deep Agents project status…",
            },
            () =>
              fetchDeepAgentProjectStatus({
                userId: args.user.id,
                projectId: projectIdForBridge,
                sessionId: args.sessionId,
                question: lastUserContent,
              }),
          );

          if (shouldUseDeepAgentProjectDirectResponse(packet)) {
            const content = formatDeepAgentProjectDirectResponse(packet);
            const evidenceWidget = buildDeepAgentSourceEvidenceWidget(packet);
            const memoryWidget = buildDeepAgentMemoryCandidateWidget(packet);
            const dataParts = [
              ...(evidenceWidget
                ? [
                    {
                      type: "data-assistant-widget",
                      id: "assistant-widget-deep-agent-project-status",
                      data: { widget: evidenceWidget },
                    },
                  ]
                : []),
              ...(memoryWidget
                ? [
                    {
                      type: "data-assistant-widget",
                      id: "assistant-widget-deep-agent-memory-candidates",
                      data: { widget: memoryWidget },
                    },
                  ]
                : []),
            ];

            const toolTrace = [
              createBackendBridgeTrace({
                tool: "backendDeepAgentProjectStatus",
                status: "success",
                message: lastUserContent,
                selectedProjectId: args.selectedProjectId,
              }),
              ...mapBackendPacketTrace(packet.toolTrace, {
                message: lastUserContent,
                selectedProjectId: args.selectedProjectId,
              }),
            ];

            await persistDirectDeepAgentResponse({
              supabase: args.supabase,
              sessionId: args.sessionId,
              userId: args.user.id,
              content,
              responseLabel: "project",
              sourceDebug: buildAnswerDebugMetadata({
                orchestrator: "backend-deep-agent-project-status",
                plan,
                toolTrace,
                sourceCoverage: summarizeDeepAgentSourceCoverage(
                  packet.sourcesChecked,
                ),
                evidenceCount: packet.evidence.length,
              }),
              trace: {
                input: lastUserContent,
                intent: plan.intent,
                modelId:
                  process.env.DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL ??
                  "render-backend-deep-agents",
                selectedProjectId: args.selectedProjectId,
                toolTrace,
              },
              metadata: {
                architecture: "render-backend-deep-agents-v1",
                model:
                  process.env.DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL ?? null,
                provider_path: "render-backend-ai-gateway",
                backend_deep_agent: {
                  endpoint: "project-status",
                  mode: packet.mode,
                  orchestrator: packet.orchestrator,
                  confidence: packet.confidence,
                  project: packet.project,
                  source_coverage: summarizeDeepAgentSourceCoverage(
                    packet.sourcesChecked,
                  ),
                  recommended_action_count: packet.recommendedActions.length,
                  evidence_count: packet.evidence.length,
                  memory_candidate_count: packet.memoryCandidates.length,
                  memory_candidates: packet.memoryCandidates,
                },
                retrieval_plan: {
                  intent: plan.intent,
                  reason: plan.reason,
                  responseFormat: plan.responseFormat,
                  sources: Object.keys(plan.sources),
                },
                tool_trace: toolTrace,
                response_quality: buildResponseQualityMetadata({
                  toolTrace,
                  content,
                }),
                source_debug: buildAnswerDebugMetadata({
                  orchestrator: "backend-deep-agent-project-status",
                  plan,
                  toolTrace,
                  sourceCoverage: summarizeDeepAgentSourceCoverage(
                    packet.sourcesChecked,
                  ),
                  evidenceCount: packet.evidence.length,
                }),
                data_parts: dataParts,
              } as Json,
            });

            responseAlreadyPersisted = true;
            dataParts.forEach((dataPart) => writer.write(dataPart as never));
            writeTextResponse(
              writer,
              "strategist-deep-agent-project-status",
              content,
            );
            writer.write({
              type: "data-status",
              id: "strategist-status",
              data: {
                stage: "complete",
                message: "Render Deep Agents project answer returned",
                status: "success",
                timestamp: new Date().toISOString(),
              },
            } as never);
            return;
          }

          backendDeepAgentContextBlocks.push(
            formatDeepAgentProjectStatusContext(packet),
          );
          bridgeToolTrace.push(
            createBackendBridgeTrace({
              tool: "backendDeepAgentProjectStatus",
              status: "success",
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId,
              detail:
                "Backend project packet returned context for local synthesis.",
            }),
            ...mapBackendPacketTrace(packet.toolTrace, {
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId,
            }),
          );
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "backend-deep-agents",
              message:
                "Render Deep Agents returned context but not a direct answer; using local synthesis",
              status: "warning",
              timestamp: new Date().toISOString(),
            },
          } as never);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          bridgeToolTrace.push(
            createBackendBridgeTrace({
              tool: "backendDeepAgentProjectStatus",
              status: "failed",
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId,
              detail,
            }),
          );
          console.error("[handler-v2] Deep Agents project bridge failed", {
            message: detail,
            selectedProjectId: args.selectedProjectId,
            intent: plan.intent,
          });
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "backend-deep-agents",
              message: `Render Deep Agents project bridge failed; falling back to local retrieval: ${detail}`,
              status: "warning",
              timestamp: new Date().toISOString(),
            },
          } as never);
        }
      }

      if (
        shouldUseDeepAgentExecutiveBridge({
          intent: plan.intent,
          selectedProjectId: args.selectedProjectId ?? null,
        }) ||
        (selectedDeepAgentsStrategist &&
          plan.intent !== "external_research" &&
          typeof args.selectedProjectId !== "number")
      ) {
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "backend-deep-agents",
            message: "Checking Render Deep Agents executive briefing",
            status: "loading",
            timestamp: new Date().toISOString(),
          },
        } as never);

        try {
          const packet = await withKeepAlive(
            writer,
            {
              statusId: "strategist-status",
              stage: "backend-deep-agents",
              message: "Still working with Render Deep Agents executive briefing…",
            },
            () =>
              fetchDeepAgentExecutiveBriefing({
                userId: args.user.id,
                sessionId: args.sessionId,
                question: lastUserContent,
              }),
          );

          if (shouldUseDeepAgentExecutiveDirectResponse(packet)) {
            const content = formatDeepAgentExecutiveDirectResponse(packet);
            const evidenceWidget =
              buildDeepAgentExecutiveEvidenceWidget(packet);
            const memoryWidget = buildDeepAgentMemoryCandidateWidget(packet);
            const dataParts = [
              ...(evidenceWidget
                ? [
                    {
                      type: "data-assistant-widget",
                      id: "assistant-widget-deep-agent-executive-briefing",
                      data: { widget: evidenceWidget },
                    },
                  ]
                : []),
              ...(memoryWidget
                ? [
                    {
                      type: "data-assistant-widget",
                      id: "assistant-widget-deep-agent-memory-candidates",
                      data: { widget: memoryWidget },
                    },
                  ]
                : []),
            ];

            const toolTrace = [
              createBackendBridgeTrace({
                tool: "backendDeepAgentExecutiveBriefing",
                status: "success",
                message: lastUserContent,
                selectedProjectId: args.selectedProjectId ?? null,
              }),
              ...mapBackendPacketTrace(packet.toolTrace, {
                message: lastUserContent,
                selectedProjectId: args.selectedProjectId ?? null,
              }),
            ];

            await persistDirectDeepAgentResponse({
              supabase: args.supabase,
              sessionId: args.sessionId,
              userId: args.user.id,
              content,
              responseLabel: "executive",
              sourceDebug: buildAnswerDebugMetadata({
                orchestrator: "backend-deep-agent-executive-briefing",
                plan,
                toolTrace,
                sourceCoverage: summarizeDeepAgentSourceCoverage(
                  packet.sourcesChecked,
                ),
                evidenceCount: packet.evidence.length,
              }),
              trace: {
                input: lastUserContent,
                intent: plan.intent,
                modelId:
                  process.env.DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL ??
                  "render-backend-deep-agents",
                selectedProjectId: args.selectedProjectId ?? null,
                toolTrace,
              },
              metadata: {
                architecture: "render-backend-deep-agents-v1",
                model:
                  process.env.DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL ?? null,
                provider_path: "render-backend-ai-gateway",
                backend_deep_agent: {
                  endpoint: "executive-briefing",
                  mode: packet.mode,
                  orchestrator: packet.orchestrator,
                  confidence: packet.confidence,
                  organization: packet.organization,
                  source_coverage: summarizeDeepAgentSourceCoverage(
                    packet.sourcesChecked,
                  ),
                  recommended_action_count: packet.recommendedActions.length,
                  evidence_count: packet.evidence.length,
                  memory_candidate_count: packet.memoryCandidates.length,
                  memory_candidates: packet.memoryCandidates,
                },
                retrieval_plan: {
                  intent: plan.intent,
                  reason: plan.reason,
                  responseFormat: plan.responseFormat,
                  sources: Object.keys(plan.sources),
                },
                tool_trace: toolTrace,
                response_quality: buildResponseQualityMetadata({
                  toolTrace,
                  content,
                }),
                source_debug: buildAnswerDebugMetadata({
                  orchestrator: "backend-deep-agent-executive-briefing",
                  plan,
                  toolTrace,
                  sourceCoverage: summarizeDeepAgentSourceCoverage(
                    packet.sourcesChecked,
                  ),
                  evidenceCount: packet.evidence.length,
                }),
                data_parts: dataParts,
              } as Json,
            });

            responseAlreadyPersisted = true;
            dataParts.forEach((dataPart) => writer.write(dataPart as never));
            writeTextResponse(
              writer,
              "strategist-deep-agent-executive-briefing",
              content,
            );
            writer.write({
              type: "data-status",
              id: "strategist-status",
              data: {
                stage: "complete",
                message: "Render Deep Agents executive answer returned",
                status: "success",
                timestamp: new Date().toISOString(),
              },
            } as never);
            return;
          }

          backendDeepAgentContextBlocks.push(
            formatDeepAgentExecutiveBriefingContext(packet),
          );
          bridgeToolTrace.push(
            createBackendBridgeTrace({
              tool: "backendDeepAgentExecutiveBriefing",
              status: "success",
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId ?? null,
              detail:
                "Backend executive packet returned context for local synthesis.",
            }),
            ...mapBackendPacketTrace(packet.toolTrace, {
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId ?? null,
            }),
          );
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "backend-deep-agents",
              message:
                "Render Deep Agents returned executive context but not a direct answer; using local synthesis",
              status: "warning",
              timestamp: new Date().toISOString(),
            },
          } as never);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          bridgeToolTrace.push(
            createBackendBridgeTrace({
              tool: "backendDeepAgentExecutiveBriefing",
              status: "failed",
              message: lastUserContent,
              selectedProjectId: args.selectedProjectId ?? null,
              detail,
            }),
          );
          console.error("[handler-v2] Deep Agents executive bridge failed", {
            message: detail,
            intent: plan.intent,
          });
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "backend-deep-agents",
              message: `Render Deep Agents executive bridge failed; falling back to local retrieval: ${detail}`,
              status: "warning",
              timestamp: new Date().toISOString(),
            },
          } as never);
        }
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
          onMemoryUsage: (usage) => {
            memoryUsage = usage;
          },
        }),
        executeRetrievalPlan(
          plan,
          buildExecutorDeps({ supabase: args.supabase, userId: args.user.id }),
          { sessionId: args.sessionId, message: lastUserContent },
        ),
      ]);
      latestRetrievalCtx = retrievalCtx;

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

      const assembledSystemPrompt = assembleSystemPromptFromContext(
        plan,
        retrievalCtx,
        baseSystemPrompt,
      );
      const systemPrompt =
        backendDeepAgentContextBlocks.length > 0
          ? [
              assembledSystemPrompt,
              "",
              "## Backend Deep Agents Context",
              "",
              ...backendDeepAgentContextBlocks,
            ].join("\n")
          : assembledSystemPrompt;

      const tools = createStrategistTools(args.user.id, {
        pinnedProjectId: args.selectedProjectId,
        sessionId: args.sessionId,
        includeActionTools: true,
        onTrace: (trace) => {
          const normalizedTrace = buildLiveToolTrace(trace, lastUserContent);
          if (normalizedTrace) liveToolTrace.push(normalizedTrace);
        },
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
          synthesis_model: synthesisModel,
        });
      }

      const modelMessages = await convertToModelMessages(args.messages);
      const lastModelUserMessage = modelMessages.findLast(
        (m) => m.role === "user",
      );
      const inputText = lastModelUserMessage
        ? (lastModelUserMessage.content as
            | { text?: string }[]
            | string
            | undefined) && typeof lastModelUserMessage.content === "string"
          ? lastModelUserMessage.content
          : ((lastModelUserMessage.content as { type: string; text?: string }[])
              ?.filter((p) => p.type === "text")
              .map((p) => p.text ?? "")
              .join(" ") ?? "")
        : "";

      const result = streamText({
        model: getLanguageModel(synthesisModel),
        system: systemPrompt,
        messages: modelMessages,
        tools,
        maxOutputTokens: assistantMaxOutputTokens(plan.reason),
        stopWhen: stepCountIs(10),
        experimental_telemetry: {
          isEnabled: process.env.PHOENIX_TRACING === "true",
          functionId: "ai-assistant-chat-v2",
        },
        onError: ({ error }) => {
          console.error("[handler-v2] streamText onError", {
            message: error instanceof Error ? error.message : String(error),
            stack:
              error instanceof Error
                ? error.stack?.split("\n").slice(0, 5).join("\n")
                : undefined,
          });
        },
        onFinish: ({ finishReason, totalUsage, text, toolCalls, steps }) => {
          // Aggregate tool call names across ALL agentic steps, not just the last.
          const toolCallNames =
            steps?.flatMap((s) => (s.toolCalls ?? []).map((c) => c.toolName)) ??
            toolCalls?.map((c) => c.toolName) ??
            [];
          finishMetadata = {
            finishReason,
            usage: {
              inputTokens: totalUsage.inputTokens,
              outputTokens: totalUsage.outputTokens,
              totalTokens: totalUsage.totalTokens,
            },
            toolCallNames,
            stepCount: steps?.length ?? toolCallNames.length,
          };
          console.log("[handler-v2] streamText onFinish", {
            finishReason,
            totalUsage,
            text_chars: text?.length ?? 0,
            text_preview: text?.slice(0, 200) ?? "",
            tool_calls: toolCallNames,
            step_count: steps?.length ?? 0,
          });
          waitUntil(
            traceChatCompletion({
              userId: args.user.id,
              sessionId: args.sessionId,
              modelId: synthesisModel,
              input: inputText,
              output: text ?? "",
              usage: {
                inputTokens: totalUsage.inputTokens,
                outputTokens: totalUsage.outputTokens,
              },
              toolCallNames,
              stepCount: steps?.length ?? toolCallNames.length,
              intent: plan.intent,
              metadata: {
                planReason: plan.reason,
                responseFormat: plan.responseFormat,
                retrievalSources: Object.keys(plan.sources),
                retrievalWarnings: retrievalCtx.warnings.map(
                  (w) => `${w.source}: ${w.message}`,
                ),
                retrievalDurationsMs: retrievalCtx.durationsMs,
                hasIntelligencePacket: Boolean(retrievalCtx.intelligencePacket),
                hasProjectSnapshot: Boolean(retrievalCtx.projectSnapshot),
                hasSemanticResults: Boolean(retrievalCtx.semanticVectorResults),
                selectedProjectId: args.selectedProjectId ?? null,
                selectedModel: args.activeModel,
                synthesisModel,
              },
            }),
          );
        },
      });

      writer.merge(
        result.toUIMessageStream({ originalMessages: args.messages }),
      );
    },
    onFinish: async ({ responseMessage, finishReason }) => {
      if (responseAlreadyPersisted) return;

      const assistantText = extractTextFromParts(responseMessage.parts);
      const assistantContent = assistantText.trim()
        ? assistantText
        : "The assistant could not get a usable response from the AI provider. This usually means the provider account is out of credits, over quota, or blocked by billing. I saved your question so it is not lost; after the provider billing issue is fixed, retry this message or choose a different model.";

      const dataParts = extractPersistableDataParts(responseMessage);
      const streamToolTrace =
        finishMetadata?.toolCallNames.map((tool) => ({
          tool,
          toolName: tool,
          status: "success",
          input: {
            message: lastUserContent.slice(0, 240),
            selectedProjectId: args.selectedProjectId ?? null,
          },
          timestamp: new Date().toISOString(),
        })) ?? [];
      const retrievalToolTrace = [
        buildRecentEmailTrace(
          latestRetrievalCtx?.recentEmailInbox,
          lastUserContent,
        ),
      ].filter((trace): trace is Record<string, unknown> => Boolean(trace));
      const toolTrace = [
        ...bridgeToolTrace,
        ...retrievalToolTrace,
        ...liveToolTrace,
        ...streamToolTrace,
      ];

      const metadata: Record<string, unknown> = {
        architecture: "retrieval-planner-v2",
        response_message_id: responseMessage.id,
        model: args.activeModel,
        synthesis_model: synthesisModel,
        provider_path: selectedDeepAgentsStrategist
          ? "render-backend-deep-agents+ai-gateway-synthesis"
          : "ai-gateway",
        finish_reason: finishMetadata?.finishReason ?? finishReason ?? null,
        empty_model_response: !assistantText.trim(),
        usage: finishMetadata?.usage ?? null,
        tool_trace: toolTrace,
        response_quality: buildResponseQualityMetadata({
          toolTrace,
          content: assistantContent,
        }),
        source_debug: buildAnswerDebugMetadata({
          orchestrator: "retrieval-planner-v2",
          plan,
          toolTrace,
          memoryUsage,
          sourceCoverage: latestRetrievalCtx?.warnings.map((warning) => ({
            sourceType: warning.source,
            status: "warning",
            notes: warning.message,
          })),
          outputPolicy: {
            maxOutputTokens: assistantMaxOutputTokens(plan.reason),
            stopWhen: "stepCountIs(10)",
          },
        }),
        retrieval_plan: {
          intent: plan.intent,
          reason: plan.reason,
          responseFormat: plan.responseFormat,
          sources: Object.keys(plan.sources),
        },
        step_count: finishMetadata?.stepCount ?? null,
      };

      if (memoryUsage) {
        metadata.memory_usage = memoryUsage;
      }

      if (dataParts.length > 0) {
        metadata.data_parts = dataParts;
      }

      const { error } = await args.supabase.from("chat_history").insert({
        session_id: args.sessionId,
        user_id: args.user.id,
        role: "assistant",
        content: assistantContent,
        metadata: metadata as Json,
      });

      if (error) {
        throw new Error(
          `Persisting the assistant response failed: ${error.message}`,
        );
      }

      const { error: conversationError } = await args.supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("session_id", args.sessionId)
        .eq("user_id", args.user.id);

      if (conversationError) {
        throw new Error(
          `Updating the assistant conversation failed: ${conversationError.message}`,
        );
      }

      waitUntil(runPostResponseTasks(args.sessionId, args.user.id));
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function handleChatV2({
  request,
}: {
  request: Request;
}): Promise<Response> {
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
  const {
    id: sessionId,
    messages,
    selectedProjectId,
    selectedModel,
  } = body as {
    id: string;
    messages: UIMessage[];
    selectedProjectId?: number;
    selectedModel?: unknown;
  };

  if (!sessionId || !messages?.length) {
    return new Response("session id and messages are required", {
      status: 400,
    });
  }

  const activeModel = isAiAssistantModelId(selectedModel)
    ? selectedModel
    : DEFAULT_AI_ASSISTANT_MODEL;

  return runChatV2({
    user,
    sessionId,
    messages,
    selectedProjectId,
    activeModel,
    supabase: createServiceClient(),
  });
}
