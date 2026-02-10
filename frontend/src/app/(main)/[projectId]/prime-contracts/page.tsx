"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
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
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import {
  buildPrimeContractTableColumns,
  primeContractColumns,
  primeContractDefaultVisibleColumns,
  primeContractFilters,
  renderPrimeContractCard,
  renderPrimeContractList,
  renderPrimeContractRowActions,
} from "@/features/prime-contracts/prime-contracts-table-config";
import {
  primeContractsSchema,
  type PrimeContract,
} from "@/lib/validation/prime-contracts";

const EMPTY_FILTERS: Record<string, FilterValue> = {
  status: undefined,
};

type FilterState = Record<string, FilterValue>;

type ContractStatus = NonNullable<PrimeContract["status"]>;

export default function ProjectContractsPage(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? "";

  useProjectTitle("Prime Contracts");

  const initialStatus = searchParams.get("status") ?? "";
  const initialFilters: FilterState = {
    status: initialStatus || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "prime-contracts",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "contract_number",
      sortDirection: "asc",
      filters: initialFilters,
    },
  });

  const [contracts, setContracts] = React.useState<PrimeContract[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [contractToDelete, setContractToDelete] = React.useState<PrimeContract | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const normalizedStatus = nextStatus || undefined;

    tableState.setActiveFilters((prev) => {
      if (prev.status === normalizedStatus) return prev;
      return { status: normalizedStatus };
    });
  }, [searchParams, tableState.setActiveFilters]);

  React.useEffect(() => {
    if (tableState.visibleColumns.length === 0) {
      tableState.setVisibleColumns(primeContractDefaultVisibleColumns);
    }
  }, [tableState.visibleColumns.length, tableState.setVisibleColumns]);

  React.useEffect(() => {
    const fetchContracts = async () => {
      if (!projectId) return;

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/projects/${projectId}/contracts`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const parsed = primeContractsSchema.safeParse(json);
        if (!parsed.success) {
          throw new Error("Failed to parse contracts response");
        }

        setContracts(parsed.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load contracts";
        setError(err instanceof Error ? err : new Error(message));
        toast.error("Failed to load contracts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, [projectId]);

  const activeFilters = tableState.activeFilters as FilterState;

  const statusFilter = activeFilters.status as ContractStatus | undefined;
  const searchTerm = tableState.debouncedSearch.trim().toLowerCase();

  const filteredContracts = contracts.filter((contract) => {
    if (statusFilter && contract.status !== statusFilter) return false;
    if (!searchTerm) return true;

    const fields = [
      contract.contract_number ?? "",
      contract.title ?? "",
      contract.client?.name ?? "",
    ];

    return fields.some((field) => field.toLowerCase().includes(searchTerm));
  });

  const tableColumns = buildPrimeContractTableColumns();
  const sortedContracts = React.useMemo(() => {
    if (!tableState.sortBy) return filteredContracts;
    const sortColumn = tableColumns.find((column) => column.id === tableState.sortBy);
    const getSortValue = sortColumn?.sortValue;
    if (!getSortValue) return filteredContracts;

    const sorted = [...filteredContracts].sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (valueB == null) return tableState.sortDirection === "asc" ? 1 : -1;

      if (typeof valueA === "number" && typeof valueB === "number") {
        return tableState.sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      const comparison = String(valueA).localeCompare(String(valueB));
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredContracts, tableColumns, tableState.sortBy, tableState.sortDirection]);

  const totalItems = filteredContracts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / tableState.perPage));
  const pageStart = (tableState.page - 1) * tableState.perPage;
  const pageEnd = pageStart + tableState.perPage;
  const pagedContracts = sortedContracts.slice(pageStart, pageEnd);

  React.useEffect(() => {
    if (tableState.page > totalPages) {
      tableState.setPage(1);
      tableState.setSearchParams({ page: "1" });
    }
  }, [tableState.page, tableState.setPage, tableState.setSearchParams, totalPages]);

  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleRowClick = (item: PrimeContract) => {
    router.push(`/${projectId}/prime-contracts/${item.id}`);
  };

  const handleEdit = (item: PrimeContract) => {
    router.push(`/${projectId}/prime-contracts/${item.id}/edit`);
  };

  const handleDeleteIntent = (item: PrimeContract) => {
    setContractToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contractToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractToDelete.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete contract");
        return;
      }

      setContracts((prev) => prev.filter((item) => item.id !== contractToDelete.id));
      toast.success(`Contract "${contractToDelete.title}" deleted successfully`);
    } catch (err) {
      toast.error("Failed to delete contract");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setContractToDelete(null);
    }
  };

  const handleExport = () => {
    if (filteredContracts.length === 0) {
      toast.info("No contracts to export");
      return;
    }

    const tableColumns = buildPrimeContractTableColumns();
    const visibleColumns = tableColumns.filter((column) =>
      tableState.visibleColumns.includes(column.id),
    );

    const headers = visibleColumns.map((column) => column.label);
    const rows = filteredContracts.map((contract) =>
      visibleColumns
        .map((column) =>
          column.csvValue ? column.csvValue(contract) : String(column.render(contract) ?? ""),
        )
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `prime-contracts-${tableState.page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(pagedContracts.map((item) => item.id));
    } else {
      tableState.setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...prev, id]);
    } else {
      tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const isFiltered = Boolean(tableState.searchInput) || Boolean(activeFilters.status);

  const approvedCount = contracts.filter((contract) => contract.status === "approved").length;
  const completeCount = contracts.filter((contract) => contract.status === "complete").length;

  const tabs = [
    {
      label: "All Contracts",
      href: `/${projectId}/prime-contracts`,
      count: contracts.length,
      isActive: !statusFilter,
    },
    {
      label: "Approved",
      href: `/${projectId}/prime-contracts?status=approved`,
      count: approvedCount,
      isActive: statusFilter === "approved",
    },
    {
      label: "Complete",
      href: `/${projectId}/prime-contracts?status=complete`,
      count: completeCount,
      isActive: statusFilter === "complete",
    },
  ];

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Prime Contracts",
          description: "Manage prime contracts and owner agreements",
          actions: (
            <Button size="sm" onClick={() => router.push(`/${projectId}/prime-contracts/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search contracts...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: primeContractFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: primeContractColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExport,
        }}
        data={{
          items: pagedContracts,
          isLoading,
          error: error ?? undefined,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: handleRowClick,
          rowActions: (item) =>
            renderPrimeContractRowActions(item, handleEdit, handleDeleteIntent),
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
        views={{
          card: (item) => renderPrimeContractCard(item, handleRowClick),
          list: (item) => renderPrimeContractList(item, handleRowClick),
        }}
        emptyState={{
          title: "No contracts found",
          description: "You have not added any prime contracts yet.",
          filteredDescription: "Try adjusting your search or filters",
          isFiltered,
          action: (
            <Button size="sm" onClick={() => router.push(`/${projectId}/prime-contracts/new`)}>
              Create your first contract
            </Button>
          ),
        }}
        pagination={{
          page: tableState.page,
          totalPages,
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
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete contract{" "}
              <strong>{contractToDelete?.contract_number}</strong> -{" "}
              <strong>{contractToDelete?.title}</strong>?
              <br />
              <br />
              This action cannot be undone. Any associated line items and change orders
              must be deleted first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Contract"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
