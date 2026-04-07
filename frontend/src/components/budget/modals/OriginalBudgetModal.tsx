"use client";

import { useState, useEffect } from "react";
import { BaseSidebar, SidebarBody, SidebarFooter } from "./BaseSidebar";
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
import {
  BUDGET_PRIMARY_TABS_LIST_CLASS,
  BUDGET_PRIMARY_TABS_TRIGGER_CLASS,
  budgetRadioCardClass,
} from "./style-tokens";

interface OriginalBudgetModalProps {
  open: boolean;
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

export function OriginalBudgetModal({
  open,
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

  const originalBudget =
    calculationMethod === "unit_price"
      ? (parseFloat(unitQty) || 0) * (parseFloat(unitCost) || 0)
      : parseFloat(unitCost) || 0;

  useEffect(() => {
    if (open) {
      setCalculationMethod(currentData?.calculationMethod || "unit_price");
      setUnitQty(currentData?.unitQty?.toString() || "");
      setUom(currentData?.uom || "");
      setUnitCost(currentData?.unitCost?.toString() || "");
      setActiveTab("budget");
    }
  }, [open, currentData]);

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
    <BaseSidebar
      open={open}
      onClose={handleClose}
      title={`Original Budget Amount for ${costCode}`}
      size="lg"
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "budget" | "history")}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="px-4 sm:px-8 flex-shrink-0">
          <TabsList variant="line" className={BUDGET_PRIMARY_TABS_LIST_CLASS}>
            <TabsTrigger
              value="budget"
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

        <SidebarBody>
          {/* Original Budget Tab */}
          <TabsContent value="budget" className="m-0">
            <div className="px-4 py-4 sm:px-8 space-y-6 bg-background">
              {/* Calculation Method */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground block">
                      Calculation Method
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose how this line is calculated.
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
                    {costCode}
                  </span>
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
                    className={budgetRadioCardClass(
                      calculationMethod === "unit_price",
                    )}
                  >
                    <RadioGroupItem
                      value="unit_price"
                      id="unit_price"
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <Grid className="h-4 w-4 text-muted-foreground" />
                        Unit Price
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Qty x Unit Cost, best for repeatable work.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="lump_sum"
                    className={budgetRadioCardClass(
                      calculationMethod === "lump_sum",
                    )}
                  >
                    <RadioGroupItem
                      value="lump_sum"
                      id="lump_sum"
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        Lump Sum
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Single amount, perfect for fixed-scope work.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Input Fields */}
              <div
                className={cn(
                  "grid gap-4 rounded-lg border border-border bg-background p-4",
                  calculationMethod === "unit_price"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
                    : "grid-cols-1 sm:grid-cols-2",
                )}
              >
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
                    className="mt-1 bg-muted text-foreground font-semibold"
                    readOnly
                  />
                </div>
              </div>

              {/* Calculation Formula */}
              {calculationMethod === "unit_price" && (
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">Formula:</span> Original
                    Budget = Unit Qty x Unit Cost
                    {unitQty && unitCost && (
                      <span className="ml-2 text-muted-foreground">
                        ({unitQty} x ${unitCost} = ${originalBudget.toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="m-0">
            <div className="px-4 py-4 sm:px-8 space-y-4 bg-background">
              <p className="text-sm text-muted-foreground">
                View the audit trail of every change to this budget line.
              </p>

              <div className="overflow-x-auto scrollbar-hide rounded-lg border border-border bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">
                        Snapshot Name
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-foreground">
                        Unit Qty
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">
                        UOM
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-foreground">
                        Unit Cost
                      </th>
                      <th className="text-right px-4 py-3 font-semibold text-foreground">
                        Original Budget
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-right">
                        {currentData?.unitQty?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-4 py-3">{currentData?.uom || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        ${currentData?.unitCost?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ${currentData?.originalBudget?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
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
            </div>
          </TabsContent>
        </SidebarBody>
      </Tabs>

      <SidebarFooter>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          {activeTab === "budget" && (
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? "Saving..." : "Done"}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </BaseSidebar>
  );
}
