import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";
import { createServiceClient } from "@/lib/supabase/service";
import {
  EMBEDDING,
  generateEmbedding,
  getOpenAI,
} from "@/lib/ai/tools/tool-utils";

type BriefTone = "neutral" | "good" | "watch" | "risk";
type BriefSource = "Email" | "Teams" | "Meeting" | "Document";

export const DEFAULT_EXECUTIVE_WINDOW_DAYS = 3;
export const DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL = "gpt-5.5";

export type BriefCitation = {
  source: BriefSource;
  sourceDetail: string;
  sourceUrl?: string;
  sourceId?: string;
  evidence?: string;
  date: string;
};

export type BrandonBriefItem = {
  title: string;
  summary: string;
  evidenceFacts?: string[];
  bullets: string[];
  recommendedAction?: string;
  whyItMatters?: string;
  // Primary citation (mirrors citations[0] for backward compat with stored follow-ups + existing UI/email).
  source: BriefSource;
  sourceDetail: string;
  sourceUrl?: string;
  sourceId?: string;
  evidence?: string;
  date: string;
  // Full citation list. Always at least one entry; multiple when an item is corroborated across sources.
  citations: BriefCitation[];
  project: string;
  owner?: string;
  status?: string;
  tone?: BriefTone;
  retrieval?: string;
};

export type BrandonBriefSourceCoverage = {
  label: BriefSource;
  detail: string;
  count: number;
  latest: string;
  status?: "loaded" | "empty" | "warning";
  warning?: string;
};

export type BrandonDailyUpdatePacket = {
  generatedAt: string;
  windowDays: number;
  retrievalOrder: string[];
  sections: {
    needsBrandon: BrandonBriefItem[];
    waitingOnOthers: BrandonBriefItem[];
    importantUpdates: BrandonBriefItem[];
  };
  sourceCoverage: BrandonBriefSourceCoverage[];
  retrievalNotes: string[];
};

type RecentCommunicationSignalResult = {
  sections: BrandonDailyUpdatePacket["sections"];
  warnings: string[];
};

type FallbackMetadataResult = {
  rows: DocumentMetaRow[];
  warnings: string[];
};

type SupportedSectionsResult = {
  sections: BrandonDailyUpdatePacket["sections"];
  warnings: string[];
};

function executiveBriefingSynthesisModel() {
  const configured = process.env.EXECUTIVE_BRIEFING_SYNTHESIS_MODEL?.trim();
  return (configured || DEFAULT_EXECUTIVE_BRIEFING_SYNTHESIS_MODEL).replace(
    /^openai\//,
    "",
  );
}

type SourceGroup = {
  label: BriefSource;
  sourceTypes: string[];
  detail: string;
};

type QuerySpec = {
  section: keyof BrandonDailyUpdatePacket["sections"];
  title: string;
  query: string;
  owner?: string;
  status?: string;
  tone?: BriefTone;
};

type RagRow = {
  chunk_id?: string | null;
  document_id?: string | null;
  chunk_index?: number | null;
  chunk_text?: string | null;
  text?: string | null;
  similarity?: number | null;
  source_type?: string | null;
  doc_title?: string | null;
  doc_source?: string | null;
  doc_type?: string | null;
  doc_date?: string | null;
  doc_project_id?: number | null;
  doc_created_at?: string | null;
};

type DocumentMetaRow = {
  id: string;
  title: string | null;
  project: string | null;
  project_id: number | null;
  date: string | null;
  created_at: string | null;
  captured_at: string | null;
  source_system: string | null;
  source: string | null;
  type: string | null;
  category: string | null;
  summary: string | null;
  overview: string | null;
  action_items: string | null;
  content: string | null;
  raw_text: string | null;
  url: string | null;
  source_web_url: string | null;
  fireflies_link: string | null;
  meeting_link: string | null;
};

type RecentCommunicationRow = Pick<
  DocumentMetaRow,
  | "id"
  | "title"
  | "project"
  | "project_id"
  | "date"
  | "created_at"
  | "captured_at"
  | "summary"
  | "overview"
  | "action_items"
  | "source_web_url"
  | "url"
  | "category"
  | "type"
>;

type RecentSourceRow = {
  date?: string | null;
  created_at?: string | null;
  captured_at?: string | null;
  category?: string | null;
  type?: string | null;
};

type CommunicationSignalSpec = {
  id: string;
  section: keyof BrandonDailyUpdatePacket["sections"];
  title: string;
  owner: string;
  status: string;
  tone: BriefTone;
  source: BriefSource;
  categories: Array<NonNullable<RecentCommunicationRow["category"]>>;
  required: string[];
  optional?: string[];
  recommendedAction: string;
  whyItMatters: string;
};

type RankedHit = {
  id: string;
  spec: QuerySpec;
  sourceGroup: SourceGroup;
  row: RagRow;
  metadata?: DocumentMetaRow;
  date: Date | null;
  similarity: number;
  text: string;
};

type SynthesizedBriefItem = {
  title: string;
  summary: string;
  evidenceFacts?: string[];
  bullets?: string[];
  recommendedAction?: string;
  whyItMatters?: string;
  // Preferred: one or more candidate indexes whose citations should be attached to this item.
  sourceIndexes?: number[];
  // Backward-compat: older outputs may still emit a single sourceIndex.
  sourceIndex?: number;
  status?: string;
  tone?: BriefTone;
};

type SynthesizedBriefSections = {
  needsBrandon?: SynthesizedBriefItem[];
  waitingOnOthers?: SynthesizedBriefItem[];
  importantUpdates?: SynthesizedBriefItem[];
};

type EnrichedBriefItem = {
  section: keyof BrandonDailyUpdatePacket["sections"];
  index: number;
  summary?: string;
  evidenceFacts?: string[];
  recommendedAction?: string;
  whyItMatters?: string;
};

type EnrichedBriefItemsPayload = {
  items?: EnrichedBriefItem[];
};

type RagRpcClient = {
  rpc: (
    name: "search_document_chunks",
    args: {
      query_embedding: string;
      filter_source_types: string[] | null;
      filter_project_id: number | null;
      match_count: number;
      match_threshold: number;
    },
  ) => Promise<{ data: RagRow[] | null; error: { message: string } | null }>;
};

