import { ArrowUpRight, Eye, Trash2 } from "lucide-react";
import { TaskFeedbackButtons } from "@/components/ai/TaskFeedbackButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableDateValue,
  TableAvatarUsers,
  TableRowActionsMenu,
  TableTagBadge,
  type TableColumn,
  type FilterConfig,
  type ColumnConfig,
} from "@/components/tables/unified";
import {
  type TasksRow,
  getTaskSourceLabel,
  getTaskSourceTarget,
  getTaskSourceTitle,
} from "@/features/tasks/task-utils";
import type { TaskSnapshot } from "@/lib/ai/task-feedback-types";

// ---------------------------------------------------------------------------
// Inline-edit types (exported so tasks-inbox can pass them in)
// ---------------------------------------------------------------------------

export type TaskPatch = {
  description?: string;
  status?: string;
  due_date?: string | null;
  project_id?: number | null;
  category?: string | null;
  priority?: string | null;
  assignee_user_id?: string | null;
};

export type TaskProjectOption = { id: number; name: string | null };
export type TaskUserOption = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  person_id?: string | null;
};

export interface TaskInlineEditOptions {
  onOpenPanel?: (item: TasksRow) => void;
  onUpdate?: (id: string, patch: TaskPatch) => void;
  onDelete?: (id: string) => void;
  projects?: TaskProjectOption[];
  users?: TaskUserOption[];
}

const GHOST_SELECT_CLS =
  "h-7 w-auto min-w-[5.5rem] gap-1 border-0 bg-transparent -ml-2 px-2 text-xs shadow-none font-normal text-foreground hover:bg-muted/50 focus:ring-0 data-[state=open]:bg-muted/50 [&>svg]:text-muted-foreground/60";
const GHOST_DATE_CLS =
  "h-7 max-w-[9rem] border-0 bg-transparent -ml-2 px-2 text-xs shadow-none text-foreground hover:bg-muted/50 focus:ring-0 focus-visible:ring-0";

// ---------------------------------------------------------------------------
// Column / Filter / Defaults
// ---------------------------------------------------------------------------

export const tasksColumns: ColumnConfig[] = [
  { id: "description", label: "Task Name", alwaysVisible: true },
  { id: "feedback", label: "Feedback", defaultVisible: true },
  { id: "assignee_name", label: "Assigned User", defaultVisible: true },
  { id: "project_name", label: "Project Name", defaultVisible: true },
  { id: "source_system", label: "Source", defaultVisible: true },
  { id: "source_record", label: "Created From", defaultVisible: true },
  { id: "source_date", label: "Source Date", defaultVisible: true },
  { id: "assignee_email", label: "Assignee Email", defaultVisible: false },
  { id: "created_at", label: "Created Date", defaultVisible: true },
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

export function buildTasksFilters(items: TasksRow[]): FilterConfig[] {
  const sourceOptions = Array.from(
    new Set(items.map((item) => getTaskSourceLabel(item)).filter(Boolean)),
  )
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: value }));

  return sourceOptions.length > 0
    ? [
        ...tasksFilters,
        {
          id: "source_system",
          label: "Source",
          type: "select" as const,
          options: sourceOptions,
        },
      ]
    : tasksFilters;
}

export const tasksDefaultVisibleColumns: string[] = tasksColumns
  .filter((c) => c.defaultVisible !== false)
  .map((c) => c.id);

// ---------------------------------------------------------------------------
// Table columns (render / sort)
// ---------------------------------------------------------------------------

