"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Info,
  Calculator,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface VerticalMarkup {
  id: string;
  markup_type: string;
  percentage: number;
  compound: boolean;
  calculation_order: number;
  project_id: number;
}

interface CalculationResult {
  markup_type: string;
  percentage: number;
  compound: boolean;
  baseAmount: number;
  markupAmount: number;
  runningTotal: number;
}

interface VerticalMarkupSettingsProps {
  projectId: string;
  onClose?: () => void;
}

// Database CHECK constraint allows: insurance, bond, fee, overhead, custom
// Map display labels to database values
const MARKUP_TYPE_OPTIONS = [
  { label: "Overhead", value: "overhead" },
  { label: "Insurance", value: "insurance" },
  { label: "Bond", value: "bond" },
  { label: "Fee", value: "fee" },
  { label: "Custom", value: "custom" },
];

export function VerticalMarkupSettings({
  projectId,
  onClose,
}: VerticalMarkupSettingsProps) {
  const [markups, setMarkups] = React.useState<VerticalMarkup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showCalculator, setShowCalculator] = React.useState(false);

  // New markup form state
  const [newMarkupType, setNewMarkupType] = React.useState("");
  const [newPercentage, setNewPercentage] = React.useState("10");
  const [newCompound, setNewCompound] = React.useState(true);

  // Calculator state
  const [calculatorAmount, setCalculatorAmount] = React.useState("100000");
  const [calculationResults, setCalculationResults] = React.useState<{
    calculations: CalculationResult[];
    totalMarkup: number;
    finalAmount: number;
  } | null>(null);

  // Fetch markups on mount
  React.useEffect(() => {
    fetchMarkups();
  }, [projectId]);

  const fetchMarkups = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/vertical-markup`,
      );
      if (response.ok) {
        const data = await response.json();
        setMarkups(data.markups || []);
      } else {
        toast.error("Failed to load markup settings");
      }
    } catch (error) {
      toast.error("Failed to load markup settings");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMarkup = async () => {
    if (!newMarkupType || !newPercentage) {
      toast.error("Please fill in all fields");
      return;
    }

    const percentage = parseFloat(newPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/projects/${projectId}/vertical-markup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markup_type: newMarkupType,
            percentage,
            compound: newCompound,
          }),
        },
      );

      if (response.ok) {
        toast.success("Markup added successfully");
        setShowAddDialog(false);
        setNewMarkupType("");
        setNewPercentage("10");
        setNewCompound(true);
        fetchMarkups();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add markup");
      }
    } catch (error) {
      toast.error("Failed to add markup");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMarkup = async (markupId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/vertical-markup?markupId=${markupId}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        toast.success("Markup deleted");
        fetchMarkups();
      } else {
        toast.error("Failed to delete markup");
      }
    } catch (error) {
      toast.error("Failed to delete markup");
    }
  };

  const handleUpdateMarkup = async (
    markupId: string,
    updates: Partial<VerticalMarkup>,
  ) => {
    const updatedMarkups = markups.map((m) =>
      m.id === markupId ? { ...m, ...updates } : m,
    );
    setMarkups(updatedMarkups);

    // Debounced save
    try {
      const response = await fetch(
        `/api/projects/${projectId}/vertical-markup`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markups: updatedMarkups }),
        },
      );

      if (!response.ok) {
        toast.error("Failed to save changes");
        fetchMarkups(); // Revert on error
      }
    } catch (error) {
      toast.error("Failed to save changes");
      fetchMarkups();
    }
  };

  const handleCalculate = async () => {
    const amount = parseFloat(calculatorAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/vertical-markup/calculate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseAmount: amount }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setCalculationResults({
          calculations: data.calculations,
          totalMarkup: data.totalMarkup,
          finalAmount: data.finalAmount,
        });
      } else {
        toast.error("Failed to calculate");
      }
    } catch (error) {
      toast.error("Failed to calculate");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Vertical Markup Settings
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Vertical markup adds percentages like overhead, profit,
                      and insurance to your costs. Compound markups calculate on
                      the running total.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              Configure markup percentages applied to contracts and change
              orders
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCalculator(true)}>
              <Calculator />
              Test Calculator
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus />
              Add Markup
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {markups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vertical markup configured</p>
            <p className="text-sm mt-1">
              Add markup items to calculate overhead, profit, and insurance
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground px-2">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Type</div>
              <div className="col-span-2">Percentage</div>
              <div className="col-span-3">Compound</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Markup Items */}
            {markups.map((markup, index) => (
              <div
                key={markup.id}
                className="grid grid-cols-12 gap-4 items-center p-4 rounded-lg border bg-card hover:bg-muted/50"
              >
                <div className="col-span-1 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-sm text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
                <div className="col-span-4">
                  <Input
                    value={markup.markup_type}
                    onChange={(e) =>
                      handleUpdateMarkup(markup.id, {
                        markup_type: e.target.value,
                      })
                    }
                    className="h-9"
                  />
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={markup.percentage}
                      onChange={(e) =>
                        handleUpdateMarkup(markup.id, {
                          percentage: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-9 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <Switch
                    checked={markup.compound}
                    onCheckedChange={(checked) =>
                      handleUpdateMarkup(markup.id, { compound: checked })
                    }
                  />
                  <span className="text-sm">
                    {markup.compound ? (
                      <Badge variant="secondary">Compound</Badge>
                    ) : (
                      <Badge variant="outline">Simple</Badge>
                    )}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMarkup(markup.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Explanation */}
        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 px-6 py-5 flex items-start gap-4">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1.5">How Vertical Markup Works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                <strong>Simple Markup:</strong> Calculated on the original base
                amount only
              </li>
              <li>
                <strong>Compound Markup:</strong> Calculated on the running total
                (base + previous markups)
              </li>
              <li>
                <strong>Order matters:</strong> Markups are applied in the order
                shown above
              </li>
            </ul>
          </div>
        </div>
      </CardContent>

      {/* Add Markup Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vertical Markup</DialogTitle>
            <DialogDescription>
              Add a new markup percentage to apply to contracts and change
              orders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Markup Type</Label>
              <Select value={newMarkupType} onValueChange={setNewMarkupType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a markup type" />
                </SelectTrigger>
                <SelectContent>
                  {MARKUP_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Percentage</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="10"
                  value={newPercentage}
                  onChange={(e) => setNewPercentage(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Compound</Label>
                <p className="text-sm text-muted-foreground">
                  Calculate on running total instead of base
                </p>
              </div>
              <Switch checked={newCompound} onCheckedChange={setNewCompound} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMarkup} disabled={saving}>
              {saving ? "Adding..." : "Add Markup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculator Dialog */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Markup Calculator</DialogTitle>
            <DialogDescription>
              Test how vertical markup applies to a given amount
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Base Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={calculatorAmount}
                  onChange={(e) => setCalculatorAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <Button onClick={handleCalculate} className="w-full">
              <Calculator />
              Calculate
            </Button>

            {calculationResults && (
              <div className="space-y-4 mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium">
                          Markup
                        </th>
                        <th className="text-right p-4 text-sm font-medium">
                          %
                        </th>
                        <th className="text-right p-4 text-sm font-medium">
                          Amount
                        </th>
                        <th className="text-right p-4 text-sm font-medium">
                          Running Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-4 text-sm">Base Amount</td>
                        <td className="p-4 text-sm text-right">-</td>
                        <td className="p-4 text-sm text-right">
                          {formatCurrency(parseFloat(calculatorAmount))}
                        </td>
                        <td className="p-4 text-sm text-right">
                          {formatCurrency(parseFloat(calculatorAmount))}
                        </td>
                      </tr>
                      {calculationResults.calculations.map((calc, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-4 text-sm">
                            {calc.markup_type}
                            {calc.compound && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                C
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-sm text-right">
                            {calc.percentage}%
                          </td>
                          <td className="p-4 text-sm text-right text-success">
                            +{formatCurrency(calc.markupAmount)}
                          </td>
                          <td className="p-4 text-sm text-right font-medium">
                            {formatCurrency(calc.runningTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted border-t-2">
                      <tr>
                        <td colSpan={2} className="p-4 font-semibold">
                          Total Markup
                        </td>
                        <td className="p-4 text-right font-semibold text-success">
                          +{formatCurrency(calculationResults.totalMarkup)}
                        </td>
                        <td className="p-4 text-right font-bold">
                          {formatCurrency(calculationResults.finalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
