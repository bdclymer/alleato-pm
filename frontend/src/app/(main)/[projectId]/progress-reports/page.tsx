import { PageShell } from "@/components/layout";
import {
  ProgressReportCreateAction,
  ProgressReportsClient,
} from "./progress-reports-client";

export default async function ProgressReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = Number.parseInt(projectId, 10);

  return (
    <PageShell
      variant="content"
      title="Progress Reports"
      description="Create editable weekly client reports from recent meetings, emails, and project photos."
      actions={<ProgressReportCreateAction projectId={numericProjectId} />}
    >
      <ProgressReportsClient projectId={numericProjectId} />
    </PageShell>
  );
}
