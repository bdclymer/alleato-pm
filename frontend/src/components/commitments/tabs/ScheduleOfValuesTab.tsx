"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/ds";
import { Text } from "@/components/ui/text";
import { formatCurrency } from "@/config/tables";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCostCodes } from "@/hooks/use-cost-codes";
import { Badge } from "@/components/ui/badge";

interface LineItem {
  id: string;
  line_number?: number | null;
  budget_code?: string | null;
  description?: string | null;
  amount?: number | null;
  billed_to_date?: number | null;
  isNew?: boolean;
  isDirty?: boolean;
}

interface ScheduleOfValuesTabProps {
  lineItems: LineItem[];
  projectId: number;
  commitmentId: string;
  commitmentType?: "subcontract" | "purchase_order" | string;
  onImportComplete?: () => void | Promise<void>;
  onLineItemsChange?: (items: LineItem[]) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ScheduleOfValuesTab({
  lineItems,
  projectId,
  commitmentId,
  commitmentType,
  onImportComplete,
  onLineItemsChange,
  isLoading = false,
  error = null,
}: ScheduleOfValuesTabProps) {
  const [items, setItems] = useState<LineItem[]>(lineItems);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch cost codes for budget code selection — need high limit to cover all divisions
  const { costCodes, options: costCodeOptions, isLoading: costCodesLoading } = useCostCodes({
    enabled: true,
    useFallback: true,
    limit: 1000,
  });

  useEffect(() => {
    setItems(lineItems);
    setHasUnsavedChanges(false);
  }, [lineItems]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const amount = Number(item.amount ?? 0);
          const billed = Number(item.billed_to_date ?? 0);

          return {
            amount: acc.amount + amount,
            billed: acc.billed + billed,
          };
        },
        { amount: 0, billed: 0 },
      ),
    [items],
  );

  const amountRemaining = Math.max(totals.amount - totals.billed, 0);

  const handleAdd = () => {
    const nextLineNumber = (items[items.length - 1]?.line_number || items.length) + 1;
    setItems([
      ...items,
      {
        id: `temp-${Date.now()}`,
        line_number: nextLineNumber,
        description: "",
        budget_code: "",
        amount: 0,
        billed_to_date: 0,
        isNew: true,
        isDirty: true,
      },
    ]);
    setHasUnsavedChanges(true);
  };

  const updateItem = (
    id: string,
    field: keyof LineItem,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === "amount" || field === "billed_to_date") {
          return { ...item, [field]: value === "" ? null : Number(value), isDirty: true };
        }

        if (field === "line_number") {
          return { ...item, line_number: value === "" ? null : Number(value), isDirty: true };
        }

        return { ...item, [field]: value, isDirty: true };
      }),
    );
    setHasUnsavedChanges(true);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setHasUnsavedChanges(true);
  };

  // Save all changes to the API
  const handleSave = useCallback(async () => {
    if (!projectId || !commitmentId) {
      toast.error("Missing project or commitment details.");
      return;
    }

    setIsSaving(true);
    try {
      // Determine the table based on commitment type
      const isSubcontract = commitmentType === "subcontract";
      const tableName = isSubcontract ? "subcontract_sov_items" : "purchase_order_sov_items";
      const fkColumn = isSubcontract ? "subcontract_id" : "purchase_order_id";

      const response = await fetch(
        `/api/projects/${projectId}/commitments/${commitmentId}/line-items`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineItems: items.map((item) => ({
              id: item.id.startsWith("temp-") ? undefined : item.id,
              line_number: item.line_number,
              budget_code: item.budget_code,
              description: item.description,
              amount: item.amount,
              billed_to_date: item.billed_to_date,
            })),
            commitmentType,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        const message = payload?.error || "Unable to save line items.";
        toast.error(message);
        return;
      }

      toast.success(payload?.message || "Line items saved successfully.");
      setHasUnsavedChanges(false);

      // Notify parent to refresh data
      if (onImportComplete) {
        await onImportComplete();
      }
      if (onLineItemsChange) {
        onLineItemsChange(items);
      }
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save line items.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [commitmentId, commitmentType, items, onImportComplete, onLineItemsChange, projectId]);

  // Get the description for a budget code
  const getBudgetCodeDescription = useCallback((code: string | null | undefined) => {
    if (!code) return null;
    const costCode = costCodes.find((c) => c.id === code);
    return costCode?.title || costCode?.description || null;
  }, [costCodes]);

  const handleImport = useCallback(async () => {
    if (!projectId || !commitmentId) {
      toast.error("Missing project or commitment details.");
      return;
    }

    const confirmed = confirm(
      "Import all budget line items into this commitment's schedule of values?",
    );
    if (!confirmed) return;

    setIsImporting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/commitments/${commitmentId}/line-items/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "budget" }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        const message =
          payload?.error || "Unable to import schedule of values from budget.";
        toast.error(message);
        return;
      }

      toast.success(
        payload?.message || "Budget line items imported successfully.",
      );
      if (onImportComplete) {
        await onImportComplete();
      }
    } catch (importError) {
      toast.error(
        importError instanceof Error
          ? importError.message
          : "Unable to import schedule of values from budget.",
      );
    } finally {
      setIsImporting(false);
    }
  }, [commitmentId, onImportComplete, projectId]);

  const moveItem = (id: string, direction: "up" | "down") => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const newItems = [...prev];
      const [removed] = newItems.splice(index, 1);
      newItems.splice(targetIndex, 0, removed);

      return newItems.map((item, idx) => ({
        ...item,
        line_number: idx + 1,
      }));
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Schedule of Values" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Schedule of Values" />
        <Text tone="destructive">{error}</Text>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Schedule of Values" />
        <div className="text-center py-8">
          <Text tone="muted" size="sm">
            No SOV line items for this commitment
          </Text>
          <div className="mt-4">
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={handleAdd}>
                <Plus />
                Add Line Item
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting ? "Importing..." : "Import from Budget"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Schedule of Values" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Text size="sm" tone="muted">
              Manage line items for this commitment
            </Text>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleImport}
              disabled={isImporting || isSaving}
            >
              {isImporting ? "Importing..." : "Import from Budget"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleAdd} disabled={isSaving}>
              <Plus />
              Add Line Item
            </Button>
            {hasUnsavedChanges && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-4 text-left font-medium">#</th>
                <th className="px-4 py-4 text-left font-medium">Description</th>
                <th className="px-4 py-4 text-left font-medium">Budget Code</th>
                <th className="px-4 py-4 text-right font-medium">Amount</th>
                <th className="px-4 py-4 text-right font-medium">Billed to Date</th>
                <th className="px-4 py-4 text-right font-medium">Remaining</th>
                <th className="px-4 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const amount = Number(item.amount ?? 0);
                const billed = Number(item.billed_to_date ?? 0);
                const remaining = Math.max(amount - billed, 0);

                return (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Input
                        aria-label={`Line number ${index + 1}`}
                        type="number"
                        className="w-20"
                        value={item.line_number ?? ""}
                        onChange={(e) => updateItem(item.id, "line_number", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 min-w-[200px]">
                      <Input
                        aria-label={`Description ${index + 1}`}
                        value={item.description ?? ""}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap min-w-[200px]">
                      <Select
                        value={item.budget_code || "none"}
                        onValueChange={(value) => updateItem(item.id, "budget_code", value === "none" ? "" : value)}
                        disabled={costCodesLoading}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label={`Budget code ${index + 1}`}
                        >
                          <SelectValue placeholder={costCodesLoading ? "Loading..." : "Select budget code"}>
                            {item.budget_code
                              ? (() => {
                                  const match = costCodeOptions.find((o) => o.value === item.budget_code);
                                  return match ? match.label : item.budget_code;
                                })()
                              : "No budget code"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No budget code</SelectItem>
                          {costCodeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Input
                        aria-label={`Amount ${index + 1}`}
                        type="number"
                        className="text-right"
                        value={item.amount ?? ""}
                        onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Input
                        aria-label={`Billed to date ${index + 1}`}
                        type="number"
                        className="text-right"
                        value={item.billed_to_date ?? ""}
                        onChange={(e) => updateItem(item.id, "billed_to_date", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">{formatCurrency(remaining)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Move line ${index + 1} up`}
                          disabled={index === 0}
                          onClick={() => moveItem(item.id, "up")}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Move line ${index + 1} down`}
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(item.id, "down")}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete line ${index + 1}`}
                          onClick={() => handleDelete(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/60">
              <tr className="font-semibold">
                <td className="px-4 py-4" colSpan={3}>
                  Totals
                </td>
                <td className="px-4 py-4 text-right">{formatCurrency(totals.amount)}</td>
                <td className="px-4 py-4 text-right">{formatCurrency(totals.billed)}</td>
                <td className="px-4 py-4 text-right">{formatCurrency(amountRemaining)}</td>
                <td className="px-4 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

    </div>
  );
}

// Budget Impact Summary Component
interface BudgetImpactSummaryProps {
  items: LineItem[];
  costCodes: Array<{
    id: string;
    title: string | null;
    description: string | null;
    division_id: string;
    division_title: string | null;
  }>;
}

function BudgetImpactSummary({ items, costCodes }: BudgetImpactSummaryProps) {
  // Group items by budget code and calculate totals
  const budgetCodeSummary = useMemo(() => {
    const summary: Record<string, {
      code: string;
      description: string;
      totalAmount: number;
      totalBilled: number;
      lineCount: number;
    }> = {};

    items.forEach((item) => {
      const code = item.budget_code || "unassigned";
      if (!summary[code]) {
        const costCode = costCodes.find((c) => c.id === code);
        const title = costCode?.title || costCode?.description;
        summary[code] = {
          code,
          description: code === "unassigned" ? "No Budget Code" : (title ? `${code} — ${title}` : code),
          totalAmount: 0,
          totalBilled: 0,
          lineCount: 0,
        };
      }
      summary[code].totalAmount += Number(item.amount ?? 0);
      summary[code].totalBilled += Number(item.billed_to_date ?? 0);
      summary[code].lineCount += 1;
    });

    return Object.values(summary).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [items, costCodes]);

  if (budgetCodeSummary.length === 0) {
    return null;
  }

  const hasUnassigned = budgetCodeSummary.some((s) => s.code === "unassigned");

  return (
    <div className="rounded-lg border p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <Text size="sm" weight="medium">Budget Impact Summary</Text>
        {hasUnassigned && (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Some items need budget codes
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgetCodeSummary.map((summary) => (
          <div
            key={summary.code}
            className={`rounded-md border p-4 bg-background ${
              summary.code === "unassigned" ? "border-amber-300" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Text size="xs" tone="muted" className="truncate max-w-[150px]">
                {summary.code === "unassigned" ? "Unassigned" : summary.code}
              </Text>
              <Badge variant="secondary" className="text-xs">
                {summary.lineCount} {summary.lineCount === 1 ? "item" : "items"}
              </Badge>
            </div>
            <Text size="sm" weight="medium" className="truncate">
              {summary.description}
            </Text>
            <div className="flex items-center justify-between mt-2">
              <Text size="xs" tone="muted">Committed:</Text>
              <Text size="sm" weight="medium">{formatCurrency(summary.totalAmount)}</Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
