import { format } from "date-fns";
import { StatusBadge } from "@/components/ds";
import { Eye, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TableColumn, FilterConfig, ColumnConfig } from "@/components/tables/unified";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TasksRow {
  id: string | null;
  metadata_id: string | null;
  segment_id: string | null;
  source_chunk_id: string | null;
  description: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  project_id: string | null;
  client_id: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  source_system: string | null;
  embedding: string | null;
  created_at: string | null;
  updated_at: string | null;
  project_ids: string | null;
}

// ---------------------------------------------------------------------------
// Column / Filter / Defaults
// ---------------------------------------------------------------------------

export const tasksColumns: ColumnConfig[] = [
    { id: "description", label: "Description", alwaysVisible: true },
    { id: "assignee_name", label: "Assignee Name", defaultVisible: true },
    { id: "assignee_email", label: "Assignee Email", defaultVisible: true },
    { id: "project_id", label: "Project Id", defaultVisible: true },
    { id: "client_id", label: "Client Id", defaultVisible: true },
    { id: "due_date", label: "Due Date", defaultVisible: true },
    { id: "priority", label: "Priority", defaultVisible: true },
    { id: "status", label: "Status", defaultVisible: true },
];

export const tasksFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select" as const,
    options: [
      { value: "To-Do", label: "to-do" },
      { value: "In-Progress", label: "in-progress" },
      { value: "Blocked", label: "blocked" },
      { value: "Complete", label: "complete" },
    ],
  },
];

export const tasksDefaultVisibleColumns: string[] = tasksColumns
  .filter((c) => c.defaultVisible !== false)
  .map((c) => c.id);

// ---------------------------------------------------------------------------
// Table columns (render / sort)
// ---------------------------------------------------------------------------

export function buildTasksTableColumns(): TableColumn<TasksRow>[] {
  return [
    {
      ...tasksColumns[0],
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.description || "—"}</span>
      ),
      sortValue: (item) => item.description ?? "",
      sortable: true,
    },
    {
      ...tasksColumns[1],
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.assignee_name || "—"}</span>
      ),
      sortValue: (item) => item.assignee_name ?? "",
      sortable: true,
    },
    {
      ...tasksColumns[2],
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.assignee_email || "—"}</span>
      ),
      sortValue: (item) => item.assignee_email ?? "",
      sortable: true,
    },
    {
      ...tasksColumns[3],
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.project_id || "—"}</span>
      ),
      sortValue: (item) => item.project_id ?? "",
      sortable: true,
    },
    {
      ...tasksColumns[4],
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.client_id || "—"}</span>
      ),
      sortValue: (item) => item.client_id ?? "",
      sortable: true,
    },
    {
      ...tasksColumns[5],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.due_date ? format(new Date(item.due_date), "MMM d, yyyy") : "—"}
        </span>
      ),
      sortValue: (item) => item.due_date ?? "",
      sortable: true,
    },
    {
      ...tasksColumns[6],
      render: (item) => (
        <StatusBadge status={item.priority ?? "—"} />
      ),
      sortValue: (item) => item.priority ?? "",
      sortable: true,
    },
    {
      ...tasksColumns[7],
      render: (item) => (
        <StatusBadge status={item.status ?? "—"} />
      ),
      sortValue: (item) => item.status ?? "",
      sortable: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Card / List views
// ---------------------------------------------------------------------------

export function renderTasksCard(
  item: TasksRow,
  onView: (item: TasksRow) => void,
) {
  return (
    <button
      type="button"
      onClick={() => onView(item)}
      className="w-full rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
    >
      <p className="font-medium">{item.description || "Untitled"}</p>
          <StatusBadge status={item.priority ?? "—"} />
    </button>
  );
}

export function renderTasksList(
  item: TasksRow,
  onView: (item: TasksRow) => void,
) {
  return (
    <button
      type="button"
      onClick={() => onView(item)}
      className="flex w-full items-center justify-between rounded-md px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <span className="font-medium">{item.description || "Untitled"}</span>
      <StatusBadge status={item.priority ?? "—"} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------

export function renderTasksRowActions(
  item: TasksRow,
  onView: (item: TasksRow) => void,
) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(item)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
