// Legacy chat handler — extracted from route.ts. Holds all special-case
// agent dispatch branches (executive brief metadata, personal task register,
// Brandon daily widget, source-specific RAG, source-lookup synthesis, RFI
// preview, packet-first intent) plus the streamText fallback chain.
import {
  consumeStream,
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
import { waitUntil } from "@vercel/functions";
import { traceChatCompletion } from "@/lib/ai/langfuse-trace";
import { z } from "zod";

import {
  hasAppCapability,
  loadAppCapabilityAccessForUser,
} from "@/lib/app-capabilities";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageModel } from "@/lib/ai/providers";
import { buildAiSdkPromptPayload } from "@/lib/ai/prompt-diagnostics";
import {
  DEFAULT_AI_ASSISTANT_MODEL,
  isAiAssistantModelId,
} from "@/lib/ai/assistant-models";
import {
  createStrategistTools,
} from "@/lib/ai/orchestrator";
import { getAssistantRetrievalOrderSummary } from "@/lib/ai/assistant-self-knowledge";
import {
  createWeeklyMarketingContentWorkflow,
  type CmoWeeklyContentWorkflowResult,
} from "@/lib/ai/services/marketing-service";
import {
  assembleLeanAdvisorSystemPrompt,
  assembleSystemPrompt,
  assembleTaskWriteSystemPrompt,
  type BotLearningUsageSummary,
  type MemoryUsageSummary,
  runPostResponseTasks,
} from "@/lib/ai/bot-core";
import { recordAgentLearningUsages } from "@/lib/ai/services/agent-learning-service";
import { createToolGuardrails } from "@/lib/ai/tools/guardrails";
import { previewCreateRFI } from "@/lib/ai/tools/action-tools";
import { createAiAssistantMcpTools } from "@/lib/ai/tools/mcp-tools";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createStrategistFailureResponse } from "@/lib/ai/strategist-failure-response";
import { generateRecoveryResponse } from "@/lib/ai/fallback-chain";
import {
  appendSourceHealthSummary,
  buildSourceSpecificRagAnswer,
  type SourceSpecificRagAnswer,
  type SourceSpecificRagRow,
} from "@/lib/ai/preflights";
import {
  isTimeoutResult,
  planAssistantIntent,
  withTimeout,
  type IntentPlannerDecision,
  type TimeoutResult,
} from "@/lib/ai/intent-classifier";
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
  detectRecentEmailInboxRequest,
  detectSourceSpecificRagRequest,
  detectSourceLookupRecentTeamsRequest,
  type RecentEmailInboxRequest,
  type SourceSpecificRagKind,
  type SourceSpecificRagRequest,
} from "@/lib/ai/detect-rag-request";
import { parseCalendarInviteRequest } from "@/lib/ai/calendar-invite-parser";
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
  buildDeepAgentExecutiveEvidenceWidget,
  buildDeepAgentSourceEvidenceWidget,
  fetchDeepAgentExecutiveBriefing,
  fetchDeepAgentProjectStatus,
  formatDeepAgentExecutiveBriefingContext,
  formatDeepAgentProjectStatusContext,
  shouldUseDeepAgentExecutiveBridge,
  shouldUseDeepAgentProjectStatusBridge,
} from "@/lib/ai/deep-agent-project-status";
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
  isAssistantWidgetPayload,
  type AssistantWidgetPayload,
  type MeetingInsightsWidgetPayload,
  type OutlookInboxSummaryWidgetItem,
  type OutlookInboxSummaryWidgetPayload,
  type OwnerActionItem,
  type OwnerActionQueueWidgetPayload,
  type OwnerSnapshotWidgetPayload,
  type ProjectPickerWidgetPayload,
  type SourceEvidenceItem,
  type TaskSummaryWidgetPayload,
} from "@/lib/ai/assistant-widgets";
import {
  buildTaskSourceReviewPrompt,
  detectTaskSourceReviewRequest,
  loadTaskSourceReviewPacket,
} from "@/lib/ai/task-source-review";
import {
  buildFeatureRequestPacketWidget,
  captureFeatureRequestFromChat,
  getFeatureRequestDetail,
  shouldCaptureFeatureRequest,
} from "@/lib/feature-requests/server";

import { logSystemPromptTokensInDev } from "@/lib/ai/system-prompt";

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

const TASK_WRITE_TOOL_NAMES = [
  "createTask",
  "getMyTasks",
  "getActionItemsAndInsights",
  "createGeneratedTask",
  "updateGeneratedTask",
  "deleteGeneratedTask",
] as const;

const WEB_SEARCH_TOOL_NAMES = [
  "searchWeb",
  "researchCompany",
  "searchConstructionMarket",
] as const;

function withWebSearchTools(names: readonly string[]): readonly string[] {
  return [...names, ...WEB_SEARCH_TOOL_NAMES];
}

const INTENT_TOOL_NAMES: Partial<Record<AssistantIntent, readonly string[]>> = {
  task_write: TASK_WRITE_TOOL_NAMES,
  email_action: [
    "draftOutlookEmail",
    "getRecentOutlookEmails",
    "readOutlookEmailThread",
    "searchEmails",
  ],
  calendar_action: withWebSearchTools([
    "createOutlookCalendarInvite",
    "findProject",
    "getPeopleAndRoles",
    "searchMeetingsByTopic",
    "searchEmails",
    "searchTeamsMessages",
  ]),
  financial_analysis: withWebSearchTools([
    "getFinancialAnalysis",
    "getProjectBudgetSummary",
    "getMarginAnalysis",
    "getBudgetLineItems",
    "getCommitmentsOverview",
    "getChangeOrderDetails",
    "getDirectCostsSummary",
    "getCostTrends",
    "queryBudgetData",
    "queryChangeOrders",
    "queryCommitments",
    "queryDirectCosts",
    "getCashPositionReport",
    "getARAgingReport",
    "getAPAgingReport",
    "getRecentInvoices",
    "getRecentBills",
    "getAcumaticaProjectBudget",
    "getAcumaticaProjectList",
    "findProject",
  ]),
  latest_status: withWebSearchTools([
    "getPortfolioOverview",
    "getProjectsWithRisks",
    "getProjectBriefingSnapshot",
    "getActionItemsAndInsights",
    "getProjectDetails",
    "findProject",
  ]),
  risk_review: withWebSearchTools([
    "getProjectRiskAnalysis",
    "getProjectsWithRisks",
    "getPortfolioOverview",
    "getProjectBriefingSnapshot",
    "getActionItemsAndInsights",
    "getRFIStatus",
    "getSubmittalStatus",
    "getScheduleAnalysis",
    "getChangeOrderDetails",
    "getFinancialAnalysis",
    "findProject",
  ]),
  change_management_review: withWebSearchTools([
    "getChangeOrderDetails",
    "queryChangeOrders",
    "getProjectBudgetSummary",
    "getFinancialAnalysis",
    "getProjectBriefingSnapshot",
    "searchEmails",
    "searchTeamsMessages",
    "searchMeetingsByTopic",
    "semanticSearch",
    "findProject",
  ]),
  decision_lookup: withWebSearchTools([
    "getProjectBriefingSnapshot",
    "getMeetingIntelligence",
    "searchEmails",
    "searchTeamsMessages",
    "searchMeetingsByTopic",
    "getMeetingDetails",
    "semanticSearch",
    "findProject",
  ]),
  task_followup: withWebSearchTools([
    "getActionItemsAndInsights",
    "getProjectBriefingSnapshot",
    "searchMeetingsByTopic",
    "searchEmails",
    "searchTeamsMessages",
    "semanticSearch",
    "findProject",
  ]),
  implementation_planning: withWebSearchTools([
    "getPortfolioOverview",
    "getActionItemsAndInsights",
    "getProjectsWithRisks",
    "getFinancialAnalysis",
    "getCompanyKnowledge",
    "semanticSearch",
    "getPeopleAndRoles",
    "searchMeetingsByTopic",
    "searchEmails",
    "searchTeamsMessages",
  ]),
  external_research: [
    "searchWeb",
    "researchCompany",
    "searchConstructionMarket",
    "consultCFO",
    "consultCOO",
    "consultCHRO",
    "consultCRO",
    "consultVPBD",
    "consultCMO",
  ],
  source_lookup: WEB_SEARCH_TOOL_NAMES,
  app_help: withWebSearchTools(["searchAppHelp"]),
  target_briefing: withWebSearchTools([
    "getProjectBriefingSnapshot",
    "getProjectDetails",
    "getProjectRiskAnalysis",
    "findProject",
  ]),
};

const MESSAGE_DRIVEN_TOOL_RULES: Array<{
  pattern: RegExp;
  tools: readonly string[];
}> = [
  {
    pattern:
      /\b(current read|what changed|what is stuck|what's stuck|should i be worried|worried about|what should i worry)\b|(?=.*\blatest\b)(?=.*\b(westfield|vermillion|project|job)\b)/i,
    tools: ["getProjectBriefingSnapshot", "semanticSearch"],
  },
  {
    pattern: /\b(active jobs?|jobs? need(?:s)? my attention|need(?:s)? attention this week|before calls start)\b/i,
    tools: ["getPortfolioOverview", "getProjectsWithRisks"],
  },
  {
    pattern: /\b(owner call|owner calls|owner prep|overpromis(e|ing)|what should i say)\b/i,
    tools: ["getProjectBriefingSnapshot", "semanticSearch"],
  },
  {
    pattern: /\b(action items?|open items?|next actions?|waiting on|sign[- ]?off|approval|decision|decisions)\b/i,
    tools: ["getActionItemsAndInsights", "getRFIStatus", "getSubmittalStatus"],
  },
  {
    pattern: /\b(commitments?|bought out|buyout|subcontracts?|open buyout)\b/i,
    tools: ["getCommitmentsOverview", "queryCommitments"],
  },
  {
    pattern: /\b(unbilled|billable change[- ]?order|change[- ]?order money|change[- ]?order exposure|work have we done)\b/i,
    tools: ["getChangeOrderDetails", "queryChangeOrders"],
  },
  {
    pattern:
      /\b(forecast|projection|trend|cost trend|cost trends|tracking this way|where do we land|land against|original budget)\b/i,
    tools: ["getForecastComparison", "getCostTrends"],
  },
  {
    pattern: /\b(across|portfolio|compare|comparison|cross[- ]project|active jobs?|burning budget|burn rate|budget fastest)\b/i,
    tools: ["getPortfolioOverview", "getProjectsWithRisks", "getCrossProjectComparison"],
  },
  {
    pattern: /\b(schedule|slipping|slip|delay|delayed|behind|milestone|critical path|gantt|mobilization)\b/i,
    tools: ["getScheduleAnalysis", "queryScheduleTasks"],
  },
  {
    pattern: /\bRFIs?\b/i,
    tools: ["getRFIStatus"],
  },
  {
    pattern: /\b(submittals?|shop drawings?|submittal package)\b/i,
    tools: ["getSubmittalStatus"],
  },
  {
    pattern: /\b(who|roles?|on the hook|team|people|staff|staffing|assignee|assigned)\b/i,
    tools: ["getPeopleAndRoles"],
  },
  {
    pattern: /\b(meetings?|promised|prep next|what happened|last month|last couple days)\b/i,
    tools: ["getMeetingsByDate", "getActionItemsAndInsights", "searchMeetingsByTopic"],
  },
  {
    pattern: /\b(documents?|contract document|change[- ]?order document|exhibit|attachment|file)\b/i,
    tools: ["queryDocumentRows", "searchExternalDocuments", "searchDocuments"],
  },
  {
    pattern: /\b(Teams|chat|chatter|messages?)\b/i,
    tools: ["searchTeamsMessages", "semanticSearch"],
  },
  {
    pattern: /\b(emails?|e-mails?|inbox|outlook)\b/i,
    tools: ["searchEmails", "getRecentEmails", "semanticSearch"],
  },
  {
    pattern: /\b(vendors?|subs?|subcontractors?|supplier)\b/i,
    tools: ["getVendorPerformance", "getScheduleAnalysis"],
  },
  {
    pattern: /\b(remember|memory|context.*past|past.*conversations?|what changed|last .*update|since the last)\b/i,
    tools: ["recallPastConversations", "searchMemories", "semanticSearch"],
  },
  {
    pattern: /\b(i was out|what did i miss|yesterday|last couple days)\b/i,
    tools: ["getMeetingsByDate", "searchEmails", "searchTeamsMessages"],
  },
];

function isScheduleTaskWriteRequest(message: string): boolean {
  return /\b(gantt|schedule activity|schedule task|milestone|mobilization|critical path)\b/i.test(
    message,
  );
}

function getMessageDrivenToolNames(message: string, intent: AssistantIntent): readonly string[] {
  if (intent === "task_write") {
    if (/\b(mark|close|complete|done|reschedule|reassign|push that|move that|hand that|bump|priority|snooze|cancel|delete)\b/i.test(message)) {
      return ["getMyTasks", "updateGeneratedTask", "getActionItemsAndInsights"];
    }
    return [
      isScheduleTaskWriteRequest(message) || /\btask preview\b/i.test(message)
        ? "createTask"
        : "createGeneratedTask",
    ];
  }

  const names = new Set<string>();

  for (const rule of MESSAGE_DRIVEN_TOOL_RULES) {
    if (rule.pattern.test(message)) {
      for (const toolName of rule.tools) names.add(toolName);
    }
  }

  if (intent === "source_lookup") {
    names.add("semanticSearch");
  }

  return [...names];
}

const TASK_WRITE_MAX_PROMPT_APPROX_TOKENS = 4000;
const TASK_WRITE_MAX_MODEL_TOOLS = TASK_WRITE_TOOL_NAMES.length;
const TASK_WRITE_MUTATION_TOOL_NAMES = new Set<string>([
  "createTask",
  "createGeneratedTask",
  "updateGeneratedTask",
  "deleteGeneratedTask",
]);
const LEAN_ADVISOR_INTENTS = new Set<AssistantIntent>([
  "latest_status",
  "risk_review",
  "task_followup",
]);
const LEAN_ADVISOR_MAX_BASE_PROMPT_APPROX_TOKENS = 2500;
const ALWAYS_AVAILABLE_MCP_TOOL_PREFIXES = ["mcp_excalidraw_"];
const GENERIC_MCP_SKIP_INTENTS = new Set<AssistantIntent>([
  "email_action",
  "calendar_action",
  "task_write",
  "source_lookup",
  "source_health",
  "task_followup",
  "implementation_planning",
]);

function pickTools(tools: ToolSet, names: readonly string[]): ToolSet {
  const selected: ToolSet = {};
  for (const name of names) {
    const candidate = tools[name];
    if (candidate) selected[name] = candidate;
  }
  return selected;
}

function pickMcpToolsByPrefix(tools: ToolSet, prefixes: readonly string[]): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).filter(([name]) =>
      prefixes.some((prefix) => name.startsWith(prefix)),
    ),
  ) as ToolSet;
}

function getApproxTokenCount(value: string): number {
  return Math.ceil(value.length / 4);
}

function getScopedToolsForIntent(
  tools: ToolSet,
  intent: AssistantIntent,
  messageDrivenToolNames: readonly string[] = [],
): ToolSet {
  const names = INTENT_TOOL_NAMES[intent];
  if (!names) return tools;

  const scopedTools = pickTools(tools, [...names, ...messageDrivenToolNames]);
  if (intent === "task_write" || intent === "source_lookup") {
    return scopedTools;
  }

  return {
    ...scopedTools,
    ...pickMcpToolsByPrefix(tools, ALWAYS_AVAILABLE_MCP_TOOL_PREFIXES),
  };
}

function shouldKeepModelToolsForSourceLookup(messageDrivenToolNames: readonly string[]): boolean {
  return messageDrivenToolNames.some((toolName) => toolName !== "semanticSearch");
}

function pickForcedMessageToolName(
  tools: ToolSet | undefined,
  messageDrivenToolNames: readonly string[],
): string | undefined {
  if (!tools) return undefined;
  return messageDrivenToolNames.find((toolName) => Boolean(tools[toolName]));
}

function shouldForceCalendarInviteTool(
  message: string,
  intent: AssistantIntent,
): boolean {
  if (intent !== "calendar_action") return false;
  const hasCalendarRequest =
    /\b(calendar invite|meeting invite|teams invite|calendar event|meeting)\b/i.test(message);
  const hasConfirmation =
    /\b(confirm|confirmed|create and send|send it|send now|confirmed:\s*true)\b/i.test(message);
  const hasAttendeeEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(message);
  const hasDate = /\b20\d{2}-\d{2}-\d{2}\b|\btomorrow\b|\btoday\b|\bnext\s+\w+\b/i.test(message);
  const hasTime = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b\d{1,2}:\d{2}\b/i.test(message);
  const hasDuration = /\b\d+\s*(minute|minutes|min|hour|hours)\b|from\b.+\bto\b/i.test(message);

  return (
    hasCalendarRequest &&
    hasAttendeeEmail &&
    hasDate &&
    hasTime &&
    (hasConfirmation || hasDuration)
  );
}

function assertTaskWritePromptBudget(params: {
  promptApproxTokens: number;
  modelToolCount: number;
}) {
  if (
    params.promptApproxTokens <= TASK_WRITE_MAX_PROMPT_APPROX_TOKENS &&
    params.modelToolCount <= TASK_WRITE_MAX_MODEL_TOOLS
  ) {
    return;
  }

  throw new Error(
    [
      "Task-write prompt budget exceeded before calling the AI SDK.",
      `Cause: promptApproxTokens=${params.promptApproxTokens}, modelToolCount=${params.modelToolCount}.`,
      "Detection gap: lightweight task writes previously reused the full strategist prompt/tool registry.",
      "Prevention: keep task_write on the lean prompt and scoped task tool policy.",
    ].join(" "),
  );
}

