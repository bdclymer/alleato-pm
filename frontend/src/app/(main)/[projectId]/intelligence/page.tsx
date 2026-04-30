export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FileSearch,
  Lightbulb,
  MessageSquareText,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import {
  Badge,
  Button,
  EmptyState,
  KpiRow,
  PageContainer,
  ProjectPageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/ds";
import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import type {
  ClientProjectIntelligencePacket,
  ConfidenceLevel,
  InsightCard,
  PacketFreshnessStatus,
  ResolvedIntelligenceTarget,
} from "@/lib/ai/intelligence/types";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";

type ProjectLookup = {
  id: number;
  name: string | null;
};

const cardTypeIcons: Record<string, typeof AlertTriangle> = {
  risk: ShieldAlert,
  decision: CheckCircle2,
  blocker: AlertTriangle,
  task: Clock3,
  product_need: Lightbulb,
  process_issue: AlertTriangle,
  project_update: MessageSquareText,
  open_question: CircleHelp,
  requirement: FileSearch,
  financial_exposure: TrendingUp,
  change_management: ArrowRight,
  schedule_risk: Clock3,
};

const confidenceVariant: Record<ConfidenceLevel, "success" | "warning" | "error"> = {
  high: "success",
  medium: "warning",
  low: "error",
};

const freshnessVariant: Record<PacketFreshnessStatus, "success" | "warning" | "error" | "info" | "neutral"> = {
  fresh: "success",
  stale: "warning",
  partial: "warning",
  working_sample: "info",
  failed: "error",
};

function formatLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

function getCoverageNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getCoverageGaps(packet: ClientProjectIntelligencePacket): string[] {
  const gaps = packet.sourceCoverage.gaps;
  return Array.isArray(gaps)
    ? gaps.filter((gap): gap is string => typeof gap === "string" && gap.trim().length > 0)
    : [];
}

function buildSourceWindow(packet: ClientProjectIntelligencePacket): string {
  if (packet.coveredStartAt && packet.coveredEndAt) {
    return `${formatDate(packet.coveredStartAt)} - ${formatDate(packet.coveredEndAt)}`;
  }
  if (packet.coveredStartAt) return `From ${formatDate(packet.coveredStartAt)}`;
  if (packet.coveredEndAt) return `Through ${formatDate(packet.coveredEndAt)}`;
  return formatDateTime(packet.generatedAt);
}

function groupCardsBySection(cards: InsightCard[]): Array<[string, InsightCard[]]> {
  const grouped = new Map<string, InsightCard[]>();
  for (const card of cards) {
    const section = card.section ? formatLabel(card.section) : "General";
    grouped.set(section, [...(grouped.get(section) ?? []), card]);
  }
  return Array.from(grouped.entries());
}

function IntelligenceEmptyState({
  project,
  reason,
}: {
  project: ProjectLookup;
  reason: string;
}) {
  return (
    <section className="space-y-4">
      <EmptyState
        title="No project intelligence packet yet"
        description={`${project.name ?? `Project ${project.id}`} does not have a current packet to display. ${reason}`}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/ai-assistant">Open assistant</Link>
          </Button>
        }
      />
    </section>
  );
}

