"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  CellBadge,
  CellText,
  TableDateValue,
} from "@/components/tables/unified";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/database.types";

type DatabaseTableCatalogRow =
  Database["public"]["Tables"]["database_tables_catalog"]["Row"];

const PAGE_TITLE = "Database Tables Catalog";
const PAGE_DESCRIPTION = "Catalog of tables in the public schema";

const columns: ColumnConfig[] = [
  { id: "table_name", label: "Table Name", alwaysVisible: true },
  { id: "schema_name", label: "Schema", defaultVisible: true },
  { id: "schema", label: "Schema Definition", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "row_count", label: "Row Count", defaultVisible: true },
  { id: "rls_enabled", label: "RLS Enabled", defaultVisible: true },
  { id: "primary_keys", label: "Primary Keys", defaultVisible: true },
  { id: "fk_columns", label: "FK Columns", defaultVisible: true },
  { id: "table_comment", label: "Description", defaultVisible: true },
  { id: "notes", label: "Notes", defaultVisible: true },
  { id: "tools", label: "Tools", defaultVisible: true },
  { id: "created_at", label: "Created At", defaultVisible: false },
];

const TABLE_FILTERS: FilterConfig[] = [
  {
    id: "category",
    label: "Category",
    type: "select",
    options: [],
  },
  {
    id: "rls_enabled",
    label: "RLS Enabled",
    type: "select",
    options: [
      { value: "true", label: "Enabled" },
      { value: "false", label: "Disabled" },
      { value: "null", label: "Unknown" },
    ],
  },
];

const defaultVisibleColumns = columns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

const CATEGORY_PILL_COLORS = [
  "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-900",
  "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900",
  "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900",
  "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-900",
  "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900",
  "bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900",
];

function getCategoryPillColor(category: string | null | undefined): string | undefined {
  const value = category?.trim().toLowerCase();
  if (!value) return undefined;

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return CATEGORY_PILL_COLORS[hash % CATEGORY_PILL_COLORS.length];
}

function buildTableColumns(
  onEditField: (
    row: DatabaseTableCatalogRow,
    columnId: "category" | "primary_keys" | "table_comment",
    value: string,
  ) => Promise<void>,
): TableColumn<DatabaseTableCatalogRow>[] {
  const colMap = Object.fromEntries(columns.map((column) => [column.id, column]));
  const col = (id: string) => colMap[id];

  return [
    {
      ...col("table_name"),
      render: (item) => (
        <CellText value={item.table_name} className="font-medium block max-w-[18rem] truncate" />
      ),
      sortValue: (item) => item.table_name,
      csvValue: (item) => item.table_name,
    },
    {
      ...col("schema_name"),
      render: (item) => <CellText value={item.schema_name} className="block max-w-[10rem] truncate" />,
      sortValue: (item) => item.schema_name,
      csvValue: (item) => item.schema_name,
    },
    {
      ...col("category"),
      editable: true,
      editValue: (item) => item.category ?? "",
      onEdit: (item, value) => onEditField(item, "category", value),
      render: (item) => (
        <CellBadge
          value={item.category}
          emptyLabel="-"
          className="max-w-[14rem] truncate"
          colorMap={
            item.category
              ? {
                  [item.category.trim().toLowerCase()]: getCategoryPillColor(item.category) ?? "",
                }
              : undefined
          }
        />
      ),
      sortValue: (item) => item.category || "",
      csvValue: (item) => item.category || "",
    },
    {
      ...col("status"),
      render: (item) => (
        <CellText value={item.status} emptyLabel="-" className="block max-w-[12rem] truncate" />
      ),
      sortValue: (item) => item.status || "",
      csvValue: (item) => item.status || "",
    },
    {
      ...col("row_count"),
      render: (item) => <CellText value={item.row_count === null ? null : String(item.row_count)} emptyLabel="-" />,
      sortValue: (item) => item.row_count ?? -1,
      csvValue: (item) => String(item.row_count ?? ""),
    },
    {
      ...col("rls_enabled"),
      render: (item) => {
        if (item.rls_enabled === null) return <CellText value={null} emptyLabel="-" />;
        return (
          <CellBadge
            value={item.rls_enabled ? "enabled" : "disabled"}
            capitalize={false}
            colorMap={{
              enabled: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
              disabled: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
            }}
          />
        );
      },
      sortValue: (item) => (item.rls_enabled === null ? -1 : item.rls_enabled ? 1 : 0),
      csvValue: (item) => (item.rls_enabled === null ? "" : item.rls_enabled ? "true" : "false"),
    },
    {
      ...col("primary_keys"),
      editable: true,
      editValue: (item) => item.primary_keys ?? "",
      onEdit: (item, value) => onEditField(item, "primary_keys", value),
      render: (item) => (
        <CellText
          value={item.primary_keys}
          emptyLabel="-"
          className="block max-w-[18rem] truncate font-mono text-xs"
        />
      ),
      sortValue: (item) => item.primary_keys || "",
      csvValue: (item) => item.primary_keys || "",
    },
    {
      ...col("fk_columns"),
      render: (item) => (
        <CellText
          value={item.fk_columns}
          emptyLabel="-"
          className="block max-w-[20rem] truncate font-mono text-xs"
        />
      ),
      sortValue: (item) => item.fk_columns || "",
      csvValue: (item) => item.fk_columns || "",
    },
    {
      ...col("table_comment"),
      editable: true,
      editValue: (item) => item.table_comment ?? "",
      onEdit: (item, value) => onEditField(item, "table_comment", value),
      render: (item) => (
        <CellText
          value={item.table_comment}
          emptyLabel="-"
          className="block max-w-[30rem] truncate"
        />
      ),
      sortValue: (item) => item.table_comment || "",
      csvValue: (item) => item.table_comment || "",
    },
    {
      ...col("notes"),
      render: (item) => (
        <CellText
          value={item.notes}
          emptyLabel="-"
          className="block max-w-[20rem] truncate"
        />
      ),
      sortValue: (item) => item.notes || "",
      csvValue: (item) => item.notes || "",
    },
    {
      ...col("tools"),
      render: (item) => (
        <CellText
          value={item.tools}
          emptyLabel="-"
          className="block max-w-[20rem] truncate"
        />
      ),
      sortValue: (item) => item.tools || "",
      csvValue: (item) => item.tools || "",
    },
    {
      ...col("schema"),
      render: (item) => (
        <CellText
          value={item.schema}
          emptyLabel="-"
          className="block max-w-[24rem] truncate font-mono text-xs"
        />
      ),
      sortValue: (item) => item.schema || "",
      csvValue: (item) => item.schema || "",
    },
    {
      ...col("created_at"),
      render: (item) => <TableDateValue value={item.created_at} emptyLabel="-" />,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
      csvValue: (item) => item.created_at || "",
    },
  ];
}

