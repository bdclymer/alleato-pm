"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  UnifiedTablePage,
  type TableColumn,
  type ViewMode,
} from "@/components/tables/unified";
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentView, setCurrentView] = React.useState<ViewMode>("table");

  const total = React.useMemo(
    () =>
      payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [payments],
  );

  const filteredPayments = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return payments;

    return payments.filter((payment) => {
      const searchable = [
        payment.payment_number ?? `PMT-${payment.id}`,
        payment.invoice_number,
        payment.invoice_type,
        payment.payment_method,
        payment.check_number,
        payment.payment_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [payments, searchQuery]);

  const columns = React.useMemo<TableColumn<InvoicePayment>[]>(
    () => [
      {
        id: "payment_number",
        label: "Payment #",
        alwaysVisible: true,
        sortable: true,
        sortValue: (payment) => payment.payment_number ?? `PMT-${payment.id}`,
        render: (payment) => (
          <span className="font-medium">
            {payment.payment_number ?? `PMT-${payment.id}`}
          </span>
        ),
        csvValue: (payment) => payment.payment_number ?? `PMT-${payment.id}`,
        width: 140,
      },
      {
        id: "invoice_number",
        label: "Invoice",
        defaultVisible: true,
        sortable: true,
        sortValue: (payment) => payment.invoice_number ?? "",
        render: (payment) => payment.invoice_number ?? "--",
        csvValue: (payment) => payment.invoice_number ?? "",
        width: 140,
      },
      {
        id: "source",
        label: "Source",
        defaultVisible: true,
        sortable: true,
        sortValue: (payment) => payment.invoice_type ?? "",
        render: (payment) =>
          payment.invoice_type ? (
            <Badge variant="secondary">{paymentSourceLabel(payment)}</Badge>
          ) : (
            <span className="text-muted-foreground">--</span>
          ),
        csvValue: paymentSourceLabel,
        width: 140,
      },
      {
        id: "method",
        label: "Method",
        defaultVisible: true,
        sortable: true,
        sortValue: (payment) => payment.payment_method ?? "",
        render: (payment) => (
          <span className="capitalize">
            {methodLabel(payment.payment_method)}
          </span>
        ),
        csvValue: (payment) => methodLabel(payment.payment_method),
        width: 140,
      },
      {
        id: "amount",
        label: "Amount",
        defaultVisible: true,
        sortable: true,
        sortValue: (payment) => Number(payment.amount) || 0,
        render: (payment) => (
          <span className="block text-right tabular-nums">
            {formatCurrency(payment.amount)}
          </span>
        ),
        csvValue: (payment) => String(payment.amount ?? ""),
        width: 130,
      },
      {
        id: "payment_date",
        label: "Date",
        defaultVisible: true,
        sortable: true,
        sortValue: (payment) =>
          payment.payment_date ? new Date(payment.payment_date).getTime() : 0,
        render: (payment) => formatDate(payment.payment_date),
        csvValue: (payment) => payment.payment_date ?? "",
        width: 130,
      },
      {
        id: "reference",
        label: "Reference",
        defaultVisible: true,
        sortable: true,
        sortValue: (payment) => payment.check_number ?? "",
        render: (payment) => payment.check_number ?? "--",
        csvValue: (payment) => payment.check_number ?? "",
        width: 160,
      },
    ],
    [],
  );

  return (
    <div className="px-6 py-4">
      <UnifiedTablePage
        header={{
          title: "Payments",
          description: "Payments received from Acumatica.",
          variant: "compact",
        }}
        toolbar={{
          totalItems: payments.length,
          filteredItems: filteredPayments.length,
          leftContent:
            payments.length > 0 ? (
              <span className="text-sm font-medium tabular-nums">
                Total: {formatCurrency(total)}
              </span>
            ) : undefined,
          searchValue: searchQuery,
          onSearchChange: setSearchQuery,
          searchPlaceholder: "Search payments...",
          currentView,
          onViewChange: (view) => {
            if (view === "table") setCurrentView(view);
          },
          enabledViews: ["table"],
        }}
        data={{ items: filteredPayments, isLoading, error: null }}
        table={{
          columns,
          getRowId: (payment) => String(payment.id),
          density: "compact",
          stickyHeader: true,
        }}
        emptyState={{
          title: "No payments synced yet",
          description: "Payments received from Acumatica will appear here.",
          filteredDescription: "No payments match your search.",
          isFiltered: Boolean(searchQuery),
        }}
        features={{
          enableViews: false,
          enableColumnToggle: true,
          enableExport: true,
          enablePagination: true,
          enableBulkDelete: false,
          enableRowSelection: false,
        }}
        layout={{
          containerPadding: false,
          toolbarInlineWithHeader: true,
          minWidth: 940,
        }}
      />
    </div>
  );
}
