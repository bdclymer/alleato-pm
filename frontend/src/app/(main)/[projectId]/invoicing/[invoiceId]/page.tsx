"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, type Control, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Edit, Trash2, Download, Check, CheckCheck, Ban, Send, RotateCcw, Plus, Save, Mail } from "lucide-react";
import { toast } from "sonner";

import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import {
  Form,
} from "@/components/ui/form";
import {
  Slideover,
  SlideoverContent,
  SlideoverHeader,
  SlideoverTitle,
} from "@/components/ui/unified-slideover";
import { StatusBadge } from "@/components/misc/status-badge";
import { PageShell } from "@/components/layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { useSendInvoiceEmail } from "@/hooks/use-invoicing";
import {
  formatCurrency,
  formatDate,
  type OwnerInvoice,
  type OwnerInvoiceLineItem,
} from "@/features/invoicing/invoicing-table-config";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ds/text";
import { EmptyState } from "@/components/ds";
import { FormGrid, FormSection } from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { RHFSelectField } from "@/components/forms/fields/RHFSelectField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
import { apiFetch, apiFetchWithTimeout } from "@/lib/api-client";
import { formatPercent } from "@/lib/format";
import { InvoiceAttachments } from "@/components/domain/invoices/InvoiceAttachments";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EDITABLE_STATUSES = ["draft", "revise_and_resubmit"] as const;

function isEditable(status: string): boolean {
  return (EDITABLE_STATUSES as readonly string[]).includes(status);
}

// ---------------------------------------------------------------------------
// Edit form schema
// ---------------------------------------------------------------------------

const invoiceEditSchema = z.object({
  invoice_number: z.string().trim().max(255).nullable().optional(),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  status: z.enum(["draft", "under_review", "approved", "approved_as_noted", "revise_and_resubmit", "paid", "void", "not_invited", "invited"]),
  notes: z.string().trim().max(2000).nullable().optional(),
});

type InvoiceEditValues = z.infer<typeof invoiceEditSchema>;

const invoiceStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "approved_as_noted", label: "Approved as Noted" },
  { value: "revise_and_resubmit", label: "Revise & Resubmit" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

// ---------------------------------------------------------------------------
// Add line item schema
// ---------------------------------------------------------------------------

const addLineItemSchema = z.object({
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(100).optional(),
  scheduled_value: z.coerce.number().min(0).default(0),
  work_completed_period: z.coerce.number().min(0).default(0),
  materials_stored: z.coerce.number().min(0).default(0),
  retainage_pct: z.coerce.number().min(0).max(100).default(0),
  retainage_amount: z.coerce.number().min(0).default(0),
  retainage_released: z.coerce.number().min(0).default(0),
});

type AddLineItemValues = z.infer<typeof addLineItemSchema>;

// ---------------------------------------------------------------------------
// SOV editable cell — inline number input
// ---------------------------------------------------------------------------

interface EditableCellProps {
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}

function EditableCell({ value, onChange, prefix, suffix, min = 0, max, step = 0.01 }: EditableCellProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync if parent value changes externally
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      setLocalValue(String(value));
    }
  };

  return (
    <div className="flex min-w-28 items-center gap-0.5">
      {prefix && <span className="text-muted-foreground text-xs">{prefix}</span>}
      <Input
        ref={inputRef}
        type="number"
        value={localValue}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            setLocalValue(String(value));
            inputRef.current?.blur();
          }
        }}
        className="h-8 w-full bg-muted px-2 py-1 text-right text-sm tabular-nums"
      />
      {suffix && <span className="text-muted-foreground text-xs">{suffix}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Derived calculation helpers
// ---------------------------------------------------------------------------

function calcTotalCompleted(item: OwnerInvoiceLineItem, overrides: Partial<SovDraft>): number {
  const wcp = overrides.work_completed_period ?? item.work_completed_period;
  const ms = overrides.materials_stored ?? item.materials_stored;
  return (item.work_completed_previous ?? 0) + wcp + ms;
}

function calcPctComplete(item: OwnerInvoiceLineItem, overrides: Partial<SovDraft>): number {
  const sv = item.scheduled_value;
  if (!sv || sv === 0) return 0;
  return (calcTotalCompleted(item, overrides) / sv) * 100;
}

function calcRetainageAmount(item: OwnerInvoiceLineItem, overrides: Partial<SovDraft>): number {
  if (overrides.retainage_amount !== undefined) return overrides.retainage_amount;
  const wcp = overrides.work_completed_period ?? item.work_completed_period;
  const pct = overrides.retainage_pct ?? item.retainage_pct;
  return wcp * (pct / 100);
}

function calcNetAmountThisPeriod(item: OwnerInvoiceLineItem, overrides: Partial<SovDraft>): number {
  const wcp = overrides.work_completed_period ?? item.work_completed_period;
  const ms = overrides.materials_stored ?? item.materials_stored;
  const retainageAmt = calcRetainageAmount(item, overrides);
  const released = overrides.retainage_released ?? item.retainage_released;
  return wcp + ms - retainageAmt + released;
}

function calcBalanceToFinish(item: OwnerInvoiceLineItem, overrides: Partial<SovDraft>): number {
  const sv = item.scheduled_value;
  const total = calcTotalCompleted(item, overrides);
  return sv - total;
}

// ---------------------------------------------------------------------------
// SOV Draft state type (per-row editable fields keyed by item id)
// ---------------------------------------------------------------------------

interface SovDraft {
  work_completed_period: number;
  materials_stored: number;
  retainage_pct: number;
  retainage_amount: number;
  retainage_released: number;
}

type SovDraftMap = Record<number, Partial<SovDraft>>;

// ---------------------------------------------------------------------------
// SOV Table component
// ---------------------------------------------------------------------------

interface SovTableProps {
  lineItems: OwnerInvoiceLineItem[];
  editable: boolean;
  draftMap: SovDraftMap;
  onDraftChange: (itemId: number, field: keyof SovDraft, value: number) => void;
}

function SovTable({ lineItems, editable, draftMap, onDraftChange }: SovTableProps) {
  if (lineItems.length === 0) {
    return (
      <EmptyState
        title="No line items found"
        description="No schedule of values line items have been added to this invoice."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-40">Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="min-w-28 text-right">Scheduled Value</TableHead>
            <TableHead className="min-w-28 text-right">Prev Work</TableHead>
            <TableHead className="min-w-32 text-right">
              {editable ? (
                <span className="inline-flex items-center gap-1">
                  Work This Period
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/60" title="Editable" />
                </span>
              ) : (
                "Work This Period"
              )}
            </TableHead>
            <TableHead className="min-w-32 text-right">
              {editable ? (
                <span className="inline-flex items-center gap-1">
                  Materials Stored
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/60" title="Editable" />
                </span>
              ) : (
                "Materials Stored"
              )}
            </TableHead>
            <TableHead className="min-w-28 text-right">Total Comp. &amp; Stored</TableHead>
            <TableHead className="min-w-20 text-right">% Complete</TableHead>
            <TableHead className="min-w-32 text-right">
              {editable ? (
                <span className="inline-flex items-center gap-1">
                  Retainage %
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/60" title="Editable" />
                </span>
              ) : (
                "Retainage %"
              )}
            </TableHead>
            <TableHead className="min-w-28 text-right">
              {editable ? (
                <span className="inline-flex items-center gap-1">
                  Retainage $
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/60" title="Editable" />
                </span>
              ) : (
                "Retainage $"
              )}
            </TableHead>
            <TableHead className="min-w-32 text-right">
              {editable ? (
                <span className="inline-flex items-center gap-1">
                  Retainage Released
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/60" title="Editable" />
                </span>
              ) : (
                "Retainage Released"
              )}
            </TableHead>
            <TableHead className="min-w-28 text-right">Net This Period</TableHead>
            <TableHead className="min-w-28 text-right">Balance to Finish</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item) => {
            const overrides = draftMap[item.id] ?? {};
            const totalCompleted = calcTotalCompleted(item, overrides);
            const pctComplete = calcPctComplete(item, overrides);
            const retainageAmt = calcRetainageAmount(item, overrides);
            const netThisPeriod = calcNetAmountThisPeriod(item, overrides);
            const balance = calcBalanceToFinish(item, overrides);

            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-sm">
                  {item.description || "—"}
                </TableCell>
                <TableCell>
                  <span className="text-sm capitalize">
                    {item.category?.replace(/_/g, " ") || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(item.scheduled_value)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(item.work_completed_previous)}
                </TableCell>

                {/* Editable: Work Completed This Period */}
                <TableCell className="text-right">
                  {editable ? (
                    <EditableCell
                      value={overrides.work_completed_period ?? item.work_completed_period}
                      onChange={(val) => onDraftChange(item.id, "work_completed_period", val)}
                      prefix="$"
                    />
                  ) : (
                    <span className="tabular-nums text-sm">{formatCurrency(item.work_completed_period)}</span>
                  )}
                </TableCell>

                {/* Editable: Materials Stored */}
                <TableCell className="text-right">
                  {editable ? (
                    <EditableCell
                      value={overrides.materials_stored ?? item.materials_stored}
                      onChange={(val) => onDraftChange(item.id, "materials_stored", val)}
                      prefix="$"
                    />
                  ) : (
                    <span className="tabular-nums text-sm">{formatCurrency(item.materials_stored)}</span>
                  )}
                </TableCell>

                {/* Read-only calculated */}
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(totalCompleted)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatPercent(pctComplete)}
                </TableCell>

                {/* Editable: Retainage % */}
                <TableCell className="text-right">
                  {editable ? (
                    <EditableCell
                      value={overrides.retainage_pct ?? item.retainage_pct}
                      onChange={(pct) => {
                        const wcp = overrides.work_completed_period ?? item.work_completed_period;
                        onDraftChange(item.id, "retainage_pct", pct);
                        onDraftChange(item.id, "retainage_amount", wcp * (pct / 100));
                      }}
                      suffix="%"
                      max={100}
                      step={0.1}
                    />
                  ) : (
                    <span className="tabular-nums text-sm">
                      {formatPercent(item.retainage_pct ?? 0, 2)}
                    </span>
                  )}
                </TableCell>

                {/* Editable: Retainage $ */}
                <TableCell className="text-right">
                  {editable ? (
                    <EditableCell
                      value={overrides.retainage_amount ?? retainageAmt}
                      onChange={(amt) => {
                        const wcp = overrides.work_completed_period ?? item.work_completed_period;
                        onDraftChange(item.id, "retainage_amount", amt);
                        onDraftChange(item.id, "retainage_pct", wcp > 0 ? (amt / wcp) * 100 : 0);
                      }}
                      prefix="$"
                    />
                  ) : (
                    <span className="tabular-nums text-sm">{formatCurrency(retainageAmt)}</span>
                  )}
                </TableCell>

                {/* Editable: Retainage Released */}
                <TableCell className="text-right">
                  {editable ? (
                    <EditableCell
                      value={overrides.retainage_released ?? item.retainage_released}
                      onChange={(val) => onDraftChange(item.id, "retainage_released", val)}
                      prefix="$"
                    />
                  ) : (
                    <span className="tabular-nums text-sm">{formatCurrency(item.retainage_released)}</span>
                  )}
                </TableCell>

                {/* Calculated: Net this period */}
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {formatCurrency(netThisPeriod)}
                </TableCell>

                {/* Calculated: Balance to finish */}
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(balance)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Line Item dialog
// ---------------------------------------------------------------------------

interface AddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  invoiceId: number;
  onSuccess: (item: OwnerInvoiceLineItem) => void;
}

function AddLineItemDialog({ open, onOpenChange, projectId, invoiceId, onSuccess }: AddLineItemDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<AddLineItemValues>({
    resolver: zodResolver(addLineItemSchema) as Resolver<AddLineItemValues>,
    defaultValues: {
      description: "",
      category: "",
      scheduled_value: 0,
      work_completed_period: 0,
      materials_stored: 0,
      retainage_pct: 0,
      retainage_amount: 0,
      retainage_released: 0,
    },
  });

  const onSubmit = async (values: AddLineItemValues) => {
    setIsSaving(true);
    try {
      const body = await apiFetch<{ data: OwnerInvoiceLineItem }>(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/line-items`,
        {
          method: "POST",
          body: JSON.stringify(values),
        },
      );
      toast.success("Line item added");
      form.reset();
      onOpenChange(false);
      onSuccess(body.data);
    } catch (err) {
      toast.error("Failed to add line item");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Add Line Item</ModalTitle>
        </ModalHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="add-description">Description</Label>
              <Input
                id="add-description"
                placeholder="Line item description"
                {...form.register("description")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-category">Category</Label>
              <Input
                id="add-category"
                placeholder="e.g. labor, materials"
                {...form.register("category")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-scheduled-value">Scheduled Value ($)</Label>
              <Input
                id="add-scheduled-value"
                type="number"
                min={0}
                step={0.01}
                {...form.register("scheduled_value")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-work-period">Work Completed This Period ($)</Label>
              <Input
                id="add-work-period"
                type="number"
                min={0}
                step={0.01}
                {...form.register("work_completed_period")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-materials">Materials Stored ($)</Label>
              <Input
                id="add-materials"
                type="number"
                min={0}
                step={0.01}
                {...form.register("materials_stored")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-retainage-pct">Retainage (%)</Label>
              <Input
                id="add-retainage-pct"
                type="number"
                min={0}
                max={100}
                step={0.1}
                {...form.register("retainage_pct")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-retainage-released">Retainage Released ($)</Label>
              <Input
                id="add-retainage-released"
                type="number"
                min={0}
                step={0.01}
                {...form.register("retainage_released")}
              />
            </div>
          </div>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Adding..." : "Add Line Item"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Invoice Edit Slideover form
// ---------------------------------------------------------------------------

interface InvoiceEditFormProps {
  invoice: OwnerInvoice;
  projectId: number;
  invoiceId: number;
  onCancel: () => void;
  onSuccess: (updated: OwnerInvoice) => void;
}

function InvoiceEditForm({
  invoice,
  projectId,
  invoiceId,
  onCancel,
  onSuccess,
}: InvoiceEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<InvoiceEditValues>({
    resolver: zodResolver(invoiceEditSchema),
    defaultValues: {
      invoice_number: invoice.invoice_number ?? "",
      period_start: invoice.period_start
        ? invoice.period_start.slice(0, 10)
        : "",
      period_end: invoice.period_end ? invoice.period_end.slice(0, 10) : "",
      status: invoice.status as InvoiceEditValues["status"],
      notes: "",
    },
  });
  const control = form.control as Control<InvoiceEditValues>;

  const onSubmit = async (values: InvoiceEditValues) => {
    setIsSaving(true);
    try {
      const payload: Record<string, string | null> = {
        invoice_number: values.invoice_number || null,
        period_start: values.period_start || null,
        period_end: values.period_end || null,
        status: values.status,
        notes: values.notes || null,
      };

      const body = await apiFetch<{ data: OwnerInvoice }>(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      toast.success("Invoice updated successfully");
      onSuccess(body.data);
    } catch (err) {
      toast.error("Failed to update invoice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
        <FormSection
          title="Invoice Details"
          description="Update invoice metadata and review status."
        >
          <FormGrid columns={2}>
            <div className="md:col-span-2">
              <RHFTextField
                control={control}
                name="invoice_number"
                label="Invoice Number"
                placeholder="e.g. INV-001"
                maxLength={255}
              />
            </div>
            <RHFDateField
              control={form.control}
              name="period_start"
              label="Period Start"
              placeholder="Pick a start date"
              nullable
            />
            <RHFDateField
              control={form.control}
              name="period_end"
              label="Period End"
              placeholder="Pick an end date"
              nullable
            />
            <div className="md:col-span-2">
              <RHFSelectField
                control={control}
                name="status"
                label="Status"
                options={invoiceStatusOptions}
                placeholder="Select status"
              />
            </div>
            <div className="md:col-span-2">
              <RHFTextareaField
                control={control}
                name="notes"
                label="Notes"
                placeholder="Optional notes about this invoice..."
                rows={4}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormActions
          submitLabel="Save Changes"
          onCancel={onCancel}
          isSubmitting={isSaving}
        />
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Invoice Detail Page
// ---------------------------------------------------------------------------

/**
 * Invoice Detail Page
 *
 * Displays detailed information about a specific owner invoice
 * including an editable SOV grid (when status is draft or revise_and_resubmit).
 */
export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams()! ?? {};
  const projectId = parseInt(params.projectId as string);
  const invoiceId = parseInt(params.invoiceId as string);
  useProjectTitle("Invoice Details");

  const [invoice, setInvoice] = useState<OwnerInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approveAsNotedDialogOpen, setApproveAsNotedDialogOpen] = useState(false);
  const [isApprovingAsNoted, setIsApprovingAsNoted] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [addLineItemOpen, setAddLineItemOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const sendInvoiceEmail = useSendInvoiceEmail(String(projectId));

  // SOV draft state — tracks unsaved edits keyed by line item id
  const [sovDraft, setSovDraft] = useState<SovDraftMap>({});
  const [isSavingSOV, setIsSavingSOV] = useState(false);

  const hasSovChanges = Object.keys(sovDraft).length > 0;

  // Fetch invoice details
  const fetchInvoice = useCallback(async () => {
    if (!projectId || !invoiceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetchWithTimeout<{ data: OwnerInvoice }>(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}`,
        undefined,
        15_000,
      );
      if (!data?.data) {
        setError("Invoice not found");
      } else {
        setInvoice(data.data);
        // Reset draft on fresh load
        setSovDraft({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch invoice");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // SOV draft change handler
  const handleDraftChange = useCallback(
    (itemId: number, field: keyof SovDraft, value: number) => {
      setSovDraft((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], [field]: value },
      }));
    },
    [],
  );

  // Save SOV changes via PATCH bulk endpoint
  const handleSaveSOV = async () => {
    if (!hasSovChanges) return;

    setIsSavingSOV(true);
    try {
      const updates = Object.entries(sovDraft).map(([idStr, fields]) => ({
        id: parseInt(idStr, 10),
        ...fields,
      }));

      await apiFetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/line-items`,
        {
          method: "PATCH",
          body: JSON.stringify({ updates }),
        },
      );

      toast.success("Schedule of Values saved");
      // Refresh invoice to get server-computed values
      await fetchInvoice();
    } catch (err) {
      toast.error("Failed to save changes");
    } finally {
      setIsSavingSOV(false);
    }
  };

  // Discard draft changes
  const handleDiscardSOV = () => {
    setSovDraft({});
  };

  // Action handlers
  const handleBack = () => {
    router.push(`/${projectId}/invoices`);
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleEditSuccess = (updated: OwnerInvoice) => {
    setIsEditOpen(false);
    // Merge updated fields back, preserving line items already in state
    setInvoice((prev) =>
      prev
        ? { ...prev, ...updated, owner_invoice_line_items: prev.owner_invoice_line_items }
        : updated,
    );
  };

  const handleSubmit = async () => {
    if (!invoice) return;

    // Prompt to save unsaved SOV changes first
    if (hasSovChanges) {
      toast.warning("You have unsaved SOV changes. Please save or discard them before submitting.");
      return;
    }

    try {
      await apiFetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/submit`,
        {
          method: "POST",
        },
      );

      toast.success("Invoice submitted successfully");
      await fetchInvoice();
    } catch (err) {
      toast.error("Failed to submit invoice");
    }
  };

  const handleRevise = async () => {
    if (!invoice) return;

    try {
      await apiFetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/revise`,
        { method: "POST" },
      );

      toast.success("Invoice returned for revision");
      await fetchInvoice();
    } catch (err) {
      toast.error("Failed to request revision");
    }
  };

  const handleApprove = async () => {
    if (!invoice) return;

    try {
      await apiFetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/approve`,
        {
          method: "POST",
        },
      );

      toast.success("Invoice approved successfully");
      await fetchInvoice();
    } catch (err) {
      toast.error("Failed to approve invoice");
    }
  };

  const handleApproveAsNoted = async () => {
    if (!invoice) return;
    try {
      setIsApprovingAsNoted(true);
      await apiFetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/approve-as-noted`,
        { method: "POST" },
      );
      toast.success("Invoice approved as noted");
      setApproveAsNotedDialogOpen(false);
      await fetchInvoice();
    } catch (err) {
      toast.error("Failed to approve invoice as noted");
    } finally {
      setIsApprovingAsNoted(false);
    }
  };

  const handleVoid = async () => {
    if (!invoice) return;
    try {
      setIsVoiding(true);
      await apiFetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/void`,
        {
          method: "POST",
          body: JSON.stringify({ reason: voidReason.trim() || undefined }),
        },
      );
      toast.success("Invoice voided");
      setVoidDialogOpen(false);
      setVoidReason("");
      await fetchInvoice();
    } catch (err) {
      toast.error("Failed to void invoice");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;

    try {
      setIsDeleting(true);
      await apiFetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}`,
        {
          method: "DELETE",
        },
      );

      toast.success("Invoice deleted successfully");
      router.push(`/${projectId}/invoices`);
    } catch (err) {
      toast.error("Failed to delete invoice");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleExportPDF = () => {
    const url = `/api/projects/${projectId}/invoicing/owner/${invoiceId}/pdf`;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openEmailDialog = () => {
    const invoiceNumber = invoice?.invoice_number || invoice?.id || "";
    setEmailTo("");
    setEmailCc("");
    setEmailSubject(`Invoice #${invoiceNumber}`);
    setEmailMessage(`Please find attached invoice #${invoiceNumber}.`);
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    const toArr = emailTo
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ccArr = emailCc
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (toArr.length === 0) {
      toast.error("At least one recipient is required");
      return;
    }

    try {
      await sendInvoiceEmail.mutateAsync({
        invoiceId: invoice.id,
        to: toArr,
        cc: ccArr.length > 0 ? ccArr : undefined,
        subject: emailSubject || undefined,
        message: emailMessage || undefined,
      });
      setEmailDialogOpen(false);
    } catch (error) {
      reportNonCriticalFailure({
        area: "owner-invoice-detail",
        operation: "send-invoice-email",
        error,
        userVisibleFallback: "Invoice email was not sent.",
        metadata: { invoiceId: invoice.id, projectId },
      });
    }
  };

  const handleLineItemAdded = (item: OwnerInvoiceLineItem) => {
    setInvoice((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        owner_invoice_line_items: [
          ...(prev.owner_invoice_line_items ?? []),
          item,
        ],
      };
    });
  };

  // Calculate totals (prefer draft values for real-time summary)
  const lineItems = invoice?.owner_invoice_line_items ?? [];

  // Pre-fill retainage_released for every line item to equal its held retainage
  const handleReleaseAllRetainage = useCallback(() => {
    setSovDraft((prev) => {
      const next: SovDraftMap = { ...prev };
      for (const item of lineItems) {
        const existingOverrides = prev[item.id] ?? {};
        const retainageHeld =
          existingOverrides.retainage_amount !== undefined
            ? existingOverrides.retainage_amount
            : (item.retainage_amount ?? 0);
        next[item.id] = {
          ...existingOverrides,
          retainage_released: retainageHeld,
        };
      }
      return next;
    });
  }, [lineItems]);

  const sovTotals = lineItems.reduce(
    (acc, item) => {
      const overrides = sovDraft[item.id] ?? {};
      acc.scheduledValue += item.scheduled_value;
      acc.workPrevious += item.work_completed_previous ?? 0;
      acc.workThisPeriod += overrides.work_completed_period ?? item.work_completed_period;
      acc.materialsStored += overrides.materials_stored ?? item.materials_stored;
      acc.retainageAmount += calcRetainageAmount(item, overrides);
      acc.netThisPeriod += calcNetAmountThisPeriod(item, overrides);
      return acc;
    },
    {
      scheduledValue: 0,
      workPrevious: 0,
      workThisPeriod: 0,
      materialsStored: 0,
      retainageAmount: 0,
      netThisPeriod: 0,
    },
  );

  const totalCompleted = sovTotals.workPrevious + sovTotals.workThisPeriod + sovTotals.materialsStored;
  const pctComplete = sovTotals.scheduledValue > 0
    ? (totalCompleted / sovTotals.scheduledValue) * 100
    : 0;

  const invoiceEditable = invoice ? isEditable(invoice.status) : false;

  if (isLoading) {
    return (
      <PageShell variant="detail" title="Invoice Details" onBack={() => router.back()}>
        <div className="flex justify-center items-center h-64">
          <Text tone="muted">Loading invoice...</Text>
        </div>
      </PageShell>
    );
  }

  if (error || !invoice) {
    return (
      <PageShell variant="detail" title="Invoice Details" onBack={() => router.back()}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Text tone="destructive" className="mb-4">
                {error || "Invoice not found"}
              </Text>
              <Button onClick={handleBack}>
                <ArrowLeft />
                Back to Invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        variant="dashboard"
        title={`Invoice ${invoice.invoice_number || invoice.id}`}
        description={invoice.contract_number ?? invoice.prime_contract_id ?? undefined}
        statusBadge={<StatusBadge status={invoice.status} type="invoice" />}
        onBack={() => router.back()}
        actions={
          <div className="flex gap-2">
            {invoice.status === "draft" && (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit />
                  Edit
                </Button>
                <Button size="sm" onClick={handleSubmit}>
                  <Send />
                  Submit for Approval
                </Button>
              </>
            )}
            {invoice.status === "revise_and_resubmit" && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit />
                Edit
              </Button>
            )}
            {invoice.status === "under_review" && (
              <Button size="sm" onClick={handleApprove}>
                <Check />
                Approve
              </Button>
            )}
            {invoice.status === "under_review" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApproveAsNotedDialogOpen(true)}
              >
                <CheckCheck />
                Approve as Noted
              </Button>
            )}
            {invoice.status === "under_review" && (
              <Button variant="outline" size="sm" onClick={handleRevise}>
                <RotateCcw />
                Revise &amp; Resubmit
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={openEmailDialog}>
              <Mail />
              Email Invoice
            </Button>
            {invoice.status !== "paid" && invoice.status !== "void" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setVoidDialogOpen(true)}
                disabled={isVoiding}
              >
                <Ban className="h-4 w-4 mr-2" />
                Void
              </Button>
            )}
            {!["approved", "approved_as_noted", "paid"].includes(invoice.status) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Text size="sm" tone="muted">Invoice Date</Text>
                  <Text weight="medium">
                    {formatDate(invoice.created_at)}
                  </Text>
                </div>
                <div>
                  <Text size="sm" tone="muted">Due Date</Text>
                  <Text weight="medium">
                    {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                  </Text>
                </div>
                <div>
                  <Text size="sm" tone="muted">Billing Period</Text>
                  <Text weight="medium">
                    {invoice.period_start && invoice.period_end
                      ? `${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`
                      : "—"}
                  </Text>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule of Values */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Schedule of Values</CardTitle>
                  {invoiceEditable && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-primary/60" />
                        Columns marked with a dot are editable
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {invoiceEditable && hasSovChanges && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDiscardSOV}
                        disabled={isSavingSOV}
                      >
                        Discard Changes
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveSOV}
                        disabled={isSavingSOV}
                      >
                        <Save />
                        {isSavingSOV ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  )}
                  {invoiceEditable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReleaseAllRetainage}
                      title="Pre-fills retainage released = retainage held for all line items"
                    >
                      Release All Retainage
                    </Button>
                  )}
                  {invoiceEditable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddLineItemOpen(true)}
                    >
                      <Plus />
                      Add Line Item
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <SovTable
                lineItems={lineItems}
                editable={invoiceEditable}
                draftMap={sovDraft}
                onDraftChange={handleDraftChange}
              />
            </CardContent>
          </Card>

          {/* SOV Totals Summary */}
          {lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Invoice Totals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Text tone="muted">Scheduled Value</Text>
                    <Text weight="medium" className="tabular-nums">
                      {formatCurrency(sovTotals.scheduledValue)}
                    </Text>
                  </div>
                  <div className="flex justify-between items-center">
                    <Text tone="muted">Work from Previous Applications</Text>
                    <Text weight="medium" className="tabular-nums">
                      {formatCurrency(sovTotals.workPrevious)}
                    </Text>
                  </div>
                  <div className="flex justify-between items-center">
                    <Text tone="muted">Work Completed This Period</Text>
                    <Text weight="medium" className="tabular-nums">
                      {formatCurrency(sovTotals.workThisPeriod)}
                    </Text>
                  </div>
                  <div className="flex justify-between items-center">
                    <Text tone="muted">Materials Presently Stored</Text>
                    <Text weight="medium" className="tabular-nums">
                      {formatCurrency(sovTotals.materialsStored)}
                    </Text>
                  </div>
                  <div className="flex justify-between items-center">
                    <Text tone="muted">Total Completed &amp; Stored</Text>
                    <Text weight="medium" className="tabular-nums">
                      {formatCurrency(totalCompleted)}
                    </Text>
                  </div>
                  <div className="flex justify-between items-center">
                    <Text tone="muted">% Complete</Text>
                    <Text weight="medium" className="tabular-nums">
                      {formatPercent(pctComplete)}
                    </Text>
                  </div>
                  <div className="flex justify-between items-center">
                    <Text tone="muted">Less Retainage</Text>
                    <Text weight="medium" tone="destructive" className="tabular-nums">
                      -{formatCurrency(sovTotals.retainageAmount)}
                    </Text>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <Text size="lg" weight="semibold">Net Amount This Period</Text>
                    <Text size="lg" weight="bold" className="tabular-nums">
                      {formatCurrency(sovTotals.netThisPeriod)}
                    </Text>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Confirmation & Attachments */}
          <InvoiceAttachments projectId={projectId} invoiceId={invoiceId} />
        </div>
      </PageShell>

      {/* Email Invoice Dialog */}
      <Modal open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Email Invoice</ModalTitle>
          </ModalHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">To *</Label>
              <Input
                id="email-to"
                type="text"
                placeholder="recipient@example.com, another@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
              <Text size="sm" tone="muted">
                Comma-separated list of email addresses.
              </Text>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-cc">CC</Label>
              <Input
                id="email-cc"
                type="text"
                placeholder="cc@example.com"
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                rows={4}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={sendInvoiceEmail.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSendEmail()}
              disabled={sendInvoiceEmail.isPending}
            >
              <Send />
              {sendInvoiceEmail.isPending ? "Sending..." : "Send"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice{" "}
              {invoice?.invoice_number || invoice?.id}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve as Noted Confirmation */}
      <AlertDialog open={approveAsNotedDialogOpen} onOpenChange={setApproveAsNotedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve as Noted</AlertDialogTitle>
            <AlertDialogDescription>
              Approve invoice {invoice?.invoice_number || invoice?.id} as noted? This
              marks the invoice as approved with noted exceptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleApproveAsNoted()}
              disabled={isApprovingAsNoted}
            >
              {isApprovingAsNoted ? "Approving..." : "Approve as Noted"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void Confirmation */}
      <AlertDialog
        open={voidDialogOpen}
        onOpenChange={(open) => {
          setVoidDialogOpen(open);
          if (!open) setVoidReason("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Void invoice {invoice?.invoice_number || invoice?.id}? This marks the
              invoice as void and cannot be reversed through the UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="void-reason">Reason (optional)</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Why is this invoice being voided?"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleVoid()}
              disabled={isVoiding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isVoiding ? "Voiding..." : "Void Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Invoice Slideover */}
      <Slideover
        open={isEditOpen}
        onOpenChange={(open) => !open && setIsEditOpen(false)}
      >
        <SlideoverContent
          side="right"
          className="w-full max-w-xl overflow-y-auto p-0"
        >
          <SlideoverHeader className="border-b p-4">
            <SlideoverTitle>Edit Invoice</SlideoverTitle>
          </SlideoverHeader>
          <InvoiceEditForm
            invoice={invoice}
            projectId={projectId}
            invoiceId={invoiceId}
            onCancel={() => setIsEditOpen(false)}
            onSuccess={handleEditSuccess}
          />
        </SlideoverContent>
      </Slideover>

      {/* Add Line Item Dialog */}
      <AddLineItemDialog
        open={addLineItemOpen}
        onOpenChange={setAddLineItemOpen}
        projectId={projectId}
        invoiceId={invoiceId}
        onSuccess={handleLineItemAdded}
      />
    </>
  );
}