const SOURCE_GROUPS: SourceGroup[] = [
  {
    label: "Email",
    sourceTypes: ["email"],
    detail: "Recent email evidence",
  },
  {
    label: "Teams",
    sourceTypes: ["teams_dm", "teams_channel"],
    detail: "Recent Teams direct and channel messages",
  },
  {
    label: "Meeting",
    sourceTypes: [
      "meeting_transcript",
      "meeting_summary",
      "meeting_segment_summary",
      "meeting_section",
      "meeting_notes",
      "meeting_summary_embed",
    ],
    detail: "Recent meeting transcripts and summaries",
  },
  {
    label: "Document",
    sourceTypes: ["onedrive_document"],
    detail: "Recent company documents and files",
  },
];

const QUERY_SPECS: QuerySpec[] = [
  {
    section: "needsBrandon",
    title: "Insurance, permit, license, or COI blocker",
    query:
      "urgent insurance issue permit blocker proof of workers compensation WC COI City of Indianapolis license compliance Brandon action needed",
    owner: "Brandon / operations / insurance",
    status: "Needs confirmation",
    tone: "risk",
  },
  {
    section: "needsBrandon",
    title: "Cash, payment, retainage, or collections action",
    query:
      "wire draw payment retainage collections invoice cash issue Brandon Misty finance accounting subcontractor paid unpaid release required",
    owner: "Finance / accounting",
    status: "Executive follow-through",
    tone: "risk",
  },
  {
    section: "needsBrandon",
    title: "People, access, legal, or company-property issue",
    query:
      "employee issue termination legal HR access remove credentials company property recover laptop hotel Brandon escalation",
    owner: "Operations / IT / HR",
    status: "Verify handled",
    tone: "risk",
  },
  {
    section: "waitingOnOthers",
    title: "Pricing, quote, or proposal waiting on someone else",
    query:
      "waiting on pricing quote proposal estimate subcontractor pricing building shell budget report Liverpool CECO Union Collective",
    owner: "Estimating / vendor",
    status: "Waiting on pricing",
    tone: "watch",
  },
  {
    section: "waitingOnOthers",
    title: "Drawings, survey, utility, or client approval blocker",
    query:
      "waiting on drawings survey client feedback design approval utility electrical HVAC civil permit project blocker",
    owner: "Project team / client",
    status: "Waiting on input",
    tone: "watch",
  },
  {
    section: "importantUpdates",
    title: "Project execution, schedule, or site coordination risk",
    query:
      "high priority project execution issue material delay crew coordination safety site logistics shutdown urgent blocker",
    owner: "Project owner",
    status: "Monitor",
    tone: "watch",
  },
  {
    section: "importantUpdates",
    title: "Business, backlog, margin, or finance signal",
    query:
      "financial statement profitability margin backlog cash flow AR AP invoice bill collections pay app retainage business signal",
    owner: "Leadership / finance",
    status: "Monitor",
    tone: "watch",
  },
];

const FALLBACK_KEYWORDS = [
  "Brandon",
  "insurance",
  "license",
  "workers compensation",
  "COI",
  "permit",
  "wire",
  "Wilmer",
  "subcontractor",
  "pricing",
  "quote",
  "proposal",
  "drawing",
  "survey",
  "client feedback",
  "couplings",
  "retainage",
];

function compactText(value: unknown, maxLength = 720): string {
  return normalizeText(value).slice(0, maxLength);
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\n\r\t ]+/g, " ")
    .trim();
}

function compactCompleteText(value: unknown, maxLength = 320): string {
  const text = normalizeText(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("?"),
    clipped.lastIndexOf("!"),
  );
  if (sentenceEnd >= Math.min(80, maxLength - 1)) {
    return clipped.slice(0, sentenceEnd + 1).trim();
  }
  const lastSpace = clipped.lastIndexOf(" ");
  return clipped.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim();
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEasternDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function getWindowStartDateKey(windowDays: number): string {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(windowDays - 1, 0));
  return getEasternDateKey(start);
}

function getRecencyAnchor(row: RecentSourceRow): string | null {
  if (row.category === "teams_message") {
    return row.date ?? row.captured_at ?? null;
  }

  if (row.category === "email") {
    return row.created_at ?? row.date ?? row.captured_at ?? null;
  }

  if (row.type === "meeting") {
    return row.date ?? row.captured_at ?? row.created_at ?? null;
  }

  return row.date ?? row.captured_at ?? row.created_at ?? null;
}

function isRecentSourceRow(
  row: RecentSourceRow,
  cutoffDateKey: string,
): boolean {
  const anchor = getRecencyAnchor(row);
  const parsed = parseDate(anchor);
  return parsed !== null && getEasternDateKey(parsed) >= cutoffDateKey;
}

function formatDate(value: Date | null): string {
  if (!value) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatSourceDate(rawValue: string | null | undefined): string {
  if (!rawValue) return "Unknown date";
  const parsed = parseDate(rawValue);
  if (!parsed) return "Unknown date";

  const isUtcDayStamp = /T00:00:00(?:\.000)?(?:\+00:00|Z)$/i.test(rawValue);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(isUtcDayStamp ? { timeZone: "UTC" } : {}),
  }).format(parsed);
}

function formatMonthDayOrdinal(value: Date): string {
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    value,
  );
  const day = value.getDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  return `${month} ${day}${suffix}, ${value.getFullYear()}`;
}

function formatMonthDayOrdinalWithoutYear(value: Date): string {
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    value,
  );
  const day = value.getDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  return `${month} ${day}${suffix}`;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(value.getDate() + days);
  return next;
}

function nextMonday(value: Date): Date {
  const daysUntil = (1 - value.getDay() + 7) % 7 || 7;
  return addDays(value, daysUntil);
}

function formatDateRange(start: Date, end: Date): string {
  if (start.getFullYear() === end.getFullYear()) {
    return `${formatMonthDayOrdinalWithoutYear(start)}-${formatMonthDayOrdinal(end)}`;
  }
  return `${formatMonthDayOrdinal(start)}-${formatMonthDayOrdinal(end)}`;
}

const weekdayIndexes: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function expandRelativeWeekdays(value: string, sourceDate: string): string {
  const baseDate = parseDate(sourceDate);
  if (!baseDate) return value;

  const withRelativePeriods = value
    .replace(/\bearly next week\b(?!,\s+[A-Z][a-z]+\s+\d)/gi, (match) => {
      const start = nextMonday(baseDate);
      const end = addDays(start, 2);
      return `${match}, ${formatDateRange(start, end)}`;
    })
    .replace(/\bnext week\b(?!,\s+(?:week of|[A-Z][a-z]+\s+\d))/gi, (match) => {
      const start = nextMonday(baseDate);
      return `${match}, week of ${formatMonthDayOrdinal(start)}`;
    });

  return withRelativePeriods.replace(
    /\bnext\s+(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b(?!,\s+[A-Z][a-z]+\s+\d)/gi,
    (match, weekday: string) => {
      const targetDay = weekdayIndexes[weekday.toLowerCase()];
      if (targetDay === undefined) return match;
      const daysUntil = (targetDay - baseDate.getDay() + 7) % 7 || 7;
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + daysUntil);
      return `${match}, ${formatMonthDayOrdinal(targetDate)}`;
    },
  );
}

