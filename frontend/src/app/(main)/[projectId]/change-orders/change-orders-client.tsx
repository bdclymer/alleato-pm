"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import {
  buildCommitmentFilters,
  buildCommitmentTableColumns,
  buildPrimeFilters,
  buildPrimeTableColumns,
  commitmentColumns,
  commitmentDefaultVisibleColumns,
  primeColumns,
  primeDefaultVisibleColumns,
  renderCommitmentCard,
  renderCommitmentList,
  renderPrimeCard,
  renderPrimeList,
  renderRowActions,
  type CommitmentCO,
  type PrimeContractCO,
} from "@/features/change-orders/change-orders-table-config";

import { PageActions } from "./page-actions";
import { formatCurrency } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveTab = "prime" | "commitment";

interface ChangeOrdersClientProps {
  projectId: string;
  primeCOs: PrimeContractCO[];
  commitmentCOs: CommitmentCO[];
}

type COFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: COFilterState = { status: undefined };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesStatus(itemStatus: string | null, filter: string): boolean {
  const normalized = (itemStatus ?? "").toLowerCase();
  if (filter === "pending") return normalized === "pending" || normalized === "submitted";
  return normalized === filter;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChangeOrdersClient({
  projectId,
  primeCOs,
  commitmentCOs,
}: ChangeOrdersClientProps): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab: ActiveTab =
    searchParams.get("tab") === "commitment" ? "commitment" : "prime";

  // --- Prime tab state -------------------------------------------------------
  const primeTableState = useUnifiedTableState({
    entityKey: "prime-cos",
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
      visibleColumns: primeDefaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  // --- Commitment tab state --------------------------------------------------
  const commitmentTableState = useUnifiedTableState({
    entityKey: "commitment-cos",
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
      visibleColumns: commitmentDefaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  // Mobile viewport detection
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobileViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Force list view on mobile
  const ts = activeTab === "prime" ? primeTableState : commitmentTableState;
  React.useEffect(() => {
    if (!isMobileViewport || ts.currentView !== "table") return;
    ts.setCurrentView("list");
    ts.setSearchParams({ view: "list" });
  }, [isMobileViewport, ts]);

  // --- Tabs ------------------------------------------------------------------
  const buildTabHref = (tab: ActiveTab): string => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    return `/${projectId}/change-orders?${params.toString()}`;
  };

  const tabs = [
    {
      label: "Prime Contract",
      href: buildTabHref("prime"),
      count: primeCOs.length,
      isActive: activeTab === "prime",
    },
    {
      label: "Commitments",
      href: buildTabHref("commitment"),
      count: commitmentCOs.length,
      isActive: activeTab === "commitment",
    },
  ];

  // --- Table columns (memoized) ----------------------------------------------
  const primeTableColumns = React.useMemo(() => buildPrimeTableColumns(), []);
  const commitmentTableColumns = React.useMemo(() => buildCommitmentTableColumns(), []);
  const primeFilters = React.useMemo(() => buildPrimeFilters(), []);
  const commitmentFilters = React.useMemo(() => buildCommitmentFilters(), []);

  // --- Filtering: Prime ------------------------------------------------------
  const primeActiveFilters = primeTableState.activeFilters as COFilterState;

  const filteredPrime = React.useMemo(() => {
    const statusFilter =
      typeof primeActiveFilters.status === "string"
        ? primeActiveFilters.status.toLowerCase()
        : "";
    const executedFilter =
      typeof primeActiveFilters.executed === "string" ? primeActiveFilters.executed : "";
    const search = primeTableState.debouncedSearch.trim().toLowerCase();

    return primeCOs.filter((co) => {
      if (statusFilter && !matchesStatus(co.status, statusFilter)) return false;
      if (executedFilter === "yes" && !co.executed) return false;
      if (executedFilter === "no" && co.executed) return false;
      if (
        search &&
        !(co.pcco_number ?? "").toLowerCase().includes(search) &&
        !(co.title ?? "").toLowerCase().includes(search)
      )
        return false;
      return true;
    });
  }, [primeCOs, primeActiveFilters, primeTableState.debouncedSearch]);

  // --- Filtering: Commitment -------------------------------------------------
  const commitmentActiveFilters = commitmentTableState.activeFilters as COFilterState;

  const filteredCommitment = React.useMemo(() => {
    const statusFilter =
      typeof commitmentActiveFilters.status === "string"
        ? commitmentActiveFilters.status.toLowerCase()
        : "";
    const search = commitmentTableState.debouncedSearch.trim().toLowerCase();

    return commitmentCOs.filter((co) => {
      if (statusFilter && !matchesStatus(co.status, statusFilter)) return false;
      if (
        search &&
        !(co.change_order_number ?? "").toLowerCase().includes(search) &&
        !(co.description ?? "").toLowerCase().includes(search)
      )
        return false;
      return true;
    });
  }, [commitmentCOs, commitmentActiveFilters, commitmentTableState.debouncedSearch]);

  // --- Totals ----------------------------------------------------------------
  const primeTotalAmount = React.useMemo(
    () => filteredPrime.reduce((sum, co) => sum + (co.total_amount ?? 0), 0),
    [filteredPrime],
  );
  const commitmentTotalAmount = React.useMemo(
    () => filteredCommitment.reduce((sum, co) => sum + (co.amount ?? 0), 0),
    [filteredCommitment],
  );

  // --- Navigation handlers ---------------------------------------------------
  const handleViewPrime = (co: PrimeContractCO) => {
    router.push(`/${projectId}/change-orders/prime/${co.id}`);
  };
  const handleEditPrime = (co: PrimeContractCO) => {
    router.push(`/${projectId}/change-orders/prime/${co.id}?edit=1`);
  };
  const handleDeletePrime = async (co: PrimeContractCO) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/prime-contract-change-orders/${co.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
        return;
      }
      toast.success("Change order deleted");
      router.refresh();
    } catch (err) {
      toast.error("Could not delete change order", { description: err instanceof Error ? err.message : "an unexpected error occurred" });
    }
  };

  const handleViewCommitment = (co: CommitmentCO) => {
    router.push(`/${projectId}/change-orders/commitment/${co.id}`);
  };
  const handleEditCommitment = (co: CommitmentCO) => {
    router.push(`/${projectId}/change-orders/commitment/${co.id}?edit=1`);
  };
  const handleDeleteCommitment = async (co: CommitmentCO) => {
    if (!co.contract_id) {
      toast.error("Missing contract reference");
      return;
    }
    try {
      const res = await fetch(
        `/api/commitments/${co.contract_id}/change-orders/${co.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
        return;
      }
      toast.success("Change order deleted");
      router.refresh();
    } catch (err) {
      toast.error("Could not delete change order", { description: err instanceof Error ? err.message : "an unexpected error occurred" });
    }
  };

  // --- Selection handlers (shared pattern) -----------------------------------
  const handleSelectAll = (
    items: { id: string | number }[],
    tableState: ReturnType<typeof useUnifiedTableState>,
  ) => {
    return (checked: boolean) => {
      if (checked) {
        tableState.setSelectedIds(items.map((item) => String(item.id)));
      } else {
        tableState.setSelectedIds([]);
      }
    };
  };

  const handleSelectRow = (tableState: ReturnType<typeof useUnifiedTableState>) => {
    return (id: string, checked: boolean) => {
      if (checked) {
        tableState.setSelectedIds((prev) => [...prev, id]);
      } else {
        tableState.setSelectedIds((prev) => prev.filter((x) => x !== id));
      }
    };
  };

  // --- Export handlers --------------------------------------------------------
  const handleExportPrime = React.useCallback(() => {
    const headers = ["PCCO #", "Title", "Status", "Amount", "Executed", "Due Date", "Submitted", "Approved", "Created"];
    const rows = filteredPrime.map((co) => [
      co.pcco_number ?? "",
      co.title ?? "",
      co.status ?? "",
      String(co.total_amount ?? 0),
      co.executed ? "Yes" : "No",
      co.due_date ?? "",
      co.submitted_at ?? "",
      co.approved_at ?? "",
      co.created_at ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prime-contract-change-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredPrime.length} prime contract CO${filteredPrime.length === 1 ? "" : "s"}`);
  }, [filteredPrime]);

  const handleExportCommitment = React.useCallback(() => {
    const headers = ["CO #", "Title", "Status", "Amount", "Contract", "Due Date", "Requested", "Approved", "Created"];
    const rows = filteredCommitment.map((co) => [
      co.change_order_number ?? "",
      co.title ?? co.description ?? "",
      co.status ?? "",
      String(co.amount ?? 0),
      co.contract_id ?? "",
      co.due_date ?? "",
      co.requested_date ?? "",
      co.approved_date ?? "",
      co.created_at ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commitment-change-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredCommitment.length} commitment CO${filteredCommitment.length === 1 ? "" : "s"}`);
  }, [filteredCommitment]);

  // --- Filter change handler -------------------------------------------------
  const handleFilterChange = (
    tableState: ReturnType<typeof useUnifiedTableState>,
    nextFilters: COFilterState,
  ) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      executed: typeof nextFilters.executed === "string" ? nextFilters.executed : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  // --- Render ----------------------------------------------------------------

  if (activeTab === "prime") {
    const isPrimeFiltered =
      Boolean(primeTableState.searchInput) || Boolean(primeActiveFilters.status) || Boolean(primeActiveFilters.executed);

    return (
      <UnifiedTablePage
        header={{
          title: "Change Orders",
          description: "Track and manage contract change orders",
          actions: <PageActions projectId={projectId} tab={activeTab} />,
        }}
        tabs={tabs}
        toolbar={{
          totalItems: primeCOs.length,
          filteredItems: filteredPrime.length,
          selectedCount: primeTableState.selectedIds.length,
          searchValue: primeTableState.searchInput,
          onSearchChange: primeTableState.setSearchInput,
          searchPlaceholder: "Search prime contract COs...",
          currentView: isMobileViewport ? "list" : primeTableState.currentView,
          onViewChange: (view) => {
            if (isMobileViewport) return;
            primeTableState.setCurrentView(view);
            primeTableState.setSearchParams({ view });
          },
          enabledViews: ["table", "card", "list"],
          filters: primeFilters,
          activeFilters: primeActiveFilters,
          onFilterChange: (f) => handleFilterChange(primeTableState, f as COFilterState),
          onClearFilters: () => handleFilterChange(primeTableState, EMPTY_FILTERS),
          columns: primeColumns,
          visibleColumns: primeTableState.visibleColumns,
          onColumnVisibilityChange: primeTableState.setVisibleColumns,
          onExport: handleExportPrime,
        }}
        data={{ items: filteredPrime, isLoading: false, isFetching: false }}
        table={{
          columns: primeTableColumns,
          getRowId: (item) => String(item.id),
          onRowClick: handleViewPrime,
          rowActions: (item) =>
            renderRowActions(item, handleViewPrime, handleEditPrime, handleDeletePrime),
        }}
        sorting={{
          sortBy: primeTableState.sortBy,
          sortDirection: primeTableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            primeTableState.setSortBy(sortBy);
            primeTableState.setSortDirection(direction);
            primeTableState.setSearchParams({ sort: sortBy, sort_dir: direction });
          },
        }}
        selection={{
          selectedIds: primeTableState.selectedIds,
          onSelectAll: handleSelectAll(filteredPrime, primeTableState),
          onSelectRow: handleSelectRow(primeTableState),
        }}
        views={{
          card: (item) => renderPrimeCard(item, handleViewPrime),
          list: (item) => renderPrimeList(item, handleViewPrime),
        }}
        footerTotals={{
          label: "Totals",
          values: {
            amount: <span className="font-semibold">{formatCurrency(primeTotalAmount)}</span>,
          },
        }}
        emptyState={{
          title: "No prime contract change orders",
          description: "No prime contract change orders found for this project.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered: isPrimeFiltered,
        }}
        features={{ enableExport: true, enableBulkDelete: false }}
      />
    );
  }

  // Commitment tab
  const isCommitmentFiltered =
    Boolean(commitmentTableState.searchInput) || Boolean(commitmentActiveFilters.status);

  return (
    <UnifiedTablePage
      header={{
        title: "Change Orders",
        description: "Track and manage contract change orders",
        actions: <PageActions projectId={projectId} tab={activeTab} />,
      }}
      tabs={tabs}
      toolbar={{
        totalItems: commitmentCOs.length,
        filteredItems: filteredCommitment.length,
        selectedCount: commitmentTableState.selectedIds.length,
        searchValue: commitmentTableState.searchInput,
        onSearchChange: commitmentTableState.setSearchInput,
        searchPlaceholder: "Search commitment COs...",
        currentView: isMobileViewport ? "list" : commitmentTableState.currentView,
        onViewChange: (view) => {
          if (isMobileViewport) return;
          commitmentTableState.setCurrentView(view);
          commitmentTableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters: commitmentFilters,
        activeFilters: commitmentActiveFilters,
        onFilterChange: (f) =>
          handleFilterChange(commitmentTableState, f as COFilterState),
        onClearFilters: () => handleFilterChange(commitmentTableState, EMPTY_FILTERS),
        columns: commitmentColumns,
        visibleColumns: commitmentTableState.visibleColumns,
        onColumnVisibilityChange: commitmentTableState.setVisibleColumns,
        onExport: handleExportCommitment,
      }}
      data={{ items: filteredCommitment, isLoading: false, isFetching: false }}
      table={{
        columns: commitmentTableColumns,
        getRowId: (item) => String(item.id),
        onRowClick: handleViewCommitment,
        rowActions: (item) =>
          renderRowActions(
            item,
            handleViewCommitment,
            handleEditCommitment,
            handleDeleteCommitment,
          ),
      }}
      sorting={{
        sortBy: commitmentTableState.sortBy,
        sortDirection: commitmentTableState.sortDirection,
        onSortChange: (sortBy, direction) => {
          commitmentTableState.setSortBy(sortBy);
          commitmentTableState.setSortDirection(direction);
          commitmentTableState.setSearchParams({ sort: sortBy, sort_dir: direction });
        },
      }}
      selection={{
        selectedIds: commitmentTableState.selectedIds,
        onSelectAll: handleSelectAll(filteredCommitment, commitmentTableState),
        onSelectRow: handleSelectRow(commitmentTableState),
      }}
      views={{
        card: (item) => renderCommitmentCard(item, handleViewCommitment),
        list: (item) => renderCommitmentList(item, handleViewCommitment),
      }}
      footerTotals={{
        label: "Totals",
        values: {
          amount: (
            <span className="font-semibold">{formatCurrency(commitmentTotalAmount)}</span>
          ),
        },
      }}
      emptyState={{
        title: "No commitment change orders",
        description: "No commitment change orders found for this project.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered: isCommitmentFiltered,
      }}
      features={{ enableExport: true, enableBulkDelete: false }}
    />
  );
}
