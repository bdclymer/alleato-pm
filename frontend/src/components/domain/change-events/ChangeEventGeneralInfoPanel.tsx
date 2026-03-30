"use client";

import type {
  ChangeEventDetail,
  ChangeEventAttachment,
} from "@/types/change-events";
import { Text } from "@/components/ui/text";
import { StatusBadge, SectionHeader } from "@/components/ds";
import { Stack } from "@/components/ui/stack";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

interface ChangeEventGeneralInfoPanelProps {
  changeEvent: ChangeEventDetail;
  attachments: ChangeEventAttachment[];
  projectId: number;
}

export function ChangeEventGeneralInfoPanel({
  changeEvent,
  attachments,
  projectId,
}: ChangeEventGeneralInfoPanelProps) {
  const primeContractId =
    changeEvent.prime_contract_id ?? changeEvent.primeContractId;
  const primeContractNumber = changeEvent.primeContract?.contract_number;
  const primeContractTitle = changeEvent.primeContract?.title;
  const lineItemRevenueSource =
    changeEvent.line_item_revenue_source ?? changeEvent.lineItemRevenueSource;

  return (
    <Stack gap="lg">
      {/* General Information */}
      <div>
        <SectionHeader title="General Information" className="mb-4" />
        <div className="grid grid-cols-4 gap-x-8 gap-y-5">
          {/* Row 1 */}
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Number
            </Text>
            <Text size="sm">
              {changeEvent.number || `CE-${changeEvent.id}`}
            </Text>
          </div>
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Title
            </Text>
            <Text size="sm">{changeEvent.title || "--"}</Text>
          </div>
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Status
            </Text>
            {changeEvent.status ? (
              <StatusBadge status={changeEvent.status} />
            ) : (
              <Text size="sm">--</Text>
            )}
          </div>
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Origin
            </Text>
            <Text size="sm">{changeEvent.origin || "--"}</Text>
          </div>

          {/* Row 2 */}
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Type
            </Text>
            <Text size="sm">{changeEvent.type || "--"}</Text>
          </div>
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Change Reason
            </Text>
            <Text size="sm">{changeEvent.reason || "--"}</Text>
          </div>
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Scope
            </Text>
            <Text size="sm">{changeEvent.scope || "--"}</Text>
          </div>
          <div />

          {/* Row 3 */}
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Expecting Revenue
            </Text>
            <Text size="sm">
              {changeEvent.expecting_revenue ? "Yes" : "No"}
            </Text>
          </div>
          <div>
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Line Item Revenue Source
            </Text>
            <Text size="sm">{lineItemRevenueSource || "--"}</Text>
          </div>
          <div className="col-span-2">
            <Text size="xs" tone="muted" weight="medium" className="mb-1">
              Prime Contract for Markup Estimates
            </Text>
            {primeContractId ? (
              <a
                href={`/${projectId}/prime-contracts/${primeContractId}`}
                className="text-sm text-primary hover:underline"
              >
                {primeContractNumber || primeContractTitle || `#${primeContractId}`}
              </a>
            ) : (
              <Text size="sm">--</Text>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-5">
          <Text size="xs" tone="muted" weight="medium" className="mb-1">
            Description
          </Text>
          <Text size="sm" className="whitespace-pre-wrap">
            {changeEvent.description || "--"}
          </Text>
        </div>
      </div>

      {/* Attachments */}
      <div>
        <SectionHeader title="Attachments" className="mb-3" />
        {attachments.length > 0 ? (
          <div className="flex flex-col gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <Button variant="link" asChild className="h-auto p-0">
                  <a
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {attachment.fileName}
                  </a>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Text size="sm" tone="muted">
            No attachments
          </Text>
        )}
      </div>
    </Stack>
  );
}
