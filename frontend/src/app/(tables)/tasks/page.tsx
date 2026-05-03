export const dynamic = "force-dynamic";

import { PageShell } from "@/components/layout";
import { TasksTableClient } from "@/features/tasks/tasks-table-client";
import { mapTaskRow, type JoinedTaskRow } from "@/features/tasks/task-utils";
import { createServiceClient } from "@/lib/supabase/service";

const TASK_JOINS = `
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
    project_id
  )
`;

export default async function TasksPage() {
  const supabase = createServiceClient();

  const { data: interviewMeetings } = await supabase
    .from("document_metadata")
    .select("id")
    .or("type.eq.interview,title.ilike.%test%");

  let query = supabase
    .from("tasks")
    .select(TASK_JOINS)
    .not("metadata_id", "is", null)
    .order("created_at", { ascending: false });

  const interviewIds = (interviewMeetings ?? []).map((m) => m.id).filter(Boolean);
  if (interviewIds.length > 0) {
    query = query.not("metadata_id", "in", `(${interviewIds.join(",")})`);
  }

  const { data } = await query;
  const tasks = ((data ?? []) as JoinedTaskRow[]).map(mapTaskRow);

  return (
    <PageShell
      variant="table"
      title="Tasks"
      showHeader={false}
      contentClassName="pt-0 pb-0"
    >
      <TasksTableClient
        title="Tasks"
        description="Browse tasks with their originating source and jump back to the record that created them."
        initialData={tasks}
        allowDelete
      />
    </PageShell>
  );
}
