"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { useOwnerInvoicesList } from "@/hooks/use-invoicing";
import { useCommitmentsList } from "@/hooks/use-commitments-query";
import type { CommitmentListItem } from "@/lib/validation/commitments";
import {
  buildInvoiceTableColumns,
  invoiceColumns,
  invoiceDefaultVisibleColumns,
  invoiceFilters,
  renderInvoiceRowActions,
  type OwnerInvoice,
} from "@/features/invoicing/invoicing-table-config";

type TabKey = "owner" | "subcontractor" | "billing-periods";
type FilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: FilterState = {
  status: undefined,
};

const subcontractorFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
      { value: "executed", label: "Executed" },
      { value: "closed", label: "Closed" },
      { value: "void", label: "Void" },
    ],
  },
];

const subcontractorColumnConfig: ColumnConfig[] = [
  { id: "number", label: "Commitment #", alwaysVisible: true },
  { id: "title", label: "Title", defaultVisible: true },
  { id: "company", label: "Vendor", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "invoiced_amount", label: "Invoiced", defaultVisible: true },
  { id: "balance_to_finish", label: "Remaining", defaultVisible: true },
  { id: "updated_at", label: "Updated", defaultVisible: false },
];

const subcontractorDefaultVisibleColumns = subcontractorColumnConfig
  .filter((column) => column.defaultVisible !== false || column.alwaysVisible)
  .map((column) => column.id);

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function sortItems<T>(
  items: T[],
  columns: TableColumn<T>[],
  sortBy: string | null,
  sortDirection: "asc" | "desc",
): T[] {
  if (!sortBy) return items;

  const column = columns.find((entry) => entry.id === sortBy);
  const getSortValue = column?.sortValue;
  if (!getSortValue) return items;

  return [...items].sort((a, b) => {
    const valueA = getSortValue(a);
    const valueB = getSortValue(b);

    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return sortDirection === "asc" ? -1 : 1;
    if (valueB == null) return sortDirection === "asc" ? 1 : -1;

    if (typeof valueA === "number" && typeof valueB === "number") {
      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    }

    const comparison = String(valueA).localeCompare(String(valueB));
    return sortDirection === "asc" ? comparison : -comparison;
  });
}

