import * as React from "react";
import type { ReactElement } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Badge, StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface UnifiedChangeOrder {
  id: string | number;
  contractType: "general" | "prime" | "commitment";
  normalizedNumber: string | null;
  normalizedTitle: string | null;
  normalizedDescription: string | null;
  normalizedStatus: string | null;
  normalizedAmount: number | null;
  normalizedCreatedAt: string | null;
  normalizedDueDate: string | null;
  designated_reviewer_id?: string | null;
}

export const changeOrderColumns: ColumnConfig[] = [
  { id: "number", label: "Number", alwaysVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "description", label: "Description", defaultVisible: true },
  { id: "contract_type", label: "Contract Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "amount", label: "Amount", defaultVisible: true },
  { id: "reviewer", label: "Reviewer", defaultVisible: true },
  { id: "due_date", label: "Due Date", defaultVisible: false },
  { id: "created_at", label: "Created", defaultVisible: true },
];

export const changeOrderDefaultVisibleColumns = changeOrderColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

export function buildChangeOrderFilters(
  reviewerOptions: { value: string; label: string }[],
): FilterConfig[] {
  return [
    {
      id: "contractType",
      label: "Contract Type",
      type: "select",
      options: [
        { value: "general", label: "General" },
        { value: "prime", label: "Prime Contract" },
        { value: "commitment", label: "Commitment" },
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
        { value: "rejected", label: "Rejected" },
        { value: "executed", label: "Executed" },
      ],
    },
    {
      id: "reviewer",
      label: "Reviewer",
      type: "select",
      options: reviewerOptions,
    },
  ];
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function contractTypeLabel(type: UnifiedChangeOrder["contractType"]): string {
  switch (type) {
    case "general":
      return "General";
    case "prime":
      return "Prime Contract";
    case "commitment":
      return "Commitment";
    default:
      return type;
  }
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return "-";
  if (status === "submitted") return "Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getReviewer(order: UnifiedChangeOrder): string {
  if (order.contractType !== "general") return "-";
  return order.designated_reviewer_id || "-";
}

export function buildChangeOrderTableColumns(): TableColumn<UnifiedChangeOrder>[] {
  return [
    {
      ...changeOrderColumns[0],
      render: (item) => <span className="font-medium">{item.normalizedNumber || "-"}</span>,
      sortValue: (item) => item.normalizedNumber ?? "",
    },
    {
      ...changeOrderColumns[1],
      render: (item) => <span>{item.normalizedTitle || "-"}</span>,
      sortValue: (item) => item.normalizedTitle ?? "",
    },
    {
      ...changeOrderColumns[2],
      render: (item) => (
        <span className="line-clamp-1">{item.normalizedDescription || "-"}</span>
      ),
      sortValue: (item) => item.normalizedDescription ?? "",
    },
    {
      ...changeOrderColumns[3],
      render: (item) => <Badge variant="outline">{contractTypeLabel(item.contractType)}</Badge>,
      sortValue: (item) => item.contractType,
    },
    {
      ...changeOrderColumns[4],
      render: (item) => <StatusBadge status={statusLabel(item.normalizedStatus)} />,
      sortValue: (item) => item.normalizedStatus ?? "",
    },
    {
      ...changeOrderColumns[5],
      render: (item) => <span>{formatCurrency(item.normalizedAmount)}</span>,
      sortValue: (item) => item.normalizedAmount ?? 0,
    },
    {
      ...changeOrderColumns[6],
      render: (item) => <span>{getReviewer(item)}</span>,
      sortValue: (item) => getReviewer(item),
    },
    {
      ...changeOrderColumns[7],
      render: (item) => <span>{formatDate(item.normalizedDueDate)}</span>,
      sortValue: (item) =>
        item.normalizedDueDate ? new Date(item.normalizedDueDate).getTime() : 0,
    },
    {
      ...changeOrderColumns[8],
      render: (item) => <span>{formatDate(item.normalizedCreatedAt)}</span>,
      sortValue: (item) =>
        item.normalizedCreatedAt ? new Date(item.normalizedCreatedAt).getTime() : 0,
    },
  ];
}

export function renderChangeOrderRowActions(
  item: UnifiedChangeOrder,
  onView: (item: UnifiedChangeOrder) => void,
  onEdit: (item: UnifiedChangeOrder) => void,
  onDelete: (item: UnifiedChangeOrder) => void,
): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(item)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(item)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function renderChangeOrderCard(
  item: UnifiedChangeOrder,
  onClick: (item: UnifiedChangeOrder) => void,
): ReactElement {
  return (
    <div
      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{item.normalizedNumber || "-"}</p>
          <h3 className="font-medium">{item.normalizedTitle || "Untitled Change Order"}</h3>
        </div>
        <StatusBadge status={statusLabel(item.normalizedStatus)} />
      </div>
      <p className="text-sm text-muted-foreground">{contractTypeLabel(item.contractType)}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Amount: {formatCurrency(item.normalizedAmount)}
      </p>
    </div>
  );
}

export function renderChangeOrderList(
  item: UnifiedChangeOrder,
  onClick: (item: UnifiedChangeOrder) => void,
): ReactElement {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-md px-4 py-2 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">{item.normalizedNumber || "-"}</p>
        <p className="text-xs text-muted-foreground">{item.normalizedTitle || "Untitled"}</p>
      </div>
      <StatusBadge status={statusLabel(item.normalizedStatus)} />
    </div>
  );
}
