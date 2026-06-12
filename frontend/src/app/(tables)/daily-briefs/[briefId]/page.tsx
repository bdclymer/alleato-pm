import Link from "next/link";
import { notFound } from "next/navigation";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import { CEO_EXECUTIVE_BRIEFING_RECAP_KIND } from "@/lib/executive/executive-briefing-workflow";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ briefId: string }>;
};

type DailyRecapRow = Pick<
  Database["public"]["Tables"]["daily_recaps"]["Row"],
  | "id"
  | "recap_date"
  | "date_range_start"
  | "date_range_end"
  | "workflow_status"
  | "approved_at"
  | "approval_notes"
  | "sent_at"
  | "sent_teams"
  | "sent_email"
  | "created_at"
  | "briefing_packet"
  | "model_used"
>;

type HistoricalBriefItem = {
  title: string;
  summary: string | null;
  bullets: string[];
  recommendedAction: string | null;
  whyItMatters: string | null;
  project: string | null;
  source: string | null;
  sourceDetail: string | null;
  sourceUrl: string | null;
  evidence: string | null;
  date: string | null;
};

type HistoricalSourceCoverage = {
  label: string;
  detail: string | null;
  count: number | null;
  latest: string | null;
  status: string | null;
  warning: string | null;
};

type HistoricalBriefPacket = {
  generatedAt: string | null;
  windowDays: number | null;
  needsBrandon: HistoricalBriefItem[];
  waitingOnOthers: HistoricalBriefItem[];
  importantUpdates: HistoricalBriefItem[];
  sourceCoverage: HistoricalSourceCoverage[];
  retrievalNotes: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return arrayValue(value).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function parseBriefItem(value: unknown): HistoricalBriefItem {
  const item = isRecord(value) ? value : {};
  return {
    title: stringValue(item.title) ?? "Untitled brief item",
    summary: stringValue(item.summary),
    bullets: stringArray(item.bullets),
    recommendedAction: stringValue(item.recommendedAction),
    whyItMatters: stringValue(item.whyItMatters),
    project: stringValue(item.project),
    source: stringValue(item.source),
    sourceDetail: stringValue(item.sourceDetail),
    sourceUrl: stringValue(item.sourceUrl),
    evidence: stringValue(item.evidence),
    date: stringValue(item.date),
  };
}

function parseSourceCoverage(value: unknown): HistoricalSourceCoverage {
  const source = isRecord(value) ? value : {};
  return {
    label: stringValue(source.label) ?? "Source",
    detail: stringValue(source.detail),
    count: numberValue(source.count),
    latest: stringValue(source.latest),
    status: stringValue(source.status),
    warning: stringValue(source.warning),
  };
}

function parsePacket(
  value: DailyRecapRow["briefing_packet"],
): HistoricalBriefPacket | null {
  if (!isRecord(value)) return null;
  const sections = value.sections;
  if (!isRecord(sections)) return null;

  return {
    generatedAt: stringValue(value.generatedAt),
    windowDays: numberValue(value.windowDays),
    needsBrandon: arrayValue(sections.needsBrandon).map(parseBriefItem),
    waitingOnOthers: arrayValue(sections.waitingOnOthers).map(parseBriefItem),
    importantUpdates: arrayValue(sections.importantUpdates).map(parseBriefItem),
    sourceCoverage: arrayValue(value.sourceCoverage).map(parseSourceCoverage),
    retrievalNotes: stringArray(value.retrievalNotes),
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateRange(row: DailyRecapRow) {
  if (row.date_range_start === row.date_range_end) {
    return row.date_range_start;
  }
  return `${row.date_range_start} to ${row.date_range_end}`;
}

function deliveryLabel(row: DailyRecapRow) {
  if (row.sent_teams) return "Teams sent";
  if (row.workflow_status === "approved") return "Approved, not sent";
  return "Not ready";
}

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function BriefItemList({
  title,
  items,
  empty,
}: {
  title: string;
  items: HistoricalBriefItem[];
  empty: string;
}) {
  return (
    <section className="space-y-4">
      <SectionRuleHeading label={title} />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="divide-y">
          {items.map((item, index) => (
            <article
              key={`${item.title}-${item.sourceDetail ?? index}`}
              className="space-y-3 py-5 first:pt-0 last:pb-0"
            >
              <div className="space-y-1">
                <div className="text-base font-semibold text-foreground">
                  {item.title}
                </div>
                {item.project && (
                  <p className="text-xs text-muted-foreground">{item.project}</p>
                )}
              </div>

              {item.summary && item.bullets.length === 0 && (
                <p className="text-sm leading-6 text-foreground">{item.summary}</p>
              )}

              {item.bullets.length > 0 && (
                <ul className="space-y-1.5">
                  {item.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-2 text-sm leading-6 text-foreground"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {(item.recommendedAction || item.whyItMatters) && (
                <div className="space-y-1 text-sm leading-6">
                  {item.recommendedAction && (
                    <p>
                      <span className="font-medium text-foreground">
                        Recommended action:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {item.recommendedAction}
                      </span>
                    </p>
                  )}
                  {item.whyItMatters && (
                    <p>
                      <span className="font-medium text-foreground">
                        Why it matters:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {item.whyItMatters}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {item.sourceUrl ? (
                  <Link
                    href={item.sourceUrl}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {item.sourceDetail ?? item.source ?? "Source"}
                  </Link>
                ) : (
                  <span>{item.sourceDetail ?? item.source ?? "Source not linked"}</span>
                )}
                {item.date ? <span> · {formatDate(item.date)}</span> : null}
                {item.evidence ? <span> · {item.evidence}</span> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SourceCoverageSection({
  sources,
}: {
  sources: HistoricalSourceCoverage[];
}) {
  return (
    <section className="space-y-4">
      <SectionRuleHeading label="Source coverage" />
      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This stored packet did not include source coverage.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 text-left font-medium">Source</th>
                <th className="py-2 pr-4 text-left font-medium">Count</th>
                <th className="py-2 pr-4 text-left font-medium">Latest</th>
                <th className="py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sources.map((source) => (
                <tr key={`${source.label}-${source.detail ?? ""}`}>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-foreground">
                      {source.label}
                    </div>
                    {source.detail && (
                      <div className="text-xs text-muted-foreground">
                        {source.detail}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">
                    {source.count ?? "Not recorded"}
                  </td>
                  <td className="py-3 pr-4">{formatDate(source.latest)}</td>
                  <td className="py-3">
                    {source.warning ? (
                      <span className="text-warning">{source.warning}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {source.status ?? "Loaded"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

async function loadBrief(briefId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_recaps")
    .select(
      "id, recap_date, date_range_start, date_range_end, workflow_status, approved_at, approval_notes, sent_at, sent_teams, sent_email, created_at, briefing_packet, model_used",
    )
    .eq("id", briefId)
    .eq("recap_kind", CEO_EXECUTIVE_BRIEFING_RECAP_KIND)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Daily Brief ${briefId}: ${error.message}`);
  }

  return data as DailyRecapRow | null;
}

export default async function DailyBriefDetailPage({ params }: PageProps) {
  const canViewExecutiveBriefing = await canCurrentUserAccessAppCapability(
    "view_executive_briefing",
  );

  if (!canViewExecutiveBriefing) {
    return (
      <AppCapabilityAccessDenied
        title="Daily Brief history"
        description="Daily Brief history is limited to users with executive briefing access."
      />
    );
  }

  const { briefId } = await params;
  const row = await loadBrief(briefId);
  if (!row) notFound();

  const packet = parsePacket(row.briefing_packet);
  const itemCount = packet
    ? packet.needsBrandon.length +
      packet.waitingOnOthers.length +
      packet.importantUpdates.length
    : 0;

  return (
    <PageShell
      variant="detailWide"
      eyebrow="Daily Brief history"
      title={`Daily Brief - ${row.recap_date}`}
      description={`Stored packet for ${formatDateRange(row)}.`}
      statusBadge={<Badge variant="outline">{row.workflow_status}</Badge>}
      breadcrumbs={[
        { label: "Daily Briefs", href: "/daily-briefs" },
        { label: row.recap_date },
      ]}
      contentClassName="pb-16"
    >
      <section className="space-y-5">
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <MetadataRow label="Delivery" value={deliveryLabel(row)} />
          <MetadataRow label="Approved" value={formatDateTime(row.approved_at)} />
          <MetadataRow label="Sent" value={formatDateTime(row.sent_at)} />
          <MetadataRow
            label="Generated"
            value={formatDateTime(packet?.generatedAt ?? row.created_at)}
          />
          <MetadataRow label="Items" value={itemCount} />
          <MetadataRow
            label="Window"
            value={packet?.windowDays ? `${packet.windowDays} days` : formatDateRange(row)}
          />
          <MetadataRow label="Model" value={row.model_used ?? "Not recorded"} />
          <MetadataRow
            label="Packet"
            value={packet ? "Stored packet available" : "Missing packet"}
          />
        </dl>
        {row.approval_notes && (
          <p className="text-sm leading-6 text-muted-foreground">
            {row.approval_notes}
          </p>
        )}
      </section>

      {!packet ? (
        <section className="space-y-2">
          <SectionRuleHeading label="Packet unavailable" />
          <p className="text-sm text-destructive">
            This Daily Brief row exists, but its stored packet is missing or
            malformed. The table can show delivery metadata, but there is no
            historical content to render.
          </p>
        </section>
      ) : (
        <>
          <BriefItemList
            title="Needs Brandon"
            items={packet.needsBrandon}
            empty="No decision items were stored in this section."
          />
          <BriefItemList
            title="Waiting on Others"
            items={packet.waitingOnOthers}
            empty="No waiting-on-others items were stored in this section."
          />
          <BriefItemList
            title="Important Updates"
            items={packet.importantUpdates}
            empty="No important updates were stored in this section."
          />
          <SourceCoverageSection sources={packet.sourceCoverage} />
          {packet.retrievalNotes.length > 0 && (
            <section className="space-y-4">
              <SectionRuleHeading label="Retrieval notes" />
              <ul className="space-y-1.5 text-sm leading-6 text-muted-foreground">
                {packet.retrievalNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}
