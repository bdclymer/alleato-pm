export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { ProjectTasksDataTable } from "@/components/tables/project-tasks-data-table";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

function sortByCreatedAtDesc(a: TaskRow, b: TaskRow): number {
  const aCreatedAt = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bCreatedAt = b.created_at ? new Date(b.created_at).getTime() : 0;
  return bCreatedAt - aCreatedAt;
}

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
      .select("*")
      .contains("project_ids", [numericProjectId]),
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", numericProjectId),
    supabase
      .from("tasks")
      .select("*, document_metadata!tasks_metadata_id_fkey!inner(project_id)")
      .eq("document_metadata.project_id", numericProjectId)
      .or("project_ids.is.null,project_ids.eq.{}"),
  ]);

  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const tasksByProjectIds = tasksByProjectIdsResult.data ?? [];
  const tasksByProjectId = tasksByProjectIdResult.data ?? [];

  const linkedTasksRaw = tasksViaDocsResult.data ?? [];
  const linkedTasks: TaskRow[] = linkedTasksRaw.map((row) => {
    const { document_metadata: _documentMetadata, ...task } = row as TaskRow & {
      document_metadata: unknown;
    };
    return task;
  });

  // Deduplicate across all three sources — a task can match multiple queries
  // (e.g. project_id = 760 AND project_ids contains 760)
  const seenIds = new Set<string>();
  const allTasks: TaskRow[] = [];
  for (const task of [...tasksByProjectIds, ...tasksByProjectId, ...linkedTasks]) {
    if (!seenIds.has(task.id)) {
      seenIds.add(task.id);
      allTasks.push(task);
    }
  }
  const tasks = allTasks.sort(sortByCreatedAtDesc);

  return (
    <>
      <ProjectPageHeader
        title="Tasks"
        description={`Tasks associated with ${projectResult.data.name}`}
      />
      <PageContainer className="space-y-8">
        <section className="space-y-4">
          <ProjectTasksDataTable tasks={tasks} />
        </section>
      </PageContainer>
    </>
  );
}
