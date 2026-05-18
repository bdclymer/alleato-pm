import { createHash } from "crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { toSessionUuid } from "@/lib/ai/session-id";
import {
  getOpenAICompatibleClientConfig,
  getOpenAIModelId,
} from "@/lib/ai/provider-config";

type AgentLearningSource = "thumbs_down" | "admin_feedback" | "eval_failure";
type AgentLearningStatus = "candidate" | "active" | "archived";
type UsageOutcome = "unknown" | "positive" | "negative";

export interface AgentLearning {
  id: string;
  title: string;
  source: AgentLearningSource;
  status: AgentLearningStatus;
  prevention_prompt: string;
  scope_tags: string[];
  tool_id: number | null;
  project_id: number | null;
  occurrences: number;
  confidence: number;
  similarity?: number;
}

export interface AgentLearningUsageSummary {
  totalUsed: number;
  learnings: Array<{
    id: string;
    title: string;
    source: AgentLearningSource;
    preventionPrompt: string;
  }>;
}

interface UpsertAgentLearningInput {
  title: string;
  source: AgentLearningSource;
  status?: AgentLearningStatus;
  problemSignature: string;
  symptoms: string;
  rootCause?: string | null;
  fixPattern?: string | null;
  preventionPrompt: string;
  scopeTags?: string[];
  pagePath?: string | null;
  toolId?: number | null;
  projectId?: number | null;
  confidence?: number;
  evidence?: Record<string, unknown>;
}

const MAX_CONTEXT_TOKENS = 400;
const AGENT_LEARNINGS_TABLE = "agent_learnings";
const AGENT_LEARNING_USAGES_TABLE = "agent_learning_usages";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "what",
  "when",
  "were",
  "been",
  "they",
  "them",
  "into",
  "onto",
  "your",
  "about",
  "there",
  "their",
  "would",
  "could",
  "should",
  "after",
  "before",
  "more",
  "than",
  "just",
  "over",
  "under",
  "does",
  "did",
  "done",
  "using",
  "used",
  "user",
  "users",
  "into",
  "then",
  "also",
  "same",
  "page",
  "tool",
  "issue",
  "agent",
  "response",
  "feedback",
]);

let cachedOpenAI: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!cachedOpenAI) {
    const config = getOpenAICompatibleClientConfig("Agent learning embeddings");
    cachedOpenAI = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  }

  return cachedOpenAI;
}

function createUntypedServiceClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase service credentials");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function clamp01(value: number | undefined, fallback: number) {
  const v = value ?? fallback;
  return Math.min(1, Math.max(0, v));
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/\-_ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(parts: Array<string | number | null | undefined>) {
  const normalized = parts
    .map((part) => normalizeText(String(part ?? "")))
    .filter(Boolean)
    .join("|");

  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function extractKeywords(text: string, limit = 8) {
  const words = normalizeText(text)
    .split(" ")
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));

  return [...new Set(words)].slice(0, limit);
}


