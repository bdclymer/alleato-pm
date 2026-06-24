"use client";

import { Button } from "@/components/ui/button";
import { SectionRuleHeading } from "@/components/layout";
import { useSubmittalAIReview, type AIReviewResult } from "@/hooks/use-submittals";
import { appToast as toast } from "@/lib/toast/app-toast";
import { AlertTriangle, CheckCircle2, CircleHelp, Cpu, Sparkles, XCircle } from "lucide-react";

interface Props {
  projectId: number;
  submittalId: string;
}

type Finding = { item: string; drawingRef: string | null; detail: string };

function FindingRow({ icon, color, finding }: { icon: React.ReactNode; color: string; finding: Finding }) {
  return (
    <div className={`flex gap-2.5 rounded-md border px-3 py-2.5 ${color}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-foreground">{finding.item}</span>
          {finding.drawingRef && (
            <span className="text-xs text-muted-foreground shrink-0">{finding.drawingRef}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{finding.detail}</p>
      </div>
    </div>
  );
}

function ReviewFindings({ result }: { result: AIReviewResult }) {
  const { readiness, linkedDrawings, drawingsWereAutoMatched, findings } = result;

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
      {/* Drawings reviewed */}
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
        <div className="flex flex-wrap gap-1.5">
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

      {!findings ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Context ready — ask the AI assistant to analyze this submittal against the drawings.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary + recommendation */}
          <div className="space-y-1">
            <p className="text-sm text-foreground leading-relaxed">{findings.summary}</p>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
              findings.recommendation === "Approve"
                ? "bg-primary/10 text-primary"
                : findings.recommendation === "Approve with Comments"
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive"
            }`}>
              {findings.recommendation}
            </span>
          </div>

          {/* Compliant */}
          {findings.compliant.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Compliant ({findings.compliant.length})
              </p>
              <div className="space-y-1.5">
                {findings.compliant.map((f, i) => (
                  <FindingRow
                    key={i}
                    finding={f}
                    icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    color="border-primary/20 bg-primary/5"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Conflicts */}
          {findings.conflicts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Conflicts ({findings.conflicts.length})
              </p>
              <div className="space-y-1.5">
                {findings.conflicts.map((f, i) => (
                  <FindingRow
                    key={i}
                    finding={f}
                    icon={<XCircle className="h-3.5 w-3.5 text-destructive" />}
                    color="border-destructive/20 bg-destructive/5"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Missing */}
          {findings.missing.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Missing ({findings.missing.length})
              </p>
              <div className="space-y-1.5">
                {findings.missing.map((f, i) => (
                  <FindingRow
                    key={i}
                    finding={f}
                    icon={<CircleHelp className="h-3.5 w-3.5 text-warning" />}
                    color="border-warning/20 bg-warning/5"
                  />
                ))}
              </div>
            </div>
          )}
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
            Compare this submittal against linked project drawings.
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
          <ReviewFindings result={reviewMutation.data} />
        )}
      </div>
    </div>
  );
}
