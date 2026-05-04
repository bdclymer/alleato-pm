import { ArrowUpRight, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TableDateValue,
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

// ---------------------------------------------------------------------------
// Column / Filter / Defaults
// ---------------------------------------------------------------------------

export const tasksColumns: ColumnConfig[] = [
  { id: "description", label: "Task Name", alwaysVisible: true },
  { id: "assignee_name", label: "Assigned User", defaultVisible: true },
  { id: "project_name", label: "Project Name", defaultVisible: true },
  { id: "source_system", label: "Source", defaultVisible: true },
  { id: "source_record", label: "Created From", defaultVisible: true },
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

export function buildTasksTableColumns(projectId?: string | null): TableColumn<TasksRow>[] {
  return tasksColumns.map((column) => {
    switch (column.id) {
      case "description":
        return {
          ...column,
          render: (item) => (
            <div className="flex max-w-xl min-w-0 items-center gap-2" title={item.description ?? ""}>
              <span className="text-sm font-medium text-foreground truncate">
                {item.title || item.description || "Untitled Task"}
              </span>
            </div>
          ),
          sortValue: (item) => item.description ?? "",
          sortable: true,
        };
      case "assignee_name":
        return {
          ...column,
          render: (item) => (
            <span className="block max-w-44 text-sm text-foreground truncate">
              {item.assignee_name || "Unassigned"}
            </span>
          ),
          sortValue: (item) => item.assignee_name ?? "",
          sortable: true,
        };
      case "project_name":
        return {
          ...column,
          render: (item) => (
            <span className="block max-w-56 text-sm text-foreground truncate">
              {item.project_name || "Unlinked"}
            </span>
          ),
          sortValue: (item) => item.project_name ?? "",
          sortable: true,
        };
      case "source_system":
        return {
          ...column,
          render: (item) => {
            return (
              <TableTagBadge
                label={getTaskSourceLabel(item)}
                variant="outline"
              />
            );
          },
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
                <span className="block max-w-72 truncate text-sm text-muted-foreground">
                  {label}
                </span>
              );
            }

            return (
              <a
                href={target.href}
                className="block max-w-72 truncate text-sm text-foreground underline-offset-2 hover:text-primary hover:underline"
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
            <span className="block max-w-44 text-sm text-muted-foreground truncate">
              {item.assignee_email || "—"}
            </span>
          ),
          sortValue: (item) => item.assignee_email ?? "",
          sortable: true,
        };
      case "due_date":
        return {
          ...column,
          render: (item) => <TableDateValue value={item.due_date} />,
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
          render: (item) => (
            <TableTagBadge
              label={item.priority}
              variant={item.priority?.toLowerCase().includes("high") ? "default" : "secondary"}
            />
          ),
          sortValue: (item) => item.priority ?? "",
          sortable: true,
        };
      case "status":
        return {
          ...column,
          render: (item) => (
            <TableTagBadge
              label={item.status}
              variant={item.status?.toLowerCase().includes("complete") ? "default" : "outline"}
            />
          ),
          sortValue: (item) => item.status ?? "",
          sortable: true,
        };
      default:
        return {
          ...column,
          render: (item) => {
            const record = toTasksRecord(item);
            const value = record[column.id] ?? "—";
            return <span className="text-sm text-muted-foreground">{value}</span>;
          },
          sortValue: (item) => toTasksRecord(item)[column.id] ?? "",
          sortable: true,
        };
    }
  });
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
        <p className="max-w-60 truncate text-xs text-muted-foreground/70">{item.project_name}</p>
      )}
      <div className="flex items-center justify-between pt-2">
        <TableTagBadge
          label={item.priority}
          variant={item.priority?.toLowerCase().includes("high") ? "default" : "secondary"}
        />
        <TableDateValue value={item.due_date} />
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
          <span className="max-w-56 truncate text-xs text-muted-foreground/70">{item.project_name}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TableTagBadge
          label={item.priority}
          variant={item.priority?.toLowerCase().includes("high") ? "default" : "secondary"}
        />
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
