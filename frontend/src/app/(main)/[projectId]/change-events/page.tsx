"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiFetch, summarizeBulkResults } from "@/lib/api-client";
import { useConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChangeEventExpandedRow } from "@/components/domain/change-events/ChangeEventExpandedRow";
import { ChangeEventSelectionBar } from "@/components/domain/change-events/ChangeEventSelectionBar";
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
  formatMoney,
  renderChangeEventCard,
  renderChangeEventList,
  renderChangeEventRowActions,
} from "@/features/change-events/change-events-table-config";
import { ChangeEventRfqForm } from "@/components/domain/change-events/ChangeEventRfqForm";
import type { ChangeEventRfqFormValues } from "@/components/domain/change-events/ChangeEventRfqForm";
import { PageShell } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ds/text";
import { PermissionGate } from "@/components/domain/permissions/PermissionGate";

type ChangeEventFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: ChangeEventFilterState = {
  status: undefined,
  scope: undefined,
  conversion_state: undefined,
  over_under: undefined,
  budget: undefined,
  budget_code_segments: undefined,
};
const CHANGE_EVENTS_VISIBLE_COLUMNS_MIGRATION_KEY =
  "change-events:visibleColumns:migrate-2026-04-17-all-default";

function formatDateValue(dateValue: string | null | undefined): string {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString();
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export default function ProjectChangeEventsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectIdParamRaw = params.projectId;
  const parsedProjectId = projectIdParamRaw ? parseInt(projectIdParamRaw, 10) : NaN;
  const hasValidProjectId = Number.isFinite(parsedProjectId) && parsedProjectId > 0;
  const projectId = hasValidProjectId ? parsedProjectId : 0;

  // Tab state — matches Procore tabs: Line Items, No Line Items, RFQs, Recycle Bin
  const activeTab = searchParams.get("tab") ?? "line_items";

  const initialStatus = searchParams.get("status") ?? "";
  const initialScope = searchParams.get("scope") ?? "";
  const initialConversionState = searchParams.get("conversion_state") ?? "";
  const initialFilters: ChangeEventFilterState = {
    status: initialStatus || undefined,
    scope: initialScope || undefined,
    conversion_state: initialConversionState || undefined,
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
    if (typeof window === "undefined") return;
    if (!tableState.visibleColumns.length) return;

    const hasMigrated = window.localStorage.getItem(
      CHANGE_EVENTS_VISIBLE_COLUMNS_MIGRATION_KEY,
    );
    if (hasMigrated === "1") return;

    tableState.setVisibleColumns(changeEventDefaultVisibleColumns);
    window.localStorage.setItem(
      CHANGE_EVENTS_VISIBLE_COLUMNS_MIGRATION_KEY,
      "1",
    );
  }, [tableState.visibleColumns.length, tableState.setVisibleColumns]);

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const nextScope = searchParams.get("scope") ?? "";
    const nextConversionState = searchParams.get("conversion_state") ?? "";

    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      const normalizedScope = nextScope || undefined;
      const normalizedConversionState = nextConversionState || undefined;
      if (
        prev.status === normalizedStatus &&
        prev.scope === normalizedScope &&
        prev.conversion_state === normalizedConversionState
      ) {
        return prev;
      }
      return {
        status: normalizedStatus,
        scope: normalizedScope,
        conversion_state: normalizedConversionState,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as ChangeEventFilterState;
  const statusParam =
    searchParams.get("status") ??
    (typeof activeFilters.status === "string" ? activeFilters.status : "");

  // Server-side pagination: pass page + perPage + tab to the API.
  // The API handles tab filtering and returns paginated results + tab counts in meta.
  const {
    changeEvents: tabFilteredEvents,
    isLoading,
    error,
    total: serverTotal,
    tabSummary,
    refetch: refetchChangeEvents,
  } = useProjectChangeEvents(projectId, {
    status: statusParam || undefined,
    page: tableState.page,
    perPage: tableState.perPage,
    tab: activeTab as "line_items" | "no_line_items" | "rfqs" | "recycle_bin" | "all",
    enabled: hasValidProjectId,
  });

  // Tab counts come from the API's tabSummary meta field
  const lineItemsCount = tabSummary?.lineItems ?? 0;
  const noLineItemsCount = tabSummary?.noLineItems ?? 0;
  const rfqsCount = tabSummary?.rfqs ?? 0;

  // Row expansion state
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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

  const [showRfqSheet, setShowRfqSheet] = React.useState(false);
  const [isCreatingRfq, setIsCreatingRfq] = React.useState(false);

  const handleView = React.useCallback(
    (item: ChangeEvent) => {
      router.push(`/${projectId}/change-events/${item.id}`);
    },
    [projectId, router],
  );

  const handleEdit = React.useCallback(
    (item: ChangeEvent) => {
      router.push(`/${projectId}/change-events/${item.id}?edit=1`);
    },
    [projectId, router],
  );

  const handleDelete = React.useCallback(
    (item: ChangeEvent) => {
      deleteDialog.confirm(async () => {
        try {
          await apiFetch(`/api/projects/${projectId}/change-events/${item.id}`, {
            method: "DELETE",
          });
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
          selectedIds.map((id) =>
            apiFetch(`/api/projects/${projectId}/change-events/${id}`, {
              method: "DELETE",
            }),
          ),
        );

        const { succeeded, failed, firstError } = summarizeBulkResults(results);

        if (succeeded > 0) {
          toast.success(
            `${succeeded} change event${succeeded === 1 ? "" : "s"} moved to recycle bin`,
          );
        }

        if (failed > 0) {
          toast.error(
            failed === 1
              ? firstError
              : `Failed to delete ${failed} change event${failed === 1 ? "" : "s"}: ${firstError}`,
          );
        }

        tableState.setSelectedIds([]);
        refetchChangeEvents();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to bulk delete change events");
      }
    });
  }, [projectId, refetchChangeEvents, tableState, bulkDeleteDialog]);

  const handleSendRfq = React.useCallback(
    async (values: ChangeEventRfqFormValues) => {
      setIsCreatingRfq(true);
      try {
        const selectedId = tableState.selectedIds[0];
        if (!selectedId) {
          throw new Error("Select a change event before sending an RFQ.");
        }

        const selectedChangeEvent = tabFilteredEvents.find((event) => String(event.id) === selectedId);
        if (!selectedChangeEvent) {
          throw new Error("Selected change event could not be found.");
        }

        const response = await fetch(`/api/projects/${projectId}/change-events/rfqs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeEventId: String(selectedChangeEvent.id),
            title: values.title.trim() || undefined,
            dueDate: values.dueDate || undefined,
            includeAttachments: values.includeAttachments,
            notes: values.requestDetails.trim() || undefined,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const apiMessage =
            payload && typeof payload === "object" && "error" in payload
              ? String(payload.error)
              : "Failed to create RFQ";
          throw new Error(apiMessage);
        }

        const rfqNumber =
          payload &&
          typeof payload === "object" &&
          "data" in payload &&
          payload.data &&
          typeof payload.data === "object" &&
          "rfq_number" in payload.data
            ? String(payload.data.rfq_number)
            : null;

        toast.success(rfqNumber ? `RFQ ${rfqNumber} sent successfully` : "RFQ sent successfully");
        setShowRfqSheet(false);
        tableState.setSelectedIds([]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send RFQ");
      } finally {
        setIsCreatingRfq(false);
      }
    },
    [tabFilteredEvents, projectId, tableState],
  );

  const handleFilterChange = React.useCallback(
    (nextFilters: ChangeEventFilterState) => {
      tableState.setActiveFilters(nextFilters);
      tableState.setSearchParams({
        status: typeof nextFilters.status === "string" ? nextFilters.status : null,
        scope: typeof nextFilters.scope === "string" ? nextFilters.scope : null,
        conversion_state:
          typeof nextFilters.conversion_state === "string"
            ? nextFilters.conversion_state
            : null,
        page: "1",
      });
      tableState.setPage(1);
    },
    [tableState],
  );

  // Apply search filter on top of tab-filtered events
  const filteredEvents = React.useMemo(() => {
    const searchTerm = tableState.debouncedSearch.trim().toLowerCase();
    const scopeFilter =
      typeof activeFilters.scope === "string" ? activeFilters.scope.toLowerCase() : "";
    const conversionStateFilter =
      typeof activeFilters.conversion_state === "string"
        ? activeFilters.conversion_state
        : "";
    const overUnderFilter =
      typeof activeFilters.over_under === "string" ? activeFilters.over_under : "";
    const budgetFilter =
      typeof activeFilters.budget === "string" ? activeFilters.budget.toLowerCase() : "";
    const budgetCodeFilter =
      typeof activeFilters.budget_code_segments === "string"
        ? activeFilters.budget_code_segments.toLowerCase()
        : "";

    return tabFilteredEvents.filter((event) => {
      if (scopeFilter && (event.scope ?? "").toLowerCase() !== scopeFilter) {
        return false;
      }

      if (conversionStateFilter) {
        const sentToPrime = Boolean(event.sent_to_prime_pco);
        const sentToCommitment = Boolean(event.sent_to_commitment_pco);
        const linkedCount = Number(sentToPrime) + Number(sentToCommitment);

        if (conversionStateFilter === "unlinked" && linkedCount !== 0) return false;
        if (conversionStateFilter === "partially_linked" && linkedCount !== 1) return false;
        if (conversionStateFilter === "fully_linked" && linkedCount !== 2) return false;
      }

      if (overUnderFilter) {
        const costRom = Number(event.cost_rom ?? 0);
        const rom = Number(event.rom ?? 0);
        if (overUnderFilter === "over" && costRom <= rom) return false;
        if (overUnderFilter === "under" && costRom >= rom) return false;
      }

      if (budgetFilter) {
        // budget_code text field not yet on ChangeEvent — no-op filter until enriched
        void budgetFilter;
      }

      if (budgetCodeFilter) {
        // budget_code_segments text field not yet on ChangeEvent — no-op filter until enriched
        void budgetCodeFilter;
      }

      if (!searchTerm) {
        return true;
      }

      const eventNumber = event.number ?? `CE-${event.id}`;
      return (
        eventNumber.toLowerCase().includes(searchTerm) ||
        event.title?.toLowerCase().includes(searchTerm) ||
        (event.reason ?? "").toLowerCase().includes(searchTerm)
      );
    });
  }, [
    activeFilters.scope,
    activeFilters.conversion_state,
    activeFilters.over_under,
    activeFilters.budget,
    activeFilters.budget_code_segments,
    tabFilteredEvents,
    tableState.debouncedSearch,
  ]);

  const handleExport = React.useCallback(() => {
    const headers = ["#", "Title", "Status", "Scope", "Type", "Change Reason", "Origin", "Prime PCO", "Cost ROM", "Commitment", "Created"];

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
      const type = event.type ?? "";
      const reason = event.reason ?? "";
      const origin = event.origin ?? "";
      const primePco = String(event.rom ?? 0);
      const costRom = String(event.cost_rom ?? 0);
      const commitment = String(event.commitment ?? 0);
      const createdAt = formatDateValue(event.created_at);

      return [number, title, status, scope, type, reason, origin, primePco, costRom, commitment, createdAt]
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

  const tableColumns = React.useMemo(
    () => buildChangeEventTableColumns(expandedIds, handleToggleExpand),
    [expandedIds, handleToggleExpand],
  );

  // serverTotal is the authoritative count for the active tab from the server.
  // filteredItems reflects any additional client-side filtering on the current page.
  const totalItems = serverTotal;
  const filteredItems = filteredEvents.length;

  // Procore-style tabs: Line Items | No Line Items | RFQs | Recycle Bin
  const tabs = React.useMemo(
    () => [
      {
        label: "Line Items",
        href: `/${projectId}/change-events?tab=line_items`,
        count: lineItemsCount,
        isActive: activeTab === "line_items",
        testId: "change-events-tab-line-items",
        countTestId: "change-events-count-line-items",
      },
      {
        label: "No Line Items",
        href: `/${projectId}/change-events?tab=no_line_items`,
        count: noLineItemsCount,
        isActive: activeTab === "no_line_items",
        testId: "change-events-tab-no-line-items",
        countTestId: "change-events-count-no-line-items",
      },
      {
        label: "RFQs",
        href: `/${projectId}/change-events?tab=rfqs`,
        count: rfqsCount,
        isActive: activeTab === "rfqs",
        testId: "change-events-tab-rfqs",
        countTestId: "change-events-count-rfqs",
      },
      {
        label: "Recycle Bin",
        href: `/${projectId}/change-events?tab=recycle_bin`,
        count: tabSummary?.recycleBin,
        isActive: activeTab === "recycle_bin",
        testId: "change-events-tab-recycle-bin",
      },
    ],
    [projectId, activeTab, lineItemsCount, noLineItemsCount, rfqsCount, tabSummary],
  );

  // Grand Totals — sum monetary columns
  const grandTotals = React.useMemo(() => {
    let revenuePrimePco = 0;
    let costRom = 0;
    let commitmentTotal = 0;

    for (const event of filteredEvents) {
      revenuePrimePco += Number(event.rom ?? 0);
      costRom += Number(event.cost_rom ?? 0);
      commitmentTotal += Number(event.commitment ?? 0);
    }

    return {
      revenue_prime_pco: formatMoney(revenuePrimePco),
      cost_rom: formatMoney(costRom),
      commitment: formatMoney(commitmentTotal),
    };
  }, [filteredEvents]);

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
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.scope) ||
    Boolean(activeFilters.conversion_state) ||
    Boolean(activeFilters.over_under) ||
    Boolean(activeFilters.budget) ||
    Boolean(activeFilters.budget_code_segments);

  // Render expanded row content — fetches line items + markups from API
  const renderExpandedRow = React.useCallback(
    (
      item: ChangeEvent,
      colSpan: number,
      context?: { columns: Array<{ id: string; width?: number }>; hasSelection: boolean; hasActions: boolean },
    ): ReactNode | null => {
      if (!expandedIds.has(String(item.id))) return null;

      return (
        <ChangeEventExpandedRow
          changeEventId={item.id}
          projectId={projectId}
          colSpan={colSpan}
          context={context}
          expectingRevenue={item.expecting_revenue !== false}
          onEditLineItem={(lineItemId) => {
            router.push(`/${projectId}/change-events/${item.id}?edit=1&lineItem=${lineItemId}`);
          }}
        />
      );
    },
    [expandedIds, projectId, router],
  );

  if (!hasValidProjectId) {
    return (
      <PageShell
        variant="table"
        title="Change Events"
        description="Provide a valid project identifier to access change events."
      >
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
      </PageShell>
    );
  }

  const selectedChangeEvents = filteredEvents.filter((e) =>
    tableState.selectedIds.includes(String(e.id)),
  );

  return (
    <>
    <UnifiedTablePage
      header={{
        title: "Change Events",
        description: "Track scope changes, approvals, and financial impact.",
        actions: (
          <PermissionGate projectId={projectId} module="change_orders" level="write">
            <Button
              size="sm"
              onClick={() => router.push(`/${projectId}/change-events/new`)}
              className="gap-2"
              data-testid="change-events-new-button"
            >
              <Plus />
              Create
            </Button>
          </PermissionGate>
        ),
      }}
      tabs={tabs}
      topContent={
        tableState.selectedIds.length > 0 && activeTab !== "recycle_bin" ? (
          <ChangeEventSelectionBar
            selectedCount={tableState.selectedIds.length}
            hasItems={filteredEvents.length > 0}
            onSendRfq={() => setShowRfqSheet(true)}
            selectedChangeEventIds={tableState.selectedIds}
            projectId={projectId}
            onSuccess={() => {
              tableState.setSelectedIds([]);
              refetchChangeEvents();
            }}
          />
        ) : undefined
      }
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
        onBulkDelete: activeTab !== "recycle_bin" ? handleBulkDelete : undefined,
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
        renderExpandedRow,
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
        title: activeTab === "recycle_bin" ? "Recycle bin is empty" : "No change events found",
        description: activeTab === "recycle_bin"
          ? "Deleted change events will appear here."
          : "Create your first change event to start tracking scope changes.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
        action: activeTab !== "recycle_bin" ? (
          <Button size="sm" onClick={() => router.push(`/${projectId}/change-events/new`)}>
            Add change event
          </Button>
        ) : undefined,
      }}
      footerTotals={{
        label: "Grand Totals",
        values: {
          revenue_prime_pco: <span className="tabular-nums">{grandTotals.revenue_prime_pco}</span>,
          cost_rom: <span className="tabular-nums">{grandTotals.cost_rom}</span>,
          commitment: <span className="tabular-nums">{grandTotals.commitment}</span>,
          // Placeholder dashes for non-monetary columns
          status: <span>--</span>,
          scope: <span>--</span>,
          type: <span>--</span>,
          reason: <span>--</span>,
          origin: <span>--</span>,
          prime_pco_title: <span>--</span>,
          rfq_title: <span>--</span>,
          commitment_title: <span>--</span>,
        },
      }}
      columnGroups={[
        { label: "", columnIds: ["number_title"] },
        { label: "Change Event", columnIds: ["status", "scope", "type", "reason", "origin"] },
        { label: "Revenue", columnIds: ["revenue_prime_pco", "prime_pco_title"] },
        { label: "Cost", columnIds: ["cost_rom", "rfq_title", "commitment", "commitment_title"] },
        { label: "", columnIds: ["created_at"] },
      ]}
      pagination={{
        page: tableState.page,
        totalPages: Math.max(1, Math.ceil(serverTotal / tableState.perPage)),
        perPage: tableState.perPage,
        onPageChange: (newPage) => {
          tableState.setPage(newPage);
          tableState.setSearchParams({ page: String(newPage) });
        },
        onPerPageChange: (newPerPage) => {
          tableState.setPerPage(Number(newPerPage));
          tableState.setPage(1);
          tableState.setSearchParams({ perPage: newPerPage, page: "1" });
        },
      }}
      features={{
        enableExport: true,
        enableBulkDelete: activeTab !== "recycle_bin",
        enableColumnPinning: false,
      }}
      layout={{
        fullBleedTable: true,
        removeTableFrame: true,
        plainFooterTotals: true,
      }}
    />
    {deleteDialog.dialog}
    {bulkDeleteDialog.dialog}
    <Sheet open={showRfqSheet} onOpenChange={setShowRfqSheet}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Send Requests for Quote</SheetTitle>
        </SheetHeader>
        <div className="px-8 pb-8">
          {selectedChangeEvents.length > 0 && selectedChangeEvents[0] !== undefined && (
            <ChangeEventRfqForm
              changeEvent={selectedChangeEvents[0]}
              isSubmitting={isCreatingRfq}
              onSubmit={handleSendRfq}
              onCancel={() => setShowRfqSheet(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
