export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, GitCommitHorizontal } from "lucide-react";

import { Button, EmptyState, Heading } from "@/components/ds";
import { KpiRow, type KpiBlockProps } from "@/components/ds/kpi";
import { Timeline, type TimelineItem } from "@/components/ds/timeline";
import { InsightCardShowcase } from "@/components/ai-intelligence/insight-card-showcase";
import {
  SourceReferenceButton,
  type SourceReferenceRecord,
} from "@/components/ai-intelligence/source-reference-button";
import { PageShell } from "@/components/layout";
import { DailyIngestionFeed } from "@/features/intelligence/daily-ingestion-feed";
import { buildIntelligencePageState } from "@/lib/ai/intelligence/page-state";
import {
  loadCurrentIntelligencePacket,
  loadProjectTimeline,
  resolveIntelligenceTarget,
  type ProjectTimelineEntry,
} from "@/lib/ai/intelligence/packet-service";
import type {
  ClientProjectIntelligencePacket,
  InsightCard,
  InsightCardEvidence,
} from "@/lib/ai/intelligence/types";
import {
  createOutlookIntakeServiceClient,
  createRagServiceClient,
  createServiceClient,
  isRagDatabaseReadsEnabled,
} from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

type ProjectRow = Pick<
  Database["public"]["Tables"]["projects"]["Row"],
  "id" | "name" | "project_number" | "budget" | "budget_used" | "phase" | "stage" | "summary" | "work_scope"
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
  "id" | "title" | "type" | "category" | "source" | "source_system" | "summary" | "overview" | "content" | "raw_text" | "source_web_url" | "url"
>;

type OutlookAttachmentLinkRow = Pick<
  Database["public"]["Tables"]["outlook_email_intake_attachments"]["Row"],
  "document_metadata_id" | "email_attachment_id" | "content_type" | "file_name"
>;

type StrategicItem = {
  title: string;
  detail?: string;
  sourceIds: string[];
  occurredAt?: string;
  fields: Record<string, string>;
};

type StatusTone = "healthy" | "watch" | "risk";

type ProjectCounts = {
  rfis: number;
  changeOrders: number;
  changeEvents: number;
  documents: number;
};

type OperatingSnapshotRow = {
  id: string;
  project_id: number;
  snapshot_at: string;
  source_delta_id: string | null;
  source_coverage: Record<string, unknown>;
  financial_snapshot: Record<string, unknown>;
  schedule_snapshot: Record<string, unknown>;
  database_counts: Record<string, unknown>;
  project_info: Record<string, unknown>;
  acumatica_sync_at: string | null;
  freshness: Record<string, unknown>;
  warnings: unknown[];
  confidence: "high" | "medium" | "low" | "unknown";
};

type ProjectCurrentStateRow = {
  project_id: number;
  current_summary: string | null;
  health_status: "on_track" | "watch" | "at_risk" | "critical" | "unknown";
  what_changed_since_last_update: unknown[];
  needs_attention: unknown[];
  open_decisions: unknown[];
  active_risks: unknown[];
  financial_read: string | null;
  schedule_read: string | null;
  field_read: string | null;
  source_confidence: Record<string, unknown>;
  last_delta_id: string | null;
  last_snapshot_id: string | null;
  updated_at: string;
};

type OperatingTimelineEventRow = {
  id: string;
  project_id: number;
  event_at: string;
  event_type: string;
  title: string;
  summary: string | null;
  why_it_matters: string | null;
  current_status: string;
  owner_label: string | null;
  priority: "urgent" | "high" | "medium" | "low";
  source_synthesis_id: string | null;
  source_document_id: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
};

type ChangeEventCandidateRow = {
  id: string;
  title: string;
  description: string | null;
  reason: string | null;
  potential_cost_impact: string | null;
  potential_schedule_impact: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
  missing_information: unknown[];
  status: string;
};

type ProjectReportSuggestionRow = {
  id: string;
  report_type: string;
  business_date: string | null;
  week_start_date: string | null;
  title: string;
  suggestion_payload: Record<string, unknown>;
  status: string;
  confidence: "high" | "medium" | "low" | "unknown";
};

