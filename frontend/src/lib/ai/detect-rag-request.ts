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

function parseExplicitDateRange(message: string): { startDate: string; endDate: string } | null {
  const monthNames: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };

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

  const startMonth = monthNames[monthRange[1].toLowerCase()];
  const endMonth = monthNames[(monthRange[3] ?? monthRange[1]).toLowerCase()];
  const year = Number(monthRange[5]);
  const startDate = new Date(Date.UTC(year, startMonth, Number(monthRange[2])));
  const endDate = new Date(Date.UTC(year, endMonth, Number(monthRange[4])));

  return {
    startDate: isoDate(startDate),
    endDate: isoDate(endDate),
  };
}

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

  // General meeting-intent: "review recent meetings", "what meetings did we have",
  // "tell me about meetings", "show me the latest meetings", etc.
  // These use server-side pre-retrieval (same path as meetings_on_date) to bypass
  // the AI Gateway tool-calling bug (modelTools = undefined).
  const generalMeetingPhrases = [
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
  const asksForRecentMeetings =
    normalized.includes("meeting") &&
    generalMeetingPhrases.some((phrase) => normalized.includes(phrase));
  if (asksForRecentMeetings) {
    return {
      kind: "recent_meetings",
      label: "Recent meeting transcripts",
      limit: 10,
    };
  }

  const asksForMeetingsOnFriday =
    normalized.includes("meeting") &&
    (normalized.includes("conducted on friday") ||
      normalized.includes("meetings on friday") ||
      normalized.includes("meetings were conducted") ||
      normalized.includes("friday april 24"));
  if (asksForMeetingsOnFriday) {
    const date =
      normalized.includes("april 24") || normalized.includes("2026-04-24")
        ? "2026-04-24"
        : previousWeekdayIsoDate(5);
    return {
      kind: "meetings_on_date",
      label: "Meeting transcripts",
      date,
      limit: 20,
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
