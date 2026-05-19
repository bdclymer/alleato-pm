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
};

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

export function planRetrieval(input: PlanInput): RetrievalPlan {
  const { message, selectedProjectId, messages } = input;
  const intent = classifyAssistantIntent(message, { selectedProjectId });
  const recentEmailInbox = detectRecentEmailInboxRequest(message);
  const sourceSpecific = detectSourceSpecificRagRequest(message);

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
      sources: {},
      reason: "app_help_intent",
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
      sources: { sourceSpecificRag: { kind: sourceSpecific.kind } },
      reason: `source_specific_rag_${sourceSpecific.kind}`,
    };
  }

  if (intent === "source_lookup") {
    return {
      intent,
      responseFormat: "source_lookup",
      sources: { semanticVectorSearch: { query: message } },
      reason: "source_lookup_intent",
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
