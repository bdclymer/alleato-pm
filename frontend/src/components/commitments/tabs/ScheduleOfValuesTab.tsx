"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

import { Text } from "@/components/ds/text";
import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableFooter,
  InlineTableFooterCell,
  InlineTableFooterRow,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
} from "@/components/ds/inline-table";
import { SectionRuleHeading } from "@/components/layout";
import { formatCurrency } from "@/config/tables";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useCostCodes } from "@/hooks/use-cost-codes";

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
  showHeader?: boolean;
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
  showHeader = true,
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
  const { options: costCodeOptions, isLoading: costCodesLoading } = useCostCodes({
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
    field: "budget_code" | "description" | "amount",
    value: string | number | undefined,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "amount") {
          return { ...item, amount: value === undefined ? null : Number(value), isDirty: true };
        }
        return { ...item, [field]: typeof value === "string" ? value : "", isDirty: true };
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
        {showHeader ? <SectionHeader title="Schedule of Values" /> : null}
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {showHeader ? <SectionHeader title="Schedule of Values" /> : null}
        <Text tone="destructive">{error}</Text>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="space-y-4">
        {showHeader ? <SectionHeader title="Schedule of Values" /> : null}
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
    <div className="space-y-3">
      {showHeader ? <SectionRuleHeading label="Schedule of Values" className="[&_span]:text-primary" /> : null}

      <InlineTable variant="edit">
        <InlineTableHeader>
          <InlineTableHeaderRow>
            <InlineTableHeaderCell className="w-10">#</InlineTableHeaderCell>
            <InlineTableHeaderCell>Budget Code</InlineTableHeaderCell>
            <InlineTableHeaderCell>Description</InlineTableHeaderCell>
            <InlineTableHeaderCell align="right">Amount</InlineTableHeaderCell>
            <InlineTableHeaderCell align="right">Billed to Date</InlineTableHeaderCell>
            <InlineTableHeaderCell align="right">Remaining</InlineTableHeaderCell>
            <InlineTableHeaderCell className="w-px" />
          </InlineTableHeaderRow>
        </InlineTableHeader>
        <InlineTableBody>
          {items.map((item, index) => {
            const amount = Number(item.amount ?? 0);
            const billed = Number(item.billed_to_date ?? 0);
            const remaining = Math.max(amount - billed, 0);

            return (
              <InlineTableRow key={item.id}>
                <InlineTableCell className="text-muted-foreground text-xs">
                  {index + 1}
                </InlineTableCell>
                <InlineTableCell className="whitespace-nowrap min-w-[200px]">
                  <Select
                    value={item.budget_code || "none"}
                    onValueChange={(value) => updateItem(item.id, "budget_code", value === "none" ? "" : value)}
                    disabled={costCodesLoading}
                  >
                    <SelectTrigger className="w-full" aria-label={`Budget code ${index + 1}`}>
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
                </InlineTableCell>
                <InlineTableCell className="min-w-[200px]">
                  <Input
                    aria-label={`Description ${index + 1}`}
                    value={item.description ?? ""}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  />
                </InlineTableCell>
                <InlineTableCell align="right">
                  <MoneyField
                    label={`Amount ${index + 1}`}
                    inline
                    showCurrency={false}
                    value={item.amount ?? undefined}
                    onChange={(value) => updateItem(item.id, "amount", value)}
                  />
                </InlineTableCell>
                <InlineTableCell align="right" numeric className="text-muted-foreground">
                  {formatCurrency(billed)}
                </InlineTableCell>
                <InlineTableCell align="right" numeric>
                  {formatCurrency(remaining)}
                </InlineTableCell>
                <InlineTableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Move line ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => moveItem(item.id, "up")}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Move line ${index + 1} down`}
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(item.id, "down")}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete line ${index + 1}`}
                      onClick={() => handleDelete(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </InlineTableCell>
              </InlineTableRow>
            );
          })}
        </InlineTableBody>
        <InlineTableFooter>
          <InlineTableFooterRow type="totals">
            <InlineTableFooterCell align="right" colSpan={3}>Totals</InlineTableFooterCell>
            <InlineTableFooterCell align="right" numeric>{formatCurrency(totals.amount)}</InlineTableFooterCell>
            <InlineTableFooterCell align="right" numeric>{formatCurrency(totals.billed)}</InlineTableFooterCell>
            <InlineTableFooterCell align="right" numeric>{formatCurrency(amountRemaining)}</InlineTableFooterCell>
            <InlineTableFooterCell />
          </InlineTableFooterRow>
        </InlineTableFooter>
      </InlineTable>

      {/* Actions below table, left-aligned */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={isSaving}
        >
          <Plus />
          Add Line Item
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleImport}
          disabled={isImporting || isSaving}
        >
          {isImporting ? "Importing..." : "Import from Budget"}
        </Button>
        {hasUnsavedChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>
    </div>
  );
}