type OperatingRecordState = {
  currentState: ProjectCurrentStateRow | null;
  latestSnapshot: OperatingSnapshotRow | null;
  timelineEvents: OperatingTimelineEventRow[];
  changeEventCandidates: ChangeEventCandidateRow[];
  reportSuggestions: ProjectReportSuggestionRow[];
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
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
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

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
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

function summarizeText(value: string | null | undefined, maxLength = 260): string {
  const text = cleanText(value);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSentence = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf("?"), truncated.lastIndexOf("!"));
  if (lastSentence > 120) return truncated.slice(0, lastSentence + 1);
  return `${truncated.trim()}...`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanUnknown(value: unknown): string {
  return cleanText(typeof value === "string" || typeof value === "number" ? String(value) : "");
}

function cleanUnknownList(value: unknown, max = 4): string[] {
  return asArray(value).map((item) => summarizeText(cleanUnknown(item) || cleanUnknown(asRecord(item).summary) || cleanUnknown(asRecord(item).title), 180)).filter(Boolean).slice(0, max);
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
  return (Array.isArray(record.sourceIds) ? record.sourceIds : []).map((value) => cleanUnknown(value)).filter(Boolean);
}

function narrativeItemsFromUnknown(
  value: unknown,
  detailKeys: string[],
  fieldKeys: string[] = [],
): StrategicItem[] {
  return (Array.isArray(value) ? value : [])
    .map((item): StrategicItem | null => {
      const record = asRecord(item);
      const title = cleanUnknown(record.title);
      if (!title) return null;
      const detail = detailKeys.map((detailKey) => cleanUnknown(record[detailKey])).filter(Boolean).join(" ");
      const fields = Object.fromEntries(
        fieldKeys
          .map((fieldKey) => [fieldKey, cleanUnknown(record[fieldKey])])
          .filter((entry): entry is [string, string] => Boolean(entry[1])),
      );
      return {
        title,
        detail: detail || undefined,
        sourceIds: citedSourceIds(record),
        occurredAt: cleanUnknown(record.occurredAt || record.date) || undefined,
        fields,
      };
    })
    .filter((item): item is StrategicItem => Boolean(item));
}

function summaryItems(
  packet: ClientProjectIntelligencePacket,
  key: string,
  detailKeys: string[],
  fieldKeys: string[] = [],
): StrategicItem[] {
  return narrativeItemsFromUnknown(summaryRecord(packet)[key], detailKeys, fieldKeys);
}

function summaryObject(packet: ClientProjectIntelligencePacket, key: string): Record<string, unknown> {
  return asRecord(summaryRecord(packet)[key]);
}

function summaryText(packet: ClientProjectIntelligencePacket, key: string): string {
  return cleanUnknown(summaryObject(packet, key).summary);
}

function packetEvidence(packet: ClientProjectIntelligencePacket): InsightCardEvidence[] {
  return packet.cards.flatMap((card) => card.evidence);
}

function sortedCards(cards: InsightCard[]): InsightCard[] {
  return [...cards].sort(
    (a, b) => (CARD_PRIORITY[a.cardType] ?? 50) - (CARD_PRIORITY[b.cardType] ?? 50) || (a.rank ?? 99) - (b.rank ?? 99),
  );
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
      typeof sourceMetadata.attachment_content_type === "string" ? sourceMetadata.attachment_content_type : null,
    attachmentFileName:
      typeof sourceMetadata.attachment_file_name === "string" ? sourceMetadata.attachment_file_name : source.title,
  };
}

function sourceButtonLabel(source: SourceDocumentRow): string {
  const primary = cleanText(source.title);
  if (primary) return primary.length > 44 ? `${primary.slice(0, 41).trim()}...` : primary;
  return [formatLabel(source.category || source.type || "Source"), formatDate(source.date || source.created_at)]
    .filter(Boolean)
    .join(" ");
}

