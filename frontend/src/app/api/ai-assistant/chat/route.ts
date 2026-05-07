import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
  type UIMessageStreamWriter,
  type ToolSet,
} from "ai";
import { after } from "next/server";
import { z } from "zod";

import {
  hasAppCapability,
  loadAppCapabilityAccessForUser,
} from "@/lib/app-capabilities";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  DEFAULT_AI_ASSISTANT_MODEL,
  isAiAssistantModelId,
} from "@/lib/ai/assistant-models";
import {
  createStrategistTools,
} from "@/lib/ai/orchestrator";
import {
  assembleSystemPrompt,
  type BotLearningUsageSummary,
  type MemoryUsageSummary,
  runPostResponseTasks,
} from "@/lib/ai/bot-core";
import { recordAgentLearningUsages } from "@/lib/ai/services/agent-learning-service";
import { createToolGuardrails } from "@/lib/ai/tools/guardrails";
import { previewCreateRFI } from "@/lib/ai/tools/action-tools";
import { createAiAssistantMcpTools } from "@/lib/ai/tools/mcp-tools";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createStrategistFailureResponse } from "@/lib/ai/strategist-failure-response";
import {
  scoreResponseQuality,
  type ResponseQuality,
} from "@/lib/ai/score-response-quality";
import {
  recordRetrievalFeedbackBatch,
  type AiRetrievalOutcome,
  type RecordRetrievalFeedbackParams,
} from "@/lib/ai/services/feedback-event-service";
import {
  detectSourceSpecificRagRequest,
  detectSourceLookupRecentTeamsRequest,
  type SourceSpecificRagKind,
  type SourceSpecificRagRequest,
} from "@/lib/ai/detect-rag-request";
import {
  getAssistantToolCallingDecision,
  shouldEnableStreamingModelTools,
  type AssistantToolCallingDecision,
} from "@/lib/ai/provider-routing";
import {
  classifyAssistantIntent,
  shouldUsePacketFirstIntent,
  type AssistantIntent,
} from "@/lib/ai/intent-router";
import {
  identityLooksLikeBrandon,
  isDailyBriefCritiqueRequest,
  isExecutiveBriefingMetadataQuestion,
  isPersonalDailyBriefRequest,
  isPersonalTaskRegisterRequest,
  type SignedInBriefIdentity,
} from "@/lib/ai/personal-daily-brief";
import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import {
  loadAssistantSourceHealthContext,
  shouldAttachAssistantSourceHealth,
  type AssistantSourceHealthContext,
  type AssistantSourceHealthMetadata,
  type AssistantSourceHealthReason,
} from "@/lib/ai/source-health";
import {
  synthesizeAdvisorResponse,
  synthesizeMissingPacketResponse,
} from "@/lib/ai/intelligence/advisor-synthesis";
import type { BrandonDailyUpdatePacket } from "@/lib/executive/brandon-daily-update";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import { buildBrandonDailyUpdateWidget } from "@/lib/executive/brandon-daily-update-widget";
import {
  buildAssistantWidgetsFromPrompt,
  type AssistantWidgetPayload,
} from "@/lib/ai/assistant-widgets";
import {
  buildFeatureRequestPacketWidget,
  captureFeatureRequestFromChat,
  getFeatureRequestDetail,
  shouldCaptureFeatureRequest,
} from "@/lib/feature-requests/server";

export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Tool-loop diagnostic — captured via step callbacks, persisted per message.
// Gives us the prepared tool policy, finish reason, warnings, step count, and
// tool call count without touching live stream latency.
// ---------------------------------------------------------------------------
type StepStartDiagnostic = {
  stepNumber: number;
  modelProvider: string;
  modelId: string;
  toolChoice: string | undefined;
  activeTools: string[] | undefined;
  availableToolNames: string[];
};

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
  stepStarts: StepStartDiagnostic[];
  steps: StepDiagnostic[];
  preparedStepCount: number;
  totalStepCount: number;
  totalToolCallCount: number;
  finalFinishReason: string;
  totalWarningCount: number;
};

type ExecutableTool = {
  execute?: (input: Record<string, unknown>) => Promise<unknown>;
};

type SemanticSearchResult = {
  content?: unknown;
  sourceTable?: unknown;
  recordId?: unknown;
  sourceDocumentId?: unknown;
  sourceChunkId?: unknown;
  documentId?: unknown;
  chunkIndex?: unknown;
  similarity?: unknown;
  finalScore?: unknown;
  projectIds?: unknown;
  metadata?: unknown;
  createdAt?: unknown;
};

type SemanticSearchOutput = {
  query?: unknown;
  resultCount?: unknown;
  results?: SemanticSearchResult[];
  error?: unknown;
  message?: unknown;
};

type ProjectBriefingSnapshot = Record<string, unknown>;

type ExecutiveBriefingSourceName =
  | "meetings"
  | "teamsMessages"
  | "emails"
  | "oneDriveDocuments";

type ExecutiveBriefingSourceOutput = {
  source: ExecutiveBriefingSourceName;
  label: string;
  status: "loaded" | "empty" | "warning" | "error";
  resultCount: number;
  results: Array<Record<string, unknown>>;
  message?: string;
  error?: string;
};

type ExecutiveBriefingRetrievalPacket = {
  query: string;
  projectId?: number;
  projectName?: string;
  sources: ExecutiveBriefingSourceOutput[];
};

function isBrandonDailyUpdatePacket(value: unknown): value is BrandonDailyUpdatePacket {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.generatedAt === "string" &&
    typeof record.windowDays === "number" &&
    Array.isArray(record.sourceCoverage) &&
    record.sections !== null &&
    typeof record.sections === "object"
  );
}

function formatExecutiveBriefPacketContext(packet: BrandonDailyUpdatePacket): string {
  return [
    "# Executive Brief Packet",
    "You are responding from the executive brief page.",
    "Treat the packet below as first-party operating context for Brandon's current brief.",
    "Lead with the most actionable points. When you suggest follow-up work, prefer owner, due date, business impact, and what evidence supports the recommendation.",
    "If the user asks you to save or create a durable operational follow-up, use the createInitiativeCard tool.",
    'For executive-page follow-up plans, prefer labels ["Executive", "Operational Improvement"] and, when the brief item has a sourceId, set linkedRecordType to "executive_source" and linkedRecordId to that sourceId.',
    "If the user asks for something not covered by the packet, say so clearly and then use tools or broader assistant context to fill the gap.",
    "",
    JSON.stringify(packet, null, 2),
  ].join("\n");
}

function formatBriefTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

type ExecutiveBriefingMetadataAnswer = {
  content: string;
  traceOutput: Record<string, unknown>;
};

type PersonTaskIdentity = {
  personId: string | null;
  displayName: string;
  names: string[];
  emails: string[];
};

type PersonalTaskItem = {
  id: string;
  title: string;
  detail?: string | null;
  dueDate?: string | null;
  status?: string | null;
  priority?: string | null;
  projectId?: number | null;
  projectLabel?: string | null;
  source: "tasks" | "schedule_tasks" | "executive_briefing_follow_ups" | "executive_brief_packet";
  sourceLabel: string;
  confidence: "verified" | "matched" | "briefing";
  sourceDate?: string | null;
  recommendedAction?: string | null;
};

type PersonalTaskRegister = {
  identity: PersonTaskIdentity;
  verifiedTasks: PersonalTaskItem[];
  scheduleTasks: PersonalTaskItem[];
  briefingTasks: PersonalTaskItem[];
  sourceErrors: string[];
  checkedSources: string[];
};

function createExecutiveBriefingMetadataAnswer(params: {
  packet: BrandonDailyUpdatePacket;
  row?: Record<string, unknown> | null;
}): ExecutiveBriefingMetadataAnswer {
  const generatedAt = formatBriefTimestamp(params.packet.generatedAt);
  const createdAt = formatBriefTimestamp(asString(params.row?.created_at));
  const approvedAt = formatBriefTimestamp(asString(params.row?.approved_at));
  const sentAt = formatBriefTimestamp(asString(params.row?.sent_at));
  const status = asString(params.row?.workflow_status);
  const recapDate = asString(params.row?.recap_date);

  const lines = [
    generatedAt
      ? `The daily operating brief was generated ${generatedAt}.`
      : "I found the daily operating brief packet, but its generated timestamp was not readable.",
  ];

  const details = [
    createdAt ? `Record created: ${createdAt}` : null,
    approvedAt ? `Approved: ${approvedAt}` : null,
    sentAt ? `Sent: ${sentAt}` : null,
    status ? `Workflow status: ${status}` : null,
    recapDate ? `Briefing date: ${recapDate}` : null,
  ].filter((detail): detail is string => Boolean(detail));

  if (details.length > 0) {
    lines.push("", ...details.map((detail) => `- ${detail}`));
  }

  lines.push(
    "",
    "Source: the executive briefing packet and `daily_recaps.recap_kind=executive_briefing`.",
  );

  return {
    content: lines.join("\n"),
    traceOutput: {
      packetGeneratedAt: params.packet.generatedAt,
      recordCreatedAt: asString(params.row?.created_at),
      approvedAt: asString(params.row?.approved_at),
      sentAt: asString(params.row?.sent_at),
      workflowStatus: status,
      recapDate,
      sourceOfTruth: "daily_recaps.recap_kind=executive_briefing",
    },
  };
}

async function loadLatestExecutiveBriefingMetadataAnswer(params: {
  supabase: ReturnType<typeof createServiceClient>;
  packet: BrandonDailyUpdatePacket | null;
}): Promise<ExecutiveBriefingMetadataAnswer | null> {
  if (params.packet) {
    return createExecutiveBriefingMetadataAnswer({ packet: params.packet });
  }

  const { data, error } = await params.supabase
    .from("daily_recaps")
    .select("id,recap_date,created_at,approved_at,sent_at,workflow_status,briefing_packet")
    .eq("recap_kind", "executive_briefing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load latest executive briefing metadata: ${error.message}`);
  }

  const row = data as Record<string, unknown> | null;
  const packet = isBrandonDailyUpdatePacket(row?.briefing_packet)
    ? row.briefing_packet
    : null;

  if (!packet) return null;

  return createExecutiveBriefingMetadataAnswer({ packet, row });
}

function normalizeIdentityValue(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function displayPersonName(row: Record<string, unknown> | null): string | null {
  if (!row) return null;
  return [asString(row.first_name), asString(row.last_name)]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim() || null;
}

function uniqStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function readableErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return (
      asString(record.message) ??
      asString(record.details) ??
      asString(record.hint) ??
      JSON.stringify(record)
    );
  }
  return String(error);
}

