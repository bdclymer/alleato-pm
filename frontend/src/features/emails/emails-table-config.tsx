import * as React from "react";
import type { ReactElement } from "react";
import {
  Ban,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";

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
import {
  CellDate,
  CellLink,
  CellText,
  TruncatedCell,
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

export const globalEmailColumns: ColumnConfig[] = [
  { id: "project", label: "Project", defaultVisible: true },
  ...emailColumns,
];

interface EmailFilterProjectOption {
  id: number;
  label: string;
}

export function buildEmailFilters(options?: {
  showProject?: boolean;
  projects?: EmailFilterProjectOption[];
}): FilterConfig[] {
  return [
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
    ...(options?.showProject && options.projects && options.projects.length > 0
      ? [
          {
            id: "project_id",
            label: "Project",
            type: "select" as const,
            options: options.projects.map((project) => ({
              value: String(project.id),
              label: project.label,
            })),
          },
        ]
      : []),
    {
      id: "from",
      label: "From",
      type: "text",
      placeholder: "Sender name or email",
    },
    {
      id: "to",
      label: "To",
      type: "text",
      placeholder: "Recipient email",
    },
    {
      id: "has_attachments",
      label: "Has attachments",
      type: "boolean",
    },
    {
      id: "is_starred",
      label: "Starred",
      type: "boolean",
    },
    {
      id: "sent_at",
      label: "Date",
      type: "dateRange",
    },
  ];
}

export const emailDefaultVisibleColumns = emailColumns
  .filter((col) => col.defaultVisible !== false)
  .map((col) => col.id);

export const globalEmailDefaultVisibleColumns = globalEmailColumns
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

// The date a message is ordered and displayed by: received time for inbound
// mail, otherwise the sent time, falling back to the row's created time. This
// keeps the sort key identical to the timestamp shown in every email view.
export function emailDisplayDate(item: ProjectEmail): string | null | undefined {
  return item.received_at || item.sent_at || item.created_at;
}

function formatRecipients(list: string[] | null | undefined): string {
  if (!list || list.length === 0) return "-";
  return list.join(", ");
}

function projectLabel(item: ProjectEmail): string {
  const projectNumber = item.project?.project_number?.trim();
  const projectName = item.project?.name?.trim();

  if (projectNumber && projectName) return `${projectNumber} - ${projectName}`;
  if (projectName) return projectName;
  if (projectNumber) return projectNumber;
  return `Project ${item.project_id}`;
}

export function buildEmailTableColumns(options?: {
  showProject?: boolean;
}): TableColumn<ProjectEmail>[] {
  const columns: TableColumn<ProjectEmail>[] = [
    {
      ...emailColumns[0],
      width: 300,
      render: (item) => <TruncatedCell value={item.subject} maxWidth={280} />,
      csvValue: (item) => item.subject ?? "",
      sortValue: (item) => item.subject ?? "",
    },
    {
      ...emailColumns[1],
      width: 180,
      render: (item) => <CellText value={item.from_name || item.from_email} muted />,
      csvValue: (item) => item.from_name || item.from_email || "",
      sortValue: (item) => item.from_name || item.from_email || "",
    },
    {
      ...emailColumns[2],
      width: 220,
      render: (item) => (
        <TruncatedCell value={formatRecipients(item.to_list)} maxWidth={200} />
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
      render: (item) => <CellDate value={emailDisplayDate(item)} showTime />,
      csvValue: (item) => emailDisplayDate(item) || "",
      sortValue: (item) => sortValueForDate(emailDisplayDate(item)),
    },
    {
      ...emailColumns[5],
      width: 128,
      render: (item) =>
        item.has_attachments ? (
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        ) : (
          <CellText value={null} muted />
        ),
      csvValue: (item) => (item.has_attachments ? "Yes" : "No"),
      sortValue: (item) => (item.has_attachments ? 1 : 0),
    },
    {
      ...emailColumns[6],
      width: 96,
      render: (item) =>
        item.is_starred ? (
          <Star className="h-4 w-4 fill-current text-status-warning" />
        ) : (
          <CellText value={null} muted />
        ),
      csvValue: (item) => (item.is_starred ? "Yes" : "No"),
      sortValue: (item) => (item.is_starred ? 1 : 0),
    },
  ];

  if (!options?.showProject) return columns;

  return [
    {
      ...globalEmailColumns[0],
      width: 220,
      sortable: true,
      render: (item) => (
        <CellLink value={projectLabel(item)} href={`/${item.project_id}/emails`} />
      ),
      csvValue: projectLabel,
      sortValue: projectLabel,
    },
    ...columns,
  ];
}

export function renderEmailRowActions(
  item: ProjectEmail,
  onEdit: ((email: ProjectEmail) => void) | null,
  onDelete: ((email: ProjectEmail) => void) | null,
  onMarkAsJunk?: ((email: ProjectEmail) => void) | null,
  onMarkImportant?: ((email: ProjectEmail) => void) | null,
  onMarkNotImportant?: ((email: ProjectEmail) => void) | null,
): ReactElement | null {
  // If every action is disabled, render nothing.
  if (
    !onEdit &&
    !onDelete &&
    !onMarkAsJunk &&
    !onMarkImportant &&
    !onMarkNotImportant
  ) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit ? (
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {onMarkAsJunk ? (
          <DropdownMenuItem onClick={() => onMarkAsJunk(item)}>
            <Ban className="mr-2 h-4 w-4" />
            Mark as junk...
          </DropdownMenuItem>
        ) : null}
        {onMarkImportant ? (
          <DropdownMenuItem onClick={() => onMarkImportant(item)}>
            <Star className="mr-2 h-4 w-4" />
            Mark important...
          </DropdownMenuItem>
        ) : null}
        {onMarkNotImportant ? (
          <DropdownMenuItem onClick={() => onMarkNotImportant(item)}>
            <StarOff className="mr-2 h-4 w-4" />
            Mark not important...
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        ) : null}
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
          <span>{formatDate(emailDisplayDate(item))}</span>
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
            {formatDate(emailDisplayDate(item))}
          </span>
        </div>
      </div>
    </div>
  );
}
