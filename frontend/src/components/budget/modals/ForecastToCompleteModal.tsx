"use client";

import { useEffect, useMemo, useState } from "react";
import { BaseSidebar, SidebarBody, SidebarFooter } from "./BaseSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { MoneyField } from "@/components/forms/MoneyField";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { BarChart3, Calculator, Plus, TrendingUp, Trash2 } from "lucide-react";
import {
  BUDGET_PRIMARY_TABS_LIST_CLASS,
  BUDGET_PRIMARY_TABS_TRIGGER_CLASS,
  budgetRadioCardClass,
} from "./style-tokens";

type ForecastMethod =
  | "automatic"
  | "lump_sum"
  | "manual"
  | "monitored_resources";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ForecastEditorLineItem {
  id: string;
  description: string;
  quantity: number;
  units: string;
  unitCost: number;
  utilizationRate: number | null;
  startDate: string | null;
  endDate: string | null;
  unitsRemainingMode: "weeks" | "months";
  sortOrder: number;
}

interface ForecastToCompleteModalProps {
  open: boolean;
  onClose: () => void;
  budgetLineId: string;
  projectId: string;
  costCode?: string;
  currentData?: {
    forecastMethod: ForecastMethod;
    forecastAmount?: number;
    projectedBudget?: number;
    projectedCosts?: number;
    notes?: string;
  };
  onSave: (data: {
    budgetLineId: string;
    forecastMethod: string;
    forecastAmount: number;
    notes?: string | null;
    lineItems?: Array<{
      id?: string;
      description: string;
      quantity: number;
      units: string;
      unitCost: number;
      utilizationRate?: number | null;
      startDate?: string | null;
      endDate?: string | null;
      unitsRemainingMode?: "weeks" | "months";
      sortOrder?: number;
    }>;
  }) => Promise<void>;
}

const METHODS = [
  {
    value: "automatic" as const,
    label: "Automatic Calculation",
    description: "Projected Budget - Projected Costs.",
    icon: TrendingUp,
  },
  {
    value: "lump_sum" as const,
    label: "Lump Sum Entry",
    description: "Fixed amount to complete.",
    icon: Calculator,
  },
  {
    value: "manual" as const,
    label: "Manual Entry",
    description: "Build forecast from editable line items.",
    icon: BarChart3,
  },
  {
    value: "monitored_resources" as const,
    label: "Monitored Resources",
    description: "Track time-phased resources with drawdown.",
    icon: BarChart3,
  },
];

// Creates a stable default manual-entry row.
function createDefaultManualRow(index: number): ForecastEditorLineItem {
  return {
    id: `manual-${Date.now()}-${index}`,
    description: "",
    quantity: 1,
    units: "ls",
    unitCost: 0,
    utilizationRate: null,
    startDate: null,
    endDate: null,
    unitsRemainingMode: "weeks",
    sortOrder: index,
  };
}

// Creates a stable default monitored-resource row.
function createDefaultMonitoredRow(index: number): ForecastEditorLineItem {
  return {
    id: `monitored-${Date.now()}-${index}`,
    description: "",
    quantity: 1,
    units: "weeks",
    unitCost: 0,
    utilizationRate: 100,
    startDate: null,
    endDate: null,
    unitsRemainingMode: "weeks",
    sortOrder: index,
  };
}

// Calculates monitored units remaining using non-prorated bucket logic.
function computeUnitsRemaining(
  startDate: string | null,
  endDate: string | null,
  mode: "weeks" | "months",
): number {
  if (!startDate || !endDate) {
    return 1;
  }
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 1;
  }

  const today = new Date();
  if (mode === "months") {
    const totalMonths =
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (end.getUTCMonth() - start.getUTCMonth()) +
      1;
    const elapsedMonths =
      today <= start
        ? 0
        : (today.getUTCFullYear() - start.getUTCFullYear()) * 12 +
          (today.getUTCMonth() - start.getUTCMonth());
    return Math.max(0, totalMonths - Math.max(0, elapsedMonths));
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const dayCount = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
  const totalWeeks = Math.max(1, Math.ceil(dayCount / 7));
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const elapsedWeeks =
    today <= start ? 0 : Math.floor((today.getTime() - start.getTime()) / msPerWeek);
  return Math.max(0, totalWeeks - Math.max(0, elapsedWeeks));
}

