"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
  { value: "", label: "Select" },
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

  // Focus state for currency inputs - show raw value when focused, formatted when blurred
  const [unitCostFocused, setUnitCostFocused] = useState(false);
  const [originalBudgetFocused, setOriginalBudgetFocused] = useState(false);

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

  const formatCurrencyInput = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 flex flex-col"
      >
        {/* Header */}
        <div className="bg-foreground text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Original Budget Amount</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {lineItem.costCode}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-background/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6 py-2 bg-muted flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("original")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                activeTab === "original"
                  ? "bg-background text-orange-600 shadow-sm border border-border"
                  : "text-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              Original Budget
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all",
                activeTab === "history"
                  ? "bg-background text-orange-600 shadow-sm border border-border"
                  : "text-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              History
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "original" ? (
            <div className="p-6 space-y-6">
              {/* Line Item Info */}
              <div className="rounded-lg border border-border bg-muted px-4 py-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Line Item
                </p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {lineItem.description}
                </p>
              </div>

              {/* Parent Row Notice */}
              {lineItem.children && lineItem.children.length > 0 && (
                <div className="rounded-lg border-2 border-orange-200 bg-orange-50 px-4 py-4 flex items-start gap-4">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center mt-0.5">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-900">
                      Aggregated Budget Line
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      This is a parent row containing {lineItem.children.length}{" "}
                      child line item{lineItem.children.length !== 1 ? "s" : ""}
                      . The values shown are aggregated totals. To edit the
                      Original Budget, expand this row and click on a child line
                      item.
                    </p>
                  </div>
                </div>
              )}

              {/* Current Value */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Current Budget</span>
                <span className="text-lg font-semibold text-foreground">
                  {currentBudgetValue.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>
              </div>

              {/* Calculation Method */}
              {!isAggregatedRow && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Calculation Method
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose how this budget line is derived.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {(["manual", "calculated"] as CalculationMethod[]).map(
                      (method) => (
                        <label
                          key={method}
                          className={cn(
                            "flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all",
                            calculationMethod === method
                              ? "border-brand bg-brand/5 ring-1 ring-brand"
                              : "border-border bg-background hover:border-border",
                          )}
                        >
                          <input
                            type="radio"
                            name="calcMethod"
                            value={method}
                            checked={calculationMethod === method}
                            onChange={() => setCalculationMethod(method)}
                            className="mt-0.5 h-4 w-4 text-brand focus:ring-brand"
                          />
                          <div>
                            <div className="font-medium text-foreground capitalize">
                              {method}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {method === "manual"
                                ? "Enter a fixed amount directly."
                                : "Qty × Unit Cost = Budget"}
                            </p>
                          </div>
                        </label>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Input Fields - Only show for non-aggregated rows */}
              {!isAggregatedRow && (
                <>
                  <div className="grid gap-4 grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Unit Qty
                      </label>
                      <Input
                        type="number"
                        value={unitQty}
                        onChange={(e) => setUnitQty(e.target.value)}
                        className="mt-1"
                        disabled={calculationMethod === "manual"}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        UOM
                      </label>
                      <Select
                        value={uom}
                        onValueChange={setUom}
                        disabled={calculationMethod === "manual"}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {UOM_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value || "none"}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Unit Cost
                      </label>
                      <Input
                        type="text"
                        value={
                          unitCostFocused
                            ? unitCost
                            : formatCurrencyInput(unitCost)
                        }
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, "");
                          setUnitCost(value);
                        }}
                        onFocus={() => setUnitCostFocused(true)}
                        onBlur={() => setUnitCostFocused(false)}
                        placeholder="0.00"
                        className="mt-1"
                        disabled={calculationMethod === "manual"}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Original Budget
                      </label>
                      <Input
                        type="text"
                        value={
                          originalBudgetFocused
                            ? originalBudget
                            : formatCurrencyInput(originalBudget)
                        }
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, "");
                          setOriginalBudget(value);
                        }}
                        onFocus={() => setOriginalBudgetFocused(true)}
                        onBlur={() => setOriginalBudgetFocused(false)}
                        placeholder="0.00"
                        className="mt-1 bg-muted font-semibold"
                        disabled={calculationMethod === "calculated"}
                      />
                    </div>
                  </div>

                  {/* Formula display for calculated method */}
                  {calculationMethod === "calculated" && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                      <span className="font-medium">Formula:</span>{" "}
                      {unitQty || "0"} × {formatCurrencyInput(unitCost)} ={" "}
                      {formatCurrencyInput(originalBudget)}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">
                    Loading history...
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-800">
                  {error}
                </div>
              )}

              {!loading && !error && history.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No changes recorded yet</p>
                </div>
              )}

              {!loading && !error && history.length > 0 && (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "border-l-4 pl-4 py-4 rounded-r-lg bg-background shadow-sm",
                        entry.change_type === "create" && "border-green-500",
                        entry.change_type === "delete" && "border-red-500",
                        entry.change_type === "update" && "border-blue-500",
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                            entry.change_type === "create" &&
                              "bg-green-100 text-green-600",
                            entry.change_type === "delete" &&
                              "bg-red-100 text-red-600",
                            entry.change_type === "update" &&
                              "bg-blue-100 text-blue-600",
                          )}
                        >
                          {entry.change_type === "create" && (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          )}
                          {entry.change_type === "delete" && (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                          {entry.change_type === "update" && (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {entry.changed_by.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.changed_at), {
                              addSuffix: true,
                            })}
                          </div>
                          <div className="mt-1.5 text-sm text-foreground">
                            {entry.change_type === "create" && (
                              <>
                                Created {formatFieldName(entry.field_name)}:{" "}
                                <span className="font-medium text-green-700">
                                  {formatValue(
                                    entry.field_name,
                                    entry.new_value,
                                  )}
                                </span>
                              </>
                            )}
                            {entry.change_type === "delete" &&
                              "Deleted this line item"}
                            {entry.change_type === "update" && (
                              <>
                                Changed {formatFieldName(entry.field_name)} from{" "}
                                <span className="line-through text-red-600">
                                  {formatValue(
                                    entry.field_name,
                                    entry.old_value,
                                  )}
                                </span>{" "}
                                to{" "}
                                <span className="font-medium text-green-700">
                                  {formatValue(
                                    entry.field_name,
                                    entry.new_value,
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                          {entry.notes && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Notes: {entry.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-end gap-4">
            <Button variant="outline" onClick={onClose}>
              {isAggregatedRow ? "Close" : "Cancel"}
            </Button>
            {activeTab === "original" && !isAggregatedRow && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
