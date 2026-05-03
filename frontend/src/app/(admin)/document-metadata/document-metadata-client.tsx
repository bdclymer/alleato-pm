"use client";

import * as React from "react";
import { useMemo } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CellText,
  TableDateValue,
  TruncatedCell,
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { createClient } from "@/lib/supabase/client";
import { DocumentMetadataSheet } from "./document-metadata-sheet";

// ── Types ────────────────────────────────────────────────────────────────────

interface DocumentMetadataItem {
  id: string;
  title: string | null;
  type: string | null;
  source: string | null;
  source_system: string | null;
  content: string | null;
  summary: string | null;
  date: string | null;
  created_at: string | null;
  status: string | null;
  participants: string | null;
  project_id: number | null;
  project: string | null;
  phase: string;
  category: string | null;
  division: string | null;
  duration_minutes: number | null;
  meeting_type: string | null;
  host_email: string | null;
  organizer_email: string | null;
  url: string | null;
  fireflies_link: string | null;
}

interface DocumentMetadataClientProps {
  items: DocumentMetadataItem[];
  errorMessage: string | null;
}

// ── Filter state ──────────────────────────────────────────────────────────────

type FilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: FilterState = {};
const NO_PROJECT_VALUE = "__none__";

// ── Project select editor ─────────────────────────────────────────────────────

