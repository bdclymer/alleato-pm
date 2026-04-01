"use client";

import { useState, useCallback, useMemo } from "react";
import { Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import type { PaymentApplicationLineItem } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface InvoiceG703DetailProps {
  lineItems: PaymentApplicationLineItem[];
  onSave: (items: Partial<PaymentApplicationLineItem>[]) => Promise<void>;
  isReadOnly?: boolean;
}

interface EditableValues {
  [id: string]: {
    work_completed_this_period: number;
    materials_stored: number;
  };
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "0.0%";
  return ((numerator / denominator) * 100).toFixed(1) + "%";
}

export function InvoiceG703Detail({
  lineItems,
  onSave,
  isReadOnly = false,
}: InvoiceG703DetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState<EditableValues>({});

  const handleEdit = useCallback(() => {
    const values: EditableValues = {};
    for (const li of lineItems) {
      values[li.id] = {
        work_completed_this_period: li.work_completed_this_period,
        materials_stored: li.materials_stored,
      };
    }
    setEditValues(values);
    setIsEditing(true);
  }, [lineItems]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValues({});
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates = lineItems.map((li) => {
        const edited = editValues[li.id];
        if (!edited) return { id: li.id };

        const workThisPeriod = edited.work_completed_this_period;
        const materialsStored = edited.materials_stored;
        const totalCompleted =
          li.work_completed_previous + workThisPeriod + materialsStored;
        const percentComplete =
          li.scheduled_value > 0
            ? (totalCompleted / li.scheduled_value) * 100
            : 0;
        const balanceToFinish = li.scheduled_value - totalCompleted;

        return {
          id: li.id,
          work_completed_this_period: workThisPeriod,
          materials_stored: materialsStored,
          total_completed: totalCompleted,
          percent_complete: percentComplete,
          balance_to_finish: balanceToFinish,
        };
      });

      await onSave(updates);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [editValues, lineItems, onSave]);

  const handleValueChange = useCallback(
    (id: string, field: keyof EditableValues[string], value: string) => {
      const numValue = parseFloat(value) || 0;
      setEditValues((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: numValue,
        },
      }));
    },
    [],
  );

  // Calculate effective values (edited or original)
  const getEffectiveValues = useCallback(
    (li: PaymentApplicationLineItem) => {
      if (isEditing && editValues[li.id]) {
        const edited = editValues[li.id];
        const totalCompleted =
          li.work_completed_previous +
          edited.work_completed_this_period +
          edited.materials_stored;
        return {
          workThisPeriod: edited.work_completed_this_period,
          materialsStored: edited.materials_stored,
          totalCompleted,
          percentComplete:
            li.scheduled_value > 0
              ? (totalCompleted / li.scheduled_value) * 100
              : 0,
          balanceToFinish: li.scheduled_value - totalCompleted,
        };
      }
      return {
        workThisPeriod: li.work_completed_this_period,
        materialsStored: li.materials_stored,
        totalCompleted: li.total_completed,
        percentComplete: li.percent_complete,
        balanceToFinish: li.balance_to_finish,
      };
    },
    [isEditing, editValues],
  );

  // Calculate totals
  const totals = useMemo(() => {
    let scheduledValue = 0;
    let previousApp = 0;
    let thisPeriod = 0;
    let materialsStored = 0;
    let totalComplete = 0;
    let balance = 0;
    let retainage = 0;

    for (const li of lineItems) {
      const eff = getEffectiveValues(li);
      scheduledValue += li.scheduled_value;
      previousApp += li.work_completed_previous;
      thisPeriod += eff.workThisPeriod;
      materialsStored += eff.materialsStored;
      totalComplete += eff.totalCompleted;
      balance += eff.balanceToFinish;
      retainage +=
        li.retainage_this_period_work + li.retainage_this_period_materials;
    }

    return {
      scheduledValue,
      previousApp,
      thisPeriod,
      materialsStored,
      totalComplete,
      percentComplete: pct(totalComplete, scheduledValue),
      balance,
      retainage,
    };
  }, [lineItems, getEffectiveValues]);

  const sorted = useMemo(
    () => [...lineItems].sort((a, b) => a.sort_order - b.sort_order),
    [lineItems],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          AIA G703 — Schedule of Values
        </h3>
        {!isReadOnly && (
          <div className="flex items-center gap-1.5">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleEdit}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                A: Item #
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                Budget Code
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-[180px]">
                B: Description
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                C: Scheduled Value
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                D: Previous App
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                E: This Period
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                F: Materials Stored
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                G: Total Complete
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                %: G/C
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                H: Balance
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                Retainage
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((li) => {
              const eff = getEffectiveValues(li);
              const currentRetainage =
                li.retainage_this_period_work +
                li.retainage_this_period_materials;

              return (
                <tr key={li.id} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground tabular-nums">
                    {li.item_number}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {li.budget_code ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {li.description}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {formatCurrency(li.scheduled_value)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {formatCurrency(li.work_completed_previous)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="w-28 h-7 text-sm text-right ml-auto"
                        value={editValues[li.id]?.work_completed_this_period ?? 0}
                        onChange={(e) =>
                          handleValueChange(
                            li.id,
                            "work_completed_this_period",
                            e.target.value,
                          )
                        }
                      />
                    ) : (
                      <span className="tabular-nums">
                        {formatCurrency(eff.workThisPeriod)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="w-28 h-7 text-sm text-right ml-auto"
                        value={editValues[li.id]?.materials_stored ?? 0}
                        onChange={(e) =>
                          handleValueChange(
                            li.id,
                            "materials_stored",
                            e.target.value,
                          )
                        }
                      />
                    ) : (
                      <span className="tabular-nums">
                        {formatCurrency(eff.materialsStored)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {formatCurrency(eff.totalCompleted)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {pct(eff.totalCompleted, li.scheduled_value)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {formatCurrency(eff.balanceToFinish)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {formatCurrency(currentRetainage)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr
              className={cn(
                "border-t-2 border-border bg-muted font-semibold",
              )}
            >
              <td className="px-3 py-2" colSpan={3}>
                Totals
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(totals.scheduledValue)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(totals.previousApp)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(totals.thisPeriod)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(totals.materialsStored)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(totals.totalComplete)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {totals.percentComplete}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(totals.balance)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(totals.retainage)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