function isWithinWindow(value: Date | null, cutoffDateKey: string): boolean {
  return value !== null && getEasternDateKey(value) >= cutoffDateKey;
}

function sourceDetail(hit: RankedHit): string {
  const title = hit.row.doc_title ?? hit.metadata?.title ?? "";
  return compactText(title, 90);
}

function projectLabel(hit: RankedHit): string {
  const projectId = hit.row.doc_project_id ?? hit.metadata?.project_id ?? null;
  const project = hit.metadata?.project ?? null;
  if (projectId && project) return `${projectId} ${project}`;
  if (projectId) return String(projectId);
  return project ?? "No project linked";
}

function sourceUrl(row: DocumentMetaRow | undefined): string | undefined {
  const url =
    row?.source_web_url ??
    row?.fireflies_link ??
    row?.meeting_link ??
    row?.url ??
    null;
  return url?.startsWith("http") ? url : undefined;
}

function sourceUrlFromRecentRow(
  row: RecentCommunicationRow,
): string | undefined {
  const url = row.source_web_url ?? row.url ?? null;
  return url?.startsWith("http") ? url : undefined;
}

function evidenceText(hit: RankedHit): string {
  return normalizeText(hit.text);
}

function citationFromHit(hit: RankedHit): BriefCitation {
  const evidence = evidenceText(hit);
  return {
    source: hit.sourceGroup.label,
    sourceDetail: sourceDetail(hit),
    sourceUrl: sourceUrl(hit.metadata),
    sourceId: hit.row.document_id ?? hit.metadata?.id,
    evidence,
    date: formatDate(hit.date),
  };
}

function buildItem(hit: RankedHit): BrandonBriefItem {
  const citation = citationFromHit(hit);
  return {
    title: hit.spec.title,
    summary: citation.evidence ?? "",
    evidenceFacts: [],
    bullets: [],
    source: citation.source,
    sourceDetail: citation.sourceDetail,
    sourceUrl: citation.sourceUrl,
    sourceId: citation.sourceId,
    evidence: citation.evidence,
    date: citation.date,
    citations: [citation],
    project: projectLabel(hit),
    owner: hit.spec.owner,
    status: hit.spec.status,
    tone: hit.spec.tone,
    retrieval: `RAG: search_document_chunks(${hit.sourceGroup.sourceTypes.join(", ")}), sim ${hit.similarity.toFixed(3)}`,
  };
}

function makeFallbackItem(row: DocumentMetaRow): BrandonBriefItem | null {
  const text = compactText(
    row.summary ?? row.overview ?? row.action_items,
    520,
  );
  if (!text) return null;
  if (!row.title) return null;

  const source =
    row.source_system ??
    row.source ??
    row.type ??
    row.category ??
    "document_metadata";
  const sourceLink = sourceUrl(row);
  const normalizedSource = `${source} ${sourceLink ?? ""}`.toLowerCase();
  const sourceLabel: BriefSource = normalizedSource.includes("team")
    ? "Teams"
    : normalizedSource.includes("fireflies") ||
        normalizedSource.includes("meeting")
      ? "Meeting"
      : normalizedSource.includes("outlook") ||
          normalizedSource.includes("email")
        ? "Email"
        : "Document";
  const citation: BriefCitation = {
    source: sourceLabel,
    sourceDetail: compactText(row.title, 90),
    sourceUrl: sourceLink,
    sourceId: row.id,
    evidence: text,
    date: formatSourceDate(row.date ?? row.created_at ?? row.captured_at),
  };
  if (citation.date === "Unknown date") return null;

  return {
    title: row.title,
    summary: text,
    evidenceFacts: [],
    bullets: [],
    source: citation.source,
    sourceDetail: citation.sourceDetail,
    sourceUrl: citation.sourceUrl,
    sourceId: citation.sourceId,
    evidence: citation.evidence,
    date: citation.date,
    citations: [citation],
    project: row.project_id
      ? `${row.project_id}${row.project ? ` ${row.project}` : ""}`
      : (row.project ?? "No project linked"),
    status: "Recent source review",
    tone: "neutral",
    retrieval: "Recent document_metadata keyword match",
  };
}

const COMMUNICATION_SIGNAL_SPECS: CommunicationSignalSpec[] = [
  {
    id: "insurance_compliance",
    section: "needsBrandon",
    title: "Insurance, COI, or permit issue still blocking the business",
    owner: "Brandon / operations / insurance",
    status: "Needs confirmation",
    tone: "risk",
    source: "Email",
    categories: ["email"],
    required: ["insurance"],
    optional: [
      "permit",
      "coi",
      "workers compensation",
      "license",
      "str26",
      "indianapolis",
    ],
    recommendedAction:
      "Confirm the current COI and workers compensation proof are in hand and that the permit or license blocker is fully cleared.",
    whyItMatters:
      "This is the kind of administrative failure that can quietly stop work or suspend the company until someone closes the loop.",
  },
  {
    id: "retainage_release",
    section: "needsBrandon",
    title: "Retainage or payment release issue needs a clean answer",
    owner: "Accounting / PM",
    status: "Needs confirmation",
    tone: "watch",
    source: "Email",
    categories: ["email"],
    required: ["retainage"],
    optional: ["release", "deem", "check run", "owed", "invoice", "payment"],
    recommendedAction:
      "Confirm the amount owed, whether the payment is actually queued, and whether the field team still sees a mismatch between Job Planner and Acumatica.",
    whyItMatters:
      "Payment ambiguity creates immediate trust and execution problems with subcontractors.",
  },
  {
    id: "pricing_wait",
    section: "waitingOnOthers",
    title: "Pricing or proposal follow-up is still waiting on someone else",
    owner: "Estimating / vendor",
    status: "Waiting on pricing",
    tone: "watch",
    source: "Email",
    categories: ["email"],
    required: ["pricing"],
    optional: ["quote", "proposal", "liverpool", "ceco", "development"],
    recommendedAction:
      "Push for the missing pricing input so the team can make a yes/no decision instead of carrying the thread another day.",
    whyItMatters:
      "This is pipeline work that tends to get ignored unless it is turned into a named executive follow-up.",
  },
  {
    id: "finance_dm",
    section: "needsBrandon",
    title: "Same-day Teams finance thread needs follow-through",
    owner: "Finance / accounting",
    status: "Executive follow-through",
    tone: "watch",
    source: "Teams",
    categories: ["teams_message"],
    required: ["financial"],
    optional: [
      "payment",
      "transaction",
      "wire",
      "accounting",
      "misty",
      "check",
    ],
    recommendedAction:
      "Confirm who owns the next step and whether the issue is resolved outside the DM thread.",
    whyItMatters:
      "Same-day finance DMs are often where cash or approval issues first show up before they are reflected anywhere else.",
  },
];

