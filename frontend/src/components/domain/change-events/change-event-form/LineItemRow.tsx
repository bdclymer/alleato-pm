"use client";

import { GripVertical, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/table-config/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyField } from "@/components/forms/MoneyField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";

import { VendorCombobox } from "./VendorCombobox";
import { ContractCombobox } from "./ContractCombobox";
import type {
  ChangeEventLineItem,
  VendorOption,
  ContractOption,
  BudgetCodeOption,
  CommitmentSovLineItem,
} from "./types";
import { UOM_OPTIONS } from "./types";

interface LineItemRowProps {
  item: ChangeEventLineItem;
  index: number;
  updateLineItem: (index: number, key: keyof ChangeEventLineItem, value: string | number) => void;
  removeLineItem: (index: number) => void;
  canRemove: boolean;
  vendors: VendorOption[];
  contracts: ContractOption[];
  budgetCodes: BudgetCodeOption[];
  commitmentLineItemsMap: Record<string, CommitmentSovLineItem[]>;
  onAddCompany: () => void;
  onCreateBudgetCode: (rowIndex: number) => void;
  handleCommitmentChange: (rowIndex: number, commitmentId: string) => void;
  handleCommitmentLineItemChange: (rowIndex: number, commitmentId: string, sovLineItemId: string) => void;
}

