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

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

interface NewDependency {
  predecessorId: string;
  type: DependencyType;
  lag: number;
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

const DEPENDENCY_TYPE_OPTIONS: Array<{ value: DependencyType; label: string }> = [
  { value: "FS", label: "Finish-to-Start (FS)" },
  { value: "SS", label: "Start-to-Start (SS)" },
  { value: "FF", label: "Finish-to-Finish (FF)" },
  { value: "SF", label: "Start-to-Finish (SF)" },
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
  onAddDependency,
  onRemoveDependency,
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
  const [isParentOpen, setIsParentOpen] = useState(false);
  const [newDependency, setNewDependency] = useState<NewDependency>({
    predecessorId: "",
    type: "FS",
    lag: 0,
  });

  const modalRef = useRef<HTMLDivElement>(null);
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
        parent_task_id: parentTaskId,
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

  // Handle adding dependency
  const handleAddDependency = useCallback(async () => {
    if (!newDependency.predecessorId || !onAddDependency) return;

    try {
      await onAddDependency(
        newDependency.predecessorId,
        newDependency.type,
        newDependency.lag
      );
      setNewDependency({ predecessorId: "", type: "FS", lag: 0 });
    } catch (error) {
      // Error handled by parent
    }
  }, [newDependency, onAddDependency]);

  // Available predecessors (exclude self and children)
  const availablePredecessors = availableTasks.filter(
    (t) => t.id !== task?.id && !task?.children?.some((c) => c.id === t.id)
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        {/* Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{
            opacity: 0,
            scale: 0.95,
            y: 20,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: 10,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
          className="relative z-50 w-full max-w-4xl bg-background rounded-xl shadow-2xl border border-border overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEditing ? "Edit Task" : "Create New Task"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isEditing ? "Modify task details and settings" : "Add a new task to your project schedule"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      Basic Information
                    </h3>

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
                        placeholder="e.g. 1.2.3"
                      />
                    </div>

                    {/* Parent Task */}
                    <div className="space-y-2">
                      <Label>Parent Task</Label>
                      <Popover open={isParentOpen} onOpenChange={setIsParentOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isParentOpen}
                            className="w-full justify-between"
                          >
                            {formData.parent_task_id
                              ? availableTasks.find((t) => t.id === formData.parent_task_id)?.name || "Unknown Task"
                              : "Select parent task"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Search tasks..." />
                            <CommandList>
                              <CommandEmpty>No tasks found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    handleChange("parent_task_id", null);
                                    setIsParentOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      !formData.parent_task_id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  No parent (root task)
                                </CommandItem>
                                {availableTasks
                                  .filter((t) => t.id !== task?.id)
                                  .map((availableTask) => (
                                    <CommandItem
                                      key={availableTask.id}
                                      onSelect={() => {
                                        handleChange("parent_task_id", availableTask.id);
                                        setIsParentOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          formData.parent_task_id === availableTask.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {availableTask.name}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Status and Progress */}
                    <div className="grid grid-cols-2 gap-3">
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

                      <div className="space-y-2">
                        <Label htmlFor="is_milestone" className="flex items-center gap-2">
                          <Flag className="h-4 w-4" />
                          Milestone
                        </Label>
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
                      <Label>
                        Progress: {formData.percent_complete}%
                      </Label>
                      <Slider
                        value={[formData.percent_complete]}
                        onValueChange={([value]) =>
                          handleChange("percent_complete", value)
                        }
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Scheduling & Dependencies */}
                <div className="space-y-6">
                  {/* Scheduling Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Scheduling
                    </h3>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
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
                  </div>

                  {/* Dependencies Section - Only show for editing existing tasks */}
                  {isEditing && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Dependencies
                      </h3>

                      {/* Current Dependencies */}
                      {task?.dependencies && task.dependencies.length > 0 && (
                        <div className="space-y-2">
                          <Label>Current Dependencies</Label>
                          <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
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
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
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
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}