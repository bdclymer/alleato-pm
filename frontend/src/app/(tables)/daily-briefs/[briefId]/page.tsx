import { notFound } from "next/navigation";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import {
  loadDailyExecutiveBriefPacketById,
  type CanonicalDailyBriefPacket,
  type DailyBriefMarkdownSection,
} from "@/lib/daily-briefs/canonical-packets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ briefId: string }>;
};

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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 break-inside-avoid space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function PacketSummary({ packet }: { packet: CanonicalDailyBriefPacket }) {
  return (
    <section className="space-y-4">
      <div className="space-y-4 sm:columns-2 lg:columns-4">
        <SummaryRow label="Business day" value={packet.businessDate} />
        <SummaryRow label="Packet state" value={packet.packetType} />
        <SummaryRow label="Sources" value={String(packet.sourceCount)} />
        <SummaryRow label="Generated" value={formatDateTime(packet.generatedAt)} />
      </div>
      <div className="text-xs text-muted-foreground">
        Source of truth: `intelligence_packets` / `daily-executive-brief`
      </div>
    </section>
  );
}

function renderBodyLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("- ")) {
    return (
      <li key={trimmed} className="pl-1 text-sm leading-7 text-foreground">
        {trimmed.slice(2)}
      </li>
    );
  }

  return (
    <p key={trimmed} className="text-sm leading-7 text-foreground">
      {trimmed}
    </p>
  );
}

function BriefSection({ section }: { section: DailyBriefMarkdownSection }) {
  const lines = section.body.split(/\r?\n/);
  const bulletLines = lines.filter((line) => line.trim().startsWith("- "));
  const paragraphLines = lines.filter((line) => !line.trim().startsWith("- "));

  return (
    <section className="space-y-3">
      <SectionRuleHeading label={section.title} />
      {paragraphLines.map(renderBodyLine)}
      {bulletLines.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {bulletLines.map(renderBodyLine)}
        </ul>
      )}
    </section>
  );
}

function SourceCoverage({ packet }: { packet: CanonicalDailyBriefPacket }) {
  const entries = Object.entries(packet.sourceCounts);
  if (entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionRuleHeading label="Source coverage" />
      <div className="space-y-3 sm:columns-2 lg:columns-4">
        {entries.map(([lane, count]) => (
          <div key={lane} className="mb-3 break-inside-avoid space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {lane}
            </div>
            <div className="text-sm tabular-nums text-foreground">
              {count} source{count === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
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
  const packet = await loadDailyExecutiveBriefPacketById(briefId);
  if (!packet) notFound();

  return (
    <PageShell
      variant="detail"
      title={packet.title}
      contentClassName="pb-16"
    >
      <div className="space-y-10">
        <PacketSummary packet={packet} />
        {packet.sections.map((section) => (
          <BriefSection key={section.title} section={section} />
        ))}
        <SourceCoverage packet={packet} />
      </div>
    </PageShell>
  );
}
