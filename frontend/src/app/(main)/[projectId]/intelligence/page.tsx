export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  Button,
  EmptyState,
} from "@/components/ds";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { InsightCardShowcase } from "@/components/ai-intelligence/insight-card-showcase";
import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import {
  buildProjectOperatingSummarySources,
  type ProjectOperatingSummarySourceSet,
} from "@/lib/ai/services/project-operating-summary-sources";
import type {
  ClientProjectIntelligencePacket,
} from "@/lib/ai/intelligence/types";
import { createServiceClient } from "@/lib/supabase/service";

type ProjectLookup = {
  id: number;
  name: string | null;
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

function normalizeSourceKey(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categorizePacketEvidence(
  sourceType: string | null | undefined,
  sourceCategory: string | null | undefined,
): string {
  const combined = `${normalizeSourceKey(sourceType)} ${normalizeSourceKey(sourceCategory)}`.trim();
  if (combined.includes("fireflies") || combined.includes("meeting") || combined.includes("transcript")) return "meeting";
  if (combined.includes("outlook") || combined.includes("email")) return "email";
  if (combined.includes("teams") || combined.includes("message") || combined.includes("chat")) return "teams";
  if (combined.includes("acumatica") || combined.includes("erp") || combined.includes("direct cost")) return "acumatica";
  if (combined.includes("rfi")) return "rfi";
  if (combined.includes("submittal")) return "submittal";
  if (combined.includes("drawing") || combined.includes("plan")) return "drawing";
  if (combined.includes("spec")) return "specification";
  if (combined.includes("daily report") || combined.includes("daily log")) return "daily_report";
  if (combined.includes("project detail")) return "project_detail";
  if (combined.includes("task") || combined.includes("risk")) return "task";
  if (combined.includes("document") || combined.includes("file") || combined.includes("onedrive")) return "document";
  return "other";
}

function getCoverageGaps(packet: ClientProjectIntelligencePacket): string[] {
  const gaps = packet.sourceCoverage.gaps;
  return Array.isArray(gaps)
    ? gaps.filter((gap): gap is string => typeof gap === "string" && gap.trim().length > 0)
    : [];
}

function getPacketSourceUsageByCategory(
  packet: ClientProjectIntelligencePacket,
  fallbackUsage: Record<string, number>,
): Record<string, number> {
  const categoryCoverage = packet.sourceCoverage.categoryCoverage;
  if (!Array.isArray(categoryCoverage)) return fallbackUsage;

  return categoryCoverage.reduce<Record<string, number>>((acc, row) => {
    if (!row || typeof row !== "object") return acc;
    const category = "category" in row ? row.category : null;
    const sourceCount = "sourceCount" in row ? row.sourceCount : null;
    if (typeof category === "string") {
      acc[category] = typeof sourceCount === "number" && Number.isFinite(sourceCount) ? sourceCount : 0;
    }
    return acc;
  }, {});
}

function buildSourceWindow(packet: ClientProjectIntelligencePacket): string {
  if (packet.coveredStartAt && packet.coveredEndAt) {
    return `${formatDate(packet.coveredStartAt)} - ${formatDate(packet.coveredEndAt)}`;
  }
  if (packet.coveredStartAt) return `From ${formatDate(packet.coveredStartAt)}`;
  if (packet.coveredEndAt) return `Through ${formatDate(packet.coveredEndAt)}`;
  return formatDateTime(packet.generatedAt);
}

function buildSourceHref(
  projectId: number,
  sourceDocumentId: string | null,
): string | null {
  if (!sourceDocumentId) return null;
  return `/${projectId}/intelligence/sources/${encodeURIComponent(sourceDocumentId)}`;
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
  operatingSourceSet,
}: {
  packet: ClientProjectIntelligencePacket;
  operatingSourceSet: ProjectOperatingSummarySourceSet;
}) {
  const linkedEvidenceCount = getCoverageNumber(packet.sourceCoverage.linkedEvidenceCount);
  const latestSourceAt =
    typeof packet.sourceCoverage.latestSourceAt === "string"
      ? packet.sourceCoverage.latestSourceAt
      : null;
  const linkedEvidenceValue = linkedEvidenceCount || packet.cards.reduce((total, card) => total + card.evidence.length, 0);
  const sourceDocumentCount = new Set(
    packet.cards.flatMap((card) =>
      card.evidence
        .map((evidence) => evidence.sourceDocumentId)
        .filter((value): value is string => Boolean(value)),
    ),
  ).size;
  const stats = [
    {
      label: "Freshness",
      value: formatLabel(packet.freshnessStatus),
      detail: formatDateTime(packet.generatedAt),
      icon: ShieldCheck,
    },
    {
      label: "Cards",
      value: String(packet.cards.length),
      detail: `${linkedEvidenceValue} linked evidence`,
      icon: FileText,
    },
    {
      label: "Evidence",
      value: String(linkedEvidenceValue),
      detail: `${sourceDocumentCount} source documents`,
      icon: Database,
    },
    {
      label: "Available",
      value: String(operatingSourceSet.sources.length),
      detail: "source capsules gathered",
      icon: Database,
    },
    {
      label: "Confidence",
      value: formatLabel(packet.confidenceSummary.overall),
      detail: packet.confidenceSummary.reason ?? "Based on linked packet evidence",
      icon: ShieldCheck,
    },
    {
      label: "Window",
      value: buildSourceWindow(packet),
      detail: latestSourceAt ? `Latest source ${formatDate(latestSourceAt)}` : "Source window",
      icon: CalendarDays,
    },
  ];

  return (
    <section id="packet-overview" className="border-y border-border">
      <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="min-w-0 px-0 py-4 md:px-5">
              <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {stat.label}
              </dt>
              <dd className="mt-2 truncate text-sm font-semibold text-foreground">{stat.value}</dd>
              <dd className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{stat.detail}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function SourceUtilizationPanel({
  packet,
  projectId,
  operatingSourceSet,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  operatingSourceSet: ProjectOperatingSummarySourceSet;
}) {
  const evidenceRows = packet.cards.flatMap((card) =>
    card.evidence.map((evidence) => ({
      ...evidence,
      cardId: card.id,
      cardTitle: card.title,
    })),
  );
  const packetUsageByCategory = evidenceRows.reduce<Record<string, number>>((acc, evidence) => {
    const category = categorizePacketEvidence(evidence.sourceType, evidence.sourceCategory);
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});
  const packetSourceUsageByCategory = getPacketSourceUsageByCategory(packet, packetUsageByCategory);
  const evidencePreviewRows = evidenceRows
    .filter((evidence) => evidence.sourceTitle || evidence.sourceDocumentId || evidence.sourceMessageId)
    .slice(0, 8);
  const availableCategories = operatingSourceSet.coverage.filter((category) => category.availableCount > 0);
  const notUsedAvailableCategories = operatingSourceSet.coverage.filter((category) => {
    if (category.category === "project_detail") return false;
    return category.availableCount > 0 && (packetSourceUsageByCategory[category.category] ?? 0) === 0;
  });

  return (
    <section id="source-utilization" className="space-y-6 border-y border-border py-6">
      <SectionRuleHeading label="What Intelligence Is Actually Using" className="mb-0 pb-0" />
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Available source capsules are the project operating inputs now gathered for structured summarization.
        Packet evidence is what the current synced operating packet has linked today.
      </p>
      <p className="text-xs leading-5 text-muted-foreground">
        Packet <span className="font-mono text-foreground">{packet.id}</span> ·{" "}
        {packet.compilerVersion ?? "Unknown compiler"}
      </p>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionRuleHeading label="Available Sources vs Packet Usage" className="mb-0 pb-0" />
          <p className="text-xs text-muted-foreground">
            {availableCategories.length} source categories have available project data
          </p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {operatingSourceSet.coverage.map((category) => {
            const packetSourceCount = packetSourceUsageByCategory[category.category] ?? 0;
            const hasAvailableData = category.availableCount > 0;
            const isUsedByPacket = packetSourceCount > 0;
            return (
              <div key={category.category} className="grid gap-3 py-3 md:grid-cols-[minmax(11rem,16rem)_1fr]">
                <div className="flex min-w-0 items-center gap-2">
                  {hasAvailableData ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{category.label}</p>
                    <p className="text-xs text-muted-foreground">{category.tableNames.join(", ")}</p>
                  </div>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-[8rem_8rem_9rem_1fr]">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">{category.availableCount}</span> available
                  </p>
                  <p className={isUsedByPacket ? "text-muted-foreground" : "text-status-warning"}>
                    <span className="font-medium text-foreground">{packetSourceCount}</span> in packet
                  </p>
                  <p className="text-muted-foreground">
                    {category.latestAt ? formatDate(category.latestAt) : "No date"}
                  </p>
                  <div className="min-w-0 space-y-1">
                    {category.sampleTitles.length > 0 ? (
                      category.sampleTitles.map((title) => (
                        <p key={title} className="truncate text-xs text-muted-foreground">
                          {title}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No records found by the source builder.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {notUsedAvailableCategories.length > 0 ? (
        <div className="space-y-2">
          <SectionRuleHeading
            label="Available But Not Used By Current Packet"
            icon={<AlertTriangle className="h-4 w-4 text-status-warning" />}
            className="mb-0 pb-0"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            {notUsedAvailableCategories.map((category) => category.label).join(", ")} have available project data,
            but the older card packet has no linked evidence from those categories. The assistant now loads the
            operating source map and structured operating summary first; the remaining gap is regenerating the durable
            card packet so this old-packet warning disappears.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <SectionRuleHeading
          label="Sample Packet Evidence Records"
          icon={<Database className="h-4 w-4" />}
          className="mb-0 pb-0"
        />
        {evidencePreviewRows.length > 0 ? (
          <div className="divide-y divide-border border-y border-border">
            {evidencePreviewRows.map((evidence) => {
              const sourceHref = buildSourceHref(projectId, evidence.sourceDocumentId);
              return (
                <div key={evidence.id} className="grid gap-2 py-3 text-sm md:grid-cols-[8rem_1fr_8rem]">
                  <p className="text-muted-foreground">{formatLabel(evidence.sourceType)}</p>
                  <div className="min-w-0">
                    {sourceHref ? (
                      <Link
                        href={sourceHref}
                        className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {evidence.sourceTitle ?? evidence.sourceDocumentId}
                      </Link>
                    ) : (
                      <p className="truncate font-medium text-foreground">
                        {evidence.sourceTitle ?? evidence.sourceMessageId ?? evidence.sourceChunkId ?? "Untitled source"}
                      </p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">Card: {evidence.cardTitle}</p>
                  </div>
                  <p className="text-muted-foreground">{formatDate(evidence.sourceOccurredAt)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            No packet evidence records were loaded.
          </p>
        )}
      </div>
    </section>
  );
}

function CoverageAndGaps({ packet }: { packet: ClientProjectIntelligencePacket }) {
  const gaps = getCoverageGaps(packet);
  const latestSourceAt =
    typeof packet.sourceCoverage.latestSourceAt === "string"
      ? packet.sourceCoverage.latestSourceAt
      : null;
  const coverageRows: Array<[string, unknown]> = [
    ["Promoted cards", packet.sourceCoverage.promotedCardCount ?? packet.cards.length],
    [
      "Linked evidence",
      packet.sourceCoverage.linkedEvidenceCount ??
        packet.cards.reduce((total, card) => total + card.evidence.length, 0),
    ],
    ["Stale", packet.staleItemCount],
  ];
  const optionalRows: Array<[string, unknown]> = [
    ["Documents", packet.sourceCoverage.documentMetadataRows],
    ["AI memory", packet.sourceCoverage.aiMemoryRows],
    ["Emails", packet.sourceCoverage.projectEmailRows],
  ].filter((row): row is [string, number] => typeof row[1] === "number" && row[1] > 0);

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-semibold text-foreground">Coverage</p>
        <p className="text-xs text-muted-foreground">Compiler inputs and known gaps</p>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3 border-b border-border pb-4">
        {[...coverageRows, ...optionalRows].map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dd className="text-sm font-medium text-foreground">{String(getCoverageNumber(value))}</dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
        {latestSourceAt ? (
          <div className="flex items-baseline gap-2">
            <dd className="text-sm font-medium text-foreground">{formatDate(latestSourceAt)}</dd>
            <dt className="text-xs text-muted-foreground">Latest source</dt>
          </div>
        ) : null}
      </dl>
      {gaps.length > 0 ? (
        <div className="space-y-2">
          {gaps.map((gap) => (
            <div key={gap} className="flex gap-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-warning" />
              <p className="text-sm leading-6 text-muted-foreground">{gap}</p>
            </div>
          ))}
        </div>
      ) : null}
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
  const operatingSourceSet = await buildProjectOperatingSummarySources({
    projectId: numericProjectId,
    supabase,
  });

  return (
    <PageShell
      variant="dashboard"
      title="Project Intelligence"
      description={`Current compiled intelligence for ${project.name ?? `project ${project.id}`}.`}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/ai-assistant">Ask assistant</Link>
        </Button>
      }
      contentClassName="space-y-10"
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
            <PacketOverview packet={packet} operatingSourceSet={operatingSourceSet} />
            <SourceUtilizationPanel
              packet={packet}
              projectId={numericProjectId}
              operatingSourceSet={operatingSourceSet}
            />
            <InsightCardShowcase cards={packet.cards} projectId={numericProjectId} />
            <CoverageAndGaps packet={packet} />
          </>
      )}
    </PageShell>
  );
}
