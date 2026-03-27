"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ds";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { deriveParent, staticRoutes, type SitemapRoute } from "@/lib/sitemap-utils";

// ── Audit status ─────────────────────────────────────────────────────────────

type AuditStatus = "not_started" | "in_progress" | "needs_work" | "passed" | "skipped";

const AUDIT_OPTIONS: { value: AuditStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "needs_work", label: "Needs Work" },
  { value: "passed", label: "Passed" },
  { value: "skipped", label: "Skipped" },
];

const AUDIT_VARIANT: Record<AuditStatus, "neutral" | "info" | "warning" | "success" | "error"> = {
  not_started: "neutral",
  in_progress: "info",
  needs_work: "warning",
  passed: "success",
  skipped: "neutral",
};

const STORAGE_KEY = "sitemap-audit-status";

function loadAuditState(): Record<string, AuditStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AuditStatus>) : {};
  } catch {
    return {};
  }
}

function saveAuditState(state: Record<string, AuditStatus>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ── Group-by types ────────────────────────────────────────────────────────────

type GroupBy = "none" | "category" | "parent";

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  none: "None",
  category: "Category",
  parent: "Parent Route",
};

function getGroupKey(route: SitemapRoute, groupBy: GroupBy): string {
  if (groupBy === "category") return route.category;
  if (groupBy === "parent") return deriveParent(route.url);
  return "";
}

// ── Column metadata ─────────────────────────────────────────────────────────

const sitemapColumns: ColumnConfig[] = [
  { id: "title", label: "Page", alwaysVisible: true },
  { id: "url", label: "Route", defaultVisible: true },
  { id: "parent", label: "Parent", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "audit", label: "Audit", defaultVisible: true },
  { id: "dynamic", label: "Dynamic", defaultVisible: false },
];

const defaultVisibleColumns = sitemapColumns
  .filter((c) => c.defaultVisible !== false)
  .map((c) => c.id);

// ── Filters ─────────────────────────────────────────────────────────────────

const categories = [...new Set(staticRoutes.map((r) => r.category))].sort();
const types = [...new Set(staticRoutes.map((r) => r.type))].sort();
const parents = [...new Set(staticRoutes.map((r) => deriveParent(r.url)))].sort();

const sitemapFilters: FilterConfig[] = [
  {
    id: "parent",
    label: "Parent Route",
    type: "select",
    options: parents.map((p) => ({ value: p, label: p })),
  },
  {
    id: "category",
    label: "Category",
    type: "select",
    options: categories.map((c) => ({ value: c, label: c })),
  },
  {
    id: "type",
    label: "Type",
    type: "select",
    options: types.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
  },
  {
    id: "audit",
    label: "Audit Status",
    type: "select",
    options: AUDIT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  },
  {
    id: "dynamic",
    label: "Dynamic",
    type: "select",
    options: [
      { value: "true", label: "Dynamic (requires params)" },
      { value: "false", label: "Static" },
    ],
  },
];

// ── Table columns ───────────────────────────────────────────────────────────

const TYPE_VARIANT: Record<string, "info" | "success" | "warning" | "error" | "neutral"> = {
  list: "info",
  form: "warning",
  detail: "success",
  settings: "neutral",
  dashboard: "success",
  auth: "neutral",
  admin: "error",
  utility: "neutral",
  chat: "info",
};

