"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { ChangeOrderReviewerResponse } from "./ChangeOrderReviewerResponse";

interface ApprovalWorkflowProps {
  changeOrder: {
    id: string;
    status: string;
    contract_id: string;
    project_id: number;
    designated_reviewer_id?: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
    rejection_reason?: string | null;
    submitted_at?: string | null;
  };
  reviews?: ReviewRecord[];
  currentUserCanApprove: boolean;
  reviewerName?: string;
  reviewerEmail?: string;
  onApprovalSuccess?: () => void;
  onRejectionSuccess?: () => void;
}

interface ReviewRecord {
  id: string;
  reviewer_id: string;
  reviewer_name?: string;
  reviewer_email?: string;
  status: "Pending" | "Approved" | "Rejected" | "Waiting";
  date?: string;
  notes?: string;
  tier?: number; // For multi-tier support (future)
}

/**
 * ApprovalWorkflow - Visual timeline component for change order approval process
 *
 * Features:
 * - Shows approval workflow as a vertical timeline
 * - Displays reviewer status with color coding (green/red/yellow/gray)
 * - Integrates ChangeOrderReviewerResponse for active tier
 * - Shows review history below timeline
 * - Supports single-tier (MVP) and multi-tier (future enhancement)
 *
 * Color scheme:
 * - Green: Approved
 * - Red: Rejected
 * - Yellow: Pending
 * - Gray: Waiting
 *
 * @example
 * ```tsx
 * <ApprovalWorkflow
 *   changeOrder={changeOrderData}
 *   reviews={reviewRecords}
 *   currentUserCanApprove={true}
 *   reviewerName="John Smith"
 *   onApprovalSuccess={() => router.refresh()}
 * />
 * ```
 */
