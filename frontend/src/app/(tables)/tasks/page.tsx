import { PageShell } from "@/components/layout";
import { TasksTableClient } from "@/features/tasks/tasks-table-client";

export default function TasksPage() {
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
        fetchPath="/api/tasks"
        allowDelete
      />
    </PageShell>
  );
}