export default function ProjectInvoicesPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId ?? "";

  const activeTab = (searchParams.get("tab") ?? "owner") as TabKey;
  const initialFilters: FilterState = {
    status: searchParams.get("status") ?? undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "project-invoices",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "created_at",
      sortDirection: "desc",
      visibleColumns: invoiceDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    tableState.setActiveFilters((prev) => {
      const normalized = nextStatus || undefined;
      if (prev.status === normalized) return prev;
      return { status: normalized };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as FilterState;
  const statusFilter =
    searchParams.get("status") ||
    (typeof activeFilters.status === "string" ? activeFilters.status : undefined);

  const [ownerVisibleColumns, setOwnerVisibleColumns] = React.useState<string[]>(
    invoiceDefaultVisibleColumns,
  );
  const [subcontractorVisibleColumns, setSubcontractorVisibleColumns] =
    React.useState<string[]>(subcontractorDefaultVisibleColumns);

  const { data: ownerRawInvoices = [], isLoading: ownerLoading, isFetching: ownerFetching, error: ownerError } =
    useOwnerInvoicesList(projectId, {
      status: activeTab === "owner" ? statusFilter : undefined,
      search: activeTab === "owner" ? tableState.debouncedSearch : undefined,
    });

  const {
    data: subcontractorResponse,
    isLoading: subcontractorLoading,
    isFetching: subcontractorFetching,
    error: subcontractorError,
  } = useCommitmentsList(projectId, {
    page: tableState.page,
    limit: tableState.perPage,
    status: activeTab === "subcontractor" ? statusFilter : undefined,
    type: "subcontract",
    search: activeTab === "subcontractor" ? tableState.debouncedSearch || undefined : undefined,
  });

  const ownerInvoices = React.useMemo(() => {
    let items = ownerRawInvoices;

    if (statusFilter) {
      items = items.filter((invoice) => invoice.status === statusFilter);
    }

    const search = tableState.debouncedSearch.toLowerCase().trim();
    if (search) {
      items = items.filter((invoice) => {
        const number = invoice.invoice_number?.toLowerCase() ?? "";
        const id = `inv-${invoice.id}`;
        return number.includes(search) || id.includes(search);
      });
    }

    return items;
  }, [ownerRawInvoices, statusFilter, tableState.debouncedSearch]);

  const subcontractorItems = subcontractorResponse?.data ?? [];

  const ownerColumns = React.useMemo(
    () =>
      buildInvoiceTableColumns(
        (invoice) => router.push(`/${projectId}/invoicing/${invoice.id}`),
        (invoice) => router.push(`/${projectId}/invoicing/${invoice.id}`),
      ),
    [projectId, router],
  );

  const subcontractorColumns = React.useMemo<TableColumn<CommitmentListItem>[]>(
    () => [
      {
        id: "number",
        label: "Commitment #",
        alwaysVisible: true,
        sortable: true,
        sortValue: (item) => item.number,
        render: (item) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => router.push(`/${projectId}/commitments/${item.id}`)}
          >
            {item.number}
          </button>
        ),
      },
      {
        id: "title",
        label: "Title",
        defaultVisible: true,
        sortable: true,
        sortValue: (item) => item.title || "",
        render: (item) => (
          <span className="text-sm text-foreground">{item.title || "-"}</span>
        ),
      },
      {
        id: "company",
        label: "Vendor",
        defaultVisible: true,
        sortable: true,
        sortValue: (item) => item.contract_company?.name || "",
        render: (item) => (
          <span className="text-sm text-muted-foreground">
            {item.contract_company?.name || "-"}
          </span>
        ),
      },
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        sortable: true,
        sortValue: (item) => item.status,
        render: (item) => <StatusBadge status={item.status} />,
      },
      {
        id: "invoiced_amount",
        label: "Invoiced",
        defaultVisible: true,
        sortable: true,
        sortValue: (item) => item.invoiced_amount,
        render: (item) => (
          <span className="font-medium tabular-nums">{formatCurrency(item.invoiced_amount)}</span>
        ),
      },
      {
        id: "balance_to_finish",
        label: "Remaining",
        defaultVisible: true,
        sortable: true,
        sortValue: (item) => item.balance_to_finish,
        render: (item) => (
          <span className="tabular-nums text-muted-foreground">
            {formatCurrency(item.balance_to_finish)}
          </span>
        ),
      },
      {
        id: "updated_at",
        label: "Updated",
        defaultVisible: false,
        sortable: true,
        sortValue: (item) => item.updated_at,
        render: (item) => (
          <span className="text-sm text-muted-foreground">{formatDate(item.updated_at)}</span>
        ),
      },
    ],
    [projectId, router],
  );

  const sortedOwnerInvoices = React.useMemo(
    () => sortItems(ownerInvoices, ownerColumns, tableState.sortBy, tableState.sortDirection),
    [ownerInvoices, ownerColumns, tableState.sortBy, tableState.sortDirection],
  );

  const sortedSubcontractors = React.useMemo(
    () =>
      sortItems(
        subcontractorItems,
        subcontractorColumns,
        tableState.sortBy,
        tableState.sortDirection,
      ),
    [subcontractorItems, subcontractorColumns, tableState.sortBy, tableState.sortDirection],
  );

  const ownerTotalItems = sortedOwnerInvoices.length;
  const ownerTotalPages = Math.max(1, Math.ceil(ownerTotalItems / tableState.perPage));
  const ownerOffset = (tableState.page - 1) * tableState.perPage;
  const ownerPageItems = sortedOwnerInvoices.slice(ownerOffset, ownerOffset + tableState.perPage);

  const subcontractorTotalItems = subcontractorResponse?.meta.total ?? sortedSubcontractors.length;
  const subcontractorTotalPages = subcontractorResponse?.meta.totalPages ?? 1;

  const tabs = [
    {
      label: "Owner",
      href: `/${projectId}/invoices`,
      isActive: activeTab === "owner",
    },
    {
      label: "Subcontractor",
      href: `/${projectId}/invoices?tab=subcontractor`,
      isActive: activeTab === "subcontractor",
    },
    {
      label: "Billing Periods",
      href: `/${projectId}/invoices?tab=billing-periods`,
      isActive: activeTab === "billing-periods",
    },
  ];

  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handlePaginationChange = (nextPage: number) => {
    tableState.setPage(nextPage);
    tableState.setSearchParams({ page: String(nextPage) });
  };

  const handlePerPageChange = (nextPerPage: string) => {
    const parsed = Number(nextPerPage);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    tableState.setPerPage(parsed);
    tableState.setSearchParams({ per_page: String(parsed), page: "1" });
    tableState.setPage(1);
  };

  const createInvoiceAction = (
    <Button size="sm" onClick={() => router.push(`/${projectId}/invoicing/new`)}>
      <Plus className="mr-2 h-4 w-4" />
      New Invoice
    </Button>
  );

  const isFiltered = Boolean(tableState.searchInput) || Boolean(activeFilters.status);

  if (activeTab === "subcontractor") {
    return (
      <UnifiedTablePage
        header={{
          title: "Invoices",
          description: "Track owner and subcontractor invoice activity",
          actions: createInvoiceAction,
        }}
        tabs={tabs}
        toolbar={{
          totalItems: subcontractorTotalItems,
          filteredItems: subcontractorTotalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search subcontractor commitments...",
          currentView: "table",
          onViewChange: () => undefined,
          enabledViews: ["table"],
          filters: subcontractorFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: subcontractorColumnConfig,
          visibleColumns: subcontractorVisibleColumns,
          onColumnVisibilityChange: setSubcontractorVisibleColumns,
        }}
        data={{
          items: sortedSubcontractors,
          isLoading: subcontractorLoading,
          isFetching: subcontractorFetching,
          error:
            subcontractorError instanceof Error
              ? subcontractorError
              : subcontractorError
                ? new Error("Failed to load subcontractor invoices")
                : undefined,
        }}
        table={{
          columns: subcontractorColumns,
          getRowId: (item) => item.id,
          onRowClick: (item) => router.push(`/${projectId}/commitments/${item.id}`),
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
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: (checked) => {
            tableState.setSelectedIds(checked ? sortedSubcontractors.map((item) => item.id) : []);
          },
          onSelectRow: (id, checked) => {
            tableState.setSelectedIds((prev) =>
              checked ? [...prev, id] : prev.filter((existingId) => existingId !== id),
            );
          },
        }}
        emptyState={{
          title: "No subcontractor commitments found",
          description: "No subcontractor commitments are available for invoicing yet.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
        }}
        pagination={{
          page: tableState.page,
          totalPages: Math.max(1, subcontractorTotalPages),
          perPage: tableState.perPage,
          onPageChange: handlePaginationChange,
          onPerPageChange: handlePerPageChange,
        }}
        features={{
          enableViews: false,
        }}
      />
    );
  }

  if (activeTab === "billing-periods") {
    return (
      <UnifiedTablePage
        header={{
          title: "Invoices",
          description: "Track owner and subcontractor invoice activity",
          actions: createInvoiceAction,
        }}
        tabs={tabs}
        toolbar={{
          totalItems: 0,
          filteredItems: 0,
          selectedCount: 0,
          searchValue: "",
          onSearchChange: () => undefined,
          searchPlaceholder: "",
          currentView: "table",
          onViewChange: () => undefined,
          enabledViews: ["table"],
          columns: [],
          visibleColumns: [],
          onColumnVisibilityChange: () => undefined,
        }}
        data={{
          items: [] as OwnerInvoice[],
          isLoading: false,
        }}
        table={{
          columns: ownerColumns,
          getRowId: (item) => String(item.id),
        }}
        emptyState={{
          title: "No billing periods yet",
          description: "Billing period records will appear here once configured.",
          filteredDescription: "Billing period records will appear here once configured.",
          isFiltered: false,
        }}
        pagination={{
          page: 1,
          totalPages: 1,
          perPage: tableState.perPage,
          onPageChange: () => undefined,
          onPerPageChange: () => undefined,
        }}
        features={{
          enableViews: false,
          enableSearch: false,
          enableFilters: false,
          enableRowSelection: false,
          enableColumnToggle: false,
          enableExport: false,
          enableBulkDelete: false,
        }}
      />
    );
  }

  return (
    <UnifiedTablePage
      header={{
        title: "Invoices",
        description: "Track owner and subcontractor invoice activity",
        actions: createInvoiceAction,
      }}
      tabs={tabs}
      toolbar={{
        totalItems: ownerTotalItems,
        filteredItems: ownerTotalItems,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search owner invoices...",
        currentView: "table",
        onViewChange: () => undefined,
        enabledViews: ["table"],
        filters: invoiceFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: invoiceColumns,
        visibleColumns: ownerVisibleColumns,
        onColumnVisibilityChange: setOwnerVisibleColumns,
      }}
      data={{
        items: ownerPageItems,
        isLoading: ownerLoading,
        isFetching: ownerFetching,
        error:
          ownerError instanceof Error
            ? ownerError
            : ownerError
              ? new Error("Failed to load owner invoices")
              : undefined,
      }}
      table={{
        columns: ownerColumns,
        getRowId: (item) => String(item.id),
        onRowClick: (item) => router.push(`/${projectId}/invoicing/${item.id}`),
        rowActions: (item) =>
          renderInvoiceRowActions(
            item,
            (invoice) => router.push(`/${projectId}/invoicing/${invoice.id}`),
            (invoice) => router.push(`/${projectId}/invoicing/${invoice.id}`),
            () => undefined,
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
      selection={{
        selectedIds: tableState.selectedIds,
        onSelectAll: (checked) => {
          tableState.setSelectedIds(checked ? ownerPageItems.map((item) => String(item.id)) : []);
        },
        onSelectRow: (id, checked) => {
          tableState.setSelectedIds((prev) =>
            checked ? [...prev, String(id)] : prev.filter((existingId) => existingId !== id),
          );
        },
      }}
      emptyState={{
        title: "No owner invoices found",
        description: "Create an invoice to bill against your prime contracts.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
        action: (
          <Button size="sm" onClick={() => router.push(`/${projectId}/invoicing/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Create invoice
          </Button>
        ),
      }}
      pagination={{
        page: tableState.page,
        totalPages: ownerTotalPages,
        perPage: tableState.perPage,
        onPageChange: handlePaginationChange,
        onPerPageChange: handlePerPageChange,
      }}
      features={{
        enableViews: false,
      }}
    />
  );
}
