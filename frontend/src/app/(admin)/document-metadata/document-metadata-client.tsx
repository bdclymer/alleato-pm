"use client";

import * as React from "react";
import { useMemo } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ChevronDown, ChevronRight, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
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
  TableExpandedRow,
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
  tags: string | null;
  file_name: string | null;
  file_path: string | null;
  source_web_url: string | null;
  keywords: string[] | null;
}

interface AllProject {
  id: number;
  name: string;
}

interface DocumentMetadataClientProps {
  items: DocumentMetadataItem[];
  errorMessage: string | null;
  allProjects: AllProject[];
}

// ── Filter state ──────────────────────────────────────────────────────────────

type FilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: FilterState = {};
const NO_PROJECT_VALUE = "__none__";

// ── Project select editor ─────────────────────────────────────────────────────

function ProjectSelectEditor({
  item,
  allProjects,
  onChange,
  onCancel,
  onProjectEdit,
}: {
  item: DocumentMetadataItem;
  allProjects: AllProject[];
  onChange: (value: string) => void;
  onCancel: () => void;
  onProjectEdit: (item: DocumentMetadataItem, projectName: string, projectId: number | null) => Promise<void>;
}) {
  const isOpenRef = React.useRef(false);

  const currentProjectId = item.project_id?.toString() ?? NO_PROJECT_VALUE;

  return (
    <Select
      defaultValue={currentProjectId}
      onOpenChange={(open) => { isOpenRef.current = open; }}
      onValueChange={(value) => {
        if (value === NO_PROJECT_VALUE) {
          onChange("");
          void onProjectEdit(item, "", null).finally(() => onCancel());
          return;
        }
        const projectId = Number(value);
        const selected = allProjects.find((p) => p.id === projectId) ?? null;
        const name = selected?.name ?? "";
        onChange(name);
        void onProjectEdit(item, name, selected?.id ?? null).finally(() => onCancel());
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
        {allProjects.map((p) => (
          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
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

async function fetchDocumentContent(id: string): Promise<string | null> {
  const response = await fetch(`/api/document-metadata/${encodeURIComponent(id)}/content`);
  const payload = (await response.json().catch(() => null)) as {
    content?: string | null;
    error?: string;
    details?: string;
  } | null;

  if (!response.ok) {
    const message = payload?.details ?? payload?.error ?? "Document content request failed.";
    throw new Error(message);
  }

  return payload?.content ?? null;
}

// ── Column metadata ──────────────────────────────────────────────────────────

const columns: ColumnConfig[] = [
  { id: "title", label: "Title", alwaysVisible: true },
  { id: "content", label: "Content", defaultVisible: true },
  { id: "project", label: "Project", defaultVisible: true },
  { id: "source_system", label: "Source", defaultVisible: true },
  { id: "date", label: "Date", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "duration_minutes", label: "Duration", defaultVisible: true },
  { id: "tags", label: "Tags", defaultVisible: true },
  { id: "file_name", label: "File Name", defaultVisible: false },
  { id: "source_web_url", label: "URL", defaultVisible: false },
  { id: "keywords", label: "Keywords", defaultVisible: false },
  { id: "category", label: "Category", defaultVisible: false },
  { id: "division", label: "Division", defaultVisible: false },
  { id: "meeting_type", label: "Meeting Type", defaultVisible: false },
  { id: "host_email", label: "Host", defaultVisible: false },
  { id: "summary", label: "Summary", defaultVisible: false },
  { id: "participants", label: "Participants", defaultVisible: false },
  { id: "created_at", label: "Created", defaultVisible: false },
];

const defaultVisibleColumns = columns
  .filter((c) => c.defaultVisible !== false)
  .map((c) => c.id);

// ── Table columns ─────────────────────────────────────────────────────────────

function buildTableColumns(
  allProjects: AllProject[],
  onProjectEdit: (item: DocumentMetadataItem, projectName: string, projectId: number | null) => Promise<void>,
  expandedIds: Set<string>,
  toggleExpand: (item: DocumentMetadataItem) => void,
  loadingContentIds: Set<string>,
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
      render: (item) => {
        const isExpanded = expandedIds.has(item.id);
        const isLoadingContent = loadingContentIds.has(item.id);
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={isLoadingContent}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item);
              }}
              aria-label={isExpanded ? "Collapse content" : "Expand content"}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
            <TruncatedCell value={item.content} maxWidth={380} className="text-sm" />
          </div>
        );
      },
      csvValue: (item) => item.content ?? "",
      sortable: false,
      width: 440,
    },
    {
      ...columns[2],
      render: (item) => <CellText value={item.project} muted />,
      csvValue: (item) => item.project ?? "",
      sortValue: (item) => item.project ?? "",
      sortable: true,
      editable: true,
      editValue: (item) => item.project ?? "",
      renderEditor: ({ item: editorItem, onChange, onCancel }) => (
        <ProjectSelectEditor
          item={editorItem}
          allProjects={allProjects}
          onChange={onChange}
          onCancel={onCancel}
          onProjectEdit={onProjectEdit}
        />
      ),
    },
    {
      ...columns[3],
      render: (item) => (
        <CellText value={item.source_system ?? item.source} muted />
      ),
      csvValue: (item) => item.source_system ?? item.source ?? "",
      sortValue: (item) => item.source_system ?? item.source ?? "",
      sortable: true,
    },
    {
      ...columns[4],
      render: (item) => <TableDateValue value={item.date} />,
      csvValue: (item) => item.date ?? "",
      sortValue: (item) => (item.date ? new Date(item.date).getTime() : 0),
      sortable: true,
    },
    {
      ...columns[5],
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
      ...columns[6],
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
      ...columns[7],
      render: (item) => <CellText value={item.tags} muted />,
      csvValue: (item) => item.tags ?? "",
      sortValue: (item) => item.tags ?? "",
      sortable: true,
    },
    {
      ...columns[8],
      render: (item) => <CellText value={item.file_name} muted />,
      csvValue: (item) => item.file_name ?? "",
      sortValue: (item) => item.file_name ?? "",
      sortable: true,
    },
    {
      ...columns[9],
      render: (item) => {
        const href = item.source_web_url;
        return href ? (
          <a href={href} target="_blank" rel="noreferrer" className="truncate text-xs text-primary hover:underline max-w-48 block">
            {href}
          </a>
        ) : <CellText value={null} muted />;
      },
      csvValue: (item) => item.source_web_url ?? "",
      sortValue: (item) => item.source_web_url ?? "",
      sortable: false,
      width: 220,
    },
    {
      ...columns[10],
      render: (item) => <CellText value={item.keywords?.join(", ") ?? null} muted />,
      csvValue: (item) => item.keywords?.join(", ") ?? "",
      sortable: false,
    },
    {
      ...columns[11],
      render: (item) => <CellText value={item.category} muted />,
      csvValue: (item) => item.category ?? "",
      sortValue: (item) => item.category ?? "",
      sortable: true,
    },
    {
      ...columns[12],
      render: (item) => <CellText value={item.division} muted />,
      csvValue: (item) => item.division ?? "",
      sortValue: (item) => item.division ?? "",
      sortable: true,
    },
    {
      ...columns[13],
      render: (item) => <CellText value={item.meeting_type} muted />,
      csvValue: (item) => item.meeting_type ?? "",
      sortValue: (item) => item.meeting_type ?? "",
      sortable: true,
    },
    {
      ...columns[14],
      render: (item) => (
        <CellText value={item.host_email ?? item.organizer_email} muted />
      ),
      csvValue: (item) => item.host_email ?? item.organizer_email ?? "",
      sortValue: (item) => item.host_email ?? item.organizer_email ?? "",
      sortable: true,
    },
    {
      ...columns[15],
      render: (item) => <TruncatedCell value={item.summary} maxWidth={300} className="text-sm" />,
      csvValue: (item) => item.summary ?? "",
      sortable: false,
      width: 320,
    },
    {
      ...columns[16],
      render: (item) => <TruncatedCell value={item.participants} maxWidth={240} className="text-sm" />,
      csvValue: (item) => item.participants ?? "",
      sortable: false,
    },
    {
      ...columns[17],
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

// ── Card renderer ────────────────────────────────────────────────────────────

function renderDocumentCard(item: DocumentMetadataItem, onClick: (item: DocumentMetadataItem) => void) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full text-left cursor-pointer rounded-lg bg-card p-4 transition-colors hover:bg-muted/50 space-y-2 h-auto block"
      onClick={() => onClick(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
          {item.title ?? "Untitled"}
        </p>
        {item.status && <StatusBadge status={item.status} />}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {item.source_system && <span>{item.source_system}</span>}
        {item.date && (
          <span>{new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        )}
        {item.project && <span>{item.project}</span>}
        {item.duration_minutes != null && (
          <span>
            {item.duration_minutes < 60
              ? `${item.duration_minutes}m`
              : `${Math.floor(item.duration_minutes / 60)}h${item.duration_minutes % 60 > 0 ? ` ${item.duration_minutes % 60}m` : ""}`}
          </span>
        )}
      </div>
      {item.summary && (
        <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
      )}
    </Button>
  );
}

// ── List renderer ────────────────────────────────────────────────────────────

function renderDocumentList(item: DocumentMetadataItem, onClick: (item: DocumentMetadataItem) => void) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full text-left flex items-center justify-between rounded-md px-4 py-2.5 transition-colors hover:bg-muted/50 gap-4 h-auto"
      onClick={() => onClick(item)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title ?? "Untitled"}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[item.source_system, item.project, item.date ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {item.status && <StatusBadge status={item.status} />}
    </Button>
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
    } else if (typeFilter === "document") {
      result = result.filter((item) => item.type === "document");
    } else if (typeFilter === "ai") {
      result = result.filter((item) => {
        if (!item.type?.startsWith("teams")) return false;
        const haystack = [item.participants, item.title, item.content]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes("friday") && haystack.includes("brandon");
      });
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
  allProjects,
}: DocumentMetadataClientProps) {
  const rawSearchParams = useSearchParams()!;
  const searchParams = rawSearchParams ?? new URLSearchParams();
  const pathname = usePathname()! ?? "";
  const router = useRouter();

  const [items, setItems] = React.useState(initialItems);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [loadedContentIds, setLoadedContentIds] = React.useState<Set<string>>(new Set());
  const [loadingContentIds, setLoadingContentIds] = React.useState<Set<string>>(new Set());

  const loadContent = React.useCallback(
    async (item: DocumentMetadataItem) => {
      if (loadedContentIds.has(item.id)) return item.content;

      setLoadingContentIds((prev) => new Set(prev).add(item.id));
      try {
        const content = await fetchDocumentContent(item.id);
        setItems((prev) =>
          prev.map((current) =>
            current.id === item.id ? { ...current, content } : current,
          ),
        );
        setLoadedContentIds((prev) => new Set(prev).add(item.id));
        return content;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Document content could not be loaded.";
        toast.error("Failed to load document content", { description: message });
        throw error;
      } finally {
        setLoadingContentIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [loadedContentIds],
  );

  const toggleExpand = React.useCallback(
    (item: DocumentMetadataItem) => {
      if (expandedIds.has(item.id)) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        return;
      }

      void loadContent(item).then((content) => {
        if (!content) {
          toast.info("No content is available for this record.");
          return;
        }
        setExpandedIds((prev) => new Set(prev).add(item.id));
      });
    },
    [expandedIds, loadContent],
  );

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
      label: "Documents",
      href: `${pathname}?type=document`,
      isActive: activeFilters.type === "document",
    },
    {
      label: "AI",
      href: `${pathname}?type=ai`,
      isActive: activeFilters.type === "ai",
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
    if (typeFilter === "document") return items.filter((i) => i.type === "document");
    if (typeFilter === "ai") {
      return items.filter((i) => {
        if (!i.type?.startsWith("teams")) return false;
        const haystack = [i.participants, i.title, i.content]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes("friday") && haystack.includes("brandon");
      });
    }
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
        options: allProjects.map((p) => ({ value: p.name, label: p.name })),
      },
      {
        id: "category",
        label: "Category",
        type: "select",
        options: categories.map((c) => ({ value: c, label: c })),
      },
    ],
    [sourceSystems, statuses, allProjects, categories],
  );

  const tableState = useUnifiedTableState({
    entityKey: "document-metadata",
    searchParams: rawSearchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
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
    async (item: DocumentMetadataItem, projectName: string, projectId: number | null) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("document_metadata")
        .update({ project: projectName || null, project_id: projectId })
        .eq("id", item.id);

      if (error) {
        toast.error("Failed to update project", { description: error.message });
        throw error;
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, project: projectName || null, project_id: projectId } : i,
        ),
      );
    },
    [],
  );

  const tableColumns = useMemo(
    () => buildTableColumns(allProjects, handleProjectEdit, expandedIds, toggleExpand, loadingContentIds),
    [allProjects, handleProjectEdit, expandedIds, toggleExpand, loadingContentIds],
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
    const sortFn = col.sortValue;
    return [...filteredItems].sort((a, b) => {
      const va = sortFn(a);
      const vb = sortFn(b);
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
    if (item.type === "meeting") {
      router.push(`/meetings/${item.id}`);
      return;
    }
    void loadContent(item);
    setActiveItemId(item.id);
    setSheetOpen(true);
  }, [loadContent, router]);

  const handleSheetNavigate = React.useCallback(
    (direction: "prev" | "next") => {
      const next =
        direction === "prev"
          ? paginatedItems[activeIndex - 1]
          : paginatedItems[activeIndex + 1];
      if (next) {
        void loadContent(next);
        setActiveItemId(next.id);
      }
    },
    [paginatedItems, activeIndex, loadContent],
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
        views={{
          card: (item) => renderDocumentCard(item, handleRowClick),
          list: (item) => renderDocumentList(item, handleRowClick),
        }}
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
          renderExpandedRow: (item, colSpan) => {
            if (!expandedIds.has(item.id) || !item.content) return null;
            return (
              <TableExpandedRow colSpan={colSpan}>
                <div className="px-6 py-3 bg-muted/40 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Full content</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </TableExpandedRow>
            );
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
