import type { ReactElement } from "react";

import { formatDate } from "@/lib/format";
import {
  Download,
  Eye,
  File,
  FileCode,
  FileImage,
  FilePen,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  Lock,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

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
import type { ProjectDocument } from "@/hooks/use-documents";

// =============================================================================
// Filter Options
// =============================================================================

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Published", label: "Published" },
  { value: "Superseded", label: "Superseded" },
  { value: "Archived", label: "Archived" },
];

const CATEGORY_OPTIONS = [
  { value: "General", label: "General" },
  { value: "Financial", label: "Financial" },
  { value: "Legal", label: "Legal" },
  { value: "Technical", label: "Technical" },
  { value: "Administrative", label: "Administrative" },
  { value: "Safety", label: "Safety" },
  { value: "Environmental", label: "Environmental" },
  { value: "Design", label: "Design" },
];

// =============================================================================
// Column Config
// =============================================================================

export const projectDocumentColumns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "file_name", label: "File Name", defaultVisible: true },
  { id: "folder", label: "Folder", defaultVisible: false },
  { id: "version", label: "Version", defaultVisible: false },
  { id: "status", label: "Status", defaultVisible: false },
  { id: "category", label: "Category", defaultVisible: false },
  { id: "file_size", label: "File Size", defaultVisible: false },
  { id: "uploaded_by", label: "Uploaded By", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: true },
  { id: "content_type", label: "Content Type", defaultVisible: false },
  { id: "is_private", label: "Private", defaultVisible: false },
  { id: "reviewed_by", label: "Reviewed By", defaultVisible: false },
  { id: "reviewed_at", label: "Reviewed At", defaultVisible: false },
  { id: "description", label: "Description", defaultVisible: false },
];

export const projectDocumentFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: STATUS_OPTIONS,
  },
  {
    id: "folder",
    label: "Folder",
    type: "text",
  },
  {
    id: "category",
    label: "Category",
    type: "select",
    options: CATEGORY_OPTIONS,
  },
];

export const projectDocumentDefaultVisibleColumns = projectDocumentColumns
  .filter((col) => col.defaultVisible !== false)
  .map((col) => col.id);

// =============================================================================
// Helpers
// =============================================================================

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function sortValueForDate(value: string | null | undefined): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

// =============================================================================
// Table Columns Builder
// =============================================================================

