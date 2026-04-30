/**
 * Source-specific RAG request detection for the AI chat pipeline.
 *
 * Extracted from api/ai-assistant/chat/route.ts to make the detection logic
 * unit-testable without importing the full Next.js route (which has server-only
 * dependencies). The route imports these types/functions directly from here.
 *
 * Background: All AI tools are globally disabled (modelTools = undefined) as a
 * workaround for an AI Gateway finishReason:other bug. Server-side pre-retrieval
 * via detectSourceSpecificRagRequest is the only data path for queries that match
 * known patterns. Keeping this logic in a standalone module makes it testable and
 * prevents silent regression when patterns are added or removed.
 *
 * TODO(tool-reenable): This entire module is a workaround for the AI Gateway
 * finishReason:other bug (modelTools = undefined). When tools are re-enabled,
 * delete this file and restore the tool-calling path in chat/route.ts.
 */

export type SourceSpecificRagKind =
  | "meetings_on_date"
  | "recent_meetings"
  | "recent_emails"
  | "recent_onedrive_documents"
  | "recent_teams_discussions";

export type SourceSpecificRagRequest = {
  kind: SourceSpecificRagKind;
  label: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function previousWeekdayIsoDate(targetDay: number, now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diff = (date.getUTCDay() - targetDay + 7) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return isoDate(date);
}

const MONTH_NAMES: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3,
  may: 4, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
};

function parseExplicitDateRange(message: string): { startDate: string; endDate: string } | null {

  const isoRange = message.match(
    /\b(20\d{2}-\d{2}-\d{2})\b\s*(?:through|to|until|-|–|—)\s*\b(20\d{2}-\d{2}-\d{2})\b/i,
  );
  if (isoRange) {
    return { startDate: isoRange[1], endDate: isoRange[2] };
  }

  const monthRange = message.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s*(?:through|to|until|-|–|—)\s*(?:(january|february|march|april|may|june|july|august|september|october|november|december)\s+)?(\d{1,2}),?\s+(20\d{2})\b/i,
  );
  if (!monthRange) return null;

  const startMonth = MONTH_NAMES[monthRange[1].toLowerCase()];
  const endMonth = MONTH_NAMES[(monthRange[3] ?? monthRange[1]).toLowerCase()];
  const year = Number(monthRange[5]);
  const startDate = new Date(Date.UTC(year, startMonth, Number(monthRange[2])));
  const endDate = new Date(Date.UTC(year, endMonth, Number(monthRange[4])));

  return {
    startDate: isoDate(startDate),
    endDate: isoDate(endDate),
  };
}

// Static phrase list — module-level to avoid per-call reallocation.
// All phrases implicitly contain "meeting", so the normalized.includes("meeting")
// guard in detectSourceSpecificRagRequest acts as a cheap short-circuit.
const GENERAL_MEETING_PHRASES = [
  "review recent meetings",
  "recent meetings",
  "latest meetings",
  "show me meetings",
  "tell me about meetings",
  "what meetings did",
  "what meetings have",
  "what meetings were held",
  "what meetings do we have",
  "meeting updates",
  "meetings this week",
  "meetings this month",
  "meetings last week",
  "meetings last month",
  "any meetings",
  "our meetings",
  "meeting notes",
  "meeting summaries",
  "meeting recap",
  "meeting recaps",
];

/**
 * Detects whether the user message targets a specific data source that should be
 * retrieved server-side before the model responds.
 *
 * This bypasses the AI Gateway tool-calling bug (modelTools = undefined) by
 * injecting context directly into the system prompt on the server side.
 *
 * Returns null if no source-specific pattern is matched, in which case the
 * standard shouldForceBusinessRetrieval / noToolRetry paths apply.
 */
export function detectSourceSpecificRagRequest(message: string): SourceSpecificRagRequest | null {
  const normalized = message.toLowerCase();

  // SPECIFIC FIRST: date-anchored meeting queries must be evaluated before the
  // general meeting phrases below. Several GENERAL_MEETING_PHRASES substrings
  // ("what meetings were held", "our meetings", etc.) can match queries that
  // contain a date qualifier — routing them to recent_meetings (60-day, limit 10)
  // instead of meetings_on_date (date-specific, limit 20). The original route.ts
  // ordering evaluated this block first; preserve that behaviour here.
  const asksForMeetingsOnFriday =
    normalized.includes("meeting") &&
    (normalized.includes("conducted on friday") ||
      normalized.includes("meetings on friday") ||
      normalized.includes("held on friday") ||
      normalized.includes("meetings were conducted"));
  if (asksForMeetingsOnFriday) {
    const date = previousWeekdayIsoDate(5);
    return {
      kind: "meetings_on_date",
      label: "Meeting transcripts",
      date,
      limit: 20,
    };
  }

  // GENERAL SECOND: broad recent-meeting queries. Evaluated after date-specific
  // patterns to avoid swallowing queries like "what meetings were held on friday".
  const asksForRecentMeetings =
    normalized.includes("meeting") &&
    GENERAL_MEETING_PHRASES.some((phrase) => normalized.includes(phrase));
  if (asksForRecentMeetings) {
    return {
      kind: "recent_meetings",
      label: "Recent meeting transcripts",
      limit: 10,
    };
  }

  const asksForRecentOneDrive =
    (normalized.includes("onedrive") || normalized.includes("one drive")) &&
    (normalized.includes("most recent") ||
      normalized.includes("latest") ||
      normalized.includes("recent") ||
      normalized.includes("last five") ||
      normalized.includes("last 5"));
  if (asksForRecentOneDrive) {
    return {
      kind: "recent_onedrive_documents",
      label: "OneDrive documents",
      limit: 5,
    };
  }

  const asksForRecentEmails =
    normalized.includes("email") &&
    !normalized.includes("do not use email") &&
    (normalized.includes("last five") ||
      normalized.includes("last 5") ||
      normalized.includes("five most recent") ||
      normalized.includes("most recent") ||
      normalized.includes("latest"));
  if (asksForRecentEmails) {
    return {
      kind: "recent_emails",
      label: "Outlook emails",
      limit: 5,
    };
  }

  const asksForRecentTeams =
    normalized.includes("teams") &&
    (normalized.includes("teams rag") ||
      normalized.includes("using only teams") ||
      normalized.includes("past week") ||
      normalized.includes("this past week") ||
      normalized.includes("main discussion") ||
      normalized.includes("main discussions") ||
      normalized.includes("teams discussion") ||
      normalized.includes("teams discussions") ||
      normalized.includes("chat/thread") ||
      normalized.includes("thread titles") ||
      normalized.includes("recent"));
  if (asksForRecentTeams) {
    const explicitRange = parseExplicitDateRange(message);
    const end = new Date();
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - 7);
    return {
      kind: "recent_teams_discussions",
      label: "Teams messages",
      startDate: explicitRange?.startDate ?? isoDate(start),
      endDate: explicitRange?.endDate ?? isoDate(end),
      limit: 12,
    };
  }

  return null;
}
