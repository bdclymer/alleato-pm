"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Download, Check, X, FileText, Trash2, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { ApprovalWorkflow } from "@/components/domain/change-orders/ApprovalWorkflow";
import {
  isActionAvailable,
  isIrreversibleAction,
  getActionWarning,
} from "@/lib/change-orders/status-transitions";
import { LineItemsTable, type ChangeOrderLineItem } from "@/components/domain/change-orders/LineItemsTable";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  draft: "outline",
  executed: "default",
  rejected: "destructive",
  void: "destructive",
};

function formatCurrency(amount: number | null): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ChangeOrder = {
  id: number;
  project_id: number;
  co_number: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  amount: number | null;
  contract_id: number | null;
  designated_reviewer_id: string | null;
  due_date: string | null;
  created_at: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  is_private: boolean | null;
  apply_vertical_markup: boolean | null;
  change_event_id: string | null;
  updated_at: string | null;
};

type Contract = {
  contract_number: string;
};

export default function ChangeOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const changeOrderId = params.changeOrderId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [changeOrder, setChangeOrder] = useState<ChangeOrder | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserCanApprove, setCurrentUserCanApprove] = useState(false);
  const [currentUserIsCreator, setCurrentUserIsCreator] = useState(false);

  // Line items state
  const [lineItems, setLineItems] = useState<ChangeOrderLineItem[]>([]);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
  const [lineItemsLoading, setLineItemsLoading] = useState(false);
  const [lineItemsLoaded, setLineItemsLoaded] = useState(false);

  // Change event state (for converted change orders)
  const [changeEvent, setChangeEvent] = useState<{
    id: string;
    event_number: string;
    title: string;
    status: string;
  } | null>(null);
  const [isLoadingChangeEvent, setIsLoadingChangeEvent] = useState(false);

  // Fetch change order data and current user
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Get current user from Supabase auth
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setCurrentUserId(user.id);
        }

        // Fetch change order
        const response = await fetch(`/api/projects/${projectId}/change-orders/${changeOrderId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch change order");
        }

        const data = await response.json();
        setChangeOrder(data);

        // Check if current user is the designated reviewer
        if (user && data.designated_reviewer_id === user.id) {
          setCurrentUserCanApprove(true);
        } else {
          setCurrentUserCanApprove(false);
        }

        // Check if current user is the creator (submitted_by)
        if (user && data.submitted_by === user.id) {
          setCurrentUserIsCreator(true);
        } else {
          setCurrentUserIsCreator(false);
        }

        // Fetch contract if exists
        if (data.contract_id) {
          const contractResponse = await fetch(`/api/contracts/${data.contract_id}`);
          if (contractResponse.ok) {
            const contractData = await contractResponse.json();
            setContract(contractData);
          }
        }

        // Fetch change event if this was converted from one
        if (data.change_event_id) {
          setIsLoadingChangeEvent(true);
          try {
            const changeEventResponse = await fetch(
              `/api/projects/${projectId}/change-events/${data.change_event_id}`
            );
            if (changeEventResponse.ok) {
              const changeEventData = await changeEventResponse.json();
              setChangeEvent({
                id: changeEventData.id,
                event_number: changeEventData.event_number || "N/A",
                title: changeEventData.title || "Untitled",
                status: changeEventData.status || "unknown",
              });
            }
          } catch (err) {
            console.error("Failed to fetch change event:", err);
          } finally {
            setIsLoadingChangeEvent(false);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load change order");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, changeOrderId]);

  // Fetch line items
  const fetchLineItems = useCallback(async () => {
    if (lineItemsLoaded) return; // Only fetch once

    try {
      setLineItemsLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}/line-items`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch line items");
      }

      const result = await response.json();

      // Transform API response to match LineItemsTable interface
      // NOTE: Current database schema stores only 'amount' (total), not qty/unit_price breakdown
      // So we're treating each line as a lump sum (qty=1, unit_price=amount)
      const transformedItems: ChangeOrderLineItem[] = (result.data || []).map((item: any) => ({
        id: item.id?.toString(),
        description: item.description || "",
        cost_code_id: item.costCodeId?.toString() || null,
        quantity: 1, // Database schema doesn't have quantity field - treating as lump sum
        unit_of_measure: "LS", // Lump sum by default
        unit_price: item.amount || 0, // Database 'amount' field maps to unit_price
      }));

      setLineItems(transformedItems);
      setLineItemsLoaded(true);
    } catch (err) {
      console.error("Failed to fetch line items:", err);
      toast.error("Failed to load line items");
    } finally {
      setLineItemsLoading(false);
    }
  }, [projectId, changeOrderId, lineItemsLoaded]);

  // Refetch function to reload data after approval/rejection
  const refetchData = useCallback(async () => {
    try {
      // Get current user from Supabase auth
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
      }

      // Fetch change order
      const response = await fetch(`/api/projects/${projectId}/change-orders/${changeOrderId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch change order");
      }

      const data = await response.json();
      setChangeOrder(data);

      // Check if current user is the designated reviewer
      if (user && data.designated_reviewer_id === user.id) {
        setCurrentUserCanApprove(true);
      } else {
        setCurrentUserCanApprove(false);
      }

      // Check if current user is the creator (submitted_by)
      if (user && data.submitted_by === user.id) {
        setCurrentUserIsCreator(true);
      } else {
        setCurrentUserIsCreator(false);
      }

      // Fetch contract if exists
      if (data.contract_id) {
        const contractResponse = await fetch(`/api/contracts/${data.contract_id}`);
        if (contractResponse.ok) {
          const contractData = await contractResponse.json();
          setContract(contractData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load change order");
    }
  }, [projectId, changeOrderId]);

  const handleBack = useCallback(() => {
    router.push(`/${projectId}/change-orders`);
  }, [router, projectId]);

  const handleEdit = useCallback(() => {
    router.push(`/${projectId}/change-orders/${changeOrderId}/edit`);
  }, [router, projectId, changeOrderId]);

  const handleDelete = useCallback(async () => {
    if (
      !changeOrder ||
      !confirm(`Are you sure you want to delete change order ${changeOrder.co_number}?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/change-orders/${changeOrderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete change order");
      }

      toast.success("Change order deleted successfully");
      router.push(`/${projectId}/change-orders`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete change order");
    }
  }, [changeOrder, projectId, changeOrderId, router]);


  const handleExecute = useCallback(async () => {
    if (!changeOrder) return;

    // Show warning for irreversible action
    const warning = getActionWarning("execute");
    if (warning && !confirm(warning)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/change-orders/${changeOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "executed",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute change order");
      }

      toast.success("Change order executed successfully");
      await refetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to execute");
    }
  }, [changeOrder, projectId, changeOrderId, refetchData]);

  const handleGeneratePDF = useCallback(() => {
    toast.info("PDF generation coming soon");
  }, []);

  // Handle line items changes (batch save approach)
  const handleLineItemsChange = useCallback(
    async (updatedItems: ChangeOrderLineItem[]) => {
      setLineItems(updatedItems);

      // Calculate new total from line items
      const newTotal = updatedItems.reduce((sum, item) => {
        return sum + (item.quantity || 0) * (item.unit_price || 0);
      }, 0);

      // Update the change order amount in local state
      if (changeOrder) {
        setChangeOrder({
          ...changeOrder,
          amount: newTotal,
        });
      }

      // TODO: Implement auto-save or batch save
      // For now, we'll just update local state
      // A "Save" button could be added to persist changes
    },
    [changeOrder]
  );

  // Fetch attachments
  const fetchAttachments = useCallback(async () => {
    if (attachmentsLoaded) return;

    try {
      setAttachmentsLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch attachments");
      }

      const result = await response.json();
      setAttachments(result.data || []);
      setAttachmentsLoaded(true);
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
      toast.error("Failed to load attachments");
    } finally {
      setAttachmentsLoading(false);
    }
  }, [projectId, changeOrderId, attachmentsLoaded]);

  // Handle file selection for upload
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
          `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to upload ${file.name}`);
        }

        toast.success(`${file.name} uploaded successfully`);
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      }
    }

    // Refresh attachments list
    setAttachmentsLoaded(false);
    await fetchAttachments();

    // Reset the input
    event.target.value = "";
  }, [projectId, changeOrderId, fetchAttachments]);

  // Handle attachment deletion
  const handleAttachmentDelete = useCallback(async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete attachment");
      }

      toast.success("Attachment deleted successfully");

      // Refresh attachments list
      setAttachmentsLoaded(false);
      await fetchAttachments();
    } catch (err) {
      console.error("Error deleting attachment:", err);
      toast.error("Failed to delete attachment");
    }
  }, [projectId, changeOrderId, fetchAttachments]);

  if (isLoading) {
    return (
      <>
        <ProjectPageHeader
          title="Loading..."
          description="Loading change order details"
        />
        <PageContainer>
          <div className="space-y-6">
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  if (error || !changeOrder) {
    return (
      <>
        <ProjectPageHeader
          title="Error"
          description="Failed to load change order"
        />
        <PageContainer>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                {error || "Change order not found"}
              </div>
              <div className="flex justify-center mt-4">
                <Button onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Change Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    );
  }

  const statusVariant = STATUS_VARIANTS[changeOrder.status ?? ""] ?? "outline";

  const pageTitle = changeOrder.co_number
    ? `${changeOrder.co_number} — ${changeOrder.title || "Untitled Change Order"}`
    : changeOrder.title || "Untitled Change Order";

  return (
    <>
      <ProjectPageHeader
        title={pageTitle}
        description={changeOrder.description || undefined}
        statusBadge={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>{changeOrder.status || "Unknown"}</Badge>
            {changeOrder.is_private && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Private
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {/* Quick Approve/Reject buttons - visible only to reviewer when action is available */}
            {isActionAvailable(changeOrder.status || "", "approve", currentUserIsCreator, currentUserCanApprove) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Scroll to Reviews tab
                    const reviewsTab = document.querySelector('[value="reviews"]');
                    if (reviewsTab instanceof HTMLElement) {
                      reviewsTab.click();
                    }
                    toast.info("Use the approval workflow in the Reviews tab below");
                  }}
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                  disabled={!isActionAvailable(changeOrder.status || "", "reject", currentUserIsCreator, currentUserCanApprove)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    // Scroll to Reviews tab
                    const reviewsTab = document.querySelector('[value="reviews"]');
                    if (reviewsTab instanceof HTMLElement) {
                      reviewsTab.click();
                    }
                    toast.info("Use the approval workflow in the Reviews tab below");
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}

            {isActionAvailable(changeOrder.status || "", "edit", currentUserIsCreator, currentUserCanApprove) && (
              <Button variant="default" size="sm" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isActionAvailable(changeOrder.status || "", "execute", currentUserIsCreator, currentUserCanApprove) && (
                  <>
                    <DropdownMenuItem onClick={handleExecute}>
                      <Check className="mr-2 h-4 w-4" />
                      Execute
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleGeneratePDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  toast.info("Download coming soon");
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                {isActionAvailable(changeOrder.status || "", "delete", currentUserIsCreator, currentUserCanApprove) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <PageContainer className="space-y-6">
        {/* Key Information Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(changeOrder.amount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Due Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDate(changeOrder.due_date)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reviewer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {changeOrder.designated_reviewer_id || "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contract
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{contract?.contract_number || "—"}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs
          defaultValue="general"
          className="space-y-4"
          onValueChange={(value) => {
            // Auto-fetch line items when tab is selected
            if (value === "line-items" && !lineItemsLoaded && !lineItemsLoading) {
              fetchLineItems();
            }
            // Auto-fetch attachments when tab is selected
            if (value === "attachments" && !attachmentsLoaded && !attachmentsLoading) {
              fetchAttachments();
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="line-items">Line Items</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(changeOrder.amount)}
                    </span>
                  </div>
                  {contract && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Contract</span>
                      <span className="text-sm">{contract.contract_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Apply Vertical Markup</span>
                    <span className="text-sm">
                      {changeOrder.apply_vertical_markup ? "Yes" : "No"}
                    </span>
                  </div>
                  {changeOrder.is_private && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Visibility</span>
                      <Badge variant="outline" className="text-xs">
                        Private
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm">{formatDate(changeOrder.created_at)}</span>
                  </div>
                  {changeOrder.due_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Due Date</span>
                      <span className="text-sm">{formatDate(changeOrder.due_date)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Submitted</span>
                    <span className="text-sm">{formatDate(changeOrder.submitted_at)}</span>
                  </div>
                  {changeOrder.submitted_by && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Submitted By</span>
                      <span className="text-sm">{changeOrder.submitted_by}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Approved</span>
                    <span className="text-sm">{formatDate(changeOrder.approved_at)}</span>
                  </div>
                  {changeOrder.approved_by && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Approved By</span>
                      <span className="text-sm">{changeOrder.approved_by}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {changeOrder.rejection_reason && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Rejection Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{changeOrder.rejection_reason}</p>
                </CardContent>
              </Card>
            )}

            {changeOrder.change_event_id && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    Source Change Event
                    <Link
                      href={`/${projectId}/change-events/${changeOrder.change_event_id}`}
                      className="ml-auto"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View Change Event
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingChangeEvent ? (
                    <div className="flex items-center justify-center py-4">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : changeEvent ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Event Number</span>
                        <span className="text-sm font-medium">{changeEvent.event_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Title</span>
                        <span className="text-sm font-medium">{changeEvent.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={changeEvent.status === "converted" ? "default" : "secondary"}>
                          {changeEvent.status}
                        </Badge>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          This change order was created by converting change event{" "}
                          <span className="font-mono">{changeEvent.event_number}</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Change Event ID</span>
                      <span className="text-sm font-mono">{changeOrder.change_event_id}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Line Items Tab */}
          <TabsContent value="line-items" className="space-y-4">
            {lineItemsLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <Skeleton className="h-64 w-full" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Check if user can edit based on status */}
                {!lineItemsLoaded && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Button onClick={fetchLineItems} variant="outline">
                          Load Line Items
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {lineItemsLoaded && (
                  <div className="space-y-4">
                    {/* Show LineItemsTable component */}
                    <LineItemsTable
                      lineItems={lineItems}
                      onChange={handleLineItemsChange}
                      readOnly={
                        changeOrder?.status === "approved" ||
                        changeOrder?.status === "executed" ||
                        changeOrder?.status === "void" ||
                        changeOrder?.status === "rejected"
                      }
                      showTotals={true}
                    />

                    {/* Instructions based on mode */}
                    {changeOrder?.status === "draft" || changeOrder?.status === "pending" ? (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-4">
                          <p className="text-sm text-blue-900">
                            💡 <strong>Tip:</strong> Line item changes update the change order total
                            automatically. Changes are saved when you edit individual fields.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-muted/30">
                        <CardContent className="pt-4">
                          <p className="text-sm text-muted-foreground">
                            This change order is in <strong>{changeOrder?.status}</strong> status and
                            cannot be edited. Line items are shown in read-only mode.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments" className="space-y-4">
            {attachmentsLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <Skeleton className="h-64 w-full" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Upload Zone */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Attachments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById("attachment-upload")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Files
                      </Button>
                      <input
                        id="attachment-upload"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <p className="text-sm text-muted-foreground">
                        Max 50MB per file • PDF, DOC, XLS, JPG, PNG
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Attachments List */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Existing Attachments
                      {attachments.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({attachments.length})
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!attachmentsLoaded && (
                      <div className="text-center py-8">
                        <Button onClick={fetchAttachments} variant="outline">
                          Load Attachments
                        </Button>
                      </div>
                    )}

                    {attachmentsLoaded && attachments.length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                          No attachments yet. Upload files using the form above.
                        </p>
                      </div>
                    )}

                    {attachmentsLoaded && attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <FileText className="h-8 w-8 flex-shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {attachment.fileName}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                </span>
                                <span>•</span>
                                <span>
                                  {new Date(attachment.uploadedAt).toLocaleDateString()}
                                </span>
                                {attachment.uploadedBy && (
                                  <>
                                    <span>•</span>
                                    <span>{attachment.uploadedBy.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={`/api/projects/${projectId}/change-orders/${changeOrderId}/attachments/${attachment.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAttachmentDelete(attachment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <ApprovalWorkflow
              changeOrder={{
                id: changeOrderId,
                status: changeOrder.status || "draft",
                contract_id: changeOrder.contract_id?.toString() || "",
                project_id: parseInt(projectId),
                designated_reviewer_id: changeOrder.designated_reviewer_id,
                approved_at: changeOrder.approved_at,
                approved_by: changeOrder.approved_by,
                rejection_reason: changeOrder.rejection_reason,
                submitted_at: changeOrder.submitted_at,
              }}
              currentUserCanApprove={currentUserCanApprove}
              reviewerName={changeOrder.designated_reviewer_id || undefined}
              reviewerEmail={undefined}
              onApprovalSuccess={refetchData}
              onRejectionSuccess={refetchData}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Change History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatDate(changeOrder.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{formatDate(changeOrder.updated_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Detailed change history coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
