"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useInvoicePaymentsList,
  type InvoicePayment,
} from "@/hooks/use-invoice-payments";
import {
  formatCurrency,
  formatDate,
} from "@/features/invoicing/invoicing-table-config";

function methodLabel(method: string | null): string {
  if (!method) return "--";
  return method.replace(/_/g, " ");
}

function paymentSourceLabel(payment: InvoicePayment): string {
  if (payment.invoice_type === "owner") return "Owner";
  if (payment.invoice_type === "subcontractor") return "Subcontractor";
  return "--";
}

export function PaymentsTab({ projectId }: { projectId: string }) {
  const { data: payments = [], isLoading } = useInvoicePaymentsList(projectId);

  const total = React.useMemo(
    () => payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [payments],
  );

  return (
    <div className="px-6 py-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading..."
            : `${payments.length} payment${payments.length !== 1 ? "s" : ""}`}
        </p>
        {payments.length > 0 ? (
          <p className="text-sm font-medium tabular-nums">
            Total: {formatCurrency(total)}
          </p>
        ) : null}
      </div>

      <div className="border border-border overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            Loading payments...
          </p>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-base font-medium text-foreground">
              No payments synced yet
            </p>
            <p className="text-sm text-muted-foreground">
              Payments received from Acumatica will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.payment_number ?? `PMT-${payment.id}`}
                  </TableCell>
                  <TableCell>{payment.invoice_number ?? "--"}</TableCell>
                  <TableCell>
                    {payment.invoice_type ? (
                      <Badge variant="secondary">
                        {paymentSourceLabel(payment)}
                      </Badge>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell className="capitalize">
                    {methodLabel(payment.payment_method)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{payment.check_number ?? "--"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
