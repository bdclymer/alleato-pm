import { z } from "zod";

import {
  AI_CALL_POLICY,
  fetchWithGuardrails,
} from "@/lib/fetch-with-guardrails";
import { GuardrailError } from "@/lib/guardrails/errors";
import type {
  AssistantWidgetPayload,
  SourceEvidenceItem,
} from "@/lib/ai/assistant-widgets";
import type { AssistantIntent } from "@/lib/ai/intent-router";

const WHERE = "ai-assistant.deep-agent-project-status";
const EXECUTIVE_WHERE = "ai-assistant.deep-agent-executive-briefing";

const confidenceSchema = z.enum(["high", "medium", "low"]);

const sourceCoverageSchema = z.object({
  sourceType: z.string(),
  status: z.enum(["checked", "missing", "stale", "failed"]),
  recordCount: z.number(),
  latestSourceAt: z.string().nullable().optional(),
  notes: z.string(),
});

const evidenceSchema = z.object({
  sourceType: z.string(),
  sourceId: z.string(),
  title: z.string(),
  excerpt: z.string(),
  occurredAt: z.string().nullable().optional(),
  confidence: confidenceSchema,
});

const recommendedActionSchema = z.object({
  label: z.string(),
  ownerRole: z.string(),
  reason: z.string(),
  sourceId: z.string().nullable().optional(),
});

const toolTraceSchema = z.object({
  agent: z.string(),
  tool: z.string(),
  status: z.enum(["success", "failed", "skipped"]),
  durationMs: z.number(),
  detail: z.string().nullable().optional(),
});

export const deepProjectIntelligenceResponseSchema = z.object({
  answer: z.string(),
  confidence: confidenceSchema,
  intent: z.literal("project_status_risk"),
  project: z.object({
    id: z.number(),
    name: z.string(),
  }),
  sourcesChecked: z.array(sourceCoverageSchema),
  evidence: z.array(evidenceSchema),
  recommendedActions: z.array(recommendedActionSchema),
  toolTrace: z.array(toolTraceSchema),
  memoryCandidates: z.array(
    z.object({
      scope: z.enum(["user", "project", "organization"]),
      fact: z.string(),
      requiresApproval: z.boolean(),
    }),
  ),
  orchestrator: z.string(),
  mode: z.enum(["contract_spike", "deep_agents"]),
});

export type DeepProjectIntelligenceResponse = z.infer<
  typeof deepProjectIntelligenceResponseSchema
>;

export const deepExecutiveIntelligenceResponseSchema = z.object({
  answer: z.string(),
  confidence: confidenceSchema,
  intent: z.literal("business_briefing"),
  organization: z.object({
    name: z.string(),
  }),
  sourcesChecked: z.array(sourceCoverageSchema),
  evidence: z.array(evidenceSchema),
  recommendedActions: z.array(recommendedActionSchema),
  toolTrace: z.array(toolTraceSchema),
  memoryCandidates: z.array(
    z.object({
      scope: z.enum(["user", "project", "organization"]),
      fact: z.string(),
      requiresApproval: z.boolean(),
    }),
  ),
  orchestrator: z.string(),
  mode: z.enum(["contract_spike", "deep_agents"]),
});

export type DeepExecutiveIntelligenceResponse = z.infer<
  typeof deepExecutiveIntelligenceResponseSchema
>;

export type DeepAgentProjectStatusRequest = {
  userId: string;
  projectId: number;
  sessionId?: string | null;
  question: string;
};

export type DeepAgentExecutiveBriefingRequest = {
  userId: string;
  sessionId?: string | null;
  question: string;
};

const DEEP_AGENT_PROJECT_CONTEXT_INTENTS = new Set<AssistantIntent>([
  "target_briefing",
  "latest_status",
  "risk_review",
  "financial_analysis",
  "change_management_review",
  "decision_lookup",
  "task_followup",
  "implementation_planning",
]);

