"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { useSubmittals, type SubmittalSummary } from "@/hooks/use-submittals";
import {
  buildSubmittalTableColumns,
  submittalColumns,
  submittalDefaultVisibleColumns,
  submittalFilters,
  renderSubmittalCard,
  renderSubmittalList,
  type SubmittalTableRow,
} from "@/features/submittals/submittals-table-config";
import { SubmittalFormDialog } from "@/features/submittals/submittal-form-dialog";

type SubmittalFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: SubmittalFilterState = {
  status: undefined,
  latest_response: undefined,
  division: undefined,
};

function toTableRow(item: SubmittalSummary): SubmittalTableRow {
  return {
    id: item.id,
    specification_section: item.specification_section ?? null,
    submittal_number: item.submittal_number ?? "",
    revision: item.revision ?? 0,
    title: item.title ?? "Untitled Submittal",
    submittal_type_name:
      typeof item.submittal_type === "object"
        ? (item.submittal_type as { name?: string } | null)?.name ?? null
        : item.submittal_type ?? null,
    status: item.status ?? "Draft",
    responsible_contractor: null,
    received_from: null,
    ball_in_court: item.ball_in_court ?? null,
    approvers: null,
    latest_response: null,
    sent_date: item.sent_date ?? null,
    is_private: item.is_private ?? false,
    division: item.division ?? null,
    final_due_date: item.final_due_date ?? null,
    deleted_at: item.deleted_at ?? null,
  };
}

export default function SubmittalsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = parseInt(params.projectId ?? "", 10);
  const activeTab = searchParams.get("tab") || "items";

  useProjectTitle("Submittals");

  const [dialogOpen, setDialogOpen] = React.useState(false);

  const initialFilters: SubmittalFilterState = {
    status: searchParams.get("status") ?? undefined,
    latest_response: searchParams.get("latest_response") ?? undefined,
    division: searchParams.get("division") ?? undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "submittals",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "submittal_number",
      sortDirection: "asc",
      visibleColumns: submittalDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const { data: submittals = [], isLoading } = useSubmittals(
    projectId,
    activeTab === "recycle-bin" ? "recycle-bin" : undefined,
  );

  const tableRows = React.useMemo<SubmittalTableRow[]>(
    () => submittals.map(toTableRow),
    [submittals],
  );

  const activeFilters = tableState.activeFilters as SubmittalFilterState;

  const filteredItems = React.useMemo(() => {
    const search = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : "";
    const responseFilter =
      typeof activeFilters.latest_response === "string" ? activeFilters.latest_response : "";
    const divisionFilter =
      typeof activeFilters.division === "string" ? activeFilters.division : "";

    if (activeTab === "packages" || activeTab === "spec-sections") {
      return [] as SubmittalTableRow[];
    }

    return tableRows.filter((row) => {
      if (activeTab === "ball-in-court" && !row.ball_in_court) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (responseFilter && row.latest_response !== responseFilter) return false;
      if (divisionFilter && (row.division ?? "").toLowerCase() !== divisionFilter.toLowerCase())
        return false;
      if (!search) return true;
      return (
        row.submittal_number.toLowerCase().includes(search) ||
        row.title.toLowerCase().includes(search) ||
        (row.specification_section ?? "").toLowerCase().includes(search) ||
        (row.submittal_type_name ?? "").toLowerCase().includes(search) ||
        row.status.toLowerCase().includes(search)
      );
    });
  }, [activeFilters, activeTab, tableRows, tableState.debouncedSearch]);

  const tableColumns = React.useMemo(() => buildSubmittalTableColumns(), []);

  const tabs = [
    {
      label: "Items",
      href: `/${projectId}/submittals`,
      count: activeTab === "items" ? filteredItems.length : undefined,
      isActive: activeTab === "items",
      testId: "submittals-tab-items",
    },
    {
      label: "Packages",
      href: `/${projectId}/submittals?tab=packages`,
      isActive: activeTab === "packages",
    },
    {
      label: "Spec Sections",
      href: `/${projectId}/submittals?tab=spec-sections`,
      isActive: activeTab === "spec-sections",
    },
    {
      label: "Ball In Court",
      href: `/${projectId}/submittals?tab=ball-in-court`,
      isActive: activeTab === "ball-in-court",
      testId: "submittals-tab-ball-in-court",
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/submittals?tab=recycle-bin`,
      isActive: activeTab === "recycle-bin",
    },
  ];

  const handleFilterChange = (nextFilters: SubmittalFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      latest_response:
        typeof nextFilters.latest_response === "string" ? nextFilters.latest_response : null,
      division: typeof nextFilters.division === "string" ? nextFilters.division : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.latest_response) ||
    Boolean(activeFilters.division);

  const isComingSoonTab = activeTab === "packages" || activeTab === "spec-sections";

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Submittals",
          description: "Manage submittal items, packages, and review workflows",
          actions: (
            <Button
              size="sm"
              data-testid="submittals-dropdown-create"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Submittal
            </Button>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems: tableRows.length,
          filteredItems: filteredItems.length,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search submittals...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          enabledViews: ["table", "card", "list"],
          filters: submittalFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: submittalColumns,
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
          onRowClick: (item) => router.push(`/${projectId}/submittals/${item.id}`),
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
            renderSubmittalCard(item, (r) => router.push(`/${projectId}/submittals/${r.id}`)),
          list: (item) =>
            renderSubmittalList(item, (r) => router.push(`/${projectId}/submittals/${r.id}`)),
        }}
        emptyState={{
          title: isComingSoonTab ? "Coming Soon" : "No submittals found",
          description: isComingSoonTab
            ? `This tab is reserved for upcoming ${activeTab.replace("-", " ")} workflows.`
            : activeTab === "recycle-bin"
              ? "No submittals in the Recycle Bin."
              : "Create your first submittal to get started.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered: isFiltered && !isComingSoonTab,
          action:
            isComingSoonTab || activeTab === "recycle-bin" ? undefined : (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first submittal
              </Button>
            ),
        }}
        features={{
          enableExport: false,
          enableBulkDelete: false,
          enableRowSelection: false,
          enableRowActions: false,
        }}
      />

      <SubmittalFormDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
