"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
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
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { KpiRow } from "@/components/ds";
import {
  useOwnerInvoicesList,
  useDeleteOwnerInvoice,
} from "@/hooks/use-invoicing";
import {
  buildInvoiceTableColumns,
  invoiceColumns,
  invoiceDefaultVisibleColumns,
  invoiceFilters,
  renderInvoiceCard,
  renderInvoiceList,
  renderInvoiceRowActions,
  type OwnerInvoice,
} from "@/features/invoicing/invoicing-table-config";

// =============================================================================
// Constants
// =============================================================================

const EMPTY_FILTERS: Record<string, FilterValue> = {
  status: undefined,
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

  // Active tab from URL (owner | subcontractor | billing-periods)
  const activeTab = searchParams.get("tab") ?? "owner";

  // Initial filter state from URL
  const initialFilters: FilterState = {
    status: searchParams.get("status") ?? undefined,
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
    const nextStatus = searchParams.get("status") ?? "";
    tableState.setActiveFilters((prev) => {
      const normalized = nextStatus || undefined;
      if (prev.status === normalized) return prev;
      return { status: normalized };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as FilterState;

  // ─── Data ──────────────────────────────────────────────────────────────────

  const statusFilter =
    searchParams.get("status") ||
    (typeof activeFilters.status === "string" ? activeFilters.status : undefined);

  const { data: rawInvoices = [], isLoading, isFetching, error } = useOwnerInvoicesList(
    projectId,
    { status: statusFilter },
  );

  const resolvedError =
    error instanceof Error ? error : error ? new Error("Failed to load invoices") : undefined;

  const deleteInvoice = useDeleteOwnerInvoice(projectId);

  // ─── Client-side filtering / sorting ───────────────────────────────────────

  const invoices = React.useMemo(() => {
    let items = rawInvoices;

    // Search filter (client-side)
    const search = tableState.debouncedSearch.toLowerCase().trim();
    if (search) {
      items = items.filter((inv) => {
        const num = inv.invoice_number?.toLowerCase() ?? "";
        const id = `inv-${inv.id}`;
        return num.includes(search) || id.includes(search);
      });
    }

    // Status filter (client-side supplemental — API already filters, but be safe)
    if (statusFilter) {
      items = items.filter((inv) => inv.status === statusFilter);
    }

    return items;
  }, [rawInvoices, tableState.debouncedSearch, statusFilter]);

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
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      page: "1",
    });
    tableState.setPage(1);
  }

  function handleTabChange(tab: string) {
    if (tab === "subcontractor" || tab === "billing-periods") {
      toast.info(`${tab === "subcontractor" ? "Subcontractor invoices" : "Billing periods"} coming soon`);
      return;
    }
    tableState.setSearchParams({ tab: null });
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const isFiltered =
    Boolean(tableState.searchInput) || Boolean(activeFilters.status);

  const totalItems = sortedInvoices.length;

  // ─── KPI Metrics ─────────────────────────────────────────────────────────

  const kpiMetrics = React.useMemo(() => {
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

    const totalInvoiced = rawInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    const pending = rawInvoices
      .filter((inv) => inv.status === "draft" || inv.status === "submitted")
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
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
          <ChevronDown className="h-4 w-4 ml-2" />
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

  // ─── Render ────────────────────────────────────────────────────────────────

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
          filters: invoiceFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: invoiceColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
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
              <Plus className="h-4 w-4 mr-2" />
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