function toCsv(rows: DatabaseTableCatalogRow[]) {
  const headers = [
    "table_name",
    "schema_name",
    "schema",
    "category",
    "status",
    "row_count",
    "rls_enabled",
    "primary_keys",
    "fk_columns",
    "table_comment",
    "notes",
    "tools",
    "created_at",
  ];

  const escape = (value: string) => {
    if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = rows.map((row) =>
    [
      row.table_name,
      row.schema_name,
      row.schema || "",
      row.category || "",
      row.status || "",
      row.row_count === null ? "" : String(row.row_count),
      row.rls_enabled === null ? "" : String(row.rls_enabled),
      row.primary_keys || "",
      row.fk_columns || "",
      row.table_comment || "",
      row.notes || "",
      row.tools || "",
      row.created_at || "",
    ]
      .map(escape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

export function DatabaseTablesCatalogClient({
  initialRows,
}: {
  initialRows: DatabaseTableCatalogRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = React.useState<DatabaseTableCatalogRow[]>(initialRows);

  const tableState = useUnifiedTableState({
    entityKey: "database_tables_catalog",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "table_name",
      sortDirection: "asc",
      visibleColumns: defaultVisibleColumns,
      filters: {
        category: undefined,
        rls_enabled: undefined,
      },
    },
  });

  const handleFilterChange = React.useCallback(
    (filters: Record<string, FilterValue>) => {
      tableState.setActiveFilters(filters);
      tableState.setPage(1);
    },
    [tableState],
  );

  const handleEditField = React.useCallback(
    async (
      row: DatabaseTableCatalogRow,
      columnId: "category" | "primary_keys" | "table_comment",
      value: string,
    ) => {
      const response = await fetch(
        `/api/database-tables-catalog/${encodeURIComponent(row.schema_name)}/${encodeURIComponent(row.table_name)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [columnId]: value || null }),
        },
      );

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        throw new Error(result.error || result.details || "Failed to update row");
      }

      setRows((prev) =>
        prev.map((item) =>
          item.schema_name === row.schema_name && item.table_name === row.table_name
            ? { ...item, [columnId]: value || null }
            : item,
        ),
      );
    },
    [],
  );

  const tableColumns = React.useMemo(() => buildTableColumns(handleEditField), [handleEditField]);
  const allowedColumnIds = React.useMemo(() => columns.map((column) => column.id), []);

  const categoryOptions = React.useMemo(() => {
    const categories = Array.from(
      new Set(rows.map((row) => row.category).filter((value): value is string => Boolean(value))),
    ).sort((a, b) => a.localeCompare(b));
    return categories.map((category) => ({ value: category, label: category }));
  }, [rows]);

  const toolbarFilters = React.useMemo<FilterConfig[]>(
    () =>
      TABLE_FILTERS.map((filter) =>
        filter.id === "category"
          ? {
              ...filter,
              options: categoryOptions,
            }
          : filter,
      ),
    [categoryOptions],
  );

  const visibleColumns = React.useMemo(() => {
    const filtered = tableState.visibleColumns.filter((id) => allowedColumnIds.includes(id));
    return filtered.length > 0 ? filtered : defaultVisibleColumns;
  }, [allowedColumnIds, tableState.visibleColumns]);

  const filteredRows = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const categoryFilter =
      typeof tableState.activeFilters.category === "string"
        ? tableState.activeFilters.category
        : "";
    const rlsFilter =
      typeof tableState.activeFilters.rls_enabled === "string"
        ? tableState.activeFilters.rls_enabled
        : "";

    const baseRows = rows.filter((row) => {
      if (categoryFilter && (row.category || "") !== categoryFilter) {
        return false;
      }
      if (rlsFilter === "true" && row.rls_enabled !== true) return false;
      if (rlsFilter === "false" && row.rls_enabled !== false) return false;
      if (rlsFilter === "null" && row.rls_enabled !== null) return false;
      return true;
    });

    if (!search) return baseRows;

    return baseRows.filter((row) =>
      [
        row.table_name,
        row.schema_name,
        row.schema || "",
        row.category || "",
        row.status || "",
        row.primary_keys || "",
        row.fk_columns || "",
        row.table_comment || "",
        row.notes || "",
        row.tools || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [rows, tableState.activeFilters.category, tableState.activeFilters.rls_enabled, tableState.debouncedSearch]);

  const handleExport = React.useCallback(() => {
    const csv = toCsv(filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "database-tables-catalog-public.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredRows]);

  const isSearchFiltered = tableState.debouncedSearch.trim().length > 0;
  const hasActiveFilters = Object.values(tableState.activeFilters).some((value) => value !== undefined);

  return (
    <UnifiedTablePage
      header={{
        title: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
      }}
      toolbar={{
        totalItems: rows.length,
        filteredItems: filteredRows.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search tables...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card"],
        filters: toolbarFilters,
        activeFilters: tableState.activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () =>
          handleFilterChange({
            category: undefined,
            rls_enabled: undefined,
          }),
        columns,
        visibleColumns,
        onColumnVisibilityChange: (next) =>
          tableState.setVisibleColumns(next.filter((id) => allowedColumnIds.includes(id))),
        onExport: handleExport,
      }}
      data={{
        items: filteredRows,
        isLoading: false,
        isFetching: false,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => `${item.schema_name}:${item.table_name}`,
      }}
      views={{
        card: (item) => (
          <Card className="border border-border/70 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold truncate">
                {item.table_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Schema</span>
                <span className="truncate">{item.schema_name}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Category</span>
                <CellBadge
                  value={item.category}
                  emptyLabel="-"
                  className="max-w-[14rem] truncate"
                  colorMap={
                    item.category
                      ? {
                          [item.category.trim().toLowerCase()]: getCategoryPillColor(item.category) ?? "",
                        }
                      : undefined
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Rows</span>
                <span>{item.row_count ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">RLS</span>
                <span>{item.rls_enabled === null ? "-" : item.rls_enabled ? "Enabled" : "Disabled"}</span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Description</p>
                <p className="truncate">{item.table_comment || "-"}</p>
              </div>
            </CardContent>
          </Card>
        ),
      }}
      sorting={{
        sortBy: tableState.sortBy,
        sortDirection: tableState.sortDirection,
        onSortChange: (sortBy, direction) => {
          tableState.setSortBy(sortBy);
          tableState.setSortDirection(direction);
          tableState.setSearchParams({ sort: sortBy, sort_dir: direction });
        },
      }}
      emptyState={{
        title: "No tables found",
        description: "No public schema tables are available.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered: isSearchFiltered || hasActiveFilters,
      }}
      features={{
        enableBulkDelete: false,
        enableRowSelection: false,
        enableInlineEditing: true,
      }}
      layout={{
        fullBleedTable: false,
        toolbarInlineWithHeader: true,
        containerClassName: "pt-0",
      }}
    />
  );
}
