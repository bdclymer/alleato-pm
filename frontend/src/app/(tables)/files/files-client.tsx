"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, File } from "lucide-react";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { CellText, TableDateValue } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FileItem {
  id: string;
  title: string | null;
  file_name: string | null;
  file_path: string | null;
  source_path: string | null;
  source_web_url: string | null;
  url: string | null;
  source_system: string | null;
  source: string | null;
  category: string | null;
  type: string | null;
  document_type: string | null;
  project_id: number | null;
  project: string | null;
  date: string | null;
  created_at: string | null;
  source_last_modified_at: string | null;
  source_size: number | null;
  status: string | null;
  tags: string | null;
  division: string | null;
  overview: string | null;
  participants: string | null;
  access_level: string | null;
}

interface Project {
  id: number;
  name: string;
}

interface FilesClientProps {
  items: FileItem[];
  projects: Project[];
  errorMessage: string | null;
}

// ── File type detection ───────────────────────────────────────────────────────

type FileGroup = "pdf" | "word" | "spreadsheet" | "presentation" | "image" | "text" | "other";

function getFileGroup(item: FileItem): FileGroup {
  const name = (item.file_name ?? item.title ?? "").toLowerCase();
  const ext = name.split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "spreadsheet";
  if (["ppt", "pptx"].includes(ext)) return "presentation";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"].includes(ext)) return "image";
  if (["txt", "md", "rtf"].includes(ext)) return "text";
  return "other";
}

const FILE_GROUP_META: Record<FileGroup, { label: string }> = {
  pdf:          { label: "PDF" },
  word:         { label: "Word" },
  spreadsheet:  { label: "Spreadsheets" },
  presentation: { label: "Slides" },
  image:        { label: "Images" },
  text:         { label: "Text" },
  other:        { label: "Other" },
};

function FileTypeIcon({ className }: { item: FileItem; className?: string }) {
  return <File className={cn("h-4 w-4 shrink-0 text-muted-foreground", className)} />;
}

// ── Source label ──────────────────────────────────────────────────────────────

function friendlySource(item: FileItem): string {
  const sys = item.source_system ?? item.source ?? "";
  if (sys.includes("sharepoint")) return "SharePoint";
  if (sys.includes("onedrive") || sys === "microsoft_graph") return "OneDrive";
  if (sys.includes("knowledge_upload") || sys.includes("upload")) return "Uploaded";
  if (sys.includes("google")) return "Google Drive";
  return sys || "—";
}

// ── Folder helpers ────────────────────────────────────────────────────────────

function parsePathFromSharePointUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const personalMatch = parsed.pathname.match(/\/personal\/[^/]+\/Documents\/(.+)/);
    if (personalMatch) return decodeURIComponent(personalMatch[1]);
    const siteMatch = parsed.pathname.match(/\/sites\/[^/]+\/(?:Shared%20Documents|Documents|[^/]+\/[^/]+)\/(.+)/);
    if (siteMatch) return decodeURIComponent(siteMatch[1]);
    return null;
  } catch {
    return null;
  }
}

function resolvedPath(item: FileItem): string[] {
  if (item.source_path) {
    const parts = item.source_path.split("/").filter(Boolean);
    if (parts.length >= 3) return parts;
  }
  const url = item.source_web_url ?? item.url;
  if (url) {
    const urlPath = parsePathFromSharePointUrl(url);
    if (urlPath) {
      const parts = urlPath.split("/").filter(Boolean);
      if (parts.length >= 2) return parts;
    }
  }
  if (item.source_path) return item.source_path.split("/").filter(Boolean);
  return [];
}

function parentFolderName(item: FileItem): string {
  const parts = resolvedPath(item);
  return parts.length >= 2 ? (parts[parts.length - 2] ?? "—") : "—";
}

function fullFolderPath(item: FileItem): string {
  const parts = resolvedPath(item);
  return parts.length > 1 ? parts.slice(0, -1).join(" / ") : "";
}

// ── File size ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── Inline project select ─────────────────────────────────────────────────────