function getRecentCommunicationText(row: RecentCommunicationRow): string {
  return normalizeText(row.overview ?? row.summary ?? row.action_items);
}

function getSignalScore(
  haystack: string,
  spec: CommunicationSignalSpec,
): number {
  const requiredMatches = spec.required.filter((keyword) =>
    haystack.includes(keyword),
  );
  if (requiredMatches.length === 0) return 0;
  const optionalMatches = (spec.optional ?? []).filter((keyword) =>
    haystack.includes(keyword),
  );
  return requiredMatches.length * 5 + optionalMatches.length;
}

function buildCommunicationSignalItem(
  row: RecentCommunicationRow,
  spec: CommunicationSignalSpec,
  evidenceCount: number,
  additionalRows: RecentCommunicationRow[] = [],
): BrandonBriefItem | null {
  const evidence = getRecentCommunicationText(row);
  const summary = compactText(evidence, 360);
  if (!summary || !row.title) return null;

  const primaryCitation: BriefCitation = {
    source: spec.source,
    sourceDetail: compactText(row.title, 90),
    sourceUrl: sourceUrlFromRecentRow(row),
    sourceId: row.id,
    evidence,
    date: formatSourceDate(row.date ?? row.created_at ?? row.captured_at),
  };
  if (primaryCitation.date === "Unknown date") return null;

  const extraCitations: BriefCitation[] = additionalRows
    .slice(0, 4)
    .map((extra) => ({
      source: spec.source,
      sourceDetail: compactText(extra.title ?? "", 90),
      sourceUrl: sourceUrlFromRecentRow(extra),
      sourceId: extra.id,
      evidence: getRecentCommunicationText(extra),
      date: formatSourceDate(
        extra.date ?? extra.created_at ?? extra.captured_at,
      ),
    }))
    .filter(
      (citation) =>
        citation.sourceDetail &&
        citation.evidence &&
        citation.date !== "Unknown date",
    );

  return {
    title: spec.title,
    summary,
    evidenceFacts: [
      evidenceCount > 1
        ? `${evidenceCount} recent related communication records matched this issue.`
        : "",
      ...[primaryCitation, ...extraCitations]
        .map((citation) => compactText(citation.evidence, 180))
        .filter(Boolean),
    ]
      .filter(Boolean)
      .slice(0, 6),
    bullets: [
      evidenceCount > 1
        ? `${evidenceCount} recent related communication records matched this issue.`
        : "",
      row.title ? compactText(row.title, 140) : "",
      "",
    ].filter(Boolean),
    recommendedAction: spec.recommendedAction,
    whyItMatters: spec.whyItMatters,
    source: primaryCitation.source,
    sourceDetail: primaryCitation.sourceDetail,
    sourceUrl: primaryCitation.sourceUrl,
    sourceId: primaryCitation.sourceId,
    evidence: primaryCitation.evidence,
    date: primaryCitation.date,
    citations: [primaryCitation, ...extraCitations],
    project: row.project_id
      ? `${row.project_id}${row.project ? ` ${row.project}` : ""}`
      : (row.project ?? "No project linked"),
    owner: spec.owner,
    status: spec.status,
    tone: spec.tone,
    retrieval: `Recent communication signal: ${spec.id}`,
  };
}

