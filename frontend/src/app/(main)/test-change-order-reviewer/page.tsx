"use client";

import { ChangeOrderReviewerResponse } from "@/components/domain/change-orders/ChangeOrderReviewerResponse";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function TestChangeOrderReviewerPage() {
  const [scenario, setScenario] = useState<"reviewer" | "not-reviewer" | "completed">("reviewer");

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Change Order Reviewer Response - Test Page</h1>
        <p className="text-muted-foreground">
          Test the ChangeOrderReviewerResponse component with different scenarios.
        </p>
      </div>

      {/* Scenario Selector */}
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Select Test Scenario:</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setScenario("reviewer")}
            className={`px-4 py-2 rounded-md ${
              scenario === "reviewer"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Reviewer (Can Approve/Reject)
          </button>
          <button
            onClick={() => setScenario("not-reviewer")}
            className={`px-4 py-2 rounded-md ${
              scenario === "not-reviewer"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Not Reviewer (View Only)
          </button>
          <button
            onClick={() => setScenario("completed")}
            className={`px-4 py-2 rounded-md ${
              scenario === "completed"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Completed Status (No Action)
          </button>
        </div>
      </Card>

      {/* Test Component */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Component Preview:</h2>

        {scenario === "reviewer" && (
          <ChangeOrderReviewerResponse
            changeOrderId="test-123"
            contractId="contract-abc"
            projectId={1}
            currentStatus="pending"
            currentUserIsReviewer={true}
            reviewerName="John Smith"
            reviewerEmail="john.smith@example.com"
            onApprovalSuccess={() => {
              // Test callback - no actual API call
              alert("Approval success! (This is a test - no actual API call was made)");
            }}
            onRejectionSuccess={() => {
              // Test callback - no actual API call
              alert("Rejection success! (This is a test - no actual API call was made)");
            }}
          />
        )}

        {scenario === "not-reviewer" && (
          <ChangeOrderReviewerResponse
            changeOrderId="test-123"
            contractId="contract-abc"
            projectId={1}
            currentStatus="pending"
            currentUserIsReviewer={false}
            reviewerName="Jane Doe"
            reviewerEmail="jane.doe@example.com"
          />
        )}

        {scenario === "completed" && (
          <ChangeOrderReviewerResponse
            changeOrderId="test-123"
            contractId="contract-abc"
            projectId={1}
            currentStatus="approved"
            currentUserIsReviewer={true}
            reviewerName="John Smith"
            reviewerEmail="john.smith@example.com"
          />
        )}
      </div>

      {/* Instructions */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Reviewer Scenario:</strong> Shows Approve/Reject buttons. Click to open dialogs with form validation.</li>
          <li><strong>Not Reviewer Scenario:</strong> Shows info card indicating who the reviewer is.</li>
          <li><strong>Completed Status:</strong> Shows info card that no action can be taken.</li>
          <li>The Reject dialog requires a rejection reason (enforces schema constraint).</li>
          <li>The Approve dialog has optional fields for notes and schedule impact.</li>
        </ul>
      </Card>

      {/* Component Props Reference */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Component Props:</h3>
        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`interface ChangeOrderReviewerResponseProps {
  changeOrderId: string;
  contractId: string;
  projectId: number;
  currentStatus: string;
  currentUserIsReviewer: boolean;
  reviewerName?: string;
  reviewerEmail?: string;
  onApprovalSuccess?: () => void;
  onRejectionSuccess?: () => void;
}`}
        </pre>
      </Card>
    </div>
  );
}
