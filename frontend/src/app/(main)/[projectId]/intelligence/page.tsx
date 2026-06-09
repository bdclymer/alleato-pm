export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { Button, EmptyState, Heading } from "@/components/ds";
import { Timeline, type TimelineItem } from "@/components/ds/timeline";
import { InsightCardShowcase } from "@/components/ai-intelligence/insight-card-showcase";
import {
  SourceReferenceButton,
  type SourceReferenceRecord,
} from "@/components/ai-intelligence/source-reference-button";
import { PageShell } from "@/components/layout";
import { buildIntelligencePageState } from "@/lib/ai/intelligence/page-state";
import {
  loadCurrentIntelligencePacket,
  resolveIntelligenceTarget,
} from "@/lib/ai/intelligence/packet-service";
import type {
  ClientProjectIntelligencePacket,
  InsightCard,
  InsightCardEvidence,
} from "@/lib/ai/intelligence/types";
import {
  createRagServiceClient,
  createServiceClient,
  isRagDatabaseReadsEnabled,
} from "@/lib/supabase/service";
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
  | "summary"
  | "work_scope"
>;

type RecentSourceRow = Pick<
  Database["public"]["Tables"]["document_metadata"]["Row"],
  | "id"
  | "title"
  | "summary"
  | "overview"
  | "description"
  | "notes"
  | "type"
  | "category"
  | "source_system"
  | "source"
  | "created_at"
  | "date"
>;

type SourceDocumentRow = Pick<
  Database["public"]["Tables"]["document_metadata"]["Row"],
  | "id"
  | "title"
  | "type"
  | "category"
  | "source"
  | "source_system"
  | "date"
  | "created_at"
  | "summary"
  | "overview"
  | "description"
  | "notes"
  | "content"
  | "raw_text"
  | "source_web_url"
  | "fireflies_link"
  | "meeting_link"
  | "url"
  | "participants"
  | "participants_array"
  | "source_metadata"
>;

type RagSourceDocumentRow = Pick<
  import("@/types/rag-database.types").Database["public"]["Tables"]["rag_document_metadata"]["Row"],
  | "id"
  | "title"
  | "type"
  | "category"
  | "source"
  | "source_system"
  | "summary"
  | "overview"
  | "content"
  | "raw_text"
  | "source_web_url"
  | "url"
>;

type OutlookAttachmentLinkRow = Pick<
  Database["public"]["Tables"]["outlook_email_intake_attachments"]["Row"],
  | "document_metadata_id"
  | "email_attachment_id"
  | "content_type"
  | "file_name"
>;

type StrategicItem = {
  title: string;
  detail?: string;
  meta?: string;
  sourceIds: string[];
  occurredAt?: string;
  fields: Record<string, string>;
};

type StatusTone = "healthy" | "watch" | "risk";

type Indicator = {
  label: string;
  value: string;
  tone: StatusTone;
};

