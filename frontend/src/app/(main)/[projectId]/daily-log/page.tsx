import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { DailyLogClient } from "./daily-log-client";
import { PageContainer, ProjectPageHeader } from "@/components/layout";

export default async function ProjectDailyLogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { numericProjectId, supabase } = await getProjectInfo(projectId);

  const { data: dailyLogs, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("project_id", numericProjectId)
    .order("log_date", { ascending: false });

  if (error) {
    return (
      <>
        <ProjectPageHeader title="Daily Log" />
        <PageContainer>
          <p className="text-center text-destructive py-6">
            Error loading daily logs. Please try again later.
          </p>
        </PageContainer>
      </>
    );
  }

  return <DailyLogClient projectId={projectId} dailyLogs={dailyLogs || []} />;
}
