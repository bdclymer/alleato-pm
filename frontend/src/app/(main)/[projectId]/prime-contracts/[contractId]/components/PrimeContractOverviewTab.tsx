import {
  ChevronDown,
  ChevronRight,
  FileText,
  Maximize2,
  Minimize2,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
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
  isSovFullscreen: boolean;
  setIsSovFullscreen: Dispatch<SetStateAction<boolean>>;
  isSovOpen: boolean;
  setIsSovOpen: Dispatch<SetStateAction<boolean>>;
  lineItemsLoading: boolean;
  lineItems: ContractLineItem[];
  setLineItemToDelete: Dispatch<SetStateAction<ContractLineItem | null>>;
  sovTotal: number;
  sovBilledToDateTotal: number;
  sovRemainingTotal: number;
  setShowAddLineItemDialog: Dispatch<SetStateAction<boolean>>;
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
    isSovFullscreen,
    setIsSovFullscreen,
    isSovOpen,
    setIsSovOpen,
    lineItemsLoading,
    lineItems,
    setLineItemToDelete,
    sovTotal,
    sovBilledToDateTotal,
    sovRemainingTotal,
    setShowAddLineItemDialog,
  } = props;

  return (
    <>
        {activeTab === "overview" && (
          <div className="space-y-6 pb-20">
            <section className="rounded-2xl bg-background">
              <div className="pb-6 pt-4">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <div className="rounded-xl bg-muted/40 p-4">
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
                                  contract.client?.name
                                    ? "font-semibold text-blue-600 hover:underline cursor-pointer"
                                    : "font-normal italic text-muted-foreground",
                                )}
                              >
                                {contract.client?.name || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Contractor
                              </dt>
                              <dd
                                className={cn(
                                  "mt-1 text-[15px] leading-6",
                                  contract.vendor?.name
                                    ? "font-semibold text-blue-600 hover:underline cursor-pointer"
                                    : "font-normal italic text-muted-foreground",
                                )}
                              >
                                {contract.vendor?.name || "Not set"}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-muted-foreground">
                                Architect/Engineer
                              </dt>
                              <dd className="mt-1 text-[15px] font-normal italic leading-6 text-muted-foreground">
                                Not set
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

                    <div className="rounded-xl bg-muted/40 p-4">
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
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
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
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate max-w-[60%]"
                                  >
                                    {att.fileName}
                                  </a>
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

                    <div className="rounded-xl bg-muted/40 p-4">
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
                    <div className="rounded-xl bg-muted/40 p-4">
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

                    <div className="rounded-xl bg-muted/40 p-4">
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

            <section
              className={cn(
                "rounded-xl bg-muted/40 px-6 py-6",
                isSovFullscreen && "fixed inset-3 z-50 overflow-auto rounded-2xl bg-background shadow-2xl",
              )}
            >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSovFullscreen((prev) => !prev)}
                  >
                    {isSovFullscreen ? (
                      <Minimize2 className="h-4 w-4 mr-2" />
                    ) : (
                      <Maximize2 className="h-4 w-4 mr-2" />
                    )}
                    {isSovFullscreen ? "Close Fullscreen" : "Open Fullscreen"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsSovFullscreen(true)}>
                    Edit
                  </Button>
                </div>
              </div>

              {isSovOpen && (
                <div className="mt-4 space-y-4">
                  <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
                    Add Group
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>

                  {isSovFullscreen && (
                    <div className="rounded-md border-l-4 border-amber-500 bg-amber-50 p-4 text-sm">
                      <p className="font-semibold">Any changes will only apply to future invoices</p>
                      <p>Existing invoices will not be affected.</p>
                    </div>
                  )}

                  {lineItemsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading schedule of values...
                    </div>
                  ) : lineItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
                      <p>No SOV lines yet</p>
                      <p className="text-xs mt-2">
                        Add SOV lines with budget codes to track the contract value
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-background overflow-hidden">
                      <Table>
                        <TableHeader>
                          {isSovFullscreen ? (
                            <TableRow>
                              <TableHead className="w-16">#</TableHead>
                              <TableHead>Budget Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Billed to Date</TableHead>
                              <TableHead className="text-right">Amount Remaining</TableHead>
                              <TableHead className="w-14" />
                            </TableRow>
                          ) : (
                            <TableRow>
                              <TableHead>Budget Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="w-14" />
                            </TableRow>
                          )}
                        </TableHeader>
                        <TableBody>
                          {lineItems.map((item, index) => {
                            const code = item.cost_code?.code || "--";
                            const name = item.cost_code?.name || "";
                            const amount = item.total_cost ?? 0;
                            const billedToDate = amount;
                            const amountRemaining = 0;

                            return isSovFullscreen ? (
                              <TableRow key={item.id} className="hover:bg-muted/50">
                                <TableCell>{item.line_number || index + 1}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{code}</div>
                                  <div className="text-muted-foreground text-sm">{name}</div>
                                </TableCell>
                                <TableCell>{item.description || "--"}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCurrency(amount)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCurrency(billedToDate)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCurrency(amountRemaining)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLineItemToDelete(item);
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <TableRow key={item.id} className="hover:bg-muted/50">
                                <TableCell>
                                  <div className="font-medium">{code}</div>
                                  <div className="text-muted-foreground text-sm">{name}</div>
                                </TableCell>
                                <TableCell>{item.description || "--"}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCurrency(amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLineItemToDelete(item);
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <tfoot>
                          {isSovFullscreen ? (
                            <TableRow className="bg-muted/60 font-medium">
                              <TableCell colSpan={3} className="text-right">
                                Total:
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(sovTotal)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(sovBilledToDateTotal)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(sovRemainingTotal)}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          ) : (
                            <TableRow className="bg-muted/60 font-medium">
                              <TableCell>
                                <Button size="sm" onClick={() => setShowAddLineItemDialog(true)}>
                                  Add Line
                                </Button>
                              </TableCell>
                              <TableCell className="text-right">Total:</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(sovTotal)}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          )}
                        </tfoot>
                      </Table>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" className="min-w-[100px] justify-between">
                      Import
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                    {isSovFullscreen && (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => setIsSovFullscreen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => setIsSovFullscreen(false)}>Save</Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
    </>
  );
}
