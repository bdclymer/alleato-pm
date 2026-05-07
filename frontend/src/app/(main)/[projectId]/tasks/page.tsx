export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout";
import { TasksTableClient } from "@/features/tasks/tasks-table-client";
import { mapTaskRow, type JoinedTaskRow } from "@/features/tasks/task-utils";
import { createServiceClient } from "@/lib/supabase/service";

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

  const [
    projectResult,
    tasksByProjectIdsResult,
    tasksByProjectIdResult,
    tasksViaDocsResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name")
      .eq("id", numericProjectId)
      .single(),
    supabase
      .from("tasks")
      .select(`
        *,
        projects (id, name),
        document_metadata:tasks_metadata_id_fkey (
          id,
          title,
          type,
          source,
          source_system,
          url,
          source_web_url,
          fireflies_link,
          meeting_link,
          project_id,
          date,
          captured_at,
          created_at,
          content,
          raw_text,
          summary,
          action_items,
          bullet_points,
          notes
        )
      `)
      .contains("project_ids", [numericProjectId]),
    supabase
      .from("tasks")
      .select(`
        *,
        projects (id, name),
        document_metadata:tasks_metadata_id_fkey (
          id,
          title,
          type,
          source,
          source_system,
          url,
          source_web_url,
          fireflies_link,
          meeting_link,
          project_id,
          date,
          captured_at,
          created_at,
          content,
          raw_text,
          summary,
          action_items,
          bullet_points,
          notes
        )
      `)
      .eq("project_id", numericProjectId),
    supabase
      .from("tasks")
      .select(`
        *,
        projects (id, name),
        document_metadata:tasks_metadata_id_fkey!inner (
          id,
          title,
          type,
          source,
          source_system,
          url,
          source_web_url,
          fireflies_link,
          meeting_link,
          project_id,
          date,
          captured_at,
          created_at,
          content,
          raw_text,
          summary,
          action_items,
          bullet_points,
          notes
        )
      `)
      .eq("document_metadata.project_id", numericProjectId)
      .or("project_ids.is.null,project_ids.eq.{}"),
  ]);

  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const tasksByProjectIds = tasksByProjectIdsResult.data ?? [];
  const tasksByProjectId = tasksByProjectIdResult.data ?? [];

  const linkedTasks = tasksViaDocsResult.data ?? [];

  // Deduplicate across all three sources — a task can match multiple queries
  // (e.g. project_id = 760 AND project_ids contains 760)
  const seenIds = new Set<string>();
  const allTasks: JoinedTaskRow[] = [];
  for (const task of [...tasksByProjectIds, ...tasksByProjectId, ...linkedTasks] as JoinedTaskRow[]) {
    if (!seenIds.has(task.id)) {
      seenIds.add(task.id);
      allTasks.push(task);
    }
  }
  const tasks = allTasks
    .sort((left, right) => {
      const leftCreatedAt = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightCreatedAt = right.created_at ? new Date(right.created_at).getTime() : 0;
      return rightCreatedAt - leftCreatedAt;
    })
    .map(mapTaskRow);

  return (
    <PageShell
      variant="table"
      title="Tasks"
      showHeader={false}
      contentClassName="pt-0 pb-0"
    >
      <TasksTableClient
        title="Tasks"
        description={`Tasks associated with ${projectResult.data.name}`}
        initialData={tasks}
        projectId={projectId}
        allowDelete
      />
    </PageShell>
  );
}
