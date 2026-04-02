"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical } from "lucide-react";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { formatCurrency } from "@/lib/utils";
import type { SovLineItem } from "@/lib/schemas/create-subcontract-schema";
import { UNIT_OF_MEASURES, type BudgetCode } from "./types";

// --- SortableSovRow wrapper ---

interface SortableSovRowProps {
  id: string;
  className: string;
  children: (handle: {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  }) => React.ReactNode;
}

export function SortableSovRow({ id, className, children }: SortableSovRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`${className} ${isDragging ? "opacity-60" : ""}`}
    >
      {children({ attributes, listeners })}
    </tr>
  );
}

// --- Group row ---

interface SovGroupRowProps {
  index: number;
  line: SovLineItem;
  accountingMethod: string;
  onUpdate: (index: number, updates: Partial<SovLineItem>) => void;
  onRemove: (index: number) => void;
}

export function SovGroupRow({ index, line, accountingMethod, onUpdate, onRemove }: SovGroupRowProps) {
  return (
    <SortableSovRow
      id={`sov-line-${index}`}
      className="border-b border-border/60 bg-muted/40"
    >
      {({ attributes, listeners }) => (
        <>
          <td className="px-1 py-1.5 text-sm font-semibold" data-testid={`sov-group-${index}`}>
            <div
              {...attributes}
              {...listeners}
              className="inline-flex cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </td>
          <td colSpan={accountingMethod === "unit_quantity" ? 8 : 5} className="px-1 py-1.5">
            <Input
              className="h-10 font-semibold"
              placeholder="Group name (e.g. General Conditions)"
              value={line.description || ""}
              onChange={(e) => onUpdate(index, { description: e.target.value })}
              data-testid="sov-group-name"
            />
          </td>
          <td className="px-1 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
            >
              ×
            </Button>
          </td>
        </>
      )}
    </SortableSovRow>
  );
}

// --- Line item row ---

interface SovLineItemRowProps {
  index: number;
  line: SovLineItem;
  accountingMethod: string;
  budgetCodes: BudgetCode[];
  loadingBudgetCodes: boolean;
  onBudgetCodeSelect: (index: number, code: BudgetCode) => void;
  onCreateBudgetCode: () => void;
  onUpdate: (index: number, updates: Partial<SovLineItem>) => void;
  onRemove: (index: number) => void;
}

export function SovLineItemRow({
  index,
  line,
  accountingMethod,
  budgetCodes,
  loadingBudgetCodes,
  onBudgetCodeSelect,
  onCreateBudgetCode,
  onUpdate,
  onRemove,
}: SovLineItemRowProps) {
  return (
    <SortableSovRow
      id={`sov-line-${index}`}
      className="group border-b border-border/60 bg-background transition-colors hover:bg-muted/20"
    >
      {({ attributes, listeners }) => (
        <>
          <td className="px-1 py-1.5 text-sm" data-testid={`sov-line-${index}`}>
            <div
              {...attributes}
              {...listeners}
              className="inline-flex cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </td>
          <td className="px-1 py-1.5">
            <BudgetCodeSelector
              value={line.budgetCodeId || line.budgetCode || ""}
              onValueChange={(_, code) => onBudgetCodeSelect(index, code)}
              budgetCodes={budgetCodes}
              loading={loadingBudgetCodes}
              onCreateNew={onCreateBudgetCode}
              placeholder={line.budgetCode || "Select budget code..."}
              className="h-10"
            />
          </td>
          <td className="px-1 py-1.5">
            <Input
              value={line.description || ""}
              onChange={(e) => onUpdate(index, { description: e.target.value })}
              placeholder="Description"
              className="h-10"
              data-testid="sov-line-description"
            />
          </td>
          {accountingMethod === "unit_quantity" && (
            <>
              <td className="px-1 py-1.5">
                <Input
                  type="number"
                  value={line.quantity || ""}
                  placeholder="1"
                  onChange={(e) =>
                    onUpdate(index, {
                      quantity: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-10 text-right"
                  data-testid="sov-line-quantity"
                />
              </td>
              <td className="px-1 py-1.5">
                <Select
                  value={line.unitOfMeasure || undefined}
                  onValueChange={(value) => onUpdate(index, { unitOfMeasure: value })}
                >
                  <SelectTrigger className="h-10 w-full" data-testid="sov-line-unit-of-measure">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OF_MEASURES.map((uom) => (
                      <SelectItem key={uom.value} value={uom.value}>
                        {uom.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="w-48 px-1 py-1.5">
                <InputGroup className="h-10 overflow-hidden bg-transparent">
                  <InputGroupAddon>$</InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    step="0.01"
                    value={line.unitCost ?? ""}
                    onChange={(e) => onUpdate(index, { unitCost: parseFloat(e.target.value) || 0 })}
                    className="h-10 bg-transparent text-right"
                    data-testid="sov-line-unit-cost"
                  />
                </InputGroup>
              </td>
            </>
          )}
          <td className="w-48 px-1 py-1.5">
            <InputGroup className="h-10 overflow-hidden bg-transparent">
              <InputGroupAddon>$</InputGroupAddon>
              {accountingMethod === "unit_quantity" ? (
                <InputGroupInput
                  type="number"
                  step="0.01"
                  value={line.amount || ""}
                  className="h-10 bg-transparent text-right"
                  data-testid="sov-line-amount"
                  disabled
                  readOnly
                />
              ) : (
                <InputGroupInput
                  type="number"
                  step="0.01"
                  value={line.amount || ""}
                  onChange={(e) => onUpdate(index, { amount: parseFloat(e.target.value) || 0 })}
                  className="h-10 bg-transparent text-right"
                  data-testid="sov-line-amount"
                />
              )}
            </InputGroup>
          </td>
          <td className="px-1 py-1.5 pt-3 text-right text-sm">
            {formatCurrency(line.billedToDate || 0)}
          </td>
          <td className="px-1 py-1.5 pt-3 text-right text-sm" data-testid="sov-line-amount-remaining">
            {formatCurrency((line.amount || 0) - (line.billedToDate || 0))}
          </td>
          <td className="px-1 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
            >
              ×
            </Button>
          </td>
        </>
      )}
    </SortableSovRow>
  );
}
