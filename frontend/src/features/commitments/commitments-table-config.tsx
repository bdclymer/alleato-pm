import * as React from "react";
import type { ReactElement } from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  { id: "contract_company", label: "Contract Company", defaultVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "executed", label: "Executed", defaultVisible: true },
  { id: "ssov_status", label: "SSOV Status", defaultVisible: true },
  { id: "original_amount", label: "Original Contract Amount", defaultVisible: true },
  { id: "approved_change_orders", label: "Approved Change Orders", defaultVisible: true },
  { id: "revised_contract_amount", label: "Revised Contract Amount", defaultVisible: true },
  { id: "pending_change_orders", label: "Pending Change Orders", defaultVisible: true },
  { id: "draft_change_orders", label: "Draft Change Orders", defaultVisible: true },
  { id: "invoiced_amount", label: "Invoiced", defaultVisible: true },
  { id: "payments_issued", label: "Payments Issued", defaultVisible: true },
  { id: "percent_paid", label: "% Paid", defaultVisible: true },
  { id: "remaining_balance", label: "Remaining Balance Outstanding", defaultVisible: true },
  { id: "is_private", label: "Private", defaultVisible: true },
  { id: "balance_to_finish", label: "Balance to Finish", defaultVisible: false },
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
      { value: "out_for_bid", label: "Out for Bid" },
      { value: "out_for_signature", label: "Out for Signature" },
      { value: "approved", label: "Approved" },
      { value: "complete", label: "Complete" },
      { value: "terminated", label: "Terminated" },
      { value: "void", label: "Void" },
    ],
  },
  {
    id: "contract_company_name",
    label: "Contract Company",
    type: "text",
    placeholder: "Filter by company name...",
  },
  {
    id: "erp_status",
    label: "ERP Status",
    type: "select",
    options: [
      { value: "synced", label: "Synced" },
      { value: "not_synced", label: "Not Synced" },
      { value: "sync_error", label: "Sync Error" },
      { value: "pending", label: "Pending" },
    ],
  },
  {
    id: "executed",
    label: "Executed",
    type: "select",
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    id: "ssov_status",
    label: "SSOV Status",
    type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "pending_approval", label: "Pending Approval" },
      { value: "approved", label: "Approved" },
      { value: "revised", label: "Revised" },
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
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  out_for_bid: "Out for Bid",
  out_for_signature: "Out for Signature",
  approved: "Approved",
  complete: "Complete",
  terminated: "Terminated",
  void: "Void",
};

