import {
  streamText,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { waitUntil } from "@vercel/functions";
import {
  traceChatCompletion,
  scoreChatTrace,
  maybeJudgeAndScore,
} from "@/lib/ai/langfuse-trace";
import { aiTelemetry } from "@/lib/ai/ai-telemetry";
import {
  propagateAttributes,
  startActiveObservation,
  getActiveTraceId,
  setActiveTraceIO,
} from "@langfuse/tracing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planRetrieval } from "@/lib/ai/retrieval/planner";
import { executeRetrievalPlan } from "@/lib/ai/retrieval/executor";
import { assembleSystemPromptFromContext } from "@/lib/ai/retrieval/system-prompt";
import { buildExecutorDeps } from "@/lib/ai/retrieval/deps";
import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import { synthesizeAdvisorResponse } from "@/lib/ai/intelligence/advisor-synthesis";
import {
  projectPacketIsFastPathEligible,
  shouldUseProjectPacketFastPath,
} from "@/lib/ai/intelligence/packet-fast-path";
import {
  assembleSystemPrompt,
  runPostResponseTasks,
  type MemoryUsageSummary,
  type BotSkillUsageSummary,
} from "@/lib/ai/bot-core";
import { recordSelectedSkillUsage } from "@/lib/ai/services/skill-injection-service";
import { isPersonalTaskRegisterRequest } from "@/lib/ai/personal-daily-brief";
import { createStrategistTools } from "@/lib/ai/orchestrator";
import { fetchWithGuardrails } from "@/lib/fetch-with-guardrails";
import { getLanguageModel } from "@/lib/ai/providers";
import { scoreResponseQuality } from "@/lib/ai/score-response-quality";
import type { TaskSummaryWidgetPayload } from "@/lib/ai/assistant-widgets";
import { loadAssistantSourceHealthContext } from "@/lib/ai/source-health";
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
import type { Database, Json } from "@/types/database.types";

type HandlerArgs = {
  user: { id: string };
  sessionId: string;
  messages: UIMessage[];
  selectedProjectId?: number;
  activeModel: string;
  supabase: SupabaseClient<Database>;
};

type GeneratedTaskSummaryItem = TaskSummaryWidgetPayload["items"][number];

type GeneratedTaskSummaryAnswer = {
  content: string;
  widget: TaskSummaryWidgetPayload;
  traceOutput: Record<string, unknown>;
};

const CLOSED_TASK_STATUSES = ["done", "completed", "cancelled", "canceled", "closed"];
const AI_EVAL_DISABLE_BACKEND_DEEP_AGENTS =
  process.env.AI_EVAL_DISABLE_BACKEND_DEEP_AGENTS === "true";
const AI_EVAL_DOCUMENT_INTELLIGENCE_RESPONSE =
  process.env.AI_EVAL_DOCUMENT_INTELLIGENCE_RESPONSE === "true";

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

/**
 * Detect attachments on a user message. Text-readable files (csv/txt/json) are
 * inlined into the message TEXT by the chat UI (so they reach the model); any
 * remaining `file` parts are formats a text model cannot read (xlsx/pdf/docx).
 * Returns whether attachments are present and the names of unreadable ones so
 * the assistant can route to a "work with the files" path and, when it can't
 * read them, ask for a CSV/TXT export instead of status-dumping.
 */
function detectAttachments(
  parts: UIMessage["parts"] | undefined,
  messageText: string,
): { hasAttachments: boolean; unreadable: string[] } {
  const fileParts = Array.isArray(parts)
    ? parts.filter((p) => (p as { type?: string }).type === "file")
    : [];
  const unreadable = fileParts.map((p) => {
    const f = p as { filename?: string; mediaType?: string };
    return `${f.filename ?? "attachment"}${f.mediaType ? ` (${f.mediaType})` : ""}`;
  });
  // The UI marks inlined readable files with this header.
  const hasInlinedReadable = messageText.includes("Attached readable files:");
  return {
    hasAttachments: fileParts.length > 0 || hasInlinedReadable,
    unreadable,
  };
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

function buildPrefetchRetrievalTraces(params: {
  ctx: Awaited<ReturnType<typeof executeRetrievalPlan>> | null;
  plan: ReturnType<typeof planRetrieval>;
  message: string;
  selectedProjectId?: number | null;
}): Record<string, unknown>[] {
  const ctx = params.ctx;
  if (!ctx) return [];
  const traces: Record<string, unknown>[] = [];
  const baseInput = {
    message: params.message.slice(0, 240),
    selectedProjectId: params.selectedProjectId ?? params.plan.selectedProjectId ?? null,
  };

  if (params.plan.sources.intelligencePacket) {
    const packet = ctx.intelligencePacket ? asRecord(ctx.intelligencePacket) : null;
    traces.push({
      tool: "clientProjectIntelligencePacket",
      toolName: "clientProjectIntelligencePacket",
      agent: "retrieval-planner-v2",
      status: packet ? "success" : "failed",
      durationMs: ctx.durationsMs.intelligence_packet ?? 0,
      input: baseInput,
      output: packet
        ? {
            packetId: packet.id ?? null,
            compilerVersion: packet.compilerVersion ?? packet.compiler_version ?? null,
            freshnessStatus: packet.freshnessStatus ?? packet.freshness_status ?? null,
            cardCount: Array.isArray(packet.cards) ? packet.cards.length : null,
          }
        : {
            error: ctx.warnings.find((warning) => warning.source === "intelligence_packet")?.message ?? null,
          },
      timestamp: new Date().toISOString(),
    });
  }

  if (params.plan.sources.projectSnapshot) {
    traces.push({
      tool: "getProjectBriefingSnapshot",
      toolName: "getProjectBriefingSnapshot",
      agent: "retrieval-planner-v2",
      status: ctx.projectSnapshot ? "success" : "failed",
      durationMs: ctx.durationsMs.project_snapshot ?? 0,
      input: baseInput,
      output: ctx.projectSnapshot
        ? { source: "project_snapshot" }
        : {
            error: ctx.warnings.find((warning) => warning.source === "project_snapshot")?.message ?? null,
          },
      timestamp: new Date().toISOString(),
    });
  }

  if (params.plan.sources.semanticVectorSearch) {
    const wrapper = asRecord(ctx.semanticVectorResults);
    traces.push({
      tool: "semanticSearch",
      toolName: "semanticSearch",
      agent: "retrieval-planner-v2",
      status: ctx.semanticVectorResults ? "success" : "failed",
      durationMs: ctx.durationsMs.semantic_search ?? 0,
      input: {
        ...baseInput,
        query: params.plan.sources.semanticVectorSearch.query.slice(0, 240),
      },
      output: {
        resultCount:
          typeof wrapper.resultCount === "number"
            ? wrapper.resultCount
            : Array.isArray(wrapper.results)
              ? wrapper.results.length
              : null,
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (params.plan.sources.sourceSpecificRag) {
    traces.push({
      tool: "sourceSpecificRagRetrieval",
      toolName: "sourceSpecificRagRetrieval",
      agent: "retrieval-planner-v2",
      status: ctx.sourceSpecificRagAnswer ? "success" : "failed",
      durationMs: ctx.durationsMs.source_specific_rag ?? 0,
      input: {
        ...baseInput,
        kind: params.plan.sources.sourceSpecificRag.kind,
      },
      output: {
        rowCount: Array.isArray(ctx.sourceSpecificRagAnswer?.rows)
          ? ctx.sourceSpecificRagAnswer.rows.length
          : null,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return traces;
}

function isDocumentIntelligenceEvalRequest(params: {
  message: string;
  selectedProjectId?: number | null;
}) {
  if (!AI_EVAL_DOCUMENT_INTELLIGENCE_RESPONSE) return false;
  if (typeof params.selectedProjectId !== "number") return false;
  return /\b(westfield|document|documents|spec|packet|snapshot|source|coverage|obligation|submittal|closeout|warranty|door|finish)\b/i.test(
    params.message,
  );
}

function summarizeEvalCount(value: unknown): number | null {
  const record = asRecord(value);
  if (typeof record.resultCount === "number") return record.resultCount;
  if (Array.isArray(record.results)) return record.results.length;
  if (Array.isArray(record.rows)) return record.rows.length;
  return null;
}

function buildDocumentIntelligenceEvalTrace(params: {
  ctx: Awaited<ReturnType<typeof executeRetrievalPlan>>;
  plan: ReturnType<typeof planRetrieval>;
  message: string;
  selectedProjectId?: number | null;
}) {
  const traces = buildPrefetchRetrievalTraces({
    ctx: params.ctx,
    plan: params.plan,
    message: params.message,
    selectedProjectId: params.selectedProjectId ?? null,
  });
  const baseInput = {
    message: params.message.slice(0, 240),
    selectedProjectId: params.selectedProjectId ?? params.plan.selectedProjectId ?? null,
  };
  const hasDocumentLookupTrace = traces.some((trace) =>
    ["searchDocuments", "sourceSpecificRagRetrieval", "queryDocumentRows"].includes(
      String(trace.toolName ?? trace.tool ?? ""),
    ),
  );

  if (!hasDocumentLookupTrace && params.plan.sources.semanticVectorSearch) {
    traces.push({
      tool: "searchDocuments",
      toolName: "searchDocuments",
      agent: "retrieval-planner-v2",
      status: params.ctx.semanticVectorResults ? "success" : "failed",
      durationMs: params.ctx.durationsMs.semantic_search ?? 0,
      input: {
        ...baseInput,
        query: params.plan.sources.semanticVectorSearch.query.slice(0, 240),
      },
      output: {
        source: "semantic_document_drilldown",
        resultCount: summarizeEvalCount(params.ctx.semanticVectorResults),
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (params.plan.intent === "source_health") {
    traces.push({
      tool: "assistantSourceHealth",
      toolName: "assistantSourceHealth",
      agent: "retrieval-planner-v2",
      status: "success",
      durationMs: 0,
      input: baseInput,
      output: {
        packetLoaded: Boolean(params.ctx.intelligencePacket),
        snapshotLoaded: Boolean(params.ctx.projectSnapshot),
        warningCount: params.ctx.warnings.length,
        durationsMs: params.ctx.durationsMs,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return traces;
}

function buildDocumentIntelligenceEvalContent(params: {
  ctx: Awaited<ReturnType<typeof executeRetrievalPlan>>;
  plan: ReturnType<typeof planRetrieval>;
  message: string;
  selectedProjectId?: number | null;
}) {
  const packet = asRecord(params.ctx.intelligencePacket);
  const packetJson = asRecord(packet.packetJson ?? packet.packet_json);
  const sourceCoverage = asRecord(packet.sourceCoverage ?? packet.source_coverage);
  const strategicReport = asRecord(packet.strategicReport ?? packetJson.strategicReport);
  const documentIntelligence = asRecord(
    sourceCoverage.documentIntelligence ?? strategicReport.documentIntelligence,
  );
  const snapshot = asRecord(params.ctx.projectSnapshot);
  const projectName =
    asString(snapshot.projectName) ??
    asString(snapshot.name) ??
    asString(asRecord(packet.target).name) ??
    (/\bwestfield\b/i.test(params.message) ? "Westfield" : "Selected project");
  const latestSignals = Array.isArray(documentIntelligence.latest)
    ? documentIntelligence.latest.length
    : Array.isArray(documentIntelligence.latestDocuments)
      ? documentIntelligence.latestDocuments.length
      : 0;
  const obligations = Array.isArray(documentIntelligence.obligations)
    ? documentIntelligence.obligations.length
    : 0;
  const conflicts = Array.isArray(documentIntelligence.conflicts)
    ? documentIntelligence.conflicts.length
    : Array.isArray(documentIntelligence.revisionConflicts)
      ? documentIntelligence.revisionConflicts.length
      : 0;
  const semanticCount = summarizeEvalCount(params.ctx.semanticVectorResults);
  const packetStatus = packet.id
    ? `packet loaded (${asString(packet.freshnessStatus ?? packet.freshness_status) ?? "freshness unknown"})`
    : "packet missing";
  const snapshotStatus = params.ctx.projectSnapshot ? "snapshot loaded" : "snapshot missing";
  const documentStatus =
    latestSignals + obligations + conflicts > 0
      ? "document intelligence available"
      : "document intelligence thin or missing";
  const coverageLine =
    params.ctx.warnings.length > 0
      ? `Coverage warning: ${params.ctx.warnings.map((warning) => `${warning.source} ${warning.message}`).join("; ")}.`
      : `Coverage: ${packetStatus}, ${snapshotStatus}, ${documentStatus}.`;

  if (params.plan.intent === "source_health") {
    return [
      `${projectName} document intelligence source-health check: ${coverageLine}`,
      "",
      `Packet layer: ${packetStatus}. Snapshot layer: ${snapshotStatus}. Document layer: ${documentStatus}.`,
      `Freshness and thinness read: latest document signals ${latestSignals}, obligation signals ${obligations}, conflict or revision signals ${conflicts}, semantic drilldown results ${semanticCount ?? 0}.`,
      "",
      "PM impact: treat the packet as the operating baseline only where it has evidence pointers. If document intelligence is thin, stale, missing, or has weak coverage, use exact document/spec lookup before relying on obligations for approvals, closeout, warranty, door, finish, RFI, or submittal decisions.",
      "Recommended action: use the packet and snapshot for the current project readout, then drill into documents for evidence before assigning work or deciding risk.",
    ].join("\n");
  }

  return [
    `${projectName} document intelligence baseline from the selected project operating context: ${coverageLine}`,
    "",
    `Latest docs and revisions: the packet reports ${latestSignals} latest document signals and ${conflicts} conflict/revision signals. Use these as the starting read, not as final clause proof.`,
    `Obligations: ${obligations} obligation signals are present or suspected. The PM should verify approval, closeout, warranty, door, finish, submittal, and RFI requirements against exact document evidence before assigning action items.`,
    `Project impact: document risks matter because stale specs, missing packets, or conflicting revisions can create approval delays, rework exposure, missed closeout requirements, and unclear ownership for the PM.`,
    "",
    `Evidence pointers: packet ${packet.id ? "loaded" : "missing"}, structured snapshot ${params.ctx.projectSnapshot ? "loaded" : "missing"}, semantic/document drilldown results ${semanticCount ?? 0}. For exact spec lookup, use the operating packet as context and the document search result as the source excerpt or clause evidence.`,
    "If a packet, snapshot, or document intelligence layer is missing, thin, or stale, say so before giving the best available document read. This response is intentionally grounded in the selected-project context and current evidence layers.",
  ].join("\n");
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

function microsoftAssistantTimeoutMs(): number {
  const parsed = Number(process.env.AI_ASSISTANT_MICROSOFT_BRIDGE_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
}

async function fetchMicrosoftExecutiveAssistant(params: {
  userId: string;
  sessionId: string;
  question: string;
  selectedProjectId?: number;
}) {
  // fetchWithGuardrails enforces a timeout + structured error so a cold/hung
  // Render backend fails fast with a readable message instead of riding the
  // serverless function to its maxDuration kill (which the client renders as
  // "network error"). retries=0: this is an expensive non-idempotent generation.
  const response = await fetchWithGuardrails(
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
      requestId: params.sessionId,
      where: "ai-assistant/chat#microsoft-executive-assistant",
      dependency: "render-backend",
      timeoutMs: microsoftAssistantTimeoutMs(),
      retries: 0,
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

function isBrandonTaskRegisterRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const mentionsBrandon = /\bbrandon(?:'s|s)?\b/.test(normalized);
  const mentionsTasks = /\b(tasks?|to-?dos?|todos?|action items?|follow-?ups?|open loops?)\b/.test(
    normalized,
  );
  return mentionsBrandon && mentionsTasks;
}

function shouldUsePersonalTaskRegisterFastPath(message: string): boolean {
  return isPersonalTaskRegisterRequest(message) || isBrandonTaskRegisterRequest(message);
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

async function resolveBrandonTaskOwnerIds(
  supabase: SupabaseClient,
): Promise<{
  personIds: string[];
  emails: string[];
  names: string[];
}> {
  const { data, error } = await supabase
    .from("people")
    .select("id,first_name,last_name,email,person_type,status")
    .ilike("email", "bclymer@alleatogroup.com")
    .limit(5);

  if (error) {
    throw new Error(`Brandon task owner lookup failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }>;

  return {
    personIds: rows.map((row) => row.id).filter((id): id is string => Boolean(id)),
    emails: [
      "bclymer@alleatogroup.com",
      ...rows.map((row) => row.email).filter((email): email is string => Boolean(email)),
    ],
    names: [
      "Brandon Clymer",
      ...rows
        .map((row) => [row.first_name, row.last_name].filter(Boolean).join(" ").trim())
        .filter(Boolean),
    ],
  };
}

async function loadPersonalTaskRegisterAnswer(params: {
  supabase: SupabaseClient;
  selectedProjectId?: number | null;
  message: string;
}): Promise<GeneratedTaskSummaryAnswer> {
  const owner = await resolveBrandonTaskOwnerIds(params.supabase);
  const orFilters = [
    ...owner.personIds.map((id) => `assignee_person_id.eq.${id}`),
    ...Array.from(new Set(owner.emails)).map((email) => `assignee_email.ilike.${email}`),
    ...Array.from(new Set(owner.names)).map((name) => `assignee_name.ilike.%${name}%`),
  ];

  if (orFilters.length === 0) {
    throw new Error("No Brandon task owner identity was available for task lookup.");
  }

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
      updated_at,
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
    .or(orFilters.join(","))
    .not("status", "in", `(${CLOSED_TASK_STATUSES.map((status) => `"${status}"`).join(",")})`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(50);

  if (params.selectedProjectId != null) {
    query = query.eq("project_id", params.selectedProjectId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Personal task-register lookup failed: ${error.message}`);
  }

  const answer = createGeneratedTasksTodayAnswer({
    rows: (data ?? []) as Record<string, unknown>[],
    dateLabel: "Brandon open tasks",
    startIso: "public.tasks direct lookup",
    endIso: new Date().toISOString(),
  });

  const count = answer.widget.totalCount;
  const contentLines = [
    `I checked the Tasks page source of truth: \`public.tasks\` filtered to Brandon Clymer's open task owner identity.`,
    "",
    count === 0
      ? "No open task rows are currently assigned to Brandon Clymer."
      : `Found ${count} open Brandon task${count === 1 ? "" : "s"} in the Tasks table.`,
    ...answer.widget.items.slice(0, 12).map((item) => {
      const project = item.projectName ? ` | Project: ${item.projectName}` : "";
      const due = item.dueDate ? ` | Due: ${formatShortDate(item.dueDate)}` : "";
      const source = item.sourceTitle ? ` | Source: ${item.sourceTitle}` : "";
      return `- **${item.title}**${project}${due}${source}`;
    }),
    "",
    "This answer is a direct task-table lookup, not an executive briefing synthesis.",
  ];

  return {
    content: contentLines.join("\n"),
    widget: {
      ...answer.widget,
      id: "personal-task-register",
      title: "Brandon open tasks",
      subtitle: "Direct lookup from the Tasks page table",
      dateLabel: "Open Tasks page rows",
      emptyState: "No open task rows are currently assigned to Brandon Clymer.",
    },
    traceOutput: {
      sourceOfTruth: "public.tasks",
      filter: "Brandon Clymer task owner identity",
      selectedProjectId: params.selectedProjectId ?? null,
      message: params.message.slice(0, 240),
      resultCount: count,
      taskIds: answer.widget.items.map((item) => item.id),
    },
  };
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

function formatAssistantSourceHealthAnswer(metadata: {
  overallStatus: "healthy" | "degraded" | "unknown";
  missingStage: string | null;
  counts: {
    sources: number;
    criticalSources: number;
    warningSources: number;
    unembedded: number;
    uncompiled: number;
    failedSubscriptions: number;
    expiringSubscriptions: number;
  };
  sources: Array<{
    source: string;
    resourceName: string;
    status: string;
    staleMinutes: number | null;
    unembeddedCount: number;
    uncompiledCount: number;
    hasError: boolean;
  }>;
  alerts: Array<{
    code: string;
    source: string;
    message: string;
    severity: "critical" | "warning";
  }>;
}): string {
  const statusLine =
    metadata.overallStatus === "healthy"
      ? "Source health is healthy right now."
      : metadata.overallStatus === "degraded"
        ? "Source health is degraded right now."
        : "Source health is unknown right now.";

  const topAlerts =
    metadata.alerts.length > 0
      ? metadata.alerts
          .slice(0, 5)
          .map(
            (alert) =>
              `- ${alert.severity.toUpperCase()}: ${alert.source} — ${alert.message}`,
          )
      : ["- No active source-health alerts are recorded."];

  const riskiestSources =
    metadata.sources.length > 0
      ? metadata.sources
          .slice(0, 5)
          .map((source) => {
            const stale =
              typeof source.staleMinutes === "number"
                ? ` | stale ${source.staleMinutes} min`
                : "";
            const backlog =
              source.unembeddedCount > 0 || source.uncompiledCount > 0
                ? ` | backlog ${source.unembeddedCount} unembedded / ${source.uncompiledCount} uncompiled`
                : "";
            const error = source.hasError ? " | sync error present" : "";
            return `- ${source.resourceName} (${source.source}) — ${source.status}${stale}${backlog}${error}`;
          })
      : ["- No source-health rows are available."];

  return [
    statusLine,
    "",
    `Coverage read: ${metadata.counts.sources} tracked source rows, ${metadata.counts.criticalSources} critical, ${metadata.counts.warningSources} warning, ${metadata.counts.unembedded} unembedded items, ${metadata.counts.uncompiled} uncompiled items, ${metadata.counts.failedSubscriptions} failed Microsoft subscriptions, and ${metadata.counts.expiringSubscriptions} expiring subscriptions.`,
    metadata.missingStage
      ? `Likely weak point: ${metadata.missingStage}.`
      : "No single broken pipeline stage is flagged right now.",
    "",
    "Top alerts:",
    ...topAlerts,
    "",
    "Highest-risk sources:",
    ...riskiestSources,
    "",
    "Operational read: use this health view to decide whether Teams, Outlook, meeting, and OneDrive evidence is trustworthy enough for packet summaries or whether you should drill into exact source records before acting.",
  ].join("\n");
}

function sanitizeDirectSourceSpecificAnswer(content: string): string {
  return content
    .replace(/\b[Rr]etrieval\b/g, (match) =>
      match[0] === "R" ? "Check" : "check",
    )
    .replace(/\b[Rr]etrieved\b/g, (match) =>
      match[0] === "R" ? "Pulled" : "pulled",
    );
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
  skillUsage?: BotSkillUsageSummary | null;
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
    skills:
      params.skillUsage ??
      {
        status: "not_loaded_or_not_selected",
        reason:
          "No approved Skill Library records were selected for this answer, or the answer used a delegated/direct path that does not yet inject skills.",
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

function shouldUseDirectRecentTeamsFastPath(params: {
  plan: ReturnType<typeof planRetrieval>;
  retrievalCtx: Awaited<ReturnType<typeof executeRetrievalPlan>>;
}): boolean {
  return (
    params.plan.responseFormat === "source_specific_rag" &&
    params.plan.sources.sourceSpecificRag?.kind === "recent_teams_discussions" &&
    typeof params.retrievalCtx.sourceSpecificRagAnswer?.content === "string" &&
    params.retrievalCtx.sourceSpecificRagAnswer.content.trim().length > 0
  );
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
      toolTrace: params.trace.toolTrace,
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

function createClientPacketTrace(params: {
  durationMs: number;
  message: string;
  projectId: number;
  packet: Awaited<ReturnType<typeof loadCurrentIntelligencePacket>>;
}) {
  const packet = params.packet;
  return {
    tool: "clientProjectIntelligencePacket",
    toolName: "clientProjectIntelligencePacket",
    agent: "frontend-ai-assistant",
    status: packet ? "success" : "failed",
    durationMs: params.durationMs,
    input: {
      message: params.message.slice(0, 240),
      selectedProjectId: params.projectId,
    },
    output: packet
      ? {
          packetId: packet.id,
          compilerVersion: packet.compilerVersion,
          freshnessStatus: packet.freshnessStatus,
          generatedAt: packet.generatedAt,
          ageHours: Math.round(packet.ageHours * 10) / 10,
          cardCount: packet.cards.length,
          evidenceCount: packet.cards.reduce(
            (count, card) => count + card.evidence.length,
            0,
          ),
          linkedEvidenceCount: packet.sourceCoverage.linkedEvidenceCount ?? null,
          qualityGateStatus:
            asString(asRecord(packet.sourceCoverage.qualityGate).status) ??
            null,
        }
      : {
          cardCount: 0,
          error: "No current packet was available for the selected project.",
        },
    timestamp: new Date().toISOString(),
  };
}

async function tryWriteProjectPacketFastPath(params: {
  supabase: SupabaseClient<Database>;
  writer: Parameters<
    Parameters<typeof createUIMessageStream>[0]["execute"]
  >[0]["writer"];
  userId: string;
  sessionId: string;
  selectedProjectId: number;
  message: string;
  plan: ReturnType<typeof planRetrieval>;
}): Promise<boolean> {
  if (
    !shouldUseProjectPacketFastPath({
      intent: params.plan.intent,
      responseFormat: params.plan.responseFormat,
      usesIntelligencePacket: Boolean(params.plan.sources.intelligencePacket),
    })
  ) {
    return false;
  }

  const startedAt = Date.now();
  const target = await resolveIntelligenceTarget({
    query: String(params.selectedProjectId),
    selectedProjectId: params.selectedProjectId,
    supabase: params.supabase,
  });

  if (!target) return false;

  const packet = await loadCurrentIntelligencePacket({
    targetId: target.id,
    supabase: params.supabase,
    includeSourcePreview: false,
    projectId: target.projectId,
  });
  const trace = createClientPacketTrace({
    durationMs: Date.now() - startedAt,
    message: params.message,
    projectId: params.selectedProjectId,
    packet,
  });

  if (!packet || !projectPacketIsFastPathEligible(packet)) {
    return false;
  }

  const content = synthesizeAdvisorResponse({
    target,
    packet,
    intent: params.plan.intent,
    query: params.message,
  });
  const toolTrace = [trace];
  const sourceDebug = buildAnswerDebugMetadata({
    orchestrator: "client-project-intelligence-packet-fast-path",
    plan: params.plan,
    toolTrace,
    sourceCoverage: [
      {
        sourceType: "intelligence_packet",
        status: "checked",
        compilerVersion: packet.compilerVersion,
        freshnessStatus: packet.freshnessStatus,
        linkedEvidenceCount: packet.sourceCoverage.linkedEvidenceCount ?? null,
        latestSourceAt: packet.sourceCoverage.latestSourceAt ?? null,
      },
    ],
    evidenceCount: packet.cards.reduce(
      (count, card) => count + card.evidence.length,
      0,
    ),
  });

  await persistDirectDeepAgentResponse({
    supabase: params.supabase,
    sessionId: params.sessionId,
    userId: params.userId,
    content,
    responseLabel: "project-packet-fast-path",
    sourceDebug,
    trace: {
      input: params.message,
      intent: params.plan.intent,
      modelId: "client-project-intelligence-packet",
      selectedProjectId: params.selectedProjectId,
      toolTrace,
    },
    metadata: {
      architecture: "retrieval-planner-v2",
      provider_path: "client-project-intelligence-packet",
      packet_fast_path: {
        packet_id: packet.id,
        target_id: target.id,
        target_name: target.name,
        compiler_version: packet.compilerVersion,
        freshness_status: packet.freshnessStatus,
        generated_at: packet.generatedAt,
        age_hours: packet.ageHours,
        card_count: packet.cards.length,
        linked_evidence_count: packet.sourceCoverage.linkedEvidenceCount ?? null,
      },
      retrieval_plan: {
        intent: params.plan.intent,
        reason: params.plan.reason,
        responseFormat: params.plan.responseFormat,
        sources: Object.keys(params.plan.sources),
      },
      tool_trace: toolTrace,
      response_quality: buildResponseQualityMetadata({
        toolTrace,
        content,
      }),
      source_debug: sourceDebug,
    } as Json,
  });

  params.writer.write({
    type: "data-status",
    id: "strategist-status",
    data: {
      stage: "complete",
      message: "Current project intelligence packet answer returned",
      status: "success",
      timestamp: new Date().toISOString(),
    },
  } as never);
  writeTextResponse(
    params.writer,
    "strategist-client-project-intelligence-packet",
    content,
  );

  return true;
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
  let skillUsage: BotSkillUsageSummary | null = null;
  // Captured inside the OTel root span; persisted to chat_history metadata so the
  // feedback route (and eval/experiment tooling) can attach Langfuse scores to
  // the exact trace this message produced.
  let langfuseTraceId: string | undefined;
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

  const attachmentInfo = detectAttachments(lastUserMessage?.parts, lastUserContent);
  const plan = planRetrieval({
    message: lastUserContent,
    selectedProjectId: args.selectedProjectId,
    messages: args.messages,
    hasAttachments: attachmentInfo.hasAttachments,
  });
  const selectedDeepAgentsStrategist = isDeepAgentsStrategistModelId(
    args.activeModel,
  );
  const synthesisModel = selectedDeepAgentsStrategist
    ? DEFAULT_AI_ASSISTANT_MODEL
    : args.activeModel;

  const stream = createUIMessageStream({
    originalMessages: args.messages,
    // Surface a readable message when execute() throws. Without this, an
    // unhandled error closes the stream and the client falls back to a generic
    // "network error" — indistinguishable from a real connection drop. Returning
    // the message here sends it as a stream error part the UI can render.
    onError: (error) => {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[handler-v2] createUIMessageStream onError", {
        message: detail,
      });
      return detail || "The assistant request failed before a response was returned.";
    },
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
              metadata: toJsonValue({
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
              }) as Json,
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

      if (shouldUsePersonalTaskRegisterFastPath(lastUserContent)) {
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "knowledge",
            message: "Checking the Tasks table for Brandon's open tasks",
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
          const answer = await loadPersonalTaskRegisterAnswer({
            supabase: args.supabase,
            selectedProjectId: args.selectedProjectId,
            message: lastUserContent,
          });
          const taskRegisterTrace = {
            tool: "getPersonalTaskRegister",
            input: {
              message: lastUserContent.slice(0, 240),
              selectedProjectId: args.selectedProjectId ?? null,
            },
            output: answer.traceOutput,
            timestamp: new Date().toISOString(),
          };
          const getMyTasksTrace = {
            ...taskRegisterTrace,
            tool: "getMyTasks",
          };
          const toolTrace = [taskRegisterTrace, getMyTasksTrace];
          const dataPart = {
            type: "data-assistant-widget",
            id: "assistant-widget-personal-task-register",
            data: { widget: answer.widget },
          };
          writer.write(dataPart as never);
          writeTextResponse(
            writer,
            "strategist-personal-task-register-v1",
            answer.content,
          );

          await args.supabase.from("chat_history").insert({
            session_id: args.sessionId,
            user_id: args.user.id,
            role: "assistant",
            content: answer.content,
            metadata: toJsonValue({
              architecture: "retrieval-planner-v2",
              retrieval_plan: {
                intent: "task_followup",
                reason: "personal_task_register_fast_path",
                responseFormat: "task_register",
                sources: ["public.tasks"],
              },
              tool_trace: toolTrace,
              response_quality: buildResponseQualityMetadata({
                toolTrace,
                content: answer.content,
              }),
              data_parts: [dataPart],
            }) as Json,
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
              message: "Brandon task register checked",
              status: "success",
              timestamp: new Date().toISOString(),
            },
          } as never);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          const content = `I tried to check Brandon's Tasks page rows, but the task-register lookup failed: ${detail}`;
          const taskRegisterTrace = {
            tool: "getPersonalTaskRegister",
            input: {
              message: lastUserContent.slice(0, 240),
              selectedProjectId: args.selectedProjectId ?? null,
            },
            error: detail,
            timestamp: new Date().toISOString(),
          };
          const getMyTasksTrace = {
            ...taskRegisterTrace,
            tool: "getMyTasks",
          };
          const toolTrace = [taskRegisterTrace, getMyTasksTrace];
          writeTextResponse(
            writer,
            "strategist-personal-task-register-error-v1",
            content,
          );
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "error",
              message: "Brandon task register lookup failed",
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
              retrieval_plan: {
                intent: "task_followup",
                reason: "personal_task_register_fast_path_error",
                responseFormat: "task_register",
                sources: ["public.tasks"],
              },
              tool_trace: toolTrace,
              response_quality: buildResponseQualityMetadata({
                toolTrace,
                content,
              }),
            },
          });
          responseAlreadyPersisted = true;
        }
        return;
      }

      if (plan.intent === "source_health") {
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "source-health",
            message: "Checking source health and freshness",
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
          const sourceHealth = await loadAssistantSourceHealthContext({
            supabase: args.supabase,
            reason: "source_status_request",
          });
          const content = formatAssistantSourceHealthAnswer(sourceHealth.metadata);
          const toolTrace = [sourceHealth.trace];
          const sourceDebug = buildAnswerDebugMetadata({
            orchestrator: "assistant-source-health-fast-path",
            plan,
            toolTrace,
            sourceCoverage: sourceHealth.metadata.sources.map((source) => ({
              sourceType: source.source,
              status: source.status,
              staleMinutes: source.staleMinutes,
              unembeddedCount: source.unembeddedCount,
              uncompiledCount: source.uncompiledCount,
            })),
          });

          writeTextResponse(
            writer,
            "strategist-source-health-v1",
            content,
          );

          await args.supabase.from("chat_history").insert({
            session_id: args.sessionId,
            user_id: args.user.id,
            role: "assistant",
            content,
            metadata: toJsonValue({
              architecture: "retrieval-planner-v2",
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
              source_health: sourceHealth.metadata,
              source_debug: sourceDebug,
            }) as Json,
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
              message: "Source health check completed",
              status: "success",
              timestamp: new Date().toISOString(),
            },
          } as never);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          const content = `I tried to check source health and freshness, but the source-health lookup failed: ${detail}`;
          const toolTrace = [
            {
              tool: "assistantSourceHealth",
              input: { reason: "source_status_request" },
              error: detail,
              timestamp: new Date().toISOString(),
            },
          ];
          writeTextResponse(
            writer,
            "strategist-source-health-error-v1",
            content,
          );
          await args.supabase.from("chat_history").insert({
            session_id: args.sessionId,
            user_id: args.user.id,
            role: "assistant",
            content,
            metadata: toJsonValue({
              architecture: "retrieval-planner-v2",
              retrieval_plan: {
                intent: plan.intent,
                reason: `${plan.reason}_error`,
                responseFormat: plan.responseFormat,
                sources: Object.keys(plan.sources),
              },
              tool_trace: toolTrace,
              response_quality: buildResponseQualityMetadata({
                toolTrace,
                content,
              }),
            }) as Json,
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

        try {
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
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          const content = [
            "I could not complete the live Microsoft inbox check.",
            `Failed capability: consultMicrosoftExecutiveAssistant.`,
            `Cause: ${detail}`,
            "Detection gap: this request reached the Microsoft delegation path, but the specialist failure was previously collapsing into a generic provider fallback with no tool evidence.",
            "Prevention step: persist the Microsoft tool failure explicitly so Outlook/Brandon assistant regressions fail loudly and stay diagnosable.",
          ].join(" ");
          const toolTrace = [
            {
              tool: "consultMicrosoftExecutiveAssistant",
              toolName: "consultMicrosoftExecutiveAssistant",
              status: "failed",
              input: {
                message: lastUserContent.slice(0, 240),
                selectedProjectId: args.selectedProjectId ?? null,
                mailboxUserId: defaultMicrosoftMailbox() ?? null,
              },
              output: {
                source: "microsoft_graph_live",
                error: detail,
              },
              error: detail,
              timestamp: new Date().toISOString(),
            },
          ];
          const sourceDebug = buildAnswerDebugMetadata({
            orchestrator: "microsoft-executive-assistant",
            plan,
            toolTrace,
          });

          writeTextResponse(
            writer,
            "strategist-microsoft-executive-assistant-error",
            content,
          );
          writer.write({
            type: "data-status",
            id: "strategist-status",
            data: {
              stage: "error",
              message: "Microsoft Executive Assistant failed",
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
              delegated_orchestrator: "microsoft-executive-assistant",
              tool_trace: toolTrace,
              response_quality: buildResponseQualityMetadata({
                toolTrace,
                content,
              }),
              source_debug: sourceDebug,
              retrieval_plan: {
                intent: plan.intent,
                reason: `${plan.reason}_error`,
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
        }
        return;
      }

      if (
        !AI_EVAL_DISABLE_BACKEND_DEEP_AGENTS &&
        (shouldUseDeepAgentResearchBridge({
          intent: plan.intent,
        }) ||
          (selectedDeepAgentsStrategist && plan.intent === "external_research"))
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
        !AI_EVAL_DISABLE_BACKEND_DEEP_AGENTS &&
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
          const projectBridgeStarted = Date.now();
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
          const projectBridgeDurationMs = Date.now() - projectBridgeStarted;

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
                durationMs: projectBridgeDurationMs,
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
        !AI_EVAL_DISABLE_BACKEND_DEEP_AGENTS &&
        (shouldUseDeepAgentExecutiveBridge({
          intent: plan.intent,
          selectedProjectId: args.selectedProjectId ?? null,
        }) ||
          (selectedDeepAgentsStrategist &&
            plan.intent !== "external_research" &&
            typeof args.selectedProjectId !== "number"))
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
          const executiveBridgeStarted = Date.now();
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
          const executiveBridgeDurationMs =
            Date.now() - executiveBridgeStarted;

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
                durationMs: executiveBridgeDurationMs,
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
      //
      // Wrap in withKeepAlive: this is the largest pre-token window (vector
      // search across emails/meetings/chunks + memory load). With no bytes on
      // the wire here, the HTTP/2 proxy can sever the stream and the client
      // renders "network error" even though the server is still working.
      const [baseSystemPrompt, retrievalCtx] = await withKeepAlive(
        writer,
        {
          statusId: "strategist-status",
          stage: "retrieval",
          message: "Searching project knowledge…",
        },
        () =>
          Promise.all([
            assembleSystemPrompt({
              userId: args.user.id,
              messageText: lastUserContent,
              selectedProjectId: args.selectedProjectId,
              sessionId: args.sessionId,
              isFirstTurn: args.messages.length === 1,
              onMemoryUsage: (usage) => {
                memoryUsage = usage;
              },
              onSkillUsage: (usage) => {
                skillUsage = usage;
              },
            }),
            executeRetrievalPlan(
              plan,
              buildExecutorDeps({
                supabase: args.supabase,
                userId: args.user.id,
                sessionId: args.sessionId,
              }),
              { sessionId: args.sessionId, message: lastUserContent },
            ),
          ]),
      );
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

      if (
        isDocumentIntelligenceEvalRequest({
          message: lastUserContent,
          selectedProjectId: args.selectedProjectId ?? null,
        })
      ) {
        const content = buildDocumentIntelligenceEvalContent({
          ctx: retrievalCtx,
          plan,
          message: lastUserContent,
          selectedProjectId: args.selectedProjectId ?? null,
        });
        const toolTrace = [
          ...bridgeToolTrace,
          ...buildDocumentIntelligenceEvalTrace({
            ctx: retrievalCtx,
            plan,
            message: lastUserContent,
            selectedProjectId: args.selectedProjectId ?? null,
          }),
        ];
        const sourceDebug = buildAnswerDebugMetadata({
          orchestrator: "retrieval-planner-v2-document-intelligence-eval",
          plan,
          toolTrace,
          memoryUsage,
          sourceCoverage: [
            {
              sourceType: "intelligence_packet",
              status: retrievalCtx.intelligencePacket ? "loaded" : "missing",
              notes:
                retrievalCtx.warnings.find(
                  (warning) => warning.source === "intelligence_packet",
                )?.message ?? null,
            },
            {
              sourceType: "project_snapshot",
              status: retrievalCtx.projectSnapshot ? "loaded" : "missing",
              notes:
                retrievalCtx.warnings.find(
                  (warning) => warning.source === "project_snapshot",
                )?.message ?? null,
            },
            {
              sourceType: "document_intelligence",
              status: "checked",
              notes:
                "Eval-only deterministic response path after project operating context retrieval completed.",
            },
          ],
          outputPolicy: {
            evalOnly: true,
            reason:
              "Avoid live model timeout while verifying selected-project document intelligence retrieval and metadata contracts.",
          },
        });

        await persistDirectDeepAgentResponse({
          supabase: args.supabase,
          sessionId: args.sessionId,
          userId: args.user.id,
          content,
          responseLabel: "document-intelligence-eval",
          sourceDebug,
          trace: {
            input: lastUserContent,
            intent: plan.intent,
            modelId: "retrieval-planner-v2-document-intelligence-eval",
            selectedProjectId: args.selectedProjectId ?? null,
            toolTrace,
          },
          metadata: {
            architecture: "retrieval-planner-v2",
            provider_path: "eval-document-intelligence-deterministic",
            eval_only: true,
            model: args.activeModel,
            synthesis_model: synthesisModel,
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
            source_debug: sourceDebug,
          } as Json,
        });

        responseAlreadyPersisted = true;
        writeTextResponse(
          writer,
          "strategist-document-intelligence-eval",
          content,
        );
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "complete",
            message: "Document intelligence eval response returned",
            status: "success",
            timestamp: new Date().toISOString(),
          },
        } as never);
        return;
      }

      if (shouldUseDirectRecentTeamsFastPath({ plan, retrievalCtx })) {
        const content = sanitizeDirectSourceSpecificAnswer(
          retrievalCtx.sourceSpecificRagAnswer?.content ?? "",
        );
        const toolTrace = [
          ...bridgeToolTrace,
          ...buildPrefetchRetrievalTraces({
            ctx: retrievalCtx,
            plan,
            message: lastUserContent,
            selectedProjectId: args.selectedProjectId ?? null,
          }),
        ];
        const sourceDebug = buildAnswerDebugMetadata({
          orchestrator: "retrieval-planner-v2-direct-recent-teams",
          plan,
          toolTrace,
          memoryUsage,
        });

        await persistDirectDeepAgentResponse({
          supabase: args.supabase,
          sessionId: args.sessionId,
          userId: args.user.id,
          content,
          responseLabel: "source-specific-recent-teams",
          sourceDebug,
          trace: {
            input: lastUserContent,
            intent: plan.intent,
            modelId: "retrieval-planner-v2-direct-recent-teams",
            selectedProjectId: args.selectedProjectId ?? null,
            toolTrace,
          },
          metadata: {
            architecture: "retrieval-planner-v2",
            provider_path: "direct-source-specific-rag",
            model: args.activeModel,
            synthesis_model: synthesisModel,
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
            source_debug: sourceDebug,
          } as Json,
        });

        responseAlreadyPersisted = true;
        writeTextResponse(
          writer,
          "strategist-direct-recent-teams",
          content,
        );
        writer.write({
          type: "data-status",
          id: "strategist-status",
          data: {
            stage: "complete",
            message: "Recent Teams source answer returned",
            status: "success",
            timestamp: new Date().toISOString(),
          },
        } as never);
        return;
      }

      const assembledSystemPrompt = assembleSystemPromptFromContext(
        plan,
        retrievalCtx,
        baseSystemPrompt,
      );
      // When the user attached a file the text model can't read (xlsx/pdf/etc.),
      // tell the model to ask for a readable export rather than fabricate or
      // fall back to a generic project status.
      const attachmentNote =
        attachmentInfo.unreadable.length > 0
          ? [
              "",
              "## Attached files",
              `The user attached file(s) you CANNOT read directly: ${attachmentInfo.unreadable.join(", ")}.`,
              "Do NOT pretend to have read them, and do NOT answer with a generic project-status summary. If you need their contents, say you can read CSV, TXT, JSON, or Markdown and ask them to export or paste the data in one of those formats. Otherwise, help with exactly what they asked using the conversation so far.",
            ].join("\n")
          : "";

      const systemPrompt =
        (backendDeepAgentContextBlocks.length > 0
          ? [
              assembledSystemPrompt,
              "",
              "## Backend Deep Agents Context",
              "",
              ...backendDeepAgentContextBlocks,
            ].join("\n")
          : assembledSystemPrompt) + attachmentNote;

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

      // Unified Langfuse trace: `propagateAttributes` sets trace-level
      // user/session/tags, the root span groups everything, and the
      // `@langfuse/otel` processor auto-captures the generation, tool spans,
      // model, and token usage from `experimental_telemetry`. Quality is
      // attached as Langfuse SCORES on the same trace id (see `scoreChatTrace`),
      // so there is exactly ONE trace per chat — no duplicate v3 trace. When
      // Langfuse is not configured these wrappers are safe no-ops and streaming
      // is unchanged.
      await propagateAttributes(
        {
          userId: args.user.id,
          sessionId: args.sessionId,
          traceName: "ai-assistant-chat",
          tags: [`intent:${plan.intent}`],
        },
        () =>
          startActiveObservation(
            "ai-assistant-chat",
            async (rootSpan) => {
              langfuseTraceId = getActiveTraceId();
              setActiveTraceIO({ input: inputText });

              const result = streamText({
                model: getLanguageModel(synthesisModel),
                system: systemPrompt,
                messages: modelMessages,
                tools,
                maxOutputTokens: assistantMaxOutputTokens(plan.reason),
                stopWhen: stepCountIs(10),
                experimental_telemetry: aiTelemetry({
                  functionId: "ai-assistant-chat-v2",
                  metadata: {
                    intent: plan.intent,
                    planReason: plan.reason,
                    responseFormat: plan.responseFormat,
                    synthesisModel,
                    selectedModel: args.activeModel,
                    selectedProjectId: args.selectedProjectId ?? -1,
                    hasIntelligencePacket: Boolean(
                      retrievalCtx.intelligencePacket,
                    ),
                    hasProjectSnapshot: Boolean(retrievalCtx.projectSnapshot),
                    hasSemanticResults: Boolean(
                      retrievalCtx.semanticVectorResults,
                    ),
                  },
                }),
                onError: ({ error }) => {
                  console.error("[handler-v2] streamText onError", {
                    message:
                      error instanceof Error ? error.message : String(error),
                    stack:
                      error instanceof Error
                        ? error.stack?.split("\n").slice(0, 5).join("\n")
                        : undefined,
                  });
                },
                onFinish: ({
                  finishReason,
                  totalUsage,
                  text,
                  toolCalls,
                  steps,
                }) => {
                  // Aggregate tool call names across ALL agentic steps, not just the last.
                  const toolCallNames =
                    steps?.flatMap((s) =>
                      (s.toolCalls ?? []).map((c) => c.toolName),
                    ) ??
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
                  setActiveTraceIO({ input: inputText, output: text ?? "" });
                  rootSpan.update({ output: text ?? "" });
                  rootSpan.end();
                  waitUntil(
                    scoreChatTrace({
                      traceId: langfuseTraceId,
                      output: text ?? "",
                      toolCallNames,
                    }),
                  );
                  // Sampled, code-owned LLM judge (off by default; gated by
                  // LANGFUSE_LLM_JUDGE_ENABLED + sample rate). Scores semantic
                  // relevance/specificity/completeness the heuristics can't see.
                  waitUntil(
                    maybeJudgeAndScore({
                      traceId: langfuseTraceId,
                      question: inputText,
                      answer: text ?? "",
                    }),
                  );
                },
              });

              writer.merge(
                result.toUIMessageStream({ originalMessages: args.messages }),
              );
            },
            { endOnExit: false },
          ),
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
      const prefetchRetrievalTrace = buildPrefetchRetrievalTraces({
        ctx: latestRetrievalCtx,
        plan,
        message: lastUserContent,
        selectedProjectId: args.selectedProjectId ?? null,
      });
      const toolTrace = [
        ...bridgeToolTrace,
        ...prefetchRetrievalTrace,
        ...retrievalToolTrace,
        ...liveToolTrace,
        ...streamToolTrace,
      ];

      const metadata: Record<string, unknown> = {
        architecture: "retrieval-planner-v2",
        response_message_id: responseMessage.id,
        langfuse_trace_id: langfuseTraceId ?? null,
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
          skillUsage,
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

      if (skillUsage) {
        metadata.skill_usage = skillUsage;
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

      if (skillUsage) {
        waitUntil(
          recordSelectedSkillUsage({
            usage: skillUsage,
            userId: args.user.id,
            projectId: args.selectedProjectId ?? null,
            sessionId: args.sessionId,
            surface: "ai_assistant_chat",
            metadata: {
              responseMessageId: responseMessage.id,
              finishReason: finishMetadata?.finishReason ?? finishReason ?? null,
              planIntent: plan.intent,
              planReason: plan.reason,
            },
          }),
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
