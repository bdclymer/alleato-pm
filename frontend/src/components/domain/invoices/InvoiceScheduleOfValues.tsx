"use client";

import { useState, useCallback, useMemo } from "react";
import { Pencil, X, Check, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import type { PaymentApplicationLineItem } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";
import { SectionRuleHeading } from "@/components/layout/spacing";

interface InvoiceScheduleOfValuesProps {
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
  if (denominator === 0) return "0.00%";
  return ((numerator / denominator) * 100).toFixed(2) + "%";
}

export function InvoiceScheduleOfValues({
  lineItems,
  onSave,
  isReadOnly = false,
}: InvoiceScheduleOfValuesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState<EditableValues>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const content = (
    <section
      className={cn(
        isFullscreen &&
          "fixed inset-0 z-50 bg-background overflow-auto p-6",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <SectionRuleHeading label="Schedule of Values" />
        <div className="flex items-center gap-1.5">
          {!isReadOnly && (
            <>
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
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Open Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            {/* Column group headers */}
            <tr className="bg-muted border-b border-border">
              <th colSpan={3} className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground border-r border-border" />
              <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground border-r border-border">
                Value
              </th>
              <th colSpan={2} className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground border-r border-border">
                Work Completed
              </th>
              <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground border-r border-border">
                Materials
              </th>
              <th colSpan={4} className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground">
                Total Completed & Stored
              </th>
            </tr>
            {/* Individual column headers */}
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">
                Item #
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">
                Budget Code
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground min-w-40 text-xs">
                Description of Work
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs border-r border-border">
                Scheduled Value
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">
                From Previous ($)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs border-r border-border">
                This Period ($)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs border-r border-border">
                Presently Stored
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">
                Total ($)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">
                Total (%)
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">
                Balance
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap text-xs">
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
                <tr key={li.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-3 py-2 text-foreground tabular-nums text-xs">
                    {li.item_number}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {li.budget_code ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground text-sm">
                    {li.description}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums border-r border-border">
                    {formatCurrency(li.scheduled_value)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground tabular-nums">
                    {formatCurrency(li.work_completed_previous)}
                  </td>
                  <td className="px-3 py-2 text-right border-r border-border">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="w-28 h-7 text-sm text-right ml-auto"
                        value={
                          editValues[li.id]?.work_completed_this_period ?? 0
                        }
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
                  <td className="px-3 py-2 text-right border-r border-border">
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
            <tr className="border-t-2 border-border bg-muted font-semibold">
              <td className="px-3 py-2" colSpan={3}>
                Grand Totals
              </td>
              <td className="px-3 py-2 text-right tabular-nums border-r border-border">
                {formatCurrency(totals.scheduledValue)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(totals.previousApp)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums border-r border-border">
                {formatCurrency(totals.thisPeriod)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums border-r border-border">
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

      {/* Footer totals below table */}
      <div className="flex justify-end mt-3">
        <div className="space-y-1 text-sm w-64">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums font-medium">
              {formatCurrency(totals.totalComplete)}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Retainage</span>
            <span className="tabular-nums font-medium">
              {formatCurrency(totals.retainage)}
            </span>
          </div>
          <div className="flex justify-between py-1 border-t border-border pt-2">
            <span className="font-semibold text-foreground">TOTAL</span>
            <span className="tabular-nums font-semibold text-foreground">
              {formatCurrency(totals.totalComplete - totals.retainage)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );

  return content;
}
