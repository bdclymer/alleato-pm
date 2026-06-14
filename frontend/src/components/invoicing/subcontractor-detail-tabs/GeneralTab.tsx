"use client";

import { useMemo, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { Calendar as CalendarIcon, Paperclip, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { InvoiceStatusBadge } from "@/components/invoicing/InvoiceStatusBadge";
import { LabelValueRow } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import {
  formatCurrency,
  formatDate,
  type InvoiceRollup,
  type LineItemEdits,
  type SovLineItem,
} from "./shared";
import { SectionRuleHeading } from "@/components/layout/spacing";

/* ─── Date helpers ─── */

const DATE_FORMATS = [
  "MM/dd/yyyy",
  "M/d/yyyy",
  "MM-dd-yyyy",
  "M-d-yyyy",
  "yyyy-MM-dd",
  "MMM d, yyyy",
  "MMMM d, yyyy",
];

function parseInputDate(input: string): Date | undefined {
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(input, fmt, new Date());
    if (isValid(parsed) && parsed.getFullYear() > 1900) return parsed;
  }
  return undefined;
}

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isValid(d) ? format(d, "MM/dd/yyyy") : iso;
}

function displayToIso(display: string): string {
  const d = parseInputDate(display);
  return d ? format(d, "yyyy-MM-dd") : "";
}

/* ─── Inline date picker ─── */

function InlineDatePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const dateValue = parseInputDate(value);

  return (
    <div className="flex gap-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="MM/DD/YYYY"
        aria-label={label}
        className="h-8 w-44"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Open calendar for ${label}`}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              onChange(date ? format(date, "MM/dd/yyyy") : "");
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ─── Types ─── */

type Attachment = {
  id?: string | number;
  file_name?: string | null;
  url?: string | null;
};

type InvoiceShape = {
  contract_number?: string | null;
  contract_title?: string | null;
  contract_company_name?: string | null;
  billing_period_name?: string | null;
  invoice_number?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  billing_date?: string | null;
  status?: string | null;
  percent_complete?: number | null;
  approved_at?: string | null;
  submitted_at?: string | null;
  notes?: string | null;
  attachments?: Attachment[] | null;
  rollup?: InvoiceRollup | null;
};

/* ─── Bulk Retainage Sidebar ─── */

function RetainageSidebar({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (type: "work" | "materials", pct: number) => void;
}) {
  const [workPct, setWorkPct] = useState("");
  const [matPct, setMatPct] = useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Set Retainage On All Line Items</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Work Completed</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={workPct}
                onChange={(e) => setWorkPct(e.target.value)}
                placeholder="10.00"
                className="h-8 w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Button
                size="sm"
                onClick={() => {
                  const v = Number(workPct);
                  if (!Number.isNaN(v) && v >= 0) onApply("work", v);
                }}
              >
                Set
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Materials Stored</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={matPct}
                onChange={(e) => setMatPct(e.target.value)}
                placeholder="10.00"
                className="h-8 w-24"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Button
                size="sm"
                onClick={() => {
                  const v = Number(matPct);
                  if (!Number.isNaN(v) && v >= 0) onApply("materials", v);
                }}
              >
                Set
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Main Component ─── */

interface GeneralTabProps {
  invoice: InvoiceShape;
  lineItems: SovLineItem[];
  editing?: boolean;
  canEdit: boolean;
  projectId?: string;
  invoiceId?: number;
  onSave?: () => Promise<void>;
  onCancel?: () => void;
  onRefetch: () => Promise<unknown>;
}

export function GeneralTab({
  invoice,
  lineItems,
  editing = false,
  canEdit,
  projectId,
  invoiceId,
  onSave,
  onCancel,
  onRefetch,
}: GeneralTabProps) {
  const attachments = invoice.attachments ?? [];

  /* ── Summary fields (inline edit) ── */
  const [fields, setFields] = useState({
    invoice_number: invoice.invoice_number ?? "",
    period_start: isoToDisplay(invoice.period_start?.split("T")[0] ?? ""),
    period_end: isoToDisplay(invoice.period_end?.split("T")[0] ?? ""),
    billing_date: isoToDisplay(invoice.billing_date?.split("T")[0] ?? ""),
    notes: invoice.notes ?? "",
  });
  const [savingSummary, setSavingSummary] = useState(false);

  function updateField(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveSummary() {
    if (!projectId || !invoiceId) return;
    setSavingSummary(true);
    try {
      const payload = {
        ...fields,
        period_start: displayToIso(fields.period_start),
        period_end: displayToIso(fields.period_end),
        billing_date: displayToIso(fields.billing_date),
      };
      await apiFetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      toast.success("Invoice updated");
      await onSave?.();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to save");
    } finally {
      setSavingSummary(false);
    }
  }

  /* ── Line item edit state ── */
  const [editingSOV, setEditingSOV] = useState(false);
  const [edits, setEdits] = useState<LineItemEdits>({});
  const [savingSOV, setSavingSOV] = useState(false);
  const [retainageSidebarOpen, setRetainageSidebarOpen] = useState(false);

  const displayLineItems = useMemo(() => {
    if (!editingSOV) return lineItems;
    return lineItems.map((li) => {
      const e = edits[li.id];
      if (!e) return li;
      const scheduled = Number(li.scheduled_value) || 0;
      const previous = Number(li.work_completed_previous) || 0;
      const thisPeriod = Number(e.work_completed_period) || 0;
      const stored = Number(e.materials_stored) || 0;
      const workPct = Number(e.retainage_pct) || 0;
      const matPct = Number(e.materials_retainage_pct) || 0;
      const totalCompleted = previous + thisPeriod + stored;
      // Retainage applies only to THIS period's billing, not cumulative
      const workRetainage = (thisPeriod * workPct) / 100;
      const matRetainage = (stored * matPct) / 100;
      const prevWorkRet = Number(li.previous_work_retainage) || 0;
      const prevMatRet = Number(li.previous_materials_retainage) || 0;
      const workReleased = Number(e.work_retainage_released) || 0;
      const matReleased = Number(e.materials_retainage_released) || 0;
      return {
        ...li,
        work_completed_period: thisPeriod,
        materials_stored: stored,
        retainage_pct: workPct,
        materials_retainage_pct: matPct,
        retainage_amount: workRetainage,
        materials_retainage_amount: matRetainage,
        total_completed_stored: totalCompleted,
        work_completed_pct:
          scheduled > 0 ? (totalCompleted / scheduled) * 100 : 0,
        balance_to_finish: scheduled - totalCompleted,
        // Currently retained = previous + this period - released
        _work_currently_retained: prevWorkRet + workRetainage - workReleased,
        _mat_currently_retained: prevMatRet + matRetainage - matReleased,
        net_amount_this_period:
          thisPeriod + stored - (workRetainage + matRetainage) + workReleased + matReleased,
      };
    });
  }, [editingSOV, edits, lineItems]);

  /* Computed retainage columns (derived from existing DB fields) */
  function getWorkCurrentlyRetained(li: SovLineItem) {
    const prev = Number(li.previous_work_retainage) || 0;
    const thisPeriod = Number(li.retainage_amount) || 0;
    const released = Number(li.work_retainage_released) || 0;
    return prev + thisPeriod - released;
  }
  function getMatCurrentlyRetained(li: SovLineItem) {
    const prev = Number(li.previous_materials_retainage) || 0;
    const thisPeriod = Number(li.materials_retainage_amount) || 0;
    const released = Number(li.materials_retainage_released) || 0;
    return prev + thisPeriod - released;
  }
  function getTotalPreviousRetainage(li: SovLineItem) {
    return (
      (Number(li.previous_work_retainage) || 0) +
      (Number(li.previous_materials_retainage) || 0)
    );
  }

  const totals = displayLineItems.reduce(
    (acc, li) => {
      acc.scheduled += li.scheduled_value ?? 0;
      acc.previous += li.work_completed_previous ?? 0;
      acc.thisPeriod += li.work_completed_period ?? 0;
      acc.stored += li.materials_stored ?? 0;
      acc.totalCompleted += li.total_completed_stored ?? 0;
      acc.workRetainage += li.retainage_amount ?? 0;
      acc.matRetainage += li.materials_retainage_amount ?? 0;
      acc.prevWorkRet += li.previous_work_retainage ?? 0;
      acc.prevMatRet += li.previous_materials_retainage ?? 0;
      acc.workReleased += li.work_retainage_released ?? 0;
      acc.matReleased += li.materials_retainage_released ?? 0;
      acc.workCurrentlyRetained += getWorkCurrentlyRetained(li);
      acc.matCurrentlyRetained += getMatCurrentlyRetained(li);
      acc.net += li.net_amount_this_period ?? 0;
      return acc;
    },
    {
      scheduled: 0,
      previous: 0,
      thisPeriod: 0,
      stored: 0,
      totalCompleted: 0,
      workRetainage: 0,
      matRetainage: 0,
      prevWorkRet: 0,
      prevMatRet: 0,
      workReleased: 0,
      matReleased: 0,
      workCurrentlyRetained: 0,
      matCurrentlyRetained: 0,
      net: 0,
    },
  );

  function enterEdit() {
    const seed: LineItemEdits = {};
    for (const li of lineItems) {
      seed[li.id] = {
        work_completed_period: String(li.work_completed_period ?? 0),
        materials_stored: String(li.materials_stored ?? 0),
        retainage_pct: String(li.retainage_pct ?? 0),
        materials_retainage_pct: String(li.materials_retainage_pct ?? 0),
        work_retainage_released: String(li.work_retainage_released ?? 0),
        materials_retainage_released: String(li.materials_retainage_released ?? 0),
      };
    }
    setEdits(seed);
    setEditingSOV(true);
  }

  function cancelSOVEdit() {
    setEdits({});
    setEditingSOV(false);
  }

  function applyBulkRetainage(type: "work" | "materials", pct: number) {
    setEdits((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        next[Number(id)] = {
          ...next[Number(id)],
          ...(type === "work"
            ? { retainage_pct: String(pct) }
            : { materials_retainage_pct: String(pct) }),
        };
      }
      return next;
    });
    toast.success(
      `Set ${type === "work" ? "work" : "materials"} retainage to ${pct}% on all lines`,
    );
  }

  async function saveSOVEdits() {
    const updates = Object.entries(edits).map(([id, v]) => ({
      id: Number(id),
      work_completed_period: Number(v.work_completed_period) || 0,
      materials_stored: Number(v.materials_stored) || 0,
      retainage_pct: Number(v.retainage_pct) || 0,
      materials_retainage_pct: Number(v.materials_retainage_pct) || 0,
      work_retainage_released: Number(v.work_retainage_released) || 0,
      materials_retainage_released: Number(v.materials_retainage_released) || 0,
    }));
    setSavingSOV(true);
    try {
      await apiFetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/line-items`,
        {
          method: "PATCH",
          body: JSON.stringify({ updates }),
        },
      );
      toast.success("SOV updated");
      setEditingSOV(false);
      setEdits({});
      await onRefetch();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to save");
    } finally {
      setSavingSOV(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Summary edit actions ── */}
      {editing && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={savingSummary}
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" disabled={savingSummary} onClick={handleSaveSummary}>
            {savingSummary ? "Saving…" : "Save"}
          </Button>
        </div>
      )}

      {/* ── Invoice Information (top section) ── */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-x-20 gap-y-0">
          <dl className="space-y-4 text-sm">
            <LabelValueRow
              label="Period Start"
              missing={!editing && !invoice.period_start}
            >
              {editing ? (
                <InlineDatePicker
                  value={fields.period_start}
                  onChange={(v) => updateField("period_start", v)}
                  label="Period Start"
                />
              ) : (
                formatDate(invoice.period_start)
              )}
            </LabelValueRow>
            <LabelValueRow
              label="Billing Date"
              missing={!editing && !invoice.billing_date}
            >
              {editing ? (
                <InlineDatePicker
                  value={fields.billing_date}
                  onChange={(v) => updateField("billing_date", v)}
                  label="Billing Date"
                />
              ) : (
                formatDate(invoice.billing_date)
              )}
            </LabelValueRow>
            <LabelValueRow
              label="Commitment #"
              missing={!invoice.contract_number}
            >
              {invoice.contract_number ?? "—"}
              {invoice.contract_title ? ` — ${invoice.contract_title}` : ""}
            </LabelValueRow>
            <LabelValueRow label="Status">
              {invoice.status ? (
                <InvoiceStatusBadge status={invoice.status} />
              ) : (
                "—"
              )}
            </LabelValueRow>
            <LabelValueRow
              label="Payment Date"
              missing={!invoice.approved_at}
            >
              {formatDate(invoice.approved_at)}
            </LabelValueRow>
            <LabelValueRow
              label="Overall Comments"
              missing={!editing && !invoice.notes}
              valueClassName="leading-relaxed font-normal text-foreground"
            >
              {editing ? (
                <Textarea
                  className="min-h-16 text-sm"
                  value={fields.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Add comments…"
                />
              ) : (
                invoice.notes ?? "—"
              )}
            </LabelValueRow>
          </dl>
          <dl className="space-y-4 text-sm">
            <LabelValueRow
              label="Period End"
              missing={!editing && !invoice.period_end}
            >
              {editing ? (
                <InlineDatePicker
                  value={fields.period_end}
                  onChange={(v) => updateField("period_end", v)}
                  label="Period End"
                />
              ) : (
                formatDate(invoice.period_end)
              )}
            </LabelValueRow>
            <LabelValueRow
              label="Invoice #"
              missing={!editing && !invoice.invoice_number}
            >
              {editing ? (
                <Input
                  type="text"
                  className="h-8 w-44"
                  value={fields.invoice_number}
                  onChange={(e) =>
                    updateField("invoice_number", e.target.value)
                  }
                  placeholder="Invoice number"
                />
              ) : (
                invoice.invoice_number ?? "—"
              )}
            </LabelValueRow>
            <LabelValueRow
              label="Contract Company"
              missing={!invoice.contract_company_name}
            >
              {invoice.contract_company_name ?? "—"}
            </LabelValueRow>
            <LabelValueRow label="Percent Complete">
              {`${(invoice.percent_complete ?? 0).toFixed(2)}%`}
            </LabelValueRow>
            <LabelValueRow
              label="Submitted"
              missing={!invoice.submitted_at}
            >
              {formatDate(invoice.submitted_at)}
            </LabelValueRow>
            <LabelValueRow
              label="Attachments"
              missing={attachments.length === 0}
            >
              {attachments.length === 0 ? (
                "—"
              ) : (
                <ul className="space-y-1">
                  {attachments.map((att, idx) => (
                    <li
                      key={att.id ?? idx}
                      className="flex items-center gap-2"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      {att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {att.file_name ?? "Attachment"}
                        </a>
                      ) : (
                        <span>{att.file_name ?? "Attachment"}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </LabelValueRow>
          </dl>
        </div>
      </section>

      {/* ── G703 Line Items Table ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <SectionRuleHeading label="Line Items" />
            <p className="text-xs text-muted-foreground">
              {lineItems.length} line item
              {lineItems.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && lineItems.length > 0 && (
              <>
                {editingSOV ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRetainageSidebarOpen(true)}
                    >
                      Set Retainage
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingSOV}
                      onClick={cancelSOVEdit}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={savingSOV}
                      onClick={saveSOVEdits}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={enterEdit}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {lineItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No line items yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Row 1: Column group headers (A through H + Retainage) */}
                <TableRow className="border-b-0">
                  <TableHead className="w-12" rowSpan={3} />
                  <TableHead className="text-center text-xs font-medium text-muted-foreground">
                    A
                  </TableHead>
                  <TableHead className="text-center text-xs font-medium text-muted-foreground">
                    B
                  </TableHead>
                  <TableHead className="text-center text-xs font-medium text-muted-foreground">
                    C
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center text-xs font-medium text-muted-foreground"
                  >
                    D &amp; E
                  </TableHead>
                  <TableHead className="text-center text-xs font-medium text-muted-foreground">
                    F
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center text-xs font-medium text-muted-foreground"
                  >
                    G
                  </TableHead>
                  <TableHead className="text-center text-xs font-medium text-muted-foreground">
                    H
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center text-xs font-medium border-l border-border"
                  >
                    From Previous Application
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center text-xs font-medium border-l border-border"
                  >
                    Retained This Period
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center text-xs font-medium border-l border-border"
                  >
                    Released This Period
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center text-xs font-medium border-l border-border"
                  >
                    Currently Retained
                  </TableHead>
                </TableRow>
                {/* Row 2: Actual column labels */}
                <TableRow>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Budget Code
                  </TableHead>
                  <TableHead className="text-xs">
                    Description Of Work
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Scheduled Value
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    From Previous
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    This Period
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Materials Stored
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Total Completed
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    %
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Balance To Finish
                  </TableHead>
                  {/* From Previous Application */}
                  <TableHead className="text-right text-xs whitespace-nowrap border-l border-border">
                    Work $
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Materials $
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Total
                  </TableHead>
                  {/* Retained This Period */}
                  <TableHead className="text-right text-xs whitespace-nowrap border-l border-border">
                    Work %
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Work $
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Materials %
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Materials $
                  </TableHead>
                  {/* Released This Period */}
                  <TableHead className="text-right text-xs whitespace-nowrap border-l border-border">
                    Work $
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Materials $
                  </TableHead>
                  {/* Currently Retained */}
                  <TableHead className="text-right text-xs whitespace-nowrap border-l border-border">
                    Work $
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Materials $
                  </TableHead>
                  <TableHead className="text-right text-xs whitespace-nowrap">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLineItems.map((li, idx) => {
                  const e = edits[li.id];
                  const prevWork = Number(li.previous_work_retainage) || 0;
                  const prevMat = Number(li.previous_materials_retainage) || 0;
                  const workCurRetained = getWorkCurrentlyRetained(li);
                  const matCurRetained = getMatCurrentlyRetained(li);

                  return (
                    <TableRow key={li.id}>
                      {/* # */}
                      <TableCell className="text-muted-foreground tabular-nums w-12">
                        {li.sort_order ?? idx + 1}
                      </TableCell>
                      {/* A: Budget Code */}
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">
                        {li.budget_code ?? "—"}
                      </TableCell>
                      {/* B: Description */}
                      <TableCell className="font-medium text-xs">
                        {li.description ?? "—"}
                      </TableCell>
                      {/* C: Scheduled Value */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(li.scheduled_value)}
                      </TableCell>
                      {/* D: From Previous */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(li.work_completed_previous)}
                      </TableCell>
                      {/* E: This Period */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {editingSOV && e ? (
                          <Input
                            type="number"
                            
                            step="0.01"
                            className="h-7 w-24 ml-auto text-right tabular-nums text-xs"
                            value={e.work_completed_period}
                            onChange={(ev) =>
                              setEdits((prev) => ({
                                ...prev,
                                [li.id]: {
                                  ...prev[li.id],
                                  work_completed_period: ev.target.value,
                                },
                              }))
                            }
                          />
                        ) : (
                          formatCurrency(li.work_completed_period)
                        )}
                      </TableCell>
                      {/* F: Materials Stored */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {editingSOV && e ? (
                          <Input
                            type="number"
                            
                            step="0.01"
                            className="h-7 w-24 ml-auto text-right tabular-nums text-xs"
                            value={e.materials_stored}
                            onChange={(ev) =>
                              setEdits((prev) => ({
                                ...prev,
                                [li.id]: {
                                  ...prev[li.id],
                                  materials_stored: ev.target.value,
                                },
                              }))
                            }
                          />
                        ) : (
                          formatCurrency(li.materials_stored)
                        )}
                      </TableCell>
                      {/* G: Total Completed */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(li.total_completed_stored)}
                      </TableCell>
                      {/* G%: Percent */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {li.work_completed_pct != null
                          ? `${Number(li.work_completed_pct).toFixed(1)}%`
                          : "—"}
                      </TableCell>
                      {/* H: Balance To Finish */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(li.balance_to_finish)}
                      </TableCell>
                      {/* From Previous: Work $ */}
                      <TableCell className="text-right tabular-nums text-xs border-l border-border">
                        {formatCurrency(prevWork)}
                      </TableCell>
                      {/* From Previous: Materials $ */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(prevMat)}
                      </TableCell>
                      {/* From Previous: Total */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(prevWork + prevMat)}
                      </TableCell>
                      {/* Retained This Period: Work % */}
                      <TableCell className="text-right tabular-nums text-xs border-l border-border">
                        {editingSOV && e ? (
                          <Input
                            type="number"
                            
                            step="0.01"
                            className="h-7 w-16 ml-auto text-right tabular-nums text-xs"
                            value={e.retainage_pct}
                            onChange={(ev) =>
                              setEdits((prev) => ({
                                ...prev,
                                [li.id]: {
                                  ...prev[li.id],
                                  retainage_pct: ev.target.value,
                                },
                              }))
                            }
                          />
                        ) : li.retainage_pct != null ? (
                          `${Number(li.retainage_pct).toFixed(2)}%`
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {/* Retained This Period: Work $ */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(li.retainage_amount)}
                      </TableCell>
                      {/* Retained This Period: Materials % */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {editingSOV && e ? (
                          <Input
                            type="number"
                            
                            step="0.01"
                            className="h-7 w-16 ml-auto text-right tabular-nums text-xs"
                            value={e.materials_retainage_pct}
                            onChange={(ev) =>
                              setEdits((prev) => ({
                                ...prev,
                                [li.id]: {
                                  ...prev[li.id],
                                  materials_retainage_pct: ev.target.value,
                                },
                              }))
                            }
                          />
                        ) : li.materials_retainage_pct != null ? (
                          `${Number(li.materials_retainage_pct).toFixed(2)}%`
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {/* Retained This Period: Materials $ */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(li.materials_retainage_amount)}
                      </TableCell>
                      {/* Released This Period: Work $ */}
                      <TableCell className="text-right tabular-nums text-xs border-l border-border">
                        {formatCurrency(li.work_retainage_released)}
                      </TableCell>
                      {/* Released This Period: Materials $ */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(li.materials_retainage_released)}
                      </TableCell>
                      {/* Currently Retained: Work $ */}
                      <TableCell className="text-right tabular-nums text-xs border-l border-border">
                        {formatCurrency(workCurRetained)}
                      </TableCell>
                      {/* Currently Retained: Materials $ */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(matCurRetained)}
                      </TableCell>
                      {/* Currently Retained: Total */}
                      <TableCell className="text-right tabular-nums text-xs">
                        {formatCurrency(workCurRetained + matCurRetained)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3} className="text-xs">
                    Total
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.scheduled)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.previous)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.thisPeriod)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.stored)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.totalCompleted)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {totals.scheduled > 0
                      ? `${((totals.totalCompleted / totals.scheduled) * 100).toFixed(1)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.scheduled - totals.totalCompleted)}
                  </TableCell>
                  {/* From Previous totals */}
                  <TableCell className="text-right tabular-nums text-xs border-l border-border">
                    {formatCurrency(totals.prevWorkRet)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.prevMatRet)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.prevWorkRet + totals.prevMatRet)}
                  </TableCell>
                  {/* Retained This Period totals */}
                  <TableCell className="text-right tabular-nums text-xs border-l border-border" />
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.workRetainage)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs" />
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.matRetainage)}
                  </TableCell>
                  {/* Released This Period totals */}
                  <TableCell className="text-right tabular-nums text-xs border-l border-border">
                    {formatCurrency(totals.workReleased)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.matReleased)}
                  </TableCell>
                  {/* Currently Retained totals */}
                  <TableCell className="text-right tabular-nums text-xs border-l border-border">
                    {formatCurrency(totals.workCurrentlyRetained)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(totals.matCurrentlyRetained)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    {formatCurrency(
                      totals.workCurrentlyRetained +
                        totals.matCurrentlyRetained,
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ── G702 Application for Payment rollup ── */}
      {invoice.rollup && (
        <section className="space-y-4">
          <SectionRuleHeading label="Application for Payment" />
          <dl className="divide-y divide-border text-sm">
            {[
              {
                label: "1. Original Contract Sum",
                value: invoice.rollup.original_contract_sum,
              },
              {
                label: "2. Net Change by Change Orders",
                value: invoice.rollup.net_change_by_change_orders,
              },
              {
                label: "3. Contract Sum to Date (1 + 2)",
                value: invoice.rollup.contract_sum_to_date,
                emphasis: true,
              },
              {
                label: "4. Total Completed & Stored to Date",
                value: invoice.rollup.total_completed_and_stored,
              },
              {
                label: "5a. Work Retainage",
                value: invoice.rollup.total_work_retainage ?? 0,
              },
              {
                label: "5b. Materials Retainage",
                value: invoice.rollup.total_materials_retainage ?? 0,
              },
              {
                label: "5. Total Retainage (5a + 5b)",
                value: invoice.rollup.total_retainage,
              },
              {
                label: "6. Total Earned Less Retainage (4 − 5)",
                value: invoice.rollup.total_earned_less_retainage,
                emphasis: true,
              },
              {
                label: "7. Less Previous Certificates for Payment",
                value: invoice.rollup.less_previous_certificates,
              },
              {
                label: "8. Current Payment Due (6 − 7)",
                value: invoice.rollup.current_payment_due,
                emphasis: true,
              },
              {
                label: "9. Balance to Finish, Including Retainage (3 − 6)",
                value: invoice.rollup.balance_to_finish_including_retainage,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-2"
              >
                <dt
                  className={
                    row.emphasis
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {row.label}
                </dt>
                <dd
                  className={`tabular-nums ${
                    row.emphasis
                      ? "font-semibold text-foreground"
                      : "text-foreground"
                  }`}
                >
                  {formatCurrency(row.value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Bulk retainage sidebar */}
      <RetainageSidebar
        open={retainageSidebarOpen}
        onOpenChange={setRetainageSidebarOpen}
        onApply={applyBulkRetainage}
      />
    </div>
  );
}
