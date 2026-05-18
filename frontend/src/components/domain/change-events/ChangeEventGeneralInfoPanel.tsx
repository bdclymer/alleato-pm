"use client";

import type { ChangeEventDetail } from "@/types/change-events";
import { EntityAttachments, StatusBadge } from "@/components/ds";
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
  projectId: number;
}

export function ChangeEventGeneralInfoPanel({
  changeEvent,
  projectId,
}: ChangeEventGeneralInfoPanelProps) {
  const primeContractId =
    changeEvent.prime_contract_id ?? changeEvent.primeContractId;
  const primeContractNumber = changeEvent.primeContract?.contract_number;
  const primeContractTitle = changeEvent.primeContract?.title;
  const primeContractDisplayName = (changeEvent.primeContract as { display_name?: string } | null)?.display_name;
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
              <div className="space-y-4">
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
                        {primeContractDisplayName ||
                          (primeContractNumber && primeContractTitle
                            ? `${primeContractNumber} - ${primeContractTitle}`
                            : primeContractTitle || primeContractNumber || "Linked Prime Contract")}
                      </a>
                    ) : (
                      "Not set"
                    )}
                  </LabelValueRow>
                </dl>

                {/* Attachments */}
                <div className="pt-2">
                  <EntityAttachments
                    entityType="change_order"
                    entityId={String(changeEvent.id)}
                    projectId={String(projectId)}
                  />
                </div>
              </div>

              {/* Reason for Change */}
              <div>
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
                  <LabelValueRow label="Description" missing={!changeEvent.description}>
                    <span className="whitespace-pre-wrap">{changeEvent.description || "Not set"}</span>
                  </LabelValueRow>
                </dl>
              </div>
            </div>

          </div>

          {/* Right sidebar: Totals */}
          <div className="space-y-8">
            <div>
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
