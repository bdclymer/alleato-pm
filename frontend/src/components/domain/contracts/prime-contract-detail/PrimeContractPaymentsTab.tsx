"use client";

import { useMemo, useState } from "react";
import { DollarSign, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import {
  DataTable,
  type DataTableFooterCell,
} from "@/components/tables/DataTable";
import type {
  Payment,
  PaymentApplication,
  PaymentFormState,
  Contract,
} from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface PrimeContractPaymentsTabProps {
  projectId: string;
  contractId: string;
  payments: Payment[];
  paymentsReceivedLoading: boolean;
  paymentApplications: PaymentApplication[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  setContract: React.Dispatch<React.SetStateAction<Contract | null>>;
  formatCurrency: (value: number | null | undefined) => string;
}

export function PrimeContractPaymentsTab({
  projectId,
  contractId,
  payments,
  paymentsReceivedLoading,
  paymentApplications,
  setPayments,
  setContract,
  formatCurrency,
}: PrimeContractPaymentsTabProps) {
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    amount: "",
    payment_date: "",
    payment_application_id: "",
    payment_number: "",
    method: "",
    reference_number: "",
    notes: "",
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const totalPaymentsReceived = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const handleCreatePayment = async () => {
    if (!paymentForm.amount || !paymentForm.payment_date) return;
    try {
      setIsSubmittingPayment(true);
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(paymentForm.amount),
            payment_date: paymentForm.payment_date,
            payment_application_id: paymentForm.payment_application_id || null,
            payment_number: paymentForm.payment_number || null,
            method: paymentForm.method || null,
            reference_number: paymentForm.reference_number || null,
            notes: paymentForm.notes || null,
          }),
        },
      );
      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error || "Failed to record payment");
        return;
      }
      const newPayment = await response.json();
      setPayments((prev) => [newPayment, ...prev]);
      setShowAddPaymentDialog(false);
      setPaymentForm({
        amount: "",
        payment_date: "",
        payment_application_id: "",
        payment_number: "",
        method: "",
        reference_number: "",
        notes: "",
      });
      toast.success("Payment recorded successfully");
      const contractRes = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}`,
      );
      if (contractRes.ok) setContract(await contractRes.json());
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment record? This cannot be undone.")) return;
    const response = await fetch(
      `/api/projects/${projectId}/contracts/${contractId}/payments/${paymentId}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      toast.error("Failed to delete payment");
      return;
    }
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    toast.success("Payment deleted");
    const contractRes = await fetch(
      `/api/projects/${projectId}/contracts/${contractId}`,
    );
    if (contractRes.ok) setContract(await contractRes.json());
  };

  const columns: ColumnDef<Payment>[] = useMemo(
    () => [
      {
        accessorKey: "payment_number",
        header: "Payment #",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.payment_number || "--"}</div>
        ),
      },
      {
        accessorKey: "payment_date",
        header: "Date",
        cell: ({ row }) => <div>{new Date(row.original.payment_date).toLocaleDateString()}</div>,
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div className="text-right">{formatCurrency(row.original.amount)}</div>
        ),
      },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ row }) => (
          <div className="capitalize text-muted-foreground">{row.original.method || "--"}</div>
        ),
      },
      {
        accessorKey: "reference_number",
        header: "Reference",
        cell: ({ row }) => (
          <div className="text-muted-foreground">{row.original.reference_number || "--"}</div>
        ),
      },
      {
        id: "linked_invoice",
        header: "Linked Invoice",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.payment_application
              ? `App #${row.original.payment_application.application_number}`
              : "--"}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                void handleDeletePayment(row.original.id);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [formatCurrency],
  );

  const footerRow = useMemo<DataTableFooterCell[]>(
    () => [
      { value: "Total Received", colSpan: 2, align: "left" },
      { value: formatCurrency(totalPaymentsReceived) },
      { value: "", colSpan: 4 },
    ],
    [formatCurrency, totalPaymentsReceived],
  );

  return (
    <div>
      <div className="bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Payments Received</h3>
            <p className="text-sm text-muted-foreground">
              {payments.length} payment{payments.length === 1 ? "" : "s"} •{" "}
              Total received: {formatCurrency(totalPaymentsReceived)}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddPaymentDialog(true)}>
            <Plus />
            Record Payment
          </Button>
        </div>

        {paymentsReceivedLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payments recorded yet</p>
            <p className="text-xs mt-2">Record a payment when funds are received</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            showToolbar={false}
            showPagination={payments.length > 25}
            footerRow={footerRow}
          />
        )}
      </div>

      {/* Record Payment Dialog */}
      <Modal open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Record Payment Received</ModalTitle>
            <ModalDescription>
              Log a payment received against this prime contract.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pmt-amount">Amount *</Label>
                <Input
                  id="pmt-amount"
                  type="number"
                  placeholder=""
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pmt-date">Payment Date *</Label>
                <Input
                  id="pmt-date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pmt-method">Method</Label>
                <select
                  id="pmt-method"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-sm"
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, method: e.target.value }))
                  }
                >
                  <option value="">Select method</option>
                  <option value="check">Check</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="ach">ACH</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pmt-ref">Reference / Check #</Label>
                <Input
                  id="pmt-ref"
                  placeholder="e.g. 12345"
                  value={paymentForm.reference_number}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, reference_number: e.target.value }))
                  }
                />
              </div>
            </div>
            {paymentApplications.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pmt-app">Linked Invoice (optional)</Label>
                <select
                  id="pmt-app"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-sm"
                  value={paymentForm.payment_application_id}
                  onChange={(e) =>
                    setPaymentForm((f) => ({
                      ...f,
                      payment_application_id: e.target.value,
                    }))
                  }
                >
                  <option value="">None</option>
                  {paymentApplications.map((app) => (
                    <option key={app.id} value={app.id}>
                      App #{app.application_number} — {formatCurrency(app.amount)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="pmt-notes">Notes</Label>
              <Textarea
                id="pmt-notes"
                placeholder="Optional notes..."
                rows={3}
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddPaymentDialog(false)}
              disabled={isSubmittingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePayment}
              disabled={
                isSubmittingPayment ||
                !paymentForm.amount ||
                !paymentForm.payment_date
              }
            >
              {isSubmittingPayment ? "Recording..." : "Record Payment"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
