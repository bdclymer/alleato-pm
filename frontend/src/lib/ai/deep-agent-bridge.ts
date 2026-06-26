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

const RESEARCH_WHERE = "ai-assistant.deep-agent-research";
const APP_EXPERT_WHERE = "ai-assistant.deep-agent-app-expert";
const DEFAULT_DEEP_AGENT_BRIDGE_TIMEOUT_MS = 120_000;

const DEEP_AGENT_EXECUTIVE_CONTEXT_INTENTS = new Set<AssistantIntent>([
  "latest_status",
  "risk_review",
  "financial_analysis",
  "decision_lookup",
  "task_followup",
  "implementation_planning",
]);

const toolTraceSchema = z.object({
  agent: z.string(),
  tool: z.string(),
  status: z.enum(["success", "failed", "skipped"]),
  durationMs: z.number(),
  detail: z.string().nullable().optional(),
});

const researchSourceSchema = z.object({
  title: z.string(),
  url: z.string().nullable().optional(),
  sourceType: z.enum(["web", "alleato", "internal", "unknown"]),
});

const appExpertSourceSchema = z.object({
  title: z.string(),
  sourceType: z.enum([
    "help_article",
    "sitemap",
    "feature_registry",
    "source_map",
    "unknown",
  ]),
  route: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  detail: z.string().nullable().optional(),
});

export const deepResearchResponseSchema = z.object({
  answer: z.string(),
  mode: z.enum(["deep_agents", "unavailable"]),
  sources: z.array(researchSourceSchema),
  toolTrace: z.array(toolTraceSchema),
  skillsLoaded: z.array(z.string()),
  orchestrator: z.string(),
});

export type DeepResearchResponse = z.infer<typeof deepResearchResponseSchema>;

export const deepAppExpertResponseSchema = z.object({
  answer: z.string(),
  mode: z.enum(["deep_agents", "unavailable"]),
  sources: z.array(appExpertSourceSchema),
  toolTrace: z.array(toolTraceSchema),
  skillsLoaded: z.array(z.string()),
  approvedSkillContext: z.string().optional().nullable(),
  orchestrator: z.string(),
});

export type DeepAppExpertResponse = z.infer<typeof deepAppExpertResponseSchema>;

export type DeepAgentResearchRequest = {
  userId: string;
  sessionId?: string | null;
  question: string;
  projectId?: number | null;
  maxSearches?: number;
  timeoutMs?: number;
};

export type DeepAgentExecutiveBriefingRequest = {
  userId: string;
  sessionId?: string | null;
  question: string;
  timeoutMs?: number;
};

export type DeepAgentAppExpertRequest = {
  userId: string;
  sessionId?: string | null;
  question: string;
  currentRoute?: string | null;
  projectId?: number | null;
  approvedSkillContext?: string | null;
  timeoutMs?: number;
};

export function isDeepAgentBridgeEnabled(): boolean {
  if (process.env.AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED === "false") {
    return false;
  }
  return Boolean(
    process.env.AI_ASSISTANT_DEEP_AGENT_BRIDGE_ENABLED === "true" ||
      process.env.BACKEND_URL ||
      process.env.PYTHON_BACKEND_URL,
  );
}

function getDeepAgentBridgeTimeoutMs(): number {
  const parsed = Number(process.env.AI_ASSISTANT_DEEP_AGENT_BRIDGE_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_DEEP_AGENT_BRIDGE_TIMEOUT_MS;
}

export function shouldUseDeepAgentResearchBridge(params: {
  intent: AssistantIntent;
}): boolean {
  return isDeepAgentBridgeEnabled() && params.intent === "external_research";
}

export function shouldUseDeepAgentExecutiveBridge(params: {
  intent: AssistantIntent;
  projectId?: number | null;
  selectedProjectId?: number | null;
}): boolean {
  const projectId = params.projectId ?? params.selectedProjectId;
  return (
    isDeepAgentBridgeEnabled() &&
    typeof projectId !== "number" &&
    DEEP_AGENT_EXECUTIVE_CONTEXT_INTENTS.has(params.intent)
  );
}

export function shouldUseDeepAgentAppExpertBridge(params: {
  intent: AssistantIntent;
}): boolean {
  return isDeepAgentBridgeEnabled() && params.intent === "app_help";
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
      where: RESEARCH_WHERE,
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
      where: RESEARCH_WHERE,
      message:
        "ADMIN_API_KEY is required to call backend Deep Agents endpoints.",
      status: 503,
    });
  }
  return apiKey;
}