export function buildTasksTableColumns(
  projectId?: string | null,
  editOptions?: TaskInlineEditOptions,
): TableColumn<TasksRow>[] {
  const { onOpenPanel, onUpdate, onDelete, projects = [], users = [] } = editOptions ?? {};

  return tasksColumns.map((column) => {
    switch (column.id) {
      case "description":
        return {
          ...column,
          render: (item) => (
            <Button
              type="button"
              variant="link"
              className="h-auto min-w-0 justify-start whitespace-normal p-0 text-left text-xs font-medium text-foreground/90 underline-offset-2 hover:text-primary"
              title={item.description ?? ""}
              onClick={() => onOpenPanel?.(item)}
            >
              {item.title || item.description || "Untitled Task"}
            </Button>
          ),
          sortValue: (item) => item.description ?? "",
          sortable: true,
        };
      case "feedback":
        return {
          ...column,
          render: (item) => {
            const taskId = item.id;
            if (!taskId) {
              return <span className="text-xs text-muted-foreground">—</span>;
            }

            return (
              <div
                className="flex min-w-16 items-center"
                onClick={(event) => event.stopPropagation()}
              >
                <TaskFeedbackButtons
                  projectId={getTaskProjectId(item)}
                  taskId={taskId}
                  taskSnapshot={buildTaskFeedbackSnapshot(item)}
                  onTrivial={onDelete ? () => onDelete(taskId) : undefined}
                />
              </div>
            );
          },
          sortValue: () => "",
          sortable: false,
        };
      case "assignee_name":
        return {
          ...column,
          render: (item) => {
            if (onUpdate && users.length > 0) {
              const matchedUser =
                users.find((u) => u.person_id && item.assignee_person_id && u.person_id === item.assignee_person_id) ??
                users.find((u) => u.email && item.assignee_email && u.email.toLowerCase() === item.assignee_email?.toLowerCase());
              const selectValue = matchedUser?.id ?? "__unassigned__";
              return (
                <Select
                  value={selectValue}
                  onValueChange={(value) =>
                    onUpdate(item.id!, { assignee_user_id: value === "__unassigned__" ? null : value })
                  }
                >
                  <SelectTrigger className={GHOST_SELECT_CLS}>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email || u.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }
            return item.assignee_name ? (
              <span className="flex min-w-0 max-w-56 items-center gap-2">
                <TableAvatarUsers users={[item.assignee_name]} maxVisible={1} />
                <span className="truncate text-xs text-foreground">{item.assignee_name}</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            );
          },
          sortValue: (item) => item.assignee_name ?? "",
          sortable: true,
        };
      case "project_name":
        return {
          ...column,
          render: (item) => {
            if (onUpdate && projects.length > 0) {
              const selectValue = item.project_id ? String(item.project_id) : "__none__";
              return (
                <Select
                  value={selectValue}
                  onValueChange={(value) =>
                    onUpdate(item.id!, { project_id: value === "__none__" ? null : Number(value) })
                  }
                >
                  <SelectTrigger className={GHOST_SELECT_CLS}>
                    <SelectValue placeholder="Unlinked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unlinked</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name ?? `Project ${p.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }
            return (
              <span className="block max-w-56 text-xs text-foreground truncate">
                {item.project_name || "Unlinked"}
              </span>
            );
          },
          sortValue: (item) => item.project_name ?? "",
          sortable: true,
        };
      case "source_system":
        return {
          ...column,
          render: (item) => (
            <TableTagBadge label={getTaskSourceLabel(item)} variant="outline" />
          ),
          sortValue: (item) => getTaskSourceLabel(item),
          sortable: true,
        };
      case "source_record":
        return {
          ...column,
          render: (item) => {
            const target = getTaskSourceTarget(item, projectId);
            const label = getTaskSourceTitle(item);
            if (!target) {
              return (
                <span className="block max-w-72 truncate text-xs text-muted-foreground">
                  {label}
                </span>
              );
            }
            return (
              <a
                href={target.href}
                className="block max-w-72 truncate text-xs text-foreground underline-offset-2 hover:text-primary hover:underline"
                onClick={(event) => event.stopPropagation()}
                rel={target.external ? "noreferrer" : undefined}
                target={target.external ? "_blank" : undefined}
                title={label}
              >
                {label}
              </a>
            );
          },
          sortValue: (item) => getTaskSourceTitle(item),
          sortable: true,
        };
      case "assignee_email":
        return {
          ...column,
          render: (item) => (
            <span className="block max-w-44 text-xs text-muted-foreground truncate">
              {item.assignee_email || "—"}
            </span>
          ),
          sortValue: (item) => item.assignee_email ?? "",
          sortable: true,
        };
      case "source_date":
        return {
          ...column,
          render: (item) => <TableDateValue value={item.source_date} />,
          sortValue: (item) => item.source_date ?? "",
          sortable: true,
        };
      case "due_date":
        return {
          ...column,
          render: (item) => {
            if (onUpdate) {
              return (
                <Input
                  type="date"
                  className={GHOST_DATE_CLS}
                  value={item.due_date?.split("T")[0] ?? ""}
                  onChange={(e) =>
                    onUpdate(item.id!, { due_date: e.target.value || null })
                  }
                />
              );
            }
            return <TableDateValue value={item.due_date} />;
          },
          sortValue: (item) => item.due_date ?? "",
          sortable: true,
        };
      case "created_at":
        return {
          ...column,
          render: (item) => <TableDateValue value={item.created_at} />,
          sortValue: (item) => item.created_at ?? "",
          sortable: true,
        };
      case "priority":
        return {
          ...column,
          render: (item) => {
            if (onUpdate) {
              return (
                <Select
                  value={item.priority?.toLowerCase() ?? "__none__"}
                  onValueChange={(value) =>
                    onUpdate(item.id!, { priority: value === "__none__" ? null : value })
                  }
                >
                  <SelectTrigger className={GHOST_SELECT_CLS}>
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not set</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              );
            }
            return (
              <TableTagBadge
                label={item.priority}
                variant={item.priority?.toLowerCase().includes("high") ? "default" : "secondary"}
              />
            );
          },
          sortValue: (item) => item.priority ?? "",
          sortable: true,
        };
      case "status":
        return {
          ...column,
          render: (item) => {
            if (onUpdate) {
              return (
                <Select
                  value={item.status ?? "__none__"}
                  onValueChange={(value) =>
                    onUpdate(item.id!, { status: value === "__none__" ? undefined : value })
                  }
                >
                  <SelectTrigger className={GHOST_SELECT_CLS}>
                    <SelectValue placeholder="No status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To-Do">To Do</SelectItem>
                    <SelectItem value="In-Progress">In Progress</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              );
            }
            return (
              <TableTagBadge
                label={item.status}
                variant={item.status?.toLowerCase().includes("complete") ? "default" : "outline"}
              />
            );
          },
          sortValue: (item) => item.status ?? "",
          sortable: true,
        };
      default:
        return {
          ...column,
          render: (item) => {
            const record = toTasksRecord(item);
            const value = record[column.id] ?? "—";
            return <span className="text-xs text-muted-foreground">{value}</span>;
          },
          sortValue: (item) => toTasksRecord(item)[column.id] ?? "",
          sortable: true,
        };
    }
  });
}

function getTaskProjectId(item: TasksRow): number | null {
  return item.project_id ?? item.project_ids?.[0] ?? null;
}

function buildTaskFeedbackSnapshot(item: TasksRow): TaskSnapshot {
  return {
    name: item.description || item.title || "Untitled task",
    assignee: item.assignee_name || item.assignee_email,
    dueDate: item.due_date,
    priority: item.priority ?? "medium",
    notes: item.assigned_by ? `Assigned by ${item.assigned_by}` : null,
    projectId: getTaskProjectId(item),
    source: getTaskSourceLabel(item),
    generatedBy: item.extraction_model,
  };
}

function toTasksRecord(item: TasksRow): Record<string, string | null> {
  return item as unknown as Record<string, string | null>;
}

// ---------------------------------------------------------------------------
// Card / List views
// ---------------------------------------------------------------------------

export function renderTasksCard(
  item: TasksRow,
  onView: (item: TasksRow) => void,
) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onView(item)}
      className="h-auto w-full flex-col items-start justify-start rounded-lg border border-border bg-background p-4 text-left font-normal hover:bg-muted/50"
    >
      <div className="flex items-center gap-2">
        <p className="max-w-64 truncate text-sm font-medium">{item.title || item.description || "Untitled Task"}</p>
      </div>
      {item.project_name && (
        <p className="max-w-60 truncate text-sm text-muted-foreground">{item.project_name}</p>
      )}
      <div className="flex w-full items-center justify-between gap-3 pt-2">
        <TableTagBadge
          label={item.priority}
          variant={item.priority?.toLowerCase().includes("high") ? "default" : "secondary"}
        />
        <div className="flex shrink-0 items-center gap-2">
          <TableDateValue value={item.source_date} />
          <TableDateValue value={item.due_date} />
        </div>
      </div>
    </Button>
  );
}