async function embedLearning(text: string) {
  try {
    const response = await getOpenAI().embeddings.create({
      model: getOpenAIModelId("text-embedding-3-large"),
      dimensions: 3072,
      input: text,
    });

    return response.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

function chooseNextStatus(params: {
  existingStatus?: AgentLearningStatus | null;
  requestedStatus: AgentLearningStatus;
  source: AgentLearningSource;
  nextOccurrences: number;
}) {
  if (params.requestedStatus === "active") {
    return "active";
  }

  if (params.existingStatus === "active") {
    return "active";
  }

  if (params.source === "thumbs_down" && params.nextOccurrences >= 2) {
    return "active";
  }

  return params.existingStatus ?? params.requestedStatus;
}

function buildLearningContextPayload(learnings: AgentLearning[]) {
  if (learnings.length === 0) {
    return { block: null, selected: [] as AgentLearning[] };
  }

  const selected: AgentLearning[] = [];
  let usedTokens = 0;

  for (const learning of learnings) {
    const chunk = `${learning.title}\n${learning.prevention_prompt}`;
    const chunkTokens = estimateTokens(chunk);
    if (selected.length > 0 && usedTokens + chunkTokens > MAX_CONTEXT_TOKENS) {
      break;
    }

    selected.push(learning);
    usedTokens += chunkTokens;
  }

  if (selected.length === 0) {
    return { block: null, selected: [] as AgentLearning[] };
  }

  const lines = [
    "## Known Failure Patterns To Avoid",
    "",
    "These are verified or repeated issues from prior failures, feedback, and evals. Use them as constraints for this response.",
    "",
    ...selected.map(
      (learning, index) =>
        `${index + 1}. ${learning.title}: ${learning.prevention_prompt}`,
    ),
  ];

  return {
    block: lines.join("\n"),
    selected,
  };
}

async function fetchLatestAssistantSignal(sessionId: string) {
  const supabase = createUntypedServiceClient();
  const { data } = await supabase
    .from("chat_history")
    .select("id, content, metadata, created_at")
    .eq("session_id", toSessionUuid(sessionId))
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as
    | {
        id: string;
        content: string;
        metadata?: {
          tool_trace?: Array<{ toolName?: string; tool_name?: string }>;
          response_quality?: {
            score?: number;
            reasons?: string[];
          };
        } | null;
      }
    | null;
}

export async function upsertAgentLearning(input: UpsertAgentLearningInput) {
  const supabase = createUntypedServiceClient();
  const learningKey = fingerprint([
    input.source,
    input.pagePath,
    input.toolId,
    input.projectId,
    input.problemSignature,
  ]);

  const { data: existing, error: existingError } = await supabase
    .from(AGENT_LEARNINGS_TABLE)
    .select("id, occurrences, confidence, status, evidence")
    .eq("learning_key", learningKey)
    .maybeSingle();

  if (existingError) {
    return null;
  }

  const nextOccurrences = ((existing?.occurrences as number | undefined) ?? 0) + 1;
  const requestedStatus = input.status ?? "candidate";
  const nextStatus = chooseNextStatus({
    existingStatus: (existing?.status as AgentLearningStatus | undefined) ?? null,
    requestedStatus,
    source: input.source,
    nextOccurrences,
  });
  const nextConfidence = Math.max(
    clamp01(existing?.confidence as number | undefined, 0),
    clamp01(input.confidence, input.source === "eval_failure" ? 0.7 : 0.5),
  );
  const evidence = Array.isArray(existing?.evidence)
    ? [...existing.evidence, input.evidence ?? {}].slice(-10)
    : [input.evidence ?? {}];
  // DO NOT write embedding to agent_learnings in PM APP.
  // HNSW index (m=32, ef_construction=200) causes OOM under concurrent upserts.
  const payload = {
    learning_key: learningKey,
    title: input.title,
    source: input.source,
    status: nextStatus,
    problem_signature: input.problemSignature,
    symptoms: input.symptoms,
    root_cause: input.rootCause ?? null,
    fix_pattern: input.fixPattern ?? null,
    prevention_prompt: input.preventionPrompt,
    scope_tags: uniqueStrings(input.scopeTags ?? []),
    page_path: input.pagePath ?? null,
    tool_id: input.toolId ?? null,
    project_id: input.projectId ?? null,
    occurrences: nextOccurrences,
    confidence: nextConfidence,
    evidence,
    last_seen_at: new Date().toISOString(),
    ...(nextStatus === "active" ? { activated_at: new Date().toISOString() } : {}),
  };

  const { data, error } = await supabase
    .from(AGENT_LEARNINGS_TABLE)
    .upsert(payload, { onConflict: "learning_key" })
    .select(
      "id, title, source, status, prevention_prompt, scope_tags, tool_id, project_id, occurrences, confidence",
    )
    .single();

  if (error) {
    return null;
  }

  return data as AgentLearning;
}

export async function getRelevantAgentLearnings(params: {
  messageText: string;
  projectId?: number;
  limit?: number;
}) {
  const supabase = createUntypedServiceClient();
  const matchCount = params.limit ?? 4;
  const queryEmbedding = await embedLearning(params.messageText.slice(0, 8000));

  if (queryEmbedding) {
    const { data, error } = await supabase.rpc("search_agent_learnings", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: matchCount,
      match_threshold: 0.45,
      filter_project_id: params.projectId ?? null,
      filter_tool_id: null,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as AgentLearning[];
    }
  }

  const keywords = extractKeywords(params.messageText, 6);
  let query = supabase
    .from(AGENT_LEARNINGS_TABLE)
    .select(
      "id, title, source, status, prevention_prompt, scope_tags, tool_id, project_id, occurrences, confidence",
    )
    .eq("status", "active")
    .order("last_seen_at", { ascending: false })
    .limit(matchCount);

  if (params.projectId) {
    query = query.or(`project_id.is.null,project_id.eq.${params.projectId}`);
  }

  if (keywords.length > 0) {
    query = query.overlaps("scope_tags", keywords);
  }

  const { data } = await query;
  return (data ?? []) as AgentLearning[];
}

export function buildAgentLearningContextBlock(learnings: AgentLearning[]) {
  return buildLearningContextPayload(learnings);
}

export async function recordAgentLearningUsages(params: {
  sessionId: string;
  userId: string;
  messageText: string;
  responseQualityScore?: number;
  learnings: Array<Pick<AgentLearning, "id" | "title" | "source">>;
}) {
  if (params.learnings.length === 0) {
    return;
  }

  const supabase = createUntypedServiceClient();
  const messageExcerpt = params.messageText.slice(0, 500);

  await Promise.allSettled(
    params.learnings.map((learning) =>
      supabase.from(AGENT_LEARNING_USAGES_TABLE).upsert(
        {
          learning_id: learning.id,
          session_id: toSessionUuid(params.sessionId),
          user_id: params.userId,
          outcome: "unknown",
          response_quality_score: params.responseQualityScore ?? null,
          message_excerpt: messageExcerpt,
          metadata: {
            learningTitle: learning.title,
            learningSource: learning.source,
          },
        },
        { onConflict: "learning_id,session_id" },
      ),
    ),
  );
}

export async function updateLearningUsageOutcomeForSession(
  sessionId: string,
  outcome: UsageOutcome,
) {
  const supabase = createUntypedServiceClient();
  await supabase
    .from(AGENT_LEARNING_USAGES_TABLE)
    .update({ outcome })
    .eq("session_id", toSessionUuid(sessionId))
    .eq("outcome", "unknown");
}

export async function ingestThumbsFeedbackLearning(params: {
  sessionId: string;
  feedback: "up" | "down";
  messageContent?: string;
}) {
  await updateLearningUsageOutcomeForSession(
    params.sessionId,
    params.feedback === "up" ? "positive" : "negative",
  );

  if (params.feedback !== "down") {
    return null;
  }

  const assistantSignal = await fetchLatestAssistantSignal(params.sessionId);
  const toolTrace = assistantSignal?.metadata?.tool_trace ?? [];
  const toolNames = uniqueStrings(
    toolTrace.flatMap((item) => [item.toolName, item.tool_name]),
  );
  const reasons = assistantSignal?.metadata?.response_quality?.reasons ?? [];
  const excerpt = (params.messageContent || assistantSignal?.content || "").slice(0, 280);
  const scopeTags = uniqueStrings([
    "thumbs_down",
    ...toolNames,
    ...extractKeywords(excerpt),
    ...reasons.flatMap((reason) => extractKeywords(reason, 3)),
  ]);

  const preventionParts = uniqueStrings([
    toolNames.length > 0
      ? `Re-check tool outputs from ${toolNames.join(", ")} before finalizing the answer.`
      : "Call the relevant live tools before answering instead of relying on assumptions.",
    reasons.some((reason) => reason.includes("no source citations"))
      ? "Include grounded source references when the answer depends on retrieved evidence."
      : null,
    "If the data is incomplete, say so explicitly instead of guessing.",
  ]);

  return upsertAgentLearning({
    title:
      toolNames.length > 0
        ? `Repeated thumbs-down on ${toolNames.join(", ")} responses`
        : "Repeated thumbs-down on AI assistant responses",
    source: "thumbs_down",
    status: "candidate",
    problemSignature: `${toolNames.join(" ")} ${excerpt}`.trim() || "thumbs down response",
    symptoms: [
      excerpt ? `Rejected answer excerpt: ${excerpt}` : null,
      reasons.length > 0 ? `Response quality signals: ${reasons.join("; ")}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    preventionPrompt: preventionParts.join(" "),
    scopeTags,
    confidence: 0.45,
    evidence: {
      sessionId: params.sessionId,
      assistantExcerpt: excerpt,
      toolNames,
      responseQuality: assistantSignal?.metadata?.response_quality ?? null,
    },
  });
}

export async function ingestAdminFeedbackLearning(params: {
  feedbackItemId: string;
  title: string;
  comment: string;
  pagePath?: string | null;
  toolId?: number | null;
  projectId?: number | null;
  status?: AgentLearningStatus;
  resolutionSummary?: string | null;
}) {
  const scopeTags = uniqueStrings([
    "admin_feedback",
    ...(params.pagePath ? params.pagePath.split("/").filter(Boolean) : []),
    ...extractKeywords(`${params.title} ${params.comment}`),
  ]);

  const preventionPrompt = params.resolutionSummary
    ? `Known verified issue for ${params.pagePath || "this workflow"}: ${params.title}. Apply this fix pattern: ${params.resolutionSummary}`
    : `When working in ${params.pagePath || "this workflow"}, verify this known issue does not recur: ${params.title}. ${params.comment.slice(0, 240)}`;

  return upsertAgentLearning({
    title: params.title,
    source: "admin_feedback",
    status: params.status ?? "candidate",
    problemSignature: `${params.pagePath ?? ""} ${params.title} ${params.comment}`,
    symptoms: params.comment,
    fixPattern: params.resolutionSummary ?? null,
    preventionPrompt,
    scopeTags,
    pagePath: params.pagePath ?? null,
    toolId: params.toolId ?? null,
    projectId: params.projectId ?? null,
    confidence: params.resolutionSummary ? 0.8 : 0.6,
    evidence: {
      feedbackItemId: params.feedbackItemId,
      pagePath: params.pagePath ?? null,
      resolutionSummary: params.resolutionSummary ?? null,
    },
  });
}

export function summarizeAgentLearningUsage(learnings: AgentLearning[]): AgentLearningUsageSummary {
  return {
    totalUsed: learnings.length,
    learnings: learnings.map((learning) => ({
      id: learning.id,
      title: learning.title,
      source: learning.source,
      preventionPrompt: learning.prevention_prompt,
    })),
  };
}
