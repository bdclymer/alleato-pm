export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import {
  Button,
  EmptyState,
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
    <section id="packet-overview" className="space-y-1 border-b border-border pb-6">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5">
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{formatLabel(packet.freshnessStatus)}</span>
          {" "}· {formatDateTime(packet.generatedAt)}
        </span>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{packet.cards.length}</span> cards
        </span>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{linkedEvidenceValue}</span>
          {" "}evidence{latestSourceAt ? `, latest ${formatDate(latestSourceAt)}` : ""}
        </span>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{formatLabel(packet.confidenceSummary.overall)}</span> confidence
        </span>
        <span id="source-window" className="scroll-mt-16 text-sm text-muted-foreground">
          {buildSourceWindow(packet)}
        </span>
      </div>
    </section>
  );
}

function CoverageAndGaps({ packet }: { packet: ClientProjectIntelligencePacket }) {
  const gaps = getCoverageGaps(packet);
  const coverageRows = [
    ["Documents", packet.sourceCoverage.documentMetadataRows],
    ["AI memory", packet.sourceCoverage.aiMemoryRows],
    ["Emails", packet.sourceCoverage.projectEmailRows],
    ["Stale", packet.staleItemCount],
  ];

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Coverage
      </p>
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        {coverageRows.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dd className="text-sm font-medium text-foreground">{String(getCoverageNumber(value))}</dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>
      {gaps.length > 0 ? (
        <div className="space-y-2 pt-1">
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
