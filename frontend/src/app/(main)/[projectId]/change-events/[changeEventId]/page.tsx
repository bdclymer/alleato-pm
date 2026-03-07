"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, FileCheck2, X, ArrowRight, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Inline } from "@/components/ui/inline";
import { Text } from "@/components/ui/text";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { formatCurrency } from "@/config/tables";
import { formatDate } from "@/lib/table-config/formatters";
import type { ChangeEvent } from "@/types/financial";

import { ChangeEventApprovalWorkflow } from "@/components/domain/change-events/ChangeEventApprovalWorkflow";
import { ChangeEventConvertDialog } from "@/components/domain/change-events/ChangeEventConvertDialog";
import { ChangeEventAttachmentsSection } from "@/components/domain/change-events/ChangeEventAttachmentsSection";
import { ChangeEventLineItemsGrid } from "@/components/domain/change-events/ChangeEventLineItemsGrid";
import { ChangeEventRfqForm } from "@/components/domain/change-events/ChangeEventRfqForm";
import { useProjectChangeEventRfqs } from "@/hooks/use-change-event-rfqs";

interface LineItem {
  id: string;
  description: string | null;
  unitOfMeasure: string | null;
  quantity: number | null;
  unitCost: number | null;
  costRom: number | null;
  revenueRom: number | null;
  nonCommittedCost: number | null;
  changeEventId: string;
  extendedAmount: number;
  sortOrder: number;
}

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: unknown;
  downloadUrl: string;
}

interface HistoryEntry {
  id: string;
  changeEventId?: string;
  action: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | { id: string; email: string } | null;
  changedAt: string;
  description?: string;
}

/**
 * Change Event Detail Page
 *
 * Displays detailed information about a specific change event
 * with tabs for General info, Line Items, Attachments, and History
 */
