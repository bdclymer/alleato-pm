"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import {
  buildDailyBriefTableColumns,
  dailyBriefColumns,
  dailyBriefDefaultVisibleColumns,
  dailyBriefFilters,
} from "@/features/daily-briefs/daily-briefs-table-config";
import { useDailyBriefHistory } from "@/hooks/use-daily-brief-history";
import type { DailyBriefHistoryItem } from "@/lib/daily-briefs/types";

type DailyBriefFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: DailyBriefFilterState = {
  workflowStatus: undefined,
  delivery: undefined,
  packet: undefined,
};

function searchHaystack(item: DailyBriefHistoryItem) {
  return [
    item.recapDate,
    item.dateRangeStart,
    item.dateRangeEnd,
    item.workflowStatus,
    item.sentTeams ? "teams sent delivered" : "not sent",
    item.hasPacket ? "packet ready" : "missing packet",
    item.sourceWarningCount > 0 ? "source warnings" : "sources ready",
    item.modelUsed ?? "",
  ].join(" ");
}

function matchesDeliveryFilter(item: DailyBriefHistoryItem, value: FilterValue) {
  if (!value) return true;
  if (value === "sent") return item.sentTeams;
  if (value === "not_sent") return !item.sentTeams;
  return true;
}

function matchesPacketFilter(item: DailyBriefHistoryItem, value: FilterValue) {
  if (!value) return true;
  if (value === "ready") return item.hasPacket && item.sourceWarningCount === 0;
  if (value === "warnings") return item.sourceWarningCount > 0;
  if (value === "missing") return !item.hasPacket;
  return true;
}

export default function DailyBriefsTablePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const briefsQuery = useDailyBriefHistory();
  const briefs = briefsQuery.data?.briefs ?? [];
  const initialFilters = React.useMemo<DailyBriefFilterState>(
    () => ({
      workflowStatus: searchParams.get("workflowStatus") ?? undefined,
      delivery: searchParams.get("delivery") ?? undefined,
      packet: searchParams.get("packet") ?? undefined,
    }),
    [searchParams],
  );

  const tableState = useUnifiedTableState({
    entityKey: "daily-brief-history",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "recapDate",
      sortDirection: "desc",
      visibleColumns: dailyBriefDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const activeFilters = tableState.activeFilters as DailyBriefFilterState;
  const tableColumns = React.useMemo(() => buildDailyBriefTableColumns(), []);

  const filteredBriefs = React.useMemo(() => {
    const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
    return briefs.filter((item) => {
      if (
        activeFilters.workflowStatus &&
        item.workflowStatus !== activeFilters.workflowStatus
      ) {
        return false;
      }
      if (!matchesDeliveryFilter(item, activeFilters.delivery)) return false;
      if (!matchesPacketFilter(item, activeFilters.packet)) return false;
      if (!searchTerm) return true;
      return searchHaystack(item).toLowerCase().includes(searchTerm);
    });
  }, [
    activeFilters.delivery,
    activeFilters.packet,
    activeFilters.workflowStatus,
    briefs,
    tableState.debouncedSearch,
  ]);

  const isFiltered =
    tableState.debouncedSearch.trim().length > 0 ||
    Object.values(activeFilters).some((value) => value !== undefined);

  const handleFilterChange = (filters: DailyBriefFilterState) => {
    tableState.setActiveFilters(filters);
    tableState.setSearchParams({
      workflowStatus: (filters.workflowStatus as string | undefined) ?? null,
      delivery: (filters.delivery as string | undefined) ?? null,
      packet: (filters.packet as string | undefined) ?? null,
      page: "1",
    });
    tableState.setPage(1);
  };

  return (
    <UnifiedTablePage
      header={{
        title: "Daily Brief History",
        description: "Past executive Daily Brief packets and delivery status.",
      }}
      toolbar={{
        totalItems: briefs.length,
        filteredItems: filteredBriefs.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search daily briefs...",
        currentView: tableState.currentView,
        onViewChange: tableState.setCurrentView,
        enabledViews: ["table"],
        filters: dailyBriefFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: dailyBriefColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: filteredBriefs,
        isLoading: briefsQuery.isLoading,
        isFetching: briefsQuery.isFetching,
        error: briefsQuery.error,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
        onRowClick: (item) => router.push(`/daily-briefs/${item.id}`),
        stickyHeader: true,
        density: "compact",
      }}
      emptyState={{
        title: "No Daily Briefs",
        description:
          "No executive Daily Brief packets have been persisted yet.",
        filteredDescription:
          "No Daily Briefs match the current search and filters.",
        isFiltered,
      }}
      layout={{ fullBleedTable: true, minWidth: 1100 }}
      features={{
        enableRowSelection: false,
        enableRowActions: false,
        enableViews: false,
      }}
      reportContext={{
        projectName: "Alleato",
        projectDescription: "Executive Daily Brief history",
      }}
    />
  );
}
