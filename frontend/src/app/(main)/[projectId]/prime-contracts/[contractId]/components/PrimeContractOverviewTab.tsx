import {
  ChevronRight,
  FileText,
  GripVertical,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { cn } from "@/lib/utils";
import { BudgetCodeSelector } from "@/components/budget/budget-code-selector";
import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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
  ContractTab,
} from "../types";

interface PrimeContractOverviewTabProps {
  activeTab: ContractTab;
  contract: Contract;
  generalInfoOpen: boolean;
  setGeneralInfoOpen: Dispatch<SetStateAction<boolean>>;
  contractSummaryOpen: boolean;
  setContractSummaryOpen: Dispatch<SetStateAction<boolean>>;
  attachments: ContractAttachment[];
  attachmentsLoading: boolean;
  isUploadingAttachment: boolean;
  handleUploadAttachment: (file: File) => Promise<void>;
  formatDate: (value: string | null | undefined) => string;
  getTextValue: (
    value: string | null | undefined,
  ) => { text: string; isMissing: boolean };
  inclusionsList: string[];
  exclusionsList: string[];
  formatStatusLabel: (status: Contract["status"]) => string;
  formatCurrency: (value: number | null | undefined) => string;
  isSovOpen: boolean;
  setIsSovOpen: Dispatch<SetStateAction<boolean>>;
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
  onUpdateSovLine: (
    lineId: string,
    updates: Partial<Pick<ContractLineItem, "description" | "quantity" | "unit_of_measure" | "unit_cost" | "cost_code_id">>,
  ) => void;
  onUpdateSovLineBudgetCode: (lineId: string, budgetCodeId: string) => void;
  onRemoveSovLine: (lineId: string) => void;
  onRequestCreateBudgetCode: (lineId: string) => void;
}

export function PrimeContractOverviewTab(props: PrimeContractOverviewTabProps) {
  const {
    activeTab,
    contract,
    generalInfoOpen,
    setGeneralInfoOpen,
    contractSummaryOpen,
    setContractSummaryOpen,
    attachments,
    attachmentsLoading,
    isUploadingAttachment,
    handleUploadAttachment,
    formatDate,
    getTextValue,
    inclusionsList,
    exclusionsList,
    formatStatusLabel,
    formatCurrency,
    isSovOpen,
    setIsSovOpen,
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
    onUpdateSovLine,
    onUpdateSovLineBudgetCode,
    onRemoveSovLine,
    onRequestCreateBudgetCode,
  } = props;
  const ownerName = contract.contract_company?.name || contract.client?.name;
  const displayedSovItems = isSovEditing ? sovDraftItems : lineItems;
  const displayedSovTotal = displayedSovItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
    0,
  );

  return (
    <>
        {activeTab === "overview" && (
          <div className="space-y-6 pb-20">
            <section className="rounded-2xl bg-background">
              <div className="pb-6 pt-4">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold">Parties & Terms</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => setGeneralInfoOpen((prev) => !prev)}
                        >
                          {generalInfoOpen ? "Hide" : "Show"}
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              generalInfoOpen ? "rotate-90" : "rotate-0",
                            )}
                          />
                        </Button>
                      </div>
                      <Collapsible open={generalInfoOpen}>
                        <CollapsibleContent>
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
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    <div className="rounded-xl border border-border/60 p-4">
                      <h3 className="text-base font-semibold">Description</h3>
                      <div className="mt-4 grid gap-6">
                        <div>
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
                        <div className="rounded-lg border border-border/60 p-4">
                          <div className="flex items-center justify-between mb-4">
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
                                  <Plus className="h-4 w-4 mr-2" />
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
                                <li key={att.id} className="flex items-center justify-between text-sm">
                                  {att.downloadUrl || att.url ? (
                                    <a
                                      href={att.downloadUrl || att.url || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="truncate max-w-[60%] text-foreground hover:underline"
                                    >
                                      {att.fileName}
                                    </a>
                                  ) : (
                                    <span className="truncate max-w-[60%] text-muted-foreground">
                                      {att.fileName}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(att.uploadedAt)}
                                  </span>
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
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold">Financial Snapshot</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => setContractSummaryOpen((prev) => !prev)}
                        >
                          {contractSummaryOpen ? "Hide" : "Show"}
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              contractSummaryOpen ? "rotate-90" : "rotate-0",
                            )}
                          />
                        </Button>
                      </div>
                      <Collapsible open={contractSummaryOpen}>
                        <CollapsibleContent>
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
                        </CollapsibleContent>
                      </Collapsible>
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

            <section className="rounded-xl px-6 py-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsSovOpen((prev) => !prev)}
                  className="inline-flex items-center gap-4"
                >
                  <ChevronRight
                    className={cn("h-5 w-5 transition-transform", isSovOpen ? "rotate-90" : "")}
                  />
                  <h3 className="text-2xl font-semibold">Schedule of Values</h3>
                </button>
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
                </div>
              </div>

              {isSovOpen && (
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
                    </div>
                  ) : (
                    <div className="overflow-x-auto overflow-hidden rounded-lg border border-border bg-background">
                      <Table>
                        <TableHeader className="border-y-0 [&_tr]:border-b-0">
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-10 px-1 py-1.5" />
                            <TableHead className="min-w-72 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                              Budget Code *
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
                            const lineTotal =
                              (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                            const selectedBudgetCode = budgetCodes.find(
                              (code) =>
                                code.legacyCostCodeId === item.cost_code_id ||
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
                                  <div className="mt-1 rounded-md p-1 text-muted-foreground">
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
                                      {item.quantity ?? 0}
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
                                      {item.unit_of_measure || "--"}
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
                                        value={item.unit_cost ?? 0}
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
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-muted-foreground"
                                        onClick={onStartSovEdit}
                                        aria-label={`Edit line item ${item.line_number}`}
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
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
                  )}

                  {isSovEditing ? (
                    <div className="pt-4">
                      <Button
                        type="button"
                        size="default"
                        className="h-10 gap-2 px-4"
                        onClick={onAddSovLine}
                      >
                        <Plus className="h-4 w-4" />
                        Add Line Item
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        )}
    </>
  );
}