const CARD_PRIORITY: Record<string, number> = {
  blocker: 0,
  risk: 1,
  schedule_risk: 2,
  financial_exposure: 3,
  open_question: 4,
  decision: 5,
  change_management: 6,
  requirement: 7,
  task: 8,
  project_update: 9,
  sentiment: 10,
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

function summarizeText(value: string | null | undefined, maxLength = 260): string {
  const text = cleanText(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSentence = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("?"),
    truncated.lastIndexOf("!"),
  );
  if (lastSentence > 120) return truncated.slice(0, lastSentence + 1);
  return `${truncated.trim()}...`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function cleanUnknown(value: unknown): string {
  return cleanText(typeof value === "string" || typeof value === "number" ? String(value) : "");
}

function strategicReport(packet: ClientProjectIntelligencePacket): Record<string, unknown> {
  return asRecord(asRecord(packet.packetJson).strategicReport);
}

function summaryRecord(packet: ClientProjectIntelligencePacket): Record<string, unknown> {
  return asRecord(asRecord(packet.packetJson).summary);
}

function sourceAliases(index: number): string[] {
  return [`S${String(index).padStart(3, "0")}`, `S${String(index).padStart(2, "0")}`, `S${index}`];
}

function packetSourceAliasMap(packet: ClientProjectIntelligencePacket): Map<string, string> {
  const sourceSet = asRecord(asRecord(packet.packetJson).sourceSet);
  const sources = Array.isArray(sourceSet.sources) ? sourceSet.sources : [];
  const map = new Map<string, string>();

  sources.forEach((source, index) => {
    const record = asRecord(source);
    const sourceId = cleanUnknown(record.id);
    if (!sourceId) return;
    sourceAliases(index + 1).forEach((alias) => map.set(alias, sourceId));
    map.set(sourceId, sourceId);
  });

  return map;
}

function citedSourceIds(record: Record<string, unknown>): string[] {
  return (Array.isArray(record.sourceIds) ? record.sourceIds : [])
    .map((value) => cleanUnknown(value))
    .filter(Boolean);
}

function narrativeItemsFromUnknown(
  value: unknown,
  detailKeys: string[],
  metaKeys: string[] = [],
  fieldKeys: string[] = [],
): StrategicItem[] {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      const record = asRecord(item);
      const title = cleanUnknown(record.title);
      if (!title) return null;
      const detail = detailKeys
        .map((detailKey) => cleanUnknown(record[detailKey]))
        .filter(Boolean)
        .join(" ");
      const meta = metaKeys
        .map((metaKey) => cleanUnknown(record[metaKey]))
        .filter(Boolean)
        .join(" / ");
      const fields = Object.fromEntries(
        fieldKeys
          .map((fieldKey) => [fieldKey, cleanUnknown(record[fieldKey])])
          .filter((entry): entry is [string, string] => Boolean(entry[1])),
      );
      return {
        title,
        detail: detail || undefined,
        meta: meta || undefined,
        sourceIds: citedSourceIds(record),
        occurredAt: cleanUnknown(record.occurredAt || record.date) || undefined,
        fields,
      };
    })
    .filter((item): item is StrategicItem => Boolean(item));
}

function reportItems(
  packet: ClientProjectIntelligencePacket,
  key: string,
  detailKeys: string[],
  metaKeys: string[] = [],
  fieldKeys: string[] = [],
): StrategicItem[] {
  return narrativeItemsFromUnknown(
    strategicReport(packet)[key],
    detailKeys,
    metaKeys,
    fieldKeys,
  );
}

function summaryItems(
  packet: ClientProjectIntelligencePacket,
  key: string,
  detailKeys: string[],
  metaKeys: string[] = [],
  fieldKeys: string[] = [],
): StrategicItem[] {
  return narrativeItemsFromUnknown(
    summaryRecord(packet)[key],
    detailKeys,
    metaKeys,
    fieldKeys,
  );
}

function summaryObject(packet: ClientProjectIntelligencePacket, key: string): Record<string, unknown> {
  return asRecord(summaryRecord(packet)[key]);
}

function summaryText(packet: ClientProjectIntelligencePacket, key: string, fallbackKeys: string[] = []): string {
  const primary = cleanUnknown(summaryObject(packet, key).summary);
  if (primary) return primary;

  for (const fallbackKey of fallbackKeys) {
    const value = cleanUnknown(summaryObject(packet, fallbackKey).summary);
    if (value) return value;
  }

  return "";
}

function packetEvidence(packet: ClientProjectIntelligencePacket): InsightCardEvidence[] {
  return packet.cards.flatMap((card) => card.evidence);
}

function sortedCards(cards: InsightCard[]): InsightCard[] {
  return [...cards].sort(
    (a, b) => (CARD_PRIORITY[a.cardType] ?? 50) - (CARD_PRIORITY[b.cardType] ?? 50) || (a.rank ?? 99) - (b.rank ?? 99),
  );
}

function latestEvidence(packet: ClientProjectIntelligencePacket, limit = 8): InsightCardEvidence[] {
  return [...packetEvidence(packet)]
    .sort((a, b) => (b.sourceOccurredAt ?? "").localeCompare(a.sourceOccurredAt ?? ""))
    .slice(0, limit);
}

function sourceLabel(source: RecentSourceRow): string {
  return formatLabel(source.category || source.type || source.source_system || "document");
}

function sourceMomentText(source: RecentSourceRow): string {
  return summarizeText(
    source.summary || source.overview || source.description || source.notes || "",
    220,
  );
}

