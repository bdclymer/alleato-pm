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
  BaseSidebar,
  SidebarBody,
  SidebarFooter,
} from "@/components/budget/modals/BaseSidebar";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";

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
    type: "addition",
    amount: "",
    reason: "",
  });
  const [budgetItems, setBudgetItems] = useState<
    Array<{ id: string; label: string; costCode: string }>
  >([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [changeEvents, setChangeEvents] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [changeEventId, setChangeEventId] = useState<string | null>(null);

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
        const data = await apiFetch<{ lineItems?: Array<{ id: string; description: string; costCode: string }> }>(`/api/projects/${projectId}/budget`);
        const options =
          data?.lineItems?.map(
            (item) => ({
              id: item.id,
              label: item.description || item.costCode,
              costCode: item.costCode,
            }),
          ) ?? [];
        setBudgetItems(options);
        if (options.length && !formData.budgetItemId && !preselectedLineItem) {
          setFormData((prev) => ({ ...prev, budgetItemId: options[0].id }));
        }
      } catch {
        toast.error("Unable to load budget items for modifications");
      } finally {
        setLoadingItems(false);
      }
    };

    if (open) fetchBudgetItems();
  }, [open, projectId, preselectedLineItem]);

  useEffect(() => {
    if (!open) return;
    apiFetch<{ changeEvents?: Array<{ id: string; number: string; title: string }> }>(
      `/api/projects/${projectId}/change-events`,
    )
      .then((data) => {
        setChangeEvents(
          (data.changeEvents ?? []).map((ce) => ({
            id: ce.id,
            label: `#${ce.number} — ${ce.title}`,
          })),
        );
      })
      .catch(() => {});
  }, [open, projectId]);

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
        changeEventId: changeEventId ?? undefined,
      };

      const result = await apiFetch<{ data?: { number?: string } }>(
        `/api/projects/${projectId}/budget/modifications`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      toast.success(
        `Budget modification ${(result as { data?: { number?: string } }).data?.number || ""} created as draft. Submit for approval when ready.`,
      );
      onOpenChange(false);
      onSuccess?.();

      setFormData({
        budgetItemId: preselectedLineItem?.id || budgetItems[0]?.id || "",
        title: "",
        description: "",
        type: "addition",
        amount: "",
        reason: "",
      });
      setChangeEventId(null);
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
    <BaseSidebar
      open={open}
      onClose={() => onOpenChange(false)}
      title="Create Budget Modification"
      subtitle="Budget change order, transfer, or adjustment"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <SidebarBody className="px-4 sm:px-8">
          <div className="grid gap-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor="budgetItem">Budget Line Item</Label>
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
                <p className="text-xs text-muted-foreground">
                  No budget items available. Create a line item first.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g., Foundation Design Change"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Modification Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange("type", value)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="addition">Addition</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {changeEvents.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="changeEvent">Link to Change Event <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select
                  value={changeEventId ?? "none"}
                  onValueChange={(v) => setChangeEventId(v === "none" ? null : v)}
                >
                  <SelectTrigger id="changeEvent">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {changeEvents.map((ce) => (
                      <SelectItem key={ce.id} value={ce.id}>
                        {ce.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                placeholder=""
                required
              />
              <p className="text-xs text-muted-foreground">
                Use negative values for decreases
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleChange("reason", e.target.value)}
                placeholder="Describe the reason for this budget modification..."
                rows={3}
                required
              />
            </div>

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

            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-background text-xs">
                  Draft
                </Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning border-warning/20 text-xs"
                >
                  Pending
                </Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/20 text-xs"
                >
                  Approved
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Modifications are created as drafts. Submit for approval to update budget totals.
              </p>
            </div>
          </div>
        </SidebarBody>

        <SidebarFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.budgetItemId}>
            {loading ? "Creating..." : "Create Draft"}
          </Button>
        </SidebarFooter>
      </form>
    </BaseSidebar>
  );
}
