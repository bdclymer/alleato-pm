"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Mail, Plus } from "lucide-react";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { EmptyState } from "@/components/ds/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCreateProgressReport, useProgressReports } from "@/hooks/use-progress-reports";
import { formatProgressReportDate } from "@/lib/progress-reports/date-format";


function statusVariant(status: string) {
  switch (status) {
    case "sent":
      return "default";
    case "ready":
      return "secondary";
    default:
      return "outline";
  }
}

export function ProgressReportCreateAction({ projectId }: { projectId: number }) {
  const router = useRouter();
  const createMutation = useCreateProgressReport(projectId);

  async function handleCreateReport() {
    const result = await createMutation.mutateAsync({});
    router.push(`/${projectId}/progress-reports/${result.reportId}`);
  }

  return (
    <Button
      size="sm"
      className="gap-2"
      onClick={handleCreateReport}
      disabled={createMutation.isPending}
    >
      {createMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      Create This Week&apos;s Draft
    </Button>
  );
}

export function ProgressReportsClient({ projectId }: { projectId: number }) {
  const reportsQuery = useProgressReports(projectId);

  return (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <SectionRuleHeading label="Weekly client-ready drafts" className="mb-2" />
              <p className="text-sm text-muted-foreground">
                Each report starts from existing project signals, then remains fully editable by the PM.
              </p>
            </div>
          </div>

          {reportsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reports…
            </div>
          ) : reportsQuery.data?.reports.length ? (
            <div className="space-y-3">
              {reportsQuery.data.reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/${projectId}/progress-reports/${report.id}`}
                  className="block overflow-hidden rounded-xl border border-border bg-background p-4 transition-colors hover:border-foreground/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate text-sm font-semibold text-foreground">{report.title}</div>
                        <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                      </div>
                      <div className="truncate text-sm text-muted-foreground">
                        Week of{" "}
                        {formatProgressReportDate(report.week_start)} to{" "}
                        {formatProgressReportDate(report.week_end)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {report.selected_photo_count} photo{report.selected_photo_count === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {report.client_recipients.length} recipient{report.client_recipients.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileText />}
              title="No progress reports yet"
              description="Create this week's draft to start from meetings, emails, and uploaded photos."
            />
          )}
        </section>
  );
}
