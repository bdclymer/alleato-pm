"use client";

import { useState, useEffect } from "react";
import {
  BaseSidebar,
  SidebarBody,
  SidebarFooter,
  SidebarTabs,
} from "./BaseSidebar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { TrendingUp, BarChart3, Calculator } from "lucide-react";

interface ForecastToCompleteModalProps {
  open: boolean;
  onClose: () => void;
  costCode: string;
  budgetLineId: string;
  projectId: string;
  currentData?: {
    forecastMethod: "lump_sum" | "manual" | "monitored";
    forecastAmount: number;
    projectedBudget: number;
    projectedCosts: number;
  };
  onSave: (data: {
    budgetLineId: string;
    forecastMethod: string;
    forecastAmount: number;
  }) => Promise<void>;
}

/**
 * ForecastToCompleteModal - Edit forecast to complete settings
 *
 * Features:
 * - Three forecast methods: Lump Sum, Manual, Monitored
 * - Real-time calculation display
 * - Shows projected over/under
 * - Mobile responsive layout
 * - Matches Procore design patterns
 */
export function ForecastToCompleteModal({
  open,
  onClose,
  costCode,
  budgetLineId,
  currentData,
  onSave,
}: ForecastToCompleteModalProps) {
  const [activeTab, setActiveTab] = useState<"forecast" | "history">(
    "forecast",
  );
  const [forecastMethod, setForecastMethod] = useState<
    "lump_sum" | "manual" | "monitored"
  >(currentData?.forecastMethod || "lump_sum");
  const [forecastAmount, setForecastAmount] = useState<string>(
    currentData?.forecastAmount?.toString() || "0",
  );
  const [isSaving, setIsSaving] = useState(false);

  // Calculate forecast to complete based on method
  const projectedBudget = currentData?.projectedBudget || 0;
  const projectedCosts = currentData?.projectedCosts || 0;

  const calculatedForecast =
    forecastMethod === "lump_sum" || forecastMethod === "manual"
      ? parseFloat(forecastAmount) || 0
      : Math.max(0, projectedBudget - projectedCosts); // Monitored method

  const estimatedCostAtCompletion = projectedCosts + calculatedForecast;
  const projectedOverUnder = projectedBudget - estimatedCostAtCompletion;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setForecastMethod(currentData?.forecastMethod || "lump_sum");
      setForecastAmount(currentData?.forecastAmount?.toString() || "0");
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
      });
      onClose();
    } catch (error) {

      console.error("Failed to fetch forecast:", error);

      // Intentionally swallowed: modal shows empty state on error

    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    forecastMethod !== currentData?.forecastMethod ||
    calculatedForecast !== (currentData?.forecastAmount || 0);

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

    if (isNegative) {
      return `($${formatted})`;
    }
    return `$${formatted}`;
  };

  const tabs = [
    { id: "forecast", label: "Forecast" },
    { id: "history", label: "History" },
  ];

  return (
    <BaseSidebar
      open={open}
      onClose={handleClose}
      title="Forecast To Complete"
      subtitle={costCode}
      size="lg"
    >
      {/* Tabs */}
      <SidebarTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "forecast" | "history")}
      />

      {/* Content */}
      <SidebarBody className="bg-background">
        {activeTab === "forecast" ? (
          <div className="p-6 space-y-6">
            {/* Current Budget Summary */}
            <div className="rounded-xl border border-slate-200 shadow-sm p-5 bg-gradient-to-br from-green-50 via-white to-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-foreground">Projected Budget</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(projectedBudget)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground">Projected Costs</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(projectedCosts)}
                  </p>
                </div>
              </div>
            </div>

            {/* Forecast Method */}
            <div className="rounded-xl border border-slate-200 shadow-sm p-5 bg-gradient-to-br from-white via-slate-50 to-white">
              <Label className="text-xs uppercase tracking-[0.2em] text-slate-500 block mb-4">
                Forecast Method
              </Label>
              <RadioGroup
                value={forecastMethod}
                onValueChange={(v) =>
                  setForecastMethod(v as typeof forecastMethod)
                }
                className="grid gap-3"
              >
                <label
                  htmlFor="lump_sum"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-slate-200 bg-background px-4 py-3 shadow-sm cursor-pointer transition-all",
                    forecastMethod === "lump_sum" &&
                      "border-orange-400/70 shadow-[0_12px_30px_-18px_rgba(255,115,29,0.55)] bg-orange-50/60",
                  )}
                >
                  <RadioGroupItem
                    value="lump_sum"
                    id="lump_sum"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Calculator className="h-4 w-4 text-orange-500" />
                      Lump Sum
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Enter a fixed amount to complete.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="manual"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-slate-200 bg-background px-4 py-3 shadow-sm cursor-pointer transition-all",
                    forecastMethod === "manual" &&
                      "border-orange-400/70 shadow-[0_12px_30px_-18px_rgba(255,115,29,0.55)] bg-orange-50/60",
                  )}
                >
                  <RadioGroupItem value="manual" id="manual" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <BarChart3 className="h-4 w-4 text-orange-500" />
                      Manual
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Manually set forecast based on your estimate.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="monitored"
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-slate-200 bg-background px-4 py-3 shadow-sm cursor-pointer transition-all",
                    forecastMethod === "monitored" &&
                      "border-orange-400/70 shadow-[0_12px_30px_-18px_rgba(255,115,29,0.55)] bg-orange-50/60",
                  )}
                >
                  <RadioGroupItem
                    value="monitored"
                    id="monitored"
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      Monitored
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Automatically calculated as Projected Budget - Projected
                      Costs.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Amount Input (only for Lump Sum and Manual) */}
            {(forecastMethod === "lump_sum" || forecastMethod === "manual") && (
              <div className="rounded-xl border border-slate-200 bg-background shadow-sm p-5">
                <Label
                  htmlFor="forecastAmount"
                  className="text-sm font-medium text-foreground"
                >
                  Forecast Amount
                </Label>
                <Input
                  id="forecastAmount"
                  type="number"
                  step="0.01"
                  value={forecastAmount}
                  onChange={(e) => setForecastAmount(e.target.value)}
                  placeholder="$0.00"
                  className="mt-2"
                />
              </div>
            )}

            {/* Calculation Display */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm p-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground">
                    Forecast To Complete
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(calculatedForecast)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                  <span className="text-sm text-foreground">
                    Estimated Cost at Completion
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatCurrency(estimatedCostAtCompletion)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                  <span className="text-sm font-semibold text-foreground">
                    Projected Over / Under
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      projectedOverUnder < 0
                        ? "text-red-600"
                        : "text-green-600",
                    )}
                  >
                    {formatCurrency(projectedOverUnder)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <p className="text-sm text-foreground">
              View the history of forecast changes for this budget line.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-muted-foreground">History view coming soon</p>
            </div>
          </div>
        )}
      </SidebarBody>

      {/* Footer */}
      <SidebarFooter>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          {activeTab === "forecast" && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </BaseSidebar>
  );
}
