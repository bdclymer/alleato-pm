"use client";

import * as React from "react";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation,
} from "lucide-react";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type TableColumn,
} from "@/components/tables/unified";
import { CellText, TableDateValue, TruncatedCell } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FileItem {
  id: string;
  title: string | null;
  file_name: string | null;
  file_path: string | null;
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
  status: string | null;
  tags: string | null;
  division: string | null;
}

interface FilesClientProps {
  items: FileItem[];
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

const FILE_GROUP_META: Record<FileGroup, { label: string; icon: React.ElementType; color: string }> = {
  pdf:          { label: "PDF",           icon: FileText,        color: "text-red-500" },
  word:         { label: "Word",          icon: FileType,        color: "text-blue-500" },
  spreadsheet:  { label: "Spreadsheets",  icon: FileSpreadsheet, color: "text-green-600" },
  presentation: { label: "Slides",        icon: Presentation,    color: "text-orange-500" },
  image:        { label: "Images",        icon: FileImage,       color: "text-purple-500" },
  text:         { label: "Text",          icon: FileText,        color: "text-muted-foreground" },
  other:        { label: "Other",         icon: File,            color: "text-muted-foreground" },
};

function FileTypeIcon({ item, className }: { item: FileItem; className?: string }) {
  const group = getFileGroup(item);
  const { icon: Icon, color } = FILE_GROUP_META[group];
  return <Icon className={cn("h-4 w-4 shrink-0", color, className)} />;
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

// ── Columns ───────────────────────────────────────────────────────────────────

const columns: ColumnConfig[] = [
  { id: "name",       label: "Name",    alwaysVisible: true },
  { id: "source",     label: "Source",  defaultVisible: true },
  { id: "project",    label: "Project", defaultVisible: true },
  { id: "date",       label: "Date",    defaultVisible: true },
  { id: "division",   label: "Division",defaultVisible: false },
  { id: "tags",       label: "Tags",    defaultVisible: false },
];

const defaultVisibleColumns = columns.filter((c) => c.defaultVisible !== false).map((c) => c.id);

function buildColumns(): TableColumn<FileItem>[] {
  return [
    {
      ...columns[0],
      render: (item) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <FileTypeIcon item={item} />
          <span className="font-medium truncate">
            {item.file_name ?? item.title ?? "Untitled"}
          </span>
        </div>
      ),
      csvValue: (item) => item.file_name ?? item.title ?? "",
      sortValue: (item) => (item.file_name ?? item.title ?? "").toLowerCase(),
      sortable: true,
      width: 380,
    },
    {
      ...columns[1],
      render: (item) => <CellText value={friendlySource(item)} muted />,
      csvValue: (item) => friendlySource(item),
      sortValue: (item) => friendlySource(item),
      sortable: true,
    },
    {
      ...columns[2],
      render: (item) => <CellText value={item.project} muted />,
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
      sortable: true,
    },
    {
      ...columns[3],
      render: (item) => <TableDateValue value={item.date ?? item.created_at} />,
      csvValue: (item) => item.date ?? item.created_at ?? "",
      sortValue: (item) => {
        const d = item.date ?? item.created_at;
        return d ? new Date(d).getTime() : 0;
      },
      sortable: true,
    },
    {
      ...columns[4],
      render: (item) => <CellText value={item.division} muted />,
      csvValue: (item) => item.division ?? "",
      sortValue: (item) => item.division ?? "",
      sortable: true,
    },
    {
      ...columns[5],
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

export function FilesClient({ items, errorMessage }: FilesClientProps) {
  const rawSearchParams = useSearchParams();
  const searchParams = rawSearchParams ?? new URLSearchParams();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const activeGroup = (searchParams.get("group") ?? "") as FileGroup | "";

  // Pre-compute group for each item once
  const itemsWithGroup = useMemo(
    () => items.map((item) => ({ item, group: getFileGroup(item) })),
    [items],
  );

  // Count per group
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { group } of itemsWithGroup) {
      counts[group] = (counts[group] ?? 0) + 1;
    }
    return counts;
  }, [itemsWithGroup]);

  const tabs = [
    { label: `All (${items.length.toLocaleString()})`, href: pathname, isActive: !activeGroup },
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
    searchParams: rawSearchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "date",
      sortDirection: "desc",
      visibleColumns: defaultVisibleColumns,
      filters: {},
    },
  });

  const filteredItems = useMemo(() => {
    let result = activeGroup
      ? itemsWithGroup.filter(({ group }) => group === activeGroup).map(({ item }) => item)
      : items;

    const q = tableState.debouncedSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          (item.file_name ?? item.title ?? "").toLowerCase().includes(q) ||
          (item.project ?? "").toLowerCase().includes(q) ||
          (item.division ?? "").toLowerCase().includes(q) ||
          friendlySource(item).toLowerCase().includes(q),
      );
    }

    return result;
  }, [activeGroup, itemsWithGroup, items, tableState.debouncedSearch]);

  const tableColumns = useMemo(() => buildColumns(), []);

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
        totalItems: items.length,
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
        onRowClick: (item) => {
          const href = item.source_web_url ?? item.url;
          if (href) window.open(href, "_blank", "noopener,noreferrer");
        },
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
