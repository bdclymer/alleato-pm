import * as React from "react";
import type { ReactElement } from "react";
import { MoreHorizontal, Paperclip, Pencil, Star, Trash2 } from "lucide-react";

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
import type { ProjectEmail } from "@/hooks/use-emails";

export const emailColumns: ColumnConfig[] = [
  { id: "subject", label: "Subject", alwaysVisible: true },
  { id: "from_name", label: "From", defaultVisible: true },
  { id: "to_list", label: "To", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "sent_at", label: "Date", defaultVisible: true },
  { id: "has_attachments", label: "Attachments", defaultVisible: true },
  { id: "is_starred", label: "Starred", defaultVisible: true },
];

export const emailFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "Draft", label: "Draft" },
      { value: "Sent", label: "Sent" },
      { value: "Received", label: "Received" },
      { value: "Failed", label: "Failed" },
    ],
  },
];

export const emailDefaultVisibleColumns = emailColumns
  .filter((col) => col.defaultVisible !== false)
  .map((col) => col.id);

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortValueForDate(value: string | null | undefined): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatRecipients(list: string[] | null | undefined): string {
  if (!list || list.length === 0) return "-";
  return list.join(", ");
}

export function buildEmailTableColumns(): TableColumn<ProjectEmail>[] {
  return [
    {
      ...emailColumns[0],
      width: 300,
      render: (item) => (
        <span className="font-medium text-foreground">
          {item.subject || "-"}
        </span>
      ),
      csvValue: (item) => item.subject ?? "",
      sortValue: (item) => item.subject ?? "",
    },
    {
      ...emailColumns[1],
      width: 180,
      render: (item) => (
        <span className="text-muted-foreground">
          {item.from_name || item.from_email || "-"}
        </span>
      ),
      csvValue: (item) => item.from_name || item.from_email || "",
      sortValue: (item) => item.from_name || item.from_email || "",
    },
    {
      ...emailColumns[2],
      width: 220,
      render: (item) => (
        <span className="text-muted-foreground truncate">
          {formatRecipients(item.to_list)}
        </span>
      ),
      csvValue: (item) => formatRecipients(item.to_list),
      sortValue: (item) => formatRecipients(item.to_list),
    },
    {
      ...emailColumns[3],
      width: 120,
      render: (item) => <StatusBadge status={item.status} />,
      csvValue: (item) => item.status,
      sortValue: (item) => item.status,
    },
    {
      ...emailColumns[4],
      width: 180,
      render: (item) => (
        <span className="text-muted-foreground">
          {formatDate(item.sent_at || item.created_at)}
        </span>
      ),
      csvValue: (item) => item.sent_at || item.created_at || "",
      sortValue: (item) => sortValueForDate(item.sent_at || item.created_at),
    },
    {
      ...emailColumns[5],
      width: 100,
      render: (item) =>
        item.has_attachments ? (
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      csvValue: (item) => (item.has_attachments ? "Yes" : "No"),
      sortValue: (item) => (item.has_attachments ? 1 : 0),
    },
    {
      ...emailColumns[6],
      width: 80,
      render: (item) =>
        item.is_starred ? (
          <Star className="h-4 w-4 fill-current text-status-warning" />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      csvValue: (item) => (item.is_starred ? "Yes" : "No"),
      sortValue: (item) => (item.is_starred ? 1 : 0),
    },
  ];
}

export function renderEmailRowActions(
  item: ProjectEmail,
  onEdit: (email: ProjectEmail) => void,
  onDelete: (email: ProjectEmail) => void,
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

export function renderEmailCard(
  item: ProjectEmail,
  onClick: (email: ProjectEmail) => void,
): ReactElement {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.is_starred && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-current text-status-warning" />
            )}
            {/* eslint-disable-next-line design-system/no-raw-heading */}
            <h3 className="font-medium truncate">{item.subject || "No Subject"}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.from_name || item.from_email || "Unknown sender"}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <span>To: {formatRecipients(item.to_list)}</span>
        <div className="flex items-center gap-2">
          {item.has_attachments && <Paperclip className="h-3 w-3" />}
          <span>{formatDate(item.sent_at || item.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export function renderEmailList(
  item: ProjectEmail,
  onClick: (email: ProjectEmail) => void,
): ReactElement {
  return (
    <div className="rounded-md">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-2 transition-colors hover:bg-muted/50"
        onClick={() => onClick(item)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {item.is_starred ? (
            <Star className="h-3.5 w-3.5 shrink-0 fill-current text-status-warning" />
          ) : (
            <Star className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{item.subject || "No Subject"}</p>
              {item.has_attachments && (
                <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {item.from_name || item.from_email || "Unknown"} &rarr;{" "}
              {formatRecipients(item.to_list)}
            </p>
          </div>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <StatusBadge status={item.status} />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(item.sent_at || item.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