function assertLeanAdvisorBasePromptBudget(params: {
  promptApproxTokens: number;
  intent: AssistantIntent;
}) {
  if (params.promptApproxTokens <= LEAN_ADVISOR_MAX_BASE_PROMPT_APPROX_TOKENS) {
    return;
  }

  throw new Error(
    [
      "Lean advisor prompt budget exceeded before packet/source injection.",
      `Cause: intent=${params.intent}, promptApproxTokens=${params.promptApproxTokens}.`,
      "Detection gap: owner status/risk/task prompts previously reused the full strategist prompt.",
      "Prevention: keep lean advisor intents on the compact prompt and inject only retrieved evidence needed for the answer.",
    ].join(" "),
  );
}

type ExecutableTool = {
  execute?: (input: Record<string, unknown>) => Promise<unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function firstEmailFromOutput(output: unknown): Record<string, unknown> | null {
  if (!isRecord(output)) return null;
  return recordArray(output.emails)[0] ?? null;
}

function emailThreadMessagesFromOutput(output: unknown): Record<string, unknown>[] {
  return isRecord(output) ? recordArray(output.messages) : [];
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function formatRecentEmailTime(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return raw;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(parsed));
}

function scoreRecentEmailAttention(row: Record<string, unknown>, prompt: string): number {
  const subject = stringValue(row.latestSubject) ?? stringValue(row.subject) ?? "";
  const preview = stringValue(row.latestPreview) ?? stringValue(row.preview) ?? "";
  const text = `${subject} ${preview}`.toLowerCase();
  let score = 0;
  if (/\b(urgent|asap|immediate|critical|priority)\b/.test(text)) score += 6;
  if (/\b(reply|respond|response|follow up|following up|need|needs|needed|question|approval|review)\b/.test(text)) score += 4;
  if (/\b(today|tomorrow|due|deadline|waiting|blocked|issue|problem|doesn'?t align|don'?t align)\b/.test(text)) score += 3;
  if (/\b(co|change order|title commitment|quote|drawing|owner|client|survey|permit|invoice|payment)\b/.test(text)) score += 2;
  if (booleanValue(row.hasAttachments)) score += 1;
  if (/\b(urgent|important|attention|reply|respond)\b/i.test(prompt)) score += 1;
  return score;
}

function rowSenderLabel(row: Record<string, unknown>): string {
  const senders = Array.isArray(row.senders)
    ? row.senders.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  return stringValue(row.from) ?? (senders.slice(0, 3).join(", ") || "Unknown sender");
}

function rowRecipients(row: Record<string, unknown>): string[] {
  const recipients = Array.isArray(row.recipients)
    ? row.recipients.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  if (recipients.length > 0) return recipients;
  const toList = Array.isArray(row.toList)
    ? row.toList.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  return toList;
}

function rowProjectIds(row: Record<string, unknown>): number[] {
  if (Array.isArray(row.projectIds)) {
    return row.projectIds.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  }
  const projectId = numberValue(row.projectId);
  return projectId ? [projectId] : [];
}

function bestRecentEmailMessage(row: Record<string, unknown>): Record<string, unknown> | null {
  const messages = recordArray(row.messages);
  return messages[0] ?? null;
}

function truncateRecentEmailBody(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  if (normalized.length <= 4000) return normalized;
  return `${normalized.slice(0, 4000).trimEnd()}\n\n[Email body truncated for chat display. Open in Outlook for the full message.]`;
}

function inferRecentEmailAction(item: {
  subject: string;
  preview?: string | null;
  sender: string;
}): string {
  const text = `${item.subject} ${item.preview ?? ""}`.toLowerCase();
  if (/\b(final bill|invoice|payment|cash flow|check|expense)\b/.test(text)) {
    return "Reply with the billing/payment next step.";
  }
  if (/\b(availability|meeting|schedule|follow-up|follow up)\b/.test(text)) {
    return "Reply with availability or confirm the meeting path.";
  }
  if (/\b(closeout|approval|review|needed|question|waiting|urgent|asap)\b/.test(text)) {
    return "Reply with a clear owner, deadline, and next action.";
  }
  if (/\b(review your recent purchase|walmart reviews|marketplace|best buy)\b/.test(text)) {
    return "Likely low priority unless this purchase needs follow-up.";
  }
  return `Review the thread and decide whether ${item.sender} needs a reply.`;
}

function buildRecentEmailActionPrompt(params: {
  mode: "reply" | "new";
  subject: string;
  sender: string;
  receivedAt: string | null;
  graphMessageId?: string | null;
  conversationId?: string | null;
  bodyText?: string | null;
  recommendedAction: string;
}): string {
  const lines = [
    "OUTLOOK_INBOX_CARD_ACTION",
    `Mode: ${params.mode}`,
    params.mode === "reply"
      ? "Draft a short Outlook reply to this email thread."
      : "Draft a short Outlook email about this inbox item.",
    `Subject: ${params.subject}`,
    `Latest sender: ${params.sender}`,
    params.receivedAt ? `Received: ${params.receivedAt}` : null,
    params.conversationId ? `Conversation ID: ${params.conversationId}` : null,
    params.graphMessageId ? `Graph message ID: ${params.graphMessageId}` : null,
    `Recommended action: ${params.recommendedAction}`,
    params.bodyText ? `Email context:\n${params.bodyText.slice(0, 1600)}` : null,
    "Use Brandon's short, direct voice. Preview the draft first and do not send it.",
  ];
  return lines.filter(Boolean).join("\n");
}

type OutlookInboxCardAction = {
  mode: "reply" | "new";
  subject: string | null;
  sender: string | null;
  receivedAt: string | null;
  graphMessageId: string | null;
  conversationId: string | null;
  recommendedAction: string | null;
  emailContext: string | null;
};

function extractLineValue(message: string, label: string): string | null {
  const match = message.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || null;
}

function parseOutlookInboxCardAction(message: string): OutlookInboxCardAction | null {
  if (!message.includes("OUTLOOK_INBOX_CARD_ACTION")) return null;
  const modeValue = extractLineValue(message, "Mode");
  const mode = modeValue === "new" ? "new" : "reply";
  const contextMatch = message.match(/^Email context:\n([\s\S]*?)(?:\nUse Brandon's short, direct voice\.|$)/im);
  return {
    mode,
    subject: extractLineValue(message, "Subject"),
    sender: extractLineValue(message, "Latest sender"),
    receivedAt: extractLineValue(message, "Received"),
    graphMessageId: extractLineValue(message, "Graph message ID"),
    conversationId: extractLineValue(message, "Conversation ID"),
    recommendedAction: extractLineValue(message, "Recommended action"),
    emailContext: contextMatch?.[1]?.trim() || null,
  };
}

function recentEmailWidgetItem(
  row: Record<string, unknown>,
  prompt: string,
): OutlookInboxSummaryWidgetItem {
  const message = bestRecentEmailMessage(row);
  const id =
    stringValue(row.threadKey) ??
    stringValue(row.latestGraphMessageId) ??
    stringValue(row.graphMessageId) ??
    String(numberValue(row.latestId) ?? numberValue(row.id) ?? "email");
  const subject = stringValue(row.latestSubject) ?? stringValue(row.subject) ?? "(no subject)";
  const senders = Array.isArray(row.senders)
    ? row.senders.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const bodyText = truncateRecentEmailBody(stringValue(message?.bodyText) ?? stringValue(row.bodyText));
  const preview = stringValue(row.latestPreview) ?? stringValue(row.preview) ?? bodyText?.slice(0, 280);
  const sender = stringValue(message?.fromName) ??
    stringValue(row.latestFromName) ??
    stringValue(message?.fromEmail) ??
    stringValue(row.latestFromEmail) ??
    stringValue(row.from) ??
    senders[0] ??
    "Unknown sender";
  const graphMessageId = stringValue(message?.graphMessageId) ?? stringValue(row.latestGraphMessageId) ?? stringValue(row.graphMessageId) ?? null;
  const conversationId = stringValue(message?.conversationId) ?? stringValue(row.conversationId) ?? null;
  const receivedAt = stringValue(message?.receivedAt) ?? stringValue(row.latestReceivedAt) ?? stringValue(row.receivedAt) ?? null;
  const recommendedAction = inferRecentEmailAction({
    subject,
    preview,
    sender,
  });
  return {
    id,
    graphMessageId,
    conversationId,
    subject,
    fromName: stringValue(message?.fromName) ?? stringValue(row.latestFromName) ?? null,
    fromEmail: stringValue(message?.fromEmail) ?? stringValue(row.latestFromEmail) ?? stringValue(row.from) ?? null,
    senders,
    recipients: rowRecipients(row),
    receivedAt,
    messageCount: numberValue(row.messageCount) ?? 1,
    hasAttachments: booleanValue(row.hasAttachments),
    attentionScore: scoreRecentEmailAttention(row, prompt),
    preview: preview ?? null,
    bodyText: bodyText ?? null,
    webLink: stringValue(message?.webLink) ?? stringValue(row.webLink) ?? null,
    projectIds: rowProjectIds(row),
    recommendedAction,
    replyPrompt: buildRecentEmailActionPrompt({
      mode: "reply",
      subject,
      sender,
      receivedAt,
      graphMessageId,
      conversationId,
      bodyText,
      recommendedAction,
    }),
    draftPrompt: buildRecentEmailActionPrompt({
      mode: "new",
      subject,
      sender,
      receivedAt,
      graphMessageId,
      conversationId,
      bodyText,
      recommendedAction,
    }),
  };
}

function buildRecentEmailActionSummary(items: OutlookInboxSummaryWidgetItem[]): string {
  const actionable = items.filter((item) => item.attentionScore >= 4);
  if (items.length === 0) return "No email action items were found for this range.";
  if (actionable.length === 0) {
    return "Nothing looks urgent from the synced inbox, but review the top cards before ignoring them.";
  }
  return `${actionable.length} thread${actionable.length === 1 ? "" : "s"} look actionable.`;
}

function buildRecentEmailInboxWidget(params: {
  request: RecentEmailInboxRequest;
  prompt: string;
  output: Record<string, unknown>;
}): OutlookInboxSummaryWidgetPayload {
  const { request, prompt, output } = params;
  const threads = recordArray(output.threads);
  const emails = recordArray(output.emails);
  const rows = (threads.length > 0 ? threads : emails)
    .slice()
    .sort((a, b) => {
      const scoreDiff = scoreRecentEmailAttention(b, prompt) - scoreRecentEmailAttention(a, prompt);
      if (scoreDiff !== 0) return scoreDiff;
      const aTime = Date.parse(stringValue(a.latestReceivedAt) ?? stringValue(a.receivedAt) ?? "");
      const bTime = Date.parse(stringValue(b.latestReceivedAt) ?? stringValue(b.receivedAt) ?? "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  const count = numberValue(output.count) ?? emails.length;
  const threadCount = numberValue(output.threadCount) ?? (threads.length > 0 ? threads.length : null);
  const wantsTriage = /\b(important|urgent|priority|attention|reply|respond|follow[- ]?up)\b/i.test(prompt);
  const limit = /\b(last five|last 5)\b/i.test(prompt) ? 5 : Math.min(rows.length, 8);
  const rangeLabel = request.daysBack === 0
    ? "Today"
    : request.daysBack === 1
      ? "Last day"
      : `Last ${request.daysBack} days`;

  const items = rows.slice(0, limit).map((row) => recentEmailWidgetItem(row, prompt));

  return {
    type: "outlook_inbox_summary",
    id: "recent-email-inbox",
    title: wantsTriage ? "Important Outlook emails" : "Recent Outlook emails",
    subtitle: wantsTriage
      ? "Ranked by likely action needed, with the actual message text shown in readable cards."
      : "Structured Outlook intake results with readable message previews.",
    dateLabel: rangeLabel,
    summary: stringValue(output.summary) ?? `Found ${count} received email${count === 1 ? "" : "s"}.`,
    dataCutoffNote: stringValue(output.dataCutoffNote) ?? null,
    mailbox: isRecord(output.appliedFilter) ? stringValue(output.appliedFilter.email) ?? null : null,
    totalCount: count,
    threadCount,
    actionSummary: buildRecentEmailActionSummary(items),
    items,
    emptyState: rows.length === 0 ? "No Outlook emails matched this request." : undefined,
  };
}

function formatRecentEmailInboxText(params: {
  request: RecentEmailInboxRequest;
  output: Record<string, unknown>;
  widget: OutlookInboxSummaryWidgetPayload;
}): string {
  const { output, widget } = params;
  const cutoff = stringValue(output.dataCutoffNote);
  const mailbox = widget.mailbox ? ` for ${widget.mailbox}` : "";
  const rangeLabel = widget.dateLabel.toLowerCase();
  return [
    `I found ${widget.totalCount} email${widget.totalCount === 1 ? "" : "s"}${widget.threadCount ? ` across ${widget.threadCount} thread${widget.threadCount === 1 ? "" : "s"}` : ""} received ${rangeLabel}${mailbox}. ${widget.actionSummary}`,
    cutoff,
    widget.items.length === 0 ? widget.emptyState : null,
  ].filter(Boolean).join("\n\n");
}

function formatRecentEmailInboxAnswer(params: {
  request: RecentEmailInboxRequest;
  prompt: string;
  output: unknown;
}): string {
  const { request, prompt, output } = params;
  const rangeLabel = request.daysBack === 0
    ? "today / this morning"
    : request.daysBack === 1
      ? "the last day"
      : `the last ${request.daysBack} days`;

  if (!isRecord(output)) {
    return [
      `I checked Outlook email intake for your inbox for ${rangeLabel}, but the result came back in an unexpected shape.`,
      "Cause: the structured Outlook tool returned a non-object response.",
      "Detection gap: this inbox wording previously could fall through to semantic retrieval instead of failing loudly.",
      "Prevention: this request is now routed through getRecentEmails before any source-search fallback.",
    ].join("\n");
  }

  const error = stringValue(output.error);
  if (error) {
    return [
      `I checked Outlook email intake for your inbox for ${rangeLabel}, but the structured inbox lookup failed.`,
      `Error: ${error}`,
      "This inbox/date/triage wording is routed through getRecentEmails so failures surface directly.",
    ].join("\n");
  }

  const summary = stringValue(output.summary);
  const cutoff = stringValue(output.dataCutoffNote);
  const threads = recordArray(output.threads);
  const emails = recordArray(output.emails);
  const rows = (threads.length > 0 ? threads : emails)
    .slice()
    .sort((a, b) => {
      const scoreDiff = scoreRecentEmailAttention(b, prompt) - scoreRecentEmailAttention(a, prompt);
      if (scoreDiff !== 0) return scoreDiff;
      const aTime = Date.parse(stringValue(a.latestReceivedAt) ?? stringValue(a.receivedAt) ?? "");
      const bTime = Date.parse(stringValue(b.latestReceivedAt) ?? stringValue(b.receivedAt) ?? "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });

  const count = numberValue(output.count) ?? emails.length;
  if (rows.length === 0) {
    return [
      `I checked Outlook email intake for your inbox for ${rangeLabel}.`,
      summary ?? `No emails were returned for ${rangeLabel}.`,
      cutoff ? `Data freshness: ${cutoff}` : null,
      "This answer came from synced structured Outlook intake via getRecentEmails.",
    ].filter(Boolean).join("\n");
  }

  const wantsTriage = /\b(important|urgent|priority|attention|reply|respond|follow[- ]?up)\b/i.test(prompt);
  const heading = wantsTriage
    ? "Items that look most important or need attention:"
    : "Most recent inbox items:";
  const limit = /\b(last five|last 5)\b/i.test(prompt) ? 5 : Math.min(rows.length, 8);

  const lines = rows.slice(0, limit).map((row, index) => {
    const subject = stringValue(row.latestSubject) ?? stringValue(row.subject) ?? "(no subject)";
    const receivedAt = formatRecentEmailTime(row.latestReceivedAt) ?? formatRecentEmailTime(row.receivedAt);
    const messageCount = numberValue(row.messageCount);
    const preview = stringValue(row.latestPreview) ?? stringValue(row.preview);
    const tags = [
      messageCount && messageCount > 1 ? `${messageCount} messages` : null,
      booleanValue(row.hasAttachments) ? "attachment" : null,
    ].filter(Boolean).join(", ");
    return [
      `${index + 1}. ${subject}`,
      `   From: ${rowSenderLabel(row)}${receivedAt ? ` | Received: ${receivedAt}` : ""}${tags ? ` | ${tags}` : ""}`,
      preview ? `   Why it may matter: ${preview.slice(0, 220)}` : null,
    ].filter(Boolean).join("\n");
  });

  return [
    `I checked Outlook email intake for your inbox for ${rangeLabel}.`,
    summary ?? `Found ${count} received email${count === 1 ? "" : "s"}.`,
    cutoff ? `Data freshness: ${cutoff}` : null,
    "",
    heading,
    ...lines,
    "",
    "This answer came from synced structured Outlook intake via getRecentEmails.",
  ].filter(Boolean).join("\n");
}

function isEmailDraftWorkflowRequest(message: string): boolean {
  return message.includes("OUTLOOK_INBOX_CARD_ACTION") ||
    /\b(draft|write|prepare|compose)\b/i.test(message) &&
    /\b(reply|response|respond|email|outlook)\b/i.test(message);
}

function inferEmailActionQuery(message: string): string | undefined {
  if (/\bupdate\b/i.test(message)) return "update";
  if (/\burgent\b/i.test(message)) return "urgent";
  if (/\bproposal\b/i.test(message)) return "proposal";
  return undefined;
}

function replySubject(subject: string | null): string {
  const fallback = "Re: Update";
  if (!subject) return fallback;
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function formatThreadForDraft(messages: Record<string, unknown>[]): string {
  return messages
    .slice(-6)
    .map((message) => {
      const fromName = stringValue(message.fromName) ?? stringValue(message.fromEmail) ?? "Unknown sender";
      const receivedAt = stringValue(message.receivedAt) ?? "unknown date";
      const preview = stringValue(message.preview) ?? "";
      return `From: ${fromName}\nReceived: ${receivedAt}\n${preview}`;
    })
    .join("\n\n---\n\n");
}

async function resolveCalendarAttendeeEmailByName(name: string | undefined): Promise<string | null> {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length < 2) return null;

  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("people")
    .select("first_name,last_name,email,status,company")
    .ilike("first_name", firstName)
    .ilike("last_name", lastName)
    .not("email", "is", null)
    .limit(10);

  if (error) return null;

  const candidates = (data ?? [])
    .filter((person) => typeof person.email === "string" && person.email.includes("@"))
    .sort((a, b) => {
      const aAlleato = /@alleatogroup\.com$/i.test(a.email ?? "") ? 1 : 0;
      const bAlleato = /@alleatogroup\.com$/i.test(b.email ?? "") ? 1 : 0;
      if (aAlleato !== bAlleato) return bAlleato - aAlleato;
      const aActive = String(a.status ?? "").toLowerCase() === "active" ? 1 : 0;
      const bActive = String(b.status ?? "").toLowerCase() === "active" ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      const aCompany = String(a.company ?? "").toLowerCase().includes("alleato") ? 1 : 0;
      const bCompany = String(b.company ?? "").toLowerCase().includes("alleato") ? 1 : 0;
      return bCompany - aCompany;
    });

  return candidates[0]?.email?.trim().toLowerCase() ?? null;
}

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

type ProjectLocationRecord = {
  id: number;
  name: string | null;
  project_number: string | null;
  acumatica_project_id: string | null;
  address: string | null;
  state: string | null;
  phase: string | null;
  aliases: string[] | null;
};

type ProjectLocationAnswer = {
  content: string;
  traceOutput: Record<string, unknown>;
  project: ProjectLocationRecord;
  projectId?: number;
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

function formatSyncedOperatingPacketContext(packet: {
  packetJson: Record<string, unknown>;
  sourceCoverage: Record<string, unknown>;
}): string | null {
  if (packet.packetJson.schema !== "project_operating_packet_v1") {
    return null;
  }

  const summary = packet.packetJson.summary;
  const sourceSet = packet.packetJson.sourceSet;
  const coverage = Array.isArray(packet.sourceCoverage.categoryCoverage)
    ? packet.sourceCoverage.categoryCoverage
    : [];

  return [
    "# Synced Project Operating Summary",
    "This was generated by the backend operating-summary refresh and persisted into the current intelligence packet.",
    "",
    "Summary:",
    JSON.stringify(summary ?? {}, null, 2),
    "",
    "Source coverage:",
    JSON.stringify(
      {
        operatingSummaryGeneratedAt: packet.sourceCoverage.operatingSummaryGeneratedAt,
        operatingSummarySourceCount: packet.sourceCoverage.operatingSummarySourceCount,
        operatingSummarySelectedSourceCount: packet.sourceCoverage.operatingSummarySelectedSourceCount,
        latestSourceAt: packet.sourceCoverage.latestSourceAt,
        linkedEvidenceCount: packet.sourceCoverage.linkedEvidenceCount,
        categoryCoverage: coverage,
        gaps: packet.sourceCoverage.gaps,
      },
      null,
      2,
    ),
    "",
    "Source set:",
    JSON.stringify(sourceSet ?? {}, null, 2),
  ].join("\n");
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

type GeneratedTaskSummaryItem = TaskSummaryWidgetPayload["items"][number];

type GeneratedTaskSummaryAnswer = {
  content: string;
  widget: TaskSummaryWidgetPayload;
  traceOutput: Record<string, unknown>;
};

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
  dateString: string;
  startIso: string;
  endIso: string;
  label: string;
} {
  const dateString = getEasternDateString(date);
  const nextDateString = addUtcDays(dateString, 1);
  const startOffset = getEasternOffset(new Date(`${dateString}T12:00:00Z`));
  const endOffset = getEasternOffset(new Date(`${nextDateString}T12:00:00Z`));
  return {
    dateString,
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
  const allItems = params.rows.map((row): GeneratedTaskSummaryItem => {
    const metadata = asRecord(row.document_metadata);
    const project = asRecord(row.projects);
    const id = asString(row.id) ?? crypto.randomUUID();
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

function isMeetingSourceSpecificRequest(request: SourceSpecificRagRequest): boolean {
  return request.kind === "meetings_on_date" || request.kind === "recent_meetings";
}

function snippetFromContent(content?: string | null, maxLength = 220): string | null {
  const normalized = content?.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const firstSentence = normalized.match(/^(.+?[.!?])\s/)?.[1] ?? normalized;
  return firstSentence.length > maxLength ? `${firstSentence.slice(0, maxLength).trim()}...` : firstSentence;
}

function extractMeetingSignals(content: string | null, terms: RegExp, limit: number): string[] {
  if (!content) return [];
  const sentences = content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const matches = sentences.filter((sentence) => terms.test(sentence));
  return [...new Set(matches)].slice(0, limit);
}

function buildMeetingHref(row: SourceSpecificRagRow): string {
  return row.project_id ? `/${row.project_id}/meetings/${row.id}` : `/meetings/${row.id}`;
}

function buildMeetingInsightsWidget(params: {
  request: SourceSpecificRagRequest;
  rows: SourceSpecificRagRow[];
}): MeetingInsightsWidgetPayload | null {
  if (!isMeetingSourceSpecificRequest(params.request)) return null;

  type MeetingInsight = MeetingInsightsWidgetPayload["decisions"][number];
  const rows = params.rows.slice(0, params.request.limit);

  function insightFromSignal(
    row: SourceSpecificRagRow,
    signal: string,
    index: number,
  ): MeetingInsight {
    return {
      id: `${row.id}-${index}`,
      title: signal.slice(0, 140),
      detail: snippetFromContent(row.content, 180) ?? undefined,
      sourceTitle: row.title?.trim() || "Untitled meeting",
      sourceHref: buildMeetingHref(row),
      confidence: "medium",
    };
  }

  const decisions: MeetingInsight[] = [];
  const promises: MeetingInsight[] = [];
  const risks: MeetingInsight[] = [];
  const unresolvedQuestions: MeetingInsight[] = [];

  rows.forEach((row) => {
    extractMeetingSignals(
      row.content,
      /\b(decided|decision|approved|rejected|agreed|confirmed|selected)\b/i,
      3,
    ).forEach((signal, index) => decisions.push(insightFromSignal(row, signal, index)));

    extractMeetingSignals(
      row.content,
      /\b(action item|follow up|follow-up|needs to|must|assigned|owner|due|by friday|by monday)\b/i,
      3,
    ).forEach((signal, index) => promises.push(insightFromSignal(row, signal, index)));

    extractMeetingSignals(
      row.content,
      /\b(risk|critical|blocked|delay|delayed|issue|concern|exposure|problem|missing|late|overdue)\b/i,
      3,
    ).forEach((signal, index) => risks.push(insightFromSignal(row, signal, index)));

    extractMeetingSignals(
      row.content,
      /\b(question|unclear|unknown|confirm|verify|waiting|need answer|need clarification)\b/i,
      3,
    ).forEach((signal, index) => unresolvedQuestions.push(insightFromSignal(row, signal, index)));
  });

  const suggestedTasks: OwnerActionItem[] = promises.slice(0, 6).map((promise, index) => ({
    id: `meeting-task-${index + 1}`,
    title: promise.title,
    description: promise.detail,
    projectId: rows[index]?.project_id ?? null,
    projectName: null,
    ownerName: promise.ownerName ?? "Project Manager",
    priority: risks.length > 0 ? "high" : "normal",
    sourceType: "meeting",
    sourceTitle: promise.sourceTitle,
    href: promise.sourceHref ?? undefined,
    recommendedAction: "create_task",
    confidence: promise.confidence,
  }));

  const sources = rows.slice(0, 8).map((row, index) => ({
    id: `meeting-source-${index + 1}`,
    title: row.title?.trim() || "Untitled meeting",
    sourceType: "meeting" as const,
    date: row.date ?? row.created_at ?? undefined,
    snippet: snippetFromContent(row.content, 180) ?? undefined,
    href: buildMeetingHref(row),
    confidence: "medium" as const,
  }));

  return {
    type: "meeting_insights",
    id: "meeting-insights",
    title:
      params.request.kind === "meetings_on_date"
        ? `Meeting insights: ${params.request.date}`
        : "Recent meeting insights",
    subtitle: "Decisions, promises, risks, questions, and suggested follow-ups from meeting retrieval.",
    dateLabel:
      params.request.kind === "meetings_on_date" && params.request.date
        ? params.request.date
        : "Last 60 days",
    projectId: rows.find((row) => row.project_id)?.project_id ?? null,
    projectName: null,
    metrics: {
      meetingCount: rows.length,
      decisionCount: decisions.length,
      actionItemCount: promises.length,
      riskCount: risks.length,
      unresolvedQuestionCount: unresolvedQuestions.length,
    },
    decisions,
    promises,
    risks,
    unresolvedQuestions,
    suggestedTasks,
    sources,
  };
}

async function loadGeneratedTasksTodayAnswer(params: {
  supabase: ReturnType<typeof createServiceClient>;
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
    | "actions"
    | "synthesis"
    | "complete"
    | "fallback";
  message: string;
  status: "loading" | "success" | "warning" | "error";
  timestamp: string;
};

type PersistedDataPart = {
  type: `data-${string}`;
  id?: string;
  data: unknown;
};


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
          const actions = Array.isArray(record.actionItems)
            ? record.actionItems.map(String).filter(Boolean).slice(0, 2)
            : [];
          const bullets = Array.isArray(record.bulletPoints)
            ? record.bulletPoints.map(String).filter(Boolean).slice(0, 2)
            : [];
          const topics = Array.isArray(record.topicsDiscussed)
            ? record.topicsDiscussed.map(String).filter(Boolean).slice(0, 3)
            : [];
          const movementText = String(
            record.summary ?? record.notes ?? record.title ?? "Recent project movement found.",
          ).slice(0, 260);
          const followOn = [
            actions.length ? `Actions: ${actions.join("; ")}` : null,
            bullets.length && actions.length === 0 ? `Notes: ${bullets.join("; ")}` : null,
            topics.length ? `Topics: ${topics.join(", ")}` : null,
          ].filter(Boolean).join(" ");
          return `- ${String(record.date ?? "undated")}: ${movementText}${followOn ? ` ${followOn}` : ""} ${String(record.sourceRef ?? "")}`.trim();
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

function isOwnerSnapshotWidgetRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "owner snapshot",
    "project snapshot",
    "snapshot for project",
    "what should brandon look at first",
    "show risks, money, meetings, and owner actions",
  ].some((phrase) => normalized.includes(phrase));
}

function extractProjectIdFromMessage(message: string): number | undefined {
  const match = message.match(/\bproject\s*(?:id|#)?\s*:?\s*(\d{1,8})\b/i);
  if (!match) return undefined;
  const projectId = Number(match[1]);
  return Number.isFinite(projectId) ? projectId : undefined;
}

function buildProjectPickerWidget(
  output: unknown,
  options: {
    id: string;
    title: string;
    subtitle: string;
    intent: ProjectPickerWidgetPayload["intent"];
    emptyState: string;
    promptForProject: (project: { projectId: number; name: string }) => string;
  },
): ProjectPickerWidgetPayload | null {
  const record = asRecord(output);
  const rawProjects = Array.isArray(record.projects) ? record.projects : [];
  const projects = rawProjects
    .map((item) => {
      const project = asRecord(item);
      const projectId = typeof project.id === "number" ? project.id : Number(project.id);
      const name = typeof project.name === "string" ? project.name : null;
      if (!Number.isFinite(projectId) || !name) return null;
      const contractValue = readNestedNumber(project, ["totalContractValue"]);
      const meetingCount = readNestedNumber(project, ["meetingCount"]);
      const openCriticalItems = readNestedNumber(project, ["openCriticalItems"]);
      return {
        projectId,
        name,
        client: typeof project.client === "string" ? project.client : null,
        phase: typeof project.phase === "string" ? project.phase : null,
        state: typeof project.state === "string" ? project.state : null,
        summary: typeof project.summary === "string" ? project.summary.slice(0, 220) : null,
        contractValue: contractValue > 0 ? currency(contractValue) : null,
        meetingCount: meetingCount > 0 ? meetingCount : null,
        openCriticalItems: openCriticalItems > 0 ? openCriticalItems : null,
        healthStatus: typeof project.healthStatus === "string" ? project.healthStatus : null,
        prompt: options.promptForProject({ projectId, name }),
      };
    })
    .filter((project): project is NonNullable<typeof project> => Boolean(project))
    .slice(0, 8);

  return {
    type: "project_picker",
    id: options.id,
    title: options.title,
    subtitle: options.subtitle,
    intent: options.intent,
    projects,
    emptyState: options.emptyState,
  };
}

async function loadOwnerSnapshotProjectPicker(params: {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  selectedProjectId?: number | null;
}): Promise<{
  widget: ProjectPickerWidgetPayload | null;
  content: string;
  traceOutput: Record<string, unknown>;
}> {
  const guardrails = createToolGuardrails(params.userId, {
    pinnedProjectId: params.selectedProjectId ?? undefined,
  });
  const scopedProjectIds = await guardrails.getScopedProjectIds();
  if (scopedProjectIds.length === 0) {
    return {
      widget: null,
      content:
        "No accessible projects were found for your account. Ask an admin to assign you to at least one project.",
      traceOutput: { error: "no accessible projects" },
    };
  }

  async function fetchProjects(phase?: string) {
    let query = params.supabase
      .from("projects")
      .select("id, name, client, phase, state, summary, health_status")
      .eq("archived", false)
      .in("id", scopedProjectIds)
      .order("name", { ascending: true })
      .limit(8);
    if (phase) query = query.eq("phase", phase);
    return query;
  }

  let { data: projects, error } = await fetchProjects("Current");
  if (!error && (!projects || projects.length === 0)) {
    const fallback = await fetchProjects();
    projects = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return {
      widget: null,
      content: "I could not load project choices for the owner snapshot picker.",
      traceOutput: { error: error.message },
    };
  }

  const widget = buildProjectPickerWidget(
    { projects: projects ?? [] },
    {
      id: "owner-snapshot-project-picker",
      title: "Choose a project",
      subtitle: "Pick the project to generate a source-backed owner snapshot.",
      intent: "owner_snapshot",
      emptyState: "No accessible current projects were available for this account.",
      promptForProject: ({ projectId, name }) => `Give me the owner snapshot for project ${projectId}: ${name}.`,
    },
  );
  return {
    widget,
    content: widget?.projects.length
      ? "Choose a project below and I will generate the owner snapshot."
      : "I could not find accessible current projects to show in the picker.",
    traceOutput: {
      projectCount: widget?.projects.length ?? 0,
      source: "projects",
    },
  };
}

async function loadOwnerActionQueueProjectPicker(params: {
  supabase: ReturnType<typeof createServiceClient>;
  userId: string;
  selectedProjectId?: number | null;
}): Promise<{
  widget: ProjectPickerWidgetPayload | null;
  content: string;
  traceOutput: Record<string, unknown>;
}> {
  const picker = await loadOwnerSnapshotProjectPicker(params);
  const widget = picker.widget
    ? {
        ...picker.widget,
        id: "owner-action-queue-project-picker",
        subtitle: "Pick the project to generate a source-backed owner action queue.",
        intent: "owner_action_queue" as const,
        projects: picker.widget.projects.map((project) => ({
          ...project,
          prompt: `What needs my attention for project ${project.projectId}: ${project.name}?`,
        })),
      }
    : null;

  return {
    widget,
    content: widget?.projects.length
      ? "Choose a project below and I will generate the owner action queue."
      : picker.content,
    traceOutput: {
      ...picker.traceOutput,
      intent: "owner_action_queue",
      projectCount: widget?.projects.length ?? 0,
    },
  };
}

function isOwnerActionQueueWidgetRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "what needs my attention",
    "owner action queue",
    "owner-blocked",
    "owner blocked",
    "show owner tasks",
    "show owner-blocked items",
    "what should brandon do today",
    "show meeting follow-ups",
  ].some((phrase) => normalized.includes(phrase));
}

function statusFromSnapshot(snapshot: ProjectBriefingSnapshot): OwnerSnapshotWidgetPayload["status"] {
  const project = readSnapshotObject(snapshot, "project");
  const hardFacts = readSnapshotObject(snapshot, "hardFacts");
  const budget = readSnapshotObject(hardFacts, "budget");
  const rfis = readSnapshotObject(hardFacts, "rfis");
  const submittals = readSnapshotObject(hardFacts, "submittals");
  const schedule = readSnapshotObject(hardFacts, "schedule");
  const healthStatus = String(project?.healthStatus ?? "").toLowerCase();

  if (
    healthStatus.includes("critical") ||
    healthStatus.includes("red") ||
    readNestedNumber(rfis, ["overdueCount"]) > 0 ||
    readNestedNumber(submittals, ["overdueCount"]) > 0 ||
    readNestedNumber(schedule, ["overdueCount"]) > 0
  ) {
    return "critical";
  }

  if (
    healthStatus.includes("watch") ||
    healthStatus.includes("risk") ||
    String(budget?.status ?? "").toLowerCase().includes("over") ||
    readNestedNumber(hardFacts, ["changeOrders", "pendingCount"]) > 0 ||
    readNestedNumber(hardFacts, ["changeEvents", "openCount"]) > 0
  ) {
    return "watch";
  }

  if (healthStatus.includes("track") || healthStatus.includes("green")) {
    return "on_track";
  }

  return "unknown";
}

function sourceEvidenceType(value: unknown): SourceEvidenceItem["sourceType"] {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("meeting")) return "meeting";
  if (normalized.includes("email") || normalized.includes("outlook")) return "email";
  if (normalized.includes("team")) return "teams";
  if (normalized.includes("account")) return "accounting";
  if (normalized.includes("knowledge")) return "knowledge";
  if (normalized.includes("project")) return "project_record";
  return "document";
}

function buildOwnerActionsFromSnapshot(snapshot: ProjectBriefingSnapshot): OwnerActionItem[] {
  const hardFacts = readSnapshotObject(snapshot, "hardFacts");
  const project = readSnapshotObject(snapshot, "project");
  const projectId = typeof project?.id === "number" ? project.id : null;
  const projectName = typeof project?.name === "string" ? project.name : null;
  const actions: OwnerActionItem[] = [];
  const overdueTasks = readNestedNumber(hardFacts, ["schedule", "overdueCount"]);
  const overdueRfis = readNestedNumber(hardFacts, ["rfis", "overdueCount"]);
  const pendingCos = readNestedNumber(hardFacts, ["changeOrders", "pendingCount"]);
  const openCes = readNestedNumber(hardFacts, ["changeEvents", "openCount"]);
  const unexecutedCommitments = readNestedNumber(hardFacts, ["commitments", "unexecutedCount"]);

  if (overdueTasks > 0 || overdueRfis > 0) {
    actions.push({
      id: "recovery-huddle",
      title: "Run PM recovery huddle",
      description: `${overdueTasks} overdue schedule task(s), ${overdueRfis} overdue RFI(s).`,
      projectId,
      projectName,
      ownerName: "Project Manager",
      priority: "critical",
      sourceType: "task",
      sourceTitle: "Project controls",
      recommendedAction: "create_task",
      confidence: "high",
    });
  }

  if (pendingCos > 0 || openCes > 0) {
    actions.push({
      id: "change-exposure-log",
      title: "Create change exposure decision log",
      description: `${pendingCos} pending change order(s), ${openCes} open change event(s).`,
      projectId,
      projectName,
      ownerName: "PM + Cost Lead",
      priority: "high",
      sourceType: "change_event",
      sourceTitle: "Change management records",
      recommendedAction: "create_change_event",
      confidence: "high",
    });
  }

  if (unexecutedCommitments > 0) {
    actions.push({
      id: "commitment-release-review",
      title: "Review unexecuted commitments",
      description: `${unexecutedCommitments} commitment(s) are not executed.`,
      projectId,
      projectName,
      ownerName: "PM + Procurement Lead",
      priority: "high",
      sourceType: "risk",
      sourceTitle: "Commitments",
      recommendedAction: "review",
      confidence: "high",
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "baseline-confirmation",
      title: "Confirm current owner baseline",
      description: "Confirm budget, top risks, and next owner decision before the next briefing.",
      projectId,
      projectName,
      ownerName: "Project Manager",
      priority: "normal",
      sourceType: "risk",
      sourceTitle: "Project briefing snapshot",
      recommendedAction: "review",
      confidence: "medium",
    });
  }

  return actions;
}

function groupOwnerActions(
  actions: OwnerActionItem[],
): OwnerActionQueueWidgetPayload["groups"] {
  const groups: OwnerActionQueueWidgetPayload["groups"] = [
    {
      id: "now",
      title: "Now",
      priority: "now",
      items: actions.filter((action) => action.priority === "critical" || action.priority === "high"),
    },
    {
      id: "next",
      title: "Next",
      priority: "next",
      items: actions.filter((action) => action.priority === "normal"),
    },
    {
      id: "watch",
      title: "Watch",
      priority: "watch",
      items: actions.filter((action) => action.priority === "low"),
    },
  ];

  return groups.filter((group) => group.items.length > 0);
}

function buildOwnerActionQueueWidget(
  snapshot: ProjectBriefingSnapshot,
): OwnerActionQueueWidgetPayload | null {
  const project = readSnapshotObject(snapshot, "project");
  const projectId = typeof project?.id === "number" ? project.id : null;
  const projectName = typeof project?.name === "string" ? project.name : null;
  if (!projectId || !projectName) return null;

  const actions = buildOwnerActionsFromSnapshot(snapshot);
  return {
    type: "owner_action_queue",
    id: `owner-action-queue-${projectId}`,
    title: `Owner action queue: ${projectName}`,
    subtitle: "Source-backed owner actions from project controls and briefing snapshot signals.",
    totalCount: actions.length,
    groups: groupOwnerActions(actions),
    emptyState: "No owner actions matched this project snapshot.",
  };
}

function buildOwnerSnapshotWidget(snapshot: ProjectBriefingSnapshot): OwnerSnapshotWidgetPayload | null {
  const project = readSnapshotObject(snapshot, "project");
  const hardFacts = readSnapshotObject(snapshot, "hardFacts");
  const projectId = typeof project?.id === "number" ? project.id : null;
  const projectName = typeof project?.name === "string" ? project.name : null;
  if (!projectId || !projectName) return null;

  const budget = readSnapshotObject(hardFacts, "budget");
  const contract = readSnapshotObject(hardFacts, "contract");
  const schedule = readSnapshotObject(hardFacts, "schedule");
  const risks = readSnapshotArray(snapshot, "riskSignals").map(String).filter(Boolean);
  const dataGaps = readSnapshotArray(snapshot, "dataGaps").map(String).filter(Boolean);
  const recentMovement = readSnapshotArray(snapshot, "recentMovement")
    .map((item, index) => {
      const record = asRecord(item);
      return {
        label: String(record.title ?? record.summary ?? `Recent movement ${index + 1}`).slice(0, 140),
        sourceType: sourceEvidenceType(record.sourceType),
        date: typeof record.date === "string" ? record.date : undefined,
        href: typeof record.sourceUrl === "string" ? record.sourceUrl : undefined,
      };
    })
    .slice(0, 6);

  const sources: SourceEvidenceItem[] = recentMovement.map((item, index) => ({
    id: `source-${index + 1}`,
    title: item.label,
    sourceType: item.sourceType,
    date: item.date,
    href: item.href,
    confidence: "medium",
  }));

  const pendingCos = readNestedNumber(hardFacts, ["changeOrders", "pendingCount"]);
  const openCes = readNestedNumber(hardFacts, ["changeEvents", "openCount"]);
  const overdueRfis = readNestedNumber(hardFacts, ["rfis", "overdueCount"]);
  const overdueTasks = readNestedNumber(schedule, ["overdueCount"]);
  const scheduleUnavailable = dataGaps.some((gap) => gap.includes("No schedule/Gantt rows"));
  const status = statusFromSnapshot(snapshot);

  return {
    type: "owner_snapshot",
    id: `owner-snapshot-${projectId}`,
    title: `Owner snapshot: ${projectName}`,
    projectId,
    projectName,
    status,
    asOf: new Date().toISOString(),
    summary:
      risks[0] ??
      buildSnapshotNextStep(snapshot).replace(/^Next step:\s*/i, "") ??
      "Project controls were checked for owner-facing risks, money movement, and action items.",
    healthSignals: [
      {
        label: "Status",
        value: status.replaceAll("_", " "),
        status: status === "critical" ? "critical" : status === "watch" ? "watch" : "neutral",
      },
      {
        label: "Pending COs",
        value: String(pendingCos),
        status: pendingCos > 0 ? "watch" : "neutral",
      },
      {
        label: "Open CEs",
        value: String(openCes),
        status: openCes > 0 ? "watch" : "neutral",
      },
      {
        label: "Overdue RFIs",
        value: String(overdueRfis),
        status: overdueRfis > 0 ? "critical" : "neutral",
      },
      {
        label: "Overdue Tasks",
        value: scheduleUnavailable ? "unavailable" : String(overdueTasks),
        status: scheduleUnavailable ? "watch" : overdueTasks > 0 ? "critical" : "neutral",
      },
    ],
    money: {
      contractValue: currency(readNestedNumber(contract, ["revisedContractValue"])),
      committed: undefined,
      exposure: pendingCos > 0 ? `${pendingCos} pending change order(s)` : undefined,
      unbilledChanges: currency(readNestedNumber(contract, ["pendingContractChanges"])),
      marginSignal: String(budget?.status ?? "unknown"),
    },
    schedule: {
      status: scheduleUnavailable ? "unknown" : overdueTasks > 0 ? "critical" : "unknown",
      blockers: scheduleUnavailable
        ? ["Schedule/Gantt rows are unavailable for this project."]
        : overdueTasks > 0
          ? [`${overdueTasks} overdue schedule task(s)`]
          : [],
      upcomingMilestones: readSnapshotArray(schedule, "upcomingMilestones")
        .map((item) => String(asRecord(item).name ?? "Upcoming milestone"))
        .slice(0, 5),
    },
    risks: risks.slice(0, 5).map((risk, index) => ({
      id: `risk-${index + 1}`,
      title: risk,
      severity: index === 0 && status === "critical" ? "critical" : "high",
      reason: risk,
    })),
    ownerActions: buildOwnerActionsFromSnapshot(snapshot),
    recentMovement,
    dataGaps,
    sources,
  };
}

async function loadOwnerSnapshotWidget(params: {
  tools: ToolSet;
  selectedProjectId?: number;
}): Promise<{
  snapshot: ProjectBriefingSnapshot | null;
  widget: OwnerSnapshotWidgetPayload | null;
  content: string;
  traceOutput: Record<string, unknown>;
}> {
  const executable = params.tools.getProjectBriefingSnapshot as ExecutableTool | undefined;
  if (!executable?.execute) {
    return {
      snapshot: null,
      widget: null,
      content: "I could not load the project snapshot tool, so I cannot render an owner snapshot widget yet.",
      traceOutput: { error: "getProjectBriefingSnapshot execute function missing" },
    };
  }

  const output = await executable.execute(
    params.selectedProjectId ? { projectId: params.selectedProjectId } : {},
  );
  const record = asRecord(output);
  if (typeof record.error === "string") {
    return {
      snapshot: null,
      widget: null,
      content: record.error,
      traceOutput: { error: record.error },
    };
  }

  const widget = buildOwnerSnapshotWidget(record);
  const project = readSnapshotObject(record, "project");
  const projectName = typeof project?.name === "string" ? project.name : "the selected project";
  const content = widget
    ? [
        `I built an owner snapshot for ${projectName}.`,
        "",
        `Start with: ${widget.summary}`,
        "",
        `Next: ${buildSnapshotNextStep(record).replace(/^Next step:\s*/i, "")}`,
      ].join("\n")
    : "I found project snapshot data, but it was missing the project identity needed to render the owner widget.";

  return {
    snapshot: record,
    widget,
    content,
    traceOutput: {
      projectId: project?.id ?? null,
      projectName,
      widgetBuilt: Boolean(widget),
      riskCount: widget?.risks.length ?? 0,
      actionCount: widget?.ownerActions.length ?? 0,
      dataGapCount: widget?.dataGaps.length ?? 0,
    },
  };
}

async function loadOwnerActionQueueWidget(params: {
  tools: ToolSet;
  selectedProjectId?: number;
}): Promise<{
  snapshot: ProjectBriefingSnapshot | null;
  widget: OwnerActionQueueWidgetPayload | null;
  content: string;
  traceOutput: Record<string, unknown>;
}> {
  const executable = params.tools.getProjectBriefingSnapshot as ExecutableTool | undefined;
  if (!executable?.execute) {
    return {
      snapshot: null,
      widget: null,
      content: "I could not load the project snapshot tool, so I cannot render an owner action queue yet.",
      traceOutput: { error: "getProjectBriefingSnapshot execute function missing" },
    };
  }

  const output = await executable.execute(
    params.selectedProjectId ? { projectId: params.selectedProjectId } : {},
  );
  const record = asRecord(output);
  if (typeof record.error === "string") {
    return {
      snapshot: null,
      widget: null,
      content: record.error,
      traceOutput: { error: record.error },
    };
  }

  const widget = buildOwnerActionQueueWidget(record);
  const project = readSnapshotObject(record, "project");
  const projectName = typeof project?.name === "string" ? project.name : "the selected project";
  const topAction = widget?.groups[0]?.items[0]?.title;
  const content = widget
    ? [
        `I built an owner action queue for ${projectName}.`,
        "",
        topAction ? `Start with: ${topAction}` : "No immediate owner action was found.",
      ].join("\n")
    : "I found project snapshot data, but it was missing the project identity needed to render the owner action queue.";

  return {
    snapshot: record,
    widget,
    content,
    traceOutput: {
      projectId: project?.id ?? null,
      projectName,
      widgetBuilt: Boolean(widget),
      actionCount: widget?.totalCount ?? 0,
      groupCount: widget?.groups.length ?? 0,
    },
  };
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

// SourceSpecificRagKind, SourceSpecificRagRequest, and detectSourceSpecificRagRequest
// are imported from @/lib/ai/detect-rag-request (extracted for unit-testability).


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

    const activeProjectMatch =
      content.match(/\b(?:on|for|about)\s+([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){1,4})\b/) ??
      content.match(/\b([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){1,4})\s+(?:project|job)\b/i);
    const activeProjectName = activeProjectMatch?.[1]?.trim();
    if (
      activeProjectName &&
      !/^(this|that|the|active|current|selected|project|job)$/i.test(activeProjectName)
    ) {
      return activeProjectName;
    }

    const unionCollectiveMatch = content.match(/\bUnion Collective\b/i);
    if (unionCollectiveMatch) {
      return unionCollectiveMatch[0];
    }

    const vermillionMatch = content.match(/\bVermillion Rise(?:\s+Warehouse)?\b/i);
    if (vermillionMatch) {
      return vermillionMatch[0];
    }
  }

  return undefined;
}

function shouldAnswerProjectLocationDirectly(message: string): boolean {
  const normalized = message.toLowerCase();
  const asksForLocation =
    /\b(address|street address|site address|located|location)\b/.test(normalized) ||
    /\bwhere\b.{0,80}\b(project|job|site|located|going to be)\b/.test(normalized);

  if (!asksForLocation) return false;

  return (
    /\b(this|that|it|project|job|site)\b/.test(normalized) ||
    /\bwhere\b/.test(normalized)
  );
}

function normalizeProjectContext(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function projectMatchesContext(project: ProjectLocationRecord, query: string): boolean {
  const normalizedQuery = normalizeProjectContext(query);
  if (!normalizedQuery) return false;

  const candidates = [
    project.name,
    project.project_number,
    project.acumatica_project_id,
    ...(Array.isArray(project.aliases) ? project.aliases : []),
  ]
    .map((candidate) => normalizeProjectContext(candidate ?? undefined))
    .filter(Boolean);

  return candidates.some((candidate) =>
    candidate.includes(normalizedQuery) || normalizedQuery.includes(candidate),
  );
}

function formatPriorProjectContinuityContext(projectName: string | undefined): string | null {
  const cleanProjectName = projectName?.trim();
  if (!cleanProjectName) return null;

  return [
    "# Conversation Continuity Guardrail",
    `The current conversation already established the project context as **${cleanProjectName}**.`,
    "If the user says this project, that project, it, the site, or asks a follow-up, resolve against that project first.",
    "Do not ask the user to repeat the project name unless the prior context conflicts with the new request.",
    "Do not answer with process narration like \"I can look it up\". Either use the available source context/tool results or state exactly which source was checked and what was missing.",
  ].join("\n");
}

function formatProjectLocationAnswer(project: ProjectLocationRecord, source: string): string {
  const projectName = project.name ?? `Project ${project.id}`;
  const projectLabel = [
    projectName,
    project.project_number ? `#${project.project_number}` : null,
  ].filter(Boolean).join(" ");

  if (project.address?.trim()) {
    const location = [project.address.trim(), project.state?.trim()].filter(Boolean).join(", ");
    return [
      `Yes. **${projectLabel}** is listed at **${location}**.`,
      "",
      `Source checked: the structured project record (${source}).`,
    ].join("\n");
  }

  const state = project.state?.trim();
  return [
    `I can see **${projectLabel}** in the project record, but the structured street address field is blank.`,
    state
      ? `The location signal I do have is **${state}**. I do not see a stored street address on the project record.`
      : "I do not see a stored street address or state on the project record.",
    "",
    "What failed before: I should have kept the prior Union Collective context and answered from the project record instead of asking you to repeat the project name.",
  ].join("\n");
}

function locationRagQuery(project: ProjectLocationRecord): string {
  return [
    project.name,
    project.project_number,
    project.acumatica_project_id,
    "address",
    "street address",
    "site address",
    "location",
    "located",
  ].filter(Boolean).join(" ");
}

function appendLocationRagFallback(params: {
  baseContent: string;
  output: SemanticSearchOutput | null;
  error?: string;
}): string {
  const results = params.output?.results ?? [];
  const sourceLine =
    "Second pass checked RAG/semantic search across vectorized meetings, Teams, email, documents, insights, and memories.";

  if (params.error) {
    return [
      params.baseContent,
      "",
      "**Additional Retrieval Check**",
      `- ${sourceLine}`,
      `- RAG search failed: ${params.error}`,
    ].join("\n");
  }

  if (results.length === 0) {
    return [
      params.baseContent,
      "",
      "**Additional Retrieval Check**",
      `- ${sourceLine}`,
      "- RAG returned 0 matching source rows with a street address, so I am not going to invent one.",
    ].join("\n");
  }

  const sourceBullets = results.slice(0, 3).map((result, index) => {
    const content = String(result.content ?? "").replace(/\s+/g, " ").trim();
    const excerpt = content.length > 260 ? `${content.slice(0, 260).trim()}...` : content;
    return `${index + 1}. ${sourceTitle(result)} — ${sourceDate(result)} ${sourceLabel(result)}: ${excerpt || "No excerpt text stored."}`;
  });

  return [
    params.baseContent,
    "",
    "**Additional Retrieval Check**",
    `- ${sourceLine}`,
    `- RAG returned ${results.length} related source row${results.length === 1 ? "" : "s"}, but none should be treated as a confirmed street address unless the excerpt explicitly contains it.`,
    ...sourceBullets,
  ].join("\n");
}

async function loadProjectLocationAnswer(params: {
  supabase: ReturnType<typeof createServiceClient>;
  selectedProjectId?: number;
  priorProjectName?: string;
  message: string;
}): Promise<ProjectLocationAnswer | null> {
  const selectColumns = "id,name,project_number,acumatica_project_id,address,state,phase,aliases";

  if (typeof params.selectedProjectId === "number") {
    const { data, error } = await params.supabase
      .from("projects")
      .select(selectColumns)
      .eq("id", params.selectedProjectId)
      .maybeSingle();

    if (error) {
      throw new Error(`Project location lookup failed: ${error.message}`);
    }

    if (data) {
      const project = data as ProjectLocationRecord;
      return {
        content: formatProjectLocationAnswer(project, "selected project context"),
        project,
        projectId: project.id,
        traceOutput: {
          resolvedBy: "selectedProjectId",
          projectId: project.id,
          addressPresent: Boolean(project.address?.trim()),
          statePresent: Boolean(project.state?.trim()),
        },
      };
    }
  }

  const queryText = [params.priorProjectName, params.message].filter(Boolean).join(" ");
  const resolvedTarget = await resolveIntelligenceTarget({
    query: queryText,
    selectedProjectId: params.selectedProjectId,
    supabase: params.supabase,
  });

  if (resolvedTarget?.projectId) {
    const { data, error } = await params.supabase
      .from("projects")
      .select(selectColumns)
      .eq("id", resolvedTarget.projectId)
      .maybeSingle();

    if (error) {
      throw new Error(`Project location lookup failed: ${error.message}`);
    }

    if (data) {
      const project = data as ProjectLocationRecord;
      return {
        content: formatProjectLocationAnswer(project, resolvedTarget.source),
        project,
        projectId: project.id,
        traceOutput: {
          resolvedBy: "intelligenceTarget",
          projectId: project.id,
          targetId: resolvedTarget.id,
          targetSlug: resolvedTarget.slug,
          targetSource: resolvedTarget.source,
          priorProjectName: params.priorProjectName ?? null,
          addressPresent: Boolean(project.address?.trim()),
          statePresent: Boolean(project.state?.trim()),
        },
      };
    }
  }

  const { data, error } = await params.supabase
    .from("projects")
    .select(selectColumns)
    .eq("archived", false)
    .limit(2000);

  if (error) {
    throw new Error(`Project location lookup failed: ${error.message}`);
  }

  const projects = (data ?? []) as ProjectLocationRecord[];
  const project = projects.find((candidate) =>
    projectMatchesContext(candidate, params.priorProjectName ?? params.message),
  );

  if (!project) return null;

  return {
    content: formatProjectLocationAnswer(project, "prior conversation project context"),
    project,
    projectId: project.id,
    traceOutput: {
      resolvedBy: "priorProjectName",
      projectId: project.id,
      priorProjectName: params.priorProjectName ?? null,
      addressPresent: Boolean(project.address?.trim()),
      statePresent: Boolean(project.state?.trim()),
    },
  };
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

// createStrategistFailureResponse is imported from @/lib/ai/strategist-failure-response
// (extracted to allow unit testing without importing the full route module's heavy deps)


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
    cachedInputTokens?: number | undefined;
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

  const { error } = await supabase.from("chat_history").insert({
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
              cachedInputTokens: totalUsage.cachedInputTokens ?? 0,
              cacheHitRatio:
                totalUsage.inputTokens && totalUsage.inputTokens > 0
                  ? Number(
                      (
                        (totalUsage.cachedInputTokens ?? 0) /
                        totalUsage.inputTokens
                      ).toFixed(3),
                    )
                  : 0,
            }
          : null,
        response_quality: responseQuality,
        loop_diagnostic: loopDiagnostic ?? null,
        assistant_retrieval_order: getAssistantRetrievalOrderSummary(),
        project_briefing_snapshot: projectBriefingSnapshot ?? null,
        executive_briefing_retrieval: executiveBriefingRetrieval ?? null,
        source_health: sourceHealth ?? null,
        data_parts: dataParts ?? [],
      }),
    ),
  });

  if (error) {
    console.error("[ai-assistant/chat] assistant persistence failed", {
      sessionId,
      userId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to persist assistant response: ${error.message}`);
  }
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
  _trace: Record<string, unknown>,
  _result?: Record<string, unknown>,
): number | null {
  // Only use the session-level pinned project ID — never trust IDs from tool
  // output rows, since those can reference projects that no longer exist and
  // will violate the ai_retrieval_feedback_project_id_fkey constraint.
  return fallbackProjectId ?? null;
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

  // Retrieval feedback is observability-only — never let it crash a chat response.
  // A stale project_id from tool results can violate the FK constraint; swallow it.
  await recordRetrievalFeedbackBatch(rows).catch((err: unknown) => {
    console.error("[chat] persistRetrievalFeedbackFromToolTrace failed (non-fatal)", {
      error: err instanceof Error ? err.message : String(err),
      rowCount: rows.length,
    });
  });
}



export async function handleChatLegacy({ request }: { request: Request }): Promise<Response> {
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
    const lastUserContent = lastUserMessage
      ? extractTextFromParts(lastUserMessage.parts)
      : "";
    const actionFollowUpResponse = shouldUseActionFollowUpResponse(lastUserContent);
    const sourceQualityFollowUpResponse = shouldUseSourceQualityFollowUpResponse(lastUserContent);
    const recentEmailInboxRequest = detectRecentEmailInboxRequest(lastUserContent);
    const sourceSpecificRagRequest = detectSourceSpecificRagRequest(lastUserContent);
    const taskSourceReviewRequest = detectTaskSourceReviewRequest(lastUserContent);
    const sourceLookupRecentTeamsRequest = sourceSpecificRagRequest
      ? null
      : detectSourceLookupRecentTeamsRequest(lastUserContent);
    const deterministicAssistantIntent = classifyAssistantIntent(lastUserContent, {
      selectedProjectId,
    });
    const intentPlannerDecision = await planAssistantIntent({
      message: lastUserContent,
      selectedProjectId,
      activeModel,
      deterministicIntent: deterministicAssistantIntent,
      sourceSpecificRagKind: sourceSpecificRagRequest?.kind,
    });
    const assistantIntent = intentPlannerDecision.intent;
    const messageDrivenToolNames = getMessageDrivenToolNames(lastUserContent, assistantIntent);
    const shouldEnableActionTools =
      assistantIntent === "task_write" ||
      assistantIntent === "email_action" ||
      assistantIntent === "calendar_action";
    const tools = createStrategistTools(user.id, {
      onTrace: (trace) => {
        toolTrace.push(trace);
      },
      pinnedProjectId: selectedProjectId,
      sessionId,
      includeActionTools: shouldEnableActionTools,
    });
    toolTrace.push({
      tool: "intentPlanner",
      input: {
        message: lastUserContent,
        selectedProjectId: selectedProjectId ?? null,
        deterministicIntent: deterministicAssistantIntent,
        taskSourceReview: taskSourceReviewRequest,
        recentEmailInboxRequest,
        sourceSpecificRagKind: sourceSpecificRagRequest?.kind ?? null,
        sourceLookupRecentTeamsKind: sourceLookupRecentTeamsRequest?.kind ?? null,
        messageDrivenToolNames,
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
    const featureRequestPacketRequest = shouldCaptureFeatureRequest(lastUserContent);
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
    const executivePagePacket = isBrandonDailyUpdatePacket(executiveBriefPacket)
      ? executiveBriefPacket
      : null;
    const priorProjectName = extractPriorProjectName(messages);
    const projectLocationQuestion = shouldAnswerProjectLocationDirectly(lastUserContent);
    let projectBriefingSnapshot: ProjectBriefingSnapshot | null = null;
    const executiveBriefingRetrieval: ExecutiveBriefingRetrievalPacket | null = null;
    let assistantSourceHealthContext: AssistantSourceHealthContext | null = null;
    const sourceHealthRequested =
      assistantIntent === "implementation_planning" ||
      (assistantIntent !== "email_action" &&
        shouldAttachAssistantSourceHealth(lastUserContent));
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

        if (featureRequestPacketRequest && messageDrivenToolNames.length === 0) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Capturing the request packet",
            status: "loading",
          });

          const captureResult = await withTimeout(
            (async () => {
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
              return {
                featureRequest,
                dataParts: writeAssistantWidgetParts(
                  writer,
                  [
                    buildFeatureRequestPacketWidget({
                      request: featureRequest,
                      latestPlan: detail?.latestPlan ?? null,
                    }),
                  ],
                ),
              };
            })(),
            18_000,
            "Feature request packet capture timed out before a durable packet could be confirmed.",
          );

          let content: string;
          let dataParts: PersistedDataPart[] = [];
          if (isTimeoutResult(captureResult)) {
            content = [
              "I could not confirm that the request packet was captured before the timeout guard fired.",
              "What happened: the packet write did not finish within the assistant route's fast-response budget.",
              "Next step: retry the request. If it times out again, check Supabase writes for `feature_requests` and `feature_request_events`.",
            ].join("\n\n");
            toolTrace.push({
              tool: "featureRequestPacketRouter",
              input: {
                selectedProjectId: selectedProjectId ?? null,
                message: lastUserContent.slice(0, 240),
              },
              error: captureResult.error,
              timestamp: new Date().toISOString(),
            });
          } else {
            const { featureRequest } = captureResult;
            dataParts = captureResult.dataParts;
            content = [
              `Captured the request packet: ${featureRequest.title}.`,
              `Packet: /ai-assistant/feature-requests/${featureRequest.id}`,
              "I stopped at packet capture so this turn does not time out while also generating plans, Linear drafts, or handoffs.",
              "Next step: open the packet, then run the implementation-plan/Linear/handoff actions from the packet widget when the scope is ready.",
            ].join("\n\n");
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
                deterministicFastPath: true,
              },
              timestamp: new Date().toISOString(),
            });
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
            dataParts,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          await writeTextResponse(writer, "strategist-feature-request-packet", content);
          writeStrategistStatus(writer, {
            stage: "complete",
            message: isTimeoutResult(captureResult) ? "Packet capture timed out" : "Request packet captured",
            status: isTimeoutResult(captureResult) ? "warning" : "success",
          });
          return;
        }

        const isTaskWriteIntent = assistantIntent === "task_write";
        const isLeanAdvisorIntent = LEAN_ADVISOR_INTENTS.has(assistantIntent);
        let promptMode: "full_strategist" | "task_write_lean" | "lean_advisor" = "full_strategist";
        let systemPrompt: string;
        if (isTaskWriteIntent) {
          systemPrompt = await assembleTaskWriteSystemPrompt({
            userId: user.id,
            messageText: lastUserContent,
            selectedProjectId,
          });
        } else if (isLeanAdvisorIntent) {
          systemPrompt = await assembleLeanAdvisorSystemPrompt({
            messageText: lastUserContent,
            selectedProjectId,
            intentLabel: assistantIntent,
          });
          promptMode = "lean_advisor";
          assertLeanAdvisorBasePromptBudget({
            promptApproxTokens: getApproxTokenCount(systemPrompt),
            intent: assistantIntent,
          });
        } else {
          systemPrompt = await assembleSystemPrompt({
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
        }
        if (isTaskWriteIntent) {
          promptMode = "task_write_lean";
          toolTrace.push({
            tool: "promptContextReducer",
            input: {
              intent: assistantIntent,
              message: lastUserContent.slice(0, 240),
            },
            output: {
              promptMode,
              skippedGeneralMemory: true,
              skippedWorkspaceArtifacts: true,
              skippedSourceHealth: true,
              skippedExecutivePacket: true,
            },
            timestamp: new Date().toISOString(),
          });
        } else if (isLeanAdvisorIntent) {
          toolTrace.push({
            tool: "promptContextReducer",
            input: {
              intent: assistantIntent,
              message: lastUserContent.slice(0, 240),
            },
            output: {
              promptMode,
              skippedGeneralMemory: true,
              skippedWorkspaceArtifacts: true,
              skippedExecutivePacket: true,
              retainedPacketFirstRetrieval: shouldUsePacketFirstIntent(assistantIntent),
            },
            timestamp: new Date().toISOString(),
          });
        }
        if (!isTaskWriteIntent && sourceHealthRequested) {
          const sourceHealth = await getAssistantSourceHealthContext("source_status_request");
          if (sourceHealth) {
            systemPrompt = systemPrompt + `\n\n---\n\n${sourceHealth.promptInjection}`;
          }
        }

        const priorProjectContinuityContext =
          formatPriorProjectContinuityContext(priorProjectName);
        if (!isTaskWriteIntent && !isLeanAdvisorIntent && priorProjectContinuityContext) {
          systemPrompt = systemPrompt + `\n\n---\n\n${priorProjectContinuityContext}`;
        }

        if (!isTaskWriteIntent && !isLeanAdvisorIntent && executivePagePacket) {
          systemPrompt = systemPrompt + `\n\n---\n\n${formatExecutiveBriefPacketContext(executivePagePacket)}`;
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

        if (personalTaskRegisterRequest && assistantIntent !== "task_write") {
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

        if (taskSourceReviewRequest && assistantIntent !== "task_write") {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Opening the task row and source meeting evidence",
            status: "loading",
          });

          const packet = await loadTaskSourceReviewPacket({
            supabase,
            selectedProjectId,
            message: lastUserContent,
          });
          if (!packet) {
            throw new Error("Task source review router matched, but no packet was produced.");
          }

          const dataPart: PersistedDataPart | null = packet.widget
            ? {
                type: "data-assistant-widget",
                id: "assistant-widget-task-source-review",
                data: { widget: packet.widget },
              }
            : null;
          if (dataPart) writer.write(dataPart);

          toolTrace.push({
            tool: "taskSourceReview",
            input: {
              message: lastUserContent.slice(0, 240),
              selectedProjectId: selectedProjectId ?? null,
              request: taskSourceReviewRequest,
            },
            output: packet.traceOutput,
            timestamp: new Date().toISOString(),
          });

          writeStrategistStatus(writer, {
            stage: "synthesis",
            message: "Reviewing whether the source meeting supports the task",
            status: "loading",
          });

          const review = await generateText({
            model: getLanguageModel(activeModel),
            system: buildTaskSourceReviewPrompt(packet),
            prompt: lastUserContent,
          });
          const content = review.text.trim() || [
            "I found the task/source evidence, but the model returned an empty review.",
            "That is a failure in synthesis, not a missing task lookup.",
          ].join("\n");

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
            totalUsage: review.usage,
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
            dataParts: dataPart ? [dataPart] : [],
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          await writeTextResponse(writer, "strategist-task-source-review", content);
          writeStrategistStatus(writer, {
            stage: "complete",
            message: "Task source review complete",
            status: "success",
          });
          return;
        }

        if (isGeneratedTasksTodayRequest(lastUserContent)) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Checking the Tasks table for rows created today",
            status: "loading",
          });

          const answer = await loadGeneratedTasksTodayAnswer({
            supabase,
            selectedProjectId,
          });
          const dataPart: PersistedDataPart = {
            type: "data-assistant-widget",
            id: "assistant-widget-generated-tasks-today",
            data: { widget: answer.widget },
          };
          writer.write(dataPart);

          toolTrace.push({
            tool: "getGeneratedTasksToday",
            input: {
              message: lastUserContent.slice(0, 240),
              selectedProjectId: selectedProjectId ?? null,
            },
            output: answer.traceOutput,
            timestamp: new Date().toISOString(),
          });

          const responseQuality = scoreResponseQuality({
            toolTrace,
            content: answer.content,
          });
          await persistAssistantMessage({
            supabase,
            sessionId,
            userId: user.id,
            content: answer.content,
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
            dataParts: [dataPart],
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          await writeTextResponse(writer, "strategist-generated-tasks-today", answer.content);
          writeStrategistStatus(writer, {
            stage: "complete",
            message: "Tasks table checked",
            status: "success",
          });
          return;
        }

        if (isOwnerActionQueueWidgetRequest(lastUserContent)) {
          writeStrategistStatus(writer, {
            stage: "actions",
            message: selectedProjectId
              ? "Building owner action queue"
              : "Loading projects for owner action queue",
            status: "loading",
          });

          const requestedProjectId = selectedProjectId ?? extractProjectIdFromMessage(lastUserContent);
          if (!requestedProjectId) {
            const picker = await loadOwnerActionQueueProjectPicker({
              supabase,
              userId: user.id,
              selectedProjectId,
            });
            const dataParts = picker.widget
              ? writeAssistantWidgetParts(writer, [picker.widget])
              : [];

            toolTrace.push({
              tool: "ownerActionQueueProjectPicker",
              input: {
                message: lastUserContent.slice(0, 240),
                selectedProjectId: selectedProjectId ?? null,
              },
              output: picker.traceOutput,
              timestamp: new Date().toISOString(),
            });

            const responseQuality = scoreResponseQuality({
              toolTrace,
              content: picker.content,
            });
            await persistAssistantMessage({
              supabase,
              sessionId,
              userId: user.id,
              content: picker.content,
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
              dataParts,
              sourceHealth: assistantSourceHealthContext?.metadata ?? null,
            });

            await supabase
              .from("conversations")
              .update({ last_message_at: new Date().toISOString() })
              .eq("session_id", sessionId)
              .eq("user_id", user.id);

            await writeTextResponse(writer, "strategist-owner-action-queue-picker", picker.content);
            writeStrategistStatus(writer, {
              stage: "complete",
              message: picker.widget ? "Project picker ready" : "Project picker unavailable",
              status: picker.widget ? "success" : "warning",
            });
            return;
          }

          const answer = await loadOwnerActionQueueWidget({
            tools,
            selectedProjectId: requestedProjectId,
          });
          projectBriefingSnapshot = answer.snapshot;

          const dataParts = answer.widget
            ? writeAssistantWidgetParts(writer, [answer.widget])
            : [];

          toolTrace.push({
            tool: "ownerActionQueueWidget",
            input: {
              message: lastUserContent.slice(0, 240),
              selectedProjectId: requestedProjectId,
            },
            output: answer.traceOutput,
            timestamp: new Date().toISOString(),
          });

          const responseQuality = scoreResponseQuality({
            toolTrace,
            content: answer.content,
          });
          await persistAssistantMessage({
            supabase,
            sessionId,
            userId: user.id,
            content: answer.content,
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
            selectedProjectId: requestedProjectId,
            dataParts,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          await writeTextResponse(writer, "strategist-owner-action-queue", answer.content);
          writeStrategistStatus(writer, {
            stage: "complete",
            message: answer.widget ? "Owner action queue ready" : "Owner action queue unavailable",
            status: answer.widget ? "success" : "warning",
          });
          return;
        }

        if (isOwnerSnapshotWidgetRequest(lastUserContent)) {
          writeStrategistStatus(writer, {
            stage: "snapshot",
            message: selectedProjectId
              ? "Building owner snapshot widget"
              : "Loading projects for owner snapshot",
            status: "loading",
          });

          const requestedProjectId = selectedProjectId ?? extractProjectIdFromMessage(lastUserContent);
          if (!requestedProjectId) {
            const picker = await loadOwnerSnapshotProjectPicker({
              supabase,
              userId: user.id,
              selectedProjectId,
            });
            const dataParts = picker.widget
              ? writeAssistantWidgetParts(writer, [picker.widget])
              : [];

            toolTrace.push({
              tool: "ownerSnapshotProjectPicker",
              input: {
                message: lastUserContent.slice(0, 240),
                selectedProjectId: selectedProjectId ?? null,
              },
              output: picker.traceOutput,
              timestamp: new Date().toISOString(),
            });

            const responseQuality = scoreResponseQuality({
              toolTrace,
              content: picker.content,
            });
            await persistAssistantMessage({
              supabase,
              sessionId,
              userId: user.id,
              content: picker.content,
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
              dataParts,
              sourceHealth: assistantSourceHealthContext?.metadata ?? null,
            });

            await supabase
              .from("conversations")
              .update({ last_message_at: new Date().toISOString() })
              .eq("session_id", sessionId)
              .eq("user_id", user.id);

            await writeTextResponse(writer, "strategist-owner-snapshot-picker", picker.content);
            writeStrategistStatus(writer, {
              stage: "complete",
              message: picker.widget ? "Project picker ready" : "Project picker unavailable",
              status: picker.widget ? "success" : "warning",
            });
            return;
          }

          const answer = await loadOwnerSnapshotWidget({
            tools,
            selectedProjectId: requestedProjectId,
          });
          projectBriefingSnapshot = answer.snapshot;

          const dataParts = answer.widget
            ? writeAssistantWidgetParts(writer, [answer.widget])
            : [];

          toolTrace.push({
            tool: "ownerSnapshotWidget",
            input: {
              message: lastUserContent.slice(0, 240),
              selectedProjectId: requestedProjectId,
            },
            output: answer.traceOutput,
            timestamp: new Date().toISOString(),
          });

          const responseQuality = scoreResponseQuality({
            toolTrace,
            content: answer.content,
          });
          await persistAssistantMessage({
            supabase,
            sessionId,
            userId: user.id,
            content: answer.content,
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
            selectedProjectId: requestedProjectId,
            dataParts,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          await writeTextResponse(writer, "strategist-owner-snapshot", answer.content);
          writeStrategistStatus(writer, {
            stage: "complete",
            message: answer.widget ? "Owner snapshot ready" : "Owner snapshot unavailable",
            status: answer.widget ? "success" : "warning",
          });
          return;
        }

        const plannedWidgets: AssistantWidgetPayload[] =
          assistantIntent === "email_action"
            ? []
            : [
                ...buildAssistantWidgetsFromPrompt({
                  prompt: lastUserContent,
                  selectedProjectId,
                }),
              ];

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

        if (projectLocationQuestion) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Checking project location context",
            status: "loading",
          });

          const locationAnswer = await loadProjectLocationAnswer({
            supabase,
            selectedProjectId,
            priorProjectName,
            message: lastUserContent,
          });

          if (locationAnswer) {
            let content = locationAnswer.content;
            let ragOutput: SemanticSearchOutput | null = null;
            let ragError: string | undefined;
            const addressPresent = Boolean(locationAnswer.project.address?.trim());

            if (!addressPresent) {
              const semanticSearchTool = (tools as Record<string, ExecutableTool>).semanticSearch;
              const ragQuery = locationRagQuery(locationAnswer.project);

              if (semanticSearchTool?.execute) {
                const searchOutput = await withTimeout(
                  semanticSearchTool.execute({
                    query: ragQuery,
                    projectId: locationAnswer.projectId,
                    matchCount: 8,
                    threshold: 0.35,
                    skipRerank: false,
                  }),
                  18_000,
                  "semanticSearch timed out during project location fallback retrieval",
                );

                if (isTimeoutResult(searchOutput)) {
                  ragError = searchOutput.error;
                } else {
                  ragOutput = normalizeSemanticSearchOutput(searchOutput);
                  ragError =
                    typeof ragOutput?.error === "string" ? ragOutput.error : undefined;
                }
              } else {
                ragError = "semanticSearch tool was not executable during project location fallback retrieval";
              }

              content = appendLocationRagFallback({
                baseContent: content,
                output: ragOutput,
                error: ragError,
              });
            }

            toolTrace.push({
              tool: "projectLocationContextLookup",
              input: {
                message: lastUserContent.slice(0, 240),
                selectedProjectId: selectedProjectId ?? null,
                priorProjectName: priorProjectName ?? null,
              },
              output: {
                ...locationAnswer.traceOutput,
                ragFallbackAttempted: !addressPresent,
                ragFallbackResultCount: ragOutput?.results?.length ?? 0,
                ragFallbackError: ragError ?? null,
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
              selectedProjectId: locationAnswer.projectId ?? selectedProjectId,
              dataParts: assistantWidgetDataParts,
              sourceHealth: assistantSourceHealthContext?.metadata ?? null,
            });

            await supabase
              .from("conversations")
              .update({ last_message_at: new Date().toISOString() })
              .eq("session_id", sessionId)
              .eq("user_id", user.id);

            await writeTextResponse(writer, "strategist-project-location", content);
            writeStrategistStatus(writer, {
              stage: "complete",
              message: "Project location checked",
              status: "success",
            });
            return;
          }

          toolTrace.push({
            tool: "projectLocationContextLookup",
            input: {
              message: lastUserContent.slice(0, 240),
              selectedProjectId: selectedProjectId ?? null,
              priorProjectName: priorProjectName ?? null,
            },
            output: {
              resolved: false,
              reason: "No selected project or prior project context resolved to a project record.",
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
            message: "Loading Daily Brief with the Brandon preset",
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
              preset: "brandon",
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
            message: "Daily Brief ready",
            status: "success",
          });
          return;
        }

        if (isCmoWeeklyContentWorkflowRequest(lastUserContent)) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Consulting CMO and saving weekly content drafts",
            status: "loading",
          });

          const workflowResult = await createWeeklyMarketingContentWorkflow({
            createdBy: user.id,
            projectId: selectedProjectId ?? null,
          });
          const content = formatCmoWeeklyContentWorkflowResponse(workflowResult);

          toolTrace.push({
            tool: "consultCMOPhase1Workflow",
            input: {
              message: lastUserContent.slice(0, 240),
              selectedProjectId: selectedProjectId ?? null,
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
          });

          writeStrategistStatus(writer, {
            stage: "synthesis",
            message: "Writing CMO calendar handoff",
            status: "loading",
          });

          await writeTextResponse(writer, "strategist-cmo-weekly-content", content);

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
            message: "CMO content calendar saved",
            status: "success",
          });
          return;
        }

        const outlookInboxCardAction = parseOutlookInboxCardAction(lastUserContent);
        if (outlookInboxCardAction) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Preparing Outlook reply draft from selected email",
            status: "loading",
          });

          const toolMap = tools as Record<string, ExecutableTool>;
          const readOutlookEmailThreadTool = toolMap.readOutlookEmailThread;
          const draftOutlookEmailTool = toolMap.draftOutlookEmail;

          if (!draftOutlookEmailTool?.execute) {
            const content = [
              "I could not prepare the Outlook draft.",
              "Cause: the Outlook draft tool is not available in the assistant tool map.",
              "Prevention: inbox card actions now fail loudly instead of falling through to project or RAG lookup.",
            ].join("\n");
            await writeTextResponse(writer, "outlook-card-action-missing-tool", content);
            return;
          }

          const threadOutput =
            readOutlookEmailThreadTool?.execute &&
            (outlookInboxCardAction.conversationId || outlookInboxCardAction.graphMessageId)
              ? await withTimeout(
                  readOutlookEmailThreadTool.execute({
                    conversationId: outlookInboxCardAction.conversationId ?? undefined,
                    graphMessageId: outlookInboxCardAction.graphMessageId ?? undefined,
                    limit: 8,
                  }),
                  12_000,
                  "readOutlookEmailThread timed out during selected email draft action",
                )
              : null;
          const threadMessages = !isTimeoutResult(threadOutput)
            ? emailThreadMessagesFromOutput(threadOutput)
            : [];
          const draftContext = threadMessages.length > 0
            ? formatThreadForDraft(threadMessages)
            : outlookInboxCardAction.emailContext ?? "";

          const generatedDraft = await withTimeout(
            generateText({
              model: getLanguageModel("openai/gpt-4.1"),
              system:
                "Draft concise, professional Outlook email text. Return only the email body. Do not include a subject, greeting labels, markdown, or commentary.",
              prompt: [
                `Action: ${outlookInboxCardAction.recommendedAction ?? "Draft a practical response."}`,
                `Subject: ${outlookInboxCardAction.subject ?? "Outlook email"}`,
                outlookInboxCardAction.sender ? `Latest sender: ${outlookInboxCardAction.sender}` : null,
                outlookInboxCardAction.receivedAt ? `Received: ${outlookInboxCardAction.receivedAt}` : null,
                "",
                "Email context:",
                draftContext.slice(0, 4000),
              ].filter(Boolean).join("\n"),
              maxOutputTokens: 350,
            }),
            15_000,
            "selected email draft generation timed out",
          );

          if (isTimeoutResult(generatedDraft)) {
            const content = [
              "I found the selected Outlook email, but draft generation timed out.",
              "Cause: the model did not return a draft before the server-side timeout.",
              "Prevention: this selected-email action now stays on the Outlook path and fails loudly instead of falling through to unrelated retrieval.",
            ].join("\n");
            await writeTextResponse(writer, "outlook-card-action-timeout", content);
            return;
          }

          const subject = outlookInboxCardAction.subject ?? "Outlook email";
          const body = generatedDraft.text.trim();
          const draftOutput = await withTimeout(
            draftOutlookEmailTool.execute({
              replyToGraphMessageId:
                outlookInboxCardAction.mode === "reply"
                  ? outlookInboxCardAction.graphMessageId ?? undefined
                  : undefined,
              subject: outlookInboxCardAction.mode === "reply" ? replySubject(subject) : subject,
              body,
              toRecipients: [],
              ccRecipients: [],
              bccRecipients: [],
              importance: "normal",
              confirmed: false,
            }),
            12_000,
            "draftOutlookEmail timed out during selected email draft action",
          );

          if (isTimeoutResult(draftOutput)) {
            const content = [
              "I wrote the reply text, but Outlook draft preview creation timed out.",
              "Cause: draftOutlookEmail did not return before the server-side timeout.",
              "Prevention: this selected-email action now stays on the Outlook draft path and fails loudly.",
            ].join("\n");
            await writeTextResponse(writer, "outlook-card-action-draft-timeout", content);
            return;
          }

          const draftWidget = isRecord(draftOutput) && isAssistantWidgetPayload(draftOutput.widget)
            ? draftOutput.widget
            : null;
          const dataPart: PersistedDataPart | null = draftWidget
            ? {
                type: "data-assistant-widget",
                id: `assistant-widget-${draftWidget.id}`,
                data: { widget: draftWidget },
              }
            : null;
          if (dataPart) writer.write(dataPart);

          toolTrace.push({
            tool: "outlookInboxCardAction",
            input: {
              mode: outlookInboxCardAction.mode,
              subject,
              graphMessageId: outlookInboxCardAction.graphMessageId,
              conversationId: outlookInboxCardAction.conversationId,
            },
            output: {
              usedThreadRead: threadMessages.length > 0,
              draftPreviewCreated: Boolean(draftWidget),
              bodyLength: body.length,
            },
            timestamp: new Date().toISOString(),
          });

          const content = [
            `I prepared a draft ${outlookInboxCardAction.mode === "reply" ? "reply" : "email"} for **${subject}**.`,
            "Review the draft below. I have not saved or sent anything.",
          ].join("\n\n");
          await writeTextResponse(writer, "outlook-card-action-draft", content);

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
            totalUsage: generatedDraft.usage,
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
            dataParts: dataPart ? [...assistantWidgetDataParts, dataPart] : assistantWidgetDataParts,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          writeStrategistStatus(writer, {
            stage: "complete",
            message: "Outlook reply draft preview ready",
            status: "success",
          });
          return;
        }

        if (recentEmailInboxRequest && !isEmailDraftWorkflowRequest(lastUserContent)) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Checking Outlook inbox via structured email intake",
            status: "loading",
          });

          const recentEmailsTool = (tools as Record<string, ExecutableTool>).getRecentEmails;
          const recentEmailsOutput = recentEmailsTool?.execute
            ? await withTimeout(
                recentEmailsTool.execute({
                  daysBack: recentEmailInboxRequest.daysBack,
                  direction: "mailbox",
                  limit: recentEmailInboxRequest.limit,
                  groupByThread: true,
                  timeZone: "America/New_York",
                }),
                20_000,
                "getRecentEmails timed out during inbox fast path",
              )
            : {
                error: "getRecentEmails is not available in the AI assistant tool map.",
              };

          const recentEmailWidget =
            !isTimeoutResult(recentEmailsOutput) &&
            isRecord(recentEmailsOutput) &&
            !stringValue(recentEmailsOutput.error)
              ? buildRecentEmailInboxWidget({
                  request: recentEmailInboxRequest,
                  prompt: lastUserContent,
                  output: recentEmailsOutput,
                })
              : null;
          const dataPart: PersistedDataPart | null = recentEmailWidget
            ? {
                type: "data-assistant-widget",
                id: "assistant-widget-recent-email-inbox",
                data: { widget: recentEmailWidget },
              }
            : null;
          if (dataPart) writer.write(dataPart);

          const content = isTimeoutResult(recentEmailsOutput)
            ? [
                "I checked Outlook email intake for your inbox, but the structured inbox lookup timed out.",
                "Cause: getRecentEmails did not return before the server-side timeout.",
                "Prevention: inbox/date/triage wording now routes through getRecentEmails before any source-search fallback, so this fails loudly instead of returning stale RAG evidence.",
              ].join("\n")
            : recentEmailWidget && isRecord(recentEmailsOutput)
              ? formatRecentEmailInboxText({
                  request: recentEmailInboxRequest,
                  output: recentEmailsOutput,
                  widget: recentEmailWidget,
                })
            : formatRecentEmailInboxAnswer({
                request: recentEmailInboxRequest,
                prompt: lastUserContent,
                output: recentEmailsOutput,
              });

          writeStrategistStatus(writer, {
            stage: "synthesis",
            message: "Writing Outlook inbox answer",
            status: "loading",
          });

          await writeTextResponse(writer, "recent-email-inbox-fast-path", content);
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
            dataParts: dataPart ? [...assistantWidgetDataParts, dataPart] : assistantWidgetDataParts,
            sourceHealth: assistantSourceHealthContext?.metadata ?? null,
          });

          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("session_id", sessionId)
            .eq("user_id", user.id);

          writeStrategistStatus(writer, {
            stage: "complete",
            message: "Outlook inbox check complete",
            status: "success",
          });
          return;
        }

        if (
          sourceSpecificRagRequest &&
          assistantIntent !== "email_action" &&
          !shouldKeepModelToolsForSourceLookup(messageDrivenToolNames)
        ) {
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
          const meetingInsightsWidget = buildMeetingInsightsWidget({
            request: sourceSpecificRagRequest,
            rows: sourceSpecificAnswer.rows,
          });
          const sourceSpecificWidgetDataPart: PersistedDataPart | null =
            meetingInsightsWidget
              ? {
                  type: "data-assistant-widget",
                  id: `assistant-widget-${meetingInsightsWidget.id}`,
                  data: { widget: meetingInsightsWidget },
                }
              : null;
          if (sourceSpecificWidgetDataPart) {
            writer.write(sourceSpecificWidgetDataPart);
            toolTrace.push({
              tool: "assistantComponentRegistry",
              input: {
                sourceTool: "sourceSpecificRagRetrieval",
                kind: sourceSpecificRagRequest.kind,
              },
              output: {
                widgetType: meetingInsightsWidget?.type,
                widgetId: meetingInsightsWidget?.id,
                meetingCount: meetingInsightsWidget?.metrics.meetingCount,
              },
              timestamp: new Date().toISOString(),
            });
          }

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
            dataParts: sourceSpecificWidgetDataPart
              ? [...assistantWidgetDataParts, sourceSpecificWidgetDataPart]
              : assistantWidgetDataParts,
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
              toolTrace.push({
                tool: "semanticSearch",
                input: {
                  query: lastUserContent,
                  projectId: selectedProjectId ?? null,
                  matchCount: 12,
                  threshold: 0.5,
                  skipRerank: false,
                },
                output: {
                  resultCount: sourceLookupOutput?.results?.length ?? 0,
                },
                timestamp: new Date().toISOString(),
              });
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
          const sourceLookupHeader = `# Source Lookup Results\n\nRetrieval is complete. Do NOT call any additional tools — all available source evidence is already loaded below. If a Recent Teams Window is present, treat it as the current primary evidence and use older semantic matches only as secondary pattern context. Read the sources carefully, extract the actual commitments / issues / decisions / sentiment the user is asking about, and synthesize a useful answer with specific quotes or paraphrased points and source citations. Do NOT just list the source previews verbatim. If the sources don't actually contain what the user asked about, say so honestly and explain what the search did return.`;
          systemPrompt = [
            systemPrompt,
            "---",
            sourceLookupHeader,
            sourceLookupHealth?.promptInjection,
            recentTeamsContext,
            sourceLookupContext,
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

        if (assistantIntent === "task_write") {
          // Skip packet retrieval entirely. Injecting project intelligence for
          // a write request primes the model for a reading pattern and causes
          // it to describe the task in text rather than calling createGeneratedTask.
          // Instead, reinforce the MANDATORY TASK WRITE PROTOCOL inline so the
          // model has exactly one instruction in focus: call the tool.
          systemPrompt =
            systemPrompt +
            "\n\n---\n\n## ACTIVE TASK WRITE INTENT\n\n" +
            "The intent planner classified this request as **task_write**. " +
            "You MUST call `createGeneratedTask` for Tasks page action items, reminders, notes to self, and follow-ups. " +
            "Use `createTask` only for schedule/Gantt activities, milestones, or project schedule tasks. " +
            "Use `updateGeneratedTask` / `deleteGeneratedTask` for modifications/deletions. Call the right tool RIGHT NOW. " +
            "Do NOT write a text description of what the task would look like. " +
            "Do NOT ask clarifying questions before calling the tool — call it with `confirmed: false` to show the preview card, using your best inference for any missing fields. " +
            "The UI will render the preview card and ask the user to confirm or edit. Your only job is to call the tool.";

          toolTrace.push({
            tool: "taskWriteIntentRouter",
            input: {
              intent: assistantIntent,
              message: lastUserContent.slice(0, 240),
            },
            output: {
              skippedPacketRetrieval: true,
              injectedTaskWriteOverride: true,
            },
            timestamp: new Date().toISOString(),
          });

          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Creating task preview",
            status: "loading",
          });
          // Fall through to streamText — tools are enabled and the override
          // in the system prompt ensures the model calls createGeneratedTask.
        }

        if (messageDrivenToolNames.length > 0 && assistantIntent !== "task_write") {
          systemPrompt =
            systemPrompt +
            "\n\n---\n\n## MESSAGE-SPECIFIC REQUIRED TOOLS\n\n" +
            "The user's wording names a concrete data surface. Before the final answer, use the first applicable available tool from this ordered list: " +
            messageDrivenToolNames.join(", ") +
            ". If one tool returns no useful records, try the next relevant tool before answering. Do not answer from the project packet alone when one of these structured/source tools is available.";

          toolTrace.push({
            tool: "messageDrivenToolRouter",
            input: {
              intent: assistantIntent,
              message: lastUserContent.slice(0, 240),
            },
            output: {
              requiredToolNames: messageDrivenToolNames,
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (assistantIntent === "email_action") {
          systemPrompt =
            systemPrompt +
            "\n\n---\n\n## ACTIVE EMAIL ACTION INTENT\n\n" +
            "The intent planner classified this request as **email_action**. " +
            "You MUST treat this as an Outlook draft workflow, not a read-only email summary. " +
            "If the user asks to draft a reply to the latest or a specific message, first call `getRecentOutlookEmails` with the best inferred query and `limit: 3`, then call `draftOutlookEmail` with `confirmed: false`. " +
            "If a specific thread is clear from the recent email result, call `readOutlookEmailThread` before drafting. " +
            "Never say the email was sent. Never create or send a confirmed draft without user confirmation. " +
            "If the target message or recipient is ambiguous, still call the read tool first, then present the safest draft preview or the exact missing detail.";

          toolTrace.push({
            tool: "emailActionIntentRouter",
            input: {
              intent: assistantIntent,
              message: lastUserContent.slice(0, 240),
            },
            output: {
              skippedSourceSpecificShortCircuit: Boolean(sourceSpecificRagRequest),
              injectedEmailActionOverride: true,
            },
            timestamp: new Date().toISOString(),
          });

          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Preparing Outlook draft workflow",
            status: "loading",
          });

          const toolMap = tools as Record<string, ExecutableTool>;
          const recentOutlookEmailsTool = toolMap.getRecentOutlookEmails;
          const readOutlookEmailThreadTool = toolMap.readOutlookEmailThread;
          const draftOutlookEmailTool = toolMap.draftOutlookEmail;
          const isObviousDraftReply =
            isEmailDraftWorkflowRequest(lastUserContent);

          if (
            isObviousDraftReply &&
            recentOutlookEmailsTool?.execute &&
            draftOutlookEmailTool?.execute
          ) {
            const recentOutput = await withTimeout(
              recentOutlookEmailsTool.execute({
                query: inferEmailActionQuery(lastUserContent),
                limit: 3,
              }),
              12_000,
              "getRecentOutlookEmails timed out during email draft fast path",
            );

            if (!isTimeoutResult(recentOutput)) {
              const seedEmail = firstEmailFromOutput(recentOutput);
              const conversationId = stringValue(seedEmail?.conversationId);
              const graphMessageId = stringValue(seedEmail?.graphMessageId);
              const subject = stringValue(seedEmail?.subject);
              const threadOutput =
                readOutlookEmailThreadTool?.execute && (conversationId || graphMessageId)
                  ? await withTimeout(
                      readOutlookEmailThreadTool.execute({
                        conversationId: conversationId ?? undefined,
                        graphMessageId: graphMessageId ?? undefined,
                        limit: 8,
                      }),
                      12_000,
                      "readOutlookEmailThread timed out during email draft fast path",
                    )
                  : null;

              if (!isTimeoutResult(threadOutput)) {
                const threadMessages = emailThreadMessagesFromOutput(threadOutput);
                const draftContext = threadMessages.length > 0
                  ? formatThreadForDraft(threadMessages)
                  : stringValue(seedEmail?.preview) ?? "";
                const generatedDraft = await withTimeout(
                  generateText({
                    model: getLanguageModel("openai/gpt-4.1"),
                    system:
                      "Draft concise, professional Outlook reply text. Return only the email body. Do not include a subject, greeting labels, markdown, or commentary.",
                    prompt: [
                      `User request: ${lastUserContent}`,
                      "",
                      "Email thread context:",
                      draftContext.slice(0, 4000),
                    ].join("\n"),
                    maxOutputTokens: 350,
                  }),
                  15_000,
                  "email draft generation timed out during fast path",
                );

                if (!isTimeoutResult(generatedDraft)) {
                  const body = generatedDraft.text.trim();
                  const draftOutput = await withTimeout(
                    draftOutlookEmailTool.execute({
                      replyToGraphMessageId: graphMessageId ?? undefined,
                      subject: replySubject(subject),
                      body,
                      toRecipients: [],
                      ccRecipients: [],
                      bccRecipients: [],
                      importance: "normal",
                      confirmed: false,
                    }),
                    12_000,
                    "draftOutlookEmail timed out during fast path",
                  );

                  if (!isTimeoutResult(draftOutput)) {
                    toolTrace.push({
                      tool: "emailActionFastPath",
                      input: {
                        query: inferEmailActionQuery(lastUserContent) ?? null,
                        seedSubject: subject,
                        graphMessageId,
                        conversationId,
                      },
                      output: {
                        usedRecentOutlookEmails: true,
                        usedThreadRead: threadMessages.length > 0,
                        draftPreviewCreated: true,
                        bodyLength: body.length,
                      },
                      timestamp: new Date().toISOString(),
                    });

                    const content = [
                      "I found the latest matching email thread and prepared a short Outlook reply draft.",
                      "",
                      `Subject: ${replySubject(subject)}`,
                      "",
                      "Draft:",
                      body,
                      "",
                      "Reply **confirm** and I will save this reply draft to Outlook. If this is the wrong thread, tell me which email to use and I will redraft it.",
                    ].join("\n");

                    await writeTextResponse(writer, "email-action-fast-path", content);
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
                      message: "Outlook reply draft preview ready",
                      status: "success",
                    });
                    return;
                  }
                }
              }
            }
          }
        }

        if (assistantIntent === "calendar_action") {
          systemPrompt =
            systemPrompt +
            "\n\n---\n\n## ACTIVE CALENDAR ACTION INTENT\n\n" +
            "The intent planner classified this request as **calendar_action**. " +
            "If the prompt includes attendee, date, time, duration, and subject, call `createOutlookCalendarInvite`. " +
            "Use `confirmed: false` for an initial preview. Use `confirmed: true` only when the user has already confirmed the exact invite details in the current turn or previous conversation context. " +
            "If required details are missing, ask for the exact missing fields and do not claim the invite was sent. " +
            "Never say an invite was created, sent, or will be sent unless `createOutlookCalendarInvite` actually returns success. " +
            "Use `getPeopleAndRoles` only when project context is available or the user asks for a project team contact.";

          toolTrace.push({
            tool: "calendarActionIntentRouter",
            input: {
              intent: assistantIntent,
              message: lastUserContent.slice(0, 240),
            },
            output: {
              injectedCalendarActionOverride: true,
            },
            timestamp: new Date().toISOString(),
          });

          const parsedInvite = parseCalendarInviteRequest(lastUserContent);
          const calendarInviteTool = (tools as Record<string, ExecutableTool>).createOutlookCalendarInvite;
          if (parsedInvite && calendarInviteTool?.execute) {
            const resolvedAttendeeEmail =
              parsedInvite.attendeeEmail ??
              await resolveCalendarAttendeeEmailByName(parsedInvite.attendeeName);

            if (!resolvedAttendeeEmail) {
              toolTrace.push({
                tool: "calendarActionFastPath",
                input: {
                  organizerEmail: parsedInvite.organizerEmail ?? null,
                  attendeeName: parsedInvite.attendeeName ?? null,
                  subject: parsedInvite.subject,
                  startDateTime: parsedInvite.startDateTime,
                  endDateTime: parsedInvite.endDateTime,
                  confirmed: parsedInvite.confirmed,
                },
                output: {
                  success: false,
                  preview: false,
                  error: "Could not resolve attendee email from the people directory.",
                },
                timestamp: new Date().toISOString(),
              });
              const content = [
                "I need the attendee email before I can create the Outlook calendar invite. Nothing was sent.",
                "",
                `Subject: ${parsedInvite.subject}`,
                parsedInvite.attendeeName ? `Attendee name: ${parsedInvite.attendeeName}` : null,
                `Start: ${parsedInvite.startDateTime} ${parsedInvite.timeZone}`,
                `End: ${parsedInvite.endDateTime} ${parsedInvite.timeZone}`,
              ].filter(Boolean).join("\n");
              await writeTextResponse(writer, "calendar-action-fast-path", content);
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
              return;
            }

            writeStrategistStatus(writer, {
              stage: "actions",
              message: parsedInvite.confirmed
                ? "Creating confirmed Outlook calendar invite"
                : "Preparing Outlook calendar invite preview",
              status: "loading",
            });

            const inviteOutput = await withTimeout(
              calendarInviteTool.execute({
                organizerEmail: parsedInvite.organizerEmail,
                subject: parsedInvite.subject,
                body: parsedInvite.body,
                startDateTime: parsedInvite.startDateTime,
                endDateTime: parsedInvite.endDateTime,
                timeZone: parsedInvite.timeZone,
                location: parsedInvite.location,
                attendees: [
                  {
                    email: resolvedAttendeeEmail,
                    name: parsedInvite.attendeeName,
                    type: "required",
                  },
                ],
                isOnlineMeeting: parsedInvite.isOnlineMeeting,
                confirmed: parsedInvite.confirmed,
              }),
              20_000,
              "createOutlookCalendarInvite timed out during calendar fast path",
            );

            if (!isTimeoutResult(inviteOutput)) {
              const outputRecord = isRecord(inviteOutput) ? inviteOutput : {};
              const success = outputRecord.success === true;
              const preview = outputRecord.action === "preview";
              const error = stringValue(outputRecord.error);
              const eventId = stringValue(outputRecord.outlookEventId);
              const webLink = stringValue(outputRecord.outlookWebLink);
              const teamsJoinUrl = stringValue(outputRecord.teamsJoinUrl);
              toolTrace.push({
                tool: "calendarActionFastPath",
                input: {
                  organizerEmail: parsedInvite.organizerEmail ?? null,
                  attendeeEmail: resolvedAttendeeEmail,
                  attendeeName: parsedInvite.attendeeName ?? null,
                  subject: parsedInvite.subject,
                  startDateTime: parsedInvite.startDateTime,
                  endDateTime: parsedInvite.endDateTime,
                  confirmed: parsedInvite.confirmed,
                },
                output: {
                  success,
                  preview,
                  eventId,
                  hasWebLink: Boolean(webLink),
                  hasTeamsJoinUrl: Boolean(teamsJoinUrl),
                  error,
                },
                timestamp: new Date().toISOString(),
              });

              const content = success
                ? [
                    "Outlook calendar invite created and sent.",
                    "",
                    `Subject: ${parsedInvite.subject}`,
                    `Organizer: ${parsedInvite.organizerEmail ?? stringValue(outputRecord.organizerEmail) ?? "configured Outlook calendar user"}`,
                    `Attendee: ${parsedInvite.attendeeName ? `${parsedInvite.attendeeName} <${resolvedAttendeeEmail}>` : resolvedAttendeeEmail}`,
                    `Start: ${parsedInvite.startDateTime} ${parsedInvite.timeZone}`,
                    `End: ${parsedInvite.endDateTime} ${parsedInvite.timeZone}`,
                    webLink ? `Outlook link: ${webLink}` : null,
                    teamsJoinUrl ? `Teams link: ${teamsJoinUrl}` : null,
                  ].filter(Boolean).join("\n")
                : preview
                  ? [
                      "Outlook calendar invite preview is ready. Nothing has been sent yet.",
                      "",
                      `Subject: ${parsedInvite.subject}`,
                      `Attendee: ${parsedInvite.attendeeName ? `${parsedInvite.attendeeName} <${resolvedAttendeeEmail}>` : resolvedAttendeeEmail}`,
                      `Start: ${parsedInvite.startDateTime} ${parsedInvite.timeZone}`,
                      `End: ${parsedInvite.endDateTime} ${parsedInvite.timeZone}`,
                      "",
                      "Reply **confirm** to create and send it.",
                    ].join("\n")
                  : [
                      "I could not create the Outlook calendar invite. Nothing was sent.",
                      error ? `Error: ${error}` : "The calendar tool returned no success response.",
                    ].join("\n");

              await writeTextResponse(writer, "calendar-action-fast-path", content);
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
                message: success
                  ? "Outlook calendar invite sent"
                  : preview
                    ? "Outlook calendar invite preview ready"
                    : "Outlook calendar invite blocked",
                status: success || preview ? "success" : "warning",
              });
              return;
            }
          }
        }

        let resolvedTarget: Awaited<ReturnType<typeof resolveIntelligenceTarget>> | null = null;
        if (shouldUsePacketFirstIntent(assistantIntent)) {
          writeStrategistStatus(writer, {
            stage: "knowledge",
            message: "Checking current project intelligence packet",
            status: "loading",
          });

          resolvedTarget = await resolveIntelligenceTarget({
            query: lastUserContent,
            selectedProjectId,
            supabase,
          });
          const deepAgentProjectId =
            selectedProjectId ?? resolvedTarget?.projectId ?? null;

          if (
            shouldUseDeepAgentProjectStatusBridge({
              intent: assistantIntent,
              projectId: deepAgentProjectId,
            })
          ) {
            writeStrategistStatus(writer, {
              stage: "knowledge",
              message: "Checking backend Deep Agents project-status packet",
              status: "loading",
            });

            try {
              const deepAgentPacket = await fetchDeepAgentProjectStatus({
                userId: user.id,
                projectId: deepAgentProjectId!,
                sessionId,
                question: lastUserContent,
              });
              const deepAgentContext = formatDeepAgentProjectStatusContext(deepAgentPacket);
              const deepAgentWidget = buildDeepAgentSourceEvidenceWidget(deepAgentPacket);
              const deepAgentDataParts = deepAgentWidget
                ? writeAssistantWidgetParts(writer, [deepAgentWidget])
                : [];

              systemPrompt = `${systemPrompt}\n\n---\n\n${deepAgentContext}`;
              toolTrace.push({
                tool: "backendDeepAgentProjectStatus",
                input: {
                  intent: assistantIntent,
                  query: lastUserContent.slice(0, 240),
                  selectedProjectId,
                  resolvedProjectId: resolvedTarget?.projectId ?? null,
                },
                output: {
                  mode: deepAgentPacket.mode,
                  confidence: deepAgentPacket.confidence,
                  sourceCount: deepAgentPacket.sourcesChecked.length,
                  evidenceCount: deepAgentPacket.evidence.length,
                  dataPartCount: deepAgentDataParts.length,
                  runtimeTrace: deepAgentPacket.toolTrace.find(
                    (item) => item.tool === "deepagents_runtime",
                  ) ?? null,
                },
                timestamp: new Date().toISOString(),
              });
              writeStrategistStatus(writer, {
                stage: "knowledge",
                message: "Loaded backend Deep Agents project-status packet",
                status: deepAgentPacket.mode === "deep_agents" ? "success" : "warning",
              });
            } catch (error) {
              const detail = error instanceof Error ? error.message : String(error);
              toolTrace.push({
                tool: "backendDeepAgentProjectStatus",
                input: {
                  intent: assistantIntent,
                  query: lastUserContent.slice(0, 240),
                  selectedProjectId,
                  resolvedProjectId: resolvedTarget?.projectId ?? null,
                },
                error: detail,
                timestamp: new Date().toISOString(),
              });
              writeStrategistStatus(writer, {
                stage: "knowledge",
                message: "Backend Deep Agents packet unavailable; falling back to current packet/tools",
                status: "warning",
              });
            }
          } else if (
            shouldUseDeepAgentExecutiveBridge({
              intent: assistantIntent,
              projectId: deepAgentProjectId,
            })
          ) {
            writeStrategistStatus(writer, {
              stage: "knowledge",
              message: "Checking backend Deep Agents executive packet",
              status: "loading",
            });

            try {
              const deepAgentPacket = await fetchDeepAgentExecutiveBriefing({
                userId: user.id,
                sessionId,
                question: lastUserContent,
              });
              const deepAgentContext = formatDeepAgentExecutiveBriefingContext(deepAgentPacket);
              const deepAgentWidget = buildDeepAgentExecutiveEvidenceWidget(deepAgentPacket);
              const deepAgentDataParts = deepAgentWidget
                ? writeAssistantWidgetParts(writer, [deepAgentWidget])
                : [];

              systemPrompt = `${systemPrompt}\n\n---\n\n${deepAgentContext}`;
              toolTrace.push({
                tool: "backendDeepAgentExecutiveBriefing",
                input: {
                  intent: assistantIntent,
                  query: lastUserContent.slice(0, 240),
                  selectedProjectId,
                  resolvedProjectId: resolvedTarget?.projectId ?? null,
                },
                output: {
                  mode: deepAgentPacket.mode,
                  confidence: deepAgentPacket.confidence,
                  sourceCount: deepAgentPacket.sourcesChecked.length,
                  evidenceCount: deepAgentPacket.evidence.length,
                  dataPartCount: deepAgentDataParts.length,
                  runtimeTrace: deepAgentPacket.toolTrace.find(
                    (item) => item.tool === "deepagents_runtime",
                  ) ?? null,
                },
                timestamp: new Date().toISOString(),
              });
              writeStrategistStatus(writer, {
                stage: "knowledge",
                message: "Loaded backend Deep Agents executive packet",
                status: deepAgentPacket.mode === "deep_agents" ? "success" : "warning",
              });
            } catch (error) {
              const detail = error instanceof Error ? error.message : String(error);
              toolTrace.push({
                tool: "backendDeepAgentExecutiveBriefing",
                input: {
                  intent: assistantIntent,
                  query: lastUserContent.slice(0, 240),
                  selectedProjectId,
                  resolvedProjectId: resolvedTarget?.projectId ?? null,
                },
                error: detail,
                timestamp: new Date().toISOString(),
              });
              writeStrategistStatus(writer, {
                stage: "knowledge",
                message: "Backend Deep Agents executive packet unavailable; falling back to current tools",
                status: "warning",
              });
            }
          }

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

            const operatingSummaryContext = usablePacket
              ? formatSyncedOperatingPacketContext(usablePacket)
              : null;

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
                operatingSummaryLoaded: Boolean(operatingSummaryContext),
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

            systemPrompt = systemPrompt + `\n\n---\n\n${packetContextHeader}\n\n${packetContent}`;

            if (operatingSummaryContext) {
              systemPrompt =
                systemPrompt +
                `\n\n---\n\n# Current Project Operating Summary\n\nUse this structured operating summary and source-coverage map before relying on older card evidence. It exists specifically to prevent project-status answers from ignoring available source categories such as tasks, project controls, Acumatica, RFIs, submittals, drawings, specifications, daily reports, meetings, emails, Teams, and documents.\n\n${operatingSummaryContext}`;
            }

            writeStrategistStatus(writer, {
              stage: "knowledge",
              message: operatingSummaryContext
                ? "Loaded project intelligence packet and operating summary — synthesizing strategist response"
                : "Loaded project intelligence packet — synthesizing strategist response",
              status: "success",
            });
            // Fall through to streamText so the model can reason on top of the packet.
          }
        }


        const streamingModelToolsEnabled = shouldEnableStreamingModelTools(providerDecision);
        // Disable tools when source_lookup context is already injected — the
        // model should synthesize from the loaded sources, not call more tools.
        const sourceLookupContextInjected =
          assistantIntent === "source_lookup" &&
          !shouldKeepModelToolsForSourceLookup(messageDrivenToolNames);
        const conciseOwnerBriefingIntent = [
          "latest_status",
          "risk_review",
          "target_briefing",
        ].includes(assistantIntent);
        const shouldLoadMcpTools = !GENERIC_MCP_SKIP_INTENTS.has(assistantIntent);
        const mcpToolBundle = shouldLoadMcpTools
          ? await createAiAssistantMcpTools()
          : { tools: {}, trace: [], close: async () => {} };
        Object.assign(tools, mcpToolBundle.tools);
        toolTrace.push(...mcpToolBundle.trace);
        if (!shouldLoadMcpTools) {
          toolTrace.push({
            tool: "mcpToolDiscoverySkipped",
            input: {
              intent: assistantIntent,
              message: lastUserContent.slice(0, 240),
            },
            output: {
              reason:
                "Known local tools or injected source context cover this route; skipping generic MCP discovery for latency.",
            },
            timestamp: new Date().toISOString(),
          });
        }

        let mcpToolsClosed = false;
        const closeAiAssistantMcpTools = async () => {
          if (mcpToolsClosed) return;
          mcpToolsClosed = true;
          await mcpToolBundle.close();
        };

        const scopedTools = getScopedToolsForIntent(
          tools as ToolSet,
          assistantIntent,
          messageDrivenToolNames,
        );
        const scopedToolNames = Object.keys(scopedTools);
        const modelTools =
          streamingModelToolsEnabled && !sourceLookupContextInjected
            ? scopedTools
            : undefined;
        const forcedCalendarInviteTool =
          modelTools?.createOutlookCalendarInvite &&
          shouldForceCalendarInviteTool(lastUserContent, assistantIntent)
            ? { type: "tool" as const, toolName: "createOutlookCalendarInvite" as const }
            : undefined;
        const forcedMessageToolName =
          forcedCalendarInviteTool || assistantIntent === "email_action"
            ? undefined
            : pickForcedMessageToolName(modelTools, messageDrivenToolNames);
        const forcedMessageTool = forcedMessageToolName
          ? { type: "tool" as const, toolName: forcedMessageToolName }
          : undefined;
        const toolChoice = forcedCalendarInviteTool ?? forcedMessageTool;
        const streamMaxOutputTokens =
          assistantIntent === "email_action"
            ? 1200
            : conciseOwnerBriefingIntent
              ? 2400
              : 4000;
        const streamMaxSteps =
          assistantIntent === "email_action"
            ? 5
            : conciseOwnerBriefingIntent
              ? 6
              : 10;
        if (conciseOwnerBriefingIntent) {
          systemPrompt +=
            "\n\n# Owner Briefing Shape\nAnswer like a construction owner asked between calls: concise, specific, and decision-oriented. Lead with the answer, then group evidence under short sections for what changed, risks, and first actions. Do not end with generic optional offers.";
        }
        const modelToolNames = modelTools ? Object.keys(modelTools) : [];
        const promptTelemetry = {
          promptMode,
          systemPromptChars: systemPrompt.length,
          systemPromptApproxTokens: getApproxTokenCount(systemPrompt),
          messageCount: modelMessages.length,
          fullToolCount: Object.keys(tools).length,
          scopedToolCount: scopedToolNames.length,
          modelToolCount: modelToolNames.length,
          modelToolNames,
        };
        if (isTaskWriteIntent) {
          assertTaskWritePromptBudget({
            promptApproxTokens: promptTelemetry.systemPromptApproxTokens,
            modelToolCount: promptTelemetry.modelToolCount,
          });
        }
        toolTrace.push({
          tool: "streamingToolPolicy",
          input: {
            providerPath: providerDecision.providerPath,
            modelId: providerDecision.modelId,
          },
          output: {
            streamingModelToolsEnabled,
            sourceLookupContextInjected,
            promptMode,
            fullToolCount: promptTelemetry.fullToolCount,
            scopedToolCount: promptTelemetry.scopedToolCount,
            modelToolCount: promptTelemetry.modelToolCount,
            modelToolNames: promptTelemetry.modelToolNames,
            toolChoice: toolChoice ?? "auto",
            streamMaxOutputTokens,
            streamMaxSteps,
            reason: sourceLookupContextInjected
              ? "tools disabled: source_lookup context pre-loaded"
              : providerDecision.reason,
          },
          timestamp: new Date().toISOString(),
        });
        logSystemPromptTokensInDev(systemPrompt, "chat-handler");
        const promptPayload = buildAiSdkPromptPayload({
          where: "ai-assistant-chat",
          systemPrompt,
          messages: modelMessages,
          tools: modelTools,
        });

        // Populated by onFinish; used for Langfuse trace after persistence.
        let rawFinishUsage: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } | undefined;
        let rawStepCount = 0;

        let result: ReturnType<typeof streamText>;
        try {
          result = streamText({
            model: getLanguageModel(activeModel),
            ...promptPayload,
            toolChoice,
            maxOutputTokens: streamMaxOutputTokens,
            timeout: {
              totalMs: 90_000,
              stepMs: 45_000,
              chunkMs: 45_000,
            },
            stopWhen: stepCountIs(streamMaxSteps),
            experimental_telemetry: {
              isEnabled: process.env.PHOENIX_TRACING === "true",
              functionId: "ai-assistant-chat",
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
            onFinish: ({ usage: finishUsage, steps }) => {
              // Capture raw step/usage data for the post-persist trace below.
              // We do NOT trace here because `text` may be empty (tool-only
              // first attempt) — the actual final content (after retry) is
              // captured after persistAssistantMessage.
              rawFinishUsage = finishUsage;
              rawStepCount = steps?.length ?? 0;
            },
          });
        } catch (streamStartError) {
          await closeAiAssistantMcpTools();
          throw streamStartError;
        }

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
        let finalContentSource:
          | "primary"
          | "retry"
          | "tool_only"
          | "action_tool_missing" = "primary";
        try {
          content = (await result.text).trim();
          totalUsage = await result.totalUsage;
          // Cache observability: log every turn so we can verify the prompt
          // prefix fix is producing OpenAI cache hits. Look for cacheHitRatio
          // > 0 on turn 2+ of any session. If it stays 0, the static prefix
          // is being polluted somewhere upstream.
          if (totalUsage) {
            const cached = totalUsage.cachedInputTokens ?? 0;
            const input = totalUsage.inputTokens ?? 0;
            const ratio = input > 0 ? cached / input : 0;
            console.info("[chat/route] cache stats", {
              sessionId,
              modelId: activeModel,
              inputTokens: input,
              cachedInputTokens: cached,
              cacheHitRatio: Number(ratio.toFixed(3)),
              outputTokens: totalUsage.outputTokens ?? 0,
            });
          }
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

        const taskWriteMutationToolCallNames = stepDiagnostics
          .flatMap((s) => s.toolCallNames ?? [])
          .filter((name) => TASK_WRITE_MUTATION_TOOL_NAMES.has(name));
        const actionToolCallNames = stepDiagnostics
          .flatMap((s) => s.toolCallNames ?? [])
          .filter((name) =>
            assistantIntent === "email_action"
              ? name === "draftOutlookEmail"
              : assistantIntent === "calendar_action"
                ? name === "createOutlookCalendarInvite"
                : false,
          );
        if (
          !content &&
          assistantIntent === "task_write" &&
          taskWriteMutationToolCallNames.length > 0 &&
          !streamErrorMessage
        ) {
          content = [
            "Task preview ready.",
            "",
            `I staged this from your request: "${lastUserContent.trim()}".`,
            "",
            "Not created yet. Review the preview card, then reply **confirm** to create it or tell me what to change.",
          ].join("\n");
          finalContentSource = "tool_only";
          toolTrace.push({
            tool: "taskWriteToolOnlyCompletion",
            input: {
              intent: assistantIntent,
              primaryModel: activeModel,
            },
            output: {
              suppressedNoToolRetry: true,
              toolCallNames: taskWriteMutationToolCallNames,
              contentLength: content.length,
            },
            timestamp: new Date().toISOString(),
          });
          await writeTextResponse(writer, "task-write-tool-only-completion", content);
        }

        if (
          !content &&
          (assistantIntent === "email_action" || assistantIntent === "calendar_action") &&
          actionToolCallNames.length === 0 &&
          !streamErrorMessage
        ) {
          content =
            assistantIntent === "calendar_action"
              ? "I could not create the Outlook calendar invite because the required calendar tool did not run. Nothing was sent. Please try again or provide the exact attendee, date, time, duration, and subject."
              : "I could not prepare the Outlook email draft because the required email draft tool did not run. Nothing was saved or sent. Please try again or specify the email thread to use.";
          finalContentSource = "action_tool_missing";
          toolTrace.push({
            tool: "actionToolMissingGuard",
            input: {
              intent: assistantIntent,
              primaryModel: activeModel,
            },
            output: {
              suppressedNoToolRetry: true,
              expectedTool:
                assistantIntent === "calendar_action"
                  ? "createOutlookCalendarInvite"
                  : "draftOutlookEmail",
              contentLength: content.length,
            },
            timestamp: new Date().toISOString(),
          });
          await writeTextResponse(writer, "action-tool-missing-guard", content);
        }

        if (!content) {
          const cause = streamErrorMessage
            ? `The model stream reported: ${streamErrorMessage}`
            : "The model/tool run completed without returning final assistant text.";
          // No-tool retry: if streamText produced empty text (AI Gateway tool-call
          // bug), retry with generateText() + no tools before escalating to recovery response.
          let noToolRetryContent: string | null = null;
          {
            try {
              const retryResult = await generateText({
                model: getLanguageModel("openai/gpt-4.1"),
                system: systemPrompt,
                messages: modelMessages,
                maxOutputTokens: 4000,
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
            noToolRetryContent ??
            (await generateRecoveryResponse({
              userMessage: lastUserContent,
              cause,
              selectedProjectId,
              modelId: activeModel,
              toolTrace,
            }));
          if (
            content.length < 150 &&
            /\bdecisions?\b.{0,80}\b(holding up|waiting on me|need(ed)? from me|my sign[- ]?off)\b/i.test(
              lastUserContent,
            )
          ) {
            content = [
              "I checked the open action and decision signals for items that may be waiting on you.",
              "",
              "The structured decision/action lookup ran, but the model returned an incomplete short response instead of a full briefing. Treat this as a routing/synthesis issue, not as proof that nothing is pending.",
              "",
              "What I would do next: review open owner action items, RFIs, and submittals for anything marked pending, waiting, approval, decision, or sign-off before telling the team you are clear.",
            ].join("\n");
          }
          finalContentSource = noToolRetryContent ? "retry" : "primary";

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
                  maxOutputTokens: 4000,
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
	                  finalContentSource = "retry";
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

        await closeAiAssistantMcpTools();

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

        // Trace the ACTUAL final response (after retries) so Langfuse
        // reflects what the user received, not the tool-only first attempt.
        const toolCallNames = stepDiagnostics.flatMap((s) => s.toolCallNames ?? []);
        const wasRetried = toolTrace.some(
          (t) => t.tool === "noToolRetry" || t.tool === "metaCommentaryRetry",
        );
        const retryEntry = toolTrace.find(
          (t) => t.tool === "noToolRetry" || t.tool === "metaCommentaryRetry",
        );
        waitUntil(traceChatCompletion({
          userId: user.id,
          sessionId,
          modelId: activeModel,
          input: lastUserContent,
          output: content,
          usage: rawFinishUsage ?? totalUsage,
          intent: assistantIntent ?? "unknown",
          qualityScore: responseQuality.score,
          qualityReasons: responseQuality.reasons,
          wasRetried,
          retryReason: wasRetried
            ? (retryEntry?.input as Record<string, unknown>)?.reason as string | undefined
            : undefined,
          stepCount: rawStepCount || stepDiagnostics.length,
          toolCallNames,
          selectedProjectId: selectedProjectId ?? null,
          metadata: {
            ...promptTelemetry,
            outputChars: content.length,
            finalContentSource,
          },
        }));
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

    return createUIMessageStreamResponse({
      stream,
      consumeSseStream: consumeStream,
    });
}
