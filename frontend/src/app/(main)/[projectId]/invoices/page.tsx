"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { KpiRow, StatusBadge } from "@/components/ds";
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
import { useSubcontractorInvoicesList } from "@/hooks/use-subcontractor-invoices";
import { useBillingPeriodsList, useCreateBillingPeriod, type BillingPeriod } from "@/hooks/use-billing-periods";
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

interface SubcontractorInvoiceRow {
  id: number;
  invoice_number: string | null;
  status: string;
  billing_date: string | null;
  period_start: string | null;
  period_end: string | null;
  billing_period_id: string | null;
  billing_period_name: string | null;
  contract_number: string | null;
  contract_title: string | null;
  contract_company_id: string | null;
  contract_company_name: string | null;
  contract_type: "subcontract" | "purchase_order" | null;
  gross_amount: number;
  net_amount: number;
  paid_amount: number;
  total_completed: number;
  total_contract_amount: number;
  percent_complete: number;
  erp_status: string | null;
  payment_status: string | null;
}

const INVOICE_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "approved_as_noted", label: "Approved as Noted" },
  { value: "revise_and_resubmit", label: "Revise & Resubmit" },
  { value: "pending_owner_approval", label: "Pending Owner Approval" },
  { value: "paid", label: "Paid" },
];

