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
  showRevenue: boolean;
  lineItemRevenueSource?: string;
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
  showRevenue,
  lineItemRevenueSource = "",
}: LineItemRowProps) {
  const overUnder = (item.revenueRom || 0) - (item.costRom || 0);
  const isLinkedToCommitment = Boolean(item.commitmentId);

  const revenueSourceLower = lineItemRevenueSource.toLowerCase();
  const isRevenueReadOnly =
    revenueSourceLower !== "" &&
    revenueSourceLower !== "manual" &&
    !revenueSourceLower.includes("manual entry");

  return (
    <TableRow className="group border-b-0 bg-background transition-colors hover:bg-transparent">
      {/* Drag handle */}
      <TableCell className="w-9 px-1 py-1.5 align-top">
        <div className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>

      {/* Commitment */}
      <TableCell className="min-w-40 px-0.5 py-1.5 align-top">
        <ContractCombobox
          value={item.contract}
          onChange={(value) => handleCommitmentChange(index, value)}
          contracts={contracts}
          disabled={isLinkedToCommitment}
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

      {/* Budget Code */}
      <TableCell className="min-w-40 px-0.5 py-1.5 align-top">
        <BudgetCodeSelector
          value={item.budgetCode || ""}
          onValueChange={(value) => updateLineItem(index, "budgetCode", value)}
          budgetCodes={budgetCodes}
          onCreateNew={() => onCreateBudgetCode(index)}
          placeholder="Select budget code..."
          disabled={isLinkedToCommitment}
        />
      </TableCell>

      {/* Description */}
      <TableCell className="min-w-64 px-1 py-1.5 align-top">
        <Input
          value={item.description}
          onChange={(e) => updateLineItem(index, "description", e.target.value)}
          placeholder="Enter description"
          className="text-[13px]"
        />
      </TableCell>

      {/* Vendor */}
      <TableCell className="line-item-group-end min-w-36 px-0.5 py-1.5 align-top">
        <VendorCombobox
          value={item.vendor}
          onChange={(value) => updateLineItem(index, "vendor", value)}
          vendors={vendors}
          onAddCompany={onAddCompany}
        />
      </TableCell>

      {/* Cost: Quantity */}
      <TableCell className="line-item-group-start w-28 border-l border-border/60 px-2 py-1.5 align-top">
        <Input
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          className="min-w-20 text-right text-[13px]"
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
      <TableCell className="w-44 px-1 py-1.5 align-top">
        <MoneyField
          inline
          label="Cost Unit Cost"
          value={item.costUnitCost ?? undefined}
          onChange={(val) => updateLineItem(index, "costUnitCost", val ?? 0)}
          showCurrency={false}
          className="h-9 min-w-28 text-[13px]"
        />
      </TableCell>

      {/* Cost ROM (computed) */}
      <TableCell className="line-item-group-end w-32 px-1 py-1.5 align-top">
        <div
          className={cn(
            "pt-2 text-right text-[13px] font-semibold",
            item.costRom > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {formatCurrency(item.costRom)}
        </div>
      </TableCell>

      {showRevenue && (
        <>
          {/* Revenue: UOM */}
          <TableCell className="line-item-group-start w-24 border-l border-border/60 px-2 py-1.5 align-top">
            <Select
              value={item.revenueUnitOfMeasure || ""}
              onValueChange={(value) => updateLineItem(index, "revenueUnitOfMeasure", value)}
            >
              <SelectTrigger className="h-9 w-full text-[13px]">
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
          <TableCell className="w-28 px-1 py-1.5 align-top">
            {isRevenueReadOnly ? (
              <div className="min-w-20 pt-2 text-right text-[13px] text-muted-foreground">
                {Number.isFinite(item.revenueQuantity) ? Math.trunc(item.revenueQuantity) : 1}
              </div>
            ) : (
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                className="min-w-20 text-right text-[13px]"
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
            )}
          </TableCell>

          {/* Revenue: Unit Cost */}
          <TableCell className="w-44 px-1 py-1.5 align-top">
            {isRevenueReadOnly ? (
              <div className="pt-2 text-right text-[13px] text-muted-foreground">
                {item.revenueUnitCost != null ? formatCurrency(item.revenueUnitCost) : "--"}
              </div>
            ) : (
              <MoneyField
                inline
                label="Revenue Unit Cost"
                value={item.revenueUnitCost ?? undefined}
                onChange={(val) => updateLineItem(index, "revenueUnitCost", val ?? 0)}
                showCurrency={false}
                className="h-9 min-w-28 text-[13px]"
              />
            )}
          </TableCell>

          {/* Revenue ROM (computed) */}
          <TableCell className="line-item-group-end w-32 px-1 py-1.5 align-top">
            <div
              className={cn(
                "pt-2 text-right text-[13px] font-semibold",
                isRevenueReadOnly && "text-muted-foreground italic",
                !isRevenueReadOnly && (item.revenueRom > 0 ? "text-foreground" : "text-muted-foreground"),
              )}
            >
              {formatCurrency(item.revenueRom)}
            </div>
          </TableCell>
        </>
      )}

      {/* Non-committed cost */}
      <TableCell className="line-item-group-start w-36 border-l border-border/60 px-2 py-1.5 align-top">
        {item.contract ? (
          <MoneyField
            inline
            label="Non-committed Cost"
            value={item.nonCommittedCost ?? undefined}
            onChange={(val) => updateLineItem(index, "nonCommittedCost", val ?? 0)}
            showCurrency={false}
            className="h-9 min-w-28 text-[13px]"
          />
        ) : (
          <div
            className={cn(
              "pt-2 text-right text-[13px] font-semibold",
              (item.nonCommittedCost ?? 0) !== 0
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {formatCurrency(item.nonCommittedCost ?? 0)}
          </div>
        )}
      </TableCell>

      {/* Over / Under (revenue − cost) */}
      <TableCell className="w-32 px-1 py-1.5 align-top">
        <div
          className={cn(
            "pt-2 text-right text-[13px] font-semibold",
            overUnder < 0
              ? "text-destructive"
              : overUnder > 0
                ? "text-foreground"
                : "text-muted-foreground",
          )}
        >
          {formatCurrency(overUnder)}
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
