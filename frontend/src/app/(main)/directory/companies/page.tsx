"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Globe,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { getDirectoryTabs } from "@/config/directory-tabs";
import { useGlobalProjectCompanies } from "@/hooks/use-global-project-companies";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  CellBadge,
  CellText,
  CellEmail,
  CellLink,
  TableDateValue,
  type FilterValue,
  type CellColorMap,
} from "@/components/tables/unified";
import type { ColumnConfig, FilterConfig, TableColumn } from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/ds";

interface CompanyRow {
  id: string;
  project_id: number;
  company_id: string;
  business_phone: string | null;
  email_address: string | null;
  primary_contact_id: string | null;
  erp_vendor_id: string | null;
  company_type: string | null;
  status: string | null;
  logo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  company_name: string | null;
  website: string | null;
  contact_count: number;
  project_count: number;
}

type CompanyFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: CompanyFilterState = {
  status: undefined,
  company_type: undefined,
};

const STATUS_COLORS: CellColorMap = {
  active: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  inactive: "bg-muted text-muted-foreground",
};

const TYPE_COLORS: CellColorMap = {
  subcontractor: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  supplier: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  vendor: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "connected company": "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
};

const companyColumns: ColumnConfig[] = [
  { id: "company_name", label: "Name", alwaysVisible: true },
  { id: "company_type", label: "Type", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "contact_count", label: "Contacts", defaultVisible: true },
  { id: "project_count", label: "Projects", defaultVisible: true },
  { id: "business_phone", label: "Phone", defaultVisible: true },
  { id: "website", label: "Website", defaultVisible: true },
  { id: "email_address", label: "Email", defaultVisible: false },
  { id: "erp_vendor_id", label: "ERP Vendor ID", defaultVisible: false },
  { id: "created_at", label: "Date Added", defaultVisible: false },
  { id: "updated_at", label: "Last Updated", defaultVisible: false },
  { id: "id", label: "ID", defaultVisible: false },
  { id: "project_id", label: "Project ID", defaultVisible: false },
  { id: "company_id", label: "Company ID", defaultVisible: false },
  { id: "primary_contact_id", label: "Primary Contact ID", defaultVisible: false },
  { id: "logo_url", label: "Logo URL", defaultVisible: false },
];

const companyDefaultVisibleColumns = companyColumns
  .filter((column) => column.defaultVisible !== false)
  .map((column) => column.id);

function buildCompanyTableColumns(): TableColumn<CompanyRow>[] {
  const colMap = Object.fromEntries(companyColumns.map((c) => [c.id, c]));
  const col = (id: string) => colMap[id];

  return [
    {
      ...col("company_name"),
      render: (item) => (
        <CellLink
          value={item.company_name || item.company_id}
          href={`/directory/companies/${item.company_id}`}
        />
      ),
      sortValue: (item) => item.company_name || item.company_id,
    },
    {
      ...col("company_type"),
      render: (item) => <CellBadge value={item.company_type} colorMap={TYPE_COLORS} emptyLabel="-" />,
      sortValue: (item) => item.company_type || "",
    },
    {
      ...col("status"),
      render: (item) => <CellBadge value={item.status} colorMap={STATUS_COLORS} emptyLabel="-" />,
      sortValue: (item) => item.status || "",
    },
    {
      ...col("contact_count"),
      render: (item) => (
        <span className={item.contact_count > 0 ? "text-foreground" : "text-muted-foreground"}>
          {item.contact_count}
        </span>
      ),
      sortValue: (item) => item.contact_count,
    },
    {
      ...col("project_count"),
      render: (item) => (
        <span className={item.project_count > 0 ? "text-foreground" : "text-muted-foreground"}>
          {item.project_count}
        </span>
      ),
      sortValue: (item) => item.project_count,
    },
    {
      ...col("business_phone"),
      render: (item) => <CellText value={item.business_phone} emptyLabel="-" />,
      sortValue: (item) => item.business_phone || "",
    },
    {
      ...col("website"),
      render: (item) => {
        if (!item.website) return <span className="text-muted-foreground">-</span>;
        const display = item.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
        return <CellLink value={display} href={item.website} external />;
      },
      sortValue: (item) => item.website || "",
    },
    {
      ...col("email_address"),
      render: (item) => <CellEmail value={item.email_address} emptyLabel="-" />,
      sortValue: (item) => item.email_address || "",
    },
    {
      ...col("erp_vendor_id"),
      render: (item) => <CellText value={item.erp_vendor_id} emptyLabel="-" />,
      sortValue: (item) => item.erp_vendor_id || "",
    },
    {
      ...col("created_at"),
      render: (item) => <TableDateValue value={item.created_at} emptyLabel="-" />,
      sortValue: (item) => (item.created_at ? new Date(item.created_at).getTime() : 0),
    },
    {
      ...col("updated_at"),
      render: (item) => <TableDateValue value={item.updated_at} emptyLabel="-" />,
      sortValue: (item) => (item.updated_at ? new Date(item.updated_at).getTime() : 0),
    },
    {
      ...col("id"),
      render: (item) => <CellText value={item.id} emptyLabel="-" className="font-mono text-xs" />,
      sortValue: (item) => item.id,
    },
    {
      ...col("project_id"),
      render: (item) => <CellText value={String(item.project_id)} />,
      sortValue: (item) => item.project_id,
    },
    {
      ...col("company_id"),
      render: (item) => <CellText value={item.company_id} className="font-mono text-xs" />,
      sortValue: (item) => item.company_id,
    },
    {
      ...col("primary_contact_id"),
      render: (item) => <CellText value={item.primary_contact_id} emptyLabel="-" className="font-mono text-xs" />,
      sortValue: (item) => item.primary_contact_id || "",
    },
    {
      ...col("logo_url"),
      render: (item) => <CellText value={item.logo_url} emptyLabel="-" />,
      sortValue: (item) => item.logo_url || "",
    },
  ];
}

