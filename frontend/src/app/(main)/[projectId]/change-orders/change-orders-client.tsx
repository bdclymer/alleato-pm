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
  buildChangeOrderFilters,
  buildChangeOrderTableColumns,
  changeOrderColumns,
  changeOrderDefaultVisibleColumns,
  renderChangeOrderCard,
  renderChangeOrderList,
  renderChangeOrderRowActions,
  type UnifiedChangeOrder,
} from "@/features/change-orders/change-orders-table-config";

import { PageActions } from "./page-actions";

interface ChangeOrdersClientProps {
  projectId: string;
  changeOrders: UnifiedChangeOrder[];
}

type ChangeOrderFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: ChangeOrderFilterState = {
  status: undefined,
  contractType: undefined,
  reviewer: undefined,
};

function matchesStatusFilter(order: UnifiedChangeOrder, status: string): boolean {
  const normalized = (order.normalizedStatus ?? "").toLowerCase();

  if (status === "pending") {
    return normalized === "pending" || normalized === "submitted";
  }
  if (status === "approved") {
    return normalized === "approved";
  }
  return normalized === status;
}

export function ChangeOrdersClient({
  projectId,
  changeOrders,
}: ChangeOrdersClientProps): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get("status") ?? "";
  const initialContractType = searchParams.get("contractType") ?? "";
  const initialReviewer = searchParams.get("reviewer") ?? "";
  const initialFilters: ChangeOrderFilterState = {
    status: initialStatus || undefined,
    contractType: initialContractType || undefined,
    reviewer: initialReviewer || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "change-orders",
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
      visibleColumns: changeOrderDefaultVisibleColumns,
      filters: initialFilters,
    },
  });
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const applyViewport = () => setIsMobileViewport(mediaQuery.matches);
    applyViewport();
    mediaQuery.addEventListener("change", applyViewport);
    return () => mediaQuery.removeEventListener("change", applyViewport);
  }, []);

  React.useEffect(() => {
    if (!isMobileViewport) return;
    if (tableState.currentView !== "table") return;
    tableState.setCurrentView("list");
    tableState.setSearchParams({ view: "list" });
  }, [
    isMobileViewport,
    tableState.currentView,
    tableState.setCurrentView,
    tableState.setSearchParams,
  ]);

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const nextContractType = searchParams.get("contractType") ?? "";
    const nextReviewer = searchParams.get("reviewer") ?? "";

    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      const normalizedContractType = nextContractType || undefined;
      const normalizedReviewer = nextReviewer || undefined;

      if (
        prev.status === normalizedStatus &&
        prev.contractType === normalizedContractType &&
        prev.reviewer === normalizedReviewer
      ) {
        return prev;
      }

      return {
        status: normalizedStatus,
        contractType: normalizedContractType,
        reviewer: normalizedReviewer,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as ChangeOrderFilterState;

  const reviewerOptions = React.useMemo(() => {
    const reviewers = changeOrders
      .filter((order) => order.contractType === "general")
      .map((order) =>
        order.contractType === "general" ? order.designated_reviewer_id : null,
      )
      .filter((reviewer): reviewer is string => Boolean(reviewer));

    return Array.from(new Set(reviewers)).map((reviewer) => ({
      value: reviewer,
      label: reviewer,
    }));
  }, [changeOrders]);

  const filters = React.useMemo(
    () => buildChangeOrderFilters(reviewerOptions),
    [reviewerOptions],
  );

  const filteredItems = React.useMemo(() => {
    const statusFilter =
      typeof activeFilters.status === "string" ? activeFilters.status.toLowerCase() : "";
    const contractTypeFilter =
      typeof activeFilters.contractType === "string"
        ? activeFilters.contractType.toLowerCase()
        : "";
    const reviewerFilter =
      typeof activeFilters.reviewer === "string" ? activeFilters.reviewer : "";
    const searchValue = tableState.debouncedSearch.trim().toLowerCase();

    return changeOrders.filter((order) => {
      if (contractTypeFilter && order.contractType !== contractTypeFilter) {
        return false;
      }

      if (statusFilter && !matchesStatusFilter(order, statusFilter)) {
        return false;
      }

      if (reviewerFilter) {
        const orderReviewer =
          order.contractType === "general" ? order.designated_reviewer_id : null;
        if (orderReviewer !== reviewerFilter) {
          return false;
        }
      }

      if (!searchValue) {
        return true;
      }

      return (
        (order.normalizedNumber ?? "").toLowerCase().includes(searchValue) ||
        (order.normalizedTitle ?? "").toLowerCase().includes(searchValue) ||
        (order.normalizedDescription ?? "").toLowerCase().includes(searchValue)
      );
    });
  }, [
    activeFilters.contractType,
    activeFilters.reviewer,
    activeFilters.status,
    changeOrders,
    tableState.debouncedSearch,
  ]);

  const statusCounts = React.useMemo(() => {
    const contractTypeFilter =
      typeof activeFilters.contractType === "string"
        ? activeFilters.contractType.toLowerCase()
        : "";
    const dataset = contractTypeFilter
      ? changeOrders.filter((order) => order.contractType === contractTypeFilter)
      : changeOrders;

    return dataset.reduce(
      (acc, order) => {
        const status = (order.normalizedStatus ?? "").toLowerCase();

        if (status === "draft") acc.draft += 1;
        if (status === "pending" || status === "submitted") acc.pending += 1;
        if (status === "approved") acc.approved += 1;
        if (status === "rejected") acc.rejected += 1;
        if (status === "executed") acc.executed += 1;

        acc.total += 1;
        return acc;
      },
      {
        total: 0,
        draft: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        executed: 0,
      },
    );
  }, [activeFilters.contractType, changeOrders]);

  const currentStatusParam = searchParams.get("status") ?? "";
  const currentContractTypeParam =
    searchParams.get("contractType") ??
    (typeof activeFilters.contractType === "string" ? activeFilters.contractType : "");

  const buildStatusHref = (status?: string): string => {
    const params = new URLSearchParams();

    if (status) {
      params.set("status", status);
    }
    if (currentContractTypeParam) {
      params.set("contractType", currentContractTypeParam);
    }

    const query = params.toString();
    return query ? `/${projectId}/change-orders?${query}` : `/${projectId}/change-orders`;
  };

  const tabs = [
    {
      label: "All",
      href: buildStatusHref(),
      count: statusCounts.total,
      isActive: !currentStatusParam,
    },
    {
      label: "Draft",
      href: buildStatusHref("draft"),
      count: statusCounts.draft,
      isActive: currentStatusParam === "draft",
    },
    {
      label: "Pending",
      href: buildStatusHref("pending"),
      count: statusCounts.pending,
      isActive: currentStatusParam === "pending",
    },
    {
      label: "Approved",
      href: buildStatusHref("approved"),
      count: statusCounts.approved,
      isActive: currentStatusParam === "approved",
    },
    {
      label: "Rejected",
      href: buildStatusHref("rejected"),
      count: statusCounts.rejected,
      isActive: currentStatusParam === "rejected",
    },
    {
      label: "Executed",
      href: buildStatusHref("executed"),
      count: statusCounts.executed,
      isActive: currentStatusParam === "executed",
    },
  ];

  const tableColumns = React.useMemo(() => buildChangeOrderTableColumns(), []);

  const totalAmount = React.useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.normalizedAmount ?? 0), 0),
    [filteredItems],
  );

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const handleFilterChange = (nextFilters: ChangeOrderFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      contractType:
        typeof nextFilters.contractType === "string" ? nextFilters.contractType : null,
      reviewer: typeof nextFilters.reviewer === "string" ? nextFilters.reviewer : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleView = (order: UnifiedChangeOrder) => {
    router.push(`/${projectId}/change-orders/${order.id}`);
  };

  const handleEdit = (order: UnifiedChangeOrder) => {
    router.push(`/${projectId}/change-orders/${order.id}?edit=1`);
  };

  const handleDelete = async (order: UnifiedChangeOrder) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/change-orders/${order.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete change order");
        return;
      }

      toast.success("Change order deleted");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(message);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(filteredItems.map((item) => String(item.id)));
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

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.contractType) ||
    Boolean(activeFilters.reviewer);

  return (
    <UnifiedTablePage
      header={{
        title: "Change Orders",
        description: "Track and manage contract change orders",
        actions: <PageActions projectId={projectId} />,
      }}
      tabs={tabs}
      toolbar={{
        totalItems: changeOrders.length,
        filteredItems: filteredItems.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search change orders...",
        currentView: isMobileViewport ? "list" : tableState.currentView,
        onViewChange: (view) => {
          if (isMobileViewport) {
            tableState.setCurrentView("list");
            tableState.setSearchParams({ view: "list" });
            return;
          }

          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: changeOrderColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
      }}
      data={{
        items: filteredItems,
        isLoading: false,
        isFetching: false,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => String(item.id),
        onRowClick: handleView,
        rowActions: (item) =>
          renderChangeOrderRowActions(item, handleView, handleEdit, handleDelete),
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
          });
        },
      }}
      selection={{
        selectedIds: tableState.selectedIds,
        onSelectAll: handleSelectAll,
        onSelectRow: handleSelectRow,
      }}
      views={{
        card: (item) => renderChangeOrderCard(item, handleView),
        list: (item) => renderChangeOrderList(item, handleView),
      }}
      footerTotals={{
        label: "Totals",
        values: {
          amount: <span className="font-semibold">{formatCurrency(totalAmount)}</span>,
        },
      }}
      emptyState={{
        title: "No change orders found",
        description: "No change orders are available for this project yet.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
      }}
      features={{
        enableExport: false,
        enableBulkDelete: false,
      }}
    />
  );
}