function InlineProjectSelect({
  item,
  projects,
  onSave,
}: {
  item: FileItem;
  projects: Project[];
  onSave: (docId: string, projectId: number | null, projectName: string | null) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (value: string) => {
    const projectId = value === "__none__" ? null : parseInt(value, 10);
    const project = projects.find((p) => p.id === projectId) ?? null;
    setSaving(true);
    try {
      await apiFetch(`/api/documents/${item.id}/assign-project`, {
        method: "PATCH",
        body: JSON.stringify({ project_id: projectId }),
      });
      onSave(item.id, projectId, project?.name ?? null);
    } catch {
      // silently revert — user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      value={item.project_id != null ? String(item.project_id) : "__none__"}
      onValueChange={handleChange}
      disabled={saving}
    >
      <SelectTrigger
        className="h-7 w-full max-w-55 border-0 bg-transparent px-1.5 text-sm shadow-none focus:ring-0 hover:bg-muted/60 data-[state=open]:bg-muted/60"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue>
          {item.project ?? (
            <span className="text-muted-foreground/50 italic">Unassigned</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="__none__">
          <span className="text-muted-foreground italic">Unassigned</span>
        </SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={String(p.id)}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Inline tag editor ─────────────────────────────────────────────────────────

function InlineTagEditor({
  item,
  onSave,
}: {
  item: FileItem;
  onSave: (docId: string, tags: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.tags ?? "");
  const [saving, setSaving] = useState(false);

  const currentTags = (item.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);

  const open = () => { setValue(item.tags ?? ""); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/documents/${item.id}/assign-project`, {
        method: "PATCH",
        body: JSON.stringify({ tags: value }),
      });
      onSave(item.id, value);
      setEditing(false);
    } catch {
      // revert on failure
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <Input
        ref={(el) => el?.focus()}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        onClick={(e) => e.stopPropagation()}
        className="h-7 border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
        placeholder="tag1, tag2, …"
        disabled={saving}
      />
    );
  }

  if (currentTags.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-1.5 text-xs text-muted-foreground/40 italic font-normal hover:text-muted-foreground"
        onClick={(e) => { e.stopPropagation(); open(); }}
      >
        Add tags
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-1.5 py-1 flex flex-nowrap gap-1 justify-start overflow-hidden max-w-full"
      title="Click to edit tags"
      onClick={(e) => { e.stopPropagation(); open(); }}
    >
      {currentTags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </Button>
  );
}

// ── Indexed / RAG status badge ────────────────────────────────────────────────

function IndexedBadge({ status }: { status: string | null }) {
  if (status === "embedded") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success bg-status-success/10 px-1.5 py-0.5 rounded">
        Indexed
      </span>
    );
  }
  if (status === "ocr_partial") {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded"
        title="OCR ran but this PDF exceeded the page cap — only the first pages were indexed. The full document may not be searchable."
      >
        Partial
      </span>
    );
  }
  if (status === "no_text") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
        No text
      </span>
    );
  }
  if (status === "ocr_failed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-error bg-status-error/10 px-1.5 py-0.5 rounded">
        OCR failed
      </span>
    );
  }
  if (status === "raw_ingested") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-info bg-status-info/10 px-1.5 py-0.5 rounded">
        Pending
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{status ?? "—"}</span>;
}

// ── Columns ───────────────────────────────────────────────────────────────────

const columns: ColumnConfig[] = [
  { id: "name",          label: "Name",                 alwaysVisible: true },
  { id: "document_type", label: "Type",                 defaultVisible: true },
  { id: "category",      label: "Category",             defaultVisible: true },
  { id: "date",          label: "Date",                 defaultVisible: true },
  { id: "overview",      label: "Overview",             defaultVisible: true },
  { id: "status",        label: "Status",               defaultVisible: true },
  { id: "access_level",  label: "Access",               defaultVisible: true },
  { id: "project",       label: "Project",              defaultVisible: true },
  { id: "source",        label: "Source",               defaultVisible: true },
  { id: "modified",      label: "Last Modified",        defaultVisible: false },
  { id: "participants",  label: "Participants",          defaultVisible: false },
  { id: "folder",        label: "Folder",               defaultVisible: false },
  { id: "size",          label: "Size",                 defaultVisible: false },
  { id: "full_path",     label: "Full Path",            defaultVisible: false },
  { id: "division",      label: "Division",             defaultVisible: false },
  { id: "tags",          label: "Tags",                 defaultVisible: false },
];

const defaultVisibleColumns = columns
  .filter((c) => c.alwaysVisible || c.defaultVisible)
  .map((c) => c.id);

function col(id: string): ColumnConfig {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`Column config not found: ${id}`);
  return found;
}

function buildColumns(
  projects: Project[],
  onProjectSave: (docId: string, projectId: number | null, projectName: string | null) => void,
  onTagSave: (docId: string, tags: string) => void,
): TableColumn<FileItem>[] {
  return [
    {
      ...col("name"),
      render: (item) => {
        const href = item.source_web_url ?? item.url;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <FileTypeIcon item={item} />
            <div className="min-w-0">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium truncate block hover:underline underline-offset-2"
                >
                  {item.file_name ?? item.title ?? "Untitled"}
                </a>
              ) : (
                <span className="font-medium truncate block">
                  {item.file_name ?? item.title ?? "Untitled"}
                </span>
              )}
            </div>
          </div>
        );
      },
      csvValue: (item) => item.file_name ?? item.title ?? "",
      sortValue: (item) => (item.file_name ?? item.title ?? "").toLowerCase(),
      sortable: true,
      width: 320,
    },
    {
      ...col("document_type"),
      render: (item) => <CellText value={item.document_type} muted />,
      csvValue: (item) => item.document_type ?? "",
      sortValue: (item) => item.document_type ?? "",
      sortable: true,
    },
    {
      ...col("category"),
      render: (item) => <CellText value={item.category} muted />,
      csvValue: (item) => item.category ?? "",
      sortValue: (item) => item.category ?? "",
      sortable: true,
    },
    {
      ...col("date"),
      render: (item) => <TableDateValue value={item.date ?? item.created_at} />,
      csvValue: (item) => item.date ?? item.created_at ?? "",
      sortValue: (item) => {
        const d = item.date ?? item.created_at;
        return d ? new Date(d).getTime() : 0;
      },
      sortable: true,
    },
    {
      ...col("overview"),
      render: (item) =>
        item.overview ? (
          <span className="text-sm text-muted-foreground line-clamp-2" title={item.overview}>
            {item.overview}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/40">—</span>
        ),
      csvValue: (item) => item.overview ?? "",
      sortValue: (item) => item.overview ?? "",
      sortable: false,
      width: 280,
    },
    {
      ...col("status"),
      render: (item) => <IndexedBadge status={item.status} />,
      csvValue: (item) => item.status ?? "",
      sortValue: (item) => item.status ?? "",
      sortable: true,
      width: 110,
    },
    {
      ...col("access_level"),
      render: (item) => <CellText value={item.access_level} muted />,
      csvValue: (item) => item.access_level ?? "",
      sortValue: (item) => item.access_level ?? "",
      sortable: true,
    },
    {
      ...col("project"),
      render: (item) => (
        <InlineProjectSelect item={item} projects={projects} onSave={onProjectSave} />
      ),
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
      sortable: true,
      width: 220,
    },
    {
      ...col("source"),
      render: (item) => <CellText value={friendlySource(item)} muted />,
      csvValue: (item) => friendlySource(item),
      sortValue: (item) => friendlySource(item),
      sortable: true,
    },
    {
      ...col("modified"),
      render: (item) => (
        <TableDateValue value={item.source_last_modified_at ?? item.date ?? item.created_at} />
      ),
      csvValue: (item) => item.source_last_modified_at ?? item.date ?? item.created_at ?? "",
      sortValue: (item) => {
        const d = item.source_last_modified_at ?? item.date ?? item.created_at;
        return d ? new Date(d).getTime() : 0;
      },
      sortable: true,
    },
    {
      ...col("participants"),
      render: (item) =>
        item.participants ? (
          <span className="text-sm text-muted-foreground truncate" title={item.participants}>
            {item.participants}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/40">—</span>
        ),
      csvValue: (item) => item.participants ?? "",
      sortValue: (item) => item.participants ?? "",
      sortable: false,
      width: 220,
    },
    {
      ...col("folder"),
      render: (item) => {
        const parent = parentFolderName(item);
        const full = fullFolderPath(item);
        return (
          <span className="text-sm text-muted-foreground truncate" title={full || undefined}>
            {parent}
          </span>
        );
      },
      csvValue: (item) => parentFolderName(item),
      sortValue: (item) => parentFolderName(item).toLowerCase(),
      sortable: true,
      width: 200,
    },
    {
      ...col("size"),
      render: (item) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatSize(item.source_size)}
        </span>
      ),
      csvValue: (item) => formatSize(item.source_size),
      sortValue: (item) => item.source_size ?? 0,
      sortable: true,
    },
    {
      ...col("full_path"),
      render: (item) => <CellText value={fullFolderPath(item) || null} muted />,
      csvValue: (item) => fullFolderPath(item),
      sortValue: (item) => fullFolderPath(item).toLowerCase(),
      sortable: true,
      width: 320,
    },
    {
      ...col("division"),
      render: (item) => <CellText value={item.division} muted />,
      csvValue: (item) => item.division ?? "",
      sortValue: (item) => item.division ?? "",
      sortable: true,
    },
    {
      ...col("tags"),
      render: (item) => <InlineTagEditor item={item} onSave={onTagSave} />,
      csvValue: (item) => item.tags ?? "",
      sortable: false,
      width: 240,
    },
  ];
}

// ── Row actions ───────────────────────────────────────────────────────────────

function renderRowActions(item: FileItem) {
  const href = item.source_web_url ?? item.url;
  if (!href) return null;
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
      <a href={href} target="_blank" rel="noreferrer" title="Open file">
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const ACTIVE_GROUPS: FileGroup[] = ["pdf", "word", "spreadsheet", "presentation", "image", "text", "other"];

export function FilesClient({ items, projects, errorMessage }: FilesClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const activeGroup = ((searchParams?.get("group") ?? "")) as FileGroup | "";


  // Optimistic overrides for inline edits
  const [projectOverrides, setProjectOverrides] = useState<
    Record<string, { project_id: number | null; project: string | null }>
  >({});
  const [tagOverrides, setTagOverrides] = useState<Record<string, string>>({});

  const handleProjectSave = useCallback(
    (docId: string, projectId: number | null, projectName: string | null) => {
      setProjectOverrides((prev) => ({ ...prev, [docId]: { project_id: projectId, project: projectName } }));
    },
    [],
  );

  const handleTagSave = useCallback((docId: string, tags: string) => {
    setTagOverrides((prev) => ({ ...prev, [docId]: tags }));
  }, []);

  const itemsWithOverrides = useMemo(
    () => items.map((item) => ({
      ...item,
      ...(projectOverrides[item.id] ?? {}),
      ...(tagOverrides[item.id] !== undefined ? { tags: tagOverrides[item.id] } : {}),
    })),
    [items, projectOverrides, tagOverrides],
  );

  // Filter configs — project options built from the projects list
  const fileFilters = useMemo<FilterConfig[]>(() => [
    {
      id: "file_type",
      label: "File Type",
      type: "multiSelect",
      options: [
        { value: "pdf",          label: "PDF" },
        { value: "word",         label: "Word" },
        { value: "spreadsheet",  label: "Spreadsheet" },
        { value: "presentation", label: "Slides" },
        { value: "image",        label: "Image" },
        { value: "text",         label: "Text" },
        { value: "other",        label: "Other" },
      ],
    },
    {
      id: "project_id",
      label: "Project",
      type: "select",
      options: [
        { value: "__unassigned__", label: "Unassigned" },
        ...projects.map((p) => ({ value: String(p.id), label: p.name })),
      ],
    },
    {
      id: "source",
      label: "Source",
      type: "select",
      options: [
        { value: "OneDrive",   label: "OneDrive" },
        { value: "SharePoint", label: "SharePoint" },
        { value: "Uploaded",   label: "Uploaded" },
      ],
    },
    {
      id: "assigned",
      label: "Assignment",
      type: "select",
      options: [
        { value: "assigned",   label: "Assigned to project" },
        { value: "unassigned", label: "Unassigned" },
      ],
    },
    {
      id: "indexed",
      label: "RAG Status",
      type: "multiSelect",
      options: [
        { value: "embedded",    label: "Indexed" },
        { value: "raw_ingested", label: "Pending indexing" },
        { value: "ocr_partial", label: "Partially indexed (page cap)" },
        { value: "no_text",     label: "No text / not indexed" },
        { value: "ocr_failed",  label: "OCR failed" },
      ],
    },
    {
      id: "modified_after",
      label: "Modified after",
      type: "date",
    },
    {
      id: "modified_before",
      label: "Modified before",
      type: "date",
    },
  ], [projects]);

  const itemsWithGroup = useMemo(
    () => itemsWithOverrides.map((item) => ({ item, group: getFileGroup(item) })),
    [itemsWithOverrides],
  );

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { group } of itemsWithGroup) {
      counts[group] = (counts[group] ?? 0) + 1;
    }
    return counts;
  }, [itemsWithGroup]);

  const tabs = [
    { label: `All (${itemsWithOverrides.length.toLocaleString()})`, href: pathname, isActive: !activeGroup },
    ...ACTIVE_GROUPS
      .filter((g) => (groupCounts[g] ?? 0) > 0)
      .map((g) => ({
        label: `${FILE_GROUP_META[g].label} (${(groupCounts[g] ?? 0).toLocaleString()})`,
        href: `${pathname}?group=${g}`,
        isActive: activeGroup === g,
      })),
  ];

  const tableState = useUnifiedTableState({
    entityKey: "files",
    searchParams: searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "modified",
      sortDirection: "desc",
      visibleColumns: defaultVisibleColumns,
      filters: (() => {
        const f: Record<string, FilterValue> = {};
        const pid = searchParams?.get("project_id");
        if (pid) f.project_id = pid;
        const ft = searchParams?.get("file_type");
        if (ft) f.file_type = ft.split(",");
        const src = searchParams?.get("source");
        if (src) f.source = src;
        const asgn = searchParams?.get("assigned");
        if (asgn) f.assigned = asgn;
        const idx = searchParams?.get("indexed");
        if (idx) f.indexed = idx.split(",");
        const mAfter = searchParams?.get("modified_after");
        if (mAfter) f.modified_after = mAfter;
        const mBefore = searchParams?.get("modified_before");
        if (mBefore) f.modified_before = mBefore;
        return f;
      })(),
    },
  });

  const af = tableState.activeFilters;

  const filteredItems = useMemo(() => {
    let result = activeGroup
      ? itemsWithGroup.filter(({ group }) => group === activeGroup).map(({ item }) => item)
      : itemsWithOverrides;

    const q = tableState.debouncedSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          (item.file_name ?? item.title ?? "").toLowerCase().includes(q) ||
          (item.project ?? "").toLowerCase().includes(q) ||
          (item.division ?? "").toLowerCase().includes(q) ||
          friendlySource(item).toLowerCase().includes(q) ||
          parentFolderName(item).toLowerCase().includes(q) ||
          fullFolderPath(item).toLowerCase().includes(q),
      );
    }

    // File type filter
    const fileTypeFilter = af.file_type;
    if (Array.isArray(fileTypeFilter) && fileTypeFilter.length > 0) {
      result = result.filter((item) => fileTypeFilter.includes(getFileGroup(item)));
    }

    // Project filter
    if (typeof af.project_id === "string" && af.project_id) {
      if (af.project_id === "__unassigned__") {
        result = result.filter((item) => item.project_id == null);
      } else {
        result = result.filter(
          (item) => item.project_id != null && String(item.project_id) === af.project_id,
        );
      }
    }

    // Source filter
    if (typeof af.source === "string" && af.source) {
      result = result.filter((item) => friendlySource(item) === af.source);
    }

    // Assignment filter
    if (af.assigned === "assigned") {
      result = result.filter((item) => item.project_id != null);
    } else if (af.assigned === "unassigned") {
      result = result.filter((item) => item.project_id == null);
    }

    // RAG status filter
    const indexedFilter = af.indexed;
    if (Array.isArray(indexedFilter) && indexedFilter.length > 0) {
      result = result.filter((item) => indexedFilter.includes(item.status ?? ""));
    }

    // Modified after
    if (typeof af.modified_after === "string" && af.modified_after) {
      const from = new Date(af.modified_after);
      result = result.filter((item) => {
        const d = item.source_last_modified_at ?? item.date ?? item.created_at;
        return d ? new Date(d) >= from : false;
      });
    }

    // Modified before
    if (typeof af.modified_before === "string" && af.modified_before) {
      const to = new Date(af.modified_before);
      result = result.filter((item) => {
        const d = item.source_last_modified_at ?? item.date ?? item.created_at;
        return d ? new Date(d) <= to : false;
      });
    }

    return result;
  }, [activeGroup, itemsWithGroup, itemsWithOverrides, tableState.debouncedSearch, af]);

  const handleFilterChange = useCallback(
    (next: Record<string, unknown>) => {
      tableState.setActiveFilters(next as Record<string, FilterValue>);
      tableState.setSearchParams(
        Object.fromEntries(
          Object.entries(next).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.join(",") : (v == null ? null : String(v)),
          ]),
        ),
      );
      tableState.setPage(1);
    },
    [tableState],
  );

  const tableColumns = useMemo(
    () => buildColumns(projects, handleProjectSave, handleTagSave),
    [projects, handleProjectSave, handleTagSave],
  );

  const sortedItems = useMemo(() => {
    const col = tableColumns.find((c) => c.id === tableState.sortBy);
    if (!col?.sortValue) return filteredItems;
    const sortValue = col.sortValue;
    return [...filteredItems].sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);
      if (va == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (vb == null) return tableState.sortDirection === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number")
        return tableState.sortDirection === "asc" ? va - vb : vb - va;
      return tableState.sortDirection === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filteredItems, tableColumns, tableState.sortBy, tableState.sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / tableState.perPage));
  const paginatedItems = useMemo(() => {
    const start = (tableState.page - 1) * tableState.perPage;
    return sortedItems.slice(start, start + tableState.perPage);
  }, [sortedItems, tableState.page, tableState.perPage]);

  const activeTabLabel = tabs.find((t) => t.isActive)?.label.split(" (")[0].toLowerCase() ?? "file";

  return (
    <UnifiedTablePage<FileItem>
      header={{
        title: "Files",
        description: `${filteredItems.length.toLocaleString()} ${activeGroup ? FILE_GROUP_META[activeGroup].label : "file"}${filteredItems.length === 1 ? "" : "s"} from OneDrive, SharePoint, and uploads`,
      }}
      tabs={tabs}
      layout={{ fullBleedTable: true }}
      toolbar={{
        totalItems: itemsWithOverrides.length,
        filteredItems: filteredItems.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search by name, project, source…",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        filters: fileFilters,
        activeFilters: af,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange({}),
        columns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: paginatedItems,
        isLoading: false,
        isFetching: false,
        error: errorMessage ? new Error(errorMessage) : null,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
        rowActions: renderRowActions,
      }}
      sorting={{
        sortBy: tableState.sortBy,
        sortDirection: tableState.sortDirection,
        onSortChange: (col, dir) => {
          tableState.setSortBy(col);
          tableState.setSortDirection(dir);
          tableState.setPage(1);
        },
      }}
      selection={{ selectedIds: [], onSelectAll: () => {}, onSelectRow: () => {} }}
      emptyState={{
        title: `No ${activeTabLabel} files`,
        description: activeGroup
          ? `No ${FILE_GROUP_META[activeGroup].label.toLowerCase()} files have been synced yet.`
          : "No files have been synced from OneDrive or SharePoint yet.",
        filteredDescription: "Try adjusting your search.",
        isFiltered: !!tableState.debouncedSearch,
      }}
      pagination={{
        page: tableState.page,
        totalPages,
        perPage: tableState.perPage,
        onPageChange: (p) => {
          tableState.setPage(p);
          tableState.setSearchParams({ page: String(p) });
        },
        onPerPageChange: (pp) => {
          tableState.setPerPage(Number(pp));
          tableState.setPage(1);
        },
      }}
    />
  );
}
