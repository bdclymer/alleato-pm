"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { InvoiceStatusBadge } from "@/components/invoicing/InvoiceStatusBadge";
import { KpiRow } from "@/components/ds";
import { PageShell } from "@/components/layout";
import {
  useOwnerInvoicesList,
  useDeleteOwnerInvoice,
} from "@/hooks/use-invoicing";
import {
  useSubcontractorInvoicesList,
  useDeleteSubcontractorInvoice,
} from "@/hooks/use-subcontractor-invoices";
import {
  useBillingPeriodsList,
  useCreateBillingPeriod,
  useUpdateBillingPeriod,
  useDeleteBillingPeriod,
  type BillingPeriod,
  type CreateBillingPeriodInput,
  type UpdateBillingPeriodInput,
} from "@/hooks/use-billing-periods";
import {
  buildInvoiceTableColumns,
  formatDate,
  invoiceColumns,
  invoiceDefaultVisibleColumns,
  renderInvoiceCard,
  renderInvoiceList,
  renderInvoiceRowActions,
  type OwnerInvoice,
} from "@/features/invoicing/invoicing-table-config";
import { InvoicingSettingsTab } from "@/features/invoicing/invoicing-settings-tab";
import { PaymentsTab } from "@/features/invoicing/payments-tab";

// =============================================================================
// Types
// =============================================================================