export async function fetchDeepAgentResearch(
  params: DeepAgentResearchRequest,
): Promise<DeepResearchResponse> {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Admin-Api-Key": getBackendAdminApiKey(),
  });

  const response = await fetchWithGuardrails(
    `${getBackendUrl()}/api/intelligence/research`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: params.userId,
        sessionId: params.sessionId ?? undefined,
        question: params.question,
        projectId: params.projectId ?? undefined,
        maxSearches: params.maxSearches ?? 5,
      }),
      requestId: params.sessionId ?? "deep-agent-research",
      where: RESEARCH_WHERE,
      dependency: "backend.deep-agent-research",
      timeoutMs: params.timeoutMs ?? getDeepAgentBridgeTimeoutMs(),
      retries: 0,
      backoffMs: AI_CALL_POLICY.backoffMs,
    },
  );

  const json = await response.json();
  return deepResearchResponseSchema.parse(json);
}

export async function fetchDeepAgentExecutiveBriefing(
  params: DeepAgentExecutiveBriefingRequest,
): Promise<DeepResearchResponse> {
  return fetchDeepAgentResearch({
    userId: params.userId,
    sessionId: params.sessionId,
    projectId: null,
    maxSearches: 8,
    timeoutMs: params.timeoutMs,
    question: [
      "Business-wide executive briefing request.",
      "Use Alleato internal read-only tools first: tasks, emails, Teams, meetings, documents, projects, financials, schedule, and current source health where relevant.",
      "Return an operator-ready answer with source labels and call out missing or failed source categories.",
      "",
      params.question,
    ].join("\n"),
  });
}

export async function fetchDeepAgentAppExpert(
  params: DeepAgentAppExpertRequest,
): Promise<DeepAppExpertResponse> {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Admin-Api-Key": getBackendAdminApiKey(),
  });

  const response = await fetchWithGuardrails(
    `${getBackendUrl()}/api/intelligence/app-expert`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: params.userId,
        sessionId: params.sessionId ?? undefined,
        question: params.question,
        currentRoute: params.currentRoute ?? undefined,
        projectId: params.projectId ?? undefined,
        approvedSkillContext: params.approvedSkillContext ?? undefined,
      }),
      requestId: params.sessionId ?? "deep-agent-app-expert",
      where: APP_EXPERT_WHERE,
      dependency: "backend.deep-agent-app-expert",
      timeoutMs: params.timeoutMs ?? getDeepAgentBridgeTimeoutMs(),
      retries: 0,
      backoffMs: AI_CALL_POLICY.backoffMs,
    },
  );

  const json = await response.json();
  return deepAppExpertResponseSchema.parse(json);
}

export function formatDeepAgentResearchContext(packet: DeepResearchResponse): string {
  const sourceLines = packet.sources.slice(0, 8).map((source) => {
    const url = source.url ? ` ${source.url}` : "";
    return `- [${source.sourceType}] ${source.title}${url}`;
  });
  const traceLines = packet.toolTrace.slice(0, 8).map((trace) => {
    return `- ${trace.agent}/${trace.tool}: ${trace.status}${trace.detail ? ` - ${trace.detail}` : ""}`;
  });

  return [
    "# Backend Deep Agents Research Packet",
    "",
    `Mode: ${packet.mode}`,
    `Orchestrator: ${packet.orchestrator}`,
    `Skills loaded: ${packet.skillsLoaded.join(", ") || "none reported"}`,
    "",
    "Backend research synthesis:",
    packet.answer,
    "",
    "Sources:",
    ...(sourceLines.length > 0
      ? sourceLines
      : ["- No parsed source URLs were returned."]),
    "",
    "Backend trace:",
    ...(traceLines.length > 0
      ? traceLines
      : ["- No backend trace rows were returned."]),
    "",
    "Use this packet as checked backend research context. Do not treat uncited public claims as audit-ready evidence.",
  ].join("\n");
}

export function formatDeepAgentExecutiveBriefingContext(
  packet: DeepResearchResponse,
): string {
  const sourceLines = packet.sources.slice(0, 10).map((source) => {
    const url = source.url ? ` ${source.url}` : "";
    return `- [${source.sourceType}] ${source.title}${url}`;
  });
  const traceLines = packet.toolTrace.slice(0, 10).map((trace) => {
    return `- ${trace.agent}/${trace.tool}: ${trace.status}${trace.detail ? ` - ${trace.detail}` : ""}`;
  });

  return [
    "# Backend Deep Agents Executive Briefing Packet",
    "",
    `Mode: ${packet.mode}`,
    `Orchestrator: ${packet.orchestrator}`,
    `Skills loaded: ${packet.skillsLoaded.join(", ") || "none reported"}`,
    "",
    "Backend executive synthesis:",
    packet.answer,
    "",
    "Sources:",
    ...(sourceLines.length > 0
      ? sourceLines
      : ["- No parsed source URLs were returned; inspect backend internal tool trace for Alleato source usage."]),
    "",
    "Backend trace:",
    ...(traceLines.length > 0
      ? traceLines
      : ["- No backend trace rows were returned."]),
    "",
    "Use this packet as checked business-wide backend context. Do not claim writes were completed unless a deterministic action tool did that work.",
  ].join("\n");
}

