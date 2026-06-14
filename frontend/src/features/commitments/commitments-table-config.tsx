import * as React from "react";
import type { ReactElement } from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal, Trash2 } from "lucide-react";

import { formatDate } from "@/lib/format";

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
  { id: "contract_company", label: "Company", defaultVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "original_amount", label: "Original Amount", defaultVisible: true },
  { id: "trade_names", label: "Division", defaultVisible: true },
  { id: "cost_codes", label: "Cost Code", defaultVisible: true },
  { id: "scope_summary", label: "Description", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "approved_change_orders", label: "Approved COs", defaultVisible: true },
  { id: "remaining_balance", label: "Invoice Balance", defaultVisible: true },
  { id: "executed", label: "Executed", defaultVisible: true },
  { id: "acumatica_link", label: "Acumatica", defaultVisible: true },
  { id: "erp_status", label: "ERP Status", defaultVisible: true },
  { id: "ssov_status", label: "SOV Status", defaultVisible: true },
  { id: "pending_change_orders", label: "Pending COs", defaultVisible: true },
  { id: "draft_change_orders", label: "Drafts", defaultVisible: true },
  { id: "revised_contract_amount", label: "COs", defaultVisible: true },
  { id: "payments_issued", label: "Payments", defaultVisible: true },
  { id: "invoiced_amount", label: "Issued", defaultVisible: true },
  { id: "percent_paid", label: "Percent Paid", defaultVisible: true },
  { id: "is_private", label: "Private", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: true },
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
      { value: "Draft", label: "Draft" },
      { value: "Out for Bid", label: "Out for Bid" },
      { value: "Out for Signature", label: "Out for Signature" },
      { value: "Approved", label: "Approved" },
      { value: "Complete", label: "Complete" },
      { value: "Terminated", label: "Terminated" },
    ],
  },
  {
    id: "contract_company_name",
    label: "Company",
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

// Converts snake_case DB values to display strings that StatusBadge can look up.
// e.g., "out_for_signature" → "out for signature"
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  "out for bid": "Out for Bid",
  "out for signature": "Out for Signature",
  approved: "Approved",
  complete: "Complete",
  terminated: "Terminated",
};

const ERP_STATUS_LABELS: Record<string, string> = {
  synced: "Synced",
  not_synced: "Not Synced",
  sync_error: "Sync Error",
  pending: "Pending",
  failed: "Failed",
  resyncing: "Resyncing",
};

function statusLabel(status: string | null | undefined): string {
  if (!status) return "-";
  return STATUS_LABELS[status.toLowerCase()] ?? status.replace(/_/g, " ");
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

const ACUMATICA_BASE_URL = "https://alleatogroup.acumatica.com";

/**
 * Build the Acumatica deep link for a commitment. Subcontracts (number prefixed
 * "SC-") open on the Subcontracts screen; purchase orders open on the Purchase
 * Orders screen. The commitment `number` is the Acumatica reference number.
 */
function acumaticaCommitmentUrl(
  number: string | null | undefined,
  type: string | null | undefined,
): string | null {
  if (!number) return null;
  if (type === "purchase_order") {
    return `${ACUMATICA_BASE_URL}/Main?ScreenId=PO301000&OrderType=RO&OrderNbr=${encodeURIComponent(number)}`;
  }
  return `${ACUMATICA_BASE_URL}/Main?ScreenId=SC301000&SubcontractNbr=${encodeURIComponent(number)}`;
}

export type CommitmentInlineField = "title" | "description" | "executed";

export function buildCommitmentTableColumns(
  projectId: string,
  expandedIds?: Set<string>,
  onToggleExpand?: (id: string) => void,
  onStatusChange?: (id: string, status: string) => void,
  onInlineEdit?: (
    id: string,
    field: CommitmentInlineField,
    value: string | boolean,
  ) => void | Promise<void>,
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
          <Link
            href={`/${projectId}/commitments/${item.id}`}
            className="font-medium max-w-32 truncate text-primary hover:underline underline-offset-2"
            title={item.number}
            onClick={(e) => e.stopPropagation()}
          >
            {item.number}
          </Link>
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
        </div>
      ),
      csvValue: (item) => item.number,
      sortValue: (item) => item.number,
    },
    contract_company: {
      render: (item) =>
        item.contract_company?.id && item.contract_company?.name ? (
          <Link
            href={`/directory/companies/${item.contract_company.id}`}
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {item.contract_company.name}
          </Link>
        ) : (
          <span>{item.contract_company?.name ?? "-"}</span>
        ),
      csvValue: (item) => item.contract_company?.name ?? "",
      sortValue: (item) => item.contract_company?.name ?? "",
    },
    trade_names: {
      render: (item) => {
        const value = item.trade_names.length > 0 ? item.trade_names.join(", ") : "-";
        return (
          <span className="block max-w-48 truncate text-sm text-muted-foreground" title={value}>
            {value}
          </span>
        );
      },
      csvValue: (item) => item.trade_names.join(", "),
      sortValue: (item) => item.trade_names.join(", "),
    },
    cost_codes: {
      render: (item) => {
        const value = item.cost_codes.length > 0 ? item.cost_codes.join(", ") : "-";
        return (
          <span className="block max-w-40 truncate text-sm text-muted-foreground" title={value}>
            {value}
          </span>
        );
      },
      csvValue: (item) => item.cost_codes.join(", "),
      sortValue: (item) => item.cost_codes.join(", "),
    },
    scope_summary: {
      render: (item) => (
        <span
          className="block max-w-72 truncate text-sm text-muted-foreground"
          title={item.scope_summary ?? ""}
        >
          {item.scope_summary ?? "-"}
        </span>
      ),
      csvValue: (item) => item.scope_summary ?? "",
      sortValue: (item) => item.scope_summary ?? "",
      ...(onInlineEdit
        ? {
            editable: true,
            editInputType: "text",
            editValue: (item) => item.scope_summary ?? "",
            onEdit: (item, value) => onInlineEdit(item.id, "description", value),
          }
        : {}),
    },
    title: {
      render: (item) => (
        <span className="font-medium text-foreground">{item.title ?? "-"}</span>
      ),
      csvValue: (item) => [item.number, item.title].filter(Boolean).join(" "),
      sortValue: (item) => item.title ?? "",
      ...(onInlineEdit
        ? {
            editable: true,
            editInputType: "text",
            editValue: (item) => item.title ?? "",
            onEdit: (item, value) => onInlineEdit(item.id, "title", value),
          }
        : {}),
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
    erp_status: {
      render: (item) => {
        const label = item.erp_status
          ? (ERP_STATUS_LABELS[item.erp_status.toLowerCase()] ?? item.erp_status)
          : null;
        return label ? <StatusBadge status={label} /> : <span className="text-muted-foreground">—</span>;
      },
      csvValue: (item) => item.erp_status ?? "",
      sortValue: (item) => item.erp_status ?? "",
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
      ...(onInlineEdit
        ? {
            editable: true,
            editType: "boolean" as const,
            editValue: (item) => (item.executed ? "true" : "false"),
            onEdit: (item, value) =>
              onInlineEdit(item.id, "executed", value === "true"),
          }
        : {}),
    },
    acumatica_link: {
      render: (item) => {
        const url = acumaticaCommitmentUrl(item.number, item.type);
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-primary hover:underline"
            title={`Open ${item.number} in Acumatica`}
          >
            View
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      csvValue: (item) => acumaticaCommitmentUrl(item.number, item.type) ?? "",
      sortValue: (item) => item.number,
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
      className="bg-card rounded-md p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{item.number}</p>
          <p className="font-medium">{item.title ?? "Untitled Commitment"}</p>
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
