"use client";

import { useState, useEffect } from "react";
import { BaseSidebar, SidebarBody, SidebarFooter } from "./BaseSidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { MoneyField } from "@/components/forms/MoneyField";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TrendingUp, BarChart3, Calculator } from "lucide-react";
import {
  BUDGET_PRIMARY_TABS_LIST_CLASS,
  BUDGET_PRIMARY_TABS_TRIGGER_CLASS,
  budgetRadioCardClass,
} from "./style-tokens";

interface ForecastToCompleteModalProps {
  open: boolean;
  onClose: () => void;
  budgetLineId: string;
  projectId: string;
  costCode?: string;
  currentData?: {
    forecastMethod:
      | "automatic"
      | "lump_sum"
      | "manual"
      | "monitored_resources";
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
    label: "Manual",
    description: "Set forecast based on your estimate.",
    icon: BarChart3,
  },
  {
    value: "monitored_resources" as const,
    label: "Monitored Resources",
    description: "Resource-based forecast amount.",
    icon: BarChart3,
  },
];

export function ForecastToCompleteModal({
  open,
  onClose,
  budgetLineId,
  currentData,
  onSave,
}: ForecastToCompleteModalProps) {
  const [activeTab, setActiveTab] = useState("forecast");
  const [forecastMethod, setForecastMethod] = useState<
    "automatic" | "lump_sum" | "manual" | "monitored_resources"
  >(currentData?.forecastMethod || "automatic");
  const [forecastAmount, setForecastAmount] = useState<string>(
    currentData?.forecastAmount?.toString() || "",
  );
  const [forecastNotes, setForecastNotes] = useState(currentData?.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const projectedBudget = currentData?.projectedBudget || 0;
  const projectedCosts = currentData?.projectedCosts || 0;

  const calculatedForecast =
    forecastMethod === "automatic"
      ? Math.max(0, projectedBudget - projectedCosts)
      : forecastMethod === "lump_sum" ||
          forecastMethod === "manual" ||
          forecastMethod === "monitored_resources"
      ? parseFloat(forecastAmount) || 0
      : 0;

  const estimatedCostAtCompletion = projectedCosts + calculatedForecast;
  const projectedOverUnder = projectedBudget - estimatedCostAtCompletion;

  useEffect(() => {
    if (open) {
      setForecastMethod(currentData?.forecastMethod || "automatic");
      setForecastNotes(currentData?.notes || "");
      setForecastAmount(currentData?.forecastAmount?.toString() || "");
      setActiveTab("forecast");
    }
  }, [open, currentData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        budgetLineId,
        forecastMethod,
        forecastAmount: calculatedForecast,
        notes: forecastNotes.trim() || null,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save forecast:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    forecastMethod !== currentData?.forecastMethod ||
    calculatedForecast !== (currentData?.forecastAmount || 0) ||
    forecastNotes !== (currentData?.notes || "");

  const handleClose = () => {
    if (hasChanges) {
      if (
        confirm("You have unsaved changes. Are you sure you want to close?")
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const formatCurrency = (value: number): string => {
    const isNegative = value < 0;
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));

    return isNegative ? `($${formatted})` : `$${formatted}`;
  };

  return (
    <BaseSidebar
      open={open}
      onClose={handleClose}
      title="Forecast To Complete"
      size="lg"
    >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="px-4 sm:px-8 flex-shrink-0">
          <TabsList variant="line" className={BUDGET_PRIMARY_TABS_LIST_CLASS}>
            <TabsTrigger
              value="forecast"
              className={BUDGET_PRIMARY_TABS_TRIGGER_CLASS}
            >
              Forecast
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={BUDGET_PRIMARY_TABS_TRIGGER_CLASS}
            >
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <SidebarBody>
          <TabsContent
            value="forecast"
            className="px-4 py-4 sm:px-8 space-y-4"
          >
            {/* Budget Summary */}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Projected Budget
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(projectedBudget)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Projected Costs
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(projectedCosts)}
                  </p>
                </div>
              </div>
            </div>

            {/* Forecast Method */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                Forecast Method
              </Label>
              <RadioGroup
                value={forecastMethod}
                onValueChange={(v) =>
                  setForecastMethod(v as typeof forecastMethod)
                }
                className="mt-2 space-y-0.5"
              >
                {METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <label
                      key={method.value}
                      htmlFor={method.value}
                      className={budgetRadioCardClass(
                        forecastMethod === method.value,
                      )}
                    >
                      <RadioGroupItem value={method.value} id={method.value} />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground">
                        {method.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {method.description}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Amount Input */}
            {(forecastMethod === "lump_sum" ||
              forecastMethod === "manual" ||
              forecastMethod === "monitored_resources") && (
              <div>
                <Label
                  htmlFor="forecastAmount"
                  className="text-sm font-medium text-foreground"
                >
                  Forecast Amount
                </Label>
                <div className="mt-1">
                  <MoneyField
                    label="Forecast Amount"
                    value={
                      forecastAmount ? parseFloat(forecastAmount) : undefined
                    }
                    onChange={(val) => setForecastAmount(String(val ?? ""))}
                    placeholder=""
                    inline
                    showCurrency={false}
                  />
                </div>
              </div>
            )}

            <div>
              <Label
                htmlFor="forecastNotes"
                className="text-sm font-medium text-foreground"
              >
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

            {/* Calculations */}
            <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Forecast To Complete
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(calculatedForecast)}
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Est. Cost at Completion
                </span>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCurrency(estimatedCostAtCompletion)}
                </span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">
                  Projected Over / Under
                </span>
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    projectedOverUnder < 0
                      ? "text-destructive"
                      : "text-foreground",
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
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </BaseSidebar>
  );
}
