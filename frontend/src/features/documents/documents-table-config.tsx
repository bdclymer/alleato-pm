import type { ReactElement } from "react";

import {
  ExternalLink,
  Eye,
  FolderOpen,
  Link,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/ds";
import type {
  ColumnConfig,
  FilterConfig,
  TableColumn,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type PipelineDoc = {
  id: string;
  fireflies_id: string | null;
  title: string | null;
  status: string | null;
  type: string | null;
  category: string | null;
  source: string | null;
  date: string | null;
  created_at: string | null;
  file_path: string | null;
  storage_bucket: string | null;
  url: string | null;
  project_id: number | null;
  pipeline_stage: string;
  attempt_count: number;
  last_attempt_at: string | null;
  error_message: string | null;
};

const SOURCE_FILTER_OPTIONS = [
  { value: "fireflies", label: "Fireflies" },
  { value: "upload", label: "Upload" },
  { value: "local", label: "Local" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "transcript", label: "Transcript" },
  { value: "report", label: "Report" },
  { value: "document", label: "Document" },
  { value: "specification", label: "Specification" },
  { value: "contract", label: "Contract" },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: "financial", label: "Financial" },
  { value: "legal", label: "Legal" },
  { value: "technical", label: "Technical" },
  { value: "administrative", label: "Administrative" },
];

export const documentColumns: ColumnConfig[] = [
  { id: "title", label: "Document", alwaysVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "source", label: "Source", defaultVisible: true },
  { id: "pipeline_stage", label: "Pipeline Stage", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: true },
  { id: "error", label: "Error", defaultVisible: false },
];

export const documentFilters: FilterConfig[] = [
  {
    id: "source",
    label: "Source",
    type: "select",
    options: SOURCE_FILTER_OPTIONS,
  },
  {
    id: "type",
    label: "Type",
    type: "select",
    options: TYPE_FILTER_OPTIONS,
  },
  {
    id: "category",
    label: "Category",
    type: "select",
    options: CATEGORY_FILTER_OPTIONS,
  },
];

export const documentDefaultVisibleColumns = documentColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "-";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function stageLabel(stage: string): string {
  switch (stage) {
    case "done":
      return "Complete";
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    default:
      return stage || "Unknown";
  }
}

/**
 * Get the viewable URL for a document. Checks for:
 * 1. Direct URL (e.g. fireflies link)
 * 2. Supabase storage file path
 */
export function getDocumentViewUrl(doc: PipelineDoc): string | null {
  if (doc.url) return doc.url;
  if (doc.file_path && doc.storage_bucket) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${doc.storage_bucket}/${doc.file_path}`;
  }
  if (doc.file_path) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${doc.file_path}`;
  }
  return null;
}

export function buildDocumentTableColumns(opts?: {
  projectNames?: Map<number, string>;
  onEditField?: (docId: string, field: string, value: string) => void;
}): TableColumn<PipelineDoc>[] {
  const { projectNames, onEditField } = opts ?? {};
  const handleEdit = (field: string) =>
    onEditField
      ? (item: PipelineDoc, value: string) => onEditField(item.id, field, value)
      : undefined;

  return [
    {
      ...documentColumns[0],
      render: (item) => {
        const viewUrl = getDocumentViewUrl(item);
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {item.title || "Untitled Document"}
            </span>
            {viewUrl && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="View file"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        );
      },
      sortValue: (item) => item.title ?? "Untitled",
      sortable: true,
      editable: Boolean(onEditField),
      editValue: (item) => item.title ?? "",
      onEdit: handleEdit("title"),
    },
    {
      ...documentColumns[1],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.type || "-"}
        </span>
      ),
      sortValue: (item) => item.type,
      sortable: true,
      editable: Boolean(onEditField),
      editValue: (item) => item.type ?? "",
      onEdit: handleEdit("type"),
    },
    {
      ...documentColumns[2],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.category || "-"}
        </span>
      ),
      sortValue: (item) => item.category,
      sortable: true,
      editable: Boolean(onEditField),
      editValue: (item) => item.category ?? "",
      onEdit: handleEdit("category"),
    },
    {
      ...documentColumns[3],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.source || "-"}
        </span>
      ),
      sortValue: (item) => item.source,
      sortable: true,
    },
    {
      ...documentColumns[4],
      render: (item) => (
        <StatusBadge
          status={stageLabel(item.pipeline_stage)}
          variant={
            item.error_message
              ? "error"
              : item.pipeline_stage === "done"
                ? "success"
                : "warning"
          }
        />
      ),
      sortValue: (item) => item.pipeline_stage,
      sortable: true,
    },
    {
      ...documentColumns[5],
      render: (item) => {
        if (!item.project_id) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }
        const name = projectNames?.get(item.project_id);
        return (
          <span className="text-sm text-muted-foreground">
            {name || `Project #${item.project_id}`}
          </span>
        );
      },
      sortValue: (item) => item.project_id ?? 0,
      sortable: true,
    },
    {
      ...documentColumns[6],
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(item.created_at)}
        </span>
      ),
      sortValue: (item) => item.created_at,
      sortable: true,
    },
    {
      ...documentColumns[7],
      render: (item) =>
        item.error_message ? (
          <span className="text-xs text-destructive line-clamp-2">
            {item.error_message}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
  ];
}

export function renderDocumentCard(
  item: PipelineDoc,
  onView: (item: PipelineDoc) => void,
): ReactElement {
  return (
    <button
      type="button"
      className="flex flex-col gap-2 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
      onClick={() => onView(item)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm line-clamp-2">
          {item.title || "Untitled Document"}
        </span>
        <StatusBadge
          status={stageLabel(item.pipeline_stage)}
          variant={
            item.error_message
              ? "error"
              : item.pipeline_stage === "done"
                ? "success"
                : "warning"
          }
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {item.type && <span>{item.type}</span>}
        {item.category && <span>{item.category}</span>}
        {item.source && <span>{item.source}</span>}
        {item.created_at && <span>{formatDate(item.created_at)}</span>}
      </div>
      {item.error_message && (
        <span className="text-xs text-destructive line-clamp-1">
          {item.error_message}
        </span>
      )}
    </button>
  );
}

export function renderDocumentList(
  item: PipelineDoc,
  onView: (item: PipelineDoc) => void,
): ReactElement {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
      onClick={() => onView(item)}
    >
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {item.title || "Untitled Document"}
        </span>
        <span className="text-xs text-muted-foreground">
          {[item.type, item.category, item.source, formatDate(item.created_at)]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <StatusBadge
        status={stageLabel(item.pipeline_stage)}
        variant={
          item.error_message
            ? "error"
            : item.pipeline_stage === "done"
              ? "success"
              : "warning"
        }
      />
    </button>
  );
}

export function renderDocumentRowActions(
  item: PipelineDoc,
  onView: (item: PipelineDoc) => void,
  onAssignProject?: (item: PipelineDoc) => void,
): ReactElement {
  const viewUrl = getDocumentViewUrl(item);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {viewUrl && (
          <DropdownMenuItem asChild>
            <a href={viewUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View file
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onView(item)}>
          <Eye className="mr-2 h-4 w-4" />
          Details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {onAssignProject && (
          <DropdownMenuItem onClick={() => onAssignProject(item)}>
            <FolderOpen className="mr-2 h-4 w-4" />
            {item.project_id ? "Change project" : "Assign to project"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(item.id);
            toast.success("Document ID copied");
          }}
        >
          <Link className="mr-2 h-4 w-4" />
          Copy ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
