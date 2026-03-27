"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleOfValuesRow } from "./ScheduleOfValuesRow";
import { cn } from "@/lib/utils";

export interface SOVItem {
  id: string;
  description: string;
  costCode?: string;
  scheduledValue: number;
  workCompleted: number;
  materialsStored: number;
  percentComplete: number;
}

interface ScheduleOfValuesGridProps {
  values: SOVItem[];
  onChange: (values: SOVItem[]) => void;
  className?: string;
}

export function ScheduleOfValuesGrid({
  values,
  onChange,
  className,
}: ScheduleOfValuesGridProps) {
  const addRow = () => {
    const newRow: SOVItem = {
      id: `sov-${Date.now()}`,
      description: "",
      costCode: "",
      scheduledValue: 0,
      workCompleted: 0,
      materialsStored: 0,
      percentComplete: 0,
    };
    onChange([...values, newRow]);
  };

  const updateRow = (id: string, updates: Partial<SOVItem>) => {
    onChange(
      values.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    );
  };

  const removeRow = (id: string) => {
    onChange(values.filter((row) => row.id !== id));
  };

  const totalScheduled = values.reduce(
    (sum, row) => sum + row.scheduledValue,
    0,
  );
  const totalCompleted = values.reduce(
    (sum, row) => sum + row.workCompleted,
    0,
  );
  const totalMaterials = values.reduce(
    (sum, row) => sum + row.materialsStored,
    0,
  );
  const totalCurrent = totalCompleted + totalMaterials;
  const overallPercent =
    totalScheduled > 0 ? (totalCurrent / totalScheduled) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Schedule of Values</h3>
        <Button onClick={addRow} size="sm">
          <Plus />
          Add Line Item
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted">
                <th className="px-4 py-4 text-left text-sm font-medium text-foreground">
                  Description
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-foreground">
                  Cost Code
                </th>
                <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                  Scheduled Value
                </th>
                <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                  Work Completed
                </th>
                <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                  Materials Stored
                </th>
                <th className="px-4 py-4 text-right text-sm font-medium text-foreground">
                  % Complete
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {values.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No line items added yet. Click &quot;Add Line Item&quot; to
                    get started.
                  </td>
                </tr>
              ) : (
                values.map((row) => (
                  <ScheduleOfValuesRow
                    key={row.id}
                    item={row}
                    onChange={(updates) => updateRow(row.id, updates)}
                    onRemove={() => removeRow(row.id)}
                  />
                ))
              )}
            </tbody>
            {values.length > 0 && (
              <tfoot className="border-t-2">
                <tr className="bg-muted font-semibold">
                  <td colSpan={2} className="px-4 py-4 text-right">
                    Totals:
                  </td>
                  <td className="px-4 py-4 text-right">
                    ${totalScheduled.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    ${totalCompleted.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    ${totalMaterials.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {overallPercent.toFixed(1)}%
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
