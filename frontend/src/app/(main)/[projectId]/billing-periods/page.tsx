"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";

import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
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
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type TableColumn,
} from "@/components/tables/unified";
import { PageTabs } from "@/components/layout/PageTabs";
import {
  useBillingPeriodsList,
  useCreateBillingPeriod,
  useDeleteBillingPeriod,
  type BillingPeriod,
} from "@/hooks/use-billing-periods";
import { formatDate } from "@/lib/format";

// =============================================================================
// Column Configs
// =============================================================================

const columnConfigs = [
  { id: "name", label: "Period Name", alwaysVisible: true },
  { id: "start_date", label: "Start Date", defaultVisible: true },
  { id: "end_date", label: "End Date", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
];

const defaultVisibleColumns = columnConfigs
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

// =============================================================================
// Page Component
// =============================================================================

export default function ProjectBillingPeriodsPage(): ReactElement {
  const params = useParams<{ projectId: string }>()! ?? { projectId: "" };
  const pathname = usePathname()!;
  const router = useRouter();
  const searchParams = (useSearchParams() ?? new URLSearchParams()) as NonNullable<ReturnType<typeof useSearchParams>>;
  const projectId = params.projectId ?? "";

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [periodToDelete, setPeriodToDelete] = React.useState<BillingPeriod | null>(null);

  // ─── Create Dialog State ───────────────────────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [bpMode, setBpMode] = React.useState<"manual" | "automatic">("manual");
  const [bpFormStartDate, setBpFormStartDate] = React.useState("");
  const [bpFormEndDate, setBpFormEndDate] = React.useState("");
  const [bpFormBillingDate, setBpFormBillingDate] = React.useState("");
  const [bpAutoFrequency, setBpAutoFrequency] = React.useState<"monthly" | "semi_monthly" | "weekly">("monthly");
  const [bpAutoBasis, setBpAutoBasis] = React.useState<"by_date">("by_date");
  const [bpAutoStartDay, setBpAutoStartDay] = React.useState("1");
  const [bpAutoStartMonth, setBpAutoStartMonth] = React.useState<"previous" | "this" | "next">("this");
  const [bpAutoEndDay, setBpAutoEndDay] = React.useState("30");
  const [bpAutoEndMonth, setBpAutoEndMonth] = React.useState<"previous" | "this" | "next">("this");
  const [bpAutoDueDay, setBpAutoDueDay] = React.useState("24");
  const [bpAutoDueMonth, setBpAutoDueMonth] = React.useState<"previous" | "this" | "next">("next");

  // ─── Table State ───────────────────────────────────────────────────────────

  const tableState = useUnifiedTableState({
    entityKey: "billing-periods",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "start_date",
      sortDirection: "desc",
      visibleColumns: defaultVisibleColumns,
      filters: {},
    },
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createBpMutation = useCreateBillingPeriod(projectId);
  const deleteBpMutation = useDeleteBillingPeriod(projectId);

  // ─── Data ──────────────────────────────────────────────────────────────────

  const { data: rawPeriods = [], isLoading, isFetching, error } = useBillingPeriodsList(projectId);

  const resolvedError =
    error instanceof Error ? error : error ? new Error("Failed to load billing periods") : undefined;

  // ─── Client-side search ────────────────────────────────────────────────────

  const periods = React.useMemo(() => {
    let items = rawPeriods;
    const search = tableState.debouncedSearch.toLowerCase().trim();
    if (search) {
      items = items.filter((p) => (p.name ?? p.start_date).toLowerCase().includes(search));
    }
    return items;
  }, [rawPeriods, tableState.debouncedSearch]);

  // ─── Table Columns ─────────────────────────────────────────────────────────

  const tableColumns: TableColumn<BillingPeriod>[] = React.useMemo(
    () => [
      {
        id: "name",
        label: "Period Name",
        alwaysVisible: true,
        render: (period) => (
          <span className="font-medium">{period.name}</span>
        ),
        sortable: true,
        sortValue: (period) => period.name,
      },
      {
        id: "start_date",
        label: "Start Date",
        defaultVisible: true,
        render: (period) => (
          <span className="text-sm">{formatDate(period.start_date)}</span>
        ),
        sortable: true,
        sortValue: (period) => period.start_date ?? "",
      },
      {
        id: "end_date",
        label: "End Date",
        defaultVisible: true,
        render: (period) => (
          <span className="text-sm">{formatDate(period.end_date)}</span>
        ),
        sortable: true,
        sortValue: (period) => period.end_date ?? "",
      },
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        render: (period) => (
          <span
            className={
              period.is_closed
                ? "text-xs font-medium text-muted-foreground"
                : "text-xs font-medium text-primary"
            }
          >
            {period.is_closed ? "Closed" : "Open"}
          </span>
        ),
        sortable: true,
        sortValue: (period) => (period.is_closed ? 1 : 0),
      },
    ],
    [],
  );

  // Sort
  const sortedPeriods = React.useMemo(() => {
    if (!tableState.sortBy) return periods;
    const col = tableColumns.find((c) => c.id === tableState.sortBy);
    const getSortValue = col?.sortValue;
    if (!getSortValue) return periods;
    return [...periods].sort((a, b) => {
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
  }, [periods, tableColumns, tableState.sortBy, tableState.sortDirection]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleDeleteIntent(period: BillingPeriod) {
    setPeriodToDelete(period);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!periodToDelete) return;
    const id = String(periodToDelete.id);
    setDeleteDialogOpen(false);
    setPeriodToDelete(null);
    await deleteBpMutation.mutateAsync(id).catch(() => {
      // Error toast is handled by useDeleteBillingPeriod's onError with the real server message
    });
  }

  // ─── Row Actions ───────────────────────────────────────────────────────────

  function renderRowActions(period: BillingPeriod): ReactElement {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!period.is_closed && (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/${projectId}/invoices/new?tab=owner&billing_period_id=${period.id}`)
              }
            >
              Create Invoice
            </DropdownMenuItem>
          )}
          {!period.is_closed && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => handleDeleteIntent(period)}
            >
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const isFiltered = Boolean(tableState.searchInput);
  const totalItems = sortedPeriods.length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Billing Periods",
          description: "Manage project invoice billing periods",
          actions: (
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus />
              New Billing Period
            </Button>
          ),
        }}
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search billing periods...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: [],
          activeFilters: tableState.activeFilters,
          onFilterChange: tableState.setActiveFilters,
          onClearFilters: () => tableState.setActiveFilters({}),
          columns: columnConfigs,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
        }}
        data={{
          items: sortedPeriods,
          isLoading,
          isFetching,
          error: resolvedError,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => String(item.id),
          rowActions: renderRowActions,
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
            tableState.setSelectedIds(
              checked ? sortedPeriods.map((p) => String(p.id)) : [],
            );
          },
          onSelectRow: (id, checked) => {
            tableState.setSelectedIds((prev) =>
              checked ? [...prev, String(id)] : prev.filter((x) => x !== String(id)),
            );
          },
        }}
        emptyState={{
          title: "No billing periods",
          description: "Create a billing period to group invoices by date range.",
          filteredDescription: "Try adjusting your search.",
          isFiltered,
          action: (
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus />
              New Billing Period
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
            <AlertDialogTitle>Delete Billing Period</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{periodToDelete?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Create Billing Period Dialog ─────────────────────────────────── */}
      <Modal open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <ModalContent size="md">
          <ModalHeader>
            <ModalTitle>Set Up Billing Period</ModalTitle>
            <ModalDescription>
              Add a billing period manually, or generate a recurring schedule
              automatically.
            </ModalDescription>
          </ModalHeader>

          <PageTabs
            variant="inline"
            onTabClick={(href) => setBpMode(href as "manual" | "automatic")}
            tabs={[
              { label: "Manual", href: "manual", isActive: bpMode === "manual" },
              { label: "Automatic", href: "automatic", isActive: bpMode === "automatic" },
            ]}
          />

          {bpMode === "manual" ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bp-start">From</Label>
                  <Input
                    id="bp-start"
                    type="date"
                    value={bpFormStartDate}
                    onChange={(e) => setBpFormStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-end">To</Label>
                  <Input
                    id="bp-end"
                    type="date"
                    value={bpFormEndDate}
                    onChange={(e) => setBpFormEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-billing">Due Date</Label>
                <Input
                  id="bp-billing"
                  type="date"
                  value={bpFormBillingDate}
                  onChange={(e) => setBpFormBillingDate(e.target.value)}
                />
              </div>
            </div>
          ) : (
            (() => {
              const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
              const ordinal = (n: number) => {
                const s = ["th", "st", "nd", "rd"];
                const v = n % 100;
                return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
              };
              const monthOptions = [
                { value: "previous", label: "previous month" },
                { value: "this", label: "this month" },
                { value: "next", label: "next month" },
              ] as const;
              return (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={bpAutoFrequency}
                        onValueChange={(v) =>
                          setBpAutoFrequency(v as "monthly" | "semi_monthly" | "weekly")
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="semi_monthly">Semi-monthly</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={bpAutoBasis}
                        onValueChange={(v) => setBpAutoBasis(v as "by_date")}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="by_date">By date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <Select
                        value={bpAutoStartDay}
                        onValueChange={setBpAutoStartDay}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dayOptions.map((d) => (
                            <SelectItem key={d} value={String(d)}>{ordinal(d)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">of</span>
                      <Select
                        value={bpAutoStartMonth}
                        onValueChange={(v) =>
                          setBpAutoStartMonth(v as "previous" | "this" | "next")
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <Select
                        value={bpAutoEndDay}
                        onValueChange={setBpAutoEndDay}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dayOptions.map((d) => (
                            <SelectItem key={d} value={String(d)}>{ordinal(d)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">of</span>
                      <Select
                        value={bpAutoEndMonth}
                        onValueChange={(v) =>
                          setBpAutoEndMonth(v as "previous" | "this" | "next")
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <Select
                        value={bpAutoDueDay}
                        onValueChange={setBpAutoDueDay}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dayOptions.map((d) => (
                            <SelectItem key={d} value={String(d)}>{ordinal(d)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">of</span>
                      <Select
                        value={bpAutoDueMonth}
                        onValueChange={(v) =>
                          setBpAutoDueMonth(v as "previous" | "this" | "next")
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                createBpMutation.isPending ||
                (bpMode === "manual" &&
                  (!bpFormStartDate || !bpFormEndDate || !bpFormBillingDate))
              }
              onClick={async () => {
                if (bpMode === "manual") {
                  createBpMutation.mutate(
                    {
                      start_date: bpFormStartDate,
                      end_date: bpFormEndDate,
                      due_date: bpFormBillingDate || undefined,
                    },
                    {
                      onSuccess: () => {
                        setCreateDialogOpen(false);
                        setBpFormStartDate("");
                        setBpFormEndDate("");
                        setBpFormBillingDate("");
                      },
                    },
                  );
                  return;
                }

                // Automatic: resolve day-of-month rule to a single period
                const resolveDate = (
                  dayStr: string,
                  offset: "previous" | "this" | "next",
                ) => {
                  const today = new Date();
                  const monthDelta =
                    offset === "previous" ? -1 : offset === "next" ? 1 : 0;
                  const target = new Date(
                    today.getFullYear(),
                    today.getMonth() + monthDelta,
                    1,
                  );
                  const lastDay = new Date(
                    target.getFullYear(),
                    target.getMonth() + 1,
                    0,
                  ).getDate();
                  const day = Math.min(
                    Math.max(1, Number(dayStr) || 1),
                    lastDay,
                  );
                  target.setDate(day);
                  return target.toISOString().slice(0, 10);
                };

                try {
                  await createBpMutation.mutateAsync({
                    start_date: resolveDate(bpAutoStartDay, bpAutoStartMonth),
                    end_date: resolveDate(bpAutoEndDay, bpAutoEndMonth),
                    due_date: resolveDate(bpAutoDueDay, bpAutoDueMonth),
                  });
                  setCreateDialogOpen(false);
                } catch (error) {
                  reportNonCriticalFailure({
                    area: "billing-periods",
                    operation: "create-billing-period",
                    error,
                    userVisibleFallback:
                      "Billing period creation failed and the dialog remains available.",
                    metadata: { projectId },
                  });
                }
              }}
            >
              {createBpMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
