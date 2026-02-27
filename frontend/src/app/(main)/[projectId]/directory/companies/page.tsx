"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  useProjectCompanies,
  useCreateProjectCompany,
  useUpdateProjectCompany,
  useDeleteProjectCompany,
} from "@/hooks/use-project-companies";
import { getProjectDirectoryTabs } from "@/config/directory-tabs";
import { Button } from "@/components/ui/button";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  DetailPanel,
  type FilterValue,
} from "@/components/tables/unified";
import type {
  ProjectCompany,
  CompanyFilters,
} from "@/services/companyService";
import {
  buildCompanyCreatePayload,
  buildCompanyTableColumns,
  buildCompanyUpdatePayload,
  companyColumns,
  companyDefaultVisibleColumns,
  companyDetailFields,
  companyFilters,
  getCompanyNestedValue,
  renderCompanyCard,
  renderCompanyList,
  renderCompanyRowActions,
} from "@/features/companies/companies-table-config";

const EMPTY_FILTERS: Record<string, FilterValue> = {
  status: undefined,
  company_type: undefined,
};

type FilterState = Record<string, FilterValue>;

type DetailMode = "create" | "edit" | null;

export default function ProjectDirectoryCompaniesPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId ?? "";

  const initialStatus = searchParams.get("status") ?? "all";
  const initialCompanyType = searchParams.get("company_type") ?? "";
  const initialFilters: FilterState = {
    status: initialStatus === "all" ? undefined : initialStatus,
    company_type: initialCompanyType || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "companies",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "company.name",
      sortDirection: "asc",
      filters: initialFilters,
    },
  });

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "all";
    const nextCompanyType = searchParams.get("company_type") ?? "";
    const normalizedStatus = nextStatus === "all" ? undefined : nextStatus;
    const normalizedCompanyType = nextCompanyType || undefined;

    tableState.setActiveFilters((prev) => {
      if (prev.status === normalizedStatus && prev.company_type === normalizedCompanyType) {
        return prev;
      }
      return {
        status: normalizedStatus,
        company_type: normalizedCompanyType,
      };
    });
  }, [searchParams, tableState]);

  React.useEffect(() => {
    if (tableState.visibleColumns.length === 0) {
      tableState.setVisibleColumns(companyDefaultVisibleColumns);
    }
  }, [tableState.visibleColumns.length, tableState.setVisibleColumns]);

  const activeFilters = tableState.activeFilters as FilterState;

  const companyFiltersInput: CompanyFilters = {
    search: tableState.debouncedSearch || undefined,
    status: (activeFilters.status as CompanyFilters["status"]) || "all",
    company_type: (activeFilters.company_type as string) || undefined,
    sort: "name",
    page: tableState.page,
    per_page: tableState.perPage,
  };

  const {
    companies,
    pagination,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProjectCompanies(projectId, companyFiltersInput);

  const createCompany = useCreateProjectCompany(projectId);
  const updateCompany = useUpdateProjectCompany(projectId);
  const deleteCompany = useDeleteProjectCompany(projectId);

  const tabs = getProjectDirectoryTabs(projectId, pathname);

  const detailParam = tableState.detailParam;
  const detailMode: DetailMode = detailParam === "new" ? "create" : detailParam ? "edit" : null;
  const selectedItem =
    detailMode === "edit"
      ? companies.find((company) => company.id === detailParam) || null
      : null;

  const currentIndex = selectedItem
    ? companies.findIndex((item) => item.id === selectedItem.id)
    : -1;
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex >= 0 && currentIndex < companies.length - 1;

  const tableColumns = buildCompanyTableColumns();

  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      company_type:
        typeof nextFilters.company_type === "string" && nextFilters.company_type
          ? nextFilters.company_type
          : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleRowClick = (item: ProjectCompany) => {
    tableState.setSearchParams({ detail: item.id });
  };

  const handlePanelOpenChange = (open: boolean) => {
    if (!open) {
      tableState.setSearchParams({ detail: null });
    }
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (!selectedItem) return;
    const nextIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < companies.length) {
      tableState.setSearchParams({ detail: companies[nextIndex].id });
    }
  };

  const handleSave = async (data: Partial<ProjectCompany>) => {
    try {
      if (detailMode === "create") {
        const payload = buildCompanyCreatePayload(data);
        if (!payload) {
          toast.error("Company name is required");
          return;
        }
        await createCompany.mutateAsync(payload);
        toast.success("Company created");
        tableState.setSearchParams({ detail: null });
        refetch();
        return;
      }

      if (!selectedItem) return;
      const payload = buildCompanyUpdatePayload(data);
      await updateCompany.mutateAsync({ companyId: selectedItem.id, data: payload });
      toast.success("Company updated");
      refetch();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to save company";
      toast.error(message);
    }
  };

  const handleDelete = async (item: ProjectCompany) => {
    try {
      await deleteCompany.mutateAsync(item.id);
      toast.success("Company deleted");
      tableState.setSearchParams({ detail: null });
      refetch();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Failed to delete";
      toast.error(message);
    }
  };

  const handleBulkDelete = async () => {
    if (tableState.selectedIds.length === 0) return;
    const results = await Promise.allSettled(
      tableState.selectedIds.map((id) => deleteCompany.mutateAsync(id)),
    );
    const successCount = results.filter((result) => result.status === "fulfilled")
      .length;
    const failureCount = results.length - successCount;

    if (successCount > 0) {
      toast.success(`${successCount} companies deleted`);
    }
    if (failureCount > 0) {
      toast.error(`${failureCount} deletions failed`);
    }
    tableState.setSelectedIds([]);
    refetch();
  };

  const handleExport = () => {
    if (!companies.length) {
      toast.info("No companies to export");
      return;
    }

    const visibleColumns = tableColumns.filter((column) =>
      tableState.visibleColumns.includes(column.id),
    );
    const headers = visibleColumns.map((column) => column.label);

    const rows = companies.map((company) =>
      visibleColumns
        .map((column) =>
          column.csvValue ? column.csvValue(company) : String(column.render(company) ?? ""),
        )
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `companies-page-${tableState.page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(companies.map((item) => item.id));
    } else {
      tableState.setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...prev, id]);
    } else {
      tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.company_type);

  const totalItems = pagination?.total ?? companies.length;
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Project Directory - Companies",
          description: "Manage companies and team members for this project",
          actions: (
            <Button onClick={() => tableState.setSearchParams({ detail: "new" })}>
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search companies...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: companyFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: companyColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
          onBulkDelete: handleBulkDelete,
        }}
        data={{
          items: companies,
          isLoading,
          isFetching,
          error: error ?? undefined,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: handleRowClick,
          rowActions: (item) => renderCompanyRowActions(item, handleRowClick),
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({
              sort: sortBy,
              sort_dir: direction,
              page: "1",
            });
            tableState.setPage(1);
          },
        }}
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: handleSelectAll,
          onSelectRow: handleSelectRow,
        }}
        views={{
          card: (item) => renderCompanyCard(item, handleRowClick),
          list: (item) =>
            renderCompanyList(item, handleRowClick, tableState.selectedIds, handleSelectRow),
        }}
        emptyState={{
          title: "No companies found",
          description: "You have not added any companies to your project yet.",
          filteredDescription: "Try adjusting your search or filters",
          isFiltered,
          action: (
            <Button onClick={() => tableState.setSearchParams({ detail: "new" })}>
              Click here to add a company
            </Button>
          ),
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          onPageChange: (nextPage) => {
            tableState.setPage(nextPage);
            tableState.setSearchParams({ page: String(nextPage) });
          },
          onPerPageChange: (nextPerPage) => {
            const parsed = Number(nextPerPage);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            tableState.setPerPage(parsed);
            tableState.setSearchParams({ per_page: String(parsed), page: "1" });
            tableState.setPage(1);
          },
        }}
      />

      <DetailPanel
        open={Boolean(detailParam)}
        onOpenChange={handlePanelOpenChange}
        item={selectedItem as unknown as Record<string, unknown> | null}
        title={
          detailMode === "create"
            ? "New Company"
            : String(getCompanyNestedValue(selectedItem ?? null, "company.name") || "Company")
        }
        fields={companyDetailFields}
        onSave={handleSave as unknown as (data: Partial<Record<string, unknown>>) => Promise<void>}
        onDelete={
          detailMode === "edit"
            ? (handleDelete as unknown as (item: Record<string, unknown>) => Promise<void>)
            : undefined
        }
        onNavigate={detailMode === "edit" ? handleNavigate : undefined}
        canNavigatePrev={detailMode === "edit" && canNavigatePrev}
        canNavigateNext={detailMode === "edit" && canNavigateNext}
        relatedSections={
          detailMode === "edit"
            ? [
                {
                  id: "contacts",
                  label: "Contacts",
                  count: selectedItem?.user_count || 0,
                },
                { id: "projects", label: "Projects", count: 3 },
              ]
            : []
        }
      />
    </>
  );
}
