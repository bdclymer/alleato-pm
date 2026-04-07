"use client";

import type { ChangeEventDetailLineItem } from "@/types/change-events";
import type { VerticalMarkup } from "@/hooks/use-vertical-markup";
import { useMemo, useState } from "react";
import { Text } from "@/components/ds/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ds";
import { Search } from "lucide-react";
import { formatCurrency } from "@/config/tables";

interface ChangeEventLineItemsTableProps {
  lineItems: ChangeEventDetailLineItem[];
  markupRows: VerticalMarkup[];
  expectingRevenue?: boolean;
}

function formatBudgetCodeText(li: ChangeEventDetailLineItem): string {
  if (!li.budgetLine) return "--";
  const cc = li.budgetLine.cost_code;
  if (cc?.title) {
    return cc.division_title ? `${cc.division_title} - ${cc.title}` : cc.title;
  }
  return li.budgetLine.description || "--";
}

function BudgetCodeCell({ li }: { li: ChangeEventDetailLineItem }) {
  if (!li.budgetLine) return <span>--</span>;
  const cc = li.budgetLine.cost_code;
  const codeAndTitle = cc?.title
    ? (cc.division_title ? `${cc.division_title} - ${cc.title}` : cc.title)
    : (li.budgetLine.description || "--");

  return (
    <div className="text-xs font-medium leading-tight">{codeAndTitle}</div>
  );
}

const MARKUP_TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance",
  bond: "Bond",
  fee: "Contractor Fee",
  overhead: "Overhead",
  custom: "Custom",
};

function getMarkupLabel(markupType: string): string {
  return MARKUP_TYPE_LABELS[markupType.toLowerCase()] || markupType;
}

function computeLatestPrice(li: ChangeEventDetailLineItem): number {
  return li.revenueRom ?? 0;
}

function computeLatestCost(li: ChangeEventDetailLineItem): number {
  if (li.nonCommittedCost != null && li.nonCommittedCost !== 0)
    return li.nonCommittedCost;
  return li.costRom ?? 0;
}

