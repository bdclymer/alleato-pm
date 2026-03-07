"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UnifiedTablePage,
  useUnifiedTableState,
} from "@/components/tables/unified";

interface DailyLogRow {
  id: string;
  log_date: string | null;
  weather_conditions: unknown;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DailyLogClientProps {
  projectId: string;
  dailyLogs: DailyLogRow[];
}

const tableColumns = [
  {
    id: "log_date",
    label: "Date",
    defaultVisible: true,
    render: (row: DailyLogRow) =>
      row.log_date
        ? new Date(row.log_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—",
    sortValue: (row: DailyLogRow) => row.log_date ?? "",
  },
  {
    id: "weather_conditions",
    label: "Weather",
    defaultVisible: true,
    render: (row: DailyLogRow) => {
      if (!row.weather_conditions) return "—";
      if (typeof row.weather_conditions === "string") {
        return row.weather_conditions.length > 100
          ? row.weather_conditions.slice(0, 100) + "…"
          : row.weather_conditions;
      }
      const str = JSON.stringify(row.weather_conditions);
      return str.length > 100 ? str.slice(0, 100) + "…" : str;
    },
  },
  {
    id: "created_by",
    label: "Created By",
    defaultVisible: true,
    render: (row: DailyLogRow) => row.created_by ?? "—",
    sortValue: (row: DailyLogRow) => row.created_by ?? "",
  },
  {
    id: "created_at",
    label: "Created",
    defaultVisible: false,
    render: (row: DailyLogRow) =>
      row.created_at
        ? new Date(row.created_at).toLocaleDateString()
        : "—",
    sortValue: (row: DailyLogRow) => row.created_at ?? "",
  },
  {
    id: "updated_at",
    label: "Updated",
    defaultVisible: false,
    render: (row: DailyLogRow) =>
      row.updated_at
        ? new Date(row.updated_at).toLocaleDateString()
        : "—",
    sortValue: (row: DailyLogRow) => row.updated_at ?? "",
  },
];

const defaultVisibleColumns = ["log_date", "weather_conditions", "created_by"];

export function DailyLogClient({ projectId, dailyLogs }: DailyLogClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tableState = useUnifiedTableState({
    entityKey: "daily-log",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "log_date",
      sortDirection: "desc",
      visibleColumns: defaultVisibleColumns,
      filters: {},
    },
  });

  const filteredLogs = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    if (!search) return dailyLogs;
    return dailyLogs.filter(
      (log) =>
        (log.log_date ?? "").toLowerCase().includes(search) ||
        (log.created_by ?? "").toLowerCase().includes(search),
    );
  }, [dailyLogs, tableState.debouncedSearch]);

  const sortedLogs = React.useMemo(() => {
    if (!tableState.sortBy) return filteredLogs;
    const col = tableColumns.find((c) => c.id === tableState.sortBy);
    const getSortValue = col?.sortValue;
    if (!getSortValue) return filteredLogs;
    return [...filteredLogs].sort((a, b) => {
      const va = getSortValue(a);
      const vb = getSortValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (vb == null) return tableState.sortDirection === "asc" ? 1 : -1;
      const cmp = String(va).localeCompare(String(vb));
      return tableState.sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredLogs, tableState.sortBy, tableState.sortDirection]);

  const isFiltered = Boolean(tableState.searchInput);

  return (
    <UnifiedTablePage
      header={{
        title: "Daily Log",
        description: "Daily construction logs and site reports",
        actions: (
          <Button
            size="sm"
            onClick={() => router.push(`/${projectId}/daily-log/new`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Log Entry
          </Button>
        ),
      }}
      toolbar={{
        totalItems: dailyLogs.length,
        filteredItems: sortedLogs.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search by date or author...",
        currentView: "table",
        onViewChange: () => undefined,
        enabledViews: ["table"],
        activeFilters: {},
        onFilterChange: () => undefined,
        onClearFilters: () => undefined,
        columns: tableColumns.map((c) => ({ id: c.id, label: c.label, defaultVisible: c.defaultVisible })),
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: sortedLogs,
        isLoading: false,
        isFetching: false,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
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
        title: "No daily logs found",
        description: "No daily log entries have been created yet.",
        filteredDescription: "Try adjusting your search.",
        isFiltered,
      }}
      features={{
        enableFilters: false,
        enableBulkDelete: false,
        enableRowSelection: false,
        enableRowActions: false,
        enableExport: false,
      }}
    />
  );
}
