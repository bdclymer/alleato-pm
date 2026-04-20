"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type {
  PaymentApplication,
  PaymentApplicationLineItem,
} from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";
import { SectionRuleHeading } from "@/components/layout/spacing";

interface ContractSummary {
  original_contract_value: number;
  revised_contract_value: number;
  title: string;
  contract_number: string | null;
  start_date: string | null;
}

interface InvoiceSummaryPreviewProps {
  invoice: PaymentApplication;
  lineItems: PaymentApplicationLineItem[];
  contract: ContractSummary;
  previousPaymentDue: number;
}


function LineRow({
  number,
  label,
  value,
  indent,
  highlight,
  bold,
}: {
  number: string;
  label: string;
  value?: number;
  indent?: boolean;
  highlight?: boolean;
  bold?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border",
        highlight && "bg-primary/5",
        bold && "font-semibold",
      )}
    >
      <td className="w-10 py-2 pr-2 text-right text-xs text-muted-foreground tabular-nums align-top">
        {number}
      </td>
      <td
        className={cn(
          "py-2 text-sm text-foreground",
          indent && "pl-6",
          highlight && "font-semibold",
        )}
      >
        {label}
      </td>
      <td
        className={cn(
          "py-2 pl-4 text-right text-sm tabular-nums text-foreground w-36",
          highlight && "font-semibold",
        )}
      >
        {value !== undefined ? formatCurrency(value) : ""}
      </td>
    </tr>
  );
}

