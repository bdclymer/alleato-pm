import {
  ChevronDown,
  FileText,
  GripVertical,
  MoreVertical,
  Plus,
  Rows3,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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

import {
  ContentSectionStack,
  DetailPanel,
  LabelValueRow,
  SectionRuleHeading,
  SummaryValueRow,
} from "@/components/layout";
import { EmptyState } from "@/components/ds";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoneyField } from "@/components/forms/MoneyField";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
} from "@/components/ds/inline-table";
import { getCostTypeLabel } from "@/constants/budget";
import { formatPercent } from "@/lib/format";
import type {
  BudgetCode,
  Contract,
  ContractAttachment,
  ContractLineItem,
  PrimeContractCO,
} from "../types";

interface PrimeContractOverviewTabProps {
  contract: Contract;
  changeOrders: PrimeContractCO[];
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
    changeOrders,
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
  const computedChangeOrderTotals = useMemo(() => {
    const totals = { approved: 0, pending: 0, draft: 0 };
    for (const co of changeOrders) {
      const amount = Number(co.amount) || 0;
      const status = (co.status || "").toLowerCase();
      if (status === "approved") {
        totals.approved += amount;
      } else if (status === "pending") {
        totals.pending += amount;
      } else if (status === "draft" || status === "proposed") {
        totals.draft += amount;
      }
    }
    return totals;
  }, [changeOrders]);
  const approvedChangeOrdersTotal =
    changeOrders.length > 0
      ? computedChangeOrderTotals.approved
      : Number(contract.approved_change_orders) || 0;
  const pendingChangeOrdersTotal =
    changeOrders.length > 0
      ? computedChangeOrderTotals.pending
      : Number(contract.pending_change_orders) || 0;
  const draftChangeOrdersTotal =
    changeOrders.length > 0
      ? computedChangeOrderTotals.draft
      : Number(contract.draft_change_orders) || 0;
  const revisedContractAmount = displayedSovTotal + approvedChangeOrdersTotal;
  const pendingRevisedContractAmount =
    revisedContractAmount + pendingChangeOrdersTotal;
  const invoicesTotal = Number(contract.invoiced_amount) || 0;
  const paymentsReceivedTotal = Number(contract.payments_received) || 0;
  const remainingBalanceTotal = revisedContractAmount - paymentsReceivedTotal;
  const percentPaid =
    revisedContractAmount > 0
      ? (paymentsReceivedTotal / revisedContractAmount) * 100
      : 0;
  const billedToDateRatio =
    displayedSovTotal > 0
      ? Math.min(1, Math.max(0, invoicesTotal / displayedSovTotal))
      : 0;
  const renderDateOrDash = (value: string | null | undefined) =>
    value ? formatDate(value) : <span className="text-muted-foreground/40">—</span>;
  const handleAttachmentFilesSelected = (files: File[]) => {
    void (async () => {
      for (const file of files) {
        await handleUploadAttachment(file);
      }
    })();
  };

