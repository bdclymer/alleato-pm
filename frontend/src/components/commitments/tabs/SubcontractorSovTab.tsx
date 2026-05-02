"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SectionRuleHeading } from "@/components/layout";
import { MoneyField } from "@/components/forms/MoneyField";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TableHead, TableHeader } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SovSourceLine {
  id: string;
  line_number: number | null;
  budget_code: string | null;
  description: string | null;
  amount: number | null;
  billed_to_date: number | null;
}

interface SsovLineItem {
  id: string;
  source_sov_item_id: string | null;
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
    sourceSov: SovSourceLine[];
    lineItems: SsovLineItem[];
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewNotes: string | null;
    inviteSentAt: string | null;
    invoiceContacts: InvoiceContact[];
    permissions: SsovPermissions;
  };
}

interface SsovActionResponse {
  message?: string;
}

const STATUS_LABEL: Record<SsovStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  revise_resubmit: "Revise & Resubmit",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SubcontractorSovTab({
  projectId,
  commitmentId,
  onSubmitted,
  onCountChange,
}: SubcontractorSovTabProps) {
  const [sourceSov, setSourceSov] = useState<SovSourceLine[]>([]);
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

  const fetchSsov = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await apiFetch<SsovPayload>(
        `/api/projects/${projectId}/commitments/${commitmentId}/subcontractor-sov`,
      );

      setSourceSov(payload.data.sourceSov || []);
      setItems(payload.data.lineItems || []);
      setStatus(payload.data.status || "draft");
      setTargetAmount(payload.data.targetAmount || 0);
      setInviteSentAt(payload.data.inviteSentAt || null);
      setInvoiceContacts(payload.data.invoiceContacts || []);
      setPermissions(
        payload.data.permissions || { canEdit: false, canReview: false, canSendNotification: false },
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

  // Group children under parents
  const groups = useMemo(() => {
    return sourceSov.map((parent) => {
      const children = items.filter((i) => i.source_sov_item_id === parent.id);
      const allocated = children.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
      const remaining = Math.max(Number(parent.amount ?? 0) - allocated, 0);
      return { parent, children, allocated, remaining };
    });
  }, [sourceSov, items]);

  const orphans = useMemo(
    () => items.filter((i) => !i.source_sov_item_id || !sourceSov.some((s) => s.id === i.source_sov_item_id)),
    [items, sourceSov],
  );

  const allocatedTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [items],
  );
  const billedToDateTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.billed_to_date ?? 0), 0),
    [items],
  );
  const totalRemaining = Math.max(targetAmount - allocatedTotal, 0);

  const isLocked = status === "under_review" || status === "approved" || !permissions.canEdit;
  const canSubmit =
    permissions.canEdit &&
    items.length > 0 &&
    totalRemaining === 0 &&
    (status === "draft" || status === "revise_resubmit");

  // ─── Edits ─────────────────────────────────────────────────────────────

  const updateItem = (id: string, field: "description" | "amount", value: string | number) => {
    if (isLocked) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "amount") {
          return { ...item, amount: value === "" ? null : Number(value), isDirty: true };
        }
        return { ...item, description: String(value), isDirty: true };
      }),
    );
    setHasUnsavedChanges(true);
  };

  const addChildLine = (parent: SovSourceLine) => {
    if (isLocked) return;
    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        source_sov_item_id: parent.id,
        line_number: prev.length + 1,
        budget_code: parent.budget_code,
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

  // ─── Save ──────────────────────────────────────────────────────────────

  const saveLineItems = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiFetch(
        `/api/projects/${projectId}/commitments/${commitmentId}/subcontractor-sov`,
        {
          method: "PUT",
          body: JSON.stringify({
            lineItems: items.map((item, index) => ({
              id: item.id.startsWith("temp-") ? undefined : item.id,
              source_sov_item_id: item.source_sov_item_id,
              line_number: item.line_number ?? index + 1,
              budget_code: item.budget_code || null,
              description: item.description || null,
              amount: item.amount ?? 0,
              billed_to_date: item.billed_to_date ?? 0,
            })),
          }),
        },
      );
      toast.success("Subcontractor SOV saved.");
      await fetchSsov();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save subcontractor SOV.");
    } finally {
      setIsSaving(false);
    }
  }, [commitmentId, fetchSsov, items, projectId]);

  // ─── Actions ───────────────────────────────────────────────────────────

  const runAction = useCallback(
    async (action: "submit" | "approve" | "reject" | "import_from_sov" | "send_notification") => {
      if (action === "submit" && !canSubmit) {
        toast.error("Remaining to Allocate must equal $0 before submitting.");
        return;
      }
      setIsSubmitting(true);
      try {
        const payload = await apiFetch<SsovActionResponse>(
          `/api/projects/${projectId}/commitments/${commitmentId}/subcontractor-sov`,
          {
            method: "POST",
            body: JSON.stringify({ action }),
          },
        );
        toast.success(payload.message || "Subcontractor SOV updated.");
        await fetchSsov();
        if (action === "submit") await onSubmitted?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [canSubmit, commitmentId, fetchSsov, onSubmitted, projectId],
  );

  // ─── Loading ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SectionRuleHeading label="Subcontractor Schedule of Values" className="[&_span]:text-primary" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const colSpanFull = isLocked ? 5 : 6;

  return (
    <div className="space-y-4">
      <SectionRuleHeading label="Subcontractor Schedule of Values" className="[&_span]:text-primary" />

      {/* Status + meta */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">{STATUS_LABEL[status]}</Badge>
          </div>
          {inviteSentAt && (
            <p className="text-xs text-muted-foreground">
              Invitation sent {new Date(inviteSentAt).toLocaleString()}
            </p>
          )}
          {invoiceContacts.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Invoice contacts: {invoiceContacts.map((c) => c.email).join(", ")}
            </p>
          ) : (
            <p className="text-xs text-status-warning">
              No invoice contact set. Add one in Advanced Settings before sending an SSOV invitation.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === "under_review" && permissions.canReview && (
            <>
              <Button variant="outline" onClick={() => void runAction("reject")} disabled={isSubmitting}>
                Send Back
              </Button>
              <Button onClick={() => void runAction("approve")} disabled={isSubmitting}>
                Approve
              </Button>
            </>
          )}
          {permissions.canSendNotification && (
            <Button variant="outline" onClick={() => void runAction("send_notification")} disabled={isSubmitting}>
              Send SSOV Notification
            </Button>
          )}
          {(status === "draft" || status === "revise_resubmit") && (
            <Button onClick={() => void runAction("submit")} disabled={isSubmitting || !canSubmit || hasUnsavedChanges}>
              {isSubmitting ? "Submitting..." : "Submit for Review"}
            </Button>
          )}
        </div>
      </div>

      {/* Grouped SOV → SSOV table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <TableHeader>
            <tr>
              <TableHead className="w-16 px-4 py-2.5">#</TableHead>
              <TableHead className="px-4 py-2.5">Budget Code</TableHead>
              <TableHead className="px-4 py-2.5">Description</TableHead>
              <TableHead className="px-4 py-2.5 text-right">Billed To Date</TableHead>
              <TableHead className="px-4 py-2.5 text-right">Amount</TableHead>
              {!isLocked && <TableHead className="px-4 py-2.5 w-px" />}
            </tr>
          </TableHeader>
          <tbody>
            {groups.length === 0 && orphans.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={colSpanFull}>
                  No SOV line items on this commitment. Add SOV lines first.
                </td>
              </tr>
            )}

            {groups.map(({ parent, children, allocated, remaining }) => (
              <React.Fragment key={parent.id}>
                {/* Parent SOV row */}
                <tr className="border-t bg-muted/40">
                  <td className="px-4 py-2.5 font-semibold tabular-nums">{parent.line_number ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium">{parent.budget_code || "—"}</td>
                  <td className="px-4 py-2.5 font-medium">{parent.description || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(parent.billed_to_date ?? 0)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {formatCurrency(parent.amount ?? 0)}
                  </td>
                  {!isLocked && <td className="px-4 py-2.5" />}
                </tr>

                {/* SSOV child rows */}
                {children.map((child) => (
                  <tr key={child.id} className="border-t">
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 pl-8 text-xs text-muted-foreground">↳</td>
                    <td className="px-4 py-2 min-w-56">
                      <Input
                        value={child.description || ""}
                        onChange={(e) => updateItem(child.id, "description", e.target.value)}
                        placeholder="Line item description"
                        disabled={isLocked}
                      />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(child.billed_to_date ?? 0)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <MoneyField
                        label="Amount"
                        inline
                        showCurrency={false}
                        value={child.amount ?? undefined}
                        onChange={(value) => updateItem(child.id, "amount", value ?? 0)}
                        disabled={isLocked}
                      />
                    </td>
                    {!isLocked && (
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteLine(child.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}

                {/* Per-parent footer: Add line + Remaining to Allocate */}
                <tr className="border-t">
                  <td className="px-4 py-2" colSpan={3}>
                    {!isLocked && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => addChildLine(parent)}
                        className="h-auto p-0"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add line item
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">Remaining to Allocate</td>
                  <td
                    className={cn(
                      "px-4 py-2 text-right font-semibold tabular-nums",
                      remaining === 0 ? "text-status-success" : "text-status-warning",
                    )}
                  >
                    {formatCurrency(remaining)}
                  </td>
                  {!isLocked && <td className="px-4 py-2" />}
                </tr>
              </React.Fragment>
            ))}

            {/* Orphans (SSOV rows with no matching parent — shouldn't happen post-backfill, but render defensively) */}
            {orphans.length > 0 && (
              <>
                <tr className="border-t bg-status-warning/10">
                  <td className="px-4 py-2 text-xs font-semibold text-status-warning" colSpan={colSpanFull}>
                    Unlinked line items (no matching SOV parent)
                  </td>
                </tr>
                {orphans.map((child) => (
                  <tr key={child.id} className="border-t">
                    <td className="px-4 py-2 tabular-nums">{child.line_number ?? "—"}</td>
                    <td className="px-4 py-2">{child.budget_code || "—"}</td>
                    <td className="px-4 py-2 min-w-56">
                      <Input
                        value={child.description || ""}
                        onChange={(e) => updateItem(child.id, "description", e.target.value)}
                        disabled={isLocked}
                      />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(child.billed_to_date ?? 0)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <MoneyField
                        label="Amount"
                        inline
                        showCurrency={false}
                        value={child.amount ?? undefined}
                        onChange={(value) => updateItem(child.id, "amount", value ?? 0)}
                        disabled={isLocked}
                      />
                    </td>
                    {!isLocked && (
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteLine(child.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-4 py-3 text-right font-semibold" colSpan={3}>
                Grand Total
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatCurrency(billedToDateTotal)}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatCurrency(allocatedTotal)}
              </td>
              {!isLocked && <td className="px-4 py-3" />}
            </tr>
          </tfoot>
        </table>
      </div>

      {hasUnsavedChanges && !isLocked && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void saveLineItems()} disabled={isSaving || isSubmitting}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
