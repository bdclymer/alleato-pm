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
  // Additional columns (hidden by default)
  { id: "date_initiated", label: "Date Initiated", defaultVisible: false },
  { id: "distribution_list", label: "Distribution List", defaultVisible: false },
  { id: "closed_date", label: "Closed Date", defaultVisible: false },
  { id: "location", label: "Location", defaultVisible: false },
  { id: "schedule_impact", label: "Schedule Impact", defaultVisible: false },
  { id: "cost_impact", label: "Cost Impact", defaultVisible: false },
  { id: "cost_code", label: "Cost Code", defaultVisible: false },
  { id: "sub_job", label: "Sub Job", defaultVisible: false },
  { id: "rfi_stage", label: "RFI Stage", defaultVisible: false },
  { id: "is_private", label: "Private", defaultVisible: false },
  { id: "drawing_number", label: "Drawing Number", defaultVisible: false },
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
  {
    id: "responsible_contractor",
    label: "Responsible Contractor",
    type: "select",
    options: [],
  },
  {
    id: "received_from",
    label: "Received From",
    type: "select",
    options: [],
  },
  {
    id: "assignees",
    label: "Assignees",
    type: "select",
    options: [],
  },
  {
    id: "rfi_manager",
    label: "RFI Manager",
    type: "select",
    options: [],
  },
  {
    id: "ball_in_court",
    label: "Ball In Court",
    type: "select",
    options: [],
  },
  {
    id: "overdue",
    label: "Overdue",
    type: "select",
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    id: "location",
    label: "Location",
    type: "select",
    options: [],
  },
  {
    id: "cost_code",
    label: "Cost Code",
    type: "select",
    options: [],
  },
  {
    id: "sub_job",
    label: "Sub Job",
    type: "select",
    options: [],
  },
  {
    id: "rfi_stage",
    label: "RFI Stage",
    type: "select",
    options: [],
  },
  {
    id: "created_by",
    label: "Created By",
    type: "select",
    options: [],
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
    case "closed":
      return "success";
    case "closed-draft":
      return "secondary";
    default:
      return "outline";
  }
}

function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return "-";
  if (status === "closed-draft") return "Closed (Draft)";
  return status.charAt(0).toUpperCase() + status.slice(1);
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
        <Badge variant={statusVariant(item.status)}>{formatStatusLabel(item.status)}</Badge>
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
    // Additional columns (hidden by default)
    {
      ...rfiColumns[10],
      render: (item) => <span>{formatDate(item.date_initiated)}</span>,
      sortValue: (item) => (item.date_initiated ? new Date(item.date_initiated).getTime() : 0),
    },
    {
      ...rfiColumns[11],
      render: (item) => <span>{item.distribution_list?.join(", ") || "-"}</span>,
      sortValue: (item) => item.distribution_list?.join(", ") || "",
    },
    {
      ...rfiColumns[12],
      render: (item) => <span>{formatDate(item.closed_date)}</span>,
      sortValue: (item) => (item.closed_date ? new Date(item.closed_date).getTime() : 0),
    },
    {
      ...rfiColumns[13],
      render: (item) => <span>{item.location || "-"}</span>,
      sortValue: (item) => item.location || "",
    },
    {
      ...rfiColumns[14],
      render: (item) => <span>{item.schedule_impact || "-"}</span>,
      sortValue: (item) => item.schedule_impact || "",
    },
    {
      ...rfiColumns[15],
      render: (item) => <span>{item.cost_impact || "-"}</span>,
      sortValue: (item) => item.cost_impact || "",
    },
    {
      ...rfiColumns[16],
      render: (item) => <span>{item.cost_code || "-"}</span>,
      sortValue: (item) => item.cost_code || "",
    },
    {
      ...rfiColumns[17],
      render: (item) => <span>{(item as Record<string, unknown>).sub_job as string || "-"}</span>,
      sortValue: (item) => ((item as Record<string, unknown>).sub_job as string) || "",
    },
    {
      ...rfiColumns[18],
      render: (item) => <span>{item.rfi_stage || "-"}</span>,
      sortValue: (item) => item.rfi_stage || "",
    },
    {
      ...rfiColumns[19],
      render: (item) => <span>{item.is_private ? "Yes" : "No"}</span>,
      sortValue: (item) => (item.is_private ? "Yes" : "No"),
    },
    {
      ...rfiColumns[20],
      render: (item) => <span>{(item as Record<string, unknown>).drawing_number as string || "-"}</span>,
      sortValue: (item) => ((item as Record<string, unknown>).drawing_number as string) || "",
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
        <Badge variant={statusVariant(item.status)}>{formatStatusLabel(item.status)}</Badge>
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