function sourceButtonLabel(source: SourceDocumentRow): string {
  const primary = cleanText(source.title);
  if (primary) {
    return primary.length > 44 ? `${primary.slice(0, 41).trim()}...` : primary;
  }

  return [formatLabel(source.category || source.type || "Source"), formatDate(source.date || source.created_at)]
    .filter(Boolean)
    .join(" ");
}

function sourceReferenceRecord(source: SourceDocumentRow, projectId: number): SourceReferenceRecord {
  const sourceMetadata = asRecord(source.source_metadata);
  const attachmentId =
    typeof sourceMetadata.email_attachment_id === "number"
      ? sourceMetadata.email_attachment_id
      : typeof sourceMetadata.email_attachment_id === "string"
        ? Number.parseInt(sourceMetadata.email_attachment_id, 10)
        : null;

  return {
    id: source.id,
    title: source.title,
    type: source.type,
    category: source.category,
    source: source.source,
    sourceSystem: source.source_system,
    date: source.date,
    createdAt: source.created_at,
    summary: source.summary,
    overview: source.overview,
    description: source.description,
    notes: source.notes,
    content: source.content,
    rawText: source.raw_text,
    sourceWebUrl: source.source_web_url,
    firefliesLink: source.fireflies_link,
    meetingLink: source.meeting_link,
    url: source.url,
    participants: source.participants_array?.length
      ? source.participants_array
      : source.participants
        ? source.participants
            .replace(/[{}"]/g, "")
            .split(/[,;|\n]+/)
            .map((participant) => participant.trim())
            .filter(Boolean)
        : [],
    attachmentDownloadUrl:
      typeof attachmentId === "number" && Number.isInteger(attachmentId)
        ? `/api/projects/${projectId}/email-attachments/${attachmentId}/download?disposition=inline`
        : null,
    attachmentContentType:
      typeof sourceMetadata.attachment_content_type === "string"
        ? sourceMetadata.attachment_content_type
        : null,
    attachmentFileName:
      typeof sourceMetadata.attachment_file_name === "string"
        ? sourceMetadata.attachment_file_name
        : source.title,
  };
}

function mergeSourceDocumentRows(
  source: SourceDocumentRow,
  ragSource?: RagSourceDocumentRow,
): SourceDocumentRow {
  if (!ragSource) return source;

  return {
    ...source,
    title: ragSource.title || source.title,
    type: ragSource.type || source.type,
    category: ragSource.category || source.category,
    source: ragSource.source || source.source,
    source_system: ragSource.source_system || source.source_system,
    summary: ragSource.summary || source.summary,
    overview: ragSource.overview || source.overview,
    content: ragSource.content || source.content,
    raw_text: ragSource.raw_text || source.raw_text,
    source_web_url: ragSource.source_web_url || source.source_web_url,
    url: ragSource.url || source.url,
  };
}

function normalizeText(value: string | null | undefined): string {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesText(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function sourceDocsForEvidence(
  evidence: InsightCardEvidence[],
  sourceDocumentMap: Map<string, SourceDocumentRow>,
): SourceDocumentRow[] {
  const seen = new Set<string>();
  const rows: SourceDocumentRow[] = [];

  for (const item of evidence) {
    if (!item.sourceDocumentId) continue;
    if (seen.has(item.sourceDocumentId)) continue;
    const row = sourceDocumentMap.get(item.sourceDocumentId);
    if (!row) continue;
    seen.add(item.sourceDocumentId);
    rows.push(row);
  }

  return rows;
}

function supportingSourcesForIds(
  packet: ClientProjectIntelligencePacket,
  sourceIds: string[],
  sourceDocumentMap: Map<string, SourceDocumentRow>,
): SourceDocumentRow[] {
  const aliasMap = packetSourceAliasMap(packet);
  const seen = new Set<string>();
  const rows: SourceDocumentRow[] = [];

  sourceIds.forEach((sourceId) => {
    const resolvedId = aliasMap.get(sourceId) ?? sourceId;
    if (!resolvedId || seen.has(resolvedId)) return;
    const row = sourceDocumentMap.get(resolvedId);
    if (!row) return;
    seen.add(resolvedId);
    rows.push(row);
  });

  return rows.slice(0, 3);
}

function supportingSourcesForItem(
  packet: ClientProjectIntelligencePacket,
  item: StrategicItem,
  candidateCards: InsightCard[],
  sourceDocumentMap: Map<string, SourceDocumentRow>,
): SourceDocumentRow[] {
  if (item.sourceIds.length > 0) {
    const citedRows = supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap);
    if (citedRows.length > 0) return citedRows;
  }

  const itemText = normalizeText([item.title, item.detail].filter(Boolean).join(" "));
  const matchingCards = candidateCards.filter((card) => {
    const cardText = normalizeText(
      [card.title, card.summary, card.whyItMatters, card.currentStatus, card.nextAction]
        .filter(Boolean)
        .join(" "),
    );
    return matchesText(itemText, cardText);
  });

  const fallbackCards = matchingCards.length > 0 ? matchingCards : candidateCards.slice(0, 2);
  return sourceDocsForEvidence(
    fallbackCards.flatMap((card) => card.evidence),
    sourceDocumentMap,
  ).slice(0, 3);
}

function SourceLinkRow({
  projectId,
  sources,
}: {
  projectId: number;
  sources: SourceDocumentRow[];
}) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
      {sources.map((source) => (
        <SourceReferenceButton
          key={source.id}
          projectId={projectId}
          source={sourceReferenceRecord(source, projectId)}
          buttonLabel={sourceButtonLabel(source)}
        />
      ))}
    </div>
  );
}

function toneClasses(tone: StatusTone): string {
  if (tone === "healthy") return "text-status-success";
  if (tone === "risk") return "text-destructive";
  return "text-status-warning";
}

function toneSurfaceClasses(tone: StatusTone): string {
  if (tone === "healthy") return "border-status-success/30 bg-status-success/5";
  if (tone === "risk") return "border-destructive/30 bg-destructive/5";
  return "border-status-warning/30 bg-status-warning/5";
}

function riskTone(severity: string | null | undefined): StatusTone {
  const value = (severity ?? "").toLowerCase();
  if (value === "critical" || value === "high") return "risk";
  if (value === "medium") return "watch";
  return "healthy";
}

function priorityTone(priority: string | null | undefined): StatusTone {
  return riskTone(priority);
}

function stageLabel(project: ProjectRow): string {
  return cleanText(project.stage || project.phase || project.summary || "Stage not available");
}

function packetIndicators(packet: ClientProjectIntelligencePacket): Indicator[] {
  const risks = summaryItems(packet, "risks", ["recommendedAction"], ["severity"], ["severity"]);
  const highestRisk = risks[0]?.fields.severity || "";
  const scheduleSummary = summaryText(packet, "scheduleAndProcurement");
  const budgetSummary = summaryText(packet, "financialPosition", ["moneyImpact"]);
  const overallConfidence = cleanUnknown(packet.confidenceSummary.overall);

  const scheduleTone =
    /delay|blocked|late|slip|hold/i.test(scheduleSummary) ? "risk" :
    /pending|watch|coordination|follow up/i.test(scheduleSummary) ? "watch" :
    "healthy";
  const budgetTone =
    /overrun|exposure|increase|unpriced|pending/i.test(budgetSummary) ? "watch" :
    /critical|severe/i.test(budgetSummary) ? "risk" :
    "healthy";
  const overallTone =
    packet.isStale || highestRisk === "critical" ? "risk" :
    overallConfidence === "high" ? "healthy" :
    "watch";

  return [
    { label: "Schedule", value: scheduleTone === "healthy" ? "On track" : scheduleTone === "watch" ? "Watch" : "At risk", tone: scheduleTone },
    { label: "Budget", value: budgetTone === "healthy" ? "Stable" : budgetTone === "watch" ? "Monitor" : "At risk", tone: budgetTone },
    { label: "Risk", value: highestRisk ? formatLabel(highestRisk) : "Low", tone: riskTone(highestRisk) },
    { label: "Overall", value: overallTone === "healthy" ? "Healthy" : overallTone === "watch" ? "Watch" : "Needs attention", tone: overallTone },
  ];
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
      title="No project intelligence brief yet"
      description={`${project.name ?? `Project ${project.id}`} cannot show a living project intelligence brief until the pipeline has a current packet. ${reason}`}
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/ai-assistant">Open assistant</Link>
        </Button>
      }
    />
  );
}