const DEEP_AGENT_EXECUTIVE_CONTEXT_INTENTS = new Set<AssistantIntent>([
  "latest_status",
  "risk_review",
  "financial_analysis",
  "decision_lookup",
  "task_followup",
  "implementation_planning",
]);

export function isDeepAgentProjectStatusBridgeEnabled(): boolean {
  return process.env.AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED === "true";
}

export function shouldUseDeepAgentProjectStatusBridge(params: {
  intent: AssistantIntent;
  projectId?: number | null;
  selectedProjectId?: number | null;
}): boolean {
  const projectId = params.projectId ?? params.selectedProjectId;
  return (
    isDeepAgentProjectStatusBridgeEnabled() &&
    typeof projectId === "number" &&
    DEEP_AGENT_PROJECT_CONTEXT_INTENTS.has(params.intent)
  );
}

export function shouldUseDeepAgentExecutiveBridge(params: {
  intent: AssistantIntent;
  projectId?: number | null;
  selectedProjectId?: number | null;
}): boolean {
  const projectId = params.projectId ?? params.selectedProjectId;
  return (
    isDeepAgentProjectStatusBridgeEnabled() &&
    typeof projectId !== "number" &&
    DEEP_AGENT_EXECUTIVE_CONTEXT_INTENTS.has(params.intent)
  );
}

function getBackendUrl(): string {
  const rawUrl = (
    process.env.BACKEND_URL ||
    process.env.PYTHON_BACKEND_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "")
  )
    .replace(/\/+$/, "")
    .trim();

  try {
    new URL(rawUrl);
  } catch {
    throw new GuardrailError({
      code: "MISSING_ENV_VAR",
      where: WHERE,
      message:
        "Missing or invalid backend URL. Set BACKEND_URL or PYTHON_BACKEND_URL before enabling the Deep Agents bridge.",
      details: {
        BACKEND_URL: process.env.BACKEND_URL,
        PYTHON_BACKEND_URL: process.env.PYTHON_BACKEND_URL,
      },
      status: 503,
    });
  }

  return rawUrl;
}

function getBackendAdminApiKey(): string {
  const apiKey = process.env.ADMIN_API_KEY?.trim();
  if (!apiKey) {
    throw new GuardrailError({
      code: "MISSING_ENV_VAR",
      where: WHERE,
      message:
        "ADMIN_API_KEY is required to call the backend Deep Agents project-status endpoint.",
      status: 503,
    });
  }
  return apiKey;
}

export async function fetchDeepAgentProjectStatus(
  params: DeepAgentProjectStatusRequest,
): Promise<DeepProjectIntelligenceResponse> {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Admin-Api-Key": getBackendAdminApiKey(),
  });

  const response = await fetchWithGuardrails(
    `${getBackendUrl()}/api/intelligence/deep-agent/project-status`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: params.userId,
        projectId: params.projectId,
        sessionId: params.sessionId ?? undefined,
        question: params.question,
        mode: "project_status_risk",
      }),
      requestId:
        params.sessionId ?? `deep-agent-project-status-${params.projectId}`,
      where: WHERE,
      dependency: "backend.deep-agent-project-status",
      timeoutMs: AI_CALL_POLICY.timeoutMs,
      retries: 0,
      backoffMs: AI_CALL_POLICY.backoffMs,
    },
  );

  const json = await response.json();
  return deepProjectIntelligenceResponseSchema.parse(json);
}

export async function fetchDeepAgentExecutiveBriefing(
  params: DeepAgentExecutiveBriefingRequest,
): Promise<DeepExecutiveIntelligenceResponse> {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Admin-Api-Key": getBackendAdminApiKey(),
  });

  const response = await fetchWithGuardrails(
    `${getBackendUrl()}/api/intelligence/deep-agent/executive-briefing`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: params.userId,
        sessionId: params.sessionId ?? undefined,
        question: params.question,
        mode: "business_briefing",
      }),
      requestId: params.sessionId ?? "deep-agent-executive-briefing",
      where: EXECUTIVE_WHERE,
      dependency: "backend.deep-agent-executive-briefing",
      timeoutMs: AI_CALL_POLICY.timeoutMs,
      retries: 0,
      backoffMs: AI_CALL_POLICY.backoffMs,
    },
  );

  const json = await response.json();
  return deepExecutiveIntelligenceResponseSchema.parse(json);
}

