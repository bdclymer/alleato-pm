"use client";

import * as React from "react";
import { Plus, Upload } from "lucide-react";

import { formatCurrency } from "@/lib/table-config/formatters";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/forms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { LineItemRow } from "./LineItemRow";
import type {
  ChangeEventLineItem,
  VendorOption,
  ContractOption,
  BudgetCodeOption,
  CommitmentSovLineItem,
} from "./types";

interface LineItemsSectionProps {
  lineItems: ChangeEventLineItem[];
  updateLineItem: (index: number, key: keyof ChangeEventLineItem, value: string | number) => void;
  addLineItem: () => void;
  removeLineItem: (index: number) => void;
  vendors: VendorOption[];
  contracts: ContractOption[];
  budgetCodes: BudgetCodeOption[];
  commitmentLineItemsMap: Record<string, CommitmentSovLineItem[]>;
  onAddCompany: () => void;
  onCreateBudgetCode: (rowIndex: number) => void;
  handleCommitmentChange: (rowIndex: number, commitmentId: string) => void;
  handleCommitmentLineItemChange: (rowIndex: number, commitmentId: string, sovLineItemId: string) => void;
  csvInputRef: React.RefObject<HTMLInputElement | null>;
  handleCsvImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addFromCommitmentId: string;
  setAddFromCommitmentId: (id: string) => void;
  handleAddAllCommitmentLineItems: (commitmentId: string) => void;
}

export function LineItemsSection({
  lineItems,
  updateLineItem,
  addLineItem,
  removeLineItem,
  vendors,
  contracts,
  budgetCodes,
  commitmentLineItemsMap,
  onAddCompany,
  onCreateBudgetCode,
  handleCommitmentChange,
  handleCommitmentLineItemChange,
  csvInputRef,
  handleCsvImport,
  addFromCommitmentId,
  setAddFromCommitmentId,
  handleAddAllCommitmentLineItems,
}: LineItemsSectionProps) {
  return (
    <FormSection title="Line Items">
      {/* Hidden CSV file input */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvImport}
      />

      <TooltipProvider>
        <div className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20">
          <Table>
            <LineItemsTableHeader />
            <TableBody>
              {lineItems.map((item, index) => (
                <LineItemRow
                  key={`line-item-${index}`}
                  item={item}
                  index={index}
                  updateLineItem={updateLineItem}
                  removeLineItem={removeLineItem}
                  canRemove={lineItems.length > 1}
                  vendors={vendors}
                  contracts={contracts}
                  budgetCodes={budgetCodes}
                  commitmentLineItemsMap={commitmentLineItemsMap}
                  onAddCompany={onAddCompany}
                  onCreateBudgetCode={onCreateBudgetCode}
                  handleCommitmentChange={handleCommitmentChange}
                  handleCommitmentLineItemChange={handleCommitmentLineItemChange}
                />
              ))}
              <LineItemsTotalsRow lineItems={lineItems} />
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>

      <LineItemsToolbar
        addLineItem={addLineItem}
        csvInputRef={csvInputRef}
        contracts={contracts}
        addFromCommitmentId={addFromCommitmentId}
        setAddFromCommitmentId={setAddFromCommitmentId}
        handleAddAllCommitmentLineItems={handleAddAllCommitmentLineItems}
        lineItemCount={lineItems.length}
      />
    </FormSection>
  );
}

// ── Table Header ──

function LineItemsTableHeader() {
  return (
    <TableHeader className="border-y-0 [&_tr]:border-b-0">
      {/* Group headers */}
      <TableRow className="border-b-0 bg-muted/70 hover:bg-muted/70">
        <TableHead className="w-[40px] px-1.5 py-1.5" />
        <TableHead colSpan={4} className="px-1 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">
          Detail
        </TableHead>
        <TableHead colSpan={3} className="px-1 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">
          Cost
        </TableHead>
        <TableHead colSpan={4} className="px-1 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">
          Revenue
        </TableHead>
        <TableHead className="px-1 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">Non-committed $</TableHead>
        <TableHead className="px-1 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">Total</TableHead>
        <TableHead className="w-12 px-1 py-1" />
      </TableRow>
      {/* Column headers */}
      <TableRow className="border-b-0 bg-muted/50 hover:bg-muted/50">
        <TableHead className="w-[36px] px-1 py-1.5" />
        <TableHead className="min-w-52 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Budget Code</TableHead>
        <TableHead className="min-w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Description</TableHead>
        <TableHead className="min-w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Vendor</TableHead>
        <TableHead className="min-w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Commitment</TableHead>
        <TableHead className="w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help border-b border-dotted border-muted-foreground">Qty</span>
            </TooltipTrigger>
            <TooltipContent>Cost quantity for this line item</TooltipContent>
          </Tooltip>
        </TableHead>
        <TableHead className="w-56 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Unit Cost</TableHead>
        <TableHead className="w-36 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Cost ROM</TableHead>
        <TableHead className="w-28 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help border-b border-dotted border-muted-foreground">UOM</span>
            </TooltipTrigger>
            <TooltipContent>Unit of Measure</TooltipContent>
          </Tooltip>
        </TableHead>
        <TableHead className="w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help border-b border-dotted border-muted-foreground">Qty</span>
            </TooltipTrigger>
            <TooltipContent>Revenue quantity for this line item</TooltipContent>
          </Tooltip>
        </TableHead>
        <TableHead className="w-56 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Unit Cost</TableHead>
        <TableHead className="w-36 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Revenue ROM</TableHead>
        <TableHead className="w-44 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Non-committed $</TableHead>
        <TableHead className="w-36 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">Total</TableHead>
        <TableHead className="w-12 px-1 py-1.5" />
      </TableRow>
    </TableHeader>
  );
}

