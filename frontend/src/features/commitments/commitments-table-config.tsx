import * as React from "react";
import type { ReactElement } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import type { CommitmentListItem } from "@/lib/validation/commitments";

export const commitmentColumns: ColumnConfig[] = [
  { id: "number", label: "Number", alwaysVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "erp_status", label: "ERP Status", defaultVisible: false },
  { id: "ssov_status", label: "SSOV Status", defaultVisible: false },
  { id: "original_amount", label: "Original Amount", defaultVisible: true },
  { id: "approved_change_orders", label: "Approved COs", defaultVisible: false },
  { id: "pending_change_orders", label: "Pending COs", defaultVisible: false },
  { id: "draft_change_orders", label: "Draft COs", defaultVisible: false },
  { id: "revised_contract_amount", label: "Revised Amount", defaultVisible: true },
  { id: "invoiced_amount", label: "Invoiced", defaultVisible: false },
  { id: "billed_to_date", label: "Billed to Date", defaultVisible: true },
  { id: "payments_issued", label: "Payments Issued", defaultVisible: false },
  { id: "percent_paid", label: "% Paid", defaultVisible: false },
  { id: "remaining_balance", label: "Remaining Balance", defaultVisible: false },
  { id: "balance_to_finish", label: "Balance to Finish", defaultVisible: true },
  { id: "executed", label: "Executed", defaultVisible: false },
  { id: "is_private", label: "Private", defaultVisible: false },
  { id: "created_at", label: "Created", defaultVisible: false },
];

export const commitmentFilters: FilterConfig[] = [
  {
    id: "type",
    label: "Type",
    type: "select",
    options: [
      { value: "subcontract", label: "Subcontract" },
      { value: "purchase_order", label: "Purchase Order" },
    ],
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "out_for_signature", label: "Out for Signature" },
      { value: "executed", label: "Executed" },
      { value: "complete", label: "Complete" },
      { value: "terminated", label: "Terminated" },
    ],
  },
];

export const commitmentDefaultVisibleColumns = commitmentColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

// Converts snake_case DB values to display strings that StatusBadge can look up.
// e.g., "out_for_signature" → "out for signature"
function statusLabel(status: string | null | undefined): string {
  if (!status) return "-";
  return status.replace(/_/g, " ");
}

