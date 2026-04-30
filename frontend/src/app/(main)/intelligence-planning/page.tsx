import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  Brain,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
  Mail,
  MessageSquareText,
  Network,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, ProjectPageHeader, SectionRuleHeading } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

type DocumentRow = Pick<
  Database["public"]["Tables"]["document_metadata"]["Row"],
  | "id"
  | "title"
  | "type"
  | "source"
  | "source_system"
  | "project_id"
  | "project"
  | "summary"
  | "overview"
  | "content"
  | "raw_text"
  | "action_items"
  | "participants"
  | "keywords"
  | "sentiment"
  | "date"
  | "captured_at"
  | "created_at"
>;

type ProjectRow = Pick<
  Database["public"]["Tables"]["projects"]["Row"],
  "id" | "name" | "project_number" | "aliases" | "client"
>;

type SourceKind = "email" | "teams" | "meeting" | "document";

type ThemeKey =
  | "ai-implementation"
  | "jobplanner-replacement"
  | "project-attribution"
  | "change-management"
  | "all";

type ProjectCandidate = {
  id: number;
  name: string;
  projectNumber: string | null;
  matchedTerms: string[];
  confidence: "high" | "medium" | "low";
};

type IntelligenceRecord = {
  row: DocumentRow;
  sourceKind: SourceKind;
  timestamp: Date | null;
  text: string;
  matchedThemeTerms: string[];
  projectCandidates: ProjectCandidate[];
  attributionStatus: "mapped" | "candidate" | "unmapped" | "conflict";
  sentiment: "positive" | "neutral" | "watch" | "risk";
  taskCues: string[];
  signalCues: string[];
};

type ProductNeedDefinition = {
  id: string;
  title: string;
  outcome: string;
  buildDirection: string;
  terms: string[];
};

type ProductNeed = ProductNeedDefinition & {
  evidence: IntelligenceRecord[];
  latest: Date | null;
  sourceCounts: Record<SourceKind, number>;
  riskCount: number;
};

const themeOptions: Array<{ key: ThemeKey; label: string }> = [
  { key: "ai-implementation", label: "AI implementation" },
  { key: "jobplanner-replacement", label: "JobPlanner replacement" },
  { key: "project-attribution", label: "Project attribution" },
  { key: "change-management", label: "Change management" },
  { key: "all", label: "All source data" },
];

const themeKeywords: Record<Exclude<ThemeKey, "all">, string[]> = {
  "ai-implementation": [
    "artificial intelligence",
    "automation",
    "api",
    "llm",
    "agent",
    "agents",
    "plug-in",
    "plugin",
    "jobplanner",
    "job planner",
    "openclaw",
    "daily reports",
    "project contacts",
    "meeting minutes",
    "internal schedule",
    "invite link",
  ],
  "jobplanner-replacement": [
    "jobplanner",
    "job planner",
    "field personnel",
    "current set",
    "keep jobplanner current",
    "daily reports",
    "completion percentages",
    "internal schedule",
    "project contacts",
    "meeting minutes",
    "drawings",
    "submittals",
    "rfis",
    "sharepoint",
    "emails",
    "folder",
    "invite link",
    "job file",
    "proper job",
    "upload",
    "sort",
  ],
  "project-attribution": [
    "which job",
    "expense",
    "code to",
    "project",
    "job file",
    "allisonville",
    "union collective",
    "uniqlo",
    "goodwill",
    "ulta",
    "exotec",
    "mclane",
    "superior",
  ],
  "change-management": [
    "change order",
    "potential change",
    "pco",
    "co-",
    "quote",
    "proposal",
    "pricing",
    "schedule impact",
    "delay",
    "permit",
    "as-built",
    "hydraulic calculation",
    "scope",
  ],
};

const aiImplementationAnchors = [
  "artificial intelligence",
  "automation",
  "api",
  "llm",
  "agent",
  "agents",
  "plug-in",
  "plugin",
  "jobplanner",
  "job planner",
  "openclaw",
];

const jobPlannerReplacementAnchors = [
  "jobplanner",
  "job planner",
  "field personnel",
  "keep jobplanner current",
  "proper job",
  "job file",
];

