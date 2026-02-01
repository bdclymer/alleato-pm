import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stack } from "@/components/ui/stack";
import { Inline } from "@/components/ui/inline";
import { Text } from "@/components/ui/text";
import { UomSelect } from "./UomSelect";
import { BudgetItemDeleteDialog } from "./BudgetItemDeleteDialog";
import { BudgetCodeSelector } from "@/app/(main)/[projectId]/budget/setup/components";
import type {
  BudgetLineItem,
  ProjectCostCode,
} from "@/app/(main)/[projectId]/budget/setup/types";

interface BudgetLineItemCardProps {
  item: BudgetLineItem;
  index: number;
  projectCostCodes: ProjectCostCode[];
  isPopoverOpen: boolean;
  onPopoverOpenChange: (open: boolean) => void;
  onBudgetCodeSelect: (costCode: ProjectCostCode) => void;
  onFieldChange: (field: keyof BudgetLineItem, value: string) => void;
  onRemove: () => void;
  onCreateNew: () => void;
  canRemove: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * BudgetLineItemCard - Mobile card view for budget line item
 * Displays a single line item in a card format for mobile devices
 */
export function BudgetLineItemCard({
  item,
  index,
  projectCostCodes,
  isPopoverOpen,
  onPopoverOpenChange,
  onBudgetCodeSelect,
  onFieldChange,
  onRemove,
  onCreateNew,
  canRemove,
  onKeyDown,
}: BudgetLineItemCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const handleDeleteClick = () => {
    if (!canRemove) return;
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    onRemove();
    setShowDeleteDialog(false);
  };

  // Create description for the item being deleted
  const itemDescription = item.costCodeLabel
    ? `"${item.costCodeLabel}" (Line ${index + 1})`
    : `Line ${index + 1}`;
  return (
    <div className="p-4 bg-background">
      <Stack gap="sm">
        {/* Card Header */}
        <Inline justify="between" align="start">
          <Text weight="medium">Line {index + 1}</Text>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            disabled={!canRemove}
            className="touch-target -mr-2 -mt-2"
          >
            <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
          </Button>
        </Inline>

        {/* Budget Code Selector */}
        <div>
          <Label>
            Budget Code <span className="text-destructive">*</span>
          </Label>
          <BudgetCodeSelector
            projectCostCodes={projectCostCodes}
            selectedLabel={item.costCodeLabel}
            onSelect={onBudgetCodeSelect}
            onCreateNew={onCreateNew}
            open={isPopoverOpen}
            onOpenChange={onPopoverOpenChange}
            className="w-full touch-target"
          />
        </div>

        {/* 2-Column Grid: Qty + UOM */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Qty</Label>
            <Input
              type="number"
              value={item.qty}
              onChange={(e) => onFieldChange("qty", e.target.value)}
              onKeyDown={onKeyDown}
              className="w-full touch-target"
            />
          </div>
          <div>
            <Label>UOM</Label>
            <UomSelect
              value={item.uom}
              onValueChange={(value) => onFieldChange("uom", value)}
              className="w-full touch-target"
            />
          </div>
        </div>

        {/* 2-Column Grid: Unit Cost + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Unit Cost</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                $
              </span>
              <Input
                type="number"
                value={item.unitCost}
                onChange={(e) => onFieldChange("unitCost", e.target.value)}
                onKeyDown={onKeyDown}
                className="w-full touch-target pl-7"
              />
            </div>
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              value={item.amount}
              className="w-full touch-target bg-muted"
              disabled
            />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <BudgetItemDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDeleteConfirm}
          itemDescription={itemDescription}
        />
      </Stack>
    </div>
  );
}
