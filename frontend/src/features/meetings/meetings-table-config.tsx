import * as React from "react";
import type { ReactElement } from "react";
import { FileText, Flame, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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

// ─── Inline editing types ───────────────────────────────────────────────────

export type EditableField = "date" | "project" | "type" | "category";

export interface EditContext {
  editingCell: { meetingId: string; field: EditableField } | null;
  editingValue: string;
  projectOptions: Array<{ value: string; label: string }>;
  handleCellClick: (meeting: Meeting, field: EditableField) => void;
  setEditingValue: (value: string) => void;
  handleInlineSave: (valueOverride?: string) => Promise<void>;
  handleInlineCancel: () => void;
}

// ─── Column configs ──────────────────────────────────────────────────────────

export const meetingColumns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "source", label: "Source", defaultVisible: true },
  { id: "links", label: "Links", defaultVisible: true },
];

export const meetingDefaultVisibleColumns = meetingColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

// ─── Filter / detail field builders ─────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function badgeVariant(value: string | null | undefined): "default" | "secondary" | "outline" {
  if (!value) return "outline";
  const normalized = value.toLowerCase();
  if (normalized.includes("owner") || normalized.includes("client")) return "default";
  if (normalized.includes("internal")) return "secondary";
  return "outline";
}

// ─── Inline edit primitives ───────────────────────────────────────────────────

/**
 * Wraps a cell value in a hover-to-edit container.
 * When `isEditing`, renders `children` (the input).
 * When not editing, renders the display value with a pencil hint on hover.
 */
function EditableCellWrapper({
  isEditing,
  displayContent,
  onClickToEdit,
  children,
}: {
  isEditing: boolean;
  displayContent: React.ReactNode;
  onClickToEdit: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  if (isEditing) {
    return <>{children}</>;
  }
  return (
    <div
      className="group inline-flex items-center gap-1 cursor-pointer rounded px-1 -mx-1 min-h-[28px] hover:bg-muted/50 transition-colors"
      onClick={onClickToEdit}
    >
      {displayContent}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 flex-shrink-0 transition-opacity" />
    </div>
  );
}

function InlineTextInput({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onSave}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSave();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      placeholder={placeholder}
      className="h-7 w-full min-w-[120px] rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    />
  );
}

function InlineDateInput({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onSave}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSave();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      aria-label="Edit date"
      title="Edit date"
      className="h-7 rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    />
  );
}