async function loadRecentCommunicationSignalItems(
  cutoffIso: string,
): Promise<RecentCommunicationSignalResult> {
  const supabase = createServiceClient();
  const cutoffDateKey = getEasternDateKey(
    parseDate(cutoffIso) ?? new Date(cutoffIso),
  );
  const sections: BrandonDailyUpdatePacket["sections"] = {
    needsBrandon: [],
    waitingOnOthers: [],
    importantUpdates: [],
  };
  const warnings: string[] = [];

  const selectClause =
    "id,title,project,project_id,date,created_at,captured_at,summary,overview,action_items,source_web_url,url,status,category,type";

  const [
    { data: emailRows, error: emailError },
    { data: teamsRows, error: teamsError },
  ] = await Promise.all([
    supabase
      .from("document_metadata")
      .select(selectClause)
      .eq("category", "email")
      .or(
        `date.gte.${cutoffIso},created_at.gte.${cutoffIso},captured_at.gte.${cutoffIso}`,
      )
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("document_metadata")
      .select(selectClause)
      .eq("category", "teams_message")
      .or(
        `date.gte.${cutoffIso},created_at.gte.${cutoffIso},captured_at.gte.${cutoffIso}`,
      )
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (emailError) {
    warnings.push(`Email signal retrieval failed: ${emailError.message}`);
  }

  if (teamsError) {
    warnings.push(`Teams signal retrieval failed: ${teamsError.message}`);
  }

  if (emailError && teamsError) {
    return { sections, warnings };
  }

  const rows = (
    [...(emailRows ?? []), ...(teamsRows ?? [])] as RecentCommunicationRow[]
  ).filter((row) => isRecentSourceRow(row, cutoffDateKey));

  for (const spec of COMMUNICATION_SIGNAL_SPECS) {
    const matches = rows
      .filter((row) =>
        spec.categories.includes(
          (row.category ?? "") as NonNullable<
            RecentCommunicationRow["category"]
          >,
        ),
      )
      .map((row) => {
        const haystack =
          `${row.title ?? ""} ${getRecentCommunicationText(row)}`.toLowerCase();
        const score = getSignalScore(haystack, spec);
        return { row, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTime = parseDate(getRecencyAnchor(a.row))?.getTime() ?? 0;
        const bTime = parseDate(getRecencyAnchor(b.row))?.getTime() ?? 0;
        return bTime - aTime;
      });

    if (matches.length === 0) continue;
    const [primary, ...rest] = matches;
    const item = buildCommunicationSignalItem(
      primary.row,
      spec,
      matches.length,
      rest.map((entry) => entry.row),
    );
    if (item) {
      sections[spec.section].push(item);
    } else {
      warnings.push(
        `Recent communication signal ${spec.id} was suppressed because the matched row lacked source text, title, or a valid date.`,
      );
    }
  }

  return { sections, warnings };
}

async function runChunkSearch(
  queryEmbedding: string,
  sourceGroup: SourceGroup,
): Promise<RagRow[]> {
  const supabase = createServiceClient() as unknown as RagRpcClient;
  const { data, error } = await supabase.rpc("search_document_chunks", {
    query_embedding: queryEmbedding,
    filter_source_types: sourceGroup.sourceTypes,
    filter_project_id: null,
    match_count: 10,
    match_threshold: 0.08,
  });

  if (error) {
    throw new Error(
      `search_document_chunks failed for ${sourceGroup.label}: ${error.message}`,
    );
  }

  return data ?? [];
}

async function loadMetadata(
  documentIds: string[],
): Promise<Map<string, DocumentMetaRow>> {
  if (documentIds.length === 0) return new Map();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id,title,project,project_id,date,created_at,captured_at,source_system,source,type,category,summary,overview,action_items,content,raw_text,url,source_web_url,fireflies_link,meeting_link",
    )
    .in("id", documentIds);

  if (error) {
    throw new Error(`document_metadata lookup failed: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as DocumentMetaRow[]).map((row) => [row.id, row]),
  );
}

async function loadFallbackMetadata(
  cutoff: Date,
  limit = 8,
): Promise<FallbackMetadataResult> {
  const supabase = createServiceClient();
  const cutoffIso = cutoff.toISOString();
  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id,title,project,project_id,date,created_at,captured_at,source_system,source,type,category,summary,overview,action_items,content,raw_text,url,source_web_url,fireflies_link,meeting_link",
    )
    .gte("created_at", cutoffIso)
    .or(
      FALLBACK_KEYWORDS.map((keyword) => `summary.ilike.%${keyword}%`).join(
        ",",
      ),
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      rows: [],
      warnings: [`Document fallback retrieval failed: ${error.message}`],
    };
  }

  return {
    rows: (data ?? []) as DocumentMetaRow[],
    warnings: [],
  };
}

async function loadRecentSourceCoverage(
  cutoffIso: string,
): Promise<BrandonBriefSourceCoverage[]> {
  const supabase = createServiceClient();
  const cutoffDateKey = getEasternDateKey(
    parseDate(cutoffIso) ?? new Date(cutoffIso),
  );

  const coverageQueries = await Promise.all(
    SOURCE_GROUPS.map(async (group) => {
      let rowsQuery = supabase
        .from("document_metadata")
        .select("date,created_at,captured_at,category,type")
        .or(
          `date.gte.${cutoffIso},created_at.gte.${cutoffIso},captured_at.gte.${cutoffIso}`,
        );

      if (group.label === "Email") {
        rowsQuery = rowsQuery.eq("category", "email");
      } else if (group.label === "Teams") {
        rowsQuery = rowsQuery.eq("category", "teams_message");
      } else if (group.label === "Meeting") {
        rowsQuery = rowsQuery.eq("type", "meeting");
      } else {
        rowsQuery = rowsQuery.eq("category", "document");
      }

      const { data: rows, error } = await rowsQuery.limit(2500);
      if (error) {
        return {
          label: group.label,
          detail: group.detail,
          count: 0,
          latest: "Unknown date",
          status: "warning" as const,
          warning: `${group.label} source coverage failed: ${error.message}`,
        };
      }

      const recentRows = ((rows ?? []) as RecentSourceRow[]).filter((row) =>
        isRecentSourceRow(row, cutoffDateKey),
      );
      const latestValue =
        recentRows
          .map((row) => getRecencyAnchor(row))
          .filter((value): value is string => Boolean(value))
          .sort()
          .reverse()[0] ?? null;

      return {
        label: group.label,
        detail: group.detail,
        count: recentRows.length,
        latest: formatSourceDate(latestValue),
        status:
          recentRows.length > 0 ? ("loaded" as const) : ("empty" as const),
      };
    }),
  );

  return coverageQueries;
}

function dedupeHits(hits: RankedHit[]): RankedHit[] {
  const byDocument = new Map<string, RankedHit>();
  for (const hit of hits) {
    const documentId = hit.row.document_id ?? hit.row.chunk_id ?? hit.text;
    const existing = byDocument.get(documentId);
    if (!existing || hit.similarity > existing.similarity) {
      byDocument.set(documentId, hit);
    }
  }
  return [...byDocument.values()].sort((a, b) => b.similarity - a.similarity);
}

function assignHitsToSections(
  hits: RankedHit[],
  fallbacks: BrandonBriefItem[],
): BrandonDailyUpdatePacket["sections"] {
  const sections: BrandonDailyUpdatePacket["sections"] = {
    needsBrandon: [],
    waitingOnOthers: [],
    importantUpdates: [],
  };

  for (const hit of hits) {
    const section = sections[hit.spec.section];
    if (section.length >= (hit.spec.section === "needsBrandon" ? 4 : 3)) {
      continue;
    }
    section.push(buildItem(hit));
  }

  for (const fallback of fallbacks) {
    if (sections.importantUpdates.length >= 3) break;
    sections.importantUpdates.push(fallback);
  }

  return sections;
}

function mergeSeedItems(
  sections: BrandonDailyUpdatePacket["sections"],
  seedSections: BrandonDailyUpdatePacket["sections"],
): BrandonDailyUpdatePacket["sections"] {
  const limits: Record<keyof BrandonDailyUpdatePacket["sections"], number> = {
    needsBrandon: 4,
    waitingOnOthers: 4,
    importantUpdates: 4,
  };

  const dedupe = (items: BrandonBriefItem[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.title.toLowerCase()}|${item.project.toLowerCase()}|${item.sourceDetail.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    needsBrandon: dedupe([
      ...seedSections.needsBrandon,
      ...sections.needsBrandon,
    ]).slice(0, limits.needsBrandon),
    waitingOnOthers: dedupe([
      ...seedSections.waitingOnOthers,
      ...sections.waitingOnOthers,
    ]).slice(0, limits.waitingOnOthers),
    importantUpdates: dedupe([
      ...seedSections.importantUpdates,
      ...sections.importantUpdates,
    ]).slice(0, limits.importantUpdates),
  };
}

function briefItemSupportIssues(item: BrandonBriefItem): string[] {
  const issues: string[] = [];

  if (!item.title.trim()) issues.push("missing title");
  if (!item.summary.trim()) issues.push("missing summary");
  if (!item.project.trim()) issues.push("missing project label");
  if (!item.sourceDetail.trim()) issues.push("missing source detail");
  if (!item.date.trim() || item.date === "Unknown date")
    issues.push("missing valid source date");
  if (!item.sourceId && !item.sourceUrl)
    issues.push("missing source id or source url");
  if (!Array.isArray(item.citations) || item.citations.length === 0) {
    issues.push("missing citations");
  }

  item.citations.forEach((citation, index) => {
    const prefix = `citation ${index + 1}`;
    if (!citation.sourceDetail.trim())
      issues.push(`${prefix} missing source detail`);
    if (!citation.evidence?.trim()) issues.push(`${prefix} missing evidence`);
    if (!citation.date.trim() || citation.date === "Unknown date")
      issues.push(`${prefix} missing valid source date`);
    if (!citation.sourceId && !citation.sourceUrl)
      issues.push(`${prefix} missing source id or source url`);
  });

  return issues;
}

function filterSupportedSections(
  sections: BrandonDailyUpdatePacket["sections"],
): SupportedSectionsResult {
  const warnings: string[] = [];

  const filterItems = (
    section: keyof BrandonDailyUpdatePacket["sections"],
    items: BrandonBriefItem[],
  ) =>
    items.filter((item) => {
      const issues = briefItemSupportIssues(item);
      if (issues.length === 0) return true;
      warnings.push(
        `Suppressed unsupported ${section} item "${item.title || "(untitled)"}": ${issues.join(", ")}.`,
      );
      return false;
    });

  return {
    sections: {
      needsBrandon: filterItems("needsBrandon", sections.needsBrandon),
      waitingOnOthers: filterItems("waitingOnOthers", sections.waitingOnOthers),
      importantUpdates: filterItems(
        "importantUpdates",
        sections.importantUpdates,
      ),
    },
    warnings,
  };
}

function stripJsonFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeSynthesizedItem(
  item: SynthesizedBriefItem,
  candidates: BrandonBriefItem[],
  usedSourceIndexes: Set<number>,
): BrandonBriefItem | null {
  const rawIndexes =
    item.sourceIndexes && item.sourceIndexes.length > 0
      ? item.sourceIndexes
      : typeof item.sourceIndex === "number"
        ? [item.sourceIndex]
        : [];
  const validIndexes = rawIndexes
    .filter(
      (idx) =>
        Number.isInteger(idx) &&
        candidates[idx] !== undefined &&
        !usedSourceIndexes.has(idx),
    )
    .slice(0, 5);
  if (validIndexes.length === 0) return null;
  if (!item.title || !item.summary) return null;

  for (const idx of validIndexes) {
    usedSourceIndexes.add(idx);
  }

  const primary = candidates[validIndexes[0]];
  const mergedCitations: BriefCitation[] = [];
  const seenCitationKeys = new Set<string>();
  for (const idx of validIndexes) {
    for (const citation of candidates[idx].citations) {
      const key = `${citation.source}|${citation.sourceId ?? citation.sourceUrl ?? citation.sourceDetail}`;
      if (seenCitationKeys.has(key)) continue;
      seenCitationKeys.add(key);
      mergedCitations.push(citation);
    }
  }

  const primaryCitation = mergedCitations[0] ?? primary.citations[0];

  return {
    ...primary,
    title: compactText(item.title, 120),
    summary: expandRelativeWeekdays(
      compactText(item.summary, 420),
      primary.date,
    ),
    evidenceFacts: (item.evidenceFacts ?? [])
      .map((fact) =>
        expandRelativeWeekdays(compactText(fact, 220), primary.date),
      )
      .filter(Boolean)
      .slice(0, 6),
    bullets: (item.bullets ?? [])
      .map((bullet) =>
        expandRelativeWeekdays(compactText(bullet, 180), primary.date),
      )
      .filter(Boolean)
      .slice(0, 4),
    recommendedAction: item.recommendedAction
      ? expandRelativeWeekdays(
          compactText(item.recommendedAction, 220),
          primary.date,
        )
      : primary.recommendedAction,
    whyItMatters: item.whyItMatters
      ? expandRelativeWeekdays(
          compactText(item.whyItMatters, 220),
          primary.date,
        )
      : primary.whyItMatters,
    status: item.status ?? primary.status,
    tone: item.tone ?? primary.tone,
    source: primaryCitation.source,
    sourceDetail: primaryCitation.sourceDetail,
    sourceUrl: primaryCitation.sourceUrl,
    sourceId: primaryCitation.sourceId,
    evidence: primaryCitation.evidence,
    date: primaryCitation.date,
    citations: mergedCitations,
  };
}

async function synthesizeSections(
  sections: BrandonDailyUpdatePacket["sections"],
): Promise<{
  sections: BrandonDailyUpdatePacket["sections"];
  modelUsed: string;
  warnings: string[];
}> {
  const candidates = [
    ...sections.needsBrandon,
    ...sections.waitingOnOthers,
    ...sections.importantUpdates,
  ];
  const synthesisModel = executiveBriefingSynthesisModel();
  if (candidates.length === 0) {
    return { sections, modelUsed: synthesisModel, warnings: [] };
  }

  const candidatePayload = candidates.map((item, index) => ({
    index,
    suggestedSection:
      index < sections.needsBrandon.length
        ? "needsBrandon"
        : index < sections.needsBrandon.length + sections.waitingOnOthers.length
          ? "waitingOnOthers"
          : "importantUpdates",
    retrievedTitle: item.title,
    project: item.project,
    source: item.source,
    sourceDetail: item.sourceDetail,
    sourceDate: item.date,
    status: item.status,
    owner: item.owner,
    evidence: item.evidence ?? item.summary,
    existingCitationCount: item.citations.length,
  }));
  const system =
    "You write a daily executive business brief from an AI business strategist to Brandon. " +
    "Do not refer to Brandon in the third person. Prefer direct facts and, only when needed, 'you'. " +
    "Turn raw RAG excerpts into clear business insights. Do not copy truncated excerpts. " +
    "Use concrete names, dates, dollars, quantities, blockers, and commitments when present. " +
    "When using relative dates such as next Wednesday, include the exact calendar date in the same sentence. " +
    "If a source is too vague to be useful, exclude it. " +
    "CRITICAL - cross-source synthesis: when multiple candidates describe the same underlying issue (same project + same vendor/contract/topic, even from different sources like an email + a meeting + a Teams thread), MERGE them into a single item and list ALL relevant candidate indexes in sourceIndexes. Each candidate index may appear in only one item across the whole output, but each item may cite multiple indexes. Prefer corroborated multi-source items over single-source items. " +
    "Use needsBrandon only when the evidence shows a decision, confirmation, commitment, money/risk issue, or escalation that belongs at owner level. " +
    "Use waitingOnOthers for project-team, client, vendor, estimating, finance, or design inputs that are pending. " +
    "Return ONLY valid JSON with keys needsBrandon, waitingOnOthers, importantUpdates. " +
    "Each item must include: title, summary, evidenceFacts, bullets, recommendedAction, whyItMatters, sourceIndexes (array of integers, ordered most-relevant first), status, tone. " +
    "evidenceFacts must be a concise bulleted fact list synthesized from all selected sources for that item. Use direct facts with names, dates, dollars, blockers, and commitments. Do not include unsupported facts. " +
    "Titles should be specific, not bucket names. Bullets should be short facts, not paragraphs. " +
    "Tone must be one of risk, watch, good, neutral.";
  const user =
    "Create the Brandon daily update from these retrieved source candidates. " +
    "Keep at most 4 needsBrandon, 4 waitingOnOthers, and 4 importantUpdates. " +
    "Only include items a construction business owner would reasonably care about today.\n\n" +
    JSON.stringify(candidatePayload, null, 2);

  try {
    const result = await generateText({
      model: getLanguageModel(synthesisModel),
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: user }],
    });

    const raw = result.text.trim();
    if (!raw) {
      throw new Error("AI SDK generateText returned an empty response.");
    }
    const parsed = JSON.parse(stripJsonFence(raw)) as SynthesizedBriefSections;
    const usedSourceIndexes = new Set<number>();
    return {
      sections: {
        needsBrandon: (parsed.needsBrandon ?? [])
          .map((item) =>
            normalizeSynthesizedItem(item, candidates, usedSourceIndexes),
          )
          .filter((item): item is BrandonBriefItem => item !== null),
        waitingOnOthers: (parsed.waitingOnOthers ?? [])
          .map((item) =>
            normalizeSynthesizedItem(item, candidates, usedSourceIndexes),
          )
          .filter((item): item is BrandonBriefItem => item !== null),
        importantUpdates: (parsed.importantUpdates ?? [])
          .map((item) =>
            normalizeSynthesizedItem(item, candidates, usedSourceIndexes),
          )
          .filter((item): item is BrandonBriefItem => item !== null),
      },
      modelUsed: synthesisModel,
      warnings: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      sections,
      modelUsed: synthesisModel,
      warnings: [
        `Executive briefing synthesis failed with ${synthesisModel}; using pre-synthesis source assignments. ${message}`,
      ],
    };
  }
}

function mapBriefSections(
  sections: BrandonDailyUpdatePacket["sections"],
  mapper: (
    item: BrandonBriefItem,
    section: keyof BrandonDailyUpdatePacket["sections"],
    index: number,
  ) => BrandonBriefItem,
): BrandonDailyUpdatePacket["sections"] {
  return {
    needsBrandon: sections.needsBrandon.map((item, index) =>
      mapper(item, "needsBrandon", index),
    ),
    waitingOnOthers: sections.waitingOnOthers.map((item, index) =>
      mapper(item, "waitingOnOthers", index),
    ),
    importantUpdates: sections.importantUpdates.map((item, index) =>
      mapper(item, "importantUpdates", index),
    ),
  };
}

function itemEvidencePayload(item: BrandonBriefItem) {
  return item.citations.map((citation, citationIndex) => ({
    citationIndex,
    source: citation.source,
    sourceDetail: citation.sourceDetail,
    date: citation.date,
    evidence: citation.evidence ?? "",
  }));
}

function fallbackEvidenceFacts(item: BrandonBriefItem): string[] {
  const existingFacts = item.evidenceFacts?.filter(Boolean) ?? [];
  if (existingFacts.length > 0) return existingFacts.slice(0, 6);
  const bulletFacts = item.bullets.filter(Boolean);
  if (bulletFacts.length > 0) return bulletFacts.slice(0, 6);
  return item.citations
    .map((citation) => compactCompleteText(citation.evidence, 260))
    .filter(Boolean)
    .slice(0, 6);
}

async function enrichBriefSections(
  sections: BrandonDailyUpdatePacket["sections"],
): Promise<{
  sections: BrandonDailyUpdatePacket["sections"];
  warnings: string[];
}> {
  const items = [
    ...sections.needsBrandon.map((item, index) => ({
      section: "needsBrandon" as const,
      index,
      item,
    })),
    ...sections.waitingOnOthers.map((item, index) => ({
      section: "waitingOnOthers" as const,
      index,
      item,
    })),
    ...sections.importantUpdates.map((item, index) => ({
      section: "importantUpdates" as const,
      index,
      item,
    })),
  ];

  if (items.length === 0) return { sections, warnings: [] };

  const synthesisModel = executiveBriefingSynthesisModel();
  const payload = items.map(({ section, index, item }) => ({
    section,
    index,
    title: item.title,
    currentSummary: item.summary,
    currentRecommendedAction: item.recommendedAction,
    currentWhyItMatters: item.whyItMatters,
    project: item.project,
    status: item.status,
    owner: item.owner,
    citations: itemEvidencePayload(item),
  }));

  const system =
    "You turn executive briefing source evidence into usable operating intelligence. " +
    "Use only the supplied citation evidence. Do not invent, infer beyond the evidence, or add placeholder facts. " +
    "For each item, write one tighter summary, 3 to 6 evidenceFacts, one recommendedAction, and whyItMatters. " +
    "Evidence facts must synthesize across all citations for the same item and remove repeated wording. " +
    "Prefer concrete names, dates, dollar amounts, projects, blockers, commitments, and owner/action state. " +
    "If the evidence does not support a fact, omit it. Return ONLY valid JSON.";
  const user =
    'Enrich these executive briefing items. Return JSON as {"items":[{"section":"needsBrandon|waitingOnOthers|importantUpdates","index":0,"summary":"...","evidenceFacts":["..."],"recommendedAction":"...","whyItMatters":"..."}]}.\n\n' +
    JSON.stringify(payload, null, 2);

  try {
    const result = await generateText({
      model: getLanguageModel(synthesisModel),
      temperature: 0.1,
      system,
      messages: [{ role: "user", content: user }],
    });

    const raw = result.text.trim();
    if (!raw)
      throw new Error("AI SDK generateText returned an empty response.");
    const parsed = JSON.parse(stripJsonFence(raw)) as EnrichedBriefItemsPayload;
    const enrichedByKey = new Map<string, EnrichedBriefItem>();
    for (const item of parsed.items ?? []) {
      if (
        !item ||
        !["needsBrandon", "waitingOnOthers", "importantUpdates"].includes(
          item.section,
        ) ||
        !Number.isInteger(item.index)
      ) {
        continue;
      }
      enrichedByKey.set(`${item.section}:${item.index}`, item);
    }

    return {
      sections: mapBriefSections(sections, (item, section, index) => {
        const enriched = enrichedByKey.get(`${section}:${index}`);
        if (!enriched) {
          return { ...item, evidenceFacts: fallbackEvidenceFacts(item) };
        }
        const anchorDate = item.date;
        const evidenceFacts = (enriched.evidenceFacts ?? [])
          .map((fact) =>
            expandRelativeWeekdays(compactCompleteText(fact, 320), anchorDate),
          )
          .filter(Boolean)
          .slice(0, 6);
        return {
          ...item,
          summary: enriched.summary
            ? expandRelativeWeekdays(
                compactCompleteText(enriched.summary, 500),
                anchorDate,
              )
            : item.summary,
          evidenceFacts:
            evidenceFacts.length > 0
              ? evidenceFacts
              : fallbackEvidenceFacts(item),
          recommendedAction: enriched.recommendedAction
            ? expandRelativeWeekdays(
                compactCompleteText(enriched.recommendedAction, 320),
                anchorDate,
              )
            : item.recommendedAction,
          whyItMatters: enriched.whyItMatters
            ? expandRelativeWeekdays(
                compactCompleteText(enriched.whyItMatters, 320),
                anchorDate,
              )
            : item.whyItMatters,
        };
      }),
      warnings: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      sections: mapBriefSections(sections, (item) => ({
        ...item,
        evidenceFacts: fallbackEvidenceFacts(item),
      })),
      warnings: [
        `Executive briefing evidence enrichment failed with ${synthesisModel}; using source-backed fallback facts. ${message}`,
      ],
    };
  }
}

export async function generateBrandonDailyUpdate(
  options: { windowDays?: number } = {},
): Promise<BrandonDailyUpdatePacket> {
  const windowDays = options.windowDays ?? DEFAULT_EXECUTIVE_WINDOW_DAYS;
  const windowStartDateKey = getWindowStartDateKey(windowDays);
  const cutoff = new Date(`${windowStartDateKey}T00:00:00-04:00`);
  const cutoffIso = cutoff.toISOString();
  const openai = getOpenAI();

  const embeddingsBySpec = await Promise.all(
    QUERY_SPECS.map(async (spec) => ({
      spec,
      queryEmbedding: await generateEmbedding(
        openai,
        spec.query,
        EMBEDDING.LARGE,
      ),
    })),
  );

  const rawHitGroups = await Promise.all(
    embeddingsBySpec.flatMap(({ spec, queryEmbedding }) =>
      SOURCE_GROUPS.map(async (sourceGroup) => {
        const rows = await runChunkSearch(queryEmbedding, sourceGroup);
        return rows.map((row) => ({ spec, sourceGroup, row }));
      }),
    ),
  );
  const rawHits = rawHitGroups.flat();

  const documentIds = [
    ...new Set(
      rawHits.map((hit) => hit.row.document_id).filter(Boolean) as string[],
    ),
  ];
  const metadata = await loadMetadata(documentIds);

  const rankedHits = rawHits
    .map((hit): RankedHit => {
      const meta = hit.row.document_id
        ? metadata.get(hit.row.document_id)
        : undefined;
      const date = parseDate(
        hit.row.doc_date ?? meta?.date ?? meta?.created_at ?? meta?.captured_at,
      );
      const text = normalizeText(
        hit.row.chunk_text ??
          hit.row.text ??
          meta?.summary ??
          meta?.overview ??
          meta?.action_items ??
          meta?.content ??
          meta?.raw_text,
      );
      return {
        id:
          hit.row.document_id ??
          hit.row.chunk_id ??
          `${hit.spec.title}-${hit.sourceGroup.label}`,
        ...hit,
        metadata: meta,
        date,
        similarity: hit.row.similarity ?? 0,
        text,
      };
    })
    .filter((hit) => hit.text.length > 30)
    .filter((hit) => isWithinWindow(hit.date, windowStartDateKey))
    .filter((hit) => hit.similarity >= 0.25);

  const dedupedHits = dedupeHits(rankedHits);
  const fallbackResult = await loadFallbackMetadata(cutoff);
  const fallbackItems = fallbackResult.rows
    .map(makeFallbackItem)
    .filter((item): item is BrandonBriefItem => item !== null);
  const seededSections = assignHitsToSections(dedupedHits, fallbackItems);
  const synthesizedResult = await synthesizeSections(seededSections);
  const communicationSignalResult =
    await loadRecentCommunicationSignalItems(cutoffIso);
  const supportedResult = filterSupportedSections(
    mergeSeedItems(
      synthesizedResult.sections,
      communicationSignalResult.sections,
    ),
  );
  const enrichedResult = await enrichBriefSections(supportedResult.sections);
  const sections = enrichedResult.sections;
  const sourceCoverage = await loadRecentSourceCoverage(cutoffIso);
  const sourceCoverageWarnings = sourceCoverage
    .map((source) => source.warning)
    .filter((warning): warning is string => Boolean(warning));
  const sourceHealthWarnings = [
    ...fallbackResult.warnings,
    ...synthesizedResult.warnings,
    ...communicationSignalResult.warnings,
    ...supportedResult.warnings,
    ...enrichedResult.warnings,
    ...sourceCoverageWarnings,
  ];

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    retrievalOrder: [
      "1. Recent email evidence",
      "2. Recent Teams messages",
      "3. Recent meeting transcripts and summaries",
      "4. Recent document records",
      "5. Older knowledge only as secondary context",
    ],
    sections,
    sourceCoverage,
    retrievalNotes: [
      `Executive briefing source of truth: recap_kind=executive_briefing. Backend recap_kind=meeting_digest is the legacy meeting digest and must not be treated as the CEO operating brief.`,
      `Executive synthesis model: ${synthesizedResult.modelUsed}. Override with EXECUTIVE_BRIEFING_SYNTHESIS_MODEL only when the CEO brief intentionally needs a different model.`,
      "The briefing window now follows calendar days in Eastern time so day-stamped email and Teams activity is not dropped mid-morning.",
      "Recent communication evidence leads the brief so stale memory does not dominate.",
      "Low-confidence items are excluded unless they have recent source evidence.",
      "Every surfaced item keeps its source title, date, and link when the ingestion data provides one.",
      ...sourceHealthWarnings.map(
        (warning) => `Source health warning: ${warning}`,
      ),
    ],
  };
}
