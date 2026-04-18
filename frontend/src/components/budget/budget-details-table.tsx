"use client";

import * as React from "react";
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DetailType =
  | "original_budget"
  | "budget_changes"
  | "forecast_to_complete"
  | "prime_contract_change_orders"
  | "commitments"
  | "commitment_change_orders"
  | "change_events"
  | "direct_costs";

export interface BudgetDetailLineItem {
  id: string;
  budgetCode: string;
  budgetCodeDescription: string;
  vendor?: string;
  item?: string;
  detailType: DetailType;
  description?: string;
  originalBudgetAmount?: number;
  budgetChanges?: number;
  pendingBudgetChanges?: number;
  approvedCOs?: number;
  committedCosts?: number;
  pendingCostChanges?: number;
  directCosts?: number;
  forecastToComplete?: number;
  variance?: number;
}

interface BudgetDetailsTableProps {
  data: BudgetDetailLineItem[];
  loading?: boolean;
}

type SortConfig = {
  key: SortKey | null;
  direction: "asc" | "desc";
};

type SortKey =
  | "budgetCode"
  | "vendor"
  | "item"
  | "detailType"
  | "originalBudgetAmount"
  | "budgetChanges"
  | "pendingBudgetChanges"
  | "approvedCOs"
  | "committedCosts"
  | "pendingCostChanges"
  | "directCosts"
  | "variance"
  | "forecastToComplete";

const columnWidthClasses: Record<string, string> = {
  budgetCode: "w-[230px] min-w-[230px]",
  vendor: "w-[150px] min-w-[150px]",
  item: "w-[150px] min-w-[150px]",
  detailType: "w-[190px] min-w-[190px]",
  originalBudgetAmount: "w-[140px] min-w-[140px]",
  budgetChanges: "w-[140px] min-w-[140px]",
  pendingBudgetChanges: "w-[150px] min-w-[150px]",
  approvedCOs: "w-[140px] min-w-[140px]",
  committedCosts: "w-[140px] min-w-[140px]",
  pendingCostChanges: "w-[160px] min-w-[160px]",
  directCosts: "w-[140px] min-w-[140px]",
  variance: "w-[140px] min-w-[140px]",
  forecastToComplete: "w-[160px] min-w-[160px]",
};

const getWidthClass = (id: string) => columnWidthClasses[id] ?? "min-w-[120px]";

const formatCurrency = (value?: number): string => {
  if (value === undefined || value === null) return "-";
  if (value === 0) return "$0.00";

  const isNegative = value < 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  if (isNegative) {
    return `($${formatted})`;
  }
  return `$${formatted}`;
};

const getDetailTypeLabel = (type: DetailType): string => {
  const labels: Record<DetailType, string> = {
    original_budget: "Original Budget",
    budget_changes: "Budget Changes",
    forecast_to_complete: "Forecast to Complete",
    prime_contract_change_orders: "Prime Contract Change Orders",
    commitments: "Commitments",
    commitment_change_orders: "Commitment Change Orders",
    change_events: "Change Events",
    direct_costs: "Direct Costs",
  };
  return labels[type];
};

const CurrencyCell = ({ value }: { value?: number }) => {
  const numericValue = value ?? 0;
  const isEmpty = value === undefined || value === null;
  const isNegative = numericValue < 0;

  if (isEmpty) {
    return <span className="tabular-nums text-muted-foreground">-</span>;
  }

  return (
    <span className={cn("tabular-nums", isNegative && "text-destructive")}>
      {formatCurrency(numericValue)}
    </span>
  );
};

