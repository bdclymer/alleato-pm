"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, File } from "lucide-react";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type TableColumn,
} from "@/components/tables/unified";
import { CellText, TableDateValue, TruncatedCell } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
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
  project_id: number | null;
  project: string | null;
  date: string | null;
  created_at: string | null;
  source_last_modified_at: string | null;
  source_size: number | null;
  status: string | null;
  tags: string | null;
  division: string | null;
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

// ── Columns ───────────────────────────────────────────────────────────────────

const columns: ColumnConfig[] = [
  { id: "name",      label: "Name",     alwaysVisible: true },
  { id: "project",   label: "Project",  defaultVisible: true },
  { id: "folder",    label: "Folder",   defaultVisible: true },
  { id: "modified",  label: "Modified", defaultVisible: true },
  { id: "size",      label: "Size",     defaultVisible: true },
  { id: "source",    label: "Source",   defaultVisible: true },
  { id: "full_path", label: "Full Path",defaultVisible: false },
  { id: "division",  label: "Division", defaultVisible: false },
  { id: "tags",      label: "Tags",     defaultVisible: false },
];

const defaultVisibleColumns = columns.filter((c) => c.defaultVisible !== false).map((c) => c.id);

function buildColumns(
  projects: Project[],
  onProjectSave: (docId: string, projectId: number | null, projectName: string | null) => void,
): TableColumn<FileItem>[] {
  return [
    // Name — the filename itself is the only link to the file
    {
      ...columns[0],
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
      width: 380,
    },
    // Project — inline editable
    {
      ...columns[1],
      render: (item) => (
        <InlineProjectSelect item={item} projects={projects} onSave={onProjectSave} />
      ),
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
      sortable: true,
      width: 240,
    },
    // Folder (immediate parent)
    {
      ...columns[2],
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
    // Modified
    {
      ...columns[3],
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
    // Size
    {
      ...columns[4],
      render: (item) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatSize(item.source_size)}
        </span>
      ),
      csvValue: (item) => formatSize(item.source_size),
      sortValue: (item) => item.source_size ?? 0,
      sortable: true,
    },
    // Source
    {
      ...columns[5],
      render: (item) => <CellText value={friendlySource(item)} muted />,
      csvValue: (item) => friendlySource(item),
      sortValue: (item) => friendlySource(item),
      sortable: true,
    },
    // Full path (hidden by default)
    {
      ...columns[6],
      render: (item) => <CellText value={fullFolderPath(item) || null} muted />,
      csvValue: (item) => fullFolderPath(item),
      sortValue: (item) => fullFolderPath(item).toLowerCase(),
      sortable: true,
      width: 320,
    },
    // Division
    {
      ...columns[7],
      render: (item) => <CellText value={item.division} muted />,
      csvValue: (item) => item.division ?? "",
      sortValue: (item) => item.division ?? "",
      sortable: true,
    },
    // Tags
    {
      ...columns[8],
      render: (item) => <TruncatedCell value={item.tags} maxWidth={200} className="text-sm" />,
      csvValue: (item) => item.tags ?? "",
      sortable: false,
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
  const rawSearchParams = useSearchParams();
  const searchParams = rawSearchParams ?? new URLSearchParams();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const activeGroup = (searchParams.get("group") ?? "") as FileGroup | "";

  // Optimistic project overrides so edits reflect immediately
  const [projectOverrides, setProjectOverrides] = useState<
    Record<string, { project_id: number | null; project: string | null }>
  >({});

  const handleProjectSave = useCallback(
    (docId: string, projectId: number | null, projectName: string | null) => {
      setProjectOverrides((prev) => ({ ...prev, [docId]: { project_id: projectId, project: projectName } }));
    },
    [],
  );

  const itemsWithOverrides = useMemo(
    () => items.map((item) => ({ ...item, ...(projectOverrides[item.id] ?? {}) })),
    [items, projectOverrides],
  );

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
      filters: {},
    },
  });

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

    return result;
  }, [activeGroup, itemsWithGroup, itemsWithOverrides, tableState.debouncedSearch]);

  const tableColumns = useMemo(
    () => buildColumns(projects, handleProjectSave),
    [projects, handleProjectSave],
  );

  const sortedItems = useMemo(() => {
    const col = tableColumns.find((c) => c.id === tableState.sortBy);
    if (!col?.sortValue) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
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
        filters: [],
        activeFilters: {},
        onFilterChange: () => {},
        onClearFilters: () => {},
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
