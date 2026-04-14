"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PermissionGate } from "@/components/domain/permissions/PermissionGate";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageTabs } from "@/components/layout/PageTabs";
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
  type TableColumn,
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
import { apiFetch } from "@/lib/api-client";

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
  billing_date?: string | null;
  due_date?: string | null;
  status: string | null;
  total_amount?: number | null;
  gross_amount?: number | null;
  net_amount?: number | null;
  paid_amount?: number | null;
  total_contract_amount?: number | null;
  percent_complete?: number | null;
  erp_status?: string | null;
  acumatica_ref_nbr?: string | null;
  created_at: string | null;
}

const subcontractorColumns: { id: string; label: string; alwaysVisible?: boolean; defaultVisible?: boolean }[] = [
  { id: "invoice_number", label: "Invoice #", alwaysVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "contract_company", label: "Contract Company", defaultVisible: true },
  { id: "billing_period", label: "Billing Period", defaultVisible: true },
  { id: "gross_amount", label: "Gross Amount", defaultVisible: true },
  { id: "net_amount", label: "Net Amount", defaultVisible: true },
  { id: "paid_amount", label: "Paid Amount", defaultVisible: true },
  { id: "invoice_dates", label: "Invoice Dates", defaultVisible: true },
  { id: "contract", label: "Contract", defaultVisible: true },
  { id: "total_contract_amount", label: "Total Contract Amount", defaultVisible: false },
  { id: "percent_complete", label: "% Complete", defaultVisible: true },
  { id: "erp_status", label: "ERP Status", defaultVisible: false },
];

