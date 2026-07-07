"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button, ErrorState, SectionHeader } from "@/components/ds";
import {
  SourceReferenceButton,
  type SourceReferenceRecord,
} from "@/components/ai-intelligence/source-reference-button";
import { apiFetch } from "@/lib/api-client";

export type DailyDeepReadReviewCandidate = {
  id: string;
  signalType: string;
  status: "needs_review" | "candidate";
  title: string;
  summary: string | null;
  nextAction: string | null;
  confidence: string;
  sources: Array<{
    label: string;
    record: SourceReferenceRecord;
  }>;
};

type ReviewResponse = {
  ok: boolean;
  action: "accept" | "reject";
  candidate: { id: string; status: string };
  packetId: string;
};

type PromoteResponse = {
  ok: boolean;
  kind: "task" | "insight_card";
  createdRecordId: string;
};

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function DailyDeepReadCandidateReview({
  candidates,
  error,
  projectId,
}: {
  candidates: DailyDeepReadReviewCandidate[];
  error: string | null;
  projectId: number;
}) {
  const [visibleCandidates, setVisibleCandidates] = React.useState(candidates);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setVisibleCandidates(candidates);
  }, [candidates]);

  const reviewCandidate = React.useCallback(
    async (candidateId: string, action: "accept" | "reject") => {
      setBusyId(candidateId);
      try {
        await apiFetch<ReviewResponse>(
          `/api/projects/${projectId}/intelligence/daily-deep-read-candidates/${candidateId}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        setVisibleCandidates((current) => {
          if (action === "reject") {
            return current.filter((candidate) => candidate.id !== candidateId);
          }
          return current.map((candidate) =>
            candidate.id === candidateId
              ? { ...candidate, status: "candidate" }
              : candidate,
          );
        });
        toast.success(
          action === "accept"
            ? "Daily Deep Read candidate ready to promote"
            : "Daily Deep Read candidate rejected",
        );
      } catch (reviewError) {
        toast.error("Candidate review failed", {
          description:
            reviewError instanceof Error
              ? reviewError.message
              : "Unexpected error",
        });
      } finally {
        setBusyId(null);
      }
    },
    [projectId],
  );

  const promoteCandidate = React.useCallback(
    async (candidateId: string) => {
      setBusyId(candidateId);
      try {
        const response = await apiFetch<PromoteResponse>(
          `/api/projects/${projectId}/intelligence/daily-deep-read-candidates/${candidateId}/promote`,
          { method: "POST" },
        );
        setVisibleCandidates((current) =>
          current.filter((candidate) => candidate.id !== candidateId),
        );
        toast.success(
          response.kind === "task"
            ? "Promoted to project task"
            : "Promoted to project intelligence",
        );
      } catch (promotionError) {
        toast.error("Candidate promotion failed", {
          description:
            promotionError instanceof Error
              ? promotionError.message
              : "Unexpected error",
        });
      } finally {
        setBusyId(null);
      }
    },
    [projectId],
  );

  if (visibleCandidates.length === 0 && !error) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Daily Deep Read candidates" />
      <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
        Review-gated updates from the full-source Daily Deep Read. Accepting
        keeps the candidate ready for promotion; rejecting removes it from the
        live review queue.
      </p>
      {error ? (
        <ErrorState
          title="Daily Deep Read candidate queue could not load"
          error={error}
          className="items-start justify-start gap-2 py-2 text-left"
        />
      ) : null}
      {visibleCandidates.length > 0 ? (
        <div className="divide-y divide-border/60">
          {visibleCandidates.map((candidate) => {
            const busy = busyId === candidate.id;
            return (
              <article
                key={candidate.id}
                className="space-y-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {candidate.title}
                      </p>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {formatLabel(candidate.signalType)} ·{" "}
                        {formatLabel(candidate.confidence)} ·{" "}
                        {candidate.status === "candidate"
                          ? "Ready to promote"
                          : "Needs review"}
                      </span>
                    </div>
                    {candidate.summary ? (
                      <p className="text-sm leading-6 text-muted-foreground">
                        {candidate.summary}
                      </p>
                    ) : null}
                    {candidate.nextAction ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        Next: {candidate.nextAction}
                      </p>
                    ) : null}
                  </div>
                  {candidate.status === "candidate" ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void promoteCandidate(candidate.id)}
                      >
                        Promote
                      </Button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void reviewCandidate(candidate.id, "reject")}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void reviewCandidate(candidate.id, "accept")}
                      >
                        Accept
                      </Button>
                    </div>
                  )}
                </div>
                {candidate.sources.length > 0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    {candidate.sources.map((source) => (
                      <SourceReferenceButton
                        key={source.record.id}
                        projectId={projectId}
                        source={source.record}
                        buttonLabel={source.label}
                      />
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
