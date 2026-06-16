"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell, ContentSectionStack, DetailPanel, SectionRuleHeading, LabelValueRow } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  DetailField,
  DetailFieldGrid,
  InlineTableFooter,
  InlineTableFooterCell,
  InlineTableFooterRow,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
} from "@/components/ds";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/table-config/formatters";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface DirectCostDetailPageProps {
  params: Promise<{
    projectId: string;
    costId: string;
  }>;
}

interface LineItem {
  id: string;
  description: string | null;
  quantity: number;
  uom: string;
  unit_cost: number;
  line_total: number;
  line_order: number;
  budget_code: { code: string; description: string } | null;
}

/** Normalize an invoice_number that may have been stored as a serialized object
 *  (e.g. "{}" or "[object Object]") due to an Acumatica sync bug where an empty
 *  AcuField envelope was written directly to the varchar column. */
function extractInvoiceNumber(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    // Reject empty-object artefacts left by the old sync bug
    if (trimmed === "" || trimmed === "{}" || trimmed === "[object Object]") return null;
    return trimmed;
  }
  if (typeof raw === "object") {
    // Handle { value: "..." } shape that slipped through unwrap
    const obj = raw as Record<string, unknown>;
    if (typeof obj.value === "string" && obj.value.trim() !== "") return obj.value.trim();
  }
  return null;
}

interface DirectCostDetail {
  id: string;
  project_id: number;
  date: string;
  cost_type: string;
  status: string;
  description: string | null;
  total_amount: number;
  invoice_number: unknown;
  received_date: string | null;
  paid_date: string | null;
  acumatica_ref_nbr: string | null;
  acumatica_doc_type: string | null;
  acumatica_sync_at: string | null;
  created_at: string;
  updated_at: string;
  vendor: { id: string; name: string } | null;
  employee: { id: string; first_name: string; last_name: string } | null;
  line_items: LineItem[];
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Approved":
      return "default";
    case "Pending":
      return "secondary";
    case "Revise and Resubmit":
      return "destructive";
    default:
      return "outline";
  }
}