const subcontractorColumnConfig: ColumnConfig[] = [
  { id: "invoice_number", label: "Invoice #", alwaysVisible: true },
  { id: "status", label: "Invoice Status", defaultVisible: true },
  { id: "contract_company", label: "Contract Company", defaultVisible: true },
  { id: "billing_period", label: "Billing Period", defaultVisible: true },
  { id: "gross_amount", label: "Gross Amount", defaultVisible: true },
  { id: "net_amount", label: "Net Amount", defaultVisible: true },
  { id: "paid_amount", label: "Paid Amount", defaultVisible: true },
  { id: "invoice_dates", label: "Invoice Dates", defaultVisible: true },
  { id: "contract", label: "Contract", defaultVisible: true },
  { id: "total_contract_amount", label: "Total Contract", defaultVisible: true },
  { id: "percent_complete", label: "% Complete", defaultVisible: true },
  { id: "total_amount", label: "Total Amount", defaultVisible: false },
  { id: "erp_status", label: "ERP Status", defaultVisible: false },
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

const billingPeriodColumnConfig: ColumnConfig[] = [
  { id: "period_number", label: "Period #", alwaysVisible: true },
  { id: "period", label: "Period", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "due_date", label: "Due Date", defaultVisible: true },
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
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
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
      sortValue: (bp) => (bp.is_closed ? 1 : 0),
      render: (bp) => (
        <StatusBadge status={bp.is_closed ? "closed" : "open"} />
      ),
    },
    {
      id: "due_date",
      label: "Due Date",
      defaultVisible: true,
      sortable: true,
      sortValue: (bp) => bp.due_date ?? "",
      render: (bp) => (
        <span className="text-sm text-muted-foreground">{formatDate(bp.due_date)}</span>
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
    useOwnerInvoicesList(projectId);

  const {
    data: subInvoicesRaw = [] as SubcontractorInvoiceRow[],
    isLoading: subcontractorLoading,
    isFetching: subcontractorFetching,
    error: subcontractorError,
  } = useSubcontractorInvoicesList(projectId) as {
    data: SubcontractorInvoiceRow[] | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
  };

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

  // Derive dynamic filter options from loaded invoices
  const subBillingPeriodOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of subInvoicesRaw) {
      if (inv.billing_period_id && inv.billing_period_name) {
        map.set(inv.billing_period_id, inv.billing_period_name);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [subInvoicesRaw]);

  const subCompanyOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of subInvoicesRaw) {
      if (inv.contract_company_id && inv.contract_company_name) {
        map.set(inv.contract_company_id, inv.contract_company_name);
      }
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [subInvoicesRaw]);

  const subcontractorFilters: FilterConfig[] = React.useMemo(
    () => [
      { id: "status", label: "Invoice Status", type: "select", options: INVOICE_STATUS_OPTIONS },
      {
        id: "billing_period_id",
        label: "Billing Period",
        type: "select",
        options: subBillingPeriodOptions,
      },
      {
        id: "contract_company_id",
        label: "Contract Company",
        type: "select",
        options: subCompanyOptions,
      },
      {
        id: "payment_status",
        label: "Payment Status",
        type: "select",
        options: [
          { value: "paid", label: "Paid" },
          { value: "unpaid", label: "Unpaid" },
        ],
      },
      {
        id: "contract_type",
        label: "Contract Type",
        type: "select",
        options: [
          { value: "subcontract", label: "Subcontract" },
          { value: "purchase_order", label: "Purchase Order" },
        ],
      },
    ],
    [subBillingPeriodOptions, subCompanyOptions],
  );

  const subcontractorItems = React.useMemo(() => {
    let items = subInvoicesRaw;
    const f = activeFilters as Record<string, string | undefined>;

    if (f.status) items = items.filter((i) => i.status === f.status);
    if (f.billing_period_id)
      items = items.filter((i) => i.billing_period_id === f.billing_period_id);
    if (f.contract_company_id)
      items = items.filter((i) => i.contract_company_id === f.contract_company_id);
    if (f.payment_status)
      items = items.filter((i) => i.payment_status === f.payment_status);
    if (f.contract_type)
      items = items.filter((i) => i.contract_type === f.contract_type);

    const search = tableState.debouncedSearch.toLowerCase().trim();
    if (search) {
      items = items.filter((i) => {
        const number = (i.invoice_number ?? "").toLowerCase();
        const contract = (i.contract_number ?? "").toLowerCase();
        const company = (i.contract_company_name ?? "").toLowerCase();
        return (
          number.includes(search) || contract.includes(search) || company.includes(search)
        );
      });
    }
    return items;
  }, [subInvoicesRaw, activeFilters, tableState.debouncedSearch]);

  const ownerColumns = React.useMemo(
    () =>
      buildInvoiceTableColumns(
        (invoice) => router.push(`/${projectId}/invoicing/${invoice.id}`),
        (invoice) => router.push(`/${projectId}/invoicing/${invoice.id}`),
      ),
    [projectId, router],
  );

  const subcontractorColumns = React.useMemo<TableColumn<SubcontractorInvoiceRow>[]>(
    () => [
      {
        id: "invoice_number",
        label: "Invoice #",
        alwaysVisible: true,
        sortable: true,
        sortValue: (i) => i.invoice_number ?? `INV-${i.id}`,
        render: (i) => (
          <Button
            type="button"
            variant="link"
            className="font-medium text-primary hover:underline h-auto p-0"
            onClick={() => router.push(`/${projectId}/invoicing/subcontractor/${i.id}`)}
          >
            {i.invoice_number ?? `INV-${i.id}`}
          </Button>
        ),
      },
      {
        id: "status",
        label: "Invoice Status",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.status,
        render: (i) => <StatusBadge status={i.status} />,
      },
      {
        id: "contract_company",
        label: "Contract Company",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.contract_company_name ?? "",
        render: (i) => (
          <span className="text-sm text-foreground">
            {i.contract_company_name ?? "-"}
          </span>
        ),
      },
      {
        id: "billing_period",
        label: "Billing Period",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.billing_period_name ?? "",
        render: (i) => (
          <span className="text-sm text-muted-foreground">
            {i.billing_period_name ?? "-"}
          </span>
        ),
      },
      {
        id: "gross_amount",
        label: "Gross Amount",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.gross_amount,
        render: (i) => (
          <span className="font-medium tabular-nums">{formatCurrency(i.gross_amount)}</span>
        ),
      },
      {
        id: "net_amount",
        label: "Net Amount",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.net_amount,
        render: (i) => (
          <span className="tabular-nums">{formatCurrency(i.net_amount)}</span>
        ),
      },
      {
        id: "paid_amount",
        label: "Paid Amount",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.paid_amount,
        render: (i) => (
          <span className="tabular-nums text-muted-foreground">
            {formatCurrency(i.paid_amount)}
          </span>
        ),
      },
      {
        id: "invoice_dates",
        label: "Invoice Dates",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.billing_date ?? i.period_start ?? "",
        render: (i) => (
          <span className="text-sm text-muted-foreground">
            {i.period_start || i.period_end
              ? `${formatDate(i.period_start)} – ${formatDate(i.period_end)}`
              : formatDate(i.billing_date)}
          </span>
        ),
      },
      {
        id: "contract",
        label: "Contract",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.contract_number ?? "",
        render: (i) => (
          <span className="text-sm text-foreground">
            {i.contract_number ?? "-"}
            {i.contract_title ? (
              <span className="text-muted-foreground"> — {i.contract_title}</span>
            ) : null}
          </span>
        ),
      },
      {
        id: "total_contract_amount",
        label: "Total Contract",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.total_contract_amount,
        render: (i) => (
          <span className="tabular-nums">{formatCurrency(i.total_contract_amount)}</span>
        ),
      },
      {
        id: "percent_complete",
        label: "% Complete",
        defaultVisible: true,
        sortable: true,
        sortValue: (i) => i.percent_complete,
        render: (i) => (
          <span className="tabular-nums text-muted-foreground">
            {i.percent_complete.toFixed(1)}%
          </span>
        ),
      },
      {
        id: "total_amount",
        label: "Total Amount",
        defaultVisible: false,
        sortable: true,
        sortValue: (i) => i.total_completed,
        render: (i) => (
          <span className="tabular-nums">{formatCurrency(i.total_completed)}</span>
        ),
      },
      {
        id: "erp_status",
        label: "ERP Status",
        defaultVisible: false,
        sortable: true,
        sortValue: (i) => i.erp_status ?? "",
        render: (i) => (
          <span className="text-sm text-muted-foreground">{i.erp_status ?? "-"}</span>
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

  const ownerKpiTotals = React.useMemo(() => {
    const sumFor = (status: string) =>
      ownerRawInvoices
        .filter((inv) => inv.status === status)
        .reduce((acc, inv) => acc + (inv.gross_amount ?? inv.total_amount ?? 0), 0);
    return {
      underReview: sumFor("under_review"),
      approved: sumFor("approved"),
      reviseAndResubmit: sumFor("revise_and_resubmit"),
    };
  }, [ownerRawInvoices]);

  const ownerKpiRow = (
    <KpiRow
      metrics={[
        { label: "Under Review", value: formatCurrency(ownerKpiTotals.underReview) },
        { label: "Approved", value: formatCurrency(ownerKpiTotals.approved) },
        { label: "Revise & Resubmit", value: formatCurrency(ownerKpiTotals.reviseAndResubmit) },
      ]}
    />
  );

  const ownerTotalItems = sortedOwnerInvoices.length;
  const ownerTotalPages = Math.max(1, Math.ceil(ownerTotalItems / tableState.perPage));
  const ownerOffset = (tableState.page - 1) * tableState.perPage;
  const ownerPageItems = sortedOwnerInvoices.slice(ownerOffset, ownerOffset + tableState.perPage);

  const subcontractorTotalItems = sortedSubcontractors.length;
  const subcontractorTotalPages = Math.max(
    1,
    Math.ceil(subcontractorTotalItems / tableState.perPage),
  );
  const subOffset = (tableState.page - 1) * tableState.perPage;
  const subPageItems = sortedSubcontractors.slice(subOffset, subOffset + tableState.perPage);

  const subKpiTotals = React.useMemo(() => {
    const sumFor = (status: string) =>
      subInvoicesRaw
        .filter((i) => i.status === status)
        .reduce((acc, i) => acc + (i.gross_amount ?? 0), 0);
    return {
      underReview: sumFor("under_review"),
      approved: sumFor("approved") + sumFor("approved_as_noted"),
      reviseAndResubmit: sumFor("revise_and_resubmit"),
    };
  }, [subInvoicesRaw]);

  const subKpiRow = (
    <KpiRow
      metrics={[
        { label: "Under Review", value: formatCurrency(subKpiTotals.underReview) },
        { label: "Approved", value: formatCurrency(subKpiTotals.approved) },
        { label: "Revise & Resubmit", value: formatCurrency(subKpiTotals.reviseAndResubmit) },
      ]}
    />
  );

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
      items = items.filter((bp) =>
        statusFilter === "closed" ? bp.is_closed === true : bp.is_closed !== true,
      );
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
        topContent={subKpiRow}
        toolbar={{
          totalItems: subInvoicesRaw.length,
          filteredItems: subcontractorTotalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search subcontractor invoices...",
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
          items: subPageItems,
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
          getRowId: (item) => String(item.id),
          onRowClick: (item) =>
            router.push(`/${projectId}/invoicing/subcontractor/${item.id}`),
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
            tableState.setSelectedIds(checked ? subPageItems.map((item) => String(item.id)) : []);
          },
          onSelectRow: (id, checked) => {
            tableState.setSelectedIds((prev) =>
              checked ? [...prev, String(id)] : prev.filter((existingId) => existingId !== id),
            );
          },
        }}
        emptyState={{
          title: "No subcontractor invoices found",
          description: "Create a subcontractor invoice against one of your commitments.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
        }}
        pagination={{
          page: tableState.page,
          totalPages: subcontractorTotalPages,
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
              toast.info(`Billing Period BP-${String(bp.period_number).padStart(3, "0")} — ${bp.is_closed ? "Closed" : "Open"}`)
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
            toast.info(`Billing Period BP-${String(bp.period_number).padStart(3, "0")} — ${bp.is_closed ? "Closed" : "Open"}`),
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
                createBpMutation.mutate(
                  {
                    start_date: bpFormStartDate,
                    end_date: bpFormEndDate,
                    due_date: bpFormBillingDate || undefined,
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
      topContent={ownerKpiRow}
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
