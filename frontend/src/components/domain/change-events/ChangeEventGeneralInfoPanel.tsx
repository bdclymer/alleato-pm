"use client";

import type {
  ChangeEventDetail,
  ChangeEventAttachment,
} from "@/types/change-events";
import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Trash2 } from "lucide-react";
import {
  ContentSectionStack,
  LabelValueRow,
  SectionRuleHeading,
} from "@/components/layout";

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

interface ChangeEventGeneralInfoPanelProps {
  changeEvent: ChangeEventDetail;
  attachments: ChangeEventAttachment[];
  projectId: number;
  onUploadAttachment?: (file: File) => void;
  onDeleteAttachment?: (attachmentId: string) => void;
  isUploadingAttachment?: boolean;
}

export function ChangeEventGeneralInfoPanel({
  changeEvent,
  attachments,
  projectId,
  onUploadAttachment,
  onDeleteAttachment,
  isUploadingAttachment,
}: ChangeEventGeneralInfoPanelProps) {
  const primeContractId =
    changeEvent.prime_contract_id ?? changeEvent.primeContractId;
  const primeContractNumber = changeEvent.primeContract?.contract_number;
  const primeContractTitle = changeEvent.primeContract?.title;
  const lineItemRevenueSource =
    changeEvent.line_item_revenue_source ?? changeEvent.lineItemRevenueSource;
  const totals = (changeEvent as any).totals ?? { revenueRom: "0", costRom: "0", nonCommittedCost: "0" };

  return (
    <ContentSectionStack>
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-x-16 gap-y-10">
          {/* Left column */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-14 gap-y-8">
              {/* Details */}
              <div className="space-y-6">
                <SectionRuleHeading label="Details" className="[&_span]:text-primary" />
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="Number">
                    {changeEvent.number || `CE-${changeEvent.id}`}
                  </LabelValueRow>
                  <LabelValueRow label="Title">
                    {changeEvent.title || "Not set"}
                  </LabelValueRow>
                  <LabelValueRow label="Status">
                    {changeEvent.status ? (
                      <StatusBadge status={changeEvent.status} />
                    ) : (
                      "Not set"
                    )}
                  </LabelValueRow>
                  <LabelValueRow label="Expecting Revenue">
                    {(changeEvent.expectingRevenue ?? changeEvent.expecting_revenue) ? "Yes" : "No"}
                  </LabelValueRow>
                  <LabelValueRow label="Revenue Source" missing={!lineItemRevenueSource}>
                    {lineItemRevenueSource || "Not set"}
                  </LabelValueRow>
                  <LabelValueRow label="Prime Contract" missing={!primeContractId}>
                    {primeContractId ? (
                      <a
                        href={`/${projectId}/prime-contracts/${primeContractId}`}
                        className="text-primary hover:underline"
                      >
                        {primeContractNumber || primeContractTitle || `#${primeContractId}`}
                      </a>
                    ) : (
                      "Not set"
                    )}
                  </LabelValueRow>
                  <LabelValueRow label="Description" missing={!changeEvent.description}>
                    <span className="whitespace-pre-wrap">{changeEvent.description || "Not set"}</span>
                  </LabelValueRow>
                </dl>

                {/* Attachments inline under Details */}
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Attachments</span>
                    {onUploadAttachment && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="sr-only"
                          disabled={isUploadingAttachment}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUploadAttachment(file);
                            e.target.value = "";
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          disabled={isUploadingAttachment}
                          className="h-6 px-2 text-xs text-primary hover:text-primary"
                        >
                          <span>
                            <Plus className="h-3 w-3" />
                            {isUploadingAttachment ? "Uploading..." : "Add"}
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {attachments.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">No attachments yet</p>
                    ) : (
                      attachments.map((att) => (
                        <div key={att.id} className="group flex items-center gap-1.5 text-sm">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {att.downloadUrl ? (
                            <a
                              href={att.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground hover:underline"
                            >
                              {att.fileName}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">
                              {att.fileName}
                            </span>
                          )}
                          {onDeleteAttachment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                              onClick={() => onDeleteAttachment(att.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Reason for Change */}
              <div className="space-y-6">
                <SectionRuleHeading label="Reason for Change" className="[&_span]:text-primary" />
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="Origin" missing={!changeEvent.origin}>
                    {changeEvent.origin || "Not set"}
                  </LabelValueRow>
                  <LabelValueRow label="Type" missing={!changeEvent.type}>
                    {changeEvent.type || "Not set"}
                  </LabelValueRow>
                  <LabelValueRow label="Scope" missing={!changeEvent.scope}>
                    {changeEvent.scope || "Not set"}
                  </LabelValueRow>
                  <LabelValueRow label="Change Reason" missing={!changeEvent.reason}>
                    {changeEvent.reason || "Not set"}
                  </LabelValueRow>
                </dl>
              </div>
            </div>

          </div>

          {/* Right sidebar: Totals */}
          <div className="space-y-8">
            <div className="space-y-4">
              <SectionRuleHeading label="Totals" className="[&_span]:text-primary" />
              <div className="rounded-md border border-border bg-muted p-6">
                <dl className="space-y-3 text-sm">
                  <LabelValueRow label="Revenue ROM">
                    {formatCurrency(totals.revenueRom)}
                  </LabelValueRow>
                  <LabelValueRow label="Cost ROM">
                    {formatCurrency(totals.costRom)}
                  </LabelValueRow>
                  <LabelValueRow label="Non-Committed Cost">
                    {formatCurrency(totals.nonCommittedCost)}
                  </LabelValueRow>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ContentSectionStack>
  );
}