function statusLabel(status: string | null | undefined): string {
  if (!status) return "-";
  return STATUS_LABELS[status.toLowerCase()] ?? status.replace(/_/g, " ");
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export function buildCommitmentTableColumns(
  projectId: string,
  expandedIds?: Set<string>,
  onToggleExpand?: (id: string) => void,
  onStatusChange?: (id: string, status: string) => void,
): TableColumn<CommitmentListItem>[] {
  const col = (id: string) => {
    const found = commitmentColumns.find((c) => c.id === id);
    if (!found) throw new Error(`Missing commitment column: ${id}`);
    return found;
  };

  const renderers: Record<string, Omit<TableColumn<CommitmentListItem>, keyof ColumnConfig>> = {
    number: {
      render: (item) => (
        <div className="flex items-center gap-1.5">
          {onToggleExpand && (
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(item.id);
              }}
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={expandedIds?.has(item.id) ? "Collapse commitment" : "Expand commitment"}
            >
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${
                  expandedIds?.has(item.id) ? "rotate-90" : ""
                }`}
              />
            </Button>
          )}
          <span className="font-medium">{item.number}</span>
        </div>
      ),
      csvValue: (item) => item.number,
      sortValue: (item) => item.number,
    },
    contract_company: {
      render: (item) => <span>{item.contract_company?.name ?? "-"}</span>,
      csvValue: (item) => item.contract_company?.name ?? "",
      sortValue: (item) => item.contract_company?.name ?? "",
    },
    title: {
      render: (item) => (
        <Link
          href={`/${projectId}/commitments/${item.id}`}
          onClick={(event) => event.stopPropagation()}
          className="text-primary hover:underline underline-offset-2"
        >
          {item.title ?? "-"}
        </Link>
      ),
      csvValue: (item) => item.title ?? "",
      sortValue: (item) => item.title ?? "",
    },
    type: {
      render: (item) => (
        <span className="text-sm font-medium text-muted-foreground capitalize">
          {item.type.replace(/_/g, " ")}
        </span>
      ),
      csvValue: (item) => item.type,
      sortValue: (item) => item.type,
    },
    status: {
      render: (item) => {
        if (!onStatusChange) return <StatusBadge status={statusLabel(item.status)} />;
        return (
          <Select
            value={item.status ?? "draft"}
            onValueChange={(value) => onStatusChange(item.id, value)}
          >
            <SelectTrigger
              className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 focus:ring-offset-0"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue>
                <StatusBadge status={statusLabel(item.status)} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {["draft", "out_for_bid", "out_for_signature", "approved", "complete", "terminated", "void"].map((s) => (
                <SelectItem key={s} value={s}>
                  <StatusBadge status={statusLabel(s)} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      csvValue: (item) => item.status,
      sortValue: (item) => item.status,
    },
    executed: {
      render: (item) => <span>{yesNo(item.executed)}</span>,
      csvValue: (item) => yesNo(item.executed),
      sortValue: (item) => (item.executed ? 1 : 0),
    },
    ssov_status: {
      render: (item) => <span>{item.ssov_status ?? "-"}</span>,
      csvValue: (item) => item.ssov_status ?? "",
      sortValue: (item) => item.ssov_status ?? "",
    },
    original_amount: {
      render: (item) => <span>{formatCurrency(item.original_amount)}</span>,
      csvValue: (item) => String(item.original_amount),
      sortValue: (item) => item.original_amount,
    },
    approved_change_orders: {
      render: (item) => <span>{formatCurrency(item.approved_change_orders)}</span>,
      csvValue: (item) => String(item.approved_change_orders),
      sortValue: (item) => item.approved_change_orders,
    },
    revised_contract_amount: {
      render: (item) => <span>{formatCurrency(item.revised_contract_amount)}</span>,
      csvValue: (item) => String(item.revised_contract_amount),
      sortValue: (item) => item.revised_contract_amount,
    },
    pending_change_orders: {
      render: (item) => <span>{formatCurrency(item.pending_change_orders)}</span>,
      csvValue: (item) => String(item.pending_change_orders),
      sortValue: (item) => item.pending_change_orders,
    },
    draft_change_orders: {
      render: (item) => <span>{formatCurrency(item.draft_change_orders)}</span>,
      csvValue: (item) => String(item.draft_change_orders),
      sortValue: (item) => item.draft_change_orders,
    },
    invoiced_amount: {
      render: (item) => <span>{formatCurrency(item.invoiced_amount)}</span>,
      csvValue: (item) => String(item.invoiced_amount),
      sortValue: (item) => item.invoiced_amount,
    },
    payments_issued: {
      render: (item) => <span>{formatCurrency(item.payments_issued)}</span>,
      csvValue: (item) => String(item.payments_issued),
      sortValue: (item) => item.payments_issued,
    },
    percent_paid: {
      render: (item) => <span>{item.percent_paid.toFixed(0)}%</span>,
      csvValue: (item) => String(item.percent_paid),
      sortValue: (item) => item.percent_paid,
    },
    remaining_balance: {
      render: (item) => <span>{formatCurrency(item.remaining_balance)}</span>,
      csvValue: (item) => String(item.remaining_balance),
      sortValue: (item) => item.remaining_balance,
    },
    is_private: {
      render: (item) => <span>{yesNo(item.is_private)}</span>,
      csvValue: (item) => yesNo(item.is_private),
      sortValue: (item) => (item.is_private ? 1 : 0),
    },
    balance_to_finish: {
      render: (item) => <span>{formatCurrency(item.balance_to_finish)}</span>,
      csvValue: (item) => String(item.balance_to_finish),
      sortValue: (item) => item.balance_to_finish,
    },
    created_at: {
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      csvValue: (item) => item.created_at,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  };

  return commitmentColumns.map((c) => ({ ...col(c.id), ...renderers[c.id] }));
}

export function renderCommitmentRowActions(
  item: CommitmentListItem,
  onEdit: (commitment: CommitmentListItem) => void,
  onDelete: (commitment: CommitmentListItem) => void,
): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
          <MoreHorizontal />
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