const subcontractorDefaultVisibleColumns = subcontractorColumns
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

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
  const [bpMode, setBpMode] = React.useState<"manual" | "automatic">("manual");
  const [bpAutoFrequency, setBpAutoFrequency] = React.useState<
    "monthly" | "semi_monthly" | "weekly"
  >("monthly");
  const [bpAutoBasis, setBpAutoBasis] = React.useState<"by_date">("by_date");
  const [bpAutoStartDay, setBpAutoStartDay] = React.useState("1");
  const [bpAutoStartMonth, setBpAutoStartMonth] = React.useState<
    "previous" | "this" | "next"
  >("this");
  const [bpAutoEndDay, setBpAutoEndDay] = React.useState("30");
  const [bpAutoEndMonth, setBpAutoEndMonth] = React.useState<
    "previous" | "this" | "next"
  >("this");
  const [bpAutoDueDay, setBpAutoDueDay] = React.useState("24");
  const [bpAutoDueMonth, setBpAutoDueMonth] = React.useState<
    "previous" | "this" | "next"
  >("this");

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
        <PermissionGate projectId={projectId} module="contracts" level="write">
          <Button size="sm" onClick={openCreate}>
            <Plus />
            New Billing Period
          </Button>
        </PermissionGate>
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

      {/* Create Dialog — Manual / Automatic tabs */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Billing Period</DialogTitle>
            <DialogDescription>
              Add a billing period manually, or generate a recurring schedule
              automatically.
            </DialogDescription>
          </DialogHeader>

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
                    value={form.start_date}
                    onChange={(e) => handleFormChange("start_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bp-end">To</Label>
                  <Input
                    id="bp-end"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => handleFormChange("end_date", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bp-due">Due Date</Label>
                <Input
                  id="bp-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => handleFormChange("due_date", e.target.value)}
                />
              </div>
            </div>
          ) : (
            (() => {
              const selectClass =
                "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring";
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
                      <select
                        value={bpAutoFrequency}
                        onChange={(e) =>
                          setBpAutoFrequency(
                            e.target.value as "monthly" | "semi_monthly" | "weekly",
                          )
                        }
                        className={selectClass}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="semi_monthly">Semi-monthly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                      <select
                        value={bpAutoBasis}
                        onChange={(e) =>
                          setBpAutoBasis(e.target.value as "by_date")
                        }
                        className={selectClass}
                      >
                        <option value="by_date">By date</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <select
                        value={bpAutoStartDay}
                        onChange={(e) => setBpAutoStartDay(e.target.value)}
                        className={selectClass}
                      >
                        {dayOptions.map((d) => (
                          <option key={d} value={d}>
                            {ordinal(d)}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-muted-foreground">of</span>
                      <select
                        value={bpAutoStartMonth}
                        onChange={(e) =>
                          setBpAutoStartMonth(
                            e.target.value as "previous" | "this" | "next",
                          )
                        }
                        className={selectClass}
                      >
                        {monthOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <select
                        value={bpAutoEndDay}
                        onChange={(e) => setBpAutoEndDay(e.target.value)}
                        className={selectClass}
                      >
                        {dayOptions.map((d) => (
                          <option key={d} value={d}>
                            {ordinal(d)}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-muted-foreground">of</span>
                      <select
                        value={bpAutoEndMonth}
                        onChange={(e) =>
                          setBpAutoEndMonth(
                            e.target.value as "previous" | "this" | "next",
                          )
                        }
                        className={selectClass}
                      >
                        {monthOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <select
                        value={bpAutoDueDay}
                        onChange={(e) => setBpAutoDueDay(e.target.value)}
                        className={selectClass}
                      >
                        {dayOptions.map((d) => (
                          <option key={d} value={d}>
                            {ordinal(d)}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-muted-foreground">of</span>
                      <select
                        value={bpAutoDueMonth}
                        onChange={(e) =>
                          setBpAutoDueMonth(
                            e.target.value as "previous" | "this" | "next",
                          )
                        }
                        className={selectClass}
                      >
                        {monthOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                isMutating ||
                (bpMode === "manual" && (!form.start_date || !form.end_date))
              }
              onClick={async () => {
                if (bpMode === "manual") {
                  const input: CreateBillingPeriodInput = {
                    start_date: form.start_date,
                    end_date: form.end_date,
                    ...(form.name ? { name: form.name } : {}),
                    ...(form.due_date ? { due_date: form.due_date } : {}),
                  };
                  try {
                    await createPeriod.mutateAsync(input);
                    setCreateOpen(false);
                    setForm(EMPTY_FORM);
                  } catch {
                    // toast handled by mutation
                  }
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
                  await createPeriod.mutateAsync({
                    start_date: resolveDate(bpAutoStartDay, bpAutoStartMonth),
                    end_date: resolveDate(bpAutoEndDay, bpAutoEndMonth),
                    due_date: resolveDate(bpAutoDueDay, bpAutoDueMonth),
                  });
                  setCreateOpen(false);
                } catch {
                  // toast handled by mutation
                }
              }}
            >
              {createPeriod.isPending
                ? "Creating…"
                : bpMode === "manual"
                  ? "Create"
                  : "Save"}
            </Button>
          </DialogFooter>
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
      try {
        const json = await apiFetch<{ data?: { id: string; name: string | null; start_date: string }[] }>(
          `/api/projects/${projectId}/invoicing/billing-periods`,
        );
        return json.data ?? [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(projectId),
  });

  const { data: contracts = [] } = useQuery<{ id: string; contract_number: string | null; title: string | null }[]>({
    queryKey: ["contracts-filter", projectId],
    queryFn: async () => {
      try {
        const json = await apiFetch<
          | { id: string; contract_number: string | null; title: string | null }[]
          | { data?: { id: string; contract_number: string | null; title: string | null }[] }
        >(`/api/projects/${projectId}/contracts`);
        // contracts route returns the array directly (not wrapped in .data)
        return Array.isArray(json) ? json : (json.data ?? []);
      } catch {
        return [];
      }
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

  const subTableState = useUnifiedTableState({
    entityKey: "invoicing-subcontractor",
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
      visibleColumns: subcontractorDefaultVisibleColumns,
      filters: {
        billing_period_id: undefined,
        status: undefined,
        contract_company: undefined,
      },
    },
  });

  // ─── Acumatica Sync ──────────────────────────────────────────────────────

  const handleErpSync = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await apiFetch<{
        result: { created: number; updated: number; errors: unknown[] };
      }>("/api/sync/acumatica/ar-invoices", {
        method: "POST",
        body: JSON.stringify({ projectId: Number(projectId) }),
      });
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

  // ─── Subcontractor table (UnifiedTablePage) ────────────────────────────────

  const currencyFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const fmtCurrency = (v: number | null | undefined) =>
    v == null ? "—" : currencyFmt.format(v);

  const fmtPercent = (v: number | null | undefined) =>
    v == null ? "0%" : `${Math.round(v)}%`;

  const subActiveFilters = subTableState.activeFilters as Record<string, FilterValue>;

  const subFilters: FilterConfig[] = React.useMemo(
    () => [
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
    ],
    [billingPeriods],
  );

  const filteredSubInvoices = React.useMemo(() => {
    let items = subcontractorInvoices;

    const bp = typeof subActiveFilters.billing_period_id === "string" ? subActiveFilters.billing_period_id : undefined;
    if (bp) items = items.filter((i) => i.billing_period_id === bp);

    const status = typeof subActiveFilters.status === "string" ? subActiveFilters.status : undefined;
    if (status) items = items.filter((i) => i.status === status);

    const company = typeof subActiveFilters.contract_company === "string"
      ? subActiveFilters.contract_company.toLowerCase()
      : undefined;
    if (company) {
      items = items.filter((i) =>
        i.contract_company_name?.toLowerCase().includes(company) ?? false,
      );
    }

    const search = subTableState.debouncedSearch.toLowerCase().trim();
    if (search) {
      items = items.filter((i) => {
        const num = i.invoice_number?.toLowerCase() ?? "";
        const cn = i.contract_number?.toLowerCase() ?? "";
        const ct = i.contract_title?.toLowerCase() ?? "";
        const cc = i.contract_company_name?.toLowerCase() ?? "";
        return (
          num.includes(search) ||
          cn.includes(search) ||
          ct.includes(search) ||
          cc.includes(search) ||
          `inv-${i.id}`.includes(search)
        );
      });
    }

    return items;
  }, [subcontractorInvoices, subActiveFilters, subTableState.debouncedSearch]);

  const handleViewSub = React.useCallback(
    (row: SubcontractorInvoiceRow) =>
      router.push(`/${projectId}/invoicing/subcontractor/${row.id}`),
    [projectId, router],
  );

  const subTableColumns: TableColumn<SubcontractorInvoiceRow>[] = React.useMemo(
    () => [
      {
        id: "invoice_number",
        label: "Invoice #",
        alwaysVisible: true,
        render: (row) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => handleViewSub(row)}
          >
            {row.invoice_number ?? `INV-${row.id}`}
          </button>
        ),
      },
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        render: (row) =>
          row.status ? (
            <InvoiceStatusBadge status={row.status} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "contract_company",
        label: "Contract Company",
        defaultVisible: true,
        render: (row) => (
          <span className="text-sm">
            {row.contract_company_name ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
        ),
      },
      {
        id: "billing_period",
        label: "Billing Period",
        defaultVisible: true,
        render: (row) => {
          if (row.billing_period_name)
            return <span className="text-sm">{row.billing_period_name}</span>;
          const start = row.period_start;
          const end = row.period_end;
          if (!start && !end)
            return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-sm">
              {formatDate(start)} – {formatDate(end)}
            </span>
          );
        },
      },
      {
        id: "gross_amount",
        label: "Gross Amount",
        defaultVisible: true,
        render: (row) => (
          <span className="font-medium tabular-nums">
            {fmtCurrency(row.gross_amount ?? row.total_amount)}
          </span>
        ),
        sortable: true,
        sortValue: (row) => row.gross_amount ?? row.total_amount ?? 0,
      },
      {
        id: "net_amount",
        label: "Net Amount",
        defaultVisible: true,
        render: (row) => (
          <span className="tabular-nums">{fmtCurrency(row.net_amount)}</span>
        ),
        sortable: true,
        sortValue: (row) => row.net_amount ?? 0,
      },
      {
        id: "paid_amount",
        label: "Paid Amount",
        defaultVisible: true,
        render: (row) => (
          <span className="tabular-nums">{fmtCurrency(row.paid_amount)}</span>
        ),
        sortable: true,
        sortValue: (row) => row.paid_amount ?? 0,
      },
      {
        id: "invoice_dates",
        label: "Invoice Dates",
        defaultVisible: true,
        render: (row) => {
          const billing = row.billing_date;
          const due = row.due_date;
          if (!billing && !due)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="text-sm space-y-0.5">
              {billing && (
                <div className="text-muted-foreground text-xs">
                  Billing: {formatDate(billing)}
                </div>
              )}
              {due && (
                <div className="text-muted-foreground text-xs">
                  Due: {formatDate(due)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "contract",
        label: "Contract",
        defaultVisible: true,
        render: (row) => {
          const label = row.contract_number ?? row.contract_title ?? "—";
          const sublabel =
            row.contract_number && row.contract_title ? row.contract_title : null;
          return (
            <div className="text-sm">
              <span className="font-medium">{label}</span>
              {sublabel && (
                <p className="text-xs text-muted-foreground truncate max-w-40">
                  {sublabel}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "total_contract_amount",
        label: "Total Contract Amount",
        defaultVisible: false,
        render: (row) => (
          <span className="tabular-nums">
            {fmtCurrency(row.total_contract_amount)}
          </span>
        ),
        sortable: true,
        sortValue: (row) => row.total_contract_amount ?? 0,
      },
      {
        id: "percent_complete",
        label: "% Complete",
        defaultVisible: true,
        render: (row) => (
          <span className="tabular-nums text-sm">
            {fmtPercent(row.percent_complete)}
          </span>
        ),
        sortable: true,
        sortValue: (row) => row.percent_complete ?? 0,
      },
      {
        id: "erp_status",
        label: "ERP Status",
        defaultVisible: false,
        render: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {row.acumatica_ref_nbr ?? row.erp_status ?? "—"}
          </span>
        ),
      },
    ],
    [handleViewSub],
  );

  const sortedSubInvoices = React.useMemo(() => {
    if (!subTableState.sortBy) return filteredSubInvoices;
    const col = subTableColumns.find((c) => c.id === subTableState.sortBy);
    const getSortValue = col?.sortValue;
    if (!getSortValue) return filteredSubInvoices;
    return [...filteredSubInvoices].sort((a, b) => {
      const va = getSortValue(a);
      const vb = getSortValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return subTableState.sortDirection === "asc" ? -1 : 1;
      if (vb == null) return subTableState.sortDirection === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return subTableState.sortDirection === "asc" ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb));
      return subTableState.sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredSubInvoices, subTableColumns, subTableState.sortBy, subTableState.sortDirection]);

  const subIsFiltered =
    Boolean(subTableState.searchInput) ||
    Boolean(subActiveFilters.billing_period_id) ||
    Boolean(subActiveFilters.status) ||
    Boolean(subActiveFilters.contract_company);

  const subTotalItems = sortedSubInvoices.length;

  const renderSubRowActions = (row: SubcontractorInvoiceRow): ReactElement => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewSub(row)}>
          <Pencil className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setSubDeleteTarget(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
      <>
        <UnifiedTablePage
          header={{
            title: "Invoicing",
            description: "Manage owner invoices and billing periods",
            actions: createButton,
          }}
          tabs={tabs}
          toolbar={{
            totalItems: subTotalItems,
            filteredItems: subTotalItems,
            selectedCount: subTableState.selectedIds.length,
            searchValue: subTableState.searchInput,
            onSearchChange: subTableState.setSearchInput,
            searchPlaceholder: "Search subcontractor invoices...",
            currentView: subTableState.currentView,
            onViewChange: (view) => {
              subTableState.setCurrentView(view);
              subTableState.setSearchParams({ view });
            },
            filters: subFilters,
            activeFilters: subActiveFilters,
            onFilterChange: (next) => {
              subTableState.setActiveFilters(next);
              subTableState.setPage(1);
            },
            onClearFilters: () =>
              subTableState.setActiveFilters({
                billing_period_id: undefined,
                status: undefined,
                contract_company: undefined,
              }),
            columns: subcontractorColumns,
            visibleColumns: subTableState.visibleColumns,
            onColumnVisibilityChange: subTableState.setVisibleColumns,
          }}
          data={{
            items: sortedSubInvoices,
            isLoading: isSubLoading,
          }}
          table={{
            columns: subTableColumns,
            getRowId: (item) => String(item.id),
            onRowClick: handleViewSub,
            rowActions: renderSubRowActions,
          }}
          sorting={{
            sortBy: subTableState.sortBy,
            sortDirection: subTableState.sortDirection,
            onSortChange: (sortBy, direction) => {
              subTableState.setSortBy(sortBy);
              subTableState.setSortDirection(direction);
            },
          }}
          selection={{
            selectedIds: subTableState.selectedIds,
            onSelectAll: (checked) => {
              subTableState.setSelectedIds(
                checked ? sortedSubInvoices.map((i) => String(i.id)) : [],
              );
            },
            onSelectRow: (id, checked) => {
              subTableState.setSelectedIds((prev) =>
                checked ? [...prev, String(id)] : prev.filter((x) => x !== String(id)),
              );
            },
          }}
          emptyState={{
            title: "No subcontractor invoices yet",
            description:
              "Create an invoice against a subcontract or purchase order to get started.",
            filteredDescription: "Try adjusting your search or filters.",
            isFiltered: subIsFiltered,
            action: (
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/${projectId}/invoicing/subcontractor/new`)
                }
              >
                <Plus />
                Create Subcontractor Invoice
              </Button>
            ),
          }}
          pagination={{
            page: subTableState.page,
            totalPages: Math.max(
              1,
              Math.ceil(subTotalItems / subTableState.perPage),
            ),
            perPage: subTableState.perPage,
            onPageChange: (nextPage) => subTableState.setPage(nextPage),
            onPerPageChange: (nextPerPage) => {
              const parsed = Number(nextPerPage);
              if (!Number.isFinite(parsed) || parsed <= 0) return;
              subTableState.setPerPage(parsed);
              subTableState.setPage(1);
            },
          }}
        />

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
      </>
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
