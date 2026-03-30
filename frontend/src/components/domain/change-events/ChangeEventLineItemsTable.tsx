"use client";

import type { ChangeEventDetailLineItem } from "@/types/change-events";
import type { VerticalMarkup } from "@/hooks/use-vertical-markup";
import { useMemo } from "react";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionHeader, EmptyState } from "@/components/ds";
import { Search } from "lucide-react";
import { formatCurrency } from "@/config/tables";

interface ChangeEventLineItemsTableProps {
  lineItems: ChangeEventDetailLineItem[];
  markupRows: VerticalMarkup[];
}

function formatBudgetCode(li: ChangeEventDetailLineItem): string {
  if (!li.budgetLine) return "--";
  const cc = li.budgetLine.cost_code;
  if (cc?.title) {
    return cc.division_title ? `${cc.division_title} - ${cc.title}` : cc.title;
  }
  return li.budgetLine.description || "--";
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
}: ChangeEventLineItemsTableProps) {
  const lineItemSubtotals = useMemo(() => {
    return lineItems.reduce(
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
      }
    );
  }, [lineItems]);

  const computedMarkups = useMemo(() => {
    const sorted = [...markupRows].sort(
      (a, b) => a.calculation_order - b.calculation_order
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
  }, [markupRows, lineItemSubtotals]);

  const markupTotalCost = useMemo(
    () => computedMarkups.reduce((sum, m) => sum + m.costAmount, 0),
    [computedMarkups]
  );

  const markupTotalRevenue = useMemo(
    () => computedMarkups.reduce((sum, m) => sum + m.revenueAmount, 0),
    [computedMarkups]
  );

  const totals = useMemo(
    () => ({
      costRom: lineItemSubtotals.costRom + markupTotalCost,
      revenueRom: lineItemSubtotals.revenueRom + markupTotalRevenue,
      nonCommittedCost: lineItemSubtotals.nonCommittedCost,
      latestPrice: lineItemSubtotals.latestPrice + markupTotalRevenue,
      latestCost: lineItemSubtotals.latestCost + markupTotalCost,
    }),
    [lineItemSubtotals, markupTotalCost, markupTotalRevenue]
  );

  const overUnder = totals.latestPrice - totals.latestCost;

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
            readOnly
          />
        </div>
        <Button size="sm" variant="outline">
          Filters
        </Button>
        <Text size="sm" tone="muted">
          {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
        </Text>
      </div>

      {lineItems.length > 0 ? (
        <div className="border border-border rounded-md overflow-x-auto">
          {/* Group Headers */}
          <div className="flex bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground">
            <div style={{ width: 680 }} className="px-3 py-2">
              Detail
            </div>
            <div
              style={{ width: 450 }}
              className="px-3 py-2 border-l border-border"
            >
              Revenue
            </div>
            <div
              style={{ width: 560 }}
              className="px-3 py-2 border-l border-border"
            >
              Cost
            </div>
            <div
              style={{ width: 100 }}
              className="px-3 py-2 border-l border-border"
            >
              Over/Under
            </div>
            <div
              style={{ width: 100 }}
              className="px-3 py-2 border-l border-border"
            >
              Budget Mod
            </div>
          </div>

          {/* Column Headers */}
          <div className="flex bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
            {/* Detail columns */}
            <div className="w-[160px] px-2 py-1.5">Budget Code</div>
            <div className="w-[140px] px-2 py-1.5">Description</div>
            <div className="w-[100px] px-2 py-1.5">Vendor</div>
            <div className="w-[100px] px-2 py-1.5">Contract</div>
            <div className="w-[60px] px-2 py-1.5">UOM</div>

            {/* Revenue columns */}
            <div className="w-[55px] px-2 py-1.5 text-right border-l border-border">
              Qty
            </div>
            <div className="w-[90px] px-2 py-1.5 text-right">Unit Cost</div>
            <div className="w-[100px] px-2 py-1.5 text-right">Revenue ROM</div>
            <div className="w-[100px] px-2 py-1.5 text-right">Prime PCO</div>
            <div className="w-[95px] px-2 py-1.5 text-right">Latest Price</div>

            {/* Cost columns */}
            <div className="w-[55px] px-2 py-1.5 text-right border-l border-border">
              Qty
            </div>
            <div className="w-[90px] px-2 py-1.5 text-right">Unit Cost</div>
            <div className="w-[90px] px-2 py-1.5 text-right">Cost ROM</div>
            <div className="w-[80px] px-2 py-1.5 text-right">RFQ</div>
            <div className="w-[95px] px-2 py-1.5 text-right">Commitment</div>
            <div className="w-[100px] px-2 py-1.5 text-right">
              Non-Committed
            </div>
            <div className="w-[90px] px-2 py-1.5 text-right">Latest Cost</div>

            {/* Over/Under */}
            <div className="w-[100px] px-2 py-1.5 text-right border-l border-border">
              O/U
            </div>

            {/* Budget Mod */}
            <div className="w-[100px] px-2 py-1.5 text-right border-l border-border">
              Amount
            </div>
          </div>

          {/* Data Rows */}
          {lineItems.map((li) => {
            const latestPrice = computeLatestPrice(li);
            const latestCost = computeLatestCost(li);
            const liOverUnder = latestPrice - latestCost;

            return (
              <div
                key={li.id}
                className="flex border-b border-border text-sm hover:bg-muted/20"
              >
                {/* Detail */}
                <div className="w-[160px] px-2 py-2 truncate">
                  {formatBudgetCode(li)}
                </div>
                <div className="w-[140px] px-2 py-2 truncate">
                  {li.description || "--"}
                </div>
                <div className="w-[100px] px-2 py-2 truncate">
                  {li.vendor?.name || "--"}
                </div>
                <div className="w-[100px] px-2 py-2 truncate">
                  {li.commitment?.contract_number || "--"}
                </div>
                <div className="w-[60px] px-2 py-2 truncate">
                  {li.unitOfMeasure || "--"}
                </div>

                {/* Revenue */}
                <div className="w-[55px] px-2 py-2 text-right tabular-nums border-l border-border">
                  {li.quantity ?? "--"}
                </div>
                <div className="w-[90px] px-2 py-2 text-right tabular-nums">
                  {li.unitCost != null ? formatCurrency(li.unitCost) : "--"}
                </div>
                <div className="w-[100px] px-2 py-2 text-right tabular-nums">
                  {formatCurrency(li.revenueRom)}
                </div>
                <div className="w-[100px] px-2 py-2 text-right tabular-nums">
                  --
                </div>
                <div className="w-[95px] px-2 py-2 text-right tabular-nums">
                  {formatCurrency(latestPrice)}
                </div>

                {/* Cost */}
                <div className="w-[55px] px-2 py-2 text-right tabular-nums border-l border-border">
                  {li.quantity ?? "--"}
                </div>
                <div className="w-[90px] px-2 py-2 text-right tabular-nums">
                  {li.unitCost != null ? formatCurrency(li.unitCost) : "--"}
                </div>
                <div className="w-[90px] px-2 py-2 text-right tabular-nums">
                  {formatCurrency(li.costRom)}
                </div>
                <div className="w-[80px] px-2 py-2 text-right tabular-nums">
                  --
                </div>
                <div className="w-[95px] px-2 py-2 text-right tabular-nums">
                  --
                </div>
                <div className="w-[100px] px-2 py-2 text-right tabular-nums">
                  {formatCurrency(li.nonCommittedCost)}
                </div>
                <div className="w-[90px] px-2 py-2 text-right tabular-nums">
                  {formatCurrency(latestCost)}
                </div>

                {/* Over/Under */}
                <div
                  className={`w-[100px] px-2 py-2 text-right tabular-nums border-l border-border ${
                    liOverUnder > 0
                      ? "text-green-600"
                      : liOverUnder < 0
                        ? "text-destructive"
                        : ""
                  }`}
                >
                  {formatCurrency(liOverUnder)}
                </div>

                {/* Budget Mod */}
                <div className="w-[100px] px-2 py-2 text-right tabular-nums border-l border-border">
                  --
                </div>
              </div>
            );
          })}

          {/* Markup Rows */}
          {computedMarkups.map((markup) => (
            <div
              key={markup.id}
              className="flex border-b border-border text-sm bg-primary/5"
            >
              <div className="w-[160px] px-2 py-2 font-medium">
                {markup.markup_type}
              </div>
              <div className="w-[140px] px-2 py-2">
                {markup.percentage}%{markup.compound ? " (compound)" : ""}
              </div>
              <div className="w-[100px] px-2 py-2" />
              <div className="w-[100px] px-2 py-2" />
              <div className="w-[60px] px-2 py-2" />

              {/* Revenue */}
              <div className="w-[55px] px-2 py-2 border-l border-border" />
              <div className="w-[90px] px-2 py-2" />
              <div className="w-[100px] px-2 py-2 text-right tabular-nums">
                {formatCurrency(markup.revenueAmount)}
              </div>
              <div className="w-[100px] px-2 py-2" />
              <div className="w-[95px] px-2 py-2 text-right tabular-nums">
                {formatCurrency(markup.revenueAmount)}
              </div>

              {/* Cost */}
              <div className="w-[55px] px-2 py-2 border-l border-border" />
              <div className="w-[90px] px-2 py-2" />
              <div className="w-[90px] px-2 py-2 text-right tabular-nums">
                {formatCurrency(markup.costAmount)}
              </div>
              <div className="w-[80px] px-2 py-2" />
              <div className="w-[95px] px-2 py-2" />
              <div className="w-[100px] px-2 py-2" />
              <div className="w-[90px] px-2 py-2 text-right tabular-nums">
                {formatCurrency(markup.costAmount)}
              </div>

              {/* Over/Under */}
              <div className="w-[100px] px-2 py-2 text-right tabular-nums border-l border-border">
                {formatCurrency(markup.revenueAmount - markup.costAmount)}
              </div>

              {/* Budget Mod */}
              <div className="w-[100px] px-2 py-2 border-l border-border" />
            </div>
          ))}

          {/* Totals Row */}
          <div className="flex bg-muted/30 text-sm font-semibold">
            <div className="w-[160px] px-2 py-2.5">Totals</div>
            <div className="w-[140px] px-2 py-2.5" />
            <div className="w-[100px] px-2 py-2.5" />
            <div className="w-[100px] px-2 py-2.5" />
            <div className="w-[60px] px-2 py-2.5" />

            {/* Revenue */}
            <div className="w-[55px] px-2 py-2.5 border-l border-border" />
            <div className="w-[90px] px-2 py-2.5" />
            <div className="w-[100px] px-2 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.revenueRom)}
            </div>
            <div className="w-[100px] px-2 py-2.5" />
            <div className="w-[95px] px-2 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.latestPrice)}
            </div>

            {/* Cost */}
            <div className="w-[55px] px-2 py-2.5 border-l border-border" />
            <div className="w-[90px] px-2 py-2.5" />
            <div className="w-[90px] px-2 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.costRom)}
            </div>
            <div className="w-[80px] px-2 py-2.5" />
            <div className="w-[95px] px-2 py-2.5" />
            <div className="w-[100px] px-2 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.nonCommittedCost)}
            </div>
            <div className="w-[90px] px-2 py-2.5 text-right tabular-nums">
              {formatCurrency(totals.latestCost)}
            </div>

            {/* Over/Under */}
            <div
              className={`w-[100px] px-2 py-2.5 text-right tabular-nums border-l border-border ${
                overUnder > 0
                  ? "text-green-600"
                  : overUnder < 0
                    ? "text-destructive"
                    : ""
              }`}
            >
              {formatCurrency(overUnder)}
            </div>

            {/* Budget Mod */}
            <div className="w-[100px] px-2 py-2.5 border-l border-border" />
          </div>
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
