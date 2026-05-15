import {
  ChevronDown,
  FileText,
  GripVertical,
  Lock,
  MoreVertical,
  Plus,
  Rows3,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { SectionRuleHeading } from "@/components/layout";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyField } from "@/components/forms/MoneyField";
import { Input } from "@/components/ui/input";
import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
} from "@/components/ds/inline-table";
import { EmptyState } from "@/components/ds";
import { getCostTypeLabel } from "@/constants/budget";
import type { BudgetCode, ContractLineItem } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

export interface PrimeContractSovTabProps {
  formatCurrency: (value: number | null | undefined) => string;
  lineItemsLoading: boolean;
  lineItems: ContractLineItem[];
  budgetCodes: BudgetCode[];
  sovDraftBudgetCodeIds: Record<string, string>;
  isSovEditing: boolean;
  isSavingSovChanges: boolean;
  sovDraftItems: ContractLineItem[];
  onStartSovEdit: () => void;
  onCancelSovEdit: () => void;
  onSaveSovEdit: () => Promise<void>;
  onAddSovLine: () => void;
  onAddSovGroup: () => void;
  onUpdateSovLine: (
    lineId: string,
    updates: Partial<Pick<ContractLineItem, "description" | "quantity" | "unit_of_measure" | "unit_cost" | "cost_code_id">>,
  ) => void;
  onUpdateSovLineBudgetCode: (lineId: string, budgetCodeId: string) => void;
  onRemoveSovLine: (lineId: string) => void;
  onReorderSovLines: (oldIndex: number, newIndex: number) => void;
  onRequestCreateBudgetCode: (lineId: string) => void;
  onDeleteSovLine?: (lineId: string) => Promise<void>;
  onImportEstimateToSov?: () => void;
  /** Billed-to-date amount used to compute per-line percentages. */
  invoicedAmount?: number | null;
}

