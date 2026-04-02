"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ds";
import { CreateInvoiceDialog } from "@/components/domain/invoices/CreateInvoiceDialog";
import type { PaymentApplication, Contract } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface PrimeContractInvoicesTabProps {
  projectId: string;
  contractId: string;
  contract: Contract;
  paymentApplications: PaymentApplication[];
  paymentsLoading: boolean;
  billingPeriods: Array<{
    id: string;
    start_date: string;
    end_date: string;
    name: string | null;
    period_number: number;
  }>;
  onCreateInvoice: (data: {
    application_number: string;
    billing_period_id?: string;
    period_from?: string;
    period_to?: string;
    billing_date?: string;
    status: string;
    notes?: string;
    amount: number;
    retention_amount: number;
  }) => Promise<void>;
  onDeleteInvoice: (applicationId: string) => Promise<void>;
  formatCurrency: (value: number | null | undefined) => string;
}

export function PrimeContractInvoicesTab({
  projectId,
  contractId,
  contract,
  paymentApplications,
  paymentsLoading,
  billingPeriods,
  onCreateInvoice,
  onDeleteInvoice,
  formatCurrency,
}: PrimeContractInvoicesTabProps) {
  const router = useRouter();
  const [showAddInvoiceDialog, setShowAddInvoiceDialog] = useState(false);

  return (
    <div>
      <div className="bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              Invoices (Payment Applications){" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({paymentApplications.length})
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Total invoiced:{" "}
              {formatCurrency(
                paymentApplications
                  .filter((a) => a.status === "approved")
                  .reduce((sum, a) => sum + a.amount, 0),
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddInvoiceDialog(true)}>
            <Plus />
            Create Invoice
          </Button>
        </div>

        {paymentsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : paymentApplications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invoices yet</p>
            <p className="text-xs mt-2">
              Create an invoice to track payment applications
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Retainage</TableHead>
                <TableHead className="text-right">Payment Due</TableHead>
                <TableHead className="text-right">% Complete</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentApplications.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/${projectId}/prime-contracts/${contractId}/invoices/${app.id}`,
                    )
                  }
                >
                  <TableCell className="font-medium text-primary">
                    {app.application_number}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {app.period_from && app.period_to
                      ? `${new Date(app.period_from).toLocaleDateString()} – ${new Date(app.period_to).toLocaleDateString()}`
                      : app.period_from
                        ? `From ${new Date(app.period_from).toLocaleDateString()}`
                        : "--"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={app.status.replace(/_/g, " ")}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(app.amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {app.retention_amount > 0
                      ? formatCurrency(app.retention_amount)
                      : "--"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      app.net_amount ??
                        app.amount - app.retention_amount,
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {contract.revised_contract_value > 0
                      ? `${((app.amount / contract.revised_contract_value) * 100).toFixed(1)}%`
                      : "--"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteInvoice(app.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <TableRow className="bg-muted font-medium">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    paymentApplications.reduce(
                      (s, a) => s + a.amount,
                      0,
                    ),
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    paymentApplications.reduce(
                      (s, a) => s + a.retention_amount,
                      0,
                    ),
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    paymentApplications.reduce(
                      (s, a) =>
                        s +
                        (a.net_amount ??
                          a.amount - a.retention_amount),
                      0,
                    ),
                  )}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            </tfoot>
          </Table>
        )}
      </div>

      <CreateInvoiceDialog
        open={showAddInvoiceDialog}
        onOpenChange={setShowAddInvoiceDialog}
        onSubmit={onCreateInvoice}
        nextInvoiceNumber={paymentApplications.length + 1}
        billingPeriods={billingPeriods}
      />
    </div>
  );
}
