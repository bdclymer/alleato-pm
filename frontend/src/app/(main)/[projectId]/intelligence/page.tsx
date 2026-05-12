export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronRight,
  ExternalLink,
  LinkIcon,
  MoreVertical,
  X,
} from "lucide-react";

import {
  Button,
  EmptyState,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import {
  buildProjectOperatingSummarySources,
} from "@/lib/ai/services/project-operating-summary-sources";
import type {
  ClientProjectIntelligencePacket,
  InsightCard,
  InsightCardEvidence,
} from "@/lib/ai/intelligence/types";
import {
  parseReadableEmailThread,
} from "@/lib/email/readable-email";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

type ProjectRow = Pick<
  Database["public"]["Tables"]["projects"]["Row"],
  | "id"
  | "name"
  | "project_number"
  | "budget"
  | "budget_used"
  | "phase"
  | "current_phase"
  | "created_at"
  | "summary"
  | "work_scope"
>;

type EvidenceWithCard = InsightCardEvidence & {
  cardId: string;
  cardTitle: string;
  cardType: string;
};

function formatLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function cleanText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericReviewText(value: string | null | undefined): boolean {
  const text = cleanText(value).toLowerCase();
  return (
    text === "this source contains project-relevant language that should be reviewed before it is trusted in a current intelligence packet." ||
    text === "review the source attribution and extracted signal, then promote or reject it."
  );
}

function getCardText(card: InsightCard): string {
  const summary = cleanText(card.summary);
  if (summary) return summary;
  return cleanText(card.whyItMatters || card.nextAction || card.title);
}

function getSectionText(cards: InsightCard[], types: string[], fallback: string): string {
  const card = cards.find((item) => types.includes(item.cardType));
  return card ? getCardText(card) : fallback;
}

function getEvidenceRows(packet: ClientProjectIntelligencePacket): EvidenceWithCard[] {
  return packet.cards.flatMap((card) =>
    card.evidence.map((evidence) => ({
      ...evidence,
      cardId: card.id,
      cardTitle: card.title,
      cardType: card.cardType,
    })),
  );
}

function getSourceHref(projectId: number, sourceDocumentId: string | null): string | null {
  if (!sourceDocumentId) return null;
  return `/${projectId}/intelligence/sources/${encodeURIComponent(sourceDocumentId)}`;
}

function sourceLabel(evidence: EvidenceWithCard): string {
  if (evidence.sourceTitle) return evidence.sourceTitle;
  return evidence.cardTitle || "Untitled source";
}

function sourceDescription(evidence: EvidenceWithCard): string {
  const exactEmail = parseReadableEmailThread(evidence.sourceContentPreview)[0];
  if (exactEmail?.body) return exactEmail.body;
  return cleanText(evidence.relevanceReason || evidence.summary || evidence.excerpt || evidence.cardTitle);
}

function isEmailEvidence(evidence: InsightCardEvidence): boolean {
  return evidence.sourceType.toLowerCase() === "email" || evidence.sourceCategory?.toLowerCase() === "email";
}

function groupEvidenceByKind(rows: EvidenceWithCard[]) {
  return {
    Meetings: rows.filter((row) => /meeting|fireflies|transcript/i.test(`${row.sourceType} ${row.sourceCategory ?? ""}`)),
    Emails: rows.filter(isEmailEvidence),
    Teams: rows.filter((row) => /teams|message|chat/i.test(`${row.sourceType} ${row.sourceCategory ?? ""}`)),
    Attachments: rows.filter((row) => /attachment|file|document|drawing|spec/i.test(`${row.sourceType} ${row.sourceCategory ?? ""}`)),
    RFIs: rows.filter((row) => /rfi/i.test(`${row.sourceType} ${row.sourceCategory ?? ""}`)),
  };
}

function IntelligenceEmptyState({
  project,
  reason,
}: {
  project: ProjectRow;
  reason: string;
}) {
  return (
    <EmptyState
      title="No project intelligence packet yet"
      description={`${project.name ?? `Project ${project.id}`} does not have a current packet to display. ${reason}`}
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/ai-assistant">Open assistant</Link>
        </Button>
      }
    />
  );
}

