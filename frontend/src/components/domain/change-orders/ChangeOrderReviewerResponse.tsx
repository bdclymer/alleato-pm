"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ChangeOrderReviewerResponseProps {
  changeOrderId: string;
  contractId: string;
  projectId: number;
  currentStatus: string;
  currentUserIsReviewer: boolean;
  reviewerName?: string;
  reviewerEmail?: string;
  onApprovalSuccess?: () => void;
  onRejectionSuccess?: () => void;
}

/**
 * ChangeOrderReviewerResponse - Component for reviewer to approve or reject change orders
 *
 * Features:
 * - Shows Approve (green) and Reject (red) buttons when user is designated reviewer
 * - Approve action with optional notes and schedule impact
 * - Reject action requires rejection_reason (schema constraint)
 * - Disabled when status is not 'pending' or 'submitted'
 * - Uses unified modal pattern for dialogs
 *
 * @example
 * ```tsx
 * <ChangeOrderReviewerResponse
 *   changeOrderId="123"
 *   contractId="abc-def"
 *   projectId={1}
 *   currentStatus="pending"
 *   currentUserIsReviewer={true}
 *   onApprovalSuccess={() => router.refresh()}
 * />
 * ```
 */
export function ChangeOrderReviewerResponse({
  changeOrderId,
  contractId,
  projectId,
  currentStatus,
  currentUserIsReviewer,
  reviewerName,
  reviewerEmail,
  onApprovalSuccess,
  onRejectionSuccess,
}: ChangeOrderReviewerResponseProps) {
  const router = useRouter();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approve form state
  const [approvalNotes, setApprovalNotes] = useState("");
  const [scheduleImpact, setScheduleImpact] = useState("");

  // Reject form state (rejection_reason is REQUIRED)
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionComments, setRejectionComments] = useState("");

  // Determine if actions should be enabled
  const canTakeAction =
    currentUserIsReviewer &&
    (currentStatus === "pending" || currentStatus === "submitted");

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approvalNotes: approvalNotes || undefined,
            scheduleImpact: scheduleImpact || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve change order");
      }

      toast.success("Change order approved successfully", {
        description: "The change order has been approved and the contract value has been updated.",
      });

      setShowApproveDialog(false);

      // Call success callback or refresh
      if (onApprovalSuccess) {
        onApprovalSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Approve error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to approve change order"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    // Validate rejection_reason is provided
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required", {
        description: "Please provide a reason for rejecting this change order.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/${changeOrderId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rejection_reason: rejectionReason,
            rejectionComments: rejectionComments || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject change order");
      }

      toast.success("Change order rejected", {
        description: "The change order has been rejected and the submitter will be notified.",
      });

      setShowRejectDialog(false);

      // Call success callback or refresh
      if (onRejectionSuccess) {
        onRejectionSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Reject error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reject change order"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is not the reviewer, show info card
  if (!currentUserIsReviewer) {
    return (
      <Card className="p-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Pending Reviewer Action
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {reviewerName || reviewerEmail
                ? `This change order is awaiting review by ${reviewerName || reviewerEmail}.`
                : "This change order is awaiting review by the designated reviewer."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // If status doesn't allow actions, show info
  if (!canTakeAction) {
    return (
      <Card className="p-4 border-gray-200">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              No Action Required
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              This change order has a status of &quot;{currentStatus}&quot; and cannot be approved or rejected at this time.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Action Buttons */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Reviewer Action Required
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You are the designated reviewer for this change order. Please approve or reject.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => setShowApproveDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      </Card>

      {/* Approve Dialog */}
      <Modal open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Approve Change Order</ModalTitle>
            <ModalDescription>
              Confirm that you want to approve this change order. This will update the contract&apos;s revised value and notify the submitter.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {/* Approval Notes (optional) */}
            <div className="space-y-2">
              <Label htmlFor="approval-notes">
                Approval Notes <span className="text-gray-500 text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="approval-notes"
                placeholder="Add any notes or conditions related to this approval..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Schedule Impact (optional) */}
            <div className="space-y-2">
              <Label htmlFor="schedule-impact">
                Schedule Impact <span className="text-gray-500 text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="schedule-impact"
                placeholder="Describe any impact on the project schedule..."
                value={scheduleImpact}
                onChange={(e) => setScheduleImpact(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Confirmation note */}
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Approving this change order will update the contract&apos;s revised value and mark the change order as approved.
                </p>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4" />
              {isSubmitting ? "Approving..." : "Approve Change Order"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reject Dialog */}
      <Modal open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Reject Change Order</ModalTitle>
            <ModalDescription>
              Provide a reason for rejecting this change order. The submitter will be notified of your decision.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {/* Rejection Reason (REQUIRED) */}
            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="flex items-center gap-1">
                Rejection Reason <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Provide a clear reason for rejection (required)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="resize-none"
                required
              />
              <p className="text-xs text-gray-500">
                This field is required. The reason will be visible to the change order submitter.
              </p>
            </div>

            {/* Additional Comments (optional) */}
            <div className="space-y-2">
              <Label htmlFor="rejection-comments">
                Additional Comments <span className="text-gray-500 text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="rejection-comments"
                placeholder="Add any additional context or suggestions..."
                value={rejectionComments}
                onChange={(e) => setRejectionComments(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Warning note */}
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  Rejecting this change order will mark it as rejected and notify the submitter. They may revise and resubmit if needed.
                </p>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
              variant="destructive"
            >
              <XCircle className="h-4 w-4" />
              {isSubmitting ? "Rejecting..." : "Reject Change Order"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
