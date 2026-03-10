"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Settings } from "lucide-react";
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
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

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
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    if (tableState.currentView !== "table") return;

    tableState.setCurrentView("list");
    tableState.setSearchParams({ view: "list" });
  }, [tableState.currentView, tableState.setCurrentView, tableState.setSearchParams]);

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
    router.push(`/${projectId}/prime-contracts/${item.id}?edit=1`);
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

  const handleBulkDeleteConfirm = async () => {
    const ids = tableState.selectedIds;
    if (ids.length === 0) return;

    setIsBulkDeleting(true);
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${id}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const contract = contracts.find((c) => c.id === id);
          errors.push(
            `${contract?.contract_number ?? id}: ${data.error || "Failed to delete"}`,
          );
        }
      } catch {
        errors.push(`${id}: Network error`);
      }
    }

    const deletedIds = ids.filter(
      (id) => !errors.some((err) => err.startsWith(id)),
    );
    setContracts((prev) => prev.filter((item) => !deletedIds.includes(item.id)));
    tableState.setSelectedIds([]);

    if (errors.length > 0) {
      toast.error(
        `${deletedIds.length} deleted, ${errors.length} failed:\n${errors.join("\n")}`,
      );
    } else {
      toast.success(`${deletedIds.length} contract${deletedIds.length === 1 ? "" : "s"} deleted`);
    }

    setIsBulkDeleting(false);
    setBulkDeleteDialogOpen(false);
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

  const tabs = [
    {
      label: "All Contracts",
      href: `/${projectId}/prime-contracts`,
      isActive: !statusFilter,
    },
    {
      label: "Approved",
      href: `/${projectId}/prime-contracts?status=approved`,
      isActive: statusFilter === "approved",
    },
    {
      label: "Complete",
      href: `/${projectId}/prime-contracts?status=complete`,
      isActive: statusFilter === "complete",
    },
  ];

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Prime Contracts",
          actions: (
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 border-input bg-background text-foreground hover:bg-muted hover:text-foreground"
                onClick={() => router.push(`/${projectId}/prime-contracts/configure`)}
                aria-label="Configure prime contracts"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/${projectId}/prime-contracts/new`)}
                aria-label="Create new contract"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create
              </Button>
            </div>
          ),
        }}
        tabs={tabs}
        layout={{
          fullBleedTable: false,
        }}
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
          onBulkDelete: tableState.selectedIds.length > 0
            ? () => setBulkDeleteDialogOpen(true)
            : undefined,
          mobilePanelActions: (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => router.push(`/${projectId}/prime-contracts/configure`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Button>
          ),
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {tableState.selectedIds.length} Contract{tableState.selectedIds.length === 1 ? "" : "s"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{tableState.selectedIds.length}</strong> selected contract
              {tableState.selectedIds.length === 1 ? "" : "s"}?
              <br />
              <br />
              This action cannot be undone. Contracts with associated line items or
              change orders will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? "Deleting..." : `Delete ${tableState.selectedIds.length} Contract${tableState.selectedIds.length === 1 ? "" : "s"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
