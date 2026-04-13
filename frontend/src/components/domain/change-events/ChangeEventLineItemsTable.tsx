"use client";

import React, { useMemo, useRef, useState } from "react";

import { Columns2, Search, SlidersHorizontal, Trash2, X } from "lucide-react";

import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableFooter,
  InlineTableFooterCell,
  InlineTableFooterRow,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
} from "@/components/ds/inline-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/config/tables";
import { cn } from "@/lib/utils";
import type { VerticalMarkup } from "@/hooks/use-vertical-markup";
import type { ChangeEventDetailLineItem } from "@/types/change-events";

interface ChangeEventLineItemsTableProps {
  lineItems: ChangeEventDetailLineItem[];
  markupRows: VerticalMarkup[];
  expectingRevenue?: boolean;
  primeContractDisplayName?: string | null;
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
    ? cc.division_title ? `${cc.division_title} - ${cc.title}` : cc.title
    : li.budgetLine.description || "--";
  return <div className="text-xs font-medium leading-tight">{codeAndTitle}</div>;
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
  if (li.nonCommittedCost != null && li.nonCommittedCost !== 0) return li.nonCommittedCost;
  return li.costRom ?? 0;
}

type GroupBy = "none" | "vendor" | "budgetCode";

/* ---- Column config ---- */

const REV_COLS = ["rev_qty", "rev_unitCost", "rev_rom", "rev_primePco", "rev_latestPrice"] as const;
const COST_COLS = ["cost_qty", "cost_unitCost", "cost_rom", "cost_rfq", "cost_commitment", "cost_nonCommitted", "cost_latestCost"] as const;
type RevCol = (typeof REV_COLS)[number];
type CostCol = (typeof COST_COLS)[number];
type ColId = RevCol | CostCol | "overUnder" | "budgetMod";

const COL_LABELS: Record<ColId, string> = {
  rev_qty: "Qty", rev_unitCost: "Unit Cost", rev_rom: "Rev ROM",
  rev_primePco: "Prime PCO", rev_latestPrice: "Latest Price",
  cost_qty: "Qty", cost_unitCost: "Unit Cost", cost_rom: "Cost ROM",
  cost_rfq: "RFQ", cost_commitment: "Commitment",
  cost_nonCommitted: "Non-Committed", cost_latestCost: "Latest Cost",
  overUnder: "Over / Under", budgetMod: "Budget Mod",
};

type ColWidthKey =
  | "budgetCode" | "description" | "vendor" | "contract" | "uom"
  | RevCol | CostCol | "overUnder" | "budgetMod" | "action";

const DEFAULT_COL_WIDTHS: Record<ColWidthKey, number> = {
  budgetCode: 140, description: 120, vendor: 90, contract: 90, uom: 55,
  rev_qty: 50, rev_unitCost: 85, rev_rom: 95, rev_primePco: 85, rev_latestPrice: 90,
  cost_qty: 50, cost_unitCost: 85, cost_rom: 85, cost_rfq: 65,
  cost_commitment: 90, cost_nonCommitted: 95, cost_latestCost: 85,
  overUnder: 85, budgetMod: 80, action: 40,
};