  return (
    <ContentSectionStack className="space-y-8 pb-20">
      <section>
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <div className="space-y-6">
            <DetailPanel>
              <SectionRuleHeading label="General Information" className="mb-6 pb-0" />
              <div className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-2">
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="Contract #" labelClassName="w-36">
                    {contract.contract_number || "—"}
                  </LabelValueRow>
                  <LabelValueRow label="Title" labelClassName="w-36">
                    {contract.title}
                  </LabelValueRow>
                  <LabelValueRow label="Status" labelClassName="w-36">
                    {formatStatusLabel(contract.status)}
                  </LabelValueRow>
                  <LabelValueRow label="Executed" labelClassName="w-36">
                    {contract.executed ? formatDate(contract.executed_at) || "Yes" : "No"}
                  </LabelValueRow>
                  <LabelValueRow label="Owner/Client" labelClassName="w-36" missing={!ownerName}>
                    {ownerName && (contract.contract_company?.id || contract.client?.id) ? (
                      <Link
                        href={`/directory/vendors/${contract.contract_company?.id || contract.client?.id}`}
                        className="text-primary underline underline-offset-2 hover:text-primary/90"
                      >
                        {ownerName}
                      </Link>
                    ) : (ownerName || "—")}
                  </LabelValueRow>
                  <LabelValueRow label="Contractor" labelClassName="w-36" missing={!contract.contractor?.name}>
                    {contract.contractor?.name && contract.contractor?.id ? (
                      <Link
                        href={`/directory/companies/${contract.contractor.id}`}
                        className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
                      >
                        {contract.contractor.name}
                      </Link>
                    ) : (contract.contractor?.name || "—")}
                  </LabelValueRow>
                  <LabelValueRow label="Architect" labelClassName="w-36" missing={!contract.architect_engineer?.name}>
                    {contract.architect_engineer?.name || "—"}
                  </LabelValueRow>
                </dl>
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="Start Date" labelClassName="w-40">
                    {renderDateOrDash(contract.start_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Est. Completion" labelClassName="w-40">
                    {renderDateOrDash(contract.end_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Substantial Date" labelClassName="w-40">
                    {renderDateOrDash(contract.substantial_completion_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Actual Completion" labelClassName="w-40">
                    {renderDateOrDash(contract.actual_completion_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Signed Date" labelClassName="w-40">
                    {renderDateOrDash(contract.signed_contract_received_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Termination Date" labelClassName="w-40">
                    {renderDateOrDash(contract.contract_termination_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Default Retainage" labelClassName="w-40">
                    {contract.retention_percentage ?? 0}%
                  </LabelValueRow>
                </dl>
              </div>
              <LabelValueRow
                label="Description"
                labelClassName="w-36"
                className="mt-6"
                missing={getTextValue(contract.description).isMissing}
                valueClassName="leading-relaxed font-normal text-foreground text-sm"
              >
                {getTextValue(contract.description).text}
              </LabelValueRow>
            </DetailPanel>

            <DetailPanel>
              <SectionRuleHeading label="Inclusions + Exclusions" className="mb-6 pb-0" />
              <dl className="space-y-6 text-sm">
                <LabelValueRow label="Inclusions" labelClassName="w-36">
                  {inclusionsList.length === 0 ? (
                    <span className="text-muted-foreground/50">—</span>
                  ) : (
                    <div className="space-y-1 leading-relaxed">
                      {inclusionsList.map((line, index) => (
                        <p key={`inclusion-${index}`}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                </LabelValueRow>
                <LabelValueRow label="Exclusions" labelClassName="w-36">
                  {exclusionsList.length === 0 ? (
                    <span className="text-muted-foreground/50">—</span>
                  ) : (
                    <div className="space-y-1 leading-relaxed">
                      {exclusionsList.map((line, index) => (
                        <p key={`exclusion-${index}`}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                </LabelValueRow>
                <LabelValueRow label="Attachments" labelClassName="w-36">
                  {attachmentsLoading ? (
                    <div className="flex flex-wrap gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <FileUploadField
                        label={<span className="sr-only">Upload attachment</span>}
                        variant="link"
                        showMetaText={false}
                        multiple
                        maxFiles={25}
                        disabled={isUploadingAttachment}
                        onFilesSelected={handleAttachmentFilesSelected}
                      />
                      {attachments.map((att) => (
                        <div key={att.id} className="group inline-flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {att.downloadUrl || att.url ? (
                            <a
                              href={att.downloadUrl || att.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-foreground hover:underline"
                            >
                              {att.fileName}
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">{att.fileName}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 shrink-0 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                            onClick={() => handleDeleteAttachment(att.id)}
                            aria-label={`Delete ${att.fileName}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </LabelValueRow>
              </dl>
            </DetailPanel>
          </div>

          <aside>
            <DetailPanel>
              <SectionRuleHeading label="Financial Summary" className="mb-6 pb-0" />
              <dl className="space-y-3 text-sm">
                <SummaryValueRow label="Original Amount" value={formatCurrency(displayedSovTotal)} />
                <SummaryValueRow label="Revised Amount" value={formatCurrency(revisedContractAmount)} />
                <SummaryValueRow label="Pending Amount" value={formatCurrency(pendingRevisedContractAmount)} />
                <SummaryValueRow label="Pending COs" value={formatCurrency(pendingChangeOrdersTotal)} />
                <SummaryValueRow label="Approved COs" value={formatCurrency(approvedChangeOrdersTotal)} />
                <SummaryValueRow label="Draft COs" value={formatCurrency(draftChangeOrdersTotal)} />
                <SummaryValueRow label="Invoices" value={formatCurrency(invoicesTotal)} />
                <SummaryValueRow label="Payments" value={formatCurrency(paymentsReceivedTotal)} />
                <SummaryValueRow label="Balance" value={formatCurrency(remainingBalanceTotal)} />
                <SummaryValueRow label="Percent Paid" value={formatPercent(percentPaid, 2)} bold border />
              </dl>
            </DetailPanel>
          </aside>
        </div>
      </section>

      {/* ─── Schedule of Values ─── */}
      <section>
        <SectionRuleHeading label="Schedule of Values"  />

        {isSovEditing && (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelSovEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSaveSovEdit} disabled={isSavingSovChanges}>
              {isSavingSovChanges ? "Saving..." : "Save"}
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {isSovEditing && (
            <div className="rounded-md border-l-4 border-primary bg-muted p-4 text-sm">
              <p className="font-semibold">Any changes will only apply to future invoices</p>
              <p className="text-muted-foreground">Existing invoices will not be affected.</p>
            </div>
          )}

          {lineItemsLoading ? (
            <EmptyState
              icon={<Rows3 />}
              title="Loading schedule of values"
              description="Please wait while we load line items."
              className="py-8"
            />
          ) : displayedSovItems.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title="No SOV lines yet"
              description="Add SOV lines with budget codes to track the contract value."
            />
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
                <div className="overflow-x-auto overflow-hidden rounded-md border border-border/70 bg-muted/20">
                  <InlineTable variant="edit">
                    <InlineTableHeader className="border-y-0 [&_tr]:border-b-0">
                      <InlineTableHeaderRow>
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
                                  <div className="text-xs text-muted-foreground leading-tight">
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
                                    const normalizedQuantity =
                                      quantity > 0 ? quantity : 1;
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

          <div className="flex justify-start pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="gap-1.5">
                  <Plus />
                  Add
                  <ChevronDown className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => { onStartSovEdit(); onAddSovLine(); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Line Item
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { onStartSovEdit(); onAddSovGroup(); }}>
                  <Rows3 className="mr-2 h-4 w-4" />
                  Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {!lineItemsLoading && displayedSovItems.length > 0 ? (
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
          ) : null}
        </div>
      </section>
    </ContentSectionStack>
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
      className={`border-b border-border/60 group transition-colors hover:bg-muted/30${isDragging ? " opacity-80 bg-muted/30" : ""}${className ? ` ${className}` : ""}`}
    >
      {children({ attributes, listeners })}
    </tr>
  );
}
