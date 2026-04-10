"use client";

import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { Calendar as CalendarIcon, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, type InvoiceRollup } from "./shared";

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

interface SummaryTabProps {
  invoice: InvoiceShape;
  editing?: boolean;
  projectId?: string;
  invoiceId?: number;
  onSave?: () => Promise<void>;
  onCancel?: () => void;
}

export function SummaryTab({
  invoice,
  editing = false,
  projectId,
  invoiceId,
  onSave,
  onCancel,
}: SummaryTabProps) {
  const attachments = invoice.attachments ?? [];

  const [fields, setFields] = useState({
    invoice_number: invoice.invoice_number ?? "",
    period_start: isoToDisplay(invoice.period_start?.split("T")[0] ?? ""),
    period_end: isoToDisplay(invoice.period_end?.split("T")[0] ?? ""),
    billing_date: isoToDisplay(invoice.billing_date?.split("T")[0] ?? ""),
    notes: invoice.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  function updateField(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!projectId || !invoiceId) return;
    setSaving(true);
    try {
      const payload = {
        ...fields,
        period_start: displayToIso(fields.period_start),
        period_end: displayToIso(fields.period_end),
        billing_date: displayToIso(fields.billing_date),
      };
      const res = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save");
      }
      toast.success("Invoice updated");
      await onSave?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Edit actions bar */}
      {editing && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}

      {/* Invoice Information */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-x-20 gap-y-0">
          <dl className="space-y-4 text-sm">
            <LabelValueRow label="Period Start" missing={!editing && !invoice.period_start}>
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
            <LabelValueRow label="Billing Date" missing={!editing && !invoice.billing_date}>
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
            <LabelValueRow label="Commitment #" missing={!invoice.contract_number}>
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
            <LabelValueRow label="Payment Date" missing={!invoice.approved_at}>
              {formatDate(invoice.approved_at)}
            </LabelValueRow>
            <LabelValueRow
              label="Overall Comments"
              missing={!editing && !invoice.notes}
              valueClassName="leading-relaxed font-normal text-foreground"
            >
              {editing ? (
                <Textarea
                  className="min-h-[60px] text-sm"
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
            <LabelValueRow label="Period End" missing={!editing && !invoice.period_end}>
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
            <LabelValueRow label="Invoice #" missing={!editing && !invoice.invoice_number}>
              {editing ? (
                <Input
                  type="text"
                  className="h-8 w-44"
                  value={fields.invoice_number}
                  onChange={(e) => updateField("invoice_number", e.target.value)}
                  placeholder="Invoice number"
                />
              ) : (
                invoice.invoice_number ?? "—"
              )}
            </LabelValueRow>
            <LabelValueRow label="Contract Company" missing={!invoice.contract_company_name}>
              {invoice.contract_company_name ?? "—"}
            </LabelValueRow>
            <LabelValueRow label="Percent Complete">
              {`${(invoice.percent_complete ?? 0).toFixed(2)}%`}
            </LabelValueRow>
            <LabelValueRow label="Submitted" missing={!invoice.submitted_at}>
              {formatDate(invoice.submitted_at)}
            </LabelValueRow>
            <LabelValueRow label="Attachments" missing={attachments.length === 0}>
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

      {/* Application for Payment rollup (AIA G702-style) */}
      {invoice.rollup && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Application for Payment
          </h2>
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
    </div>
  );
}
