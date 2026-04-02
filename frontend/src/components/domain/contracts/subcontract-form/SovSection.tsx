"use client";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";
import type { SovLineItem } from "@/lib/schemas/create-subcontract-schema";
import { calculateSOVTotals, type BudgetCode } from "./types";
import { SovGroupRow, SovLineItemRow } from "./SovTableRows";

interface SovSectionProps {
  sovLines: SovLineItem[];
  onSovLinesChange: (lines: SovLineItem[]) => void;
  accountingMethod: string;
  onToggleAccountingMethod: () => void;
  budgetCodes: BudgetCode[];
  loadingBudgetCodes: boolean;
  onCreateBudgetCode: () => void;
  isSubmitting: boolean;
}

export function SovSection({
  sovLines,
  onSovLinesChange,
  accountingMethod,
  onToggleAccountingMethod,
  budgetCodes,
  loadingBudgetCodes,
  onCreateBudgetCode,
  isSubmitting,
}: SovSectionProps) {
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const totals = calculateSOVTotals(sovLines);

  const sovSortableIds = React.useMemo(
    () => sovLines.map((_, index) => `sov-line-${index}`),
    [sovLines.length],
  );

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSovDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(String(active.id).replace("sov-line-", ""));
    const newIndex = Number(String(over.id).replace("sov-line-", ""));
    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return;
    onSovLinesChange(
      arrayMove(sovLines, oldIndex, newIndex).map((line, i) => ({ ...line, lineNumber: i + 1 })),
    );
  };

  const handleBudgetCodeSelect = (lineIndex: number, code: BudgetCode) => {
    const updated = [...sovLines];
    updated[lineIndex] = {
      ...updated[lineIndex],
      budgetCodeId: code.id,
      budgetCodeLabel: code.fullLabel,
      budgetCode: code.code,
    };
    onSovLinesChange(updated);
  };

  const updateSOVLine = (index: number, updates: Partial<SovLineItem>) => {
    const updated = [...sovLines];
    const current = updated[index];
    const merged = { ...current, ...updates };
    if (
      accountingMethod === "unit_quantity" &&
      (updates.quantity !== undefined || updates.unitCost !== undefined)
    ) {
      merged.amount =
        (updates.quantity ?? current.quantity ?? 0) *
        (updates.unitCost ?? current.unitCost ?? 0);
    }
    updated[index] = merged;
    onSovLinesChange(updated);
  };

  const removeSOVLine = (index: number) => {
    onSovLinesChange(sovLines.filter((_, i) => i !== index));
  };

  const addSOVLine = () => {
    const isUnitQuantity = accountingMethod === "unit_quantity";
    onSovLinesChange([
      ...sovLines,
      {
        lineNumber: sovLines.length + 1,
        budgetCodeId: "",
        budgetCodeLabel: "",
        description: "",
        amount: 0,
        quantity: 1,
        unitCost: isUnitQuantity ? 0 : undefined,
        unitOfMeasure: isUnitQuantity ? "" : undefined,
        billedToDate: 0,
      },
    ]);
  };

  const addGroup = () => {
    onSovLinesChange([
      ...sovLines,
      { lineNumber: sovLines.length + 1, description: "", amount: 0, billedToDate: 0, isGroup: true },
    ]);
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const descIdx = headers.findIndex((h) => h.includes("description"));
      const amountIdx = headers.findIndex(
        (h) => h.includes("amount") && !h.includes("remaining") && !h.includes("billed"),
      );
      const budgetCodeIdx = headers.findIndex(
        (h) => h.includes("budget") || h.includes("cost") || h.includes("code"),
      );
      const imported: SovLineItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.every((c) => !c)) continue;
        imported.push({
          lineNumber: sovLines.length + imported.length + 1,
          description: descIdx >= 0 ? cols[descIdx] : cols[0] || "",
          budgetCode: budgetCodeIdx >= 0 ? cols[budgetCodeIdx] : undefined,
          amount: amountIdx >= 0 ? parseFloat(cols[amountIdx]) || 0 : 0,
          quantity: 1,
          billedToDate: 0,
        } as SovLineItem);
      }
      if (imported.length > 0) onSovLinesChange([...sovLines, ...imported]);
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  return (
    <section className="border-b border-border/70 pb-8" data-testid="sov-section">
      <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />

      <h2 className="text-lg font-semibold text-foreground">Schedule of Values</h2>
      <div className="space-y-6 pt-4">
        <p className="text-sm text-muted-foreground">
          This contract&apos;s default accounting method is{" "}
          <strong>{accountingMethod === "amount_based" ? "amount-based" : "unit/quantity"}</strong>.{" "}
          <Button
            type="button"
            variant="link"
            className="underline p-0 h-auto"
            disabled={isSubmitting}
            onClick={onToggleAccountingMethod}
            data-testid="sov-accounting-toggle"
          >
            Change to {accountingMethod === "amount_based" ? "Unit/Quantity" : "Amount-based"}
          </Button>
        </p>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
          <Select onValueChange={(v) => { if (v === "add_group") addGroup(); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Add Group" /></SelectTrigger>
            <SelectContent><SelectItem value="add_group">Add Group</SelectItem></SelectContent>
          </Select>
        </div>

        <div
          className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20"
          data-testid="sov-table"
          data-accounting-method={accountingMethod}
        >
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleSovDragEnd}>
            <SortableContext items={sovSortableIds} strategy={verticalListSortingStrategy}>
              <table className="w-full">
                <thead className="border-y-0">
                  <tr className="bg-muted/70 hover:bg-muted/70">
                    <th className="w-12 px-1 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground" />
                    <th className="min-w-72 px-1 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted underline-offset-2 decoration-muted-foreground/40">
                                Budget Code
                              </span>
                            </TooltipTrigger>
                            <TooltipContent><p>Link to a budget code</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                    <th className="min-w-64 px-1 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">Description</th>
                    {accountingMethod === "unit_quantity" && (
                      <>
                        <th className="w-32 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Qty</th>
                        <th className="w-32 px-1 py-1.5 text-left text-[11px] font-normal tracking-normal text-muted-foreground">UOM</th>
                        <th className="w-48 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Unit Cost</th>
                      </>
                    )}
                    <th className="w-48 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Amount</th>
                    <th className="w-40 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Billed to Date</th>
                    <th className="w-40 px-1 py-1.5 text-right text-[11px] font-normal tracking-normal text-muted-foreground">Amount Remaining</th>
                    <th className="w-12 px-1 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {sovLines.map((line, index) =>
                    line.isGroup ? (
                      <SovGroupRow
                        key={`group-${index}`}
                        index={index}
                        line={line}
                        accountingMethod={accountingMethod}
                        onUpdate={updateSOVLine}
                        onRemove={removeSOVLine}
                      />
                    ) : (
                      <SovLineItemRow
                        key={`line-${index}`}
                        index={index}
                        line={line}
                        accountingMethod={accountingMethod}
                        budgetCodes={budgetCodes}
                        loadingBudgetCodes={loadingBudgetCodes}
                        onBudgetCodeSelect={handleBudgetCodeSelect}
                        onCreateBudgetCode={onCreateBudgetCode}
                        onUpdate={updateSOVLine}
                        onRemove={removeSOVLine}
                      />
                    ),
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-1 py-2" />
                    <td colSpan={accountingMethod === "unit_quantity" ? 5 : 2} className="px-1 py-3 text-xs font-semibold text-foreground">Totals</td>
                    <td className="px-1 py-2 text-right text-sm font-semibold text-foreground" data-testid="sov-total-amount">{formatCurrency(totals.amount)}</td>
                    <td className="px-1 py-2 text-right text-sm font-semibold text-foreground" data-testid="sov-total-billed">{formatCurrency(totals.billedToDate)}</td>
                    <td className="px-1 py-2 text-right text-sm font-semibold text-foreground" data-testid="sov-total-remaining">{formatCurrency(totals.amountRemaining)}</td>
                    <td className="px-1 py-2" />
                  </tr>
                </tfoot>
              </table>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4">
          <Button type="button" onClick={addSOVLine} disabled={isSubmitting} className="h-10 gap-2 px-4" data-testid="sov-add-line-footer">
            <Plus />
            Add Line Item
          </Button>
          <Select onValueChange={(v) => { if (v === "csv") csvInputRef.current?.click(); }}>
            <SelectTrigger className="w-24"><SelectValue placeholder="Import" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
