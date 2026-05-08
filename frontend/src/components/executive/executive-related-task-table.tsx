"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateExecutiveRelatedTaskAction } from "@/app/(main)/actions/executive-briefing-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoAlert } from "@/components/ds/InfoAlert";
import type { ExecutiveRelatedTask } from "@/components/executive/executive-signal-card";
import type { ExecutiveTaskAssigneeOption } from "@/components/executive/executive-task-draft-form";

const TASK_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const TASK_PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

function normalizeDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function normalizedStatus(value: string) {
  return TASK_STATUSES.some((status) => status.value === value) ? value : "open";
}

function normalizedPriority(value: string | null) {
  return TASK_PRIORITIES.some((priority) => priority.value === value)
    ? value
    : "medium";
}

function assigneeValue(
  task: ExecutiveRelatedTask,
  employees: ExecutiveTaskAssigneeOption[],
) {
  if (task.assigneePersonId) return task.assigneePersonId;
  const emailMatch = employees.find(
    (employee) =>
      employee.email &&
      task.assigneeEmail &&
      employee.email.toLowerCase() === task.assigneeEmail.toLowerCase(),
  );
  return emailMatch?.id ?? "__unassigned";
}

function ExecutiveRelatedTaskRow({
  task,
  employees,
}: {
  task: ExecutiveRelatedTask;
  employees: ExecutiveTaskAssigneeOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initial = useMemo(
    () => ({
      assigneePersonId: assigneeValue(task, employees),
      status: normalizedStatus(task.status),
      priority: normalizedPriority(task.priority),
      dueDate: normalizeDate(task.dueDate),
    }),
    [employees, task],
  );
  const [assigneePersonId, setAssigneePersonId] = useState(
    initial.assigneePersonId,
  );
  const [status, setStatus] = useState(initial.status);
  const [priority, setPriority] = useState(initial.priority);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [error, setError] = useState<string | null>(null);
  const taskLabel = task.title || task.description;
  const hasChanges =
    assigneePersonId !== initial.assigneePersonId ||
    status !== initial.status ||
    priority !== initial.priority ||
    dueDate !== initial.dueDate;

  const saveTask = () => {
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set(
      "assigneePersonId",
      assigneePersonId === "__unassigned" ? "" : assigneePersonId,
    );
    formData.set("status", status);
    formData.set("priority", priority);
    formData.set("dueDate", dueDate);

    setError(null);
    startTransition(async () => {
      try {
        await updateExecutiveRelatedTaskAction(formData);
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Failed to update this task.",
        );
      }
    });
  };

  return (
    <div className="border-t border-border/60 first:border-t-0">
      <div
        className="min-w-max px-4 py-3 lg:grid lg:items-start lg:gap-3"
        style={{
          gridTemplateColumns: "20rem 13rem 9rem 8rem 10rem 6rem",
        }}
      >
        <div className="w-80 whitespace-normal pr-4">
          <div className="space-y-1">
            <div className="font-medium text-foreground">
              {taskLabel}
            </div>
            {task.title && (
              <div className="text-xs leading-5 text-muted-foreground">
                {task.description}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 w-52 lg:mt-0">
          <Select value={assigneePersonId} onValueChange={setAssigneePersonId}>
            <SelectTrigger
              size="sm"
              className="w-52 bg-background"
              aria-label={`Assignee for ${taskLabel}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="__unassigned">Unassigned</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 w-36 lg:mt-0">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              size="sm"
              className="w-36 bg-background"
              aria-label={`Status for ${taskLabel}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {TASK_STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 w-32 lg:mt-0">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger
              size="sm"
              className="w-32 bg-background"
              aria-label={`Priority for ${taskLabel}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {TASK_PRIORITIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 w-40 lg:mt-0">
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="h-8 w-40 text-xs"
            aria-label={`Due date for ${taskLabel}`}
          />
        </div>
        <div className="mt-3 w-24 text-right lg:mt-0">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-2 px-3 text-xs"
            disabled={!hasChanges || isPending}
            onClick={saveTask}
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Saving" : "Save"}
          </Button>
        </div>
      </div>
      {error && (
        <div className="px-4 pb-3">
          <InfoAlert variant="error" className="text-xs">
            {error}
          </InfoAlert>
        </div>
      )}
    </div>
  );
}

export function ExecutiveRelatedTaskTable({
  tasks,
  employees,
}: {
  tasks: ExecutiveRelatedTask[];
  employees: ExecutiveTaskAssigneeOption[];
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <div className="min-w-max">
        <div
          className="grid gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-primary"
          style={{
            gridTemplateColumns: "20rem 13rem 9rem 8rem 10rem 6rem",
          }}
        >
          <div>Task</div>
          <div>Assignee</div>
          <div>Status</div>
          <div>Priority</div>
          <div>Due</div>
          <div className="text-right">Action</div>
        </div>
        <div>
          {tasks.map((task) => (
            <ExecutiveRelatedTaskRow
              key={task.id}
              task={task}
              employees={employees}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
