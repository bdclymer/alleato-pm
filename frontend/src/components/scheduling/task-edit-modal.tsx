"use client";

/**
 * =============================================================================
 * TASK EDIT MODAL COMPONENT
 * =============================================================================
 *
 * Simple modal dialog for creating and editing schedule tasks.
 * Supports basic task creation and editing with essential fields.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ScheduleTask,
  ScheduleTaskCreate,
  ScheduleTaskUpdate,
  TaskStatus,
  ConstraintType,
} from "@/types/scheduling";

// =============================================================================
// TYPES
// =============================================================================

interface TaskEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: ScheduleTask | null;
  parentTaskId?: string | null;
  projectId: string;
  availableTasks?: Array<{ id: string; name: string }>;
  onSave: (data: ScheduleTaskCreate | ScheduleTaskUpdate) => Promise<void>;
}

interface FormData {
  name: string;
  start_date: string;
  finish_date: string;
  duration_days: number | null;
  percent_complete: number;
  status: TaskStatus;
  is_milestone: boolean;
  constraint_type: ConstraintType | null;
  constraint_date: string;
  wbs_code: string;
  parent_task_id: string | null;
}

interface FormErrors {
  name?: string;
  start_date?: string;
  finish_date?: string;
  duration_days?: string;
  constraint_date?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

const CONSTRAINT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "No Constraint" },
  { value: "start_no_earlier_than", label: "Start No Earlier Than" },
  { value: "finish_no_later_than", label: "Finish No Later Than" },
  { value: "must_start_on", label: "Must Start On" },
  { value: "must_finish_on", label: "Must Finish On" },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TaskEditModal({
  open,
  onOpenChange,
  task,
  parentTaskId,
  projectId,
  availableTasks = [],
  onSave,
}: TaskEditModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    start_date: "",
    finish_date: "",
    duration_days: null,
    percent_complete: 0,
    status: "not_started",
    is_milestone: false,
    constraint_type: null,
    constraint_date: "",
    wbs_code: "",
    parent_task_id: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(task);

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        start_date: task.start_date || "",
        finish_date: task.finish_date || "",
        duration_days: task.duration_days,
        percent_complete: task.percent_complete,
        status: task.status,
        is_milestone: task.is_milestone,
        constraint_type: task.constraint_type,
        constraint_date: task.constraint_date || "",
        wbs_code: task.wbs_code || "",
        parent_task_id: task.parent_task_id,
      });
    } else {
      // Reset for new task
      setFormData({
        name: "",
        start_date: "",
        finish_date: "",
        duration_days: null,
        percent_complete: 0,
        status: "not_started",
        is_milestone: false,
        constraint_type: null,
        constraint_date: "",
        wbs_code: "",
        parent_task_id: parentTaskId || null,
      });
    }
    setErrors({});
  }, [task, parentTaskId, open]);

  // Handle input changes
  const handleChange = useCallback(
    (field: keyof FormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Task name is required";
    }

    if (formData.start_date && formData.finish_date) {
      const start = new Date(formData.start_date);
      const finish = new Date(formData.finish_date);
      if (start > finish) {
        newErrors.finish_date = "Finish date must be after start date";
      }
    }

    if (formData.is_milestone && formData.duration_days && formData.duration_days !== 0) {
      newErrors.duration_days = "Milestones must have zero duration";
    }

    if (formData.constraint_type && formData.constraint_type !== "none" && !formData.constraint_date) {
      newErrors.constraint_date = "Constraint date is required for this constraint type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setIsSaving(true);

      try {
        const taskData = {
          name: formData.name.trim(),
          start_date: formData.start_date || null,
          finish_date: formData.finish_date || null,
          duration_days: formData.duration_days,
          percent_complete: formData.percent_complete,
          status: formData.status,
          is_milestone: formData.is_milestone,
          constraint_type: formData.constraint_type,
          constraint_date: formData.constraint_date || null,
          wbs_code: formData.wbs_code || null,
          parent_task_id: formData.parent_task_id,
          ...(isEditing ? {} : { project_id: Number(projectId) }),
        };

        await onSave(taskData);
        onOpenChange(false);
      } catch (error) {
        // Error is handled by the parent component
      } finally {
        setIsSaving(false);
      }
    },
    [formData, validateForm, isEditing, projectId, onSave, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Task" : "Create New Task"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify task details and settings" : "Add a new task to your project schedule"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Task Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter task name"
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* WBS Code */}
              <div className="space-y-2">
                <Label htmlFor="wbs_code">WBS Code</Label>
                <Input
                  id="wbs_code"
                  value={formData.wbs_code}
                  onChange={(e) => handleChange("wbs_code", e.target.value)}
                  placeholder="e.g. 1.2.3"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value as TaskStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  className={cn(errors.start_date && "border-destructive")}
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.start_date}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="finish_date">Finish Date</Label>
                <Input
                  id="finish_date"
                  type="date"
                  value={formData.finish_date}
                  onChange={(e) => handleChange("finish_date", e.target.value)}
                  className={cn(errors.finish_date && "border-destructive")}
                />
                {errors.finish_date && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.finish_date}
                  </p>
                )}
              </div>
            </div>

            {/* Duration and Milestone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_days">Duration (days)</Label>
                <Input
                  id="duration_days"
                  type="number"
                  min="0"
                  value={formData.duration_days ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "duration_days",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  disabled={formData.is_milestone}
                  className={cn(errors.duration_days && "border-destructive")}
                />
                {errors.duration_days && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.duration_days}
                  </p>
                )}
                {formData.is_milestone && (
                  <p className="text-sm text-muted-foreground">
                    Milestones have zero duration
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Milestone</Label>
                <div className="flex items-center space-x-2 h-10 px-3 rounded-md border border-input">
                  <Checkbox
                    id="is_milestone"
                    checked={formData.is_milestone}
                    onCheckedChange={(checked) =>
                      handleChange("is_milestone", checked)
                    }
                  />
                  <Label
                    htmlFor="is_milestone"
                    className="text-sm font-normal cursor-pointer"
                  >
                    This is a milestone
                  </Label>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <Label>Progress: {formData.percent_complete}%</Label>
              <Slider
                value={[formData.percent_complete]}
                onValueChange={([value]) => handleChange("percent_complete", value)}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Parent Task */}
            {availableTasks.length > 0 && (
              <div className="space-y-2">
                <Label>Parent Task</Label>
                <Select
                  value={formData.parent_task_id || "none"}
                  onValueChange={(value) =>
                    handleChange("parent_task_id", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (root task)</SelectItem>
                    {availableTasks
                      .filter((t) => t.id !== task?.id)
                      .map((availableTask) => (
                        <SelectItem key={availableTask.id} value={availableTask.id}>
                          {availableTask.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Constraint */}
            <div className="space-y-2">
              <Label htmlFor="constraint_type">Constraint</Label>
              <Select
                value={formData.constraint_type || "none"}
                onValueChange={(value) =>
                  handleChange(
                    "constraint_type",
                    value === "none" ? null : (value as ConstraintType)
                  )
                }
              >
                <SelectTrigger id="constraint_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSTRAINT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Constraint Date */}
            {formData.constraint_type && formData.constraint_type !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="constraint_date">Constraint Date</Label>
                <Input
                  id="constraint_date"
                  type="date"
                  value={formData.constraint_date}
                  onChange={(e) =>
                    handleChange("constraint_date", e.target.value)
                  }
                  className={cn(errors.constraint_date && "border-destructive")}
                />
                {errors.constraint_date && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.constraint_date}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}