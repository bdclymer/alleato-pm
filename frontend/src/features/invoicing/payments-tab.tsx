"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useInvoicePaymentsList,
  useCreateInvoicePayment,
  useUpdateInvoicePayment,
  useDeleteInvoicePayment,
  type InvoicePayment,
  type PaymentMethod,
} from "@/hooks/use-invoice-payments";
import {
  formatCurrency,
  formatDate,
} from "@/features/invoicing/invoicing-table-config";

// =============================================================================
// Constants
// =============================================================================

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
  { value: "electronic", label: "Electronic" },
  { value: "wire", label: "Wire" },
  { value: "ach", label: "ACH" },
  { value: "other", label: "Other" },
];

function methodLabel(method: string | null): string {
  if (!method) return "—";
  const found = PAYMENT_METHODS.find((m) => m.value === method);
  return found?.label ?? method;
}

// =============================================================================
// Zod Schema
// =============================================================================

const paymentSchema = z
  .object({
    invoice_type: z.enum(["owner", "subcontractor"]),
    invoice_id: z.string().min(1, "Invoice is required"),
    payment_number: z.string().optional(),
    payment_method: z.enum([
      "check",
      "credit_card",
      "electronic",
      "wire",
      "ach",
      "other",
    ]),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    payment_date: z.string().min(1, "Payment date is required"),
    check_number: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payment_method === "check" && !data.check_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["check_number"],
        message: "Check number is required for check payments",
      });
    }
  });

type PaymentFormInput = z.input<typeof paymentSchema>;
type PaymentFormValues = z.output<typeof paymentSchema>;

const EMPTY_FORM: PaymentFormInput = {
  invoice_type: "owner",
  invoice_id: "",
  payment_number: "",
  payment_method: "check",
  amount: 0 as unknown as number,
  payment_date: "",
  check_number: "",
  notes: "",
};

// =============================================================================
// Invoice option hooks
// =============================================================================

interface InvoiceOption {
  id: number;
  label: string;
}

function useOwnerInvoiceOptions(projectId: string, enabled: boolean) {
  return useQuery<InvoiceOption[]>({
    queryKey: ["payment-form", "owner-invoices", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/invoicing/owner`);
      if (!res.ok) throw new Error("Failed to load owner invoices");
      const json = await res.json();
      const rows = (json.data ?? []) as Array<{
        id: number;
        invoice_number: string | null;
      }>;
      return rows.map((r) => ({
        id: r.id,
        label: r.invoice_number ?? `INV-${r.id}`,
      }));
    },
    enabled: enabled && !!projectId,
  });
}

function useSubcontractorInvoiceOptions(projectId: string, enabled: boolean) {
  return useQuery<InvoiceOption[]>({
    queryKey: ["payment-form", "subcontractor-invoices", projectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor`,
      );
      if (!res.ok) return [];
      const json = await res.json();
      const rows = (json.data ?? []) as Array<{
        id: number | string;
        invoice_number: string | null;
        contract_number?: string | null;
      }>;
      return rows
        .map((r) => ({
          id: typeof r.id === "string" ? Number(r.id) : r.id,
          label: r.invoice_number ?? r.contract_number ?? `SUB-${r.id}`,
        }))
        .filter((r) => Number.isFinite(r.id));
    },
    enabled: enabled && !!projectId,
  });
}

// =============================================================================
// Payment Form (shared between create and edit)
// =============================================================================

interface PaymentFormProps {
  projectId: string;
  mode: "create" | "edit";
  initialValues?: PaymentFormInput;
  isSubmitting: boolean;
  onSubmit: (values: PaymentFormValues) => void | Promise<void>;
  onCancel: () => void;
}