function mergeSourceDocumentRows(source: SourceDocumentRow, ragSource?: RagSourceDocumentRow): SourceDocumentRow {
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

type UntypedSupabaseQuery = PromiseLike<{
  data: unknown[] | null;
  error: { message: string } | null;
}> & {
  select: (columns?: string) => UntypedSupabaseQuery;
  eq: (column: string, value: unknown) => UntypedSupabaseQuery;
  in: (column: string, values: unknown[]) => UntypedSupabaseQuery;
  order: (column: string, options?: { ascending?: boolean }) => UntypedSupabaseQuery;
  limit: (count: number) => UntypedSupabaseQuery;
};

type UntypedSupabaseReader = {
  from: (table: string) => UntypedSupabaseQuery;
};

async function loadOperatingRecordState(
  supabase: ReturnType<typeof createServiceClient>,
  projectId: number,
): Promise<OperatingRecordState> {
  const db = supabase as unknown as UntypedSupabaseReader;

  const currentStateResult = await db
    .from("project_current_state")
    .select("*")
    .eq("project_id", projectId)
    .limit(1);
  const currentState = ((currentStateResult.data ?? [])[0] ?? null) as ProjectCurrentStateRow | null;

  const snapshotQuery = db
    .from("project_operating_snapshots")
    .select("*")
    .eq("project_id", projectId);
  const snapshotResult = currentState?.last_snapshot_id
    ? await snapshotQuery.eq("id", currentState.last_snapshot_id).limit(1)
    : await snapshotQuery.order("snapshot_at", { ascending: false }).limit(1);
  const latestSnapshot = ((snapshotResult.data ?? [])[0] ?? null) as OperatingSnapshotRow | null;

  const timelineResult = await db
    .from("project_intelligence_timeline_events")
    .select(
      "id, project_id, event_at, event_type, title, summary, why_it_matters, current_status, owner_label, priority, source_synthesis_id, source_document_id, related_record_type, related_record_id, confidence",
    )
    .eq("project_id", projectId)
    .order("event_at", { ascending: false })
    .limit(40);

  const changeCandidatesResult = await db
    .from("change_event_candidates")
    .select(
      "id, title, description, reason, potential_cost_impact, potential_schedule_impact, confidence, missing_information, status",
    )
    .eq("project_id", projectId)
    .in("status", ["candidate", "reviewing", "draft_created"])
    .order("created_at", { ascending: false })
    .limit(8);

  const reportSuggestionsResult = await db
    .from("project_report_suggestions")
    .select("id, report_type, business_date, week_start_date, title, suggestion_payload, status, confidence")
    .eq("project_id", projectId)
    .in("status", ["suggested", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(8);

  return {
    currentState,
    latestSnapshot,
    timelineEvents: ((timelineResult.data ?? []) as OperatingTimelineEventRow[]) ?? [],
    changeEventCandidates: ((changeCandidatesResult.data ?? []) as ChangeEventCandidateRow[]) ?? [],
    reportSuggestions: ((reportSuggestionsResult.data ?? []) as ProjectReportSuggestionRow[]) ?? [],
  };
}

function sourceDocsForEvidence(
  evidence: InsightCardEvidence[],
  sourceDocumentMap: Map<string, SourceDocumentRow>,
): SourceDocumentRow[] {
  const seen = new Set<string>();
  const rows: SourceDocumentRow[] = [];
  for (const item of evidence) {
    if (!item.sourceDocumentId || seen.has(item.sourceDocumentId)) continue;
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

function SourceLinkRow({ projectId, sources }: { projectId: number; sources: SourceDocumentRow[] }) {
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

function riskTone(severity: string | null | undefined): StatusTone {
  const value = (severity ?? "").toLowerCase();
  if (value === "critical" || value === "high") return "risk";
  if (value === "medium") return "watch";
  return "healthy";
}

function stageLabel(project: ProjectRow): string {
  return cleanText(project.stage || project.phase || project.summary || "Stage not available");
}

function countTotal(counts: Record<string, unknown> | null | undefined, key: string): number {
  const row = asRecord(counts?.[key]);
  const total = row.total;
  return typeof total === "number" ? total : typeof total === "string" ? Number.parseInt(total, 10) || 0 : 0;
}

function countClosed(counts: Record<string, unknown> | null | undefined, key: string): number {
  const byStatus = asRecord(asRecord(counts?.[key]).byStatus);
  return Object.entries(byStatus).reduce((total, [status, value]) => {
    const normalized = status.toLowerCase();
    const amount = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) || 0 : 0;
    if (/(closed|complete|completed|approved|void|rejected|cancel)/.test(normalized)) {
      return total + amount;
    }
    return total;
  }, 0);
}

function countOpen(counts: Record<string, unknown> | null | undefined, key: string): number {
  return Math.max(0, countTotal(counts, key) - countClosed(counts, key));
}

function operatingHealthTone(status: string | null | undefined): StatusTone {
  if (status === "critical" || status === "at_risk") return "risk";
  if (status === "watch") return "watch";
  return "healthy";
}

function reportTypeLabel(value: string): string {
  if (value === "project_daily_report") return "Daily report";
  if (value === "field_daily_log") return "Daily log";
  if (value === "weekly_progress_report") return "Weekly progress report";
  if (value === "executive_daily_brief") return "Executive brief";
  return formatLabel(value);
}

function OperatingRecordSection({
  operatingRecord,
  projectId,
}: {
  operatingRecord: OperatingRecordState;
  projectId: number;
}) {
  const { currentState, latestSnapshot, changeEventCandidates, reportSuggestions } = operatingRecord;
  if (!currentState && !latestSnapshot) return null;

  const financial = latestSnapshot?.financial_snapshot ?? {};
  const schedule = latestSnapshot?.schedule_snapshot ?? {};
  const counts = latestSnapshot?.database_counts ?? {};
  const sourceConfidence = asRecord(currentState?.source_confidence);
  const sourceCoverage = asRecord(sourceConfidence.source_coverage);
  const sourceCount = typeof sourceCoverage.source_count === "number" ? sourceCoverage.source_count : null;
  const healthTone = operatingHealthTone(currentState?.health_status);
  const warnings = cleanUnknownList(latestSnapshot?.warnings, 3);
  const budget = typeof financial.budget === "number" ? financial.budget : null;
  const budgetUsed = typeof financial.budget_used === "number" ? financial.budget_used : null;

  const metrics: KpiBlockProps[] = [
    {
      label: "Budget",
      value: budget != null ? formatCurrency(budget) : "Not set",
      context: cleanUnknown(financial.erp_sync_status) || "ERP status not available",
    },
    {
      label: "Committed records",
      value: String(countTotal(counts, "commitments")),
      href: `/${projectId}/commitments`,
    },
    {
      label: "Change exposure",
      value: String(countTotal(counts, "change_events") + countTotal(counts, "potential_change_orders")),
      href: `/${projectId}/change-events`,
    },
    {
      label: "Open RFIs",
      value: String(countOpen(counts, "rfis")),
      context: `${countTotal(counts, "rfis")} total · ${countClosed(counts, "rfis")} closed`,
      href: `/${projectId}/rfis`,
    },
    {
      label: "Submittals",
      value: String(countOpen(counts, "submittals")),
      context: `${countTotal(counts, "submittals")} total · ${countClosed(counts, "submittals")} closed`,
      href: `/${projectId}/submittals`,
    },
    {
      label: "Drawings",
      value: String(countTotal(counts, "drawings")),
      href: `/${projectId}/drawings`,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <SectionHeading eyebrow="Operating record" title="Current project read from sources and database state" />
        <div className="max-w-4xl space-y-2">
          <p className="text-sm leading-7 text-muted-foreground">
            {summarizeText(currentState?.current_summary, 620) || "No current operating summary has been projected yet."}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className={toneClasses(healthTone)}>Health: {formatLabel(currentState?.health_status ?? "unknown")}</span>
            <span>Snapshot: {formatDateTime(latestSnapshot?.snapshot_at)}</span>
            <span>Financial sync: {formatDateTime(latestSnapshot?.acumatica_sync_at)}</span>
            {sourceCount != null ? <span>{sourceCount} source update{sourceCount === 1 ? "" : "s"}</span> : null}
          </div>
        </div>
      </div>

      <KpiRow metrics={metrics} size="small" />

      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Financial</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {currentState?.financial_read ||
              `Budget ${budget != null ? formatCurrency(budget) : "not set"} · used ${formatCurrency(budgetUsed)}`}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Schedule</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {currentState?.schedule_read ||
              `Start ${formatDate(cleanUnknown(schedule.start_date))} · substantial completion ${formatDate(cleanUnknown(schedule.substantial_completion_date))}`}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Field / reports</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {currentState?.field_read ||
              `${countTotal(counts, "daily_logs")} daily logs · ${countTotal(counts, "progress_reports")} progress reports`}
          </p>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Confidence warnings</p>
          <ul className="space-y-1">
            {warnings.map((warning) => (
              <li key={warning} className="text-sm leading-6 text-muted-foreground">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {changeEventCandidates.length > 0 ? (
        <div className="space-y-3">
          <SectionHeading eyebrow="Potential change events" title="Review before this becomes retroactive cleanup" />
          <div className="divide-y divide-border/60">
            {changeEventCandidates.map((candidate) => (
              <article key={candidate.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">{candidate.title}</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {summarizeText(candidate.reason || candidate.description, 260)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Confidence: {formatLabel(candidate.confidence)} · Status: {formatLabel(candidate.status)}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${projectId}/change-events/new?candidateId=${candidate.id}`}>Create with AI</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {reportSuggestions.length > 0 ? (
        <div className="space-y-3">
          <SectionHeading eyebrow="Report suggestions" title="Reusable daily and weekly report inputs" />
          <div className="divide-y divide-border/60">
            {reportSuggestions.map((suggestion) => (
              <article key={suggestion.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {reportTypeLabel(suggestion.report_type)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {summarizeText(
                    cleanUnknown(asRecord(suggestion.suggestion_payload).summary) ||
                      cleanUnknown(asRecord(suggestion.suggestion_payload).updates),
                    240,
                  ) || "Structured suggestion is ready for review."}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// --------------------------------------------------------------------------
// Section A — Snapshot: AI executive read + hard SQL numbers + delta
// --------------------------------------------------------------------------

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
      <Heading level={5} as="h2" className="text-lg">
        {title}
      </Heading>
    </div>
  );
}

function SnapshotSection({
  packet,
  project,
  counts,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  project: ProjectRow;
  counts: ProjectCounts;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const executiveRead = summarizeText(
    cleanUnknown(summaryRecord(packet).currentExecutiveRead) ||
      packet.currentStatus ||
      packet.strategicRead ||
      packet.executiveSummary,
    560,
  );

  const budget = typeof project.budget === "number" ? project.budget : null;
  const budgetUsed = typeof project.budget_used === "number" ? project.budget_used : null;
  const pctUsed = budget && budget > 0 && budgetUsed != null ? Math.round((budgetUsed / budget) * 100) : null;
  const remaining = budget != null && budgetUsed != null ? budget - budgetUsed : null;

  const metrics: KpiBlockProps[] = [
    {
      label: "Budget Used",
      value: budgetUsed != null ? formatCurrency(budgetUsed) : "—",
      context:
        budget != null
          ? `of ${formatCurrency(budget)}${remaining != null ? ` · ${formatCurrency(remaining)} left` : ""}`
          : "No budget set",
      progress:
        pctUsed != null
          ? { value: Math.min(pctUsed, 100), tone: pctUsed > 100 ? "danger" : pctUsed > 90 ? "warning" : "neutral" }
          : undefined,
    },
    { label: "Phase", value: project.phase ? formatLabel(project.phase) : stageLabel(project) },
    { label: "RFIs", value: String(counts.rfis), href: `/${projectId}/rfis` },
    { label: "Change Orders", value: String(counts.changeOrders), href: `/${projectId}/change-orders` },
    { label: "Change Events", value: String(counts.changeEvents), href: `/${projectId}/change-events` },
    { label: "Documents", value: String(counts.documents), href: `/${projectId}/documents` },
  ];

  const financial = summaryText(packet, "financialPosition");
  const schedule = summaryText(packet, "scheduleAndProcurement");
  const whatChanged = summaryItems(packet, "whatChanged", ["impact"]).slice(0, 4);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <SectionHeading eyebrow="Executive snapshot" title="What is happening right now" />
        <p className="max-w-4xl text-sm leading-7 text-muted-foreground">{executiveRead}</p>
      </div>

      <KpiRow metrics={metrics} size="small" />

      {financial || schedule ? (
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {financial ? (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Financial read
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{summarizeText(financial, 320)}</p>
            </div>
          ) : null}
          {schedule ? (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Schedule &amp; procurement
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{summarizeText(schedule, 320)}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {whatChanged.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            What changed since the last update
          </p>
          <div className="space-y-3">
            {whatChanged.map((item) => (
              <div key={item.title} className="flex gap-3">
                <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.detail ? (
                    <p className="text-sm leading-6 text-muted-foreground">{summarizeText(item.detail, 200)}</p>
                  ) : null}
                  <SourceLinkRow
                    projectId={projectId}
                    sources={supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// --------------------------------------------------------------------------
// Section B — Needs attention: risks + decisions + actions, merged & ranked
// --------------------------------------------------------------------------

type AttentionKind = "risk" | "decision" | "action";

type AttentionItem = {
  key: string;
  kind: AttentionKind;
  badge: string;
  tone: StatusTone;
  title: string;
  detail?: string;
  owner?: string;
  due?: string;
  sourceIds: string[];
  rank: number;
};

function normalizeTitle(value: string): string {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function buildAttentionItems(packet: ClientProjectIntelligencePacket): AttentionItem[] {
  const risks = summaryItems(packet, "risks", ["recommendedAction"], ["severity", "recommendedAction"]).map(
    (item): AttentionItem => {
      const severity = item.fields.severity || "medium";
      const tone = riskTone(severity);
      return {
        key: `risk:${item.title}`,
        kind: "risk",
        badge: `${formatLabel(severity)} risk`,
        tone,
        title: item.title,
        detail: item.detail,
        sourceIds: item.sourceIds,
        rank: tone === "risk" ? 0 : tone === "watch" ? 3 : 5,
      };
    },
  );

  const actions = summaryItems(packet, "recommendedActions", ["reason"], ["priority", "reason"]).map(
    (item): AttentionItem => {
      const priority = item.fields.priority || "medium";
      const tone = riskTone(priority);
      return {
        key: `action:${item.title}`,
        kind: "action",
        badge: `${formatLabel(priority)} priority`,
        tone,
        title: item.title,
        detail: item.detail,
        sourceIds: item.sourceIds,
        rank: tone === "risk" ? 1 : 4,
      };
    },
  );

  const decisions = summaryItems(packet, "openDecisions", [], ["owner", "neededBy"]).map(
    (item): AttentionItem => ({
      key: `decision:${item.title}`,
      kind: "decision",
      badge: "Open decision",
      tone: "watch",
      title: item.title,
      detail: item.detail,
      owner: item.fields.owner || undefined,
      due: item.fields.neededBy || undefined,
      sourceIds: item.sourceIds,
      rank: 2,
    }),
  );

  const seen = new Set<string>();
  return [...risks, ...actions, ...decisions]
    .filter((item) => {
      const norm = normalizeTitle(item.title);
      if (!norm || seen.has(norm)) return false;
      seen.add(norm);
      return true;
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 12);
}

const KIND_ICON: Record<AttentionKind, typeof AlertTriangle> = {
  risk: AlertTriangle,
  decision: GitCommitHorizontal,
  action: CheckCircle2,
};

function NeedsAttentionSection({
  packet,
  projectId,
  sourceDocumentMap,
}: {
  packet: ClientProjectIntelligencePacket;
  projectId: number;
  sourceDocumentMap: Map<string, SourceDocumentRow>;
}) {
  const items = buildAttentionItems(packet);
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <SectionHeading eyebrow="Needs attention" title="Risks, decisions, and actions in priority order" />
      <div className="divide-y divide-border/60">
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind];
          return (
            <article key={item.key} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneClasses(item.tone)}`} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Heading level={6} as="h3" className="text-sm leading-5">
                    {item.title}
                  </Heading>
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${toneClasses(item.tone)}`}>
                    {item.badge}
                  </span>
                </div>
                {item.detail ? (
                  <p className="text-sm leading-6 text-muted-foreground">{summarizeText(item.detail, 240)}</p>
                ) : null}
                {item.owner || item.due ? (
                  <p className="text-xs text-muted-foreground">
                    {item.owner ? `Owner: ${item.owner}` : "Owner not named"}
                    {item.due ? ` · Due: ${item.due}` : ""}
                  </p>
                ) : null}
                <SourceLinkRow
                  projectId={projectId}
                  sources={supportingSourcesForIds(packet, item.sourceIds, sourceDocumentMap)}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// --------------------------------------------------------------------------
// Section C — Progress log (single timeline) + evidence behind one disclosure
// --------------------------------------------------------------------------

const TIMELINE_TYPE_LABELS: Record<string, string> = {
  decision: "Decision",
  risk: "Risk",
  schedule_risk: "Schedule risk",
  financial_exposure: "Financial exposure",
  blocker: "Blocker",
  flag: "Flag",
  initiative_signal: "Opportunity",
  project_update: "Update",
  open_question: "Open question",
  requirement: "Requirement",
  change_management: "Change",
  solution: "Solution",
  milestone: "Milestone",
  task: "Task",
  product_need: "Product need",
  process_issue: "Process issue",
  sentiment: "Sentiment",
};

function timelineVariant(cardType: string, status: string): NonNullable<TimelineItem["variant"]> {
  if (status === "materialized") return "success";
  if (cardType === "flag") return "warning";
  if (["risk", "schedule_risk", "financial_exposure", "blocker"].includes(cardType)) return "destructive";
  if (cardType === "decision" || cardType === "change_management") return "info";
  if (["solution", "milestone", "initiative_signal"].includes(cardType)) return "success";
  return "default";
}

function timelineStatusNote(cardType: string, status: string): string {
  if (status === "materialized") return " · ✓ materialized";
  if (status === "did_not_materialize") return " · did not materialize";
  if (status === "resolved") return " · resolved";
  if (status === "blocked") return " · blocked";
  if (cardType === "flag") return " · prediction";
  return "";
}

function formatTimelineDate(occurredAt: string | null): string {
  if (!occurredAt) return "";
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ProgressLogSection({
  entries,
  packet,
  projectId,
}: {
  entries: ProjectTimelineEntry[];
  packet: ClientProjectIntelligencePacket | null;
  projectId: number;
}) {
  const items: TimelineItem[] = entries.map((entry) => {
    const typeLabel = TIMELINE_TYPE_LABELS[entry.cardType] ?? entry.cardType;
    const severityNote = entry.severity ? ` · severity ${entry.severity}` : "";
    const statusNote = timelineStatusNote(entry.cardType, entry.currentStatus);
    const meta = `${typeLabel}${severityNote}${statusNote}`;
    return {
      id: entry.id,
      title: entry.title,
      timestamp: formatTimelineDate(entry.occurredAt),
      user: entry.suggestedOwnerLabel ?? undefined,
      description: entry.summary ? `${meta} — ${entry.summary}` : meta,
      variant: timelineVariant(entry.cardType, entry.currentStatus),
    };
  });

  const cards = packet ? sortedCards(packet.cards).slice(0, 16) : [];
  const { warnings, limitations } = packet ? buildIntelligencePageState(packet) : { warnings: [], limitations: [] };

  if (items.length === 0 && cards.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <SectionHeading eyebrow="Progress log" title="Decisions, risks, and AI flags over time" />
        <p className="text-sm text-muted-foreground">
          Surfaced from meetings, emails, and Teams — most recent first.
        </p>
      </div>

      {items.length > 0 ? <Timeline items={items} /> : null}

      {cards.length > 0 || warnings.length > 0 || limitations.length > 0 ? (
        <details className="rounded-2xl border border-border/70 p-5">
          <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
            Evidence, sources &amp; packet limits
          </summary>
          <div className="mt-5 space-y-5">
            {cards.length > 0 ? <InsightCardShowcase cards={cards} projectId={projectId} /> : null}
            {warnings.length > 0 ? (
              <div className="space-y-2 border-t border-border/60 pt-4">
                <Heading level={6} as="h3" className="text-sm">
                  Warnings
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
      ) : null}
    </section>
  );
}

function OperatingTimelineSection({ events }: { events: OperatingTimelineEventRow[] }) {
  if (events.length === 0) return null;

  const items: TimelineItem[] = events.slice(0, 24).map((event) => ({
    id: event.id,
    title: event.title,
    timestamp: formatTimelineDate(event.event_at),
    user: event.owner_label ?? undefined,
    description: [
      formatLabel(event.event_type),
      event.priority !== "low" ? `${formatLabel(event.priority)} priority` : "",
      summarizeText(event.summary || event.why_it_matters, 260),
    ]
      .filter(Boolean)
      .join(" — "),
    variant:
      event.priority === "urgent" || event.priority === "high"
        ? "warning"
        : event.event_type === "decision"
          ? "info"
          : event.event_type === "change_event_signal"
            ? "destructive"
            : "default",
  }));

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <SectionHeading eyebrow="Operating timeline" title="Reverse-chronological source-backed project history" />
        <p className="text-sm text-muted-foreground">
          Durable events from source syntheses and project database snapshots.
        </p>
      </div>
      <Timeline items={items} />
    </section>
  );
}

function IntelligenceEmptyState({ project, reason }: { project: ProjectRow; reason: string }) {
  return (
    <EmptyState
      title="No project intelligence brief yet"
      description={`${project.name ?? `Project ${project.id}`} cannot show a living project intelligence brief until the pipeline has a current packet. ${reason}`}
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/ai">Open assistant</Link>
        </Button>
      }
    />
  );
}

export default async function ProjectIntelligencePage({ params }: { params: Promise<{ projectId: string }> }) {
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
        projectId: target.projectId,
      });
    } catch (error) {
      packetLoadError = error instanceof Error ? error.message : "Unexpected packet load failure.";
    }
  }

  let timelineEntries: ProjectTimelineEntry[] = [];
  if (target) {
    try {
      timelineEntries = await loadProjectTimeline({ targetId: target.id, supabase });
    } catch {
      timelineEntries = [];
    }
  }
  const operatingRecord = await loadOperatingRecordState(supabase, numericProjectId);
  const hasOperatingRecord = Boolean(
    operatingRecord.currentState ||
      operatingRecord.latestSnapshot ||
      operatingRecord.timelineEvents.length ||
      operatingRecord.changeEventCandidates.length ||
      operatingRecord.reportSuggestions.length,
  );

  // Hard-data snapshot counts (SQL, no AI).
  const countOf = async (table: "rfis" | "change_orders" | "change_events" | "document_metadata") =>
    (await supabase.from(table).select("id", { count: "exact", head: true }).eq("project_id", numericProjectId)).count ??
    0;
  const [rfiCount, changeOrderCount, changeEventCount, documentCount] = await Promise.all([
    countOf("rfis"),
    countOf("change_orders"),
    countOf("change_events"),
    countOf("document_metadata"),
  ]);
  const counts: ProjectCounts = {
    rfis: rfiCount,
    changeOrders: changeOrderCount,
    changeEvents: changeEventCount,
    documents: documentCount,
  };

  // Source documents for citation buttons across all sections.
  const evidenceSourceIds = Array.from(
    new Set(
      [
        ...(packet ? packetEvidence(packet).map((evidence) => evidence.sourceDocumentId) : []),
        ...operatingRecord.timelineEvents.map((event) => event.source_document_id),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const ragSupabase = isRagDatabaseReadsEnabled() ? createRagServiceClient() : null;
  const intakeSupabase = createOutlookIntakeServiceClient();
  const sourceDocumentsResult = evidenceSourceIds.length
    ? await supabase
        .from("document_metadata")
        .select(
          "id, title, type, category, source, source_system, date, created_at, summary, overview, description, notes, content, raw_text, source_web_url, fireflies_link, meeting_link, url, participants, participants_array",
        )
        .in("id", evidenceSourceIds)
    : { data: [], error: null };
  const ragSourceDocumentsResult =
    ragSupabase && evidenceSourceIds.length
      ? await ragSupabase
          .from("rag_document_metadata")
          .select("id, title, type, category, source, source_system, summary, overview, content, raw_text, source_web_url, url")
          .in("id", evidenceSourceIds)
      : { data: [], error: null };
  const attachmentLinksResult = evidenceSourceIds.length
    ? await intakeSupabase
        .from("outlook_email_intake_attachments")
        .select("document_metadata_id, email_attachment_id, content_type, file_name")
        .in("document_metadata_id", evidenceSourceIds)
    : { data: [], error: null };
  const ragSourceMap = new Map(
    (((ragSourceDocumentsResult.data ?? []) as RagSourceDocumentRow[]) ?? []).map((source) => [source.id, source]),
  );
  const attachmentLinkMap = new Map(
    (((attachmentLinksResult.data ?? []) as OutlookAttachmentLinkRow[]) ?? [])
      .filter((row): row is OutlookAttachmentLinkRow & { document_metadata_id: string } => Boolean(row.document_metadata_id))
      .map((row) => [row.document_metadata_id, row]),
  );
  const sourceDocuments = ((sourceDocumentsResult.data ?? []) as SourceDocumentRow[]).map((source) => {
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
  });
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
              {operatingRecord.currentState
                ? `Last updated ${formatDateTime(operatingRecord.currentState.updated_at)}`
                : packet
                  ? `Last updated ${formatDateTime(packet.generatedAt)}`
                  : "Last updated not available"}
            </p>
          </div>
        </div>
      }
      actions={
        <Button asChild size="sm" variant="default">
          <Link href="/ai">Ask Alleato AI</Link>
        </Button>
      }
      contentClassName="space-y-10"
    >
      {hasOperatingRecord ? <OperatingRecordSection operatingRecord={operatingRecord} projectId={numericProjectId} /> : null}

      <DailyIngestionFeed projectId={numericProjectId} />

      {!target && !hasOperatingRecord ? (
        <IntelligenceEmptyState
          project={project}
          reason="Create an intelligence target before the living project brief can compile source-backed analysis."
        />
      ) : packetLoadError && !hasOperatingRecord ? (
        <EmptyState
          title="Project intelligence brief could not load"
          description={`The current packet failed to load: ${packetLoadError}`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/ai-system-health">Open AI system health</Link>
            </Button>
          }
        />
      ) : packet ? (
        <>
          <SnapshotSection
            packet={packet}
            project={project}
            counts={counts}
            projectId={numericProjectId}
            sourceDocumentMap={sourceDocumentMap}
          />
          <NeedsAttentionSection packet={packet} projectId={numericProjectId} sourceDocumentMap={sourceDocumentMap} />
          {operatingRecord.timelineEvents.length > 0 ? (
            <OperatingTimelineSection events={operatingRecord.timelineEvents} />
          ) : (
            <ProgressLogSection entries={timelineEntries} packet={packet} projectId={numericProjectId} />
          )}
        </>
      ) : operatingRecord.timelineEvents.length > 0 ? (
        <OperatingTimelineSection events={operatingRecord.timelineEvents} />
      ) : timelineEntries.length > 0 ? (
        <ProgressLogSection entries={timelineEntries} packet={null} projectId={numericProjectId} />
      ) : (
        <IntelligenceEmptyState
          project={project}
          reason="The target exists, but no current packet has been generated yet."
        />
      )}
    </PageShell>
  );
}