// Builds a signature string for robust unsaved-changes detection.
function buildStateSignature(state: {
  forecastMethod: ForecastMethod;
  forecastAmount: string;
  forecastNotes: string;
  lineItems: ForecastEditorLineItem[];
}): string {
  return JSON.stringify({
    forecastMethod: state.forecastMethod,
    forecastAmount: state.forecastAmount,
    forecastNotes: state.forecastNotes,
    lineItems: state.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      units: item.units,
      unitCost: item.unitCost,
      utilizationRate: item.utilizationRate,
      startDate: item.startDate,
      endDate: item.endDate,
      unitsRemainingMode: item.unitsRemainingMode,
      sortOrder: item.sortOrder,
    })),
  });
}

// Renders method-specific forecast editors and persists FTC data for one budget line.
export function ForecastToCompleteModal({
  open,
  onClose,
  budgetLineId,
  projectId,
  currentData,
  onSave,
}: ForecastToCompleteModalProps) {
  const [activeTab, setActiveTab] = useState("forecast");
  const [forecastMethod, setForecastMethod] = useState<ForecastMethod>("automatic");
  const [forecastAmount, setForecastAmount] = useState<string>("");
  const [forecastNotes, setForecastNotes] = useState("");
  const [lineItems, setLineItems] = useState<ForecastEditorLineItem[]>([]);
  const [initialSignature, setInitialSignature] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const projectedBudget = currentData?.projectedBudget || 0;
  const projectedCosts = currentData?.projectedCosts || 0;

  // Computes the working FTC amount from selected method and editor rows.
  const calculatedForecast = useMemo(() => {
    if (forecastMethod === "automatic") {
      return Math.max(0, projectedBudget - projectedCosts);
    }

    if (forecastMethod === "manual") {
      return lineItems.reduce(
        (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitCost),
        0,
      );
    }

    if (forecastMethod === "monitored_resources") {
      return lineItems.reduce((sum, item) => {
        const unitsRemaining = computeUnitsRemaining(
          item.startDate,
          item.endDate,
          item.unitsRemainingMode,
        );
        const utilization = item.utilizationRate == null ? 100 : item.utilizationRate;
        const calculatedUnitCost = Math.max(0, item.unitCost) * (Math.max(0, utilization) / 100);
        return sum + calculatedUnitCost * unitsRemaining;
      }, 0);
    }

    return parseFloat(forecastAmount) || 0;
  }, [forecastMethod, forecastAmount, lineItems, projectedBudget, projectedCosts]);

  const estimatedCostAtCompletion = projectedCosts + calculatedForecast;
  const projectedOverUnder = projectedBudget - estimatedCostAtCompletion;

  // Loads latest saved forecast details for this line.
  const loadForecastDetail = async () => {
    setIsLoading(true);
    try {
      const detail = await apiFetch<{
        forecastMethod?: ForecastMethod;
        forecastAmount?: number;
        notes?: string | null;
        lineItems?: Array<{
          id?: string;
          description?: string;
          quantity?: number;
          units?: string | null;
          unitCost?: number;
          utilizationRate?: number | null;
          startDate?: string | null;
          endDate?: string | null;
          unitsRemainingMode?: "weeks" | "months" | null;
          sortOrder?: number;
        }>;
      }>(
        `/api/projects/${projectId}/budget/forecast?budgetLineId=${budgetLineId}`,
      );

      const method = detail.forecastMethod ?? currentData?.forecastMethod ?? "automatic";
      const amount =
        typeof detail.forecastAmount === "number"
          ? detail.forecastAmount
          : (currentData?.forecastAmount ?? 0);
      const normalizedRows = (detail.lineItems || []).map((item, index) => ({
        id: item.id || `loaded-${index}-${Date.now()}`,
        description: item.description || "",
        quantity: Number(item.quantity ?? 1),
        units: item.units || (method === "manual" ? "ls" : "weeks"),
        unitCost: Number(item.unitCost ?? 0),
        utilizationRate: item.utilizationRate ?? (method === "monitored_resources" ? 100 : null),
        startDate: item.startDate ?? null,
        endDate: item.endDate ?? null,
        unitsRemainingMode: item.unitsRemainingMode ?? "weeks",
        sortOrder: item.sortOrder ?? index,
      }));

      setForecastMethod(method);
      setForecastAmount(String(amount));
      setForecastNotes(detail.notes ?? currentData?.notes ?? "");
      setLineItems(normalizedRows);
      setActiveTab("forecast");
      setInitialSignature(
        buildStateSignature({
          forecastMethod: method,
          forecastAmount: String(amount),
          forecastNotes: detail.notes ?? currentData?.notes ?? "",
          lineItems: normalizedRows,
        }),
      );
    } catch {
      const fallbackMethod = currentData?.forecastMethod ?? "automatic";
      const fallbackAmount = String(currentData?.forecastAmount ?? 0);
      const fallbackNotes = currentData?.notes ?? "";
      setForecastMethod(fallbackMethod);
      setForecastAmount(fallbackAmount);
      setForecastNotes(fallbackNotes);
      setLineItems([]);
      setInitialSignature(
        buildStateSignature({
          forecastMethod: fallbackMethod,
          forecastAmount: fallbackAmount,
          forecastNotes: fallbackNotes,
          lineItems: [],
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadForecastDetail();
    }
  }, [open, budgetLineId, projectId]);

  // Syncs editor rows when the method switches to a line-item mode.
  useEffect(() => {
    if (forecastMethod === "manual" && lineItems.length === 0) {
      setLineItems([createDefaultManualRow(0)]);
    }
    if (forecastMethod === "monitored_resources" && lineItems.length === 0) {
      setLineItems([createDefaultMonitoredRow(0)]);
    }
    if (forecastMethod === "lump_sum" && !forecastAmount) {
      setForecastAmount("0");
    }
  }, [forecastMethod, lineItems.length, forecastAmount]);

  const hasChanges =
    buildStateSignature({
      forecastMethod,
      forecastAmount,
      forecastNotes,
      lineItems,
    }) !== initialSignature;

  // Updates one line-item field while preserving list order.
  const updateLineItem = (
    id: string,
    updates: Partial<ForecastEditorLineItem>,
  ) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  // Removes one line-item row and keeps at least one row in line-item modes.
  const removeLineItem = (id: string) => {
    setLineItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length > 0) {
        return next.map((item, index) => ({ ...item, sortOrder: index }));
      }
      if (forecastMethod === "manual") {
        return [createDefaultManualRow(0)];
      }
      if (forecastMethod === "monitored_resources") {
        return [createDefaultMonitoredRow(0)];
      }
      return [];
    });
  };

  // Adds a new line-item row for manual or monitored forecasting.
  const addLineItem = () => {
    setLineItems((prev) => {
      const index = prev.length;
      const next =
        forecastMethod === "manual"
          ? createDefaultManualRow(index)
          : createDefaultMonitoredRow(index);
      return [...prev, next];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        budgetLineId,
        forecastMethod,
        forecastAmount: calculatedForecast,
        notes: forecastNotes.trim() || null,
        lineItems:
          forecastMethod === "manual" || forecastMethod === "monitored_resources"
            ? lineItems.map((item, index) => ({
                id: UUID_REGEX.test(item.id) ? item.id : undefined,
                description: item.description,
                quantity: item.quantity,
                units: item.units,
                unitCost: item.unitCost,
                utilizationRate:
                  forecastMethod === "monitored_resources"
                    ? item.utilizationRate
                    : null,
                startDate:
                  forecastMethod === "monitored_resources" ? item.startDate : null,
                endDate:
                  forecastMethod === "monitored_resources" ? item.endDate : null,
                unitsRemainingMode:
                  forecastMethod === "monitored_resources"
                    ? item.unitsRemainingMode
                    : undefined,
                sortOrder: index,
              }))
            : [],
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!hasChanges) {
      onClose();
      return;
    }
    if (confirm("You have unsaved changes. Are you sure you want to close?")) {
      onClose();
    }
  };

  // Formats currency consistently for the forecast panel.
  const formatCurrency = (value: number): string => {
    const isNegative = value < 0;
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    return isNegative ? `($${formatted})` : `$${formatted}`;
  };

  return (
    <BaseSidebar open={open} onClose={handleClose} title="Forecast To Complete" size="lg">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 px-4 sm:px-8">
          <TabsList variant="line" className={BUDGET_PRIMARY_TABS_LIST_CLASS}>
            <TabsTrigger value="forecast" className={BUDGET_PRIMARY_TABS_TRIGGER_CLASS}>
              Forecast
            </TabsTrigger>
            <TabsTrigger value="history" className={BUDGET_PRIMARY_TABS_TRIGGER_CLASS}>
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <SidebarBody>
          <TabsContent value="forecast" className="px-4 py-4 sm:px-8 space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Budget</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(projectedBudget)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Projected Costs</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(projectedCosts)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                Forecast Method
              </Label>
              <RadioGroup
                value={forecastMethod}
                onValueChange={(value) => setForecastMethod(value as ForecastMethod)}
                className="mt-2 space-y-0.5"
                disabled={isLoading}
              >
                {METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <label
                      key={method.value}
                      htmlFor={method.value}
                      className={budgetRadioCardClass(forecastMethod === method.value)}
                    >
                      <RadioGroupItem value={method.value} id={method.value} />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground">{method.label}</span>
                      <span className="text-xs text-muted-foreground">{method.description}</span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {forecastMethod === "lump_sum" && (
              <div>
                <Label htmlFor="forecastAmount" className="text-sm font-medium text-foreground">
                  Forecast Amount
                </Label>
                <div className="mt-1">
                  <MoneyField
                    label="Forecast Amount"
                    value={forecastAmount ? parseFloat(forecastAmount) : undefined}
                    onChange={(value) => setForecastAmount(String(value ?? ""))}
                    placeholder=""
                    inline
                    showCurrency={false}
                  />
                </div>
              </div>
            )}

            {(forecastMethod === "manual" || forecastMethod === "monitored_resources") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">
                    {forecastMethod === "manual"
                      ? "Manual Forecast Line Items"
                      : "Monitored Resource Line Items"}
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Line Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item) => {
                    const unitsRemaining = computeUnitsRemaining(
                      item.startDate,
                      item.endDate,
                      item.unitsRemainingMode,
                    );
                    const utilization = item.utilizationRate == null ? 100 : item.utilizationRate;
                    const calculatedUnitCost = item.unitCost * (utilization / 100);
                    const monitoredAmount = calculatedUnitCost * unitsRemaining;
                    const manualAmount = item.quantity * item.unitCost;
                    const rowAmount =
                      forecastMethod === "monitored_resources"
                        ? monitoredAmount
                        : manualAmount;

                    return (
                      <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
                        <div className="grid grid-cols-12 gap-2">
                          <Input
                            className="col-span-12 md:col-span-4"
                            placeholder="Description"
                            value={item.description}
                            onChange={(event) =>
                              updateLineItem(item.id, { description: event.target.value })
                            }
                          />

                          {forecastMethod === "manual" ? (
                            <>
                              <Input
                                type="number"
                                className="col-span-4 md:col-span-2"
                                placeholder="Qty"
                                value={String(item.quantity)}
                                onChange={(event) =>
                                  updateLineItem(item.id, {
                                    quantity: Math.max(0, Number(event.target.value) || 0),
                                  })
                                }
                              />
                              <Input
                                className="col-span-4 md:col-span-2"
                                placeholder="Units"
                                value={item.units}
                                onChange={(event) =>
                                  updateLineItem(item.id, { units: event.target.value })
                                }
                              />
                              <Input
                                type="number"
                                className="col-span-4 md:col-span-2"
                                placeholder="Unit Cost"
                                value={String(item.unitCost)}
                                onChange={(event) =>
                                  updateLineItem(item.id, {
                                    unitCost: Math.max(0, Number(event.target.value) || 0),
                                  })
                                }
                              />
                            </>
                          ) : (
                            <>
                              <Input
                                type="date"
                                className="col-span-6 md:col-span-2"
                                value={item.startDate ?? ""}
                                onChange={(event) =>
                                  updateLineItem(item.id, {
                                    startDate: event.target.value || null,
                                  })
                                }
                              />
                              <Input
                                type="date"
                                className="col-span-6 md:col-span-2"
                                value={item.endDate ?? ""}
                                onChange={(event) =>
                                  updateLineItem(item.id, {
                                    endDate: event.target.value || null,
                                  })
                                }
                              />
                              <select
                                className="col-span-4 md:col-span-2 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={item.unitsRemainingMode}
                                onChange={(event) =>
                                  updateLineItem(item.id, {
                                    unitsRemainingMode: event.target.value as "weeks" | "months",
                                    units: event.target.value,
                                  })
                                }
                              >
                                <option value="weeks">Weeks</option>
                                <option value="months">Months</option>
                              </select>
                              <Input
                                type="number"
                                className="col-span-4 md:col-span-1"
                                placeholder="%"
                                value={String(item.utilizationRate ?? 100)}
                                onChange={(event) =>
                                  updateLineItem(item.id, {
                                    utilizationRate: Math.max(
                                      0,
                                      Math.min(100, Number(event.target.value) || 0),
                                    ),
                                  })
                                }
                              />
                              <Input
                                type="number"
                                className="col-span-4 md:col-span-1"
                                placeholder="Unit Cost"
                                value={String(item.unitCost)}
                                onChange={(event) =>
                                  updateLineItem(item.id, {
                                    unitCost: Math.max(0, Number(event.target.value) || 0),
                                  })
                                }
                              />
                              <div className="col-span-12 md:col-span-2 text-xs text-muted-foreground flex items-center">
                                {unitsRemaining} units remaining
                              </div>
                            </>
                          )}

                          <div className="col-span-10 text-sm text-muted-foreground">
                            Line Total:{" "}
                            <span className="font-semibold text-foreground">
                              {formatCurrency(rowAmount)}
                            </span>
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLineItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="forecastNotes" className="text-sm font-medium text-foreground">
                Notes
              </Label>
              <Textarea
                id="forecastNotes"
                value={forecastNotes}
                onChange={(event) => setForecastNotes(event.target.value)}
                className="mt-1 min-h-[88px]"
                placeholder="Add context for this forecast."
              />
            </div>

            <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Forecast To Complete</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(calculatedForecast)}
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Est. Cost at Completion</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(estimatedCostAtCompletion)}
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Projected Over / Under</span>
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    projectedOverUnder < 0 ? "text-destructive" : "text-foreground",
                  )}
                >
                  {formatCurrency(projectedOverUnder)}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="px-4 py-5 sm:px-8">
            <p className="text-sm text-muted-foreground text-center py-12">
              Forecast history coming soon.
            </p>
          </TabsContent>
        </SidebarBody>
      </Tabs>

      <SidebarFooter>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          {activeTab === "forecast" && (
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoading || !hasChanges}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </BaseSidebar>
  );
}