function PaymentForm({
  projectId,
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: PaymentFormProps) {
  const form = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: initialValues ?? EMPTY_FORM,
  });

  const invoiceType = form.watch("invoice_type");
  const paymentMethod = form.watch("payment_method");

  const ownerOptions = useOwnerInvoiceOptions(
    projectId,
    invoiceType === "owner",
  );
  const subOptions = useSubcontractorInvoiceOptions(
    projectId,
    invoiceType === "subcontractor",
  );
  const invoiceOptions =
    invoiceType === "owner"
      ? ownerOptions.data ?? []
      : subOptions.data ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {mode === "create" ? (
          <FormField
            control={form.control}
            name="invoice_type"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Invoice Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("invoice_id", "");
                    }}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="owner" id="pmt-type-owner" />
                      <Label htmlFor="pmt-type-owner" className="font-normal">
                        Owner
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="subcontractor"
                        id="pmt-type-sub"
                      />
                      <Label htmlFor="pmt-type-sub" className="font-normal">
                        Subcontractor
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {mode === "create" ? (
          <FormField
            control={form.control}
            name="invoice_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an invoice" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {invoiceOptions.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-muted-foreground">
                        No invoices available
                      </div>
                    ) : (
                      invoiceOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>
                          {opt.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payment_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Number</FormLabel>
                <FormControl>
                  <Input placeholder="PMT-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder=""
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    value={(field.value as number | string | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="payment_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {paymentMethod === "check" ? (
          <FormField
            control={form.control}
            name="check_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check Number</FormLabel>
                <FormControl>
                  <Input placeholder="1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === "create"
                ? "Recording…"
                : "Saving…"
              : mode === "create"
                ? "Record Payment"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function PaymentsTab({ projectId }: { projectId: string }) {
  const { data: payments = [], isLoading } = useInvoicePaymentsList(projectId);
  const createPayment = useCreateInvoicePayment(projectId);
  const updatePayment = useUpdateInvoicePayment(projectId);
  const deletePayment = useDeleteInvoicePayment(projectId);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<InvoicePayment | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<InvoicePayment | null>(
    null,
  );

  async function handleCreate(values: PaymentFormValues) {
    const invoiceIdNum = Number(values.invoice_id);
    await createPayment.mutateAsync({
      owner_invoice_id: values.invoice_type === "owner" ? invoiceIdNum : null,
      subcontractor_invoice_id:
        values.invoice_type === "subcontractor" ? invoiceIdNum : null,
      payment_method: values.payment_method,
      amount: values.amount,
      payment_date: values.payment_date,
      ...(values.payment_number ? { payment_number: values.payment_number } : {}),
      ...(values.check_number ? { check_number: values.check_number } : {}),
      ...(values.notes ? { notes: values.notes } : {}),
    });
    setCreateOpen(false);
  }

  async function handleEdit(values: PaymentFormValues) {
    if (!editTarget) return;
    await updatePayment.mutateAsync({
      paymentId: editTarget.id,
      payment_method: values.payment_method,
      amount: values.amount,
      payment_date: values.payment_date,
      payment_number: values.payment_number || null,
      check_number: values.check_number || null,
      notes: values.notes || null,
    });
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deletePayment.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const editInitialValues: PaymentFormInput | undefined = editTarget
    ? {
        invoice_type: editTarget.invoice_type ?? "owner",
        invoice_id: String(
          editTarget.owner_invoice_id ??
            editTarget.subcontractor_invoice_id ??
            "",
        ),
        payment_number: editTarget.payment_number ?? "",
        payment_method: (editTarget.payment_method as PaymentMethod) ?? "check",
        amount: Number(editTarget.amount) || 0,
        payment_date: editTarget.payment_date ?? "",
        check_number: editTarget.check_number ?? "",
        notes: editTarget.notes ?? "",
      }
    : undefined;

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${payments.length} payment${payments.length !== 1 ? "s" : ""}`}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus />
          Record Payment
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            Loading payments…
          </p>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-base font-medium text-foreground">
              No payments recorded
            </p>
            <p className="text-sm text-muted-foreground">
              Record your first payment to start tracking invoice settlements.
            </p>
            <div className="pt-2">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus />
                Record Payment
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Check #</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.payment_number ?? `PMT-${p.id}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{p.invoice_number ?? "—"}</span>
                      {p.invoice_type ? (
                        <Badge variant="secondary" className="capitalize">
                          {p.invoice_type}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{methodLabel(p.payment_method)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell>{formatDate(p.payment_date)}</TableCell>
                  <TableCell>{p.check_number ?? "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Row actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(p)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {createOpen ? (
            <PaymentForm
              projectId={projectId}
              mode="create"
              isSubmitting={createPayment.isPending}
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          {editTarget && editInitialValues ? (
            <PaymentForm
              key={editTarget.id}
              projectId={projectId}
              mode="edit"
              initialValues={editInitialValues}
              isSubmitting={updatePayment.isPending}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete payment{" "}
              <strong>
                {deleteTarget?.payment_number ?? `PMT-${deleteTarget?.id}`}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