function OverviewStrip({
  packet,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const executiveRead = summarizeText(
    cleanUnknown(summaryRecord(packet).currentExecutiveRead) ||
      packet.currentStatus ||
      packet.strategicRead ||
      packet.executiveSummary,
    520,
  );
  const immediateAttention = [
    ...summaryItems(packet, "immediateAttention", ["detail"], ["priority"], ["priority", "detail"]),
    ...summaryItems(packet, "recommendedActions", ["reason"], ["priority"], ["priority"]),
    ...summaryItems(packet, "openDecisions", ["owner", "neededBy"], [], ["owner", "neededBy"]),
  ].slice(0, 5);
  const indicators = packetIndicators(packet);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 rounded-2xl border border-border/70 bg-muted/20 p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Executive snapshot
            </p>
            <Heading level={3} as="h2" className="text-2xl">
              What is happening right now
            </Heading>
          </div>
          <p className="max-w-4xl text-sm leading-7 text-muted-foreground">{executiveRead}</p>
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {indicators.map((indicator) => (
              <div
                key={indicator.label}
                className={`space-y-1 rounded-xl border px-4 py-3 ${toneSurfaceClasses(indicator.tone)}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {indicator.label}
                </p>
                <p className={`text-sm font-medium ${toneClasses(indicator.tone)}`}>{indicator.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Immediate attention required
            </p>
            <div className="space-y-3">
              {immediateAttention.length > 0 ? (
                immediateAttention.map((item) => (
                  <div key={item.title} className="space-y-1.5 border-t border-border/60 pt-3 first:border-t-0 first:pt-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.detail ? (
                      <p className="text-sm leading-6 text-muted-foreground">{summarizeText(item.detail, 180)}</p>
                    ) : null}
                    <SourceLinkRow
                      projectId={projectId}
                      sources={supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap)}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  No executive attention list was synthesized into the current packet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CurrentFocus({
  packet,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const focusItems = [
    ...summaryItems(packet, "currentFocus", ["summary"], ["status", "owner"], ["status", "owner", "nextDecision", "riskSeverity", "summary"]),
    ...summaryItems(packet, "recommendedActions", ["reason"], ["priority"], ["priority", "reason"]),
    ...summaryItems(packet, "whatChanged", ["impact"], [], ["impact"]),
  ].slice(0, 5);

  if (focusItems.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Current focus
        </p>
        <Heading level={5} as="h2" className="text-lg">
          What deserves active management right now
        </Heading>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {focusItems.map((item) => (
          <article key={item.title} className="space-y-4 rounded-2xl border border-border/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Heading level={6} as="h3" className="text-sm leading-5">
                  {item.title}
                </Heading>
                {item.fields.priority || item.fields.riskSeverity || item.fields.status ? (
                  <p className={`text-xs font-medium ${toneClasses(priorityTone(item.fields.priority || item.fields.riskSeverity))}`}>
                    {formatLabel(item.fields.priority || item.fields.riskSeverity || item.fields.status)}
                  </p>
                ) : null}
              </div>
              {item.fields.owner ? (
                <p className="text-xs text-muted-foreground">{item.fields.owner}</p>
              ) : null}
            </div>
            {item.detail ? (
              <p className="text-sm leading-6 text-muted-foreground">{summarizeText(item.detail, 220)}</p>
            ) : null}
            {item.fields.status || item.fields.nextDecision ? (
              <div className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-2">
                {item.fields.status ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                    <p className="text-sm text-foreground">{item.fields.status}</p>
                  </div>
                ) : null}
                {item.fields.nextDecision ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next Decision</p>
                    <p className="text-sm text-foreground">{item.fields.nextDecision}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <SourceLinkRow
              projectId={projectId}
              sources={supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function CriticalRisks({
  packet,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const risks = summaryItems(
    packet,
    "risks",
    ["recommendedAction"],
    ["severity"],
    ["severity", "recommendedAction"],
  ).slice(0, 6);

  if (risks.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Critical risks
        </p>
        <Heading level={5} as="h2" className="text-lg">
          What could hurt the project
        </Heading>
      </div>
      <div className="space-y-3">
        {risks.map((item) => (
          <article
            key={item.title}
            className={`space-y-3 rounded-2xl border p-5 ${toneSurfaceClasses(riskTone(item.fields.severity))}`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${toneClasses(riskTone(item.fields.severity))}`} />
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${toneClasses(riskTone(item.fields.severity))}`}>
                {formatLabel(item.fields.severity || "medium")} risk
              </p>
            </div>
            <div className="space-y-1.5">
              <Heading level={6} as="h3" className="text-sm">
                {item.title}
              </Heading>
              {item.detail ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {summarizeText(item.detail, 220)}
                </p>
              ) : null}
            </div>
            <SourceLinkRow
              projectId={projectId}
              sources={supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function DecisionsNeeded({
  packet,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const decisions = summaryItems(
    packet,
    "openDecisions",
    [],
    [],
    ["owner", "neededBy"],
  ).slice(0, 8);

  if (decisions.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Decisions needed
        </p>
        <Heading level={5} as="h2" className="text-lg">
          Which approvals or calls are still open
        </Heading>
      </div>
      <div className="space-y-3">
        {decisions.map((item) => (
          <article key={item.title} className="grid gap-4 rounded-2xl border border-border/70 p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
            <div className="space-y-2">
              <Heading level={6} as="h3" className="text-sm">
                {item.title}
              </Heading>
              {item.detail ? (
                <p className="text-sm leading-6 text-muted-foreground">{summarizeText(item.detail, 220)}</p>
              ) : null}
              <SourceLinkRow
                projectId={projectId}
                sources={supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Owner</p>
                <p className="text-sm text-foreground">{item.fields.owner || "Not explicit"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Decision Due</p>
                <p className="text-sm text-foreground">{item.fields.neededBy || "No due date in source"}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExecutiveActions({
  packet,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const actions = summaryItems(
    packet,
    "recommendedActions",
    ["reason"],
    ["priority"],
    ["priority", "reason"],
  ).slice(0, 10);

  if (actions.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Action items
        </p>
        <Heading level={5} as="h2" className="text-lg">
          Executive-level follow-through
        </Heading>
      </div>
      <div className="space-y-3">
        {actions.map((item) => (
          <article key={item.title} className="grid gap-4 rounded-2xl border border-border/70 p-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${toneClasses(priorityTone(item.fields.priority))}`}>
                {formatLabel(item.fields.priority || "medium")}
              </p>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1.5">
              <Heading level={6} as="h3" className="text-sm">
                {item.title}
              </Heading>
              {item.detail ? (
                <p className="text-sm leading-6 text-muted-foreground">{summarizeText(item.detail, 220)}</p>
              ) : null}
              <SourceLinkRow
                projectId={projectId}
                sources={supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProjectTimelineSection({
  packet,
  recentSources,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  recentSources: RecentSourceRow[];
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const timelineEntries = summaryItems(
    packet,
    "timeline",
    ["significance"],
    [],
    ["significance"],
  );
  const fallbackEntries = summaryItems(
    packet,
    "whatChanged",
    ["impact"],
    [],
    ["impact"],
  );

  const items: TimelineItem[] = (timelineEntries.length > 0 ? timelineEntries : fallbackEntries)
    .slice(0, 12)
    .map((item, index) => ({
      id: `${item.title}-${index}`,
      title: item.title,
      description: summarizeText(item.detail, 240) || undefined,
      timestamp: formatDate(item.occurredAt),
      variant:
        item.meta?.toLowerCase().includes("critical") ? "destructive" :
        item.meta?.toLowerCase().includes("high") ? "warning" :
        "info",
    }));

  if (items.length === 0 && recentSources.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Project timeline
        </p>
        <Heading level={5} as="h2" className="text-lg">
          How the project got here
        </Heading>
      </div>
      {items.length > 0 ? (
        <div className="space-y-6">
          <Timeline items={items} />
          <div className="space-y-4">
            {(timelineEntries.length > 0 ? timelineEntries : fallbackEntries).slice(0, 8).map((item) => (
              <div key={item.title} className="space-y-1.5">
                <SourceLinkRow
                  projectId={projectId}
                  sources={supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border/70">
          {recentSources.slice(0, 8).map((source) => {
            const detail = sourceMomentText(source);
            const fullSource = sourceDocumentMap.get(source.id);

            return (
              <article key={source.id} className="grid gap-3 py-4 lg:grid-cols-[9rem_minmax(0,1fr)]">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {sourceLabel(source)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(source.date || source.created_at)}</p>
                </div>
                <div className="min-w-0 space-y-2">
                  <Heading level={6} as="h3" className="text-sm leading-5">
                    {source.title || "Untitled source"}
                  </Heading>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {detail || "Source landed without a useful summary."}
                  </p>
                  {fullSource ? <SourceLinkRow projectId={projectId} sources={[fullSource]} /> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EvidenceDrawer({
  packet,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const cards = sortedCards(packet.cards).slice(0, 12);

  if (cards.length === 0) return null;

  return (
    <details className="rounded-2xl border border-border/70 p-5">
      <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
        Evidence and detailed insight cards
      </summary>
      <div className="mt-5 space-y-3">
        {cards.map((card) => (
          <article key={card.id} className="space-y-2 border-t border-border/70 pt-3 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {formatLabel(card.cardType)}
              </p>
              <span className="text-xs text-muted-foreground">
                {card.evidence.length} citation{card.evidence.length === 1 ? "" : "s"}
              </span>
            </div>
            <Heading level={6} as="h3" className="text-sm leading-5">
              {card.title}
            </Heading>
            <p className="text-sm leading-6 text-muted-foreground">
              {summarizeText(card.summary || card.whyItMatters || card.currentStatus || card.nextAction, 320)}
            </p>
            <SourceLinkRow
              projectId={projectId}
              sources={sourceDocsForEvidence(card.evidence, sourceDocumentMap).slice(0, 3)}
            />
          </article>
        ))}
      </div>
    </details>
  );
}

function AuditTrail({
  packet,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const { warnings, limitations } = buildIntelligencePageState(packet);
  const latestSources = latestEvidence(packet, 6);
  const latestCitedSourceRows = sourceDocsForEvidence(latestSources, sourceDocumentMap);

  return (
    <details className="rounded-2xl border border-border/70 p-5">
      <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
        Audit trail and packet limits
      </summary>
      <div className="mt-5 space-y-5">
        {latestCitedSourceRows.length > 0 ? (
          <div className="space-y-2">
            <Heading level={6} as="h3" className="text-sm">
              Latest cited sources
            </Heading>
            <SourceLinkRow projectId={projectId} sources={latestCitedSourceRows} />
          </div>
        ) : null}
        <div className="space-y-2 border-t border-border/60 pt-4">
          <Heading level={6} as="h3" className="text-sm">
            Full synthesized card detail
          </Heading>
          <InsightCardShowcase cards={sortedCards(packet.cards).slice(0, 16)} projectId={projectId} />
        </div>
        {warnings.length > 0 ? (
          <div className="space-y-2 border-t border-border/60 pt-4">
            <Heading level={6} as="h3" className="text-sm">
              Warning
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
              Known limits
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
      </div>
    </details>
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
    .select("id, name, project_number, budget, budget_used, phase, stage, summary, work_scope")
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

  const recentSourcesResult = await supabase
    .from("document_metadata")
    .select("id, title, summary, overview, description, notes, type, category, source_system, source, created_at, date")
    .eq("project_id", numericProjectId)
    .order("created_at", { ascending: false })
    .limit(18);

  const recentSources = recentSourcesResult.data ?? [];
  const sourceIds = Array.from(
    new Set(
      [
        ...recentSources.map((source) => source.id),
        ...(packet ? packetEvidence(packet) : [])
          .map((evidence) => evidence.sourceDocumentId)
          .filter((value): value is string => Boolean(value)),
      ],
    ),
  );
  const ragSupabase = isRagDatabaseReadsEnabled() ? createRagServiceClient() : null;
  const sourceDocumentsResult = sourceIds.length
    ? await supabase
        .from("document_metadata")
        .select(
          "id, title, type, category, source, source_system, date, created_at, summary, overview, description, notes, content, raw_text, source_web_url, fireflies_link, meeting_link, url, participants, participants_array",
        )
        .in("id", sourceIds)
    : { data: [], error: null };
  const ragSourceDocumentsResult =
    ragSupabase && sourceIds.length
      ? await ragSupabase
          .from("rag_document_metadata")
          .select(
            "id, title, type, category, source, source_system, summary, overview, content, raw_text, source_web_url, url",
          )
          .in("id", sourceIds)
      : { data: [], error: null };
  const attachmentLinksResult = sourceIds.length
    ? await supabase
        .from("outlook_email_intake_attachments")
        .select("document_metadata_id, email_attachment_id, content_type, file_name")
        .in("document_metadata_id", sourceIds)
    : { data: [], error: null };
  const ragSourceMap = new Map(
    (((ragSourceDocumentsResult.data ?? []) as RagSourceDocumentRow[]) ?? []).map((source) => [
      source.id,
      source,
    ]),
  );
  const attachmentLinkMap = new Map(
    (((attachmentLinksResult.data ?? []) as OutlookAttachmentLinkRow[]) ?? [])
      .filter((row): row is OutlookAttachmentLinkRow & { document_metadata_id: string } => Boolean(row.document_metadata_id))
      .map((row) => [row.document_metadata_id, row]),
  );
  const sourceDocuments = ((sourceDocumentsResult.data ?? []) as SourceDocumentRow[]).map((source) =>
    (() => {
      const merged = mergeSourceDocumentRows(source, ragSourceMap.get(source.id));
      const attachmentLink = attachmentLinkMap.get(source.id);
      if (!attachmentLink) return merged;

      return {
        ...merged,
        source_metadata: {
          ...asRecord(merged.source_metadata),
          email_attachment_id: attachmentLink.email_attachment_id,
          attachment_content_type: attachmentLink.content_type,
          attachment_file_name: attachmentLink.file_name,
        },
      };
    })(),
  );
  const sourceDocumentMap = new Map(sourceDocuments.map((source) => [source.id, source]));

  return (
    <PageShell
      variant="dashboard"
      title={`${project.name ?? `Project ${project.id}`} Project Intelligence`}
      titleContent={
        <div className="space-y-2">
          <h1 className="text-[2rem] font-semibold leading-tight text-foreground">
            {project.name ?? `Project ${project.id}`} Project Intelligence
          </h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <p className="text-sm text-muted-foreground">{stageLabel(project)}</p>
            <p className="text-sm text-muted-foreground">
              {packet ? `Last updated ${formatDateTime(packet.generatedAt)}` : "Last updated not available"}
            </p>
          </div>
        </div>
      }
      actions={
        <Button asChild size="sm" variant="default">
          <Link href="/ai-assistant">Ask Alleato AI</Link>
        </Button>
      }
      contentClassName="space-y-8"
    >
      {!target ? (
        <IntelligenceEmptyState
          project={project}
          reason="Create an intelligence target before the living project brief can compile source-backed analysis."
        />
      ) : packetLoadError ? (
        <EmptyState
          title="Project intelligence brief could not load"
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
          <OverviewStrip
            packet={packet}
            projectId={numericProjectId}
            sourceDocumentMap={sourceDocumentMap}
          />
          <CurrentFocus
            packet={packet}
            projectId={numericProjectId}
            sourceDocumentMap={sourceDocumentMap}
          />
          <CriticalRisks
            packet={packet}
            projectId={numericProjectId}
            sourceDocumentMap={sourceDocumentMap}
          />
          <DecisionsNeeded
            packet={packet}
            projectId={numericProjectId}
            sourceDocumentMap={sourceDocumentMap}
          />
          <ExecutiveActions
            packet={packet}
            projectId={numericProjectId}
            sourceDocumentMap={sourceDocumentMap}
          />
          <ProjectTimelineSection
            packet={packet}
            recentSources={recentSources}
            projectId={numericProjectId}
            sourceDocumentMap={sourceDocumentMap}
          />
          <EvidenceDrawer packet={packet} projectId={numericProjectId} sourceDocumentMap={sourceDocumentMap} />
          <AuditTrail
            packet={packet}
            projectId={numericProjectId}
            sourceDocumentMap={sourceDocumentMap}
          />
        </>
      )}
    </PageShell>
  );
}