// ── Totals Row ──

function LineItemsTotalsRow({ lineItems }: { lineItems: ChangeEventLineItem[] }) {
  return (
    <TableRow className="hover:bg-muted">
      <TableCell className="px-1.5 py-2" />
      <TableCell colSpan={4} className="px-1.5 py-3 text-xs font-semibold text-foreground">
        Totals
      </TableCell>
      <TableCell colSpan={2} className="px-1.5 py-2" />
      <TableCell className="px-1.5 py-2 text-right text-sm font-semibold text-foreground">
        {formatCurrency(lineItems.reduce((sum, i) => sum + (i.costRom || 0), 0))}
      </TableCell>
      <TableCell colSpan={3} className="px-1.5 py-2" />
      <TableCell className="px-1.5 py-2 text-right text-sm font-semibold text-foreground">
        {formatCurrency(lineItems.reduce((sum, i) => sum + (i.revenueRom || 0), 0))}
      </TableCell>
      <TableCell className="px-1.5 py-2 text-right text-sm font-semibold text-foreground">
        {formatCurrency(lineItems.reduce((sum, i) => sum + (i.nonCommittedCost || 0), 0))}
      </TableCell>
      <TableCell className="px-1.5 py-2 text-right text-sm font-semibold text-foreground">
        {formatCurrency(lineItems.reduce((sum, i) => sum + (i.revenueRom || 0), 0))}
      </TableCell>
      <TableCell className="px-1.5 py-2" />
    </TableRow>
  );
}

// ── Toolbar ──

interface LineItemsToolbarProps {
  addLineItem: () => void;
  csvInputRef: React.RefObject<HTMLInputElement | null>;
  contracts: ContractOption[];
  addFromCommitmentId: string;
  setAddFromCommitmentId: (id: string) => void;
  handleAddAllCommitmentLineItems: (commitmentId: string) => void;
  lineItemCount: number;
}

function LineItemsToolbar({
  addLineItem,
  csvInputRef,
  contracts,
  addFromCommitmentId,
  setAddFromCommitmentId,
  handleAddAllCommitmentLineItems,
  lineItemCount,
}: LineItemsToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        onClick={addLineItem}
        className="gap-1.5"
      >
        <Plus />
        Add Line Item
      </Button>

      <div className="mx-1.5 h-4 w-px bg-border" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => csvInputRef.current?.click()}
      >
        <Upload />
        Import CSV
      </Button>

      {contracts.length > 0 && (
        <>
          <div className="mx-1.5 h-4 w-px bg-border" />
          <Select
            value={addFromCommitmentId}
            onValueChange={setAddFromCommitmentId}
          >
            <SelectTrigger className="h-8 w-52 border-0 bg-transparent text-xs text-muted-foreground shadow-none hover:text-foreground focus:ring-0">
              <SelectValue placeholder="Add from commitment..." />
            </SelectTrigger>
            <SelectContent>
              {contracts.filter((c) => c.type === "purchase_order").length > 0 && (
                <>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Purchase Orders
                  </div>
                  {contracts
                    .filter((c) => c.type === "purchase_order")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm">
                        {c.label}
                      </SelectItem>
                    ))}
                </>
              )}
              {contracts.filter((c) => c.type === "subcontract").length > 0 && (
                <>
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Subcontracts
                  </div>
                  {contracts
                    .filter((c) => c.type === "subcontract")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm">
                        {c.label}
                      </SelectItem>
                    ))}
                </>
              )}
            </SelectContent>
          </Select>
          {addFromCommitmentId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => handleAddAllCommitmentLineItems(addFromCommitmentId)}
            >
              <Plus />
              Add All Lines
            </Button>
          )}
        </>
      )}

      {lineItemCount > 1 && (
        <span className="ml-auto text-xs text-muted-foreground">
          {lineItemCount} line items
        </span>
      )}
    </div>
  );
}
