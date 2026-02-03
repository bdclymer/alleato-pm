"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Download, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { StatusBadge } from "@/components/misc/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import type { Commitment } from "@/types/financial";
import { ChangeOrdersTab } from "@/components/commitments/tabs/ChangeOrdersTab";
import { AttachmentsTab } from "@/components/commitments/tabs/AttachmentsTab";
import { InvoicesTab } from "@/components/commitments/tabs/InvoicesTab";
import { ScheduleOfValuesTab } from "@/components/commitments/tabs/ScheduleOfValuesTab";
import { AdvancedSettingsTab } from "@/components/commitments/tabs/AdvancedSettingsTab";
import { ExportDialog } from "@/components/commitments/ExportDialog";
import { EmailCommitmentDialog } from "@/components/commitments/EmailCommitmentDialog";
import { formatCurrency } from "@/config/tables";
import { formatDate } from "@/lib/table-config/formatters";

type CommitmentDetail = Commitment & {
  project_id?: number;
  type?: "subcontract" | "purchase_order" | string;
  pending_change_orders?: number;
  draft_change_orders?: number;
  change_order_totals?: {
    approved: number;
    pending: number;
    draft: number;
    executed: number;
    void: number;
    total: number;
  };
  line_items?: Array<{
    id: string;
    line_number?: number | null;
    budget_code?: string | null;
    description?: string | null;
    amount?: number | null;
    billed_to_date?: number | null;
  }>;
};

const normalizeCommitment = (raw: unknown): CommitmentDetail | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const accountingMethodRaw =
    typeof record.accounting_method === "string"
      ? record.accounting_method.toLowerCase()
      : "";

  const accountingMethod: CommitmentDetail["accounting_method"] =
    accountingMethodRaw === "unit_quantity"
      ? "unit"
      : accountingMethodRaw === "amount_based"
        ? "amount"
        : accountingMethodRaw === "percent"
          ? "percent"
          : "amount";

  const statusValue =
    typeof record.status === "string"
      ? (record.status.toLowerCase() as CommitmentDetail["status"])
      : "draft";

  const contractCompany =
    record.contract_company && typeof record.contract_company === "object"
      ? (record.contract_company as CommitmentDetail["contract_company"])
      : undefined;

  const assignee =
    record.assignee && typeof record.assignee === "object"
      ? (record.assignee as CommitmentDetail["assignee"])
      : undefined;

  const lineItemsRaw = Array.isArray(record.line_items)
    ? (record.line_items as Array<Record<string, unknown>>)
    : [];

  const line_items = lineItemsRaw.map((item) => ({
    id: String(item.id ?? crypto.randomUUID()),
    line_number:
      typeof item.line_number === "number" || typeof item.line_number === "string"
        ? Number(item.line_number)
        : null,
    budget_code:
      typeof item.budget_code === "string"
        ? item.budget_code
        : typeof item.cost_code === "string"
          ? item.cost_code
          : null,
    description:
      typeof item.description === "string"
        ? item.description
        : typeof item.title === "string"
          ? item.title
          : null,
    amount:
      typeof item.amount === "number" || typeof item.amount === "string"
        ? Number(item.amount)
        : null,
    billed_to_date:
      typeof item.billed_to_date === "number" ||
      typeof item.billed_to_date === "string"
        ? Number(item.billed_to_date)
        : null,
  }));

  return {
    id: String(record.id ?? ""),
    number: typeof record.number === "string" ? record.number : "",
    contract_company_id: String(record.contract_company_id ?? ""),
    contract_company: contractCompany,
    title: typeof record.title === "string" ? record.title : "",
    description:
      typeof record.description === "string" ? record.description : undefined,
    status: statusValue,
    original_amount: Number(record.original_amount ?? 0),
    approved_change_orders: Number(record.approved_change_orders ?? 0),
    revised_contract_amount: Number(
      record.revised_contract_amount ?? record.original_amount ?? 0,
    ),
    billed_to_date: Number(record.billed_to_date ?? 0),
    balance_to_finish: Number(record.balance_to_finish ?? 0),
    executed_date:
      typeof record.executed_date === "string"
        ? record.executed_date
        : undefined,
    start_date:
      typeof record.start_date === "string" ? record.start_date : undefined,
    substantial_completion_date:
      typeof record.substantial_completion_date === "string"
        ? record.substantial_completion_date
        : undefined,
    accounting_method: accountingMethod,
    retention_percentage: Number(record.retention_percentage ?? 0),
    vendor_invoice_number:
      typeof record.vendor_invoice_number === "string"
        ? record.vendor_invoice_number
        : undefined,
    signed_received_date:
      typeof record.signed_received_date === "string"
        ? record.signed_received_date
        : undefined,
    assignee_id: record.assignee_id ? String(record.assignee_id) : undefined,
    assignee,
    private:
      typeof record.private === "boolean"
        ? record.private
        : typeof record.is_private === "boolean"
          ? record.is_private
          : false,
    deleted_at:
      typeof record.deleted_at === "string" ? record.deleted_at : undefined,
    is_deleted:
      typeof record.is_deleted === "boolean" ? record.is_deleted : undefined,
    created_at:
      typeof record.created_at === "string"
        ? record.created_at
        : new Date().toISOString(),
    updated_at:
      typeof record.updated_at === "string"
        ? record.updated_at
        : new Date().toISOString(),
    project_id: typeof record.project_id === "number" ? record.project_id : undefined,
    type: typeof record.type === "string" ? record.type : undefined,
    pending_change_orders: Number(record.pending_change_orders ?? 0),
    draft_change_orders: Number(record.draft_change_orders ?? 0),
    change_order_totals:
      record.change_order_totals && typeof record.change_order_totals === "object"
        ? (record.change_order_totals as CommitmentDetail["change_order_totals"])
        : undefined,
    line_items,
  };
};

