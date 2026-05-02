"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { createExecutiveTaskDraftAction } from "@/app/(main)/actions/executive-briefing-actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ExecutiveTaskAssigneeOption = {
  id: string;
  label: string;
  email: string | null;
};

function PendingSubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button size="sm" type="submit" disabled={disabled || pending}>
      {pending ? "Creating..." : "Create task"}
    </Button>
  );
}

export function ExecutiveTaskDraftForm({
  sourceId,
  title,
  description,
  employees,
  hasMatchingTask,
}: {
  sourceId: string | null | undefined;
  title: string;
  description: string;
  employees: ExecutiveTaskAssigneeOption[];
  hasMatchingTask: boolean;
}) {
  const selectId = useId();
  const [assigneePersonId, setAssigneePersonId] = useState<string>("");

  if (!sourceId) {
    return (
      <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        This item does not have a direct source record, so a task cannot be drafted from it yet.
      </div>
    );
  }

  if (hasMatchingTask) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        A matching task is already in flight for this source. Review the existing task below before
        creating another one.
      </div>
    );
  }

  return (
    <form action={createExecutiveTaskDraftAction} className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
      <input type="hidden" name="sourceId" value={sourceId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="assigneePersonId" value={assigneePersonId} />

      <div className="space-y-1">
        <label htmlFor={selectId} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Assign to
        </label>
        <Select value={assigneePersonId || "__unassigned"} onValueChange={(value) => setAssigneePersonId(value === "__unassigned" ? "" : value)}>
          <SelectTrigger id={selectId} className="h-9 bg-background">
            <SelectValue placeholder="Choose employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unassigned">Unassigned draft</SelectItem>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Draft task from the recommended move on this executive item.
        </p>
        <PendingSubmitButton />
      </div>
    </form>
  );
}
