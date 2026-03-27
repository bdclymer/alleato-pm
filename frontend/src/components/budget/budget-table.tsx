"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
  ExpandedState,
  RowSelectionState,
} from "@tanstack/react-table";
import { ChevronRight, ChevronDown, X, Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { CellCommentIndicator } from "@/components/comments/cell-comment-indicator";

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

function TruncatedHeaderLabel({ text }: { text: string }) {
  const labelRef = React.useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  React.useEffect(() => {
    const node = labelRef.current;
    if (!node) {
      return;
    }

    const checkTruncation = () => {
      setIsTruncated(node.scrollWidth > node.clientWidth);
    };

    checkTruncation();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [text]);

  const label = (
    <div
      ref={labelRef}
      className="truncate whitespace-nowrap text-center text-[11px] leading-tight"
    >
      {text}
    </div>
  );

  if (!isTruncated) {
    return label;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">{label}</div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" className="max-w-xs text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function ColumnHeader({ lines, columnKey }: ColumnHeaderProps) {
  const labelText = lines.join(" ");

  const label = <TruncatedHeaderLabel text={labelText} />;

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
        <div className="cursor-help whitespace-nowrap text-center text-[11px] leading-tight text-foreground transition-colors hover:text-foreground">
          {labelText}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        className="max-w-xs space-y-2 text-left leading-snug"
      >
        <div>
          <p className="font-semibold text-xs">{tooltip.title}</p>
          {tooltip.type && (
            <p className="text-2xs opacity-70 mt-0.5">{tooltip.type}</p>
          )}
          <p className="text-xs mt-1">{tooltip.formula}</p>
        </div>
        {tooltip.details?.length ? (
          <ul className="list-disc space-y-1 pl-4 text-xs">
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
    <span className={cn("tabular-nums", isNegative && "text-destructive")}>
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
  onEdit,
  editable = false,
}: {
  value: number;
  hasChildren?: boolean;
  onEdit?: () => void;
  editable?: boolean;
}) {
  // Allow clicking on both parent and child rows when onEdit is provided
  const isClickable = onEdit && editable;

  if (isClickable) {
    return (
      <Button
        type="button"
        variant="ghost"
        aria-label={`Edit ${formatCurrency(value)}`}
        className={cn(
          "text-right cursor-pointer px-1 py-0.5 rounded transition-colors w-full h-auto font-normal",
          "hover:bg-muted/80 underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground",
        )}
        onClick={onEdit}
      >
        <CurrencyCell value={value} />
      </Button>
    );
  }

  return (
    <div className="text-right">
      <CurrencyCell value={value} />
    </div>
  );
}

const depthPaddingClasses = ["pl-0", "pl-4", "pl-8", "pl-12", "pl-16", "pl-20"];

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
}: BudgetTableProps) {
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
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
      minSize: 24,
      maxSize: 24,
      enableResizing: false,
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="h-6 w-6 hover:bg-muted"
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
          </Button>
        );
      },
      size: 24,
      minSize: 24,
      maxSize: 24,
      enableResizing: false,
    },
    {
      accessorKey: "description",
      header: () => <ColumnHeader lines={["Description"]} />,
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0);
        const isGroupRow = hasChildren;

        return (
          <div
            className={cn(
              "flex items-center gap-1 min-w-0",
              isGroupRow ? "text-foreground font-medium" : "text-foreground font-normal",
              getDepthPadding(row.depth),
            )}
            title={String(row.getValue("description"))}
          >
            {isGroupRow && (
              <span className="text-muted-foreground font-mono text-xs shrink-0">
                {row.original.costCode}
              </span>
            )}
            <span className="truncate">{String(row.getValue("description"))}</span>
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
          lines={["original"]}
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
        <ColumnHeader columnKey="budgetModifications" lines={["mods"]} />
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
        <ColumnHeader columnKey="revisedBudget" lines={["revised"]} />
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
          lines={["pending"]}
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
          lines={["Proj.", "Budget"]}
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
        <ColumnHeader columnKey="committedCosts" lines={["committed"]} />
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
          lines={["pending", "changes"]}
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
        <ColumnHeader columnKey="projectedCosts" lines={["Proj. Costs"]} />
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
          lines={["forecast"]}
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
          lines={["Est. Total Cost"]}
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
          lines={["Proj. +/-"]}
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
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const hasChildren = Boolean(
          row.original.children && row.original.children.length > 0
        );
        if (hasChildren || !onEditLineItem) {
          return null;
        }

        const handleEdit = createSafeClickHandler(
          isLocked,
          "edit line items",
          () => onEditLineItem(row.original)
        );

        return (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEdit}
              aria-label="Edit line item"
            >
              <Pencil className="text-muted-foreground" />
            </Button>
          </div>
        );
      },
      size: 48,
      minSize: 40,
      maxSize: 56,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      expanded,
      rowSelection,
      columnSizing,
    },
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    defaultColumn: {
      minSize: 96,
      maxSize: 600,
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.children,
    getRowId: (row) => row.id,
    enableRowSelection: (row) =>
      !row.original.children || row.original.children.length === 0,
  });

  const rows = table.getRowModel().rows;
  const hasRows = rows.length > 0;
  const emptyRowCount = hasRows ? 0 : 8;
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const trailingInlineCreateColumnSpan = Math.max(0, visibleColumnCount - 5);
  const tableWidth = table.getTotalSize();
  const getColumnSizeStyle = (columnId: string) => {
    const column = table.getColumn(columnId);
    const width = column?.getSize();
    return width ? { width: `${width}px`, minWidth: `${width}px` } : undefined;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md bg-background">
      {/* Hide scrollbar while maintaining scroll functionality */}
      <div className="flex-1 overflow-auto scrollbar-hide">
        <Table
          className="table-fixed bg-background"
          style={{ width: `${tableWidth}px`, minWidth: "100%" }}
        >
              <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b border-border"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "relative bg-background py-2 text-center text-[11px] font-semibold text-foreground",
                          header.column.id === "select"
                            ? "pl-1 pr-0.5"
                            : header.column.id === "expander"
                              ? "px-0.5"
                              : "px-1.5",
                        )}
                        style={getColumnSizeStyle(header.column.id)}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {header.column.getCanResize() ? (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              "absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none",
                              "bg-transparent hover:bg-border/80",
                              header.column.getIsResizing() && "bg-border",
                            )}
                            aria-hidden="true"
                          />
                        ) : null}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const hasChildren =
                    row.original.children && row.original.children.length > 0;

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "border-b border-border transition-colors",
                        "hover:bg-muted/20",
                        row.getIsSelected() && "bg-primary/5",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isDataColumn =
                          cell.column.id !== "select" &&
                          cell.column.id !== "expander" &&
                          cell.column.id !== "description" &&
                          cell.column.id !== "actions";

                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "py-2 text-sm",
                              cell.column.id === "select"
                                ? "pl-1 pr-0.5"
                                : cell.column.id === "expander"
                                  ? "px-0.5"
                                  : "px-1.5",
                              row.depth > 0 && "text-foreground",
                              isDataColumn && "group/cell",
                            )}
                            style={getColumnSizeStyle(cell.column.id)}
                          >
                            {isDataColumn ? (
                              <div className="flex items-center gap-0.5">
                                <div className="flex-1 min-w-0">
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </div>
                                <CellCommentIndicator
                                  rowId={row.original.id}
                                  columnId={cell.column.id}
                                />
                              </div>
                            ) : (
                              flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                {!hasRows &&
                  Array.from({ length: emptyRowCount }).map((_, index) => (
                    <TableRow key={`empty-row-${index}`} className="border-b border-border">
                      <TableCell
                        colSpan={visibleColumnCount}
                        className={cn(
                          "h-11 px-4",
                          index === 0 && "text-sm text-muted-foreground",
                        )}
                      >
                        {index === 0 ? "No budget line items yet." : null}
                      </TableCell>
                    </TableRow>
                  ))}

            {/* Inline Create Row */}
            {!isLocked && showInlineCreate && (
              <TableRow className="bg-primary/5 border-b border-border">
                <TableCell className="py-2 pl-1 pr-0.5">
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
                {/* Empty cells for remaining data columns */}
                <TableCell className="py-2 px-2" colSpan={trailingInlineCreateColumnSpan}>
                  &nbsp;
                </TableCell>
                <TableCell className="py-2 px-2" style={getColumnSizeStyle("actions")}>
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleInlineCreate}
                      disabled={isCreating || !newLineItem.description.trim()}
                      title="Save (Enter)"
                    >
                      <Check className="text-success" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleCancelInlineCreate}
                      disabled={isCreating}
                      title="Cancel (Escape)"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

              </TableBody>
        </Table>
      </div>

      {/* Grand Totals Row - Fixed at bottom */}
      <div className="sticky bottom-0 border-t border-border bg-background">
          <table
            className="w-full caption-bottom text-sm table-fixed"
            style={{ width: `${tableWidth}px`, minWidth: "100%" }}
          >
            <TableFooter className="bg-muted/50 border-t">
              <tr className="bg-muted/50 hover:bg-muted/50 transition-colors">
                <td className="py-4 pl-1 pr-0.5" style={getColumnSizeStyle("select")} />
                <td className="py-4 px-0.5" style={getColumnSizeStyle("expander")} />
                <td
                  className="py-4 px-2 text-sm font-semibold text-foreground"
                  style={getColumnSizeStyle("description")}
                >
                  Grand Totals
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("originalBudgetAmount")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.originalBudgetAmount} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("budgetModifications")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.budgetModifications} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("approvedCOs")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.approvedCOs} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("revisedBudget")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.revisedBudget} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("jobToDateCostDetail")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.jobToDateCostDetail} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("directCosts")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.directCosts} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("pendingChanges")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.pendingChanges} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("projectedBudget")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.projectedBudget} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("committedCosts")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.committedCosts} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("pendingCostChanges")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.pendingCostChanges} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("projectedCosts")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.projectedCosts} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("forecastToComplete")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.forecastToComplete} />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("estimatedCostAtCompletion")}
                >
                  <div className="text-right">
                    <CurrencyCell
                      value={grandTotals.estimatedCostAtCompletion}
                    />
                  </div>
                </td>
                <td
                  className="py-4 px-2 text-sm"
                  style={getColumnSizeStyle("projectedOverUnder")}
                >
                  <div className="text-right">
                    <CurrencyCell value={grandTotals.projectedOverUnder} />
                  </div>
                </td>
                <td className="py-4 px-2 text-sm" style={getColumnSizeStyle("actions")} />
              </tr>
            </TableFooter>
          </table>
        </div>
    </div>
  );
}