export function PrimeContractSovTab({
  formatCurrency,
  lineItemsLoading,
  lineItems,
  budgetCodes,
  sovDraftBudgetCodeIds,
  isSovEditing,
  isSavingSovChanges,
  sovDraftItems,
  onStartSovEdit,
  onCancelSovEdit,
  onSaveSovEdit,
  onAddSovLine,
  onAddSovGroup,
  onUpdateSovLine,
  onUpdateSovLineBudgetCode,
  onRemoveSovLine,
  onReorderSovLines,
  onRequestCreateBudgetCode,
  onDeleteSovLine,
  onImportEstimateToSov,
  invoicedAmount,
}: PrimeContractSovTabProps) {
  const displayedSovItems = isSovEditing ? sovDraftItems : lineItems;

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  const sortableIds = useMemo(
    () => displayedSovItems.map((item) => item.id),
    [displayedSovItems],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortableIds.indexOf(active.id as string);
    const newIndex = sortableIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderSovLines(oldIndex, newIndex);
    }
  };

  const displayedSovTotal = displayedSovItems.reduce((sum, item) => {
    if (item.is_group_header) return sum;
    return sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
  }, 0);

  const invoicesTotal = Number(invoicedAmount) || 0;
  const billedToDateRatio =
    displayedSovTotal > 0 ? Math.min(1, Math.max(0, invoicesTotal / displayedSovTotal)) : 0;

  return (
    <div className="space-y-4 pb-20">
      <SectionRuleHeading
        label="Schedule of Values"
        actions={
          isSovEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={onCancelSovEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={onSaveSovEdit} disabled={isSavingSovChanges}>
                {isSavingSovChanges ? "Saving..." : "Save"}
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {isSovEditing && (
          <div className="rounded-md border-l-4 border-primary bg-muted p-4 text-sm">
            <p className="font-semibold">Any changes will only apply to future invoices</p>
            <p className="text-muted-foreground">Existing invoices will not be affected.</p>
          </div>
        )}

        {lineItemsLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading schedule of values...
          </div>
        ) : displayedSovItems.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No SOV lines yet"
            description="Add SOV lines with budget codes to track the contract value."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onStartSovEdit();
                  onAddSovLine();
                }}
              >
                <Plus />
                Add SOV Line
              </Button>
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="overflow-hidden overflow-x-auto rounded-md border border-border/70 bg-muted/20">
                <InlineTable variant="edit">
                  <InlineTableHeader className="border-y-0 [&_tr]:border-b-0">
                    <InlineTableHeaderRow className="bg-muted/70 hover:bg-muted/70">
                      <InlineTableHeaderCell className="w-10 px-1 py-1.5" />
                      <InlineTableHeaderCell className="min-w-72 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Budget Code
                      </InlineTableHeaderCell>
                      <InlineTableHeaderCell className="min-w-64 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Description
                      </InlineTableHeaderCell>
                      <InlineTableHeaderCell align="right" className="w-20 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Qty
                      </InlineTableHeaderCell>
                      <InlineTableHeaderCell className="w-16 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        UOM
                      </InlineTableHeaderCell>
                      <InlineTableHeaderCell align="right" className="w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Amount
                      </InlineTableHeaderCell>
                      <InlineTableHeaderCell align="right" className="w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Bill to Date
                      </InlineTableHeaderCell>
                      <InlineTableHeaderCell align="right" className="w-40 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                        Amount Remaining
                      </InlineTableHeaderCell>
                      <InlineTableHeaderCell className="w-24 px-1 py-1.5" />
                    </InlineTableHeaderRow>
                  </InlineTableHeader>
                  <InlineTableBody>
                    {displayedSovItems.map((item) => {
                      if (item.is_group_header) {
                        return (
                          <SortableSovRow
                            key={item.id}
                            id={item.id}
                            className="border-b border-border/60 bg-muted/40 hover:bg-muted/50"
                          >
                            {({ attributes, listeners }) => (
                              <>
                                <InlineTableCell className="w-10 px-1 py-1">
                                  <div
                                    className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing"
                                    {...attributes}
                                    {...listeners}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                </InlineTableCell>
                                <InlineTableCell colSpan={7} className="px-1 py-1">
                                  {isSovEditing ? (
                                    <Input
                                      value={item.group_name || item.description || ""}
                                      onChange={(e) =>
                                        onUpdateSovLine(item.id, { description: e.target.value })
                                      }
                                      placeholder="Group name..."
                                      className="h-8 font-semibold"
                                    />
                                  ) : (
                                    <span className="text-sm font-semibold text-foreground">
                                      {item.group_name || item.description || "Unnamed Group"}
                                    </span>
                                  )}
                                </InlineTableCell>
                                <InlineTableCell className="w-24 px-1 py-1">
                                  {isSovEditing && (
                                    <div className="flex justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => onRemoveSovLine(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </InlineTableCell>
                              </>
                            )}
                          </SortableSovRow>
                        );
                      }

                      // Markup rows are read-only — render locked badge row, never editable
                      if (item.markup_type) {
                        const markupTotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                        const markupBilled = markupTotal * billedToDateRatio;
                        return (
                          <InlineTableRow
                            key={item.id}
                            className="border-b border-border/60 bg-muted/30"
                          >
                            <InlineTableCell className="w-10 px-1 py-1">
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </InlineTableCell>
                            <InlineTableCell className="min-w-72 px-1 py-1">
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                                  Markup
                                </span>
                              </span>
                            </InlineTableCell>
                            <InlineTableCell className="min-w-64 px-1 py-1 text-xs text-foreground">
                              {item.description}
                            </InlineTableCell>
                            <InlineTableCell align="right" className="w-20 px-1 py-1" />
                            <InlineTableCell className="w-16 px-1 py-1" />
                            <InlineTableCell align="right" className="w-40 px-1 py-1 tabular-nums text-xs">
                              {formatCurrency(markupTotal)}
                            </InlineTableCell>
                            <InlineTableCell align="right" className="w-40 px-1 py-1 tabular-nums text-xs">
                              {formatCurrency(markupBilled)}
                            </InlineTableCell>
                            <InlineTableCell align="right" className="w-40 px-1 py-1 tabular-nums text-xs">
                              {formatCurrency(markupTotal - markupBilled)}
                            </InlineTableCell>
                            <InlineTableCell className="w-24 px-1 py-1" />
                          </InlineTableRow>
                        );
                      }

                      const lineTotal =
                        (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                      const lineBilledToDate = lineTotal * billedToDateRatio;
                      const lineAmountRemaining = lineTotal - lineBilledToDate;
                      const selectedBudgetCode = item.budget_code_id
                        ? budgetCodes.find((code) => code.id === item.budget_code_id)
                        : budgetCodes.find(
                            (code) =>
                              (code.legacyCostCodeId && code.legacyCostCodeId === item.cost_code_id) ||
                              (!!item.cost_code?.code && code.code === item.cost_code.code),
                          );
                      const selectedBudgetCodeId =
                        (isSovEditing ? sovDraftBudgetCodeIds[item.id] : undefined) ||
                        selectedBudgetCode?.id ||
                        "";
                      const displayBudgetCode = selectedBudgetCode?.code || item.cost_code?.code || "--";
                      const displayBudgetDescription =
                        selectedBudgetCode?.description || item.cost_code?.name || "";
                      const displayCostType = selectedBudgetCode?.costType
                        ? getCostTypeLabel(selectedBudgetCode.costType)
                        : "";

                      return (
                        <SortableSovRow
                          key={item.id}
                          id={item.id}
                          className="group border-b border-border/60 bg-background transition-colors hover:bg-muted/20"
                        >
                          {({ attributes, listeners }) => (
                            <>
                              <InlineTableCell className="w-10 px-1 py-1 align-top">
                                <div
                                  className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing"
                                  {...attributes}
                                  {...listeners}
                                  aria-label="Drag to reorder line item"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              </InlineTableCell>
                              <InlineTableCell className="min-w-72 px-1 py-1 align-top">
                                {isSovEditing ? (
                                  <BudgetCodeSelector
                                    value={selectedBudgetCodeId}
                                    onValueChange={(budgetCodeId) =>
                                      onUpdateSovLineBudgetCode(item.id, budgetCodeId)
                                    }
                                    budgetCodes={budgetCodes}
                                    onCreateNew={() => onRequestCreateBudgetCode(item.id)}
                                    placeholder="Select budget code..."
                                  />
                                ) : (
                                  <div>
                                    <div className="text-xs font-medium leading-tight">
                                      {displayBudgetDescription
                                        ? `${displayBudgetCode} - ${displayBudgetDescription}`
                                        : displayBudgetCode}
                                    </div>
                                    <div className="text-xs leading-tight text-muted-foreground">
                                      {displayCostType || "—"}
                                    </div>
                                  </div>
                                )}
                              </InlineTableCell>
                              <InlineTableCell className="min-w-64 px-1 py-1 align-top">
                                {isSovEditing ? (
                                  <Input
                                    value={item.description || ""}
                                    onChange={(event) =>
                                      onUpdateSovLine(item.id, {
                                        description: event.target.value,
                                      })
                                    }
                                    placeholder="Enter description"
                                  />
                                ) : (
                                  <div className="pt-2 text-xs leading-tight">{item.description || "--"}</div>
                                )}
                              </InlineTableCell>
                              <InlineTableCell align="right" className="w-20 px-1 py-1 align-top">
                                {isSovEditing ? (
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    className="h-10 text-right"
                                    placeholder="1"
                                    value={item.quantity ?? ""}
                                    onChange={(e) =>
                                      onUpdateSovLine(item.id, {
                                        quantity: e.target.value === "" ? undefined : Number(e.target.value),
                                      })
                                    }
                                  />
                                ) : (
                                  <div className="pt-2 text-right text-xs tabular-nums">
                                    {item.quantity ?? 1}
                                  </div>
                                )}
                              </InlineTableCell>
                              <InlineTableCell className="w-16 px-1 py-1 align-top">
                                {isSovEditing ? (
                                  <Input
                                    className="h-10"
                                    placeholder="EA"
                                    value={item.unit_of_measure ?? ""}
                                    onChange={(e) =>
                                      onUpdateSovLine(item.id, {
                                        unit_of_measure: e.target.value || null,
                                      })
                                    }
                                  />
                                ) : (
                                  <div className="pt-2 text-xs text-muted-foreground">
                                    {item.unit_of_measure || "EA"}
                                  </div>
                                )}
                              </InlineTableCell>
                              <InlineTableCell align="right" className="w-40 px-1 py-1 align-top">
                                {isSovEditing ? (
                                  <MoneyField
                                    inline
                                    label="Amount"
                                    value={lineTotal === 0 ? undefined : lineTotal}
                                    onChange={(val) => {
                                      if (val === undefined || val === 0) {
                                        onUpdateSovLine(item.id, { unit_cost: 0 });
                                        return;
                                      }
                                      const quantity = Number(item.quantity);
                                      const normalizedQuantity = quantity > 0 ? quantity : 1;
                                      onUpdateSovLine(item.id, {
                                        quantity: normalizedQuantity,
                                        unit_cost: val / normalizedQuantity,
                                      });
                                    }}
                                    showCurrency={false}
                                    className="h-10"
                                  />
                                ) : (
                                  <div className="pt-2 text-right text-xs tabular-nums">
                                    {formatCurrency(lineTotal)}
                                  </div>
                                )}
                              </InlineTableCell>
                              <InlineTableCell align="right" className="w-40 px-1 py-1 align-top">
                                <div className="pt-2 text-right text-xs tabular-nums">
                                  {formatCurrency(lineBilledToDate)}
                                </div>
                              </InlineTableCell>
                              <InlineTableCell align="right" className="w-40 px-1 py-1 align-top">
                                <div className="pt-2 text-right text-xs font-semibold tabular-nums">
                                  {formatCurrency(lineAmountRemaining)}
                                </div>
                              </InlineTableCell>
                              <InlineTableCell className="w-24 px-1 py-1 align-top">
                                {isSovEditing ? (
                                  <div className="flex justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => onRemoveSovLine(item.id)}
                                      aria-label={`Remove line item ${item.line_number}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-muted-foreground"
                                          aria-label={`Actions for line item ${item.line_number}`}
                                        >
                                          <MoreVertical />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={onStartSovEdit}>
                                          Edit
                                        </DropdownMenuItem>
                                        {onDeleteSovLine && (
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => onDeleteSovLine(item.id)}
                                          >
                                            Delete
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </InlineTableCell>
                            </>
                          )}
                        </SortableSovRow>
                      );
                    })}
                  </InlineTableBody>
                </InlineTable>
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus />
                Add
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onAddSovLine}>
                <Plus className="mr-2 h-4 w-4" />
                Line Item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddSovGroup}>
                <Rows3 className="mr-2 h-4 w-4" />
                Group
              </DropdownMenuItem>
              {onImportEstimateToSov ? (
                <DropdownMenuItem onClick={onImportEstimateToSov}>
                  <Upload className="mr-2 h-4 w-4" />
                  Estimate Workbook
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!lineItemsLoading && displayedSovItems.length > 0 && (
          <div className="flex justify-end pt-5">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Contract Value
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatCurrency(displayedSovTotal)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SortableSovRowProps {
  id: string;
  className?: string;
  children: (dragHandle: {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  }) => ReactNode;
}

function SortableSovRow({ id, className, children }: SortableSovRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-border/60 transition-colors hover:bg-muted/30${isDragging ? " bg-muted/30 opacity-80" : ""}${className ? ` ${className}` : ""}`}
    >
      {children({ attributes, listeners })}
    </tr>
  );
}