function InlineProjectSelect({
  value,
  projectOptions,
  onSave,
  onCancel,
}: {
  value: string;
  projectOptions: Array<{ value: string; label: string }>;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        onSave(e.target.value);
      }}
      onBlur={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      aria-label="Select project"
      title="Select project"
      className="h-7 rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">No project</option>
      {projectOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Column builder ───────────────────────────────────────────────────────────

export function buildMeetingTableColumns(editContext?: EditContext): TableColumn<Meeting>[] {
  return [
    // ── Title: link to project detail page ──────────────────────────────────
    {
      ...meetingColumns[0],
      render: (item) => {
        const projectId = (item as { project_id?: number | null }).project_id;
        if (projectId) {
          return (
            <a
              href={`/${projectId}/home`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium hover:underline underline-offset-2 text-foreground"
              title={`Go to project: ${item.project ?? ""}`}
            >
              {item.title ?? "Untitled"}
            </a>
          );
        }
        return <span className="font-medium">{item.title ?? "Untitled"}</span>;
      },
      csvValue: (item) => item.title ?? "",
      sortValue: (item) => item.title ?? "",
    },

    // ── Date: inline editable ────────────────────────────────────────────────
    {
      ...meetingColumns[1],
      render: (item) => {
        const isEditing =
          editContext?.editingCell?.meetingId === item.id &&
          editContext?.editingCell?.field === "date";

        return (
          <EditableCellWrapper
            isEditing={Boolean(isEditing)}
            displayContent={
              item.date ? (
                <span className="text-sm">{formatDate(item.date)}</span>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )
            }
            onClickToEdit={(e) => {
              e.stopPropagation();
              editContext?.handleCellClick(item, "date");
            }}
          >
            <InlineDateInput
              value={editContext?.editingValue ?? ""}
              onChange={(v) => editContext?.setEditingValue(v)}
              onSave={() => editContext?.handleInlineSave()}
              onCancel={() => editContext?.handleInlineCancel()}
            />
          </EditableCellWrapper>
        );
      },
      csvValue: (item) => item.date ?? "",
      sortValue: (item) => (item.date ? new Date(item.date).getTime() : 0),
    },

    // ── Project: inline select ───────────────────────────────────────────────
    {
      ...meetingColumns[2],
      render: (item) => {
        const isEditing =
          editContext?.editingCell?.meetingId === item.id &&
          editContext?.editingCell?.field === "project";

        return (
          <EditableCellWrapper
            isEditing={Boolean(isEditing)}
            displayContent={
              item.project ? (
                <Badge variant={badgeVariant(item.project)} className="font-normal">
                  {item.project}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )
            }
            onClickToEdit={(e) => {
              e.stopPropagation();
              editContext?.handleCellClick(item, "project");
            }}
          >
            <InlineProjectSelect
              value={editContext?.editingValue ?? ""}
              projectOptions={editContext?.projectOptions ?? []}
              onSave={(v) => editContext?.handleInlineSave(v)}
              onCancel={() => editContext?.handleInlineCancel()}
            />
          </EditableCellWrapper>
        );
      },
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
    },

    // ── Type: inline text ────────────────────────────────────────────────────
    {
      ...meetingColumns[3],
      render: (item) => {
        const isEditing =
          editContext?.editingCell?.meetingId === item.id &&
          editContext?.editingCell?.field === "type";

        return (
          <EditableCellWrapper
            isEditing={Boolean(isEditing)}
            displayContent={
              item.type ? (
                <Badge variant="secondary" className="font-normal">
                  {item.type}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )
            }
            onClickToEdit={(e) => {
              e.stopPropagation();
              editContext?.handleCellClick(item, "type");
            }}
          >
            <InlineTextInput
              value={editContext?.editingValue ?? ""}
              onChange={(v) => editContext?.setEditingValue(v)}
              onSave={() => editContext?.handleInlineSave()}
              onCancel={() => editContext?.handleInlineCancel()}
              placeholder="Enter type…"
            />
          </EditableCellWrapper>
        );
      },
      csvValue: (item) => item.type ?? "",
      sortValue: (item) => item.type ?? "",
    },

    // ── Category: inline text ────────────────────────────────────────────────
    {
      ...meetingColumns[4],
      render: (item) => {
        const isEditing =
          editContext?.editingCell?.meetingId === item.id &&
          editContext?.editingCell?.field === "category";

        return (
          <EditableCellWrapper
            isEditing={Boolean(isEditing)}
            displayContent={
              item.category ? (
                <Badge variant="outline" className="font-normal">
                  {item.category}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )
            }
            onClickToEdit={(e) => {
              e.stopPropagation();
              editContext?.handleCellClick(item, "category");
            }}
          >
            <InlineTextInput
              value={editContext?.editingValue ?? ""}
              onChange={(v) => editContext?.setEditingValue(v)}
              onSave={() => editContext?.handleInlineSave()}
              onCancel={() => editContext?.handleInlineCancel()}
              placeholder="Enter category…"
            />
          </EditableCellWrapper>
        );
      },
      csvValue: (item) => item.category ?? "",
      sortValue: (item) => item.category ?? "",
    },

    // ── Source: display filename ─────────────────────────────────────────────
    {
      ...meetingColumns[5],
      render: (item) => (
        <span className="text-muted-foreground text-xs truncate max-w-[180px] block">
          {item.source ? (item.source.split("/").pop() ?? item.source) : "—"}
        </span>
      ),
      csvValue: (item) => item.source ?? "",
      sortValue: (item) => item.source ?? "",
    },

    // ── Links: transcript file icon + Fireflies icon ─────────────────────────
    {
      ...meetingColumns[6],
      render: (item) => {
        const hasLinks = item.source || item.fireflies_link;
        if (!hasLinks) return <span className="text-muted-foreground text-sm">—</span>;

        return (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {item.source && (
              <a
                href={item.source}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open transcript file"
                title="Open transcript / source file"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="h-4 w-4" />
              </a>
            )}
            {item.fireflies_link && (
              <a
                href={item.fireflies_link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Fireflies"
                title="View Fireflies recording"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Flame className="h-4 w-4" />
              </a>
            )}
          </div>
        );
      },
      csvValue: (item) =>
        [item.source ? "transcript" : "", item.fireflies_link ? "fireflies" : ""]
          .filter(Boolean)
          .join(", "),
      sortValue: (item) => {
        if (item.source && item.fireflies_link) return "transcript,fireflies";
        if (item.source) return "transcript";
        if (item.fireflies_link) return "fireflies";
        return "";
      },
    },
  ];
}

// ─── Row actions ──────────────────────────────────────────────────────────────

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
          Edit details
        </DropdownMenuItem>
        {item.source && (
          <DropdownMenuItem onClick={() => onOpenSource(item)}>
            <FileText className="mr-2 h-4 w-4" />
            View transcript
          </DropdownMenuItem>
        )}
        {item.fireflies_link && (
          <DropdownMenuItem onClick={() => onOpenRecording(item)}>
            <Flame className="mr-2 h-4 w-4" />
            View Fireflies
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Card / list renderers ────────────────────────────────────────────────────

function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function renderMeetingCard(item: Meeting, onClick: (meeting: Meeting) => void): ReactElement {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{formatDateShort(item.date)}</p>
          <h3 className="font-medium">{item.title ?? "Untitled Meeting"}</h3>
        </div>
        <Badge variant="secondary" className="font-normal">
          {item.type ?? "—"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{item.project ?? "—"}</p>
      {item.category && (
        <p className="text-sm text-muted-foreground mt-1">{item.category}</p>
      )}
    </div>
  );
}

export function renderMeetingList(item: Meeting, onClick: (meeting: Meeting) => void): ReactElement {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div>
        <p className="text-sm font-medium">{item.title ?? "Untitled Meeting"}</p>
        <p className="text-xs text-muted-foreground">{formatDateShort(item.date)}</p>
      </div>
      <Badge variant="secondary" className="font-normal">
        {item.type ?? "—"}
      </Badge>
    </div>
  );
}
