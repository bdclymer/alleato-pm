import { PageShell } from "@/components/layout";
import { ProgressReportEditor } from "./progress-report-editor";

export default async function ProgressReportDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; reportId: string }>;
}) {
  const { projectId, reportId } = await params;
  return (
    <PageShell
      variant="detailWide"
      title="Progress Report"
      description="Review the weekly client report, then edit only when changes are needed."
    >
      <ProgressReportEditor
        projectId={Number.parseInt(projectId, 10)}
        reportId={reportId}
      />
    </PageShell>
  );
}
