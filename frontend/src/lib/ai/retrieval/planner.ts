// frontend/src/lib/ai/retrieval/planner.ts
import type { UIMessage } from "ai";
import {
  classifyAssistantIntent,
  shouldUsePacketFirstIntent,
} from "@/lib/ai/intent-router";
import { detectSourceSpecificRagRequest } from "@/lib/ai/detect-rag-request";
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
const EMAIL_INBOX_WORDS = /\b(e-?mails?|mail|outlook|inbox)\b/i;
const MESSAGE_INBOX_WORDS = /\b(messages?|correspondence)\b/i;
const EMAIL_RECENCY_OR_TRIAGE_WORDS =
  /\b(today|this morning|morning|yesterday|this week|last week|recent|latest|new|arrived|received|came in|got|important|urgent|priority|needs? (a )?reply|reply|respond|follow[- ]?up|unread|inbox)\b/i;

function detectPreconsult(message: string): SubAgent[] {
  const agents: SubAgent[] = [];
  if (FINANCIAL_KEYWORDS.test(message)) agents.push("cfo");
  if (PEOPLE_KEYWORDS.test(message)) agents.push("chro");
  if (RISK_KEYWORDS.test(message)) agents.push("coo");
  if (BD_KEYWORDS.test(message)) agents.push("vpbd");
  return agents;
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

function detectRecentEmailInbox(message: string): { daysBack: number; limit: number; reason: string } | null {
  const hasEmailWord = EMAIL_INBOX_WORDS.test(message);
  const hasMessageWord = MESSAGE_INBOX_WORDS.test(message);
  const looksLikeInboxMessage =
    hasMessageWord &&
    /\b(received|arrived|came in|got|inbox|reply|respond|unread)\b/i.test(message) &&
    !/\b(teams|chat|meeting|text messages?)\b/i.test(message);

  if ((!hasEmailWord && !looksLikeInboxMessage) || !EMAIL_RECENCY_OR_TRIAGE_WORDS.test(message)) {
    return null;
  }

  const daysBack = /\b(today|this morning|morning)\b/i.test(message)
    ? 0
    : /\byesterday\b/i.test(message)
      ? 1
      : /\b(this week|last week)\b/i.test(message)
        ? 7
        : 1;

  return {
    daysBack,
    limit: /\b(all|everything|every)\b/i.test(message) ? 100 : 50,
    reason: "structured_outlook_inbox_query",
  };
}

export function planRetrieval(input: PlanInput): RetrievalPlan {
  const { message, selectedProjectId, messages } = input;
  const intent = classifyAssistantIntent(message, { selectedProjectId });
  const recentEmailInbox = detectRecentEmailInbox(message);
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
      responseFormat: "recent_email_inbox",
      sources: { recentEmails: recentEmailInbox },
      reason: recentEmailInbox.reason,
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