function CompanyPreviewPane({
  company,
  companies,
  onOpenCompanyPage,
  onSelectCompany,
  onClose,
}: {
  company: CompanyRow | null;
  companies: CompanyRow[];
  onOpenCompanyPage: (company: CompanyRow) => void;
  onSelectCompany: (id: string) => void;
  onClose: () => void;
}): ReactElement {
  const currentIndex = company ? companies.findIndex((c) => c.id === company.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < companies.length - 1;

  if (!company) {
    return (
      <div className="p-6 space-y-3 text-sm text-muted-foreground">
        <p>Select a company to preview details.</p>
        <p className="text-xs">Arrow Up/Down to move, Enter to open.</p>
      </div>
    );
  }

  const displayName = company.company_name || company.company_id;
  const typeLabel = company.company_type
    ? company.company_type.replace(/_/g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header with navigation */}
      <div className="flex items-center justify-between gap-1 px-4 border-b border-border h-11">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasPrev}
            onClick={() => hasPrev && onSelectCompany(companies[currentIndex - 1].id)}
            aria-label="Previous company"
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            disabled={!hasNext}
            onClick={() => hasNext && onSelectCompany(companies[currentIndex + 1].id)}
            aria-label="Next company"
          >
            <ChevronRight />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            {currentIndex + 1} of {companies.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => onOpenCompanyPage(company)}
            aria-label="Open full page"
            title="Open full page"
          >
            <ArrowUpRight />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Company header */}
        <div className="px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight truncate">{displayName}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {typeLabel && (
                <StatusBadge status={typeLabel} />
              )}
              {company.status && (
                <CellBadge value={company.status} colorMap={STATUS_COLORS} />
              )}
            </div>
          </div>
        </div>

        {/* Identity section */}
        {(company.business_phone || company.email_address || company.website) && (
          <div className="px-5 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Contact
            </p>
            <div className="space-y-2">
              {company.business_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{company.business_phone}</span>
                </div>
              )}
              {company.email_address && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${company.email_address}`} className="text-primary hover:underline truncate">
                    {company.email_address}
                  </a>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                    {company.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional details */}
        {(company.erp_vendor_id || company.created_at) && (
          <div className="px-5 pb-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Details
            </p>
            <dl className="space-y-2 text-sm">
              {company.erp_vendor_id && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ERP Vendor ID</dt>
                  <dd className="font-mono text-xs">{company.erp_vendor_id}</dd>
                </div>
              )}
              {company.created_at && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Added</dt>
                  <dd><TableDateValue value={company.created_at} /></dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GlobalCompanyDirectoryPage(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClientsRoute =
    pathname === "/directory/clients" || pathname.endsWith("/directory/clients");
  const forcedCompanyType = isClientsRoute ? "client" : undefined;

  const initialStatus = searchParams.get("status") ?? "";
  const initialCompanyType = forcedCompanyType ?? searchParams.get("company_type") ?? "";
  const initialFilters: CompanyFilterState = {
    status: initialStatus || undefined,
    company_type: initialCompanyType || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: isClientsRoute ? "global-directory-clients" : "global-directory-companies",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 50,
      search: "",
      sortBy: "updated_at",
      sortDirection: "desc",
      visibleColumns: companyDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const nextCompanyType = forcedCompanyType ?? searchParams.get("company_type") ?? "";
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
  }, [forcedCompanyType, searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as CompanyFilterState;
  const statusFilter =
    typeof activeFilters.status === "string"
      ? (activeFilters.status as "ACTIVE" | "INACTIVE" | "all")
      : "all";
  const companyTypeFilter =
    forcedCompanyType ??
    (typeof activeFilters.company_type === "string" ? activeFilters.company_type : undefined);

  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleErpSync = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const resp = await fetch("/api/sync/acumatica/vendors", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Sync failed");
      const { result } = data;
      toast.success(
        `ERP sync complete: ${result.created} vendors created, ${result.updated} vendors updated, ` +
          `${result.companiesCreated ?? 0} companies created, ${result.companiesUpdated ?? 0} companies updated` +
          (result.errors.length > 0 ? ` (${result.errors.length} errors)` : ""),
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ERP sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [router]);

  const { companies, pagination, isLoading, isFetching, error } = useGlobalProjectCompanies({
    search: tableState.debouncedSearch || undefined,
    status: statusFilter || "all",
    company_type: companyTypeFilter,
    sort: `${tableState.sortBy}:${tableState.sortDirection}`,
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

  const filters: FilterConfig[] = React.useMemo(() => {
    const statusFilterConfig: FilterConfig = {
      id: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ],
    };

    if (forcedCompanyType) {
      return [statusFilterConfig];
    }

    return [
      statusFilterConfig,
      {
        id: "company_type",
        label: "Type",
        type: "select",
        options: companyTypeOptions,
      },
    ];
  }, [companyTypeOptions, forcedCompanyType]);

  const tableColumns = React.useMemo(() => buildCompanyTableColumns(), []);
  const selectedCompanyId = searchParams.get("detail");
  const selectedCompany =
    (selectedCompanyId ? companies.find((company) => company.id === selectedCompanyId) : null) ||
    companies[0] ||
    null;
  const activeCompanyId = selectedCompany?.id ?? null;

  const handleDeleteCompany = React.useCallback(
    async (company: CompanyRow) => {
      try {
        const resp = await fetch(`/api/directory/companies/${company.id}`, { method: "DELETE" });
        if (!resp.ok) throw new Error("Failed to delete company");
        toast.success("Company deleted");
        // Trigger re-fetch by navigating to same page
        router.refresh();
      } catch {
        toast.error("Failed to delete company");
      }
    },
    [router],
  );

  const openCompanyPage = React.useCallback(
    (company: CompanyRow) => {
      // Company detail pages are keyed by global companies.id.
      router.push(`/directory/companies/${company.company_id}`);
    },
    [router],
  );

  const handleFilterChange = (nextFilters: CompanyFilterState) => {
    const mergedFilters: CompanyFilterState = forcedCompanyType
      ? {
          ...nextFilters,
          company_type: forcedCompanyType,
        }
      : nextFilters;

    tableState.setActiveFilters(mergedFilters);
    tableState.setSearchParams({
      status: typeof mergedFilters.status === "string" ? mergedFilters.status : null,
      company_type:
        typeof mergedFilters.company_type === "string" ? mergedFilters.company_type : null,
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
    Boolean(activeFilters.company_type && activeFilters.company_type !== forcedCompanyType);

  return (
    <UnifiedTablePage
      header={{
        title: isClientsRoute ? "Clients" : "Companies",
        description:
          "Manage companies, clients, contacts, users, and employees across your organization",
        actions: (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="default" className="bg-primary hover:bg-primary/90">
                <Plus />
                Add
                <ChevronDown />
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
        searchPlaceholder: "Search name, phone, email, ERP ID...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () =>
          handleFilterChange({
            ...EMPTY_FILTERS,
            ...(forcedCompanyType ? { company_type: forcedCompanyType } : {}),
          }),
        columns: companyColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
        customActions: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={isSyncing}
                  onClick={handleErpSync}
                  aria-label="Sync from ERP"
                >
                  <RefreshCw className={isSyncing ? "animate-spin" : undefined} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sync companies &amp; vendors from Acumatica</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
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
        activeRowId: activeCompanyId,
        onTableKeyDown: handleTableKeyDown,
        onRowClick: (item) => tableState.setSearchParams({ detail: item.id }),
        onDelete: handleDeleteCompany,
      }}
      sidePanel={{
        content: (
          <CompanyPreviewPane
            company={selectedCompany}
            companies={companies}
            onOpenCompanyPage={openCompanyPage}
            onSelectCompany={(id) => tableState.setSearchParams({ detail: id })}
            onClose={() => tableState.setSearchParams({ detail: null })}
          />
        ),
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
        title: isClientsRoute ? "No clients found" : "No companies found",
        description: isClientsRoute
          ? "No clients are available yet."
          : "No companies are available yet.",
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
      }}
    />
  );
}