function ProjectDetails({
  project,
  packet,
  availableSourceCount,
}: {
  project: ProjectRow;
  packet: ClientProjectIntelligencePacket;
  availableSourceCount: number;
}) {
  const details = [
    ["Last synced", formatDate(packet.generatedAt)],
    ["Budget", formatCurrency(project.budget)],
    ["Direct costs", formatCurrency(project.budget_used)],
    ["Start date", formatDate(project.created_at)],
    ["Evidence", `${packet.cards.reduce((total, card) => total + card.evidence.length, 0)} linked`],
    ["Available", `${availableSourceCount} sources`],
  ];

  return (
    <aside className="rounded-md bg-muted/40 px-7 py-7">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
        Project details
      </p>
      <dl className="mt-6 space-y-5">
        {details.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7rem_1fr] gap-4 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function NarrativeSections({
  packet,
  project,
}: {
  packet: ClientProjectIntelligencePacket;
  project: ProjectRow;
}) {
  const cards = packet.cards;
  const timeline = getSectionText(
    cards,
    ["schedule_risk", "project_update", "task"],
    cleanText(project.summary || project.work_scope) || "No schedule narrative has been compiled yet.",
  );
  const risks = getSectionText(
    cards,
    ["risk", "blocker", "open_question"],
    cleanText(packet.whyItMatters || packet.currentStatus) || "No active risk narrative has been compiled yet.",
  );
  const changes = getSectionText(
    cards,
    ["change_management", "financial_exposure", "decision"],
    cleanText(packet.strategicRead || packet.executiveSummary) || "No change narrative has been compiled yet.",
  );

  const sections = [
    ["Timeline", timeline],
    ["Risks", risks],
    ["Changes", changes],
  ];

  return (
    <div className="space-y-8">
      {sections.map(([label, text]) => (
        <section key={label} className="max-w-4xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{label}</p>
          <p className="text-sm leading-6 text-muted-foreground">{text}</p>
        </section>
      ))}
    </div>
  );
}

function SourceRows({
  rows,
  projectId,
}: {
  rows: EvidenceWithCard[];
  projectId: number;
}) {
  const visibleRows = rows.slice(0, 8);
  if (visibleRows.length === 0) {
    return (
      <div className="border-y border-border py-6 text-sm text-muted-foreground">
        No synced records are linked to the current intelligence packet.
      </div>
    );
  }

  return (
    <div className="border-y border-border">
      <div className="grid grid-cols-[2.25rem_2rem_minmax(10rem,1fr)_7rem_9rem_minmax(12rem,1.4fr)_8rem_4rem_3rem] gap-3 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span />
        <span />
        <span>Name</span>
        <span>Date</span>
        <span>Project</span>
        <span>Description</span>
        <span>Approve/Reject</span>
        <span>Links</span>
        <span />
      </div>
      <div className="divide-y divide-border">
        {visibleRows.map((row, index) => {
          const href = getSourceHref(projectId, row.sourceDocumentId);
          const description = sourceDescription(row);
          const emailMessages = isEmailEvidence(row) ? parseReadableEmailThread(row.sourceContentPreview).slice(0, 2) : [];

          return (
            <details key={row.id} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[2.25rem_2rem_minmax(10rem,1fr)_7rem_9rem_minmax(12rem,1.4fr)_8rem_4rem_3rem] gap-3 px-2 py-3 text-sm marker:hidden hover:bg-muted/30">
                <span className="flex items-center">
                  <span className="h-4 w-4 rounded border border-border bg-background" />
                </span>
                <span className="flex items-center text-muted-foreground">
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                </span>
                <span className="min-w-0 font-medium text-foreground">
                  <span className="block truncate">{sourceLabel(row)}</span>
                </span>
                <span className="text-muted-foreground">{formatDate(row.sourceOccurredAt)}</span>
                <span>
                  <span className="inline-flex items-center gap-1 rounded bg-status-success/10 px-2 py-0.5 text-xs font-medium text-status-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
                    Union Collective
                  </span>
                </span>
                <span className="line-clamp-1 text-muted-foreground">{description}</span>
                <span className="flex items-center gap-5">
                  <Check className="h-4 w-4 text-status-success" />
                  <X className="h-4 w-4 text-status-error" />
                </span>
                <span className="flex items-center">
                  {href ? (
                    <Link href={href} aria-label={`Open ${sourceLabel(row)}`}>
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ) : (
                    <LinkIcon className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </span>
                <span className="flex items-center">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </span>
              </summary>
              <div className="px-12 pb-5">
                {emailMessages.length > 0 ? (
                  <div className="max-w-3xl space-y-4">
                    {emailMessages.map((message, messageIndex) => (
                      <div key={`${row.id}-${messageIndex}`} className="space-y-3">
                        <div className="grid grid-cols-[1fr_auto] gap-4 rounded bg-muted/40 px-4 py-3 text-xs">
                          <div>
                            <p className="font-semibold text-foreground">{message.from || sourceLabel(row)}</p>
                            <p className="mt-1 text-muted-foreground">
                              {[message.to ? `to: ${message.to}` : null, message.cc ? `cc: ${message.cc}` : null].filter(Boolean).join(" ")}
                            </p>
                          </div>
                          <p className="font-medium text-foreground">{message.date || formatDate(row.sourceOccurredAt)}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{message.subject || sourceLabel(row)}</p>
                        {message.body ? (
                          <p className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{message.body}</p>
                        ) : (
                          <p className="text-xs leading-5 text-muted-foreground">No email body text was captured for this message.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="max-w-3xl text-xs leading-5 text-muted-foreground">{description}</p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function SyncedSources({
  packet,
  projectId,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
}) {
  const rows = getEvidenceRows(packet);
  const grouped = groupEvidenceByKind(rows);
  const preferredRows =
    grouped.Emails.length > 0 ? grouped.Emails : rows;
  const tabs = Object.entries(grouped);

  return (
    <section className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Synced</p>
      <div className="flex flex-wrap gap-8 text-sm">
        {tabs.map(([label, tabRows]) => (
          <span
            key={label}
            className={label === "Emails" ? "border-b-2 border-accent pb-2 font-semibold text-accent" : "pb-2 text-muted-foreground"}
          >
            {label}
            {tabRows.length > 0 ? <span className="ml-1 text-xs text-muted-foreground">{tabRows.length}</span> : null}
          </span>
        ))}
      </div>
      <SourceRows rows={preferredRows} projectId={projectId} />
    </section>
  );
}

function TaskTable({ packet }: { packet: ClientProjectIntelligencePacket }) {
  const taskCards = packet.cards.filter((card) => {
    const nextAction = cleanText(card.nextAction);
    return nextAction && !isGenericReviewText(nextAction);
  });
  const tasks = taskCards.length > 0
    ? taskCards.slice(0, 6)
    : packet.recommendedNextMoves.map<InsightCard>((move, index) => ({
        id: `recommended-${index}`,
        title: move,
        cardType: "task",
        section: "recommended_next_moves",
        rank: index + 1,
        summary: move,
        whyItMatters: null,
        currentStatus: "open",
        confidence: "medium",
        attributionStatus: "generated",
        nextAction: move,
        sourceCount: 0,
        metadata: {},
        evidence: [],
        latestFeedback: null,
      }));

  if (tasks.length === 0) return null;

  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Tasks</p>
      <div className="border-y border-border">
        <div className="grid grid-cols-[2.25rem_2.5rem_minmax(12rem,1fr)_8rem_9rem_minmax(16rem,1.2fr)_7rem_4rem_3rem] gap-3 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span />
          <span>Assign</span>
          <span>Name</span>
          <span>Date</span>
          <span>Project</span>
          <span>Description</span>
          <span>Status</span>
          <span>Links</span>
          <span />
        </div>
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <div key={task.id} className="grid grid-cols-[2.25rem_2.5rem_minmax(12rem,1fr)_8rem_9rem_minmax(16rem,1.2fr)_7rem_4rem_3rem] gap-3 px-2 py-3 text-sm">
              <span className="h-4 w-4 rounded border border-border bg-background" />
              <span className="h-6 w-6 rounded-full bg-muted" />
              <span className="font-medium text-foreground">{task.title}</span>
              <span className="text-muted-foreground">{formatDate(task.evidence[0]?.sourceOccurredAt)}</span>
              <span>
                <span className="inline-flex items-center gap-1 rounded bg-status-success/10 px-2 py-0.5 text-xs font-medium text-status-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
                  Union Collective
                </span>
              </span>
              <span className="line-clamp-1 text-muted-foreground">{cleanText(task.nextAction || task.summary)}</span>
              <span>
                <span className="rounded-full bg-status-error/15 px-2 py-0.5 text-xs font-medium text-status-error">To Do</span>
              </span>
              <span><LinkIcon className="h-4 w-4 text-muted-foreground" /></span>
              <span><MoreVertical className="h-4 w-4 text-muted-foreground" /></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function ProjectIntelligencePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = Number.parseInt(projectId, 10);

  if (Number.isNaN(numericProjectId)) {
    notFound();
  }

  const supabase = createServiceClient();
  const projectResult = await supabase
    .from("projects")
    .select("id, name, project_number, budget, budget_used, phase, current_phase, created_at, summary, work_scope")
    .eq("id", numericProjectId)
    .single();

  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;
  const target = await resolveIntelligenceTarget({
    query: project.name ?? `Project ${project.id}`,
    selectedProjectId: numericProjectId,
    supabase,
  });
  const packet = target
    ? await loadCurrentIntelligencePacket({
        targetId: target.id,
        supabase,
      })
    : null;
  const operatingSourceSet = await buildProjectOperatingSummarySources({
    projectId: numericProjectId,
    supabase,
  });

  return (
    <PageShell
      variant="dashboard"
      title="Project Intelligence"
      description={project.name ?? `Project ${project.id}`}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/ai-assistant">Ask assistant</Link>
        </Button>
      }
      contentClassName="space-y-12"
    >
      {!target ? (
        <IntelligenceEmptyState
          project={project}
          reason="Create an intelligence target before the page can show cards, evidence, and recommendations."
        />
      ) : !packet ? (
        <IntelligenceEmptyState
          project={project}
          reason="The target exists, but no current packet has been generated yet."
        />
      ) : (
        <>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="space-y-10">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {project.name ?? "Project"}
                </p>
                <div className="h-1.5 w-24 bg-accent" />
              </div>
              <NarrativeSections packet={packet} project={project} />
            </div>
            <ProjectDetails
              project={project}
              packet={packet}
              availableSourceCount={operatingSourceSet.sources.length}
            />
          </div>
          <SyncedSources packet={packet} projectId={numericProjectId} />
          <TaskTable packet={packet} />
          <section className="flex items-center justify-between border-t border-border pt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Timeline</p>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {packet.cards.length} active line items
            </p>
          </section>
        </>
      )}
    </PageShell>
  );
}
