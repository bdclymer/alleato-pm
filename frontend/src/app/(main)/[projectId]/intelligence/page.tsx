export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import {
  Badge,
  Button,
  EmptyState,
  Heading,
  StatusBadge,
} from "@/components/ds";
import { PageShell } from "@/components/layout";
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
  | "stage"
  | "created_at"
  | "summary"
  | "work_scope"
>;

type SourceLane = {
  id: string;
  label: string;
  description: string;
  icon: typeof Users;
  evidence: InsightCardEvidence[];
  cards: InsightCard[];
};

type StrategicReportItem = {
  title: string;
  detail?: string;
  meta?: string;
};

const CARD_PRIORITY: Record<string, number> = {
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
  sentiment: 10,
};

const SOURCE_LANE_DEFS = [
  {
    id: "meetings",
    label: "Meetings",
    description: "Themes, decisions, and open loops pulled from meeting transcripts.",
    icon: Users,
    match: ["meeting", "fireflies", "transcript"],
  },
  {
    id: "emails",
    label: "Outlook",
    description: "Approval friction, owner/vendor signals, and email-based commitments.",
    icon: Mail,
    match: ["email", "outlook"],
  },
  {
    id: "teams",
    label: "Teams",
    description: "Coordination gaps, informal blockers, and tone shifts from team messages.",
    icon: MessageSquare,
    match: ["teams", "chat", "message"],
  },
  {
    id: "documents",
    label: "Files and docs",
    description: "Referenced proposals, scope, drawings, specs, and uploaded project files.",
    icon: FileText,
    match: ["document", "file", "drawing", "spec", "proposal", "quote", "pdf"],
  },
] as const;

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
    .replace(/(?:^|\s)#{1,6}\s+/gm, " ")
    .replace(/\*{1,3}([^*]*)\*{1,3}/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanUnknown(value: unknown): string {
  return cleanText(typeof value === "string" || typeof value === "number" ? String(value) : "");
}

function isLowSignalText(value: string | null | undefined): boolean {
  const text = cleanText(value).toLowerCase();
  if (!text) return true;
  const emailCount = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/g)?.length ?? 0;
  const dateCount = text.match(/\b(?:mon|tue|wed|thu|fri|sat|sun)\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g)?.length ?? 0;
  const spacedLetters = text.match(/\b(?:[a-z]\s){4,}[a-z]\b/g)?.length ?? 0;

  return (
    text.length < 24 ||
    text === "this source contains project-relevant language that should be reviewed before it is trusted in a current intelligence packet." ||
    text === "review the source attribution and extracted signal, then promote or reject it." ||
    (text.includes(" duration:") && text.includes(" participants:")) ||
    (text.includes(" date:") && text.includes(" participants:") && emailCount >= 2) ||
    text.startsWith("subject:") ||
    (text.includes("active intelligence card") && text.includes("top signal")) ||
    text.includes("no clean synthesis has been compiled") ||
    emailCount >= 5 ||
    dateCount >= 8 ||
    spacedLetters > 0
  );
}

function firstStrategicText(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text && !isLowSignalText(text)) return text;
  }
  return "";
}

function summarizeText(value: string, maxLength = 360): string {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSentence = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("?"),
    truncated.lastIndexOf("!"),
  );
  if (lastSentence > 180) return truncated.slice(0, lastSentence + 1);
  return `${truncated.trim()}...`;
}

function strategicReport(packet: ClientProjectIntelligencePacket): Record<string, unknown> {
  return asRecord(asRecord(packet.packetJson).strategicReport);
}

function hasStrategicReport(packet: ClientProjectIntelligencePacket): boolean {
  return Object.keys(strategicReport(packet)).length > 0;
}

