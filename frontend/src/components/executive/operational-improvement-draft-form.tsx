"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { createOperationalImprovementAction } from "@/app/(main)/actions/executive-briefing-actions";
import type { ExecutiveTaskAssigneeOption } from "@/components/executive/executive-task-draft-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function PendingSubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button size="sm" type="submit" disabled={disabled || pending}>
      {pending ? "Creating..." : "Create improvement"}
    </Button>
  );
}

export function OperationalImprovementDraftForm({
  linkId,
  linkType,
  title,
  problemSummary,
  recommendedFix,
  preventionStep,
  priority,
  employees,
  hasMatchingCard,
}: {
  linkId: string | null | undefined;
  linkType: "executive_source" | "executive_follow_up";
  title: string;
  problemSummary: string;
  recommendedFix: string;
  preventionStep: string;
  priority: "urgent" | "high" | "medium" | "low";
  employees: ExecutiveTaskAssigneeOption[];
  hasMatchingCard: boolean;
}) {
  const selectId = useId();
  const dueDateId = useId();
  const [assigneePersonId, setAssigneePersonId] = useState<string>("");

  if (!linkId) {
    return (
      <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        This signal does not have a durable executive link yet, so an operational improvement
        cannot be saved from it.
      </div>
    );
  }

  if (hasMatchingCard) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        An operational improvement already exists for this executive signal. Review the linked card
        below before creating another one.
      </div>
    );
  }

  return (
    <form
      action={createOperationalImprovementAction}
      className="space-y-3 rounded-xl border border-border bg-muted/20 p-3"
    >
      <input type="hidden" name="linkId" value={linkId} />
      <input type="hidden" name="linkType" value={linkType} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="problemSummary" value={problemSummary} />
      <input type="hidden" name="recommendedFix" value={recommendedFix} />
      <input type="hidden" name="preventionStep" value={preventionStep} />
      <input type="hidden" name="priority" value={priority} />
      <input type="hidden" name="assigneePersonId" value={assigneePersonId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor={selectId}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Assign to
          </label>
          <Select
            value={assigneePersonId || "__unassigned"}
            onValueChange={(value) =>
              setAssigneePersonId(value === "__unassigned" ? "" : value)
            }
          >
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

        <div className="space-y-1">
          <label
            htmlFor={dueDateId}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Due date
          </label>
          <Input id={dueDateId} type="date" name="dueDate" className="h-9 bg-background" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Save this as a durable operational improvement card for follow-through.
        </p>
        <PendingSubmitButton />
      </div>
    </form>
  );
}
