"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/ds";
import { formatCurrency } from "@/config/tables";
import { useCostCodes } from "@/hooks/use-cost-codes";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";

interface SsovLineItem {
  id: string;
  line_number: number | null;
  budget_code: string | null;
  description: string | null;
  amount: number | null;
  billed_to_date: number | null;
  isDirty?: boolean;
}

type SsovStatus = "draft" | "under_review" | "approved" | "revise_resubmit";

interface InvoiceContact {
  id: string;
  name: string;
  email: string;
}

interface SsovPermissions {
  canEdit: boolean;
  canReview: boolean;
  canSendNotification: boolean;
}

interface SubcontractorSovTabProps {
  projectId: number;
  commitmentId: string;
  onSubmitted?: () => void | Promise<void>;
  onCountChange?: (count: number) => void;
}

interface SsovPayload {
  data: {
    status: SsovStatus;
    targetAmount: number;
    lineItems: SsovLineItem[];
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    inviteSentAt: string | null;
    invoiceContacts: InvoiceContact[];
    permissions: SsovPermissions;
  };
}

const statusLabel: Record<SsovStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  revise_resubmit: "Revise & Resubmit",
};

export function SubcontractorSovTab({
  projectId,
  commitmentId,
  onSubmitted,
  onCountChange,
}: SubcontractorSovTabProps) {
  const [items, setItems] = useState<SsovLineItem[]>([]);
  const [status, setStatus] = useState<SsovStatus>("draft");
  const [targetAmount, setTargetAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [inviteSentAt, setInviteSentAt] = useState<string | null>(null);
  const [invoiceContacts, setInvoiceContacts] = useState<InvoiceContact[]>([]);
  const [permissions, setPermissions] = useState<SsovPermissions>({
    canEdit: false,
    canReview: false,
    canSendNotification: false,
  });

  const { options: costCodeOptions, isLoading: costCodesLoading } = useCostCodes({
    enabled: true,
    useFallback: true,
    limit: 1000,
  });

  const fetchSsov = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/commitments/${commitmentId}/subcontractor-sov`,
      );
      const payload = (await response.json()) as SsovPayload;

      if (!response.ok) {
        throw new Error("Failed to load Subcontractor SOV.");
      }

      setItems(payload.data.lineItems || []);
      setStatus(payload.data.status || "draft");
      setTargetAmount(payload.data.targetAmount || 0);
      setInviteSentAt(payload.data.inviteSentAt || null);
      setInvoiceContacts(payload.data.invoiceContacts || []);
      setPermissions(
        payload.data.permissions || {
          canEdit: false,
          canReview: false,
          canSendNotification: false,
        },
      );
      setHasUnsavedChanges(false);
      onCountChange?.((payload.data.lineItems || []).length);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Subcontractor SOV.");
    } finally {
      setIsLoading(false);
    }
  }, [commitmentId, onCountChange, projectId]);

  useEffect(() => {
    void fetchSsov();
  }, [fetchSsov]);

  const allocatedTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [items],
  );

  const remainingToAllocate = Math.max(targetAmount - allocatedTotal, 0);
  const canSubmit =
    permissions.canEdit &&
    items.length > 0 &&
    remainingToAllocate === 0 &&
    (status === "draft" || status === "revise_resubmit");
  const isLocked = status === "under_review" || status === "approved" || !permissions.canEdit;

  const updateItem = (id: string, field: keyof SsovLineItem, value: string | number) => {
    if (isLocked) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "amount" || field === "billed_to_date") {
          return {
            ...item,
            [field]: value === "" ? null : Number(value),
            isDirty: true,
          };
        }

        if (field === "line_number") {
          return {
            ...item,
            line_number: value === "" ? null : Number(value),
            isDirty: true,
          };
        }

        return { ...item, [field]: String(value), isDirty: true };
      }),
    );
    setHasUnsavedChanges(true);
  };

  const addLine = () => {
    if (isLocked) return;
    const nextLineNumber = (items[items.length - 1]?.line_number || items.length) + 1;
    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        line_number: nextLineNumber,
        budget_code: "",
        description: "",
        amount: 0,
        billed_to_date: 0,
        isDirty: true,
      },
    ]);
    setHasUnsavedChanges(true);
  };

  const deleteLine = (id: string) => {
    if (isLocked) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    setHasUnsavedChanges(true);
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    if (isLocked) return;
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      setHasUnsavedChanges(true);

      return next.map((item, idx) => ({
        ...item,
        line_number: idx + 1,
        isDirty: true,
      }));
    });
  };

  const saveLineItems = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/commitments/${commitmentId}/subcontractor-sov`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineItems: items.map((item, index) => ({
              id: item.id.startsWith("temp-") ? undefined : item.id,
              line_number: item.line_number ?? index + 1,
              budget_code: item.budget_code || null,
              description: item.description || null,
              amount: item.amount ?? 0,
              billed_to_date: item.billed_to_date ?? 0,
            })),
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to save subcontractor SOV.");
      }

      toast.success("Subcontractor SOV saved.");
      await fetchSsov();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save subcontractor SOV.");
    } finally {
      setIsSaving(false);
    }
  }, [commitmentId, fetchSsov, items, projectId]);

  const runAction = useCallback(
    async (
      action:
        | "submit"
        | "approve"
        | "reject"
        | "import_from_sov"
        | "send_notification",
    ) => {
      if (action === "submit" && !canSubmit) {
        toast.error("Remaining to Allocate must equal $0 before submitting.");
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/commitments/${commitmentId}/subcontractor-sov`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );

        const payload = (await response.json()) as { message?: string; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Subcontractor SOV action failed.");
        }

        toast.success(payload.message || "Subcontractor SOV updated.");
        await fetchSsov();
        if (action === "submit") {
          await onSubmitted?.();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Subcontractor SOV action failed.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, commitmentId, fetchSsov, onSubmitted, projectId],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Subcontractor Schedule of Values" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Subcontractor Schedule of Values" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">{statusLabel[status]}</Badge>
          </div>
          {inviteSentAt && (
            <div className="text-xs text-muted-foreground">
              Invitation sent {new Date(inviteSentAt).toLocaleString()}
            </div>
          )}
          {invoiceContacts.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Invoice contacts: {invoiceContacts.map((contact) => contact.email).join(", ")}
            </div>
          )}
          {invoiceContacts.length === 0 && (
            <div className="text-xs text-status-warning">
              No invoice contact is set for this commitment. Add one in Advanced Settings before sending an SSOV invitation.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Contract Amount: </span>
              <span className="font-medium">{formatCurrency(targetAmount)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Allocated: </span>
              <span className="font-medium">{formatCurrency(allocatedTotal)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining to Allocate: </span>
              <span className={remainingToAllocate === 0 ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                {formatCurrency(remainingToAllocate)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(status === "under_review" || status === "approved") && permissions.canReview && (
            <>
              {status === "under_review" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => void runAction("reject")}
                    disabled={isSubmitting}
                  >
                    Send Back
                  </Button>
                  <Button onClick={() => void runAction("approve")} disabled={isSubmitting}>
                    Approve
                  </Button>
                </>
              )}
            </>
          )}
          {permissions.canSendNotification && (
            <Button
              variant="outline"
              onClick={() => void runAction("send_notification")}
              disabled={isSubmitting}
            >
              Send SSOV Notification
            </Button>
          )}
          {(status === "draft" || status === "revise_resubmit") && (
            <Button
              onClick={() => void runAction("submit")}
              disabled={isSubmitting || !canSubmit || hasUnsavedChanges}
            >
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {hasUnsavedChanges && (
          <Button
            size="sm"
            onClick={() => void saveLineItems()}
            disabled={isSaving || isSubmitting || isLocked}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Budget Code</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Billed To Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                  No subcontractor SOV line items yet.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                return (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={item.line_number ?? ""}
                        onChange={(e) => updateItem(item.id, "line_number", e.target.value)}
                        disabled={isLocked}
                      />
                    </td>
                    <td className="px-4 py-2 min-w-56">
                      <Select
                        value={item.budget_code || "none"}
                        onValueChange={(value) =>
                          updateItem(item.id, "budget_code", value === "none" ? "" : value)
                        }
                        disabled={costCodesLoading || isLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={costCodesLoading ? "Loading..." : "Select budget code"}>
                            {item.budget_code
                              ? (costCodeOptions.find((opt) => opt.value === item.budget_code)?.label || item.budget_code)
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
                    <td className="px-4 py-2 min-w-56">
                      <Input
                        value={item.description || ""}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        disabled={isLocked}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <MoneyField
                        label={`Billed ${index + 1}`}
                        inline
                        showCurrency={false}
                        value={item.billed_to_date ?? undefined}
                        onChange={(value) => updateItem(item.id, "billed_to_date", value ?? 0)}
                        disabled={isLocked}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <MoneyField
                        label={`Amount ${index + 1}`}
                        inline
                        showCurrency={false}
                        value={item.amount ?? undefined}
                        onChange={(value) => updateItem(item.id, "amount", value ?? 0)}
                        disabled={isLocked}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveItem(item.id, "up")}
                          disabled={index === 0 || isLocked}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveItem(item.id, "down")}
                          disabled={index === items.length - 1 || isLocked}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteLine(item.id)}
                          disabled={isLocked}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            <tr className="border-t">
              <td className="px-4 py-3" colSpan={7}>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={addLine}
                  disabled={isLocked}
                  className="h-auto p-0"
                >
                  + Add Line
                </Button>
              </td>
            </tr>
          </tbody>
          <tfoot className="bg-muted/60">
            <tr>
              <td className="px-4 py-3" colSpan={5} />
              <td className="px-4 py-3 text-right font-semibold">Remaining To Allocate:</td>
              <td className="px-4 py-3 text-right font-semibold">{formatCurrency(remainingToAllocate)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3" colSpan={5} />
              <td className="px-4 py-3 text-right">Grand Total:</td>
              <td className="px-4 py-3 text-right">{formatCurrency(allocatedTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
