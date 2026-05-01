import type { ComponentType } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Mail,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageShell, SectionRuleHeading } from "@/components/layout";
import {
  generateBrandonDailyUpdate,
  type BrandonBriefItem,
  type BrandonBriefSourceCoverage,
} from "@/lib/executive/brandon-daily-update";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Tone = NonNullable<BrandonBriefItem["tone"]>;

const toneStyles: Record<Tone, string> = {
  neutral: "border-border bg-background text-foreground",
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  watch: "border-amber-200 bg-amber-50 text-amber-950",
  risk: "border-red-200 bg-red-50 text-red-950",
};

const toneDotStyles: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  good: "bg-emerald-500",
  watch: "bg-amber-500",
  risk: "bg-red-500",
};

const sourceIcons: Record<
  BrandonBriefSourceCoverage["label"],
  ComponentType<{ className?: string }>
> = {
  Email: Mail,
  Teams: MessageSquareText,
  Meeting: UsersRound,
  Document: FileText,
};

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SourceMeta({ item }: { item: BrandonBriefItem }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{item.source}</span>
      <span>{item.sourceDetail}</span>
      <span>{item.date}</span>
      <span className="font-medium text-foreground">{item.project}</span>
      {item.retrieval ? <span>{item.retrieval}</span> : null}
    </div>
  );
}

function StatusBadge({ item }: { item: BrandonBriefItem }) {
  const tone = item.tone ?? "neutral";

  if (!item.status) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", toneDotStyles[tone])} />
      {item.status}
    </span>
  );
}

function InsightSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: BrandonBriefItem[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionRuleHeading label={title} className="mb-0 pb-0" />
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="divide-y divide-border">
          {items.length > 0 ? (
            items.map((item) => (
              <article
                key={`${item.project}-${item.title}-${item.sourceDetail}`}
                className="group grid gap-4 p-4 transition-colors duration-150 hover:bg-muted/30 lg:grid-cols-[minmax(0,1fr)_180px]"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1 text-sm font-semibold leading-6 text-foreground">
                      {item.title}
                    </div>
                    <StatusBadge item={item} />
                  </div>
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    {item.summary}
                  </p>
                  <SourceMeta item={item} />
                </div>
                <div className="flex items-start justify-between gap-3 lg:justify-end">
                  {item.owner ? (
                    <div className="text-left lg:text-right">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Owner
                      </div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {item.owner}
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              No current RAG-backed items met the source, recency, and confidence thresholds.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SourceCoverage({
  sources,
}: {
  sources: BrandonBriefSourceCoverage[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <SectionRuleHeading label="Source Coverage" className="mb-0 pb-0" />
        <p className="mt-1 text-sm text-muted-foreground">
          Shows what the briefing checked before surfacing the summary.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-background">
        <div className="divide-y divide-border">
          {sources.map((source) => {
            const Icon = sourceIcons[source.label];

            return (
              <div key={source.label} className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">{source.label}</div>
                    <div className="text-sm font-semibold text-foreground">{source.count}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{source.detail}</span>
                    <span>Latest {source.latest}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RetrievalOrder({
  order,
  notes,
}: {
  order: string[];
  notes: string[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <SectionRuleHeading label="Retrieval Order" className="mb-0 pb-0" />
        <p className="mt-1 text-sm text-muted-foreground">
          The generator searches raw, recent business sources before broad knowledge.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="space-y-3">
          {order.map((step) => (
            <div key={step} className="text-sm text-foreground">
              {step}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {notes.map((note) => (
            <div key={note} className="text-sm leading-6 text-muted-foreground">
              {note}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TomorrowWatchlist() {
  return (
    <section className="space-y-4">
      <div>
        <SectionRuleHeading label="Carry Forward" className="mb-0 pb-0" />
        <p className="mt-1 text-sm text-muted-foreground">
          Items that should remain visible until they are explicitly resolved.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="space-y-4">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Open compliance blockers</div>
              <div className="text-sm text-muted-foreground">
                Keep permit, insurance, license, and COI items visible until acceptance is confirmed.
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Finance follow-ups</div>
              <div className="text-sm text-muted-foreground">
                Carry wire forms, subcontractor payment checks, retainage, and draw questions until closed.
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Source confidence</div>
              <div className="text-sm text-muted-foreground">
                Recent chunk-backed results lead this brief because broad knowledge can rank stale insights too high.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function ExecutiveDailyInsightsPage() {
  const packet = await generateBrandonDailyUpdate({ windowDays: 2 });
  const generatedAt = formatGeneratedAt(packet.generatedAt);
  const decisionQueue = [
    {
      label: "Needs Brandon",
      value: String(packet.sections.needsBrandon.length),
      tone: "risk",
    },
    {
      label: "Waiting on others",
      value: String(packet.sections.waitingOnOthers.length),
      tone: "watch",
    },
    {
      label: "Important updates",
      value: String(packet.sections.importantUpdates.length),
      tone: "good",
    },
    {
      label: "Source window",
      value: `${packet.windowDays * 24}h`,
      tone: "neutral",
    },
  ] satisfies Array<{ label: string; value: string; tone: Tone }>;

  return (
    <PageShell
      variant="dashboard"
      title="Executive Daily Insights"
      description="RAG-backed Brandon daily update from recent Supabase document chunks and metadata."
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            Live RAG
          </Badge>
        </div>
      }
      contentClassName="space-y-8"
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              Manual review
            </Badge>
            <span className="text-sm text-muted-foreground">
              RAG queries run {generatedAt} against the last {packet.windowDays} days
            </span>
          </div>
          <div className="max-w-4xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Brandon has {packet.sections.needsBrandon.length} items that need direct confirmation.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              This page now uses the reusable Brandon daily update generator. It searches email first, then Teams, then meetings, then recent metadata fallback so raw business activity outranks stale broad knowledge.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Review Readiness</div>
              <div className="mt-1 text-sm text-muted-foreground">RAG source, date, and owner included</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-status-success" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {decisionQueue.map((metric) => (
              <div key={metric.label} className="space-y-1 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", toneDotStyles[metric.tone])} />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <div className="text-2xl font-semibold text-foreground">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <InsightSection
            title="Needs Brandon's Attention"
            description="Items where Brandon or his immediate support team needs to confirm, decide, or close the loop."
            items={packet.sections.needsBrandon}
          />
          <InsightSection
            title="Waiting on Others"
            description="Items that matter to Brandon but are currently waiting on vendors, finance, estimating, or the project team."
            items={packet.sections.waitingOnOthers}
          />
          <InsightSection
            title="Important Issues and Updates"
            description="Business issues worth seeing without turning this into a noisy project-status report."
            items={packet.sections.importantUpdates}
          />
        </div>
        <aside className="space-y-8 lg:sticky lg:top-6 lg:self-start">
          <SourceCoverage sources={packet.sourceCoverage} />
          <RetrievalOrder order={packet.retrievalOrder} notes={packet.retrievalNotes} />
          <TomorrowWatchlist />
          <section className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertTriangle className="h-4 w-4 text-status-warning" />
              Fail Loudly Rule
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This should not graduate into an automated send if rows are missing source, date, owner, or confidence. Missing attribution becomes an empty or error state, not hidden copy.
            </p>
          </section>
        </aside>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CircleDot className="mt-1 h-4 w-4 text-muted-foreground" />
          <div>
            <SectionRuleHeading
              label="Recommended next automation"
              className="mb-0 pb-0"
            />
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Keep this as a manual review page until the output is consistently useful, then schedule the same generator to create a draft digest for approval.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full">
          Reusable generator
        </Badge>
      </section>
    </PageShell>
  );
}