interface SubcontractorInvoiceRow {
  id: number;
  invoice_number: string | null;
  contract_number: string | null;
  contract_title: string | null;
  contract_company_id: string | null;
  contract_company_name?: string | null;
  billing_period_id: string | null;
  billing_period_name: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string | null;
  total_amount?: number | null;
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
// Billing Periods Form State
// =============================================================================

interface BillingPeriodFormValues {
  name: string;
  start_date: string;
  end_date: string;
  due_date: string;
}

const EMPTY_FORM: BillingPeriodFormValues = {
  name: "",
  start_date: "",
  end_date: "",
  due_date: "",
};

// =============================================================================
// Billing Periods Tab Component
// =============================================================================

function BillingPeriodsTab({ projectId }: { projectId: string }) {
  const { data: periods = [], isLoading } = useBillingPeriodsList(projectId);
  const createPeriod = useCreateBillingPeriod(projectId);
  const updatePeriod = useUpdateBillingPeriod(projectId);
  const deletePeriod = useDeleteBillingPeriod(projectId);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editPeriod, setEditPeriod] = React.useState<BillingPeriod | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<BillingPeriod | null>(null);
  const [form, setForm] = React.useState<BillingPeriodFormValues>(EMPTY_FORM);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  }

  function openEdit(period: BillingPeriod) {
    setForm({
      name: period.name ?? "",
      start_date: period.start_date ?? "",
      end_date: period.end_date ?? "",
      due_date: period.due_date ?? "",
    });
    setEditPeriod(period);
  }

  function handleFormChange(field: keyof BillingPeriodFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      toast.error("Start date and end date are required");
      return;
    }
    const input: CreateBillingPeriodInput = {
      start_date: form.start_date,
      end_date: form.end_date,
      ...(form.name ? { name: form.name } : {}),
      ...(form.due_date ? { due_date: form.due_date } : {}),
    };
    await createPeriod.mutateAsync(input);
    setCreateOpen(false);
    setForm(EMPTY_FORM);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPeriod) return;
    if (!form.start_date || !form.end_date) {
      toast.error("Start date and end date are required");
      return;
    }
    const input: UpdateBillingPeriodInput = {
      periodId: editPeriod.id,
      start_date: form.start_date,
      end_date: form.end_date,
      ...(form.name ? { name: form.name } : { name: undefined }),
      ...(form.due_date ? { due_date: form.due_date } : { due_date: undefined }),
    };
    await updatePeriod.mutateAsync(input);
    setEditPeriod(null);
    setForm(EMPTY_FORM);
  }

  async function handleToggleClose(period: BillingPeriod) {
    await updatePeriod.mutateAsync({
      periodId: period.id,
      is_closed: !period.is_closed,
    });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deletePeriod.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const isMutating =
    createPeriod.isPending || updatePeriod.isPending || deletePeriod.isPending;

  return (
    <div className="px-6 py-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Billing Periods</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${periods.length} billing period${periods.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          New Billing Period
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading billing periods…</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">No billing periods yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first billing period to start organizing owner invoices.
          </p>
          <div className="pt-2">
            <Button size="sm" onClick={openCreate}>
              <Plus />
              Create First Period
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {period.period_number}
                </TableCell>
                <TableCell className="font-medium">
                  {period.name ?? `Period ${period.period_number}`}
                </TableCell>
                <TableCell>{formatDate(period.start_date)}</TableCell>
                <TableCell>{formatDate(period.end_date)}</TableCell>
                <TableCell>{formatDate(period.due_date)}</TableCell>
                <TableCell>
                  {period.is_closed ? (
                    <Badge variant="secondary">Closed</Badge>
                  ) : (
                    <Badge variant="success">Open</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Period actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(period)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleClose(period)}>
                        {period.is_closed ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Reopen
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Close Period
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(period)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Billing Period</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bp-name">Name (optional)</Label>
              <Input
                id="bp-name"
                placeholder="e.g. January 2025"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bp-start">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bp-start"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => handleFormChange("start_date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bp-end">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bp-end"
                  type="date"
                  required
                  value={form.end_date}
                  onChange={(e) => handleFormChange("end_date", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bp-due">Due Date (optional)</Label>
              <Input
                id="bp-due"
                type="date"
                value={form.due_date}
                onChange={(e) => handleFormChange("due_date", e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating}>
                {createPeriod.isPending ? "Creating…" : "Create Period"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editPeriod} onOpenChange={(open) => { if (!open) setEditPeriod(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Billing Period</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ep-name">Name (optional)</Label>
              <Input
                id="ep-name"
                placeholder="e.g. January 2025"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ep-start">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ep-start"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => handleFormChange("start_date", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-end">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ep-end"
                  type="date"
                  required
                  value={form.end_date}
                  onChange={(e) => handleFormChange("end_date", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-due">Due Date (optional)</Label>
              <Input
                id="ep-due"
                type="date"
                value={form.due_date}
                onChange={(e) => handleFormChange("due_date", e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditPeriod(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isMutating}>
                {updatePeriod.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Period</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {deleteTarget?.name ?? `Period ${deleteTarget?.period_number}`}
              </strong>
              ? This cannot be undone. Periods with invoices cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Period
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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

  // ─── Filter option data ────────────────────────────────────────────────────

  const { data: billingPeriods = [] } = useQuery<{ id: string; name: string | null; start_date: string }[]>({
    queryKey: ["billing-periods-filter", projectId],
    queryFn: async () => {
      const resp = await fetch(`/api/projects/${projectId}/invoicing/billing-periods`);
      if (!resp.ok) return [];
      const json = await resp.json();
      return json.data ?? [];
    },
    enabled: Boolean(projectId),
  });

  const { data: contracts = [] } = useQuery<{ id: string; contract_number: string | null; title: string | null }[]>({
    queryKey: ["contracts-filter", projectId],
    queryFn: async () => {
      const resp = await fetch(`/api/projects/${projectId}/contracts`);
      if (!resp.ok) return [];
      const json = await resp.json();
      // contracts route returns the array directly (not wrapped in .data)
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    enabled: Boolean(projectId),
  });

  // ─── Subcontractor invoices ───────────────────────────────────────────────

  const { data: subcontractorInvoices = [], isLoading: isSubLoading } =
    useSubcontractorInvoicesList(projectId) as {
      data: SubcontractorInvoiceRow[];
      isLoading: boolean;
    };
  const deleteSubInvoice = useDeleteSubcontractorInvoice(projectId);
  const [subDeleteTarget, setSubDeleteTarget] =
    React.useState<SubcontractorInvoiceRow | null>(null);

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
      options: billingPeriods.map((p) => ({
        value: p.id,
        label: p.name ?? p.start_date,
      })),
    },
    {
      id: "prime_contract_id",
      label: "Prime Contract",
      type: "select",
      options: contracts.map((c) => ({
        value: c.id,
        label: [c.contract_number, c.title].filter(Boolean).join(" - "),
      })),
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
        <DropdownMenuItem
          onClick={() =>
            router.push(`/${projectId}/invoicing/subcontractor/new`)
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Subcontractor Invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ─── Subcontractor table render ────────────────────────────────────────────

  const currencyFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const subcontractorTable = (
    <div className="px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isSubLoading
            ? "Loading…"
            : `${subcontractorInvoices.length} invoice${subcontractorInvoices.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      {isSubLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Loading subcontractor invoices…
        </p>
      ) : subcontractorInvoices.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center space-y-3">
          <p className="text-sm font-medium text-foreground">
            No subcontractor invoices yet
          </p>
          <p className="text-sm text-muted-foreground">
            Create an invoice against a subcontract or purchase order to get started.
          </p>
          <div className="pt-2">
            <Button
              size="sm"
              onClick={() =>
                router.push(`/${projectId}/invoicing/subcontractor/new`)
              }
            >
              <Plus />
              Create Subcontractor Invoice
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Contract #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead>Period Start</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcontractorInvoices.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/${projectId}/invoicing/subcontractor/${row.id}`,
                    )
                  }
                >
                  <TableCell className="font-medium">
                    {row.invoice_number ?? `INV-${row.id}`}
                  </TableCell>
                  <TableCell>{row.contract_number ?? "—"}</TableCell>
                  <TableCell>{row.contract_title ?? "—"}</TableCell>
                  <TableCell>{row.billing_period_name ?? "—"}</TableCell>
                  <TableCell>{formatDate(row.period_start)}</TableCell>
                  <TableCell>{formatDate(row.period_end)}</TableCell>
                  <TableCell>
                    {row.status ? (
                      <InvoiceStatusBadge status={row.status} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {currencyFmt.format(row.total_amount ?? 0)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Invoice actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/${projectId}/invoicing/subcontractor/${row.id}`,
                            )
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setSubDeleteTarget(row)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={Boolean(subDeleteTarget)}
        onOpenChange={(open) => !open && setSubDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcontractor Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice{" "}
              <strong>
                {subDeleteTarget?.invoice_number ??
                  `INV-${subDeleteTarget?.id}`}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!subDeleteTarget) return;
                await deleteSubInvoice.mutateAsync(subDeleteTarget.id);
                setSubDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (activeTab === "billing-periods") {
    return (
      <PageShell
        variant="table"
        title="Invoicing"
        description="Manage owner invoices and billing periods"
        tabs={tabs}
      >
        <BillingPeriodsTab projectId={projectId} />
      </PageShell>
    );
  }

  if (activeTab === "settings") {
    return (
      <PageShell
        variant="table"
        title="Invoicing"
        description="Manage owner invoices and billing periods"
        tabs={tabs}
      >
        <InvoicingSettingsTab projectId={projectId} />
      </PageShell>
    );
  }

  if (activeTab === "payments") {
    return (
      <PageShell
        variant="table"
        title="Invoicing"
        description="Manage owner invoices and billing periods"
        tabs={tabs}
      >
        <PaymentsTab projectId={projectId} />
      </PageShell>
    );
  }

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
