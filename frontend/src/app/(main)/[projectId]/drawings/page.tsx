"use client";

import * as React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileUp } from "lucide-react";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { DrawingUploadDialog } from "@/components/drawings/DrawingUploadDialog";
import { useDrawings, useDeleteDrawing } from "@/hooks/use-drawings";
import type { DrawingLogTableRow } from "@/types/drawings.types";
import {
  buildDrawingTableColumns,
  drawingColumns,
  drawingDefaultVisibleColumns,
  drawingFilters,
  renderDrawingCard,
  renderDrawingList,
} from "@/features/drawings/drawings-table-config";

type DrawingFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: DrawingFilterState = {
  discipline: undefined,
  drawingType: undefined,
  status: undefined,
  areaName: undefined,
};

export default function ProjectDrawingsPage() {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = params.projectId ?? "";
  const activeTab = searchParams.get("tab") || "log";

  const deleteDrawing = useDeleteDrawing(projectId);

  const initialFilters: DrawingFilterState = {
    discipline: searchParams.get("discipline") ?? undefined,
    drawingType: searchParams.get("drawingType") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    areaName: searchParams.get("areaName") ?? undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "drawings",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "drawingNumber",
      sortDirection: "asc",
      visibleColumns: drawingDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const { data: drawingsData, isLoading } = useDrawings(projectId, {
    page: tableState.page,
    page_size: tableState.perPage,
  });

  const drawings: DrawingLogTableRow[] = React.useMemo(
    () => drawingsData?.drawings ?? [],
    [drawingsData],
  );

  const activeFilters = tableState.activeFilters as DrawingFilterState;

  const filteredItems = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const disciplineFilter =
      typeof activeFilters.discipline === "string" ? activeFilters.discipline : "";
    const typeFilter =
      typeof activeFilters.drawingType === "string" ? activeFilters.drawingType : "";
    const statusFilter =
      typeof activeFilters.status === "string" ? activeFilters.status : "";
    const areaFilter =
      typeof activeFilters.areaName === "string"
        ? activeFilters.areaName.toLowerCase()
        : "";

    return drawings.filter((row) => {
      if (disciplineFilter && row.discipline !== disciplineFilter) return false;
      if (typeFilter && row.drawingType !== typeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (areaFilter && !(row.areaName ?? "").toLowerCase().includes(areaFilter))
        return false;
      if (!search) return true;
      return (
        row.drawingNumber.toLowerCase().includes(search) ||
        row.title.toLowerCase().includes(search) ||
        (row.discipline ?? "").toLowerCase().includes(search) ||
        (row.areaName ?? "").toLowerCase().includes(search) ||
        (row.fileName ?? "").toLowerCase().includes(search)
      );
    });
  }, [activeFilters, drawings, tableState.debouncedSearch]);

  const tableColumns = React.useMemo(() => buildDrawingTableColumns(), []);

  const tabs = [
    {
      label: "Drawing Log",
      href: `/${projectId}/drawings`,
      count: activeTab === "log" ? filteredItems.length : undefined,
      isActive: activeTab === "log",
    },
    {
      label: "Board",
      href: `/${projectId}/drawings/board`,
      isActive: false,
    },
    {
      label: "Areas",
      href: `/${projectId}/drawings/areas`,
      isActive: false,
    },
    {
      label: "Revisions",
      href: `/${projectId}/drawings/revisions`,
      isActive: false,
    },
  ];

  const handleFilterChange = (nextFilters: DrawingFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      discipline:
        typeof nextFilters.discipline === "string" ? nextFilters.discipline : null,
      drawingType:
        typeof nextFilters.drawingType === "string" ? nextFilters.drawingType : null,
      status:
        typeof nextFilters.status === "string" ? nextFilters.status : null,
      areaName:
        typeof nextFilters.areaName === "string" ? nextFilters.areaName : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.discipline) ||
    Boolean(activeFilters.drawingType) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.areaName);

  return (
    <UnifiedTablePage
      header={{
        title: "Drawings",
        description: "Manage construction drawings with revision tracking",
        actions: (
          <DrawingUploadDialog projectId={projectId}>
            <Button size="sm">
              <FileUp className="mr-2 h-4 w-4" />
              Upload Drawing
            </Button>
          </DrawingUploadDialog>
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems: drawings.length,
        filteredItems: filteredItems.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search drawings...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters: drawingFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: drawingColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: filteredItems,
        isLoading,
        isFetching: false,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
        onRowClick: (item) =>
          router.push(`/${projectId}/drawings/viewer/${item.id}`),
        onDelete: (item) => deleteDrawing.mutate(item.id),
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
      views={{
        card: (item) =>
          renderDrawingCard(item, (r) =>
            router.push(`/${projectId}/drawings/viewer/${r.id}`),
          ),
        list: (item) =>
          renderDrawingList(item, (r) =>
            router.push(`/${projectId}/drawings/viewer/${r.id}`),
          ),
      }}
      emptyState={{
        title: "No drawings found",
        description: "Upload your first drawing to get started.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
        action: (
          <DrawingUploadDialog projectId={projectId}>
            <Button size="sm">
              <FileUp className="mr-2 h-4 w-4" />
              Upload your first drawing
            </Button>
          </DrawingUploadDialog>
        ),
      }}
      features={{
        enableExport: true,
        enableBulkDelete: false,
        enableRowSelection: false,
      }}
    />
  );
}
