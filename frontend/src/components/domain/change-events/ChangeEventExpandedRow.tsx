"use client";

import * as React from "react";
import { ChevronDown, MoreVertical, Pencil } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ── Types ────────────────────────────────────────────────────────── */

interface LineItem {
  id: string;
  description: string | null;
  costRom: number | null;
  revenueRom: number | null;
  nonCommittedCost: number | null;
  quantity: number | null;
  unitCost: number | null;
  unitOfMeasure: string | null;
  contractId: number | string | null;
  vendor?: { id: string; name: string } | null;
  budgetLine?: {
    id: string;
    description: string | null;
    cost_code?: {
      id: string;
      title: string | null;
      division_id?: string | null;
      division_title?: string | null;
    } | null;
  } | null;
}

interface MarkupItem {
  id: string;
  markup_type: string;
  percentage: number;
  calculation_order: number;
  compound: boolean | null;
}

interface ChangeEventExpandedRowProps {
  changeEventId: string | number;
  projectId: number;
  colSpan: number;
  expectingRevenue?: boolean;
  onEditLineItem?: (lineItemId: string) => void;
}

/* ── Column config ────────────────────────────────────────────────── */

type ColumnKey =
  | "title"
  | "budgetCode"
  | "lineDescription"
  | "vendor"
  | "contract"
  | "uom"
  | "revQty"
  | "revUnitCost"
  | "revenueRom"
  | "primePco"
  | "latestPrice"
  | "costQty"
  | "costUnitCost"
  | "costRom"
  | "rfq"
  | "commitment"
  | "nonCommitted"
  | "latestCost"
  | "overUnder"
  | "budgetMod";

type ColumnGroup = "detail" | "revenue" | "cost" | "overUnder" | "budgetMod";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  group: ColumnGroup;
  defaultWidth: number;
  minWidth: number;
  align: "left" | "right";
}

const GROUP_LABELS: Record<ColumnGroup, string> = {
  detail: "Detail",
  revenue: "Revenue",
  cost: "Cost",
  overUnder: "Over/Under",
  budgetMod: "Budget Modification",
};

const GROUP_ORDER: ColumnGroup[] = ["detail", "revenue", "cost", "overUnder", "budgetMod"];

const COLUMNS: ColumnDef[] = [
  // Detail
  { key: "title", label: "Title", group: "detail", defaultWidth: 160, minWidth: 100, align: "left" },
  { key: "budgetCode", label: "Budget Code", group: "detail", defaultWidth: 130, minWidth: 80, align: "left" },
  { key: "lineDescription", label: "Description", group: "detail", defaultWidth: 130, minWidth: 80, align: "left" },
  { key: "vendor", label: "Vendor", group: "detail", defaultWidth: 100, minWidth: 70, align: "left" },
  { key: "contract", label: "Contract", group: "detail", defaultWidth: 90, minWidth: 60, align: "left" },
  { key: "uom", label: "UOM", group: "detail", defaultWidth: 60, minWidth: 40, align: "left" },
  // Revenue
  { key: "revQty", label: "Qty", group: "revenue", defaultWidth: 55, minWidth: 40, align: "right" },
  { key: "revUnitCost", label: "Unit Cost", group: "revenue", defaultWidth: 85, minWidth: 60, align: "right" },
  { key: "revenueRom", label: "Revenue ROM", group: "revenue", defaultWidth: 100, minWidth: 70, align: "right" },
  { key: "primePco", label: "Prime PCO", group: "revenue", defaultWidth: 90, minWidth: 60, align: "right" },
  { key: "latestPrice", label: "Latest Price", group: "revenue", defaultWidth: 95, minWidth: 60, align: "right" },
  // Cost
  { key: "costQty", label: "Qty", group: "cost", defaultWidth: 55, minWidth: 40, align: "right" },
  { key: "costUnitCost", label: "Unit Cost", group: "cost", defaultWidth: 85, minWidth: 60, align: "right" },
  { key: "costRom", label: "Cost ROM", group: "cost", defaultWidth: 90, minWidth: 60, align: "right" },
  { key: "rfq", label: "RFQ", group: "cost", defaultWidth: 80, minWidth: 50, align: "right" },
  { key: "commitment", label: "Commitment", group: "cost", defaultWidth: 95, minWidth: 60, align: "right" },
  { key: "nonCommitted", label: "Non-Committed", group: "cost", defaultWidth: 105, minWidth: 70, align: "right" },
  { key: "latestCost", label: "Latest Cost", group: "cost", defaultWidth: 90, minWidth: 60, align: "right" },
  // Over/Under
  { key: "overUnder", label: "Over/Under", group: "overUnder", defaultWidth: 95, minWidth: 60, align: "right" },
  // Budget Modification
  { key: "budgetMod", label: "Budget Mod", group: "budgetMod", defaultWidth: 95, minWidth: 60, align: "right" },
];

