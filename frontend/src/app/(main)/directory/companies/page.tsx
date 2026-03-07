"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  FileSpreadsheet,
  Globe,
  Plus,
  Upload,
} from "lucide-react";

import { getDirectoryTabs } from "@/config/directory-tabs";
import { useAllCompanies } from "@/hooks/use-all-companies";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import type { ColumnConfig, FilterConfig, TableColumn } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CompanyRow {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  title?: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  company_type?: string;
}

type CompanyFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: CompanyFilterState = {
  status: undefined,
  company_type: undefined,
};

const companyColumns: ColumnConfig[] = [
  { id: "name", label: "Company Name", alwaysVisible: true },
  { id: "title", label: "Title/Role", defaultVisible: true },
  { id: "website", label: "Website", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "company_type", label: "Type", defaultVisible: true },
  { id: "address", label: "Address", defaultVisible: false },
  { id: "city", label: "City", defaultVisible: false },
  { id: "state", label: "State", defaultVisible: false },
  { id: "notes", label: "Notes", defaultVisible: false },
  { id: "created_at", label: "Date Added", defaultVisible: false },
  { id: "updated_at", label: "Last Updated", defaultVisible: false },
];

const companyDefaultVisibleColumns = companyColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function formatDate(value: string | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  const normalized = status.toLowerCase();
  if (normalized === "active") return "default";
  if (normalized === "inactive") return "secondary";
  return "outline";
}

