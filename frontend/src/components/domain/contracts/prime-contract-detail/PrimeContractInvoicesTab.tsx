"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StatusBadge } from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { DataTable, type DataTableFooterCell } from "@/components/tables/DataTable";
import type { OwnerInvoiceSummary, PaymentApplication, Contract } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";
import { formatDate, formatPercent } from "@/lib/format";

interface PrimeContractInvoicesTabProps {
  projectId: string;
  contractId: string;
  contract: Contract;
  paymentApplications: PaymentApplication[];
  ownerInvoices: OwnerInvoiceSummary[];
  paymentsLoading: boolean;
  ownerInvoicesLoading: boolean;
  onDeleteInvoice: (applicationId: string) => Promise<void>;
  formatCurrency: (value: number | null | undefined) => string;
}

type InvoiceRow =
  | { source: "payment_application"; paymentApplication: PaymentApplication }
  | { source: "owner_invoice"; ownerInvoice: OwnerInvoiceSummary };

function buildAcumaticaInvoiceHref(docType: string | null | undefined, refNbr: string): string {
  return `https://alleatogroup.acumatica.com/Main?ScreenId=AR301000&DocType=${encodeURIComponent(docType ?? "Invoice")}&RefNbr=${encodeURIComponent(refNbr)}`;
}

function getOwnerInvoiceAmount(invoice: OwnerInvoiceSummary): number {
  const candidates = [
    invoice.gross_amount,
    invoice.total_amount,
    invoice.net_amount,
    invoice.paid_amount,
  ];
  return candidates.find((value) => value !== null && value !== undefined && Number(value) > 0) ?? 0;
}