const ACTIONS_WIDTH = 64;

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatMoney(value: number | null | undefined): string {
  const numeric = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatBudgetCode(li: LineItem): string {
  if (!li.budgetLine) return "--";
  const cc = li.budgetLine.cost_code;
  if (cc?.title) {
    return cc.division_title ? `${cc.division_title} - ${cc.title}` : cc.title;
  }
  return li.budgetLine.description || "--";
}

/**
 * Latest Price sourcing (Procore logic):
 *   1. Prime PCO amount (if exists)
 *   2. Revenue ROM (fallback)
 */
function computeLatestPrice(li: LineItem): number {
  // prime_pco is not yet on line items — fall back to revenueRom
  return li.revenueRom ?? 0;
}

/**
 * Latest Cost sourcing (Procore logic):
 *   1. Non-Committed Cost (if exists)
 *   2. Commitment (if exists)
 *   3. RFQ in Closed/Pending Final Approval (not yet modeled — skip)
 *   4. Cost ROM (fallback)
 */
function computeLatestCost(li: LineItem): number {
  if (li.nonCommittedCost != null && li.nonCommittedCost !== 0) return li.nonCommittedCost;
  // commitment amount would go here when modeled at line-item level
  return li.costRom ?? 0;
}

function getLineItemCellValue(li: LineItem, key: ColumnKey): React.ReactNode {
  const dash = <span className="text-muted-foreground">--</span>;

  switch (key) {
    // Detail
    case "title":
      return li.description || "Untitled";
    case "budgetCode":
      return <span className="text-muted-foreground">{formatBudgetCode(li)}</span>;
    case "lineDescription":
      return li.budgetLine?.description || dash;
    case "vendor":
      return li.vendor?.name || dash;
    case "contract":
      return li.contractId ? `#${li.contractId}` : dash;
    case "uom":
      return li.unitOfMeasure || dash;

    // Revenue
    case "revQty":
      return li.quantity != null ? li.quantity : dash;
    case "revUnitCost":
      return li.unitCost != null ? formatMoney(li.unitCost) : dash;
    case "revenueRom":
      return formatMoney(li.revenueRom);
    case "primePco":
      return dash; // not yet modeled at line-item level
    case "latestPrice": {
      const lp = computeLatestPrice(li);
      return lp !== 0 ? formatMoney(lp) : dash;
    }

    // Cost
    case "costQty":
      return li.quantity != null ? li.quantity : dash;
    case "costUnitCost":
      return li.unitCost != null ? formatMoney(li.unitCost) : dash;
    case "costRom":
      return formatMoney(li.costRom);
    case "rfq":
      return dash; // not yet modeled at line-item level
    case "commitment":
      return dash; // commitment amount not on line items yet
    case "nonCommitted":
      return li.nonCommittedCost != null && li.nonCommittedCost !== 0
        ? formatMoney(li.nonCommittedCost)
        : dash;
    case "latestCost": {
      const lc = computeLatestCost(li);
      return lc !== 0 ? formatMoney(lc) : dash;
    }

    // Over/Under
    case "overUnder": {
      const diff = computeLatestPrice(li) - computeLatestCost(li);
      if (diff === 0) return <span className="text-muted-foreground">$0.00</span>;
      return (
        <span className={diff > 0 ? "text-emerald-600" : "text-destructive"}>
          {diff > 0 ? "+" : ""}{formatMoney(diff)}
        </span>
      );
    }

    // Budget Modification
    case "budgetMod":
      return dash; // not yet modeled

    default:
      return dash;
  }
}

function getMarkupCellValue(
  markup: { label: string; percentage: number; amount: number },
  key: ColumnKey,
): React.ReactNode {
  const dash = <span className="text-muted-foreground">--</span>;

  switch (key) {
    case "title":
      return markup.label;
    case "costQty":
    case "revQty":
      return <span className="text-muted-foreground">{markup.percentage}%</span>;
    case "costRom":
    case "latestCost":
      return formatMoney(markup.amount);
    default:
      return dash;
  }
}

/* ── Resize handle ────────────────────────────────────────────────── */

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        onResize(moveEvent.clientX - startX);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onResize],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10"
    />
  );
}

