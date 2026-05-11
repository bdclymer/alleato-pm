import * as React from "react";

import {
  ArrowUpRight,
  FileText,
  Headphones,
  type LucideIcon,
  Pencil,
  Trash2,
  Video,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
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
  handleCellClick: (meeting: Meeting, field: EditableField) => void;
  setEditingValue: (value: string) => void;
  handleInlineSave: (options?: {
    valueOverride?: string;
    move?: "next" | "prev";
  }) => Promise<void>;
  handleInlineFieldSave: (
    meeting: Meeting,
    field: EditableField,
    value: string,
  ) => Promise<void>;
  handleInlineCancel: () => void;
}

// ─── Column configs ──────────────────────────────────────────────────────────

export const meetingColumns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "description", label: "Description", defaultVisible: true },
  { id: "participants", label: "Participants", defaultVisible: true },
  { id: "video", label: "Video", defaultVisible: false },
  { id: "audio", label: "Audio", defaultVisible: false },
  { id: "keywords", label: "Keywords", defaultVisible: true },
  { id: "sentiment", label: "Sentiment", defaultVisible: true },
  { id: "overview", label: "Overview", defaultVisible: true },
  { id: "action_items", label: "Action Items", defaultVisible: true },
  { id: "bullet_points", label: "Bullet Points", defaultVisible: true },
  { id: "duration_minutes", label: "Duration", defaultVisible: true },
  { id: "summary", label: "Summary", defaultVisible: true },
  { id: "content", label: "Content", defaultVisible: false },
  { id: "type", label: "Type", defaultVisible: false },
  { id: "category", label: "Category", defaultVisible: false },
  { id: "links", label: "Links", defaultVisible: true },
  { id: "embedding", label: "Embedding", defaultVisible: false },
];

export const meetingDefaultVisibleColumns = meetingColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function getMeetingColumn(id: string): ColumnConfig {
  const column = meetingColumns.find((candidate) => candidate.id === id);
  if (!column) {
    throw new Error(`Missing meeting column config for ${id}`);
  }
  return column;
}

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

function EmptyCell(): React.ReactElement {
  return <span className="text-xs text-muted-foreground">—</span>;
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function TextPreviewCell({
  value,
  emptyLabel = "No value",
  className = "max-w-56",
}: {
  value: string | null | undefined;
  emptyLabel?: string;
  className?: string;
}): React.ReactElement {
  const text = normalizeText(value);
  if (!text) {
    return (
      <span className="text-xs text-muted-foreground" title={emptyLabel}>
        —
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`block truncate text-xs text-muted-foreground ${className}`}>
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-96 border bg-popover p-3 text-popover-foreground shadow-sm">
          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {text}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MinimalIconLink({
  href,
  icon: Icon,
  label,
}: {
  href: string | null | undefined;
  icon: LucideIcon;
  label: string;
}): React.ReactElement {
  const normalizedHref = normalizeText(href);
  if (!normalizedHref) return <EmptyCell />;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={normalizedHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(event) => event.stopPropagation()}
          >
            <Icon className="h-3.5 w-3.5 stroke-[1.75]" />
          </a>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatDuration(minutes: number | null | undefined): string {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) {
    return "";
  }

  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;

  if (hours > 0 && remainder > 0) return `${hours}h ${remainder}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainder}m`;
}

function formatSentiment(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Positive" : "Negative";
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatSentiment(entry))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred =
      record.label ??
      record.sentiment ??
      record.overall ??
      record.tone ??
      record.score;
    if (preferred != null) return formatSentiment(preferred);
    return JSON.stringify(record);
  }
  return "";
}

function getKeywordTags(keywords: string[] | null | undefined): string[] {
  if (!Array.isArray(keywords)) return [];

  return Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  );
}

function formatKeywords(keywords: string[] | null | undefined): string {
  return getKeywordTags(keywords).join(", ");
}