function buildSitemapTableColumns(
  auditState: Record<string, AuditStatus>,
  onAuditChange: (url: string, status: AuditStatus) => void,
  groupBy: GroupBy,
  collapsedGroups: Set<string>,
  onToggleGroup: (key: string) => void,
): TableColumn<SitemapRoute>[] {
  return [
    {
      ...sitemapColumns[0],
      render: (item) => {
        // Group header row
        if (item._group !== undefined) {
          const isCollapsed = collapsedGroups.has(item._group);
          return (
            <Button
              variant="ghost"
              className="flex items-center gap-2 w-full text-left h-auto p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleGroup(item._group!);
              }}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="font-semibold text-sm text-foreground">{item._group}</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {item._groupCount}
              </Badge>
            </Button>
          );
        }
        const isDynamic = item.url.includes("[");
        return isDynamic ? (
          <span className="font-medium text-sm pl-5">{item.title}</span>
        ) : (
          <Link
            href={item.url}
            className="font-medium text-sm text-primary hover:underline underline-offset-2 pl-5"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </Link>
        );
      },
      csvValue: (item) => (item._group ? `── ${item._group}` : item.title),
      sortValue: (item) => item.title,
      sortable: groupBy === "none",
    },
    {
      ...sitemapColumns[1],
      render: (item) =>
        item._group !== undefined ? null : (
          <code className="text-xs text-muted-foreground font-mono">{item.url}</code>
        ),
      csvValue: (item) => item.url,
      sortValue: (item) => item.url,
      sortable: groupBy === "none",
    },
    {
      ...sitemapColumns[2],
      render: (item) =>
        item._group !== undefined ? null : (
          <code className="text-xs text-muted-foreground font-mono">
            {deriveParent(item.url)}
          </code>
        ),
      csvValue: (item) => deriveParent(item.url),
      sortValue: (item) => deriveParent(item.url),
      sortable: groupBy === "none",
    },
    {
      ...sitemapColumns[3],
      render: (item) =>
        item._group !== undefined ? null : (
          <span className="text-sm text-muted-foreground">{item.category}</span>
        ),
      csvValue: (item) => item.category,
      sortValue: (item) => item.category,
      sortable: groupBy === "none",
    },
    {
      ...sitemapColumns[4],
      render: (item) =>
        item._group !== undefined ? null : (
          <StatusBadge status={item.type} variant={TYPE_VARIANT[item.type] ?? "neutral"} />
        ),
      csvValue: (item) => item.type,
      sortValue: (item) => item.type,
      sortable: groupBy === "none",
    },
    {
      ...sitemapColumns[5],
      render: (item) => {
        if (item._group !== undefined) return null;
        const current = auditState[item.url] ?? "not_started";
        return (
          <Select
            value={current}
            onValueChange={(val) => onAuditChange(item.url, val as AuditStatus)}
          >
            <SelectTrigger
              className="h-7 w-36 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <StatusBadge status={opt.label} variant={AUDIT_VARIANT[opt.value]} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      csvValue: (item) => {
        const status = auditState[item.url] ?? "not_started";
        return AUDIT_OPTIONS.find((o) => o.value === status)?.label ?? "Not Started";
      },
      sortValue: (item) => auditState[item.url] ?? "not_started",
      sortable: groupBy === "none",
    },
    {
      ...sitemapColumns[6],
      render: (item) =>
        item._group !== undefined ? null : (
          <span className="text-xs text-muted-foreground">
            {item.dynamic ? "Yes" : "No"}
          </span>
        ),
      csvValue: (item) => (item.dynamic ? "Yes" : "No"),
      sortValue: (item) => (item.dynamic ? 1 : 0),
      sortable: groupBy === "none",
    },
  ];
}

// ── Filter helpers ──────────────────────────────────────────────────────────

const EMPTY_FILTERS: Record<string, FilterValue> = {};

function applyFilters(
  routes: SitemapRoute[],
  search: string,
  filters: Record<string, FilterValue>,
  auditState: Record<string, AuditStatus>,
): SitemapRoute[] {
  let filtered = routes;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        deriveParent(r.url).toLowerCase().includes(q),
    );
  }

  if (filters.parent) {
    const val = String(filters.parent);
    filtered = filtered.filter((r) => deriveParent(r.url) === val);
  }

  if (filters.category) {
    const val = String(filters.category);
    filtered = filtered.filter((r) => r.category === val);
  }

  if (filters.type) {
    const val = String(filters.type);
    filtered = filtered.filter((r) => r.type === val);
  }

  if (filters.audit) {
    const val = String(filters.audit) as AuditStatus;
    filtered = filtered.filter((r) => (auditState[r.url] ?? "not_started") === val);
  }

  if (filters.dynamic) {
    const val = filters.dynamic === "true";
    filtered = filtered.filter((r) => r.dynamic === val);
  }

  return filtered;
}

// ── Sort helper ─────────────────────────────────────────────────────────────

function sortRoutes(
  routes: SitemapRoute[],
  sortBy: string,
  direction: "asc" | "desc",
  auditState: Record<string, AuditStatus>,
): SitemapRoute[] {
  const sorted = [...routes].sort((a, b) => {
    if (sortBy === "audit") {
      const aVal = auditState[a.url] ?? "not_started";
      const bVal = auditState[b.url] ?? "not_started";
      return aVal.localeCompare(bVal);
    }
    if (sortBy === "parent") {
      return deriveParent(a.url).localeCompare(deriveParent(b.url));
    }
    const aVal = (a as unknown as Record<string, unknown>)[sortBy];
    const bVal = (b as unknown as Record<string, unknown>)[sortBy];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal);
    }
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      return aVal === bVal ? 0 : aVal ? 1 : -1;
    }
    return 0;
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}

// ── Grouped items builder ────────────────────────────────────────────────────

function buildGroupedItems(
  routes: SitemapRoute[],
  groupBy: GroupBy,
  collapsedGroups: Set<string>,
): SitemapRoute[] {
  if (groupBy === "none") return routes;

  const groupMap = new Map<string, SitemapRoute[]>();
  for (const r of routes) {
    const key = getGroupKey(r, groupBy);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(r);
  }

  const result: SitemapRoute[] = [];
  for (const [key, items] of groupMap) {
    // Synthetic header row
    result.push({
      url: `__group__${key}`,
      title: key,
      category: key,
      type: "",
      dynamic: false,
      _group: key,
      _groupCount: items.length,
    });
    // Only include items if group is not collapsed
    if (!collapsedGroups.has(key)) {
      result.push(...items);
    }
  }
  return result;
}

// ── Page component ──────────────────────────────────────────────────────────