export default function ChangeEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const changeEventId = params.changeEventId as string; // UUID string, not a number

  const [changeEvent, setChangeEvent] = useState<ChangeEvent | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showRfqForm, setShowRfqForm] = useState(false);
  const [isCreatingRfq, setIsCreatingRfq] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const { rfqs, createRfq } = useProjectChangeEventRfqs(projectId);

  useProjectTitle(
    changeEvent
      ? `${changeEvent.number || `CE-${changeEvent.id}`} - ${changeEvent.title}`
      : "Loading...",
  );

  // Fetch change event details
  const fetchChangeEventDetails = useCallback(async () => {
    if (!projectId || !changeEventId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch change event
      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}`,
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Change event not found");
        }
        throw new Error("Failed to load change event");
      }

      const eventData = await response.json();
      const event = eventData.data || eventData;
      setChangeEvent(event);

      // Use line items from main response (already included by the GET endpoint)
      if (event.lineItems && Array.isArray(event.lineItems)) {
        setLineItems(event.lineItems);
      } else {
        // Fallback: try separate endpoint
        try {
          const lineItemsResponse = await fetch(
            `/api/projects/${projectId}/change-events/${changeEventId}/line-items`,
          );
          if (lineItemsResponse.ok) {
            const lineItemsData = await lineItemsResponse.json();
            setLineItems(lineItemsData.data || lineItemsData || []);
          }
        } catch {
          // Line items fetch failed, leave empty
        }
      }

      // Use history from main response
      if (event.history && Array.isArray(event.history)) {
        const mapped = event.history.map((h: any) => ({
          id: h.id,
          fieldName: h.fieldName || h.field_name || '',
          oldValue: h.oldValue || h.old_value || null,
          newValue: h.newValue || h.new_value || null,
          action: (h.changeType || h.change_type || 'UPDATE').toUpperCase(),
          changedBy: h.changedBy || h.changed_by || null,
          changedAt: h.changedAt || h.changed_at || '',
          description: h.description || `${(h.changeType || h.change_type || 'update').toUpperCase()} ${h.fieldName || h.field_name || 'record'}`,
        }));
        setHistoryEntries(mapped);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load change event",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, changeEventId]);

  useEffect(() => {
    fetchChangeEventDetails();
  }, [fetchChangeEventDetails]);

  // Action handlers
  const handleBack = useCallback(() => {
    router.push(`/${projectId}/change-events`);
  }, [router, projectId]);

  const handleEdit = useCallback(() => {
    router.push(`/${projectId}/change-events/${changeEventId}/edit`);
  }, [router, projectId, changeEventId]);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!changeEvent) return;

      try {
        const response = await fetch(
          `/api/projects/${projectId}/change-events/${changeEventId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...changeEvent,
              status: newStatus,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to update status");
        }

        const updatedEvent = await response.json();
        setChangeEvent(updatedEvent.data || updatedEvent);
        toast.success(`Status updated to ${getStatusDisplayName(newStatus)}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status",
        );
      }
    },
    [changeEvent, projectId, changeEventId],
  );

  const handleClose = useCallback(() => {
    handleStatusChange("closed");
  }, [handleStatusChange]);

  // Helper functions
  const getStatusBadgeVariant = (
    status: string,
  ):
    | "default"
    | "secondary"
    | "success"
    | "destructive"
    | "outline"
    | null
    | undefined => {
    switch (status?.toLowerCase()) {
      case "open":
        return "default";
      case "pending_approval":
      case "pending":
        return "secondary";
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "closed":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusDisplayName = (status: string | null | undefined) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "Open";
      case "pending_approval":
      case "pending":
        return "Pending Approval";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "closed":
        return "Closed";
      default:
        return status || "-";
    }
  };

  const getActionBadgeVariant = (
    action: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (action?.toUpperCase()) {
      case "CREATE":
        return "default";
      case "UPDATE":
        return "secondary";
      case "DELETE":
      case "VOID":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Calculate line item totals
  const totals = lineItems.reduce(
    (acc, item) => ({
      costRom: acc.costRom + (item.costRom || 0),
      revenueRom: acc.revenueRom + (item.revenueRom || 0),
      nonCommittedCost: acc.nonCommittedCost + (item.nonCommittedCost || 0),
    }),
    { costRom: 0, revenueRom: 0, nonCommittedCost: 0 },
  );

  // Loading state
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

  // Error state
  if (error || !changeEvent) {
    return (
      <Stack>
        <div className="flex items-center justify-between mb-4">
          <Text size="xl" weight="bold">
            Error
          </Text>
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Change Events
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Text tone="destructive">{error || "Change event not found"}</Text>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Inline align="center" gap="sm">
            <Text size="2xl" weight="bold">
              {changeEvent.title}
            </Text>
            <Badge variant={getStatusBadgeVariant(changeEvent.status ?? "")}>
              {getStatusDisplayName(changeEvent.status)}
            </Badge>
          </Inline>
          <Text size="sm" tone="muted">
            Change Event {changeEvent.number || `CE-${changeEvent.id}`}
          </Text>
        </div>
        <Inline gap="sm">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Inline>
      </div>

      {/* Status Actions */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                Status:
                <Badge variant={getStatusBadgeVariant(changeEvent.status ?? "")}>
                  {getStatusDisplayName(changeEvent.status)}
                </Badge>
              </CardTitle>
              <CardDescription>
                Created {formatDate((changeEvent as any).createdAt || changeEvent.created_at)}
              </CardDescription>
            </div>
            <Inline gap="sm">
              {changeEvent.status === "open" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("pending_approval")}
                  data-testid="change-event-submit-approval"
                >
                  <FileCheck2 className="mr-2 h-4 w-4" />
                  Submit for Approval
                </Button>
              )}
              {changeEvent.status === "pending_approval" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusChange("rejected")}
                  >
                    Reject
                  </Button>
                </>
              )}
              {changeEvent.status === "approved" && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setShowConvertDialog(true)}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Convert to Change Order
                </Button>
              )}
              {changeEvent.status !== "closed" &&
                changeEvent.status !== "converted" && (
                  <Button size="sm" variant="outline" onClick={handleClose}>
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                )}
            </Inline>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general" data-testid="change-event-tab-general">
            General
          </TabsTrigger>
          <TabsTrigger value="line-items" data-testid="change-event-tab-line-items">
            Line Items ({lineItems.length})
          </TabsTrigger>
          <TabsTrigger value="attachments" data-testid="change-event-tab-attachments">
            Attachments ({attachments.length})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="change-event-tab-history">
            History
          </TabsTrigger>
          <TabsTrigger value="rfqs" data-testid="change-event-tab-rfqs">
            RFQs ({rfqs.filter((r) => r.change_event_id === changeEventId).length})
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Stack>
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Number</label>
                  <p className="text-sm text-muted-foreground">
                    {changeEvent.number || `CE-${changeEvent.id}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    {getStatusDisplayName(changeEvent.status)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created By</label>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const creator = (changeEvent as any).createdBy;
                      if (creator && typeof creator === "object") {
                        const name = [creator.first_name, creator.last_name]
                          .filter(Boolean)
                          .join(" ");
                        return name || creator.email || "-";
                      }
                      return changeEvent.created_by || "-";
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Estimated Impact
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {changeEvent.estimated_impact
                      ? formatCurrency(changeEvent.estimated_impact)
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Scope</label>
                  <p className="text-sm text-muted-foreground">
                    {changeEvent.scope || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Origin</label>
                  <p className="text-sm text-muted-foreground">
                    {changeEvent.origin || "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {changeEvent.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">
                    {changeEvent.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Approval Workflow */}
            <ChangeEventApprovalWorkflow
              changeEventId={changeEventId}
              projectId={projectId}
              currentStatus={changeEvent.status || "open"}
              onStatusChange={handleStatusChange}
              currentUserId={"1"}
            />
          </Stack>
        </TabsContent>

        {/* Line Items Tab */}
        <TabsContent value="line-items">
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>
                Cost and revenue breakdown for this change event
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lineItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium border-b pb-2">
                    <div>Description</div>
                    <div>Quantity</div>
                    <div>Unit Cost</div>
                    <div>Cost ROM</div>
                    <div>Revenue ROM</div>
                    <div>Non-Committed</div>
                  </div>
                  {lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-6 gap-4 text-sm"
                    >
                      <div className="font-medium">{item.description}</div>
                      <div>
                        {item.quantity} {item.unitOfMeasure}
                      </div>
                      <div>{formatCurrency(item.unitCost || 0)}</div>
                      <div>{formatCurrency(item.costRom || 0)}</div>
                      <div>
                        {item.revenueRom
                          ? formatCurrency(item.revenueRom)
                          : "-"}
                      </div>
                      <div>{formatCurrency(item.nonCommittedCost || 0)}</div>
                    </div>
                  ))}
                  <Separator />
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium">
                    <div>Totals:</div>
                    <div></div>
                    <div></div>
                    <div data-testid="change-event-total-cost-rom">
                      {formatCurrency(totals.costRom)}
                    </div>
                    <div data-testid="change-event-total-revenue-rom">
                      {formatCurrency(totals.revenueRom)}
                    </div>
                    <div data-testid="change-event-total-non-committed">
                      {formatCurrency(totals.nonCommittedCost)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Text tone="muted">No line items added yet</Text>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>
                Supporting documents for this change event
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <div>
                        <p className="font-medium">{attachment.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {(attachment.fileSize / 1024).toFixed(1)} KB •
                          Uploaded {formatDate(attachment.uploadedAt)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Text tone="muted">No attachments uploaded yet</Text>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
              <CardDescription>
                Activity log for this change event
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isHistoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : historyEntries.length > 0 ? (
                <div className="space-y-3">
                  {historyEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium truncate">
                            {typeof entry.changedBy === 'object' && entry.changedBy?.email
                              ? entry.changedBy.email
                              : typeof entry.changedBy === 'string'
                                ? 'User'
                                : 'System'}
                          </span>
                          <Badge
                            variant={getActionBadgeVariant(entry.action)}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {entry.action}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">
                          {entry.description}
                        </p>
                        {entry.action === "UPDATE" &&
                          entry.oldValue &&
                          entry.newValue && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              <span className="font-medium">
                                {entry.fieldName}:
                              </span>{" "}
                              <span className="line-through">
                                {entry.oldValue}
                              </span>{" "}
                              <span className="text-foreground">&rarr;</span>{" "}
                              <span>{entry.newValue}</span>
                            </div>
                          )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.changedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <Text tone="muted">No history recorded yet</Text>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RFQs Tab */}
        <TabsContent value="rfqs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Requests for Quote</CardTitle>
                  <CardDescription>
                    Manage RFQs associated with this change event
                  </CardDescription>
                </div>
                {!showRfqForm && (
                  <Button size="sm" onClick={() => setShowRfqForm(true)}>
                    + New RFQ
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {showRfqForm && changeEvent && (
                <div className="mb-6 border rounded-md p-4">
                  <ChangeEventRfqForm
                    changeEvents={[changeEvent]}
                    isSubmitting={isCreatingRfq}
                    onSubmit={async (values) => {
                      setIsCreatingRfq(true);
                      try {
                        await createRfq({
                          changeEventId: values.changeEventId,
                          title: values.title,
                          dueDate: values.dueDate,
                          includeAttachments: values.includeAttachments,
                          notes: values.notes,
                        });
                        setShowRfqForm(false);
                        toast.success("RFQ created successfully");
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Failed to create RFQ",
                        );
                      } finally {
                        setIsCreatingRfq(false);
                      }
                    }}
                    onCancel={() => setShowRfqForm(false)}
                  />
                </div>
              )}

              {rfqs.filter((r) => r.change_event_id === changeEventId).length > 0 ? (
                <div className="space-y-2">
                  {rfqs
                    .filter((r) => r.change_event_id === changeEventId)
                    .map((rfq) => (
                      <div
                        key={rfq.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div>
                          <p className="font-medium text-sm">{rfq.rfq_number} — {rfq.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {rfq.status} · {rfq.response_count} response{rfq.response_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Badge variant="outline">{rfq.status}</Badge>
                      </div>
                    ))}
                </div>
              ) : (
                !showRfqForm && (
                  <div className="text-center py-8">
                    <Text tone="muted">No RFQs created yet</Text>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Convert to Change Order Dialog */}
      <ChangeEventConvertDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        changeEventId={changeEventId}
        projectId={projectId}
        lineItems={lineItems}
      />
    </Stack>
  );
}
