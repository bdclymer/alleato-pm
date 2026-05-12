export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Button,
  EmptyState,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
import { InsightCardShowcase } from "@/components/ai-intelligence/insight-card-showcase";
import {
  ProjectIntelligenceSourceTables,
  ProjectIntelligenceTasksTable,
} from "@/components/ai-intelligence/project-intelligence-cross-reference";
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

function getSectionEvidence(cards: InsightCard[], types: string[]): InsightCardEvidence[] {
  const seen = new Set<string>();
  const evidence: InsightCardEvidence[] = [];

  for (const card of cards) {
    if (!types.includes(card.cardType)) continue;

    for (const item of card.evidence) {
      const key = item.sourceDocumentId || item.sourceMessageId || item.id;
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push(item);
    }
  }

  return evidence.slice(0, 4);
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionSourceLinks({
  projectId,
  evidence,
}: {
  projectId: number;
  evidence: InsightCardEvidence[];
}) {
  const linkedEvidence = evidence.filter((item) => item.sourceDocumentId);

  if (linkedEvidence.length === 0) return null;

  return (
    <div className="border-t border-border/70 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Sources
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {linkedEvidence.map((item) => (
          <Link
            key={item.sourceDocumentId ?? item.id}
            href={`/${projectId}/intelligence/sources/${encodeURIComponent(item.sourceDocumentId ?? "")}`}
            className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
          >
            <span className="truncate font-medium text-foreground">
              {item.sourceTitle || "Untitled source"}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {formatLabel(item.sourceCategory || item.sourceType)}
            </span>
            {item.sourceOccurredAt ? (
              <span className="shrink-0 text-muted-foreground">
                {formatDate(item.sourceOccurredAt)}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function buildUnavailablePacket(targetId: string): ClientProjectIntelligencePacket {
  return {
    id: "unavailable",
    targetId,
    packetType: "current",
    packetVersion: "unavailable",
    generatedAt: "",
    coveredStartAt: null,
    coveredEndAt: null,
    freshnessStatus: "failed",
    executiveSummary: "",
    currentStatus: null,
    strategicRead: null,
    whyItMatters: null,
    recommendedNextMoves: [],
    confidenceSummary: { overall: "low", reason: "Packet cards failed to load." },
    sourceCoverage: {
      freshnessStatus: "failed",
      linkedEvidenceCount: 0,
      gaps: ["Packet cards failed to load."],
    },
    reviewQueueCount: 0,
    staleItemCount: 0,
    packetJson: {},
    compilerVersion: null,
    cards: [],
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
  projectId,
}: {
  packet: ClientProjectIntelligencePacket;
  project: ProjectRow;
  projectId: number;
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

  const sections: Array<{ label: string; text: string; types: string[] }> = [
    { label: "Schedule & milestones", text: schedule, types: scheduleTypes },
    { label: "Decisions & scope movement", text: decisions, types: decisionTypes },
  ];

  return (
    <div className="space-y-8">
      <section className="max-w-4xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
          Open questions & risks
        </p>
        {riskNarrative.questions.length > 0 || riskNarrative.actions.length > 0 ? (
          <div className="space-y-6">
            {riskNarrative.questions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Open questions
                </p>
                <BulletList items={riskNarrative.questions} />
              </div>
            ) : null}
            {riskNarrative.actions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Next actions
                </p>
                <BulletList items={riskNarrative.actions} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">{risks}</p>
        )}
        <SectionSourceLinks
          projectId={projectId}
          evidence={getSectionEvidence(cards, riskTypes)}
        />
      </section>
      {sections.map(({ label, text, types }) => (
        <section key={label} className="max-w-4xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{label}</p>
          <p className="text-sm leading-6 text-muted-foreground">{text}</p>
          <SectionSourceLinks
            projectId={projectId}
            evidence={getSectionEvidence(cards, types)}
          />
        </section>
      ))}
    </div>
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
      });
    } catch (error) {
      packetLoadError = error instanceof Error ? error.message : "Unexpected packet load failure.";
    }
  }

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
      ) : packetLoadError ? (
        <>
          <EmptyState
            title="Project intelligence packet could not load"
            description={`Available project sources and tasks are still shown below, but the current packet cards failed: ${packetLoadError}`}
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/intelligence-compiler">Open compiler health</Link>
              </Button>
            }
          />
          <ProjectIntelligenceSourceTables
            projectId={numericProjectId}
            packet={buildUnavailablePacket(target.id)}
            sources={operatingSourceSet.sources}
            coverage={operatingSourceSet.coverage}
          />
          <ProjectIntelligenceTasksTable
            projectId={numericProjectId}
            projectName={project.name}
          />
        </>
      ) : !packet ? (
        <IntelligenceEmptyState
          project={project}
          reason="The target exists, but no current packet has been generated yet."
        />
      ) : (
        <>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="space-y-10">
              <NarrativeSections packet={packet} project={project} projectId={numericProjectId} />
            </div>
            <ProjectDetails
              project={project}
              packet={packet}
              availableSourceCount={operatingSourceSet.sources.length}
            />
          </div>
          <ProjectIntelligenceSourceTables
            projectId={numericProjectId}
            packet={packet}
            sources={operatingSourceSet.sources}
            coverage={operatingSourceSet.coverage}
          />
          <InsightCardShowcase cards={packet.cards} projectId={numericProjectId} />
          <ProjectIntelligenceTasksTable
            projectId={numericProjectId}
            projectName={project.name}
          />
        </>
      )}
    </PageShell>
  );
}