export function PrimeContractInvoicesTab({
  projectId,
  contractId,
  contract,
  paymentApplications,
  ownerInvoices,
  paymentsLoading,
  ownerInvoicesLoading,
  onDeleteInvoice,
  formatCurrency,
}: PrimeContractInvoicesTabProps) {
  const router = useRouter();
  const invoiceRows = useMemo<InvoiceRow[]>(
    () => [
      ...paymentApplications.map((paymentApplication) => ({
        source: "payment_application" as const,
        paymentApplication,
      })),
      ...ownerInvoices
        .filter((invoice) => !invoice.payment_application_id)
        .map((ownerInvoice) => ({
          source: "owner_invoice" as const,
          ownerInvoice,
        })),
    ],
    [ownerInvoices, paymentApplications],
  );
  const invoicedRows = useMemo(
    () =>
      invoiceRows.filter((row) =>
        row.source === "payment_application"
          ? row.paymentApplication.status === "approved"
          : ["approved", "paid"].includes(row.ownerInvoice.status),
      ),
    [invoiceRows],
  );
  const totalAmount = useMemo(
    () =>
      invoicedRows.reduce(
        (sum, row) =>
          sum +
          (row.source === "payment_application"
            ? row.paymentApplication.amount
            : getOwnerInvoiceAmount(row.ownerInvoice)),
        0,
      ),
    [invoicedRows],
  );
  const totalRetainage = useMemo(
    () =>
      invoicedRows.reduce(
        (sum, row) =>
          sum +
          (row.source === "payment_application"
            ? row.paymentApplication.retention_amount
            : (row.ownerInvoice.retention_amount ?? 0)),
        0,
      ),
    [invoicedRows],
  );
  const totalPaymentDue = useMemo(
    () =>
      invoicedRows.reduce(
        (sum, row) =>
          sum +
          (row.source === "payment_application"
            ? (row.paymentApplication.net_amount ?? row.paymentApplication.amount - row.paymentApplication.retention_amount)
            : (row.ownerInvoice.net_amount ?? row.ownerInvoice.total_amount ?? getOwnerInvoiceAmount(row.ownerInvoice))),
        0,
      ),
    [invoicedRows],
  );

  const columns: ColumnDef<InvoiceRow>[] = useMemo(
    () => [
      {
        header: "Invoice #",
        cell: ({ row }) => {
          const label =
            row.original.source === "payment_application"
              ? row.original.paymentApplication.application_number
              : row.original.ownerInvoice.invoice_number ?? `INV-${row.original.ownerInvoice.id}`;
          return <div className="font-medium text-primary">{label}</div>;
        },
      },
      {
        id: "billing_period",
        header: "Billing Period",
        cell: ({ row }) => {
          const periodFrom =
            row.original.source === "payment_application"
              ? row.original.paymentApplication.period_from
              : row.original.ownerInvoice.period_start;
          const periodTo =
            row.original.source === "payment_application"
              ? row.original.paymentApplication.period_to
              : row.original.ownerInvoice.period_end;
          return (
            <div className="text-sm text-muted-foreground">
              {periodFrom && periodTo
                ? `${formatDate(periodFrom)} - ${formatDate(periodTo)}`
                : periodFrom
                  ? `From ${formatDate(periodFrom)}`
                  : "--"}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status =
            row.original.source === "payment_application"
              ? row.original.paymentApplication.status
              : row.original.ownerInvoice.status;
          return <StatusBadge status={status.replace(/_/g, " ")} />;
        },
      },
      {
        id: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => {
          const amount =
            row.original.source === "payment_application"
              ? row.original.paymentApplication.amount
              : getOwnerInvoiceAmount(row.original.ownerInvoice);
          return <div className="text-right">{formatCurrency(amount)}</div>;
        },
      },
      {
        id: "retention_amount",
        header: () => <div className="text-right">Retainage</div>,
        cell: ({ row }) => {
          const retainage =
            row.original.source === "payment_application"
              ? row.original.paymentApplication.retention_amount
              : row.original.ownerInvoice.retention_amount;
          return (
            <div className="text-right text-muted-foreground">
              {retainage && retainage > 0 ? formatCurrency(retainage) : "--"}
            </div>
          );
        },
      },
      {
        id: "payment_due",
        header: () => <div className="text-right">Payment Due</div>,
        cell: ({ row }) => {
          const paymentDue =
            row.original.source === "payment_application"
              ? row.original.paymentApplication.net_amount ??
                row.original.paymentApplication.amount - row.original.paymentApplication.retention_amount
              : row.original.ownerInvoice.net_amount ??
                row.original.ownerInvoice.total_amount ??
                getOwnerInvoiceAmount(row.original.ownerInvoice);
          return <div className="text-right">{formatCurrency(paymentDue)}</div>;
        },
      },
      {
        id: "percent_complete",
        header: () => <div className="text-right">% Complete</div>,
        cell: ({ row }) => {
          const amount =
            row.original.source === "payment_application"
              ? row.original.paymentApplication.amount
              : getOwnerInvoiceAmount(row.original.ownerInvoice);
          const percent =
            row.original.source === "owner_invoice"
              ? row.original.ownerInvoice.percent_complete
              : null;
          return (
            <div className="text-right">
              {percent !== null && percent !== undefined
                ? formatPercent(percent)
                : contract.revised_contract_value > 0
                  ? formatPercent((amount / contract.revised_contract_value) * 100)
                  : "--"}
            </div>
          );
        },
      },
      {
        id: "acumatica_ref",
        header: "Acumatica",
        cell: ({ row }) => {
          if (row.original.source === "payment_application") {
            return <span className="text-sm text-muted-foreground">--</span>;
          }
          const refNbr = row.original.ownerInvoice.acumatica_ref_nbr;
          if (!refNbr) return <span className="text-sm text-muted-foreground">--</span>;
          return (
            <a
              href={buildAcumaticaInvoiceHref(row.original.ownerInvoice.acumatica_doc_type, refNbr)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {refNbr}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const original = row.original;
          return (
            <div className="flex justify-end">
              {original.source === "payment_application" ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  void onDeleteInvoice(original.paymentApplication.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [contract.revised_contract_value, formatCurrency, onDeleteInvoice],
  );

  const footerRow = useMemo<DataTableFooterCell[]>(
    () => [
      { value: "Approved total", colSpan: 3, align: "left" },
      { value: formatCurrency(totalAmount) },
      { value: formatCurrency(totalRetainage) },
      { value: formatCurrency(totalPaymentDue) },
      { value: "" },
      { value: "", colSpan: 2 },
    ],
    [formatCurrency, totalAmount, totalPaymentDue, totalRetainage],
  );

  const createButton = (
    <Button
      size="sm"
      disabled={contract.status !== "approved"}
      onClick={() =>
        router.push(
          `/${projectId}/prime-contracts/${contractId}/invoices/new`,
        )
      }
    >
      <Plus />
      Create Invoice
    </Button>
  );

  const isLoading = paymentsLoading || ownerInvoicesLoading;

  return (
    <div>
      <div className="bg-background">
        <div className="flex items-center justify-between">
          <SectionRuleHeading
            label={`Invoices (${invoiceRows.length})`}
            className="flex-1"
          />
          {invoiceRows.length > 0 && createButton}
        </div>
        {invoiceRows.length > 0 ? (
          <p className="text-sm text-muted-foreground -mt-3 mb-4">
            Total invoiced:{" "}
            {formatCurrency(totalAmount)}
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : invoiceRows.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No invoices yet"
            description="Create an invoice or sync AR invoices from Acumatica."
            action={createButton}
          />
        ) : (
          <DataTable
            columns={columns}
            data={invoiceRows}
            showToolbar={false}
            showPagination={invoiceRows.length > 25}
            onRowClick={(row) =>
              row.source === "payment_application"
                ? router.push(`/${projectId}/prime-contracts/${contractId}/invoices/${row.paymentApplication.id}`)
                : router.push(`/${projectId}/invoicing/${row.ownerInvoice.id}`)
            }
            footerRow={footerRow}
          />
        )}
      </div>
    </div>
  );
}
