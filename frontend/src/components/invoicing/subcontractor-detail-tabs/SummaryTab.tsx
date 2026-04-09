"use client";

import { Paperclip } from "lucide-react";

import { InvoiceStatusBadge } from "@/components/invoicing/InvoiceStatusBadge";
import { formatCurrency, formatDate, type InvoiceRollup } from "./shared";

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-3 first:pt-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function SummaryTab({ invoice }: { invoice: InvoiceShape }) {
  const attachments = invoice.attachments ?? [];

  return (
    <div className="space-y-6">
      {/* Invoice Information — mirrors Procore's Summary layout */}
      <section className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Invoice Information
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <Field label="Period Start">{formatDate(invoice.period_start)}</Field>
          <Field label="Period End">{formatDate(invoice.period_end)}</Field>
          <Field label="Billing Date">{formatDate(invoice.billing_date)}</Field>
          <Field label="Invoice #">{invoice.invoice_number ?? "—"}</Field>
          <Field label="Commitment #">
            {invoice.contract_number ?? "—"}
            {invoice.contract_title ? ` — ${invoice.contract_title}` : ""}
          </Field>
          <Field label="Contract Company">
            {invoice.contract_company_name ?? "—"}
          </Field>
          <Field label="Status">
            {invoice.status ? (
              <InvoiceStatusBadge status={invoice.status} />
            ) : (
              "—"
            )}
          </Field>
          <Field label="Percent Complete">
            {`${(invoice.percent_complete ?? 0).toFixed(2)}%`}
          </Field>
          <Field label="Payment Date">{formatDate(invoice.approved_at)}</Field>
          <Field label="Submitted">{formatDate(invoice.submitted_at)}</Field>
          <div className="md:col-span-2 border-b border-border py-3">
            <dt className="text-xs text-muted-foreground">Overall Comments</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {invoice.notes ?? "—"}
            </dd>
          </div>
          <div className="md:col-span-2 py-3">
            <dt className="text-xs text-muted-foreground">Attachments</dt>
            <dd className="mt-1 text-sm text-foreground">
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
            </dd>
          </div>
        </dl>
      </section>

      {/* Application for Payment rollup (AIA G702-style) */}
      {invoice.rollup && (
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
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
