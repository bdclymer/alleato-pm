// frontend/src/lib/ai/retrieval/planner.ts
import type { UIMessage } from "ai";
import {
  classifyAssistantIntent,
  shouldUsePacketFirstIntent,
} from "@/lib/ai/intent-router";
import {
  detectRecentEmailInboxRequest,
  detectSourceSpecificRagRequest,
} from "@/lib/ai/detect-rag-request";
import type { RetrievalPlan, SubAgent } from "./types";

type PlanInput = {
  message: string;
  selectedProjectId?: number;
  messages: UIMessage[];
  /**
   * True when the latest user message carries file attachments (the handler
   * detects file parts). Attachments mean the user wants help WITH the files —
   * route to a conversational path that uses them, never the cold project
   * briefing (which is why an "I attached exports, help me migrate" turn used to
   * get a generic project-health dump).
   */
  hasAttachments?: boolean;
};

// Create/open/add a record (commitment, change order, RFI, etc.). These are
// transactional asks that must reach the model's create-* tools, NOT the
// project-status briefing synthesis. Migration/import phrasing is included
// because that workflow is "get these records into the system".
const TRANSACTIONAL_CREATE_PATTERNS = [
  /\b(create|open|add|set up|draft|generate|log|enter|build|start)\b.{0,40}\b(commitment|subcontract|purchase order|\bpo\b|change order|change event|\brfi\b|submittal|invoice|direct cost|prime contract|company|contact|vendor|daily log|budget line)\b/i,
  /\b(migrat\w+|import\w*|cross over|crossover|transfer|bring over|move over|get .{0,20}(data|records|exports?) (in|into|over|crossed))\b/i,
];

function isTransactionalCreateRequest(message: string): boolean {
  return TRANSACTIONAL_CREATE_PATTERNS.some((pattern) => pattern.test(message));
}

const FOLLOWUP_PHRASES = [
  /\b(source|cite|citation|evidence)\b/i,
  /\b(why|how come|why did)\b/i,
  /\b(more detail|elaborate|expand)\b/i,
];

const FINANCIAL_KEYWORDS = /\b(budget|cost|margin|invoice|payment|exposure|cash|retention|forecast)\b/i;
const PEOPLE_KEYWORDS = /\b(who|stretched|capacity|staffing|on the team|assigned)\b/i;
const RISK_KEYWORDS = /\b(risk|worried|blocker|delay|issue|exposure)\b/i;
const BD_KEYWORDS = /\b(pipeline|new business|win rate|hit rate|lead|opportunity)\b/i;
const EXECUTIVE_DEEP_AGENT_PATTERNS: Array<{
  pattern: RegExp;
  intent: ReturnType<typeof classifyAssistantIntent>;
}> = [
  {
    pattern:
      /\b(highest priority|top priority|what should brandon focus|what should i focus|most important thing|state of the business)\b/i,
    intent: "risk_review",
  },
  {
    pattern:
      /\b(brandon'?s? must[- ]do|must[- ]do items?|what are brandon'?s? tasks|what does brandon need to do|my must[- ]do)\b/i,
    intent: "task_followup",
  },
  {
    pattern:
      /\b(pipeline|new business|opportunities|pursuits?|stuck deals?|deal flow)\b/i,
    intent: "latest_status",
  },
  {
    pattern:
      /\b(today'?s meetings?|meetings? today|meeting insights?|insights from today'?s meetings?)\b/i,
    intent: "latest_status",
  },
  {
    pattern:
      /\b(clients? upset|client relationship risk|relationship risk|unhappy clients?|frustrated clients?|client frustration|clients? angry)\b/i,
    intent: "risk_review",
  },
];

function detectPreconsult(message: string): SubAgent[] {
  const agents: SubAgent[] = [];
  if (FINANCIAL_KEYWORDS.test(message)) agents.push("cfo");
  if (PEOPLE_KEYWORDS.test(message)) agents.push("chro");
  if (RISK_KEYWORDS.test(message)) agents.push("coo");
  if (BD_KEYWORDS.test(message)) agents.push("vpbd");
  return agents;
}