export function ApprovalWorkflow({
  changeOrder,
  reviews = [],
  currentUserCanApprove,
  reviewerName,
  reviewerEmail,
  onApprovalSuccess,
  onRejectionSuccess,
}: ApprovalWorkflowProps) {
  // Determine workflow status based on change order status
  const workflowStatus = getWorkflowStatus(changeOrder.status);

  // For MVP: Single-tier approval
  // If no reviews data provided, derive from change order data
  const workflowReviews = reviews.length > 0 ? reviews : deriveReviewsFromChangeOrder(changeOrder);

  // Find active tier (the one that needs action)
  const activeTier = workflowReviews.find((r) => r.status === "Pending");

  return (
    <div className="space-y-6">
      {/* Approval Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Approval Workflow</CardTitle>
            <WorkflowStatusBadge status={workflowStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeline Items */}
          <div className="space-y-4">
            {workflowReviews.map((review, index) => (
              <div key={review.id}>
                <TimelineItem
                  review={review}
                  isActive={review.status === "Pending"}
                  isLast={index === workflowReviews.length - 1}
                />

                {/* Show ChangeOrderReviewerResponse for active tier if user can approve */}
                {review.status === "Pending" && currentUserCanApprove && (
                  <div className="ml-8 mt-3">
                    <ChangeOrderReviewerResponse
                      changeOrderId={changeOrder.id}
                      contractId={changeOrder.contract_id}
                      projectId={changeOrder.project_id}
                      currentStatus={changeOrder.status}
                      currentUserIsReviewer={currentUserCanApprove}
                      reviewerName={reviewerName}
                      reviewerEmail={reviewerEmail}
                      onApprovalSuccess={onApprovalSuccess}
                      onRejectionSuccess={onRejectionSuccess}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty state if no reviewers */}
          {workflowReviews.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No approval workflow configured</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review History Section */}
      {workflowReviews.some((r) => r.status !== "Waiting" && r.status !== "Pending") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflowReviews
                .filter((r) => r.status === "Approved" || r.status === "Rejected")
                .map((review) => (
                  <div
                    key={review.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="mt-0.5">
                      {review.status === "Approved" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {review.reviewer_name || review.reviewer_email || "Unknown Reviewer"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {review.date ? formatDate(review.date) : "—"}
                        </span>
                      </div>
                      {review.notes && (
                        <p className="text-sm text-muted-foreground">{review.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Timeline Item Component - Individual tier in the approval workflow
 */
function TimelineItem({
  review,
  isActive,
  isLast,
}: {
  review: ReviewRecord;
  isActive: boolean;
  isLast: boolean;
}) {
  const statusConfig = getStatusConfig(review.status);

  return (
    <div className="relative flex items-start gap-3">
      {/* Timeline Connector Line */}
      {!isLast && (
        <div className="absolute left-4 top-9 bottom-0 w-0.5 bg-border -translate-x-1/2" />
      )}

      {/* Status Icon */}
      <div
        className={`relative flex items-center justify-center h-8 w-8 rounded-full border-2 ${
          isActive ? "ring-2 ring-offset-2" : ""
        } ${statusConfig.containerClass}`}
      >
        {statusConfig.icon}
      </div>

      {/* Review Details */}
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {review.reviewer_name || review.reviewer_email || "Unknown Reviewer"}
            </span>
            {review.tier && (
              <Badge variant="outline" className="text-xs">
                Tier {review.tier}
              </Badge>
            )}
          </div>
          <Badge
            variant="outline"
            className={`text-xs ${statusConfig.badgeClass}`}
          >
            {review.status}
          </Badge>
        </div>

        {/* Date/Notes */}
        {review.date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Calendar className="h-3 w-3" />
            {formatDate(review.date)}
          </div>
        )}

        {review.notes && (
          <p className="text-sm text-muted-foreground mt-1 p-2 rounded bg-muted/50">
            {review.notes}
          </p>
        )}

        {review.status === "Waiting" && (
          <p className="text-xs text-muted-foreground italic mt-1">
            Awaiting previous tier approval
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Workflow Status Badge - Overall status of the approval process
 */
function WorkflowStatusBadge({ status }: { status: string }) {
  const config = {
    pending: { variant: "secondary" as const, label: "Awaiting Review", class: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    approved: { variant: "default" as const, label: "Approved", class: "bg-green-100 text-green-800 border-green-200" },
    rejected: { variant: "destructive" as const, label: "Rejected", class: "bg-red-100 text-red-800 border-red-200" },
    draft: { variant: "outline" as const, label: "Draft", class: "" },
    submitted: { variant: "secondary" as const, label: "Submitted", class: "bg-blue-100 text-blue-800 border-blue-200" },
  }[status] || { variant: "outline" as const, label: status, class: "" };

  return (
    <Badge variant={config.variant} className={config.class}>
      {config.label}
    </Badge>
  );
}

/**
 * Helper: Get status icon and styling configuration
 */
function getStatusConfig(status: ReviewRecord["status"]) {
  switch (status) {
    case "Approved":
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        containerClass: "bg-green-50 border-green-600 ring-green-200",
        badgeClass: "bg-green-50 text-green-700 border-green-200",
      };
    case "Rejected":
      return {
        icon: <XCircle className="h-4 w-4 text-red-600" />,
        containerClass: "bg-red-50 border-red-600 ring-red-200",
        badgeClass: "bg-red-50 text-red-700 border-red-200",
      };
    case "Pending":
      return {
        icon: <Clock className="h-4 w-4 text-yellow-600" />,
        containerClass: "bg-yellow-50 border-yellow-600 ring-yellow-200",
        badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    case "Waiting":
      return {
        icon: <User className="h-4 w-4 text-gray-400" />,
        containerClass: "bg-gray-50 border-gray-300",
        badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
      };
    default:
      return {
        icon: <AlertCircle className="h-4 w-4 text-gray-400" />,
        containerClass: "bg-gray-50 border-gray-300",
        badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
      };
  }
}

/**
 * Helper: Derive review records from change order data (for MVP single-tier)
 */
function deriveReviewsFromChangeOrder(
  changeOrder: ApprovalWorkflowProps["changeOrder"]
): ReviewRecord[] {
  if (!changeOrder.designated_reviewer_id) {
    return [];
  }

  const status = getReviewStatus(changeOrder.status);

  return [
    {
      id: "single-tier-review",
      reviewer_id: changeOrder.designated_reviewer_id,
      status,
      date: changeOrder.approved_at || undefined,
      notes: changeOrder.rejection_reason || undefined,
    },
  ];
}

/**
 * Helper: Map change order status to review status
 */
function getReviewStatus(
  coStatus: string
): ReviewRecord["status"] {
  switch (coStatus.toLowerCase()) {
    case "approved":
    case "executed":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
    case "submitted":
      return "Pending";
    case "draft":
      return "Waiting";
    default:
      return "Waiting";
  }
}

/**
 * Helper: Get overall workflow status
 */
function getWorkflowStatus(coStatus: string): string {
  return coStatus.toLowerCase();
}

/**
 * Helper: Format date string
 */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
