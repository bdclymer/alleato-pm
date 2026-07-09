import type { Metadata } from "next";

import { AppCapabilityAccessDenied } from "@/components/guards/app-capability-access-denied";
import { SectionRuleHeading } from "@/components/layout";
import { canCurrentUserAccessAppCapability } from "@/lib/app-capabilities";
import {
  loadCurrentDailyExecutiveBriefPacket,
  type CanonicalDailyBriefPacket,
} from "@/lib/daily-briefs/canonical-packets";
import { BriefMarkdown } from "@/features/daily-briefs/brief-markdown";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Daily Executive Brief",
  description:
    "Owner-facing daily executive brief — the canonical deep-read synthesis of the day's meetings, email, Teams, and documents.",
};

function formatBusinessDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

function formatGeneratedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(date);
}

function BriefMasthead({ packet }: { packet: CanonicalDailyBriefPacket }) {
  const generated = formatGeneratedAt(packet.generatedAt);
  return (
    <header className="space-y-3 border-b border-border pb-8">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Daily Executive Brief · Prepared for Brandon
      </div>
      <div className="text-3xl font-semibold tracking-tight text-foreground">
        {formatBusinessDate(packet.businessDate)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {packet.sourceCount} source{packet.sourceCount === 1 ? "" : "s"}{" "}
          synthesized
        </span>
        {generated ? <span>Compiled {generated} ET</span> : null}
        <span>AI-assisted — verify before acting</span>
      </div>
    </header>
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

/**
 * Standalone, owner-facing Daily Executive Brief.
 *
 * Renders the **canonical** brief — the gpt-5.5 deep-read synthesis stored in
 * `intelligence_packets` (target `daily-executive-brief`), the same source of
 * truth as the `/daily-briefs` history list and detail view. There is exactly
 * one Daily Executive Brief pipeline; this page shows its most recent `current`
 * packet.
 *
 * Access is gated by the `view_executive_briefing` capability — the brief
 * exposes owner-level financials, schedule risk, and project detail.
 */
export default async function DailyBriefPage() {
  const canViewExecutiveBriefing = await canCurrentUserAccessAppCapability(
    "view_executive_briefing",
  );

  if (!canViewExecutiveBriefing) {
    return (
      <AppCapabilityAccessDenied
        title="Daily Executive Brief"
        description="This executive brief is limited to users with executive briefing access."
      />
    );
  }

  let packet: CanonicalDailyBriefPacket | null = null;
  let loadError: string | null = null;
  try {
    packet = await loadCurrentDailyExecutiveBriefPacket();
  } catch (error) {
    // Fail loudly to the server logs, then show a clear state — never a blank
    // or fabricated brief.
    console.error("[daily-brief] failed to load canonical packet", error);
    loadError =
      error instanceof Error && /No canonical/.test(error.message)
        ? "Today's brief hasn't been generated yet."
        : "Couldn't load today's brief.";
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8">
        {packet ? (
          <article className="space-y-10">
            <BriefMasthead packet={packet} />
            {packet.sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <SectionRuleHeading label={section.title} />
                <BriefMarkdown content={section.body} />
              </section>
            ))}
            <SourceCoverage packet={packet} />
          </article>
        ) : (
          <div className="space-y-2 py-24 text-center">
            <div className="text-lg font-semibold text-foreground">
              {loadError ?? "No brief available yet"}
            </div>
            <p className="text-sm text-muted-foreground">
              The daily executive brief is compiled from the day&apos;s
              meetings, email, Teams, and documents. Check back after the next
              scheduled run.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
