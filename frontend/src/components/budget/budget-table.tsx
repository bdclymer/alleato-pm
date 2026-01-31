"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
  ExpandedState,
  RowSelectionState,
} from "@tanstack/react-table";
import { ChevronRight, ChevronDown, Plus, X, Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BudgetLineItem, BudgetGrandTotals } from "@/types/budget";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ColumnTooltip = {
  title: string;
  type?: "Source Column" | "Calculated Column" | "Standard Column";
  formula: string;
  details?: readonly string[];
};

const columnTooltips: Record<string, ColumnTooltip> = {
  originalBudgetAmount: {
    title: "Original Budget Amount",
    formula: "Original Budget Amount entered for this line item",
  },
  budgetModifications: {
    title: "Budget Modifications",
    formula: "Sum of all budget transfers to/from this line item",
  },
  approvedCOs: {
    title: "Approved COs",
    type: "Source Column",
    formula: "Approved COs (Prime Contract)",
    details: ["Change Orders", "Status: Approved"],
  },
  revisedBudget: {
    title: "Revised Budget",
    type: "Calculated Column",
    formula:
      "Original Budget Amount + Budget Modifications + Approved COs = Revised Budget",
  },
  jobToDateCostDetail: {
    title: "Job to Date Cost Detail",
    type: "Source Column",
    formula: "Job to Date Cost Detail (Direct Costs)",
    details: [
      "Direct Costs",
      "Type: Invoice, Expense, Payroll, Subcontractor Invoice",
      "Status: Approved",
    ],
  },
  directCosts: {
    title: "Direct Costs",
    type: "Source Column",
    formula: "Direct Costs (Direct Costs)",
    details: [
      "Direct Costs",
      "Type: Invoice, Expense, Payroll",
      "Status: Pending, Revise and Resubmit, Approved",
    ],
  },
  pendingChanges: {
    title: "Pending Budget Changes",
    type: "Source Column",
    formula: "Pending Budget Changes (Prime Contract)",
    details: [
      "Change Orders",
      "Status: Pending - In Review; Pending - Not Pricing; Pending - Not Proceeding; Pending - Pricing; Pending - Proceeding; Pending - Revised",
    ],
  },
  projectedBudget: {
    title: "Projected Budget",
    type: "Calculated Column",
    formula: "Revised Budget + Pending Budget Changes = Projected Budget",
  },
  committedCosts: {
    title: "Committed Costs",
    type: "Source Column",
    formula: "Committed Costs (Commitment)",
    details: [
      "Subcontracts — Status: Approved, Complete",
      "Purchase Order Contracts — Status: Approved",
      "Change Orders — Status: Approved",
    ],
  },
  pendingCostChanges: {
    title: "Pending Cost Changes",
    type: "Source Column",
    formula: "Pending Cost Changes (Commitment)",
    details: [
      "Subcontracts — Status: Out For Signature",
      "Purchase Order Contracts — Status: Processing, Submitted, Partially Received, Received",
      "Change Orders — Status: Pending - In Review; Pending - Not Pricing; Pending - Not Proceeding; Pending - Pricing; Pending - Proceeding; Pending - Revised",
    ],
  },
  projectedCosts: {
    title: "Projected Costs",
    type: "Calculated Column",
    formula:
      "Committed Costs + Direct Costs + Pending Cost Changes = Projected Costs",
  },
  forecastToComplete: {
    title: "Forecast To Complete",
    type: "Standard Column",
    formula: "Projected Budget - Projected Costs = Forecast To Complete",
    details: ["If negative, column will show 0."],
  },
  estimatedCostAtCompletion: {
    title: "Estimated Cost at Completion",
    type: "Calculated Column",
    formula:
      "Projected Costs + Forecast To Complete = Estimated Cost at Completion",
  },
  projectedOverUnder: {
    title: "Projected over Under",
    type: "Calculated Column",
    formula:
      "Projected Budget - Estimated Cost at Completion = Projected over Under",
  },
};

type ColumnTooltipKey = keyof typeof columnTooltips;

interface ColumnHeaderProps {
  lines: string[];
  columnKey?: ColumnTooltipKey;
}

