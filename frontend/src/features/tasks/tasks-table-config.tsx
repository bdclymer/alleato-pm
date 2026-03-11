import { ArrowUpRight, Eye, Link2, Trash2 } from "lucide-react";
import {
  TableAvatarUsers,
  TableDateValue,
  TableIconLinks,
  TableRowActionsMenu,
  TableStatusDot,
  TableTagBadge,
  type TableColumn,
  type FilterConfig,
  type ColumnConfig,
} from "@/components/tables/unified";

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
  project_name: string | null;
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
  { id: "description", label: "Task Name", alwaysVisible: true },
  { id: "assignee_name", label: "Assigned User", defaultVisible: true },
  { id: "project_name", label: "Project Name", defaultVisible: true },
  { id: "assignee_email", label: "Assignee Email", defaultVisible: true },
  { id: "due_date", label: "Due Date", defaultVisible: true },
  { id: "priority", label: "Priority", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "links", label: "Links", defaultVisible: true },
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
  return tasksColumns.map((column) => {
    switch (column.id) {
      case "description":
        return {
          ...column,
          render: (item) => (
            <div className="flex max-w-[360px] items-center gap-2 min-w-0" title={item.description ?? ""}>
              <TableStatusDot status={item.status} />
              <span className="text-sm text-muted-foreground truncate">
                {item.description || "Untitled Task"}
              </span>
            </div>
          ),
          sortValue: (item) => item.description ?? "",
          sortable: true,
        };
      case "assignee_name":
        return {
          ...column,
          render: (item) => {
            const users = [item.assignee_name, item.assignee_email].filter(
              (value): value is string => Boolean(value && value.trim()),
            );
            if (users.length === 0) return <span className="text-sm text-muted-foreground">Unassigned</span>;
            return <TableAvatarUsers users={[users[0]]} maxVisible={1} />;
          },
          sortValue: (item) => item.assignee_name ?? "",
          sortable: true,
        };
      case "project_name":
        return {
          ...column,
          render: (item) => (
            <span className="text-sm text-muted-foreground block max-w-[160px] truncate">
              {item.project_name || "—"}
            </span>
          ),
          sortValue: (item) => item.project_name ?? "",
          sortable: true,
        };
      case "assignee_email":
        return {
          ...column,
          render: (item) => (
            <span className="text-sm text-muted-foreground block max-w-[180px] truncate">
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
      case "links":
        return {
          ...column,
          render: (item) => {
            const sourceMeetingHref = item.metadata_id ? `/meetings/${item.metadata_id}` : null;
            return (
              <TableIconLinks
                items={[
                  ...(sourceMeetingHref
                    ? [{ href: sourceMeetingHref, icon: Link2, label: "Open source meeting" }]
                    : []),
                ]}
              />
            );
          },
          sortValue: (item) => (item.metadata_id ? "meeting" : ""),
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
    <button
      type="button"
      onClick={() => onView(item)}
      className="w-full rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <TableStatusDot status={item.status} />
        <p className="font-medium text-sm truncate max-w-[260px]">{item.description || "Untitled Task"}</p>
      </div>
      {item.project_name && (
        <p className="text-xs text-muted-foreground/70 truncate max-w-[240px]">{item.project_name}</p>
      )}
      <div className="flex items-center justify-between pt-2">
        <TableTagBadge label={item.priority} variant={item.priority?.toLowerCase().includes("high") ? "default" : "secondary"} />
        <TableDateValue value={item.due_date} />
      </div>
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
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <TableStatusDot status={item.status} />
          <span className="font-medium text-sm truncate max-w-[260px]">{item.description || "Untitled Task"}</span>
        </div>
        {item.project_name && (
          <span className="text-xs text-muted-foreground/70 truncate max-w-[220px]">{item.project_name}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TableTagBadge label={item.priority} variant={item.priority?.toLowerCase().includes("high") ? "default" : "secondary"} />
        <TableDateValue value={item.due_date} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------

export function renderTasksRowActions(
  item: TasksRow,
  onView: (item: TasksRow) => void,
  onDelete?: (item: TasksRow) => void,
) {
  return (
    <TableRowActionsMenu
      items={[
        {
          key: "view",
          label: "View",
          icon: Eye,
          onSelect: () => onView(item),
        },
        ...(item.metadata_id
          ? [
              {
                key: "open-source",
                label: "Open source meeting",
                icon: ArrowUpRight,
                onSelect: () => {
                  window.open(`/meetings/${item.metadata_id}`, "_blank", "noopener,noreferrer");
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
