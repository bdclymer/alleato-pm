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
    <Button size="sm" type="submit" variant="outline" className="h-7 text-xs" disabled={disabled || pending}>
      {pending ? "Creating…" : "Create task"}
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

  if (!sourceId) return null;

  if (hasMatchingTask) {
    return (
      <span className="text-xs text-muted-foreground">Task already in flight</span>
    );
  }

  return (
    <form action={createExecutiveTaskDraftAction} className="flex items-center gap-2">
      <input type="hidden" name="sourceId" value={sourceId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="assigneePersonId" value={assigneePersonId} />

      <Select value={assigneePersonId || "__unassigned"} onValueChange={(value) => setAssigneePersonId(value === "__unassigned" ? "" : value)}>
        <SelectTrigger id={selectId} className="h-7 w-40 text-xs bg-background">
          <SelectValue placeholder="Assign to…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unassigned">Unassigned</SelectItem>
          {employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              {employee.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <PendingSubmitButton />
    </form>
  );
}
