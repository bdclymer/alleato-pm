"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CheckSquare2,
  ClipboardList,
  Loader2,
  MoreVertical,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageShell, PageTabs } from "@/components/layout";
import { TaskFeedbackButtons } from "@/components/ai/TaskFeedbackButtons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useConfirm } from "@/hooks/use-confirm";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import {
  type TasksRow,
  getTaskCategory,
  getTaskSourceLabel,
  getTaskSourceTitle,
  getTaskSourceTarget,
} from "@/features/tasks/task-utils";
import {
  type EmailThreadMessage,
  cleanSourceContextText,
  extractContextBody,
  parseEmailThread,
} from "@/features/tasks/email-thread-parser";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Scope = "mine" | "all" | "brandon";
type StatusFilter = "open" | "done" | "all";
type DisplayStatus = "open" | "in_progress" | "done";
type TaskPatch = {
  description?: string;
  status?: string;
  due_date?: string | null;
  project_id?: number | null;
  category?: string | null;
  assignee_user_id?: string | null;
};

type ProjectOption = {
  id: number;
  name: string | null;
  project_number?: string | null;
  "job number"?: string | null;
};

type UserOption = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  person_id?: string | null;
};

const DEFAULT_TASK_CATEGORIES = [
  "Accounting",
  "Compliance",
  "Design",
  "Estimating",
  "General",
  "Operations",
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

const DONE_STATUSES = new Set(["complete", "closed", "done", "cancelled"]);
const IN_PROGRESS_STATUSES = new Set(["in_progress", "started", "active"]);

const PANEL_MIN_PCT = 20;   // minimum left panel width as % of container
const PANEL_MAX_PCT = 75;   // maximum left panel width as % of container
const PANEL_DEFAULT_PCT = 50;
const PANEL_STORAGE_KEY = "tasks-inbox-panel-pct";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDisplayStatus(status: string | null): DisplayStatus {
  const s = (status ?? "").toLowerCase();
  if (DONE_STATUSES.has(s)) return "done";
  if (IN_PROGRESS_STATUSES.has(s)) return "in_progress";
  return "open";
}

function getSavedPanelPct(): number {
  if (typeof window === "undefined") return PANEL_DEFAULT_PCT;
  try {
    const saved = localStorage.getItem(PANEL_STORAGE_KEY);
    if (saved) {
      const pct = parseFloat(saved);
      if (pct >= PANEL_MIN_PCT && pct <= PANEL_MAX_PCT) return pct;
    }
  } catch (error) {
    console.warn("[tasks] Failed to read saved task panel width.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return PANEL_DEFAULT_PCT;
}

function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false;
  return new Date(dueDateStr).getTime() < Date.now();
}

const TASK_LIST_MIN_WIDTH = "68rem";
const TASK_LIST_GRID_TEMPLATE =
  "44px minmax(18rem, 1.7fr) minmax(9rem, 0.8fr) minmax(7rem, 0.6fr) minmax(7rem, 0.6fr) minmax(8rem, 0.7fr) minmax(7rem, 0.55fr)";

function TaskListHeader({
  allVisibleSelected,
  someVisibleSelected,
  visibleTaskIds,
  selectedTaskIds,
  onToggleVisibleSelection,
}: {
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  visibleTaskIds: string[];
  selectedTaskIds: string[];
  onToggleVisibleSelection: (checked: boolean) => void;
}) {
  return (
    <div
      className="sticky top-0 z-10 grid items-center border-b border-border/40 bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
      style={{
        gridTemplateColumns: TASK_LIST_GRID_TEMPLATE,
        minWidth: TASK_LIST_MIN_WIDTH,
      }}
    >
      <div className="sticky left-0 z-20 flex h-9 items-center justify-center bg-background">
        <Checkbox
          checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
          onCheckedChange={(value) => onToggleVisibleSelection(value === true)}
          disabled={visibleTaskIds.length === 0}
          aria-label="Select visible tasks"
        />
      </div>
      <div className="px-2">Task</div>
      <div className="px-2">Assigned</div>
      <div className="px-2">Source</div>
      <div className="px-2">Date assigned</div>
      <div className="px-2">Assigned by</div>
      <div className="px-2">Priority</div>
      <span className="sr-only">
        {selectedTaskIds.length > 0
          ? `${selectedTaskIds.length} selected`
          : "No tasks selected"}
      </span>
    </div>
  );
}

function formatPriorityLabel(priority: string | null): string {
  if (!priority) return "Not set";
  return `${priority.charAt(0).toUpperCase()}${priority.slice(1).toLowerCase()}`;
}

function formatAuditLabel(value: string | null): string {
  if (!value) return "Untracked";
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function projectOptionLabel(project: ProjectOption): string {
  const projectNumber = project.project_number ?? project["job number"] ?? null;
  return projectNumber
    ? `${projectNumber} - ${project.name ?? "Unnamed project"}`
    : project.name ?? `Project ${project.id}`;
}

function userOptionLabel(user: UserOption): string {
  return user.full_name || user.email || "Unnamed user";
}

const COLLAPSED_CONTEXT_CHARS = 1800;

function ContextBody({ value, collapsedChars = COLLAPSED_CONTEXT_CHARS }: { value: string; collapsedChars?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > collapsedChars;
  const visibleBody =
    !isLong || expanded
      ? value
      : `${value.slice(0, collapsedChars).trim()}...`;

  return (
    <div className="space-y-2">
      <div className="max-w-none whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
        {visibleBody}
      </div>
      {isLong && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show less" : "Show full message"}
        </Button>
      )}
    </div>
  );
}

function MessageSummary({ message, index }: { message: EmailThreadMessage; index: number }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {index === 0 ? "Latest" : `Earlier ${index}`}
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {message.subject ?? message.from ?? "Email message"}
        </span>
      </div>
      <div className="min-w-0 truncate text-xs text-muted-foreground">
        {[message.from, message.date].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

function SourceContextBlock({ value }: { value: string }) {
  const text = cleanSourceContextText(value);
  const messages = parseEmailThread(text);

  if (messages.length > 1) {
    const defaultValue = messages[0]?.id;

    return (
      <Accordion type="single" collapsible defaultValue={defaultValue} className="space-y-2">
        {messages.map((message, index) => (
          <AccordionItem
            key={message.id}
            value={message.id}
            className="rounded-md border border-border/60 bg-background px-3"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <MessageSummary message={message} index={index} />
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <ContextBody value={message.body} collapsedChars={index === 0 ? 1600 : 900} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  const message = messages[0];
  const body = (message?.body ?? extractContextBody(text)) || text;

  return (
    <div className="space-y-2">
      <ContextBody value={body} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visual tokens
// ---------------------------------------------------------------------------

const STATUS_SELECT_CLASSES: Record<DisplayStatus, string> = {
  done: "text-emerald-700 dark:text-emerald-400",
  open: "text-amber-700 dark:text-amber-400",
  in_progress: "text-blue-700 dark:text-blue-400",
};

const PRIORITY_META: Record<string, { dot: string; badge: string; label: string }> = {
  high: {
    dot: "bg-red-400",
    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
    label: "High priority",
  },
  medium: {
    dot: "bg-amber-400",
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
    label: "Medium priority",
  },
  low: {
    dot: "bg-slate-300",
    badge: "border-border bg-muted text-muted-foreground",
    label: "Low priority",
  },
};

// ---------------------------------------------------------------------------
// Resizable Panel Hook (percentage-based, 50/50 default)
// ---------------------------------------------------------------------------

function useResizablePanel(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [leftPct, setLeftPct] = useState(PANEL_DEFAULT_PCT);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startPct = useRef(PANEL_DEFAULT_PCT);

  useEffect(() => {
    setLeftPct(getSavedPanelPct());
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startPct.current = leftPct;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftPct]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const containerWidth = containerRef.current?.offsetWidth ?? window.innerWidth;
      const deltaPct = ((e.clientX - startX.current) / containerWidth) * 100;
      const newPct = Math.min(PANEL_MAX_PCT, Math.max(PANEL_MIN_PCT, startPct.current + deltaPct));
      setLeftPct(newPct);
    }
    function handleMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { localStorage.setItem(PANEL_STORAGE_KEY, String(leftPct)); } catch { /* ignore */ }
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [containerRef, leftPct]);

  return { leftPct, handleMouseDown };
}

// ---------------------------------------------------------------------------
// TaskListItem
// ---------------------------------------------------------------------------

function TaskListItem({
  item,
  isSelected,
  isChecked,
  onClick,
  onCheckedChange,
}: {
  item: TasksRow;
  isSelected: boolean;
  isChecked: boolean;
  onClick: () => void;
  onCheckedChange: (checked: boolean) => void;
}) {
  const ds = toDisplayStatus(item.status);
  const sourceLabel = getTaskSourceLabel(item);
  const priority = (item.priority ?? "").toLowerCase();
  const priorityMeta = PRIORITY_META[priority];
  const priorityLabel = item.priority ? formatPriorityLabel(item.priority) : "—";
  const isDone = ds === "done";
  const assignedBy = item.assigned_by ?? "—";
  const assignedDate = item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "—";
  const assignedTo = item.assignee_name ?? item.assignee_email ?? "Unassigned";

  return (
    <div
      role="button"
      tabIndex={0}
      data-task-item
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group grid cursor-pointer items-center border-b border-border/30 text-sm transition-colors",
        isSelected
          ? "bg-primary/[0.04]"
          : "hover:bg-muted/40",
      )}
      style={{
        gridTemplateColumns: TASK_LIST_GRID_TEMPLATE,
        minWidth: TASK_LIST_MIN_WIDTH,
      }}
    >
      <div
        className={cn(
          "sticky left-0 z-10 flex min-h-12 items-center justify-center",
          isSelected ? "bg-primary/[0.04]" : "bg-background group-hover:bg-muted/40",
        )}
      >
        <Checkbox
          checked={isChecked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${item.description || item.title || "task"}`}
        />
      </div>
      <div className="flex min-w-0 items-start gap-2 px-2 py-2.5">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p
            className={cn(
              "line-clamp-2 min-w-0 text-xs leading-snug",
              isSelected ? "font-medium text-foreground" : "text-foreground/90",
              isDone && "text-muted-foreground line-through decoration-muted-foreground/40",
            )}
          >
            {item.description || item.title || "Untitled task"}
          </p>
        </div>
      </div>
      <div className="min-w-0 truncate px-2 text-xs text-foreground" title={assignedTo}>
        {assignedTo}
      </div>
      <div className="min-w-0 truncate px-2 text-xs text-muted-foreground" title={sourceLabel}>
        {sourceLabel || "—"}
      </div>
      <div className="min-w-0 truncate px-2 text-xs text-muted-foreground" title={assignedDate}>
        {assignedDate}
      </div>
      <div className="min-w-0 truncate px-2 text-xs text-muted-foreground" title={assignedBy}>
        {assignedBy}
      </div>
      <div className="min-w-0 truncate px-2 text-xs text-muted-foreground" title={priorityLabel}>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {priorityMeta && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityMeta.dot)} />}
          <span className="truncate">{priorityLabel}</span>
        </span>
      </div>
    </div>
  );
}

function TaskDetailRow({
  label,
  children,
  valueClassName,
}: {
  label: string;
  children: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] border-b border-border/35 last:border-b-0">
      <div className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("min-w-0 px-4 py-3 text-sm text-foreground", valueClassName)}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskDetail
// ---------------------------------------------------------------------------

function TaskDetail({
  task,
  updatingId,
  deletingId,
  onUpdateStatus,
  onUpdateTask,
  onDelete,
  onBack,
  projects,
  projectsLoading,
}: {
  task: TasksRow;
  updatingId: string | null;
  deletingId: string | null;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch, localPatch?: Partial<TasksRow>) => Promise<boolean> | boolean;
  onDelete: (id: string) => void;
  onBack?: () => void;
  projects: ProjectOption[];
  projectsLoading: boolean;
}) {
  const [isEditingText, setIsEditingText] = useState(false);
  const [taskTextDraft, setTaskTextDraft] = useState(task.description || task.title || "");
  const ds = toDisplayStatus(task.status);
  const sourceLabel = getTaskSourceLabel(task);
  const sourceTitle = getTaskSourceTitle(task);
  const sourceTarget = getTaskSourceTarget(task);
  const category = getTaskCategory(task);
  const priority = (task.priority ?? "").toLowerCase();
  const priorityMeta = PRIORITY_META[priority];
  const overdue = isOverdue(task.due_date);
  const { confirm: confirmDelete, ConfirmDialog } = useConfirm();
  const sourceLinkLabel = sourceTitle || sourceTarget?.href || sourceLabel;
  const extractionSourceLabel = formatAuditLabel(task.extraction_source);
  const extractionModelLabel = task.extraction_model ?? "Untracked";
  const extractionPromptLabel = task.extraction_prompt_version ?? "Untracked";
  const taskProjectId = task.project_id ?? task.project_ids?.[0] ?? null;
  const selectedProjectValue = taskProjectId ? String(taskProjectId) : "__none__";
  const taskFeedbackSnapshot = {
    name: task.description || task.title || "Untitled task",
    assignee: task.assignee_name || task.assignee_email,
    dueDate: task.due_date,
    priority: task.priority ?? "medium",
    notes: task.assigned_by ? `Assigned by ${task.assigned_by}` : null,
    projectId: taskProjectId,
    source: sourceLabel,
    generatedBy: task.extraction_model,
  };
  const createdLabel = task.created_at
    ? new Date(task.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "complete", label: "Complete" },
    { value: "cancelled", label: "Cancelled" },
  ];

  useEffect(() => {
    if (!isEditingText) {
      setTaskTextDraft(task.description || task.title || "");
    }
  }, [isEditingText, task.description, task.title]);

  async function handleDelete() {
    const ok = await confirmDelete({
      description: "Delete this task? This cannot be undone.",
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (ok && task.id) onDelete(task.id);
  }

  async function handleSaveTaskText() {
    if (!task.id) return;
    const description = taskTextDraft.trim();
    if (!description) {
      toast.error("Task text is required");
      return;
    }

    const updated = await onUpdateTask(task.id, { description }, { description });
    if (!updated) return;
    setIsEditingText(false);
  }

  return (
    <>
      {ConfirmDialog}
      <div className="mx-auto max-w-3xl px-6 py-7">

        {/* Mobile back button */}
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-5 h-auto gap-1.5 px-0 py-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All tasks
          </Button>
        )}

        {/* Hero: task description */}
        <div className="mb-6 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {isEditingText ? (
              <div className="space-y-2">
                <Textarea
                  value={taskTextDraft}
                  onChange={(event) => setTaskTextDraft(event.target.value)}
                  disabled={updatingId === task.id}
                  className="min-h-28 resize-y text-[15px] leading-relaxed"
                  aria-label="Task text"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void handleSaveTaskText();
                    }}
                    disabled={updatingId === task.id}
                  >
                    {updatingId === task.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTaskTextDraft(task.description || task.title || "");
                      setIsEditingText(false);
                    }}
                    disabled={updatingId === task.id}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[15px] font-medium leading-relaxed text-foreground">
                  {task.description || task.title || "Untitled task"}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 py-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => setIsEditingText(true)}
                  disabled={updatingId === task.id}
                >
                  Edit task text
                </Button>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-0.5 shrink-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                disabled={deletingId === task.id}
                aria-label="Task actions"
              >
                {deletingId === task.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                variant="destructive"
                disabled={deletingId === task.id}
                onSelect={() => {
                  void handleDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Task metadata table */}
        <div className="overflow-hidden border-y border-border/40">
          <div>
            <TaskDetailRow label="Assigned">
              {(task.assignee_name || task.assignee_email) ? (
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-sm text-foreground">
                    {task.assignee_name ?? task.assignee_email}
                  </span>
                  {task.assignee_name && task.assignee_email && (
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {task.assignee_email}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </TaskDetailRow>

            <TaskDetailRow label="Created">{createdLabel}</TaskDetailRow>

            <TaskDetailRow label="Due">
              <div className="flex min-w-0 flex-col gap-2">
                <Input
                  type="date"
                  value={task.due_date ?? ""}
                  onChange={(event) => {
                    if (!task.id) return;
                    const dueDate = event.target.value || null;
                    onUpdateTask(task.id, { due_date: dueDate }, { due_date: dueDate });
                  }}
                  disabled={updatingId === task.id}
                  className="h-8 max-w-44"
                  aria-label="Task due date"
                />
                {task.due_date ? (
                  <span
                    className={cn(
                      "text-xs",
                      overdue && ds !== "done"
                        ? "font-medium text-red-600"
                        : "text-muted-foreground",
                    )}
                  >
                    {format(new Date(task.due_date), "MMMM d, yyyy")}
                    {overdue && ds !== "done" && (
                      <span className="ml-2 font-normal text-red-500">overdue</span>
                    )}
                  </span>
                ) : null}
              </div>
            </TaskDetailRow>

            <TaskDetailRow label="Project">
              <div className="flex min-w-0 flex-col gap-2">
                <Select
                  value={selectedProjectValue}
                  onValueChange={(value) => {
                    if (!task.id) return;
                    if (value === "__none__") {
                      onUpdateTask(
                        task.id,
                        { project_id: null },
                        { project_id: null, project_ids: [], project_name: null },
                      );
                      return;
                    }

                    const projectId = Number.parseInt(value, 10);
                    const project = projects.find((item) => item.id === projectId);
                    onUpdateTask(
                      task.id,
                      { project_id: projectId },
                      {
                        project_id: projectId,
                        project_ids: [projectId],
                        project_name: project ? projectOptionLabel(project) : task.project_name,
                      },
                    );
                  }}
                  disabled={updatingId === task.id || projectsLoading}
                >
                  <SelectTrigger className="h-8 max-w-md">
                    <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select project"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {projectOptionLabel(project)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TaskDetailRow>

            <TaskDetailRow label="Category">{category}</TaskDetailRow>

            <TaskDetailRow label="Priority">
              <span className="inline-flex items-center gap-2 text-foreground">
                {priorityMeta && (
                  <span className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dot)} />
                )}
                {formatPriorityLabel(task.priority)}
              </span>
            </TaskDetailRow>

            <TaskDetailRow label="Status" valueClassName="py-2">
              <Select
                value={task.status ?? "open"}
                onValueChange={(value) => task.id && onUpdateStatus(task.id, value)}
                disabled={updatingId === task.id}
              >
                <SelectTrigger
                  className={cn(
                    "h-8 w-full max-w-48 justify-between border-0 bg-transparent px-0 text-sm font-medium shadow-none hover:bg-transparent focus:ring-0 focus:ring-offset-0",
                    STATUS_SELECT_CLASSES[ds],
                  )}
                >
                  {updatingId === task.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TaskDetailRow>

            <TaskDetailRow label="Source">
              <div className="flex min-w-0 flex-col gap-1">
                {sourceTarget ? (
                  <a
                    href={sourceTarget.href}
                    target={sourceTarget.external ? "_blank" : undefined}
                    rel={sourceTarget.external ? "noopener noreferrer" : undefined}
                    className="inline-flex min-w-0 items-center gap-2 text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{sourceLinkLabel}</span>
                    {task.assigned_by && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        via {task.assigned_by}
                      </span>
                    )}
                  </a>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-2 text-foreground">
                    <span className="truncate">{sourceLinkLabel || "No source link"}</span>
                    {task.assigned_by && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        via {task.assigned_by}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </TaskDetailRow>

            <TaskDetailRow label="Context">
              {task.source_context ? (
                <SourceContextBlock value={task.source_context} />
              ) : (
                <span className="text-muted-foreground">
                  No source excerpt was captured for this task.
                </span>
              )}
            </TaskDetailRow>

            <TaskDetailRow label="Generated">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-foreground">{extractionSourceLabel}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {extractionModelLabel} · {extractionPromptLabel}
                </span>
              </div>
            </TaskDetailRow>

            {task.id && (
              <TaskDetailRow label="Training">
                <TaskFeedbackButtons
                  projectId={taskProjectId}
                  taskId={task.id}
                  taskSnapshot={taskFeedbackSnapshot}
                />
              </TaskDetailRow>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty detail state — shown before any task is selected
// ---------------------------------------------------------------------------

function EmptyDetail({
  total,
  openCount,
  doneCount,
  loading,
  scope,
}: {
  total: number;
  openCount: number;
  doneCount: number;
  loading: boolean;
  scope: Scope;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <ClipboardList className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mb-1 text-sm font-semibold text-foreground">
        {loading ? "Loading tasks…" : total === 0 ? "No tasks yet" : "Select a task"}
      </p>
      <p className="mb-6 max-w-xs text-xs text-muted-foreground leading-relaxed">
        {scope === "mine"
          ? "Tasks assigned to you from meetings, emails, and documents appear here."
          : scope === "brandon"
            ? "Tasks assigned by Brandon, assigned to Brandon, or mentioning Brandon appear here for review."
          : "All tasks across every team member and project appear here."}
      </p>
      {!loading && total > 0 && (
        <div className="flex items-center gap-8 text-xs">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{openCount}</p>
            <p className="mt-0.5 text-muted-foreground">Open</p>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{doneCount}</p>
            <p className="mt-0.5 text-muted-foreground">Done</p>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{total}</p>
            <p className="mt-0.5 text-muted-foreground">Total</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const { profile, isLoading: profileLoading } = useCurrentUserProfile();
  const isAdmin = profile?.isAdmin === true;

  const [scope, setScope] = useState<Scope>("mine");
  const [items, setItems] = useState<TasksRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("__no_change__");
  const [bulkAssigneeUserId, setBulkAssigneeUserId] = useState("__no_change__");
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const listPanelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { leftPct, handleMouseDown } = useResizablePanel(containerRef);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  // ---- Fetch ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ data?: TasksRow[] }>(`/api/tasks?scope=${scope}`);
      setItems(data.data ?? []);
      setTotal((data.data ?? []).length);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  // Refetch whenever scope changes
  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      setProjectsLoading(true);
      try {
        const result = await apiFetch<{ data?: ProjectOption[] }>("/api/projects?limit=250&archived=false", {
          cache: "no-store",
        });
        if (!cancelled) {
          setProjects(result.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load projects");
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    }

    void fetchProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      setUsersLoading(true);
      try {
        const result = await apiFetch<{ users?: UserOption[] }>("/api/users", {
          cache: "no-store",
        });
        if (!cancelled) {
          setUsers(result.users ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load users");
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }

    void fetchUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  // When scope changes reset selection and status filter
  const handleScopeChange = useCallback((nextScope: Scope) => {
    setScope(nextScope);
    setSelectedId(null);
    setSelectedTaskIds([]);
    setFilter("open");
    setMobileShowDetail(false);
  }, []);

  const scopeTabs = useMemo(
    () =>
      [
        { label: "My Tasks", href: "/tasks?scope=mine", scope: "mine" as const },
        ...(isAdmin
          ? [
              { label: "Brandon", href: "/tasks?scope=brandon", scope: "brandon" as const },
              { label: "All Tasks", href: "/tasks?scope=all", scope: "all" as const },
            ]
          : []),
      ].map((tab) => ({
        label: tab.label,
        href: tab.href,
        isActive: scope === tab.scope,
      })),
    [isAdmin, scope],
  );

  // ---- Filtered list ----
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const ds = toDisplayStatus(item.status);
      if (filter === "open") return ds === "open" || ds === "in_progress";
      if (filter === "done") return ds === "done";
      return true;
    });
  }, [items, filter]);

  const visibleTaskIds = useMemo(
    () => filteredItems.map((item) => item.id).filter((id): id is string => Boolean(id)),
    [filteredItems],
  );

  const selectedVisibleCount = useMemo(
    () => visibleTaskIds.filter((id) => selectedTaskIds.includes(id)).length,
    [selectedTaskIds, visibleTaskIds],
  );

  const allVisibleSelected =
    visibleTaskIds.length > 0 && selectedVisibleCount === visibleTaskIds.length;
  const someVisibleSelected =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleTaskIds.length;

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_TASK_CATEGORIES,
          ...items.map((item) => getTaskCategory(item)).filter(Boolean),
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [items],
  );

  useEffect(() => {
    const liveIds = new Set(items.map((item) => item.id).filter(Boolean));
    setSelectedTaskIds((current) => current.filter((id) => liveIds.has(id)));
  }, [items]);

  // ---- Auto-select first item ----
  useEffect(() => {
    if (loading || filteredItems.length === 0) return;
    const currentExists = selectedId && filteredItems.some((i) => i.id === selectedId);
    if (!currentExists) {
      setSelectedId(filteredItems[0].id);
      setFocusedIndex(0);
    }
  }, [loading, filteredItems, selectedId]);

  useEffect(() => {
    if (selectedId) {
      const idx = filteredItems.findIndex((i) => i.id === selectedId);
      if (idx >= 0) setFocusedIndex(idx);
    }
  }, [selectedId, filteredItems]);

  // ---- Keyboard navigation ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (!filteredItems.length) return;
          const nextIdx = Math.min(focusedIndex + 1, filteredItems.length - 1);
          setFocusedIndex(nextIdx);
          setSelectedId(filteredItems[nextIdx].id);
          listPanelRef.current?.querySelectorAll("[data-task-item]")[nextIdx]?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (!filteredItems.length) return;
          const prevIdx = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prevIdx);
          setSelectedId(filteredItems[prevIdx].id);
          listPanelRef.current?.querySelectorAll("[data-task-item]")[prevIdx]?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "Enter":
          if (!filteredItems.length) return;
          setSelectedId(filteredItems[focusedIndex].id);
          setMobileShowDetail(true);
          break;
        case "Escape":
          setMobileShowDetail(false);
          break;
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, focusedIndex]);

  // ---- Update task fields ----
  async function updateTask(id: string, patch: TaskPatch, localPatch: Partial<TasksRow> = patch) {
    setUpdatingId(id);
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      toast.success("Task updated");
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...localPatch } : t)));
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateStatus(id: string, status: string) {
    await updateTask(id, { status }, { status });
  }

  function updateTaskCategoryLocally(task: TasksRow, category: string | null): TasksRow {
    const metadata =
      typeof task.extraction_metadata === "object" &&
      task.extraction_metadata !== null &&
      !Array.isArray(task.extraction_metadata)
        ? { ...(task.extraction_metadata as Record<string, unknown>) }
        : {};

    if (category) {
      metadata.task_category = category;
    } else {
      delete metadata.task_category;
    }

    return { ...task, extraction_metadata: metadata };
  }

  function toggleTaskSelection(id: string, checked: boolean) {
    setSelectedTaskIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((taskId) => taskId !== id);
    });
  }

  function toggleVisibleSelection(checked: boolean) {
    setSelectedTaskIds((current) => {
      if (!checked) {
        return current.filter((id) => !visibleTaskIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleTaskIds]));
    });
  }

  async function applyBulkEdit() {
    if (selectedTaskIds.length === 0) return;

    const payload: {
      task_ids: string[];
      category?: string | null;
      assignee_user_id?: string | null;
    } = { task_ids: selectedTaskIds };

    const selectedUser =
      bulkAssigneeUserId !== "__no_change__" && bulkAssigneeUserId !== "__unassigned__"
        ? users.find((user) => user.id === bulkAssigneeUserId)
        : null;

    if (bulkCategory === "__clear__") {
      payload.category = null;
    } else if (bulkCategory !== "__no_change__") {
      payload.category = bulkCategory;
    }

    if (bulkAssigneeUserId === "__unassigned__") {
      payload.assignee_user_id = null;
    } else if (bulkAssigneeUserId !== "__no_change__") {
      payload.assignee_user_id = bulkAssigneeUserId;
    }

    if (payload.category === undefined && payload.assignee_user_id === undefined) {
      toast.error("Choose a category or assignee before applying bulk edits");
      return;
    }

    setBulkUpdating(true);
    try {
      await apiFetch("/api/tasks/bulk", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setItems((current) =>
        current.map((task) => {
          if (!task.id || !selectedTaskIds.includes(task.id)) return task;

          let nextTask = task;
          if (payload.category !== undefined) {
            nextTask = updateTaskCategoryLocally(nextTask, payload.category);
          }

          if (payload.assignee_user_id !== undefined) {
            nextTask = {
              ...nextTask,
              assignee_person_id: selectedUser?.person_id ?? null,
              assignee_email: selectedUser?.email ?? null,
              assignee_name:
                payload.assignee_user_id === null
                  ? null
                  : selectedUser
                    ? userOptionLabel(selectedUser)
                    : nextTask.assignee_name,
            };
          }

          return nextTask;
        }),
      );
      setBulkCategory("__no_change__");
      setBulkAssigneeUserId("__no_change__");
      toast.success(`Updated ${selectedTaskIds.length} selected task${selectedTaskIds.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update selected tasks");
    } finally {
      setBulkUpdating(false);
    }
  }

  // ---- Delete ----
  async function deleteItem(id: string) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
      toast.success("Task deleted");
      if (selectedId === id) {
        setSelectedId(null);
        setMobileShowDetail(false);
      }
      setSelectedTaskIds((current) => current.filter((taskId) => taskId !== id));
      setItems((prev) => prev.filter((t) => t.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteSelectedItems() {
    if (selectedTaskIds.length === 0) return;

    setBulkDeleting(true);
    try {
      await apiFetch("/api/tasks/bulk", {
        method: "DELETE",
        body: JSON.stringify({ task_ids: selectedTaskIds }),
      });

      const selectedSet = new Set(selectedTaskIds);
      setItems((prev) => prev.filter((task) => !task.id || !selectedSet.has(task.id)));
      setTotal((prev) => Math.max(0, prev - selectedSet.size));
      if (selectedId && selectedSet.has(selectedId)) {
        setSelectedId(null);
        setMobileShowDetail(false);
      }
      setSelectedTaskIds([]);
      toast.success(`Deleted ${selectedSet.size} selected task${selectedSet.size === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete selected tasks");
    } finally {
      setBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  }

  function selectItem(id: string) {
    setSelectedId(id);
    setMobileShowDetail(true);
  }

  const openCount = useMemo(
    () => items.filter((i) => { const ds = toDisplayStatus(i.status); return ds === "open" || ds === "in_progress"; }).length,
    [items],
  );
  const doneCount = useMemo(
    () => items.filter((i) => toDisplayStatus(i.status) === "done").length,
    [items],
  );

  return (
    <>
      <PageShell
        variant="dashboard"
        title="Tasks"
        showHeader={false}
        className="px-0! py-0!"
        contentClassName="space-y-0 overflow-hidden pt-0 pb-0"
        fillHeight
      >
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden">
        <div className="border-b border-border/40 bg-background px-6 pt-4">
          <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
          {!profileLoading && (
            <PageTabs
              tabs={scopeTabs}
              variant="inline"
              className="-mr-1 mb-0 mt-2 w-[calc(100vw-0.25rem)] min-w-0 sm:mr-0 sm:w-full md:flex-1"
              onTabClick={(href) => {
                const nextScope = new URL(href, "http://local").searchParams.get("scope");
                if (nextScope === "mine" || nextScope === "brandon" || nextScope === "all") {
                  handleScopeChange(nextScope);
                }
              }}
            />
          )}
        </div>
        <div
          ref={containerRef}
          data-task-split-view
          className="flex min-h-0 flex-1 overflow-hidden"
        >

        {/* ── Left: task list ── */}
        <div
          ref={listPanelRef}
          className={cn(
            "flex h-full min-w-0 flex-col overflow-hidden border-r border-border/40 bg-background lg:w-[var(--tasks-left-pct)]",
            mobileShowDetail ? "hidden lg:flex" : "flex",
            "w-full lg:shrink-0",
          )}
          style={{ "--tasks-left-pct": `${leftPct}%` } as CSSProperties}
        >
          {/* Status filter — link-style tabs */}
          <div className="border-b border-border/40 px-3">
            <div className="flex">
              {STATUS_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFilter(f.value as StatusFilter);
                    setSelectedId(null);
                    setMobileShowDetail(false);
                  }}
                  className={cn(
                    "h-auto flex-1 rounded-none border-b-2 py-2.5 text-xs font-medium transition-colors hover:bg-transparent",
                    filter === f.value
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                  {f.value === "open" && !loading && openCount > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                      {openCount}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {selectedTaskIds.length > 0 && (
            <div className="border-b border-border/40 px-3 py-2">
              <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedTaskIds.length} selected
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTaskIds([])}
                  className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger className="h-8 w-full gap-2 sm:w-44">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__no_change__">Category unchanged</SelectItem>
                    <SelectItem value="__clear__">Clear category</SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={bulkAssigneeUserId}
                  onValueChange={setBulkAssigneeUserId}
                  disabled={usersLoading}
                >
                  <SelectTrigger className="h-8 w-full gap-2 sm:w-56">
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder={usersLoading ? "Loading users..." : "Assign user"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__no_change__">Assignee unchanged</SelectItem>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {userOptionLabel(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 sm:ml-auto">
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyBulkEdit}
                    disabled={bulkUpdating}
                    className="h-8 gap-1.5"
                  >
                    {bulkUpdating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckSquare2 className="h-3.5 w-3.5" />
                    )}
                    Apply
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    disabled={bulkDeleting}
                    className="h-8 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div
            data-task-list-scroll
            className="flex-1 overflow-auto overscroll-contain"
          >
            {!loading && filteredItems.length > 0 && (
              <TaskListHeader
                allVisibleSelected={allVisibleSelected}
                someVisibleSelected={someVisibleSelected}
                visibleTaskIds={visibleTaskIds}
                selectedTaskIds={selectedTaskIds}
                onToggleVisibleSelection={toggleVisibleSelection}
              />
            )}

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">
                  {filter === "open" && scope === "mine" ? "All caught up" : "Nothing here"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No {filter === "all" ? "" : filter + " "}tasks
                  {scope === "mine" ? " assigned to you" : ""}.
                </p>
              </div>
            )}

            {!loading &&
              filteredItems.map((item) => (
                <TaskListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  isChecked={item.id ? selectedTaskIds.includes(item.id) : false}
                  onClick={() => item.id && selectItem(item.id)}
                  onCheckedChange={(checked) => item.id && toggleTaskSelection(item.id, checked)}
                />
              ))}
          </div>
        </div>

        {/* ── Resize handle ── */}
        <div
          className="group relative hidden w-1 shrink-0 cursor-col-resize lg:block"
          onMouseDown={handleMouseDown}
          aria-hidden="true"
        >
          {/* visible bar */}
          <div className="absolute inset-y-0 left-0 w-px bg-border/40 transition-colors group-hover:bg-primary/50 group-active:bg-primary" />
          {/* wider invisible hit zone */}
          <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
        </div>

        {/* ── Right: detail panel (desktop) ── */}
        <div
          data-task-detail-panel
          className="hidden h-full min-w-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 lg:block"
        >
          {!selected ? (
            <EmptyDetail total={total} openCount={openCount} doneCount={doneCount} loading={loading} scope={scope} />
          ) : (
            <TaskDetail
              task={selected}
              updatingId={updatingId}
              deletingId={deletingId}
              onUpdateStatus={updateStatus}
              onUpdateTask={updateTask}
              onDelete={deleteItem}
              projects={projects}
              projectsLoading={projectsLoading}
            />
          )}
        </div>

        {/* ── Mobile: full-screen detail ── */}
        {mobileShowDetail && selected && (
          <div className="flex h-full flex-1 flex-col overflow-y-auto overscroll-contain bg-background lg:hidden">
            <TaskDetail
              task={selected}
              updatingId={updatingId}
              deletingId={deletingId}
              onUpdateStatus={updateStatus}
              onUpdateTask={updateTask}
              onDelete={deleteItem}
              onBack={() => setMobileShowDetail(false)}
              projects={projects}
              projectsLoading={projectsLoading}
            />
          </div>
        )}
        </div>
      </div>
      </PageShell>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected tasks</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedTaskIds.length} selected task
              {selectedTaskIds.length === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSelectedItems}
              disabled={bulkDeleting || selectedTaskIds.length === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Deleting..." : "Delete selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
