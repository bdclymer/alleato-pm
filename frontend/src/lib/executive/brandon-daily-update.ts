import { createServiceClient } from "@/lib/supabase/service";
import {
  EMBEDDING,
  generateEmbedding,
  getOpenAI,
  getOpenAIModelId,
} from "@/lib/ai/tools/tool-utils";

type BriefTone = "neutral" | "good" | "watch" | "risk";
type BriefSource = "Email" | "Teams" | "Meeting" | "Document";

export const DEFAULT_EXECUTIVE_WINDOW_DAYS = 3;

export type BrandonBriefItem = {
  title: string;
  summary: string;
  bullets: string[];
  recommendedAction?: string;
  whyItMatters?: string;
  source: BriefSource;
  sourceDetail: string;
  sourceUrl?: string;
  sourceId?: string;
  evidence?: string;
  date: string;
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
  | "status"
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
  bullets?: string[];
  recommendedAction?: string;
  whyItMatters?: string;
  sourceIndex: number;
  status?: string;
  tone?: BriefTone;
};

type SynthesizedBriefSections = {
  needsBrandon?: SynthesizedBriefItem[];
  waitingOnOthers?: SynthesizedBriefItem[];
  importantUpdates?: SynthesizedBriefItem[];
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
  return String(value ?? "")
    .replace(/[\n\r\t ]+/g, " ")
    .trim()
    .slice(0, maxLength);
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

function isRecentSourceRow(row: RecentSourceRow, cutoffDateKey: string): boolean {
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
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(value);
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
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(value);
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
  const title = hit.row.doc_title ?? hit.metadata?.title ?? hit.spec.title;
  return compactText(title, 90);
}

function projectLabel(hit: RankedHit): string {
  const projectId = hit.row.doc_project_id ?? hit.metadata?.project_id ?? null;
  const project = hit.metadata?.project ?? null;
  if (projectId && project) return `${projectId} ${project}`;
  if (projectId) return String(projectId);
  return project ?? "Company";
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

function sourceUrlFromRecentRow(row: RecentCommunicationRow): string | undefined {
  const url = row.source_web_url ?? row.url ?? null;
  return url?.startsWith("http") ? url : undefined;
}

function evidenceText(hit: RankedHit): string {
  return compactText(hit.text, 900);
}

function buildItem(hit: RankedHit): BrandonBriefItem {
  const evidence = evidenceText(hit);
  return {
    title: hit.spec.title,
    summary: evidence || "Matched recent RAG source, but no usable snippet was available.",
    bullets: [],
    source: hit.sourceGroup.label,
    sourceDetail: sourceDetail(hit),
    sourceUrl: sourceUrl(hit.metadata),
    sourceId: hit.row.document_id ?? hit.metadata?.id,
    evidence,
    date: formatDate(hit.date),
    project: projectLabel(hit),
    owner: hit.spec.owner,
    status: hit.spec.status,
    tone: hit.spec.tone,
    retrieval: `RAG: search_document_chunks(${hit.sourceGroup.sourceTypes.join(", ")}), sim ${hit.similarity.toFixed(3)}`,
  };
}

function makeFallbackItem(row: DocumentMetaRow): BrandonBriefItem {
  const text = compactText(row.summary ?? row.overview ?? row.action_items, 520);
  const source = row.source_system ?? row.source ?? row.type ?? row.category ?? "document_metadata";
  const sourceLink = sourceUrl(row);
  const normalizedSource = `${source} ${sourceLink ?? ""}`.toLowerCase();
  const sourceLabel: BriefSource = normalizedSource.includes("team")
    ? "Teams"
    : normalizedSource.includes("fireflies") || normalizedSource.includes("meeting")
      ? "Meeting"
      : normalizedSource.includes("outlook") || normalizedSource.includes("email")
        ? "Email"
        : "Document";
  return {
    title: row.title ?? "Recent metadata fallback",
    summary: text || "Recent metadata matched the Brandon daily update keywords.",
    bullets: [],
    source: sourceLabel,
    sourceDetail: compactText(row.title ?? source, 90),
    sourceUrl: sourceLink,
    sourceId: row.id,
    evidence: text,
    date: formatSourceDate(row.date ?? row.created_at ?? row.captured_at),
    project: row.project_id ? `${row.project_id}${row.project ? ` ${row.project}` : ""}` : (row.project ?? "Company"),
    status: "Fallback review",
    tone: "neutral",
    retrieval: "Fallback: recent document_metadata keyword match",
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
    optional: ["permit", "coi", "workers compensation", "license", "str26", "indianapolis"],
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
    optional: ["payment", "transaction", "wire", "accounting", "misty", "check"],
    recommendedAction:
      "Confirm who owns the next step and whether the issue is resolved outside the DM thread.",
    whyItMatters:
      "Same-day finance DMs are often where cash or approval issues first show up before they are reflected anywhere else.",
  },
];

function getRecentCommunicationText(row: RecentCommunicationRow): string {
  return compactText(row.overview ?? row.summary ?? row.action_items, 900);
}

function getSignalScore(
  haystack: string,
  spec: CommunicationSignalSpec,
): number {
  const requiredMatches = spec.required.filter((keyword) => haystack.includes(keyword));
  if (requiredMatches.length === 0) return 0;
  const optionalMatches = (spec.optional ?? []).filter((keyword) => haystack.includes(keyword));
  return requiredMatches.length * 5 + optionalMatches.length;
}

function buildCommunicationSignalItem(
  row: RecentCommunicationRow,
  spec: CommunicationSignalSpec,
  evidenceCount: number,
): BrandonBriefItem {
  const evidence = getRecentCommunicationText(row);
  const summary =
    compactText(evidence, 360) ||
    "Recent communication evidence matched an executive signal pattern.";

  return {
    title: spec.title,
    summary,
    bullets: [
      evidenceCount > 1 ? `${evidenceCount} recent related communication records matched this issue.` : "",
      row.title ? compactText(row.title, 140) : "",
      row.status ? `Ingestion status: ${row.status}` : "",
    ].filter(Boolean),
    recommendedAction: spec.recommendedAction,
    whyItMatters: spec.whyItMatters,
    source: spec.source,
    sourceDetail: compactText(row.title ?? "Recent communication thread", 90),
    sourceUrl: sourceUrlFromRecentRow(row),
    sourceId: row.id,
    evidence,
    date: formatSourceDate(row.date ?? row.created_at ?? row.captured_at),
    project: row.project_id ? `${row.project_id}${row.project ? ` ${row.project}` : ""}` : (row.project ?? "Company"),
    owner: spec.owner,
    status: spec.status,
    tone: spec.tone,
    retrieval: `Recent communication signal: ${spec.id}`,
  };
}

async function loadRecentCommunicationSignalItems(
  cutoffIso: string,
): Promise<BrandonDailyUpdatePacket["sections"]> {
  const supabase = createServiceClient();
  const cutoffDateKey = getEasternDateKey(parseDate(cutoffIso) ?? new Date(cutoffIso));
  const sections: BrandonDailyUpdatePacket["sections"] = {
    needsBrandon: [],
    waitingOnOthers: [],
    importantUpdates: [],
  };

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
      .or(`date.gte.${cutoffIso},created_at.gte.${cutoffIso},captured_at.gte.${cutoffIso}`)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("document_metadata")
      .select(selectClause)
      .eq("category", "teams_message")
      .or(`date.gte.${cutoffIso},created_at.gte.${cutoffIso},captured_at.gte.${cutoffIso}`)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (emailError || teamsError) {
    return sections;
  }

  const rows = ([...(emailRows ?? []), ...(teamsRows ?? [])] as RecentCommunicationRow[]).filter((row) =>
    isRecentSourceRow(row, cutoffDateKey),
  );

  for (const spec of COMMUNICATION_SIGNAL_SPECS) {
    const matches = rows
      .filter((row) => spec.categories.includes((row.category ?? "") as NonNullable<RecentCommunicationRow["category"]>))
      .map((row) => {
        const haystack = `${row.title ?? ""} ${getRecentCommunicationText(row)}`.toLowerCase();
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
    sections[spec.section].push(
      buildCommunicationSignalItem(matches[0].row, spec, matches.length),
    );
  }

  return sections;
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

async function loadMetadata(documentIds: string[]): Promise<Map<string, DocumentMetaRow>> {
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

  return new Map(((data ?? []) as DocumentMetaRow[]).map((row) => [row.id, row]));
}

async function loadFallbackMetadata(cutoff: Date, limit = 8): Promise<DocumentMetaRow[]> {
  const supabase = createServiceClient();
  const cutoffIso = cutoff.toISOString();
  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id,title,project,project_id,date,created_at,captured_at,source_system,source,type,category,summary,overview,action_items,content,raw_text,url,source_web_url,fireflies_link,meeting_link",
    )
    .gte("created_at", cutoffIso)
    .or(FALLBACK_KEYWORDS.map((keyword) => `summary.ilike.%${keyword}%`).join(","))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []) as DocumentMetaRow[];
}

async function loadRecentSourceCoverage(
  cutoffIso: string,
): Promise<BrandonBriefSourceCoverage[]> {
  const supabase = createServiceClient();
  const cutoffDateKey = getEasternDateKey(parseDate(cutoffIso) ?? new Date(cutoffIso));

  const coverageQueries = await Promise.all(
    SOURCE_GROUPS.map(async (group) => {
      let rowsQuery = supabase
        .from("document_metadata")
        .select("date,created_at,captured_at,category,type")
        .or(`date.gte.${cutoffIso},created_at.gte.${cutoffIso},captured_at.gte.${cutoffIso}`);

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
    needsBrandon: dedupe([...seedSections.needsBrandon, ...sections.needsBrandon]).slice(
      0,
      limits.needsBrandon,
    ),
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

function stripJsonFence(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function normalizeSynthesizedItem(
  item: SynthesizedBriefItem,
  candidates: BrandonBriefItem[],
  usedSourceIndexes: Set<number>,
): BrandonBriefItem | null {
  const source = candidates[item.sourceIndex];
  if (usedSourceIndexes.has(item.sourceIndex)) return null;
  if (!source || !item.title || !item.summary) return null;
  usedSourceIndexes.add(item.sourceIndex);

  return {
    ...source,
    title: compactText(item.title, 120),
    summary: expandRelativeWeekdays(compactText(item.summary, 420), source.date),
    bullets: (item.bullets ?? [])
      .map((bullet) => expandRelativeWeekdays(compactText(bullet, 180), source.date))
      .filter(Boolean)
      .slice(0, 4),
    recommendedAction: item.recommendedAction
      ? expandRelativeWeekdays(compactText(item.recommendedAction, 220), source.date)
      : source.recommendedAction,
    whyItMatters: item.whyItMatters
      ? expandRelativeWeekdays(compactText(item.whyItMatters, 220), source.date)
      : source.whyItMatters,
    status: item.status ?? source.status,
    tone: item.tone ?? source.tone,
  };
}

async function synthesizeSections(
  sections: BrandonDailyUpdatePacket["sections"],
): Promise<BrandonDailyUpdatePacket["sections"]> {
  const candidates = [
    ...sections.needsBrandon,
    ...sections.waitingOnOthers,
    ...sections.importantUpdates,
  ];
  if (candidates.length === 0) return sections;

  const openai = getOpenAI();
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
  }));

  try {
    const completion = await openai.chat.completions.create({
      model: getOpenAIModelId("gpt-4.1-mini"),
      temperature: 0.1,
      max_tokens: 2400,
      messages: [
        {
          role: "system",
          content:
            "You write a daily executive business brief from an AI business strategist to Brandon. " +
            "Do not refer to Brandon in the third person. Prefer direct facts and, only when needed, 'you'. " +
            "Turn raw RAG excerpts into clear business insights. Do not copy truncated excerpts. " +
            "Use concrete names, dates, dollars, quantities, blockers, and commitments when present. " +
            "When using relative dates such as next Wednesday, include the exact calendar date in the same sentence. " +
            "If a source is too vague to be useful, exclude it. Do not repeat the same sourceIndex in multiple sections. " +
            "Use needsBrandon only when the evidence shows a decision, confirmation, commitment, money/risk issue, or escalation that belongs at owner level. " +
            "Use waitingOnOthers for project-team, client, vendor, estimating, finance, or design inputs that are pending. " +
            "Return ONLY valid JSON with keys needsBrandon, waitingOnOthers, importantUpdates. " +
            "Each item must include: title, summary, bullets, recommendedAction, whyItMatters, sourceIndex, status, tone. " +
            "Titles should be specific, not bucket names. Bullets should be short facts, not paragraphs. " +
            "Tone must be one of risk, watch, good, neutral.",
        },
        {
          role: "user",
          content:
            "Create the Brandon daily update from these retrieved source candidates. " +
            "Keep at most 4 needsBrandon, 4 waitingOnOthers, and 4 importantUpdates. " +
            "Only include items a construction business owner would reasonably care about today.\n\n" +
            JSON.stringify(candidatePayload, null, 2),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(stripJsonFence(raw)) as SynthesizedBriefSections;
    const usedSourceIndexes = new Set<number>();
    return {
      needsBrandon: (parsed.needsBrandon ?? [])
        .map((item) => normalizeSynthesizedItem(item, candidates, usedSourceIndexes))
        .filter((item): item is BrandonBriefItem => item !== null),
      waitingOnOthers: (parsed.waitingOnOthers ?? [])
        .map((item) => normalizeSynthesizedItem(item, candidates, usedSourceIndexes))
        .filter((item): item is BrandonBriefItem => item !== null),
      importantUpdates: (parsed.importantUpdates ?? [])
        .map((item) => normalizeSynthesizedItem(item, candidates, usedSourceIndexes))
        .filter((item): item is BrandonBriefItem => item !== null),
    };
  } catch {
    return sections;
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
      queryEmbedding: await generateEmbedding(openai, spec.query, EMBEDDING.LARGE),
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
    ...new Set(rawHits.map((hit) => hit.row.document_id).filter(Boolean) as string[]),
  ];
  const metadata = await loadMetadata(documentIds);

  const rankedHits = rawHits
    .map((hit): RankedHit => {
      const meta = hit.row.document_id ? metadata.get(hit.row.document_id) : undefined;
      const date = parseDate(
        hit.row.doc_date ?? meta?.date ?? meta?.created_at ?? meta?.captured_at,
      );
      const text = compactText(
        hit.row.chunk_text ??
          hit.row.text ??
          meta?.summary ??
          meta?.overview ??
          meta?.action_items ??
          meta?.content ??
          meta?.raw_text,
      );
      return {
        id: hit.row.document_id ?? hit.row.chunk_id ?? `${hit.spec.title}-${hit.sourceGroup.label}`,
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
  const fallbackRows = await loadFallbackMetadata(cutoff);
  const fallbackItems = fallbackRows.map(makeFallbackItem);
  const seededSections = assignHitsToSections(dedupedHits, fallbackItems);
  const synthesizedSections = await synthesizeSections(seededSections);
  const communicationSeedItems = await loadRecentCommunicationSignalItems(cutoffIso);
  const sections = mergeSeedItems(synthesizedSections, communicationSeedItems);
  const sourceCoverage = await loadRecentSourceCoverage(cutoffIso);

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
      "The briefing window now follows calendar days in Eastern time so day-stamped email and Teams activity is not dropped mid-morning.",
      "Recent communication evidence leads the brief so stale memory does not dominate.",
      "Low-confidence items are excluded unless they have recent source evidence.",
      "Every surfaced item keeps its source title, date, and link when the ingestion data provides one.",
    ],
  };
}