function strategicItems(
  packet: ClientProjectIntelligencePacket,
  key: string,
  detailKeys: string[],
  metaKeys: string[] = [],
): StrategicReportItem[] {
  const items: Array<StrategicReportItem | null> = asArray(strategicReport(packet)[key])
    .map((item) => {
      const record = asRecord(item);
      const title = cleanUnknown(record.title);
      if (!title || isLowSignalText(title)) return null;
      const detail = detailKeys
        .map((detailKey) => cleanUnknown(record[detailKey]))
        .filter((value) => value && !isLowSignalText(value))
        .join(" ");
      const meta = metaKeys
        .map((metaKey) => cleanUnknown(record[metaKey]))
        .filter(Boolean)
        .join(" / ");
      return { title, detail: detail || undefined, meta: meta || undefined };
    });

  return items.filter((item): item is StrategicReportItem => item !== null);
}

function strategicMoneyImpact(packet: ClientProjectIntelligencePacket): string {
  const summary = cleanUnknown(asRecord(strategicReport(packet).moneyImpact).summary);
  return summary && !isLowSignalText(summary) ? summary : "";
}

function strategicRecommendedActions(packet: ClientProjectIntelligencePacket): StrategicReportItem[] {
  return strategicItems(packet, "recommendedActions", ["reason"], ["priority"]);
}

function packetEvidence(packet: ClientProjectIntelligencePacket): InsightCardEvidence[] {
  return packet.cards.flatMap((card) => card.evidence);
}

