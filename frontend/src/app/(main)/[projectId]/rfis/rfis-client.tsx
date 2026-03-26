"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useDeleteRfi } from "@/hooks/use-rfis";
import type { RFI } from "@/types/database-extensions";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { Button } from "@/components/ui/button";
import {
  buildRfiTableColumns,
  rfiColumns,
  rfiDefaultVisibleColumns,
  rfiFilters,
  renderRfiCard,
  renderRfiList,
  renderRfiRowActions,
} from "@/features/rfis/rfis-table-config";

interface RfisClientProps {
  rfis: RFI[];
  projectId: number;
}

type RfiFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: RfiFilterState = {
  status: undefined,
};

export function RfisClient({ rfis, projectId }: RfisClientProps): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get("status") ?? "";
  const initialFilters: RfiFilterState = {
    status: initialStatus || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "rfis",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "number",
      sortDirection: "desc",
      visibleColumns: rfiDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      if (prev.status === normalizedStatus) {
        return prev;
      }
      return {
        status: normalizedStatus,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const [items, setItems] = React.useState<RFI[]>(rfis);
  React.useEffect(() => {
    setItems(rfis);
  }, [rfis]);

  const deleteRfi = useDeleteRfi(projectId);
  const activeFilters = tableState.activeFilters as RfiFilterState;

  const filteredItems = React.useMemo(() => {
    const statusFilter =
      typeof activeFilters.status === "string" ? activeFilters.status.toLowerCase() : "";
    const search = tableState.debouncedSearch.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter && (item.status ?? "").toLowerCase() !== statusFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        String(item.number ?? "").toLowerCase().includes(search) ||
        (item.subject ?? "").toLowerCase().includes(search) ||
        (item.rfi_manager ?? "").toLowerCase().includes(search) ||
        (item.ball_in_court ?? "").toLowerCase().includes(search)
      );
    });
  }, [activeFilters.status, items, tableState.debouncedSearch]);

  const tableColumns = React.useMemo(() => buildRfiTableColumns(), []);

  const handleFilterChange = (nextFilters: RfiFilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleView = (item: RFI) => {
    router.push(`/${projectId}/rfis/${item.id}`);
  };

  const handleEdit = (item: RFI) => {
    router.push(`/${projectId}/rfis/${item.id}`);
  };

  const handleDelete = async (item: RFI) => {
    try {
      await deleteRfi.mutateAsync(String(item.id));
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      toast.success("RFI deleted");
    } catch {
      toast.error("Failed to delete RFI");
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

  const isFiltered = Boolean(tableState.searchInput) || Boolean(activeFilters.status);

  return (
    <UnifiedTablePage
      header={{
        title: "RFIs",
        description: "Requests for Information",
        actions: (
          <Button
            size="sm"
            onClick={() => router.push(`/${projectId}/rfis/new`)}
            data-testid="rfis-create-button"
          >
            <Plus />
            Create RFI
          </Button>
        ),
      }}
      toolbar={{
        totalItems: items.length,
        filteredItems: filteredItems.length,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search RFIs...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters: rfiFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: rfiColumns,
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
        rowActions: (item) => renderRfiRowActions(item, handleView, handleEdit, handleDelete),
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
        card: (item) => renderRfiCard(item, handleView),
        list: (item) => renderRfiList(item, handleView),
      }}
      emptyState={{
        title: "No RFIs found",
        description: "You have not added any RFIs yet.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
        action: (
          <Button size="sm" onClick={() => router.push(`/${projectId}/rfis/new`)}>
            Create your first RFI
          </Button>
        ),
      }}
      features={{
        enableExport: false,
        enableBulkDelete: false,
      }}
    />
  );
}