export function ChangeEventLineItemsTable({
  lineItems,
  markupRows,
  expectingRevenue = true,
}: ChangeEventLineItemsTableProps) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) return lineItems;
    const q = search.toLowerCase();
    return lineItems.filter(
      (li) =>
        (li.description ?? "").toLowerCase().includes(q) ||
        formatBudgetCodeText(li).toLowerCase().includes(q) ||
        (li.vendor?.name ?? "").toLowerCase().includes(q),
    );
  }, [lineItems, search]);

  const lineItemSubtotals = useMemo(() => {
    return filteredItems.reduce(
      (acc, li) => ({
        costRom: acc.costRom + (li.costRom ?? 0),
        revenueRom: acc.revenueRom + (li.revenueRom ?? 0),
        nonCommittedCost: acc.nonCommittedCost + (li.nonCommittedCost ?? 0),
        latestPrice: acc.latestPrice + computeLatestPrice(li),
        latestCost: acc.latestCost + computeLatestCost(li),
      }),
      {
        costRom: 0,
        revenueRom: 0,
        nonCommittedCost: 0,
        latestPrice: 0,
        latestCost: 0,
      },
    );
  }, [filteredItems]);

  const computedMarkups = useMemo(() => {
    if (!expectingRevenue) return [];

    const sorted = [...markupRows].sort(
      (a, b) => a.calculation_order - b.calculation_order,
    );

    let runningCostBase = lineItemSubtotals.costRom;
    let runningRevenueBase = lineItemSubtotals.revenueRom;

    return sorted.map((markup) => {
      const costAmount = runningCostBase * (markup.percentage / 100);
      const revenueAmount = runningRevenueBase * (markup.percentage / 100);

      if (markup.compound) {
        runningCostBase += costAmount;
        runningRevenueBase += revenueAmount;
      }

      return {
        ...markup,
        costAmount,
        revenueAmount,
      };
    });
  }, [expectingRevenue, markupRows, lineItemSubtotals]);

  const markupTotalCost = useMemo(
    () => computedMarkups.reduce((sum, m) => sum + m.costAmount, 0),
    [computedMarkups],
  );

  const markupTotalRevenue = useMemo(
    () => computedMarkups.reduce((sum, m) => sum + m.revenueAmount, 0),
    [computedMarkups],
  );

  const totals = useMemo(
    () => ({
      costRom: lineItemSubtotals.costRom + markupTotalCost,
      revenueRom: lineItemSubtotals.revenueRom + markupTotalRevenue,
      nonCommittedCost: lineItemSubtotals.nonCommittedCost,
      latestPrice: lineItemSubtotals.latestPrice + markupTotalRevenue,
      latestCost: lineItemSubtotals.latestCost + markupTotalCost,
    }),
    [lineItemSubtotals, markupTotalCost, markupTotalRevenue],
  );

  const overUnder = totals.latestPrice - totals.latestCost;

  /* Column group widths (used by <colgroup> for consistent alignment) */
  const colWidths = {
    budgetCode: 140,
    description: 120,
    vendor: 90,
    contract: 90,
    uom: 55,
    qty: 50,
    unitCost: 85,
    revenueRom: 95,
    primePco: 85,
    latestPrice: 90,
    costQty: 50,
    costUnitCost: 85,
    costRom: 85,
    rfq: 65,
    commitment: 90,
    nonCommitted: 95,
    latestCost: 85,
    overUnder: 85,
    budgetMod: 80,
  };

  const detailSpan = 5;
  const revenueSpan = 5;
  const costSpan = 7;

  return (
    <div>
      <SectionHeader
        title="Line Items"
        count={lineItems.length}
        className="mb-4"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search line items..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline">
          Filters
        </Button>
        <Text size="sm" tone="muted">
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
        </Text>
      </div>

      {filteredItems.length > 0 || computedMarkups.length > 0 ? (
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <colgroup>
              <col style={{ width: colWidths.budgetCode }} />
              <col style={{ width: colWidths.description }} />
              <col style={{ width: colWidths.vendor }} />
              <col style={{ width: colWidths.contract }} />
              <col style={{ width: colWidths.uom }} />
              <col style={{ width: colWidths.qty }} />
              <col style={{ width: colWidths.unitCost }} />
              <col style={{ width: colWidths.revenueRom }} />
              <col style={{ width: colWidths.primePco }} />
              <col style={{ width: colWidths.latestPrice }} />
              <col style={{ width: colWidths.costQty }} />
              <col style={{ width: colWidths.costUnitCost }} />
              <col style={{ width: colWidths.costRom }} />
              <col style={{ width: colWidths.rfq }} />
              <col style={{ width: colWidths.commitment }} />
              <col style={{ width: colWidths.nonCommitted }} />
              <col style={{ width: colWidths.latestCost }} />
              <col style={{ width: colWidths.overUnder }} />
              <col style={{ width: colWidths.budgetMod }} />
            </colgroup>

            {/* Group headers */}
            <thead>
              <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground">
                <th colSpan={detailSpan} className="px-2 py-2 text-left font-semibold">
                  Detail
                </th>
                <th
                  colSpan={revenueSpan}
                  className="px-2 py-2 text-left font-semibold border-l border-border"
                >
                  Revenue
                </th>
                <th
                  colSpan={costSpan}
                  className="px-2 py-2 text-left font-semibold border-l border-border"
                >
                  Cost
                </th>
                <th className="px-2 py-2 text-left font-semibold border-l border-border">
                  Over/Under
                </th>
                <th className="px-2 py-2 text-left font-semibold border-l border-border">
                  Budget Mod
                </th>
              </tr>

              {/* Column headers */}
              <tr className="bg-muted/30 text-xs font-medium text-muted-foreground border-t border-border">
                <th className="px-2 py-1.5 text-left font-medium">Budget Code</th>
                <th className="px-2 py-1.5 text-left font-medium">Description</th>
                <th className="px-2 py-1.5 text-left font-medium">Vendor</th>
                <th className="px-2 py-1.5 text-left font-medium">Contract</th>
                <th className="px-2 py-1.5 text-left font-medium">UOM</th>

                <th className="px-2 py-1.5 text-right font-medium border-l border-border">Qty</th>
                <th className="px-2 py-1.5 text-right font-medium">Unit Cost</th>
                <th className="px-2 py-1.5 text-right font-medium">Revenue ROM</th>
                <th className="px-2 py-1.5 text-right font-medium">Prime PCO</th>
                <th className="px-2 py-1.5 text-right font-medium">Latest Price</th>

                <th className="px-2 py-1.5 text-right font-medium border-l border-border">Qty</th>
                <th className="px-2 py-1.5 text-right font-medium">Unit Cost</th>
                <th className="px-2 py-1.5 text-right font-medium">Cost ROM</th>
                <th className="px-2 py-1.5 text-right font-medium">RFQ</th>
                <th className="px-2 py-1.5 text-right font-medium">Commitment</th>
                <th className="px-2 py-1.5 text-right font-medium">Non-Committed</th>
                <th className="px-2 py-1.5 text-right font-medium">Latest Cost</th>

                <th className="px-2 py-1.5 text-right font-medium border-l border-border">O/U</th>
                <th className="px-2 py-1.5 text-right font-medium border-l border-border">Amount</th>
              </tr>
            </thead>

            <tbody>
              {/* Data rows */}
              {filteredItems.map((li) => {
                const latestPrice = computeLatestPrice(li);
                const latestCost = computeLatestCost(li);
                const liOverUnder = latestPrice - latestCost;

                return (
                  <tr
                    key={li.id}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-2 py-2 align-top"><BudgetCodeCell li={li} /></td>
                    <td className="px-2 py-2 truncate max-w-[120px]">{li.description || "--"}</td>
                    <td className="px-2 py-2 truncate max-w-[90px]">{li.vendor?.name || "--"}</td>
                    <td className="px-2 py-2 truncate max-w-[90px]">{li.commitment?.contract_number || "--"}</td>
                    <td className="px-2 py-2 truncate">{li.unitOfMeasure || "--"}</td>

                    <td className="px-2 py-2 text-right tabular-nums border-l border-border">{li.quantity ?? "--"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{li.unitCost != null ? formatCurrency(li.unitCost) : "--"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(li.revenueRom)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">--</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(latestPrice)}</td>

                    <td className="px-2 py-2 text-right tabular-nums border-l border-border">{li.quantity ?? "--"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{li.unitCost != null ? formatCurrency(li.unitCost) : "--"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(li.costRom)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">--</td>
                    <td className="px-2 py-2 text-right tabular-nums">--</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(li.nonCommittedCost)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(latestCost)}</td>

                    <td
                      className={`px-2 py-2 text-right tabular-nums border-l border-border ${
                        liOverUnder > 0
                          ? "text-green-600"
                          : liOverUnder < 0
                            ? "text-destructive"
                            : ""
                      }`}
                    >
                      {formatCurrency(liOverUnder)}
                    </td>

                    <td className="px-2 py-2 text-right tabular-nums border-l border-border">--</td>
                  </tr>
                );
              })}

              {/* Markup rows */}
              {computedMarkups.map((markup) => (
                <tr
                  key={markup.id}
                  className="border-t border-border bg-primary/5"
                >
                  <td className="px-2 py-2 font-medium">{getMarkupLabel(markup.markup_type)}</td>
                  <td className="px-2 py-2">{markup.percentage}%</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />

                  <td className="px-2 py-2 border-l border-border" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(markup.revenueAmount)}</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(markup.revenueAmount)}</td>

                  <td className="px-2 py-2 border-l border-border" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(markup.costAmount)}</td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(markup.costAmount)}</td>

                  <td className="px-2 py-2 text-right tabular-nums border-l border-border">
                    {formatCurrency(markup.revenueAmount - markup.costAmount)}
                  </td>
                  <td className="px-2 py-2 border-l border-border" />
                </tr>
              ))}
            </tbody>

            {/* Totals row */}
            <tfoot>
              <tr className="bg-muted/30 font-semibold border-t border-border">
                <td className="px-2 py-2.5">Totals</td>
                <td className="px-2 py-2.5" />
                <td className="px-2 py-2.5" />
                <td className="px-2 py-2.5" />
                <td className="px-2 py-2.5" />

                <td className="px-2 py-2.5 border-l border-border" />
                <td className="px-2 py-2.5" />
                <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(totals.revenueRom)}</td>
                <td className="px-2 py-2.5" />
                <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(totals.latestPrice)}</td>

                <td className="px-2 py-2.5 border-l border-border" />
                <td className="px-2 py-2.5" />
                <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(totals.costRom)}</td>
                <td className="px-2 py-2.5" />
                <td className="px-2 py-2.5" />
                <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(totals.nonCommittedCost)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatCurrency(totals.latestCost)}</td>

                <td
                  className={`px-2 py-2.5 text-right tabular-nums border-l border-border ${
                    overUnder > 0
                      ? "text-green-600"
                      : overUnder < 0
                        ? "text-destructive"
                        : ""
                  }`}
                >
                  {formatCurrency(overUnder)}
                </td>

                <td className="px-2 py-2.5 border-l border-border" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <Text size="sm" tone="muted">
            No line items added yet
          </Text>
        </div>
      )}
    </div>
  );
}