function typeVariant(type: string | null | undefined): "default" | "secondary" | "outline" {
  switch (type) {
    case "subcontract":
      return "default";
    case "purchase_order":
      return "secondary";
    default:
      return "outline";
  }
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export type CommitmentInlineEditableField = "number" | "title";

interface BuildCommitmentTableColumnsOptions {
  onInlineEdit?: (
    item: CommitmentListItem,
    field: CommitmentInlineEditableField,
    value: string,
  ) => Promise<void> | void;
}

export function buildCommitmentTableColumns(
  options?: BuildCommitmentTableColumnsOptions,
): TableColumn<CommitmentListItem>[] {
  return [
    {
      ...commitmentColumns[0],
      render: (item) => <span className="font-medium">{item.number}</span>,
      csvValue: (item) => item.number,
      sortValue: (item) => item.number,
      editable: Boolean(options?.onInlineEdit),
      editValue: (item) => item.number,
      onEdit: options?.onInlineEdit
        ? (item, value) => options.onInlineEdit?.(item, "number", value)
        : undefined,
    },
    {
      ...commitmentColumns[1],
      render: (item) => <span>{item.title ?? "-"}</span>,
      csvValue: (item) => item.title ?? "",
      sortValue: (item) => item.title ?? "",
      editable: Boolean(options?.onInlineEdit),
      editValue: (item) => item.title ?? "",
      onEdit: options?.onInlineEdit
        ? (item, value) => options.onInlineEdit?.(item, "title", value)
        : undefined,
    },
    {
      ...commitmentColumns[2],
      render: (item) => (
        <Badge variant={typeVariant(item.type)}>
          {item.type.replace(/_/g, " ")}
        </Badge>
      ),
      csvValue: (item) => item.type,
      sortValue: (item) => item.type,
    },
    {
      ...commitmentColumns[3],
      render: (item) => <StatusBadge status={statusLabel(item.status)} />,
      csvValue: (item) => item.status,
      sortValue: (item) => item.status,
    },
    {
      ...commitmentColumns[4],
      render: (item) => <span>{item.erp_status ?? "-"}</span>,
      csvValue: (item) => item.erp_status ?? "",
      sortValue: (item) => item.erp_status ?? "",
    },
    {
      ...commitmentColumns[5],
      render: (item) => <span>{item.ssov_status ?? "-"}</span>,
      csvValue: (item) => item.ssov_status ?? "",
      sortValue: (item) => item.ssov_status ?? "",
    },
    {
      ...commitmentColumns[6],
      render: (item) => <span>{formatCurrency(item.original_amount)}</span>,
      csvValue: (item) => String(item.original_amount),
      sortValue: (item) => item.original_amount,
    },
    {
      ...commitmentColumns[7],
      render: (item) => <span>{formatCurrency(item.approved_change_orders)}</span>,
      csvValue: (item) => String(item.approved_change_orders),
      sortValue: (item) => item.approved_change_orders,
    },
    {
      ...commitmentColumns[8],
      render: (item) => <span>{formatCurrency(item.pending_change_orders)}</span>,
      csvValue: (item) => String(item.pending_change_orders),
      sortValue: (item) => item.pending_change_orders,
    },
    {
      ...commitmentColumns[9],
      render: (item) => <span>{formatCurrency(item.draft_change_orders)}</span>,
      csvValue: (item) => String(item.draft_change_orders),
      sortValue: (item) => item.draft_change_orders,
    },
    {
      ...commitmentColumns[10],
      render: (item) => <span>{formatCurrency(item.revised_contract_amount)}</span>,
      csvValue: (item) => String(item.revised_contract_amount),
      sortValue: (item) => item.revised_contract_amount,
    },
    {
      ...commitmentColumns[11],
      render: (item) => <span>{formatCurrency(item.invoiced_amount)}</span>,
      csvValue: (item) => String(item.invoiced_amount),
      sortValue: (item) => item.invoiced_amount,
    },
    {
      ...commitmentColumns[12],
      render: (item) => <span>{formatCurrency(item.billed_to_date)}</span>,
      csvValue: (item) => String(item.billed_to_date),
      sortValue: (item) => item.billed_to_date,
    },
    {
      ...commitmentColumns[13],
      render: (item) => <span>{formatCurrency(item.payments_issued)}</span>,
      csvValue: (item) => String(item.payments_issued),
      sortValue: (item) => item.payments_issued,
    },
    {
      ...commitmentColumns[14],
      render: (item) => <span>{item.percent_paid.toFixed(0)}%</span>,
      csvValue: (item) => String(item.percent_paid),
      sortValue: (item) => item.percent_paid,
    },
    {
      ...commitmentColumns[15],
      render: (item) => <span>{formatCurrency(item.remaining_balance)}</span>,
      csvValue: (item) => String(item.remaining_balance),
      sortValue: (item) => item.remaining_balance,
    },
    {
      ...commitmentColumns[16],
      render: (item) => <span>{formatCurrency(item.balance_to_finish)}</span>,
      csvValue: (item) => String(item.balance_to_finish),
      sortValue: (item) => item.balance_to_finish,
    },
    {
      ...commitmentColumns[17],
      render: (item) => <span>{yesNo(item.executed)}</span>,
      csvValue: (item) => yesNo(item.executed),
      sortValue: (item) => (item.executed ? 1 : 0),
    },
    {
      ...commitmentColumns[18],
      render: (item) => <span>{yesNo(item.is_private)}</span>,
      csvValue: (item) => yesNo(item.is_private),
      sortValue: (item) => (item.is_private ? 1 : 0),
    },
    {
      ...commitmentColumns[19],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      csvValue: (item) => item.created_at,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

export function renderCommitmentRowActions(
  item: CommitmentListItem,
  onEdit: (commitment: CommitmentListItem) => void,
  onDelete: (commitment: CommitmentListItem) => void,
): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(item)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => onDelete(item)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function renderCommitmentCard(
  item: CommitmentListItem,
  onClick: (commitment: CommitmentListItem) => void,
): ReactElement {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{item.number}</p>
          <h3 className="font-medium">{item.title ?? "Untitled Commitment"}</h3>
        </div>
        <StatusBadge status={statusLabel(item.status)} />
      </div>
      <p className="text-sm text-muted-foreground">{item.contract_company?.name ?? "-"}</p>
      <p className="text-sm text-muted-foreground mt-2">
        Revised: {formatCurrency(item.revised_contract_amount)}
      </p>
    </div>
  );
}

export function renderCommitmentList(
  item: CommitmentListItem,
  onClick: (commitment: CommitmentListItem) => void,
): ReactElement {
  return (
    <div
      className="flex items-center justify-between py-2 px-4 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">{item.number}</p>
        <p className="text-xs text-muted-foreground">{item.title ?? "Untitled"}</p>
      </div>
      <StatusBadge status={statusLabel(item.status)} />
    </div>
  );
}
