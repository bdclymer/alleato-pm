import type { BriefV3, BriefV3Project } from "@/lib/daily-briefs/brief-v3-types";
import type { CanonicalDailyBriefPacket } from "@/lib/daily-briefs/canonical-packets";

// ─────────────────────────────────────────────────────────────────────────────
// Morning Brief view model
//
// Pure transform: the canonical daily-executive-brief packet (structured
// BriefV3) → the shape the two-column "Morning Brief" layout renders. No IO, no
// fabrication. Everything here is JSON-serializable so a server component can
// hand it straight to the client view.
// ─────────────────────────────────────────────────────────────────────────────

export const MORNING_BRIEF_PREPARED_FOR = "Brandon";

/** An inline run: plain/bold text, or an inline source chip. */
export type MBRun =
  | { text: string; bold: boolean }
  | { chip: string };

export type MBMarker = "orange" | "green" | "red";

export interface MBSource {
  alias: string;
  /** Raw type from the brief ("email" | "meeting" | "teams" | "document"). */
  type: string;
  /** Human label for the type ("Email", "Meeting transcript", …). */
  typeLabel: string;
  /** App name for the "Open in {app}" deep link. */
  app: string;
  title: string;
  /** Author / channel / project line. */
  meta: string;
  url: string | null;
  project: string | null;
  /** Underlying document_metadata id when the source is a document — the anchor
   * a created task can hang off (tasks.metadata_id is NOT NULL). Null otherwise. */
  metadataId: string | null;
}

export interface MBCall {
  index: string;
  project: string;
  anchor: string;
  question: MBRun[];
  sources: string[];
  optional: boolean;
}

export interface MBIssue {
  id: string;
  marker: MBMarker;
  runs: MBRun[];
  /** Flattened plain text — used to pre-fill the create-task panel. */
  plain: string;
  sources: string[];
  /** True when this bullet came from an owner (Brandon) decision. */
  ownerIsBrandon: boolean;
}

export interface MBProject {
  key: string;
  anchor: string;
  name: string;
  kicker: string;
  summary: string;
  context: MBRun[];
  issues: MBIssue[];
}

export interface MBOnTrackProject {
  name: string;
  status: string;
}

export interface MBResolvedSeed {
  id: string;
  project: string;
  text: string;
}

export interface MorningBriefModel {
  weekday: string;
  dateLabel: string;
  businessDate: string;
  preparedFor: string;
  decisionCount: number;
  projectCount: number;
  generatedLabel: string | null;
  read: MBRun[];
  calls: MBCall[];
  projects: MBProject[];
  onTrack: MBOnTrackProject[];
  resolvedSeed: MBResolvedSeed[];
  sources: Record<string, MBSource>;
  /** Fallback document anchor for a manually created task, when one exists. */
  defaultAnchorMetadataId: string | null;
  /** True when the packet had no structured v3 brief to render. */
  empty: boolean;
}

// ── parsing primitives ────────────────────────────────────────────────────────

/** Strip trailing/inline citation tokens like `[S247]` or `[outlook_…]`. */
function stripCitations(input: string): string {
  return input
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Plain, citation-free, marker-free text. */
function plainText(input: string): string {
  return stripCitations(input).replace(/\*\*/g, "").trim();
}

/** Split a string with `**bold**` markers into text runs (citations stripped). */
function parseInline(input: string): MBRun[] {
  const clean = stripCitations(input);
  if (!clean) return [];
  const runs: MBRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: clean.slice(lastIndex, match.index), bold: false });
    }
    runs.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < clean.length) {
    runs.push({ text: clean.slice(lastIndex), bold: false });
  }
  return runs.filter((run) => !("text" in run) || run.text.length > 0);
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const end = trimmed.search(/[.!?](\s|$)/);
  return end === -1 ? trimmed : trimmed.slice(0, end + 1).trim();
}

