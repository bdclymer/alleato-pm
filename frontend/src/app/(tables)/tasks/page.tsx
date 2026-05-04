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
  Circle,
  GripVertical,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { EmptyState } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useConfirm } from "@/hooks/use-confirm";
import {
  type TasksRow,
  getTaskSourceLabel,
  getTaskSourceTitle,
  getTaskSourceTarget,
} from "@/features/tasks/task-utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type StatusFilter = "open" | "done" | "all";
type DisplayStatus = "open" | "in_progress" | "done";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

const DONE_STATUSES = new Set(["complete", "closed", "done", "cancelled"]);
const IN_PROGRESS_STATUSES = new Set(["in_progress", "started", "active"]);

const STATUS_META: Record<DisplayStatus, { icon: typeof Circle; className: string; label: string }> = {
  open: {
    icon: Circle,
    className: "text-status-warning",
    label: "Open",
  },
  in_progress: {
    icon: Loader2,
    className: "text-status-info",
    label: "In Progress",
  },
  done: {
    icon: ShieldCheck,
    className: "text-status-success",
    label: "Done",
  },
};

const PRIORITY_META: Record<string, { className: string; label: string }> = {
  high: { className: "text-status-error", label: "High" },
  medium: { className: "text-status-warning", label: "Medium" },
  low: { className: "text-muted-foreground", label: "Low" },
};

const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 600;
const PANEL_DEFAULT_WIDTH = 420;
const PANEL_STORAGE_KEY = "tasks-inbox-panel-width";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDisplayStatus(status: string | null): DisplayStatus {
  const s = (status ?? "").toLowerCase();
  if (DONE_STATUSES.has(s)) return "done";
  if (IN_PROGRESS_STATUSES.has(s)) return "in_progress";
  return "open";
}

function relativeTime(dateStr: string | null) {
  if (!dateStr) return "—";
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
  return new Date(dateStr).toLocaleDateString();
}

function getSavedPanelWidth(): number {
  if (typeof window === "undefined") return PANEL_DEFAULT_WIDTH;
  try {
    const saved = localStorage.getItem(PANEL_STORAGE_KEY);
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= PANEL_MIN_WIDTH && w <= PANEL_MAX_WIDTH) return w;
    }
  } catch {
    // ignore
  }
  return PANEL_DEFAULT_WIDTH;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

// ---------------------------------------------------------------------------
// Resizable Panel Hook
// ---------------------------------------------------------------------------

function useResizablePanel() {
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    setPanelWidth(getSavedPanelWidth());
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(
        PANEL_MAX_WIDTH,
        Math.max(PANEL_MIN_WIDTH, startWidth.current + delta),
      );
      setPanelWidth(newWidth);
    }

    function handleMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem(PANEL_STORAGE_KEY, String(panelWidth));
      } catch {
        // ignore
      }
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [panelWidth]);

  return { panelWidth, handleMouseDown };
}

