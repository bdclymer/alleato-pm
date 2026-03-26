import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/ui/stack";
import { Inline } from "@/components/ui/inline";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { BudgetLineItemRow } from "./BudgetLineItemRow";
import { BudgetLineItemCard } from "./BudgetLineItemCard";
import type {
  BudgetLineItem,
  ProjectCostCode,
} from "@/app/(main)/[projectId]/budget/setup/types";

interface BudgetLineItemTableProps {
  lineItems: BudgetLineItem[];
  projectCostCodes: ProjectCostCode[];
  loadingData: boolean;
  openPopoverId: string | null;
  onPopoverOpenChange: (id: string, open: boolean) => void;
  onBudgetCodeSelect: (rowId: string, costCode: ProjectCostCode) => void;
  onFieldChange: (
    id: string,
    field: keyof BudgetLineItem,
    value: string,
  ) => void;
  onRemoveRow: (id: string) => void;
  onCreateNew: (rowId: string) => void;
  onAddRow: () => void;
  onSubmit: () => void;
  loading: boolean;
}

/**
 * BudgetLineItemTable - Main table component for budget line items
 * Renders desktop table and mobile card views
 */
export function BudgetLineItemTable({
  lineItems,
  projectCostCodes,
  loadingData,
  openPopoverId,
  onPopoverOpenChange,
  onBudgetCodeSelect,
  onFieldChange,
  onRemoveRow,
  onCreateNew,
  onAddRow,
  onSubmit,
  loading,
}: BudgetLineItemTableProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddRow();
    }
  };

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0,
  );

  return (
    <div className="sm:border sm:rounded-md sm:bg-card sm:shadow-xs">
      <Stack gap="sm">
        {/* Summary Bar */}
        <div className="border-b bg-muted px-4 sm:px-6 py-4 sm:rounded-t-md">
          <Inline justify="between" align="center">
            <Text size="sm" weight="medium" tone="default">
              {lineItems.length} Line Item{lineItems.length !== 1 ? "s" : ""}
            </Text>
            <Text size="sm" weight="semibold">
              Total: $
              {totalAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </Inline>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <div className="min-w-full">
            {/* Table Header */}
            <div className="border-b bg-background px-4 py-4">
              <Inline gap="md" align="center">
                <div className="flex-1 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Budget Code
                </div>
                <div className="w-16 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Qty
                </div>
                <div className="w-20 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  UOM
                </div>
                <div className="w-28 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Unit Cost
                </div>
                <div className="w-28 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Amount
                </div>
                <div className="w-10 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {/* Delete column header */}
                </div>
              </Inline>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border bg-background">
              {loadingData ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <Text tone="muted">Loading project cost codes...</Text>
                </div>
              ) : lineItems.length === 0 ? (
                <div className="px-4 py-8">
                  <EmptyState
                    title="No line items"
                    description='Click "Add Row" to get started.'
                  />
                </div>
              ) : (
                lineItems.map((row) => (
                  <BudgetLineItemRow
                    key={row.id}
                    item={row}
                    projectCostCodes={projectCostCodes}
                    isPopoverOpen={openPopoverId === row.id}
                    onPopoverOpenChange={(open) =>
                      onPopoverOpenChange(row.id, open)
                    }
                    onBudgetCodeSelect={(costCode) =>
                      onBudgetCodeSelect(row.id, costCode)
                    }
                    onFieldChange={(field, value) =>
                      onFieldChange(row.id, field, value)
                    }
                    onRemove={() => onRemoveRow(row.id)}
                    onCreateNew={() => onCreateNew(row.id)}
                    canRemove={lineItems.length > 1}
                    onKeyDown={handleKeyDown}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden">
          {loadingData ? (
            <div className="text-center py-8 px-4">
              <Text tone="muted">Loading project cost codes...</Text>
            </div>
          ) : lineItems.length === 0 ? (
            <div className="px-4 py-8">
              <EmptyState
                title="No line items"
                description='Click "Add Row" to get started.'
              />
            </div>
          ) : (
            <Stack gap="md">
              {lineItems.map((row, index) => (
                <BudgetLineItemCard
                  key={row.id}
                  item={row}
                  index={index}
                  projectCostCodes={projectCostCodes}
                  isPopoverOpen={openPopoverId === row.id}
                  onPopoverOpenChange={(open) =>
                    onPopoverOpenChange(row.id, open)
                  }
                  onBudgetCodeSelect={(costCode) =>
                    onBudgetCodeSelect(row.id, costCode)
                  }
                  onFieldChange={(field, value) =>
                    onFieldChange(row.id, field, value)
                  }
                  onRemove={() => onRemoveRow(row.id)}
                  onCreateNew={() => onCreateNew(row.id)}
                  canRemove={lineItems.length > 1}
                  onKeyDown={handleKeyDown}
                />
              ))}

              {/* Mobile Action Buttons */}
              <div className="space-y-2 px-1">
                <Button
                  onClick={onAddRow}
                  variant="outline"
                  className="w-full h-10"
                >
                  <Plus />
                  Add Line Item
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={loading || lineItems.length === 0}
                  className="w-full h-10"
                >
                  {loading
                    ? "Creating..."
                    : `Create ${lineItems.length} Line Item${lineItems.length !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </Stack>
          )}
        </div>
      </Stack>
    </div>
  );
}
