import * as React from "react";
import type { ReactElement } from "react";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
import type { PrimeContract } from "@/lib/validation/prime-contracts";

const STATUS_LABELS: Record<
  NonNullable<PrimeContract["status"]>,
  string
> = {
  draft: "Draft",
  out_for_bid: "Out for Bid",
  out_for_signature: "Out for Signature",
  approved: "Approved",
  complete: "Complete",
  terminated: "Terminated",
};

export const primeContractColumns: ColumnConfig[] = [
  { id: "contract_number", label: "Number", alwaysVisible: true },
  { id: "client_name", label: "Owner/Client", defaultVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "executed", label: "Executed", defaultVisible: true },
  { id: "original_contract_value", label: "Original Amount", defaultVisible: true },
  { id: "approved_change_orders", label: "Approved COs", defaultVisible: true },
  { id: "revised_contract_value", label: "Revised Amount", defaultVisible: true },
  { id: "pending_change_orders", label: "Pending COs", defaultVisible: true },
  { id: "draft_change_orders", label: "Draft COs", defaultVisible: true },
  { id: "invoiced_amount", label: "Invoiced", defaultVisible: true },
  { id: "payments_received", label: "Payments Received", defaultVisible: false },
  { id: "remaining_balance", label: "Remaining Balance", defaultVisible: false },
  { id: "start_date", label: "Start Date", defaultVisible: false },
  { id: "end_date", label: "End Date", defaultVisible: false },
];

export const primeContractFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: Object.entries(STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  },
];

export const primeContractDefaultVisibleColumns = primeContractColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

