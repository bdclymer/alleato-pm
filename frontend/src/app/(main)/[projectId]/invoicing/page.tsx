"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
  type FilterConfig,
} from "@/components/tables/unified";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/misc/status-badge";
import { KpiRow } from "@/components/ds";
import { PageShell } from "@/components/layout";
import {
  useOwnerInvoicesList,
  useDeleteOwnerInvoice,
} from "@/hooks/use-invoicing";
import {
  buildInvoiceTableColumns,
  invoiceColumns,
  invoiceDefaultVisibleColumns,
  renderInvoiceCard,
  renderInvoiceList,
  renderInvoiceRowActions,
  type OwnerInvoice,
} from "@/features/invoicing/invoicing-table-config";

// =============================================================================
// Types
// =============================================================================

interface SubcontractorInvoiceRow {
  id: string | null;
  contract_number: string | null;
  title: string | null;
  status: string | null;
  company_name: string | null;
  total_contract_amount: number;
  total_billed_to_date: number;
  percent_billed: number;
  contract_date: string | null;
  created_at: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const EMPTY_FILTERS: Record<string, FilterValue> = {
  billing_period_id: undefined,
  prime_contract_id: undefined,
  status: undefined,
  contract_company: undefined,
};

type FilterState = Record<string, FilterValue>;

// =============================================================================
// Page Component
// =============================================================================

export default function ProjectInvoicingPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId ?? "";

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<OwnerInvoice | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Active tab from URL (owner | subcontractor | billing-periods)
  const activeTab = searchParams.get("tab") ?? "owner";

  // Initial filter state from URL
  const initialFilters: FilterState = {
    billing_period_id: searchParams.get("billing_period_id") ?? undefined,
    prime_contract_id: searchParams.get("prime_contract_id") ?? undefined,
    status: undefined,
    contract_company: undefined,
  };

  // ─── Table State ───────────────────────────────────────────────────────────

