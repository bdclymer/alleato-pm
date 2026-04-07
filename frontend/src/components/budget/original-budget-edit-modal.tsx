"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import {
  BaseSidebar,
  SidebarBody,
  SidebarFooter,
} from "@/components/budget/modals/BaseSidebar";
import {
  BUDGET_PRIMARY_TABS_LIST_CLASS,
  BUDGET_PRIMARY_TABS_TRIGGER_CLASS,
  budgetRadioCardClass,
} from "@/components/budget/modals/style-tokens";

interface HistoryEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: {
    id: string;
    email: string;
    name: string;
  };
  changed_at: string;
  change_type: "create" | "update" | "delete";
  notes: string | null;
}

interface OriginalBudgetEditModalProps {
  open: boolean;
  onClose: () => void;
  lineItem: {
    id: string;
    description: string;
    costCode: string;
    originalBudgetAmount: number;
    unitQty?: number;
    uom?: string;
    unitCost?: number;
    children?: unknown[]; // Indicates if this is a parent/aggregated row
  };
  projectId: string;
  onSave?: (data: {
    unitQty: number;
    uom: string;
    unitCost: number;
    originalBudget: number;
  }) => void | Promise<void>;
}

const UOM_OPTIONS = [
  { value: "ea", label: "Each" },
  { value: "lf", label: "Linear Feet" },
  { value: "sf", label: "Square Feet" },
  { value: "cy", label: "Cubic Yards" },
  { value: "ls", label: "Lump Sum" },
  { value: "hr", label: "Hours" },
  { value: "day", label: "Days" },
  { value: "ton", label: "Tons" },
  { value: "gal", label: "Gallons" },
];

type CalculationMethod = "manual" | "calculated";