export function formatDeepAgentProjectStatusContext(
  packet: DeepProjectIntelligenceResponse,
): string {
  const sourceLines = packet.sourcesChecked.map((source) => {
    const latest = source.latestSourceAt
      ? ` latest=${source.latestSourceAt}`
      : "";
    return `- ${source.sourceType}: ${source.status}, records=${source.recordCount}.${latest} ${source.notes}`;
  });
  const evidenceLines = packet.evidence.slice(0, 8).map((item) => {
    const occurred = item.occurredAt ? ` (${item.occurredAt})` : "";
    return `- [${item.sourceType}] ${item.title}${occurred}: ${item.excerpt}`;
  });
  const actionLines = packet.recommendedActions.slice(0, 5).map((action) => {
    return `- ${action.label} (${action.ownerRole}): ${action.reason}`;
  });

  return [
    "# Backend Deep Agents Project Status Packet",
    "",
    `Mode: ${packet.mode}`,
    `Project: ${packet.project.name} (${packet.project.id})`,
    `Confidence: ${packet.confidence}`,
    "",
    "Backend synthesis:",
    packet.answer,
    "",
    "Source coverage:",
    ...sourceLines,
    "",
    "Evidence:",
    ...(evidenceLines.length > 0
      ? evidenceLines
      : ["- No evidence rows were returned."]),
    "",
    "Recommended actions:",
    ...(actionLines.length > 0
      ? actionLines
      : ["- No recommended actions were returned."]),
    "",
    "Use this packet as checked backend context. Do not claim missing or failed source categories were available.",
  ].join("\n");
}

export function formatDeepAgentExecutiveBriefingContext(
  packet: DeepExecutiveIntelligenceResponse,
): string {
  const sourceLines = packet.sourcesChecked.map((source) => {
    const latest = source.latestSourceAt
      ? ` latest=${source.latestSourceAt}`
      : "";
    return `- ${source.sourceType}: ${source.status}, records=${source.recordCount}.${latest} ${source.notes}`;
  });
  const evidenceLines = packet.evidence.slice(0, 10).map((item) => {
    const occurred = item.occurredAt ? ` (${item.occurredAt})` : "";
    return `- [${item.sourceType}] ${item.title}${occurred}: ${item.excerpt}`;
  });
  const actionLines = packet.recommendedActions.slice(0, 6).map((action) => {
    return `- ${action.label} (${action.ownerRole}): ${action.reason}`;
  });

  return [
    "# Backend Deep Agents Executive Briefing Packet",
    "",
    `Mode: ${packet.mode}`,
    `Organization: ${packet.organization.name}`,
    `Confidence: ${packet.confidence}`,
    "",
    "Backend synthesis:",
    packet.answer,
    "",
    "Source coverage:",
    ...sourceLines,
    "",
    "Evidence:",
    ...(evidenceLines.length > 0
      ? evidenceLines
      : ["- No evidence rows were returned."]),
    "",
    "Recommended actions:",
    ...(actionLines.length > 0
      ? actionLines
      : ["- No recommended actions were returned."]),
    "",
    "Use this packet as checked business-wide backend context.",
    "Do not claim missing or failed source categories were available.",
    "Do not claim email, calendar, task, or project writes were completed unless a deterministic action tool did that work.",
  ].join("\n");
}

export function shouldUseDeepAgentExecutiveDirectResponse(
  packet: DeepExecutiveIntelligenceResponse,
): boolean {
  return (
    packet.mode === "deep_agents" &&
    packet.answer.trim().length >= 80 &&
    packet.toolTrace.some(
      (item) => item.tool === "deepagents_runtime" && item.status === "success",
    )
  );
}

