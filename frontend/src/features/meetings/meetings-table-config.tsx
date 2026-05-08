import * as React from "react";

import { ArrowUpRight, FileText, Pencil, Trash2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge, type StatusVariant } from "@/components/ds/status-badge";
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
  categoryOptions: Array<{ value: string; label: string }>;
  projectIdByName: Map<string, number>;
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
  { id: "project", label: "Project", defaultVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "description", label: "Description", defaultVisible: true },
  { id: "participants", label: "Participants", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: false },
  { id: "category", label: "Category", defaultVisible: false },
  { id: "links", label: "Links", defaultVisible: true },
  { id: "embedding", label: "Embedding", defaultVisible: false },
];

export const meetingDefaultVisibleColumns = meetingColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

// ─── Filter / detail field builders ─────────────────────────────────────────

export function buildMeetingFilters(options: {
  types: string[];
  categories: string[];
}): FilterConfig[] {
  return [
    {
      id: "datePreset",
      label: "Date",
      type: "select",
      options: [
        { value: "today", label: "Today" },
        { value: "yesterday", label: "Yesterday" },
        { value: "this_week", label: "This week" },
        { value: "this_month", label: "This month" },
        { value: "this_year", label: "This year" },
        { value: "custom", label: "Custom dates" },
      ],
    },
    {
      id: "dateFrom",
      label: "From",
      type: "date",
    },
    {
      id: "dateTo",
      label: "To",
      type: "date",
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

function getEmbeddingStatus(item: Meeting): {
  label: string;
  variant: StatusVariant;
  sortValue: number;
} {
  const normalizedStatus = item.status?.trim().toLowerCase();

  if (
    normalizedStatus === "embedded" ||
    normalizedStatus === "processed" ||
    normalizedStatus === "compiled" ||
    normalizedStatus === "segmented"
  ) {
    return { label: "Embedded", variant: "success", sortValue: 3 };
  }

  if (normalizedStatus === "error" || normalizedStatus === "embedding_error") {
    return { label: "Error", variant: "error", sortValue: 0 };
  }

  if (normalizedStatus === "skipped_low_content") {
    return { label: "Too short", variant: "neutral", sortValue: 1 };
  }

  if (normalizedStatus === "metadata_only" || normalizedStatus === "missing_metadata") {
    return { label: "Metadata only", variant: "neutral", sortValue: 1 };
  }

  if (item.summary?.trim() || item.content?.trim()) {
    return { label: "Pending", variant: "warning", sortValue: 2 };
  }

  return { label: "Not indexed", variant: "neutral", sortValue: 1 };
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
    <Button
      type="button"
      variant="ghost"
      className="flex h-auto min-h-7 w-full cursor-pointer items-center justify-start rounded px-1 -mx-1 text-left font-normal transition-colors hover:bg-accent/20"
      onClick={onClickToEdit}
    >
      {displayContent}
    </Button>
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
    <Input
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
      className="h-7 min-w-32 border-0 bg-accent/25 px-2 text-sm text-foreground focus-visible:ring-1"
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
    <Input
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
      className="h-7 w-auto border-0 bg-accent/25 px-2 text-sm text-foreground focus-visible:ring-1"
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
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  const selectedLabel =
    projectOptions.find((option) => option.value === value)?.label ||
    value ||
    "No project";

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onCancel]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          onSave(value, e.shiftKey ? "prev" : "next");
        }
      }}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Select project"
        title="Select project"
        className="h-7 min-w-40 max-w-72 justify-start border-0 bg-accent/25 px-2 text-left text-sm font-normal text-foreground focus-visible:ring-1"
      >
        <span className="truncate">{selectedLabel}</span>
      </Button>
      <div className="absolute left-0 top-8 z-50 w-80 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-sm">
        <Command>
          <CommandInput autoFocus placeholder="Search projects..." />
          <CommandList className="max-h-72 overflow-y-auto">
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="No project"
                onSelect={() => {
                  onSave("");
                }}
              >
                <span className="italic text-muted-foreground">No project</span>
              </CommandItem>
              {projectOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onSave(opt.value);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}

function InlineCategorySelect({
  value,
  categoryOptions,
  onSave,
  onCancel,
}: {
  value: string;
  categoryOptions: Array<{ value: string; label: string }>;
  onSave: (v: string, move?: "next" | "prev") => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          onSave(value, e.shiftKey ? "prev" : "next");
        }
      }}
    >
      <Select
        open={open}
        onOpenChange={setOpen}
        value={value || "__none__"}
        onValueChange={(nextValue) => {
          onSave(nextValue === "__none__" ? "" : nextValue);
        }}
      >
        <SelectTrigger
          aria-label="Select category"
          title="Select category"
          className="h-7 min-w-32 border-0 bg-accent/25 px-2 text-sm text-foreground focus:ring-1"
        >
          <SelectValue placeholder="No category" />
        </SelectTrigger>
        <SelectContent onEscapeKeyDown={onCancel}>
          <SelectItem value="__none__">No category</SelectItem>
          {categoryOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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

        const embeddingStatus = getEmbeddingStatus(item);

        return (
          <div className="group/title inline-flex items-center gap-2 min-w-0 w-full">
            <TableStatusDot
              status={embeddingStatus.variant === "neutral" ? null : embeddingStatus.label}
              fallbackLabel={`Embedding: ${embeddingStatus.label}`}
            />
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

    // ── Project: inline select ───────────────────────────────────────────────
    {
      ...meetingColumns[1],
      render: (item) => {
        const isEditing =
          editContext?.editingCell?.meetingId === item.id &&
          editContext?.editingCell?.field === "project";
        const projectName = item.project?.trim();

        return (
          <EditableCellWrapper
            isEditing={Boolean(isEditing)}
            displayContent={
              projectName ? (
                <span className="text-xs text-muted-foreground">{projectName}</span>
              ) : (
                <span className="text-xs text-muted-foreground">No project</span>
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

    // ── Date: inline editable ────────────────────────────────────────────────
    {
      ...meetingColumns[2],
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
                <span className="block max-w-48 truncate text-xs text-muted-foreground">
                  {description}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-96 border bg-popover p-3 text-popover-foreground shadow-sm">
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
            <InlineCategorySelect
              value={editContext?.editingValue ?? ""}
              categoryOptions={editContext?.categoryOptions ?? []}
              onSave={(v, move) =>
                editContext?.handleInlineSave({ valueOverride: v, move })
              }
              onCancel={() => editContext?.handleInlineCancel()}
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
                ? [{ href: item.fireflies_link, icon: Zap, label: "View Fireflies recording" }]
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

    // ── Embedding: summary vectorization status ─────────────────────────────
    {
      ...meetingColumns[8],
      render: (item) => {
        const status = getEmbeddingStatus(item);
        return <StatusBadge status={status.label} variant={status.variant} />;
      },
      csvValue: (item) => getEmbeddingStatus(item).label,
      sortValue: (item) => getEmbeddingStatus(item).sortValue,
      sortable: true,
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
): React.ReactElement {
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
          icon: Pencil,
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
                icon: Zap,
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

export function renderMeetingCard(item: Meeting, onClick: (meeting: Meeting) => void): React.ReactElement {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <TableDateValue value={item.date} className="uppercase text-muted-foreground" />
          {/* eslint-disable-next-line design-system/no-raw-heading */}
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

export function renderMeetingList(item: Meeting, onClick: (meeting: Meeting) => void): React.ReactElement {
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