async function loadPersonTaskIdentity(params: {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  userEmail?: string | null;
}): Promise<PersonTaskIdentity> {
  const normalizedUserEmail = normalizeIdentityValue(params.userEmail);
  const [profileResult, authLinkResult, personByAuthResult] = await Promise.all([
    params.supabase
      .from("user_profiles")
      .select("full_name,email")
      .eq("id", params.userId)
      .maybeSingle(),
    params.supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", params.userId)
      .maybeSingle(),
    params.supabase
      .from("people")
      .select("id,first_name,last_name,email")
      .eq("auth_user_id", params.userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error(`Failed to load current user's profile: ${profileResult.error.message}`);
  }
  if (authLinkResult.error) {
    throw new Error(`Failed to load current user's auth-person link: ${authLinkResult.error.message}`);
  }
  if (personByAuthResult.error) {
    throw new Error(`Failed to load current user's person record: ${personByAuthResult.error.message}`);
  }

  let person = personByAuthResult.data as Record<string, unknown> | null;
  const personId = asString(
    (authLinkResult.data as Record<string, unknown> | null)?.person_id,
  );

  if (!person && personId) {
    const { data, error } = await params.supabase
      .from("people")
      .select("id,first_name,last_name,email")
      .eq("id", personId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to resolve current user's person record: ${error.message}`);
    }
    person = data as Record<string, unknown> | null;
  }

  if (!person && normalizedUserEmail) {
    const { data, error } = await params.supabase
      .from("people")
      .select("id,first_name,last_name,email")
      .ilike("email", normalizedUserEmail)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to resolve current user's person email: ${error.message}`);
    }
    person = data as Record<string, unknown> | null;
  }

  const profileRecord = profileResult.data as Record<string, unknown> | null;
  const resolvedPersonId = asString(person?.id) ?? personId;
  const personName = displayPersonName(person);
  const profileName = asString(profileRecord?.full_name);
  const emails = uniqStrings([
    asString(person?.email),
    asString(profileRecord?.email),
    params.userEmail,
  ]);
  const names = uniqStrings([
    personName,
    profileName,
    ...emails.map((email) => email.split("@")[0]?.replace(/[._-]+/g, " ")),
  ]);

  return {
    personId: resolvedPersonId,
    displayName: personName ?? profileName ?? emails[0] ?? "you",
    names,
    emails,
  };
}

function isOpenTaskStatus(status: unknown): boolean {
  const normalized = String(status ?? "").trim().toLowerCase();
  return ![
    "closed",
    "complete",
    "completed",
    "done",
    "cancelled",
    "canceled",
    "resolved",
    "void",
    "rejected",
  ].includes(normalized);
}

function rowMatchesIdentity(row: Record<string, unknown>, identity: PersonTaskIdentity): boolean {
  const assigneeName = normalizeIdentityValue(asString(row.assignee_name) ?? asString(row.assignee));
  const assigneeEmail = normalizeIdentityValue(asString(row.assignee_email));
  const owner = normalizeIdentityValue(asString(row.owner));
  const haystack = [assigneeName, assigneeEmail, owner]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  if (identity.personId && asString(row.assignee_person_id) === identity.personId) return true;
  if (identity.emails.some((email) => haystack.includes(email.toLowerCase()))) return true;
  return identity.names.some((name) => {
    const normalizedName = normalizeIdentityValue(name);
    return Boolean(normalizedName && haystack.includes(normalizedName));
  });
}

function dedupeTaskItems(items: PersonalTaskItem[]): PersonalTaskItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadProjectLabels(
  supabase: ReturnType<typeof createServiceClient>,
  projectIds: number[],
): Promise<Map<number, string>> {
  const uniqueProjectIds = Array.from(new Set(projectIds.filter(Number.isFinite)));
  if (uniqueProjectIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("projects")
    .select("id,name")
    .in("id", uniqueProjectIds)
    .limit(200);

  if (error) {
    throw new Error(`Failed to load project names for task register: ${error.message}`);
  }

  return new Map(
    (data ?? [])
      .filter((row) => typeof row.id === "number")
      .map((row) => [row.id as number, asString(row.name) ?? `Project ${row.id}`]),
  );
}

function formatTaskLine(item: PersonalTaskItem): string {
  const due = item.dueDate ? ` | Due: ${item.dueDate}` : "";
  const project = item.projectLabel ? ` | Project: ${item.projectLabel}` : "";
  const status = item.status ? ` | Status: ${item.status}` : "";
  const action = item.recommendedAction ? ` | Move: ${item.recommendedAction}` : "";
  return `- **${item.title}**${project}${due}${status}${action} [${item.sourceLabel}]`;
}

function createPersonalTaskRegisterAnswer(register: PersonalTaskRegister): {
  content: string;
  traceOutput: Record<string, unknown>;
} {
  const total =
    register.verifiedTasks.length +
    register.scheduleTasks.length +
    register.briefingTasks.length;
  const lines = [
    `I checked the task register for ${register.identity.displayName}.`,
    "",
  ];

  if (register.verifiedTasks.length > 0) {
    lines.push(
      `**Verified Assigned Tasks** (${register.verifiedTasks.length})`,
      ...register.verifiedTasks.slice(0, 12).map(formatTaskLine),
      "",
    );
  }

  if (register.scheduleTasks.length > 0) {
    lines.push(
      `**Schedule Tasks With Matching Assignee Text** (${register.scheduleTasks.length})`,
      ...register.scheduleTasks.slice(0, 8).map(formatTaskLine),
      "",
    );
  }

  if (register.briefingTasks.length > 0) {
    lines.push(
      `**Executive Briefing Action Items** (${register.briefingTasks.length})`,
      ...register.briefingTasks.slice(0, 8).map(formatTaskLine),
      "",
    );
  }

  if (total === 0) {
    lines.push(
      "I did not find any open task rows directly assigned to you in the checked task sources.",
      "",
    );
  }

  if (register.sourceErrors.length > 0) {
    lines.push(
      "**Data Gaps**",
      ...register.sourceErrors.map((error) => `- ${error}`),
      "",
    );
  }

  lines.push(
    "**Sources Checked**",
    ...register.checkedSources.map((source) => `- ${source}`),
  );

  return {
    content: lines.join("\n").trim(),
    traceOutput: {
      personId: register.identity.personId,
      displayName: register.identity.displayName,
      verifiedTaskCount: register.verifiedTasks.length,
      scheduleTaskCount: register.scheduleTasks.length,
      briefingTaskCount: register.briefingTasks.length,
      sourceErrors: register.sourceErrors,
      checkedSources: register.checkedSources,
    },
  };
}

async function loadPersonalTaskRegister(params: {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  userEmail?: string | null;
  packet: BrandonDailyUpdatePacket | null;
}): Promise<PersonalTaskRegister> {
  const identity = await loadPersonTaskIdentity(params);
  const sourceErrors: string[] = [];
  const checkedSources = [
    "tasks.assignee_person_id / assignee_email / assignee_name",
    "schedule_tasks.assignee text",
    "executive_briefing_follow_ups.owner",
  ];
  if (params.packet) checkedSources.push("current executive brief packet");

  const taskRows: Record<string, unknown>[] = [];

  if (identity.personId) {
    const { data, error } = await params.supabase
      .from("tasks")
      .select(
        "id,title,description,status,due_date,priority,project_id,project_ids,assignee_name,assignee_email,assignee_person_id,source_system,created_at,updated_at,file_name,extraction_source",
      )
      .eq("assignee_person_id", identity.personId)
      .limit(100);
    if (error) {
      throw new Error(`Verified task lookup failed by person id: ${error.message}`);
    }
    taskRows.push(...((data ?? []) as Record<string, unknown>[]));
  }

  for (const email of identity.emails.slice(0, 3)) {
    const { data, error } = await params.supabase
      .from("tasks")
      .select(
        "id,title,description,status,due_date,priority,project_id,project_ids,assignee_name,assignee_email,assignee_person_id,source_system,created_at,updated_at,file_name,extraction_source",
      )
      .ilike("assignee_email", email)
      .limit(100);
    if (error) {
      throw new Error(`Verified task lookup failed by email: ${error.message}`);
    }
    taskRows.push(...((data ?? []) as Record<string, unknown>[]));
  }

  for (const name of identity.names.slice(0, 3)) {
    const { data, error } = await params.supabase
      .from("tasks")
      .select(
        "id,title,description,status,due_date,priority,project_id,project_ids,assignee_name,assignee_email,assignee_person_id,source_system,created_at,updated_at,file_name,extraction_source",
      )
      .ilike("assignee_name", `%${name}%`)
      .limit(100);
    if (error) {
      throw new Error(`Verified task lookup failed by assignee name: ${error.message}`);
    }
    taskRows.push(...((data ?? []) as Record<string, unknown>[]));
  }

  const verifiedRows = Array.from(
    new Map(
      taskRows
        .filter((row) => isOpenTaskStatus(row.status))
        .filter((row) => rowMatchesIdentity(row, identity))
        .map((row) => [asString(row.id) ?? `${row.metadata_id}:${row.description}`, row]),
    ).values(),
  ).slice(0, 30);

  let scheduleRows: Record<string, unknown>[] = [];
  try {
    const { data, error } = await params.supabase
      .from("schedule_tasks")
      .select(
        "id,name,status,finish_date,project_id,updated_at,created_at,percent_complete,assignee,priority",
      )
      .limit(250);
    if (error) throw error;
    scheduleRows = ((data ?? []) as Record<string, unknown>[])
      .filter((row) => isOpenTaskStatus(row.status))
      .filter((row) => Number(row.percent_complete ?? 0) < 100)
      .filter((row) => rowMatchesIdentity(row, identity))
      .slice(0, 20);
  } catch (error) {
    sourceErrors.push(
      `Schedule task assignee lookup failed: ${readableErrorMessage(error)}`,
    );
  }

  let followUpRows: Record<string, unknown>[] = [];
  try {
    const { data, error } = await params.supabase
      .from("executive_briefing_follow_ups")
      .select(
        "id,title,summary,state,status,section,owner,project_label,recommended_action,source_date,source_detail,updated_at,last_seen_at",
      )
      .eq("state", "open")
      .limit(100);
    if (error) throw error;
    followUpRows = ((data ?? []) as Record<string, unknown>[])
      .filter((row) => rowMatchesIdentity(row, identity))
      .slice(0, 20);
  } catch (error) {
    sourceErrors.push(
      `Executive briefing follow-up lookup failed: ${readableErrorMessage(error)}`,
    );
  }

  const packetTasks: PersonalTaskItem[] = params.packet
    ? params.packet.sections.needsBrandon.slice(0, 8).map((item, index) => ({
        id: item.sourceId ?? `packet-needs-brandon-${index}`,
        title: item.title,
        detail: item.summary,
        dueDate: item.date,
        status: item.status,
        priority: item.tone,
        projectId: null,
        projectLabel: item.project,
        source: "executive_brief_packet" as const,
        sourceLabel: "current executive brief packet",
        confidence: "briefing" as const,
        sourceDate: item.date,
        recommendedAction: item.recommendedAction,
      }))
    : [];

  const projectIds = [
    ...verifiedRows.map((row) => Number(row.project_id)).filter(Number.isFinite),
    ...scheduleRows.map((row) => Number(row.project_id)).filter(Number.isFinite),
    ...packetTasks.map((item) => Number(item.projectId)).filter(Number.isFinite),
  ];
  const projectLabels = await loadProjectLabels(params.supabase, projectIds);

  const verifiedTasks = dedupeTaskItems(
    verifiedRows.map((row) => {
      const projectId = typeof row.project_id === "number" ? row.project_id : null;
      return {
        id: asString(row.id) ?? crypto.randomUUID(),
        title: asString(row.title) ?? asString(row.description)?.slice(0, 120) ?? "Untitled task",
        detail: asString(row.description),
        dueDate: asString(row.due_date),
        status: asString(row.status),
        priority: asString(row.priority),
        projectId,
        projectLabel: projectId ? projectLabels.get(projectId) ?? `Project ${projectId}` : null,
        source: "tasks" as const,
        sourceLabel: "verified tasks table",
        confidence: "verified" as const,
        sourceDate: asString(row.updated_at) ?? asString(row.created_at),
      };
    }),
  );

  const scheduleTasks = dedupeTaskItems(
    scheduleRows.map((row) => {
      const projectId = typeof row.project_id === "number" ? row.project_id : null;
      return {
        id: asString(row.id) ?? crypto.randomUUID(),
        title: asString(row.name) ?? "Untitled schedule task",
        dueDate: asString(row.finish_date),
        status: asString(row.status),
        priority: asString(row.priority),
        projectId,
        projectLabel: projectId ? projectLabels.get(projectId) ?? `Project ${projectId}` : null,
        source: "schedule_tasks" as const,
        sourceLabel: "schedule task assignee text",
        confidence: "matched" as const,
        sourceDate: asString(row.updated_at) ?? asString(row.created_at),
      };
    }),
  );

  const briefingFollowUps = followUpRows.map((row) => ({
    id: asString(row.id) ?? crypto.randomUUID(),
    title: asString(row.title) ?? "Executive briefing follow-up",
    detail: asString(row.summary),
    dueDate: asString(row.source_date),
    status: asString(row.status) ?? asString(row.state),
    projectLabel: asString(row.project_label),
    source: "executive_briefing_follow_ups" as const,
    sourceLabel: "open executive briefing follow-up",
    confidence: "matched" as const,
    sourceDate: asString(row.last_seen_at) ?? asString(row.updated_at),
    recommendedAction: asString(row.recommended_action),
  }));

  const briefingTasks = dedupeTaskItems([...briefingFollowUps, ...packetTasks]);

  return {
    identity,
    verifiedTasks,
    scheduleTasks,
    briefingTasks,
    sourceErrors,
    checkedSources,
  };
}

type SourceHealthStatus = "ok" | "warning" | "error" | "unknown";

type SourceHealthCheck = {
  source: string;
  status: SourceHealthStatus;
  detail: string;
  metrics?: Record<string, unknown>;
};

type SourceHealthPreflight = {
  promptInjection: string;
  trace: Record<string, unknown>;
  checks: SourceHealthCheck[];
};

type StrategistStatus = {
  stage:
    | "memory"
    | "project"
    | "snapshot"
    | "knowledge"
    | "synthesis"
    | "complete"
    | "fallback";
  message: string;
  status: "loading" | "success" | "warning" | "error";
  timestamp: string;
};

type TimeoutResult = {
  timedOut: true;
  error: string;
};

type PersistedDataPart = {
  type: `data-${string}`;
  id?: string;
  data: unknown;
};

const INTENT_VALUES = [
  "target_briefing",
  "latest_status",
  "risk_review",
  "financial_analysis",
  "change_management_review",
  "decision_lookup",
  "task_followup",
  "source_lookup",
  "strategy_brainstorm",
  "implementation_planning",
  "app_help",
  "general_conversation",
] as const satisfies readonly AssistantIntent[];

const intentPlannerSchema = z.object({
  intent: z.enum(INTENT_VALUES),
  confidence: z.enum(["high", "medium", "low"]),
  responseMode: z.enum([
    "answer_directly",
    "retrieve_sources",
    "build_project_packet",
    "draft_safe_action",
    "ask_clarifying_question",
    "explain_app_workflow",
  ]),
  requiredTools: z.array(z.string()).max(8),
  shouldAskClarifyingQuestion: z.boolean(),
  rationale: z.string().max(400),
});

type IntentPlannerDecision = z.infer<typeof intentPlannerSchema> & {
  planner: "model" | "deterministic_fallback";
  deterministicIntent: AssistantIntent;
};

function isTimeoutResult<T>(value: T | TimeoutResult): value is TimeoutResult {
  return typeof value === "object" && value !== null && "timedOut" in value;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  error: string,
): Promise<T | TimeoutResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({ timedOut: true, error });
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function planAssistantIntent(params: {
  message: string;
  selectedProjectId?: number;
  activeModel: string;
  deterministicIntent: AssistantIntent;
  sourceSpecificRagKind?: SourceSpecificRagKind;
}): Promise<IntentPlannerDecision> {
  const fallback: IntentPlannerDecision = {
    planner: "deterministic_fallback",
    deterministicIntent: params.deterministicIntent,
    intent: params.deterministicIntent,
    confidence: "low",
    responseMode:
      params.deterministicIntent === "source_lookup"
        ? "retrieve_sources"
        : shouldUsePacketFirstIntent(params.deterministicIntent)
          ? "build_project_packet"
          : params.deterministicIntent === "app_help"
            ? "explain_app_workflow"
            : "answer_directly",
    requiredTools: [],
    shouldAskClarifyingQuestion: false,
    rationale: "Model planner unavailable; using deterministic fallback intent.",
  };

  if (!params.message.trim()) return fallback;

  const result = await withTimeout(
    generateObject({
      model: getLanguageModel(params.activeModel),
      schema: intentPlannerSchema,
      system: [
        "You are the intent planner for a construction project-management AI assistant.",
        "Classify the user's real goal before any response is drafted.",
        "Choose the route that will make the assistant feel like a thoughtful advisor, not a tool dispatcher.",
        "If the user asks for exact evidence, messages, Teams, email, transcript, or document context, choose source_lookup.",
        "If the user asks for current project state, risks, money, changes, decisions, or follow-ups, choose the matching project-intelligence intent.",
        "If the user asks how to use the app, choose app_help.",
        "If they ask to create or draft an operational record, choose the domain intent and responseMode draft_safe_action.",
        "Do not answer the user. Return only the structured planning object.",
      ].join("\n"),
      prompt: [
        `User message: ${params.message}`,
        `Selected project id: ${params.selectedProjectId ?? "none"}`,
        `Deterministic fallback intent: ${params.deterministicIntent}`,
        `Source-specific RAG kind: ${params.sourceSpecificRagKind ?? "none"}`,
      ].join("\n"),
      experimental_telemetry: {
        isEnabled: process.env.PHOENIX_TRACING === "true",
        functionId: "intent-planner",
        metadata: { modelId: params.activeModel },
      },
    }),
    7000,
    "intent planner timed out",
  );

  if (isTimeoutResult(result)) return fallback;

  return {
    ...result.object,
    planner: "model",
    deterministicIntent: params.deterministicIntent,
  };
}

function writeStrategistStatus(
  writer: UIMessageStreamWriter<UIMessage>,
  status: Omit<StrategistStatus, "timestamp">,
) {
  writer.write({
    type: "data-status",
    id: "strategist-status",
    data: {
      ...status,
      timestamp: new Date().toISOString(),
    },
  } as Parameters<typeof writer.write>[0]);
}

function writeAssistantWidgetParts(
  writer: UIMessageStreamWriter<UIMessage>,
  widgets: AssistantWidgetPayload[],
): PersistedDataPart[] {
  const dataParts = widgets.map((widget): PersistedDataPart => ({
    type: "data-assistant-widget",
    id: `assistant-widget-${widget.id}`,
    data: { widget },
  }));

  for (const part of dataParts) {
    writer.write(part);
  }

  return dataParts;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkTextForUiStream(text: string, targetSize = 90): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > targetSize) {
    const breakAt = Math.max(
      remaining.lastIndexOf("\n", targetSize),
      remaining.lastIndexOf(". ", targetSize),
      remaining.lastIndexOf(" - ", targetSize),
      remaining.lastIndexOf(" ", targetSize),
    );
    const index = breakAt > 24 ? breakAt + 1 : targetSize;
    chunks.push(remaining.slice(0, index));
    remaining = remaining.slice(index);
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function writeTextResponse(
  writer: UIMessageStreamWriter<UIMessage>,
  id: string,
  content: string,
) {
  writer.write({ type: "text-start", id });

  for (const chunk of chunkTextForUiStream(content)) {
    writer.write({
      type: "text-delta",
      id,
      delta: chunk,
    });
    await sleep(8);
  }

  writer.write({ type: "text-end", id });
}

function serializeDiagnosticValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildLoopDiagnostic(params: {
  stepStarts: StepStartDiagnostic[];
  steps: StepDiagnostic[];
}): LoopDiagnostic {
  const { stepStarts, steps } = params;
  return {
    stepStarts,
    steps,
    preparedStepCount: stepStarts.length,
    totalStepCount: steps.length,
    totalToolCallCount: steps.reduce((n, s) => n + s.toolCallCount, 0),
    finalFinishReason: steps.at(-1)?.finishReason ?? "unknown",
    totalWarningCount: steps.reduce((n, s) => n + s.warningCount, 0),
  };
}

function normalizeSemanticSearchOutput(output: unknown): SemanticSearchOutput | null {
  if (!output || typeof output !== "object") return null;
  const value = output as SemanticSearchOutput;
  return {
    ...value,
    results: Array.isArray(value.results) ? value.results : [],
  };
}

function getMetadataValue(metadata: unknown, key: string): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatRetrievedSourceContext(output: SemanticSearchOutput): string | null {
  const results = (output.results ?? []).slice(0, 8);
  if (results.length === 0) return null;

  const formattedResults = results.map((result, index) => {
    const metadata = result.metadata;
    const title =
      getMetadataValue(metadata, "title") ??
      getMetadataValue(metadata, "source") ??
      String(result.sourceTable ?? "source");
    const date =
      (typeof result.createdAt === "string" && result.createdAt) ||
      getMetadataValue(metadata, "date") ||
      "unknown date";
    const sourceTable = String(result.sourceTable ?? "source");
    const recordId = String(result.recordId ?? "unknown");
    const content = String(result.content ?? "").replace(/\s+/g, " ").trim();
    const excerpt = content.length > 900 ? `${content.slice(0, 900)}...` : content;

    return [
      `Source ${index + 1}: [Source: ${sourceTable} ${recordId}] ${title} (${date})`,
      `Excerpt: ${excerpt}`,
    ].join("\n");
  });

  return [
    "Deterministic retrieval context for this briefing prompt:",
    "Use these retrieved source excerpts to answer the user. Cite them inline using the [Source: ...] labels below. If the excerpts are incomplete, say what is missing instead of inventing details.",
    "",
    ...formattedResults,
  ].join("\n\n");
}

function formatProjectBriefingSnapshotContext(snapshot: ProjectBriefingSnapshot | null): string | null {
  if (!snapshot) return null;
  return [
    "Canonical project briefing snapshot for this broad project-update prompt:",
    "Use this snapshot first. Lead with Hard Facts before any narrative interpretation. Then cover What Changed, Insider Analysis, Recommended Actions, Confidence/Data Gaps, and a concrete Next Step.",
    JSON.stringify(snapshot, null, 2),
  ].join("\n\n");
}

function normalizeExecutiveSourceOutput(
  source: ExecutiveBriefingSourceName,
  label: string,
  output: unknown,
): ExecutiveBriefingSourceOutput {
  if (isTimeoutResult(output)) {
    return {
      source,
      label,
      status: "warning",
      resultCount: 0,
      results: [],
      error: output.error,
    };
  }

  if (!output || typeof output !== "object") {
    return {
      source,
      label,
      status: "error",
      resultCount: 0,
      results: [],
      error: `${label} retrieval returned an invalid response.`,
    };
  }

  const value = output as Record<string, unknown>;
  const rawResults = Array.isArray(value.results)
    ? value.results.filter(
        (result): result is Record<string, unknown> =>
          Boolean(result) && typeof result === "object" && !Array.isArray(result),
      )
    : [];
  const resultCount =
    typeof value.resultCount === "number"
      ? value.resultCount
      : typeof value.totalResults === "number"
        ? value.totalResults
        : rawResults.length;
  const error = typeof value.error === "string" ? value.error : undefined;
  const message = typeof value.message === "string" ? value.message : undefined;

  return {
    source,
    label,
    status: error ? "error" : resultCount > 0 ? "loaded" : "empty",
    resultCount,
    results: rawResults.slice(0, 5),
    message,
    error,
  };
}

function executiveResultCitation(result: Record<string, unknown>, fallbackLabel: string): string {
  const citation = typeof result.citation === "string" ? result.citation : null;
  const sourceRef = typeof result.sourceRef === "string" ? result.sourceRef : null;
  const title = typeof result.title === "string" ? result.title : fallbackLabel;
  const date = typeof result.date === "string" ? result.date : null;
  return citation ?? sourceRef ?? `${fallbackLabel}: ${title}${date ? ` (${date})` : ""}`;
}

function executiveResultExcerpt(result: Record<string, unknown>): string {
  const content =
    typeof result.content === "string"
      ? result.content
      : typeof result.summary === "string"
        ? result.summary
        : typeof result.actionItems === "string"
          ? result.actionItems
          : "";
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 700 ? `${normalized.slice(0, 700).trim()}...` : normalized;
}

function formatExecutiveBriefingRetrievalContext(
  packet: ExecutiveBriefingRetrievalPacket | null,
): string | null {
  if (!packet) return null;

  const sourceBlocks = packet.sources.map((source) => {
    const header = `${source.label}: ${source.status}, ${source.resultCount} result(s)` +
      (source.error ? `, error: ${source.error}` : source.message ? `, note: ${source.message}` : "");
    const examples = source.results.slice(0, 3).map((result, index) => {
      const excerpt = executiveResultExcerpt(result);
      return [
        `${index + 1}. ${executiveResultCitation(result, source.label)}`,
        excerpt ? `   Excerpt: ${excerpt}` : null,
      ].filter(Boolean).join("\n");
    });

    return [header, ...examples].join("\n");
  });

  return [
    "Mandatory executive briefing retrieval packet:",
    "These sources were checked by server-side orchestration before synthesis. Do not imply a source was checked if it is marked empty/error/warning. Use loaded source excerpts for recent-activity claims, and call out missing/stale coverage plainly.",
    `Query: ${packet.query}`,
    `Project: ${packet.projectName ?? "unknown"}${packet.projectId ? ` (#${packet.projectId})` : ""}`,
    "",
    ...sourceBlocks,
  ].join("\n\n");
}

function formatSourcesCheckedLine(packet: ExecutiveBriefingRetrievalPacket | null): string {
  if (!packet) {
    return "Sources checked: structured project controls and semantic project history.";
  }

  const summary = packet.sources
    .map((source) => `${source.label} ${source.status}${source.resultCount ? ` (${source.resultCount})` : ""}`)
    .join("; ");
  return `Sources checked: ${summary}.`;
}

function formatExecutiveRecentSignals(packet: ExecutiveBriefingRetrievalPacket | null): string[] {
  if (!packet) return [];

  return packet.sources.flatMap((source) => {
    const result = source.results[0];
    if (!result) {
      const note = source.error ?? source.message ?? "no matching recent records found";
      return [`- **${source.label}:** ${source.status} - ${note}.`];
    }

    const excerpt = executiveResultExcerpt(result);
    const citation = executiveResultCitation(result, source.label);
    return [
      `- **${source.label}:** ${excerpt || "A matching source was found, but no excerpt was available."} ${citation}`,
    ];
  });
}

function actionLine(params: {
  owner: string;
  action: string;
  due: string;
  why: string;
  sourceRef: string;
}): string {
  return `- **Owner:** ${params.owner} | **Action:** ${params.action} | **Due:** ${params.due} | **Why it matters:** ${params.why} ${params.sourceRef}`;
}

function createDeterministicActionBriefing(params: {
  snapshot: ProjectBriefingSnapshot | null;
  executiveRetrieval: ExecutiveBriefingRetrievalPacket | null;
}): string | null {
  const { snapshot, executiveRetrieval } = params;
  if (!snapshot) return null;

  const project = readSnapshotObject(snapshot, "project");
  const hardFacts = readSnapshotObject(snapshot, "hardFacts");
  const projectName = typeof project?.name === "string" && project.name.trim()
    ? project.name.trim()
    : "the project";
  const sourceRef = typeof snapshot.sourceRef === "string"
    ? snapshot.sourceRef
    : "[Source: Project Briefing Snapshot]";
  const openRfis = readNestedNumber(hardFacts, ["rfis", "openCount"]);
  const overdueRfis = readNestedNumber(hardFacts, ["rfis", "overdueCount"]);
  const openChangeEvents = readNestedNumber(hardFacts, ["changeEvents", "openCount"]);
  const pendingCos = readNestedNumber(hardFacts, ["changeOrders", "pendingCount"]);
  const overdueTasks = readNestedNumber(hardFacts, ["schedule", "overdueCount"]);
  const unexecutedCommitments = readNestedNumber(hardFacts, ["commitments", "unexecutedCount"]);
  const sourceSummary = formatSourcesCheckedLine(executiveRetrieval);

  return [
    `**Highest-Leverage PM Actions for ${projectName}**`,
    "",
    actionLine({
      owner: "Project Manager",
      action: `Run a 30-minute recovery huddle on the ${overdueTasks} overdue schedule task(s) and ${overdueRfis || openRfis} open/overdue RFI(s); leave with named owners and dates.`,
      due: "Today",
      why: "The schedule/RFI stack is the clearest execution risk, and it needs ownership before it turns into field delay.",
      sourceRef,
    }),
    actionLine({
      owner: "PM + Cost Lead",
      action: `Turn ${pendingCos} pending change order(s) and ${openChangeEvents} open change event(s) into a decision log with pricing owner, approval status, and target decision date.`,
      due: "Today",
      why: "Change exposure is manageable only if leadership can see which items are priced, waiting, or drifting.",
      sourceRef,
    }),
    actionLine({
      owner: "PM + Procurement Lead",
      action: `Review the ${unexecutedCommitments} unexecuted commitment(s) and decide what can be released now versus what is waiting on owner direction.`,
      due: "Next business day",
      why: "The comms signal points to coordination/procurement pressure; unexecuted commitments are where that pressure becomes schedule risk.",
      sourceRef,
    }),
    "",
    `**Sources Checked**`,
    `- ${sourceSummary}`,
    "",
    `**Next Step**`,
    `- Send the PM this three-item action list and ask for a written owner/date update by end of day.`,
  ].join("\n");
}

function createDeterministicSourceQualityAnswer(params: {
  snapshot: ProjectBriefingSnapshot | null;
  executiveRetrieval: ExecutiveBriefingRetrievalPacket | null;
}): string | null {
  const { snapshot, executiveRetrieval } = params;
  if (!snapshot) return null;

  const project = readSnapshotObject(snapshot, "project");
  const hardFacts = readSnapshotObject(snapshot, "hardFacts");
  const projectName = typeof project?.name === "string" && project.name.trim()
    ? project.name.trim()
    : "the project";
  const sourceRef = typeof snapshot.sourceRef === "string"
    ? snapshot.sourceRef
    : "[Source: Project Briefing Snapshot]";
  const weakSources = executiveRetrieval?.sources.filter((source) =>
    source.status === "empty" || source.status === "warning" || source.status === "error",
  ) ?? [];
  const loadedSources = executiveRetrieval?.sources.filter((source) => source.status === "loaded") ?? [];
  const weakestSource = weakSources[0];
  const weakSourceLabel = weakestSource
    ? `${weakestSource.label} (${weakestSource.status})`
    : loadedSources.length
      ? "the communication-source cross-check, because every source returned something but the extracts still need human confirmation"
      : "the communication-source cross-check, because no recent meeting, Teams, email, or OneDrive packet was available";
  const weakReason = weakestSource
    ? weakestSource.status === "empty"
      ? "it did not return a current matching communication for this project"
      : weakestSource.status === "warning"
        ? "it returned a warning instead of a clean current result"
        : "it failed to return a dependable current result"
    : "source coverage is not the same as verified owner-ready truth";
  const openRfis = readNestedNumber(hardFacts, ["rfis", "openCount"]);
  const overdueRfis = readNestedNumber(hardFacts, ["rfis", "overdueCount"]);
  const pendingCos = readNestedNumber(hardFacts, ["changeOrders", "pendingCount"]);
  const openCes = readNestedNumber(hardFacts, ["changeEvents", "openCount"]);
  const overdueTasks = readNestedNumber(hardFacts, ["schedule", "overdueCount"]);
  const unexecutedCommitments = readNestedNumber(hardFacts, ["commitments", "unexecutedCount"]);

  return [
    `**Weakest Signal for ${projectName}**`,
    "",
    `- The least trustworthy signal is **${weakSourceLabel}**: ${weakReason}. I would not tell the owner that the communication picture is complete until that source is checked against the live project record.`,
    `- The structured controls are more dependable for the operating scoreboard: ${openRfis} open RFI(s), ${overdueRfis} overdue RFI(s), ${pendingCos} pending change order(s), ${openCes} open change event(s), ${overdueTasks} overdue schedule task(s), and ${unexecutedCommitments} unexecuted commitment(s). ${sourceRef}`,
    "",
    "**What I Would Verify Before Telling the Owner**",
    `- Confirm the current RFI/change-event/change-order log directly in the project controls system so the owner hears current counts, not stale meeting language. ${sourceRef}`,
    `- Ask the PM whether the ${overdueTasks} overdue schedule task(s) are true blockers or just unmaintained schedule rows.`,
    `- Re-check the missing or weak communication source(s), especially Teams/email if they returned empty or warning, before claiming there are no recent coordination issues.`,
    "",
    "**Recommendation**",
    "- Tell the owner the structured project controls show the clearest risk, but label the communication read as provisional until Teams/email/meeting coverage is confirmed.",
    "",
    "**Next Step**",
    "- Have the PM send one owner-ready validation note today: current RFI count, current change exposure, schedule blockers, and whether any recent Teams/email/OneDrive item changes the risk read.",
  ].join("\n");
}

function isBrandonDailyUpdateWidgetRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  if (!normalized.includes("brandon")) return false;

  return [
    "daily update",
    "daily brief",
    "executive update",
    "executive brief",
    "what does brandon need",
    "what should brandon know",
  ].some((phrase) => normalized.includes(phrase));
}

async function loadSignedInBriefIdentity(params: {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  userEmail?: string | null;
}): Promise<SignedInBriefIdentity> {
  const normalizedUserEmail = params.userEmail?.trim().toLowerCase() || null;
  const [profileResult, authLinkResult, personByAuthResult] = await Promise.all([
    params.supabase
      .from("user_profiles")
      .select("full_name,email")
      .eq("id", params.userId)
      .maybeSingle(),
    params.supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", params.userId)
      .maybeSingle(),
    params.supabase
      .from("people")
      .select("first_name,last_name,email")
      .eq("auth_user_id", params.userId)
      .maybeSingle(),
  ]);

  let person = personByAuthResult.data;
  const personId = authLinkResult.data?.person_id;
  if (!person && personId) {
    const { data } = await params.supabase
      .from("people")
      .select("first_name,last_name,email")
      .eq("id", personId)
      .maybeSingle();
    person = data;
  }

  if (!person && normalizedUserEmail) {
    const { data } = await params.supabase
      .from("people")
      .select("first_name,last_name,email")
      .ilike("email", normalizedUserEmail)
      .maybeSingle();
    person = data;
  }

  const personName = person
    ? [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || null
    : null;
  const identity = {
    profileName: profileResult.data?.full_name ?? null,
    profileEmail: profileResult.data?.email ?? normalizedUserEmail,
    personName,
    personEmail: person?.email ?? null,
  };

  return {
    ...identity,
    isBrandon: identityLooksLikeBrandon(identity),
  };
}

function createBrandonDailyUpdateSummary(packet: BrandonDailyUpdatePacket): string {
  const needsBrandon = packet.sections.needsBrandon[0];
  const waitingOnOthers = packet.sections.waitingOnOthers[0];
  const importantUpdate = packet.sections.importantUpdates[0];

  return [
    "I pulled Brandon's daily update into a widget below.",
    "",
    `Topline: ${packet.sections.needsBrandon.length} items need Brandon, ${packet.sections.waitingOnOthers.length} are waiting on others, and ${packet.sections.importantUpdates.length} are broader business-critical updates.`,
    "",
    needsBrandon
      ? `Most urgent owner item: ${needsBrandon.title} (${needsBrandon.project}, ${needsBrandon.date}).`
      : null,
    waitingOnOthers
      ? `Biggest external dependency: ${waitingOnOthers.title} (${waitingOnOthers.project}, ${waitingOnOthers.date}).`
      : null,
    importantUpdate
      ? `Business watch item: ${importantUpdate.title} (${importantUpdate.project}, ${importantUpdate.date}).`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function readSnapshotArray(
  snapshot: ProjectBriefingSnapshot | null,
  key: string,
): unknown[] {
  const value = snapshot?.[key];
  return Array.isArray(value) ? value : [];
}

function readSnapshotObject(
  snapshot: ProjectBriefingSnapshot | null,
  key: string,
): Record<string, unknown> | null {
  const value = snapshot?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNestedNumber(
  source: Record<string, unknown> | null,
  path: string[],
): number {
  let current: unknown = source;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return 0;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" && Number.isFinite(current) ? current : 0;
}

function buildSnapshotNextStep(snapshot: ProjectBriefingSnapshot | null): string {
  const hardFacts = readSnapshotObject(snapshot, "hardFacts");
  const project = readSnapshotObject(snapshot, "project");
  const projectName = typeof project?.name === "string" ? project.name : "this project";
  const overdueRfis = readNestedNumber(hardFacts, ["rfis", "overdueCount"]);
  const openRfis = readNestedNumber(hardFacts, ["rfis", "openCount"]);
  const overdueSubmittals = readNestedNumber(hardFacts, ["submittals", "overdueCount"]);
  const overdueTasks = readNestedNumber(hardFacts, ["schedule", "overdueCount"]);
  const pendingCos = readNestedNumber(hardFacts, ["changeOrders", "pendingCount"]);
  const openCes = readNestedNumber(hardFacts, ["changeEvents", "openCount"]);
  const unexecutedCommitments = readNestedNumber(hardFacts, ["commitments", "unexecutedCount"]);

  if (overdueTasks > 0 || overdueRfis > 0 || overdueSubmittals > 0) {
    return `Next step: run a 30-minute PM/owner recovery huddle for ${projectName} and leave with named owners for the ${overdueTasks} overdue schedule task(s), ${overdueRfis || openRfis} open/overdue RFI(s), and ${overdueSubmittals} overdue submittal(s).`;
  }

  if (pendingCos > 0 || openCes > 0) {
    return `Next step: turn the ${pendingCos} pending change order(s) and ${openCes} open change event(s) into a decision log with owner approval status, pricing owner, and target decision date.`;
  }

  if (unexecutedCommitments > 0) {
    return `Next step: review the ${unexecutedCommitments} unexecuted commitment(s) and decide what can be released now versus what is waiting on owner direction.`;
  }

  return `Next step: confirm the budget baseline and the top three owner/PM decisions for ${projectName} so the next briefing can separate real exposure from noise.`;
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function createDeterministicProjectBriefing(params: {
  snapshot: ProjectBriefingSnapshot | null;
  retrieval: SemanticSearchOutput | null;
  executiveRetrieval: ExecutiveBriefingRetrievalPacket | null;
}): string | null {
  const { snapshot, retrieval, executiveRetrieval } = params;
  if (!snapshot) return null;

  const project = readSnapshotObject(snapshot, "project");
  const hardFacts = readSnapshotObject(snapshot, "hardFacts");

  // If no real project was identified (name is the fallback "Selected project"),
  // do not render the $0-everywhere template — it is worse than no answer.
  // Return null so the LLM generates a conversational response instead.
  const projectName = String(project?.name ?? "");
  if (!projectName || /^selected project$/i.test(projectName)) return null;
  const budget = readSnapshotObject(hardFacts, "budget");
  const contract = readSnapshotObject(hardFacts, "contract");
  const changeOrders = readSnapshotObject(hardFacts, "changeOrders");
  const changeEvents = readSnapshotObject(hardFacts, "changeEvents");
  const rfis = readSnapshotObject(hardFacts, "rfis");
  const submittals = readSnapshotObject(hardFacts, "submittals");
  const schedule = readSnapshotObject(hardFacts, "schedule");
  const commitments = readSnapshotObject(hardFacts, "commitments");
  const notifications = readSnapshotObject(hardFacts, "notifications");
  const recentMovement = readSnapshotArray(snapshot, "recentMovement").slice(0, 3);
  const riskSignals = readSnapshotArray(snapshot, "riskSignals").map(String).filter(Boolean);
  const dataGaps = readSnapshotArray(snapshot, "dataGaps").map(String).filter(Boolean);
  const sourceRef = typeof snapshot.sourceRef === "string"
    ? snapshot.sourceRef
    : "[Source: Project Briefing Snapshot]";
  const sourceResults = (retrieval?.results ?? []).slice(0, 3);
  const sourceLine = sourceResults.length
    ? sourceResults.map((result) => sourceLabel(result)).join("; ")
    : sourceRef;
  const executiveSignals = formatExecutiveRecentSignals(executiveRetrieval).slice(0, 4);

  return [
    `**Hard Facts**`,
    `- **Project:** ${String(project?.name ?? "Selected project")} (${String(project?.phase ?? "phase unknown")}).`,
    `- **Budget:** original ${currency(readNestedNumber(budget, ["originalBudget"]))}; revised ${currency(readNestedNumber(budget, ["revisedBudget"]))}; status ${String(budget?.status ?? "unknown")}; variance ${currency(readNestedNumber(budget, ["forecastVariance"]))}. ${sourceRef}`,
    `- **Contract:** revised value ${currency(readNestedNumber(contract, ["revisedContractValue"]))}; approved changes ${currency(readNestedNumber(contract, ["approvedContractChanges"]))}; pending changes ${currency(readNestedNumber(contract, ["pendingContractChanges"]))}; invoiced ${currency(readNestedNumber(contract, ["invoicedAmount"]))}.`,
    `- **Change Orders:** ${readNestedNumber(changeOrders, ["pendingCount"])} pending (${currency(readNestedNumber(changeOrders, ["pendingAmount"]))}), ${readNestedNumber(changeOrders, ["approvedCount"])} approved (${currency(readNestedNumber(changeOrders, ["approvedAmount"]))}).`,
    `- **Change Events:** ${readNestedNumber(changeEvents, ["openCount"])} open.`,
    `- **RFIs:** ${readNestedNumber(rfis, ["openCount"])} open; ${readNestedNumber(rfis, ["overdueCount"])} overdue; ${readNestedNumber(rfis, ["scheduleSensitiveCount"])} schedule-sensitive.`,
    `- **Submittals:** ${readNestedNumber(submittals, ["openCount"])} open; ${readNestedNumber(submittals, ["overdueCount"])} overdue; ${readNestedNumber(submittals, ["longLeadOpenCount"])} long-lead open.`,
    `- **Schedule:** ${readNestedNumber(schedule, ["incompleteCount"])} incomplete tasks; ${readNestedNumber(schedule, ["overdueCount"])} overdue; ${readNestedNumber(schedule, ["upcomingMilestoneCount"])} upcoming milestones.`,
    `- **Commitments/Procurement:** ${readNestedNumber(commitments, ["unexecutedCount"])} unexecuted of ${readNestedNumber(commitments, ["totalCount"])} total commitments.`,
    `- **Open notifications/actions:** ${readNestedNumber(notifications, ["openCount"])} open notifications.`,
    `- **Sources Checked:** ${formatSourcesCheckedLine(executiveRetrieval)}`,
    "",
    `**Recent Communication Signals**`,
    ...(executiveSignals.length
      ? executiveSignals
      : [`- No separate meeting, Teams, email, or OneDrive communication packet was available. ${sourceLine}`]),
    "",
    `**What Changed**`,
    ...(recentMovement.length
      ? recentMovement.map((item) => {
          const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
          return `- ${String(record.date ?? "undated")}: ${String(record.summary ?? record.title ?? "Recent project movement found.").slice(0, 260)} ${String(record.sourceRef ?? "")}`.trim();
        })
      : [`- I did not find recent meeting/document movement in the snapshot. ${sourceLine}`]),
    "",
    `**Insider Analysis**`,
    ...(riskSignals.length
      ? riskSignals.slice(0, 4).map((risk) => `- ${risk}`)
      : ["- The current record does not expose a strong risk signal, so the operating risk is source completeness rather than a confirmed project issue."]),
    "",
    `**Recommended Actions**`,
    `1. **Lock the operating baseline** - Confirm which budget/forecast number leadership is managing to before making cost or scope commitments.`,
    `2. **Clear decision blockers** - Turn pending change orders, open change events, overdue RFIs, and overdue schedule tasks into a dated owner/PM decision log.`,
    `3. **Protect procurement** - Review unexecuted commitments and release anything that is not truly waiting on owner direction.`,
    "",
    `**Confidence/Data Gaps**`,
    dataGaps.length
      ? dataGaps.map((gap) => `- ${gap}`).join("\n")
      : `- Confidence is strongest on structured project controls from the briefing snapshot. Meeting/document context came from: ${sourceLine}.`,
    "",
    `**Next Step**`,
    `- ${buildSnapshotNextStep(snapshot)}`,
  ].join("\n");
}

function enforceProjectBriefingResponseContract(params: {
  content: string;
  projectBriefingSnapshot: ProjectBriefingSnapshot | null;
  executiveRetrieval?: ExecutiveBriefingRetrievalPacket | null;
  forceBusinessRetrieval: boolean;
}): string {
  const { content, projectBriefingSnapshot, executiveRetrieval, forceBusinessRetrieval } = params;
  if (!forceBusinessRetrieval || !projectBriefingSnapshot) return content;

  const hasHardFacts = /(^|\n)\s*(#{1,4}\s*)?(\*\*)?hard facts(\*\*)?\b/i.test(content);
  const hasNextStep = /(^|\n)\s*(#{1,4}\s*)?(\*\*)?next step(\*\*)?\b/i.test(content);
  const hasSourcesChecked = /\bsources checked\b/i.test(content);
  const appendedSections: string[] = [];

  if (!hasHardFacts) {
    appendedSections.push(
      [
        "Hard Facts",
        "The project briefing snapshot loaded, but the generated answer did not clearly label the hard-facts section. Treat the budget, change order, RFI, submittal, schedule, commitment, and notification facts above as the operating scoreboard.",
      ].join("\n\n"),
    );
  }

  if (!hasNextStep) {
    appendedSections.push(["Next Step", buildSnapshotNextStep(projectBriefingSnapshot)].join("\n\n"));
  }

  if (!hasSourcesChecked) {
    appendedSections.push(["Sources Checked", formatSourcesCheckedLine(executiveRetrieval ?? null)].join("\n\n"));
  }

  if (appendedSections.length === 0) return content;
  return [content.trim(), ...appendedSections].join("\n\n");
}

function sourceLabel(result: SemanticSearchResult): string {
  return `[Source: ${String(result.sourceTable ?? "source")} ${String(result.recordId ?? "unknown")}]`;
}

function sourceTitle(result: SemanticSearchResult): string {
  return (
    getMetadataValue(result.metadata, "title") ??
    getMetadataValue(result.metadata, "source") ??
    String(result.sourceTable ?? "source")
  );
}

function sourceDate(result: SemanticSearchResult): string {
  return (
    (typeof result.createdAt === "string" && result.createdAt.slice(0, 10)) ||
    getMetadataValue(result.metadata, "date")?.slice(0, 10) ||
    "undated"
  );
}

function extractRelevantSentences(
  results: SemanticSearchResult[],
  keywords: string[],
  limit: number,
): string[] {
  const findings: string[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const content = String(result.content ?? "").replace(/\s+/g, " ").trim();
    if (!content) continue;

    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase();
      if (!keywords.some((keyword) => normalized.includes(keyword))) continue;

      const cleaned = sentence.length > 260 ? `${sentence.slice(0, 260).trim()}...` : sentence;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;

      findings.push(`${cleaned} ${sourceLabel(result)}`);
      seen.add(key);
      if (findings.length >= limit) return findings;
    }
  }

  return findings;
}

function createSourceGroundedBriefingFallback(params: {
  output: SemanticSearchOutput;
}): string | null {
  const results = (params.output.results ?? []).slice(0, 8);
  if (results.length === 0) return null;

  const latestSources = results.slice(0, 3).map((result) => {
    return `${sourceDate(result)} — ${sourceTitle(result)} ${sourceLabel(result)}`;
  });

  const changed = extractRelevantSentences(
    results,
    [
      "approved",
      "decided",
      "agreed",
      "final",
      "revised",
      "updated",
      "progress",
      "milestone",
      "design",
      "procurement",
      "budget",
    ],
    4,
  );
  const risks = extractRelevantSentences(
    results,
    [
      "risk",
      "concern",
      "delay",
      "delays",
      "cost",
      "overrun",
      "permit",
      "zoning",
      "supply",
      "procurement",
      "material",
    ],
    4,
  );

  return [
    "I found usable Vermillion Rise context. Here is the sourced readout from the latest records I found.",
    "",
    "Latest signal:",
    ...latestSources.map((source) => `- ${source}`),
    "",
    "What changed recently:",
    ...(changed.length
      ? changed.map((item) => `- ${item}`)
      : ["- The retrieved records show recent project/status meeting context, but the excerpts did not include a clean decision sentence."]),
    "",
    "Current risks I would track:",
    ...(risks.length
      ? risks.map((item) => `- ${item}`)
      : ["- The retrieved records did not surface a clear risk sentence in the top results."]),
    "",
    "Strategic next move:",
    "- Treat procurement/material availability, permitting/zoning, and budget exposure as the immediate watch items until the live Acumatica/schedule read can be cross-checked against these meeting notes.",
  ].join("\n");
}

function formatCompactRetrievedSources(output: SemanticSearchOutput): string {
  return (output.results ?? [])
    .slice(0, 8)
    .map((result, index) => {
      const content = String(result.content ?? "").replace(/\s+/g, " ").trim();
      const excerpt = content.length > 1_200 ? `${content.slice(0, 1_200).trim()}...` : content;

      return [
        `Source ${index + 1}: ${sourceLabel(result)}`,
        `Title: ${sourceTitle(result)}`,
        `Date: ${sourceDate(result)}`,
        `Excerpt: ${excerpt}`,
      ].join("\n");
    })
    .join("\n\n");
}

async function generateSourceGroundedSynthesis(params: {
  output: SemanticSearchOutput;
  userMessage: string;
  projectBriefingSnapshot?: ProjectBriefingSnapshot | null;
  executiveRetrieval?: ExecutiveBriefingRetrievalPacket | null;
}): Promise<string | null> {
  if ((params.output.results ?? []).length === 0) return null;

  const fallback = createSourceGroundedBriefingFallback({ output: params.output });
  const sourceContext = formatCompactRetrievedSources(params.output);
  const projectSnapshotContext = params.projectBriefingSnapshot
    ? JSON.stringify(params.projectBriefingSnapshot, null, 2)
    : "No project briefing snapshot was available.";
  const executiveRetrievalContext =
    formatExecutiveBriefingRetrievalContext(params.executiveRetrieval ?? null) ??
    "No mandatory executive briefing retrieval packet was available.";

  try {
    const result = await generateText({
      model: getLanguageModel("openai/gpt-4.1"),
      system:
        "You are Alleato's business strategist and project manager. " +
        "Answer naturally, directly, and with executive judgment. " +
        "For broad project updates, start with a Hard Facts section: budget, forecast/over-under, change orders, RFIs, submittals, schedule, commitments/procurement, open actions/notifications, and sources checked. " +
        "Then give What Changed, Insider Analysis, Recommended Actions, Confidence/Data Gaps, and a concrete next step. " +
        "Use only the provided project snapshot, mandatory source packet, and retrieved sources. Cite facts inline with the exact source labels when available. " +
        "If the sources are thin or internally stale, say that plainly while still extracting the useful signal. " +
        "Do not mention model failures, tool failures, RAG, retrieval, or implementation details.",
      messages: [
        {
          role: "user",
          content: [
            `User request: ${params.userMessage}`,
            "Structured project briefing snapshot:",
            projectSnapshotContext,
            "Mandatory source packet:",
            executiveRetrievalContext,
            "Retrieved sources:",
            sourceContext,
            "Write a concise PM briefing with sections: Hard Facts, What Changed, Insider Analysis, Recommended Actions, Confidence/Data Gaps, Next Step.",
          ].join("\n\n"),
        },
      ],
      maxOutputTokens: 1_000,
      timeout: {
        totalMs: 45_000,
      },
      experimental_telemetry: {
        isEnabled: process.env.PHOENIX_TRACING === "true",
        functionId: "executive-briefing-synthesis",
        metadata: { modelId: "openai/gpt-4.1" },
      },
    });

    const text = result.text.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

function createSourceLookupAnswer(params: {
  output: SemanticSearchOutput | null;
  userMessage: string;
}): string {
  const keywords = sourceLookupKeywords(params.userMessage);
  const results = (params.output?.results ?? [])
    .slice()
    .sort((a, b) => sourceLookupRank(b, keywords) - sourceLookupRank(a, keywords))
    .slice(0, 6);
  const sourceLine =
    "Source checked: semantic search across vectorized meetings, Teams, email, documents, insights, and memories.";

  if (results.length === 0) {
    return [
      "I could not find source records that answer that directly.",
      "",
      "**What I checked**",
      `- ${sourceLine}`,
      "- Retrieval returned 0 matching source rows, so I am not going to turn this into a project status answer or invent discussion context.",
      "",
      "**Next Step**",
      "- Check whether the source is synced/vectorized and whether it is project-scoped or admin-only before relying on this question in chat.",
    ].join("\n");
  }

  const sourceBullets = results.map((result, index) => {
    const content = String(result.content ?? "").replace(/\s+/g, " ").trim();
    const excerpt = content.length > 520 ? `${content.slice(0, 520).trim()}...` : content;
    return [
      `${index + 1}. **${sourceTitle(result)}** — ${sourceDate(result)} ${sourceLabel(result)}`,
      `   ${excerpt || "No excerpt text was stored for this source."}`,
    ].join("\n");
  });

  return [
    "I treated this as a source lookup, not a project status request.",
    "",
    "**Best Matching Source Context**",
    ...sourceBullets,
    "",
    "**What This Means**",
    "- The answer above is grounded in the retrieved source snippets. If the exact quote or full thread is needed, open the listed source records rather than relying on a broad project briefing.",
    "- I did not use the executive project-briefing template because this question asks what someone said in a source channel.",
    "",
    "**Observability**",
    `- ${sourceLine}`,
    `- Retrieved ${results.length} source row(s) for: ${params.userMessage}`,
  ].join("\n");
}

function isRfiActionRequest(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    /\brfi\b/.test(normalized) &&
    /\b(create|draft|log|open|write|need|start|prepare)\b/.test(normalized)
  );
}

function extractRfiTopic(message: string): string {
  const aboutMatch = message.match(/\babout\s+(.+?)(?:[.?!]|$)/i);
  const forMatch = message.match(/\bfor\s+(.+?)(?:[.?!]|$)/i);
  const rawTopic = aboutMatch?.[1] ?? forMatch?.[1] ?? "requested clarification";

  const cleaned = rawTopic
    .replace(/\bwhat info\b.*$/i, "")
    .replace(/\band can you\b.*$/i, "")
    .replace(/\bcan you\b.*$/i, "")
    .replace(/\bplease\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "requested clarification";
}

function normalizeProjectSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRfiProjectHint(message: string): string | null {
  const forMatch = message.match(/\bfor\s+(.+?)\s+about\b/i);
  const onMatch = message.match(/\bon\s+(.+?)\s+about\b/i);
  const rawHint = forMatch?.[1] ?? onMatch?.[1] ?? null;
  const hint = rawHint?.replace(/\s+/g, " ").trim();

  return hint || null;
}

async function resolveRfiProjectContext(params: {
  message: string;
  selectedProjectId?: number;
  supabase: ReturnType<typeof createServiceClient>;
}): Promise<{
  projectId: number | null;
  projectName: string;
  resolvedTarget: Awaited<ReturnType<typeof resolveIntelligenceTarget>>;
  source: string;
}> {
  const resolvedTarget = await resolveIntelligenceTarget({
    query: params.message,
    selectedProjectId: params.selectedProjectId,
    supabase: params.supabase,
  });

  if (resolvedTarget?.projectId) {
    return {
      projectId: resolvedTarget.projectId,
      projectName: resolvedTarget.name,
      resolvedTarget,
      source: resolvedTarget.source,
    };
  }

  if (typeof params.selectedProjectId === "number") {
    const { data: selectedProject } = await params.supabase
      .from("projects")
      .select("id, name")
      .eq("id", params.selectedProjectId)
      .maybeSingle();

    if (selectedProject?.id) {
      return {
        projectId: selectedProject.id,
        projectName: selectedProject.name ?? `Project ${selectedProject.id}`,
        resolvedTarget,
        source: "selected_project_fallback",
      };
    }
  }

  const projectHint = extractRfiProjectHint(params.message);
  if (!projectHint) {
    return {
      projectId: null,
      projectName: "the selected project",
      resolvedTarget,
      source: "unresolved",
    };
  }

  const normalizedHint = normalizeProjectSearch(projectHint);
  const { data: projects } = await params.supabase
    .from("projects")
    .select("id, name, aliases")
    .limit(2000);

  const project = (projects ?? []).find((candidate) => {
    const normalizedName = normalizeProjectSearch(candidate.name ?? "");
    const aliases = Array.isArray(candidate.aliases) ? candidate.aliases : [];

    return (
      (normalizedName && normalizedName.includes(normalizedHint)) ||
      (normalizedName && normalizedHint.includes(normalizedName)) ||
      aliases.some((alias) => {
        const normalizedAlias =
          typeof alias === "string" ? normalizeProjectSearch(alias) : "";
        return (
          (normalizedAlias && normalizedAlias.includes(normalizedHint)) ||
          (normalizedAlias && normalizedHint.includes(normalizedAlias))
        );
      })
    );
  });

  return {
    projectId: project?.id ?? null,
    projectName: project?.name ?? projectHint,
    resolvedTarget,
    source: project ? "project_name_fallback" : "unresolved",
  };
}

function titleCaseRfiSubject(topic: string): string {
  const words = topic
    .replace(/[^a-zA-Z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 12);

  const subject = words
    .map((word) =>
      word.length <= 3
        ? word.toUpperCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(" ");

  return subject ? `RFI - ${subject}` : "RFI - Requested Clarification";
}

function buildRfiPreviewQuestion(params: {
  topic: string;
  projectName: string;
}): string {
  return [
    `Please clarify the required direction for ${params.topic} on ${params.projectName}.`,
    "Confirm the affected location/scope, responsible design party, required response date, and whether this has cost or schedule impact.",
  ].join(" ");
}

function formatRfiPreviewAnswer(params: {
  projectName: string;
  previewOutput: unknown;
  topic: string;
}): string {
  const preview = asRecord(params.previewOutput);
  const fields = asRecord(asRecord(preview.preview).fields);
  const subject = typeof fields.subject === "string" ? fields.subject : titleCaseRfiSubject(params.topic);
  const question =
    typeof fields.question === "string"
      ? fields.question
      : buildRfiPreviewQuestion({
          topic: params.topic,
          projectName: params.projectName,
        });
  const projectId = typeof fields.project_id === "number" ? fields.project_id : null;
  const toolError = typeof preview.error === "string" ? preview.error : null;

  if (toolError) {
    return [
      "I identified this as an RFI action request, but I did not create anything.",
      "",
      "**Blocked Before Preview**",
      `- ${toolError}`,
      "",
      "**Draft I Would Use Once Access/Project Context Is Fixed**",
      `- Subject: ${subject}`,
      `- Question: ${question}`,
      "- Cost impact: TBD",
      "- Schedule impact: TBD",
      "",
      "**Next Step**",
      "- Select or name the exact project, confirm who owns the answer, and provide a due date before creating the RFI.",
    ].join("\n");
  }

  return [
    "I identified this as an RFI action request and routed it through the server-side `createRFI` tool in preview mode.",
    "",
    "**Preview Only - No RFI Was Created**",
    `- Project: ${params.projectName}${projectId ? ` (#${projectId})` : ""}`,
    `- Subject: ${subject}`,
    `- Question: ${question}`,
    "- Cost impact: TBD",
    "- Schedule impact: TBD",
    "- Status if confirmed: open",
    "",
    "**Missing Before Create**",
    "- Exact location or drawing/spec reference",
    "- Ball-in-court / responsible reviewer",
    "- Due date",
    "- Cost and schedule impact if known",
    "",
    "**Next Step**",
    "- Reply with the missing details and explicitly say `confirm` when you want me to create it.",
  ].join("\n");
}

function sourceLookupKeywords(message: string): string[] {
  const ignored = new Set([
    "about",
    "actual",
    "context",
    "discussion",
    "need",
    "project",
    "report",
    "said",
    "source",
    "status",
    "what",
  ]);

  return (message.match(/\b[A-Za-z][A-Za-z0-9.'-]{3,}\b/g) ?? [])
    .map((term) => term.toLowerCase())
    .filter((term) => !ignored.has(term))
    .slice(0, 12);
}

function sourceLookupRank(result: SemanticSearchResult, keywords: string[]): number {
  const searchable = [
    result.content,
    sourceTitle(result),
    sourceLabel(result),
    getMetadataValue(result.metadata, "category"),
    getMetadataValue(result.metadata, "source_type"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const compactSearchable = searchable.replace(/[^a-z0-9]/g, "");

  const keywordScore = keywords.reduce(
    (score, keyword) =>
      score +
      (searchable.includes(keyword) ||
      compactSearchable.includes(keyword.replace(/[^a-z0-9]/g, ""))
        ? 10
        : 0),
    0,
  );
  const sourceScore =
    searchable.includes("teams") || searchable.includes("teams_message") ? 4 : 0;
  const semanticScore =
    typeof result.finalScore === "number"
      ? result.finalScore
      : typeof result.similarity === "number"
        ? result.similarity
        : 0;

  return keywordScore + sourceScore + semanticScore;
}


function extractTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function shouldUseActionFollowUpResponse(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "three actions",
    "3 actions",
    "highest-leverage",
    "owner, action, due date",
    "owner/action/due",
    "what should the pm do",
    "tell the pm to take",
    "do not repeat the full briefing",
  ].some((phrase) => normalized.includes(phrase));
}

function shouldUseSourceQualityFollowUpResponse(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "weakest source",
    "least trustworthy",
    "weakest signal",
    "what would you verify",
    "verify before telling",
    "source-quality",
    "source quality",
    "raw tool query",
    "what caveat",
    "caveat would you include",
  ].some((phrase) => normalized.includes(phrase));
}

function shouldForceBusinessRetrieval(message: string): boolean {
  const normalized = message.toLowerCase();
  if (normalized.length < 20) return false;

  // Only force the full executive briefing format for genuine "give me the full
  // project status/update" queries. Specific questions (e.g. "tell me about the
  // recent meetings", "what's the budget?") should get a natural conversational
  // answer — not a 7-section template with hardcoded section headers.
  const broadUpdatePhrases = [
    "give me a briefing",
    "give me a brief",
    "project briefing",
    "project brief",
    "project status",
    "project update",
    "full update",
    "full briefing",
    "status update",
    "what is the status",
    "what's the status",
    "how is the project",
    "how's the project",
    "latest on the project",
    "what's going on with",
    "what is going on with",
    "tell me everything",
    "executive summary",
    "run me through",
    "walk me through the project",
    "catch me up",
    "caught up on",
  ];

  return broadUpdatePhrases.some((phrase) => normalized.includes(phrase));
}

// SourceSpecificRagKind, SourceSpecificRagRequest, and detectSourceSpecificRagRequest
// are imported from @/lib/ai/detect-rag-request (extracted for unit-testability).

type SourceSpecificRagRow = {
  id: string;
  title: string | null;
  source: string | null;
  category: string | null;
  type: string | null;
  date: string | null;
  created_at: string | null;
  content: string | null;
  project_id: number | null;
};

type SourceSpecificRagAnswer = {
  content: string;
  trace: Record<string, unknown>;
  rows: SourceSpecificRagRow[];
};

function formatSourceSpecificDate(row: SourceSpecificRagRow): string {
  const value = row.date ?? row.created_at;
  if (!value) return "unknown date";
  return value.slice(0, 10);
}

function sourceSpecificSnippet(row: SourceSpecificRagRow, maxLength = 260): string {
  const content = (row.content ?? "").replace(/\s+/g, " ").trim();
  if (!content) return "No text excerpt stored.";
  return content.length > maxLength ? `${content.slice(0, maxLength).trim()}...` : content;
}

function sourceSpecificTitle(row: SourceSpecificRagRow): string {
  return row.title?.trim() || row.id;
}

function groupTeamsRows(rows: SourceSpecificRagRow[]): Array<{
  key: string;
  title: string;
  date: string;
  rows: SourceSpecificRagRow[];
}> {
  const groups = new Map<string, { key: string; title: string; date: string; rows: SourceSpecificRagRow[] }>();

  for (const row of rows) {
    const title = sourceSpecificTitle(row);
    const date = formatSourceSpecificDate(row);
    const key = `${title}::${date}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { key, title, date, rows: [row] });
    }
  }

  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function formatSourceSpecificRagContent(
  request: SourceSpecificRagRequest,
  rows: SourceSpecificRagRow[],
): string {
  const sourceLine = `Source checked: ${request.label} in Supabase document_metadata/document_chunks-backed RAG index.`;
  if (rows.length === 0) {
    const windowLabel = request.date
      ? ` for ${request.date}`
      : request.startDate && request.endDate
        ? ` from ${request.startDate} through ${request.endDate}`
        : "";
    return [
      `**${request.label}**`,
      "",
      `I did not find matching ${request.label.toLowerCase()}${windowLabel}.`,
      "",
      `**Observability**`,
      `- ${sourceLine}`,
      "- Retrieval returned 0 rows, so I am not inventing a list.",
      "",
      "**Next Step**",
      "- Check the sync/vectorization health for this source before using it for an owner-ready update.",
    ].join("\n");
  }

  if (request.kind === "recent_teams_discussions") {
    const conversationGroups = groupTeamsRows(rows);
    return [
      `**Main Teams Discussions (${request.startDate} to ${request.endDate})**`,
      "",
      ...conversationGroups.slice(0, request.limit).map((group, index) => {
        const examples = group.rows
          .slice(0, 3)
          .map((row) => sourceSpecificSnippet(row, 180))
          .join(" ");
        const sourceIds = group.rows.slice(0, 3).map((row) => row.id).join(", ");
        return `${index + 1}. **${group.title}** - ${group.date}. ${examples} [Sources: ${sourceIds}]`;
      }),
      "",
      `**Observability**`,
      `- ${sourceLine}`,
      `- Retrieved ${rows.length} Teams row(s), grouped into ${conversationGroups.length} conversation/day bucket(s), and answered from concrete Teams snippets/titles.`,
      "",
      "**Next Step**",
      "- Use these grouped conversations as the audit sample and compare them against graph_sync_state errors for any inaccessible chats.",
    ].join("\n");
  }

  const heading =
    request.kind === "meetings_on_date"
      ? `Meetings Conducted on ${request.date}`
      : request.kind === "recent_meetings"
        ? "Recent Meetings"
        : request.kind === "recent_emails"
          ? "Last Five Emails in Supabase"
          : "Most Recent OneDrive Documents";

  // For recent_meetings, include a content snippet so the model can ground its answer
  const rowFormatter =
    request.kind === "recent_meetings"
      ? (row: SourceSpecificRagRow, index: number) =>
          `${index + 1}. **${sourceSpecificTitle(row)}** — ${formatSourceSpecificDate(row)}\n   ${sourceSpecificSnippet(row, 300)} [Source: ${row.id}]`
      : (row: SourceSpecificRagRow, index: number) =>
          `${index + 1}. **${sourceSpecificTitle(row)}** — ${formatSourceSpecificDate(row)} [Source: ${row.id}]`;

  return [
    `**${heading}**`,
    "",
    ...rows.slice(0, request.limit).map((row, index) => rowFormatter(row, index)),
    "",
    `**Observability**`,
    `- ${sourceLine}`,
    `- Retrieved ${rows.length} row(s) from ${request.label}; answer titles/dates are copied from Supabase rows.`,
    "",
    "**Next Step**",
    "- Use this same source-specific check as a regression gate so generic source questions cannot fall back to tool discovery only.",
  ].join("\n");
}

function appendSourceHealthSummary(
  content: string,
  sourceHealth: AssistantSourceHealthContext | null,
): string {
  if (!sourceHealth) return content;
  const { metadata } = sourceHealth;
  const alertLines = metadata.alerts.slice(0, 4).map((alert) => {
    return `- ${alert.severity} ${alert.code}: ${alert.message}`;
  });
  return [
    content,
    "",
    "**Current Source Health**",
    `- Overall status: ${metadata.overallStatus}`,
    `- Likely gap if evidence is missing: ${metadata.missingStage ?? "none detected"}`,
    `- Backlog: ${metadata.counts.unembedded} unembedded, ${metadata.counts.uncompiled} uncompiled`,
    ...alertLines,
  ].join("\n");
}

async function buildSourceSpecificRagAnswer(params: {
  supabase: ReturnType<typeof createServiceClient>;
  request: SourceSpecificRagRequest;
  scope: Awaited<ReturnType<ReturnType<typeof createToolGuardrails>["getScope"]>>;
}): Promise<SourceSpecificRagAnswer> {
  const { supabase, request, scope } = params;
  let rows: SourceSpecificRagRow[] = [];

  const adminOnlyKinds = new Set<SourceSpecificRagKind>([
    "recent_emails",
    "recent_teams_discussions",
  ]);

  if (adminOnlyKinds.has(request.kind) && !scope.isAdmin) {
    const content = [
      `**${request.label}**`,
      "",
      `${request.label} access is admin-only in Alleato. I can still use meetings, project records, and documents you have access to.`,
      "",
      `**Observability**`,
      `- Blocked by permissions (user is not an admin).`,
      "",
      "**Next Step**",
      "- Ask an admin to run this query or share the relevant thread/email context you want analyzed.",
    ].join("\n");

    return {
      content,
      rows: [],
      trace: {
        tool: "sourceSpecificRagRetrieval",
        input: request,
        output: { blocked: true, reason: "admin_only", kind: request.kind },
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (!scope.isAdmin && scope.allowedProjectIds.length === 0) {
    const content = [
      `**${request.label}**`,
      "",
      "I cannot run this source-specific query because you are not assigned to any projects in the current database scope.",
      "",
      `**Observability**`,
      `- Project scope resolved to 0 allowed projects for this user.`,
      "",
      "**Next Step**",
      "- Confirm the user has an active project directory membership before expecting project-scoped retrieval to work.",
    ].join("\n");

    return {
      content,
      rows: [],
      trace: {
        tool: "sourceSpecificRagRetrieval",
        input: request,
        output: { blocked: true, reason: "no_project_scope" },
        timestamp: new Date().toISOString(),
      },
    };
  }

  const applyProjectScope = <T extends { in: (column: string, values: number[]) => T }>(
    query: T,
  ): T => {
    if (typeof scope.pinnedProjectId === "number") {
      return query.in("project_id", [scope.pinnedProjectId]);
    }
    if (scope.isAdmin) return query;
    return query.in("project_id", scope.allowedProjectIds);
  };

  if (request.kind === "meetings_on_date") {
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .or("source.eq.fireflies,source.eq.Zapier,type.eq.meeting,type.eq.meeting_transcript,category.eq.meeting")
        .gte("date", `${request.date}T00:00:00.000Z`)
        .lte("date", `${request.date}T23:59:59.999Z`)
        .order("date", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];
  }

  if (request.kind === "recent_meetings") {
    // Query the last 60 days of meetings; no narrow date filter required for general queries.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .or("source.eq.fireflies,source.eq.Zapier,type.eq.meeting,type.eq.meeting_transcript,category.eq.meeting")
        .gte("date", cutoff.toISOString())
        .order("date", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];
  }

  if (request.kind === "recent_emails") {
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .eq("source", "microsoft_graph")
        .eq("category", "email")
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];
  }

  if (request.kind === "recent_onedrive_documents") {
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .eq("source", "microsoft_graph")
        .eq("category", "document")
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];
  }

  if (request.kind === "recent_teams_discussions") {
    const { data, error } = await applyProjectScope(
      supabase
        .from("document_metadata")
        .select("id,title,source,category,type,date,created_at,content,project_id")
        .eq("source", "microsoft_graph")
        .eq("category", "teams_message")
        .gte("date", `${request.startDate}T00:00:00.000Z`)
        .lte("date", `${request.endDate}T23:59:59.999Z`)
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(request.limit),
    );
    if (error) throw new Error(error.message);
    rows = (data ?? []) as SourceSpecificRagRow[];
  }

  const content = formatSourceSpecificRagContent(request, rows);
  return {
    content,
    rows,
    trace: {
      tool: "sourceSpecificRagRetrieval",
      input: request,
      output: {
        rowCount: rows.length,
        rows: rows.map((row) => ({
          id: row.id,
          documentId: row.id,
          title: row.title,
          date: row.date,
          source: row.source,
          category: row.category,
          type: row.type,
          projectId: row.project_id,
        })),
      },
      timestamp: new Date().toISOString(),
    },
  };
}

function extractPriorProjectName(messages: UIMessage[]): string | undefined {
  for (const message of [...messages].reverse()) {
    const content = extractTextFromParts(message.parts);
    if (!content.trim()) continue;

    const explicitProjectMatch = content.match(/\*\*Project:\*\*\s*([^(\n]+?)(?:\s*\(|\n|$)/i) ??
      content.match(/\bProject:\s*([^(\n]+?)(?:\s*\(|\n|$)/i);
    const projectName = explicitProjectMatch?.[1]?.trim();
    if (projectName && !/^selected project$/i.test(projectName)) {
      return projectName;
    }

    const vermillionMatch = content.match(/\bVermillion Rise(?:\s+Warehouse)?\b/i);
    if (vermillionMatch) {
      return vermillionMatch[0];
    }
  }

  return undefined;
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
  primaryProjectId: number | null;
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
    primaryProjectId: typeof primaryProject?.id === "number" ? primaryProject.id : null,
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

function sourceHealthStatusRank(status: SourceHealthStatus): number {
  if (status === "error") return 3;
  if (status === "warning") return 2;
  if (status === "unknown") return 1;
  return 0;
}

function summarizeSourceHealth(checks: SourceHealthCheck[]): SourceHealthStatus {
  return checks.reduce<SourceHealthStatus>((worst, check) => {
    return sourceHealthStatusRank(check.status) > sourceHealthStatusRank(worst)
      ? check.status
      : worst;
  }, "ok");
}

async function buildSourceHealthPreflight(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<SourceHealthPreflight> {
  const checks: SourceHealthCheck[] = [];

  const [graphStateResult, graphDocsResult, firefliesResult, acumaticaResult] =
    await Promise.allSettled([
      supabase
        .from("graph_sync_state")
        .select("source, sync_status, last_sync_at, error_message, items_synced")
        .order("updated_at", { ascending: false })
        .limit(500),
      supabase
        .from("document_metadata")
        .select("id, category, status", { count: "exact" })
        .eq("source", "microsoft_graph")
        .limit(5000),
      supabase
        .from("fireflies_ingestion_jobs")
        .select("stage, created_at, error_message")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("acumatica_sync_state")
        .select("entity_name, last_success_at, status, last_error")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

  if (graphStateResult.status === "fulfilled" && !graphStateResult.value.error) {
    const rows = (graphStateResult.value.data ?? []) as Array<Record<string, unknown>>;
    const errorCount = rows.filter((row) => row.sync_status === "error").length;
    const sources = new Set(rows.map((row) => String(row.source ?? "")));
    const latestSync = rows
      .map((row) => String(row.last_sync_at ?? ""))
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    checks.push({
      source: "microsoft_graph_sync",
      status: errorCount > 0 ? "warning" : rows.length > 0 ? "ok" : "error",
      detail:
        rows.length > 0
          ? `${rows.length} Graph sync resource(s), ${errorCount} error resource(s), latest sync ${latestSync ?? "unknown"}.`
          : "No Microsoft Graph sync state rows found.",
      metrics: {
        resourceCount: rows.length,
        errorCount,
        sources: [...sources].filter(Boolean),
        latestSync,
      },
    });
  } else {
    checks.push({
      source: "microsoft_graph_sync",
      status: "error",
      detail: `Microsoft Graph sync state could not be checked: ${
        graphStateResult.status === "fulfilled"
          ? graphStateResult.value.error?.message
          : graphStateResult.reason instanceof Error
            ? graphStateResult.reason.message
            : String(graphStateResult.reason)
      }`,
    });
  }

  if (graphDocsResult.status === "fulfilled" && !graphDocsResult.value.error) {
    const rows = (graphDocsResult.value.data ?? []) as Array<Record<string, unknown>>;
    const pendingCount = rows.filter((row) =>
      ["raw_ingested", "segmented", "complete"].includes(String(row.status ?? "")),
    ).length;
    const errorCount = rows.filter((row) => String(row.status ?? "") === "error").length;
    const sharePointCount = rows.filter((row) => String(row.id ?? "").startsWith("sharepoint_")).length;

    checks.push({
      source: "microsoft_graph_vectorization",
      status: errorCount > 0 || pendingCount > 0 || sharePointCount === 0 ? "warning" : "ok",
      detail:
        `${graphDocsResult.value.count ?? rows.length} Microsoft Graph document row(s); ` +
        `${pendingCount} pending/non-embedded sample row(s); ${errorCount} error sample row(s); ` +
        `${sharePointCount} SharePoint sample row(s).`,
      metrics: {
        sampledRows: rows.length,
        totalRows: graphDocsResult.value.count,
        pendingCount,
        errorCount,
        sharePointCount,
      },
    });
  } else {
    checks.push({
      source: "microsoft_graph_vectorization",
      status: "error",
      detail: `Microsoft Graph vectorization rows could not be checked: ${
        graphDocsResult.status === "fulfilled"
          ? graphDocsResult.value.error?.message
          : graphDocsResult.reason instanceof Error
            ? graphDocsResult.reason.message
            : String(graphDocsResult.reason)
      }`,
    });
  }

  if (firefliesResult.status === "fulfilled" && !firefliesResult.value.error) {
    const rows = (firefliesResult.value.data ?? []) as Array<Record<string, unknown>>;
    const failedCount = rows.filter((row) =>
      ["failed", "error"].includes(String(row.stage ?? "").toLowerCase()),
    ).length;
    checks.push({
      source: "fireflies_meeting_ingestion",
      status: failedCount > 0 ? "warning" : rows.length > 0 ? "ok" : "unknown",
      detail:
        rows.length > 0
          ? `${rows.length} recent Fireflies ingestion job(s), ${failedCount} failed/error job(s).`
          : "No recent Fireflies ingestion jobs found.",
      metrics: {
        sampledJobs: rows.length,
        failedCount,
      },
    });
  } else {
    checks.push({
      source: "fireflies_meeting_ingestion",
      status: "warning",
      detail: `Fireflies ingestion jobs could not be checked: ${
        firefliesResult.status === "fulfilled"
          ? firefliesResult.value.error?.message
          : firefliesResult.reason instanceof Error
            ? firefliesResult.reason.message
            : String(firefliesResult.reason)
      }`,
    });
  }

  if (acumaticaResult.status === "fulfilled" && !acumaticaResult.value.error) {
    const rows = (acumaticaResult.value.data ?? []) as Array<Record<string, unknown>>;
    const errorCount = rows.filter((row) =>
      ["failed", "error"].includes(String(row.status ?? "").toLowerCase()),
    ).length;
    checks.push({
      source: "acumatica_sync",
      status: errorCount > 0 ? "warning" : rows.length > 0 ? "ok" : "unknown",
      detail:
        rows.length > 0
          ? `${rows.length} Acumatica sync state row(s), ${errorCount} failed/error row(s).`
          : "No Acumatica sync state rows found.",
      metrics: {
        sampledRows: rows.length,
        errorCount,
      },
    });
  } else {
    checks.push({
      source: "acumatica_sync",
      status: "warning",
      detail: `Acumatica sync state could not be checked: ${
        acumaticaResult.status === "fulfilled"
          ? acumaticaResult.value.error?.message
          : acumaticaResult.reason instanceof Error
            ? acumaticaResult.reason.message
            : String(acumaticaResult.reason)
      }`,
    });
  }

  const overallStatus = summarizeSourceHealth(checks);
  const promptInjection = [
    "## Source Health Preflight",
    `Overall source health: ${overallStatus}`,
    ...checks.map((check) => `- ${check.source}: ${check.status} - ${check.detail}`),
    "If a user asks for a broad strategic update, explicitly account for degraded or unavailable sources instead of implying complete coverage.",
  ].join("\n");

  return {
    promptInjection,
    checks,
    trace: {
      tool: "sourceHealthPreflight",
      input: {
        sources: ["microsoft_graph", "fireflies", "acumatica"],
      },
      output: {
        overallStatus,
        checks,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

// createStrategistFailureResponse is imported from @/lib/ai/strategist-failure-response
// (extracted to allow unit testing without importing the full route module's heavy deps)

async function generateRecoveryResponse(params: {
  userMessage: string;
  cause: string;
  selectedProjectId?: number;
  modelId: string;
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
      // Always use gpt-4.1 here regardless of params.modelId — the active model
      // may be the same one that just produced empty text due to the AI Gateway bug.
      model: getLanguageModel("openai/gpt-4.1"),
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
      experimental_telemetry: {
        isEnabled: process.env.PHOENIX_TRACING === "true",
        functionId: "recovery-response",
        metadata: { modelId: "openai/gpt-4.1" },
      },
    });

    return result.text.trim() || fallback;
  } catch (recoveryError) {
    params.toolTrace.push({
      tool: "recoveryResponseFailed",
      error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      timestamp: new Date().toISOString(),
    });
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
  modelId: string;
  loopDiagnostic?: LoopDiagnostic;
  projectBriefingSnapshot?: ProjectBriefingSnapshot | null;
  executiveBriefingRetrieval?: ExecutiveBriefingRetrievalPacket | null;
  providerDecision: AssistantToolCallingDecision;
  selectedProjectId?: number;
  dataParts?: PersistedDataPart[];
  sourceHealth?: AssistantSourceHealthMetadata | null;
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
    modelId,
    loopDiagnostic,
    projectBriefingSnapshot,
    executiveBriefingRetrieval,
    providerDecision,
    selectedProjectId,
    dataParts,
    sourceHealth,
  } = params;

  await persistRetrievalFeedbackFromToolTrace({
    userId,
    sessionId,
    selectedProjectId,
    content,
    toolTrace,
  });

  await supabase.from("chat_history").insert({
    session_id: sessionId,
    user_id: userId,
    role: "assistant",
    content,
    metadata: JSON.parse(
      JSON.stringify({
        tool_trace: toolTrace,
        model: modelId,
        provider_path: providerDecision.providerPath,
        provider_decision: providerDecision,
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
        project_briefing_snapshot: projectBriefingSnapshot ?? null,
        executive_briefing_retrieval: executiveBriefingRetrieval ?? null,
        source_health: sourceHealth ?? null,
        data_parts: dataParts ?? [],
      }),
    ),
  });
}

const RETRIEVAL_TOOL_NAMES = new Set([
  "semanticSearch",
  "sourceSpecificRagRetrieval",
  "searchMeetingsByTopic",
  "searchEmails",
  "searchTeamsMessages",
  "searchExternalDocuments",
]);

const DOCUMENT_SOURCE_TABLES = new Set([
  "document",
  "email",
  "meeting",
  "meeting_summary",
  "meeting_transcript",
  "onedrive",
  "teams_channel",
  "teams_dm",
  "teams_message",
]);

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textIncludes(haystack: string, needle: string | null | undefined): boolean {
  if (!needle?.trim()) return false;
  return haystack.includes(needle.trim().toLowerCase());
}

function normalizeRetrievalQuery(trace: Record<string, unknown>): string | null {
  const input = asRecord(trace.input);
  return (
    asString(input.query) ??
    asString(input.topic) ??
    asString(input.searchQuery) ??
    asString(input.label) ??
    asString(input.kind)
  );
}

function normalizeRetrievalProjectId(
  fallbackProjectId: number | undefined,
  trace: Record<string, unknown>,
  result?: Record<string, unknown>,
): number | null {
  const input = asRecord(trace.input);
  const projectId =
    asFiniteNumber(result?.projectId) ??
    asFiniteNumber(result?.project_id) ??
    asFiniteNumber(input.projectId) ??
    fallbackProjectId ??
    null;
  return projectId;
}

function normalizeSourceDocumentId(result: Record<string, unknown>): string | null {
  const explicit =
    asString(result.sourceDocumentId) ??
    asString(result.documentId) ??
    asString(result.document_id);
  if (explicit) return explicit;

  const sourceTable = asString(result.sourceTable);
  const recordId = asString(result.recordId) ?? asString(result.id);
  if (sourceTable && DOCUMENT_SOURCE_TABLES.has(sourceTable) && recordId) {
    return recordId;
  }

  return null;
}

function normalizeSourceChunkId(result: Record<string, unknown>, documentId: string | null): string | null {
  const explicit =
    asString(result.sourceChunkId) ??
    asString(result.chunkId) ??
    asString(result.chunk_id);
  if (explicit) return explicit;

  const chunkIndex = asFiniteNumber(result.chunkIndex) ?? asFiniteNumber(result.chunk_index);
  return documentId && chunkIndex !== null ? `${documentId}:${chunkIndex}` : null;
}

function retrievalResultCitation(result: Record<string, unknown>): string | null {
  const citation = asString(result.citation) ?? asString(result.sourceRef);
  if (citation) return citation;

  const sourceTable = asString(result.sourceTable);
  const recordId = asString(result.recordId);
  return sourceTable && recordId ? `[Source: ${sourceTable} ${recordId}]` : null;
}

function retrievalResultWasUsed(result: Record<string, unknown>, normalizedContent: string): {
  cited: boolean;
  usedInAnswer: boolean;
} {
  const citation = retrievalResultCitation(result);
  const documentId = normalizeSourceDocumentId(result);
  const title = asString(result.title) ?? asString(asRecord(result.metadata).title);
  const id = asString(result.id) ?? asString(result.recordId);

  const cited =
    textIncludes(normalizedContent, citation) ||
    textIncludes(normalizedContent, documentId) ||
    textIncludes(normalizedContent, id);
  const usedInAnswer = cited || textIncludes(normalizedContent, title);
  return { cited, usedInAnswer };
}

function retrievalOutcomeForUsage(params: {
  cited: boolean;
  usedInAnswer: boolean;
  hasError: boolean;
  noResults: boolean;
}): AiRetrievalOutcome {
  if (params.hasError) return "unsupported";
  if (params.noResults) return "unknown";
  if (params.cited || params.usedInAnswer) return "helpful";
  return "unknown";
}

function retrievalRowsFromTrace(params: {
  trace: Record<string, unknown>;
  userId: string;
  sessionId: string;
  selectedProjectId?: number;
  normalizedContent: string;
}): RecordRetrievalFeedbackParams[] {
  const { trace, userId, sessionId, selectedProjectId, normalizedContent } = params;
  const toolName = asString(trace.tool);
  if (!toolName || !RETRIEVAL_TOOL_NAMES.has(toolName)) return [];

  const queryText = normalizeRetrievalQuery(trace);
  if (!queryText) return [];

  const output = asRecord(trace.output);
  const hasError =
    Boolean(trace.error) ||
    typeof output.error === "string" ||
    output.blocked === true;
  const rawResults = Array.isArray(output.results)
    ? output.results.filter(
        (result): result is Record<string, unknown> =>
          Boolean(result) && typeof result === "object" && !Array.isArray(result),
      )
    : Array.isArray(output.rows)
      ? output.rows.filter(
          (result): result is Record<string, unknown> =>
            Boolean(result) && typeof result === "object" && !Array.isArray(result),
        )
      : [];

  if (rawResults.length === 0) {
    return [{
      userId,
      sessionId,
      projectId: normalizeRetrievalProjectId(selectedProjectId, trace),
      toolName,
      queryText,
      outcome: retrievalOutcomeForUsage({
        cited: false,
        usedInAnswer: false,
        hasError,
        noResults: true,
      }),
      metadata: {
        noResults: true,
        error: asString(trace.error) ?? asString(output.error),
        message: asString(output.message),
        traceTimestamp: asString(trace.timestamp),
      },
    }];
  }

  return rawResults.slice(0, 12).map((result, index) => {
    const documentId =
      normalizeSourceDocumentId(result) ??
      (toolName === "searchMeetingsByTopic" ? asString(result.id) : null);
    const chunkId = normalizeSourceChunkId(result, documentId);
    const usage = retrievalResultWasUsed(result, normalizedContent);
    const sourceTable = asString(result.sourceTable) ?? asString(result.source) ?? asString(result.category);
    const recordId = asString(result.recordId) ?? asString(result.id);
    const score =
      asFiniteNumber(result.finalScore) ??
      asFiniteNumber(result.similarity) ??
      asFiniteNumber(result.score);

    return {
      userId,
      sessionId,
      projectId: normalizeRetrievalProjectId(selectedProjectId, trace, result),
      toolName,
      queryText,
      sourceDocumentId: documentId,
      sourceChunkId: chunkId,
      rank: index + 1,
      score,
      cited: usage.cited,
      usedInAnswer: usage.usedInAnswer,
      outcome: retrievalOutcomeForUsage({
        cited: usage.cited,
        usedInAnswer: usage.usedInAnswer,
        hasError,
        noResults: false,
      }),
      metadata: {
        sourceTable,
        recordId,
        title: asString(result.title) ?? asString(asRecord(result.metadata).title),
        date: asString(result.date) ?? asString(result.createdAt),
        citation: retrievalResultCitation(result),
        resultCount: asFiniteNumber(output.resultCount) ?? asFiniteNumber(output.totalResults),
        traceTimestamp: asString(trace.timestamp),
      },
    };
  });
}

async function persistRetrievalFeedbackFromToolTrace(params: {
  userId: string;
  sessionId: string;
  selectedProjectId?: number;
  content: string;
  toolTrace: Array<Record<string, unknown>>;
}) {
  const normalizedContent = params.content.toLowerCase();
  const rows = params.toolTrace.flatMap((trace) =>
    retrievalRowsFromTrace({
      trace,
      userId: params.userId,
      sessionId: params.sessionId,
      selectedProjectId: params.selectedProjectId,
      normalizedContent,
    }),
  );

  await recordRetrievalFeedbackBatch(rows);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeReusableBriefingContext(value: unknown): {
  snapshot: ProjectBriefingSnapshot;
  executiveRetrieval: ExecutiveBriefingRetrievalPacket | null;
} | null {
  if (!isRecord(value)) return null;

  const snapshot = value.project_briefing_snapshot;
  if (!isRecord(snapshot)) return null;

  const packet = value.executive_briefing_retrieval;
  const executiveRetrieval =
    isRecord(packet) && Array.isArray(packet.sources)
      ? (packet as ExecutiveBriefingRetrievalPacket)
      : null;

  return {
    snapshot,
    executiveRetrieval,
  };
}

function briefingContextMatchesProject(params: {
  snapshot: ProjectBriefingSnapshot;
  executiveRetrieval: ExecutiveBriefingRetrievalPacket | null;
  projectName?: string;
}): boolean {
  const requestedProject = params.projectName?.trim().toLowerCase();
  if (!requestedProject) return true;

  const project = readSnapshotObject(params.snapshot, "project");
  const projectNames = [
    typeof project?.name === "string" ? project.name.trim().toLowerCase() : "",
    params.executiveRetrieval?.projectName?.trim().toLowerCase() ?? "",
  ].filter((name) => name.length > 0);

  return projectNames.some((name) =>
    name.includes(requestedProject) || requestedProject.includes(name),
  );
}

async function loadReusableBriefingContext(params: {
  supabase: ReturnType<typeof createServiceClient>;
  sessionId: string;
  projectName?: string;
}): Promise<{
  snapshot: ProjectBriefingSnapshot;
  executiveRetrieval: ExecutiveBriefingRetrievalPacket | null;
} | null> {
  const { data, error } = await params.supabase
    .from("chat_history")
    .select("metadata")
    .eq("session_id", params.sessionId)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return null;

  for (const row of data ?? []) {
    const reusable = normalizeReusableBriefingContext((row as Record<string, unknown>).metadata);
    if (!reusable) continue;
    if (
      !briefingContextMatchesProject({
        ...reusable,
        projectName: params.projectName,
      })
    ) {
      continue;
    }
    return reusable;
  }

  return null;
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
    const {
      id: sessionId,
      messages,
      councilMode,
      selectedProjectId,
      selectedModel,
      executiveBriefPacket,
    } = body as {
      id: string;
      messages: UIMessage[];
      councilMode?: boolean;
      selectedProjectId?: number;
      selectedModel?: unknown;
      executiveBriefPacket?: unknown;
    };
    const activeModel = isAiAssistantModelId(selectedModel)
      ? selectedModel
      : DEFAULT_AI_ASSISTANT_MODEL;
    const providerDecision = getAssistantToolCallingDecision({
      modelId: activeModel,
    });

    if (!sessionId || !messages?.length) {
      return new Response("session id and messages are required", {
        status: 400,
      });
    }

    const supabase = createServiceClient();
    const toolTrace: Array<Record<string, unknown>> = [];
    let memoryUsage: MemoryUsageSummary | undefined;
    let learningUsage: BotLearningUsageSummary | undefined;

    // Accumulated per-step diagnostics — populated by streamText callbacks.
    const stepStartDiagnostics: StepStartDiagnostic[] = [];
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
    const actionFollowUpResponse = shouldUseActionFollowUpResponse(lastUserContent);
    const sourceQualityFollowUpResponse = shouldUseSourceQualityFollowUpResponse(lastUserContent);
    const sourceSpecificRagRequest = detectSourceSpecificRagRequest(lastUserContent);
    const sourceLookupRecentTeamsRequest = sourceSpecificRagRequest
      ? null
      : detectSourceLookupRecentTeamsRequest(lastUserContent);
    const deterministicAssistantIntent = classifyAssistantIntent(lastUserContent);
    const intentPlannerDecision = await planAssistantIntent({
      message: lastUserContent,
      selectedProjectId,
      activeModel,
      deterministicIntent: deterministicAssistantIntent,
      sourceSpecificRagKind: sourceSpecificRagRequest?.kind,
    });
    const assistantIntent = intentPlannerDecision.intent;
    toolTrace.push({
      tool: "intentPlanner",
      input: {
        message: lastUserContent,
        selectedProjectId: selectedProjectId ?? null,
        deterministicIntent: deterministicAssistantIntent,
        sourceSpecificRagKind: sourceSpecificRagRequest?.kind ?? null,
        sourceLookupRecentTeamsKind: sourceLookupRecentTeamsRequest?.kind ?? null,
      },
      output: intentPlannerDecision,
      timestamp: new Date().toISOString(),
    });
    const dailyBriefCritiqueRequest = isDailyBriefCritiqueRequest(lastUserContent);
    if (dailyBriefCritiqueRequest) {
      toolTrace.push({
        tool: "dailyBriefCritiqueGuard",
        input: {
          message: lastUserContent.slice(0, 240),
        },
        output: {
          suppressedBrandonDailyUpdateWidget: true,
        },
        timestamp: new Date().toISOString(),
      });
    }
    const personalDailyBriefRequest = isPersonalDailyBriefRequest(lastUserContent);
    const personalTaskRegisterRequest = isPersonalTaskRegisterRequest(lastUserContent);
    const signedInBriefIdentity = personalDailyBriefRequest
      ? await loadSignedInBriefIdentity({
          supabase,
          userId: user.id,
          userEmail: user.email,
        })
      : null;
    const brandonDailyUpdateWidgetRequest =
      !dailyBriefCritiqueRequest &&
      (isBrandonDailyUpdateWidgetRequest(lastUserContent) ||
        signedInBriefIdentity?.isBrandon === true);
    if (personalDailyBriefRequest) {
      toolTrace.push({
        tool: "personalDailyBriefRouter",
        input: {
          message: lastUserContent,
          userId: user.id,
        },
        output: {
          routedToBrandonDailyUpdate: signedInBriefIdentity?.isBrandon === true,
          profileName: signedInBriefIdentity?.profileName ?? null,
          profileEmail: signedInBriefIdentity?.profileEmail ?? null,
          personName: signedInBriefIdentity?.personName ?? null,
          personEmail: signedInBriefIdentity?.personEmail ?? null,
        },
        timestamp: new Date().toISOString(),
      });
    }
    const forceBusinessRetrieval =
      shouldForceBusinessRetrieval(lastUserContent) ||
      actionFollowUpResponse ||
      sourceQualityFollowUpResponse;
    const executivePagePacket = isBrandonDailyUpdatePacket(executiveBriefPacket)
      ? executiveBriefPacket
      : null;
    const priorProjectName = extractPriorProjectName(messages);
    let deterministicRetrieval: SemanticSearchOutput | null = null;
    let projectBriefingSnapshot: ProjectBriefingSnapshot | null = null;
    let executiveBriefingRetrieval: ExecutiveBriefingRetrievalPacket | null = null;
    let assistantSourceHealthContext: AssistantSourceHealthContext | null = null;
    const sourceHealthRequested = shouldAttachAssistantSourceHealth(lastUserContent);
    const getAssistantSourceHealthContext = async (
      reason: AssistantSourceHealthReason,
    ): Promise<AssistantSourceHealthContext | null> => {
      if (assistantSourceHealthContext) return assistantSourceHealthContext;
      try {
        assistantSourceHealthContext = await loadAssistantSourceHealthContext({
          supabase,
          reason,
        });
        toolTrace.push(assistantSourceHealthContext.trace);
        return assistantSourceHealthContext;
      } catch (error) {
        toolTrace.push({
          tool: "assistantSourceHealth",
          input: { reason },
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        return null;
      }
    };
    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        writeStrategistStatus(writer, {
          stage: "memory",
          message: "Reading conversation memory and project context",
          status: "loading",
        });

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
        if (sourceHealthRequested) {
          const sourceHealth = await getAssistantSourceHealthContext("source_status_request");
          if (sourceHealth) {
            systemPrompt = `${sourceHealth.promptInjection}\n\n---\n\n${systemPrompt}`;
          }
        }

        if (executivePagePacket) {
          systemPrompt = `${formatExecutiveBriefPacketContext(executivePagePacket)}\n\n---\n\n${systemPrompt}`;
        }

        if (isExecutiveBriefingMetadataQuestion(lastUserContent)) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Checking executive briefing generation metadata",
            status: "loading",
          });

          const metadataAnswer = await loadLatestExecutiveBriefingMetadataAnswer({
            supabase,
            packet: executivePagePacket,
          });

          const content =
            metadataAnswer?.content ??
            "I could not find a stored executive briefing packet to timestamp. Source checked: `daily_recaps.recap_kind=executive_briefing`.";

          toolTrace.push({
            tool: "executiveBriefingMetadataLookup",
            input: {
              message: lastUserContent.slice(0, 240),
              hadExecutivePagePacket: Boolean(executivePagePacket),
            },
            output:
              metadataAnswer?.traceOutput ?? {
                foundPacket: false,
                sourceOfTruth: "daily_recaps.recap_kind=executive_briefing",
              },
            timestamp: new Date().toISOString(),
          });

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
            totalUsage: undefined,
            responseQuality,
            councilMode,
            modelId: activeModel,
            loopDiagnostic: buildLoopDiagnostic({
              stepStarts: stepStartDiagnostics,
              steps: stepDiagnostics,
            }),
            projectBriefingSnapshot,
            executiveBriefingRetrieval,
            providerDecision,
            selectedProjectId,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          await writeTextResponse(
            writer,
            "strategist-executive-briefing-metadata",
            content,
          );
          writeStrategistStatus(writer, {
            stage: "complete",
            message: "Executive briefing timestamp found",
            status: "success",
          });
          return;
        }

        if (personalTaskRegisterRequest) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Checking your assigned task sources",
            status: "loading",
          });

          const register = await loadPersonalTaskRegister({
            supabase,
            userId: user.id,
            userEmail: user.email,
            packet: executivePagePacket,
          });
          const { content, traceOutput } = createPersonalTaskRegisterAnswer(register);

          toolTrace.push({
            tool: "getMyTasks",
            input: {
              message: lastUserContent.slice(0, 240),
              hadExecutivePagePacket: Boolean(executivePagePacket),
            },
            output: traceOutput,
            timestamp: new Date().toISOString(),
          });

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
            totalUsage: undefined,
            responseQuality,
            councilMode,
            modelId: activeModel,
            loopDiagnostic: buildLoopDiagnostic({
              stepStarts: stepStartDiagnostics,
              steps: stepDiagnostics,
            }),
            projectBriefingSnapshot,
            executiveBriefingRetrieval,
            providerDecision,
            selectedProjectId,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          await writeTextResponse(writer, "strategist-my-tasks", content);
          writeStrategistStatus(writer, {
            stage: "complete",
            message: "Task register checked",
            status: "success",
          });
          return;
        }

        const plannedWidgets: AssistantWidgetPayload[] = [
          ...buildAssistantWidgetsFromPrompt({
            prompt: lastUserContent,
            selectedProjectId,
          }),
        ];

        if (shouldCaptureFeatureRequest(lastUserContent)) {
          try {
            const featureRequest = await captureFeatureRequestFromChat({
              rawRequest: lastUserContent,
              requesterName: (user.email ?? "").toLowerCase().includes("brandon")
                ? "Brandon"
                : user.email ?? "Stakeholder",
              requesterUserId: user.id,
              selectedProjectId: selectedProjectId ?? null,
              sourceSessionId: sessionId,
              sourceMessageId: lastUserMessage?.id ?? null,
            });
            const detail = await getFeatureRequestDetail(featureRequest.id);
            plannedWidgets.push(
              buildFeatureRequestPacketWidget({
                request: featureRequest,
                latestPlan: detail?.latestPlan ?? null,
              }),
            );
            toolTrace.push({
              tool: "featureRequestPacketRouter",
              input: {
                selectedProjectId: selectedProjectId ?? null,
                message: lastUserContent.slice(0, 240),
              },
              output: {
                requestId: featureRequest.id,
                status: featureRequest.status,
                readyForBuild: featureRequest.ready_for_build,
                missingRequirements: featureRequest.readiness_missing_requirements,
              },
              timestamp: new Date().toISOString(),
            });
          } catch (featureRequestError) {
            const errorMessage =
              featureRequestError instanceof Error
                ? featureRequestError.message
                : String(featureRequestError);
            toolTrace.push({
              tool: "featureRequestPacketRouter",
              input: {
                selectedProjectId: selectedProjectId ?? null,
                message: lastUserContent.slice(0, 240),
              },
              error: errorMessage,
              timestamp: new Date().toISOString(),
            });
            throw new Error(`Feature request packet capture failed: ${errorMessage}`);
          }
        }

        const assistantWidgetDataParts = writeAssistantWidgetParts(
          writer,
          plannedWidgets,
        );
        if (assistantWidgetDataParts.length > 0) {
          toolTrace.push({
            tool: "assistantWidgetPlanner",
            input: {
              selectedProjectId: selectedProjectId ?? null,
              message: lastUserContent.slice(0, 240),
            },
            output: {
              widgets: assistantWidgetDataParts.map((part) => {
                const widget = (part.data as { widget?: { type?: string; id?: string } }).widget;
                return {
                  id: widget?.id ?? part.id,
                  type: widget?.type ?? part.type,
                };
              }),
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (brandonDailyUpdateWidgetRequest) {
          const appAccess = await loadAppCapabilityAccessForUser(user.id);
          const canViewExecutiveBriefing =
            appAccess &&
            hasAppCapability(appAccess, "view_executive_briefing");

          if (!canViewExecutiveBriefing) {
            throw new Error(
              "Executive briefing access is required to generate Brandon's daily update.",
            );
          }

          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Building Brandon's daily executive update",
            status: "loading",
          });

          const packet = (await getExecutiveBriefingDashboard({ windowDays: 2 })).draft.packet;
          const widget = buildBrandonDailyUpdateWidget(packet);
          const dataPart: PersistedDataPart = {
            type: "data-brandon-daily-update-widget",
            id: "brandon-daily-update-widget",
            data: {
              packet,
              widget,
            },
          };

          writer.write(dataPart);

          const content = createBrandonDailyUpdateSummary(packet);
          const textId = "strategist-brandon-daily-update";
          await writeTextResponse(writer, textId, content);

          toolTrace.push({
            tool: "loadBrandonDailyUpdateWidget",
            input: {
              windowDays: 2,
              sourceOfTruth: "daily_recaps.recap_kind=executive_briefing",
            },
            output: {
              needsBrandonCount: packet.sections.needsBrandon.length,
              waitingOnOthersCount: packet.sections.waitingOnOthers.length,
              importantUpdatesCount: packet.sections.importantUpdates.length,
            },
            timestamp: new Date().toISOString(),
          });

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
            totalUsage: undefined,
            responseQuality,
            councilMode,
            modelId: activeModel,
            loopDiagnostic: buildLoopDiagnostic({
              stepStarts: stepStartDiagnostics,
              steps: stepDiagnostics,
            }),
            projectBriefingSnapshot,
            executiveBriefingRetrieval,
            providerDecision,
            selectedProjectId,
            dataParts: [...assistantWidgetDataParts, dataPart],
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          writeStrategistStatus(writer, {
            stage: "complete",
            message: "Brandon daily update ready",
            status: "success",
          });
          return;
        }

        if (sourceSpecificRagRequest) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: `Searching ${sourceSpecificRagRequest.label} in Supabase RAG`,
            status: "loading",
          });

          const scope = await createToolGuardrails(user.id, {
            pinnedProjectId: selectedProjectId,
          }).getScope();
          const sourceSpecificAnswer = await buildSourceSpecificRagAnswer({
            supabase,
            request: sourceSpecificRagRequest,
            scope,
          });
          toolTrace.push(sourceSpecificAnswer.trace);
          const directSourceHealth =
            sourceSpecificAnswer.rows.length === 0 || sourceHealthRequested
              ? await getAssistantSourceHealthContext(
                  sourceSpecificAnswer.rows.length === 0
                    ? "empty_source_lookup"
                    : "source_status_request",
                )
              : null;
          const directSourceSpecificContent = appendSourceHealthSummary(
            sourceSpecificAnswer.content,
            directSourceHealth,
          );

          writeStrategistStatus(writer, {
            stage: "synthesis",
            message: `Writing sourced ${sourceSpecificRagRequest.label} answer`,
            status: "loading",
          });

          const textId = "strategist-source-specific-rag";
          await writeTextResponse(writer, textId, directSourceSpecificContent);

          const responseQuality = scoreResponseQuality({
            toolTrace,
            content: directSourceSpecificContent,
          });
          // TODO(P2): wire meta-commentary retry for the source-specific path here.
          // The general path retry is implemented at ~line 2714. This path is low-risk
          // (model not called) but may still emit filler when source-specific synthesis
          // produces intent-narration text.
          await persistAssistantMessage({
            supabase,
            sessionId,
            userId: user.id,
            content: directSourceSpecificContent,
            toolTrace,
            memoryUsage,
            learningUsage,
            totalUsage: undefined,
            responseQuality,
            councilMode,
            modelId: activeModel,
            loopDiagnostic: buildLoopDiagnostic({
              stepStarts: stepStartDiagnostics,
              steps: stepDiagnostics,
            }),
            projectBriefingSnapshot,
            executiveBriefingRetrieval,
            providerDecision,
            selectedProjectId,
            dataParts: assistantWidgetDataParts,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          writeStrategistStatus(writer, {
            stage: "complete",
            message: `${sourceSpecificRagRequest.label} check complete`,
            status: "success",
          });
          return;
        }

        if (assistantIntent === "source_lookup") {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Searching source records for the requested discussion context",
            status: "loading",
          });

          const semanticSearchTool = (tools as Record<string, ExecutableTool>).semanticSearch;
          let sourceLookupOutput: SemanticSearchOutput | null = null;
          let recentTeamsContext: string | null = null;

          if (sourceLookupRecentTeamsRequest) {
            const scope = await createToolGuardrails(user.id, {
              pinnedProjectId: selectedProjectId,
            }).getScope();
            const recentTeamsAnswer = await buildSourceSpecificRagAnswer({
              supabase,
              request: sourceLookupRecentTeamsRequest,
              scope,
            });
            toolTrace.push(recentTeamsAnswer.trace);
            recentTeamsContext = [
              "# Recent Teams Window",
              "Use this recent Teams window as primary evidence for current communication-diagnosis questions. Older semantic matches are secondary pattern context only; do not lead with them unless this window is empty.",
              "",
              recentTeamsAnswer.content,
            ].join("\n");
          }

          if (semanticSearchTool?.execute) {
            const searchOutput = await withTimeout(
              semanticSearchTool.execute({
                query: lastUserContent,
                projectId: selectedProjectId,
                matchCount: 12,
                threshold: 0.5,
                skipRerank: false,
              }),
              18_000,
              "semanticSearch timed out during source lookup retrieval",
            );

            if (isTimeoutResult(searchOutput)) {
              toolTrace.push({
                tool: "semanticSearch",
                input: {
                  query: lastUserContent,
                  projectId: selectedProjectId ?? null,
                  matchCount: 12,
                  threshold: 0.5,
                  skipRerank: false,
                },
                error: searchOutput.error,
                timestamp: new Date().toISOString(),
              });
            } else {
              sourceLookupOutput = normalizeSemanticSearchOutput(searchOutput);
            }
          } else {
            toolTrace.push({
              tool: "semanticSearch",
              input: {
                query: lastUserContent,
                projectId: selectedProjectId ?? null,
              },
              error: "semanticSearch tool was not executable during source lookup retrieval",
              timestamp: new Date().toISOString(),
            });
          }

          const sourceLookupContext = createSourceLookupAnswer({
            output: sourceLookupOutput,
            userMessage: lastUserContent,
          });
          const sourceLookupResultCount = sourceLookupOutput?.results?.length ?? 0;
          const sourceLookupHealth =
            sourceLookupResultCount === 0 || sourceLookupResultCount <= 2 || sourceHealthRequested
              ? await getAssistantSourceHealthContext(
                  sourceLookupResultCount === 0
                    ? "empty_source_lookup"
                    : sourceLookupResultCount <= 2
                      ? "low_source_lookup"
                      : "source_status_request",
                )
              : null;
          toolTrace.push({
            tool: "sourceLookupIntentRouter",
            input: {
              intent: assistantIntent,
              query: lastUserContent,
              selectedProjectId: selectedProjectId ?? null,
            },
            output: {
              resultCount: sourceLookupResultCount,
              recentTeamsWindow: sourceLookupRecentTeamsRequest
                ? {
                    startDate: sourceLookupRecentTeamsRequest.startDate ?? null,
                    endDate: sourceLookupRecentTeamsRequest.endDate ?? null,
                    limit: sourceLookupRecentTeamsRequest.limit,
                  }
                : null,
              usedProjectBriefingTemplate: false,
              mode: "additive-context",
            },
            timestamp: new Date().toISOString(),
          });

          // ADDITIVE SOURCE-LOOKUP MODE (2026-05-02 fix): instead of writing
          // the prebuilt source dump as the entire response and returning,
          // inject it as system context and let the strategist (streamText
          // below) read those sources, extract commitments / issues / decisions,
          // and synthesize a real answer. The retrieval still happens — only
          // the synthesis step changes.
          // See docs/ai-plan/evals/dogfood/2026-05-02T16-13-17-228Z/report.md
          // case 05-recent-emails for the dogfood failure that surfaced this.
          const sourceLookupHeader = `# Source Lookup Results\n\nThe user is asking for what was said / what happened in source channels (meetings, Teams, email, documents). I ran source retrieval before synthesis. If a Recent Teams Window is present, treat it as the current primary evidence and use older semantic matches only as secondary pattern context. Read the sources carefully, extract the actual commitments / issues / decisions / sentiment the user is asking about, and synthesize a useful answer with specific quotes or paraphrased points and source citations. Do NOT just list the source previews verbatim — that's what we used to do and it wasn't useful. If the sources don't actually contain what the user asked about, say so honestly.`;
          systemPrompt = [
            sourceLookupHeader,
            sourceLookupHealth?.promptInjection,
            recentTeamsContext,
            sourceLookupContext,
            "---",
            systemPrompt,
          ].filter((part): part is string => Boolean(part?.trim())).join("\n\n");

          writeStrategistStatus(writer, {
            stage: "synthesis",
            message: "Loaded source records — synthesizing answer",
            status: "success",
          });
          // Fall through to streamText so the strategist can synthesize on top of the sources.
        }

        if (isRfiActionRequest(lastUserContent)) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Resolving project context for RFI preview",
            status: "loading",
          });

          const rfiProjectContext = await resolveRfiProjectContext({
            message: lastUserContent,
            selectedProjectId,
            supabase,
          });
          const projectId = rfiProjectContext.projectId;
          const projectName = rfiProjectContext.projectName;
          const topic = extractRfiTopic(lastUserContent);
          const subject = titleCaseRfiSubject(topic);
          const question = buildRfiPreviewQuestion({
            topic,
            projectName,
          });

          let previewOutput: unknown = null;
          if (projectId) {
            previewOutput = await withTimeout(
              previewCreateRFI(
                user.id,
                {
                  onTrace: (trace) => {
                    toolTrace.push(trace);
                  },
                  pinnedProjectId: selectedProjectId,
                },
                {
                  projectId,
                  subject,
                  question,
                  costImpact: "tbd",
                  scheduleImpact: "tbd",
                },
              ),
              12_000,
              "createRFI preview timed out during action intent routing",
            );

            if (isTimeoutResult(previewOutput)) {
              toolTrace.push({
                tool: "createRFI",
                input: {
                  projectId,
                  subject,
                  question,
                  confirmed: false,
                },
                error: previewOutput.error,
                timestamp: new Date().toISOString(),
              });
            }
          }

          const content = projectId
            ? formatRfiPreviewAnswer({
                projectName,
                previewOutput,
                topic,
              })
            : [
                "I identified this as an RFI action request, but I did not create anything.",
                "",
                "**Missing Project Context**",
                "- I could not resolve the project from the selected context or your message.",
                "",
                "**Draft Intent**",
                `- Subject: ${subject}`,
                `- Question: ${question}`,
                "",
                "**Next Step**",
                "- Select or name the exact project, then provide the ball-in-court and due date before confirming creation.",
              ].join("\n");

          toolTrace.push({
            tool: "rfiActionIntentRouter",
            input: {
              intent: assistantIntent,
              query: lastUserContent,
              selectedProjectId: selectedProjectId ?? null,
            },
            output: {
              resolvedTarget: rfiProjectContext.resolvedTarget
                ? {
                    id: rfiProjectContext.resolvedTarget.id,
                    slug: rfiProjectContext.resolvedTarget.slug,
                    projectId: rfiProjectContext.resolvedTarget.projectId,
                    source: rfiProjectContext.resolvedTarget.source,
                  }
                : null,
              projectResolutionSource: rfiProjectContext.source,
              usedStreamingModelTools: false,
              previewOnly: true,
            },
            timestamp: new Date().toISOString(),
          });

          writeStrategistStatus(writer, {
            stage: "synthesis",
            message: "Writing safe RFI preview",
            status: "loading",
          });

          const textId = "rfi-action-preview";
          await writeTextResponse(writer, textId, content);

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
            totalUsage: undefined,
            responseQuality,
            councilMode,
            modelId: activeModel,
            loopDiagnostic: buildLoopDiagnostic({
              stepStarts: stepStartDiagnostics,
              steps: stepDiagnostics,
            }),
            projectBriefingSnapshot,
            executiveBriefingRetrieval,
            providerDecision,
            selectedProjectId,
            dataParts: assistantWidgetDataParts,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          writeStrategistStatus(writer, {
            stage: "complete",
            message: "RFI preview complete",
            status: "success",
          });
          return;
        }

        if (shouldUsePacketFirstIntent(assistantIntent)) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Checking current project intelligence packet",
            status: "loading",
          });

          const resolvedTarget = await resolveIntelligenceTarget({
            query: lastUserContent,
            selectedProjectId,
            supabase,
          });

          if (resolvedTarget) {
            const intelligencePacket = await loadCurrentIntelligencePacket({
              targetId: resolvedTarget.id,
              supabase,
            });

            // Freshness gate: discard packets older than 7 days so the model
            // is not anchored to months-old pre-rendered summaries. A stale
            // packet is worse than no packet — it injects confident-sounding
            // outdated context that the model trusts over tool results.
            const PACKET_MAX_AGE_DAYS = 7;
            const packetAgeMs = intelligencePacket?.generatedAt
              ? Date.now() - new Date(intelligencePacket.generatedAt).getTime()
              : Infinity;
            const packetIsStale = packetAgeMs > PACKET_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
            const usablePacket = packetIsStale ? null : intelligencePacket;

            const packetContent = usablePacket
              ? synthesizeAdvisorResponse({
                  target: resolvedTarget,
                  packet: usablePacket,
                  intent: assistantIntent,
                  query: lastUserContent,
                })
              : synthesizeMissingPacketResponse({
                  target: resolvedTarget,
                  query: lastUserContent,
                });

            toolTrace.push({
              tool: "clientProjectIntelligencePacket",
              input: {
                intent: assistantIntent,
                query: lastUserContent,
                selectedProjectId: selectedProjectId ?? null,
              },
              output: {
                resolvedTarget: {
                  id: resolvedTarget.id,
                  slug: resolvedTarget.slug,
                  projectId: resolvedTarget.projectId,
                  source: resolvedTarget.source,
                },
                packetId: usablePacket?.id ?? null,
                freshnessStatus: usablePacket?.freshnessStatus ?? (packetIsStale ? "stale_discarded" : "missing"),
                packetAgeDays: packetAgeMs === Infinity ? null : Math.round(packetAgeMs / (24 * 60 * 60 * 1000)),
                cardCount: usablePacket?.cards.length ?? 0,
                mode: "additive-context",
              },
              timestamp: new Date().toISOString(),
            });

            // ADDITIVE PACKET MODE (2026-05-02 fix): instead of short-circuiting
            // and returning the rendered packet directly, inject it as system
            // context so the strategist (streamText below) can layer commentary,
            // recommendations, and follow-ups on top — and still call tools to
            // fill gaps. See docs/ai-plan/evals/EVAL-SUITE-FIRST-RUN-FINDINGS-2026-05-02.md.
            const packetContextHeader = usablePacket
              ? `# Current Project Intelligence Packet\n\nA pre-rendered intelligence packet for **${resolvedTarget.slug ?? resolvedTarget.id}** is available below. Use it as your primary evidence. Layer your own analysis, recommendations, and follow-up questions on top. Call additional tools (semanticSearch, getProjectBriefingSnapshot, financial tools, etc.) when the user's question goes beyond what the packet covers or when more recent data would help.`
              : `# Project Intelligence Packet (Missing)\n\nNo current intelligence packet exists for **${resolvedTarget.slug ?? resolvedTarget.id}**. Acknowledge this briefly, then proceed by calling the appropriate tools (semanticSearch, getProjectBriefingSnapshot, financial tools, etc.) to gather evidence and answer the user.`;

            systemPrompt = `${packetContextHeader}\n\n${packetContent}\n\n---\n\n${systemPrompt}`;

            writeStrategistStatus(writer, {
              stage: "knowledge",
              message: "Loaded project intelligence packet — synthesizing strategist response",
              status: "success",
            });
            // Fall through to streamText so the model can reason on top of the packet.
          }
        }

        if (forceBusinessRetrieval) {
          const reusableBriefingContext =
            actionFollowUpResponse || sourceQualityFollowUpResponse
              ? await loadReusableBriefingContext({
                  supabase,
                  sessionId,
                  projectName: priorProjectName,
                })
              : null;

          if (reusableBriefingContext) {
            projectBriefingSnapshot = reusableBriefingContext.snapshot;
            executiveBriefingRetrieval = reusableBriefingContext.executiveRetrieval;

            const snapshotContext = formatProjectBriefingSnapshotContext(projectBriefingSnapshot);
            if (snapshotContext) {
              systemPrompt = `${snapshotContext}\n\n---\n\n${systemPrompt}`;
            }

            const executiveRetrievalContext =
              formatExecutiveBriefingRetrievalContext(executiveBriefingRetrieval);
            if (executiveRetrievalContext) {
              systemPrompt = `${executiveRetrievalContext}\n\n---\n\n${systemPrompt}`;
            }

            toolTrace.push(
              {
                tool: "reusePreviousBriefingContext",
                input: {
                  sessionId,
                  projectName: priorProjectName ?? null,
                },
                output: {
                  reusedSnapshot: true,
                  reusedExecutiveRetrieval: Boolean(executiveBriefingRetrieval),
                },
                timestamp: new Date().toISOString(),
              },
              {
                tool: "cachedProjectBriefingSnapshot",
                input: {
                  projectName: priorProjectName ?? null,
                },
                output: {
                  sourceRef: projectBriefingSnapshot.sourceRef ?? null,
                },
                timestamp: new Date().toISOString(),
              },
              {
                tool: "cachedExecutiveRetrievalPacket",
                input: {
                  projectName: executiveBriefingRetrieval?.projectName ?? priorProjectName ?? null,
                },
                output: {
                  sources: executiveBriefingRetrieval?.sources.map((source) => ({
                    label: source.label,
                    status: source.status,
                    resultCount: source.resultCount,
                  })) ?? [],
                },
                timestamp: new Date().toISOString(),
              },
            );

            writeStrategistStatus(writer, {
              stage: "knowledge",
              message: "Reusing the prior briefing packet for this follow-up",
              status: "success",
            });
          }

          if (!reusableBriefingContext) {
          writeStrategistStatus(writer, {
            stage: "project",
            message: "Finding the project and checking access",
            status: "loading",
          });

          const preflight = await buildBusinessContextPreflight({
            userId: user.id,
            message: priorProjectName
              ? `${priorProjectName} ${lastUserContent}`
              : lastUserContent,
            selectedProjectId,
          });
          toolTrace.push(preflight.trace);
          systemPrompt = `${preflight.promptInjection}\n\n---\n\n${systemPrompt}`;

          const sourceHealth =
            shouldUsePacketFirstIntent(assistantIntent) || forceBusinessRetrieval || sourceHealthRequested
              ? await getAssistantSourceHealthContext("project_intelligence_context")
              : null;
          if (sourceHealth) {
            systemPrompt = `${sourceHealth.promptInjection}\n\n---\n\n${systemPrompt}`;
          }

          const projectId = selectedProjectId ?? preflight.primaryProjectId ?? undefined;
          const semanticSearchTool = (tools as Record<string, ExecutableTool>).semanticSearch;
          const briefingSnapshotTool = (tools as Record<string, ExecutableTool>).getProjectBriefingSnapshot;

          writeStrategistStatus(writer, {
            stage: "snapshot",
            message: "Pulling budget, contract, RFIs, submittals, schedule, and commitments",
            status: "loading",
          });

          if (briefingSnapshotTool?.execute) {
            const snapshotOutput = await withTimeout(
              briefingSnapshotTool.execute({
                projectId,
                projectName: projectId ? undefined : priorProjectName,
              }),
              12_000,
              "getProjectBriefingSnapshot timed out during strategist retrieval",
            );

            if (isTimeoutResult(snapshotOutput)) {
              toolTrace.push({
                tool: "getProjectBriefingSnapshot",
                input: {
                  projectId: projectId ?? null,
                },
                error: snapshotOutput.error,
                timestamp: new Date().toISOString(),
              });
              writeStrategistStatus(writer, {
                stage: "snapshot",
                message: "Structured project controls timed out; continuing with other sources",
                status: "warning",
              });
            } else if (snapshotOutput && typeof snapshotOutput === "object") {
              projectBriefingSnapshot = snapshotOutput as ProjectBriefingSnapshot;
              const snapshotContext = formatProjectBriefingSnapshotContext(projectBriefingSnapshot);
              if (snapshotContext) {
                systemPrompt = `${snapshotContext}\n\n---\n\n${systemPrompt}`;
              }
              writeStrategistStatus(writer, {
                stage: "snapshot",
                message: "Structured project controls loaded",
                status: "success",
              });
            }
          } else {
            toolTrace.push({
              tool: "getProjectBriefingSnapshot",
              input: {
                projectId: projectId ?? null,
              },
              error: "getProjectBriefingSnapshot tool was not executable during server-side retrieval",
              timestamp: new Date().toISOString(),
            });
          }

          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Searching meetings, documents, and vectorized project history",
            status: "loading",
          });

          if (semanticSearchTool?.execute) {
            const searchOutput = await withTimeout(
              semanticSearchTool.execute({
                query: priorProjectName
                  ? `${priorProjectName} - ${lastUserContent}`
                  : lastUserContent,
                projectId,
                matchCount: 12,
                threshold: 0.5,
                skipRerank: false,
              }),
              18_000,
              "semanticSearch pre-retrieval timed out during strategist retrieval",
            );

            if (isTimeoutResult(searchOutput)) {
              toolTrace.push({
                tool: "semanticSearch",
                input: {
                  query: lastUserContent,
                  projectId: projectId ?? null,
                  matchCount: 8,
                  threshold: 0.2,
                  skipRerank: true,
                },
                error: searchOutput.error,
                timestamp: new Date().toISOString(),
              });
              writeStrategistStatus(writer, {
                stage: "knowledge",
                message: "Meeting/document search timed out; using structured project controls",
                status: "warning",
              });
            } else {
              deterministicRetrieval = normalizeSemanticSearchOutput(searchOutput);
              writeStrategistStatus(writer, {
                stage: "knowledge",
                message: `Found ${(deterministicRetrieval?.results ?? []).length} relevant meeting/document signals`,
                status: "success",
              });
            }

            const retrievedContext = deterministicRetrieval
              ? formatRetrievedSourceContext(deterministicRetrieval)
              : null;
            if (retrievedContext) {
              systemPrompt = `${retrievedContext}\n\n---\n\n${systemPrompt}`;
            }
          } else {
            toolTrace.push({
              tool: "semanticSearch",
              input: {
                query: lastUserContent,
                projectId: projectId ?? null,
              },
              error: "semanticSearch tool was not executable during server-side retrieval",
              timestamp: new Date().toISOString(),
            });
          }

          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Checking recent meetings, Teams, email, and OneDrive sources",
            status: "loading",
          });

          const projectSnapshotRecord = readSnapshotObject(projectBriefingSnapshot, "project");
          const projectName =
            typeof projectSnapshotRecord?.name === "string" && projectSnapshotRecord.name.trim()
              ? projectSnapshotRecord.name.trim()
              : priorProjectName;
          const executiveQuery = [projectName, lastUserContent]
            .filter((part): part is string => Boolean(part?.trim()))
            .join(" - ");
          const executiveSourceTools = [
            {
              source: "meetings" as const,
              label: "Meetings",
              toolName: "searchMeetingsByTopic",
              input: {
                topic: executiveQuery,
                projectId,
                maxResults: 6,
              },
            },
            {
              source: "teamsMessages" as const,
              label: "Teams",
              toolName: "searchTeamsMessages",
              input: {
                query: executiveQuery,
                matchCount: 6,
              },
            },
            {
              source: "emails" as const,
              label: "Email",
              toolName: "searchEmails",
              input: {
                query: executiveQuery,
                matchCount: 6,
              },
            },
            {
              source: "oneDriveDocuments" as const,
              label: "OneDrive/Documents",
              toolName: "searchExternalDocuments",
              input: {
                query: executiveQuery,
                matchCount: 6,
              },
            },
          ];

          const executiveSourceResults = await Promise.all(
            executiveSourceTools.map(async (sourceTool) => {
              const executableTool = (tools as Record<string, ExecutableTool>)[sourceTool.toolName];
              if (!executableTool?.execute) {
                return normalizeExecutiveSourceOutput(sourceTool.source, sourceTool.label, {
                  error: `${sourceTool.toolName} was not executable during executive briefing retrieval.`,
                });
              }

              try {
                const output = await withTimeout(
                  executableTool.execute(sourceTool.input),
                  12_000,
                  `${sourceTool.toolName} timed out during executive briefing retrieval`,
                );
                return normalizeExecutiveSourceOutput(sourceTool.source, sourceTool.label, output);
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                toolTrace.push({
                  tool: sourceTool.toolName,
                  input: sourceTool.input,
                  error: message,
                  timestamp: new Date().toISOString(),
                });
                return normalizeExecutiveSourceOutput(sourceTool.source, sourceTool.label, {
                  error: message,
                });
              }
            }),
          );

          executiveBriefingRetrieval = {
            query: executiveQuery,
            projectId,
            projectName,
            sources: executiveSourceResults,
          };

          const executiveRetrievalContext =
            formatExecutiveBriefingRetrievalContext(executiveBriefingRetrieval);
          if (executiveRetrievalContext) {
            systemPrompt = `${executiveRetrievalContext}\n\n---\n\n${systemPrompt}`;
          }

          const loadedExecutiveSources = executiveSourceResults.filter(
            (source) => source.status === "loaded",
          ).length;
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: `Checked meetings, Teams, email, and OneDrive (${loadedExecutiveSources}/4 with results)`,
            status: loadedExecutiveSources > 0 ? "success" : "warning",
          });
          }

          writeStrategistStatus(writer, {
            stage: "synthesis",
            message: "Writing the executive PM briefing and recommendation",
            status: "loading",
          });

          const deterministicBriefing = createDeterministicProjectBriefing({
            snapshot: projectBriefingSnapshot,
            retrieval: deterministicRetrieval,
            executiveRetrieval: executiveBriefingRetrieval,
          });
          const deterministicActionBriefing = actionFollowUpResponse
            ? createDeterministicActionBriefing({
                snapshot: projectBriefingSnapshot,
                executiveRetrieval: executiveBriefingRetrieval,
              })
            : null;
          const deterministicSourceQualityAnswer = sourceQualityFollowUpResponse
            ? createDeterministicSourceQualityAnswer({
                snapshot: projectBriefingSnapshot,
                executiveRetrieval: executiveBriefingRetrieval,
              })
            : null;
          let content = deterministicSourceQualityAnswer ??
            deterministicActionBriefing ??
            deterministicBriefing ??
            (await generateRecoveryResponse({
              userMessage: lastUserContent,
              cause: "Project briefing retrieval did not return enough source data to synthesize a full answer.",
              selectedProjectId,
              modelId: activeModel,
              toolTrace,
            }));

          const contentBeforeContract = content;
          content = enforceProjectBriefingResponseContract({
            content,
            projectBriefingSnapshot,
            executiveRetrieval: executiveBriefingRetrieval,
            forceBusinessRetrieval:
              forceBusinessRetrieval && !actionFollowUpResponse && !sourceQualityFollowUpResponse,
          });
          if (content !== contentBeforeContract) {
            toolTrace.push({
              tool: "projectBriefingResponseContract",
              input: {
                hadHardFacts: /(^|\n)\s*(#{1,4}\s*)?(\*\*)?hard facts(\*\*)?\b/i.test(contentBeforeContract),
                hadNextStep: /(^|\n)\s*(#{1,4}\s*)?(\*\*)?next step(\*\*)?\b/i.test(contentBeforeContract),
              },
              output: {
                appendedCharacters: content.length - contentBeforeContract.length,
              },
              timestamp: new Date().toISOString(),
            });
          }

          const textId = "strategist-project-briefing";
          await writeTextResponse(writer, textId, content);

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
            totalUsage: undefined,
            responseQuality,
            councilMode,
            modelId: activeModel,
            loopDiagnostic: buildLoopDiagnostic({
              stepStarts: stepStartDiagnostics,
              steps: stepDiagnostics,
            }),
            projectBriefingSnapshot,
            executiveBriefingRetrieval,
            providerDecision,
            selectedProjectId,
            dataParts: assistantWidgetDataParts,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

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

          writeStrategistStatus(writer, {
            stage: "complete",
            message: "Briefing complete",
            status: "success",
          });
          return;
        }

        const streamingModelToolsEnabled = shouldEnableStreamingModelTools(providerDecision);
        const modelTools = streamingModelToolsEnabled ? (tools as ToolSet) : undefined;
        toolTrace.push({
          tool: "streamingToolPolicy",
          input: {
            providerPath: providerDecision.providerPath,
            modelId: providerDecision.modelId,
          },
          output: {
            streamingModelToolsEnabled,
            reason: providerDecision.reason,
          },
          timestamp: new Date().toISOString(),
        });
        const result = streamText({
            model: getLanguageModel(activeModel),
            system: systemPrompt,
            messages: modelMessages,
            ...(modelTools ? { tools: modelTools } : {}),
            maxOutputTokens: 1500,
            timeout: {
              totalMs: 90_000,
              stepMs: 45_000,
              chunkMs: 45_000,
            },
            stopWhen: stepCountIs(10),
            experimental_telemetry: {
              isEnabled: process.env.PHOENIX_TRACING === "true",
              functionId: "ai-assistant-chat",
              metadata: {
                intent: assistantIntent ?? "unknown",
                modelId: activeModel,
              },
            },
            onError: ({ error }) => {
              streamErrorMessage =
                error instanceof Error ? error.message : String(error);
            },
            experimental_onStepStart: ({
              stepNumber,
              model,
              toolChoice,
              activeTools,
              tools,
            }) => {
              stepStartDiagnostics.push({
                stepNumber,
                modelProvider: model.provider,
                modelId: model.modelId,
                toolChoice: serializeDiagnosticValue(toolChoice),
                activeTools: activeTools?.map(String),
                availableToolNames: Object.keys(tools ?? {}),
              });
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

        let content = "";
        let totalUsage: Awaited<typeof result.totalUsage> | undefined;
        try {
          content = (await result.text).trim();
          totalUsage = await result.totalUsage;
        } catch (streamError) {
          const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
          streamErrorMessage = streamErrorMessage ?? errorMessage;
          console.error("[chat/route] streamText threw:", errorMessage);
          toolTrace.push({
            tool: "streamTextError",
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });
        }

        if (!content) {
          const cause = streamErrorMessage
            ? `The model stream reported: ${streamErrorMessage}`
            : "The model/tool run completed without returning final assistant text.";
          const sourceGroundedFallback = deterministicRetrieval
            ? await generateSourceGroundedSynthesis({
                output: deterministicRetrieval,
                userMessage: lastUserContent,
                projectBriefingSnapshot,
                executiveRetrieval: executiveBriefingRetrieval,
              })
            : null;
          if (sourceGroundedFallback) {
            toolTrace.push({
              tool: "sourceGroundedSynthesisFallback",
              input: {
                primaryModel: activeModel,
                synthesisModel: "openai/gpt-4.1",
                reason: cause,
              },
              output: {
                contentLength: sourceGroundedFallback.length,
              },
              timestamp: new Date().toISOString(),
            });
          }
          // No-tool retry: if streamText produced empty text (AI Gateway tool-call
          // bug) and no source-grounded fallback is available, retry with
          // generateText() + no tools before escalating to recovery response.
          let noToolRetryContent: string | null = null;
          if (!sourceGroundedFallback) {
            try {
              const retryResult = await generateText({
                model: getLanguageModel("openai/gpt-4.1"),
                system: systemPrompt,
                messages: modelMessages,
                maxOutputTokens: 1500,
                experimental_telemetry: {
                  isEnabled: process.env.PHOENIX_TRACING === "true",
                  functionId: "no-tool-retry",
                  metadata: { primaryModel: activeModel, retryModel: "openai/gpt-4.1" },
                },
              });
              noToolRetryContent = retryResult.text.trim() || null;
              toolTrace.push({
                tool: "noToolRetry",
                input: { primaryModel: activeModel, retryModel: "openai/gpt-4.1", reason: cause },
                output: { contentLength: noToolRetryContent?.length ?? 0, succeeded: !!noToolRetryContent },
                timestamp: new Date().toISOString(),
              });
            } catch (retryError) {
              toolTrace.push({
                tool: "noToolRetryFailed",
                input: { primaryModel: activeModel, retryModel: "openai/gpt-4.1", reason: cause },
                error: retryError instanceof Error ? retryError.message : String(retryError),
                timestamp: new Date().toISOString(),
              });
              // Fall through to generateRecoveryResponse
            }
          }
          content =
            sourceGroundedFallback ??
            noToolRetryContent ??
            (await generateRecoveryResponse({
              userMessage: lastUserContent,
              cause,
              selectedProjectId,
              modelId: activeModel,
              toolTrace,
            }));

          const fallbackTextId = "strategist-failure-response";
          await writeTextResponse(writer, fallbackTextId, content);
        }

        // Meta-commentary retry: if the model returned a filler response
        // ("Let me search for that…") instead of an actual answer, trigger
        // generateText with no tools and append the corrected answer to the
        // still-open stream. The writer remains open because writer.merge() above
        // was called with `sendFinish: false` — do not close it before this block.
        // NOTE: The filler has already streamed to the client. The correction
        // is appended immediately after.
        {
          const preRetryQuality = scoreResponseQuality({ toolTrace, content });
          if (preRetryQuality.hasMetaCommentary && preRetryQuality.score < 60) {
            try {
              const retryResultOrTimeout = await withTimeout(
                generateText({
                  model: getLanguageModel("openai/gpt-4.1"),
                  system: systemPrompt,
                  messages: modelMessages,
                  maxOutputTokens: 1500,
                  experimental_telemetry: {
                    isEnabled: process.env.PHOENIX_TRACING === "true",
                    functionId: "meta-commentary-retry",
                    metadata: { primaryModel: activeModel, retryModel: "openai/gpt-4.1" },
                  },
                }),
                15_000,
                "metaCommentaryRetry timed out after 15 s",
              );
              if (isTimeoutResult(retryResultOrTimeout)) {
                toolTrace.push({
                  tool: "metaCommentaryRetryFailed",
                  input: { primaryModel: activeModel, retryModel: "openai/gpt-4.1" },
                  error: retryResultOrTimeout.error,
                  timestamp: new Date().toISOString(),
                });
              } else {
                const retryContent = retryResultOrTimeout.text.trim();
                if (retryContent) {
                  // Write to stream FIRST — only mutate content after writes succeed
                  await writeTextResponse(
                    writer,
                    "meta-commentary-correction",
                    `\n\n${retryContent}`,
                  );
                  // Now safe to mutate — client has the content
                  content = retryContent;
                  toolTrace.push({
                    tool: "metaCommentaryRetry",
                    input: {
                      primaryModel: activeModel,
                      retryModel: "openai/gpt-4.1",
                      fillerReasons: preRetryQuality.reasons,
                    },
                    output: {
                      contentLength: content.length,
                      succeeded: true,
                      finishReason: retryResultOrTimeout.finishReason,
                    },
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            } catch (retryError) {
              toolTrace.push({
                tool: "metaCommentaryRetryFailed",
                input: { primaryModel: activeModel, retryModel: "openai/gpt-4.1" },
                error: retryError instanceof Error ? retryError.message : String(retryError),
                timestamp: new Date().toISOString(),
              });
              // Fall through — persist original content
            }
          }
        }

        const contentBeforeContract = content;
        content = enforceProjectBriefingResponseContract({
          content,
          projectBriefingSnapshot,
          executiveRetrieval: executiveBriefingRetrieval,
          forceBusinessRetrieval:
            forceBusinessRetrieval && !actionFollowUpResponse && !sourceQualityFollowUpResponse,
        });
        if (content !== contentBeforeContract) {
          toolTrace.push({
            tool: "projectBriefingResponseContract",
            input: {
              hadHardFacts: /(^|\n)\s*(#{1,4}\s*)?(\*\*)?hard facts(\*\*)?\b/i.test(contentBeforeContract),
              hadNextStep: /(^|\n)\s*(#{1,4}\s*)?(\*\*)?next step(\*\*)?\b/i.test(contentBeforeContract),
            },
            output: {
              appendedCharacters: content.length - contentBeforeContract.length,
            },
            timestamp: new Date().toISOString(),
          });
          await writeTextResponse(
            writer,
            "project-briefing-contract",
            content.slice(contentBeforeContract.trim().length).trimStart(),
          );
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
          modelId: activeModel,
          providerDecision,
          loopDiagnostic: buildLoopDiagnostic({
            stepStarts: stepStartDiagnostics,
            steps: stepDiagnostics,
          }),
          projectBriefingSnapshot,
          executiveBriefingRetrieval,
          selectedProjectId,
          dataParts: assistantWidgetDataParts,
          sourceHealth: assistantSourceHealthContext?.metadata ?? null,
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