function ColumnHeader({ lines, columnKey }: ColumnHeaderProps) {
  const label = (
    <div className="text-right leading-tight">
      {lines.map((line, index) => (
        <React.Fragment key={`${line}-${index}`}>
          {line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );

  if (!columnKey) {
    return label;
  }

  const tooltip = columnTooltips[columnKey];
  if (!tooltip) {
    return label;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-right leading-tight cursor-help text-foreground hover:text-foreground transition-colors">
          {lines.map((line, index) => (
            <React.Fragment key={`${line}-${index}`}>
              {line}
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        className="max-w-xs space-y-2 text-left leading-snug text-white"
      >
        <div>
          <p className="font-semibold text-xs text-white">{tooltip.title}</p>
          {tooltip.type && (
            <p className="text-[10px] text-white/70 mt-0.5">{tooltip.type}</p>
          )}
          <p className="text-xs mt-1 text-white">{tooltip.formula}</p>
        </div>
        {tooltip.details?.length ? (
          <ul className="list-disc space-y-1 pl-4 text-xs text-white">
            {tooltip.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

interface BudgetTableProps {
  data: BudgetLineItem[];
  grandTotals: BudgetGrandTotals;
  isLocked?: boolean;
  onEditLineItem?: (lineItem: BudgetLineItem) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onBudgetModificationsClick?: (lineItem: BudgetLineItem) => void;
  onApprovedCOsClick?: (lineItem: BudgetLineItem) => void;
  onJobToDateCostDetailClick?: (lineItem: BudgetLineItem) => void;
  onDirectCostsClick?: (lineItem: BudgetLineItem) => void;
  onPendingChangesClick?: (lineItem: BudgetLineItem) => void;
  onCommittedCostsClick?: (lineItem: BudgetLineItem) => void;
  onPendingCostChangesClick?: (lineItem: BudgetLineItem) => void;
  onForecastToCompleteClick?: (lineItem: BudgetLineItem) => void;
  onCreateLineItem?: (data: {
    costCode?: string;
    description: string;
    originalBudgetAmount: string | number;
  }) => Promise<void>;
  projectId?: string;
  showInlineCreate?: boolean;
  onShowInlineCreateChange?: (show: boolean) => void;
  /** Callback when the "Add Line Item" button is clicked in empty state */
  onAddLineItemClick?: () => void;
}

function formatCurrency(value: number): string {
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
}

function CurrencyCell({ value }: { value: number }) {
  const isNegative = value < 0;
  return (
    <span className={cn("tabular-nums", isNegative && "text-red-600")}>
      {formatCurrency(value)}
    </span>
  );
}

// Helper functions to create toast-aware click handlers
function createSafeClickHandler(
  isLocked: boolean,
  action: string,
  originalHandler?: () => void
): (() => void) | undefined {
  if (!originalHandler) return undefined;

  return () => {
    if (isLocked) {
      toast.error(`Budget is locked. Unlock to ${action}.`);
      return;
    }
    originalHandler();
  };
}

function EditableCurrencyCell({
  value,
  hasChildren,
  onEdit,
  editable = false,
}: {
  value: number;
  hasChildren: boolean;
  onEdit?: () => void;
  editable?: boolean;
}) {
  // Allow clicking on both parent and child rows when onEdit is provided
  const isClickable = onEdit && editable;

  if (isClickable) {
    return (
      <button
        type="button"
        aria-label={`Edit ${formatCurrency(value)}`}
        className={cn(
          "text-right cursor-pointer px-1 py-0.5 rounded transition-colors w-full",
          hasChildren
            ? "hover:bg-muted/80 font-semibold underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
            : "hover:bg-muted/80 underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground",
        )}
        onClick={onEdit}
      >
        <CurrencyCell value={value} />
      </button>
    );
  }

  return (
    <div className="text-right">
      <CurrencyCell value={value} />
    </div>
  );
}

const columnWidthClasses: Record<string, string> = {
  select: "w-6 min-w-[24px]",
  expander: "w-6 min-w-[24px]",
  description: "w-[280px] min-w-[240px]",
  originalBudgetAmount: "w-[130px] min-w-[120px]",
  budgetModifications: "w-[130px] min-w-[120px]",
  approvedCOs: "w-[120px] min-w-[110px]",
  revisedBudget: "w-[130px] min-w-[120px]",
  jobToDateCostDetail: "w-[140px] min-w-[130px]",
  directCosts: "w-[120px] min-w-[110px]",
  pendingChanges: "w-[120px] min-w-[110px]",
  projectedBudget: "w-[130px] min-w-[120px]",
  committedCosts: "w-[130px] min-w-[120px]",
  pendingCostChanges: "w-[130px] min-w-[120px]",
  projectedCosts: "w-[130px] min-w-[120px]",
  forecastToComplete: "w-[130px] min-w-[120px]",
  estimatedCostAtCompletion: "w-[150px] min-w-[130px]",
  projectedOverUnder: "w-[130px] min-w-[120px]",
};

const depthPaddingClasses = ["pl-0", "pl-4", "pl-8", "pl-12", "pl-16", "pl-20"];

function getWidthClass(id: string | undefined) {
  return columnWidthClasses[id ?? ""] ?? "min-w-[120px]";
}

function getDepthPadding(depth: number) {
  const index = Math.min(depth, depthPaddingClasses.length - 1);
  return depthPaddingClasses[index];
}

export function BudgetTable({
  data,
  grandTotals,
  isLocked = false,
  onEditLineItem,
  onSelectionChange,
  onBudgetModificationsClick,
  onApprovedCOsClick,
  onJobToDateCostDetailClick,
  onDirectCostsClick,
  onPendingChangesClick,
  onCommittedCostsClick,
  onPendingCostChangesClick,
  onForecastToCompleteClick,
  onCreateLineItem,
  projectId,
  showInlineCreate: showInlineCreateProp = false,
  onShowInlineCreateChange,
  onAddLineItemClick,
}: BudgetTableProps) {
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  // Use prop if provided, otherwise use internal state
  const [showInlineCreateInternal, setShowInlineCreateInternal] = React.useState(false);
  const showInlineCreate = onShowInlineCreateChange ? showInlineCreateProp : showInlineCreateInternal;
  const setShowInlineCreate = onShowInlineCreateChange || setShowInlineCreateInternal;

  const [isCreating, setIsCreating] = React.useState(false);
  const [newLineItem, setNewLineItem] = React.useState({
    costCode: "",
    description: "",
    originalBudgetAmount: "",
  });

  const handleInlineCreate = async () => {
    if (!onCreateLineItem) return;

    // Validate required fields
    if (!newLineItem.description.trim()) {
      toast.error("Description is required");
      return;
    }

    try {
      setIsCreating(true);

      await onCreateLineItem({
        costCode: newLineItem.costCode.trim() || undefined,
        description: newLineItem.description.trim(),
        originalBudgetAmount: newLineItem.originalBudgetAmount,
      });

      // Reset form
      setNewLineItem({
        costCode: "",
        description: "",
        originalBudgetAmount: "",
      });
      setShowInlineCreate(false);
      toast.success("Budget line item created successfully");
    } catch (error) {
      toast.error("Failed to create budget line item");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelInlineCreate = () => {
    setNewLineItem({
      costCode: "",
      description: "",
      originalBudgetAmount: "",
    });
    setShowInlineCreate(false);
  };

  // Effect to handle when showInlineCreate is triggered from parent
  React.useEffect(() => {
    if (showInlineCreateProp && onShowInlineCreateChange) {
      // Scroll to bottom to show the inline create row
      setTimeout(() => {
        const tableContainer = document.querySelector('[data-radix-scroll-area-viewport]') ||
                               document.querySelector('.overflow-auto');
        if (tableContainer) {
          tableContainer.scrollTo({
            top: tableContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [showInlineCreateProp, onShowInlineCreateChange]);

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedIds = Object.keys(rowSelection).filter(
        (key) => rowSelection[key],
      );
      onSelectionChange(selectedIds);
    }
  }, [rowSelection, onSelectionChange]);

  const columns: ColumnDef<BudgetLineItem>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="h-4 w-4"
        />
      ),
      cell: ({ row }) => {
        // Only show checkbox for leaf nodes (no children)
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        if (hasChildren) {
          return null;
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className="h-4 w-4"
            />
          </div>
        );
      },
      size: 24,
    },
    {
      id: "expander",
      header: () => null,
      cell: ({ row }) => {
        const canExpand =
          row.original.children && row.original.children.length > 0;
        if (!canExpand) {
          return <div className="w-4" />;
        }
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="p-0.5 hover:bg-muted rounded"
            aria-label={
              row.getIsExpanded()
                ? `Collapse ${row.original.description}`
                : `Expand ${row.original.description}`
            }
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        );
      },
      size: 24,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        const isGroupRow = hasChildren;

        return (
          <div
            className={cn(
              "font-medium",
              isGroupRow ? "text-foreground font-semibold" : "text-foreground",
              getDepthPadding(row.depth),
            )}
          >
            {isGroupRow && (
              <span className="text-foreground font-mono mr-2">
                {row.original.costCode}
              </span>
            )}
            {row.getValue("description")}
          </div>
        );
      },
      size: 250,
    },
    {
      accessorKey: "originalBudgetAmount",
      header: () => (
        <ColumnHeader
          columnKey="originalBudgetAmount"
          lines={["Original Budget"]}
        />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        const value = row.getValue("originalBudgetAmount") as number;

        return (
          <EditableCurrencyCell
            value={value}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "edit line items",
              onEditLineItem ? () => onEditLineItem(row.original) : undefined
            )}
            editable={true}
          />
        );
      },
      size: 130,
    },
    {
      accessorKey: "budgetModifications",
      header: () => (
        <ColumnHeader columnKey="budgetModifications" lines={["Budget Mods"]} />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("budgetModifications")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "view budget modifications",
              onBudgetModificationsClick
                ? () => onBudgetModificationsClick(row.original)
                : undefined
            )}
            editable={true}
          />
        );
      },
      size: 130,
    },
    {
      accessorKey: "approvedCOs",
      header: () => (
        <ColumnHeader columnKey="approvedCOs" lines={["Approved COs"]} />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("approvedCOs")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "view approved change orders",
              onApprovedCOsClick
                ? () => onApprovedCOsClick(row.original)
                : undefined
            )}
            editable={true}
          />
        );
      },
      size: 120,
    },
    {
      accessorKey: "revisedBudget",
      header: () => (
        <ColumnHeader columnKey="revisedBudget" lines={["Revised Budget"]} />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("revisedBudget")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "edit line items",
              onEditLineItem ? () => onEditLineItem(row.original) : undefined
            )}
          />
        );
      },
      size: 130,
    },
    {
      accessorKey: "jobToDateCostDetail",
      header: () => (
        <ColumnHeader
          columnKey="jobToDateCostDetail"
          lines={["JTD Cost Detail"]}
        />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("jobToDateCostDetail")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "view cost details",
              onJobToDateCostDetailClick
                ? () => onJobToDateCostDetailClick(row.original)
                : undefined
            )}
            editable={true}
          />
        );
      },
      size: 140,
    },
    {
      accessorKey: "directCosts",
      header: () => (
        <ColumnHeader columnKey="directCosts" lines={["Direct Costs"]} />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("directCosts")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "view direct costs",
              onDirectCostsClick
                ? () => onDirectCostsClick(row.original)
                : undefined
            )}
            editable={true}
          />
        );
      },
      size: 120,
    },
    {
      accessorKey: "pendingChanges",
      header: () => (
        <ColumnHeader
          columnKey="pendingChanges"
          lines={["Pending", "Changes"]}
        />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("pendingChanges")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "view pending changes",
              onPendingChangesClick
                ? () => onPendingChangesClick(row.original)
                : undefined
            )}
            editable={true}
          />
        );
      },
      size: 110,
    },
    {
      accessorKey: "projectedBudget",
      header: () => (
        <ColumnHeader
          columnKey="projectedBudget"
          lines={["Projected Budget"]}
        />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("projectedBudget")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "edit line items",
              onEditLineItem ? () => onEditLineItem(row.original) : undefined
            )}
          />
        );
      },
      size: 130,
    },
    {
      accessorKey: "committedCosts",
      header: () => (
        <ColumnHeader columnKey="committedCosts" lines={["Committed Costs"]} />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("committedCosts")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "view committed costs",
              onCommittedCostsClick
                ? () => onCommittedCostsClick(row.original)
                : undefined
            )}
            editable={true}
          />
        );
      },
      size: 130,
    },
    {
      accessorKey: "pendingCostChanges",
      header: () => (
        <ColumnHeader
          columnKey="pendingCostChanges"
          lines={["Pending Cost", "Changes"]}
        />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("pendingCostChanges")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "view pending cost changes",
              onPendingCostChangesClick
                ? () => onPendingCostChangesClick(row.original)
                : undefined
            )}
            editable={true}
          />
        );
      },
      size: 130,
    },
    {
      accessorKey: "projectedCosts",
      header: () => (
        <ColumnHeader columnKey="projectedCosts" lines={["Projected Costs"]} />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("projectedCosts")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "edit line items",
              onEditLineItem ? () => onEditLineItem(row.original) : undefined
            )}
          />
        );
      },
      size: 130,
    },
    {
      accessorKey: "forecastToComplete",
      header: () => (
        <ColumnHeader
          columnKey="forecastToComplete"
          lines={["Forecast to", "Complete"]}
        />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("forecastToComplete")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "edit forecast",
              onForecastToCompleteClick
                ? () => onForecastToCompleteClick(row.original)
                : undefined
            )}
            editable={true}
          />
        );
      },
      size: 130,
    },
    {
      accessorKey: "estimatedCostAtCompletion",
      header: () => (
        <ColumnHeader
          columnKey="estimatedCostAtCompletion"
          lines={["Estimated Cost at", "Completion"]}
        />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("estimatedCostAtCompletion")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "edit line items",
              onEditLineItem ? () => onEditLineItem(row.original) : undefined
            )}
          />
        );
      },
      size: 150,
    },
    {
      accessorKey: "projectedOverUnder",
      header: () => (
        <ColumnHeader
          columnKey="projectedOverUnder"
          lines={["Projected", "Over / Under"]}
        />
      ),
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        return (
          <EditableCurrencyCell
            value={row.getValue("projectedOverUnder")}
            hasChildren={hasChildren}
            onEdit={createSafeClickHandler(
              isLocked,
              "edit line items",
              onEditLineItem ? () => onEditLineItem(row.original) : undefined
            )}
          />
        );
      },
      size: 130,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
      rowSelection,
    },
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.children,
    getRowId: (row) => row.id,
    enableRowSelection: (row) =>
      !row.original.children || row.original.children.length === 0,
  });

  // Check if table is empty (no rows and not showing inline create)
  const isEmpty = !table.getRowModel().rows?.length && !showInlineCreate;

  return (
    <div className="flex flex-col h-full rounded-md overflow-hidden">
      {/* Empty state - centered on page, outside of scrollable table */}
      {isEmpty && (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="text-muted-foreground mb-2">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900">No budget line items</h3>
            <p className="text-sm text-gray-500">Get started by adding your first budget line item.</p>
            <Button
              onClick={() => {
                if (onAddLineItemClick) {
                  onAddLineItemClick();
                } else {
                  setShowInlineCreate(true);
                }
              }}
              disabled={isLocked}
              className="mt-2 bg-brand hover:bg-brand/90"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Line Item
            </Button>
          </div>
        </div>
      )}

      {/* Table - only render when there's data or inline create is showing */}
      {!isEmpty && (
        <>
          {/* Hide scrollbar while maintaining scroll functionality */}
          <div className="flex-1 overflow-auto scrollbar-hide">
            <Table className="min-w-[1200px]">
              <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b border-border"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "text-xs font-semibold text-foreground py-2 bg-muted/50",
                          header.column.id === "select"
                            ? "pl-3 pr-0.5"
                            : header.column.id === "expander"
                              ? "px-0.5"
                              : "px-1.5",
                          getWidthClass(header.column.id),
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row, index) => {
                  const hasChildren =
                    row.original.children && row.original.children.length > 0;
                  const isGroupRow = hasChildren;

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "border-b border-border transition-colors",
                        isGroupRow && "bg-muted/50 hover:bg-muted/60 font-semibold",
                        !isGroupRow && "hover:bg-muted/30",
                        row.getIsSelected() && "bg-brand/5",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "py-2 text-sm",
                            cell.column.id === "select"
                              ? "pl-3 pr-0.5"
                              : cell.column.id === "expander"
                                ? "px-0.5"
                                : "px-1.5",
                            row.depth > 0 && "text-foreground",
                            getWidthClass(cell.column.id),
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}

            {/* Inline Create Row */}
            {!isLocked && showInlineCreate && (
              <TableRow className="bg-brand/5 border-b border-border">
                <TableCell className="py-2 pl-3 pr-0.5">
                  {/* Empty checkbox cell */}
                </TableCell>
                <TableCell className="py-2 px-0.5">
                  {/* Empty expander cell */}
                </TableCell>
                <TableCell className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Cost Code (optional)"
                      value={newLineItem.costCode}
                      onChange={(e) =>
                        setNewLineItem({ ...newLineItem, costCode: e.target.value })
                      }
                      className="h-8 w-24"
                      disabled={isCreating}
                    />
                    <Input
                      placeholder="Description *"
                      value={newLineItem.description}
                      onChange={(e) =>
                        setNewLineItem({ ...newLineItem, description: e.target.value })
                      }
                      className="h-8 flex-1"
                      disabled={isCreating}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isCreating) {
                          handleInlineCreate();
                        }
                        if (e.key === "Escape") {
                          handleCancelInlineCreate();
                        }
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell className="py-2 px-2 text-right">
                  <NumberInput
                    placeholder="Amount *"
                    value={newLineItem.originalBudgetAmount}
                    onChange={(e) =>
                      setNewLineItem({ ...newLineItem, originalBudgetAmount: e.target.value })
                    }
                    className="h-8 text-right"
                    disabled={isCreating}
                    clearZeroOnFocus={true}
                    autoSelectOnFocus={true}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isCreating) {
                        handleInlineCreate();
                      }
                      if (e.key === "Escape") {
                        handleCancelInlineCreate();
                      }
                    }}
                  />
                </TableCell>
                {/* Empty cells for other columns */}
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2" />
                <TableCell className="py-2 px-2">
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleInlineCreate}
                      disabled={isCreating || !newLineItem.description.trim()}
                      title="Save (Enter)"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleCancelInlineCreate}
                      disabled={isCreating}
                      title="Cancel (Escape)"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

              </TableBody>
            </Table>
          </div>

          {/* Grand Totals Row - Fixed at bottom - Only show if there are rows */}
          {table.getRowModel().rows?.length > 0 && (
        <div className="border-t-2 border-border bg-muted sticky bottom-0">
          <table className="w-full caption-bottom text-sm table-fixed">
            <tbody>
              <tr className="font-semibold bg-muted border-b transition-colors">
                <td className={cn("py-3 pl-3 pr-0.5", getWidthClass("select"))} />
                <td className={cn("py-3 px-0.5", getWidthClass("expander"))} />
                <td
                  className={cn(
                    "py-3 px-2 text-sm font-bold text-foreground",
                    getWidthClass("description"),
                  )}
                >
                  Grand Totals
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("originalBudgetAmount"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.originalBudgetAmount} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("budgetModifications"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.budgetModifications} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("approvedCOs"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.approvedCOs} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("revisedBudget"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.revisedBudget} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("jobToDateCostDetail"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.jobToDateCostDetail} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("directCosts"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.directCosts} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("pendingChanges"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.pendingChanges} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("projectedBudget"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.projectedBudget} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("committedCosts"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.committedCosts} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("pendingCostChanges"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.pendingCostChanges} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("projectedCosts"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.projectedCosts} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("forecastToComplete"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.forecastToComplete} />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("estimatedCostAtCompletion"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell
                      value={grandTotals.estimatedCostAtCompletion}
                    />
                  </div>
                </td>
                <td
                  className={cn(
                    "py-3 px-2 text-sm",
                    getWidthClass("projectedOverUnder"),
                  )}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.projectedOverUnder} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  );
}
