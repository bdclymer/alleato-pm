"use client";

import * as React from "react";
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Budget Detail Type represents the different types of line items
 * that can appear in the Budget Detail tab
 */
export type DetailType =
  | "original_budget"
  | "budget_changes"
  | "forecast_to_complete"
  | "prime_contract_change_orders"
  | "commitments"
  | "commitment_change_orders"
  | "change_events"
  | "direct_costs";

/**
 * Budget Detail Line Item represents a single row in the Budget Detail tab
 */
export interface BudgetDetailLineItem {
  id: string;
  budgetCode: string;
  budgetCodeDescription: string;
  vendor?: string;
  item?: string; // Associated item like change event
  detailType: DetailType;
  description?: string;

  // Amounts for different columns (Procore Standard Budget View)
  originalBudgetAmount?: number;
  budgetChanges?: number;
  pendingBudgetChanges?: number;
  approvedCOs?: number;
  committedCosts?: number;
  pendingCostChanges?: number;
  directCosts?: number;
  forecastToComplete?: number;
  variance?: number; // Calculated: Revised Budget - Direct Costs
}

interface BudgetDetailsTableProps {
  data: BudgetDetailLineItem[];
  loading?: boolean;
}

type SortConfig = {
  key: string | null;
  direction: "asc" | "desc";
};

const formatCurrency = (value?: number): string => {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
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

/**
 * SortableHeader component for table column headers
 */
const SortableHeader = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  currentSort: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}) => {
  const isSorted = currentSort.key === sortKey;

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 font-semibold",
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        {isSorted ? (
          currentSort.direction === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
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

  // Calculate grand totals
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
      }
    );

    // Calculate variance for totals
    const revisedBudgetTotal = totals.originalBudgetAmount + totals.budgetChanges;
    const varianceTotal = revisedBudgetTotal - totals.directCosts;

    return { ...totals, variance: varianceTotal };
  }, [data]);

  // Filter data based on search query
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

  // Sort filtered data
  const sortedAndFilteredData = React.useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      // Special handling for variance column (calculated field)
      if (sortConfig.key === "variance") {
        const aRevisedBudget = (a.originalBudgetAmount || 0) + (a.budgetChanges || 0);
        const bRevisedBudget = (b.originalBudgetAmount || 0) + (b.budgetChanges || 0);
        aVal = aRevisedBudget - (a.directCosts || 0);
        bVal = bRevisedBudget - (b.directCosts || 0);
      } else {
        aVal = (a as any)[sortConfig.key!];
        bVal = (b as any)[sortConfig.key!];
      }

      // Handle different types
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || "");
      const bStr = String(bVal || "");
      const comparison = aStr.localeCompare(bStr);

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Handle column sort
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading budget details...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">No budget details found</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background shadow-sm">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search budget codes, descriptions, vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
            >
              Clear
            </Button>
          )}
          {searchQuery && (
            <span className="text-sm text-muted-foreground">
              {sortedAndFilteredData.length} of {data.length} items
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-hide">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <SortableHeader
                label="Budget Code"
                sortKey="budgetCode"
                currentSort={sortConfig}
                onSort={handleSort}
              />
              <SortableHeader
                label="Vendor"
                sortKey="vendor"
                currentSort={sortConfig}
                onSort={handleSort}
              />
              <SortableHeader
                label="Item"
                sortKey="item"
                currentSort={sortConfig}
                onSort={handleSort}
              />
              <SortableHeader
                label="Detail Type"
                sortKey="detailType"
                currentSort={sortConfig}
                onSort={handleSort}
              />
              <SortableHeader
                label="Original Budget Amount"
                sortKey="originalBudgetAmount"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Budget Changes"
                sortKey="budgetChanges"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Pending Budget Changes"
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
                label="Committed Costs"
                sortKey="committedCosts"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Pending Cost Changes"
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
                label="Variance"
                sortKey="variance"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Forecast to Complete"
                sortKey="forecastToComplete"
                currentSort={sortConfig}
                onSort={handleSort}
                className="text-right"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredData.length === 0 && searchQuery ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No budget line items match &ldquo;{searchQuery}&rdquo;
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredData.map((item) => {
                // Calculate variance: Revised Budget - Direct Costs
                const revisedBudget = (item.originalBudgetAmount || 0) + (item.budgetChanges || 0);
                const directCosts = item.directCosts || 0;
                const variance = revisedBudget - directCosts;

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "hover:bg-muted",
                      item.detailType === "original_budget" && "font-medium",
                    )}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.budgetCode}</span>
                        {item.budgetCodeDescription && (
                          <span className="text-sm text-muted-foreground">
                            {item.budgetCodeDescription}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.vendor || "-"}</TableCell>
                    <TableCell className="text-sm">{item.item || "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {getDetailTypeLabel(item.detailType)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.originalBudgetAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.budgetChanges)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.pendingBudgetChanges)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.approvedCOs)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.committedCosts)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.pendingCostChanges)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.directCosts)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span
                        className={cn(
                          "font-medium",
                          variance > 0 && "text-green-600 dark:text-green-400",
                          variance < 0 && "text-red-600 dark:text-red-400",
                          variance === 0 && "text-muted-foreground",
                        )}
                      >
                        {formatCurrency(variance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.forecastToComplete)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {/* Grand Totals Row */}
            {sortedAndFilteredData.length > 0 && !searchQuery && (
              <TableRow className="font-semibold bg-muted/50 border-t-2 border-border">
                <TableCell colSpan={4} className="text-left">
                  Grand Totals
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(grandTotals.originalBudgetAmount)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(grandTotals.budgetChanges)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(grandTotals.pendingBudgetChanges)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(grandTotals.approvedCOs)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(grandTotals.committedCosts)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(grandTotals.pendingCostChanges)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(grandTotals.directCosts)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <span
                    className={cn(
                      "font-semibold",
                      grandTotals.variance > 0 && "text-green-600 dark:text-green-400",
                      grandTotals.variance < 0 && "text-red-600 dark:text-red-400",
                      grandTotals.variance === 0 && "text-muted-foreground",
                    )}
                  >
                    {formatCurrency(grandTotals.variance)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(grandTotals.forecastToComplete)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
