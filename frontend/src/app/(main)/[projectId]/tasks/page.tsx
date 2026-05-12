export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout";
import { createServiceClient } from "@/lib/supabase/service";
import { TasksInboxClient } from "@/features/tasks/tasks-inbox-client";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = Number.parseInt(projectId, 10);

  if (Number.isNaN(numericProjectId)) {
    notFound();
  }

  const supabase = createServiceClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", numericProjectId)
    .single();

  if (error || !project) {
    notFound();
  }

  return (
    <PageShell
      variant="table"
      title="Tasks"
      showHeader={false}
      contentClassName="space-y-0 pt-0 pb-0"
      fillHeight
    >
      <TasksInboxClient projectId={projectId} projectName={project.name} />
    </PageShell>
  );
}
