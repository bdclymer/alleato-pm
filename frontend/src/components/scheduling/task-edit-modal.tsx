"use client";

/**
 * =============================================================================
 * TASK EDIT MODAL COMPONENT
 * =============================================================================
 *
 * Modal dialog for creating and editing schedule tasks.
 * Supports:
 * - Create new task or edit existing
 * - Full form validation
 * - Date constraints validation
 * - Milestone configuration
 * - Dependency management
 * - Parent task selection
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Calendar, Flag, Link2, AlertCircle, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ScheduleTask,
  ScheduleTaskCreate,
  ScheduleTaskUpdate,
  TaskStatus,
  ConstraintType,
  DependencyType,
  ScheduleDependency,
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
  onAddDependency?: (
    predecessorId: string,
    type: DependencyType,
    lag: number
  ) => Promise<void>;
  onRemoveDependency?: (dependencyId: string) => Promise<void>;
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

const CONSTRAINT_OPTIONS: Array<{
  value: ConstraintType | "none";
  label: string;
}> = [
  { value: "none", label: "No Constraint" },
  { value: "start_no_earlier_than", label: "Start No Earlier Than" },
  { value: "finish_no_later_than", label: "Finish No Later Than" },
  { value: "must_start_on", label: "Must Start On" },
  { value: "must_finish_on", label: "Must Finish On" },
];

const DEPENDENCY_TYPE_OPTIONS: Array<{ value: DependencyType; label: string }> =
  [
    { value: "finish_to_start", label: "Finish to Start (FS)" },
    { value: "start_to_start", label: "Start to Start (SS)" },
    { value: "finish_to_finish", label: "Finish to Finish (FF)" },
    { value: "start_to_finish", label: "Start to Finish (SF)" },
  ];

// =============================================================================
// HELPERS
// =============================================================================

const formatDateForInput = (date: string | null): string => {
  if (!date) return "";
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const calculateDuration = (start: string, finish: string): number | null => {
  if (!start || !finish) return null;
  try {
    const startDate = new Date(start);
    const finishDate = new Date(finish);
    const diffTime = finishDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  } catch {
    return null;
  }
};

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
  onAddDependency,
  onRemoveDependency,
}: TaskEditModalProps) {
  const isEditing = !!task;
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Form state
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
    parent_task_id: parentTaskId || null,
  });

  // Dependency form state
  const [newDependency, setNewDependency] = useState({
    predecessorId: "",
    type: "finish_to_start" as DependencyType,
    lag: 0,
  });

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        start_date: formatDateForInput(task.start_date),
        finish_date: formatDateForInput(task.finish_date),
        duration_days: task.duration_days,
        percent_complete: task.percent_complete,
        status: task.status,
        is_milestone: task.is_milestone,
        constraint_type: task.constraint_type,
        constraint_date: formatDateForInput(task.constraint_date),
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
    setActiveTab("general");
  }, [task, parentTaskId, open]);

  // Update duration when dates change
  useEffect(() => {
    if (formData.start_date && formData.finish_date && !formData.is_milestone) {
      const duration = calculateDuration(
        formData.start_date,
        formData.finish_date
      );
      if (duration !== null && duration !== formData.duration_days) {
        setFormData((prev) => ({ ...prev, duration_days: duration }));
      }
    }
  }, [formData.start_date, formData.finish_date, formData.is_milestone]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Task name is required";
    }

    if (formData.start_date && formData.finish_date) {
      const start = new Date(formData.start_date);
      const finish = new Date(formData.finish_date);
      if (start > finish) {
        newErrors.finish_date = "Finish date cannot be before start date";
      }
    }

    if (formData.is_milestone && formData.duration_days && formData.duration_days !== 0) {
      newErrors.duration_days = "Milestones must have zero duration";
    }

    if (
      formData.constraint_type &&
      formData.constraint_type !== "none" &&
      !formData.constraint_date
    ) {
      newErrors.constraint_date = "Constraint date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle field changes
  const handleChange = useCallback(
    (field: keyof FormData, value: FormData[keyof FormData]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when field is edited
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  // Handle milestone toggle
  const handleMilestoneChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_milestone: checked,
      duration_days: checked ? 0 : prev.duration_days,
      finish_date: checked ? prev.start_date : prev.finish_date,
    }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setIsSaving(true);
      try {
        const data: ScheduleTaskCreate | ScheduleTaskUpdate = {
          name: formData.name.trim(),
          start_date: formData.start_date || null,
          finish_date: formData.finish_date || null,
          duration_days: formData.is_milestone ? 0 : formData.duration_days,
          percent_complete: formData.percent_complete,
          status: formData.status,
          is_milestone: formData.is_milestone,
          constraint_type:
            formData.constraint_type === "none"
              ? null
              : formData.constraint_type,
          constraint_date: formData.constraint_date || null,
          wbs_code: formData.wbs_code || null,
          parent_task_id: formData.parent_task_id,
        };

        if (!isEditing) {
          (data as ScheduleTaskCreate).project_id = Number(projectId);
        }

        await onSave(data);
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to save task:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [formData, validateForm, isEditing, projectId, onSave, onOpenChange]
  );

  // Handle add dependency
  const handleAddDependency = useCallback(async () => {
    if (!newDependency.predecessorId || !onAddDependency) return;

    try {
      await onAddDependency(
        newDependency.predecessorId,
        newDependency.type,
        newDependency.lag
      );
      setNewDependency({ predecessorId: "", type: "finish_to_start", lag: 0 });
    } catch (error) {
      console.error("Failed to add dependency:", error);
    }
  }, [newDependency, onAddDependency]);

  // Filter out current task and its descendants from available predecessors
  const availablePredecessors = availableTasks.filter(
    (t) => t.id !== task?.id && t.id !== formData.parent_task_id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update task details and scheduling information"
                : "Add a new task to the project schedule"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
              <TabsTrigger value="dependencies" disabled={!isEditing}>
                Dependencies
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
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

              {/* WBS Code */}
              <div className="space-y-2">
                <Label htmlFor="wbs_code">WBS Code</Label>
                <Input
                  id="wbs_code"
                  value={formData.wbs_code}
                  onChange={(e) => handleChange("wbs_code", e.target.value)}
                  placeholder="e.g., 1.1.2"
                />
              </div>

              {/* Parent Task */}
              <div className="space-y-2">
                <Label>Parent Task</Label>
                <Popover>
                  <div className="flex items-center gap-1">
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between font-normal",
                          !formData.parent_task_id && "text-muted-foreground"
                        )}
                      >
                        {formData.parent_task_id
                          ? availableTasks.find(
                              (t) => t.id === formData.parent_task_id
                            )?.name ?? "Unknown task"
                          : "Select parent task (optional)"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    {formData.parent_task_id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => handleChange("parent_task_id", null)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear parent task</span>
                      </Button>
                    )}
                  </div>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search tasks..." />
                      <CommandList>
                        <CommandEmpty>No tasks found.</CommandEmpty>
                        <CommandGroup>
                          {availableTasks
                            .filter((t) => t.id !== task?.id)
                            .map((t) => (
                              <CommandItem
                                key={t.id}
                                value={t.name}
                                onSelect={() => {
                                  handleChange(
                                    "parent_task_id",
                                    formData.parent_task_id === t.id
                                      ? null
                                      : t.id
                                  );
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.parent_task_id === t.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {t.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Is Milestone */}
              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="is_milestone"
                  checked={formData.is_milestone}
                  onCheckedChange={handleMilestoneChange}
                />
                <Label
                  htmlFor="is_milestone"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Flag className="h-4 w-4 text-amber-500" />
                  Mark as Milestone
                </Label>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    handleChange("status", value as TaskStatus)
                  }
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

              {/* Percent Complete */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="percent_complete">Progress</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.percent_complete}%
                  </span>
                </div>
                <Slider
                  id="percent_complete"
                  value={[formData.percent_complete]}
                  onValueChange={([value]) =>
                    handleChange("percent_complete", value)
                  }
                  max={100}
                  step={5}
                  className="py-2"
                />
              </div>
            </TabsContent>

            {/* Scheduling Tab */}
            <TabsContent value="scheduling" className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                />
              </div>

              {/* Finish Date */}
              <div className="space-y-2">
                <Label
                  htmlFor="finish_date"
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Finish Date
                </Label>
                <Input
                  id="finish_date"
                  type="date"
                  value={formData.finish_date}
                  onChange={(e) => handleChange("finish_date", e.target.value)}
                  disabled={formData.is_milestone}
                  className={cn(errors.finish_date && "border-destructive")}
                />
                {errors.finish_date && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.finish_date}
                  </p>
                )}
              </div>

              {/* Duration */}
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

              {/* Constraint Type */}
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
                    className={cn(
                      errors.constraint_date && "border-destructive"
                    )}
                  />
                  {errors.constraint_date && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.constraint_date}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Dependencies Tab */}
            <TabsContent value="dependencies" className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
              {/* Current Dependencies */}
              {task?.dependencies && task.dependencies.length > 0 && (
                <div className="space-y-2">
                  <Label>Current Dependencies</Label>
                  <div className="border rounded-md divide-y">
                    {task.dependencies.map((dep: ScheduleDependency) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {availableTasks.find(
                              (t) => t.id === dep.predecessor_task_id
                            )?.name || "Unknown Task"}
                          </span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {dep.dependency_type}
                          </span>
                          {dep.lag_days !== 0 && (
                            <span className="text-xs text-muted-foreground">
                              {dep.lag_days > 0 ? "+" : ""}
                              {dep.lag_days}d lag
                            </span>
                          )}
                        </div>
                        {onRemoveDependency && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveDependency(dep.id)}
                            className="h-8 text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Dependency */}
              {onAddDependency && (
                <div className="space-y-3">
                  <Label>Add Predecessor</Label>
                  <div className="grid gap-3">
                    <Select
                      value={newDependency.predecessorId}
                      onValueChange={(value) =>
                        setNewDependency((prev) => ({
                          ...prev,
                          predecessorId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select predecessor task" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePredecessors.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={newDependency.type}
                        onValueChange={(value) =>
                          setNewDependency((prev) => ({
                            ...prev,
                            type: value as DependencyType,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPENDENCY_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        placeholder="Lag (days)"
                        value={newDependency.lag}
                        onChange={(e) =>
                          setNewDependency((prev) => ({
                            ...prev,
                            lag: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddDependency}
                      disabled={!newDependency.predecessorId}
                      className="w-full"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Add Dependency
                    </Button>
                  </div>
                </div>
              )}

              {!onAddDependency && !task?.dependencies?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Save the task first to manage dependencies
                </p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
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