function buildCompanyTableColumns(): TableColumn<CompanyRow>[] {
  return [
    {
      ...companyColumns[0],
      render: (item) => <span className="font-medium">{item.name || "-"}</span>,
      sortValue: (item) => item.name || "",
    },
    {
      ...companyColumns[1],
      render: (item) => <span>{item.title || "-"}</span>,
      sortValue: (item) => item.title || "",
    },
    {
      ...companyColumns[2],
      render: (item) => <span>{item.website || "-"}</span>,
      sortValue: (item) => item.website || "",
    },
    {
      ...companyColumns[3],
      render: (item) => <Badge variant={statusVariant(item.status)}>{item.status || "-"}</Badge>,
      sortValue: (item) => item.status || "",
    },
    {
      ...companyColumns[4],
      render: (item) => <span>{item.company_type || "-"}</span>,
      sortValue: (item) => item.company_type || "",
    },
    {
      ...companyColumns[5],
      render: (item) => <span>{item.address || "-"}</span>,
      sortValue: (item) => item.address || "",
    },
    {
      ...companyColumns[6],
      render: (item) => <span>{item.city || "-"}</span>,
      sortValue: (item) => item.city || "",
    },
    {
      ...companyColumns[7],
      render: (item) => <span>{item.state || "-"}</span>,
      sortValue: (item) => item.state || "",
    },
    {
      ...companyColumns[8],
      render: (item) => <span>{item.notes || "-"}</span>,
      sortValue: (item) => item.notes || "",
    },
    {
      ...companyColumns[9],
      render: (item) => <span>{formatDate(item.created_at)}</span>,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
    {
      ...companyColumns[10],
      render: (item) => <span>{formatDate(item.updated_at)}</span>,
      sortValue: (item) => (item.updated_at ? new Date(item.updated_at).getTime() : 0),
    },
  ];
}

function CompanyPreviewPane({
  company,
  onOpenCompanyPage,
}: {
  company: CompanyRow | null;
  onOpenCompanyPage: (company: CompanyRow) => void;
}): ReactElement {
  if (!company) {
    return (
      <div className="p-6 space-y-3 text-sm text-muted-foreground">
        <p>Select a company to preview details.</p>
        <p className="text-xs">Arrow Up/Down to move, Enter to open.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-tight">{company.name || "Untitled company"}</p>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Open company detail page"
          title="Open company detail page"
          onClick={() => onOpenCompanyPage(company)}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>

      <dl className="space-y-3 text-xs">
        {company.company_type ? (
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="text-foreground mt-1">{company.company_type}</dd>
          </div>
        ) : null}
        {company.status ? (
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="text-foreground mt-1">{company.status}</dd>
          </div>
        ) : null}
        {company.city || company.state ? (
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="text-foreground mt-1">{[company.city, company.state].filter(Boolean).join(", ")}</dd>
          </div>
        ) : null}
        {company.address ? (
          <div>
            <dt className="text-muted-foreground">Address</dt>
            <dd className="text-foreground mt-1">{company.address}</dd>
          </div>
        ) : null}
        {company.notes ? (
          <div>
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="text-foreground mt-1 line-clamp-6">{company.notes}</dd>
          </div>
        ) : null}
      </dl>

      {company.website ? (
        <div className="pt-2 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Open website" title="Open website">
            <a href={company.website} target="_blank" rel="noopener noreferrer">
              <Globe className="h-4 w-4" />
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function GlobalCompanyDirectoryPage(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get("status") ?? "";
  const initialCompanyType = searchParams.get("company_type") ?? "";
  const initialFilters: CompanyFilterState = {
    status: initialStatus || undefined,
    company_type: initialCompanyType || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "global-directory-companies",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "name",
      sortDirection: "asc",
      visibleColumns: companyDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const nextCompanyType = searchParams.get("company_type") ?? "";
    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      const normalizedType = nextCompanyType || undefined;
      if (prev.status === normalizedStatus && prev.company_type === normalizedType) {
        return prev;
      }
      return {
        status: normalizedStatus,
        company_type: normalizedType,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as CompanyFilterState;
  const statusFilter =
    typeof activeFilters.status === "string"
      ? (activeFilters.status as "ACTIVE" | "INACTIVE" | "all")
      : "all";
  const companyTypeFilter =
    typeof activeFilters.company_type === "string" ? activeFilters.company_type : undefined;

  const { companies, pagination, isLoading, isFetching, error } = useAllCompanies({
    search: tableState.debouncedSearch || undefined,
    status: statusFilter || "all",
    company_type: companyTypeFilter,
    sort: "name",
    page: tableState.page,
    per_page: tableState.perPage,
  });

  const companyTypeOptions = React.useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(companies.map((company) => company.company_type).filter(Boolean)),
    );
    return uniqueTypes.map((type) => ({
      value: String(type),
      label: String(type),
    }));
  }, [companies]);

  const filters: FilterConfig[] = React.useMemo(
    () => [
      {
        id: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Inactive" },
        ],
      },
      {
        id: "company_type",
        label: "Type",
        type: "select",
        options: companyTypeOptions,
      },
    ],
    [companyTypeOptions],
  );

  const tableColumns = React.useMemo(() => buildCompanyTableColumns(), []);
  const selectedCompanyId = searchParams.get("detail");
  const selectedCompany =
    (selectedCompanyId ? companies.find((company) => company.id === selectedCompanyId) : null) ||
    companies[0] ||
    null;
  const activeCompanyId = selectedCompany?.id ?? null;

  const openCompanyPage = React.useCallback(
    (company: CompanyRow) => {
      router.push(`/directory/companies/${company.id}`);
    },
    [router],
  );

  const handleFilterChange = (nextFilters: CompanyFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      company_type: typeof nextFilters.company_type === "string" ? nextFilters.company_type : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(companies.map((company) => company.id));
      return;
    }
    tableState.setSelectedIds([]);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...prev, id]);
      return;
    }
    tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
  };

  const handleTableKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    visibleItems: CompanyRow[],
  ) => {
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName)) {
      return;
    }

    if (visibleItems.length === 0) return;

    const currentIndex = visibleItems.findIndex((company) => company.id === activeCompanyId);
    const hasSelection = currentIndex >= 0;
    const fallbackIndex = hasSelection ? currentIndex : 0;

    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      const nextIndex = hasSelection ? Math.min(visibleItems.length - 1, fallbackIndex + 1) : 0;
      tableState.setSearchParams({ detail: visibleItems[nextIndex].id });
      return;
    }

    if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      const nextIndex = hasSelection ? Math.max(0, fallbackIndex - 1) : 0;
      tableState.setSearchParams({ detail: visibleItems[nextIndex].id });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const company = visibleItems[fallbackIndex];
      if (company) {
        openCompanyPage(company);
      }
    }
  };

  const tabs = getDirectoryTabs(pathname);
  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.company_type);

  return (
    <UnifiedTablePage
      header={{
        title: "Company Directory: Companies",
        description:
          "Manage companies, clients, contacts, users, and employees across your organization",
        actions: (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>
                <Building2 className="mr-2 h-4 w-4" />
                Add New Company
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import from CSV
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Operations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems: pagination?.total ?? companies.length,
        filteredItems: pagination?.total ?? companies.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search companies...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: companyColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: companies as CompanyRow[],
        isLoading,
        isFetching,
        error: error ?? undefined,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id,
        activeRowId: activeCompanyId,
        onTableKeyDown: handleTableKeyDown,
        onRowClick: (item) => tableState.setSearchParams({ detail: item.id }),
      }}
      sidePanel={{
        content: <CompanyPreviewPane company={selectedCompany} onOpenCompanyPage={openCompanyPage} />,
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
      emptyState={{
        title: "No companies found",
        description: "No companies are available yet.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
      }}
      pagination={{
        page: tableState.page,
        totalPages: pagination?.total_pages ?? 1,
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
      features={{
        enableExport: false,
        enableBulkDelete: false,
        enableRowActions: false,
      }}
    />
  );
}
