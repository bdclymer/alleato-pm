export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import {
  Button,
  EmptyState,
  SectionHeader,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
import { InsightCardShowcase } from "@/components/ai-intelligence/insight-card-showcase";
import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import type {
  ClientProjectIntelligencePacket,
} from "@/lib/ai/intelligence/types";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";

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

function PacketSignalLink({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <a
      href={href}
      className="group inline-flex min-w-0 items-baseline gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="font-medium text-foreground">{value}</span>
      <span className="truncate text-muted-foreground">{label}</span>
    </a>
  );
}

function PacketOverview({
  packet,
}: {
  packet: ClientProjectIntelligencePacket;
}) {
  const linkedEvidenceCount = getCoverageNumber(packet.sourceCoverage.linkedEvidenceCount);
  const latestSourceAt =
    typeof packet.sourceCoverage.latestSourceAt === "string"
      ? packet.sourceCoverage.latestSourceAt
      : null;
  const linkedEvidenceValue = linkedEvidenceCount || packet.cards.reduce((total, card) => total + card.evidence.length, 0);

  return (
    <section id="packet-overview" className="space-y-5">
      <nav
        aria-label="Project intelligence summary"
        className="flex flex-wrap items-baseline gap-x-8 gap-y-2"
      >
        <PacketSignalLink
          href="#source-window"
          value={formatLabel(packet.freshnessStatus)}
          label={`as of ${formatDateTime(packet.generatedAt)}`}
        />
        <PacketSignalLink
          href="#insight-cards"
          value={String(packet.cards.length)}
          label="insight cards"
        />
        <PacketSignalLink
          href="#insight-cards"
          value={String(linkedEvidenceValue)}
          label={latestSourceAt ? `linked evidence, latest ${formatDate(latestSourceAt)}` : "linked evidence"}
        />
        <PacketSignalLink
          href="#packet-overview"
          value={formatLabel(packet.confidenceSummary.overall)}
          label="confidence"
        />
      </nav>

      <div className="space-y-5">
        <div className="space-y-4">
          <div id="source-window" className="scroll-mt-16">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Source window
            </p>
            <p className="mt-1 text-sm text-foreground">{buildSourceWindow(packet)}</p>
          </div>
        </div>
      </div>
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
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
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
    <PageShell
      variant="dashboard"
      title="Project Intelligence"
      description={`Current compiled intelligence for ${project.name ?? `project ${project.id}`}.`}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/ai-assistant">Ask assistant</Link>
        </Button>
      }
      contentClassName="space-y-8"
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
            <PacketOverview packet={packet} />
            <InsightCardShowcase cards={packet.cards} projectId={numericProjectId} />
            <CoverageAndGaps packet={packet} />
          </>
      )}
    </PageShell>
  );
}