export function InvoiceSummaryPreview({
  invoice,
  lineItems,
  contract,
  previousPaymentDue,
}: InvoiceSummaryPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate aggregated values from line items
  const totalScheduledValue = lineItems.reduce(
    (sum, li) => sum + li.scheduled_value,
    0,
  );
  const totalCompletedAndStored = lineItems.reduce(
    (sum, li) => sum + li.total_completed,
    0,
  );
  const totalRetainageWork = lineItems.reduce(
    (sum, li) =>
      sum +
      li.retainage_this_period_work +
      li.retainage_previous_work -
      li.retainage_released_work,
    0,
  );
  const totalRetainageMaterials = lineItems.reduce(
    (sum, li) =>
      sum +
      li.retainage_this_period_materials +
      li.retainage_previous_materials -
      li.retainage_released_materials,
    0,
  );

  const originalContractSum = contract.original_contract_value;
  const netChangeByCOs = contract.revised_contract_value - originalContractSum;
  const contractSumToDate = originalContractSum + netChangeByCOs;

  const completedAndStored =
    lineItems.length > 0 ? totalCompletedAndStored : 0;

  const retainageWorkPct =
    completedAndStored > 0
      ? ((totalRetainageWork / completedAndStored) * 100).toFixed(2)
      : "0.00";
  const retainageMaterialsPct =
    completedAndStored > 0
      ? ((totalRetainageMaterials / completedAndStored) * 100).toFixed(2)
      : "0.00";

  const totalRetainage = totalRetainageWork + totalRetainageMaterials;
  const totalEarnedLessRetainage = completedAndStored - totalRetainage;
  const currentPaymentDue = totalEarnedLessRetainage - previousPaymentDue;
  const balanceToFinish =
    lineItems.length > 0
      ? totalScheduledValue - completedAndStored
      : contractSumToDate;

  return (
    <section>
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <h3 className="text-base font-semibold text-foreground">
          Application for Payment
        </h3>
      </button>

      {isExpanded && (
        <div className="mt-4">
          {/* ── AIA G702 Document ────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Document header */}
            <div className="border-b border-border bg-muted/50 px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Application and Certificate for Payment
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    AIA Document G702
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Application No.
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {invoice.application_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Project / contract metadata row */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-xs">
              <div className="px-4 py-2.5">
                <span className="text-muted-foreground uppercase tracking-wider">
                  Project
                </span>
                <p className="mt-0.5 text-sm font-medium text-foreground truncate">
                  {contract.title}
                </p>
              </div>
              <div className="px-4 py-2.5">
                <span className="text-muted-foreground uppercase tracking-wider">
                  Contract No.
                </span>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {contract.contract_number ?? "—"}
                </p>
              </div>
              <div className="px-4 py-2.5">
                <span className="text-muted-foreground uppercase tracking-wider">
                  Period To
                </span>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {formatDate(invoice.period_to, "long")}
                </p>
              </div>
            </div>

            {/* ── Line items table ─────────────────────────────────── */}
            <div className="px-6 py-4">
              <p className="mb-3 text-xs italic text-muted-foreground">
                Application is made for payment, as shown below, in connection
                with the Contract. Continuation sheet, AIA Document G703, is
                attached.
              </p>

              <table className="w-full">
                <tbody>
                  <LineRow
                    number="1"
                    label="Original Contract Sum"
                    value={originalContractSum}
                  />
                  <LineRow
                    number="2"
                    label="Net change by Change Orders"
                    value={netChangeByCOs}
                  />
                  <LineRow
                    number="3"
                    label="Contract Sum to Date (Line 1 ± 2)"
                    value={contractSumToDate}
                    bold
                  />
                  <LineRow
                    number="4"
                    label="Total Completed & Stored to Date (Column G on G703)"
                    value={completedAndStored}
                  />
                  <LineRow number="5" label="Retainage" />
                  <LineRow
                    number="5a"
                    label={`${retainageWorkPct}% of Completed Work`}
                    value={totalRetainageWork}
                    indent
                  />
                  <LineRow
                    number="5b"
                    label={`${retainageMaterialsPct}% of Stored Material`}
                    value={totalRetainageMaterials}
                    indent
                  />
                  <LineRow
                    number=""
                    label="Total Retainage (Lines 5a + 5b or Column I Total on G703)"
                    value={totalRetainage}
                    bold
                  />
                  <LineRow
                    number="6"
                    label="Total Earned Less Retainage (Line 4 Less Line 5 Total)"
                    value={totalEarnedLessRetainage}
                  />
                  <LineRow
                    number="7"
                    label="Less Previous Certificates for Payment (Line 6 from prior Certificate)"
                    value={previousPaymentDue}
                  />
                  <LineRow
                    number="8"
                    label="Current Payment Due"
                    value={currentPaymentDue}
                    highlight
                  />
                  <LineRow
                    number="9"
                    label="Balance to Finish, Including Retainage (Line 3 less Line 6)"
                    value={balanceToFinish}
                  />
                </tbody>
              </table>
            </div>

            {/* ── Change Order Summary ─────────────────────────────── */}
            <div className="border-t border-border">
              <div className="px-6 py-4">
                <SectionRuleHeading label="Change Order Summary" />
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-xs font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="pb-2 text-right text-xs font-medium text-muted-foreground w-28">
                        Additions
                      </th>
                      <th className="pb-2 text-right text-xs font-medium text-muted-foreground w-28">
                        Deductions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 text-foreground">
                        Total changes approved in previous months by Owner
                      </td>
                      <td className="py-2 text-right tabular-nums">$0.00</td>
                      <td className="py-2 text-right tabular-nums">$0.00</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-2 text-foreground">
                        Total approved this month
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatCurrency(Math.max(0, netChangeByCOs))}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatCurrency(Math.abs(Math.min(0, netChangeByCOs)))}
                      </td>
                    </tr>
                    <tr className="border-b border-border font-semibold">
                      <td className="py-2">Totals</td>
                      <td className="py-2 text-right tabular-nums">
                        {formatCurrency(Math.max(0, netChangeByCOs))}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatCurrency(Math.abs(Math.min(0, netChangeByCOs)))}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="pt-2 text-foreground">
                        Net changes by Change Order
                      </td>
                      <td
                        className="pt-2 text-right tabular-nums"
                        colSpan={2}
                      >
                        {formatCurrency(netChangeByCOs)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