function detectExecutiveDeepAgentIntent(
  message: string,
  selectedProjectId?: number,
): ReturnType<typeof classifyAssistantIntent> | null {
  if (typeof selectedProjectId === "number") return null;
  const match = EXECUTIVE_DEEP_AGENT_PATTERNS.find(({ pattern }) =>
    pattern.test(message),
  );
  return match?.intent ?? null;
}

function extractText(msg: UIMessage): string {
  if (typeof (msg as unknown as { content?: unknown }).content === "string") {
    return (msg as unknown as { content: string }).content;
  }
  const parts = (msg as unknown as { parts?: Array<{ type: string; text?: string }> }).parts;
  if (!parts) return "";
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join(" ");
}

function isFollowUp(messages: UIMessage[]): boolean {
  if (messages.length < 3) return false;
  const last = messages[messages.length - 1];
  const lastText = extractText(last);
  return FOLLOWUP_PHRASES.some((re) => re.test(lastText));
}

function isBrandonDaily(message: string): boolean {
  return /brandon.{0,12}(daily|update|brief)/i.test(message);
}

// Decide whether to ROUTE the entire answer to the source-health fast-path.
// This MUST be stricter than shouldAttachAssistantSourceHealth (which only
// attaches supplemental context): routing hijacks the user's question, so it
// may only fire when they are genuinely asking about the freshness / sync /
// trustworthiness of the DATA itself — never on the common adjective "current"
// (as in "current AR aging", "current phase", "current market price") or bare
// "status"/"latest". See docs/ai-plan/evals/TOOL-COVERAGE-RUN-RESULTS.md.
function isSourceHealthRequest(
  message: string,
  selectedProjectId?: number,
): boolean {
  if (
    /\b(find|exact|evidence|clause|excerpt|drill|answer from|best available document read)\b/i.test(
      message,
    )
  ) {
    return false;
  }

  // Explicit "is my data fresh / synced / trustworthy" questions.
  const explicitSourceHealth =
    /\b(source health|source status|sync status|data (health|freshness|coverage)|how (fresh|current|up to date|stale) (is|are)|is (the|my) (data|inbox|source|sources|packet|snapshot)\b|are (the|my) (sources|data|emails|meetings|documents|packets?|messages|transcripts?) (synced|fresh|up to date|current|stale|loaded|missing|complete)|when (did|was) .{0,40}(sync|synced|updated|refreshed?)|can i trust|safe to use|is it (current|up to date|reliable|stale) enough)\b/i.test(
      message,
    );
  if (explicitSourceHealth) return true;

  // Generic: a freshness/sync SUBJECT (the data itself) plus a trust/health
  // SIGNAL. "current"/"status"/"latest" are NOT subjects — they are adjectives.
  const freshnessSubject =
    /\b(sources?|data feeds?|sync|synced|syncing|embed|embedded|embedding|vectoriz\w*|packets?|snapshots?|coverage|pipeline|ingest\w*|source sync|data freshness)\b/i.test(
      message,
    );
  const trustSignal =
    /\b(stale|fresh|freshness|up[-\s]?to[-\s]?date|out of date|outdated|reliable|reliability|trust\w*|health|healthy|loaded|missing|thin|behind|backlog|last (sync|synced|updated|refresh\w*))\b/i.test(
      message,
    );
  if (freshnessSubject && trustSignal) return true;

  // Project-scoped packet/snapshot freshness check (requires a context word).
  const hasPacketFreshness =
    /\b(packets?|snapshots?|coverage|document intelligence)\b/i.test(message) &&
    /\b(stale|missing|thin|fresh|loaded|health|up to date|current)\b/i.test(
      message,
    );
  if (typeof selectedProjectId === "number" && hasPacketFreshness) {
    return true;
  }

  return false;
}

function projectOperatingContextSources(selectedProjectId?: number): {
  intelligencePacket?: { mode: "additive" };
  projectSnapshot?: { reason: "intent" };
} {
  if (typeof selectedProjectId !== "number") return {};
  return {
    intelligencePacket: { mode: "additive" },
    projectSnapshot: { reason: "intent" },
  };
}

