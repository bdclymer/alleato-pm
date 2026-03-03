"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirmationDialog } from "@/components/common/ConfirmationDialog";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import type { ChangeEvent } from "@/hooks/use-change-events";
import { useProjectChangeEvents } from "@/hooks/use-change-events";
import {
  buildChangeEventTableColumns,
  changeEventColumns,
  changeEventDefaultVisibleColumns,
  changeEventFilters,
  renderChangeEventCard,
  renderChangeEventList,
  renderChangeEventRowActions,
} from "@/features/change-events/change-events-table-config";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

type ChangeEventFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: ChangeEventFilterState = {
  status: undefined,
  scope: undefined,
};

const getStatusKey = (status?: string | null): string =>
  status?.toLowerCase().replace(/\s+/g, "_") ?? "unknown";

export default function ProjectChangeEventsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectIdParamRaw = params.projectId;
  const parsedProjectId = projectIdParamRaw ? parseInt(projectIdParamRaw, 10) : NaN;
  const hasValidProjectId = Number.isFinite(parsedProjectId) && parsedProjectId > 0;
  const projectId = hasValidProjectId ? parsedProjectId : 0;

  const initialStatus = searchParams.get("status") ?? "";
  const initialScope = searchParams.get("scope") ?? "";
  const initialFilters: ChangeEventFilterState = {
    status: initialStatus || undefined,
    scope: initialScope || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "change-events",
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
      sortDirection: "asc",
      visibleColumns: changeEventDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const nextScope = searchParams.get("scope") ?? "";

    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      const normalizedScope = nextScope || undefined;
      if (prev.status === normalizedStatus && prev.scope === normalizedScope) {
        return prev;
      }
      return {
        status: normalizedStatus,
        scope: normalizedScope,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as ChangeEventFilterState;
  const statusParam =
    searchParams.get("status") ??
    (typeof activeFilters.status === "string" ? activeFilters.status : "") ??
    "";

  const {
    changeEvents = [],
    isLoading,
    error,
    refetch: refetchChangeEvents,
  } = useProjectChangeEvents(projectId, {
    status: statusParam || undefined,
    limit: 500,
    enabled: hasValidProjectId,
  });

  const deleteDialog = useConfirmationDialog({
    title: "Delete Change Event",
    description: "Move this change event to the recycle bin? You can restore it later manually.",
    confirmLabel: "Delete",
    variant: "destructive",
  });

  const bulkDeleteDialog = useConfirmationDialog({
    title: "Delete Change Events",
    description: "Move the selected change events to the recycle bin? You can restore them later manually.",
    confirmLabel: "Delete All",
    variant: "destructive",
  });

  const handleView = React.useCallback(
    (item: ChangeEvent) => {
      router.push(`/${projectId}/change-events/${item.id}`);
    },
    [projectId, router],
  );

  const handleEdit = React.useCallback(
    (item: ChangeEvent) => {
      router.push(`/${projectId}/change-events/${item.id}/edit`);
    },
    [projectId, router],
  );

  const handleDelete = React.useCallback(
    (item: ChangeEvent) => {
      deleteDialog.confirm(async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/change-events/${item.id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const message = await response.text();
            throw new Error(
              message || "Unable to delete change event. Check permissions and try again.",
            );
          }

          toast.success("Change event moved to recycle bin");
          refetchChangeEvents();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to delete change event");
        }
      });
    },
    [projectId, refetchChangeEvents, deleteDialog],
  );

  const handleBulkDelete = React.useCallback(() => {
    const selectedIds = tableState.selectedIds;
    if (selectedIds.length === 0) {
      toast.info("Select at least one change event to delete.");
      return;
    }

    bulkDeleteDialog.confirm(async () => {
      try {
        const results = await Promise.allSettled(
          selectedIds.map(async (id) => {
            const response = await fetch(`/api/projects/${projectId}/change-events/${id}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              const message = await response.text();
              throw new Error(
                message || `Unable to delete change event ${id}. Check permissions and try again.`,
              );
            }
          }),
        );

        const failedCount = results.filter((result) => result.status === "rejected").length;
        const successCount = results.length - failedCount;

        if (successCount > 0) {
          toast.success(
            `${successCount} change event${successCount === 1 ? "" : "s"} moved to recycle bin`,
          );
        }

        if (failedCount > 0) {
          toast.error(`Failed to delete ${failedCount} change event${failedCount === 1 ? "" : "s"}.`);
        }

        tableState.setSelectedIds([]);
        refetchChangeEvents();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to bulk delete change events");
      }
    });
  }, [projectId, refetchChangeEvents, tableState, bulkDeleteDialog]);

  const handleFilterChange = React.useCallback(
    (nextFilters: ChangeEventFilterState) => {
      tableState.setActiveFilters(nextFilters);
      tableState.setSearchParams({
        status: typeof nextFilters.status === "string" ? nextFilters.status : null,
        scope: typeof nextFilters.scope === "string" ? nextFilters.scope : null,
        page: "1",
      });
      tableState.setPage(1);
    },
    [tableState],
  );

  const filteredEvents = React.useMemo(() => {
    const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
    const scopeFilter =
      typeof activeFilters.scope === "string" ? activeFilters.scope.toLowerCase() : "";

    return changeEvents.filter((event) => {
      if (scopeFilter && (event.scope ?? "").toLowerCase() !== scopeFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const eventNumber = event.number ?? `CE-${event.id}`;
      return (
        eventNumber.toLowerCase().includes(searchTerm) ||
        event.title?.toLowerCase().includes(searchTerm) ||
        (event.reason ?? "").toLowerCase().includes(searchTerm) ||
        (event.notes ?? "").toLowerCase().includes(searchTerm)
      );
    });
  }, [activeFilters.scope, changeEvents, tableState.debouncedSearch]);

  const handleExport = React.useCallback(() => {
    const formatCurrencyValue = (value: number | null | undefined): string => {
      if (value === null || value === undefined) return "";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    };

    const formatDateValue = (dateValue: string | null | undefined): string => {
      if (!dateValue) return "";
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return "";
      return parsed.toLocaleDateString();
    };

    const escapeCsvField = (field: string): string => {
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const headers = ["#", "Title", "Status", "Scope", "Change Reason", "Estimated Impact", "Created", "Notes"];

    const scopeDisplayMap: Record<string, string> = {
      tbd: "TBD",
      in_scope: "In Scope",
      out_of_scope: "Out of Scope",
    };
    const statusDisplayMap: Record<string, string> = {
      pending_approval: "Pending Approval",
      open: "Open",
      approved: "Approved",
      rejected: "Rejected",
      closed: "Closed",
      pending: "Pending",
    };

    const rows = filteredEvents.map((event) => {
      const number = event.number ?? `CE-${event.id}`;
      const title = event.title ?? "";
      const status = statusDisplayMap[(event.status ?? "").toLowerCase()] ?? (event.status ?? "");
      const scope = scopeDisplayMap[(event.scope ?? "").toLowerCase()] ?? (event.scope ?? "");
      const reason = event.reason ?? "";
      const estimatedImpact = formatCurrencyValue(event.estimated_impact);
      const createdAt = formatDateValue(event.created_at);
      const notes = event.notes ?? "";

      return [number, title, status, scope, reason, estimatedImpact, createdAt, notes]
        .map(escapeCsvField)
        .join(",");
    });

    const csvContent = [headers.map(escapeCsvField).join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "change-events-export.csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      `Exported ${filteredEvents.length} change event${filteredEvents.length === 1 ? "" : "s"} to CSV`,
    );
  }, [filteredEvents]);

  const tableColumns = React.useMemo(() => buildChangeEventTableColumns(), []);

  const totalItems = changeEvents.length;
  const filteredItems = filteredEvents.length;

  const totalEstimatedImpact = React.useMemo(
    () =>
      filteredEvents.reduce((sum, event) => sum + (event.estimated_impact ?? 0), 0),
    [filteredEvents],
  );

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    changeEvents.forEach((event) => {
      const key = getStatusKey(event.status);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [changeEvents]);

  const tabs = [
    {
      label: "All Change Events",
      href: `/${projectId}/change-events`,
      count: totalItems,
      isActive: !statusParam,
      testId: "change-events-tab-all",
      countTestId: "change-events-count-all",
    },
    {
      label: "Open",
      href: `/${projectId}/change-events?status=open`,
      count: statusCounts.open ?? 0,
      isActive: statusParam === "open",
      testId: "change-events-tab-open",
      countTestId: "change-events-count-open",
    },
    {
      label: "Pending",
      href: `/${projectId}/change-events?status=pending`,
      count: (statusCounts.pending ?? 0) + (statusCounts.pending_approval ?? 0),
      isActive: statusParam === "pending",
      testId: "change-events-tab-pending",
      countTestId: "change-events-count-pending",
    },
    {
      label: "Approved",
      href: `/${projectId}/change-events?status=approved`,
      count: statusCounts.approved ?? 0,
      isActive: statusParam === "approved",
      testId: "change-events-tab-approved",
      countTestId: "change-events-count-approved",
    },
  ];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(filteredEvents.map((item) => String(item.id)));
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
    Boolean(tableState.searchInput) || Boolean(activeFilters.status) || Boolean(activeFilters.scope);

  if (!hasValidProjectId) {
    return (
      <>
        <ProjectPageHeader
          title="Change Events"
          description="Provide a valid project identifier to access change events."
        />
        <PageContainer>
          <Card>
            <CardHeader>
              <CardTitle>Invalid Project</CardTitle>
              <CardDescription>
                Change events require a numeric project identifier. Navigate through the project
                workspace to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Text tone="muted">Missing or malformed `{params.projectId}` parameter.</Text>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    );
  }

  return (
    <>
    <UnifiedTablePage
      header={{
        title: "Change Events",
        description: "Track scope changes, approvals, and financial impact.",
        actions: (
          <Button
            size="sm"
            onClick={() => router.push(`/${projectId}/change-events/new`)}
            className="gap-2"
            data-testid="change-events-new-button"
          >
            <Plus className="h-4 w-4" />
            New Change Event
          </Button>
        ),
      }}
      tabs={tabs}
      toolbar={{
        totalItems,
        filteredItems,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search change events...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters: changeEventFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: changeEventColumns,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
        onExport: handleExport,
        onBulkDelete: handleBulkDelete,
      }}
      data={{
        items: filteredEvents,
        isLoading,
        isFetching: false,
        error,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => String(item.id),
        onRowClick: handleView,
        rowActions: (item) =>
          renderChangeEventRowActions(item, handleView, handleEdit, handleDelete),
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
        card: (item) => renderChangeEventCard(item, handleView),
        list: (item) => renderChangeEventList(item, handleView),
      }}
      emptyState={{
        title: "No change events found",
        description: "Create your first change event to start tracking scope changes.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
        action: (
          <Button size="sm" onClick={() => router.push(`/${projectId}/change-events/new`)}>
            Add change event
          </Button>
        ),
      }}
      footerTotals={{
        label: "Totals",
        values: {
          estimated_impact: (
            <span className="font-semibold">{formatCurrency(totalEstimatedImpact)}</span>
          ),
        },
      }}
      features={{
        enableExport: true,
        enableBulkDelete: true,
      }}
    />
    {deleteDialog.dialog}
    {bulkDeleteDialog.dialog}
    </>
  );
}
