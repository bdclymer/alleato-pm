"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  PaymentApplication,
  PaymentApplicationLineItem,
} from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

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

interface G702Line {
  number: string;
  label: string;
  value: number;
  indent?: boolean;
  highlight?: boolean;
  bold?: boolean;
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

  const lines: G702Line[] = [
    {
      number: "1",
      label: "Original Contract Sum",
      value: originalContractSum,
    },
    {
      number: "2",
      label: "Net change by change orders",
      value: netChangeByCOs,
    },
    {
      number: "3",
      label: "Contract sum to date (line 1 ± 2)",
      value: contractSumToDate,
    },
    {
      number: "4",
      label:
        "Total completed and stored to date (Column G on detail sheet)",
      value: completedAndStored,
    },
    {
      number: "5",
      label: "Retainage",
      value: -1, // placeholder — sub-items follow
    },
    {
      number: "5a",
      label: `${retainageWorkPct}% of completed work`,
      value: totalRetainageWork,
      indent: true,
    },
    {
      number: "5b",
      label: `${retainageMaterialsPct}% of stored material`,
      value: totalRetainageMaterials,
      indent: true,
    },
    {
      number: "",
      label:
        "Total retainage (Line 5a + 5b or total in column I of detail sheet)",
      value: totalRetainage,
      bold: true,
    },
    {
      number: "6",
      label: "Total earned less retainage (Line 4 less Line 5 Total)",
      value: totalEarnedLessRetainage,
    },
    {
      number: "7",
      label:
        "Less previous certificates for payment (Line 6 from prior certificate)",
      value: previousPaymentDue,
    },
    {
      number: "8",
      label: "Current payment due",
      value: currentPaymentDue,
      highlight: true,
    },
    {
      number: "9",
      label: "Balance to finish, including retainage",
      value: balanceToFinish,
    },
  ];

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
          Summary Preview
        </h3>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* G702 — Contractor's Application for Payment */}
          <div>
            <p className="text-xs text-muted-foreground italic mb-3">
              Application is made for payment, as shown below, in connection
              with the Contract. Continuation sheet is attached.
            </p>

            <div className="space-y-0">
              {lines.map((line, idx) => {
                // Line 5 header — label only, no value
                if (line.number === "5" && line.value === -1) {
                  return (
                    <div
                      key={`line-${idx}`}
                      className="flex items-baseline justify-between py-1.5"
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="w-6 text-xs text-muted-foreground tabular-nums">
                          5
                        </span>
                        <span className="text-sm text-foreground">
                          Retainage
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`line-${idx}`}
                    className={cn(
                      "flex items-baseline justify-between py-1.5",
                      line.highlight &&
                        "bg-primary/5 rounded px-2 -mx-2 font-semibold",
                      line.bold && "font-semibold",
                    )}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="w-6 text-xs text-muted-foreground tabular-nums">
                        {line.number}
                      </span>
                      <span
                        className={cn(
                          "text-sm text-foreground",
                          line.indent && "ml-4",
                        )}
                      >
                        {line.label}
                      </span>
                    </div>
                    <span className="text-sm tabular-nums text-foreground ml-4 shrink-0">
                      {formatCurrency(line.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change Order Summary */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Change Order Summary
            </h4>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Change Order Summary
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground w-32">
                      Additions
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground w-32">
                      Deductions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">
                      Total changes approved in previous months by Owner/Client
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      $0.00
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      $0.00
                    </td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">
                      Total approved this Month
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(Math.max(0, netChangeByCOs))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(Math.abs(Math.min(0, netChangeByCOs)))}
                    </td>
                  </tr>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-4 py-2">Totals</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(Math.max(0, netChangeByCOs))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatCurrency(Math.abs(Math.min(0, netChangeByCOs)))}
                    </td>
                  </tr>
                  <tr className="border-t border-border bg-muted font-semibold">
                    <td className="px-4 py-2">Net changes by change order</td>
                    <td
                      className="px-4 py-2 text-right tabular-nums"
                      colSpan={2}
                    >
                      {formatCurrency(netChangeByCOs)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
