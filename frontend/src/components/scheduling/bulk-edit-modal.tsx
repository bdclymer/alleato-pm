"use client";

/**
 * =============================================================================
 * BULK EDIT MODAL COMPONENT
 * =============================================================================
 *
 * Modal for bulk editing multiple schedule tasks at once.
 * Supports:
 * - Changing status for multiple tasks
 * - Adjusting dates (shift by days)
 * - Setting progress percentage
 * - Converting to/from milestones
 * - Moving to different parent
 */

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskStatus } from "@/types/scheduling";

// =============================================================================
// TYPES
// =============================================================================

type BulkEditField =
  | "status"
  | "shift_dates"
  | "percent_complete"
  | "is_milestone"
  | "parent_task_id";

interface BulkEditData {
  status?: TaskStatus;
  shift_days?: number;
  percent_complete?: number;
  is_milestone?: boolean;
  parent_task_id?: string | null;
}

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedIds: string[];
  projectId: string;
  availableTasks?: Array<{ id: string; name: string }>;
  onSave: (data: BulkEditData) => Promise<void>;
}

// =============================================================================
// FIELD CONFIGS
// =============================================================================

const fieldConfigs: Array<{
  key: BulkEditField;
  label: string;
  description: string;
}> = [
  {
    key: "status",
    label: "Change Status",
    description: "Update the status of all selected tasks",
  },
  {
    key: "shift_dates",
    label: "Shift Dates",
    description: "Move start and finish dates by a number of days",
  },
  {
    key: "percent_complete",
    label: "Set Progress",
    description: "Set progress percentage for all selected tasks",
  },
  {
    key: "is_milestone",
    label: "Convert to Milestone",
    description: "Convert all selected tasks to milestones (or back to tasks)",
  },
  {
    key: "parent_task_id",
    label: "Move to Parent",
    description: "Move all selected tasks under a different parent task",
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BulkEditModal({
  open,
  onOpenChange,
  selectedCount,
  selectedIds,
  projectId,
  availableTasks = [],
  onSave,
}: BulkEditModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<BulkEditField>>(
    new Set()
  );
  const [formData, setFormData] = useState<BulkEditData>({
    status: "not_started",
    shift_days: 0,
    percent_complete: 0,
    is_milestone: false,
    parent_task_id: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle field selection
  const toggleField = useCallback((field: BulkEditField) => {
    setSelectedFields((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  }, []);

  // Handle form value changes
  const handleChange = useCallback(
    <K extends keyof BulkEditData>(key: K, value: BulkEditData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (selectedFields.size === 0) {
      setError("Please select at least one field to update");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build data with only selected fields
      const data: BulkEditData = {};

      if (selectedFields.has("status")) {
        data.status = formData.status;
      }
      if (selectedFields.has("shift_dates")) {
        data.shift_days = formData.shift_days;
      }
      if (selectedFields.has("percent_complete")) {
        data.percent_complete = formData.percent_complete;
      }
      if (selectedFields.has("is_milestone")) {
        data.is_milestone = formData.is_milestone;
      }
      if (selectedFields.has("parent_task_id")) {
        data.parent_task_id = formData.parent_task_id;
      }

      await onSave(data);
      onOpenChange(false);

      // Reset state
      setSelectedFields(new Set());
      setFormData({
        status: "not_started",
        shift_days: 0,
        percent_complete: 0,
        is_milestone: false,
        parent_task_id: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tasks");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFields, formData, onSave, onOpenChange]);

  // Reset when closed
  React.useEffect(() => {
    if (!open) {
      setSelectedFields(new Set());
      setFormData({
        status: "not_started",
        shift_days: 0,
        percent_complete: 0,
        is_milestone: false,
        parent_task_id: null,
      });
      setError(null);
    }
  }, [open]);

  // Filter available tasks to exclude selected ones
  const filteredTasks = availableTasks.filter(
    (task) => !selectedIds.includes(task.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedCount} Tasks</DialogTitle>
          <DialogDescription>
            Select the fields you want to update for all selected tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-4 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {fieldConfigs.map((config) => (
            <div key={config.key} className="space-y-4">
              <div className="flex items-start gap-4">
                <Checkbox
                  id={`field-${config.key}`}
                  checked={selectedFields.has(config.key)}
                  onCheckedChange={() => toggleField(config.key)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`field-${config.key}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {config.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>
              </div>

              {/* Field-specific inputs */}
              {selectedFields.has(config.key) && (
                <div className="pl-7">
                  {config.key === "status" && (
                    <Select
                      value={formData.status}
                      onValueChange={(v) =>
                        handleChange("status", v as TaskStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {config.key === "shift_dates" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.shift_days || 0}
                        onChange={(e) =>
                          handleChange(
                            "shift_days",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        days (negative to shift earlier)
                      </span>
                    </div>
                  )}

                  {config.key === "percent_complete" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[formData.percent_complete || 0]}
                          onValueChange={([v]) =>
                            handleChange("percent_complete", v)
                          }
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="w-12 text-sm text-muted-foreground">
                          {formData.percent_complete || 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  {config.key === "is_milestone" && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="milestone-value"
                        checked={formData.is_milestone}
                        onCheckedChange={(checked) =>
                          handleChange("is_milestone", !!checked)
                        }
                      />
                      <Label
                        htmlFor="milestone-value"
                        className="text-sm cursor-pointer"
                      >
                        Convert selected tasks to milestones
                      </Label>
                    </div>
                  )}

                  {config.key === "parent_task_id" && (
                    <Select
                      value={formData.parent_task_id || "__root__"}
                      onValueChange={(v) =>
                        handleChange(
                          "parent_task_id",
                          v === "__root__" ? null : v
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent task" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__root__">
                          (Root level - no parent)
                        </SelectItem>
                        {filteredTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || selectedFields.size === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              `Update ${selectedCount} Tasks`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
