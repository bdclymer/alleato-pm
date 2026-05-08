"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Paperclip } from "lucide-react";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField } from "@/components/forms/DateField";
import { MoneyField } from "@/components/forms/MoneyField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SovItem {
  id: string;
  budget_code: string | null;
  description: string;
  scheduled_value: number;
  from_previous: number; // gross_billed_to_date from commitment
  retainage_pct: number;
  line_number: number | null;
}

interface ApprovedCO {
  id: string;
  change_order_number: string;
  title: string | null;
  amount: number;
  description: string | null;
}

interface SovEdit {
  work_completed_period: string;
  materials_stored: string;
}

type BillingEdit = SovEdit;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function formatCurrency(v: number) {
  return fmt.format(v);
}

function pct(value: number, total: number) {
  if (total === 0) return "0.00%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function parseNum(s: string) {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface CommitmentOption {
  id: string;
  contract_number: string | null;
  title: string | null;
  company_name: string | null;
}

export default function NewSubcontractorInvoicePage() {
  const router = useRouter();
  const params = useParams()!;
  const searchParams = useSearchParams()!;
  const projectId = params.projectId as string;

  // URL-provided commitment context (from commitment detail page)
  const urlCommitmentId = searchParams.get("commitmentId");
  const urlCommitmentType = searchParams.get("commitmentType");

  // Picker state (used when no URL commitment)
  const [pickerType, setPickerType] = useState<"subcontract" | "purchase_order">("subcontract");
  const [pickerCommitmentId, setPickerCommitmentId] = useState("");
  const [subcontracts, setSubcontracts] = useState<CommitmentOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<CommitmentOption[]>([]);
  const [picklistLoading, setPicklistLoading] = useState(false);

  // Resolved effective values (URL params take priority)
  const commitmentId = urlCommitmentId ?? (pickerCommitmentId || null);
  const commitmentType = urlCommitmentType ?? pickerType;

  // Header fields
  const [periodStart, setPeriodStart] = useState<Date | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(undefined);
  const [billingDate, setBillingDate] = useState<Date | undefined>(undefined);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // SOV line item edits: { [itemId]: { work_completed_period, materials_stored } }
  const [sovEdits, setSovEdits] = useState<Record<string, SovEdit>>({});
  const [coEdits, setCoEdits] = useState<Record<string, BillingEdit>>({});

  // Loaded data
  const [contractInfo, setContractInfo] = useState<{
    number: string;
    title: string;
    company: string;
  } | null>(null);
  const [sovItems, setSovItems] = useState<SovItem[]>([]);
  const [approvedCOs, setApprovedCOs] = useState<ApprovedCO[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Section collapse state
  const [sovOpen, setSovOpen] = useState(true);
  const [cosOpen, setCosOpen] = useState(true);

  // ---------------------------------------------------------------------------
  // Load picklist options when no URL commitment provided
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (urlCommitmentId || !projectId) return;
    setPicklistLoading(true);
    Promise.all([
      fetch(`/api/projects/${projectId}/subcontracts`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/purchase-orders`).then((r) => r.json()),
    ])
      .then(([scJson, poJson]) => {
        const mapOption = (item: {
          id: string;
          contract_number?: string | null;
          title?: string | null;
          company_name?: string | null;
          companies?: { name?: string | null } | null;
        }): CommitmentOption => ({
          id: item.id,
          contract_number: item.contract_number ?? null,
          title: item.title ?? null,
          company_name: item.company_name ?? item.companies?.name ?? null,
        });
        setSubcontracts((scJson.data ?? scJson ?? []).map(mapOption));
        setPurchaseOrders((poJson.data ?? poJson ?? []).map(mapOption));
      })
      .catch(() => toast.error("Failed to load commitments"))
      .finally(() => setPicklistLoading(false));
  }, [projectId, urlCommitmentId]);

  // ---------------------------------------------------------------------------
  // Load commitment data (SOV + COs) when a commitment is selected
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!commitmentId || !projectId) {
      return;
    }

    setLoading(true);
    setSovItems([]);
    setSovEdits({});
    setCoEdits({});
    setApprovedCOs([]);
    setContractInfo(null);

    async function load() {
      try {
        const [detailRes, invoicesRes, cosRes] = await Promise.all([
          fetch(`/api/commitments/${commitmentId}`),
          fetch(`/api/commitments/${commitmentId}/invoices`),
          fetch(`/api/commitments/${commitmentId}/change-orders`),
        ]);

        // Commitment details
        if (detailRes.ok) {
          const json = await detailRes.json();
          const d = json.data ?? json;
          setContractInfo({
            number: d?.contract_number ?? "",
            title: d?.title ?? "",
            company:
              d?.contract_company_name ??
              d?.company_name ??
              d?.companies?.name ??
              "",
          });
        }

        // SOV items (with previous billing amounts)
        if (invoicesRes.ok) {
          const json = await invoicesRes.json();
          const items: SovItem[] = (json.line_items ?? []).map(
            (li: {
              id: string;
              budget_code?: string | null;
              description?: string;
              scheduled_value?: number;
              gross_billed_to_date?: number;
              retainage_percentage?: number;
              line_number?: number | null;
            }) => ({
              id: li.id,
              budget_code: li.budget_code ?? null,
              description: li.description ?? "",
              scheduled_value: Number(li.scheduled_value ?? 0),
              from_previous: Number(li.gross_billed_to_date ?? 0),
              retainage_pct: Number(li.retainage_percentage ?? 0),
              line_number: li.line_number ?? null,
            }),
          );
          setSovItems(items);

          // Seed edits at zero
          const edits: Record<string, SovEdit> = {};
          for (const item of items) {
            edits[item.id] = {
              work_completed_period: "",
              materials_stored: "",
            };
          }
          setSovEdits(edits);
        }

        // Approved change orders only
        if (cosRes.ok) {
          const json = await cosRes.json();
          const approved: ApprovedCO[] = (json.data ?? [])
            .filter(
              (co: { status?: string }) =>
                co.status?.toLowerCase() === "approved",
            )
            .map(
              (co: {
                id: string;
                change_order_number?: string;
                title?: string | null;
                amount?: number;
                description?: string | null;
              }) => ({
                id: co.id,
                change_order_number: co.change_order_number ?? "",
                title: co.title ?? null,
                amount: Number(co.amount ?? 0),
                description: co.description ?? null,
              }),
            );
          setApprovedCOs(approved);
          setCoEdits(
            Object.fromEntries(
              approved.map((co) => [
                co.id,
                {
                  work_completed_period: "",
                  materials_stored: "",
                },
              ]),
            ),
          );
        }
      } catch {
        toast.error("Failed to load commitment data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [commitmentId, projectId]);

  // ---------------------------------------------------------------------------
  // Computed totals (live)
  // ---------------------------------------------------------------------------

  const totals = useMemo(() => {
    return sovItems.reduce(
      (acc, item) => {
        const e = sovEdits[item.id] ?? {
          work_completed_period: "",
          materials_stored: "",
        };
        acc.scheduled += item.scheduled_value;
        acc.fromPrevious += item.from_previous;
        acc.thisPeriod += parseNum(e.work_completed_period);
        acc.materialsStored += parseNum(e.materials_stored);
        return acc;
      },
      { scheduled: 0, fromPrevious: 0, thisPeriod: 0, materialsStored: 0 },
    );
  }, [sovItems, sovEdits]);

  const coTotals = useMemo(() => {
    return approvedCOs.reduce(
      (acc, co) => {
        const e = coEdits[co.id] ?? {
          work_completed_period: "",
          materials_stored: "",
        };
        acc.scheduled += co.amount;
        acc.thisPeriod += parseNum(e.work_completed_period);
        acc.materialsStored += parseNum(e.materials_stored);
        return acc;
      },
      { scheduled: 0, fromPrevious: 0, thisPeriod: 0, materialsStored: 0 },
    );
  }, [approvedCOs, coEdits]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleAction(status: "draft" | "under_review") {
    if (!commitmentId) {
      toast.error("No commitment selected");
      return;
    }
    setSubmitting(true);
    try {
      const lineItems = sovItems.map((item) => {
        const e = sovEdits[item.id] ?? {
          work_completed_period: "",
          materials_stored: "",
        };
        return {
          description: item.description,
          budget_code: item.budget_code,
          scheduled_value: item.scheduled_value,
          work_completed_previous: item.from_previous,
          work_completed_period: parseNum(e.work_completed_period),
          materials_stored: parseNum(e.materials_stored),
          retainage_pct: item.retainage_pct,
          materials_retainage_pct: 0,
          sort_order: item.line_number ?? 0,
        };
      });

      const coLineItems = approvedCOs
        .map((co, index) => {
          const e = coEdits[co.id] ?? {
            work_completed_period: "",
            materials_stored: "",
          };
          const label = [co.change_order_number, co.title ?? co.description]
            .filter(Boolean)
            .join(" - ");
          return {
            description: label || "Approved Commitment Change Order",
            budget_code: co.change_order_number || null,
            scheduled_value: co.amount,
            work_completed_previous: 0,
            work_completed_period: parseNum(e.work_completed_period),
            materials_stored: parseNum(e.materials_stored),
            retainage_pct: 0,
            materials_retainage_pct: 0,
            sort_order: sovItems.length + index + 1,
            line_item_type: "Change Order",
            commitment_value: 0,
            change_value: co.amount,
          };
        })
        .filter(
          (item) =>
            item.work_completed_period > 0 ||
            item.materials_stored > 0,
        );

      const contractKey =
        commitmentType === "subcontract" ? "subcontract_id" : "purchase_order_id";

      const body = {
        [contractKey]: commitmentId,
        period_start: periodStart ? format(periodStart, "yyyy-MM-dd") : null,
        period_end: periodEnd ? format(periodEnd, "yyyy-MM-dd") : null,
        billing_date: billingDate ? format(billingDate, "yyyy-MM-dd") : null,
        invoice_number: invoiceNumber || null,
        status,
        line_items: [...lineItems, ...coLineItems],
      };

      const res = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server returned ${res.status}`);
      }

      const { data } = await res.json();
      toast.success(
        status === "under_review"
          ? "Invoice submitted for approval"
          : "Draft saved",
      );
      router.push(`/${projectId}/invoicing/subcontractor/${data.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save invoice",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Early states
  // ---------------------------------------------------------------------------

  // Picker options for the currently selected type
  const pickerOptions = pickerType === "subcontract" ? subcontracts : purchaseOrders;

  // Commitment picker section — shown only when no URL-provided commitment
  const CommitmentPicker = !urlCommitmentId ? (
    <div className="space-y-4 pb-6 border-b border-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div className="space-y-1.5">
          <Label>Commitment Type</Label>
          <Select
            value={pickerType}
            onValueChange={(v) => {
              setPickerType(v as "subcontract" | "purchase_order");
              setPickerCommitmentId("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subcontract">Subcontract</SelectItem>
              <SelectItem value="purchase_order">Purchase Order</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Contract</Label>
          <Select
            value={pickerCommitmentId}
            onValueChange={setPickerCommitmentId}
            disabled={picklistLoading || pickerOptions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={picklistLoading ? "Loading…" : "Select a contract"} />
            </SelectTrigger>
            <SelectContent>
              {pickerOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {[opt.contract_number, opt.title].filter(Boolean).join(" — ")}
                  {opt.company_name ? ` (${opt.company_name})` : ""}
                </SelectItem>
              ))}
              {!picklistLoading && pickerOptions.length === 0 && (
                <SelectItem value="__empty" disabled>
                  No {pickerType === "subcontract" ? "subcontracts" : "purchase orders"} found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  ) : null;

  const subtitle = contractInfo
    ? [
        contractInfo.number,
        contractInfo.company,
      ]
        .filter(Boolean)
        .join(" — ")
    : undefined;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      variant="form"
      title="Create New Invoice"
      description={subtitle}
      onBack={() =>
        router.push(`/${projectId}/invoices?tab=subcontractor`)
      }
      backLabel="Back to Invoices"
    >
      <div className="space-y-8">
        {CommitmentPicker}

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading commitment data…
          </div>
        ) : !commitmentId ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Select a contract above to load the Schedule of Values.
          </div>
        ) : (
        <>
          {/* ----------------------------------------------------------------
              Header fields — Period Start, Period End, Billing Date, Invoice #
          ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DateField
              label="Period Start"
              value={periodStart}
              onChange={setPeriodStart}
            />
            <DateField
              label="Period End"
              value={periodEnd}
              onChange={setPeriodEnd}
            />
            <DateField
              label="Billing Date"
              value={billingDate}
              onChange={setBillingDate}
            />
            <div className="space-y-1.5">
              <Label htmlFor="invoice-number">Invoice #:</Label>
              <Input
                id="invoice-number"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Auto-assigned if blank"
              />
            </div>
          </div>

          {/* ----------------------------------------------------------------
              Complete Schedule of Values
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSovOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:text-primary transition-colors"
            >
              {sovOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              Complete Schedule of Values
            </button>

            {sovOpen && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-28">Subjob</TableHead>
                        <TableHead>Description of Work</TableHead>
                        <TableHead className="text-right w-32">Value</TableHead>
                        <TableHead className="text-right w-40">
                          From Previous Application
                        </TableHead>
                        <TableHead className="text-right w-16">%</TableHead>
                        <TableHead className="text-right w-40">
                          From This Period
                        </TableHead>
                        <TableHead className="text-right w-40">
                          Materials Presently Stored
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sovItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-sm text-muted-foreground py-8"
                          >
                            No schedule of values found for this commitment.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {sovItems.map((item) => {
                            const e = sovEdits[item.id] ?? {
                              work_completed_period: "",
                              materials_stored: "",
                            };
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="text-sm text-muted-foreground">
                                  {item.budget_code ?? "N/A"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {item.description}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {formatCurrency(item.scheduled_value)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {formatCurrency(item.from_previous)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                                  {pct(item.from_previous, item.scheduled_value)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      min="0"
                                      className="h-8 w-28 text-right tabular-nums text-sm"
                                      value={e.work_completed_period}
                                      placeholder=""
                                      onChange={(ev) =>
                                        setSovEdits((prev) => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            work_completed_period: ev.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      min="0"
                                      className="h-8 w-28 text-right tabular-nums text-sm"
                                      value={e.materials_stored}
                                      placeholder=""
                                      onChange={(ev) =>
                                        setSovEdits((prev) => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            materials_stored: ev.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}

                          {/* Totals row */}
                          <TableRow className="bg-muted/50 font-semibold text-sm border-t border-border">
                            <TableCell colSpan={2} className="text-muted-foreground">
                              Total
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(totals.scheduled)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(totals.fromPrevious)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {pct(totals.fromPrevious, totals.scheduled)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(totals.thisPeriod)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(totals.materialsStored)}
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------
              Approved Commitment Change Orders
          ---------------------------------------------------------------- */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setCosOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:text-primary transition-colors"
            >
              {cosOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              Approved Commitment Change Orders
            </button>

            {cosOpen && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Change Order</TableHead>
                        <TableHead>Description of Work</TableHead>
                        <TableHead className="text-right w-32">Value</TableHead>
                        <TableHead className="text-right w-40">
                          From Previous Application
                        </TableHead>
                        <TableHead className="text-right w-16">%</TableHead>
                        <TableHead className="text-right w-40">
                          From This Period
                        </TableHead>
                        <TableHead className="text-right w-40">
                          Materials Presently Stored
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedCOs.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-sm text-muted-foreground py-8"
                          >
                            There are no approved Commitment Change Orders added
                            to this Invoice
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {approvedCOs.map((co) => {
                            const e = coEdits[co.id] ?? {
                              work_completed_period: "",
                              materials_stored: "",
                            };
                            return (
                              <TableRow key={co.id}>
                                <TableCell className="text-sm font-medium">
                                  {co.change_order_number}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {co.title ?? co.description ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {formatCurrency(co.amount)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm">
                                  {formatCurrency(0)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                                  {pct(0, co.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <MoneyField
                                      label={`Change order ${co.change_order_number} work completed this period`}
                                      inline
                                      showCurrency={false}
                                      className="h-8 w-28 text-right tabular-nums text-sm"
                                      value={
                                        e.work_completed_period
                                          ? parseNum(e.work_completed_period)
                                          : undefined
                                      }
                                      placeholder=""
                                      onChange={(value) =>
                                        setCoEdits((prev) => ({
                                          ...prev,
                                          [co.id]: {
                                            ...prev[co.id],
                                            work_completed_period:
                                              value == null ? "" : String(value),
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <MoneyField
                                      label={`Change order ${co.change_order_number} materials stored`}
                                      inline
                                      showCurrency={false}
                                      className="h-8 w-28 text-right tabular-nums text-sm"
                                      value={
                                        e.materials_stored
                                          ? parseNum(e.materials_stored)
                                          : undefined
                                      }
                                      placeholder=""
                                      onChange={(value) =>
                                        setCoEdits((prev) => ({
                                          ...prev,
                                          [co.id]: {
                                            ...prev[co.id],
                                            materials_stored:
                                              value == null ? "" : String(value),
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/50 font-semibold text-sm border-t border-border">
                            <TableCell colSpan={2} className="text-muted-foreground">
                              Total
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(coTotals.scheduled)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(coTotals.fromPrevious)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {pct(coTotals.fromPrevious, coTotals.scheduled)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(coTotals.thisPeriod)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(coTotals.materialsStored)}
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------
              Attachments
          ---------------------------------------------------------------- */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Attachments:
            </Label>
            <p className="text-xs text-muted-foreground">
              Files can be attached after saving the invoice.
            </p>
          </div>

          {/* ----------------------------------------------------------------
              Action buttons
          ---------------------------------------------------------------- */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                router.push(`/${projectId}/invoices?tab=subcontractor`)
              }
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAction("draft")}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save as Draft"}
            </Button>
            <Button
              type="button"
              onClick={() => handleAction("under_review")}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </>
        )}
      </div>
    </PageShell>
  );
}