function PacketOverview({
  packet,
  target,
}: {
  packet: ClientProjectIntelligencePacket;
  target: ResolvedIntelligenceTarget;
}) {
  const linkedEvidenceCount = getCoverageNumber(packet.sourceCoverage.linkedEvidenceCount);
  const latestSourceAt =
    typeof packet.sourceCoverage.latestSourceAt === "string"
      ? packet.sourceCoverage.latestSourceAt
      : null;

  return (
    <section className="space-y-4">
      <KpiRow
        metrics={[
          {
            label: "Freshness",
            value: formatLabel(packet.freshnessStatus),
            context: `Generated ${formatDateTime(packet.generatedAt)}`,
          },
          {
            label: "Insight cards",
            value: String(packet.cards.length),
            context: `${packet.reviewQueueCount} review items`,
          },
          {
            label: "Linked evidence",
            value: String(linkedEvidenceCount || packet.cards.reduce((total, card) => total + card.evidence.length, 0)),
            context: latestSourceAt ? `Latest source ${formatDate(latestSourceAt)}` : "Source freshness unavailable",
          },
          {
            label: "Confidence",
            value: formatLabel(packet.confidenceSummary.overall),
            context: packet.confidenceSummary.reason,
          },
        ]}
        size="medium"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={formatLabel(packet.freshnessStatus)}
              variant={freshnessVariant[packet.freshnessStatus]}
            />
            <StatusBadge
              status={formatLabel(packet.confidenceSummary.overall)}
              variant={confidenceVariant[packet.confidenceSummary.overall ?? "low"]}
            />
            <Badge variant="outline">{formatLabel(packet.packetType)}</Badge>
            <Badge variant="outline">{target.slug}</Badge>
          </div>

          <div className="space-y-3">
            <p className="text-sm leading-6 text-foreground">{packet.executiveSummary}</p>
            {packet.strategicRead ? (
              <p className="text-sm leading-6 text-muted-foreground">{packet.strategicRead}</p>
            ) : null}
            {packet.whyItMatters ? (
              <p className="text-sm leading-6 text-muted-foreground">{packet.whyItMatters}</p>
            ) : null}
          </div>
        </div>

        <aside className="space-y-3 border-l-0 border-border pl-0 lg:border-l lg:pl-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Source window
            </p>
            <p className="mt-1 text-sm text-foreground">{buildSourceWindow(packet)}</p>
          </div>
          {packet.currentStatus ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Current status
              </p>
              <p className="mt-1 text-sm text-foreground">{packet.currentStatus}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Compiler
            </p>
            <p className="mt-1 text-sm text-foreground">
              {packet.compilerVersion ?? "Manual intelligence packet"}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RecommendedMoves({ moves }: { moves: string[] }) {
  if (moves.length === 0) return null;

  return (
    <section className="space-y-4">
      <SectionHeader title="Recommended Next Moves" count={moves.length} />
      <ol className="divide-y divide-border rounded-lg border border-border">
        {moves.map((move, index) => (
          <li key={`${move}-${index}`} className="flex gap-3 p-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-foreground">{move}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function InsightCardRow({ card }: { card: InsightCard }) {
  const Icon = cardTypeIcons[card.cardType] ?? Brain;
  const visibleEvidence = card.evidence.slice(0, 3);

  return (
    <article className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-2">
            <div>
              <h3 className="text-sm font-semibold leading-6 text-foreground">{card.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{card.summary}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={formatLabel(card.confidence)} variant={confidenceVariant[card.confidence]} />
              <StatusBadge status={formatLabel(card.currentStatus)} />
              <Badge variant="outline">{formatLabel(card.cardType)}</Badge>
              <Badge variant="outline">{card.sourceCount} sources</Badge>
            </div>
          </div>
        </div>
      </div>

      {(card.whyItMatters || card.nextAction) ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {card.whyItMatters ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Why it matters
              </p>
              <p className="text-sm leading-6 text-foreground">{card.whyItMatters}</p>
            </div>
          ) : null}
          {card.nextAction ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Next action
              </p>
              <p className="text-sm leading-6 text-foreground">{card.nextAction}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {visibleEvidence.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Evidence
          </p>
          <div className="divide-y divide-border">
            {visibleEvidence.map((evidence) => (
              <div key={evidence.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatLabel(evidence.sourceType)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {evidence.sourceTitle ?? "Untitled source"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(evidence.sourceOccurredAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {evidence.summary || evidence.excerpt || evidence.relevanceReason}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function InsightCards({ cards }: { cards: InsightCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="space-y-6">
      <SectionHeader title="Insight Cards" count={cards.length} />
      {groupCardsBySection(cards).map(([section, sectionCards]) => (
        <div key={section} className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{section}</h3>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {sectionCards.map((card) => (
              <InsightCardRow key={card.id} card={card} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function CoverageAndGaps({ packet }: { packet: ClientProjectIntelligencePacket }) {
  const gaps = getCoverageGaps(packet);
  const coverageRows = [
    ["Document rows", packet.sourceCoverage.documentMetadataRows],
    ["AI memory rows", packet.sourceCoverage.aiMemoryRows],
    ["Project email rows", packet.sourceCoverage.projectEmailRows],
    ["Stale items", packet.staleItemCount],
  ];

  return (
    <section className="space-y-4">
      <SectionHeader title="Coverage And Gaps" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-1">
          {coverageRows.map(([label, value]) => (
            <div key={label} className="space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {label}
              </dt>
              <dd className="text-sm text-foreground">{String(getCoverageNumber(value))}</dd>
            </div>
          ))}
        </dl>

        <div className={cn("space-y-3", gaps.length === 0 && "text-muted-foreground")}>
          {gaps.length > 0 ? (
            gaps.map((gap) => (
              <div key={gap} className="flex gap-3 rounded-lg border border-border p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm leading-6 text-foreground">{gap}</p>
              </div>
            ))
          ) : (
            <p className="text-sm">No source coverage gaps were recorded for this packet.</p>
          )}
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
    .select("id, name")
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

  return (
    <>
      <ProjectPageHeader
        title="Project Intelligence"
        description={`Current compiled intelligence for ${project.name ?? `project ${project.id}`}.`}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/ai-assistant">Ask assistant</Link>
          </Button>
        }
      />
      <PageContainer className="space-y-8">
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
            <PacketOverview packet={packet} target={target} />
            <RecommendedMoves moves={packet.recommendedNextMoves} />
            <InsightCards cards={packet.cards} />
            <CoverageAndGaps packet={packet} />
          </>
        )}
      </PageContainer>
    </>
  );
}
