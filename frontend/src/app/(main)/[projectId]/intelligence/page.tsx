export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Button,
  EmptyState,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { InsightCardShowcase } from "@/components/ai-intelligence/insight-card-showcase";
import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import type {
  ClientProjectIntelligencePacket,
  InsightCard,
  InsightCardEvidence,
} from "@/lib/ai/intelligence/types";
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
    .replace(/\[message:[^\]]+\]/gi, "")
    .replace(/\[\d{4}-\d{2}-\d{2}[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

function splitIntoReadableItems(value: string): string[] {
  const text = cleanText(value);
  if (!text) return [];

  return text
    .replace(/\?\s+/g, "?\n")
    .replace(/\.\s+/g, ".\n")
    .replace(
      /\s+(?=(?:Lock|Close|Finish|Resolve|Complete|Maintain|Confirm|Coordinate|Review|Provide|Verify|Submit|Finalize|Freeze)\b)/g,
      "\n",
    )
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitRiskNarrative(value: string): { questions: string[]; actions: string[] } {
  const items = splitIntoReadableItems(value);
  return {
    questions: items.filter((item) => item.endsWith("?")),
    actions: items.filter((item) => !item.endsWith("?")),
  };
}

function confidenceClass(value: string | null | undefined): string {
  if (value === "high") return "text-status-success";
  if (value === "medium") return "text-status-warning";
  return "text-status-error";
}

function freshnessText(packet: ClientProjectIntelligencePacket): string {
  const generated = formatDate(packet.generatedAt);
  if (packet.freshnessStatus === "fresh" && generated) return `Fresh as of ${generated}`;
  if (generated) return `${formatLabel(packet.freshnessStatus)} as of ${generated}`;
  return formatLabel(packet.freshnessStatus);
}

function sourceHref(projectId: number, evidence: InsightCardEvidence): string | null {
  if (!evidence.sourceDocumentId) return null;
  return `/${projectId}/intelligence/sources/${encodeURIComponent(evidence.sourceDocumentId)}`;
}

function sourceLabel(evidence: InsightCardEvidence): string {
  return [evidence.sourceTitle || "Untitled source", formatLabel(evidence.sourceCategory || evidence.sourceType)]
    .filter(Boolean)
    .join(" - ");
}

function cardPriority(card: InsightCard): number {
  const typePriority: Record<string, number> = {
    blocker: 0,
    risk: 1,
    open_question: 2,
    financial_exposure: 3,
    change_management: 4,
    schedule_risk: 5,
    decision: 6,
    requirement: 7,
    task: 8,
    project_update: 9,
  };
  return typePriority[card.cardType] ?? 10;
}

function packetEvidence(packet: ClientProjectIntelligencePacket): InsightCardEvidence[] {
  return packet.cards.flatMap((card) => card.evidence);
}

function evidenceCategoryLabel(evidence: InsightCardEvidence): string {
  return formatLabel(evidence.sourceCategory || evidence.sourceType);
}

function latestEvidence(packet: ClientProjectIntelligencePacket): InsightCardEvidence[] {
  return [...packetEvidence(packet)]
    .sort((a, b) => (b.sourceOccurredAt ?? "").localeCompare(a.sourceOccurredAt ?? ""))
    .slice(0, 4);
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

function PacketHealth({
  project,
  packet,
}: {
  project: ProjectRow;
  packet: ClientProjectIntelligencePacket;
}) {
  const evidence = packetEvidence(packet);
  const gaps = packet.sourceCoverage.gaps?.filter((gap): gap is string => typeof gap === "string").slice(0, 3) ?? [];
  const activeSourceGroups = new Set(evidence.map(evidenceCategoryLabel)).size;
  const latestSources = latestEvidence(packet);
  const details = [
    ["Packet", freshnessText(packet)],
    ["Confidence", formatLabel(packet.confidenceSummary.overall)],
    ["Budget", formatCurrency(project.budget)],
    ["Direct costs", formatCurrency(project.budget_used)],
    ["Evidence", `${evidence.length} linked citations`],
    ["Coverage", `${activeSourceGroups} source groups active`],
    ["Review queue", `${packet.reviewQueueCount} queued`],
  ];

  return (
    <aside className="space-y-6 rounded-md bg-muted/35 px-6 py-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          Packet health
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          This is the source quality check before anyone acts on the read.
        </p>
      </div>
      <dl className="space-y-4">
        {details.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-4 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {gaps.length > 0 ? (
        <div className="space-y-2 border-t border-border/60 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Known gaps
          </p>
          <ul className="space-y-2">
            {gaps.map((gap) => (
              <li key={gap} className="text-sm leading-6 text-muted-foreground">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="border-t border-border/60 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Latest cited sources
        </p>
        <div className="mt-3 space-y-2">
          {latestSources.map((source) => (
            <div key={source.id} className="grid grid-cols-[5.5rem_1fr] gap-3 text-xs">
              <span className="text-muted-foreground">{evidenceCategoryLabel(source)}</span>
              <span className="truncate font-medium text-foreground">{source.sourceTitle ?? "Untitled source"}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function OperatingRead({
  packet,
  project,
}: {
  packet: ClientProjectIntelligencePacket;
  project: ProjectRow;
}) {
  const cards = packet.cards;
  const scheduleTypes = ["schedule_risk", "project_update", "task"];
  const riskTypes = ["risk", "blocker", "open_question"];
  const decisionTypes = ["decision", "change_management", "financial_exposure", "requirement"];
  const schedule = getSectionText(
    cards,
    scheduleTypes,
    cleanText(project.summary || project.work_scope) || "No schedule narrative has been compiled yet.",
  );
  const risks = getSectionText(
    cards,
    riskTypes,
    cleanText(packet.whyItMatters || packet.currentStatus) || "No active risk narrative has been compiled yet.",
  );
  const decisions = getSectionText(
    cards,
    decisionTypes,
    cleanText(packet.strategicRead || packet.executiveSummary) || "No decision narrative has been compiled yet.",
  );
  const riskNarrative = splitRiskNarrative(risks);
  const openItems = [...riskNarrative.questions, ...riskNarrative.actions].slice(0, 5);

  const sections: Array<{ label: string; text: string }> = [
    { label: "Current status", text: cleanText(packet.currentStatus || packet.executiveSummary) || schedule },
    { label: "Schedule and milestones", text: schedule },
    { label: "Decisions and scope movement", text: decisions },
  ];

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Operating read
        </p>
        <SectionRuleHeading
          label="What this packet says about the job right now"
          className="mb-0 pb-0"
        />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)]">
        <div className="space-y-6">
          {sections.map(({ label, text }) => (
            <div key={label} className="space-y-2 border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{label}</p>
              <p className="text-sm leading-7 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-md bg-muted/30 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            Open risk loop
          </p>
          {openItems.length > 0 ? (
            <ul className="space-y-3">
              {openItems.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">{risks}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ActionQueue({
  packet,
  projectId,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
}) {
  const actionCards = [...packet.cards]
    .filter((card) => cleanText(card.nextAction || card.summary || card.currentStatus))
    .sort((a, b) => cardPriority(a) - cardPriority(b) || (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 8);

  if (actionCards.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Action queue
          </p>
          <SectionRuleHeading
            label="Decisions, blockers, and risks worth acting on"
            className="mb-0 pb-0"
          />
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/${projectId}/tasks`}>Open task page</Link>
        </Button>
      </div>
      <div className="divide-y divide-border/70">
        {actionCards.map((card) => {
          const primaryEvidence = card.evidence[0];
          const href = primaryEvidence ? sourceHref(projectId, primaryEvidence) : null;
          const primaryText = cleanText(card.nextAction || card.summary || card.currentStatus);

          return (
            <article key={card.id} className="grid gap-4 py-5 md:grid-cols-[9rem_minmax(0,1fr)_12rem]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {formatLabel(card.cardType)}
                </p>
                <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${confidenceClass(card.confidence)}`}>
                  {formatLabel(card.confidence)} confidence
                </p>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="text-sm leading-7 text-muted-foreground">{primaryText}</p>
                {primaryEvidence ? (
                  href ? (
                    <Link
                      href={href}
                      className="inline-flex max-w-full text-xs font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      <span className="truncate">{sourceLabel(primaryEvidence)}</span>
                    </Link>
                  ) : (
                    <p className="truncate text-xs font-medium text-foreground">{sourceLabel(primaryEvidence)}</p>
                  )
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground md:text-right">
                <p>{card.evidence.length} citation{card.evidence.length === 1 ? "" : "s"}</p>
                {primaryEvidence?.sourceOccurredAt ? <p>{formatDate(primaryEvidence.sourceOccurredAt)}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EvidenceCoverage({
  packet,
}: {
  packet: ClientProjectIntelligencePacket;
}) {
  const evidence = packetEvidence(packet);
  const rows = Array.from(
    evidence.reduce((counts, item) => {
      const label = evidenceCategoryLabel(item);
      const current = counts.get(label) ?? {
        label,
        count: 0,
        latestAt: null as string | null,
      };
      current.count += 1;
      if (item.sourceOccurredAt && (!current.latestAt || item.sourceOccurredAt > current.latestAt)) {
        current.latestAt = item.sourceOccurredAt;
      }
      counts.set(label, current);
      return counts;
    }, new Map<string, { label: string; count: number; latestAt: string | null }>()),
  )
    .map(([, row]) => row)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Evidence coverage
        </p>
        <SectionRuleHeading
          label="What the compiler could see"
          className="mb-0 pb-0"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-2">
          <p className="text-3xl font-semibold tabular-nums text-foreground">{evidence.length}</p>
          <p className="text-sm leading-6 text-muted-foreground">
            citations are linked to the current packet. Use this to judge whether the read is supported before acting.
          </p>
        </div>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {row.label}
              </p>
              <p className="text-sm font-semibold text-foreground">{row.count} cited</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.latestAt ? formatDate(row.latestAt) : "No recent source date"}
              </p>
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
  let packet: ClientProjectIntelligencePacket | null = null;
  let packetLoadError: string | null = null;

  if (target) {
    try {
      packet = await loadCurrentIntelligencePacket({
        targetId: target.id,
        supabase,
        includeSourcePreview: false,
      });
    } catch (error) {
      packetLoadError = error instanceof Error ? error.message : "Unexpected packet load failure.";
    }
  }

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
      ) : packetLoadError ? (
        <>
          <EmptyState
            title="Project intelligence packet could not load"
            description={`The current packet cards failed to load: ${packetLoadError}`}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/intelligence-compiler">Open compiler health</Link>
              </Button>
            }
          />
        </>
      ) : !packet ? (
        <IntelligenceEmptyState
          project={project}
          reason="The target exists, but no current packet has been generated yet."
        />
      ) : (
        <>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <OperatingRead packet={packet} project={project} />
            <PacketHealth
              project={project}
              packet={packet}
            />
          </div>
          <ActionQueue packet={packet} projectId={numericProjectId} />
          <EvidenceCoverage packet={packet} />
          <details className="group border-t border-border/70 pt-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground marker:hidden">
              Packet card review
              <span className="text-xs font-medium text-muted-foreground group-open:hidden">
                Show card detail
              </span>
              <span className="hidden text-xs font-medium text-muted-foreground group-open:inline">
                Hide card detail
              </span>
            </summary>
            <div className="mt-6 space-y-10">
              <InsightCardShowcase cards={packet.cards} projectId={numericProjectId} />
            </div>
          </details>
        </>
      )}
    </PageShell>
  );
}
