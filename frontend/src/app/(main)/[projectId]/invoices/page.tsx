"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useBillingPeriodsList, useCreateBillingPeriod, type BillingPeriodItem } from "@/hooks/use-billing-periods";
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

// ---------------------------------------------------------------------------
// Billing Periods — inline tab columns + helpers
// ---------------------------------------------------------------------------

type BillingPeriod = BillingPeriodItem;

const billingPeriodColumnConfig: ColumnConfig[] = [
  { id: "period_number", label: "Period #", alwaysVisible: true },
  { id: "period", label: "Period", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "workCompleted", label: "Work Completed", defaultVisible: true },
  { id: "paymentDue", label: "Payment Due", defaultVisible: true },
  { id: "retention", label: "Retention", defaultVisible: true },
];

const billingPeriodDefaultVisibleColumns = billingPeriodColumnConfig
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

const billingPeriodFilters: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "draft", label: "Draft" },
      { value: "submitted", label: "Submitted" },
      { value: "approved", label: "Approved" },
      { value: "paid", label: "Paid" },
    ],
  },
];

function buildBillingPeriodColumns(
  _onView: (bp: BillingPeriod) => void,
): TableColumn<BillingPeriod>[] {
  return [
    {
      id: "period_number",
      label: "Period #",
      alwaysVisible: true,
      sortable: true,
      sortValue: (bp) => bp.period_number,
      render: (bp) => (
        <span className="font-medium text-primary tabular-nums">
          BP-{String(bp.period_number).padStart(3, "0")}
        </span>
      ),
    },
    {
      id: "period",
      label: "Period",
      defaultVisible: true,
      sortable: true,
      sortValue: (bp) => bp.start_date,
      render: (bp) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(bp.start_date)} – {formatDate(bp.end_date)}
        </span>
      ),
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      sortable: true,
      sortValue: (bp) => bp.status,
      render: (bp) => <StatusBadge status={bp.status} />,
    },
    {
      id: "workCompleted",
      label: "Work Completed",
      defaultVisible: true,
      sortable: true,
      sortValue: (bp) => bp.work_completed,
      render: (bp) => (
        <span className="font-medium tabular-nums">{formatCurrency(bp.work_completed)}</span>
      ),
    },
    {
      id: "paymentDue",
      label: "Payment Due",
      defaultVisible: true,
      sortable: true,
      sortValue: (bp) => bp.current_payment_due,
      render: (bp) => (
        <span className="font-medium tabular-nums">{formatCurrency(bp.current_payment_due)}</span>
      ),
    },
    {
      id: "retention",
      label: "Retention",
      defaultVisible: true,
      sortable: true,
      sortValue: (bp) => bp.retention_amount,
      render: (bp) => (
        <span className="tabular-nums text-muted-foreground">
          {formatCurrency(bp.retention_amount)} ({bp.retention_percentage}%)
        </span>
      ),
    },
  ];
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
  const [bpVisibleColumns, setBpVisibleColumns] = React.useState<string[]>(
    billingPeriodDefaultVisibleColumns,
  );
  const [createBpOpen, setCreateBpOpen] = React.useState(false);
  const [bpFormStartDate, setBpFormStartDate] = React.useState("");
  const [bpFormEndDate, setBpFormEndDate] = React.useState("");
  const [bpFormBillingDate, setBpFormBillingDate] = React.useState("");
  const createBpMutation = useCreateBillingPeriod(projectId);

  const {
    data: billingPeriodsRaw = [],
    isLoading: bpLoading,
    isFetching: bpFetching,
    error: bpError,
  } = useBillingPeriodsList(projectId);

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
          <Button
            type="button"
            variant="link"
            className="font-medium text-primary hover:underline h-auto p-0"
            onClick={() => router.push(`/${projectId}/commitments/${item.id}`)}
          >
            {item.number}
          </Button>
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

  // Billing periods — columns + filtered/sorted data
  const bpColumns = React.useMemo(
    () =>
      buildBillingPeriodColumns((bp) =>
        router.push(`/${projectId}/invoices?tab=billing-periods&periodId=${bp.id}`),
      ),
    [projectId, router],
  );

  const filteredBillingPeriods = React.useMemo(() => {
    let items = [...billingPeriodsRaw];
    if (activeTab === "billing-periods" && statusFilter) {
      items = items.filter((bp) => bp.status === statusFilter);
    }
    const search = tableState.debouncedSearch.toLowerCase().trim();
    if (activeTab === "billing-periods" && search) {
      const periodLabel = (bp: BillingPeriod) =>
        `BP-${String(bp.period_number).padStart(3, "0")}`.toLowerCase();
      items = items.filter(
        (bp) =>
          periodLabel(bp).includes(search) ||
          bp.start_date.includes(search) ||
          bp.end_date.includes(search),
      );
    }
    return items;
  }, [activeTab, statusFilter, tableState.debouncedSearch, billingPeriodsRaw]);

  const sortedBillingPeriods = React.useMemo(
    () => sortItems(filteredBillingPeriods, bpColumns, tableState.sortBy, tableState.sortDirection),
    [filteredBillingPeriods, bpColumns, tableState.sortBy, tableState.sortDirection],
  );

  const bpTotalItems = sortedBillingPeriods.length;
  const bpTotalPages = Math.max(1, Math.ceil(bpTotalItems / tableState.perPage));
  const bpOffset = (tableState.page - 1) * tableState.perPage;
  const bpPageItems = sortedBillingPeriods.slice(bpOffset, bpOffset + tableState.perPage);

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
      <Plus />
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
    const bpIsFiltered = Boolean(tableState.searchInput) || Boolean(activeFilters.status);

    const renderBpRowActions = (bp: BillingPeriod) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              toast.info(`Billing Period BP-${String(bp.period_number).padStart(3, "0")} — ${bp.status}. Net payment due: ${formatCurrency(bp.net_payment_due)}`)
            }
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    return (
      <>
      <UnifiedTablePage
        header={{
          title: "Invoices",
          description: "Track owner and subcontractor invoice activity",
          actions: (
            <Button
              size="sm"
              onClick={() => setCreateBpOpen(true)}
            >
              <Plus />
              Create Billing Period
            </Button>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems: billingPeriodsRaw.length,
          filteredItems: bpTotalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search billing periods...",
          currentView: "table",
          onViewChange: () => undefined,
          enabledViews: ["table"],
          filters: billingPeriodFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: billingPeriodColumnConfig,
          visibleColumns: bpVisibleColumns,
          onColumnVisibilityChange: setBpVisibleColumns,
        }}
        data={{
          items: bpPageItems,
          isLoading: bpLoading,
          isFetching: bpFetching,
          error: bpError instanceof Error ? bpError : bpError ? new Error("Failed to load billing periods") : undefined,
        }}
        table={{
          columns: bpColumns,
          getRowId: (bp) => bp.id,
          onRowClick: (bp) =>
            toast.info(`Billing Period BP-${String(bp.period_number).padStart(3, "0")} — ${bp.status}. Net payment due: ${formatCurrency(bp.net_payment_due)}`),
          rowActions: renderBpRowActions,
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
            tableState.setSelectedIds(checked ? bpPageItems.map((bp) => bp.id) : []);
          },
          onSelectRow: (id, checked) => {
            tableState.setSelectedIds((prev) =>
              checked ? [...prev, String(id)] : prev.filter((existingId) => existingId !== id),
            );
          },
        }}
        emptyState={{
          title: "No billing periods yet",
          description: "Create a billing period to organize invoices by cycle.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered: bpIsFiltered,
        }}
        pagination={{
          page: tableState.page,
          totalPages: bpTotalPages,
          perPage: tableState.perPage,
          onPageChange: handlePaginationChange,
          onPerPageChange: handlePerPageChange,
        }}
        features={{
          enableViews: false,
        }}
      />
      <Dialog open={createBpOpen} onOpenChange={setCreateBpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Billing Period</DialogTitle>
            <DialogDescription>
              Add a new billing period to this project&apos;s prime contract.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bp-start">Start Date</Label>
              <Input
                id="bp-start"
                type="date"
                value={bpFormStartDate}
                onChange={(e) => setBpFormStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-end">End Date</Label>
              <Input
                id="bp-end"
                type="date"
                value={bpFormEndDate}
                onChange={(e) => setBpFormEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-billing">Billing Date</Label>
              <Input
                id="bp-billing"
                type="date"
                value={bpFormBillingDate}
                onChange={(e) => setBpFormBillingDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBpOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createBpMutation.isPending || !bpFormStartDate || !bpFormEndDate || !bpFormBillingDate}
              onClick={() => {
                // Use the first prime contract for this project
                const contractId = billingPeriodsRaw[0]?.contract_id;
                if (!contractId) {
                  toast.error("No prime contract found for this project.");
                  return;
                }
                createBpMutation.mutate(
                  {
                    contract_id: contractId,
                    start_date: bpFormStartDate,
                    end_date: bpFormEndDate,
                    billing_date: bpFormBillingDate,
                  },
                  {
                    onSuccess: () => {
                      setCreateBpOpen(false);
                      setBpFormStartDate("");
                      setBpFormEndDate("");
                      setBpFormBillingDate("");
                    },
                  },
                );
              }}
            >
              {createBpMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
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
            <Plus />
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