export function OriginalBudgetEditModal({
  open,
  onClose,
  lineItem,
  projectId,
  onSave,
}: OriginalBudgetEditModalProps) {
  const currentBudgetValue = Number(lineItem?.originalBudgetAmount ?? 0);
  const isAggregatedRow = Boolean(
    lineItem.children && lineItem.children.length > 0,
  );
  const [activeTab, setActiveTab] = useState<"original" | "history">(
    "original",
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [calculationMethod, setCalculationMethod] =
    useState<CalculationMethod>("manual");
  const [unitQty, setUnitQty] = useState((lineItem.unitQty ?? 1).toString());
  const [uom, setUom] = useState(lineItem.uom || "");
  const [unitCost, setUnitCost] = useState(
    (lineItem.unitCost ?? lineItem.originalBudgetAmount ?? 0).toString(),
  );
  const [originalBudget, setOriginalBudget] = useState(
    (lineItem.originalBudgetAmount ?? 0).toString(),
  );


  const hasChanges =
    (parseFloat(unitQty) || 1) !== (lineItem.unitQty ?? 1) ||
    uom !== (lineItem.uom || "") ||
    (parseFloat(unitCost) || 0) !==
      (lineItem.unitCost ?? lineItem.originalBudgetAmount ?? 0) ||
    (parseFloat(originalBudget) || 0) !== lineItem.originalBudgetAmount;

  // Calculate original budget when inputs change
  useEffect(() => {
    if (calculationMethod === "calculated") {
      const qty = parseFloat(unitQty) || 0;
      const cost = parseFloat(unitCost) || 0;
      setOriginalBudget((qty * cost).toFixed(2));
    }
  }, [unitQty, unitCost, calculationMethod]);

  // Reset form when sidebar opens with new line item
  useEffect(() => {
    if (open) {
      setCalculationMethod("manual");
      setUnitQty((lineItem.unitQty ?? 1).toString());
      setUom(lineItem.uom || "");
      setUnitCost(
        (lineItem.unitCost ?? lineItem.originalBudgetAmount ?? 0).toString(),
      );
      setOriginalBudget((lineItem.originalBudgetAmount ?? 0).toString());
    }
  }, [open, lineItem]);

  // Fetch history when history tab is active
  useEffect(() => {
    if (!open || activeTab !== "history") return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/budget/lines/${lineItem.id}/history`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch change history");
        }

        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open, activeTab, lineItem.id, projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        unitQty: parseFloat(unitQty) || 1,
        uom,
        unitCost: parseFloat(unitCost) || 0,
        originalBudget: parseFloat(originalBudget) || 0,
      };

      if (onSave) {
        await onSave(data);
      }

      onClose();
    } catch (err) {
      console.error("Failed to save original budget:", err);
      // Intentionally swallowed: onSave callback handles error notifications
    } finally {
      setSaving(false);
    }
  };

  const formatFieldName = (fieldName: string) => {
    const fieldMap: Record<string, string> = {
      quantity: "Unit Qty",
      unit_qty: "Unit Qty",
      unit_cost: "Unit Cost",
      original_budget_amount: "Original Budget",
      originalBudgetAmount: "Original Budget",
      description: "Description",
      uom: "UOM",
      deleted: "Status",
    };
    return fieldMap[fieldName] || fieldName;
  };

  const formatValue = (fieldName: string, value: string | null) => {
    if (value === null || value === "") return "Empty";

    if (
      fieldName === "unit_cost" ||
      fieldName === "original_budget_amount" ||
      fieldName === "originalBudgetAmount"
    ) {
      const num = parseFloat(value);
      return `$${num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    if (fieldName === "quantity" || fieldName === "unit_qty") {
      const num = parseFloat(value);
      return num.toLocaleString("en-US");
    }

    return value;
  };

  const formatCurrencyDisplay = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Original Budget Amount"
      subtitle={lineItem.costCode}
      size="xl"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "original" | "history")}
        className="flex h-full flex-col gap-0"
      >
        <div className="px-4 sm:px-8 pt-1">
          <TabsList variant="line" className={BUDGET_PRIMARY_TABS_LIST_CLASS}>
            <TabsTrigger
              value="original"
              className={BUDGET_PRIMARY_TABS_TRIGGER_CLASS}
            >
              Original Budget
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={BUDGET_PRIMARY_TABS_TRIGGER_CLASS}
            >
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <SidebarBody className="bg-background">
          <TabsContent value="original" className="m-0">
            <div className="space-y-6 p-6">
            <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Line Item
              </p>
              <p className="text-sm font-semibold text-foreground">
                {lineItem.description}
              </p>
            </div>

            {lineItem.children && lineItem.children.length > 0 && (
              <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-4 py-4">
                <p className="text-sm font-semibold text-status-warning">
                  Aggregated Budget Line
                </p>
                <p className="mt-1 text-xs text-status-warning">
                  This is a parent row with {lineItem.children.length} child
                  line item{lineItem.children.length !== 1 ? "s" : ""}. Edit a
                  child line item to change Original Budget values.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted-foreground">Current Budget</span>
              <span className="text-2xl font-semibold text-foreground">
                {currentBudgetValue.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            </div>

            {!isAggregatedRow && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    Calculation Method
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Choose how this budget line is derived.
                  </p>
                </div>
                <RadioGroup
                  value={calculationMethod}
                  onValueChange={(value) =>
                    setCalculationMethod(value as CalculationMethod)
                  }
                  className="space-y-2"
                >
                  <label
                    htmlFor="budget-calc-manual"
                    className={budgetRadioCardClass(calculationMethod === "manual")}
                  >
                    <RadioGroupItem
                      id="budget-calc-manual"
                      value="manual"
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-foreground">Manual</div>
                      <p className="text-xs text-muted-foreground">
                        Enter a fixed amount directly.
                      </p>
                    </div>
                  </label>
                  <label
                    htmlFor="budget-calc-calculated"
                    className={budgetRadioCardClass(calculationMethod === "calculated")}
                  >
                    <RadioGroupItem
                      id="budget-calc-calculated"
                      value="calculated"
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-foreground">
                        Calculated
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Qty × Unit Cost = Budget
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            {!isAggregatedRow && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label
                      htmlFor="budget-unit-qty"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Unit Qty
                    </Label>
                    <Input
                      id="budget-unit-qty"
                      type="number"
                      value={unitQty}
                      onChange={(e) => setUnitQty(e.target.value)}
                      className="mt-1"
                      disabled={calculationMethod === "manual"}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="budget-uom"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      UOM
                    </Label>
                    <Select
                      value={uom || "__none"}
                      onValueChange={(value) =>
                        setUom(value === "__none" ? "" : value)
                      }
                      disabled={calculationMethod === "manual"}
                    >
                      <SelectTrigger id="budget-uom" className="mt-1">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Select</SelectItem>
                        {UOM_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="budget-unit-cost"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Unit Cost
                    </Label>
                    <MoneyField
                      label="Unit Cost"
                      value={unitCost ? parseFloat(unitCost) : undefined}
                      onChange={(val) => setUnitCost(String(val ?? ""))}
                      inline
                      showCurrency={false}
                      className="mt-1"
                      disabled={calculationMethod === "manual"}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="budget-original-amount"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Original Budget
                    </Label>
                    <MoneyField
                      label="Original Budget"
                      value={originalBudget ? parseFloat(originalBudget) : undefined}
                      onChange={(val) => setOriginalBudget(String(val ?? ""))}
                      inline
                      showCurrency={false}
                      className="mt-1 bg-muted/50 font-semibold"
                      disabled={calculationMethod === "calculated"}
                    />
                  </div>
                </div>

                {calculationMethod === "calculated" && (
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                    <span className="font-medium">Formula:</span>{" "}
                    {unitQty || "0"} × {formatCurrencyDisplay(unitCost)} ={" "}
                    {formatCurrencyDisplay(originalBudget)}
                  </div>
                )}
              </>
            )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="m-0">
            <div className="space-y-4 p-6">
            {loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading history...
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && history.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No changes recorded yet
              </div>
            )}

            {!loading && !error && history.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="divide-y divide-border">
                  {history.map((entry) => (
                    <div key={entry.id} className="space-y-1 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">
                          {entry.changed_by.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.changed_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="text-sm text-foreground">
                        {entry.change_type === "create" && (
                          <>
                            Created {formatFieldName(entry.field_name)}:{" "}
                            <span className="font-medium">
                              {formatValue(entry.field_name, entry.new_value)}
                            </span>
                          </>
                        )}
                        {entry.change_type === "delete" && "Deleted this line item"}
                        {entry.change_type === "update" && (
                          <>
                            Changed {formatFieldName(entry.field_name)} from{" "}
                            <span className="line-through">
                              {formatValue(entry.field_name, entry.old_value)}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                              {formatValue(entry.field_name, entry.new_value)}
                            </span>
                          </>
                        )}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-muted-foreground">
                          Notes: {entry.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </TabsContent>
        </SidebarBody>
      </Tabs>

      <SidebarFooter className="bg-muted">
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {activeTab === "history" || isAggregatedRow ? "Close" : "Cancel"}
          </Button>
          {activeTab === "original" && !isAggregatedRow && (
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </BaseSidebar>
  );
}