export default function SitemapPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [auditState, setAuditState] = useState<Record<string, AuditStatus>>({});
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAuditState(loadAuditState());
  }, []);

  const handleAuditChange = useCallback((url: string, status: AuditStatus) => {
    setAuditState((prev) => {
      const next = { ...prev, [url]: status };
      saveAuditState(next);
      return next;
    });
  }, []);

  const handleToggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const tableState = useUnifiedTableState({
    entityKey: "sitemap",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "category",
      sortDirection: "asc",
      visibleColumns: defaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  const tableColumns = useMemo(
    () => buildSitemapTableColumns(auditState, handleAuditChange, groupBy, collapsedGroups, handleToggleGroup),
    [auditState, handleAuditChange, groupBy, collapsedGroups, handleToggleGroup],
  );

  const activeFilters = useMemo(() => {
    const f: Record<string, FilterValue> = {};
    if (tableState.activeFilters?.parent) f.parent = tableState.activeFilters.parent;
    if (tableState.activeFilters?.category) f.category = tableState.activeFilters.category;
    if (tableState.activeFilters?.type) f.type = tableState.activeFilters.type;
    if (tableState.activeFilters?.audit) f.audit = tableState.activeFilters.audit;
    if (tableState.activeFilters?.dynamic) f.dynamic = tableState.activeFilters.dynamic;
    return f;
  }, [tableState.activeFilters]);

  const isFiltered =
    !!tableState.debouncedSearch || Object.keys(activeFilters).length > 0;

  const filteredRoutes = useMemo(
    () => applyFilters(staticRoutes, tableState.debouncedSearch ?? "", activeFilters, auditState),
    [tableState.debouncedSearch, activeFilters, auditState],
  );

  const sortedRoutes = useMemo(
    () =>
      groupBy === "none"
        ? sortRoutes(filteredRoutes, tableState.sortBy ?? "", tableState.sortDirection, auditState)
        : sortRoutes(filteredRoutes, groupBy === "category" ? "category" : "url", "asc", auditState),
    [filteredRoutes, tableState.sortBy, tableState.sortDirection, auditState, groupBy],
  );

  // When grouped, interleave group headers; otherwise paginate normally
  const groupedItems = useMemo(
    () => buildGroupedItems(sortedRoutes, groupBy, collapsedGroups),
    [sortedRoutes, groupBy, collapsedGroups],
  );

  const itemsForTable = useMemo(() => {
    if (groupBy !== "none") return groupedItems; // no pagination when grouped
    const start = (tableState.page - 1) * tableState.perPage;
    return sortedRoutes.slice(start, start + tableState.perPage);
  }, [groupedItems, groupBy, sortedRoutes, tableState.page, tableState.perPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedRoutes.length / tableState.perPage),
  );

  const handleFilterChange = (filters: Record<string, FilterValue>) => {
    tableState.setActiveFilters(filters);
    tableState.setPage(1);
  };

  const auditSummary = useMemo(() => {
    const passed = staticRoutes.filter((r) => auditState[r.url] === "passed").length;
    return { passed, total: staticRoutes.length };
  }, [auditState]);

  // Group-by control for header
  const groupByControl = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={groupBy !== "none" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
        >
          <Layers className="h-3.5 w-3.5" />
          {groupBy !== "none" ? `Grouped by ${GROUP_BY_LABELS[groupBy]}` : "Group by"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Group rows by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={groupBy}
          onValueChange={(v) => {
            setGroupBy(v as GroupBy);
            setCollapsedGroups(new Set());
          }}
        >
          <DropdownMenuRadioItem value="none" className="text-sm">None</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="category" className="text-sm">Category</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="parent" className="text-sm">Parent Route</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <UnifiedTablePage<SitemapRoute>
      header={{
        title: "Sitemap",
        description: `${auditSummary.passed} / ${auditSummary.total} pages audited`,
        actions: groupByControl,
      }}
      layout={{ fullBleedTable: false }}
      toolbar={{
        totalItems: groupBy === "none" ? staticRoutes.length : groupedItems.filter((i) => !i._group).length,
        filteredItems: filteredRoutes.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search pages, routes, categories...",
        currentView: tableState.currentView,
        onViewChange: tableState.setCurrentView,
        filters: sitemapFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: sitemapColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: itemsForTable,
        isLoading: false,
        isFetching: false,
        error: null,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.url,
        onRowClick: (item) => {
          if (item._group !== undefined) {
            handleToggleGroup(item._group);
          }
        },
      }}
      sorting={
        groupBy === "none"
          ? {
              sortBy: tableState.sortBy,
              sortDirection: tableState.sortDirection,
              onSortChange: (sortBy, direction) => {
                tableState.setSortBy(sortBy);
                tableState.setSortDirection(direction);
                tableState.setPage(1);
              },
            }
          : undefined
      }
      emptyState={{
        title: "No pages found",
        description: "No application routes are registered.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
      }}
      pagination={
        groupBy === "none"
          ? {
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
            }
          : undefined
      }
    />
  );
}