  const tableState = useUnifiedTableState({
    entityKey: "invoicing",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "created_at",
      sortDirection: "desc",
      visibleColumns: invoiceDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  // Sync URL filter params → table state
  React.useEffect(() => {
    const nextBillingPeriod = searchParams.get("billing_period_id") ?? undefined;
    const nextContract = searchParams.get("prime_contract_id") ?? undefined;
    tableState.setActiveFilters((prev) => {
      if (prev.billing_period_id === nextBillingPeriod && prev.prime_contract_id === nextContract) return prev;
      return { billing_period_id: nextBillingPeriod, prime_contract_id: nextContract };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as FilterState;

  // ─── Data ──────────────────────────────────────────────────────────────────

  const billingPeriodFilter =
    searchParams.get("billing_period_id") ||
    (typeof activeFilters.billing_period_id === "string" ? activeFilters.billing_period_id : undefined);
  const primeContractFilter =
    searchParams.get("prime_contract_id") ||
    (typeof activeFilters.prime_contract_id === "string" ? activeFilters.prime_contract_id : undefined);

  const { data: rawInvoices = [], isLoading, isFetching, error } = useOwnerInvoicesList(
    projectId,
    { billing_period_id: billingPeriodFilter, prime_contract_id: primeContractFilter },
  );

  const resolvedError =
    error instanceof Error ? error : error ? new Error("Failed to load invoices") : undefined;

  const deleteInvoice = useDeleteOwnerInvoice(projectId);

  // ─── Subcontractor invoices ───────────────────────────────────────────────

  const { data: subcontractorInvoices = [], isLoading: isSubLoading } = useQuery<SubcontractorInvoiceRow[]>({
    queryKey: ["subcontractor-invoices", projectId],
    queryFn: async () => {
      const resp = await fetch(`/api/projects/${projectId}/invoicing/subcontractor`);
      if (!resp.ok) throw new Error("Failed to load subcontractor invoices");
      const json = await resp.json();
      return json.data as SubcontractorInvoiceRow[];
    },
    enabled: activeTab === "subcontractor",
  });

  // ─── Acumatica Sync ──────────────────────────────────────────────────────

  const handleErpSync = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const resp = await fetch("/api/sync/acumatica/ar-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: Number(projectId) }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Sync failed");
      const { result } = data;
      toast.success(
        `Invoice sync complete: ${result.created} created, ${result.updated} updated` +
          (result.errors.length > 0 ? ` (${result.errors.length} errors)` : ""),
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invoice sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [projectId, router]);

  // ─── Client-side filtering / sorting ───────────────────────────────────────

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleView(invoice: OwnerInvoice) {
    router.push(`/${projectId}/invoicing/${invoice.id}`);
  }

  function handleEdit(invoice: OwnerInvoice) {
    router.push(`/${projectId}/invoicing/${invoice.id}`);
  }

  function handleDeleteIntent(invoice: OwnerInvoice) {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!invoiceToDelete) return;
    try {
      await deleteInvoice.mutateAsync(invoiceToDelete.id);
    } finally {
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  }

  function handleFilterChange(nextFilters: FilterState) {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      billing_period_id: typeof nextFilters.billing_period_id === "string" ? nextFilters.billing_period_id : null,
      prime_contract_id: typeof nextFilters.prime_contract_id === "string" ? nextFilters.prime_contract_id : null,
      page: "1",
    });
    tableState.setPage(1);
  }

  // ─── Client-side filtering ─────────────────────────────────────────────────

  // Status + company filter (applied after server-side filters)
  const filteredInvoices = React.useMemo(() => {
    let items = rawInvoices;

    const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : undefined;
    if (statusFilter) {
      items = items.filter((inv) => inv.status === statusFilter);
    }

    const companyFilter = typeof activeFilters.contract_company === "string"
      ? activeFilters.contract_company.toLowerCase()
      : undefined;
    if (companyFilter) {
      items = items.filter((inv) =>
        inv.vendor_name?.toLowerCase().includes(companyFilter) ?? false,
      );
    }

    return items;
  }, [rawInvoices, activeFilters.status, activeFilters.contract_company]);

  const invoices = React.useMemo(() => {
    let items = filteredInvoices;

    // Search filter (client-side)
    const search = tableState.debouncedSearch.toLowerCase().trim();
    if (search) {
      items = items.filter((inv) => {
        const num = inv.invoice_number?.toLowerCase() ?? "";
        const id = `inv-${inv.id}`;
        return num.includes(search) || id.includes(search);
      });
    }

    return items;
  }, [filteredInvoices, tableState.debouncedSearch]);

  const tableColumns = buildInvoiceTableColumns(handleView, handleEdit);

  const sortedInvoices = React.useMemo(() => {
    if (!tableState.sortBy) return invoices;
    const col = tableColumns.find((c) => c.id === tableState.sortBy);
    const getSortValue = col?.sortValue;
    if (!getSortValue) return invoices;

    return [...invoices].sort((a, b) => {
      const va = getSortValue(a);
      const vb = getSortValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (vb == null) return tableState.sortDirection === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return tableState.sortDirection === "asc" ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb));
      return tableState.sortDirection === "asc" ? cmp : -cmp;
    });
  }, [invoices, tableColumns, tableState.sortBy, tableState.sortDirection]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.billing_period_id) ||
    Boolean(activeFilters.prime_contract_id) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.contract_company);

  const totalItems = sortedInvoices.length;

  // ─── KPI Metrics ─────────────────────────────────────────────────────────

  const kpiMetrics = React.useMemo(() => {
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

    const totalInvoiced = rawInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    const pending = rawInvoices
      .filter((inv) => inv.status === "draft" || inv.status === "under_review" || inv.status === "revise_and_resubmit")
      .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    const approved = rawInvoices
      .filter((inv) => inv.status === "approved")
      .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    const paid = rawInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);

    return [
      { label: "Total Invoiced", value: fmt(totalInvoiced), context: `${rawInvoices.length} invoices` },
      { label: "Pending", value: fmt(pending) },
      { label: "Approved", value: fmt(approved) },
      { label: "Paid", value: fmt(paid) },
    ];
  }, [rawInvoices]);

  // ─── Augmented filters (base + status + company) ──────────────────────────

