"use client";

import { Button } from "@/components/ui/button";
import { SectionRuleHeading } from "@/components/layout";
import { useSubmittalAIReview, type AIReviewResult } from "@/hooks/use-submittals";
import { appToast as toast } from "@/lib/toast/app-toast";
import { AlertTriangle, CheckCircle2, Cpu, Sparkles } from "lucide-react";

interface Props {
  projectId: number;
  submittalId: string;
}

function ReviewResults({ result }: { result: AIReviewResult }) {
  const { readiness, comparisonContext, linkedDrawings, drawingsWereAutoMatched } = result;

  if (!readiness.canCompare) {
    return (
      <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            {readiness.missingSubmittalText && <p>{readiness.missingSubmittalText}</p>}
            {readiness.missingDrawingText && <p>{readiness.missingDrawingText}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drawing coverage */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Drawings Reviewed
          </p>
          {drawingsWereAutoMatched && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              AI-matched
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {linkedDrawings.map((d, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
                d.hasVectorizedContent
                  ? "border-primary/30 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {d.hasVectorizedContent && <Cpu className="h-3 w-3" />}
              {d.drawingNumber}
            </span>
          ))}
        </div>
      </div>

      {/* Submittal text excerpt */}
      {comparisonContext.submittalText && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Submittal Content</p>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-foreground leading-relaxed max-h-36 overflow-y-auto">
            {comparisonContext.submittalText.slice(0, 800)}
            {comparisonContext.submittalText.length > 800 && "…"}
          </div>
        </div>
      )}

      {/* Drawing text excerpt */}
      {comparisonContext.drawingText && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Drawing Content</p>
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-foreground leading-relaxed max-h-36 overflow-y-auto">
            {comparisonContext.drawingText.slice(0, 800)}
            {comparisonContext.drawingText.length > 800 && "…"}
          </div>
        </div>
      )}

      {/* Additional relevant chunks */}
      {comparisonContext.additionalRelevantDrawingChunks?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Additional Relevant Drawing Sections</p>
          <div className="space-y-2">
            {comparisonContext.additionalRelevantDrawingChunks.slice(0, 3).map((chunk, i) => (
              <div key={i} className="rounded-md border border-border px-3 py-2">
                <p className="text-xs font-medium text-foreground">{chunk.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{chunk.excerpt.slice(0, 200)}{chunk.excerpt.length > 200 && "…"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next step guidance */}
      {result.nextStep && (
        <div className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <p>{result.nextStep}</p>
        </div>
      )}
    </div>
  );
}

export function SubmittalAIReviewPanel({ projectId, submittalId }: Props) {
  const reviewMutation = useSubmittalAIReview(projectId, submittalId);

  async function handleRunReview() {
    try {
      await reviewMutation.mutateAsync({});
    } catch {
      toast.error("AI review failed — please try again");
    }
  }

  return (
    <div className="space-y-4">
      <SectionRuleHeading label="AI Review" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Compare this submittal against relevant project drawings.
          </p>
          <Button
            size="sm"
            onClick={handleRunReview}
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending ? "Running…" : "Run AI Review"}
          </Button>
        </div>

        {reviewMutation.data && (
          <ReviewResults result={reviewMutation.data} />
        )}
      </div>
    </div>
  );
}