const productNeedDefinitions: ProductNeedDefinition[] = [
  {
    id: "current-project-record",
    title: "Keep project records current without manual chasing",
    outcome:
      "Project managers and field teams should trust that contacts, drawings, meeting minutes, RFIs, submittals, and schedule data are current.",
    buildDirection:
      "Create background intake that watches emails, Teams, SharePoint, daily reports, and meetings, then proposes structured project updates for approval.",
    terms: [
      "current",
      "keep jobplanner current",
      "project contacts",
      "meeting minutes",
      "drawings",
      "submittals",
      "rfis",
      "sharepoint",
      "upload",
      "proper job",
    ],
  },
  {
    id: "field-mobile-access",
    title: "Make field information usable from a phone",
    outcome:
      "Field personnel should not need to return to a desk or search inboxes to find the current project answer.",
    buildDirection:
      "Prioritize a mobile-first project intelligence view with latest documents, open questions, current contacts, and recent decisions.",
    terms: ["field personnel", "phone", "from my phone", "coming to my desk", "emails", "sharepoint"],
  },
  {
    id: "automated-sorting",
    title: "Automatically sort incoming information to the right job",
    outcome:
      "Emails, files, contacts, and updates should be assigned to the right project or internal initiative with reviewable confidence.",
    buildDirection:
      "Build an attribution queue that stores candidate project, confidence, evidence terms, and human approval status.",
    terms: ["sort", "proper job", "folder", "job file", "upload", "allisonville", "union collective"],
  },
  {
    id: "schedule-from-daily-reports",
    title: "Update schedule progress from daily reports",
    outcome:
      "Completion percentages and schedule status should come from field activity instead of manual status calls.",
    buildDirection:
      "Extract progress signals from daily reports and compare them to planned schedule activities with exceptions surfaced to PMs.",
    terms: ["daily reports", "completion percentages", "internal schedule", "schedule", "progress"],
  },
  {
    id: "ai-capability-building",
    title: "Build internal AI capability around agents and workflow automation",
    outcome:
      "The team needs clarity on which AI tools are useful, what they can automate, and how to test them against real Alleato workflows.",
    buildDirection:
      "Track AI experiments as internal initiatives with owner, current blocker, demo status, target workflow, and decision log.",
    terms: ["artificial intelligence", "llm", "agent", "agents", "openclaw", "chatgpt", "automation", "api"],
  },
  {
    id: "jobplanner-admin-cost",
    title: "Reduce JobPlanner admin and account friction",
    outcome:
      "Licensing, users, invoices, API access, and support delays should stop consuming leadership attention.",
    buildDirection:
      "Track external-system friction separately from product requirements so replacement value includes admin cost and support drag.",
    terms: ["jobplanner users", "contracted allotment", "invoice", "deactivation", "api access", "support"],
  },
];

const projectTermStopWords = new Set([
  "alleato",
  "project",
  "projects",
  "internal",
  "finance",
  "marketing",
  "workflow",
  "workflows",
  "addition",
  "quality",
  "control",
  "testing",
  "group",
]);

const sourceIcon = {
  email: Mail,
  teams: MessageSquareText,
  meeting: CalendarDays,
  document: Brain,
} satisfies Record<SourceKind, ComponentType<{ className?: string }>>;

const sourceLabels = {
  email: "Email",
  teams: "Teams",
  meeting: "Meeting",
  document: "Document",
} satisfies Record<SourceKind, string>;

const sentimentStyles = {
  positive: "border-success/30 bg-success/5 text-success",
  neutral: "border-border bg-muted/30 text-muted-foreground",
  watch: "border-warning/30 bg-warning/10 text-warning",
  risk: "border-destructive/30 bg-destructive/10 text-destructive",
} satisfies Record<IntelligenceRecord["sentiment"], string>;

const documentSelect =
  "id,title,type,source,source_system,project_id,project,summary,overview,content,raw_text,action_items,participants,keywords,sentiment,date,captured_at,created_at";

