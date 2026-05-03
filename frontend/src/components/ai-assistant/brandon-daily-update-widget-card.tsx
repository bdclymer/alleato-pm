"use client";

import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionRuleHeading } from "@/components/layout";
import type {
  BrandonBriefItem,
  BrandonDailyUpdatePacket,
} from "@/lib/executive/brandon-daily-update";
import { cn } from "@/lib/utils";

type Tone = NonNullable<BrandonBriefItem["tone"]>;

const toneStyles: Record<Tone, string> = {
  neutral: "border-border bg-background text-foreground",
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  watch: "border-amber-200 bg-amber-50 text-amber-950",
  risk: "border-red-200 bg-red-50 text-red-950",
};

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function metricTone(count: number, variant: "danger" | "warning" | "info"): string {
  if (variant === "danger") return count > 0 ? "text-red-700" : "text-muted-foreground";
  if (variant === "warning") return count > 0 ? "text-amber-700" : "text-muted-foreground";
  return count > 0 ? "text-blue-700" : "text-muted-foreground";
}

function Section({
  title,
  items,
}: {
  title: string;
  items: BrandonBriefItem[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionRuleHeading label={title} className="mb-0 pb-0" />
        <Badge variant="outline">{items.length}</Badge>
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <article
              key={`${item.sourceId ?? item.title}-${item.date}`}
              className="rounded-xl border border-border bg-background px-4 py-3"
            >
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[item.project, item.source, item.date].filter(Boolean).join(" • ")}
                  </div>
                </div>
                {item.status ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      toneStyles[item.tone ?? "neutral"],
                    )}
                  >
                    {item.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">{item.summary}</p>
              {item.bullets.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {item.bullets.slice(0, 2).map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {item.recommendedAction ? (
                <div className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Recommended move:</span>{" "}
                  {item.recommendedAction}
                </div>
              ) : null}
              {(Array.isArray(item.citations) && item.citations.length > 0) || item.sourceUrl ? (
                <div className="mt-3 space-y-1">
                  {(Array.isArray(item.citations) && item.citations.length > 0
                    ? item.citations
                    : [{
                        source: item.source,
                        sourceDetail: item.sourceDetail,
                        sourceUrl: item.sourceUrl,
                        sourceId: item.sourceId,
                        evidence: item.evidence,
                        date: item.date,
                      }]
                  ).map((citation, idx) => (
                    <div
                      key={`${citation.sourceId ?? citation.sourceUrl ?? citation.sourceDetail}-${idx}`}
                      className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">{citation.source}</span>
                      {citation.sourceDetail ? <span>· {citation.sourceDetail}</span> : null}
                      {citation.sourceUrl ? (
                        <a
                          href={citation.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          View source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No current items in this section.
        </div>
      )}
    </section>
  );
}

export function BrandonDailyUpdateWidgetCard({
  packet,
}: {
  packet: BrandonDailyUpdatePacket;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-base font-semibold text-foreground">Daily update for Brandon</div>
          <p className="mt-1 text-sm text-muted-foreground">
            What needs a decision, what is blocked on others, and what changed across the business.
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            Updated {formatGeneratedAt(packet.generatedAt)} • last {packet.windowDays} day(s)
          </div>
        </div>
        <Link
          href="/executive"
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Open executive brief
          <FileText className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <div className={cn("text-lg font-semibold", metricTone(packet.sections.needsBrandon.length, "danger"))}>
            {packet.sections.needsBrandon.length}
          </div>
          <div className="text-sm text-muted-foreground">Needs Brandon</div>
        </div>
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <div className={cn("text-lg font-semibold", metricTone(packet.sections.waitingOnOthers.length, "warning"))}>
            {packet.sections.waitingOnOthers.length}
          </div>
          <div className="text-sm text-muted-foreground">Waiting on others</div>
        </div>
        <div className="rounded-xl border border-border bg-background px-4 py-3">
          <div className={cn("text-lg font-semibold", metricTone(packet.sections.importantUpdates.length, "info"))}>
            {packet.sections.importantUpdates.length}
          </div>
          <div className="text-sm text-muted-foreground">Critical updates</div>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <Section title="Action items for him" items={packet.sections.needsBrandon} />
        <Section title="Things he is waiting on" items={packet.sections.waitingOnOthers} />
        <Section title="Critical business updates" items={packet.sections.importantUpdates} />
      </div>
    </div>
  );
}
