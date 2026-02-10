import * as React from "react";
import type { ReactElement } from "react";
import { ExternalLink, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  DetailFieldConfig,
} from "@/components/tables/unified";
import type { Meeting } from "@/lib/validation/meetings";

export const meetingColumns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "source", label: "Source", defaultVisible: true },
  { id: "url", label: "URL", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
];

export function buildMeetingFilters(options: {
  years: string[];
  types: string[];
  categories: string[];
}): FilterConfig[] {
  return [
    {
      id: "year",
      label: "Year",
      type: "select",
      options: options.years.map((year) => ({ value: year, label: year })),
    },
    {
      id: "type",
      label: "Type",
      type: "select",
      options: options.types.map((type) => ({ value: type, label: type })),
    },
    {
      id: "category",
      label: "Category",
      type: "select",
      options: options.categories.map((category) => ({
        value: category,
        label: category,
      })),
    },
  ];
}

export function buildMeetingDetailFields(options: {
  projectOptions: Array<{ value: string; label: string }>;
}): DetailFieldConfig[] {
  return [
    { id: "title", label: "Title", type: "text", placeholder: "Meeting title" },
    { id: "date", label: "Date", type: "date" },
    { id: "type", label: "Type", type: "text", placeholder: "Weekly sync" },
    { id: "category", label: "Category", type: "text", placeholder: "Project" },
    {
      id: "project",
      label: "Project",
      type: "select",
      options: options.projectOptions,
      placeholder: "Select project",
    },
    { id: "participants", label: "Participants", type: "text" },
    { id: "source", label: "Source", type: "text" },
    { id: "url", label: "URL", type: "text" },
    { id: "summary", label: "Summary", type: "textarea", fullWidth: true },
  ];
}

export const meetingDefaultVisibleColumns = meetingColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function badgeVariant(value: string | null | undefined): "default" | "secondary" | "outline" {
  if (!value) return "outline";
  const normalized = value.toLowerCase();
  if (normalized.includes("owner") || normalized.includes("client")) {
    return "default";
  }
  if (normalized.includes("internal")) return "secondary";
  return "outline";
}

export function buildMeetingTableColumns(): TableColumn<Meeting>[] {
  return [
    {
      ...meetingColumns[0],
      render: (item) => <span className="font-medium">{item.title ?? "Untitled"}</span>,
      csvValue: (item) => item.title ?? "",
      sortValue: (item) => item.title ?? "",
    },
    {
      ...meetingColumns[1],
      render: (item) => <span>{formatDate(item.date)}</span>,
      csvValue: (item) => item.date ?? "",
      sortValue: (item) => (item.date ? new Date(item.date).getTime() : 0),
    },
    {
      ...meetingColumns[2],
      render: (item) => (
        <Badge variant="secondary" className="font-normal">
          {item.type ?? "-"}
        </Badge>
      ),
      csvValue: (item) => item.type ?? "",
      sortValue: (item) => item.type ?? "",
    },
    {
      ...meetingColumns[3],
      render: (item) => (
        <Badge variant="outline" className="font-normal">
          {item.category ?? "-"}
        </Badge>
      ),
      csvValue: (item) => item.category ?? "",
      sortValue: (item) => item.category ?? "",
    },
    {
      ...meetingColumns[4],
      render: (item) => <span className="text-muted-foreground">{item.source ?? "-"}</span>,
      csvValue: (item) => item.source ?? "",
      sortValue: (item) => item.source ?? "",
    },
    {
      ...meetingColumns[5],
      render: (item) => <span className="text-muted-foreground">{item.url ?? "-"}</span>,
      csvValue: (item) => item.url ?? "",
      sortValue: (item) => item.url ?? "",
    },
    {
      ...meetingColumns[6],
      render: (item) => (
        <Badge variant={badgeVariant(item.project)} className="font-normal">
          {item.project ?? "-"}
        </Badge>
      ),
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
    },
  ];
}

export function renderMeetingRowActions(
  item: Meeting,
  onEdit: (meeting: Meeting) => void,
  onDelete: (meeting: Meeting) => void,
  onOpenSource: (meeting: Meeting) => void,
  onOpenRecording: (meeting: Meeting) => void,
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
        {item.source && (
          <DropdownMenuItem onClick={() => onOpenSource(item)}>
            <FileText className="mr-2 h-4 w-4" />
            View Source
          </DropdownMenuItem>
        )}
        {item.fireflies_link && (
          <DropdownMenuItem onClick={() => onOpenRecording(item)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Recording
          </DropdownMenuItem>
        )}
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

export function renderMeetingCard(
  item: Meeting,
  onClick: (meeting: Meeting) => void,
): ReactElement {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{formatDate(item.date)}</p>
          <h3 className="font-medium">{item.title ?? "Untitled Meeting"}</h3>
        </div>
        <Badge variant="secondary" className="font-normal">
          {item.type ?? "-"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{item.project ?? "-"}</p>
      {item.category && (
        <p className="text-sm text-muted-foreground mt-1">{item.category}</p>
      )}
    </div>
  );
}

export function renderMeetingList(
  item: Meeting,
  onClick: (meeting: Meeting) => void,
): ReactElement {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">{item.title ?? "Untitled Meeting"}</p>
        <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
      </div>
      <Badge variant="secondary" className="font-normal">
        {item.type ?? "-"}
      </Badge>
    </div>
  );
}
