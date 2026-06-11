"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { getDirectoryTabs } from "@/config/directory-tabs";
import {
  UnifiedTablePage,
  CellBadge,
  CellText,
  CellLink,
  TableDateValue,
  TablePageActions,
  InlineSelectEditor,
  type FilterValue,
  type CellColorMap,
} from "@/components/tables/unified";
import type { ColumnConfig, FilterConfig, TableColumn } from "@/components/tables/unified";
import { useServerTableDefinition } from "@/features/tables/server-table";
import {
  companyColumns,
  companyFilters,
  createGlobalCompaniesTableDefinition,
  EMPTY_COMPANY_FILTERS,
  type CompanyFilterState,
  type CompanyRow,
} from "@/features/companies/directory-companies-table-definition";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

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

const COMPANY_TYPE_OPTIONS = [
  { value: "client", label: "Client" },
  { value: "vendor", label: "Vendor" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "supplier", label: "Supplier" },
  { value: "connected company", label: "Connected Company" },
];

const COMPANY_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function buildCompanyTableColumns(
  onInlineEdit: (company: CompanyRow, field: string, value: string) => Promise<void>,
): TableColumn<CompanyRow>[] {
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
      editable: true,
      editValue: (item) => item.company_type?.toLowerCase() || "",
      onEdit: (item, value) => onInlineEdit(item, "company_type", value),
      renderEditor: ({ value, onChange, onCommit }) => (
        <InlineSelectEditor
          value={value || "vendor"}
          options={COMPANY_TYPE_OPTIONS}
          onChange={onChange}
          onCommit={onCommit}
        />
      ),
    },
    {
      ...col("status"),
      render: (item) => <CellBadge value={item.status} colorMap={STATUS_COLORS} emptyLabel="-" />,
      sortValue: (item) => item.status || "",
      editable: true,
      editValue: (item) => item.status?.toLowerCase() || "active",
      onEdit: (item, value) => onInlineEdit(item, "status", value),
      renderEditor: ({ value, onChange, onCommit }) => (
        <InlineSelectEditor
          value={value || "active"}
          options={COMPANY_STATUS_OPTIONS}
          onChange={onChange}
          onCommit={onCommit}
        />
      ),
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
      editable: true,
      editInputType: "tel",
      editValue: (item) => item.business_phone || "",
      onEdit: (item, value) => onInlineEdit(item, "business_phone", value),
    },
    {
      ...col("website"),
      render: (item) => {
        if (!item.website) return <span className="text-muted-foreground">-</span>;
        const display = item.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
        return <CellText value={display} />;
      },
      sortValue: (item) => item.website || "",
      editable: true,
      editInputType: "url",
      editValue: (item) => item.website || "",
      onEdit: (item, value) => onInlineEdit(item, "website", value),
    },
    {
      ...col("email_address"),
      render: (item) => <CellText value={item.email_address} emptyLabel="-" />,
      sortValue: (item) => item.email_address || "",
      editable: true,
      editInputType: "email",
      editValue: (item) => item.email_address || "",
      onEdit: (item, value) => onInlineEdit(item, "email_address", value),
    },
    {
      ...col("erp_vendor_id"),
      render: (item) => <CellText value={item.erp_vendor_id} emptyLabel="-" />,
      sortValue: (item) => item.erp_vendor_id || "",
      editable: true,
      editValue: (item) => item.erp_vendor_id || "",
      onEdit: (item, value) => onInlineEdit(item, "erp_vendor_id", value),
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
      <div className="flex items-center justify-between gap-1 px-4 h-11">
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
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Company header */}
        <div className="space-y-2">
          <div className="min-w-0">
            {/* eslint-disable-next-line design-system/no-raw-heading */}
            <h3 className="text-sm font-semibold leading-tight truncate">{displayName}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {typeLabel && (
                <span className="text-xs text-muted-foreground">
                  {typeLabel}
                </span>
              )}
              {company.status && (
                <CellBadge value={company.status} colorMap={STATUS_COLORS} />
              )}
            </div>
          </div>
        </div>

        {/* Identity section */}
        {(company.business_phone || company.email_address || company.website) && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Contact
            </p>
            <div className="space-y-2.5">
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
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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

      <div className="shrink-0 px-5 pb-5">
        <Button className="w-full" variant="outline" onClick={() => onOpenCompanyPage(company)}>
          View Company
        </Button>
      </div>
    </div>
  );
}