/**
 * Commitment Detail Page
 *
 * Displays detailed information about a specific commitment (subcontract or purchase order)
 */
export default function CommitmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const commitmentId = params.commitmentId as string;

  const [commitment, setCommitment] = useState<CommitmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  useProjectTitle(
    commitment ? `${commitment.number} - ${commitment.title}` : "Loading...",
  );

  // Fetch commitment data
  const fetchCommitment = useCallback(async () => {
    if (!commitmentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/commitments/${commitmentId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Commitment not found");
        }
        throw new Error("Failed to fetch commitment details");
      }

      const data = await response.json();
      const payload =
        data && typeof data === "object" && "data" in data ? data.data : data;
      const normalized = normalizeCommitment(payload);

      if (!normalized || !normalized.id) {
        throw new Error("Commitment not found");
      }

      setCommitment(normalized);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch commitment",
      );
    } finally {
      setIsLoading(false);
    }
  }, [commitmentId]);

  useEffect(() => {
    fetchCommitment();
  }, [fetchCommitment]);

  // Action handlers
  const handleBack = useCallback(() => {
    router.push(`/${projectId}/commitments`);
  }, [router, projectId]);

  const handleEdit = useCallback(() => {
    router.push(`/${projectId}/commitments/${commitmentId}/edit`);
  }, [router, projectId, commitmentId]);

  const handleDelete = useCallback(async () => {
    if (
      !commitment ||
      !confirm(
        `Are you sure you want to delete commitment ${commitment.number}?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/commitments/${commitmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete commitment");
      }

      toast.success("Commitment deleted successfully");
      router.push(`/${projectId}/commitments`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete commitment",
      );
    }
  }, [commitment, commitmentId, projectId, router]);

  const handleExport = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const handleEmail = useCallback(() => {
    setIsEmailDialogOpen(true);
  }, []);

  if (isLoading) {
    return (
      <Stack>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </Stack>
    );
  }

  if (error || !commitment) {
    return (
      <Stack>
        <div className="flex items-center justify-between mb-4">
          <Text size="xl" weight="bold">
            Error
          </Text>
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Commitments
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Text tone="destructive">{error || "Commitment not found"}</Text>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Text size="xl" weight="bold">
            {commitment.number}
          </Text>
          <StatusBadge status={commitment.status} type="commitment" />
          {commitment.private && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Private
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="sov">SOV</TabsTrigger>
          <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="advanced-settings">Advanced Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Title
                  </Text>
                  <Text>{commitment.title}</Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Status
                  </Text>
                  <Text transform="capitalize">
                    {commitment.status?.replace(/_/g, " ") || "—"}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Company
                  </Text>
                  <Text>{commitment.contract_company?.name || "—"}</Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Accounting Method
                  </Text>
                  <Text transform="capitalize">
                    {commitment.accounting_method?.replace(/_/g, " ") || "—"}
                  </Text>
                </Stack>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Text>{commitment.description || "No description provided"}</Text>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Amounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Original Amount
                  </Text>
                  <Text size="lg" weight="medium">
                    {formatCurrency(commitment.original_amount || 0)}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Approved Change Orders
                  </Text>
                  <Text size="lg" weight="medium" className="text-green-600">
                    {commitment.approved_change_orders
                      ? `+${formatCurrency(commitment.approved_change_orders)}`
                      : formatCurrency(0)}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Revised Amount
                  </Text>
                  <Text size="lg" weight="bold">
                    {formatCurrency(commitment.revised_contract_amount || 0)}
                  </Text>
                </Stack>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Approved / Executed
                  </Text>
                  <Text size="lg" weight="medium" className="text-green-600">
                    {formatCurrency(commitment.approved_change_orders || 0)}
                  </Text>
                  <Text size="xs" tone="muted">
                    Included in revised amount
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Pending Approval
                  </Text>
                  <Text size="lg" weight="medium" className="text-amber-600">
                    {formatCurrency(commitment.pending_change_orders || 0)}
                  </Text>
                  <Text size="xs" tone="muted">
                    Awaiting approval
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Draft
                  </Text>
                  <Text size="lg" weight="medium" className="text-gray-500">
                    {formatCurrency(commitment.draft_change_orders || 0)}
                  </Text>
                  <Text size="xs" tone="muted">
                    Not yet submitted
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Potential Total
                  </Text>
                  <Text size="lg" weight="medium" className="text-blue-600">
                    {formatCurrency(
                      (commitment.approved_change_orders || 0) +
                        (commitment.pending_change_orders || 0) +
                        (commitment.draft_change_orders || 0)
                    )}
                  </Text>
                  <Text size="xs" tone="muted">
                    If all COs approved
                  </Text>
                </Stack>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Invoiced to Date
                  </Text>
                  <Text size="lg" weight="medium" className="text-green-600">
                    {formatCurrency(commitment.billed_to_date || 0)}
                  </Text>
                  <Text size="xs" tone="muted">
                    {commitment.revised_contract_amount
                      ? `${Math.round(((commitment.billed_to_date || 0) / commitment.revised_contract_amount) * 100)}% of contract`
                      : "—"}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Retention %
                  </Text>
                  <Text size="lg" weight="medium">
                    {commitment.retention_percentage
                      ? `${commitment.retention_percentage}%`
                      : "—"}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Retention Amount
                  </Text>
                  <Text size="lg" weight="medium" className="text-amber-600">
                    {commitment.retention_percentage && commitment.billed_to_date
                      ? formatCurrency(
                          (commitment.billed_to_date * commitment.retention_percentage) / 100
                        )
                      : formatCurrency(0)}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Balance to Finish
                  </Text>
                  <Text size="lg" weight="medium">
                    {formatCurrency(commitment.balance_to_finish || 0)}
                  </Text>
                </Stack>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Private
                  </Text>
                  <Text>{commitment.private ? "Yes" : "No"}</Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Vendor Invoice Number
                  </Text>
                  <Text>{commitment.vendor_invoice_number || "—"}</Text>
                </Stack>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Start Date
                  </Text>
                  <Text>
                    {commitment.start_date
                      ? formatDate(commitment.start_date)
                      : "—"}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Substantial Completion Date
                  </Text>
                  <Text>
                    {commitment.substantial_completion_date
                      ? formatDate(commitment.substantial_completion_date)
                      : "—"}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Executed Date
                  </Text>
                  <Text>
                    {commitment.executed_date
                      ? formatDate(commitment.executed_date)
                      : "—"}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Signed Received Date
                  </Text>
                  <Text>
                    {commitment.signed_received_date
                      ? formatDate(commitment.signed_received_date)
                      : "—"}
                  </Text>
                </Stack>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Created
                  </Text>
                  <Text>
                    {commitment.created_at
                      ? formatDate(commitment.created_at)
                      : "—"}
                  </Text>
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" tone="muted">
                    Last Updated
                  </Text>
                  <Text>
                    {commitment.updated_at
                      ? formatDate(commitment.updated_at)
                      : "—"}
                  </Text>
                </Stack>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sov">
          <ScheduleOfValuesTab
            lineItems={commitment.line_items || []}
            projectId={projectId}
            commitmentId={commitment.id}
            commitmentType={commitment.type}
            onImportComplete={fetchCommitment}
          />
        </TabsContent>

        <TabsContent value="change-orders">
          <ChangeOrdersTab commitmentId={commitment.id} projectId={projectId} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab commitmentId={commitment.id} />
        </TabsContent>

        <TabsContent value="attachments">
          <AttachmentsTab commitmentId={commitment.id} />
        </TabsContent>

        <TabsContent value="advanced-settings">
          <AdvancedSettingsTab
            commitmentId={commitment.id}
            commitmentType={commitment.type}
          />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        projectId={String(projectId)}
        commitmentId={commitment.id}
        commitmentNumber={commitment.number}
      />

      {/* Email Dialog */}
      <EmailCommitmentDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        commitmentId={commitment.id}
        commitmentNumber={commitment.number}
        commitmentTitle={commitment.title}
        companyId={commitment.contract_company_id}
        companyName={commitment.contract_company?.name}
      />
    </Stack>
  );
}
