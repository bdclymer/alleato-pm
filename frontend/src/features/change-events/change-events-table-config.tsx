import * as React from "react";
import type { ReactElement } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChangeEvent } from "@/hooks/use-change-events";

const STATUS_FILTER_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const SCOPE_FILTER_OPTIONS = [
  { value: "tbd", label: "TBD" },
  { value: "in_scope", label: "In Scope" },
  { value: "out_of_scope", label: "Out of Scope" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "Owner Change", label: "Owner Change" },
  { value: "Design Change", label: "Design Change" },
  { value: "Allowance", label: "Allowance" },
  { value: "Contingency", label: "Contingency" },
  { value: "TBD", label: "TBD" },
  { value: "Transfer", label: "Transfer" },
  { value: "Unforeseen Condition", label: "Unforeseen Condition" },
  { value: "Value Engineering", label: "Value Engineering" },
];

export const changeEventColumns: ColumnConfig[] = [
  { id: "number_title", label: "CE Number - Title", alwaysVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "scope", label: "Scope", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "reason", label: "Change Reason", defaultVisible: true },
  { id: "origin", label: "Origin", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: false },
];

export const changeEventFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: STATUS_FILTER_OPTIONS,
  },
  {
    id: "scope",
    label: "Scope",
    type: "select",
    options: SCOPE_FILTER_OPTIONS,
  },
  {
    id: "type",
    label: "Type",
    type: "select",
    options: TYPE_FILTER_OPTIONS,
  },
];

export const changeEventDefaultVisibleColumns = changeEventColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function statusLabel(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "pending_approval":
      return "Pending Approval";
    case "open":
      return "Open";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "closed":
      return "Closed";
    default:
      return status || "-";
  }
}

function scopeLabel(scope: string | null | undefined): string {
  switch ((scope ?? "").toLowerCase()) {
    case "tbd":
      return "TBD";
    case "in_scope":
      return "In Scope";
    case "out_of_scope":
      return "Out of Scope";
    default:
      return scope || "-";
  }
}

function typeLabel(type: string | null | undefined): string {
  switch ((type ?? "").toLowerCase()) {
    case "owner_change":
    case "owner change":
      return "Owner Change";
    case "design_change":
    case "design change":
      return "Design Change";
    case "allowance":
      return "Allowance";
    case "contingency":
      return "Contingency";
    case "scope_gap":
    case "scope gap":
      return "Scope Gap";
    case "tbd":
      return "TBD";
    case "transfer":
      return "Transfer";
    case "unforeseen_condition":
    case "unforeseen condition":
      return "Unforeseen Condition";
    case "value_engineering":
    case "value engineering":
      return "Value Engineering";
    default:
      return type || "-";
  }
}

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "-";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

export function buildChangeEventTableColumns(): TableColumn<ChangeEvent>[] {
  return [
    {
      ...changeEventColumns[0],
      render: (item) => (
        <div>
          <span className="font-mono text-xs text-muted-foreground">{item.number || `CE-${item.id}`}</span>
          {" "}
          <span className="font-medium">{item.title}</span>
        </div>
      ),
      sortValue: (item) => `${item.number ?? ""} ${item.title}`,
    },
    {
      ...changeEventColumns[1],
      render: (item) => <StatusBadge status={statusLabel(item.status)} />,
      sortValue: (item) => item.status ?? "",
    },
    {
      ...changeEventColumns[2],
      render: (item) => <span>{scopeLabel(item.scope)}</span>,
      sortValue: (item) => scopeLabel(item.scope),
    },
    {
      ...changeEventColumns[3],
      render: (item) => <span>{typeLabel(item.type)}</span>,
      sortValue: (item) => typeLabel(item.type),
    },
    {
      ...changeEventColumns[4],
      render: (item) => <span className="line-clamp-1">{item.reason || "-"}</span>,
      sortValue: (item) => item.reason ?? "",
    },
    {
      ...changeEventColumns[5],
      render: (item) => <span>{item.origin || "-"}</span>,
      sortValue: (item) => item.origin ?? "",
    },
    {
      ...changeEventColumns[6],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

export function renderChangeEventRowActions(
  item: ChangeEvent,
  onView: (item: ChangeEvent) => void,
  onEdit: (item: ChangeEvent) => void,
  onDelete: (item: ChangeEvent) => void,
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

export function renderChangeEventCard(
  item: ChangeEvent,
  onClick: (item: ChangeEvent) => void,
): ReactElement {
  return (
    <div
      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{item.number || `CE-${item.id}`}</p>
          <h3 className="font-medium">{item.title || "Untitled Change Event"}</h3>
        </div>
        <StatusBadge status={statusLabel(item.status)} />
      </div>
      <p className="text-sm text-muted-foreground">{scopeLabel(item.scope)} · {typeLabel(item.type)}</p>
    </div>
  );
}

export function renderChangeEventList(
  item: ChangeEvent,
  onClick: (item: ChangeEvent) => void,
): ReactElement {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-md px-4 py-2 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">{item.number || `CE-${item.id}`}</p>
        <p className="text-xs text-muted-foreground">{item.title || "Untitled Change Event"}</p>
      </div>
      <StatusBadge status={statusLabel(item.status)} />
    </div>
  );
}
