"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { Badge, InfoAlert, SectionHeader, StatusBadge } from "@/components/ds";
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogSubtitle,
  MorphingDialogTitle,
  MorphingDialogTrigger,
} from "@/components/motion/morphing-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConfidenceLevel, InsightCard } from "@/lib/ai/intelligence/types";
import { cn } from "@/lib/utils";

const confidenceVariant: Record<ConfidenceLevel, "success" | "warning" | "error"> = {
  high: "success",
  medium: "warning",
  low: "error",
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
    month: "long",
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

function cleanInsightText(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

type ParsedEmailPreview = {
  subject: string | null;
  date: string | null;
  from: string | null;
  to: string | null;
  body: string;
};

function parseEmailPreview(value: string): ParsedEmailPreview {
  const text = cleanInsightText(value);
  if (!text.startsWith("Subject:")) {
    return { subject: null, date: null, from: null, to: null, body: text };
  }

  const subjectMatch = text.match(/^Subject:\s*(.*?)\s+Date:\s*/);
  const dateMatch = text.match(/\sDate:\s*(.*?)\s+From:\s*/);
  const fromMatch = text.match(/\sFrom:\s*(.*?)\s+To:\s*/);
  const toMatch = text.match(/\sTo:\s*(.*?(?:>|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}))(?:\s+|$)(.*)$/);

  return {
    subject: subjectMatch?.[1]?.trim() ?? null,
    date: dateMatch?.[1]?.trim() ?? null,
    from: fromMatch?.[1]?.trim() ?? null,
    to: toMatch?.[1]?.trim() ?? null,
    body: cleanInsightText(toMatch?.[2] ?? text),
  };
}

function formatParticipant(value: string): string {
  const nameMatch = value.match(/^(.+?)\s*<[^>]+>$/);
  return cleanInsightText(nameMatch?.[1] ?? value);
}

function ParticipantRoute({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}) {
  if (!from && !to) return null;

  return (
    <div className="min-w-0">
      <dt className="font-semibold uppercase tracking-[0.08em]">Participants</dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-1.5 text-foreground/80">
        {from ? (
          <>
            <span className="shrink-0 text-muted-foreground">From</span>
            <span className="min-w-0 truncate">{formatParticipant(from)}</span>
          </>
        ) : null}
        {from && to ? (
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : null}
        {to ? (
          <>
            <span className="shrink-0 text-muted-foreground">To</span>
            <span className="min-w-0 truncate">{formatParticipant(to)}</span>
          </>
        ) : null}
      </dd>
    </div>
  );
}

function EmailPreviewText({ summary }: { summary: string }) {
  const parsed = parseEmailPreview(summary);

  if (!parsed.subject && !parsed.date && !parsed.from && !parsed.to) {
    return (
      <p className="mt-5 line-clamp-5 text-base leading-7 text-muted-foreground">
        {parsed.body}
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <dl className="grid grid-cols-1 gap-y-2 text-xs text-muted-foreground">
        {parsed.subject ? (
          <div className="min-w-0">
            <dt className="font-semibold uppercase tracking-[0.08em]">Subject</dt>
            <dd className="mt-0.5 truncate text-foreground/80">{parsed.subject}</dd>
          </div>
        ) : null}
        {parsed.date ? (
          <div className="min-w-0">
            <dt className="font-semibold uppercase tracking-[0.08em]">Date</dt>
            <dd className="mt-0.5 truncate text-foreground/80">{formatDateTime(parsed.date)}</dd>
          </div>
        ) : null}
        <ParticipantRoute from={parsed.from} to={parsed.to} />
      </dl>
      {parsed.body ? (
        <p className="line-clamp-4 text-base leading-7 text-muted-foreground">{parsed.body}</p>
      ) : null}
    </div>
  );
}

function SignalStatusRow({ card }: { card: InsightCard }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success">
        <span className="h-1.5 w-1.5 rounded-full bg-status-success" aria-hidden="true" />
        {formatLabel(card.confidence)}
      </span>
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        {formatLabel(card.currentStatus)}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-foreground transition-transform group-hover:translate-x-1" />
    </div>
  );
}

function buildEvidenceSourceHref(
  projectId: number,
  evidence: InsightCard["evidence"][number],
): string | null {
  if (!evidence.sourceDocumentId) return null;
  return `/${projectId}/intelligence/sources/${encodeURIComponent(evidence.sourceDocumentId)}`;
}

function getEvidenceText(evidence: InsightCard["evidence"][number]): string {
  return cleanInsightText(evidence.summary || evidence.excerpt || evidence.relevanceReason);
}

function InsightArticleCard({
  card,
  projectId,
  featured,
}: {
  card: InsightCard;
  projectId: number;
  featured: boolean;
}) {
  const summary = cleanInsightText(card.summary);
  const whyItMatters = cleanInsightText(card.whyItMatters);
  const nextAction = cleanInsightText(card.nextAction);
  const visibleEvidence = card.evidence.slice(0, 3);

  return (
    <MorphingDialog
      transition={{
        type: "spring",
        stiffness: 210,
        damping: 26,
      }}
    >
      <MorphingDialogTrigger
        className={cn(
          "group flex h-full min-h-80 w-full flex-col items-start bg-background p-8 text-left transition-colors hover:bg-muted/20",
          featured ? "shadow-sm shadow-foreground/10" : "border border-border",
        )}
      >
        <div className="mb-6 flex w-full min-w-0 items-center justify-between gap-4">
          <MorphingDialogSubtitle className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {formatLabel(card.cardType)}
          </MorphingDialogSubtitle>
          <SignalStatusRow card={card} />
        </div>

        <MorphingDialogTitle className="text-xl font-semibold leading-snug text-foreground">
          {card.title}
        </MorphingDialogTitle>

        <EmailPreviewText summary={summary} />
      </MorphingDialogTrigger>

      <MorphingDialogContainer>
        <MorphingDialogContent className="relative w-full max-w-3xl overflow-hidden bg-background shadow-sm">
          <ScrollArea className="max-h-screen" type="scroll">
            <div className="p-8">
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{formatLabel(card.cardType)}</Badge>
                <StatusBadge status={formatLabel(card.confidence)} variant={confidenceVariant[card.confidence]} />
                <StatusBadge status={formatLabel(card.currentStatus)} />
              </div>

              <MorphingDialogSubtitle className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {formatLabel(card.cardType)}
              </MorphingDialogSubtitle>
              <MorphingDialogTitle className="mt-3 text-3xl font-semibold leading-tight text-foreground">
                {card.title}
              </MorphingDialogTitle>

              <MorphingDialogDescription
                className="mt-6 space-y-6"
                variants={{
                  initial: { opacity: 0, y: 24 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: 24 },
                }}
              >
                <EmailPreviewText summary={summary} />

                {(whyItMatters || nextAction) ? (
                  <InfoAlert
                    variant="info"
                    icon={false}
                    className="block border-0 bg-muted/40 px-4 py-3 text-foreground"
                  >
                    <div className="space-y-3">
                      {whyItMatters ? (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            Why it matters
                          </p>
                          <p className="text-sm leading-6 text-foreground">{whyItMatters}</p>
                        </div>
                      ) : null}
                      {nextAction ? (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            Next action
                          </p>
                          <p className="text-sm leading-6 text-foreground">{nextAction}</p>
                        </div>
                      ) : null}
                    </div>
                  </InfoAlert>
                ) : null}

                {visibleEvidence.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Evidence
                    </p>
                    <div className="divide-y divide-border">
                      {visibleEvidence.map((evidence) => {
                        const sourceHref = buildEvidenceSourceHref(projectId, evidence);
                        const evidenceText = getEvidenceText(evidence);

                        return (
                          <div key={evidence.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{formatLabel(evidence.sourceType)}</Badge>
                              {sourceHref ? (
                                <Link
                                  href={sourceHref}
                                  className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                                >
                                  <span className="truncate">
                                    {evidence.sourceTitle ?? "Untitled source"}
                                  </span>
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                </Link>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {evidence.sourceTitle ?? "Untitled source"}
                                </span>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {formatDate(evidence.sourceOccurredAt)}
                              </span>
                            </div>
                            {evidenceText ? (
                              <p className="text-sm leading-6 text-muted-foreground">{evidenceText}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </MorphingDialogDescription>
            </div>
          </ScrollArea>
          <MorphingDialogClose className="text-muted-foreground hover:text-foreground" />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

export function InsightCardShowcase({
  cards,
  projectId,
}: {
  cards: InsightCard[];
  projectId: number;
}) {
  if (cards.length === 0) return null;

  return (
    <section id="insight-cards" className="scroll-mt-16 space-y-8">
      <div className="flex items-end justify-between gap-4">
        <SectionHeader title="Insight Cards" count={cards.length} />
        <a
          href="#source-window"
          className="text-sm font-semibold text-foreground underline underline-offset-8"
        >
          View sources
        </a>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => (
          <InsightArticleCard
            key={card.id}
            card={card}
            projectId={projectId}
            featured={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