export default function DirectCostDetailPage({
  params,
}: DirectCostDetailPageProps) {
  const router = useRouter();
  const [directCost, setDirectCost] = useState<DirectCostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{
    projectId: string;
    costId: string;
  } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;

    const fetchDirectCost = async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch<DirectCostDetail>(
          `/api/projects/${resolvedParams.projectId}/direct-costs/${resolvedParams.costId}`,
        );
        setDirectCost(data);
      } catch {
        toast.error("Failed to load direct cost details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDirectCost();
  }, [resolvedParams]);

  if (!resolvedParams || isLoading) {
    return (
      <PageShell variant="detail" title="Direct Cost Details" onBack={() => router.back()}>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-52" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  if (!directCost) {
    return (
      <PageShell variant="detail" title="Direct Cost Details" description="Direct cost not found" onBack={() => router.back()}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Direct cost not found</p>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/${resolvedParams.projectId}/direct-costs`)
            }
          >
            <ArrowLeft />
            Back to Direct Costs
          </Button>
        </div>
      </PageShell>
    );
  }

  const invoiceNumber = extractInvoiceNumber(directCost.invoice_number);

  const lineItemsTotal = directCost.line_items?.reduce(
    (sum, li) => sum + (li.line_total ?? li.quantity * li.unit_cost),
    0,
  ) ?? 0;

  return (
    <>
      <PageShell
        variant="detail"
        title="Direct Cost Details"
        description={invoiceNumber ? `Invoice #${invoiceNumber}` : `#${directCost.id.slice(0, 8)}`}
        onBack={() => router.back()}
      >
        <ContentSectionStack>
          {/* Cost Information + Record Info */}
          <section>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-x-16 gap-y-10">
              <div className="space-y-4">
                <SectionRuleHeading label="Cost Information" className="[&_span]:text-primary" />
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{directCost.cost_type}</Badge>
                  <Badge variant={statusVariant(directCost.status)}>
                    {directCost.status}
                  </Badge>
                </div>
                <DetailFieldGrid columns={2}>
                  <DetailField label="Total Amount">
                    <span className="text-2xl font-semibold">
                      {formatCurrency(directCost.total_amount)}
                    </span>
                  </DetailField>
                  <DetailField label="Date" value={directCost.date} date />
                  <DetailField
                    label="Vendor"
                    value={directCost.vendor?.name}
                  />
                  {directCost.employee ? (
                    <DetailField label="Employee">
                      {directCost.employee.first_name}{" "}
                      {directCost.employee.last_name}
                    </DetailField>
                  ) : null}
                  <DetailField label="Invoice Number" value={invoiceNumber} />
                  {directCost.received_date && (
                    <DetailField label="Received Date" value={directCost.received_date} date />
                  )}
                  {directCost.paid_date && (
                    <DetailField label="Paid Date" value={directCost.paid_date} date />
                  )}
                  {directCost.acumatica_sync_at && (
                    <DetailField label="Acumatica">
                      {directCost.acumatica_ref_nbr ? (
                        <a
                          href={`https://alleatogroup.acumatica.com/Main?ScreenId=PM304000&RefNbr=${encodeURIComponent(directCost.acumatica_ref_nbr)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          {directCost.acumatica_doc_type ? `${directCost.acumatica_doc_type} ` : ""}
                          {directCost.acumatica_ref_nbr}
                        </a>
                      ) : (
                        <Badge variant="outline">Synced</Badge>
                      )}
                    </DetailField>
                  )}
                  {directCost.description && (
                    <DetailField label="Description" span={2}>
                      {directCost.description}
                    </DetailField>
                  )}
                </DetailFieldGrid>
              </div>
              <div className="space-y-8">
                <div>
                  <SectionRuleHeading label="Record Information" className="[&_span]:text-primary" />
                  <DetailPanel>
                    <dl className="space-y-3 text-sm">
                      <LabelValueRow label="Created">
                        {formatDate(directCost.created_at, "MMM d, yyyy HH:mm")}
                      </LabelValueRow>
                      {directCost.updated_at &&
                        directCost.updated_at !== directCost.created_at && (
                          <LabelValueRow label="Last Updated">
                            {formatDate(directCost.updated_at, "MMM d, yyyy HH:mm")}
                          </LabelValueRow>
                        )}
                    </dl>
                  </DetailPanel>
                </div>
              </div>
            </div>
          </section>

          {/* Line Items */}
          {directCost.line_items && directCost.line_items.length > 0 && (
            <section>
              <div>
                <SectionRuleHeading
                  label={`Line Items (${directCost.line_items.length})`}
                  className="[&_span]:text-primary"
                />
                <InlineTable variant="read">
                  <InlineTableHeader>
                    <InlineTableHeaderRow>
                      <InlineTableHeaderCell>Budget Code</InlineTableHeaderCell>
                      <InlineTableHeaderCell>Description</InlineTableHeaderCell>
                      <InlineTableHeaderCell align="right">Qty</InlineTableHeaderCell>
                      <InlineTableHeaderCell>UOM</InlineTableHeaderCell>
                      <InlineTableHeaderCell align="right">Unit Cost</InlineTableHeaderCell>
                      <InlineTableHeaderCell align="right">Line Total</InlineTableHeaderCell>
                    </InlineTableHeaderRow>
                  </InlineTableHeader>
                  <InlineTableBody>
                    {directCost.line_items
                      .sort((a, b) => a.line_order - b.line_order)
                      .map((li) => (
                        <InlineTableRow key={li.id}>
                          <InlineTableCell className="font-medium">
                            {li.budget_code?.code ?? "-"}
                          </InlineTableCell>
                          <InlineTableCell>
                            {li.description ??
                              li.budget_code?.description ??
                              "-"}
                          </InlineTableCell>
                          <InlineTableCell align="right">
                            {li.quantity}
                          </InlineTableCell>
                          <InlineTableCell>{li.uom}</InlineTableCell>
                          <InlineTableCell align="right">
                            {formatCurrency(li.unit_cost)}
                          </InlineTableCell>
                          <InlineTableCell align="right" className="font-medium">
                            {formatCurrency(
                              li.line_total ?? li.quantity * li.unit_cost,
                            )}
                          </InlineTableCell>
                        </InlineTableRow>
                      ))}
                  </InlineTableBody>
                  <InlineTableFooter>
                    <InlineTableFooterRow>
                      <InlineTableFooterCell colSpan={5}>
                        Total
                      </InlineTableFooterCell>
                      <InlineTableFooterCell align="right">
                        {formatCurrency(lineItemsTotal)}
                      </InlineTableFooterCell>
                    </InlineTableFooterRow>
                  </InlineTableFooter>
                </InlineTable>
              </div>
            </section>
          )}
        </ContentSectionStack>
      </PageShell>
    </>
  );
}
