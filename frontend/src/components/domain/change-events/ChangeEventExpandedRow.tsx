"use client";

import * as React from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface ExpandedRowContext {
  columns: Array<{ id: string; width?: number }>;
  hasSelection: boolean;
  hasActions: boolean;
}

interface ChangeEventExpandedRowProps {
  changeEventId: string | number;
  projectId: number;
  colSpan: number;
  expectingRevenue?: boolean;
  context?: ExpandedRowContext;
  onEditLineItem?: (lineItemId: string) => void;
}

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
  const cc = li.budgetLine?.cost_code;
  if (cc?.title) {
    return cc.division_title ? `${cc.division_title} - ${cc.title}` : cc.title;
  }
  return li.budgetLine?.description || "--";
}

/**
 * Map a line item value to a parent column id. Returns `null` for columns
 * that don't have a meaningful line-item equivalent (rendered as dash).
 */
function lineItemValueForColumn(li: LineItem, columnId: string): React.ReactNode {
  const dash = <span className="text-muted-foreground">--</span>;

  switch (columnId) {
    case "number_title":
      return (
        <span className="pl-6 truncate block">
          {li.description || "Untitled"}
        </span>
      );
    case "status":
      return dash;
    case "scope":
      return dash;
    case "type":
      return <span className="truncate block">{formatBudgetCode(li)}</span>;
    case "reason":
      return li.vendor?.name ? <span className="truncate block">{li.vendor.name}</span> : dash;
    case "origin":
      return li.contractId ? `#${li.contractId}` : dash;
    case "revenue_prime_pco":
      return (
        <span className="tabular-nums">{formatMoney(li.revenueRom)}</span>
      );
    case "prime_pco_title":
      return dash;
    case "cost_rom":
      return <span className="tabular-nums">{formatMoney(li.costRom)}</span>;
    case "rfq_title":
      return dash;
    case "commitment":
      return li.nonCommittedCost != null && li.nonCommittedCost !== 0 ? (
        <span className="tabular-nums">{formatMoney(li.nonCommittedCost)}</span>
      ) : (
        dash
      );
    case "commitment_title":
      return dash;
    case "created_at":
      return dash;
    default:
      return dash;
  }
}

function markupValueForColumn(
  markup: { label: string; percentage: number; amount: number; markupType: string },
  columnId: string,
): React.ReactNode {
  const dash = <span className="text-muted-foreground">--</span>;

  switch (columnId) {
    case "number_title":
      return (
        <span className="pl-6 truncate block italic text-muted-foreground">
          {markup.markupType} ({markup.percentage}%)
        </span>
      );
    case "cost_rom":
      return <span className="tabular-nums">{formatMoney(markup.amount)}</span>;
    case "revenue_prime_pco":
      return <span className="tabular-nums">{formatMoney(markup.amount)}</span>;
    default:
      return dash;
  }
}

/* ── Main component ───────────────────────────────────────────────── */

export function ChangeEventExpandedRow({
  changeEventId,
  projectId,
  colSpan,
  expectingRevenue = true,
  context,
  onEditLineItem,
}: ChangeEventExpandedRowProps) {
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);
  const [markups, setMarkups] = React.useState<MarkupItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
        // Silently fail
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [projectId, changeEventId, expectingRevenue]);

  const lineItemCostSubtotal = lineItems.reduce(
    (sum, li) => sum + (li.costRom ?? 0),
    0,
  );

  const computedMarkups = React.useMemo(() => {
    if (!expectingRevenue || markups.length === 0) return [];

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

  if (isLoading) {
    return (
      <TableRow className="bg-primary/5 hover:bg-primary/5">
        <TableCell colSpan={colSpan} className="py-1 px-8">
          <Skeleton className="h-3 w-48" />
        </TableCell>
      </TableRow>
    );
  }

  if (lineItems.length === 0 && computedMarkups.length === 0) {
    return (
      <TableRow className="bg-primary/5 hover:bg-primary/5">
        <TableCell colSpan={colSpan} className="py-1 px-8">
          <p className="text-[10px] text-muted-foreground">
            No line items or markups for this change event.
          </p>
        </TableCell>
      </TableRow>
    );
  }

  // Fallback: if no context (older caller), render as a single colSpan row
  if (!context) {
    return (
      <TableRow className="bg-muted/10">
        <TableCell colSpan={colSpan} className="py-1 px-8 text-[10px] text-muted-foreground">
          {lineItems.length} line item{lineItems.length === 1 ? "" : "s"}
        </TableCell>
      </TableRow>
    );
  }

  const renderRow = (
    key: string,
    getValue: (columnId: string) => React.ReactNode,
    actions?: React.ReactNode,
  ) => (
    <TableRow
      key={key}
      className="compact-subrow !bg-muted/10 hover:!bg-muted/20 border-b border-border/40 even:!bg-muted/10"
    >
      {context.hasSelection && <TableCell className="py-1 px-2" />}
      {context.columns.map((col) => (
        <TableCell
          key={col.id}
          className="!py-1.5 !px-2 text-xs text-foreground/80 leading-4 [&_*]:!text-xs [&_*]:!leading-4"
          style={col.width ? { width: col.width, maxWidth: col.width } : undefined}
        >
          {getValue(col.id)}
        </TableCell>
      ))}
      {context.hasActions && (
        <TableCell className="py-1 px-2 text-right" onClick={(e) => e.stopPropagation()}>
          {actions}
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <>
      {lineItems.map((li) =>
        renderRow(
          `li-${li.id}`,
          (columnId) => lineItemValueForColumn(li, columnId),
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEditLineItem?.(li.id);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEditLineItem?.(li.id);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>,
        ),
      )}
      {computedMarkups.map((markup) =>
        renderRow(
          `mk-${markup.id}`,
          (columnId) => markupValueForColumn(markup, columnId),
          undefined,
        ),
      )}
    </>
  );
}
