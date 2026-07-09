"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUsers } from "@/hooks/use-users";
import { apiFetch } from "@/lib/api-client";
import { handleFormError } from "@/lib/handle-form-error";

// ── Feedback dialog ─────────────────────────────────────────────────────────

export type FeedbackTarget = {
  subjectId: string;
  title: string;
  project: string | null;
};

/**
 * Records a viewer judgment on a brief item into the AI learning loop
 * (`ai_feedback_events`). Accurate / Inaccurate plus an optional note — the note
 * is the highest-signal training input, so it's always available.
 */
export function BriefFeedbackDialog({
  target,
  onOpenChange,
}: {
  target: FeedbackTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [signal, setSignal] = useState<"positive" | "negative">("positive");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setSignal("positive");
      setNote("");
    }
  }, [target]);

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await apiFetch("/api/executive/daily-brief/feedback", {
        method: "POST",
        body: JSON.stringify({
          subjectId: target.subjectId,
          signal,
          title: target.title,
          project: target.project,
          note: note.trim() || null,
        }),
      });
      toast.success("Feedback recorded — thanks, this trains the brief.");
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, { entity: "feedback", action: "save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(target)} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>Provide feedback</ModalTitle>
          <ModalDescription className="line-clamp-2">
            {target?.title}
          </ModalDescription>
        </ModalHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={signal === "positive" ? "default" : "outline"}
              onClick={() => setSignal("positive")}
            >
              <ThumbsUp className="size-4" aria-hidden /> Accurate
            </Button>
            <Button
              type="button"
              variant={signal === "negative" ? "default" : "outline"}
              onClick={() => setSignal("negative")}
            >
              <ThumbsDown className="size-4" aria-hidden /> Inaccurate
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-fb-note">Note (optional)</Label>
            <Textarea
              id="brief-fb-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What's wrong, or what would make this more useful?"
              rows={3}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Submit feedback
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ── Task dialog (create + edit) ─────────────────────────────────────────────

export type TaskDialogState = {
  mode: "create" | "edit";
  taskId?: string;
  title: string;
  description: string;
  projectId: number | null;
  metadataId: string | null;
  subjectId: string | null;
  assigneePersonId: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
};

const PRIORITIES: Array<TaskDialogState["priority"]> = ["high", "medium", "low"];

/**
 * Create or edit a real task from the brief. Create → the brief task route
 * (anchored to the item source when it has one). Edit / Delete → the shared
 * task routes. On success the caller updates the brief in place.
 */
export function BriefTaskDialog({
  state,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  state: TaskDialogState | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (taskId: string) => void;
  onDeleted?: (taskId: string) => void;
}) {
  const { options: userOptions } = useUsers({ personType: "user" });
  const [draft, setDraft] = useState<TaskDialogState | null>(state);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setDraft(state), [state]);

  const dueDateObj = useMemo(
    () => (draft?.dueDate ? new Date(`${draft.dueDate}T12:00:00Z`) : undefined),
    [draft?.dueDate],
  );

  if (!draft) {
    return <Modal open={false} onOpenChange={onOpenChange} />;
  }

  const set = (patch: Partial<TaskDialogState>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  const canSave = draft.title.trim().length > 0 && draft.description.trim().length > 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (draft.mode === "create") {
        const result = await apiFetch<{ taskId: string }>(
          "/api/executive/daily-brief/tasks",
          {
            method: "POST",
            body: JSON.stringify({
              title: draft.title.trim(),
              description: draft.description.trim(),
              metadataId: draft.metadataId,
              projectId: draft.projectId,
              assigneePersonId: draft.assigneePersonId,
              dueDate: draft.dueDate,
              priority: draft.priority,
              subjectId: draft.subjectId,
            }),
          },
        );
        toast.success("Task created.");
        onSaved(result.taskId);
      } else if (draft.taskId) {
        await apiFetch(`/api/tasks/${draft.taskId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: draft.title.trim(),
            description: draft.description.trim(),
            priority: draft.priority,
            due_date: draft.dueDate,
            assignee_person_id: draft.assigneePersonId,
          }),
        });
        toast.success("Task updated.");
        onSaved(draft.taskId);
      }
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, {
        entity: "task",
        action: draft.mode === "create" ? "create" : "update",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.taskId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/tasks/${draft.taskId}`, { method: "DELETE" });
      toast.success("Task deleted.");
      onDeleted?.(draft.taskId);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, { entity: "task", action: "delete" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={Boolean(state)} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>
            {draft.mode === "create" ? "Create task" : "Edit task"}
          </ModalTitle>
        </ModalHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brief-task-title">Title</Label>
            <Input
              id="brief-task-title"
              value={draft.title}
              onChange={(event) => set({ title: event.target.value })}
              placeholder="Imperative task title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-task-desc">Details</Label>
            <Textarea
              id="brief-task-desc"
              value={draft.description}
              onChange={(event) => set({ description: event.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={draft.assigneePersonId ?? "unassigned"}
                onValueChange={(value) =>
                  set({ assigneePersonId: value === "unassigned" ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {userOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(value) =>
                  set({ priority: value as TaskDialogState["priority"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start font-normal"
                >
                  <CalendarIcon className="size-4" aria-hidden />
                  {dueDateObj ? format(dueDateObj, "PPP") : "No due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDateObj}
                  onSelect={(date) =>
                    set({ dueDate: date ? format(date, "yyyy-MM-dd") : null })
                  }
                  autoFocus
                />
                {draft.dueDate ? (
                  <div className="border-t border-border p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => set({ dueDate: null })}
                    >
                      Clear
                    </Button>
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <ModalFooter className="sm:justify-between">
          {draft.mode === "edit" && draft.taskId ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => void remove()}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={!canSave || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {draft.mode === "create" ? "Create task" : "Save changes"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
