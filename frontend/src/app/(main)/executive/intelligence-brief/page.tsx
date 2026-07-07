import Link from "next/link";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import {
  loadCurrentDailyExecutiveBriefPacket,
  type CanonicalDailyBriefPacket,
  type DailyBriefMarkdownSection,
} from "@/lib/daily-briefs/canonical-packets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(value: string | null) {
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

export default async function IntelligenceBriefPage() {
  const canView = await canCurrentUserAccessAppCapability("view_executive_briefing");

  if (!canView) {
    return (
      <AppCapabilityAccessDenied
        title="Executive briefing"
        description="This executive briefing is limited to users with executive briefing access."
      />
    );
  }

  const packet = await loadCurrentDailyExecutiveBriefPacket();

  return (
    <PageShell
      variant="content"
      eyebrow={`${packet.businessDate} · ${packet.sourceCount} sources · intelligence_packets`}
      title="Executive Daily Brief"
      contentClassName="pb-16"
    >
      <div className="space-y-10">
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Compiled {formatDate(packet.generatedAt)} from the canonical
            daily-executive-brief packet.
          </p>
          {packet.executiveSummary && (
            <p className="max-w-4xl text-base leading-8 text-foreground">
              {packet.executiveSummary}
            </p>
          )}
        </section>

        {packet.sections.map((section) => (
          <BriefSection key={section.title} section={section} />
        ))}

        <SourceCoverage packet={packet} />

        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="font-medium">Canonical packet: </span>
          <Link
            href={`/daily-briefs/${packet.id}`}
            className="underline-offset-4 hover:underline"
          >
            Open saved packet
          </Link>
          {" · "}
          <Link href="/daily-briefs" className="underline-offset-4 hover:underline">
            History
          </Link>
          {" · "}
          <Link
            href="/executive/daily-deep-read-review"
            className="underline-offset-4 hover:underline"
          >
            Review candidates
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
