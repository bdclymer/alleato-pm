import { PageShell } from "@/components/layout";
import { KanbanBoard } from "./kanban-board";
import NewTaskDialog from "./new-task-dialog";

export default function KanbanViewPage() {
  return (
    <PageShell
      variant="content"
      title="Kanban"
      description="Manage tasks with drag and drop"
      actions={<NewTaskDialog />}
    >
      <KanbanBoard />
    </PageShell>
  );
}