/** URL-safe anchor slug from a project name. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ── source + severity helpers ──────────────────────────────────────────────────

const SOURCE_TYPE_LABEL: Record<string, string> = {
  email: "Email",
  meeting: "Meeting transcript",
  teams: "Teams conversation",
  document: "Document",
};

const SOURCE_TYPE_APP: Record<string, string> = {
  email: "Outlook",
  meeting: "the transcript",
  teams: "Teams",
  document: "SharePoint",
};

const BLOCKING_WORDS =
  /\b(overdue|block\w*|escalat\w*|urgent|stop|failure|behind|idle|burning)\b/i;
const RESOLVED_WORDS =
  /\b(resolved|closed|done|approved|complete\w*|settled|handled|locked)\b/i;

function markerFor(
  ownerIsBrandon: boolean,
  urgency: string | null,
  due: string | null,
  text: string,
): MBMarker {
  const haystack = `${urgency ?? ""} ${due ?? ""} ${text}`;
  if (BLOCKING_WORDS.test(haystack)) return "red";
  if (RESOLVED_WORDS.test(haystack) && !ownerIsBrandon) return "green";
  return "orange";
}

// ── date helpers ────────────────────────────────────────────────────────────

function formatBusinessDate(businessDate: string): {
  weekday: string;
  dateLabel: string;
} {
  const parsed = new Date(`${businessDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return { weekday: "", dateLabel: businessDate };
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(parsed);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
  return { weekday, dateLabel };
}

function formatGenerated(generatedAt: string | null): string | null {
  if (!generatedAt) return null;
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// ── section builders ────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildSources(packet: CanonicalDailyBriefPacket, brief: BriefV3): Record<string, MBSource> {
  // Cross-reference the packet's source manifest (which carries the durable id +
  // lane) with the brief's alias→metadata map, so document sources can expose a
  // metadata_id that a created task can anchor to.
  const byAlias = new Map(packet.sources.filter((ref) => ref.alias).map((ref) => [ref.alias, ref]));
  const out: Record<string, MBSource> = {};
  for (const [alias, source] of Object.entries(brief.sources)) {
    const type = source.type;
    const ref = byAlias.get(alias);
    const metadataId =
      ref && ref.lane === "document" && UUID_RE.test(ref.id) ? ref.id : null;
    const metaBits = [SOURCE_TYPE_LABEL[type] ?? type, source.project].filter(Boolean);
    out[alias] = {
      alias,
      type,
      typeLabel: SOURCE_TYPE_LABEL[type] ?? type,
      app: SOURCE_TYPE_APP[type] ?? "the source",
      title: source.title,
      meta: metaBits.join(" · "),
      url: source.url,
      project: source.project,
      metadataId,
    };
  }
  return out;
}

function projectKicker(project: BriefV3Project): string {
  if (project.hasOwnerDecision) return "Needs your decision";
  const allOptional =
    project.actionItems.length > 0 &&
    project.actionItems.every((item) => item.optional);
  if (allOptional) return "Optional — your call";
  return "Decision on the horizon";
}

function buildIssues(project: BriefV3Project): MBIssue[] {
  return project.actionItems.map((item, index) => {
    const ownerLabel = item.ownerIsBrandon ? null : item.owner;
    const suffix = item.due
      ? ` — due ${item.due}.`
      : item.urgency
        ? ` — ${item.urgency}`
        : "";
    // Owner (when not Brandon) is bolded so the accountable name reads first.
    const runs: MBRun[] = [];
    if (ownerLabel) runs.push({ text: `${ownerLabel}: `, bold: true });
    runs.push(...parseInline(`${item.text}${suffix}`));
    return {
      id: `${project.name}-${index}`,
      marker: markerFor(item.ownerIsBrandon, item.urgency, item.due, item.text),
      runs,
      plain: plainText(item.text),
      sources: item.sourceIds.filter(Boolean),
      ownerIsBrandon: item.ownerIsBrandon,
    };
  });
}

function buildRead(brief: BriefV3): MBRun[] {
  const count = brief.callsToday.length;
  if (count === 0) {
    return [
      {
        text:
          "Nothing needs a decision from you today — every job is moving and captured in project status below.",
        bold: false,
      },
    ];
  }
  const names = brief.callsToday.slice(0, 3).map((call) => call.project);
  const nameList =
    names.length <= 1
      ? names[0] ?? ""
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return [
    { text: "Your attention today is on ", bold: false },
    {
      text: `${count} owner-level decision${count === 1 ? "" : "s"}`,
      bold: true,
    },
    {
      text: nameList ? ` — ${nameList} need a call from you` : "",
      bold: false,
    },
    {
      text: ". The rest is moving on its own and captured in project status below.",
      bold: false,
    },
  ];
}

// ── public builder ────────────────────────────────────────────────────────────

const EMPTY_MODEL: Omit<MorningBriefModel, "weekday" | "dateLabel" | "businessDate" | "generatedLabel"> = {
  preparedFor: MORNING_BRIEF_PREPARED_FOR,
  decisionCount: 0,
  projectCount: 0,
  read: [],
  calls: [],
  projects: [],
  onTrack: [],
  resolvedSeed: [],
  sources: {},
  defaultAnchorMetadataId: null,
  empty: true,
};

export function buildMorningBriefModel(
  packet: CanonicalDailyBriefPacket,
): MorningBriefModel {
  const { weekday, dateLabel } = formatBusinessDate(packet.businessDate);
  const generatedLabel = formatGenerated(packet.generatedAt);

  const brief = packet.brief;
  if (!brief) {
    return {
      ...EMPTY_MODEL,
      weekday,
      dateLabel,
      businessDate: packet.businessDate,
      generatedLabel,
    };
  }

  const sources = buildSources(packet, brief);
  const defaultAnchorMetadataId =
    Object.values(sources).find((source) => source.metadataId)?.metadataId ?? null;
  const ordered = [...brief.projects].sort(
    (a, b) => (a.urgencyRank ?? 99) - (b.urgencyRank ?? 99),
  );

  const calls: MBCall[] = brief.callsToday.map((call, index) => ({
    index: String(index + 1).padStart(2, "0"),
    project: call.project,
    anchor: `p-${slug(call.project)}`,
    question: parseInline(call.question),
    sources: call.sourceIds.filter(Boolean),
    optional: call.optional,
  }));

  const mainStream = ordered.filter((project) => project.hasOwnerDecision);
  const collapsed = ordered.filter((project) => !project.hasOwnerDecision);

  const projects: MBProject[] = mainStream.map((project) => ({
    key: slug(project.name),
    anchor: `p-${slug(project.name)}`,
    name: project.name,
    kicker: projectKicker(project),
    summary: plainText(firstSentence(project.context)),
    context: parseInline(project.context),
    issues: buildIssues(project),
  }));

  const onTrack: MBOnTrackProject[] = collapsed.map((project) => ({
    name: project.name,
    status:
      plainText(firstSentence(project.context)) ||
      (project.resolvedToday ? "Resolved today." : "On track."),
  }));

  const resolvedSeed: MBResolvedSeed[] = ordered
    .filter((project) => project.resolvedToday)
    .map((project) => ({
      id: `seed-${slug(project.name)}`,
      project: project.name,
      text:
        plainText(firstSentence(project.context)) || `${project.name} resolved today.`,
    }));

  return {
    weekday,
    dateLabel,
    businessDate: packet.businessDate,
    preparedFor: MORNING_BRIEF_PREPARED_FOR,
    decisionCount: brief.callsToday.length,
    projectCount: brief.projects.length,
    generatedLabel,
    read: buildRead(brief),
    calls,
    projects,
    onTrack,
    resolvedSeed,
    sources,
    defaultAnchorMetadataId,
    empty: false,
  };
}
