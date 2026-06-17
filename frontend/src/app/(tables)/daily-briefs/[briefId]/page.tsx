import Link from "next/link";
import { notFound } from "next/navigation";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import type { BrandonDailyUpdatePacket } from "@/lib/executive/brandon-daily-update";
import { CEO_EXECUTIVE_BRIEFING_RECAP_KIND } from "@/lib/executive/executive-briefing-workflow";
import { formatExecutiveBriefingTeamsMessage } from "@/lib/executive/executive-briefing-render";
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

type BriefSectionKey = "needsBrandon" | "waitingOnOthers" | "importantUpdates";

type ProjectBriefItem = HistoricalBriefItem & {
  section: BriefSectionKey;
  sectionLabel: string;
  sectionRank: number;
};

type ProjectBriefGroup = {
  project: string;
  items: ProjectBriefItem[];
  counts: Record<BriefSectionKey, number>;
};

const BRIEF_SECTIONS: Array<{
  key: BriefSectionKey;
  label: string;
}> = [
  {
    key: "needsBrandon",
    label: "Needs Brandon",
  },
  {
    key: "waitingOnOthers",
    label: "Waiting on Others",
  },
  {
    key: "importantUpdates",
    label: "Important Updates",
  },
];

const SECTION_RANK: Record<BriefSectionKey, number> = {
  needsBrandon: 0,
  waitingOnOthers: 1,
  importantUpdates: 2,
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
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
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

function formatItemCount(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function sectionCountLabel(count: number, label: string) {
  if (count === 0) return null;
  return `${count} ${label.toLowerCase()}`;
}

function buildProjectGroups(
  packet: HistoricalBriefPacket,
): ProjectBriefGroup[] {
  const groups = new Map<string, ProjectBriefGroup>();

  for (const section of BRIEF_SECTIONS) {
    for (const item of packet[section.key]) {
      const project = item.project ?? "Unassigned project";
      const existing =
        groups.get(project) ??
        ({
          project,
          items: [],
          counts: {
            needsBrandon: 0,
            waitingOnOthers: 0,
            importantUpdates: 0,
          },
        } satisfies ProjectBriefGroup);

      existing.items.push({
        ...item,
        section: section.key,
        sectionLabel: section.label,
        sectionRank: SECTION_RANK[section.key],
      });
      existing.counts[section.key] += 1;
      groups.set(project, existing);
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    const priorityDelta =
      right.counts.needsBrandon - left.counts.needsBrandon ||
      right.items.length - left.items.length;
    if (priorityDelta !== 0) return priorityDelta;
    return left.project.localeCompare(right.project);
  });
}

function projectGroupSummary(group: ProjectBriefGroup) {
  const nonZeroSections = [
    sectionCountLabel(group.counts.needsBrandon, "needs Brandon"),
    sectionCountLabel(group.counts.waitingOnOthers, "waiting"),
    sectionCountLabel(group.counts.importantUpdates, "updates"),
  ].filter(Boolean);

  if (nonZeroSections.length <= 1) return "";
  return nonZeroSections.join(" · ");
}

function projectGroupCount(group: ProjectBriefGroup) {
  return (
    sectionCountLabel(group.counts.needsBrandon, "needs Brandon") ??
    formatItemCount(group.items.length)
  );
}

function firstAction(group: ProjectBriefGroup) {
  return group.items
    .slice()
    .sort((left, right) => left.sectionRank - right.sectionRank)
    .find((item) => item.recommendedAction || item.summary);
}

function BriefFact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function BriefSummary({
  row,
  packet,
  itemCount,
}: {
  row: DailyRecapRow;
  packet: HistoricalBriefPacket | null;
  itemCount: number;
}) {
  return (
    <section className="space-y-3">
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        <BriefFact label="Delivery" value={deliveryLabel(row)} />
        <BriefFact label="Items" value={itemCount} />
        <BriefFact
          label="Generated"
          value={formatDateTime(packet?.generatedAt ?? row.created_at)}
        />
        <BriefFact
          label="Window"
          value={
            packet?.windowDays
              ? `${packet.windowDays} days`
              : formatDateRange(row)
          }
        />
      </dl>
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
        <BriefFact label="Approved" value={formatDateTime(row.approved_at)} />
        <BriefFact label="Sent" value={formatDateTime(row.sent_at)} />
      </dl>
      {row.approval_notes && (
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {row.approval_notes}
        </p>
      )}
    </section>
  );
}

function BriefItemRow({ item }: { item: ProjectBriefItem }) {
  const hasHiddenContext =
    item.bullets.length > 0 ||
    Boolean(item.whyItMatters) ||
    Boolean(item.sourceDetail) ||
    Boolean(item.source) ||
    Boolean(item.evidence);

  return (
    <article className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-6 text-foreground">
              {item.title}
            </div>
            {item.date && (
              <p className="text-xs text-muted-foreground">
                {formatDate(item.date)}
              </p>
            )}
          </div>
          {item.section !== "needsBrandon" && (
            <span className="text-xs font-medium text-muted-foreground">
              {item.sectionLabel}
            </span>
          )}
        </div>

        {(item.recommendedAction || item.summary) && (
          <p className="max-w-3xl text-sm leading-6 text-foreground">
            {item.recommendedAction ?? item.summary}
          </p>
        )}
      </div>

      {hasHiddenContext && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Context and evidence
          </summary>
          <div className="mt-3 space-y-3">
            {item.whyItMatters && (
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">
                  Why it matters:
                </span>{" "}
                {item.whyItMatters}
              </p>
            )}

            {item.bullets.length > 0 && (
              <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted-foreground">
                {item.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}

            <p className="text-xs leading-5 text-muted-foreground">
              {item.sourceUrl ? (
                <Link
                  href={item.sourceUrl}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {item.sourceDetail ?? item.source ?? "Source"}
                </Link>
              ) : (
                <span>
                  {item.sourceDetail ?? item.source ?? "Source not linked"}
                </span>
              )}
              {item.evidence ? <span> · {item.evidence}</span> : null}
            </p>
          </div>
        </details>
      )}
    </article>
  );
}

function ProjectSection({
  label,
  items,
}: {
  label: string;
  items: ProjectBriefItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionRuleHeading
        className="mb-0"
        label={label}
        actions={
          <span className="text-xs font-medium text-muted-foreground">
            {formatItemCount(items.length)}
          </span>
        }
      />
      <div className="divide-y divide-border/50">
        {items.map((item, index) => (
          <BriefItemRow
            key={`${item.section}-${item.title}-${item.sourceDetail ?? index}`}
            item={item}
          />
        ))}
      </div>
    </section>
  );
}

function ProjectBriefAccordion({ groups }: { groups: ProjectBriefGroup[] }) {
  if (groups.length === 0) {
    return (
      <section className="space-y-2">
        <SectionRuleHeading label="Brief items" />
        <p className="text-sm text-muted-foreground">
          No project-scoped brief items were stored in this packet.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <SectionRuleHeading
        label="Review by project"
        actions={
          <span className="text-xs font-medium text-muted-foreground">
            {groups.length} {groups.length === 1 ? "project" : "projects"}
          </span>
        }
      />
      <Accordion
        type="multiple"
        defaultValue={[groups[0]?.project ?? ""]}
        className="divide-y divide-border/50"
      >
        {groups.map((group) => {
          const primary = firstAction(group);
          return (
            <AccordionItem key={group.project} value={group.project}>
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="min-w-0 flex-1 space-y-2 pr-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <span className="text-base font-semibold leading-6 text-foreground">
                      {group.project}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {projectGroupCount(group)}
                    </span>
                  </div>
                  {projectGroupSummary(group) && (
                    <div className="text-xs text-muted-foreground">
                      {projectGroupSummary(group)}
                    </div>
                  )}
                  {primary && (
                    <p className="max-w-3xl text-sm font-normal leading-6 text-muted-foreground">
                      {primary.recommendedAction ?? primary.summary}
                    </p>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="space-y-8">
                  {BRIEF_SECTIONS.map((section) => (
                    <ProjectSection
                      key={`${group.project}-${section.key}`}
                      label={section.label}
                      items={group.items.filter(
                        (item) => item.section === section.key,
                      )}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}

function SourceCoverageSection({
  sources,
}: {
  sources: HistoricalSourceCoverage[];
}) {
  const warningCount = sources.filter((source) => source.warning).length;
  const summary = `${sources.length} ${
    sources.length === 1 ? "source" : "sources"
  }${warningCount > 0 ? `, ${warningCount} warning${warningCount === 1 ? "" : "s"}` : ""}`;

  return (
    <section className="space-y-3">
      {sources.length === 0 ? (
        <>
          <SectionRuleHeading label="Source coverage" />
          <p className="text-sm text-muted-foreground">
            This stored packet did not include source coverage.
          </p>
        </>
      ) : (
        <details open={warningCount > 0}>
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Source coverage: {summary}
          </summary>
          <div className="mt-3 overflow-x-auto">
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
        </details>
      )}
    </section>
  );
}

function TeamsPreviewSection({ preview }: { preview: string | null }) {
  if (!preview) return null;

  return (
    <section className="space-y-3">
      <SectionRuleHeading label="Teams preview" />
      <p className="text-sm text-muted-foreground">
        This is the exact Teams-formatted message generated from the saved
        Daily Brief packet. Review this before approving the brief for delivery.
      </p>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-6 text-foreground">
        {preview}
      </pre>
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
  const teamsPreview =
    packet && isRecord(row.briefing_packet)
      ? formatExecutiveBriefingTeamsMessage(
          row.briefing_packet as BrandonDailyUpdatePacket,
          "Brandon",
        )
      : null;
  const itemCount = packet
    ? packet.needsBrandon.length +
      packet.waitingOnOthers.length +
      packet.importantUpdates.length
    : 0;
  const projectGroups = packet ? buildProjectGroups(packet) : [];

  return (
    <PageShell
      variant="detail"
      eyebrow="Daily Brief history"
      title={`Daily Brief - ${row.recap_date}`}
      statusBadge={<Badge variant="outline">{row.workflow_status}</Badge>}
      contentClassName="pb-16"
    >
      <BriefSummary row={row} packet={packet} itemCount={itemCount} />

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
          <TeamsPreviewSection preview={teamsPreview} />
          <ProjectBriefAccordion groups={projectGroups} />
          <SourceCoverageSection sources={packet.sourceCoverage} />
          {packet.retrievalNotes.length > 0 && (
            <section className="space-y-3">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Retrieval notes
                </summary>
                <ul className="mt-3 space-y-1.5 text-sm leading-6 text-muted-foreground">
                  {packet.retrievalNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </details>
            </section>
          )}
        </>
      )}
    </PageShell>
  );
}
