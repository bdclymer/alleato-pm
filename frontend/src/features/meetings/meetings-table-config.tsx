import * as React from "react";
import type { ReactElement } from "react";
import { ArrowUpRight, FileText, Flame, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ColumnConfig,
  type FilterConfig,
  type TableColumn,
  type DetailFieldConfig,
  TableAvatarUsers,
  TableDateValue,
  TableIconLinks,
  TableRowActionsMenu,
  TableStatusDot,
  TableTagBadge,
  formatParticipantDisplayName,
} from "@/components/tables/unified";
import type { Meeting } from "@/lib/validation/meetings";

// ─── Inline editing types ───────────────────────────────────────────────────

export type EditableField = "title" | "date" | "project" | "type" | "category";

export interface EditContext {
  editingCell: { meetingId: string; field: EditableField } | null;
  editingValue: string;
  projectOptions: Array<{ value: string; label: string }>;
  handleCellClick: (meeting: Meeting, field: EditableField) => void;
  setEditingValue: (value: string) => void;
  handleInlineSave: (options?: {
    valueOverride?: string;
    move?: "next" | "prev";
  }) => Promise<void>;
  handleInlineCancel: () => void;
}

// ─── Column configs ──────────────────────────────────────────────────────────

export const meetingColumns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "description", label: "Description", defaultVisible: true },
  { id: "participants", label: "Participants", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: false },
  { id: "category", label: "Category", defaultVisible: false },
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
    { id: "description", label: "Description", type: "textarea", fullWidth: true },
    { id: "participants", label: "Participants", type: "text" },
    { id: "source", label: "Source", type: "text" },
    { id: "url", label: "URL", type: "text" },
    { id: "summary", label: "Summary", type: "textarea", fullWidth: true },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseParticipants(item: Meeting): string[] {
  const normalizeEntry = (value: unknown): string | null => {
    if (typeof value === "string") {
      const trimmed = value.trim().replace(/^["'{\[]+/, "").replace(/["'}\]]+$/, "");
      return trimmed || null;
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const preferred = record.name ?? record.display_name ?? record.displayName ?? record.email;
      if (typeof preferred === "string" && preferred.trim()) {
        return preferred.trim();
      }
    }
    return null;
  };

  const dedupe = (values: unknown[]): string[] =>
    Array.from(
      new Set(
        values
          .map(normalizeEntry)
          .filter((value): value is string => Boolean(value)),
      ),
    );

  const participantsArray = item.participants_array;
  if (Array.isArray(participantsArray) && participantsArray.length > 0) {
    return dedupe(participantsArray);
  }

  const rawParticipants = item.participants?.trim();
  if (!rawParticipants) return [];

  if (rawParticipants.startsWith("[")) {
    try {
      const parsed = JSON.parse(rawParticipants) as unknown;
      if (Array.isArray(parsed)) {
        return dedupe(parsed);
      }
    } catch {
      // Fall through to delimiter parsing.
    }
  }

  return dedupe(rawParticipants.split(/[\n,;]+/));
}

export function getParticipantDisplayName(value: string): string {
  return formatParticipantDisplayName(value);
}

// ─── Inline edit primitives ───────────────────────────────────────────────────

/**
 * Wraps a cell value in a hover-to-edit container.
 * When `isEditing`, renders `children` (the input).
 * When not editing, renders the display value with a subtle hover affordance.
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
      className="inline-flex items-center cursor-pointer rounded px-1 -mx-1 min-h-[28px] hover:bg-accent/20 transition-colors"
      onClick={onClickToEdit}
    >
      {displayContent}
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
  onSave: (move?: "next" | "prev") => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onSave()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSave();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          onSave(e.shiftKey ? "prev" : "next");
        }
      }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      placeholder={placeholder}
      className="h-7 w-full min-w-[120px] rounded bg-accent/25 px-2 text-sm text-foreground focus:outline-none"
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
  onSave: (move?: "next" | "prev") => void;
  onCancel: () => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onSave()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSave();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          onSave(e.shiftKey ? "prev" : "next");
        }
      }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      aria-label="Edit date"
      title="Edit date"
      className="h-7 rounded bg-accent/25 px-2 text-sm text-foreground focus:outline-none"
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
  onSave: (v: string, move?: "next" | "prev") => void;
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
        if (e.key === "Tab") {
          e.preventDefault();
          onSave(value, e.shiftKey ? "prev" : "next");
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      aria-label="Select project"
      title="Select project"
      className="h-7 rounded bg-accent/25 px-2 text-sm text-foreground focus:outline-none"
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
        const isEditing =
          editContext?.editingCell?.meetingId === item.id &&
          editContext?.editingCell?.field === "title";
        const titleText = item.title ?? "Untitled";

        if (isEditing) {
          return (
            <InlineTextInput
              value={editContext?.editingValue ?? ""}
              onChange={(v) => editContext?.setEditingValue(v)}
              onSave={(move) => editContext?.handleInlineSave({ move })}
              onCancel={() => editContext?.handleInlineCancel()}
              placeholder="Meeting title"
            />
          );
        }

        return (
          <div className="group/title inline-flex items-center gap-2 min-w-0 w-full">
            <TableStatusDot status={item.status} />
            <a
              href={`/meetings/${item.id}`}
              className="font-medium truncate hover:underline underline-offset-2"
              onClick={(event) => event.stopPropagation()}
            >
              {titleText}
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto shrink-0 opacity-0 group-hover/title:opacity-100 focus-visible:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                editContext?.handleCellClick(item, "title");
              }}
              aria-label="Edit meeting title"
              title="Edit title"
            >
              <Pencil />
            </Button>
          </div>
        );
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
              <TableDateValue value={item.date} showTime emptyLabel="No date" />
            }
            onClickToEdit={(e) => {
              e.stopPropagation();
              editContext?.handleCellClick(item, "date");
            }}
          >
            <InlineDateInput
              value={editContext?.editingValue ?? ""}
              onChange={(v) => editContext?.setEditingValue(v)}
              onSave={(move) => editContext?.handleInlineSave({ move })}
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
              item.project?.trim() ? (
                <TableTagBadge
                  label={item.project}
                  variant={item.project.toLowerCase().includes("internal") ? "secondary" : "outline"}
                />
              ) : null
            }
            onClickToEdit={(e) => {
              e.stopPropagation();
              editContext?.handleCellClick(item, "project");
            }}
          >
            <InlineProjectSelect
              value={editContext?.editingValue ?? ""}
              projectOptions={editContext?.projectOptions ?? []}
              onSave={(v, move) =>
                editContext?.handleInlineSave({ valueOverride: v, move })
              }
              onCancel={() => editContext?.handleInlineCancel()}
            />
          </EditableCellWrapper>
        );
      },
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
    },

    // ── Description: compact text preview ───────────────────────────────────
    {
      ...meetingColumns[3],
      render: (item) => {
        const description = item.description?.trim();
        if (!description) {
          return null;
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
                  {description}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[420px] border bg-popover p-3 text-popover-foreground shadow-sm">
                <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {description}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      csvValue: (item) => item.description ?? "",
      sortValue: (item) => item.description ?? "",
    },

    // ── Participants: avatar stack with full tooltip ────────────────────────
    {
      ...meetingColumns[4],
      render: (item) => {
        const participants = parseParticipants(item);
        return <TableAvatarUsers users={participants} />;
      },
      csvValue: (item) => parseParticipants(item).join("; "),
      sortValue: (item) => parseParticipants(item).length,
    },

    // ── Type: inline text ────────────────────────────────────────────────────
    {
      ...meetingColumns[5],
      render: (item) => {
        const isEditing =
          editContext?.editingCell?.meetingId === item.id &&
          editContext?.editingCell?.field === "type";

        return (
          <EditableCellWrapper
            isEditing={Boolean(isEditing)}
            displayContent={
              <TableTagBadge label={item.type} variant="secondary" emptyLabel="No type" />
            }
            onClickToEdit={(e) => {
              e.stopPropagation();
              editContext?.handleCellClick(item, "type");
            }}
          >
            <InlineTextInput
              value={editContext?.editingValue ?? ""}
              onChange={(v) => editContext?.setEditingValue(v)}
              onSave={(move) => editContext?.handleInlineSave({ move })}
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
      ...meetingColumns[6],
      render: (item) => {
        const isEditing =
          editContext?.editingCell?.meetingId === item.id &&
          editContext?.editingCell?.field === "category";

        return (
          <EditableCellWrapper
            isEditing={Boolean(isEditing)}
            displayContent={
              <TableTagBadge label={item.category} variant="outline" emptyLabel="No category" />
            }
            onClickToEdit={(e) => {
              e.stopPropagation();
              editContext?.handleCellClick(item, "category");
            }}
          >
            <InlineTextInput
              value={editContext?.editingValue ?? ""}
              onChange={(v) => editContext?.setEditingValue(v)}
              onSave={(move) => editContext?.handleInlineSave({ move })}
              onCancel={() => editContext?.handleInlineCancel()}
              placeholder="Enter category…"
            />
          </EditableCellWrapper>
        );
      },
      csvValue: (item) => item.category ?? "",
      sortValue: (item) => item.category ?? "",
    },

    // ── Links: transcript file icon + Fireflies icon ─────────────────────────
    {
      ...meetingColumns[7],
      render: (item) => {
        return (
          <TableIconLinks
            items={[
              ...(item.source
                ? [{ href: item.source, icon: FileText, label: "Open transcript / source file" }]
                : []),
              ...(item.fireflies_link
                ? [{ href: item.fireflies_link, icon: Flame, label: "View Fireflies recording" }]
                : []),
            ]}
            className="gap-3 [&_svg]:h-4.5 [&_svg]:w-4.5"
          />
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
  onOpenMeetingPage: (meeting: Meeting) => void,
  onEdit: (meeting: Meeting) => void,
  onDelete: (meeting: Meeting) => void,
  onOpenSource: (meeting: Meeting) => void,
  onOpenRecording: (meeting: Meeting) => void,
): ReactElement {
  return (
    <TableRowActionsMenu
      items={[
        {
          key: "open",
          label: "Open meeting page",
          icon: ArrowUpRight,
          onSelect: () => onOpenMeetingPage(item),
        },
        {
          key: "edit",
          label: "Edit details",
          icon: FileText,
          onSelect: () => onEdit(item),
        },
        ...(item.source
          ? [
              {
                key: "source",
                label: "View transcript",
                icon: FileText,
                onSelect: () => onOpenSource(item),
              },
            ]
          : []),
        ...(item.fireflies_link
          ? [
              {
                key: "fireflies",
                label: "View Fireflies",
                icon: Flame,
                onSelect: () => onOpenRecording(item),
              },
            ]
          : []),
        {
          key: "delete",
          label: "Delete",
          icon: Trash2,
          onSelect: () => onDelete(item),
          destructive: true,
        },
      ]}
    />
  );
}

// ─── Card / list renderers ────────────────────────────────────────────────────

export function renderMeetingCard(item: Meeting, onClick: (meeting: Meeting) => void): ReactElement {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <TableDateValue value={item.date} className="uppercase text-muted-foreground" />
          <h3 className="font-medium">{item.title ?? "Untitled Meeting"}</h3>
        </div>
        <TableTagBadge label={item.type} variant="secondary" />
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
        <TableDateValue value={item.date} className="text-muted-foreground" />
      </div>
      <TableTagBadge label={item.type} variant="secondary" />
    </div>
  );
}