export function planRetrieval(input: PlanInput): RetrievalPlan {
  const { message, selectedProjectId, messages } = input;
  const intent = classifyAssistantIntent(message, { selectedProjectId });
  const recentEmailInbox = detectRecentEmailInboxRequest(message);
  const sourceSpecific = detectSourceSpecificRagRequest(message);

  if (isSourceHealthRequest(message, selectedProjectId)) {
    return {
      intent: "source_health",
      responseFormat: "briefing_template",
      sources: {
        ...projectOperatingContextSources(selectedProjectId),
      },
      selectedProjectId,
      reason: "project_context_source_health",
    };
  }

  if (isBrandonDaily(message)) {
    return {
      intent,
      responseFormat: "brandon_daily",
      sources: { brandonDailyUpdate: true },
      reason: "brandon_daily_keyword",
    };
  }

  if (intent === "app_help") {
    return {
      intent,
      responseFormat: "app_help",
      sources: { appExpert: { question: message } },
      reason: "app_help_intent",
    };
  }

  const executiveDeepAgentIntent = detectExecutiveDeepAgentIntent(
    message,
    selectedProjectId,
  );
  if (executiveDeepAgentIntent) {
    return {
      intent: executiveDeepAgentIntent,
      responseFormat: "briefing_template",
      sources: {},
      selectedProjectId,
      reason: "executive_deep_agent_broad_operator_question",
    };
  }

  if (recentEmailInbox) {
    return {
      intent,
      responseFormat: "conversational",
      sources: {},
      reason: `microsoft_specialist_delegation_${recentEmailInbox.reason}`,
    };
  }

  // Check follow-up BEFORE source_lookup so "what's the source for X?" in a
  // multi-turn conversation reuses prior context instead of spawning a new lookup.
  if (isFollowUp(messages)) {
    return {
      intent,
      responseFormat: "conversational",
      sources: { reusePriorBriefing: true },
      preconsult: detectPreconsult(message),
      selectedProjectId,
      reason: "followup_to_prior_briefing",
    };
  }

  if (sourceSpecific) {
    return {
      intent,
      responseFormat: "source_specific_rag",
      sources: {
        ...projectOperatingContextSources(selectedProjectId),
        sourceSpecificRag: { kind: sourceSpecific.kind },
      },
      selectedProjectId,
      reason: selectedProjectId
        ? `project_context_source_specific_rag_${sourceSpecific.kind}`
        : `source_specific_rag_${sourceSpecific.kind}`,
    };
  }

  if (intent === "source_lookup") {
    return {
      intent,
      responseFormat: "source_lookup",
      sources: {
        ...projectOperatingContextSources(selectedProjectId),
        semanticVectorSearch: { query: message },
      },
      selectedProjectId,
      reason: selectedProjectId
        ? "project_context_source_lookup_intent"
        : "source_lookup_intent",
    };
  }

  // Intercept the status-dump default: a message carrying attachments, or a
  // transactional create / data-migration ask, must NOT fall into the project
  // briefing below. These checks sit just above packet-first so they only
  // redirect what would otherwise become a cold status synthesis — the specific
  // email/source/followup routes above keep their behavior.
  if (input.hasAttachments) {
    // Help WITH the files, using their (inlined) content + the conversation.
    return {
      intent,
      responseFormat: "conversational",
      sources: {},
      preconsult: detectPreconsult(message),
      selectedProjectId,
      reason: "user_attachments_present",
    };
  }
  if (isTransactionalCreateRequest(message)) {
    // Let the model reach its create-* tools instead of briefing.
    return {
      intent,
      responseFormat: "conversational",
      sources: {},
      preconsult: detectPreconsult(message),
      selectedProjectId,
      reason: "transactional_create_request",
    };
  }

  // Packet-first intents (status, briefing, financial, change mgmt, etc.)
  // emit project-scoped retrieval whether or not the user pre-selected a
  // project. The executor resolves the project from the message text when no
  // selectedProjectId is provided.
  if (shouldUsePacketFirstIntent(intent)) {
    return {
      intent,
      responseFormat: "briefing_template",
      sources: {
        intelligencePacket: { mode: "additive" },
        projectSnapshot: { reason: "intent" },
        semanticVectorSearch: { query: message },
      },
      preconsult: detectPreconsult(message),
      selectedProjectId,
      reason: selectedProjectId ? "packet_first_with_project" : "packet_first_resolve_from_text",
    };
  }

  return {
    intent,
    responseFormat: "conversational",
    sources: {},
    preconsult: detectPreconsult(message),
    selectedProjectId,
    reason: "conversational_fallback",
  };
}
