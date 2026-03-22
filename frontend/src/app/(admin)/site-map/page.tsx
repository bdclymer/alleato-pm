"use client";

import { useMemo } from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { StatusBadge } from "@/components/ds";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { staticRoutes, type SitemapRoute } from "@/lib/sitemap-utils";

// ── Column metadata ─────────────────────────────────────────────────────────

const sitemapColumns: ColumnConfig[] = [
  { id: "title", label: "Page", alwaysVisible: true },
  { id: "url", label: "Route", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "type", label: "Type", defaultVisible: true },
  { id: "dynamic", label: "Dynamic", defaultVisible: false },
];

const defaultVisibleColumns = sitemapColumns
  .filter((c) => c.defaultVisible !== false)
  .map((c) => c.id);

// ── Filters ─────────────────────────────────────────────────────────────────

const categories = [...new Set(staticRoutes.map((r) => r.category))].sort();
const types = [...new Set(staticRoutes.map((r) => r.type))].sort();

const sitemapFilters: FilterConfig[] = [
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

function buildSitemapTableColumns(): TableColumn<SitemapRoute>[] {
  return [
    {
      ...sitemapColumns[0],
      render: (item) => {
        const isDynamic = item.url.includes("[");
        return isDynamic ? (
          <span className="font-medium text-sm">{item.title}</span>
        ) : (
          <Link
            href={item.url}
            className="font-medium text-sm text-primary hover:underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </Link>
        );
      },
      csvValue: (item) => item.title,
      sortValue: (item) => item.title,
      sortable: true,
    },
    {
      ...sitemapColumns[1],
      render: (item) => (
        <code className="text-xs text-muted-foreground font-mono">{item.url}</code>
      ),
      csvValue: (item) => item.url,
      sortValue: (item) => item.url,
      sortable: true,
    },
    {
      ...sitemapColumns[2],
      render: (item) => (
        <span className="text-sm text-muted-foreground">{item.category}</span>
      ),
      csvValue: (item) => item.category,
      sortValue: (item) => item.category,
      sortable: true,
    },
    {
      ...sitemapColumns[3],
      render: (item) => (
        <StatusBadge status={item.type} variant={TYPE_VARIANT[item.type] ?? "neutral"} />
      ),
      csvValue: (item) => item.type,
      sortValue: (item) => item.type,
      sortable: true,
    },
    {
      ...sitemapColumns[4],
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.dynamic ? "Yes" : "No"}
        </span>
      ),
      csvValue: (item) => (item.dynamic ? "Yes" : "No"),
      sortValue: (item) => (item.dynamic ? 1 : 0),
      sortable: true,
    },
  ];
}

// ── Filter helpers ──────────────────────────────────────────────────────────

const EMPTY_FILTERS: Record<string, FilterValue> = {};

function applyFilters(
  routes: SitemapRoute[],
  search: string,
  filters: Record<string, FilterValue>,
): SitemapRoute[] {
  let filtered = routes;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q),
    );
  }

  if (filters.category) {
    const val = String(filters.category);
    filtered = filtered.filter((r) => r.category === val);
  }

  if (filters.type) {
    const val = String(filters.type);
    filtered = filtered.filter((r) => r.type === val);
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
): SitemapRoute[] {
  const sorted = [...routes].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sortBy];
    const bVal = (b as Record<string, unknown>)[sortBy];
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

// ── Page component ──────────────────────────────────────────────────────────

export default function SitemapPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

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

  const tableColumns = useMemo(() => buildSitemapTableColumns(), []);

  const activeFilters = useMemo(() => {
    const f: Record<string, FilterValue> = {};
    if (tableState.activeFilters?.category) f.category = tableState.activeFilters.category;
    if (tableState.activeFilters?.type) f.type = tableState.activeFilters.type;
    if (tableState.activeFilters?.dynamic) f.dynamic = tableState.activeFilters.dynamic;
    return f;
  }, [tableState.activeFilters]);

  const isFiltered =
    !!tableState.debouncedSearch || Object.keys(activeFilters).length > 0;

  const filteredRoutes = useMemo(
    () => applyFilters(staticRoutes, tableState.debouncedSearch, activeFilters),
    [tableState.debouncedSearch, activeFilters],
  );

  const sortedRoutes = useMemo(
    () => sortRoutes(filteredRoutes, tableState.sortBy, tableState.sortDirection),
    [filteredRoutes, tableState.sortBy, tableState.sortDirection],
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRoutes.length / tableState.perPage));
  const paginatedRoutes = useMemo(() => {
    const start = (tableState.page - 1) * tableState.perPage;
    return sortedRoutes.slice(start, start + tableState.perPage);
  }, [sortedRoutes, tableState.page, tableState.perPage]);

  const handleFilterChange = (filters: Record<string, FilterValue>) => {
    tableState.setActiveFilters(filters);
    tableState.setPage(1);
  };

  return (
    <UnifiedTablePage<SitemapRoute>
      header={{
        title: "Sitemap",
        description: `All ${staticRoutes.length} application routes`,
      }}
      layout={{ fullBleedTable: false }}
      toolbar={{
        totalItems: staticRoutes.length,
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
        items: paginatedRoutes,
        isLoading: false,
        isFetching: false,
        error: null,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.url,
      }}
      sorting={{
        sortBy: tableState.sortBy,
        sortDirection: tableState.sortDirection,
        onSortChange: (sortBy, direction) => {
          tableState.setSortBy(sortBy);
          tableState.setSortDirection(direction);
          tableState.setPage(1);
        },
      }}
      emptyState={{
        title: "No pages found",
        description: "No application routes are registered.",
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
          tableState.setPerPage(pp);
          tableState.setPage(1);
        },
      }}
    />
  );
}
