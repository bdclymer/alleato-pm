"use client";

import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ds/text";
import type { FmGlobalSpecInput, FmGlobalSubmissionSummary } from "@/types/fm-global";

interface FmGlobalSubmissionsProps {
  submissions: FmGlobalSubmissionSummary[];
  onLoadSubmission: (submission: FmGlobalSubmissionSummary) => void;
}

function summarizeInput(input: FmGlobalSpecInput): string {
  return `${input.asrs_type} • ${input.system_type} • ${input.ceiling_height_ft}ft`;
}

/**
 * Recent FM Global spec submissions (global).
 */
export function FmGlobalSubmissions({
  submissions,
  onLoadSubmission,
}: FmGlobalSubmissionsProps): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Submissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {submissions.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No submissions yet. Run your first match to save a submission.
          </div>
        )}
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="rounded-lg border border-border/70 p-4"
          >
            <Text className="font-medium">
              {submission.user_input
                ? summarizeInput(submission.user_input)
                : "Unknown input"}
            </Text>
            <Text size="sm" tone="muted">
              {submission.created_at
                ? new Date(submission.created_at).toLocaleString()
                : "—"}
            </Text>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLoadSubmission(submission)}
              >
                Load
              </Button>
              {submission.selected_configuration && (
                <Badge variant="secondary">Configuration Selected</Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
