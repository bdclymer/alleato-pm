"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Download, Check, X, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load change order");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, changeOrderId]);

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
        <Tabs defaultValue="general" className="space-y-4">
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
                <CardContent className="space-y-3">
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
                <CardContent className="space-y-3">
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Related Change Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Change Event ID</span>
                    <span className="text-sm font-mono">{changeOrder.change_event_id}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Line Items Tab */}
          <TabsContent value="line-items">
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Line items functionality coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Attachments functionality coming soon
                </p>
              </CardContent>
            </Card>
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
                <div className="space-y-3">
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
