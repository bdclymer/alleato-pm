"use client";

import { useState, useEffect } from "react";
import { BaseModal, ModalBody, ModalFooter } from "./BaseModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Grid, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OriginalBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  costCode: string;
  budgetLineId: string;
  currentData?: {
    calculationMethod: "unit_price" | "lump_sum";
    unitQty: number;
    uom: string;
    unitCost: number;
    originalBudget: number;
  };
  onSave: (data: any) => Promise<void>;
}

/**
 * OriginalBudgetModal - Edit original budget amount
 *
 * Features:
 * - Two tabs: Original Budget (edit) and History (read-only)
 * - Calculation: Original Budget = Unit Qty × Unit Cost
 * - Real-time calculation updates
 * - Mobile responsive layout
 * - Matches Procore design
 */
export function OriginalBudgetModal({
  isOpen,
  onClose,
  costCode,
  budgetLineId,
  currentData,
  onSave,
}: OriginalBudgetModalProps) {
  const [activeTab, setActiveTab] = useState<"budget" | "history">("budget");
  const [calculationMethod, setCalculationMethod] = useState<
    "unit_price" | "lump_sum"
  >(currentData?.calculationMethod || "unit_price");
  const [unitQty, setUnitQty] = useState<string>(
    currentData?.unitQty?.toString() || "",
  );
  const [uom, setUom] = useState<string>(currentData?.uom || "");
  const [unitCost, setUnitCost] = useState<string>(
    currentData?.unitCost?.toString() || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  // Calculate original budget in real-time
  const originalBudget =
    calculationMethod === "unit_price"
      ? (parseFloat(unitQty) || 0) * (parseFloat(unitCost) || 0)
      : parseFloat(unitCost) || 0; // For lump sum, unitCost is the total

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCalculationMethod(currentData?.calculationMethod || "unit_price");
      setUnitQty(currentData?.unitQty?.toString() || "");
      setUom(currentData?.uom || "");
      setUnitCost(currentData?.unitCost?.toString() || "");
      setActiveTab("budget");
    }
  }, [isOpen, currentData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        budgetLineId,
        calculationMethod,
        unitQty:
          calculationMethod === "unit_price" ? parseFloat(unitQty) || 0 : null,
        uom: calculationMethod === "unit_price" ? uom : null,
        unitCost: parseFloat(unitCost) || 0,
        originalBudget,
      });
      onClose();
    } catch (error) {
      // Error handling would show toast here
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    calculationMethod !== currentData?.calculationMethod ||
    (parseFloat(unitQty) || 0) !== (currentData?.unitQty || 0) ||
    uom !== (currentData?.uom || "") ||
    (parseFloat(unitCost) || 0) !== (currentData?.unitCost || 0);

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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Original Budget Amount for ${costCode}`}
      size="lg"
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "budget" | "history")}
      >
        {/* Tab Navigation */}
        <div className="border-b border-border/80 px-6 bg-background/70 backdrop-blur-sm">
          <TabsList className="bg-transparent border-0 p-0 h-auto flex gap-4">
            <TabsTrigger
              value="budget"
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                "data-[state=active]:border-orange-500/70 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-50",
                "data-[state=inactive]:border-transparent data-[state=inactive]:text-foreground hover:text-foreground hover:border-border",
              )}
            >
              Original Budget
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                "data-[state=active]:border-orange-500/70 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-50",
                "data-[state=inactive]:border-transparent data-[state=inactive]:text-foreground hover:text-foreground hover:border-border",
              )}
            >
              History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Original Budget Tab */}
        <TabsContent value="budget" className="m-0">
          <ModalBody className="space-y-6 bg-background">
            {/* Calculation Method */}
            <div className="rounded-xl border border-slate-200 shadow-sm p-4 bg-gradient-to-br from-white via-slate-50 to-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-[0.2em] text-slate-500 block">
                    Calculation Method
                  </Label>
                  <p className="text-sm text-slate-700 mt-1">
                    Choose how this line is calculated.
                  </p>
                </div>
                <div className="flex gap-4">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-700">
                    {costCode}
                  </span>
                </div>
              </div>
              <RadioGroup
                value={calculationMethod}
                onValueChange={(v) =>
                  setCalculationMethod(v as "unit_price" | "lump_sum")
                }
                className="mt-4 grid gap-4 sm:grid-cols-2"
              >
                <label
                  htmlFor="unit_price"
                  className={cn(
                    "flex items-start gap-4 rounded-xl border border-slate-200 bg-background px-4 py-4 shadow-sm cursor-pointer transition-all",
                    calculationMethod === "unit_price" &&
                      "border-orange-400/70 shadow-[0_12px_30px_-18px_rgba(255,115,29,0.55)] bg-orange-50/60",
                  )}
                >
                  <RadioGroupItem
                    value="unit_price"
                    id="unit_price"
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Grid className="h-4 w-4 text-orange-500" />
                      Unit Price
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Qty × Unit Cost, best for repeatable work.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="lump_sum"
                  className={cn(
                    "flex items-start gap-4 rounded-xl border border-slate-200 bg-background px-4 py-4 shadow-sm cursor-pointer transition-all",
                    calculationMethod === "lump_sum" &&
                      "border-orange-400/70 shadow-[0_12px_30px_-18px_rgba(255,115,29,0.55)] bg-orange-50/60",
                  )}
                >
                  <RadioGroupItem
                    value="lump_sum"
                    id="lump_sum"
                    className="mt-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Lump Sum
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      Single amount, perfect for fixed-scope work.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Input Fields - Responsive Grid */}
            <div
              className={cn(
                "grid gap-4 rounded-xl border border-slate-200 bg-background shadow-sm p-4",
                calculationMethod === "unit_price"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
                  : "grid-cols-1 sm:grid-cols-2",
              )}
            >
              {/* Unit Qty - Only for unit price */}
              {calculationMethod === "unit_price" && (
                <div>
                  <Label
                    htmlFor="unitQty"
                    className="text-sm font-medium text-foreground"
                  >
                    Unit Qty
                  </Label>
                  <Input
                    id="unitQty"
                    type="number"
                    step="0.01"
                    value={unitQty}
                    onChange={(e) => setUnitQty(e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              )}

              {/* UOM - Only for unit price */}
              {calculationMethod === "unit_price" && (
                <div>
                  <Label
                    htmlFor="uom"
                    className="text-sm font-medium text-foreground"
                  >
                    UOM
                  </Label>
                  <Select value={uom} onValueChange={setUom}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EA">EA - Each</SelectItem>
                      <SelectItem value="SF">SF - Square Feet</SelectItem>
                      <SelectItem value="LF">LF - Linear Feet</SelectItem>
                      <SelectItem value="CY">CY - Cubic Yards</SelectItem>
                      <SelectItem value="TON">TON - Ton</SelectItem>
                      <SelectItem value="HR">HR - Hours</SelectItem>
                      <SelectItem value="LS">LS - Lump Sum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Unit Cost */}
              <div>
                <Label
                  htmlFor="unitCost"
                  className="text-sm font-medium text-foreground"
                >
                  {calculationMethod === "unit_price" ? "Unit Cost" : "Amount"}
                </Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="$0.00"
                  className="mt-1"
                />
              </div>

              {/* Original Budget - Calculated (Read-only) */}
              <div
                className={
                  calculationMethod === "unit_price" ? "lg:col-span-2" : ""
                }
              >
                <Label
                  htmlFor="originalBudget"
                  className="text-sm font-medium text-foreground"
                >
                  Original Budget
                </Label>
                <Input
                  id="originalBudget"
                  type="text"
                  value={`$${originalBudget.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  disabled
                  className="mt-1 bg-slate-50 text-foreground font-semibold"
                  readOnly
                />
              </div>
            </div>

            {/* Calculation Formula Display */}
            {calculationMethod === "unit_price" && (
              <div className="mt-2 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-900 shadow-sm">
                <p className="text-sm">
                  <span className="font-semibold">Formula:</span> Original
                  Budget = Unit Qty × Unit Cost
                  {unitQty && unitCost && (
                    <span className="ml-2">
                      ({unitQty} × ${unitCost} = ${originalBudget.toFixed(2)})
                    </span>
                  )}
                </p>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isSaving ? "Saving..." : "Done"}
            </Button>
          </ModalFooter>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="m-0">
          <ModalBody className="space-y-4 bg-background">
            <p className="text-sm text-foreground">
              View the audit trail of every change to this budget line.
            </p>

            {/* History Table */}
            <div className="overflow-x-auto scrollbar-hide rounded-xl border border-slate-200 shadow-sm bg-background">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Snapshot Name
                    </th>
                    <th className="text-right px-4 py-4 font-semibold text-slate-800">
                      Unit Qty
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      UOM
                    </th>
                    <th className="text-right px-4 py-4 font-semibold text-slate-800">
                      Unit Cost
                    </th>
                    <th className="text-right px-4 py-4 font-semibold text-slate-800">
                      Original Budget
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Current snapshot */}
                  <tr className="hover:bg-orange-50/40 transition-colors">
                    <td className="px-4 py-4">
                      Current -{" "}
                      {new Date().toLocaleDateString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        year: "2-digit",
                      })}{" "}
                      at{" "}
                      {new Date().toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {currentData?.unitQty?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-4 py-4">{currentData?.uom || "-"}</td>
                    <td className="px-4 py-4 text-right">
                      ${currentData?.unitCost?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold">
                      ${currentData?.originalBudget?.toFixed(2) || "0.00"}
                    </td>
                  </tr>

                  {/* Empty state */}
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No previous snapshots available
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </ModalFooter>
        </TabsContent>
      </Tabs>
    </BaseModal>
  );
}