const SortableHeader = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortConfig;
  onSort: (key: SortKey) => void;
  className?: string;
}) => {
  const isSorted = currentSort.key === sortKey;

  return (
    <TableHead
      className={cn(
        "bg-background py-2 px-1.5 text-center text-[11px] font-semibold text-foreground cursor-pointer select-none",
        getWidthClass(sortKey),
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-tight">
        <span>{label}</span>
        {isSorted ? (
          currentSort.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
};

export function BudgetDetailsTable({ data, loading }: BudgetDetailsTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    key: null,
    direction: "asc",
  });

  const grandTotals = React.useMemo(() => {
    const totals = data.reduce(
      (acc, item) => ({
        originalBudgetAmount: acc.originalBudgetAmount + (item.originalBudgetAmount || 0),
        budgetChanges: acc.budgetChanges + (item.budgetChanges || 0),
        pendingBudgetChanges: acc.pendingBudgetChanges + (item.pendingBudgetChanges || 0),
        approvedCOs: acc.approvedCOs + (item.approvedCOs || 0),
        committedCosts: acc.committedCosts + (item.committedCosts || 0),
        pendingCostChanges: acc.pendingCostChanges + (item.pendingCostChanges || 0),
        directCosts: acc.directCosts + (item.directCosts || 0),
        forecastToComplete: acc.forecastToComplete + (item.forecastToComplete || 0),
      }),
      {
        originalBudgetAmount: 0,
        budgetChanges: 0,
        pendingBudgetChanges: 0,
        approvedCOs: 0,
        committedCosts: 0,
        pendingCostChanges: 0,
        directCosts: 0,
        forecastToComplete: 0,
      },
    );

    const revisedBudgetTotal = totals.originalBudgetAmount + totals.budgetChanges;
    const varianceTotal = revisedBudgetTotal - totals.directCosts;

    return { ...totals, variance: varianceTotal };
  }, [data]);

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((item) => {
      return (
        item.budgetCode?.toLowerCase().includes(query) ||
        item.budgetCodeDescription?.toLowerCase().includes(query) ||
        item.vendor?.toLowerCase().includes(query) ||
        item.item?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        getDetailTypeLabel(item.detailType).toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery]);

  const sortedAndFilteredData = React.useMemo(() => {
    const sortKey = sortConfig.key;
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;

      if (sortKey === "variance") {
        const aRevisedBudget = (a.originalBudgetAmount || 0) + (a.budgetChanges || 0);
        const bRevisedBudget = (b.originalBudgetAmount || 0) + (b.budgetChanges || 0);
        aVal = aRevisedBudget - (a.directCosts || 0);
        bVal = bRevisedBudget - (b.directCosts || 0);
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || "");
      const bStr = String(bVal || "");
      const comparison = aStr.localeCompare(bStr);
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-md bg-background">
        <div className="text-sm text-muted-foreground">Loading budget details...</div>
      </div>
    );
  }

  const hasRows = sortedAndFilteredData.length > 0;

  return (
    <div className="flex min-h-0 flex-col rounded-md bg-background">
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search budget codes, vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-base"
            />
          </div>
          {searchQuery ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-9 min-w-11"
              >
                Clear
              </Button>
              <span className="text-sm text-muted-foreground">
                {sortedAndFilteredData.length} of {data.length}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Mobile card layout — shown only on xs/sm screens */}
      <div className="block sm:hidden divide-y divide-border">
        {!hasRows ? (
          <div className="px-4 py-8 text-sm text-muted-foreground text-center">
            {searchQuery
              ? `No budget line items match "${searchQuery}".`
              : "No budget details found."}
          </div>
        ) : (
          sortedAndFilteredData.map((item) => {
            const revisedBudget = (item.originalBudgetAmount || 0) + (item.budgetChanges || 0);
            const variance = revisedBudget - (item.directCosts || 0);
            return (
              <div key={item.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{item.budgetCode}</div>
                    {item.budgetCodeDescription ? (
                      <div className="text-xs text-muted-foreground truncate">{item.budgetCodeDescription}</div>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                    {getDetailTypeLabel(item.detailType)}
                  </span>
                </div>
                {(item.vendor || item.item) ? (
                  <div className="text-xs text-muted-foreground">
                    {[item.vendor, item.item].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original</span>
                    <span className="tabular-nums font-medium"><CurrencyCell value={item.originalBudgetAmount} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mods</span>
                    <span className="tabular-nums"><CurrencyCell value={item.budgetChanges} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Committed</span>
                    <span className="tabular-nums"><CurrencyCell value={item.committedCosts} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Direct Costs</span>
                    <span className="tabular-nums"><CurrencyCell value={item.directCosts} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proj. +/-</span>
                    <span className={cn("tabular-nums", variance < 0 && "text-destructive")}>
                      <CurrencyCell value={variance} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forecast</span>
                    <span className="tabular-nums"><CurrencyCell value={item.forecastToComplete} /></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table layout — hidden on mobile */}
      <div className="hidden sm:block overflow-x-auto">
        <Table className="min-w-560 table-fixed bg-background">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="border-b border-border">
              <SortableHeader
                label="Budget Code"
                sortKey="budgetCode"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Vendor"
                sortKey="vendor"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Item"
                sortKey="item"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Detail Type"
                sortKey="detailType"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-left"
              />
              <SortableHeader
                label="Original"
                sortKey="originalBudgetAmount"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Mods"
                sortKey="budgetChanges"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Pending"
                sortKey="pendingBudgetChanges"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Approved COs"
                sortKey="approvedCOs"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Committed"
                sortKey="committedCosts"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Pending Changes"
                sortKey="pendingCostChanges"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Direct Costs"
                sortKey="directCosts"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Proj. +/-"
                sortKey="variance"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Forecast"
                sortKey="forecastToComplete"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
            </TableRow>
          </TableHeader>

          <TableBody>
            {!hasRows ? (
              <TableRow className="border-b border-border">
                <TableCell colSpan={13} className="h-11 px-4 text-sm text-muted-foreground">
                  {searchQuery
                    ? `No budget line items match "${searchQuery}".`
                    : "No budget details found."}
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredData.map((item) => {
                const revisedBudget = (item.originalBudgetAmount || 0) + (item.budgetChanges || 0);
                const variance = revisedBudget - (item.directCosts || 0);

                return (
                  <TableRow
                    key={item.id}
                    className="border-b border-border transition-colors hover:bg-muted/20"
                  >
                    <TableCell
                      className={cn("py-2 px-1.5 text-sm", getWidthClass("budgetCode"))}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{item.budgetCode}</div>
                        {item.budgetCodeDescription ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {item.budgetCodeDescription}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-sm", getWidthClass("vendor"))}
                    >
                      {item.vendor || "-"}
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-sm", getWidthClass("item"))}
                    >
                      {item.item || "-"}
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-sm", getWidthClass("detailType"))}
                    >
                      {getDetailTypeLabel(item.detailType)}
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("originalBudgetAmount"))}
                    >
                      <CurrencyCell value={item.originalBudgetAmount} />
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("budgetChanges"))}
                    >
                      <CurrencyCell value={item.budgetChanges} />
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("pendingBudgetChanges"))}
                    >
                      <CurrencyCell value={item.pendingBudgetChanges} />
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("approvedCOs"))}
                    >
                      <CurrencyCell value={item.approvedCOs} />
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("committedCosts"))}
                    >
                      <CurrencyCell value={item.committedCosts} />
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("pendingCostChanges"))}
                    >
                      <CurrencyCell value={item.pendingCostChanges} />
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("directCosts"))}
                    >
                      <CurrencyCell value={item.directCosts} />
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("variance"))}
                    >
                      <CurrencyCell value={variance} />
                    </TableCell>
                    <TableCell
                      className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("forecastToComplete"))}
                    >
                      <CurrencyCell value={item.forecastToComplete} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {hasRows && !searchQuery ? (
          <div className="border-t border-border">
            <Table className="min-w-560 table-fixed bg-background">
              <TableFooter className="bg-muted/50 border-t">
                <tr className="bg-muted/50 hover:bg-muted/50 transition-colors">
                  <td
                    className={cn(
                      "py-2 px-2 text-sm font-semibold text-foreground",
                      getWidthClass("budgetCode"),
                    )}
                    colSpan={4}
                  >
                    Grand Totals
                  </td>
                  <td
                    className={cn(
                      "py-2 px-1.5 text-right text-sm",
                      getWidthClass("originalBudgetAmount"),
                    )}
                  >
                    <CurrencyCell value={grandTotals.originalBudgetAmount} />
                  </td>
                  <td
                    className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("budgetChanges"))}
                  >
                    <CurrencyCell value={grandTotals.budgetChanges} />
                  </td>
                  <td
                    className={cn(
                      "py-2 px-1.5 text-right text-sm",
                      getWidthClass("pendingBudgetChanges"),
                    )}
                  >
                    <CurrencyCell value={grandTotals.pendingBudgetChanges} />
                  </td>
                  <td
                    className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("approvedCOs"))}
                  >
                    <CurrencyCell value={grandTotals.approvedCOs} />
                  </td>
                  <td
                    className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("committedCosts"))}
                  >
                    <CurrencyCell value={grandTotals.committedCosts} />
                  </td>
                  <td
                    className={cn(
                      "py-2 px-1.5 text-right text-sm",
                      getWidthClass("pendingCostChanges"),
                    )}
                  >
                    <CurrencyCell value={grandTotals.pendingCostChanges} />
                  </td>
                  <td
                    className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("directCosts"))}
                  >
                    <CurrencyCell value={grandTotals.directCosts} />
                  </td>
                  <td
                    className={cn("py-2 px-1.5 text-right text-sm", getWidthClass("variance"))}
                  >
                    <CurrencyCell value={grandTotals.variance} />
                  </td>
                  <td
                    className={cn(
                      "py-2 px-1.5 text-right text-sm",
                      getWidthClass("forecastToComplete"),
                    )}
                  >
                    <CurrencyCell value={grandTotals.forecastToComplete} />
                  </td>
                </tr>
              </TableFooter>
            </Table>
          </div>
        ) : null}
      </div>

      {/* Mobile grand totals */}
      {hasRows && !searchQuery ? (
        <div className="block sm:hidden border-t border-border bg-muted/50 px-4 py-3">
          <p className="text-xs font-semibold text-foreground mb-2">Grand Totals</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original</span>
              <span className="tabular-nums font-medium"><CurrencyCell value={grandTotals.originalBudgetAmount} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mods</span>
              <span className="tabular-nums"><CurrencyCell value={grandTotals.budgetChanges} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Committed</span>
              <span className="tabular-nums"><CurrencyCell value={grandTotals.committedCosts} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Direct Costs</span>
              <span className="tabular-nums"><CurrencyCell value={grandTotals.directCosts} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proj. +/-</span>
              <span className={cn("tabular-nums", grandTotals.variance < 0 && "text-destructive")}>
                <CurrencyCell value={grandTotals.variance} />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forecast</span>
              <span className="tabular-nums"><CurrencyCell value={grandTotals.forecastToComplete} /></span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