export default function GlobalCompanyDirectoryPage(): ReactElement {
  const pathname = usePathname()!;
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const isClientsRoute =
    pathname === "/directory/clients" || pathname.endsWith("/directory/clients");
  const forcedCompanyType = isClientsRoute ? "client" : undefined;
  const definition = React.useMemo(
    () =>
      createGlobalCompaniesTableDefinition({
        entityKey: isClientsRoute
          ? "global-directory-clients-v3"
          : "global-directory-companies-v3",
        forcedCompanyType,
      }),
    [forcedCompanyType, isClientsRoute],
  );

  const {
    tableState,
    items: companies,
    totalItems,
    totalPages,
    isLoading,
    isFetching,
    error,
    activeFilters,
    refresh,
    handleViewChange,
    handleFilterChange,
    handleSortChange,
    handlePageChange,
    handlePerPageChange,
  } = useServerTableDefinition<CompanyRow, CompanyFilterState>({
    definition,
    searchParams,
    pathname,
    router,
  });

  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleInlineCompanyEdit = React.useCallback(
    async (company: CompanyRow, field: string, value: string) => {
      await apiFetch(`/api/directory/companies/${company.company_id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value || null }),
      });
      await refresh();
    },
    [refresh],
  );

  const handleErpSync = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await apiFetch<{
        result: {
          created: number;
          updated: number;
          companiesCreated?: number;
          companiesUpdated?: number;
          errors: unknown[];
        };
      }>("/api/sync/acumatica/vendors", { method: "POST" });
      const { result } = data;
      toast.success(
        `ERP sync complete: ${result.created} vendors created, ${result.updated} vendors updated, ` +
          `${result.companiesCreated ?? 0} companies created, ${result.companiesUpdated ?? 0} companies updated` +
          (result.errors.length > 0 ? ` (${result.errors.length} errors)` : ""),
      );
      await refresh();
    } catch (err) {
      toast.error("ERP sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [refresh]);

  const filters: FilterConfig[] = React.useMemo(() => {
    if (forcedCompanyType) {
      return companyFilters.filter((filter) => filter.id !== "company_type");
    }

    return companyFilters;
  }, [forcedCompanyType]);

  const tableColumns = React.useMemo(
    () => buildCompanyTableColumns(handleInlineCompanyEdit),
    [handleInlineCompanyEdit],
  );
  const selectedCompanyId = searchParams.get("detail");
  const selectedCompany =
    selectedCompanyId ? companies.find((company) => company.id === selectedCompanyId) ?? null : null;
  const activeCompanyId = selectedCompany?.id ?? null;

  const handleDeleteCompany = React.useCallback(
    async (company: CompanyRow) => {
      try {
        await apiFetch(`/api/directory/companies/${company.id}`, { method: "DELETE" });
        toast.success("Company deleted");
        await refresh();
      } catch (err) {
        toast.error("Failed to delete company");
      }
    },
    [refresh],
  );

  const openCompanyPage = React.useCallback(
    (company: CompanyRow) => {
      // Company detail pages are keyed by global companies.id.
      router.push(`/directory/companies/${company.company_id}`);
    },
    [router],
  );

  const handleCompanyFilterChange = (nextFilters: CompanyFilterState) => {
    const mergedFilters: CompanyFilterState = forcedCompanyType
      ? {
          ...nextFilters,
          company_type: forcedCompanyType,
        }
      : nextFilters;

    handleFilterChange(mergedFilters);
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
    Object.entries(activeFilters).some(([key, value]) => {
      if (forcedCompanyType && key === "company_type") return false;
      return value !== undefined && value !== "" && value !== null;
    });

  return (
    <UnifiedTablePage
      header={{
        title: isClientsRoute ? "Clients" : "Companies",
        description:
          "Manage companies, clients, contacts, users, and employees across your organization",
        actions: (
          <TablePageActions
            addOptions={[
              { label: "Add New Company", icon: <Building2 /> },
              { label: "Import from CSV", icon: <FileSpreadsheet /> },
              { label: "Bulk Operations", icon: <Upload /> },
            ]}
            moreOptions={[
              {
                label: isSyncing ? "Syncing..." : "Sync from ERP",
                icon: <RefreshCw className={isSyncing ? "animate-spin" : undefined} />,
                onClick: handleErpSync,
                disabled: isSyncing,
              },
            ]}
          />
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems,
        filteredItems: totalItems,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: definition.searchPlaceholder,
        currentView: tableState.currentView,
        onViewChange: handleViewChange,
        enabledViews: definition.allowedViews,
        filters,
        activeFilters,
        onFilterChange: (filters) =>
          handleCompanyFilterChange(filters as CompanyFilterState),
        onClearFilters: () =>
          handleCompanyFilterChange({
            ...EMPTY_COMPANY_FILTERS,
            ...(forcedCompanyType ? { company_type: forcedCompanyType } : {}),
          }),
        columns: companyColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
        savedViewsScope: definition.entityKey,
        savedViewsDefaults: {
          visibleColumns: definition.defaultVisibleColumns,
          columnOrder: companyColumns.map((column) => column.id),
          columnWidths: {},
          sortBy: definition.defaultSortBy,
          sortDirection: definition.defaultSortDirection,
          filters: definition.defaultFilters,
        },
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
        onSortChange: handleSortChange,
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
        totalPages,
        perPage: tableState.perPage,
        onPageChange: handlePageChange,
        onPerPageChange: handlePerPageChange,
      }}
      features={{
        enableExport: false,
        enableBulkDelete: false,
        enableInlineEditing: true,
      }}
      layout={{
        fullBleedTable: true,
        removeTableFrame: true,
      }}
    />
  );
}