function ProjectSelectEditor({
  item,
  projectOptions,
  onChange,
  onCancel,
  onProjectEdit,
}: {
  item: DocumentMetadataItem;
  projectOptions: string[];
  onChange: (value: string) => void;
  onCancel: () => void;
  onProjectEdit: (item: DocumentMetadataItem, value: string) => Promise<void>;
}) {
  // Track open state via ref (sync) so onBlur doesn't fire onCancel while the
  // dropdown portal is open — Radix renders SelectContent outside the trigger's
  // DOM subtree, causing an immediate blur/cancel on open.
  const isOpenRef = React.useRef(false);

  return (
    <Select
      defaultValue={item.project ?? NO_PROJECT_VALUE}
      onOpenChange={(open) => { isOpenRef.current = open; }}
      onValueChange={(value) => {
        const nextValue = value === NO_PROJECT_VALUE ? "" : value;
        onChange(nextValue);
        void onProjectEdit(item, nextValue).finally(() => onCancel());
      }}
    >
      <SelectTrigger
        autoFocus
        className="h-7 w-full -my-0.5 text-sm"
        onBlur={() => { if (!isOpenRef.current) onCancel(); }}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
      >
        <SelectValue placeholder="— None —" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_PROJECT_VALUE}>— None —</SelectItem>
        {projectOptions.map((p) => (
          <SelectItem key={p} value={p}>{p}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Column metadata ──────────────────────────────────────────────────────────

const columns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "source_system", label: "Source", defaultVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "duration_minutes", label: "Duration", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: false },
  { id: "division", label: "Division", defaultVisible: false },
  { id: "meeting_type", label: "Meeting Type", defaultVisible: false },
  { id: "host_email", label: "Host", defaultVisible: false },
  { id: "content", label: "Content", defaultVisible: false },
  { id: "summary", label: "Summary", defaultVisible: false },
  { id: "participants", label: "Participants", defaultVisible: false },
  { id: "created_at", label: "Created", defaultVisible: false },
];

const defaultVisibleColumns = columns
  .filter((c) => c.defaultVisible !== false)
  .map((c) => c.id);

// ── Table columns ─────────────────────────────────────────────────────────────

function buildTableColumns(
  projectOptions: string[],
  onProjectEdit: (item: DocumentMetadataItem, value: string) => Promise<void>,
): TableColumn<DocumentMetadataItem>[] {
  return [
    {
      ...columns[0],
      render: (item) => (
        <span className="font-medium">{item.title ?? "Untitled"}</span>
      ),
      csvValue: (item) => item.title ?? "",
      sortValue: (item) => item.title ?? "",
      sortable: true,
    },
    {
      ...columns[1],
      render: (item) => (
        <CellText value={item.source_system ?? item.source} muted />
      ),
      csvValue: (item) => item.source_system ?? item.source ?? "",
      sortValue: (item) => item.source_system ?? item.source ?? "",
      sortable: true,
    },
    {
      ...columns[2],
      render: (item) => <TableDateValue value={item.date} />,
      csvValue: (item) => item.date ?? "",
      sortValue: (item) => (item.date ? new Date(item.date).getTime() : 0),
      sortable: true,
    },
    {
      ...columns[3],
      render: (item) =>
        item.status ? (
          <StatusBadge status={item.status} />
        ) : (
          <CellText value={null} muted />
        ),
      csvValue: (item) => item.status ?? "",
      sortValue: (item) => item.status ?? "",
      sortable: true,
    },
    {
      ...columns[4],
      render: (item) => <CellText value={item.project} muted />,
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
      sortable: true,
      editable: true,
      editValue: (item) => item.project ?? "",
      renderEditor: ({ item: editorItem, onChange, onCancel }) => (
        <ProjectSelectEditor
          item={editorItem}
          projectOptions={projectOptions}
          onChange={onChange}
          onCancel={onCancel}
          onProjectEdit={onProjectEdit}
        />
      ),
    },
    {
      ...columns[5],
      render: (item) => (
        <span className="tabular-nums">
          {formatDuration(item.duration_minutes)}
        </span>
      ),
      csvValue: (item) => String(item.duration_minutes ?? ""),
      sortValue: (item) => item.duration_minutes ?? 0,
      sortable: true,
    },
    {
      ...columns[6],
      render: (item) => <CellText value={item.category} muted />,
      csvValue: (item) => item.category ?? "",
      sortValue: (item) => item.category ?? "",
      sortable: true,
    },
    {
      ...columns[7],
      render: (item) => <CellText value={item.division} muted />,
      csvValue: (item) => item.division ?? "",
      sortValue: (item) => item.division ?? "",
      sortable: true,
    },
    {
      ...columns[8],
      render: (item) => <CellText value={item.meeting_type} muted />,
      csvValue: (item) => item.meeting_type ?? "",
      sortValue: (item) => item.meeting_type ?? "",
      sortable: true,
    },
    {
      ...columns[9],
      render: (item) => (
        <CellText value={item.host_email ?? item.organizer_email} muted />
      ),
      csvValue: (item) => item.host_email ?? item.organizer_email ?? "",
      sortValue: (item) => item.host_email ?? item.organizer_email ?? "",
      sortable: true,
    },
    {
      ...columns[10],
      render: (item) => <TruncatedCell value={item.content} maxWidth={400} className="text-sm" />,
      csvValue: (item) => item.content ?? "",
      sortable: false,
      width: 420,
    },
    {
      ...columns[11],
      render: (item) => <TruncatedCell value={item.summary} maxWidth={300} className="text-sm" />,
      csvValue: (item) => item.summary ?? "",
      sortable: false,
      width: 320,
    },
    {
      ...columns[12],
      render: (item) => <TruncatedCell value={item.participants} maxWidth={240} className="text-sm" />,
      csvValue: (item) => item.participants ?? "",
      sortable: false,
    },
    {
      ...columns[13],
      render: (item) => <TableDateValue value={item.created_at} />,
      csvValue: (item) => item.created_at ?? "",
      sortValue: (item) =>
        item.created_at ? new Date(item.created_at).getTime() : 0,
      sortable: true,
    },
  ];
}

// ── Row actions ──────────────────────────────────────────────────────────────

function renderRowActions(
  item: DocumentMetadataItem,
  onDelete: (item: DocumentMetadataItem) => void,
) {
  const href = item.fireflies_link ?? item.url;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {href && (
          <DropdownMenuItem asChild>
            <a href={href} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open link
            </a>
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

// ── Filter helpers ────────────────────────────────────────────────────────────

function applyFilters(
  items: DocumentMetadataItem[],
  search: string,
  filters: FilterState,
): DocumentMetadataItem[] {
  let result = items;

  if (filters.type) {
    const typeFilter = filters.type as string;
    if (typeFilter === "teams") {
      result = result.filter((item) => item.type?.startsWith("teams"));
    } else {
      result = result.filter((item) => item.type === typeFilter);
    }
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (item) =>
        (item.title ?? "").toLowerCase().includes(q) ||
        (item.content ?? "").toLowerCase().includes(q) ||
        (item.summary ?? "").toLowerCase().includes(q) ||
        (item.participants ?? "").toLowerCase().includes(q) ||
        (item.project ?? "").toLowerCase().includes(q) ||
        (item.host_email ?? "").toLowerCase().includes(q) ||
        (item.source_system ?? "").toLowerCase().includes(q),
    );
  }

  if (filters.source_system) {
    result = result.filter(
      (item) =>
        (item.source_system ?? item.source) === filters.source_system,
    );
  }

  if (filters.status) {
    result = result.filter((item) => item.status === filters.status);
  }

  if (filters.project) {
    result = result.filter((item) => item.project === filters.project);
  }

  if (filters.category) {
    result = result.filter((item) => item.category === filters.category);
  }

  return result;
}

// ── Page component ────────────────────────────────────────────────────────────

export function DocumentMetadataClient({
  items: initialItems,
  errorMessage,
}: DocumentMetadataClientProps) {
  const rawSearchParams = useSearchParams();
  const searchParams = rawSearchParams ?? new URLSearchParams();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const [items, setItems] = React.useState(initialItems);

  // Derive active filters from URL — authoritative, no useEffect lag
  const activeFilters = useMemo<FilterState>(
    () => ({
      type: searchParams.get("type") || undefined,
      source_system: searchParams.get("source_system") || undefined,
      status: searchParams.get("status") || undefined,
      project: searchParams.get("project") || undefined,
      category: searchParams.get("category") || undefined,
    }),
    [searchParams],
  );

  // Tab counts from full dataset
  const tabs = [
    {
      label: "Meetings",
      href: `${pathname}?type=meeting`,
      isActive: activeFilters.type === "meeting",
    },
    {
      label: "Team Messages",
      href: `${pathname}?type=teams`,
      isActive: activeFilters.type === "teams",
    },
    {
      label: "Emails",
      href: `${pathname}?type=email`,
      isActive: activeFilters.type === "email",
    },
    {
      label: "All",
      href: pathname,
      isActive: !activeFilters.type,
    },
  ];

  // Filter option lists — scoped to current tab
  const tabItems = useMemo(() => {
    const typeFilter = activeFilters.type as string | undefined;
    if (!typeFilter) return items;
    if (typeFilter === "teams") return items.filter((i) => i.type?.startsWith("teams"));
    return items.filter((i) => i.type === typeFilter);
  }, [items, activeFilters.type]);

  const sourceSystems = useMemo(() => {
    const set = new Set<string>();
    for (const item of tabItems) {
      const s = item.source_system ?? item.source;
      if (s) set.add(s);
    }
    return [...set].sort();
  }, [tabItems]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const item of tabItems) {
      if (item.status) set.add(item.status);
    }
    return [...set].sort();
  }, [tabItems]);

  const projects = useMemo(() => {
    const set = new Set<string>();
    for (const item of tabItems) {
      if (item.project) set.add(item.project);
    }
    return [...set].sort();
  }, [tabItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of tabItems) {
      if (item.category) set.add(item.category);
    }
    return [...set].sort();
  }, [tabItems]);

  const tableFilters: FilterConfig[] = useMemo(
    () => [
      {
        id: "source_system",
        label: "Source",
        type: "select",
        options: sourceSystems.map((s) => ({ value: s, label: s })),
      },
      {
        id: "status",
        label: "Status",
        type: "select",
        options: statuses.map((s) => ({ value: s, label: s })),
      },
      {
        id: "project",
        label: "Project",
        type: "select",
        options: projects.map((p) => ({ value: p, label: p })),
      },
      {
        id: "category",
        label: "Category",
        type: "select",
        options: categories.map((c) => ({ value: c, label: c })),
      },
    ],
    [sourceSystems, statuses, projects, categories],
  );

  const tableState = useUnifiedTableState({
    entityKey: "document-metadata",
    searchParams: rawSearchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "date",
      sortDirection: "desc",
      visibleColumns: defaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  const handleProjectEdit = React.useCallback(
    async (item: DocumentMetadataItem, value: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_metadata")
        .update({ project: value || null })
        .eq("id", item.id);

      if (error) {
        toast.error("Failed to update project", { description: error.message });
        throw error;
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, project: value || null } : i)),
      );
    },
    [],
  );

  const tableColumns = useMemo(
    () => buildTableColumns(projects, handleProjectEdit),
    [projects, handleProjectEdit],
  );

  const isFiltered =
    !!tableState.debouncedSearch ||
    !!activeFilters.source_system ||
    !!activeFilters.status ||
    !!activeFilters.project ||
    !!activeFilters.category;

  const filteredItems = useMemo(
    () => applyFilters(items, tableState.debouncedSearch, activeFilters),
    [items, tableState.debouncedSearch, activeFilters],
  );

  // Sort using tableColumns.sortValue — same pattern as the skill
  const sortedItems = useMemo(() => {
    const sortBy = tableState.sortBy ?? "date";
    const direction = tableState.sortDirection;
    const col = tableColumns.find((c) => c.id === sortBy);
    if (!col?.sortValue) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va == null) return direction === "asc" ? -1 : 1;
      if (vb == null) return direction === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number")
        return direction === "asc" ? va - vb : vb - va;
      return direction === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filteredItems, tableColumns, tableState.sortBy, tableState.sortDirection]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedItems.length / tableState.perPage),
  );

  const paginatedItems = useMemo(() => {
    const start = (tableState.page - 1) * tableState.perPage;
    return sortedItems.slice(start, start + tableState.perPage);
  }, [sortedItems, tableState.page, tableState.perPage]);

  const activeType =
    typeof activeFilters.type === "string" ? activeFilters.type : null;

  const handleFilterChange = (nextFilters: Record<string, FilterValue>) => {
    tableState.setSearchParams({
      type: activeType,
      source_system:
        typeof nextFilters.source_system === "string"
          ? nextFilters.source_system
          : null,
      status:
        typeof nextFilters.status === "string" ? nextFilters.status : null,
      project:
        typeof nextFilters.project === "string" ? nextFilters.project : null,
      category:
        typeof nextFilters.category === "string" ? nextFilters.category : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleClearFilters = () => {
    tableState.setSearchParams({
      type: activeType,
      source_system: null,
      status: null,
      project: null,
      category: null,
      page: "1",
    });
    tableState.setPage(1);
  };

  // ── Selection handlers ────────────────────────────────────────────────────

  const handleSelectAll = React.useCallback(
    (checked: boolean) => {
      tableState.setSelectedIds(
        checked ? paginatedItems.map((item) => item.id) : [],
      );
    },
    [paginatedItems, tableState],
  );

  const handleSelectRow = React.useCallback(
    (id: string, checked: boolean) => {
      tableState.setSelectedIds(
        checked
          ? [...tableState.selectedIds, id]
          : tableState.selectedIds.filter((sid) => sid !== id),
      );
    },
    [tableState],
  );

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = React.useCallback(
    async (item: DocumentMetadataItem) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_metadata")
        .delete()
        .eq("id", item.id);

      if (error) {
        toast.error("Failed to delete", { description: error.message });
        return;
      }

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      tableState.setSelectedIds(
        tableState.selectedIds.filter((sid) => sid !== item.id),
      );
      toast.success(`Deleted "${item.title ?? "record"}"`);
    },
    [tableState],
  );

  // ── Bulk delete ───────────────────────────────────────────────────────────

  const handleBulkDelete = React.useCallback(async () => {
    const ids = tableState.selectedIds;
    const supabase = createClient();
    const { error } = await supabase
      .from("document_metadata")
      .delete()
      .in("id", ids);

    if (error) {
      toast.error("Failed to delete", { description: error.message });
      return;
    }

    const idSet = new Set(ids);
    setItems((prev) => prev.filter((i) => !idSet.has(i.id)));
    tableState.setSelectedIds([]);
    toast.success(
      `Deleted ${ids.length} record${ids.length === 1 ? "" : "s"}`,
    );
  }, [tableState]);

  // ── Detail sheet ─────────────────────────────────────────────────────────

  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const activeItem = React.useMemo(
    () => paginatedItems.find((i) => i.id === activeItemId) ?? null,
    [paginatedItems, activeItemId],
  );

  const activeIndex = React.useMemo(
    () => paginatedItems.findIndex((i) => i.id === activeItemId),
    [paginatedItems, activeItemId],
  );

  const handleRowClick = React.useCallback((item: DocumentMetadataItem) => {
    setActiveItemId(item.id);
    setSheetOpen(true);
  }, []);

  const handleSheetNavigate = React.useCallback(
    (direction: "prev" | "next") => {
      const next =
        direction === "prev"
          ? paginatedItems[activeIndex - 1]
          : paginatedItems[activeIndex + 1];
      if (next) setActiveItemId(next.id);
    },
    [paginatedItems, activeIndex],
  );

  const tabLabel =
    tabs.find((t) => t.isActive)?.label.toLowerCase() ?? "document";

  return (
    <>
      <UnifiedTablePage<DocumentMetadataItem>
        header={{
          title: "Document Metadata",
          description: `${filteredItems.length.toLocaleString()} ${tabLabel} record${filteredItems.length === 1 ? "" : "s"}`,
        }}
        tabs={tabs}
        layout={{ fullBleedTable: true }}
        features={{ enableInlineEditing: true }}
        toolbar={{
          totalItems: tabItems.length,
          filteredItems: filteredItems.length,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search title, participants, project…",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: tableFilters,
          activeFilters: {
            source_system: activeFilters.source_system,
            status: activeFilters.status,
            project: activeFilters.project,
            category: activeFilters.category,
          },
          onFilterChange: handleFilterChange,
          onClearFilters: handleClearFilters,
          columns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onBulkDelete:
            tableState.selectedIds.length > 0 ? handleBulkDelete : undefined,
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
          rowActions: (item) => renderRowActions(item, handleDelete),
          onRowClick: handleRowClick,
          activeRowId: activeItemId,
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
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: handleSelectAll,
          onSelectRow: handleSelectRow,
        }}
        emptyState={{
          title: `No ${tabLabel} records found`,
          description: `No ${tabLabel} records exist yet.`,
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
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

    <DocumentMetadataSheet
      item={activeItem}
      open={sheetOpen}
      onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) setActiveItemId(null);
      }}
      onNavigate={handleSheetNavigate}
      canNavigatePrev={activeIndex > 0}
      canNavigateNext={activeIndex < paginatedItems.length - 1}
    />
    </>
  );
}
