"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Columns2, MoreVertical, Pencil, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";

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
import {
  Modal as Dialog,
  ModalContent as DialogContent,
  ModalFooter as DialogFooter,
  ModalHeader as DialogHeader,
  ModalTitle as DialogTitle,
} from "@/components/ui/unified-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { VerticalMarkup } from "@/hooks/use-vertical-markup";
import type { ChangeEventDetailLineItem } from "@/types/change-events";
import { SectionRuleHeading } from "@/components/layout/spacing";

interface LineItemFormState {
  description: string;
  revenueRom: string;
  costRom: string;
  quantity: string;
  unitCost: string;
}

const EMPTY_FORM: LineItemFormState = {
  description: "",
  revenueRom: "",
  costRom: "",
  quantity: "",
  unitCost: "",
};

interface ChangeEventLineItemsTableProps {
  projectId: number;
  changeEventId?: string;
  lineItems: ChangeEventDetailLineItem[];
  markupRows: VerticalMarkup[];
  expectingRevenue?: boolean;
  primeContractDisplayName?: string | null;
  onDeleteLineItem?: (lineItemId: string) => Promise<void>;
  onLineItemsChange?: () => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Returns null if the description looks like a raw ID (UUID or UUID+suffix) — legacy data guard. */
function safeDescription(desc: string | null | undefined): string | null {
  if (!desc) return null;
  return UUID_RE.test(desc) ? null : desc;
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

function computeRfqCost(li: ChangeEventDetailLineItem): number {
  return li.rfqCost ?? 0;
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
  overUnder: 85, budgetMod: 80, action: 92,
};

export function ChangeEventLineItemsTable({
  projectId,
  changeEventId,
  lineItems,
  markupRows,
  expectingRevenue = true,
  primeContractDisplayName,
  onDeleteLineItem,
  onLineItemsChange,
}: ChangeEventLineItemsTableProps) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChangeEventDetailLineItem | null>(null);
  const [formState, setFormState] = useState<LineItemFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
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
          (safeDescription(li.description) ?? "").toLowerCase().includes(q) ||
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
          rfqCost: acc.rfqCost + computeRfqCost(li),
          revenueRom: acc.revenueRom + (li.revenueRom ?? 0),
          nonCommittedCost: acc.nonCommittedCost + (li.nonCommittedCost ?? 0),
          latestPrice: acc.latestPrice + computeLatestPrice(li),
          latestCost: acc.latestCost + computeLatestCost(li),
        }),
        { costRom: 0, rfqCost: 0, revenueRom: 0, nonCommittedCost: 0, latestPrice: 0, latestCost: 0 },
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
      rfqCost: lineItemSubtotals.rfqCost,
      revenueRom: lineItemSubtotals.revenueRom + markupTotalRevenue,
      nonCommittedCost: lineItemSubtotals.nonCommittedCost,
      latestPrice: lineItemSubtotals.latestPrice + markupTotalRevenue,
      latestCost: lineItemSubtotals.latestCost,
    }),
    [lineItemSubtotals, markupTotalRevenue],
  );

  const overUnder = totals.latestPrice - totals.latestCost;

  const openAdd = () => {
    setEditingItem(null);
    setFormState(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (li: ChangeEventDetailLineItem) => {
    setEditingItem(li);
    setFormState({
      description: li.description ?? "",
      revenueRom: li.revenueRom != null ? String(li.revenueRom) : "",
      costRom: li.costRom != null ? String(li.costRom) : "",
      quantity: li.quantity != null ? String(li.quantity) : "",
      unitCost: li.unitCost != null ? String(li.unitCost) : "",
    });
    setDialogOpen(true);
  };

  const handleSaveLineItem = async () => {
    if (!changeEventId || !formState.description.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        description: formState.description.trim(),
        revenueRom: formState.revenueRom ? parseFloat(formState.revenueRom) : undefined,
        costRom: formState.costRom ? parseFloat(formState.costRom) : undefined,
        quantity: formState.quantity ? parseFloat(formState.quantity) : undefined,
        unitCost: formState.unitCost ? parseFloat(formState.unitCost) : undefined,
      };
      if (editingItem) {
        await apiFetch(
          `/api/projects/${projectId}/change-events/${changeEventId}/line-items/${editingItem.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        toast.success("Line item updated");
      } else {
        await apiFetch(
          `/api/projects/${projectId}/change-events/${changeEventId}/line-items`,
          { method: "POST", body: JSON.stringify(payload) },
        );
        toast.success("Line item added");
      }
      setDialogOpen(false);
      onLineItemsChange?.();
    } catch (err) {
      toast.error("Line item was not saved", {
        description: err instanceof Error ? err.message : "The server did not return a usable error.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const detailSpan = 5;
  const actionSpan = onDeleteLineItem || changeEventId ? 1 : 0;
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
          <SectionRuleHeading label="Line Items" />
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              isFiltered
                ? "bg-muted text-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isFiltered ? `${filteredItems.length} of ${lineItems.length}` : lineItems.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {changeEventId && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          )}
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
                  <Button
                    key={opt}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-auto w-full justify-start rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                      groupBy === opt
                        ? "bg-primary/10 font-medium text-primary hover:bg-primary/10"
                        : "text-foreground",
                    )}
                    onClick={() => setGroupBy(opt)}
                  >
                    {opt === "none" ? "No grouping" : opt === "vendor" ? "By vendor" : "By budget code"}
                  </Button>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 py-0 text-[10px] text-primary hover:bg-transparent hover:text-primary"
                    onClick={toggleCostGroup}
                  >
                    {allCostVisible ? "Hide all" : "Show all"}
                  </Button>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 py-0 text-[10px] text-primary hover:bg-transparent hover:text-primary"
                    onClick={toggleRevGroup}
                  >
                    {allRevVisible ? "Hide all" : "Show all"}
                  </Button>
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
            {REV_COLS.map((c) => visibleCols[c] && <col key={c} style={{ width: colWidths[c] }} />)}
            {COST_COLS.map((c) => visibleCols[c] && <col key={c} style={{ width: colWidths[c] }} />)}
            {visibleCols.overUnder && <col style={{ width: colWidths.overUnder }} />}
            {visibleCols.budgetMod && <col style={{ width: colWidths.budgetMod }} />}
            {(onDeleteLineItem || changeEventId) && <col style={{ width: colWidths.action }} />}
          </colgroup>

          <InlineTableHeader>
            {/* Group header row */}
            <InlineTableHeaderRow type="group">
              <InlineTableHeaderCell colSpan={detailSpan}>Detail</InlineTableHeaderCell>
              {showRevenue && (
                <InlineTableHeaderCell colSpan={revenueSpan} divider>Revenue</InlineTableHeaderCell>
              )}
              {showCost && (
                <InlineTableHeaderCell colSpan={costSpan} divider>Cost</InlineTableHeaderCell>
              )}
              {visibleCols.overUnder && <InlineTableHeaderCell divider>O/U</InlineTableHeaderCell>}
              {visibleCols.budgetMod && <InlineTableHeaderCell divider>Mod</InlineTableHeaderCell>}
              {(onDeleteLineItem || changeEventId) && <InlineTableHeaderCell />}
            </InlineTableHeaderRow>

            {/* Column header row */}
            <InlineTableHeaderRow className="border-t border-border/50">
              <InlineTableHeaderCell className="relative">
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

              {visibleCols.overUnder && (
                <InlineTableHeaderCell align="right" divider className="relative">
                  O/U <RH col="overUnder" />
                </InlineTableHeaderCell>
              )}
              {visibleCols.budgetMod && (
                <InlineTableHeaderCell align="right" divider className="relative">
                  Amount <RH col="budgetMod" />
                </InlineTableHeaderCell>
              )}
              {(onDeleteLineItem || changeEventId) && (
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
                  const rfqCost = computeRfqCost(li);
                  const liOverUnder = latestPrice - latestCost;

                  return (
                    <InlineTableRow key={li.id}>
                      <InlineTableCell className="align-top">
                        {li.budgetLine ? (
                          <Link
                            href={`/${projectId}/budget`}
                            className="text-primary hover:underline"
                          >
                            <BudgetCodeCell li={li} />
                          </Link>
                        ) : (
                          <BudgetCodeCell li={li} />
                        )}
                      </InlineTableCell>
                      <InlineTableCell className="max-w-30 truncate">
                        <Link
                          href={`/${projectId}/change-events/${li.changeEventId}/edit`}
                          className="text-primary hover:underline"
                          title={safeDescription(li.description) ?? undefined}
                        >
                          {safeDescription(li.description) || "--"}
                        </Link>
                      </InlineTableCell>
                      <InlineTableCell className="max-w-22.5 truncate">
                        {li.vendor?.id && li.vendor?.name ? (
                          <Link
                            href={`/directory/companies/${li.vendor.id}`}
                            className="text-primary hover:underline"
                            title={li.vendor.name}
                          >
                            {li.vendor.name}
                          </Link>
                        ) : (
                          li.vendor?.name || "--"
                        )}
                      </InlineTableCell>
                      <InlineTableCell className="max-w-22.5 truncate">
                        {li.contractId ? (
                          <Link
                            href={`/${projectId}/prime-contracts/${li.contractId}`}
                            className="text-primary hover:underline"
                            title={
                              li.contract?.display_name ||
                              li.contract?.title ||
                              li.contract?.company_name ||
                              primeContractDisplayName ||
                              "--"
                            }
                          >
                            {li.contract?.display_name ||
                              li.contract?.title ||
                              li.contract?.company_name ||
                              primeContractDisplayName ||
                              "--"}
                          </Link>
                        ) : (
                          li.contract?.display_name ||
                          li.contract?.title ||
                          li.contract?.company_name ||
                          primeContractDisplayName ||
                          "--"
                        )}
                      </InlineTableCell>
                      <InlineTableCell className="truncate">
                        {li.unitOfMeasure || "--"}
                      </InlineTableCell>

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
                          {li.rfqCost != null ? formatCurrency(rfqCost) : "--"}
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
                          {li.commitment?.id ? (
                            <Link
                              href={`/${projectId}/commitments/${li.commitment.id}`}
                              className="text-primary hover:underline"
                            >
                              {li.commitment.display_name ||
                                li.commitment.title ||
                                li.commitment.company_name ||
                                li.commitment.contract_number ||
                                "--"}
                            </Link>
                          ) : li.commitment
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

                      {visibleCols.overUnder && (
                        <InlineTableCell
                          align="right"
                          numeric
                          divider
                          className={cn(
                            liOverUnder > 0 ? "text-success" : liOverUnder < 0 ? "text-destructive" : "",
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
                      {(onDeleteLineItem || changeEventId) && (
                        <InlineTableCell className="px-1 py-1">
                          <div className="flex items-center justify-end gap-1">
                            {changeEventId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(li)}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                            )}
                            {onDeleteLineItem && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground"
                                    aria-label="More line item actions"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => onDeleteLineItem(li.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
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

                {visibleCols.overUnder && (
                  <InlineTableCell align="right" numeric divider>
                    {formatCurrency(markup.revenueAmount)}
                  </InlineTableCell>
                )}
                {visibleCols.budgetMod && <InlineTableCell divider />}
                {(onDeleteLineItem || changeEventId) && <InlineTableCell />}
              </InlineTableRow>
            ))}
          </InlineTableBody>

          {/* Totals row */}
          <InlineTableFooter>
            <InlineTableFooterRow type="totals">
              <InlineTableFooterCell>Totals</InlineTableFooterCell>
              <InlineTableFooterCell />
              <InlineTableFooterCell />
              <InlineTableFooterCell />
              <InlineTableFooterCell />

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

              {visibleCols.cost_qty && <InlineTableFooterCell divider={firstCostCol === "cost_qty"} />}
              {visibleCols.cost_unitCost && <InlineTableFooterCell divider={firstCostCol === "cost_unitCost"} />}
              {visibleCols.cost_rom && (
                <InlineTableFooterCell align="right" numeric divider={firstCostCol === "cost_rom"}>
                  {formatCurrency(totals.costRom)}
                </InlineTableFooterCell>
              )}
              {visibleCols.cost_rfq && (
                <InlineTableFooterCell align="right" numeric divider={firstCostCol === "cost_rfq"}>
                  {formatCurrency(totals.rfqCost)}
                </InlineTableFooterCell>
              )}
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

              {visibleCols.overUnder && (
                <InlineTableFooterCell
                  align="right"
                  numeric
                  divider
                  className={cn(
                    overUnder > 0 ? "text-success" : overUnder < 0 ? "text-destructive" : "",
                  )}
                >
                  {formatCurrency(overUnder)}
                </InlineTableFooterCell>
              )}
              {visibleCols.budgetMod && <InlineTableFooterCell divider />}
              {(onDeleteLineItem || changeEventId) && <InlineTableFooterCell />}
            </InlineTableFooterRow>
          </InlineTableFooter>
        </InlineTable>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <span className="text-sm text-muted-foreground">No line items added yet</span>
          {changeEventId && (
            <Button size="sm" variant="outline" onClick={openAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Line Item
            </Button>
          )}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="li-description">Description *</Label>
              <Input
                id="li-description"
                value={formState.description}
                onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="li-qty">Quantity</Label>
                <Input
                  id="li-qty"
                  type="number"
                  value={formState.quantity}
                  onChange={(e) => setFormState((s) => ({ ...s, quantity: e.target.value }))}
                  placeholder="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-unitCost">Unit Cost</Label>
                <Input
                  id="li-unitCost"
                  type="number"
                  value={formState.unitCost}
                  onChange={(e) => setFormState((s) => ({ ...s, unitCost: e.target.value }))}
                  placeholder=""
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-revenueRom">Revenue ROM</Label>
                <Input
                  id="li-revenueRom"
                  type="number"
                  value={formState.revenueRom}
                  onChange={(e) => setFormState((s) => ({ ...s, revenueRom: e.target.value }))}
                  placeholder=""
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-costRom">Cost ROM</Label>
                <Input
                  id="li-costRom"
                  type="number"
                  value={formState.costRom}
                  onChange={(e) => setFormState((s) => ({ ...s, costRom: e.target.value }))}
                  placeholder=""
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveLineItem}
              disabled={isSaving || !formState.description.trim()}
            >
              {isSaving ? "Saving…" : editingItem ? "Save Changes" : "Add Line Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
