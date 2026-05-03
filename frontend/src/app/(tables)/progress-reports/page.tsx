"use client";

import * as React from "react";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import {
  usePathname,
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildProgressReportTableColumns,
  progressReportColumns,
  progressReportDefaultVisibleColumns,
  progressReportFilters,
  statusVariant,
} from "@/features/progress-reports/progress-reports-table-config";
import { useAllProgressReports } from "@/hooks/use-progress-reports";
import type { ProgressReportAllListItem } from "@/lib/progress-reports/types";

type ReportFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: ReportFilterState = {
  status: undefined,
};

function searchHaystack(report: ProgressReportAllListItem) {
  return [
    report.title,
    report.status,
    report.project.name ?? "",
    report.project.project_number ?? "",
    report.project.job_number ?? "",
    report.project.client ?? "",
    report.past_week_highlights,
    report.upcoming_week_activities,
    report.open_items,
  ].join(" ");
}

function compareValues(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
  direction: "asc" | "desc",
) {
  if (left == null && right == null) return 0;
  if (left == null) return direction === "asc" ? -1 : 1;
  if (right == null) return direction === "asc" ? 1 : -1;

  const comparison =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right));

  return direction === "asc" ? comparison : -comparison;
}

function exportReports(reports: ProgressReportAllListItem[]) {
  const headers = [
    "Project",
    "Report",
    "Status",
    "Week Start",
    "Week End",
    "Recipients",
    "Photos",
    "Sent At",
    "Updated At",
  ];
  const rows = reports.map((report) => [
    [
      report.project.project_number ?? report.project.job_number,
      report.project.name ?? `Project #${report.project.id}`,
    ]
      .filter(Boolean)
      .join(" - "),
    report.title,
    report.status,
    report.week_start,
    report.week_end,
    String(report.client_recipients.length),
    String(report.selected_photo_count),
    report.sent_at ?? "",
    report.updated_at,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          return value.includes(",") || value.includes('"') || value.includes("\n")
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `progress-reports-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
}

export default function AllProgressReportsPage() {
  const router = useRouter();
  const pathname = usePathname() ?? "/progress-reports";
  const rawSearchParams = useSearchParams();
  const searchParams =
    rawSearchParams ?? (new URLSearchParams() as unknown as ReadonlyURLSearchParams);
  const reportsQuery = useAllProgressReports();
  const reports = reportsQuery.data?.reports ?? [];

  const tableState = useUnifiedTableState({
    entityKey: "all-progress-reports",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "week",
      sortDirection: "desc",
      visibleColumns: progressReportDefaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  const activeFilters = tableState.activeFilters as ReportFilterState;
  const tableColumns = React.useMemo(() => buildProgressReportTableColumns(), []);

  const filteredReports = React.useMemo(() => {
    const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter = activeFilters.status;

    return reports.filter((report) => {
      if (statusFilter && report.status !== statusFilter) return false;
      if (!searchTerm) return true;
      return searchHaystack(report).toLowerCase().includes(searchTerm);
    });
  }, [reports, activeFilters.status, tableState.debouncedSearch]);

  const sortedReports = React.useMemo(() => {
    const sortColumn = tableColumns.find((column) => column.id === tableState.sortBy);
    const getSortValue = sortColumn?.sortValue;
    if (!getSortValue) return filteredReports;

    return [...filteredReports].sort((left, right) =>
      compareValues(getSortValue(left), getSortValue(right), tableState.sortDirection),
    );
  }, [filteredReports, tableColumns, tableState.sortBy, tableState.sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedReports.length / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const pagedReports = sortedReports.slice(pageStart, pageStart + tableState.perPage);
  const isFiltered =
    tableState.debouncedSearch.trim().length > 0 ||
    Object.values(activeFilters).some((value) => value !== undefined);

  const handleFilterChange = (filters: ReportFilterState) => {
    tableState.setActiveFilters(filters);
    tableState.setSearchParams({ status: (filters.status as string | undefined) ?? null, page: "1" });
    tableState.setPage(1);
  };

  const handleOpenReport = (report: ProgressReportAllListItem) => {
    router.push(`/${report.project.id}/progress-reports/${report.id}`);
  };

  return (
    <UnifiedTablePage
      header={{
        title: "Progress Reports",
        description: "Weekly client progress reports across all projects.",
      }}
      toolbar={{
        totalItems: reports.length,
        filteredItems: filteredReports.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search reports, projects, clients, or open items...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "list"],
        filters: progressReportFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: progressReportColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
        onExport: () => exportReports(sortedReports),
      }}
      data={{
        items: pagedReports,
        isLoading: reportsQuery.isLoading,
        isFetching: reportsQuery.isFetching,
        error: reportsQuery.error ?? undefined,
      }}
      table={{
        columns: tableColumns,
        getRowId: (report) => report.id,
        onRowClick: handleOpenReport,
        rowActions: (report) => (
          <Button size="icon" variant="ghost" asChild aria-label="Download report PDF">
            <a
              href={`/api/projects/${report.project.id}/progress-reports/${report.id}/pdf`}
              onClick={(event) => event.stopPropagation()}
            >
              <Download className="h-4 w-4" />
            </a>
          </Button>
        ),
      }}
      sorting={{
        sortBy: tableState.sortBy,
        sortDirection: tableState.sortDirection,
        onSortChange: (sortBy, direction) => {
          tableState.setSortBy(sortBy);
          tableState.setSortDirection(direction);
          tableState.setSearchParams({ sort: sortBy, sort_dir: direction, page: "1" });
          tableState.setPage(1);
        },
      }}
      views={{
        list: (report) => (
          <div
            className="flex cursor-pointer items-center justify-between border-b px-4 py-3 transition-colors hover:bg-muted/50"
            onClick={() => handleOpenReport(report)}
          >
            <div className="min-w-0 space-y-1">
              <div className="truncate text-sm font-medium">{report.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {[
                  report.project.project_number ?? report.project.job_number,
                  report.project.name ?? `Project #${report.project.id}`,
                  `${report.week_start} to ${report.week_end}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
          </div>
        ),
      }}
      emptyState={{
        title: "No progress reports",
        description: "Weekly report drafts created inside projects will appear here.",
        filteredDescription: "No progress reports match your search or filters.",
        isFiltered,
        action: (
          <Button asChild size="sm" variant="outline">
            <Link href="/">
              Open Projects
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ),
      }}
      pagination={{
        page: tableState.page,
        totalPages,
        perPage: tableState.perPage,
        onPageChange: tableState.setPage,
        onPerPageChange: (value) => {
          tableState.setPerPage(Number(value));
          tableState.setPage(1);
        },
      }}
      features={{
        enableInlineEditing: false,
      }}
    />
  );
}