export function LineItemRow({
  item,
  index,
  updateLineItem,
  removeLineItem,
  canRemove,
  vendors,
  contracts,
  budgetCodes,
  commitmentLineItemsMap,
  onAddCompany,
  onCreateBudgetCode,
  handleCommitmentChange,
  handleCommitmentLineItemChange,
}: LineItemRowProps) {
  const lineTotal = item.revenueRom || 0;

  return (
    <TableRow className="group border-b border-border/60 bg-background transition-colors hover:bg-muted/20">
      {/* Drag handle */}
      <TableCell className="w-9 px-1 py-1.5 align-top">
        <div className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>

      {/* Budget Code */}
      <TableCell className="min-w-52 px-1 py-1.5 align-top">
        <BudgetCodeSelector
          value={item.budgetCode || ""}
          onValueChange={(value) => updateLineItem(index, "budgetCode", value)}
          budgetCodes={budgetCodes}
          onCreateNew={() => onCreateBudgetCode(index)}
          placeholder="Select budget code..."
        />
      </TableCell>

      {/* Description */}
      <TableCell className="min-w-40 px-1 py-1.5 align-top">
        <Input
          value={item.description}
          onChange={(e) => updateLineItem(index, "description", e.target.value)}
          placeholder="Enter description"
        />
      </TableCell>

      {/* Vendor */}
      <TableCell className="min-w-40 px-1 py-1.5 align-top">
        <VendorCombobox
          value={item.vendor}
          onChange={(value) => updateLineItem(index, "vendor", value)}
          vendors={vendors}
          onAddCompany={onAddCompany}
        />
      </TableCell>

      {/* Commitment */}
      <TableCell className="min-w-40 px-1 py-1.5 align-top">
        <ContractCombobox
          value={item.contract}
          onChange={(value) => handleCommitmentChange(index, value)}
          contracts={contracts}
        />
        {item.contract &&
          (commitmentLineItemsMap[item.contract]?.length ?? 0) > 1 && (
            <Select
              value={item.commitmentLineItemId || ""}
              onValueChange={(value) =>
                handleCommitmentLineItemChange(index, item.contract, value)
              }
            >
              <SelectTrigger className="mt-1 h-8 w-full text-xs">
                <SelectValue placeholder="Select line item..." />
              </SelectTrigger>
              <SelectContent>
                {(commitmentLineItemsMap[item.contract] || []).map((li) => (
                  <SelectItem key={li.id} value={li.id} className="text-xs">
                    {li.line_number != null ? `#${li.line_number} ` : ""}
                    {li.budget_code ? `${li.budget_code} - ` : ""}
                    {li.description || "No description"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
      </TableCell>

      {/* Cost: Quantity */}
      <TableCell className="w-40 px-1 py-1.5 align-top">
        <Input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          className="min-w-[96px] text-right"
          value={Number.isFinite(item.costQuantity) ? Math.trunc(item.costQuantity) : 1}
          onChange={(e) =>
            updateLineItem(
              index,
              "costQuantity",
              e.target.value === "" ? 1 : Math.max(0, parseInt(e.target.value, 10) || 1),
            )
          }
          onFocus={(e) => e.target.select()}
          placeholder="1"
        />
      </TableCell>

      {/* Cost: Unit Cost */}
      <TableCell className="w-56 px-1 py-1.5 align-top">
        <MoneyField
          inline
          label="Cost Unit Cost"
          value={item.costUnitCost ?? undefined}
          onChange={(val) => updateLineItem(index, "costUnitCost", val ?? 0)}
          showCurrency={false}
          className="h-9 min-w-[120px]"
        />
      </TableCell>

      {/* Cost ROM (computed) */}
      <TableCell className="w-36 px-1 py-1.5 align-top">
        <div
          className={cn(
            "pt-2 text-right text-sm font-semibold",
            item.costRom > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {formatCurrency(item.costRom)}
        </div>
      </TableCell>

      {/* Revenue: UOM */}
      <TableCell className="w-28 px-1 py-1.5 align-top">
        <Select
          value={item.revenueUnitOfMeasure || ""}
          onValueChange={(value) => updateLineItem(index, "revenueUnitOfMeasure", value)}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {UOM_OPTIONS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Revenue: Quantity */}
      <TableCell className="w-40 px-1 py-1.5 align-top">
        <Input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          className="min-w-[96px] text-right"
          value={Number.isFinite(item.revenueQuantity) ? Math.trunc(item.revenueQuantity) : 1}
          onChange={(e) =>
            updateLineItem(
              index,
              "revenueQuantity",
              e.target.value === "" ? 1 : Math.max(0, parseInt(e.target.value, 10) || 1),
            )
          }
          onFocus={(e) => e.target.select()}
          placeholder="1"
        />
      </TableCell>

      {/* Revenue: Unit Cost */}
      <TableCell className="w-56 px-1 py-1.5 align-top">
        <MoneyField
          inline
          label="Revenue Unit Cost"
          value={item.revenueUnitCost ?? undefined}
          onChange={(val) => updateLineItem(index, "revenueUnitCost", val ?? 0)}
          showCurrency={false}
          className="h-9 min-w-[120px]"
        />
      </TableCell>

      {/* Revenue ROM (computed) */}
      <TableCell className="w-36 px-1 py-1.5 align-top">
        <div
          className={cn(
            "pt-2 text-right text-sm font-semibold",
            item.revenueRom > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {formatCurrency(item.revenueRom)}
        </div>
      </TableCell>

      {/* Non-committed cost */}
      <TableCell className="w-44 px-1 py-1.5 align-top">
        {item.contract ? (
          <MoneyField
            inline
            label="Non-committed Cost"
            value={item.nonCommittedCost ?? undefined}
            onChange={(val) => updateLineItem(index, "nonCommittedCost", val ?? 0)}
            showCurrency={false}
            className="h-9 min-w-[120px]"
          />
        ) : (
          <div
            className={cn(
              "pt-2 text-right text-sm font-semibold",
              (item.nonCommittedCost ?? 0) !== 0
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {formatCurrency(item.nonCommittedCost ?? 0)}
          </div>
        )}
      </TableCell>

      {/* Total */}
      <TableCell className="w-36 px-1 py-1.5 align-top">
        <div
          className={cn(
            "pt-2 text-right text-sm font-semibold",
            lineTotal > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {formatCurrency(lineTotal)}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-12 px-1 py-1.5 align-top">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeLineItem(index)}
          disabled={!canRemove}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
