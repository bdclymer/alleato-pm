"use client";

import * as React from "react";
import { format } from "date-fns";
import { ArrowUpRight, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ds";
import { apiFetch } from "@/lib/api-client";
import type { MeetingTask } from "./meeting-detail-content";

// ─── Option sets ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

// Statuses the create endpoint accepts (a subset of the edit set).
const CREATE_STATUS_OPTIONS = STATUS_OPTIONS.filter((s) =>
  ["open", "in_progress", "blocked"].includes(s.value),
);
const CREATE_PRIORITY_OPTIONS = PRIORITY_OPTIONS.filter((p) =>
  ["low", "medium", "high"].includes(p.value),
);

const PRIORITY_TEXT: Record<string, string> = {
  urgent: "text-destructive",
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const UNASSIGNED = "__unassigned__";

interface UserOption {
  id: string;
  email?: string | null;
  full_name?: string | null;
}

function userLabel(user: UserOption): string {
  return user.full_name || user.email || "Unnamed user";
}

function isDone(status: string): boolean {
  return status === "done" || status === "completed";
}

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggleDone,
  onOpen,
  busy,
}: {
  task: MeetingTask;
  onToggleDone: (task: MeetingTask) => void;
  onOpen: (task: MeetingTask) => void;
  busy: boolean;
}) {
  const done = isDone(task.status);
  const priority = (task.priority ?? "").toLowerCase();

  return (
    <li className="group flex items-start gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onToggleDone(task)}
        disabled={busy}
        aria-label={done ? "Mark task as open" : "Mark task as done"}
        className="mt-0.5 h-4 w-4 shrink-0 rounded-full p-0 text-muted-foreground/50 hover:bg-transparent hover:text-success"
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpen(task)}
        className="h-auto min-w-0 flex-1 flex-col items-start gap-0.5 whitespace-normal rounded-sm px-0 py-0 text-left font-normal hover:bg-transparent"
      >
        <p
          className={`text-sm leading-snug ${
            done ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {task.title || task.description}
        </p>
        {task.title && task.description !== task.title && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5">
          <span className="text-xs text-muted-foreground">
            {task.assignee_name || task.assignee_email || "Unassigned"}
          </span>
          {priority && priority !== "normal" && (
            <span
              className={`text-xs font-medium capitalize ${PRIORITY_TEXT[priority] ?? "text-muted-foreground"}`}
            >
              {priority}
            </span>
          )}
          {task.due_date && (
            <span className="text-xs text-muted-foreground">
              Due {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>
      </Button>
    </li>
  );
}

// ─── Manager ──────────────────────────────────────────────────────────────────

export function MeetingTasksManager({
  meetingId,
  initialTasks,
  projectId,
  allTasksHref,
}: {
  meetingId: string;
  initialTasks: MeetingTask[];
  projectId: number | null;
  allTasksHref: string;
}) {
  const [tasks, setTasks] = React.useState<MeetingTask[]>(initialTasks);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [usersLoaded, setUsersLoaded] = React.useState(false);
  const [mode, setMode] = React.useState<"closed" | "view" | "create">("closed");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = React.useState<string | null>(null);

  // Keep local state in sync when the server re-renders with fresh props.
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  const loadUsers = React.useCallback(async () => {
    if (usersLoaded) return;
    try {
      const result = await apiFetch<{ users?: UserOption[] }>("/api/users");
      setUsers(result.users ?? []);
    } catch {
      // Non-fatal: assignee picker falls back to showing the stored name.
    } finally {
      setUsersLoaded(true);
    }
  }, [usersLoaded]);

  const patchTask = React.useCallback(
    async (taskId: string, patch: Record<string, unknown>) => {
      const { task } = await apiFetch<{ task: Partial<MeetingTask> }>(
        `/api/tasks/${taskId}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...task } : t)),
      );
    },
    [],
  );

  const handleToggleDone = React.useCallback(
    async (task: MeetingTask) => {
      const next = isDone(task.status) ? "open" : "done";
      setRowBusyId(task.id);
      // Optimistic.
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)),
      );
      try {
        await patchTask(task.id, { status: next });
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
        );
        toast.error("Couldn't update the task status");
      } finally {
        setRowBusyId(null);
      }
    },
    [patchTask],
  );

  const openTask = React.useCallback(
    (task: MeetingTask) => {
      setActiveId(task.id);
      setMode("view");
      void loadUsers();
    },
    [loadUsers],
  );

  const openCreate = React.useCallback(() => {
    setMode("create");
    void loadUsers();
  }, [loadUsers]);

  const closeSheet = React.useCallback(() => {
    setMode("closed");
    setActiveId(null);
  }, []);

  const handleDelete = React.useCallback(
    async (taskId: string) => {
      try {
        await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast.success("Task deleted");
        closeSheet();
      } catch {
        toast.error("Couldn't delete the task");
      }
    },
    [closeSheet],
  );

  const handleCreate = React.useCallback(
    async (draft: {
      title: string;
      description: string;
      priority: string;
      status: string;
      due_date: string;
    }) => {
      const payload = {
        title: draft.title.trim(),
        description: (draft.description.trim() || draft.title.trim()),
        priority: draft.priority,
        status: draft.status,
        dueDate: draft.due_date || null,
      };
      try {
        const result = await apiFetch<{ taskId: string }>(
          `/api/documents/${meetingId}/tasks`,
          { method: "POST", body: JSON.stringify(payload) },
        );
        const created: MeetingTask = {
          id: result.taskId,
          title: payload.title,
          description: payload.description,
          assignee_name: null,
          assignee_email: null,
          status: payload.status,
          priority: payload.priority,
          due_date: payload.dueDate,
          segment_id: null,
        };
        setTasks((prev) => [...prev, created]);
        toast.success("Task added");
        closeSheet();
      } catch (error) {
        const message =
          error instanceof Error && /already exists/i.test(error.message)
            ? "A matching task already exists for this meeting"
            : "Couldn't create the task";
        toast.error(message);
      }
    },
    [meetingId, closeSheet],
  );

  return (
    <div className="space-y-4">
      {tasks.length > 0 ? (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              busy={rowBusyId === task.id}
              onToggleDone={handleToggleDone}
              onOpen={openTask}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<CheckCircle2 />}
          title="No tasks yet"
          description="Action items captured from this meeting will appear here. Add one to get started."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add task
            </Button>
          }
        />
      )}

      {tasks.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="ghost"
            className="-ml-2 h-auto px-2 py-1 text-muted-foreground hover:text-foreground"
            onClick={openCreate}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add task
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="-mr-2 h-auto px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            <Link href={allTasksHref}>
              View all tasks
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <Sheet
        open={mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          {mode === "create" ? (
            <CreateTaskForm onSubmit={handleCreate} onCancel={closeSheet} />
          ) : activeTask ? (
            <TaskDetailPanel
              task={activeTask}
              users={users}
              usersLoaded={usersLoaded}
              projectId={projectId}
              allTasksHref={allTasksHref}
              onPatch={patchTask}
              onDelete={handleDelete}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Detail panel (per-field auto-save) ──────────────────────────────────────

function TaskDetailPanel({
  task,
  users,
  usersLoaded,
  projectId,
  allTasksHref,
  onPatch,
  onDelete,
}: {
  task: MeetingTask;
  users: UserOption[];
  usersLoaded: boolean;
  projectId: number | null;
  allTasksHref: string;
  onPatch: (taskId: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (taskId: string) => void;
}) {
  const [description, setDescription] = React.useState(task.description ?? "");
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    setDescription(task.description ?? "");
    setConfirmingDelete(false);
  }, [task.id, task.description]);

  const currentAssignee = users.find(
    (u) =>
      u.email &&
      task.assignee_email &&
      u.email.toLowerCase() === task.assignee_email.toLowerCase(),
  );

  const save = async (patch: Record<string, unknown>) => {
    try {
      await onPatch(task.id, patch);
    } catch {
      toast.error("Couldn't save the change");
    }
  };

  return (
    <>
      <SheetHeader className="space-y-1 border-b border-border pb-4">
        <SheetTitle className="text-base leading-snug">
          {task.title || "Task"}
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto py-5">
        <div className="space-y-1.5">
          <Label htmlFor="task-description" className="text-xs text-muted-foreground">
            Description
          </Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              const next = description.trim();
              if (next && next !== task.description) {
                void save({ description: next });
              } else {
                setDescription(task.description ?? "");
              }
            }}
            rows={4}
            className="resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={task.status}
              onValueChange={(value) => void save({ status: value })}
            >
              <SelectTrigger>
                <SelectValue>{statusLabel(task.status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select
              value={(task.priority ?? "medium").toLowerCase()}
              onValueChange={(value) => void save({ priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Assignee</Label>
          <Select
            value={currentAssignee?.id ?? UNASSIGNED}
            onValueChange={(value) =>
              void save({ assignee_user_id: value === UNASSIGNED ? null : value })
            }
            disabled={!usersLoaded}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  task.assignee_name || task.assignee_email || "Unassigned"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {userLabel(user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!currentAssignee && task.assignee_name && (
            <p className="text-xs text-muted-foreground">
              Currently {task.assignee_name}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-due" className="text-xs text-muted-foreground">
            Due date
          </Label>
          <Input
            id="task-due"
            type="date"
            defaultValue={task.due_date ?? ""}
            onChange={(e) => void save({ due_date: e.target.value || "" })}
            className="text-sm"
          />
        </div>
      </div>

      <SheetFooter className="flex-row items-center justify-between border-t border-border pt-4 sm:justify-between">
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(task.id)}
            >
              Confirm delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        )}
        <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
          <Link href={allTasksHref}>
            {projectId ? "Project tasks" : "All tasks"}
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </SheetFooter>
    </>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateTaskForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (draft: {
    title: string;
    description: string;
    priority: string;
    status: string;
    due_date: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [status, setStatus] = React.useState("open");
  const [dueDate, setDueDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = title.trim().length > 0 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    await onSubmit({ title, description, priority, status, due_date: dueDate });
    setSubmitting(false);
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-0">
      <SheetHeader className="border-b border-border pb-4">
        <SheetTitle className="text-base">Add task</SheetTitle>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto py-5">
        <div className="space-y-1.5">
          <Label htmlFor="new-task-title" className="text-xs text-muted-foreground">
            Title
          </Label>
          <Input
            id="new-task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to happen?"
            autoFocus
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="new-task-description"
            className="text-xs text-muted-foreground"
          >
            Description
          </Label>
          <Textarea
            id="new-task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional detail (defaults to the title)"
            rows={4}
            className="resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATE_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATE_PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-task-due" className="text-xs text-muted-foreground">
            Due date
          </Label>
          <Input
            id="new-task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-sm"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          You can assign this task to someone after it&apos;s created.
        </p>
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t border-border pt-4">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {submitting ? "Adding..." : "Add task"}
        </Button>
      </SheetFooter>
    </form>
  );
}
