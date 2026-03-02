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
import { RFI_STATUS_OPTIONS } from "@/lib/schemas/rfi-schema";
import type { RFI } from "@/types/database-extensions";

export const rfiColumns: ColumnConfig[] = [
  { id: "number", label: "#", alwaysVisible: true },
  { id: "subject", label: "Subject", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "assignees", label: "Assignees", defaultVisible: true },
  { id: "due_date", label: "Due Date", defaultVisible: true },
  { id: "ball_in_court", label: "Ball In Court", defaultVisible: true },
  { id: "rfi_manager", label: "RFI Manager", defaultVisible: true },
  { id: "responsible_contractor", label: "Resp. Contractor", defaultVisible: false },
  { id: "received_from", label: "Received From", defaultVisible: false },
  { id: "created_at", label: "Created", defaultVisible: false },
];

export const rfiDefaultVisibleColumns = rfiColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

export const rfiFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: RFI_STATUS_OPTIONS.map((status) => ({
      value: status.value,
      label: status.label,
    })),
  },
];

function formatStatus(status: string | null | undefined): string {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function statusVariant(
  status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  switch ((status ?? "").toLowerCase()) {
    case "draft":
      return "secondary";
    case "open":
      return "default";
    case "pending":
      return "outline";
    case "closed":
      return "success";
    case "void":
      return "destructive";
    default:
      return "outline";
  }
}

function formatAssignees(assignees: string[] | null | undefined): string {
  if (!assignees || assignees.length === 0) return "—";
  return assignees.join(", ");
}

export function buildRfiTableColumns(): TableColumn<RFI>[] {
  return [
    {
      ...rfiColumns[0],
      render: (item) => <span className="font-medium">{item.number}</span>,
      sortValue: (item) => item.number,
    },
    {
      ...rfiColumns[1],
      render: (item) => <span>{item.subject || "Untitled RFI"}</span>,
      sortValue: (item) => item.subject || "",
    },
    {
      ...rfiColumns[2],
      render: (item) => (
        <Badge variant={statusVariant(item.status)}>{formatStatus(item.status)}</Badge>
      ),
      sortValue: (item) => item.status || "",
    },
    {
      ...rfiColumns[3],
      render: (item) => <span>{formatAssignees(item.assignees)}</span>,
      sortValue: (item) => formatAssignees(item.assignees),
    },
    {
      ...rfiColumns[4],
      render: (item) => <span>{formatDate(item.due_date)}</span>,
      sortValue: (item) => (item.due_date ? new Date(item.due_date).getTime() : 0),
    },
    {
      ...rfiColumns[5],
      render: (item) => <span>{item.ball_in_court || "-"}</span>,
      sortValue: (item) => item.ball_in_court || "",
    },
    {
      ...rfiColumns[6],
      render: (item) => <span>{item.rfi_manager || "-"}</span>,
      sortValue: (item) => item.rfi_manager || "",
    },
    {
      ...rfiColumns[7],
      render: (item) => <span>{item.responsible_contractor || "-"}</span>,
      sortValue: (item) => item.responsible_contractor || "",
    },
    {
      ...rfiColumns[8],
      render: (item) => <span>{item.received_from || "-"}</span>,
      sortValue: (item) => item.received_from || "",
    },
    {
      ...rfiColumns[9],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
  ];
}

export function renderRfiRowActions(
  item: RFI,
  onView: (item: RFI) => void,
  onEdit: (item: RFI) => void,
  onDelete: (item: RFI) => void,
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

export function renderRfiCard(item: RFI, onClick: (item: RFI) => void): ReactElement {
  return (
    <div
      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">RFI #{item.number}</p>
          <h3 className="font-medium">{item.subject || "Untitled RFI"}</h3>
        </div>
        <Badge variant={statusVariant(item.status)}>{formatStatus(item.status)}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">Assignees: {formatAssignees(item.assignees)}</p>
      <p className="mt-2 text-sm text-muted-foreground">Due: {formatDate(item.due_date)}</p>
    </div>
  );
}

export function renderRfiList(item: RFI, onClick: (item: RFI) => void): ReactElement {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-md px-4 py-2 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">#{item.number}</p>
        <p className="text-xs text-muted-foreground">{item.subject || "Untitled RFI"}</p>
      </div>
      <Badge variant={statusVariant(item.status)}>{formatStatus(item.status)}</Badge>
    </div>
  );
}
