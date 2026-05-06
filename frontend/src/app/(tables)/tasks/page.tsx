"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useConfirm } from "@/hooks/use-confirm";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import {
  type TasksRow,
  getTaskSourceLabel,
  getTaskSourceTitle,
  getTaskSourceTarget,
} from "@/features/tasks/task-utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Scope = "mine" | "all";
type StatusFilter = "open" | "done" | "all";
type DisplayStatus = "open" | "in_progress" | "done";

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

function relativeTime(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function getInitials(name: string | null, email: string | null): string {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "?";
}

function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false;
  return new Date(dueDateStr).getTime() < Date.now();
}

// ---------------------------------------------------------------------------
// Visual tokens
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<DisplayStatus, string> = {
  open: "bg-amber-400",
  in_progress: "bg-blue-400",
  done: "bg-emerald-400",
};

const STATUS_SELECT_CLASSES: Record<DisplayStatus, string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  open: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
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
  onClick,
}: {
  item: TasksRow;
  isSelected: boolean;
  onClick: () => void;
}) {
  const ds = toDisplayStatus(item.status);
  const sourceLabel = getTaskSourceLabel(item);
  const priority = (item.priority ?? "").toLowerCase();
  const priorityMeta = PRIORITY_META[priority];
  const overdue = isOverdue(item.due_date);
  const isDone = ds === "done";

  // One clean meta line: Assignee · Source (no badge pills)
  const metaParts = [
    item.assignee_name ?? null,
    sourceLabel && sourceLabel !== "Unknown" ? sourceLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Right-side label: show overdue date if applicable, else relative time
  const rightLabel =
    overdue && !isDone && item.due_date
      ? `Due ${format(new Date(item.due_date), "MMM d")}`
      : relativeTime(item.created_at);

  return (
    <Button
      type="button"
      variant="ghost"
      data-task-item
      onClick={onClick}
      className={cn(
        "relative h-auto w-full rounded-none border-b border-border/30 py-3 pl-4 pr-3 text-left transition-colors",
        isSelected
          ? "bg-primary/[0.04] shadow-[inset_3px_0_0_hsl(var(--primary))]"
          : "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div
          className={cn(
            "mt-[6px] h-2 w-2 shrink-0 rounded-full ring-2 ring-background",
            STATUS_DOT[ds],
            isDone && "opacity-50",
          )}
        />

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "line-clamp-2 text-sm leading-snug",
                isSelected ? "font-medium text-foreground" : "text-foreground/90",
                isDone && "text-muted-foreground line-through decoration-muted-foreground/40",
              )}
            >
              {item.description || item.title || "Untitled task"}
            </p>
            {/* Priority dot (subtle, no pill) */}
            {priorityMeta && !isDone && (
              <div
                className={cn("mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full", priorityMeta.dot)}
                title={priorityMeta.label}
              />
            )}
          </div>

          {/* Meta row */}
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">
              {metaParts || "—"}
            </p>
            <span
              className={cn(
                "shrink-0 text-xs",
                overdue && !isDone ? "font-medium text-red-500" : "text-muted-foreground/60",
              )}
            >
              {rightLabel ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </Button>
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
  onDelete,
  onBack,
}: {
  task: TasksRow;
  updatingId: string | null;
  deletingId: string | null;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
}) {
  const ds = toDisplayStatus(task.status);
  const sourceLabel = getTaskSourceLabel(task);
  const sourceTitle = getTaskSourceTitle(task);
  const sourceTarget = getTaskSourceTarget(task);
  const priority = (task.priority ?? "").toLowerCase();
  const priorityMeta = PRIORITY_META[priority];
  const overdue = isOverdue(task.due_date);
  const { confirm: confirmDelete, ConfirmDialog } = useConfirm();

  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "complete", label: "Complete" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <>
      {ConfirmDialog}
      <div className="mx-auto max-w-2xl px-6 py-7">

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
        <div className="mb-5">
          <p className="text-[15px] font-medium leading-relaxed text-foreground">
            {task.description || task.title || "Untitled task"}
          </p>
        </div>

        {/* Action bar: status + priority badge + source + delete */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {/* Status dropdown */}
          <Select
            value={task.status ?? "open"}
            onValueChange={(value) => task.id && onUpdateStatus(task.id, value)}
            disabled={updatingId === task.id}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-auto min-w-[110px] border px-3 text-xs font-medium",
                STATUS_SELECT_CLASSES[ds],
              )}
            >
              {updatingId === task.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority badge */}
          {priorityMeta && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
                priorityMeta.badge,
              )}
            >
              <div className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dot)} />
              {priorityMeta.label}
            </span>
          )}

          {/* Push rest to right */}
          <div className="ml-auto flex items-center gap-1.5">
            {sourceTarget && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-border/60 text-xs"
                onClick={() => {
                  if (sourceTarget.external) {
                    window.open(sourceTarget.href, "_blank", "noopener,noreferrer");
                  } else {
                    window.location.href = sourceTarget.href;
                  }
                }}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                View source
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-500"
              disabled={deletingId === task.id}
              onClick={async () => {
                const ok = await confirmDelete({
                  description: "Delete this task? This cannot be undone.",
                  variant: "destructive",
                  confirmLabel: "Delete",
                });
                if (ok && task.id) onDelete(task.id);
              }}
            >
              {deletingId === task.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Info card: all metadata without duplication */}
        <div className="divide-y divide-border/30 rounded-lg bg-muted/50">

          {/* Assigned to */}
          {(task.assignee_name || task.assignee_email) && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">Assigned to</span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(task.assignee_name, task.assignee_email)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {task.assignee_name ?? task.assignee_email}
                  </p>
                  {task.assignee_name && task.assignee_email && (
                    <p className="truncate text-xs text-muted-foreground">{task.assignee_email}</p>
                  )}
                </div>
                {task.assigned_by && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    via {task.assigned_by}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Due date */}
          {task.due_date && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">Due date</span>
              <span
                className={cn(
                  "text-sm",
                  overdue && ds !== "done"
                    ? "font-medium text-red-600"
                    : "text-foreground",
                )}
              >
                {format(new Date(task.due_date), "MMMM d, yyyy")}
                {overdue && ds !== "done" && (
                  <span className="ml-2 text-xs font-normal text-red-500">overdue</span>
                )}
              </span>
            </div>
          )}

          {/* Project */}
          {task.project_name && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">Project</span>
              <span className="text-sm text-foreground">{task.project_name}</span>
            </div>
          )}

          {/* Source */}
          <div className="flex items-start gap-3 px-4 py-3">
            <span className="w-20 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">From</span>
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {sourceLabel}
              </span>
              {sourceTitle && (
                <p className="mt-1 text-sm text-foreground leading-snug">
                  {sourceTitle}
                </p>
              )}
            </div>
          </div>

          {/* Created */}
          {task.created_at && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">Created</span>
              <span className="text-sm text-muted-foreground">
                {new Date(task.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
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
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

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

  // When scope changes reset selection and status filter
  const handleScopeChange = useCallback((nextScope: Scope) => {
    setScope(nextScope);
    setSelectedId(null);
    setFilter("open");
    setMobileShowDetail(false);
  }, []);

  // ---- Filtered list ----
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const ds = toDisplayStatus(item.status);
      if (filter === "open") return ds === "open" || ds === "in_progress";
      if (filter === "done") return ds === "done";
      return true;
    });
  }, [items, filter]);

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

  // ---- Update status ----
  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(`Marked as ${status}`);
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
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
      setItems((prev) => prev.filter((t) => t.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeletingId(null);
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
    <PageShell
      variant="dashboard"
      title="Tasks"
      showHeader={false}
      className="px-0! py-0!"
      contentClassName="space-y-0 pt-0 pb-0"
      fillHeight
    >
      <div ref={containerRef} className="flex h-full min-h-0">

        {/* ── Left: task list ── */}
        <div
          ref={listPanelRef}
          className={cn(
            "flex flex-col border-r border-border/40 bg-background overflow-hidden",
            mobileShowDetail ? "hidden lg:flex" : "flex",
            "w-full lg:shrink-0",
          )}
          style={{ width: `${leftPct}%` }}
        >
          {/* Scope tabs — My Tasks / All Tasks (admin-only second tab) + item count */}
          {(!profileLoading) && (
            <div className="border-b border-border/40 px-3 py-2">
              <Tabs
                value={scope}
                onValueChange={(v) => handleScopeChange(v as Scope)}
              >
                <TabsList className="h-7 w-full gap-0 rounded-md bg-muted/60 p-0.5">
                  <TabsTrigger
                    value="mine"
                    className="h-6 flex-1 rounded-sm px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-xs data-[state=inactive]:text-muted-foreground"
                  >
                    My Tasks
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger
                      value="all"
                      className="h-6 flex-1 rounded-sm px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-xs data-[state=inactive]:text-muted-foreground"
                    >
                      All Tasks
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Status filter tabs */}
          <div className="border-b border-border/40 px-3 py-2">
            <Tabs
              value={filter}
              onValueChange={(v) => {
                setFilter(v as StatusFilter);
                setSelectedId(null);
                setMobileShowDetail(false);
              }}
            >
              <TabsList className="h-7 w-full gap-0 rounded-md bg-muted/60 p-0.5">
                {STATUS_FILTERS.map((f) => (
                  <TabsTrigger
                    key={f.value}
                    value={f.value}
                    className="h-6 flex-1 rounded-sm px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-xs data-[state=inactive]:text-muted-foreground"
                  >
                    {f.label}
                    {f.value === "open" && !loading && openCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                        {openCount}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
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
                  onClick={() => item.id && selectItem(item.id)}
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
        <div className="hidden flex-1 overflow-y-auto bg-muted/20 lg:block">
          {!selected ? (
            <EmptyDetail total={total} openCount={openCount} doneCount={doneCount} loading={loading} scope={scope} />
          ) : (
            <TaskDetail
              task={selected}
              updatingId={updatingId}
              deletingId={deletingId}
              onUpdateStatus={updateStatus}
              onDelete={deleteItem}
            />
          )}
        </div>

        {/* ── Mobile: full-screen detail ── */}
        {mobileShowDetail && selected && (
          <div className="flex flex-1 flex-col overflow-y-auto bg-background lg:hidden">
            <TaskDetail
              task={selected}
              updatingId={updatingId}
              deletingId={deletingId}
              onUpdateStatus={updateStatus}
              onDelete={deleteItem}
              onBack={() => setMobileShowDetail(false)}
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}