function firstSearchParam(
  value: string | string[] | undefined,
  fallback: string,
): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function getDefaultStartDate(): string {
  const date = new Date();
  const day = date.getDay();
  const daysSinceMonday = (day + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function toDateBoundary(value: string, endOfDay = false): Date {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  if (Number.isNaN(date.getTime())) {
    return toDateBoundary(endOfDay ? new Date().toISOString().slice(0, 10) : getDefaultStartDate(), endOfDay);
  }
  return date;
}

function coalesceDate(row: DocumentRow): Date | null {
  for (const value of [row.date, row.captured_at, row.created_at]) {
    if (!value) continue;
    if (/^\d{4}-\d{2}-\d{2}[ T]00:00:00/.test(value)) {
      return new Date(`${value.slice(0, 10)}T12:00:00`);
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function getRecordText(row: DocumentRow): string {
  return [
    row.title,
    row.project,
    row.summary,
    row.overview,
    row.content,
    row.raw_text,
    row.action_items,
    row.participants,
    row.keywords?.join(" "),
  ]
    .filter(Boolean)
    .join("\n");
}

function getSourceKind(row: DocumentRow): SourceKind {
  const type = `${row.type ?? ""} ${row.source ?? ""} ${row.source_system ?? ""}`.toLowerCase();
  if (type.includes("team")) return "teams";
  if (type.includes("email")) return "email";
  if (type.includes("meeting") || type.includes("fireflies")) return "meeting";
  return "document";
}

function termRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasOnlyWordCharacters = /^[a-z0-9\s-]+$/i.test(term);
  if (term.length <= 4 && hasOnlyWordCharacters) {
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  }
  return new RegExp(escaped, "i");
}

function matchTerms(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => termRegex(term.toLowerCase()).test(lower));
}

function stripRetrievalNoise(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ");
}

function getMatchedThemeTerms(text: string, theme: ThemeKey): string[] {
  if (theme === "all") return [];
  const searchableText = stripRetrievalNoise(text);
  const terms = matchTerms(searchableText, themeKeywords[theme]);
  if (theme === "ai-implementation") {
    const anchors = matchTerms(searchableText, aiImplementationAnchors);
    return anchors.length > 0 ? terms : [];
  }
  if (theme === "jobplanner-replacement") {
    const anchors = matchTerms(searchableText, jobPlannerReplacementAnchors);
    return anchors.length > 0 ? terms : [];
  }
  return terms;
}

function normalizeTerm(value: string | null | undefined): string | null {
  const cleaned = value?.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned && cleaned.length > 2 ? cleaned : null;
}

function projectTerms(project: ProjectRow): string[] {
  const terms = new Set<string>();
  [project.name, project.project_number].forEach((value) => {
    const normalized = normalizeTerm(value);
    if (normalized && normalized.length > 4) terms.add(normalized);
  });
  project.aliases?.forEach((alias) => {
    const normalized = normalizeTerm(alias);
    if (normalized && normalized.length > 4) terms.add(normalized);
  });
  normalizeTerm(project.name)
    ?.split(" ")
    .filter((part) => part.length >= 8 && !projectTermStopWords.has(part))
    .forEach((part) => terms.add(part));
  return [...terms];
}

function inferProjectCandidates(
  row: DocumentRow,
  projects: ProjectRow[],
): ProjectCandidate[] {
  const text = getRecordText(row).toLowerCase();
  return projects
    .map((project) => {
      const matchedTerms = projectTerms(project).filter((term) => text.includes(term));
      if (matchedTerms.length === 0) return null;
      const hasExactProjectName =
        project.name !== null &&
        text.includes(project.name.toLowerCase()) &&
        project.name.length > 4;
      const confidence = hasExactProjectName || matchedTerms.length >= 2
        ? "high"
        : matchedTerms.some((term) => term.length >= 8)
          ? "medium"
          : "low";
      return {
        id: project.id,
        name: project.name ?? `Project ${project.id}`,
        projectNumber: project.project_number,
        matchedTerms: matchedTerms.slice(0, 4),
        confidence,
      } satisfies ProjectCandidate;
    })
    .filter((candidate): candidate is ProjectCandidate => Boolean(candidate))
    .sort((a, b) => {
      const confidenceRank = { high: 3, medium: 2, low: 1 };
      return (
        confidenceRank[b.confidence] - confidenceRank[a.confidence] ||
        b.matchedTerms.length - a.matchedTerms.length
      );
    })
    .slice(0, 3);
}

function inferAttributionStatus(
  row: DocumentRow,
  candidates: ProjectCandidate[],
): IntelligenceRecord["attributionStatus"] {
  if (row.project_id && candidates.length === 0) return "mapped";
  if (!row.project_id && candidates.length > 0) return "candidate";
  if (!row.project_id) return "unmapped";
  return candidates.some((candidate) => candidate.id === row.project_id)
    ? "mapped"
    : "conflict";
}

function inferSentiment(row: DocumentRow, text: string): IntelligenceRecord["sentiment"] {
  const sentiment = row.sentiment;
  if (sentiment && typeof sentiment === "object" && !Array.isArray(sentiment)) {
    const values = sentiment as Record<string, unknown>;
    const negative = Number(values.negative ?? values.neg ?? 0);
    const positive = Number(values.positive ?? values.pos ?? 0);
    if (negative >= 20) return "risk";
    if (negative >= 8) return "watch";
    if (positive > negative) return "positive";
  }

  const lower = text.toLowerCase();
  if (
    /\b(urgent|risk|issue|problem|blocked|delay|delayed|discrepancy|compliance|failed|termination|pending|wait|pushing back)\b/.test(
      lower,
    )
  ) {
    return "risk";
  }
  if (/\b(need|needs|should|missing|question|concern|follow up|waiting)\b/.test(lower)) {
    return "watch";
  }
  if (/\b(approved|complete|completed|smoothly|working|ahead of schedule)\b/.test(lower)) {
    return "positive";
  }
  return "neutral";
}

function extractCues(text: string, cueWords: string[], limit: number): string[] {
  const sentences = text
    .replace(/&nbsp;/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim().replace(/\s+/g, " "))
    .filter((sentence) => sentence.length >= 24 && sentence.length <= 260);
  const lowerCueWords = cueWords.map((word) => word.toLowerCase());
  const matches = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return lowerCueWords.some((word) => lower.includes(word));
  });
  return [...new Set(matches)].slice(0, limit);
}

function buildIntelligenceRecords(
  rows: DocumentRow[],
  projects: ProjectRow[],
  theme: ThemeKey,
  query: string,
  startDate: Date,
  endDate: Date,
): IntelligenceRecord[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return rows
    .map((row) => {
      const text = getRecordText(row);
      const timestamp = coalesceDate(row);
      const sourceKind = getSourceKind(row);
      const matchedThemeTerms = getMatchedThemeTerms(text, theme);
      const projectCandidates = inferProjectCandidates(row, projects);
      const record: IntelligenceRecord = {
        row,
        sourceKind,
        timestamp,
        text,
        matchedThemeTerms,
        projectCandidates,
        attributionStatus: inferAttributionStatus(row, projectCandidates),
        sentiment: inferSentiment(row, text),
        taskCues: extractCues(
          text,
          ["need", "please", "can you", "i will", "i should", "fix", "test", "record", "send", "get with", "waiting", "due"],
          3,
        ),
        signalCues: extractCues(
          text,
          ["risk", "issue", "smoothly", "delay", "schedule", "current", "upload", "sort", "project", "api", "jobplanner", "job planner"],
          2,
        ),
      };
      return record;
    })
    .filter((record) => {
      if (!record.timestamp) return false;
      if (record.timestamp < startDate || record.timestamp > endDate) return false;
      if (theme !== "all" && record.matchedThemeTerms.length === 0) return false;
      if (queryTerms.length === 0) return true;
      const lower = record.text.toLowerCase();
      return queryTerms.every((term) => lower.includes(term));
    })
    .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
}

function formatDate(date: Date | null): string {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function previewText(text: string): string {
  return text.replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 360);
}

function percentage(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function sourceSummaryFromCounts(counts: Record<SourceKind, number>): string {
  return (Object.keys(counts) as SourceKind[])
    .filter((source) => counts[source] > 0)
    .map((source) => `${sourceLabels[source]} ${counts[source]}`)
    .join(" · ");
}

function buildProductNeeds(records: IntelligenceRecord[]): ProductNeed[] {
  return productNeedDefinitions
    .map((definition) => {
      const evidence = records.filter((record) => {
        const text = stripRetrievalNoise(record.text).toLowerCase();
        return definition.terms.some((term) => termRegex(term).test(text));
      });
      const sourceCounts = evidence.reduce<Record<SourceKind, number>>(
        (acc, record) => {
          acc[record.sourceKind] += 1;
          return acc;
        },
        { email: 0, teams: 0, meeting: 0, document: 0 },
      );
      const latest = evidence.reduce<Date | null>((current, record) => {
        if (!record.timestamp) return current;
        if (!current || record.timestamp > current) return record.timestamp;
        return current;
      }, null);
      return {
        ...definition,
        evidence,
        latest,
        sourceCounts,
        riskCount: evidence.filter((record) =>
          ["watch", "risk"].includes(record.sentiment),
        ).length,
      };
    })
    .filter((need) => need.evidence.length > 0)
    .sort((a, b) => b.evidence.length - a.evidence.length);
}

function DetailHeading({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function MetricTag({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      <span className="font-medium text-foreground">{label}</span>
      <span className="min-w-0 truncate">{detail}</span>
    </div>
  );
}

function evidencePreview(record: IntelligenceRecord): string {
  const title = record.row.title?.replace(/\s+/g, " ").trim();
  let text = previewText(record.text);

  if (title) {
    const lowerTitle = title.toLowerCase();
    for (let index = 0; index < 3; index += 1) {
      if (!text.toLowerCase().startsWith(lowerTitle)) break;
      text = text.slice(title.length).replace(/^[:\s-]+/, "").trim();
    }
  }

  return text || previewText(record.text);
}

function ProductNeedCard({ need }: { need: ProductNeed }) {
  const topEvidence = need.evidence.slice(0, 3);

  return (
    <article className="rounded-md border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold leading-6 text-foreground">
            {need.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Lightbulb className="h-3.5 w-3.5" />
              Product need
            </Badge>
            <Badge variant="outline">{need.evidence.length} signals</Badge>
            {need.riskCount > 0 ? (
              <Badge variant="outline" className={sentimentStyles.watch}>
                {need.riskCount} watch/risk
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{need.outcome}</p>
        </div>
        <div className="shrink-0 text-sm text-muted-foreground md:text-right">
          <div>{sourceSummaryFromCounts(need.sourceCounts)}</div>
          <div className="mt-1">Latest: {formatDate(need.latest)}</div>
        </div>
      </div>

      <div className="mt-5">
        <DetailHeading>Build direction</DetailHeading>
        <p className="mt-2 text-sm leading-6 text-foreground">{need.buildDirection}</p>
      </div>

      <div className="mt-5 space-y-3">
        <DetailHeading>Evidence examples</DetailHeading>
        {topEvidence.map((record) => (
          <div key={record.row.id} className="flex gap-2.5 text-sm">
            {(() => {
              const SourceIcon = sourceIcon[record.sourceKind];
              return (
                <SourceIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              );
            })()}
            <p className="line-clamp-2 min-w-0 leading-6 text-muted-foreground">
              {evidencePreview(record)}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function RecordCard({
  record,
  mappedProject,
}: {
  record: IntelligenceRecord;
  mappedProject: ProjectRow | undefined;
}) {
  const Icon = sourceIcon[record.sourceKind];
  const attributionLabel = {
    mapped: "Mapped",
    candidate: "Candidate",
    unmapped: "Unmapped",
    conflict: "Review mapping",
  }[record.attributionStatus];

  return (
    <article className="rounded-md border bg-background p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Icon className="h-3.5 w-3.5" />
              {sourceLabels[record.sourceKind]}
            </Badge>
            <Badge
              variant="outline"
              className={cn("capitalize", sentimentStyles[record.sentiment])}
            >
              {record.sentiment}
            </Badge>
            <Badge variant={record.attributionStatus === "conflict" ? "destructive" : "outline"}>
              {attributionLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(record.timestamp)}</span>
          </div>
          <p className="text-base font-semibold leading-6 text-foreground">
            {record.row.title || "Untitled source"}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">{previewText(record.text)}</p>
        </div>
        <div className="w-full shrink-0 space-y-2 rounded-md bg-muted/30 p-3 text-sm lg:w-80">
          <div>
            <DetailHeading>Current project</DetailHeading>
            <div className="mt-1 text-foreground">
              {mappedProject?.name ?? record.row.project ?? "None assigned"}
            </div>
          </div>
          <div>
            <DetailHeading>Candidate matches</DetailHeading>
            <div className="mt-1 space-y-1">
              {record.projectCandidates.length > 0 ? (
                record.projectCandidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-foreground">
                      {candidate.name}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {candidate.confidence}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">No candidate found</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2">
            <DetailHeading>Matched terms</DetailHeading>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {record.matchedThemeTerms.length > 0 ? (
              record.matchedThemeTerms.slice(0, 8).map((term) => (
                <Badge key={term} variant="outline">
                  {term}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No theme terms required</span>
            )}
          </div>
        </div>
        <div>
          <div className="mb-2">
            <DetailHeading>Compiler cues</DetailHeading>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {[...record.taskCues, ...record.signalCues].slice(0, 3).map((cue) => (
              <li key={cue} className="leading-5">
                {cue}
              </li>
            ))}
            {record.taskCues.length === 0 && record.signalCues.length === 0 ? (
              <li>No obvious task/risk cue found yet.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </article>
  );
}

export default async function IntelligencePlanningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const theme = firstSearchParam(params.theme, "ai-implementation") as ThemeKey;
  const safeTheme = themeOptions.some((option) => option.key === theme)
    ? theme
    : "ai-implementation";
  const startValue = firstSearchParam(params.start, getDefaultStartDate());
  const endValue = firstSearchParam(params.end, new Date().toISOString().slice(0, 10));
  const query = firstSearchParam(params.q, "").trim();
  const startDate = toDateBoundary(startValue);
  const endDate = toDateBoundary(endValue, true);
  const supabase = await createClient();
  const lookbackDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const includeFallbackDateColumns = lookbackDays <= 45;

  const buildDocumentsQuery = (dateColumn: "date" | "captured_at" | "created_at") => {
    return supabase
      .from("document_metadata")
      .select(documentSelect)
      .gte(dateColumn, startDate.toISOString())
      .lte(dateColumn, endDate.toISOString())
      .order(dateColumn, { ascending: false })
      .limit(1000);
  };

  const fallbackDocumentsPromise = includeFallbackDateColumns
    ? Promise.all([
        buildDocumentsQuery("captured_at"),
        buildDocumentsQuery("created_at"),
      ])
    : Promise.resolve([
        { data: [], error: null },
        { data: [], error: null },
      ] as const);

  const [dateDocumentsResult, fallbackDocumentsResults, projectsResult] = await Promise.all([
    buildDocumentsQuery("date"),
    fallbackDocumentsPromise,
    supabase
      .from("projects")
      .select("id,name,project_number,aliases,client")
      .eq("archived", false)
      .order("name", { ascending: true }),
  ]);
  const [capturedDocumentsResult, createdDocumentsResult] = fallbackDocumentsResults;

  const documentErrors = [
    dateDocumentsResult.error,
    capturedDocumentsResult.error,
    createdDocumentsResult.error,
  ].filter(Boolean);
  const documents = [
    ...(dateDocumentsResult.data ?? []),
    ...(capturedDocumentsResult.data ?? []),
    ...(createdDocumentsResult.data ?? []),
  ].reduce<DocumentRow[]>((acc, row) => {
    if (acc.some((existing) => existing.id === row.id)) return acc;
    acc.push(row as DocumentRow);
    return acc;
  }, []);
  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const records = buildIntelligenceRecords(
    documents,
    projects,
    safeTheme,
    query,
    startDate,
    endDate,
  );
  const mappedProjectById = new Map(projects.map((project) => [project.id, project]));

  const sourceCounts = records.reduce<Record<SourceKind, number>>(
    (acc, record) => {
      acc[record.sourceKind] += 1;
      return acc;
    },
    { email: 0, teams: 0, meeting: 0, document: 0 },
  );
  const unmappedCount = records.filter((record) => !record.row.project_id).length;
  const reviewCount = records.filter((record) =>
    ["candidate", "conflict"].includes(record.attributionStatus),
  ).length;
  const riskCount = records.filter((record) =>
    ["watch", "risk"].includes(record.sentiment),
  ).length;
  const taskCueCount = records.reduce(
    (sum, record) => sum + Math.min(record.taskCues.length, 1),
    0,
  );

  const attributionQueue = records
    .filter((record) => record.attributionStatus === "candidate" || record.attributionStatus === "conflict")
    .slice(0, 8);
  const productNeeds = buildProductNeeds(records);

  const sourceSummary = sourceSummaryFromCounts(sourceCounts);
  const rangeLinks = [
    { label: "30 days", start: dateDaysAgo(30) },
    { label: "90 days", start: dateDaysAgo(90) },
    { label: "180 days", start: dateDaysAgo(180) },
    { label: "1 year", start: dateDaysAgo(365) },
  ];

  return (
    <>
      <ProjectPageHeader
        title="Intelligence Planning"
        description="Inspect cross-source communications before turning them into project intelligence."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/ai-assistant">Open assistant</Link>
          </Button>
        }
      />
      <PageContainer className="space-y-10 lg:space-y-12">
        <section className="space-y-4">
          <form className="grid gap-3 bg-background p-4 md:grid-cols-[1fr_10rem_10rem_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search JobPlanner, AI, Union Collective, Allisonville..."
                className="pl-9"
              />
            </div>
            <Input name="start" type="date" defaultValue={startValue} />
            <Input name="end" type="date" defaultValue={endValue} />
            <Button type="submit" className="min-h-10">
              Apply
            </Button>
            <input type="hidden" name="theme" value={safeTheme} />
          </form>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {themeOptions.map((option) => (
              <Link
                key={option.key}
                href={{
                  pathname: "/intelligence-planning",
                  query: {
                    theme: option.key,
                    start: startValue,
                    end: endValue,
                    ...(query ? { q: query } : {}),
                  },
                }}
                className={cn(
                  "text-muted-foreground transition-colors hover:text-foreground",
                  safeTheme === option.key && "font-semibold text-foreground underline underline-offset-4",
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <CalendarRange className="h-4 w-4" />
              Lookback
            </span>
            {rangeLinks.map((range) => (
              <Button key={range.label} asChild size="sm" variant="ghost">
                <Link
                  href={{
                    pathname: "/intelligence-planning",
                    query: {
                      theme: safeTheme,
                      start: range.start,
                      end: endValue,
                      ...(query ? { q: query } : {}),
                    },
                  }}
                >
                  {range.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>

        {documentErrors.length > 0 || projectsResult.error ? (
          <section className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {documentErrors[0]?.message ||
              projectsResult.error?.message ||
              "Failed to load intelligence planning data."}
          </section>
        ) : null}

        <section className="flex flex-wrap gap-2">
          <MetricTag
            icon={Search}
            label="Matching records"
            value={records.length}
            detail={sourceSummary || "No records in this filter"}
          />
          <MetricTag
            icon={CircleHelp}
            label="Unmapped"
            value={`${unmappedCount}`}
            detail={`${percentage(unmappedCount, records.length)}% have no current project_id`}
          />
          <MetricTag
            icon={Network}
            label="Review queue"
            value={reviewCount}
            detail="Candidate or conflicting project attribution"
          />
          <MetricTag
            icon={AlertTriangle}
            label="Action/risk cues"
            value={riskCount + taskCueCount}
            detail={`${riskCount} watch/risk records · ${taskCueCount} task cues`}
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionRuleHeading label="Product Needs Compiler" />
              <p className="text-sm text-muted-foreground">
                Early grouping of internal signals into buildable needs for Alleato AI and the JobPlanner replacement.
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {productNeeds.length} needs detected
            </span>
          </div>

          {productNeeds.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {productNeeds.map((need) => (
                <ProductNeedCard key={need.id} need={need} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
              No product needs detected in this filter yet.
            </div>
          )}
        </section>

        <section className="grid gap-8 xl:grid-cols-[1fr_24rem]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <SectionRuleHeading label="Source Feed" />
                <p className="text-sm text-muted-foreground">
                  Raw communications grouped into the first compiler view.
                </p>
              </div>
              <Badge variant="outline">{safeTheme.replace("-", " ")}</Badge>
            </div>

            {records.length > 0 ? (
              <div className="space-y-3">
                {records.slice(0, 40).map((record) => (
                  <RecordCard
                    key={record.row.id}
                    record={record}
                    mappedProject={
                      record.row.project_id
                        ? mappedProjectById.get(record.row.project_id)
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border bg-background p-8 text-center">
                <CircleHelp className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-base font-semibold text-foreground">
                  No matching communications
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adjust the theme, date range, or search query to inspect another slice.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-md border bg-background p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  How this surfaces AI implementation
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                The page searches the unified communications store for AI and
                JobPlanner replacement signals, then overlays project candidates,
                sentiment, task cues, and mapping conflicts. The same pattern can
                become the background compiler for project intelligence packets.
              </p>
            </section>

            <section className="rounded-md border bg-background p-4">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Attribution queue
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {attributionQueue.length > 0 ? (
                  attributionQueue.map((record) => (
                    <div key={record.row.id} className="border-t pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-start gap-2">
                        {record.attributionStatus === "conflict" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {record.row.title || "Untitled source"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {record.projectCandidates
                              .map((candidate) => candidate.name)
                              .join(", ") || "No candidate"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No candidate/conflict records in the current filter.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </PageContainer>
    </>
  );
}