export function formatDeepAgentAppExpertContext(packet: DeepAppExpertResponse): string {
  const sourceLines = packet.sources.slice(0, 10).map((source) => {
    const route = source.route ? ` route=${source.route}` : "";
    const filePath = source.filePath ? ` file=${source.filePath}` : "";
    const detail = source.detail ? ` - ${source.detail}` : "";
    return `- [${source.sourceType}] ${source.title}${route}${filePath}${detail}`;
  });
  const traceLines = packet.toolTrace.slice(0, 8).map((trace) => {
    return `- ${trace.agent}/${trace.tool}: ${trace.status}${trace.detail ? ` - ${trace.detail}` : ""}`;
  });

  return [
    "# Backend Deep Agents App Expert Packet",
    "",
    `Mode: ${packet.mode}`,
    `Orchestrator: ${packet.orchestrator}`,
    `Skills loaded: ${packet.skillsLoaded.join(", ") || "none reported"}`,
    packet.approvedSkillContext
      ? `Approved Skill Library context: ${packet.approvedSkillContext}`
      : "Approved Skill Library context: none selected",
    "",
    "Backend app answer:",
    packet.answer,
    "",
    "Sources:",
    ...(sourceLines.length > 0
      ? sourceLines
      : ["- No sitemap, feature registry, or help article sources were returned."]),
    "",
    "Backend trace:",
    ...(traceLines.length > 0
      ? traceLines
      : ["- No backend trace rows were returned."]),
    "",
    "Use this packet for questions about how the Alleato PM application works. Prefer its sitemap, feature registry, and help-article sources over guessing from generic product knowledge.",
  ].join("\n");
}

export function shouldUseDeepAgentResearchDirectResponse(
  packet: DeepResearchResponse,
): boolean {
  return (
    packet.mode === "deep_agents" &&
    packet.answer.trim().length >= 40 &&
    packet.toolTrace.some(
      (item) =>
        item.tool === "deepagents_research_runtime" &&
        item.status === "success",
    )
  );
}

export function shouldUseDeepAgentExecutiveDirectResponse(
  packet: DeepResearchResponse,
): boolean {
  return shouldUseDeepAgentResearchDirectResponse(packet);
}

export function formatDeepAgentResearchDirectResponse(
  packet: DeepResearchResponse,
): string {
  const answer = packet.answer.trim();
  if (packet.sources.length > 0) return answer;

  return [
    answer,
    "",
    "Source coverage note: the research backend did not return parsed source URLs. Treat uncited claims as lower confidence and ask for sources if you need audit-ready evidence.",
  ].join("\n");
}

export function formatDeepAgentExecutiveDirectResponse(
  packet: DeepResearchResponse,
): string {
  const answer = packet.answer.trim();
  if (packet.sources.length > 0) return answer;

  return [
    answer,
    "",
    "Source coverage note: the backend executive briefing did not return parsed source URLs. Treat uncited claims as lower confidence and inspect the backend tool trace before acting on audit-sensitive details.",
  ].join("\n");
}

export function buildDeepAgentResearchEvidenceWidget(
  packet: DeepResearchResponse,
): AssistantWidgetPayload | null {
  if (packet.sources.length === 0) return null;

  return {
    type: "source_evidence_drawer",
    id: "deep-agent-research-evidence",
    title: "Research sources",
    sources: packet.sources.slice(0, 8).map((source, index): SourceEvidenceItem => ({
      id: source.url ?? `research-source-${index + 1}`,
      title: source.title,
      sourceType: "knowledge",
      href: source.url ?? undefined,
      snippet:
        source.sourceType === "web" ? "Public web source" : "Research source",
      confidence: "medium",
    })),
  };
}

export function buildDeepAgentExecutiveEvidenceWidget(
  packet: DeepResearchResponse,
): AssistantWidgetPayload | null {
  if (packet.sources.length === 0) return null;

  return {
    type: "source_evidence_drawer",
    id: "deep-agent-executive-briefing-evidence",
    title: "Executive briefing sources",
    sources: packet.sources.slice(0, 10).map((source, index): SourceEvidenceItem => ({
      id: source.url ?? `executive-source-${index + 1}`,
      title: source.title,
      sourceType: "knowledge",
      href: source.url ?? undefined,
      snippet:
        source.sourceType === "web"
          ? "Public web source"
          : "Executive briefing source",
      confidence: "medium",
    })),
  };
}