export function renderTasksList(
  item: TasksRow,
  onView: (item: TasksRow) => void,
) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onView(item)}
      className="h-auto w-full items-center justify-between rounded-md px-4 py-3 text-left font-normal hover:bg-muted/50"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="max-w-64 truncate text-sm font-medium">{item.title || item.description || "Untitled Task"}</span>
        </div>
        {item.project_name && (
          <span className="max-w-56 truncate text-sm text-muted-foreground">{item.project_name}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TableTagBadge
          label={item.priority}
          variant={item.priority?.toLowerCase().includes("high") ? "default" : "secondary"}
        />
        <TableDateValue value={item.source_date} />
        <TableDateValue value={item.due_date} />
      </div>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------

export function renderTasksRowActions(
  item: TasksRow,
  onOpenSource: (item: TasksRow) => void,
  onDelete?: (item: TasksRow) => void,
  projectId?: string | null,
) {
  return (
    <TableRowActionsMenu
      items={[
        {
          key: "open-source",
          label: "Open source",
          icon: Eye,
          onSelect: () => onOpenSource(item),
        },
        ...(getTaskSourceTarget(item, projectId)
          ? [
              {
                key: "open-source-new-tab",
                label: "Open source in new tab",
                icon: ArrowUpRight,
                onSelect: () => {
                  const target = getTaskSourceTarget(item, projectId);
                  if (!target) return;
                  window.open(target.href, "_blank", "noopener,noreferrer");
                },
              },
            ]
          : []),
        ...(onDelete
          ? [
              {
                key: "delete",
                label: "Delete",
                icon: Trash2,
                onSelect: () => onDelete(item),
                destructive: true,
              },
            ]
          : []),
      ]}
    />
  );
}