/* ── Column header with menu ──────────────────────────────────────── */

function ColumnHeader({
  col,
  width,
  visibleColumns,
  onToggleColumn,
  onStartResize,
  className,
}: {
  col: ColumnDef;
  width: number;
  visibleColumns: Set<ColumnKey>;
  onToggleColumn: (key: ColumnKey) => void;
  onStartResize: (delta: number) => void;
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div
      className={`relative flex items-center group select-none ${className ?? ""}`}
      style={{ width, minWidth: col.minWidth }}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      <span
        className={`flex-1 text-xs font-medium text-muted-foreground truncate ${
          col.align === "right" ? "text-right" : ""
        }`}
      >
        {col.label}
      </span>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 max-h-72 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {GROUP_ORDER.map((group) => {
            const groupCols = COLUMNS.filter((c) => c.group === group);
            return (
              <React.Fragment key={group}>
                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {GROUP_LABELS[group]}
                </DropdownMenuLabel>
                {groupCols.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleColumns.has(c.key)}
                    onCheckedChange={() => onToggleColumn(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </React.Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <ResizeHandle onResize={onStartResize} />
    </div>
  );
}

/* ── Group span computation ───────────────────────────────────────── */

function computeGroupSpans(
  visibleCols: ColumnDef[],
  columnWidths: Record<ColumnKey, number>,
): { group: ColumnGroup; label: string; totalWidth: number }[] {
  const spans: { group: ColumnGroup; label: string; totalWidth: number }[] = [];

  for (const group of GROUP_ORDER) {
    const groupCols = visibleCols.filter((c) => c.group === group);
    if (groupCols.length === 0) continue;
    const totalWidth = groupCols.reduce((sum, c) => sum + columnWidths[c.key], 0);
    spans.push({ group, label: GROUP_LABELS[group], totalWidth });
  }

  return spans;
}

/* ── Main component ───────────────────────────────────────────────── */

export function ChangeEventExpandedRow({
  changeEventId,
  projectId,
  colSpan,
  expectingRevenue = true,
  onEditLineItem,
}: ChangeEventExpandedRowProps) {
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);
  const [markups, setMarkups] = React.useState<MarkupItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [visibleColumns, setVisibleColumns] = React.useState<Set<ColumnKey>>(
    () => new Set(COLUMNS.map((c) => c.key)),
  );

  const [columnWidths, setColumnWidths] = React.useState<Record<ColumnKey, number>>(() => {
    const widths: Record<string, number> = {};
    for (const col of COLUMNS) {
      widths[col.key] = col.defaultWidth;
    }
    return widths as Record<ColumnKey, number>;
  });
  const sharedScrollLeftRef = React.useRef(0);
  const isSyncingScrollRef = React.useRef(false);
  const scrollContainersRef = React.useRef<Map<string, HTMLDivElement>>(new Map());

  const registerScrollContainer = React.useCallback(
    (key: string) => (node: HTMLDivElement | null) => {
      if (node) {
        scrollContainersRef.current.set(key, node);
        node.scrollLeft = sharedScrollLeftRef.current;
        return;
      }
      scrollContainersRef.current.delete(key);
    },
    [],
  );

  const handleSharedHorizontalScroll = React.useCallback(
    (sourceKey: string) => (event: React.UIEvent<HTMLDivElement>) => {
      if (isSyncingScrollRef.current) return;

      const source = event.currentTarget;
      const nextScrollLeft = source.scrollLeft;
      sharedScrollLeftRef.current = nextScrollLeft;
      isSyncingScrollRef.current = true;

      scrollContainersRef.current.forEach((container, key) => {
        if (key !== sourceKey && container.scrollLeft !== nextScrollLeft) {
          container.scrollLeft = nextScrollLeft;
        }
      });

      isSyncingScrollRef.current = false;
    },
    [],
  );

  const toggleColumn = React.useCallback((key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const makeResizeHandler = React.useCallback(
    (key: ColumnKey, startWidth: number) => {
      return (delta: number) => {
        const col = COLUMNS.find((c) => c.key === key);
        const minW = col?.minWidth ?? 50;
        setColumnWidths((prev) => ({
          ...prev,
          [key]: Math.max(minW, startWidth + delta),
        }));
      };
    },
    [],
  );

  const visibleCols = COLUMNS.filter((c) => visibleColumns.has(c.key));

  const groupSpans = React.useMemo(
    () => computeGroupSpans(visibleCols, columnWidths),
    [visibleCols, columnWidths],
  );

  React.useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      try {
        const [lineItemsRes, markupsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/change-events/${changeEventId}/line-items`),
          expectingRevenue
            ? fetch(`/api/projects/${projectId}/vertical-markup`).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (lineItemsRes.ok) {
          const data = await lineItemsRes.json();
          setLineItems(data.data || []);
        }

        if (markupsRes?.ok) {
          const data = await markupsRes.json();
          setMarkups(data.markups || []);
        }
      } catch {
        // Silently fail — expanded row is supplementary
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [projectId, changeEventId, expectingRevenue]);

  const lineItemCostSubtotal = lineItems.reduce(
    (sum, li) => sum + (li.costRom ?? 0),
    0,
  );

  const computedMarkups = React.useMemo(() => {
    if (!expectingRevenue) return [];
    if (markups.length === 0) return [];

    const sorted = [...markups].sort(
      (a, b) => a.calculation_order - b.calculation_order,
    );
    let runningBase = lineItemCostSubtotal;
    return sorted.map((m) => {
      const amount = runningBase * (m.percentage / 100);
      if (m.compound) runningBase += amount;
      return {
        id: m.id,
        label: `${formatMoney(amount)} - ${m.markup_type}`,
        amount,
        percentage: m.percentage,
        markupType: m.markup_type,
      };
    });
  }, [expectingRevenue, markups, lineItemCostSubtotal]);

  /* ── Loading / Empty states ── */

  if (isLoading) {
    return (
      <TableRow className="bg-primary/5 hover:bg-primary/5">
        <TableCell colSpan={colSpan} className="py-3 px-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (lineItems.length === 0 && computedMarkups.length === 0) {
    return (
      <TableRow className="bg-primary/5 hover:bg-primary/5">
        <TableCell colSpan={colSpan} className="py-3 px-8">
          <p className="text-sm text-muted-foreground">
            No line items or markups for this change event.
          </p>
        </TableCell>
      </TableRow>
    );
  }

  /* ── Render ── */

  return (
    <>
      {/* ── Group header row ── */}
      <TableRow className="bg-primary/15 hover:bg-primary/15 border-b border-primary/20">
        <TableCell colSpan={colSpan} className="py-0 px-0">
          <div
            ref={registerScrollContainer("group-header")}
            onScroll={handleSharedHorizontalScroll("group-header")}
            className="flex items-center px-8 gap-0 overflow-x-auto"
          >
            {groupSpans.map((span, idx) => (
              <div
                key={span.group}
                className={`py-1 ${idx < groupSpans.length - 1 ? "border-r border-primary/20" : ""}`}
                style={{ width: span.totalWidth, minWidth: span.totalWidth }}
              >
                <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide px-1">
                  {span.label}
                </span>
              </div>
            ))}
            <div style={{ width: ACTIONS_WIDTH }} className="flex-shrink-0" />
          </div>
        </TableCell>
      </TableRow>

      {/* ── Column header row ── */}
      <TableRow className="bg-primary/10 hover:bg-primary/10 border-b border-primary/20">
        <TableCell colSpan={colSpan} className="py-0 px-0">
          <div
            ref={registerScrollContainer("column-header")}
            onScroll={handleSharedHorizontalScroll("column-header")}
            className="flex items-center px-8 py-1.5 gap-0 overflow-x-auto"
          >
            {visibleCols.map((col, index) => (
              <ColumnHeader
                key={col.key}
                col={col}
                width={columnWidths[col.key]}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
                onStartResize={makeResizeHandler(col.key, columnWidths[col.key])}
                className={
                  index === 0
                    ? "sticky left-0 z-20 bg-primary/10 pl-1 pr-2 border-r border-primary/15"
                    : ""
                }
              />
            ))}
            <div style={{ width: ACTIONS_WIDTH }} className="flex-shrink-0" />
          </div>
        </TableCell>
      </TableRow>

      {/* ── Line Items ── */}
      {lineItems.map((li) => (
        <TableRow
          key={li.id}
          className="bg-primary/5 hover:bg-primary/10 border-b border-primary/10"
        >
          <TableCell colSpan={colSpan} className="py-0 px-0">
            <div
              ref={registerScrollContainer(`line-item-${li.id}`)}
              onScroll={handleSharedHorizontalScroll(`line-item-${li.id}`)}
              className="flex items-center px-8 py-2 gap-0 overflow-x-auto"
            >
              {visibleCols.map((col, index) => (
                <div
                  key={col.key}
                  className={`text-[11px] tabular-nums truncate pr-2 flex-shrink-0 ${
                    col.align === "right" ? "text-right" : ""
                  } ${
                    index === 0
                      ? "sticky left-0 z-10 bg-primary/5 pl-1 border-r border-primary/10"
                      : ""
                  }`}
                  style={{ width: columnWidths[col.key], minWidth: col.minWidth }}
                >
                  {getLineItemCellValue(li, col.key)}
                </div>
              ))}
              <div style={{ width: ACTIONS_WIDTH }} className="flex-shrink-0 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditLineItem?.(li.id);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      ))}

      {/* ── Markup section ── */}
      {computedMarkups.length > 0 && (
        <>
          <TableRow className="bg-primary/10 hover:bg-primary/10 border-b border-primary/20">
            <TableCell colSpan={colSpan} className="py-1.5 px-8">
              <div className="flex items-center gap-1.5">
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">Markup</span>
              </div>
            </TableCell>
          </TableRow>
          {computedMarkups.map((markup) => (
            <TableRow
              key={markup.id}
              className="bg-primary/5 hover:bg-primary/10 border-b border-primary/10"
            >
              <TableCell colSpan={colSpan} className="py-0 px-0">
                <div
                  ref={registerScrollContainer(`markup-${markup.id}`)}
                  onScroll={handleSharedHorizontalScroll(`markup-${markup.id}`)}
                  className="flex items-center px-8 py-2 gap-0 overflow-x-auto"
                >
                  {visibleCols.map((col, index) => (
                    <div
                      key={col.key}
                      className={`text-[11px] tabular-nums truncate pr-2 flex-shrink-0 ${
                        col.align === "right" ? "text-right" : ""
                      } ${
                        index === 0
                          ? "sticky left-0 z-10 bg-primary/5 pl-1 border-r border-primary/10"
                          : ""
                      }`}
                      style={{ width: columnWidths[col.key], minWidth: col.minWidth }}
                    >
                      {getMarkupCellValue(markup, col.key)}
                    </div>
                  ))}
                  <div style={{ width: ACTIONS_WIDTH }} className="flex-shrink-0 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </>
      )}
    </>
  );
}