export function shouldUseDeepAgentProjectDirectResponse(
  packet: DeepProjectIntelligenceResponse,
): boolean {
  return (
    packet.mode === "deep_agents" &&
    packet.answer.trim().length >= 80 &&
    packet.toolTrace.some(
      (item) => item.tool === "deepagents_runtime" && item.status === "success",
    )
  );
}

export function formatDeepAgentProjectDirectResponse(
  packet: DeepProjectIntelligenceResponse,
): string {
  const answer = packet.answer.trim();
  const sourceGaps = packet.sourcesChecked.filter(
    (source) =>
      source.status === "missing" ||
      source.status === "failed" ||
      source.status === "stale",
  );

  if (sourceGaps.length === 0) {
    return answer;
  }

  const gapSummary = sourceGaps
    .slice(0, 4)
    .map((source) => `${source.sourceType}: ${source.status}`)
    .join("; ");

  return [
    answer,
    "",
    `Source coverage note: ${gapSummary}. I did not use unavailable or stale source categories as factual support.`,
  ].join("\n");
}

export function formatDeepAgentExecutiveDirectResponse(
  packet: DeepExecutiveIntelligenceResponse,
): string {
  const answer = packet.answer.trim();
  const sourceGaps = packet.sourcesChecked.filter(
    (source) =>
      source.status === "missing" ||
      source.status === "failed" ||
      source.status === "stale",
  );

  if (sourceGaps.length === 0) {
    return answer;
  }

  const gapSummary = sourceGaps
    .slice(0, 4)
    .map((source) => `${source.sourceType}: ${source.status}`)
    .join("; ");

  return [
    answer,
    "",
    `Source coverage note: ${gapSummary}. I did not use unavailable or stale source categories as factual support.`,
  ].join("\n");
}

function mapSourceType(sourceType: string): SourceEvidenceItem["sourceType"] {
  switch (sourceType) {
    case "meetings":
    case "meeting":
      return "meeting";
    case "emails":
    case "email":
      return "email";
    case "teams":
      return "teams";
    case "documents":
    case "document":
      return "document";
    case "financials":
      return "accounting";
    case "tasks":
    case "executive_briefing":
    case "projects":
      return "project_record";
    case "packet":
    case "schedule":
    case "rfis":
    case "submittals":
      return "project_record";
    default:
      return "knowledge";
  }
}

export function buildDeepAgentSourceEvidenceWidget(
  packet: DeepProjectIntelligenceResponse,
): AssistantWidgetPayload | null {
  if (packet.evidence.length === 0) return null;

  return {
    type: "source_evidence_drawer",
    id: "deep-agent-project-status-evidence",
    title: `${packet.project.name} source coverage`,
    sources: packet.evidence.slice(0, 8).map(
      (item): SourceEvidenceItem => ({
        id: item.sourceId,
        title: item.title,
        sourceType: mapSourceType(item.sourceType),
        date: item.occurredAt ?? undefined,
        snippet: item.excerpt,
        confidence: item.confidence,
      }),
    ),
  };
}

export function buildDeepAgentExecutiveEvidenceWidget(
  packet: DeepExecutiveIntelligenceResponse,
): AssistantWidgetPayload | null {
  if (packet.evidence.length === 0) return null;

  return {
    type: "source_evidence_drawer",
    id: "deep-agent-executive-briefing-evidence",
    title: `${packet.organization.name} source coverage`,
    sources: packet.evidence.slice(0, 10).map(
      (item): SourceEvidenceItem => ({
        id: item.sourceId,
        title: item.title,
        sourceType: mapSourceType(item.sourceType),
        date: item.occurredAt ?? undefined,
        snippet: item.excerpt,
        confidence: item.confidence,
      }),
    ),
  };
}
