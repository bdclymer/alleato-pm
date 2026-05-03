"use client";

import * as React from "react";

import { FormSection } from "@/components/forms/FormSection";
import { MoneyField } from "@/components/forms/MoneyField";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Modal as Dialog,
  ModalContent as DialogContent,
  ModalDescription as DialogDescription,
  ModalFooter as DialogFooter,
  ModalHeader as DialogHeader,
  ModalTitle as DialogTitle,
} from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableFooter,
  InlineTableFooterCell,
  InlineTableFooterRow,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
} from "@/components/ds/inline-table";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";

import { ImportFromBudgetModal } from "@/components/domain/contracts/ImportFromBudgetModal";
import type { BudgetCode, ContractFormData, SOVLineItem } from "./types";

interface AvailableCostCode {
  id: string;
  title: string | null;
  status: string | null;
  division_title: string | null;
}

export function PrimeContractSovSection({
  projectId,
  formData,
  budgetCodes,
  loadingBudgetCodes,
  filteredBudgetCodes,
  openBudgetCodePopover,
  budgetCodeSearchQuery,
  sovActionMenuKey,
  showImportFromBudget,
  sovColumnCount,
  isUnitQuantityMode,
  sovTotals,
  onBudgetCodeSearchQueryChange,
  onSovActionMenuKeyChange,
  onOpenBudgetCodePopoverChange,
  onShowImportFromBudgetChange,
  onShowCreateBudgetCodeModal,
  onToggleSovAccountingMethod,
  onAddSovGroup,
  onAddSovLine,
  onUpdateSovLine,
  onRemoveSovLine,
  onHandleBudgetCodeSelect,
  onHandleImportFromBudgetSuccess,
}: {
  projectId: string;
  formData: Partial<ContractFormData>;
  budgetCodes: BudgetCode[];
  loadingBudgetCodes: boolean;
  filteredBudgetCodes: BudgetCode[];
  openBudgetCodePopover: string | null;
  budgetCodeSearchQuery: string;
  sovActionMenuKey: number;
  showImportFromBudget: boolean;
  sovColumnCount: number;
  isUnitQuantityMode: boolean;
  sovTotals: {
    amount: number;
    billedToDate: number;
    amountRemaining: number;
  };
  onBudgetCodeSearchQueryChange: (value: string) => void;
  onSovActionMenuKeyChange: (updater: (prev: number) => number) => void;
  onOpenBudgetCodePopoverChange: (value: string | null) => void;
  onShowImportFromBudgetChange: (open: boolean) => void;
  onShowCreateBudgetCodeModal: () => void;
  onToggleSovAccountingMethod: () => void;
  onAddSovGroup: () => void;
  onAddSovLine: () => void;
  onUpdateSovLine: (id: string, updates: Partial<SOVLineItem>) => void;
  onRemoveSovLine: (id: string) => void;
  onHandleBudgetCodeSelect: (rowId: string, code: BudgetCode) => void;
  onHandleImportFromBudgetSuccess: (items: unknown[]) => void;
}) {
  return (
    <>
      <FormSection
        title="Schedule of Values"
        description="Build line items that define contract value and billing progress."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="sov-accounting-toggle"
              onClick={onToggleSovAccountingMethod}
            >
              {isUnitQuantityMode ? "Use Amount" : "Use Quantity × Unit Cost"}
            </Button>
            <Select
              key={sovActionMenuKey}
              onValueChange={(value) => {
                if (value === "add_group") onAddSovGroup();
                if (value === "import_budget") onShowImportFromBudgetChange(true);
                onSovActionMenuKeyChange((prev) => prev + 1);
              }}
            >
              <SelectTrigger className="h-8 w-36 border-border bg-muted">
                <SelectValue placeholder="Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add_group">Add Group</SelectItem>
                <SelectItem value="import_budget">Import from Budget</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <InlineTable
          data-testid="sov-table"
          data-accounting-method={formData.accountingMethod}
        >
          <InlineTableHeader>
            <InlineTableHeaderRow>
              <InlineTableHeaderCell className="min-w-80">Budget Code</InlineTableHeaderCell>
              <InlineTableHeaderCell className="min-w-56">Description</InlineTableHeaderCell>
              {isUnitQuantityMode ? (
                <>
                  <InlineTableHeaderCell className="w-28">Quantity</InlineTableHeaderCell>
                  <InlineTableHeaderCell className="w-32">Unit Cost</InlineTableHeaderCell>
                </>
              ) : null}
              <InlineTableHeaderCell className="w-36">Amount</InlineTableHeaderCell>
              <InlineTableHeaderCell className="w-36">Billed to Date</InlineTableHeaderCell>
              <InlineTableHeaderCell className="w-36">Amount Remaining</InlineTableHeaderCell>
              <InlineTableHeaderCell className="w-10" />
            </InlineTableHeaderRow>
          </InlineTableHeader>
          <InlineTableBody>
            {(formData.sovItems || []).length === 0 ? (
              <InlineTableRow>
                <InlineTableCell colSpan={sovColumnCount} className="py-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-sm text-muted-foreground">No line items yet.</p>
                    <p className="text-sm text-muted-foreground">Click &quot;Add Line Item&quot; to get started.</p>
                  </div>
                </InlineTableCell>
              </InlineTableRow>
            ) : (
              formData.sovItems?.map((item, index) =>
                item.isGroup ? (
                  <InlineTableRow key={item.id} type="group" data-testid={`sov-group-${index}`}>
                    <InlineTableCell colSpan={sovColumnCount - 1}>
                      <Input
                        value={item.description}
                        onChange={(e) => onUpdateSovLine(item.id, { description: e.target.value })}
                        placeholder="Group name"
                        className="h-10 font-semibold"
                        data-testid="sov-group-name"
                      />
                    </InlineTableCell>
                    <InlineTableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => onRemoveSovLine(item.id)}
                        className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remove group"
                        data-testid="sov-remove-group"
                      >
                        &times;
                      </Button>
                    </InlineTableCell>
                  </InlineTableRow>
                ) : (
                  <InlineTableRow key={item.id} data-testid={`sov-line-${index}`}>
                    <InlineTableCell>
                      <Popover
                        open={openBudgetCodePopover === item.id}
                        onOpenChange={(open) => onOpenBudgetCodePopoverChange(open ? item.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className="h-8 w-full justify-between border-border bg-background text-left text-sm font-normal"
                            data-testid="sov-line-budget-code"
                          >
                            <span className="truncate">
                              {item.budgetCodeLabel ||
                                budgetCodes.find((c) => c.id === item.budgetCodeId)?.fullLabel ||
                                "Select budget code..."}
                            </span>
                            <Search className="shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search budget codes..."
                              value={budgetCodeSearchQuery}
                              onValueChange={onBudgetCodeSearchQueryChange}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {loadingBudgetCodes ? "Loading..." : "No budget codes found."}
                              </CommandEmpty>
                              <CommandGroup>
                                {filteredBudgetCodes.map((code) => (
                                  <CommandItem
                                    key={code.id}
                                    value={code.fullLabel}
                                    onSelect={() => onHandleBudgetCodeSelect(item.id, code)}
                                  >
                                    {code.fullLabel}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandSeparator />
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    onOpenBudgetCodePopoverChange(null);
                                    onShowCreateBudgetCodeModal();
                                  }}
                                  className="text-primary"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create New Budget Code
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </InlineTableCell>
                    <InlineTableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => onUpdateSovLine(item.id, { description: e.target.value })}
                        placeholder="Description"
                        className="h-10"
                        data-testid="sov-line-description"
                      />
                    </InlineTableCell>
                    {isUnitQuantityMode ? (
                      <>
                        <InlineTableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={String(item.quantity ?? 0)}
                            onChange={(e) => onUpdateSovLine(item.id, { quantity: Number(e.target.value || 0) })}
                            className="h-10"
                            data-testid="sov-line-quantity"
                          />
                        </InlineTableCell>
                        <InlineTableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={String(item.unitCost ?? 0)}
                            onChange={(e) => onUpdateSovLine(item.id, { unitCost: Number(e.target.value || 0) })}
                            className="h-10"
                            data-testid="sov-line-unit-cost"
                          />
                        </InlineTableCell>
                      </>
                    ) : null}
                    <InlineTableCell>
                      <MoneyField
                        inline
                        label="Amount"
                        value={item.amount || undefined}
                        onChange={(val) => onUpdateSovLine(item.id, { amount: val ?? 0 })}
                        showCurrency={false}
                        className="h-10"
                        data-testid="sov-line-amount"
                        readOnly={formData.accountingMethod === "unit_quantity"}
                      />
                    </InlineTableCell>
                    <InlineTableCell align="right" numeric>
                      ${(item.billedToDate || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </InlineTableCell>
                    <InlineTableCell align="right" numeric data-testid="sov-line-amount-remaining">
                      ${((item.amount || 0) - (item.billedToDate || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </InlineTableCell>
                    <InlineTableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => onRemoveSovLine(item.id)}
                        className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remove line item"
                        data-testid="sov-remove-line"
                      >
                        &times;
                      </Button>
                    </InlineTableCell>
                  </InlineTableRow>
                ),
              )
            )}
          </InlineTableBody>
          <InlineTableFooter>
            <InlineTableFooterRow type="action">
              <InlineTableFooterCell colSpan={sovColumnCount - 1} className="font-normal">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm font-medium"
                  onClick={onAddSovLine}
                  data-testid={(formData.sovItems || []).length === 0 ? "sov-add-line-empty" : "sov-add-line-footer"}
                >
                  Add Line Item
                </Button>
                {(formData.sovItems || []).length > 1 ? (
                  <span className="ml-3 text-sm font-normal text-muted-foreground">
                    {(formData.sovItems || []).length} line items
                  </span>
                ) : null}
              </InlineTableFooterCell>
              <InlineTableFooterCell />
            </InlineTableFooterRow>
            {(formData.sovItems || []).length > 0 ? (
              <InlineTableFooterRow type="totals">
                <InlineTableFooterCell colSpan={2}>Totals</InlineTableFooterCell>
                <InlineTableFooterCell align="right" numeric data-testid="sov-total-amount">
                  ${sovTotals.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </InlineTableFooterCell>
                <InlineTableFooterCell align="right" numeric data-testid="sov-total-billed">
                  ${sovTotals.billedToDate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </InlineTableFooterCell>
                <InlineTableFooterCell align="right" numeric data-testid="sov-total-remaining">
                  ${sovTotals.amountRemaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </InlineTableFooterCell>
                <InlineTableFooterCell />
              </InlineTableFooterRow>
            ) : null}
          </InlineTableFooter>
        </InlineTable>
      </FormSection>

      <ImportFromBudgetModal
        open={showImportFromBudget}
        onOpenChange={onShowImportFromBudgetChange}
        projectId={projectId}
        existingCostCodeIds={new Set(
          (formData.sovItems || []).map((item) => item.budgetCodeId).filter((id): id is string => !!id),
        )}
        onImportSuccess={(items) => onHandleImportFromBudgetSuccess(items as unknown[])}
      />
    </>
  );
}

export function PrimeContractCreateBudgetCodeModal({
  open,
  loadingCostCodes,
  groupedCostCodes,
  expandedDivisions,
  availableCostCodes,
  newBudgetCodeData,
  isCreating,
  getCostTypeLabel,
  onOpenChange,
  onToggleDivision,
  onNewBudgetCodeDataChange,
  onCreate,
}: {
  open: boolean;
  loadingCostCodes: boolean;
  groupedCostCodes: Record<string, AvailableCostCode[]>;
  expandedDivisions: Set<string>;
  availableCostCodes: AvailableCostCode[];
  newBudgetCodeData: {
    costCodeId: string;
    costType: string;
  };
  isCreating: boolean;
  getCostTypeLabel: (type: string) => string;
  onOpenChange: (open: boolean) => void;
  onToggleDivision: (division: string) => void;
  onNewBudgetCodeDataChange: (next: { costCodeId: string; costType: string }) => void;
  onCreate: () => void;
}) {
  const selectedCostCode = availableCostCodes.find(
    (cc) => cc.id === newBudgetCodeData.costCodeId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Budget Code</DialogTitle>
          <DialogDescription>
            Add a new budget code that can be used for line items in this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="costCode">Cost Code*</Label>
            {loadingCostCodes ? (
              <div className="rounded-md border p-4 text-sm text-muted-foreground">
                Loading cost codes...
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-md border">
                {Object.entries(groupedCostCodes)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([division]) => (
                    <div key={division} className="border-b last:border-b-0">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onToggleDivision(division)}
                        className="h-auto w-full justify-between px-4 py-2 text-left font-normal"
                      >
                        <span className="text-sm font-semibold text-foreground">{division}</span>
                        {expandedDivisions.has(division) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {expandedDivisions.has(division) ? (
                        <div className="bg-muted">
                          {groupedCostCodes[division].map((costCode) => (
                            <Button
                              key={costCode.id}
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                onNewBudgetCodeDataChange({
                                  ...newBudgetCodeData,
                                  costCodeId: costCode.id,
                                })
                              }
                              className={`h-auto w-full justify-start px-6 py-2 text-left text-sm font-normal ${
                                newBudgetCodeData.costCodeId === costCode.id
                                  ? "bg-primary/10 font-medium text-primary"
                                  : "text-foreground"
                              }`}
                            >
                              {costCode.id} - {costCode.title}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Click on a division to expand and select a cost code
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="costType">Cost Type*</Label>
            <Select
              value={newBudgetCodeData.costType || undefined}
              onValueChange={(value) =>
                onNewBudgetCodeDataChange({ ...newBudgetCodeData, costType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cost type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="R">R - Contract Revenue</SelectItem>
                <SelectItem value="E">E - Equipment</SelectItem>
                <SelectItem value="X">X - Expense</SelectItem>
                <SelectItem value="L">L - Labor</SelectItem>
                <SelectItem value="M">M - Material</SelectItem>
                <SelectItem value="S">S - Subcontract</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm font-medium text-foreground">Preview:</p>
            <p className="mt-1 text-sm text-foreground">
              {selectedCostCode ? (
                <>
                  {selectedCostCode.id}.{newBudgetCodeData.costType} -{" "}
                  {selectedCostCode.title} - {getCostTypeLabel(newBudgetCodeData.costType)}
                </>
              ) : (
                "Select cost code and cost type to see preview"
              )}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onCreate}
            disabled={isCreating || !newBudgetCodeData.costCodeId || !newBudgetCodeData.costType}
          >
            {isCreating ? "Creating..." : "Create Budget Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
