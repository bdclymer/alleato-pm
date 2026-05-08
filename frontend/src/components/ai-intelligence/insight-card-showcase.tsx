"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Badge, StatusBadge } from "@/components/ds";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import type { ConfidenceLevel, InsightCard } from "@/lib/ai/intelligence/types";
import { cn } from "@/lib/utils";

const confidenceVariant: Record<ConfidenceLevel, "success" | "warning" | "error"> = {
  high: "success",
  medium: "warning",
  low: "error",
};

const confidenceDot: Record<ConfidenceLevel, string> = {
  high: "bg-status-success",
  medium: "bg-status-warning",
  low: "bg-status-error",
};

function formatLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function cleanInsightText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/(?:^|\s)#{1,6}\s+/gm, " ")
    .replace(/\*{1,3}([^*]*)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]*)_{1,3}/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "")
    .replace(/<\s*>/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
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

function CardFeedback({
  card,
  projectId,
}: {
  card: InsightCard;
  projectId: number;
}) {
  const [feedbackSignal, setFeedbackSignal] = useState<"wrong" | "stale" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  async function submitFeedback(signal: "useful" | "wrong" | "stale") {
    setFeedbackBusy(true);
    try {
      await apiFetch("/api/ai-assistant/packet-card-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          insightCardId: card.id,
          signal,
          reason:
            signal === "useful"
              ? "Card was marked useful from Project Intelligence."
              : feedbackText || null,
          correction: signal === "useful" ? null : feedbackText || null,
          cardSnapshot: {
            id: card.id,
            title: card.title,
            cardType: card.cardType,
            currentStatus: card.currentStatus,
            confidence: card.confidence,
            summary: card.summary,
            nextAction: card.nextAction,
            evidenceCount: card.evidence.length,
          },
          metadata: { projectId, surface: "project_intelligence_card" },
        }),
      });
      toast.success(signal === "useful" ? "Card feedback saved" : "Card review queued");
      setFeedbackSignal(null);
      setFeedbackText("");
    } catch (error) {
      toast.error("Could not save card feedback", {
        description: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={feedbackBusy}
          onClick={() => void submitFeedback("useful")}
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ThumbsUp className="h-3 w-3" />
          Useful
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={feedbackBusy}
          onClick={() => setFeedbackSignal("wrong")}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground",
            feedbackSignal === "wrong" && "text-foreground",
          )}
        >
          <ThumbsDown className="h-3 w-3" />
          Wrong
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={feedbackBusy}
          onClick={() => setFeedbackSignal("stale")}
          className={cn(
            "h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground",
            feedbackSignal === "stale" && "text-foreground",
          )}
        >
          <Clock className="h-3 w-3" />
          Stale
        </Button>
      </div>
      {feedbackSignal ? (
        <div className="space-y-2">
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={
              feedbackSignal === "wrong"
                ? "What should this card say instead?"
                : "What is stale or missing?"
            }
            className="min-h-20 text-sm"
          />
          <Button
            type="button"
            size="sm"
            disabled={feedbackBusy}
            onClick={() => void submitFeedback(feedbackSignal)}
          >
            Queue review
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function InsightAccordionItem({
  card,
  projectId,
  value,
}: {
  card: InsightCard;
  projectId: number;
  value: string;
}) {
  const summary = cleanInsightText(card.summary);
  const whyItMatters = cleanInsightText(card.whyItMatters);
  const nextAction = cleanInsightText(card.nextAction);
  const visibleEvidence = card.evidence.slice(0, 4);

  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="group py-4 hover:no-underline">
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", confidenceDot[card.confidence])}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground">
            {card.title}
          </span>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <span className="text-xs text-muted-foreground">{formatLabel(card.cardType)}</span>
            <StatusBadge
              status={formatLabel(card.currentStatus)}
              className="text-xs"
            />
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent>
        <div className="space-y-5 pb-2 pl-4">
          <div className="flex flex-wrap gap-2 sm:hidden">
            <span className="text-xs text-muted-foreground">{formatLabel(card.cardType)}</span>
            <StatusBadge status={formatLabel(card.currentStatus)} className="text-xs" />
            <StatusBadge
              status={formatLabel(card.confidence)}
              variant={confidenceVariant[card.confidence]}
              className="text-xs"
            />
          </div>

          {summary ? (
            <p className="text-sm leading-7 text-muted-foreground">{summary}</p>
          ) : null}

          {(whyItMatters || nextAction) ? (
            <div className="space-y-3 rounded-md bg-muted/40 px-4 py-3">
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
          ) : null}

          {visibleEvidence.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Evidence
              </p>
              <div className="divide-y divide-border">
                {visibleEvidence.map((evidence) => {
                  const sourceHref = buildEvidenceSourceHref(projectId, evidence);
                  const evidenceText = getEvidenceText(evidence);

                  return (
                    <div key={evidence.id} className="space-y-1 py-3 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formatLabel(evidence.sourceType)}
                        </Badge>
                        {sourceHref ? (
                          <Link
                            href={sourceHref}
                            className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            <span className="truncate">
                              {evidence.sourceTitle ?? "Untitled source"}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {evidence.sourceTitle ?? "Untitled source"}
                          </span>
                        )}
                        {evidence.sourceOccurredAt ? (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(evidence.sourceOccurredAt)}
                          </span>
                        ) : null}
                      </div>
                      {evidenceText ? (
                        <p className="text-xs leading-5 text-muted-foreground">{evidenceText}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <CardFeedback card={card} projectId={projectId} />
        </div>
      </AccordionContent>
    </AccordionItem>
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
    <section id="insight-cards" className="scroll-mt-16 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Insight cards
          <span className="ml-2 font-normal text-muted-foreground/60">{cards.length}</span>
        </p>
      </div>

      <Accordion type="multiple" className="w-full">
        {cards.map((card, index) => (
          <InsightAccordionItem
            key={card.id}
            card={card}
            projectId={projectId}
            value={`card-${index}`}
          />
        ))}
      </Accordion>
    </section>
  );
}