function evidenceSearchText(evidence: InsightCardEvidence): string {
  return [
    evidence.sourceType,
    evidence.sourceCategory,
    evidence.sourceTitle,
    evidence.relevanceReason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function evidenceCategoryLabel(evidence: InsightCardEvidence): string {
  return formatLabel(evidence.sourceCategory || evidence.sourceType);
}

function sourceHref(projectId: number, evidence: InsightCardEvidence): string | null {
  if (!evidence.sourceDocumentId) return null;
  return `/${projectId}/intelligence/sources/${encodeURIComponent(evidence.sourceDocumentId)}`;
}

function sourceLabel(evidence: InsightCardEvidence): string {
  return [evidence.sourceTitle || "Untitled source", evidenceCategoryLabel(evidence)]
    .filter(Boolean)
    .join(" - ");
}

function cardPriority(card: InsightCard): number {
  return CARD_PRIORITY[card.cardType] ?? 20;
}

function sortedCards(cards: InsightCard[]): InsightCard[] {
  return [...cards].sort(
    (a, b) => cardPriority(a) - cardPriority(b) || (a.rank ?? 99) - (b.rank ?? 99),
  );
}

function cardPrimaryText(card: InsightCard): string {
  return firstStrategicText(
    card.summary,
    card.whyItMatters,
    card.nextAction,
    card.currentStatus,
  );
}

function findCardsByTypes(cards: InsightCard[], types: string[], limit: number): InsightCard[] {
  return sortedCards(cards)
    .filter((card) => types.includes(card.cardType) && cardPrimaryText(card))
    .slice(0, limit);
}

function confidenceVariant(value: string | null | undefined): "success" | "warning" | "error" | "neutral" {
  if (value === "high") return "success";
  if (value === "medium") return "warning";
  if (value === "low") return "error";
  return "neutral";
}

function freshnessText(packet: ClientProjectIntelligencePacket): string {
  const generated = formatDate(packet.generatedAt);
  if (packet.freshnessStatus === "fresh") return `Updated ${generated}`;
  return `${formatLabel(packet.freshnessStatus)} as of ${generated}`;
}

function latestEvidence(packet: ClientProjectIntelligencePacket, limit = 4): InsightCardEvidence[] {
  return [...packetEvidence(packet)]
    .sort((a, b) => (b.sourceOccurredAt ?? "").localeCompare(a.sourceOccurredAt ?? ""))
    .slice(0, limit);
}

function latestCardEvidence(card: InsightCard): InsightCardEvidence | null {
  return [...card.evidence].sort(
    (a, b) => (b.sourceOccurredAt ?? "").localeCompare(a.sourceOccurredAt ?? ""),
  )[0] ?? null;
}

function getMetadataString(card: InsightCard, keys: string[]): string | null {
  for (const key of keys) {
    const value = card.metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function sourceLanes(packet: ClientProjectIntelligencePacket): SourceLane[] {
  const evidence = packetEvidence(packet);
  return SOURCE_LANE_DEFS.map((definition) => {
    const laneEvidence = evidence.filter((item) => {
      const searchText = evidenceSearchText(item);
      return definition.match.some((match) => searchText.includes(match));
    });
    const laneEvidenceIds = new Set(laneEvidence.map((item) => item.id));
    const laneCards = sortedCards(packet.cards).filter((card) =>
      card.evidence.some((item) => laneEvidenceIds.has(item.id)),
    );

    return {
      id: definition.id,
      label: definition.label,
      description: definition.description,
      icon: definition.icon,
      evidence: laneEvidence,
      cards: laneCards,
    };
  });
}

function sourceCoverageRows(packet: ClientProjectIntelligencePacket): Array<{
  label: string;
  count: number;
  latestAt: string | null;
}> {
  const evidence = packetEvidence(packet);
  return Array.from(
    evidence.reduce((counts, item) => {
      const label = evidenceCategoryLabel(item);
      const current = counts.get(label) ?? { label, count: 0, latestAt: null as string | null };
      current.count += 1;
      if (item.sourceOccurredAt && (!current.latestAt || item.sourceOccurredAt > current.latestAt)) {
        current.latestAt = item.sourceOccurredAt;
      }
      counts.set(label, current);
      return counts;
    }, new Map<string, { label: string; count: number; latestAt: string | null }>()),
  )
    .map(([, row]) => row)
    .sort((a, b) => b.count - a.count);
}

function reviewPreviewCards(packet: ClientProjectIntelligencePacket): InsightCard[] {
  return sortedCards(packet.cards).slice(0, 24);
}

function qualityWarnings(packet: ClientProjectIntelligencePacket): string[] {
  const warnings = new Set<string>();

  const lowSignalCards = packet.cards.filter((card) =>
    !firstStrategicText(card.summary, card.currentStatus, card.whyItMatters, card.nextAction)
  );

  if (lowSignalCards.length > 0 && !hasStrategicReport(packet)) {
    warnings.add(`${lowSignalCards.length} cards contain raw source text or metadata instead of usable synthesis.`);
  }

  const qualityGate = asRecord(packet.sourceCoverage.qualityGate);
  if (qualityGate.status && qualityGate.status !== "passed") {
    warnings.add(cleanUnknown(qualityGate.reason) || "The packet source quality gate did not pass.");
  }

  if (packet.isStale) {
    warnings.add("The packet is older than the expected refresh window.");
  }

  if (packetEvidence(packet).length === 0) {
    warnings.add("No linked citations are attached to the current packet.");
  }

  return Array.from(warnings).slice(0, 5);
}

function evidenceLimitations(packet: ClientProjectIntelligencePacket): string[] {
  const gaps = packet.sourceCoverage.gaps?.filter((gap): gap is string => typeof gap === "string") ?? [];
  return gaps.map(cleanText).filter(Boolean).slice(0, 5);
}

function briefingStatus(packet: ClientProjectIntelligencePacket): {
  title: string;
  body: string;
} {
  const cleanRead = firstStrategicText(
    packet.executiveSummary,
    packet.currentStatus,
    packet.strategicRead,
    packet.whyItMatters,
  );
  const warnings = qualityWarnings(packet);

  if (!cleanRead) {
    return {
      title: "Daily intelligence could not produce a usable strategic read.",
      body:
        "The page found source-backed signals, but the current packet did not produce a synthesized operating read. This should be refreshed before a human or AI agent treats it as an operating report.",
    };
  }

  if (warnings.length > 0) {
    return {
      title: "Daily intelligence failed source-quality checks.",
      body:
        "The page found source-backed signals, but the current packet has a stale, uncited, or failed quality-gate condition. The evidence limits below are separate from this failure state.",
    };
  }

  return {
    title: "Daily project intelligence, synthesized from the sources that changed the job.",
    body: summarizeText(firstStrategicText(packet.currentStatus, packet.strategicRead, cleanRead), 520),
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
      title="No daily intelligence briefing yet"
      description={`${project.name ?? `Project ${project.id}`} cannot show a strategic briefing until the intelligence pipeline has a current packet. ${reason}`}
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/ai-assistant">Open assistant</Link>
        </Button>
      }
    />
  );
}

function BriefingHeader({
  project,
  packet,
}: {
  project: ProjectRow;
  packet: ClientProjectIntelligencePacket;
}) {
  const evidence = packetEvidence(packet);
  const lanes = sourceLanes(packet).filter((lane) => lane.evidence.length > 0);
  const warnings = qualityWarnings(packet);
  const limitations = evidenceLimitations(packet);
  const briefing = briefingStatus(packet);
  const stats = [
    { label: "Signals", value: packet.cards.length.toString() },
    { label: "Citations", value: evidence.length.toString() },
    { label: "Source lanes", value: lanes.length.toString() },
    { label: "Review queue", value: packet.reviewQueueCount.toString() },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={formatLabel(packet.freshnessStatus)} variant={packet.isStale ? "warning" : "success"} />
            <StatusBadge
              status={`${formatLabel(packet.confidenceSummary.overall)} confidence`}
              variant={confidenceVariant(packet.confidenceSummary.overall)}
            />
            <Badge variant="outline">{freshnessText(packet)}</Badge>
          </div>
          <div className="max-w-4xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Daily strategy briefing
            </p>
            <Heading level={3} as="h2" className="leading-tight">
              {briefing.title}
            </Heading>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              {briefing.body}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-muted/35 p-6">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Trust check</p>
            <p className="text-sm leading-6 text-muted-foreground">
              The page should expose weak source coverage before an agent treats the report as truth.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {stats.map((item) => (
              <div key={item.label} className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="text-2xl font-semibold tabular-nums text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
          {warnings.length > 0 ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                Source quality failure
              </div>
              <ul className="space-y-2">
                {warnings.slice(0, 3).map((warning) => (
                  <li key={warning} className="text-sm leading-6 text-muted-foreground">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {limitations.length > 0 ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-status-warning" />
                Evidence limitations
              </div>
              <ul className="space-y-2">
                {limitations.slice(0, 3).map((limitation) => (
                  <li key={limitation} className="text-sm leading-6 text-muted-foreground">
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StrategicRead({
  packet,
}: {
  packet: ClientProjectIntelligencePacket;
}) {
  const reportChanged = strategicItems(packet, "whatChanged", ["impact"]);
  const reportRisks = strategicItems(packet, "risks", ["recommendedAction"], ["severity"]);
  const reportDecisions = strategicItems(packet, "openDecisions", ["owner", "neededBy"]);
  const reportMoneyImpact = strategicMoneyImpact(packet);
  const reportActions = strategicRecommendedActions(packet);
  const riskCards = findCardsByTypes(packet.cards, ["blocker", "risk", "open_question", "schedule_risk"], 3);
  const decisionCards = findCardsByTypes(packet.cards, ["decision", "change_management", "requirement", "financial_exposure"], 3);
  const statusCards = findCardsByTypes(packet.cards, ["project_update", "sentiment", "task"], 3);
  const strategicRead = firstStrategicText(packet.strategicRead, packet.whyItMatters, packet.currentStatus);
  const nextMoves = (reportActions.length > 0 ? reportActions.map((item) => item.title) : packet.recommendedNextMoves)
    .map((move) => cleanText(move))
    .filter((move) => move && !isLowSignalText(move))
    .slice(0, 5);

  const columns = [
    {
      label: "Pattern",
      title: "What the sources are saying together",
      text: reportChanged.length > 0
        ? summarizeText(reportChanged.map((item) => `${item.title}: ${item.detail ?? ""}`.trim()).join(" "), 520)
        : summarizeText(strategicRead || packet.executiveSummary, 420),
      cards: statusCards,
      items: reportChanged,
      icon: Brain,
    },
    {
      label: "Risk",
      title: "What can hurt the job",
      text: reportRisks.length > 0
        ? summarizeText(reportRisks.map((item) => `${item.title}: ${item.detail ?? ""}`.trim()).join(" "), 520)
        : riskCards[0] ? summarizeText(cardPrimaryText(riskCards[0]), 360) : "No clean risk synthesis has been compiled yet.",
      cards: riskCards,
      items: reportRisks,
      icon: AlertTriangle,
    },
    {
      label: "Decision",
      title: "Where leadership attention belongs",
      text: reportDecisions.length > 0
        ? summarizeText(reportDecisions.map((item) => `${item.title}${item.detail ? `: ${item.detail}` : ""}`).join(" "), 520)
        : decisionCards[0] ? summarizeText(cardPrimaryText(decisionCards[0]), 360) : "No decision narrative has been compiled yet.",
      cards: decisionCards,
      items: reportDecisions,
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Strategic analysis
          </p>
          <Heading level={4} as="h2">
            The report an AI strategist should hand you every morning
          </Heading>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;
          return (
            <article key={column.label} className="space-y-4 border-t border-border/70 pt-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {column.label}
                  </p>
                  <Heading level={6} as="h3" className="leading-6">
                    {column.title}
                  </Heading>
                </div>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{column.text}</p>
              {column.items.length > 0 ? (
                <div className="space-y-3">
                  {column.items.slice(0, 3).map((item) => (
                    <div key={`${column.label}-${item.title}`} className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      {item.detail ? (
                        <p className="text-xs leading-5 text-muted-foreground">{summarizeText(item.detail, 220)}</p>
                      ) : null}
                      {item.meta ? (
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {item.meta}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {column.cards.length > 0 ? (
                <div className="space-y-3">
                  {column.cards.slice(0, 2).map((card) => (
                    <div key={card.id} className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{card.title}</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {card.evidence.length} citation{card.evidence.length === 1 ? "" : "s"} / {formatLabel(card.confidence)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      {reportMoneyImpact ? (
        <div className="space-y-2 border-t border-border/70 pt-5">
          <p className="text-sm font-semibold text-foreground">Money impact</p>
          <p className="max-w-4xl text-sm leading-7 text-muted-foreground">{reportMoneyImpact}</p>
        </div>
      ) : null}
      {nextMoves.length > 0 ? (
        <div className="space-y-3 rounded-lg bg-muted/30 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Heading level={6} as="h3">
              Recommended focus
            </Heading>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {nextMoves.map((move) => (
              <div key={move} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <span>{summarizeText(move, 220)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ActionRegister({
  packet,
  projectId,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
}) {
  const reportActions = strategicRecommendedActions(packet);
  const actionCards = sortedCards(packet.cards)
    .filter((card) => {
      const text = cardPrimaryText(card);
      return text && ["blocker", "risk", "open_question", "financial_exposure", "change_management", "schedule_risk", "decision", "requirement", "task"].includes(card.cardType);
    })
    .slice(0, 10);

  if (reportActions.length === 0 && actionCards.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Action register
          </p>
          <Heading level={4} as="h2">
            What the briefing thinks needs follow-through
          </Heading>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/${projectId}/tasks`}>Open task page</Link>
        </Button>
      </div>
      {reportActions.length > 0 ? (
        <div className="divide-y divide-border/70">
          {reportActions.map((action) => (
            <article key={action.title} className="grid gap-4 py-5 lg:grid-cols-[11rem_minmax(0,1fr)]">
              <div className="space-y-2">
                <StatusBadge status={formatLabel(action.meta || "recommended")} variant="warning" />
              </div>
              <div className="min-w-0 space-y-2">
                <Heading level={6} as="h3" className="text-sm leading-6">
                  {action.title}
                </Heading>
                {action.detail ? (
                  <p className="text-sm leading-7 text-muted-foreground">{summarizeText(action.detail, 360)}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {reportActions.length > 0 ? null : (
      <div className="divide-y divide-border/70">
        {actionCards.map((card) => {
          const primaryEvidence = latestCardEvidence(card);
          const href = primaryEvidence ? sourceHref(projectId, primaryEvidence) : null;
          const owner = getMetadataString(card, ["owner", "assignee", "assigned_to", "responsible_party"]);
          const due = getMetadataString(card, ["due_date", "target_date", "needed_by"]);
          const primaryText = summarizeText(cardPrimaryText(card), 300);

          return (
            <article key={card.id} className="grid gap-4 py-5 lg:grid-cols-[11rem_minmax(0,1fr)_15rem]">
              <div className="space-y-2">
                <StatusBadge status={formatLabel(card.cardType)} variant={confidenceVariant(card.confidence)} />
                <p className="text-xs font-medium text-muted-foreground">{formatLabel(card.confidence)} confidence</p>
              </div>
              <div className="min-w-0 space-y-2">
                <Heading level={6} as="h3" className="text-sm leading-6">
                  {card.title}
                </Heading>
                <p className="text-sm leading-7 text-muted-foreground">{primaryText}</p>
                {primaryEvidence ? (
                  href ? (
                    <Link
                      href={href}
                      className="inline-flex max-w-full items-center gap-2 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      <Search className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{sourceLabel(primaryEvidence)}</span>
                    </Link>
                  ) : (
                    <p className="truncate text-xs font-medium text-foreground">{sourceLabel(primaryEvidence)}</p>
                  )
                ) : null}
              </div>
              <div className="space-y-2 text-xs text-muted-foreground lg:text-right">
                <p>{owner ? `Owner: ${owner}` : "Owner not assigned"}</p>
                <p>{due ? `Due: ${due}` : primaryEvidence?.sourceOccurredAt ? `Signal date: ${formatDate(primaryEvidence.sourceOccurredAt)}` : "No source date"}</p>
                <p>{card.evidence.length} citation{card.evidence.length === 1 ? "" : "s"}</p>
              </div>
            </article>
          );
        })}
      </div>
      )}
    </section>
  );
}

function SourceIntelligence({
  packet,
  project,
  projectId,
}: {
  packet: ClientProjectIntelligencePacket;
  project: ProjectRow;
  projectId: number;
}) {
  const lanes = sourceLanes(packet);
  const projectFacts = [
    ["Project number", project.project_number || "Not set"],
    ["Phase", formatLabel(project.phase)],
    ["Stage", formatLabel(project.stage)],
    ["Budget", formatCurrency(project.budget)],
    ["Direct costs", formatCurrency(project.budget_used)],
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Source synthesis
        </p>
        <Heading level={4} as="h2">
          Where the report is drawing its intelligence from
        </Heading>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4 md:grid-cols-2">
          {lanes.map((lane) => {
            const Icon = lane.icon;
            const topCard = lane.cards.find((card) => cardPrimaryText(card));
            const latest = [...lane.evidence].sort(
              (a, b) => (b.sourceOccurredAt ?? "").localeCompare(a.sourceOccurredAt ?? ""),
            )[0];

            return (
              <article key={lane.id} className="space-y-4 rounded-lg bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <Heading level={6} as="h3" className="text-sm">
                        {lane.label}
                      </Heading>
                      <p className="text-xs leading-5 text-muted-foreground">{lane.description}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                    {lane.evidence.length}
                  </span>
                </div>
                {topCard ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-6 text-foreground">{topCard.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {summarizeText(cardPrimaryText(topCard), 240)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    No clean synthesis has been promoted from this source lane yet.
                  </p>
                )}
                {latest ? (
                  <div className="border-t border-border/60 pt-3">
                    {sourceHref(projectId, latest) ? (
                      <Link
                        href={sourceHref(projectId, latest) ?? ""}
                        className="inline-flex max-w-full items-center gap-2 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{sourceLabel(latest)}</span>
                      </Link>
                    ) : (
                      <p className="inline-flex max-w-full items-center gap-2 text-xs font-medium text-foreground">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{sourceLabel(latest)}</span>
                      </p>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        <aside className="space-y-4 rounded-lg bg-muted/30 p-6">
          <div className="space-y-1">
            <Heading level={6} as="h3" className="text-sm">
              Supabase project context
            </Heading>
            <p className="text-sm leading-6 text-muted-foreground">
              Structured project data should anchor the narrative so agents do not rely on RAG alone.
            </p>
          </div>
          <dl className="space-y-3">
            {projectFacts.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7rem_1fr] gap-4 text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 truncate font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}

function EvidenceDiagnostics({
  packet,
  projectId,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
}) {
  const rows = sourceCoverageRows(packet).slice(0, 10);
  const latestSources = latestEvidence(packet, 5);
  const warnings = qualityWarnings(packet);
  const limitations = evidenceLimitations(packet);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Evidence and diagnostics
        </p>
        <Heading level={4} as="h2">
          Audit trail for humans and agents
        </Heading>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div key={row.label} className="space-y-1 border-t border-border/70 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </p>
                <p className="text-lg font-semibold tabular-nums text-foreground">{row.count} cited</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.latestAt ? formatDate(row.latestAt) : "No source date"}
                </p>
              </div>
            ))}
          </div>
          <details className="group border-t border-border/70 pt-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground marker:hidden">
              Packet card detail
              <span className="text-xs font-medium text-muted-foreground group-open:hidden">
                Show top {reviewPreviewCards(packet).length} cards
              </span>
              <span className="hidden text-xs font-medium text-muted-foreground group-open:inline">
                Hide card detail
              </span>
            </summary>
            <div className="mt-6 space-y-10">
              <InsightCardShowcase cards={reviewPreviewCards(packet)} projectId={projectId} />
            </div>
          </details>
        </div>
        <aside className="space-y-5 rounded-lg bg-muted/30 p-6">
          <div className="space-y-1">
            <Heading level={6} as="h3" className="text-sm">
              Latest cited sources
            </Heading>
            <p className="text-sm leading-6 text-muted-foreground">
              These are the quickest places to inspect when the strategy read feels wrong.
            </p>
          </div>
          <div className="space-y-3">
            {latestSources.map((source) => (
              <div key={source.id} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {evidenceCategoryLabel(source)}
                </p>
                <p className="truncate text-sm font-medium text-foreground">{source.sourceTitle ?? "Untitled source"}</p>
                <p className="text-xs text-muted-foreground">{formatDate(source.sourceOccurredAt)}</p>
              </div>
            ))}
          </div>
          {warnings.length > 0 ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <Heading level={6} as="h3" className="text-sm">
                What could fail
              </Heading>
              <ul className="space-y-2">
                {warnings.map((warning) => (
                  <li key={warning} className="text-sm leading-6 text-muted-foreground">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {limitations.length > 0 ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <Heading level={6} as="h3" className="text-sm">
                Evidence limitations
              </Heading>
              <ul className="space-y-2">
                {limitations.map((limitation) => (
                  <li key={limitation} className="text-sm leading-6 text-muted-foreground">
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
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
    .select("id, name, project_number, budget, budget_used, phase, stage, created_at, summary, work_scope")
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
        <Button asChild size="sm" variant="default">
          <Link href="/ai-assistant">Ask Alleato AI</Link>
        </Button>
      }
      contentClassName="space-y-12"
    >
      {!target ? (
        <IntelligenceEmptyState
          project={project}
          reason="Create an intelligence target before the daily report can compile source-backed analysis."
        />
      ) : packetLoadError ? (
        <EmptyState
          title="Daily intelligence briefing could not load"
          description={`The current packet failed to load: ${packetLoadError}`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/intelligence-compiler">Open compiler health</Link>
            </Button>
          }
        />
      ) : !packet ? (
        <IntelligenceEmptyState
          project={project}
          reason="The target exists, but no current packet has been generated yet."
        />
      ) : (
        <>
          <BriefingHeader project={project} packet={packet} />
          <StrategicRead packet={packet} />
          <ActionRegister packet={packet} projectId={numericProjectId} />
          <SourceIntelligence packet={packet} project={project} projectId={numericProjectId} />
          <EvidenceDiagnostics packet={packet} projectId={numericProjectId} />
        </>
      )}
    </PageShell>
  );
}
