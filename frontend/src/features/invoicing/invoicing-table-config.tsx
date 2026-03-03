import * as React from "react";
import type { ReactElement } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// =============================================================================
// Types
// =============================================================================

export interface OwnerInvoice {
  id: number;
  contract_id: number;
  invoice_number: string | null;
  period_start: string | null;
  period_end: string | null;
  status: "draft" | "submitted" | "approved" | "paid" | "void";
  billing_period_id: number | null;
  created_at: string;
  updated_at: string;
  total_amount?: number;
}

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";

function statusVariant(status: string | null | undefined): BadgeVariant {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
      return "success";
    case "paid":
      return "success";
    case "submitted":
      return "secondary";
    case "void":
      return "destructive";
    case "draft":
    default:
      return "outline";
  }
}

function statusLabel(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "draft": return "Draft";
    case "submitted": return "Submitted";
    case "approved": return "Approved";
    case "paid": return "Paid";
    case "void": return "Void";
    default: return status || "—";
  }
}

// =============================================================================
// Column Config (for column toggle visibility)
// =============================================================================

export const invoiceColumns: ColumnConfig[] = [
  { id: "invoice_number", label: "Invoice #", alwaysVisible: true },
  { id: "contract_id", label: "Contract", defaultVisible: true },
  { id: "billing_period", label: "Billing Period", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "total_amount", label: "Amount", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: false },
];

export const invoiceDefaultVisibleColumns = invoiceColumns
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

// =============================================================================
// Filter Config
// =============================================================================

export const invoiceFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "submitted", label: "Submitted" },
      { value: "approved", label: "Approved" },
      { value: "paid", label: "Paid" },
      { value: "void", label: "Void" },
    ],
  },
];

// =============================================================================
// Table Columns (UnifiedTablePage format)
// =============================================================================

export function buildInvoiceTableColumns(
  onView: (invoice: OwnerInvoice) => void,
  onEdit: (invoice: OwnerInvoice) => void,
): TableColumn<OwnerInvoice>[] {
  return [
    {
      id: "invoice_number",
      label: "Invoice #",
      alwaysVisible: true,
      render: (invoice) => (
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => onView(invoice)}
        >
          {invoice.invoice_number || `INV-${invoice.id}`}
        </button>
      ),
    },
    {
      id: "contract_id",
      label: "Contract",
      defaultVisible: true,
      render: (invoice) => (
        <span className="text-muted-foreground text-sm">
          Contract #{invoice.contract_id}
        </span>
      ),
    },
    {
      id: "billing_period",
      label: "Billing Period",
      defaultVisible: true,
      render: (invoice) => {
        const start = invoice.period_start;
        const end = invoice.period_end;
        if (!start && !end) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm">
            {formatDate(start)} – {formatDate(end)}
          </span>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      render: (invoice) => (
        <Badge variant={statusVariant(invoice.status)}>
          {statusLabel(invoice.status)}
        </Badge>
      ),
    },
    {
      id: "total_amount",
      label: "Amount",
      defaultVisible: true,
      render: (invoice) => (
        <span className="font-medium tabular-nums">
          {formatCurrency(invoice.total_amount)}
        </span>
      ),
      sortable: true,
      sortValue: (invoice) => invoice.total_amount ?? 0,
    },
    {
      id: "created_at",
      label: "Created",
      defaultVisible: false,
      render: (invoice) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(invoice.created_at)}
        </span>
      ),
      sortable: true,
      sortValue: (invoice) => invoice.created_at,
    },
  ];
}

// =============================================================================
// Row Actions
// =============================================================================

export function renderInvoiceRowActions(
  invoice: OwnerInvoice,
  onView: (invoice: OwnerInvoice) => void,
  onEdit: (invoice: OwnerInvoice) => void,
  onDelete: (invoice: OwnerInvoice) => void,
): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(invoice)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(invoice)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(invoice)}
          disabled={invoice.status === "approved" || invoice.status === "paid"}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Card View Renderer
// =============================================================================

export function renderInvoiceCard(invoice: OwnerInvoice): ReactElement {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">
            {invoice.invoice_number || `INV-${invoice.id}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Contract #{invoice.contract_id}
          </p>
        </div>
        <Badge variant={statusVariant(invoice.status)}>
          {statusLabel(invoice.status)}
        </Badge>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(invoice.total_amount)}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// List View Renderer
// =============================================================================

export function renderInvoiceList(invoice: OwnerInvoice): ReactElement {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-medium text-sm">
            {invoice.invoice_number || `INV-${invoice.id}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Contract #{invoice.contract_id}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant={statusVariant(invoice.status)}>
          {statusLabel(invoice.status)}
        </Badge>
        <span className="text-sm font-medium tabular-nums w-24 text-right">
          {formatCurrency(invoice.total_amount)}
        </span>
      </div>
    </div>
  );
}