  const augmentedFilters: FilterConfig[] = [
    {
      id: "billing_period_id",
      label: "Billing Period",
      type: "select",
      options: [],
    },
    {
      id: "prime_contract_id",
      label: "Prime Contract",
      type: "select",
      options: [],
    },
    {
      id: "status",
      label: "Invoice Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "submitted", label: "Submitted" },
        { value: "under_review", label: "Under Review" },
        { value: "approved", label: "Approved" },
        { value: "paid", label: "Paid" },
        { value: "void", label: "Void" },
        { value: "revise_and_resubmit", label: "Revise & Resubmit" },
      ],
    },
    {
      id: "contract_company",
      label: "Contract Company",
      type: "text",
    },
  ];

  // ─── Tabs ──────────────────────────────────────────────────────────────────

  const tabs = [
    {
      label: "Owner Invoices",
      href: `/${projectId}/invoicing`,
      isActive: activeTab === "owner" || !searchParams.get("tab"),
    },
    {
      label: "Subcontractor",
      href: `/${projectId}/invoicing?tab=subcontractor`,
      isActive: activeTab === "subcontractor",
    },
    {
      label: "Billing Periods",
      href: `/${projectId}/invoicing?tab=billing-periods`,
      isActive: activeTab === "billing-periods",
    },
  ];

  // ─── Action Button ─────────────────────────────────────────────────────────

  const createButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus />
          Create Invoice
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/${projectId}/invoicing/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          Owner Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toast.info("Subcontractor invoice coming soon")}>
          <Plus className="h-4 w-4 mr-2" />
          Subcontractor Invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ─── Subcontractor table render ────────────────────────────────────────────

  const subcontractorTable = (
    <div className="px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isSubLoading ? "Loading…" : `${subcontractorInvoices.length} subcontract${subcontractorInvoices.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      {isSubLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading subcontractor invoices…</p>
      ) : subcontractorInvoices.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No subcontractor invoices found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Contract Amount</TableHead>
              <TableHead className="text-right">Billed to Date</TableHead>
              <TableHead className="text-right">% Billed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subcontractorInvoices.map((row) => (
              <TableRow key={row.id ?? row.contract_number}>
                <TableCell className="font-medium">{row.contract_number ?? "—"}</TableCell>
                <TableCell>{row.title ?? "—"}</TableCell>
                <TableCell>{row.company_name ?? "—"}</TableCell>
                <TableCell>
                  {row.status ? <StatusBadge status={row.status} /> : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.total_contract_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.total_billed_to_date)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.percent_billed}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (activeTab === "subcontractor") {
    return (
      <PageShell
        variant="table"
        title="Invoicing"
        description="Manage owner invoices and billing periods"
        actions={createButton}
        tabs={tabs}
      >
        {subcontractorTable}
      </PageShell>
    );
  }

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Invoicing",
          description: "Manage owner invoices and billing periods",
          actions: createButton,
        }}
        tabs={tabs}
        topContent={
          rawInvoices.length > 0 ? (
            <div className="px-6 pb-4">
              <KpiRow metrics={kpiMetrics} />
            </div>
          ) : undefined
        }
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search invoices...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: augmentedFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: invoiceColumns,
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
                <TooltipContent>Sync invoices from Acumatica</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ),
        }}
        data={{
          items: sortedInvoices,
          isLoading,
          isFetching,
          error: resolvedError,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => String(item.id),
          onRowClick: handleView,
          rowActions: (item) =>
            renderInvoiceRowActions(item, handleView, handleEdit, handleDeleteIntent),
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
          onSelectAll: (checked) => {
            tableState.setSelectedIds(
              checked ? sortedInvoices.map((inv) => String(inv.id)) : [],
            );
          },
          onSelectRow: (id, checked) => {
            tableState.setSelectedIds((prev) =>
              checked
                ? [...prev, String(id)]
                : prev.filter((x) => x !== String(id)),
            );
          },
        }}
        views={{
          card: (item) => renderInvoiceCard(item),
          list: (item) => renderInvoiceList(item),
        }}
        emptyState={{
          title: "No invoices found",
          description: "You have not created any owner invoices yet.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
          action: (
            <Button size="sm" onClick={() => router.push(`/${projectId}/invoicing/new`)}>
              <Plus />
              Create your first invoice
            </Button>
          ),
        }}
        pagination={{
          page: tableState.page,
          totalPages: Math.max(1, Math.ceil(totalItems / tableState.perPage)),
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice{" "}
              <strong>
                {invoiceToDelete?.invoice_number || `INV-${invoiceToDelete?.id}`}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