export function buildDocumentTableColumns(): TableColumn<ProjectDocument>[] {
  return [
    {
      ...projectDocumentColumns[0],
      width: 280,
      render: (item) => (
        <div className="flex items-center gap-1.5">
          {item.is_private && (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="font-medium text-primary underline decoration-primary/40 underline-offset-4">
            {item.title}
          </span>
        </div>
      ),
      csvValue: (item) => item.title,
      sortValue: (item) => item.title,
      sortable: true,
    },
    {
      ...projectDocumentColumns[1],
      render: (item) => (
        <span className="text-muted-foreground">{item.file_name}</span>
      ),
      csvValue: (item) => item.file_name,
      sortValue: (item) => item.file_name,
      sortable: true,
    },
    {
      ...projectDocumentColumns[2],
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{item.folder ?? "Root"}</span>
        </div>
      ),
      csvValue: (item) => item.folder ?? "Root",
      sortValue: (item) => item.folder ?? "Root",
      sortable: true,
    },
    {
      ...projectDocumentColumns[3],
      width: 90,
      render: (item) => (
        <span className="text-muted-foreground">v{item.version ?? 1}</span>
      ),
      csvValue: (item) => String(item.version ?? 1),
      sortValue: (item) => item.version ?? 1,
      sortable: true,
    },
    {
      ...projectDocumentColumns[4],
      width: 120,
      render: (item) => <StatusBadge status={item.status} />,
      csvValue: (item) => item.status,
      sortValue: (item) => item.status,
      sortable: true,
    },
    {
      ...projectDocumentColumns[5],
      render: (item) => (
        <span className="text-muted-foreground">{item.category ?? "-"}</span>
      ),
      csvValue: (item) => item.category ?? "",
      sortValue: (item) => item.category ?? "",
      sortable: true,
    },
    {
      ...projectDocumentColumns[6],
      width: 100,
      render: (item) => (
        <span className="text-muted-foreground tabular-nums">
          {formatFileSize(item.file_size)}
        </span>
      ),
      csvValue: (item) => formatFileSize(item.file_size),
      sortValue: (item) => item.file_size ?? 0,
      sortable: true,
    },
    {
      ...projectDocumentColumns[7],
      render: (item) => (
        <span className="text-muted-foreground">{item.uploaded_by ?? "-"}</span>
      ),
      csvValue: (item) => item.uploaded_by ?? "",
      sortValue: (item) => item.uploaded_by ?? "",
      sortable: true,
    },
    {
      ...projectDocumentColumns[8],
      width: 120,
      render: (item) => (
        <span className="text-muted-foreground">{formatDate(item.created_at)}</span>
      ),
      csvValue: (item) => item.created_at ?? "",
      sortValue: (item) => sortValueForDate(item.created_at),
      sortable: true,
    },
    {
      ...projectDocumentColumns[9],
      render: (item) => (
        <span className="text-muted-foreground">{item.content_type ?? "-"}</span>
      ),
      csvValue: (item) => item.content_type ?? "",
      sortValue: (item) => item.content_type ?? "",
    },
    {
      ...projectDocumentColumns[10],
      width: 80,
      render: (item) => (
        <span className="text-muted-foreground">
          {item.is_private ? "Yes" : "No"}
        </span>
      ),
      csvValue: (item) => (item.is_private ? "Yes" : "No"),
      sortValue: (item) => (item.is_private ? 1 : 0),
    },
    {
      ...projectDocumentColumns[11],
      render: (item) => (
        <span className="text-muted-foreground">{item.reviewed_by ?? "-"}</span>
      ),
      csvValue: (item) => item.reviewed_by ?? "",
      sortValue: (item) => item.reviewed_by ?? "",
    },
    {
      ...projectDocumentColumns[12],
      render: (item) => (
        <span className="text-muted-foreground">
          {formatDate(item.reviewed_at)}
        </span>
      ),
      csvValue: (item) => item.reviewed_at ?? "",
      sortValue: (item) => sortValueForDate(item.reviewed_at),
    },
    {
      ...projectDocumentColumns[13],
      render: (item) => (
        <span className="text-muted-foreground line-clamp-2">
          {item.description ?? "-"}
        </span>
      ),
      csvValue: (item) => item.description ?? "",
      sortValue: (item) => item.description ?? "",
    },
  ];
}

// =============================================================================
// Card View — Dropbox-style preview
// =============================================================================

function getFileTypeInfo(fileName: string): {
  icon: ReactElement;
  bg: string;
  ext: string;
} {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext))
    return { icon: <FileImage className="h-10 w-10" />, bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400", ext };
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext))
    return { icon: <FileVideo className="h-10 w-10" />, bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400", ext };
  if (["xls", "xlsx", "csv"].includes(ext))
    return { icon: <FileSpreadsheet className="h-10 w-10" />, bg: "bg-green-500/10 text-green-600 dark:text-green-400", ext };
  if (["doc", "docx", "txt", "rtf"].includes(ext))
    return { icon: <FileText className="h-10 w-10" />, bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400", ext };
  if (["pdf"].includes(ext))
    return { icon: <FileText className="h-10 w-10" />, bg: "bg-red-500/10 text-red-600 dark:text-red-400", ext };
  if (["js", "ts", "tsx", "jsx", "py", "rb", "json", "xml", "html", "css"].includes(ext))
    return { icon: <FileCode className="h-10 w-10" />, bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400", ext };

  return { icon: <File className="h-10 w-10" />, bg: "bg-muted text-muted-foreground", ext };
}

export function renderDocumentCard(
  item: ProjectDocument,
  onClick: (doc: ProjectDocument) => void,
): ReactElement {
  const { icon, bg, ext } = getFileTypeInfo(item.file_name ?? "");

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-lg bg-card shadow-xs transition-shadow hover:shadow-sm"
      onClick={() => onClick(item)}
    >
      {/* Preview area */}
      <div className={`flex h-32 items-center justify-center ${bg} relative`}>
        {icon}
        {ext && (
          <span className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-background/80 text-foreground">
            {ext}
          </span>
        )}
        {item.is_private && (
          <span className="absolute top-2 right-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        )}
      </div>

      {/* File info */}
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-medium leading-tight">{item.title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <FolderOpen className="h-3 w-3 shrink-0" />
          {item.folder ?? "Root"}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// List View
// =============================================================================

export function renderDocumentList(
  item: ProjectDocument,
  onClick: (doc: ProjectDocument) => void,
): ReactElement {
  return (
    <div
      className="flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/50"
      onClick={() => onClick(item)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {[
            item.file_name,
            item.folder ?? "Root",
            `v${item.version ?? 1}`,
            item.category,
            formatFileSize(item.file_size),
            formatDate(item.created_at),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2">
        {item.is_private && (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
}

// =============================================================================
// Row Actions
// =============================================================================

export function renderDocumentRowActions(
  item: ProjectDocument,
  projectId: string,
  onEdit: (doc: ProjectDocument) => void,
  onDelete: (doc: ProjectDocument) => void,
): ReactElement {
  const documentUrl = `/api/projects/${projectId}/documents/${item.id}/download`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(item.storage_path || item.file_url) && (
          <DropdownMenuItem asChild>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="mr-2 h-4 w-4" />
              View File
            </a>
          </DropdownMenuItem>
        )}
        {(item.storage_path || item.file_url) && (
          <DropdownMenuItem asChild>
            <a href={documentUrl} download={item.file_name}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEdit(item)}>
          <FilePen className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
