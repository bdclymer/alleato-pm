"use client";

import { cn, formatCurrency } from "@/lib/utils";
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

interface InvoiceG702SummaryProps {
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
}

export function InvoiceG702Summary({
  lineItems,
  contract,
  previousPaymentDue,
}: InvoiceG702SummaryProps) {
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

  // Use line items total if available, otherwise fall back to scheduled value
  const completedAndStored =
    lineItems.length > 0 ? totalCompletedAndStored : 0;

  const retainageCompletedWork = totalRetainageWork;
  const retainageStoredMaterial = totalRetainageMaterials;
  const totalRetainage = retainageCompletedWork + retainageStoredMaterial;

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
      label: "Net Change by Change Orders",
      value: netChangeByCOs,
    },
    {
      number: "3",
      label: "Contract Sum to Date (1 +/- 2)",
      value: contractSumToDate,
    },
    {
      number: "4",
      label: "Total Completed and Stored to Date",
      value: completedAndStored,
    },
    {
      number: "5a",
      label: "Retainage: % of Completed Work",
      value: retainageCompletedWork,
      indent: true,
    },
    {
      number: "5b",
      label: "Retainage: % of Stored Material",
      value: retainageStoredMaterial,
      indent: true,
    },
    {
      number: "5",
      label: "Total Retainage (5a + 5b)",
      value: totalRetainage,
    },
    {
      number: "6",
      label: "Total Earned Less Retainage (4 - 5)",
      value: totalEarnedLessRetainage,
    },
    {
      number: "7",
      label: "Less Previous Certificates for Payment",
      value: previousPaymentDue,
    },
    {
      number: "8",
      label: "Current Payment Due",
      value: currentPaymentDue,
      highlight: true,
    },
    {
      number: "9",
      label: "Balance to Finish, Including Retainage",
      value: balanceToFinish,
    },
  ];

  return (
    <div className="space-y-3">
      <SectionRuleHeading label="AIA G702 — Contractor's Application for Payment" />

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground w-12">
                #
              </th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground w-40">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.number}
                className={cn(
                  "border-t border-border",
                  line.highlight && "bg-primary/5 font-semibold",
                )}
              >
                <td className="px-4 py-2 text-muted-foreground">
                  {line.number}
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-foreground",
                    line.indent && "pl-8",
                  )}
                >
                  {line.label}
                </td>
                <td className="px-4 py-2 text-right text-foreground tabular-nums">
                  {formatCurrency(line.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