// ---------------------------------------------------------------------------
// Task Detail Panel
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
  const displayStatus = toDisplayStatus(task.status);
  const sourceLabel = getTaskSourceLabel(task);
  const sourceTitle = getTaskSourceTitle(task);
  const sourceTarget = getTaskSourceTarget(task);
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
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-5 lg:px-8 lg:py-7">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-2 gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}

        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SectionRuleHeading>
                {task.description || "Untitled task"}
              </SectionRuleHeading>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono">{(task.id ?? "").slice(0, 8)}</span>
                {task.priority && PRIORITY_META[task.priority.toLowerCase()] && (
                  <>
                    <span className="text-border">·</span>
                    <span className={cn("font-medium", PRIORITY_META[task.priority.toLowerCase()].className)}>
                      {PRIORITY_META[task.priority.toLowerCase()].label} priority
                    </span>
                  </>
                )}
                <span className="text-border">·</span>
                <span>{relativeTime(task.created_at)}</span>
              </div>
            </div>

            <Button
              size="icon-sm"
              variant="ghost"
              className="shrink-0 text-muted-foreground hover:text-status-error hover:bg-status-error/10"
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
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select
              value={task.status ?? "open"}
              onValueChange={(value) => task.id && onUpdateStatus(task.id, value)}
              disabled={updatingId === task.id}
            >
              <SelectTrigger
                className={cn(
                  "h-7 w-auto min-w-[90px] border-border/60 px-2 pr-7 text-xs font-medium",
                  displayStatus === "done" && "bg-status-success/15 text-status-success",
                  displayStatus === "open" && "bg-status-warning/15 text-status-warning",
                  displayStatus === "in_progress" && "bg-status-info/15 text-status-info",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {sourceTarget && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-border/60 text-xs gap-1.5"
                onClick={() => {
                  if (sourceTarget.external) {
                    window.open(sourceTarget.href, "_blank", "noopener,noreferrer");
                  } else {
                    window.location.href = sourceTarget.href;
                  }
                }}
              >
                <ArrowUpRight className="h-3 w-3" />
                Open Source
              </Button>
            )}
          </div>
        </div>

        {/* Assignee */}
        {(task.assignee_name || task.assignee_email) && (
          <div>
            <SectionRuleHeading label="Assigned To" />
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {getInitials(task.assignee_name, task.assignee_email)}
              </span>
              <div>
                {task.assignee_name && (
                  <p className="text-sm font-medium text-foreground">{task.assignee_name}</p>
                )}
                {task.assignee_email && (
                  <p className="text-xs text-muted-foreground">{task.assignee_email}</p>
                )}
              </div>
            </div>
            {task.assigned_by && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Assigned by <span className="text-foreground">{task.assigned_by}</span>
              </p>
            )}
          </div>
        )}

        {/* Details */}
        <div>
          <SectionRuleHeading label="Details" />
          <div className="space-y-1.5">
            {task.due_date && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">Due date</span>
                <span className="text-foreground">
                  {format(new Date(task.due_date), "MMM d, yyyy")}
                </span>
              </div>
            )}
            {task.priority && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">Priority</span>
                <span className={cn(
                  "font-medium",
                  PRIORITY_META[task.priority.toLowerCase()]?.className ?? "text-foreground",
                )}>
                  {PRIORITY_META[task.priority.toLowerCase()]?.label ?? task.priority}
                </span>
              </div>
            )}
            {task.project_name && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">Project</span>
                <span className="text-foreground">{task.project_name}</span>
              </div>
            )}
            {task.created_at && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">Created</span>
                <span className="text-foreground">
                  {new Date(task.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {task.updated_at && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">Updated</span>
                <span className="text-foreground">{relativeTime(task.updated_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Source */}
        <div>
          <SectionRuleHeading label="Source" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-muted-foreground">System</span>
              <Badge variant="outline" className="h-5 px-1.5 text-xs">
                {sourceLabel}
              </Badge>
            </div>
            {sourceTitle && (
              <div className="flex items-start gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">Document</span>
                {sourceTarget ? (
                  <a
                    href={sourceTarget.href}
                    target={sourceTarget.external ? "_blank" : undefined}
                    rel={sourceTarget.external ? "noopener noreferrer" : undefined}
                    className="text-primary hover:underline flex items-center gap-1 break-all"
                  >
                    {sourceTitle}
                    {sourceTarget.external && <ArrowUpRight className="h-3 w-3 shrink-0" />}
                  </a>
                ) : (
                  <span className="text-foreground break-all">{sourceTitle}</span>
                )}
              </div>
            )}
            {task.source_type && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">Type</span>
                <span className="text-foreground capitalize">{task.source_type}</span>
              </div>
            )}
            {task.metadata_id && (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground">Source ID</span>
                <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {task.metadata_id.slice(0, 16)}…
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TasksPage() {
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
  const { panelWidth, handleMouseDown } = useResizablePanel();

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  // ---- Fetch ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ data?: TasksRow[] }>("/api/tasks");
      setItems(data.data ?? []);
      setTotal((data.data ?? []).length);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Auto-select first visible item when list loads
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const ds = toDisplayStatus(item.status);
      if (filter === "open") return ds === "open" || ds === "in_progress";
      if (filter === "done") return ds === "done";
      return true;
    });
  }, [items, filter]);

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
          if (filteredItems.length === 0) return;
          const nextIdx = Math.min(focusedIndex + 1, filteredItems.length - 1);
          setFocusedIndex(nextIdx);
          setSelectedId(filteredItems[nextIdx].id);
          const listEl = listPanelRef.current;
          if (listEl) {
            listEl.querySelectorAll("[data-task-item]")[nextIdx]?.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (filteredItems.length === 0) return;
          const prevIdx = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prevIdx);
          setSelectedId(filteredItems[prevIdx].id);
          const listEl = listPanelRef.current;
          if (listEl) {
            listEl.querySelectorAll("[data-task-item]")[prevIdx]?.scrollIntoView({ block: "nearest" });
          }
          break;
        }
        case "Enter":
          if (filteredItems.length === 0) return;
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

  const openCount = useMemo(() => items.filter((i) => {
    const ds = toDisplayStatus(i.status);
    return ds === "open" || ds === "in_progress";
  }).length, [items]);

  const doneCount = useMemo(() => items.filter((i) => toDisplayStatus(i.status) === "done").length, [items]);

  return (
    <PageShell
      variant="dashboard"
      title="Tasks"
      showHeader={false}
      className="bg-muted/30 px-0! py-0!"
      contentClassName="space-y-0 pt-0 pb-0"
      fillHeight
      description="Review and manage tasks extracted from meetings, emails, and documents."
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 border-b border-border/60">

          {/* ---- Left: list panel ---- */}
          <div
            ref={listPanelRef}
            className={cn(
              "flex flex-col border-r border-border/60 bg-background",
              mobileShowDetail ? "hidden lg:flex" : "flex",
              "w-full lg:w-auto lg:shrink-0",
            )}
            style={{ width: panelWidth, minWidth: PANEL_MIN_WIDTH, maxWidth: PANEL_MAX_WIDTH }}
          >
            {/* Panel header */}
            <div className="border-b border-border/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground">Tasks</p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {total} {total === 1 ? "task" : "tasks"}
                </p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="border-b border-border/60 px-3 py-2">
              <Tabs
                value={filter}
                onValueChange={(v) => {
                  setFilter(v as StatusFilter);
                  setSelectedId(null);
                  setMobileShowDetail(false);
                }}
              >
                <TabsList className="h-8 w-full justify-start gap-1 rounded-md bg-muted/70 p-1">
                  {STATUS_FILTERS.map((f) => (
                    <TabsTrigger key={f.value} value={f.value} className="h-6 rounded-sm px-3 text-xs">
                      {f.label}
                      {f.value === "open" && openCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                          {openCount}
                        </span>
                      )}
                      {f.value === "done" && doneCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          {doneCount}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto bg-muted/25">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}

              {!loading && filteredItems.length === 0 && (
                <div className="flex h-full min-h-48 items-center justify-center">
                  <EmptyState
                    icon={<CheckCircle2 />}
                    title="No tasks"
                    description={`No ${filter} tasks found.`}
                  />
                </div>
              )}

              {!loading && filteredItems.map((item, itemIndex) => {
                const ds = toDisplayStatus(item.status);
                const meta = STATUS_META[ds];
                const isSelected = selectedId === item.id;
                const isFocused = focusedIndex === itemIndex;
                const sourceLabel = getTaskSourceLabel(item);

                return (
                  <Button
                    key={item.id}
                    type="button"
                    data-task-item
                    variant="ghost"
                    size="default"
                    onClick={() => item.id && selectItem(item.id)}
                    className={cn(
                      "group h-auto w-full items-start justify-start gap-2 rounded-none border-b border-border/60 px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-background shadow-[inset_2px_0_0_hsl(var(--primary))]"
                        : "hover:bg-background/70",
                      isFocused && !isSelected && "bg-background/80",
                    )}
                  >
                    <meta.icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", meta.className)} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {item.description || "Untitled task"}
                        </span>
                        {item.priority && item.priority.toLowerCase() === "high" && (
                          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-status-error">
                            High
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {item.assignee_name && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {item.assignee_name}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {sourceLabel}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                      {relativeTime(item.created_at)}
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* ---- Resize handle ---- */}
          <div
            className="group hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-muted/50 active:bg-muted lg:flex"
            onMouseDown={handleMouseDown}
            aria-hidden="true"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
          </div>

          {/* ---- Right: detail panel (desktop) ---- */}
          <div className="hidden flex-1 overflow-y-auto bg-background lg:block">
            {!selected && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a task to view details</p>
              </div>
            )}
            {selected && (
              <TaskDetail
                task={selected}
                updatingId={updatingId}
                deletingId={deletingId}
                onUpdateStatus={updateStatus}
                onDelete={deleteItem}
              />
            )}
          </div>

          {/* ---- Mobile: full-screen detail ---- */}
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
      </div>
    </PageShell>
  );
}
