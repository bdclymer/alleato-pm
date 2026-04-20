"use client";

import { useState } from "react";
import { BaseModal, ModalBody, ModalFooter } from "./BaseModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  InlineTable,
  InlineTableHeader,
  InlineTableHeaderRow,
  InlineTableHeaderCell,
  InlineTableBody,
  InlineTableRow,
  InlineTableCell,
} from "@/components/ds/inline-table";
import { cn } from "@/lib/utils";

interface BudgetLineItem {
  id: string;
  costCode: string;
  quantity: string;
  uom: string;
}

interface CreateBudgetLineItemsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (items: BudgetLineItem[]) => Promise<void>;
  availableCostCodes?: Array<{ code: string; description: string }>;
}

/**
 * CreateBudgetLineItemsModal - Add new budget line items
 *
 * Features:
 * - Add multiple line items in one session
 * - Empty state with prominent "Add Line" button
 * - Secondary "Add Line" button below table
 * - Delete line items
 * - Validation before submission
 * - Mobile responsive table
 */
export function CreateBudgetLineItemsModal({
  open,
  onClose,
  onSave,
  availableCostCodes = [],
}: CreateBudgetLineItemsModalProps) {
  const [items, setItems] = useState<BudgetLineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const addLine = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(7),
        costCode: "",
        quantity: "",
        uom: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateLine = (
    id: string,
    field: keyof BudgetLineItem,
    value: string,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSave = async () => {
    // Validate
    const invalidItems = items.filter(
      (item) =>
        !item.costCode || !item.quantity || parseFloat(item.quantity) <= 0,
    );

    if (invalidItems.length > 0) {
      alert(
        "Please fill in all required fields. Quantity must be greater than 0.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave(items);
      setItems([]);
      onClose();
    } catch (error) {
      alert("Failed to create budget items. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (items.length > 0) {
      if (
        confirm(
          "You have unsaved Budget Line Items. Are you sure you want to close?",
        )
      ) {
        setItems([]);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isValid =
    items.length > 0 &&
    items.every(
      (item) => item.costCode && item.quantity && parseFloat(item.quantity) > 0,
    );

  return (
    <BaseModal
      isOpen={open}
      onClose={handleClose}
      title="Create Budget Line Items"
      size="xl"
    >
      <ModalBody className="min-h-96 space-y-6 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Batch Creation
            </p>
            <p className="text-sm text-muted-foreground">
              Add one or many lines with clean, mobile-first cards.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary sm:flex">
            {items.length || 0} line{items.length === 1 ? "" : "s"}
          </div>
        </div>

        {items.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-lg">
                  <Plus className="h-8 w-8" />
                </div>
              </div>
              {/* eslint-disable-next-line design-system/no-raw-heading */}
              <h3 className="text-lg font-medium text-foreground mb-2">
                You Have No Line Items Yet
              </h3>
              <p className="text-foreground mb-6">
                Click the button below to add your first budget line item
              </p>
              <Button
                onClick={addLine}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                <Plus />
                Add Line
              </Button>
            </div>
          </div>
        ) : (
          // Table with line items
          <div className="space-y-4">
            {/* Mobile: Cards, Desktop: Table */}
            <InlineTable variant="read" className="hidden sm:block">
              <InlineTableHeader>
                <InlineTableHeaderRow>
                  <InlineTableHeaderCell className="w-1/2">
                    Budget Code <span className="text-destructive">*</span>
                  </InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right" className="w-1/4">
                    Qty <span className="text-destructive">*</span>
                  </InlineTableHeaderCell>
                  <InlineTableHeaderCell className="w-1/4">
                    UOM
                  </InlineTableHeaderCell>
                  <InlineTableHeaderCell className="w-12" />
                </InlineTableHeaderRow>
              </InlineTableHeader>
              <InlineTableBody>
                {items.map((item) => (
                  <InlineTableRow key={item.id}>
                    <InlineTableCell>
                      <Select
                        value={item.costCode}
                        onValueChange={(value) =>
                          updateLine(item.id, "costCode", value)
                        }
                      >
                        <SelectTrigger
                          className={cn(!item.costCode && "border-destructive")}
                        >
                          <SelectValue placeholder="Select Cost Code" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCostCodes.map((code) => (
                            <SelectItem key={code.code} value={code.code}>
                              {code.code} - {code.description}
                            </SelectItem>
                          ))}
                          {availableCostCodes.length === 0 && (
                            <SelectItem value="01-1000">
                              01-1000 - General Conditions
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </InlineTableCell>
                    <InlineTableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLine(item.id, "quantity", e.target.value)
                        }
                        placeholder=""
                        className={cn(
                          "text-right",
                          !item.quantity && "border-destructive",
                        )}
                      />
                    </InlineTableCell>
                    <InlineTableCell>
                      <Select
                        value={item.uom}
                        onValueChange={(value) =>
                          updateLine(item.id, "uom", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EA">EA</SelectItem>
                          <SelectItem value="SF">SF</SelectItem>
                          <SelectItem value="LF">LF</SelectItem>
                          <SelectItem value="CY">CY</SelectItem>
                          <SelectItem value="LS">LS</SelectItem>
                        </SelectContent>
                      </Select>
                    </InlineTableCell>
                    <InlineTableCell align="center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(item.id)}
                        className="text-destructive hover:text-destructive h-7 w-7"
                        aria-label="Delete line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </InlineTableCell>
                  </InlineTableRow>
                ))}
              </InlineTableBody>
            </InlineTable>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="border border-border rounded-lg p-4 space-y-4 bg-background"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-foreground">
                      Line {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(item.id)}
                      className="text-destructive hover:text-destructive h-8 w-8 -mr-2 -mt-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Budget Code *</Label>
                    <Select
                      value={item.costCode}
                      onValueChange={(value) =>
                        updateLine(item.id, "costCode", value)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select Cost Code" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01-1000">
                          01-1000 - General Conditions
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Qty *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLine(item.id, "quantity", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">UOM</Label>
                      <Select
                        value={item.uom}
                        onValueChange={(value) =>
                          updateLine(item.id, "uom", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EA">EA</SelectItem>
                          <SelectItem value="SF">SF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Line Button (secondary) */}
            <div className="pt-4">
              <Button
                onClick={addLine}
                variant="outline"
                className="w-full sm:w-auto border-primary/20 text-primary hover:bg-primary/10"
              >
                <Plus />
                Add Line
              </Button>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={isSaving}>
          Close
        </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className={cn(
              "transition-colors",
              isValid
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
          {isSaving ? "Creating..." : "Create"}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}
