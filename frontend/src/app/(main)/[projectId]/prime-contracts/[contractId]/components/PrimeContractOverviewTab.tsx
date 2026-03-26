import {
  ChevronDown,
  FileText,
  GripVertical,
  MoreVertical,
  Plus,
  Rows3,
  Trash2,
} from "lucide-react";
import { useMemo } from "react";
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

import { cn } from "@/lib/utils";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnitTypes } from "@/lib/schemas/direct-costs";
import type {
  BudgetCode,
  Contract,
  ContractAttachment,
  ContractLineItem,
} from "../types";

interface PrimeContractOverviewTabProps {
  contract: Contract;
  attachments: ContractAttachment[];
  attachmentsLoading: boolean;
  isUploadingAttachment: boolean;
  handleUploadAttachment: (file: File) => Promise<void>;
  handleDeleteAttachment: (attachmentId: string) => Promise<void>;
  formatDate: (value: string | null | undefined) => string;
  getTextValue: (
    value: string | null | undefined,
  ) => { text: string; isMissing: boolean };
  inclusionsList: string[];
  exclusionsList: string[];
  formatStatusLabel: (status: Contract["status"]) => string;
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
}

export function PrimeContractOverviewTab(props: PrimeContractOverviewTabProps) {
  const {
    contract,
    attachments,
    attachmentsLoading,
    isUploadingAttachment,
    handleUploadAttachment,
    handleDeleteAttachment,
    formatDate,
    getTextValue,
    inclusionsList,
    exclusionsList,
    formatStatusLabel,
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
  } = props;
  const ownerName = contract.contract_company?.name || contract.client?.name;
  const displayedSovItems = isSovEditing ? sovDraftItems : lineItems;

  // DnD sensors for reordering SOV lines
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
  const displayedSovTotal = displayedSovItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
    0,
  );

  return (
          <div className="space-y-6 pb-20">
            <section className="rounded-2xl bg-background">
              <div className="pb-6 pt-4">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border/60 p-4">
                      <h3 className="text-base font-semibold">General Information</h3>
                          <dl className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Title
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {contract.title}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Contract #
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {contract.contract_number || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Owner/Client
                              </dt>
                              <dd
                                className={cn(
                                  "mt-1 text-[15px] leading-6",
                                  ownerName
                                    ? "font-semibold"
                                    : "font-normal italic text-muted-foreground",
                                )}
                              >
                                {ownerName || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Contractor
                              </dt>
                              <dd
                                className={cn(
                                  "mt-1 text-[15px] leading-6",
                                  contract.contractor?.name
                                    ? "font-semibold"
                                    : "font-normal italic text-muted-foreground",
                                )}
                              >
                                {contract.contractor?.name || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Architect/Engineer
                              </dt>
                              <dd
                                className={cn(
                                  "mt-1 text-[15px] leading-6",
                                  contract.architect_engineer?.name
                                    ? "font-semibold"
                                    : "font-normal italic text-muted-foreground",
                                )}
                              >
                                {contract.architect_engineer?.name || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Default Retainage
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {contract.retention_percentage ?? 0}%
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Status
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {formatStatusLabel(contract.status)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Executed
                              </dt>
                              <dd className="mt-1 text-[15px] font-semibold leading-6">
                                {contract.executed ? "Yes" : "No"}
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-6 border-t border-border/60 pt-6 grid gap-6">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Description</p>
                          <p
                            className={cn(
                              "mt-2 text-[15px] leading-7",
                              getTextValue(contract.description).isMissing
                                ? "font-normal italic text-muted-foreground"
                                : "text-foreground/80",
                            )}
                          >
                            {getTextValue(contract.description).text}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              Attachments {attachments.length > 0 && `(${attachments.length})`}
                            </p>
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="sr-only"
                                disabled={isUploadingAttachment}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadAttachment(file);
                                  e.target.value = "";
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                disabled={isUploadingAttachment}
                              >
                                <span>
                                  <Plus />
                                  {isUploadingAttachment ? "Uploading..." : "Add Attachment"}
                                </span>
                              </Button>
                            </label>
                          </div>
                          {attachmentsLoading ? (
                            <p className="text-sm text-muted-foreground italic">Loading...</p>
                          ) : attachments.length === 0 ? (
                            <p className="text-sm italic text-muted-foreground">No attachments yet</p>
                          ) : (
                            <ul className="space-y-2">
                              {attachments.map((att) => (
                                <li key={att.id} className="flex items-center justify-between gap-2 text-sm">
                                  {att.downloadUrl || att.url ? (
                                    <a
                                      href={att.downloadUrl || att.url || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="truncate flex-1 text-foreground hover:underline"
                                    >
                                      {att.fileName}
                                    </a>
                                  ) : (
                                    <span className="truncate flex-1 text-muted-foreground">
                                      {att.fileName}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {formatDate(att.uploadedAt)}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteAttachment(att.id)}
                                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                    aria-label={`Delete ${att.fileName}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 p-4">
                      <h3 className="text-base font-semibold">Inclusions & Exclusions</h3>
                      <div className="mt-4 space-y-6">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Inclusions</p>
                          {inclusionsList.length === 0 ? (
                            <p className="mt-2 text-[15px] italic text-muted-foreground">Not set</p>
                          ) : (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-7 text-foreground/80">
                              {inclusionsList.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Exclusions</p>
                          {exclusionsList.length === 0 ? (
                            <p className="mt-2 text-[15px] italic text-muted-foreground">Not set</p>
                          ) : (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-7 text-foreground/80">
                              {exclusionsList.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-xl border border-border/60 p-4">
                      <h3 className="text-base font-semibold">Contract Summary</h3>
                          <dl className="mt-4 space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Original Contract Amount</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.original_contract_value)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Revised Contract Amount</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.revised_contract_value)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Pending Revised Contract Amount</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.pending_revised_contract_amount)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Pending Change Orders</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.pending_change_orders)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Approved Change Orders</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.approved_change_orders)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Draft Change Orders</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.draft_change_orders)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Invoices</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.invoiced_amount)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Payments Received</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.payments_received)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Remaining Balance</dt>
                              <dd className="text-right font-semibold tabular-nums">
                                {formatCurrency(contract.remaining_balance)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                              <dt className="text-muted-foreground">Percent Paid</dt>
                              <dd className="text-right text-base font-semibold tabular-nums">{contract.percent_paid}%</dd>
                            </div>
                          </dl>
                    </div>

                    <div className="rounded-xl border border-border/60 p-4">
                      <h3 className="text-base font-semibold">Key Dates</h3>
                      <dl className="mt-4 space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Start Date</dt>
                          <dd className="text-right font-medium">
                            {contract.start_date ? formatDate(contract.start_date) : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Estimated Completion Date</dt>
                          <dd className="text-right font-medium">
                            {contract.end_date ? formatDate(contract.end_date) : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Substantial Completion Date</dt>
                          <dd className="text-right font-medium">
                            {contract.substantial_completion_date
                              ? formatDate(contract.substantial_completion_date)
                              : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Actual Completion Date</dt>
                          <dd className="text-right font-medium">
                            {contract.actual_completion_date
                              ? formatDate(contract.actual_completion_date)
                              : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Signed Contract Received Date</dt>
                          <dd className="text-right font-medium">
                            {contract.signed_contract_received_date
                              ? formatDate(contract.signed_contract_received_date)
                              : "Not set"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">Contract Termination Date</dt>
                          <dd className="text-right font-medium">
                            {contract.contract_termination_date
                              ? formatDate(contract.contract_termination_date)
                              : "Not set"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Schedule of Values</h3>
                <div className="flex items-center gap-2">
                  {isSovEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={onCancelSovEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={onSaveSovEdit} disabled={isSavingSovChanges}>
                        {isSavingSovChanges ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Plus />
                        Add
                        <ChevronDown className="text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onAddSovLine}>
                        <Plus className="mr-2 h-4 w-4" />
                        Line Item
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onAddSovGroup}>
                        <Rows3 className="mr-2 h-4 w-4" />
                        Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                  {isSovEditing && (
                    <div className="rounded-md border-l-4 border-amber-500 bg-amber-50 p-4 text-sm">
                      <p className="font-semibold">Any changes will only apply to future invoices</p>
                      <p>Existing invoices will not be affected.</p>
                    </div>
                  )}

                  {lineItemsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading schedule of values...
                    </div>
                  ) : displayedSovItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                      <p>No SOV lines yet</p>
                      <p className="text-xs mt-2">
                        Add SOV lines with budget codes to track the contract value
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          onStartSovEdit();
                          onAddSovLine();
                        }}
                      >
                        <Plus />
                        Add SOV Line
                      </Button>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                    <SortableContext
                      items={sortableIds}
                      strategy={verticalListSortingStrategy}
                    >
                    <div className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20">
                      <Table>
                        <TableHeader className="border-y-0 [&_tr]:border-b-0">
                          <TableRow className="bg-muted/70 hover:bg-muted/70">
                            <TableHead className="w-10 px-1 py-1.5" />
                            <TableHead className="min-w-72 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                              Budget Code
                            </TableHead>
                            <TableHead className="min-w-64 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                              Description
                            </TableHead>
                            <TableHead className="w-36 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                              Quantity *
                            </TableHead>
                            <TableHead className="w-36 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                              UOM
                            </TableHead>
                            <TableHead className="w-44 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                              Unit Cost *
                            </TableHead>
                            <TableHead className="w-40 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                              Line Total
                            </TableHead>
                            <TableHead className="w-24 px-1 py-1.5" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedSovItems.map((item) => {
                            // Render group header rows
                            if (item.is_group_header) {
                              return (
                                <TableRow
                                  key={item.id}
                                  className="border-b border-border/60 bg-muted/40 hover:bg-muted/50"
                                >
                                  <TableCell className="w-10 px-1 py-1.5">
                                    {isSovEditing && (
                                      <div className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing">
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell colSpan={6} className="px-1 py-1.5">
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
                                  </TableCell>
                                  <TableCell className="w-24 px-1 py-1.5">
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
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            const lineTotal =
                              (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                            // Use budget_code_id (the real FK) as the primary lookup,
                            // then fall back to cost_code_id string match
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

                            return (
                              <TableRow
                                key={item.id}
                                className="group border-b border-border/60 bg-background transition-colors hover:bg-muted/20"
                              >
                                <TableCell className="w-10 px-1 py-1.5 align-top">
                                  <div className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                </TableCell>
                                <TableCell className="min-w-72 px-1 py-1.5 align-top">
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
                                      <div className="font-medium">
                                        {selectedBudgetCode?.code || item.cost_code?.code || "--"}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {selectedBudgetCode?.description || item.cost_code?.name || ""}
                                      </div>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="min-w-64 px-1 py-1.5 align-top">
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
                                    item.description || "--"
                                  )}
                                </TableCell>
                                <TableCell className="w-36 px-1 py-1.5 align-top">
                                  {isSovEditing ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="text-right"
                                      value={item.quantity ?? 0}
                                      onChange={(event) =>
                                        onUpdateSovLine(item.id, {
                                          quantity:
                                            event.target.value === ""
                                              ? 0
                                              : Number(event.target.value),
                                        })
                                      }
                                    />
                                  ) : (
                                    <div className="pt-2 text-right text-sm tabular-nums">
                                      {item.unit_of_measure ? (item.quantity ?? 0) : ""}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="w-36 px-1 py-1.5 align-top">
                                  {isSovEditing ? (
                                    <Select
                                      onValueChange={(value) =>
                                        onUpdateSovLine(item.id, {
                                          unit_of_measure: value || null,
                                        })
                                      }
                                      value={item.unit_of_measure || undefined}
                                    >
                                      <SelectTrigger className="h-10 w-full">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {UnitTypes.map((unit) => (
                                          <SelectItem key={unit} value={unit}>
                                            {unit}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div className="pt-2 text-sm">
                                      {item.unit_of_measure || ""}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="w-44 px-1 py-1.5 align-top">
                                  {isSovEditing ? (
                                    <InputGroup>
                                      <InputGroupAddon>$</InputGroupAddon>
                                      <InputGroupInput
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="h-10 text-right"
                                        placeholder="0.00"
                                        value={item.unit_cost === 0 ? "" : (item.unit_cost ?? "")}
                                        onChange={(event) =>
                                          onUpdateSovLine(item.id, {
                                            unit_cost:
                                              event.target.value === ""
                                                ? 0
                                                : Number(event.target.value),
                                          })
                                        }
                                      />
                                    </InputGroup>
                                  ) : (
                                    <div className="pt-2 text-right text-sm tabular-nums">
                                      {formatCurrency(item.unit_cost ?? 0)}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="w-40 px-1 py-1.5 align-top">
                                  <div className="pt-2 text-right text-sm font-semibold">
                                    {formatCurrency(lineTotal)}
                                  </div>
                                </TableCell>
                                <TableCell className="w-24 px-1 py-1.5 align-top">
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
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="hover:bg-muted">
                            <TableCell className="px-1 py-2" />
                            <TableCell colSpan={5} className="px-1 py-3 text-xs font-semibold text-foreground">
                              Totals
                            </TableCell>
                            <TableCell className="px-1 py-2 text-right text-sm font-semibold text-foreground">
                              {formatCurrency(displayedSovTotal)}
                            </TableCell>
                            <TableCell className="px-1 py-2" />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    </SortableContext>
                    </DndContext>
                  )}

                  {isSovEditing ? (
                    <div className="pt-4">
                      <Button
                        type="button"
                        size="default"
                        className="h-10 gap-2 px-4"
                        onClick={onAddSovLine}
                      >
                        <Plus />
                        Add Line Item
                      </Button>
                    </div>
                  ) : null}
                </div>
            </section>
          </div>
  );
}