export function ChangeEventLineItemsTable({
  lineItems,
  markupRows,
  expectingRevenue = true,
  primeContractDisplayName,
  onDeleteLineItem,
}: ChangeEventLineItemsTableProps) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [filterVendorOnly, setFilterVendorOnly] = useState(false);
  const [filterNonZero, setFilterNonZero] = useState(false);

  /* Individual column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<ColId, boolean>>({
    rev_qty: true, rev_unitCost: true, rev_rom: true, rev_primePco: true, rev_latestPrice: true,
    cost_qty: true, cost_unitCost: true, cost_rom: true, cost_rfq: true,
    cost_commitment: true, cost_nonCommitted: true, cost_latestCost: true,
    overUnder: true, budgetMod: true,
  });

  /* Resizable column widths */
  const [colWidths, setColWidths] = useState<Record<ColWidthKey, number>>(DEFAULT_COL_WIDTHS);
  const resizingRef = useRef<{ col: ColWidthKey; startX: number; startW: number } | null>(null);

  const startResize = (col: ColWidthKey, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { col, startX: e.clientX, startW: colWidths[col] };
    const onMove = (ev: MouseEvent) => {
      const ref = resizingRef.current;
      if (!ref) return;
      const delta = ev.clientX - ref.startX;
      const newW = Math.max(40, ref.startW + delta);
      setColWidths((prev) => ({ ...prev, [ref.col]: newW }));
    };
    const onUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  /* Derived visibility */
  const revenueSpan = REV_COLS.filter((c) => visibleCols[c]).length;
  const costSpan = COST_COLS.filter((c) => visibleCols[c]).length;
  const showRevenue = revenueSpan > 0;
  const showCost = costSpan > 0;
  const firstRevCol = REV_COLS.find((c) => visibleCols[c]);
  const firstCostCol = COST_COLS.find((c) => visibleCols[c]);

  /* Group toggle helpers */
  const allRevVisible = REV_COLS.every((c) => visibleCols[c]);
  const allCostVisible = COST_COLS.every((c) => visibleCols[c]);
  const toggleRevGroup = () =>
    setVisibleCols((prev) => ({
      ...prev,
      ...Object.fromEntries(REV_COLS.map((c) => [c, !allRevVisible])),
    }));
  const toggleCostGroup = () =>
    setVisibleCols((prev) => ({
      ...prev,
      ...Object.fromEntries(COST_COLS.map((c) => [c, !allCostVisible])),
    }));
  const toggleCol = (col: ColId) =>
    setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }));

  /* Filters */
  const activeFilterCount = [filterVendorOnly, filterNonZero].filter(Boolean).length;
  const activeControlCount = activeFilterCount + (groupBy !== "none" ? 1 : 0);
  const isFiltered = !!search.trim() || filterVendorOnly || filterNonZero || groupBy !== "none";

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
    if (filterVendorOnly) items = items.filter((li) => !!li.vendor?.name);
    if (filterNonZero)
      items = items.filter((li) => (li.costRom ?? 0) !== 0 || (li.revenueRom ?? 0) !== 0);
    return items;
  }, [lineItems, search, filterVendorOnly, filterNonZero]);

  const groupedItems = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: null, items: filteredItems }];
    const groups = new Map<string, ChangeEventDetailLineItem[]>();
    for (const li of filteredItems) {
      const key =
        groupBy === "vendor" ? li.vendor?.name || "No Vendor" : formatBudgetCodeText(li);
      if (!groups.has(key)) groups.set(key, []);
      const bucket = groups.get(key);
      if (bucket) bucket.push(li);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({ key, label: key, items }));
  }, [filteredItems, groupBy]);

  const lineItemSubtotals = useMemo(
    () =>
      filteredItems.reduce(
        (acc, li) => ({
          costRom: acc.costRom + (li.costRom ?? 0),
          revenueRom: acc.revenueRom + (li.revenueRom ?? 0),
          nonCommittedCost: acc.nonCommittedCost + (li.nonCommittedCost ?? 0),
          latestPrice: acc.latestPrice + computeLatestPrice(li),
          latestCost: acc.latestCost + computeLatestCost(li),
        }),
        { costRom: 0, revenueRom: 0, nonCommittedCost: 0, latestPrice: 0, latestCost: 0 },
      ),
    [filteredItems],
  );

  const computedMarkups = useMemo(() => {
    if (!expectingRevenue) return [];
    const sorted = [...markupRows].sort((a, b) => a.calculation_order - b.calculation_order);
    let runningRevenueBase = lineItemSubtotals.revenueRom;
    return sorted.map((markup) => {
      const revenueAmount = runningRevenueBase * (markup.percentage / 100);
      if (markup.compound) runningRevenueBase += revenueAmount;
      return { ...markup, costAmount: 0, revenueAmount };
    });
  }, [expectingRevenue, markupRows, lineItemSubtotals]);

  const markupTotalRevenue = useMemo(
    () => computedMarkups.reduce((sum, m) => sum + m.revenueAmount, 0),
    [computedMarkups],
  );

  const totals = useMemo(
    () => ({
      costRom: lineItemSubtotals.costRom,
      revenueRom: lineItemSubtotals.revenueRom + markupTotalRevenue,
      nonCommittedCost: lineItemSubtotals.nonCommittedCost,
      latestPrice: lineItemSubtotals.latestPrice + markupTotalRevenue,
      latestCost: lineItemSubtotals.latestCost,
    }),
    [lineItemSubtotals, markupTotalRevenue],
  );

  const overUnder = totals.latestPrice - totals.latestCost;

  const detailSpan = 5;
  const actionSpan = onDeleteLineItem ? 1 : 0;
  const totalColCount =
    detailSpan +
    revenueSpan +
    costSpan +
    (visibleCols.overUnder ? 1 : 0) +
    (visibleCols.budgetMod ? 1 : 0) +
    actionSpan;

  /* Resize handle — draggable right edge on column headers */
  function RH({ col }: { col: ColWidthKey }) {
    return (
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-20 transition-opacity hover:opacity-100 hover:bg-border/60"
        onMouseDown={(e) => startResize(col, e)}
      />
    );
  }

  return (
    <div>
      {/* Title + toolbar in one row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              isFiltered
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isFiltered ? `${filteredItems.length} of ${lineItems.length}` : lineItems.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Search — expandable icon */}
          {searchOpen ? (
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search..."
                className="h-8 w-44 pl-8 pr-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => { if (!search) setSearchOpen(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setSearch(""); setSearchOpen(false); }
                }}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-8 w-8"
                  onClick={() => { setSearch(""); setSearchOpen(false); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSearchOpen(true)}
              aria-label="Search line items"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Filter + grouping popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="relative h-8 w-8 p-0">
                <SlidersHorizontal className="h-4 w-4" />
                {activeControlCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-primary-foreground">
                    {activeControlCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3" align="end">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Grouping
              </p>
              <div className="mb-4 space-y-1">
                {(["none", "vendor", "budgetCode"] as GroupBy[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      groupBy === opt
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                    onClick={() => setGroupBy(opt)}
                  >
                    {opt === "none" ? "No grouping" : opt === "vendor" ? "By vendor" : "By budget code"}
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Filters
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-vendor"
                    checked={filterVendorOnly}
                    onCheckedChange={(v) => setFilterVendorOnly(!!v)}
                  />
                  <Label htmlFor="filter-vendor" className="cursor-pointer text-sm font-normal">
                    Has vendor
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="filter-nonzero"
                    checked={filterNonZero}
                    onCheckedChange={(v) => setFilterNonZero(!!v)}
                  />
                  <Label htmlFor="filter-nonzero" className="cursor-pointer text-sm font-normal">
                    Hide $0 lines
                  </Label>
                </div>
              </div>
              {activeControlCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 h-7 w-full text-xs text-muted-foreground"
                  onClick={() => {
                    setFilterVendorOnly(false);
                    setFilterNonZero(false);
                    setGroupBy("none");
                    setSearch("");
                    setSearchOpen(false);
                  }}
                >
                  Clear all
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Column visibility — individual column toggles */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Columns2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              {/* Cost group */}
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cost
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-primary hover:underline"
                    onClick={toggleCostGroup}
                  >
                    {allCostVisible ? "Hide all" : "Show all"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {COST_COLS.map((col) => (
                    <div key={col} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${col}`}
                        checked={visibleCols[col]}
                        onCheckedChange={() => toggleCol(col)}
                      />
                      <Label htmlFor={`col-${col}`} className="cursor-pointer text-sm font-normal">
                        {COL_LABELS[col]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue group */}
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Revenue
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-primary hover:underline"
                    onClick={toggleRevGroup}
                  >
                    {allRevVisible ? "Hide all" : "Show all"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {REV_COLS.map((col) => (
                    <div key={col} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${col}`}
                        checked={visibleCols[col]}
                        onCheckedChange={() => toggleCol(col)}
                      />
                      <Label htmlFor={`col-${col}`} className="cursor-pointer text-sm font-normal">
                        {COL_LABELS[col]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary columns */}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Summary
                </p>
                <div className="space-y-1.5">
                  {(["overUnder", "budgetMod"] as ColId[]).map((col) => (
                    <div key={col} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${col}`}
                        checked={visibleCols[col]}
                        onCheckedChange={() => toggleCol(col)}
                      />
                      <Label htmlFor={`col-${col}`} className="cursor-pointer text-sm font-normal">
                        {COL_LABELS[col]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <span className="pl-1 text-xs tabular-nums text-muted-foreground">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {filteredItems.length === 0 && lineItems.length > 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <span className="text-sm text-muted-foreground">No line items match your filters</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch("");
              setSearchOpen(false);
              setFilterVendorOnly(false);
              setFilterNonZero(false);
              setGroupBy("none");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : filteredItems.length > 0 || computedMarkups.length > 0 ? (
        <InlineTable variant="read">
          <colgroup>
            <col style={{ width: colWidths.budgetCode }} />
            <col style={{ width: colWidths.description }} />
            <col style={{ width: colWidths.vendor }} />
            <col style={{ width: colWidths.contract }} />
            <col style={{ width: colWidths.uom }} />
            {COST_COLS.map((c) => visibleCols[c] && <col key={c} style={{ width: colWidths[c] }} />)}
            {REV_COLS.map((c) => visibleCols[c] && <col key={c} style={{ width: colWidths[c] }} />)}
            {visibleCols.overUnder && <col style={{ width: colWidths.overUnder }} />}
            {visibleCols.budgetMod && <col style={{ width: colWidths.budgetMod }} />}
            {onDeleteLineItem && <col style={{ width: colWidths.action }} />}
          </colgroup>

          <InlineTableHeader>
            {/* Group header row */}
            <InlineTableHeaderRow type="group">
              <InlineTableHeaderCell colSpan={detailSpan}>Detail</InlineTableHeaderCell>
              {showCost && (
                <InlineTableHeaderCell colSpan={costSpan} divider>Cost</InlineTableHeaderCell>
              )}
              {showRevenue && (
                <InlineTableHeaderCell colSpan={revenueSpan} divider>Revenue</InlineTableHeaderCell>
              )}
              {visibleCols.overUnder && <InlineTableHeaderCell divider>Variance</InlineTableHeaderCell>}
              {visibleCols.budgetMod && <InlineTableHeaderCell divider>Mod</InlineTableHeaderCell>}
              {onDeleteLineItem && <InlineTableHeaderCell />}
            </InlineTableHeaderRow>

            {/* Column header row */}
            <InlineTableHeaderRow className="border-t border-border/50">
              <InlineTableHeaderCell className="sticky left-0 z-10 bg-card">
                Budget Code <RH col="budgetCode" />
              </InlineTableHeaderCell>
              <InlineTableHeaderCell className="relative">
                Description <RH col="description" />
              </InlineTableHeaderCell>
              <InlineTableHeaderCell className="relative">
                Vendor <RH col="vendor" />
              </InlineTableHeaderCell>
              <InlineTableHeaderCell className="relative">
                Contract <RH col="contract" />
              </InlineTableHeaderCell>
              <InlineTableHeaderCell className="relative">
                UOM <RH col="uom" />
              </InlineTableHeaderCell>

              {COST_COLS.map((col) =>
                visibleCols[col] ? (
                  <InlineTableHeaderCell
                    key={col}
                    align={col === "cost_commitment" ? undefined : "right"}
                    divider={col === firstCostCol}
                    className="relative"
                  >
                    {COL_LABELS[col]}
                    <RH col={col} />
                  </InlineTableHeaderCell>
                ) : null,
              )}

              {REV_COLS.map((col) =>
                visibleCols[col] ? (
                  <InlineTableHeaderCell
                    key={col}
                    align="right"
                    divider={col === firstRevCol}
                    className="relative"
                  >
                    {COL_LABELS[col]}
                    <RH col={col} />
                  </InlineTableHeaderCell>
                ) : null,
              )}

              {visibleCols.overUnder && (
                <InlineTableHeaderCell align="right" divider className="relative">
                  Variance <RH col="overUnder" />
                </InlineTableHeaderCell>
              )}
              {visibleCols.budgetMod && (
                <InlineTableHeaderCell align="right" divider className="relative">
                  Amount <RH col="budgetMod" />
                </InlineTableHeaderCell>
              )}
              {onDeleteLineItem && (
                <InlineTableHeaderCell>
                  <span className="sr-only">Actions</span>
                </InlineTableHeaderCell>
              )}
            </InlineTableHeaderRow>
          </InlineTableHeader>

          <InlineTableBody>
            {groupedItems.map((group) => (
              <React.Fragment key={group.key}>
                {group.label !== null && (
                  <InlineTableRow key={`group-${group.key}`} type="group">
                    <InlineTableCell
                      colSpan={totalColCount}
                      className="py-1 text-[10px] font-semibold text-muted-foreground"
                    >
                      {group.label}
                      <span className="ml-1.5 font-normal opacity-60">({group.items.length})</span>
                    </InlineTableCell>
                  </InlineTableRow>
                )}

                {group.items.map((li) => {
                  const latestPrice = computeLatestPrice(li);
                  const latestCost = computeLatestCost(li);
                  const liOverUnder = latestPrice - latestCost;

                  return (
                    <InlineTableRow key={li.id}>
                      <InlineTableCell className="sticky left-0 z-10 bg-card align-top">
                        <BudgetCodeCell li={li} />
                      </InlineTableCell>
                      <InlineTableCell className="max-w-30 truncate">
                        {li.description || "--"}
                      </InlineTableCell>
                      <InlineTableCell className="max-w-22.5 truncate">
                        {li.vendor?.name || "--"}
                      </InlineTableCell>
                      <InlineTableCell className="max-w-22.5 truncate">
                        {li.contract?.display_name ||
                          li.contract?.title ||
                          li.contract?.company_name ||
                          primeContractDisplayName ||
                          "--"}
                      </InlineTableCell>
                      <InlineTableCell className="truncate">
                        {li.unitOfMeasure || "--"}
                      </InlineTableCell>

                      {visibleCols.cost_qty && (
                        <InlineTableCell align="right" numeric divider={firstCostCol === "cost_qty"}>
                          {li.quantity ?? "--"}
                        </InlineTableCell>
                      )}
                      {visibleCols.cost_unitCost && (
                        <InlineTableCell align="right" numeric divider={firstCostCol === "cost_unitCost"}>
                          {li.unitCost != null ? formatCurrency(li.unitCost) : "--"}
                        </InlineTableCell>
                      )}
                      {visibleCols.cost_rom && (
                        <InlineTableCell align="right" numeric divider={firstCostCol === "cost_rom"}>
                          {formatCurrency(li.costRom)}
                        </InlineTableCell>
                      )}
                      {visibleCols.cost_rfq && (
                        <InlineTableCell align="right" numeric divider={firstCostCol === "cost_rfq"}>
                          --
                        </InlineTableCell>
                      )}
                      {visibleCols.cost_commitment && (
                        <InlineTableCell
                          divider={firstCostCol === "cost_commitment"}
                          className="max-w-22.5 truncate"
                          title={li.commitment
                            ? (li.commitment.display_name ||
                              li.commitment.title ||
                              li.commitment.company_name ||
                              li.commitment.contract_number ||
                              undefined)
                            : undefined}
                        >
                          {li.commitment
                            ? (li.commitment.display_name ||
                              li.commitment.title ||
                              li.commitment.company_name ||
                              li.commitment.contract_number ||
                              "--")
                            : "--"}
                        </InlineTableCell>
                      )}
                      {visibleCols.cost_nonCommitted && (
                        <InlineTableCell align="right" numeric divider={firstCostCol === "cost_nonCommitted"}>
                          {formatCurrency(li.nonCommittedCost)}
                        </InlineTableCell>
                      )}
                      {visibleCols.cost_latestCost && (
                        <InlineTableCell align="right" numeric divider={firstCostCol === "cost_latestCost"}>
                          {formatCurrency(latestCost)}
                        </InlineTableCell>
                      )}

                      {visibleCols.rev_qty && (
                        <InlineTableCell align="right" numeric divider={firstRevCol === "rev_qty"}>
                          {li.quantity ?? "--"}
                        </InlineTableCell>
                      )}
                      {visibleCols.rev_unitCost && (
                        <InlineTableCell align="right" numeric divider={firstRevCol === "rev_unitCost"}>
                          {li.unitCost != null ? formatCurrency(li.unitCost) : "--"}
                        </InlineTableCell>
                      )}
                      {visibleCols.rev_rom && (
                        <InlineTableCell align="right" numeric divider={firstRevCol === "rev_rom"}>
                          {formatCurrency(li.revenueRom)}
                        </InlineTableCell>
                      )}
                      {visibleCols.rev_primePco && (
                        <InlineTableCell align="right" numeric divider={firstRevCol === "rev_primePco"}>
                          --
                        </InlineTableCell>
                      )}
                      {visibleCols.rev_latestPrice && (
                        <InlineTableCell align="right" numeric divider={firstRevCol === "rev_latestPrice"}>
                          {formatCurrency(latestPrice)}
                        </InlineTableCell>
                      )}

                      {visibleCols.overUnder && (
                        <InlineTableCell
                          align="right"
                          numeric
                          divider
                          className={cn(
                            liOverUnder > 0 ? "text-green-600" : liOverUnder < 0 ? "text-destructive" : "",
                          )}
                        >
                          {formatCurrency(liOverUnder)}
                        </InlineTableCell>
                      )}
                      {visibleCols.budgetMod && (
                        <InlineTableCell align="right" numeric divider>
                          {formatCurrency(li.extendedAmount)}
                        </InlineTableCell>
                      )}
                      {onDeleteLineItem && (
                        <InlineTableCell className="px-1 py-1 text-center">
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
                        </InlineTableCell>
                      )}
                    </InlineTableRow>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Markup rows */}
            {computedMarkups.map((markup) => (
              <InlineTableRow key={markup.id} type="markup">
                <InlineTableCell className="font-medium">
                  {getMarkupLabel(markup.markup_type)}
                </InlineTableCell>
                <InlineTableCell>{markup.percentage}%</InlineTableCell>
                <InlineTableCell />
                <InlineTableCell />
                <InlineTableCell />

                {visibleCols.cost_qty && <InlineTableCell divider={firstCostCol === "cost_qty"} />}
                {visibleCols.cost_unitCost && <InlineTableCell divider={firstCostCol === "cost_unitCost"} />}
                {visibleCols.cost_rom && (
                  <InlineTableCell align="right" numeric divider={firstCostCol === "cost_rom"}>
                    {formatCurrency(markup.costAmount)}
                  </InlineTableCell>
                )}
                {visibleCols.cost_rfq && <InlineTableCell divider={firstCostCol === "cost_rfq"} />}
                {visibleCols.cost_commitment && <InlineTableCell divider={firstCostCol === "cost_commitment"} />}
                {visibleCols.cost_nonCommitted && <InlineTableCell divider={firstCostCol === "cost_nonCommitted"} />}
                {visibleCols.cost_latestCost && (
                  <InlineTableCell align="right" numeric divider={firstCostCol === "cost_latestCost"}>
                    {formatCurrency(markup.costAmount)}
                  </InlineTableCell>
                )}

                {visibleCols.rev_qty && <InlineTableCell divider={firstRevCol === "rev_qty"} />}
                {visibleCols.rev_unitCost && <InlineTableCell divider={firstRevCol === "rev_unitCost"} />}
                {visibleCols.rev_rom && (
                  <InlineTableCell align="right" numeric divider={firstRevCol === "rev_rom"}>
                    {formatCurrency(markup.revenueAmount)}
                  </InlineTableCell>
                )}
                {visibleCols.rev_primePco && <InlineTableCell divider={firstRevCol === "rev_primePco"} />}
                {visibleCols.rev_latestPrice && (
                  <InlineTableCell align="right" numeric divider={firstRevCol === "rev_latestPrice"}>
                    {formatCurrency(markup.revenueAmount)}
                  </InlineTableCell>
                )}

                {visibleCols.overUnder && (
                  <InlineTableCell align="right" numeric divider>
                    {formatCurrency(markup.revenueAmount)}
                  </InlineTableCell>
                )}
                {visibleCols.budgetMod && <InlineTableCell divider />}
                {onDeleteLineItem && <InlineTableCell />}
              </InlineTableRow>
            ))}
          </InlineTableBody>

          {/* Totals row */}
          <InlineTableFooter>
            <InlineTableFooterRow type="totals">
              <InlineTableFooterCell className="sticky left-0 z-10 bg-card">Totals</InlineTableFooterCell>
              <InlineTableFooterCell />
              <InlineTableFooterCell />
              <InlineTableFooterCell />
              <InlineTableFooterCell />

              {visibleCols.cost_qty && <InlineTableFooterCell divider={firstCostCol === "cost_qty"} />}
              {visibleCols.cost_unitCost && <InlineTableFooterCell divider={firstCostCol === "cost_unitCost"} />}
              {visibleCols.cost_rom && (
                <InlineTableFooterCell align="right" numeric divider={firstCostCol === "cost_rom"}>
                  {formatCurrency(totals.costRom)}
                </InlineTableFooterCell>
              )}
              {visibleCols.cost_rfq && <InlineTableFooterCell divider={firstCostCol === "cost_rfq"} />}
              {visibleCols.cost_commitment && <InlineTableFooterCell divider={firstCostCol === "cost_commitment"} />}
              {visibleCols.cost_nonCommitted && (
                <InlineTableFooterCell align="right" numeric divider={firstCostCol === "cost_nonCommitted"}>
                  {formatCurrency(totals.nonCommittedCost)}
                </InlineTableFooterCell>
              )}
              {visibleCols.cost_latestCost && (
                <InlineTableFooterCell align="right" numeric divider={firstCostCol === "cost_latestCost"}>
                  {formatCurrency(totals.latestCost)}
                </InlineTableFooterCell>
              )}

              {visibleCols.rev_qty && <InlineTableFooterCell divider={firstRevCol === "rev_qty"} />}
              {visibleCols.rev_unitCost && <InlineTableFooterCell divider={firstRevCol === "rev_unitCost"} />}
              {visibleCols.rev_rom && (
                <InlineTableFooterCell align="right" numeric divider={firstRevCol === "rev_rom"}>
                  {formatCurrency(totals.revenueRom)}
                </InlineTableFooterCell>
              )}
              {visibleCols.rev_primePco && <InlineTableFooterCell divider={firstRevCol === "rev_primePco"} />}
              {visibleCols.rev_latestPrice && (
                <InlineTableFooterCell align="right" numeric divider={firstRevCol === "rev_latestPrice"}>
                  {formatCurrency(totals.latestPrice)}
                </InlineTableFooterCell>
              )}

              {visibleCols.overUnder && (
                <InlineTableFooterCell
                  align="right"
                  numeric
                  divider
                  className={cn(
                    overUnder > 0 ? "text-green-600" : overUnder < 0 ? "text-destructive" : "",
                  )}
                >
                  {formatCurrency(overUnder)}
                </InlineTableFooterCell>
              )}
              {visibleCols.budgetMod && <InlineTableFooterCell divider />}
              {onDeleteLineItem && <InlineTableFooterCell />}
            </InlineTableFooterRow>
          </InlineTableFooter>
        </InlineTable>
      ) : (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">No line items added yet</span>
        </div>
      )}

    </div>
  );
}