function KeywordTagsCell({
  keywords,
  maxVisible = 3,
}: {
  keywords: string[] | null | undefined;
  maxVisible?: number;
}): React.ReactElement {
  const tags = getKeywordTags(keywords);
  if (tags.length === 0) {
    return (
      <span className="text-xs text-muted-foreground" title="No keywords">
        —
      </span>
    );
  }

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenTags = tags.slice(maxVisible);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex max-w-60 flex-wrap items-center gap-1">
            {visibleTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="max-w-24 truncate rounded-sm border-border/70 bg-muted/40 px-1.5 py-0 text-[11px] font-normal text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
            {hiddenTags.length > 0 ? (
              <Badge
                variant="secondary"
                className="rounded-sm px-1.5 py-0 text-[11px] font-normal text-muted-foreground"
              >
                +{hiddenTags.length}
              </Badge>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 border bg-popover p-3 text-popover-foreground shadow-sm">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-sm border-border/70 bg-muted/40 px-1.5 py-0 text-[11px] font-normal text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
  const handleEditIntent = (event: React.MouseEvent) => {
    event.preventDefault();
    onClickToEdit(event);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      className="flex h-auto min-h-7 w-full cursor-pointer items-center justify-start rounded px-1 -mx-1 text-left font-normal transition-colors hover:bg-accent/20"
      onMouseDown={handleEditIntent}
      onClick={handleEditIntent}
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
      ...getMeetingColumn("title"),
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
      ...getMeetingColumn("project"),
      render: (item) => {
        const selectedProjectValue = item.project_id
          ? String(item.project_id)
          : "__none__";

        return (
          <div className="w-72" onClick={(event) => event.stopPropagation()}>
            <SearchableSelect
              options={[
                { value: "__none__", label: "No project" },
                ...(editContext?.projectOptions ?? []),
              ]}
              value={selectedProjectValue}
              onValueChange={(nextValue) => {
                void editContext?.handleInlineFieldSave(
                  item,
                  "project",
                  nextValue === "__none__" ? "" : nextValue,
                );
              }}
              placeholder="No project"
              searchPlaceholder="Search projects..."
              emptyMessage="No projects found."
              className="space-y-0"
              triggerClassName="h-7 border-0 bg-transparent px-1 text-xs font-normal text-muted-foreground hover:bg-accent/20 focus-visible:ring-1"
            />
          </div>
        );
      },
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
    },

    // ── Date: inline editable ────────────────────────────────────────────────
    {
      ...getMeetingColumn("date"),
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
      ...getMeetingColumn("description"),
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
      ...getMeetingColumn("participants"),
      render: (item) => {
        const participants = parseParticipants(item);
        return <TableAvatarUsers users={participants} />;
      },
      csvValue: (item) => parseParticipants(item).join("; "),
      sortValue: (item) => parseParticipants(item).length,
    },

    // ── Video: icon-only media link ─────────────────────────────────────────
    {
      ...getMeetingColumn("video"),
      render: (item) => (
        <MinimalIconLink href={item.video} icon={Video} label="Video" />
      ),
      csvValue: (item) => item.video ?? "",
      sortValue: (item) => item.video ?? "",
      align: "center",
      width: 72,
    },

    // ── Audio: icon-only media link ─────────────────────────────────────────
    {
      ...getMeetingColumn("audio"),
      render: (item) => (
        <MinimalIconLink href={item.audio} icon={Headphones} label="Audio" />
      ),
      csvValue: (item) => item.audio ?? "",
      sortValue: (item) => item.audio ?? "",
      align: "center",
      width: 72,
    },

    // ── Keywords: compact text preview ──────────────────────────────────────
    {
      ...getMeetingColumn("keywords"),
      render: (item) => <KeywordTagsCell keywords={item.keywords} />,
      csvValue: (item) => formatKeywords(item.keywords),
      sortValue: (item) => formatKeywords(item.keywords),
      width: 220,
    },

    // ── Sentiment: compact JSON/string preview ──────────────────────────────
    {
      ...getMeetingColumn("sentiment"),
      render: (item) => (
        <TextPreviewCell
          value={formatSentiment(item.sentiment)}
          emptyLabel="No sentiment"
          className="max-w-36"
        />
      ),
      csvValue: (item) => formatSentiment(item.sentiment),
      sortValue: (item) => formatSentiment(item.sentiment),
      width: 140,
    },

    // ── Overview: compact text preview ──────────────────────────────────────
    {
      ...getMeetingColumn("overview"),
      render: (item) => (
        <TextPreviewCell value={item.overview} emptyLabel="No overview" />
      ),
      csvValue: (item) => item.overview ?? "",
      sortValue: (item) => item.overview ?? "",
      width: 240,
    },

    // ── Action items: compact text preview ──────────────────────────────────
    {
      ...getMeetingColumn("action_items"),
      render: (item) => (
        <TextPreviewCell value={item.action_items} emptyLabel="No action items" />
      ),
      csvValue: (item) => item.action_items ?? "",
      sortValue: (item) => item.action_items ?? "",
      width: 240,
    },

    // ── Bullet points: compact text preview ─────────────────────────────────
    {
      ...getMeetingColumn("bullet_points"),
      render: (item) => (
        <TextPreviewCell value={item.bullet_points} emptyLabel="No bullet points" />
      ),
      csvValue: (item) => item.bullet_points ?? "",
      sortValue: (item) => item.bullet_points ?? "",
      width: 240,
    },

    // ── Duration: minutes formatted as h/m ──────────────────────────────────
    {
      ...getMeetingColumn("duration_minutes"),
      render: (item) => {
        const duration = formatDuration(item.duration_minutes);
        return duration ? (
          <span className="text-xs text-muted-foreground">{duration}</span>
        ) : (
          <EmptyCell />
        );
      },
      csvValue: (item) => formatDuration(item.duration_minutes),
      sortValue: (item) => item.duration_minutes ?? 0,
      width: 96,
    },

    // ── Summary: compact text preview ───────────────────────────────────────
    {
      ...getMeetingColumn("summary"),
      render: (item) => (
        <TextPreviewCell value={item.summary} emptyLabel="No summary" />
      ),
      csvValue: (item) => item.summary ?? "",
      sortValue: (item) => item.summary ?? "",
      width: 240,
    },

    // ── Content: transcript/content preview, hidden by default ──────────────
    {
      ...getMeetingColumn("content"),
      render: (item) => (
        <TextPreviewCell value={item.content} emptyLabel="No content" />
      ),
      csvValue: (item) => item.content ?? "",
      sortValue: (item) => item.content ?? "",
      width: 280,
    },

    // ── Type: inline text ────────────────────────────────────────────────────
    {
      ...getMeetingColumn("type"),
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
      ...getMeetingColumn("category"),
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

    // ── Links: source and media actions ─────────────────────────────────────
    {
      ...getMeetingColumn("links"),
      render: (item) => {
        return (
          <div
            className="flex items-center gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            {item.source ? (
              <MinimalIconLink href={item.source} icon={FileText} label="Transcript" />
            ) : null}
            {item.fireflies_link ? (
              <MinimalIconLink href={item.fireflies_link} icon={Zap} label="Fireflies recording" />
            ) : null}
            {item.video ? (
              <MinimalIconLink href={item.video} icon={Video} label="Video" />
            ) : null}
            {item.audio ? (
              <MinimalIconLink href={item.audio} icon={Headphones} label="Audio" />
            ) : null}
          </div>
        );
      },
      csvValue: (item) =>
        [
          item.source ? "transcript" : "",
          item.fireflies_link ? "fireflies" : "",
          item.video ? "video" : "",
          item.audio ? "audio" : "",
        ]
          .filter(Boolean)
          .join(", "),
      sortValue: (item) => {
        return [
          item.source ? "transcript" : "",
          item.fireflies_link ? "fireflies" : "",
          item.video ? "video" : "",
          item.audio ? "audio" : "",
        ]
          .filter(Boolean)
          .join(",");
      },
    },

    // ── Embedding: summary vectorization status ─────────────────────────────
    {
      ...getMeetingColumn("embedding"),
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