export function formatCurrency(value: number | null | undefined): string {
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

function sortValueForDate(value: string | null | undefined): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function buildPrimeContractTableColumns(): TableColumn<PrimeContract>[] {
  return [
    {
      ...primeContractColumns[0],
      render: (item) => <span className="font-medium">{item.contract_number ?? "-"}</span>,
      csvValue: (item) => item.contract_number ?? "",
      sortValue: (item) => item.contract_number ?? "",
    },
    {
      ...primeContractColumns[1],
      render: (item) => (
        <span className="text-muted-foreground">{item.client?.name ?? "-"}</span>
      ),
      csvValue: (item) => item.client?.name ?? "",
      sortValue: (item) => item.client?.name ?? "",
    },
    {
      ...primeContractColumns[2],
      render: (item) => <span>{item.title ?? "-"}</span>,
      csvValue: (item) => item.title ?? "",
      sortValue: (item) => item.title ?? "",
    },
    {
      ...primeContractColumns[3],
      render: (item) =>
        item.status ? (
          <StatusBadge status={STATUS_LABELS[item.status]} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      csvValue: (item) => (item.status ? STATUS_LABELS[item.status] : ""),
      sortValue: (item) => item.status ?? "",
    },
    {
      ...primeContractColumns[4],
      render: (item) => <span>{item.executed ? "Yes" : "No"}</span>,
      csvValue: (item) => (item.executed ? "Yes" : "No"),
      sortValue: (item) => (item.executed ? 1 : 0),
    },
    {
      ...primeContractColumns[5],
      render: (item) => <span>{formatCurrency(item.original_contract_value)}</span>,
      csvValue: (item) => String(item.original_contract_value ?? ""),
      sortValue: (item) => item.original_contract_value ?? 0,
    },
    {
      ...primeContractColumns[6],
      render: (item) => <span>{formatCurrency(item.approved_change_orders)}</span>,
      csvValue: (item) => String(item.approved_change_orders ?? ""),
      sortValue: (item) => item.approved_change_orders ?? 0,
    },
    {
      ...primeContractColumns[7],
      render: (item) => <span>{formatCurrency(item.revised_contract_value)}</span>,
      csvValue: (item) => String(item.revised_contract_value ?? ""),
      sortValue: (item) => item.revised_contract_value ?? 0,
    },
    {
      ...primeContractColumns[8],
      render: (item) => <span>{formatCurrency(item.pending_change_orders)}</span>,
      csvValue: (item) => String(item.pending_change_orders ?? ""),
      sortValue: (item) => item.pending_change_orders ?? 0,
    },
    {
      ...primeContractColumns[9],
      render: (item) => <span>{formatCurrency(item.draft_change_orders)}</span>,
      csvValue: (item) => String(item.draft_change_orders ?? ""),
      sortValue: (item) => item.draft_change_orders ?? 0,
    },
    {
      ...primeContractColumns[10],
      render: (item) => <span>{formatCurrency(item.invoiced_amount)}</span>,
      csvValue: (item) => String(item.invoiced_amount ?? ""),
      sortValue: (item) => item.invoiced_amount ?? 0,
    },
    {
      ...primeContractColumns[11],
      render: (item) => <span>{formatCurrency(item.payments_received)}</span>,
      csvValue: (item) => String(item.payments_received ?? ""),
      sortValue: (item) => item.payments_received ?? 0,
    },
    {
      ...primeContractColumns[12],
      render: (item) => <span>{formatCurrency(item.remaining_balance)}</span>,
      csvValue: (item) => String(item.remaining_balance ?? ""),
      sortValue: (item) => item.remaining_balance ?? 0,
    },
    {
      ...primeContractColumns[13],
      render: (item) => <span>{formatDate(item.start_date)}</span>,
      csvValue: (item) => item.start_date ?? "",
      sortValue: (item) => sortValueForDate(item.start_date),
    },
    {
      ...primeContractColumns[14],
      render: (item) => <span>{formatDate(item.end_date)}</span>,
      csvValue: (item) => item.end_date ?? "",
      sortValue: (item) => sortValueForDate(item.end_date),
    },
  ];
}

export function renderPrimeContractRowActions(
  item: PrimeContract,
  onEdit: (contract: PrimeContract) => void,
  onDelete: (contract: PrimeContract) => void,
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

export function renderPrimeContractCard(
  item: PrimeContract,
  onClick: (contract: PrimeContract) => void,
): ReactElement {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{item.contract_number ?? "-"}</p>
          <h3 className="font-medium">{item.title ?? "Untitled Contract"}</h3>
        </div>
        {item.status ? (
          <StatusBadge status={STATUS_LABELS[item.status]} />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{item.client?.name ?? "Owner"}</p>
      <p className="text-sm text-muted-foreground mt-2">
        Revised: {formatCurrency(item.revised_contract_value)}
      </p>
    </div>
  );
}

export interface PccoSummary {
  id: number;
  pcco_number: string | null;
  title: string | null;
  status: string | null;
  total_amount: number | null;
}

export interface ListChangeOrderData {
  isExpanded: boolean;
  onToggle: (id: string) => void;
  loading: boolean;
  data: PccoSummary[];
}

export function renderPrimeContractList(
  item: PrimeContract,
  onClick: (contract: PrimeContract) => void,
  changeOrderData?: ListChangeOrderData,
): ReactElement {
  const formatCur = (v: number | null) =>
    v == null
      ? "—"
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="rounded-md">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-2 transition-colors hover:bg-muted/50"
        onClick={() => onClick(item)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{item.contract_number ?? "-"}</p>
          <p className="truncate text-xs text-muted-foreground">{item.title ?? "Untitled Contract"}</p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {item.status ? (
            <StatusBadge status={STATUS_LABELS[item.status]} />
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
          {changeOrderData && (
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                changeOrderData.onToggle(item.id);
              }}
              aria-label={changeOrderData.isExpanded ? "Collapse change orders" : "Expand change orders"}
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform duration-150", changeOrderData.isExpanded && "rotate-180")}
              />
            </button>
          )}
        </div>
      </div>
      {changeOrderData?.isExpanded && (
        <div className="px-4 pb-3 pt-1">
          {changeOrderData.loading ? (
            <p className="text-xs text-muted-foreground">Loading change orders...</p>
          ) : changeOrderData.data.length === 0 ? (
            <p className="text-xs text-muted-foreground">No change orders</p>
          ) : (
            <div className="space-y-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Change Orders ({changeOrderData.data.length})
              </p>
              {changeOrderData.data.map((co) => (
                <div
                  key={co.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium">{co.pcco_number || "—"}</span>
                    <span className="ml-2 text-xs text-muted-foreground line-clamp-1">{co.title || "—"}</span>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <StatusBadge status={co.status || "Unknown"} />
                    <span className="text-xs tabular-nums text-muted-foreground">{formatCur(co.total_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
