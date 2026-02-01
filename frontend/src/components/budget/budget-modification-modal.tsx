"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface BudgetLineItem {
  id: string;
  costCode: string;
  description: string;
}

interface BudgetModificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
  /** Optional: Pre-select a specific budget line item */
  preselectedLineItem?: BudgetLineItem | null;
}

export function BudgetModificationModal({
  open,
  onOpenChange,
  projectId,
  onSuccess,
  preselectedLineItem,
}: BudgetModificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    budgetItemId: "",
    title: "",
    description: "",
    type: "adjustment",
    amount: "",
    reason: "",
  });
  const [budgetItems, setBudgetItems] = useState<
    Array<{ id: string; label: string; costCode: string }>
  >([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Reset form when modal opens and set preselected item if provided
  useEffect(() => {
    if (open) {
      if (preselectedLineItem) {
        setFormData((prev) => ({
          ...prev,
          budgetItemId: preselectedLineItem.id,
        }));
      }
    }
  }, [open, preselectedLineItem]);

  useEffect(() => {
    const fetchBudgetItems = async () => {
      try {
        setLoadingItems(true);
        const response = await fetch(`/api/projects/${projectId}/budget`);
        if (!response.ok) {
          throw new Error("Failed to load budget items");
        }
        const data = await response.json();
        const options =
          data?.lineItems?.map(
            (item: { id: string; description: string; costCode: string }) => ({
              id: item.id,
              label: item.description || item.costCode,
              costCode: item.costCode,
            }),
          ) ?? [];
        setBudgetItems(options);
        // Only auto-select first item if no preselection and form is empty
        if (options.length && !formData.budgetItemId && !preselectedLineItem) {
          setFormData((prev) => ({ ...prev, budgetItemId: options[0].id }));
        }
      } catch (error) {
        toast.error("Unable to load budget items for modifications");
      } finally {
        setLoadingItems(false);
      }
    };

    if (open) {
      fetchBudgetItems();
    }
  }, [open, projectId, preselectedLineItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.budgetItemId) {
        toast.error("Select a budget line item");
        setLoading(false);
        return;
      }

      const payload = {
        budgetLineId: formData.budgetItemId,
        amount: formData.amount,
        title: formData.title,
        description: formData.description,
        reason: formData.reason,
        modificationType: formData.type,
      };

      const response = await fetch(
        `/api/projects/${projectId}/budget/modifications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.details ||
            error.error ||
            "Failed to create budget modification",
        );
      }

      const result = await response.json();
      toast.success(
        `Budget modification ${result.data?.number || ""} created as draft. Submit for approval when ready.`,
      );
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData({
        budgetItemId: preselectedLineItem?.id || budgetItems[0]?.id || "",
        title: "",
        description: "",
        type: "adjustment",
        amount: "",
        reason: "",
      });
    } catch (error) {
      toast.error(
        `Failed to create budget modification: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[85vw] max-w-[600px] sm:max-w-[600px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Create Budget Modification</SheetTitle>
          <SheetDescription>
            Create a budget change order, transfer, or adjustment for this
            project
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-4 py-4">
              {/* Budget Item */}
              <div className="grid gap-2">
                <Label htmlFor="budgetItem">Budget Line Item*</Label>
                <Select
                  value={formData.budgetItemId}
                  onValueChange={(value) => handleChange("budgetItemId", value)}
                  disabled={loadingItems || !budgetItems.length}
                >
                  <SelectTrigger id="budgetItem">
                    <SelectValue
                      placeholder={
                        loadingItems ? "Loading items..." : "Select a line item"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!budgetItems.length && !loadingItems && (
                  <p className="text-sm text-muted-foreground">
                    No budget items available. Create a line item first.
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="grid gap-2">
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g., Foundation Design Change"
                  required
                />
              </div>

              {/* Type */}
              <div className="grid gap-2">
                <Label htmlFor="type">Modification Type*</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleChange("type", value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="change_order">Change Order</SelectItem>
                    <SelectItem value="budget_transfer">
                      Budget Transfer
                    </SelectItem>
                    <SelectItem value="adjustment">
                      Budget Adjustment
                    </SelectItem>
                    <SelectItem value="revision">Budget Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount*</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Use negative values for decreases
                </p>
              </div>

              {/* Reason */}
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason*</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleChange("reason", e.target.value)}
                  placeholder="Describe the reason for this budget modification..."
                  rows={3}
                  required
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Additional details about this modification..."
                  rows={3}
                />
              </div>

              {/* Workflow Info */}
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-background">
                    Draft
                  </Badge>
                  <span className="text-sm text-muted-foreground">→</span>
                  <Badge
                    variant="outline"
                    className="bg-warning/10 text-warning border-warning/20"
                  >
                    Pending
                  </Badge>
                  <span className="text-sm text-muted-foreground">→</span>
                  <Badge
                    variant="outline"
                    className="bg-success/10 text-success border-success/20"
                  >
                    Approved
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Modifications are created as drafts. Submit for approval, then
                  approve to update budget totals.
                </p>
              </div>
            </div>
          </div>

          <SheetFooter className="flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.budgetItemId}>
              {loading ? "Creating..." : "Create Draft Modification"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
