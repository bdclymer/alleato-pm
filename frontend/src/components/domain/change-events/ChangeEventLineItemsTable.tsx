"use client";

import type { ChangeEventDetailLineItem } from "@/types/change-events";
import type { VerticalMarkup } from "@/hooks/use-vertical-markup";
import { useMemo, useState } from "react";
import { Text } from "@/components/ds/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "@/components/ds";
import { Columns2, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { formatCurrency } from "@/config/tables";
import { cn } from "@/lib/utils";

interface ChangeEventLineItemsTableProps {
  lineItems: ChangeEventDetailLineItem[];
  markupRows: VerticalMarkup[];
  expectingRevenue?: boolean;
  onDeleteLineItem?: (lineItemId: string) => Promise<void>;
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

type GroupBy = "none" | "vendor" | "budgetCode";

export function ChangeEventLineItemsTable({
  lineItems,
  markupRows,
  expectingRevenue = true,
  onDeleteLineItem,
}: ChangeEventLineItemsTableProps) {
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [filterVendorOnly, setFilterVendorOnly] = useState(false);
  const [filterNonZero, setFilterNonZero] = useState(false);
  const [visibleCols, setVisibleCols] = useState({ revenue: true, cost: true });

  const activeFilterCount = [filterVendorOnly, filterNonZero].filter(Boolean).length;

  const filteredItems = useMemo(() => {
    let items = lineItems;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (li) =>
          (li.description ?? "").toLowerCase().includes(q) ||
          formatBudgetCodeText(li).toLowerCase().includes(q) ||
          (li.vendor?.name ?? "").toLowerCase().includes(q),
      );
    }
    if (filterVendorOnly) {
      items = items.filter((li) => !!li.vendor?.name);
    }
    if (filterNonZero) {
      items = items.filter(
        (li) => (li.costRom ?? 0) !== 0 || (li.revenueRom ?? 0) !== 0,
      );
    }
    return items;
  }, [lineItems, search, filterVendorOnly, filterNonZero]);

  const groupedItems = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: null, items: filteredItems }];
    }
    const groups = new Map<string, ChangeEventDetailLineItem[]>();
    for (const li of filteredItems) {
      const key =
        groupBy === "vendor"
          ? (li.vendor?.name || "No Vendor")
          : formatBudgetCodeText(li);
      if (!groups.has(key)) groups.set(key, []);
      const group = groups.get(key);
      if (group) group.push(li);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: key,
      items,
    }));
  }, [filteredItems, groupBy]);

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

  /* Column group widths */
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
  const revenueSpan = visibleCols.revenue ? 5 : 0;
  const costSpan = visibleCols.cost ? 7 : 0;
  const actionSpan = onDeleteLineItem ? 1 : 0;

  const totalColCount =
    detailSpan + revenueSpan + costSpan + 1 /* O/U */ + 1 /* Mod */ + actionSpan;

  return (
    <div>
      <SectionHeader
        title="Line Items"
        count={lineItems.length}
        className="mb-4"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search line items..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="relative px-2">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-3" align="start">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Filters
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-vendor"
                  checked={filterVendorOnly}
                  onCheckedChange={(v) => setFilterVendorOnly(!!v)}
                />
                <Label htmlFor="filter-vendor" className="text-sm font-normal cursor-pointer">
                  Has vendor
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-nonzero"
                  checked={filterNonZero}
                  onCheckedChange={(v) => setFilterNonZero(!!v)}
                />
                <Label htmlFor="filter-nonzero" className="text-sm font-normal cursor-pointer">
                  Non-zero amount
                </Label>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-3 w-full h-7 text-xs text-muted-foreground"
                onClick={() => {
                  setFilterVendorOnly(false);
                  setFilterNonZero(false);
                }}
              >
                Clear filters
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* Group by */}
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <SelectTrigger className="h-9 w-36 text-xs">
            <SelectValue placeholder="Group by…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">No grouping</SelectItem>
            <SelectItem value="vendor" className="text-xs">Group by vendor</SelectItem>
            <SelectItem value="budgetCode" className="text-xs">Group by budget code</SelectItem>
          </SelectContent>
        </Select>

        {/* Column visibility */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="px-2">
              <Columns2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" align="end">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Columns
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="col-revenue"
                  checked={visibleCols.revenue}
                  onCheckedChange={(v) =>
                    setVisibleCols((prev) => ({ ...prev, revenue: !!v }))
                  }
                />
                <Label htmlFor="col-revenue" className="text-sm font-normal cursor-pointer">
                  Revenue columns
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="col-cost"
                  checked={visibleCols.cost}
                  onCheckedChange={(v) =>
                    setVisibleCols((prev) => ({ ...prev, cost: !!v }))
                  }
                />
                <Label htmlFor="col-cost" className="text-sm font-normal cursor-pointer">
                  Cost columns
                </Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Text size="sm" tone="muted">
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
        </Text>
      </div>

      {filteredItems.length > 0 || computedMarkups.length > 0 ? (
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <colgroup>
              <col style={{ width: colWidths.budgetCode }} />
              <col style={{ width: colWidths.description }} />
              <col style={{ width: colWidths.vendor }} />
              <col style={{ width: colWidths.contract }} />
              <col style={{ width: colWidths.uom }} />

              {visibleCols.revenue && (
                <>
                  <col style={{ width: colWidths.qty }} />
                  <col style={{ width: colWidths.unitCost }} />
                  <col style={{ width: colWidths.revenueRom }} />
                  <col style={{ width: colWidths.primePco }} />
                  <col style={{ width: colWidths.latestPrice }} />
                </>
              )}

              {visibleCols.cost && (
                <>
                  <col style={{ width: colWidths.costQty }} />
                  <col style={{ width: colWidths.costUnitCost }} />
                  <col style={{ width: colWidths.costRom }} />
                  <col style={{ width: colWidths.rfq }} />
                  <col style={{ width: colWidths.commitment }} />
                  <col style={{ width: colWidths.nonCommitted }} />
                  <col style={{ width: colWidths.latestCost }} />
                </>
              )}

              <col style={{ width: colWidths.overUnder }} />
              <col style={{ width: colWidths.budgetMod }} />
              {onDeleteLineItem && <col style={{ width: 40 }} />}
            </colgroup>

            <thead>
              {/* Group headers */}
              <tr className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                <th colSpan={detailSpan} className="px-2 pt-1.5 pb-0 text-left">
                  Detail
                </th>
                {visibleCols.revenue && (
                  <th colSpan={5} className="px-2 pt-1.5 pb-0 text-left border-l border-border">
                    Revenue
                  </th>
                )}
                {visibleCols.cost && (
                  <th colSpan={7} className={cn("px-2 pt-1.5 pb-0 text-left border-l border-border")}>
                    Cost
                  </th>
                )}
                <th className="px-2 pt-1.5 pb-0 text-left border-l border-border">
                  O/U
                </th>
                <th className="px-2 pt-1.5 pb-0 text-left border-l border-border">
                  Mod
                </th>
              </tr>

              {/* Column headers */}
              <tr className="text-[9px] font-medium text-muted-foreground border-t border-border/50">
                <th className="px-2 py-0.5 text-left">Budget Code</th>
                <th className="px-2 py-0.5 text-left">Description</th>
                <th className="px-2 py-0.5 text-left">Vendor</th>
                <th className="px-2 py-0.5 text-left">Contract</th>
                <th className="px-2 py-0.5 text-left">UOM</th>

                {visibleCols.revenue && (
                  <>
                    <th className="px-2 py-0.5 text-right border-l border-border">Qty</th>
                    <th className="px-2 py-0.5 text-right">Unit Cost</th>
                    <th className="px-2 py-0.5 text-right">Rev ROM</th>
                    <th className="px-2 py-0.5 text-right">Prime PCO</th>
                    <th className="px-2 py-0.5 text-right">Latest Price</th>
                  </>
                )}

                {visibleCols.cost && (
                  <>
                    <th className="px-2 py-0.5 text-right border-l border-border">Qty</th>
                    <th className="px-2 py-0.5 text-right">Unit Cost</th>
                    <th className="px-2 py-0.5 text-right">Cost ROM</th>
                    <th className="px-2 py-0.5 text-right">RFQ</th>
                    <th className="px-2 py-0.5 text-right">Commitment</th>
                    <th className="px-2 py-0.5 text-right">Non-Committed</th>
                    <th className="px-2 py-0.5 text-right">Latest Cost</th>
                  </>
                )}

                <th className="px-2 py-0.5 text-right border-l border-border">O/U</th>
                <th className="px-2 py-0.5 text-right border-l border-border">Amount</th>
                {onDeleteLineItem && <th className="px-2 py-0.5"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>

            <tbody>
              {groupedItems.map((group) => (
                <>
                  {/* Group header row */}
                  {group.label !== null && (
                    <tr key={`group-${group.key}`} className="border-t border-border bg-muted/40">
                      <td
                        colSpan={totalColCount}
                        className="px-2 py-1 text-[10px] font-semibold text-muted-foreground"
                      >
                        {group.label}
                        <span className="ml-1.5 font-normal opacity-60">
                          ({group.items.length})
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* Data rows */}
                  {group.items.map((li) => {
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

                        {visibleCols.revenue && (
                          <>
                            <td className="px-2 py-2 text-right tabular-nums border-l border-border">{li.quantity ?? "--"}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{li.unitCost != null ? formatCurrency(li.unitCost) : "--"}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(li.revenueRom)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">--</td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(latestPrice)}</td>
                          </>
                        )}

                        {visibleCols.cost && (
                          <>
                            <td className="px-2 py-2 text-right tabular-nums border-l border-border">{li.quantity ?? "--"}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{li.unitCost != null ? formatCurrency(li.unitCost) : "--"}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(li.costRom)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">--</td>
                            <td className="px-2 py-2 text-right tabular-nums">--</td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(li.nonCommittedCost)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(latestCost)}</td>
                          </>
                        )}

                        <td
                          className={cn(
                            "px-2 py-2 text-right tabular-nums border-l border-border",
                            liOverUnder > 0 ? "text-green-600" : liOverUnder < 0 ? "text-destructive" : "",
                          )}
                        >
                          {formatCurrency(liOverUnder)}
                        </td>

                        <td className="px-2 py-2 text-right tabular-nums border-l border-border">--</td>
                        {onDeleteLineItem && (
                          <td className="px-1 py-1 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteLineItem(li.id)}
                              aria-label="Delete line item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </>
              ))}

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

                  {visibleCols.revenue && (
                    <>
                      <td className="px-2 py-2 border-l border-border" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(markup.revenueAmount)}</td>
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(markup.revenueAmount)}</td>
                    </>
                  )}

                  {visibleCols.cost && (
                    <>
                      <td className="px-2 py-2 border-l border-border" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(markup.costAmount)}</td>
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(markup.costAmount)}</td>
                    </>
                  )}

                  <td className="px-2 py-2 text-right tabular-nums border-l border-border">
                    {formatCurrency(markup.revenueAmount - markup.costAmount)}
                  </td>
                  <td className="px-2 py-2 border-l border-border" />
                  {onDeleteLineItem && <td />}
                </tr>
              ))}
            </tbody>

            {/* Totals row */}
            <tfoot>
              <tr className="font-semibold border-t-2 border-border">
                <td className="px-2 py-2">Totals</td>
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />

                {visibleCols.revenue && (
                  <>
                    <td className="px-2 py-2 border-l border-border" />
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(totals.revenueRom)}</td>
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(totals.latestPrice)}</td>
                  </>
                )}

                {visibleCols.cost && (
                  <>
                    <td className="px-2 py-2 border-l border-border" />
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(totals.costRom)}</td>
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2" />
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(totals.nonCommittedCost)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(totals.latestCost)}</td>
                  </>
                )}

                <td
                  className={cn(
                    "px-2 py-2 text-right tabular-nums border-l border-border",
                    overUnder > 0 ? "text-green-600" : overUnder < 0 ? "text-destructive" : "",
                  )}
                >
                  {formatCurrency(overUnder)}
                </td>

                <td className="px-2 py-2 border-l border-border" />
                {onDeleteLineItem && <td />}
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
