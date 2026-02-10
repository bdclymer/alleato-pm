"use client";

import { useState } from "react";
import { ApprovalWorkflow } from "@/components/domain/change-orders/ApprovalWorkflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";

/**
 * Test page for ApprovalWorkflow component
 * Tests different scenarios: pending, approved, rejected, multi-reviewer
 */
export default function TestApprovalWorkflowPage() {
  const [scenario, setScenario] = useState<"pending" | "approved" | "rejected" | "multi">(
    "pending"
  );

  const mockChangeOrders = {
    pending: {
      id: "co-123",
      status: "pending",
      contract_id: "contract-abc",
      project_id: 1,
      designated_reviewer_id: "user-456",
      submitted_at: new Date().toISOString(),
    },
    approved: {
      id: "co-124",
      status: "approved",
      contract_id: "contract-abc",
      project_id: 1,
      designated_reviewer_id: "user-456",
      submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: "John Smith",
    },
    rejected: {
      id: "co-125",
      status: "rejected",
      contract_id: "contract-abc",
      project_id: 1,
      designated_reviewer_id: "user-456",
      submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      rejection_reason: "Budget constraints - exceeds approved amount by $25,000",
    },
    multi: {
      id: "co-126",
      status: "pending",
      contract_id: "contract-abc",
      project_id: 1,
      designated_reviewer_id: "user-456",
      submitted_at: new Date().toISOString(),
    },
  };

  const mockReviews = {
    pending: [],
    approved: [
      {
        id: "review-1",
        reviewer_id: "user-456",
        reviewer_name: "John Smith",
        reviewer_email: "john.smith@company.com",
        status: "Approved" as const,
        date: new Date().toISOString(),
        notes: "Approved. Budget allocated from contingency fund.",
      },
    ],
    rejected: [
      {
        id: "review-2",
        reviewer_id: "user-456",
        reviewer_name: "Sarah Director",
        reviewer_email: "sarah.director@company.com",
        status: "Rejected" as const,
        date: new Date().toISOString(),
        notes: "Budget constraints - exceeds approved amount by $25,000",
      },
    ],
    multi: [
      {
        id: "review-3a",
        reviewer_id: "user-456",
        reviewer_name: "Sarah Director",
        reviewer_email: "sarah.director@company.com",
        status: "Approved" as const,
        date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        notes: "Approved for PM review",
        tier: 1,
      },
      {
        id: "review-3b",
        reviewer_id: "user-789",
        reviewer_name: "Mike Owner",
        reviewer_email: "mike.owner@ownerco.com",
        status: "Pending" as const,
        tier: 2,
      },
    ],
  };

  const currentScenario = mockChangeOrders[scenario];
  const currentReviews = mockReviews[scenario];
  const currentUserCanApprove = scenario === "pending" || scenario === "multi";

  return (
    <div className="min-h-screen bg-background">
      <PageContainer>
        <div className="space-y-6 py-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Approval Workflow Component - Test Page
            </h1>
            <p className="text-muted-foreground mt-2">
              Test the ApprovalWorkflow component with different scenarios.
            </p>
          </div>

          {/* Scenario Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Test Scenario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={scenario === "pending" ? "default" : "outline"}
                  onClick={() => setScenario("pending")}
                >
                  Pending Review (User Can Approve)
                </Button>
                <Button
                  variant={scenario === "approved" ? "default" : "outline"}
                  onClick={() => setScenario("approved")}
                >
                  Approved Status
                </Button>
                <Button
                  variant={scenario === "rejected" ? "default" : "outline"}
                  onClick={() => setScenario("rejected")}
                >
                  Rejected Status
                </Button>
                <Button
                  variant={scenario === "multi" ? "default" : "outline"}
                  onClick={() => setScenario("multi")}
                >
                  Multi-Tier Approval
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Component Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Component Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalWorkflow
                changeOrder={currentScenario}
                reviews={currentReviews}
                currentUserCanApprove={currentUserCanApprove}
                reviewerName={currentUserCanApprove ? "Current User" : undefined}
                reviewerEmail={currentUserCanApprove ? "current.user@company.com" : undefined}
                onApprovalSuccess={() => {
                  alert("Approval successful! (mock callback)");
                }}
                onRejectionSuccess={() => {
                  alert("Rejection successful! (mock callback)");
                }}
              />
            </CardContent>
          </Card>

          {/* Test Instructions */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                Test Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <div>
                <strong>Pending Scenario:</strong> Shows Approve/Reject buttons. Click to open
                dialogs with form validation.
              </div>
              <div>
                <strong>Approved Scenario:</strong> Shows completed approval with review history.
              </div>
              <div>
                <strong>Rejected Scenario:</strong> Shows rejected status with rejection reason in
                history.
              </div>
              <div>
                <strong>Multi-Tier Scenario:</strong> Demonstrates multi-tier approval (Tier 1
                approved, Tier 2 pending).
              </div>
              <div className="pt-2 border-t border-blue-200 dark:border-blue-800 mt-4">
                <strong>Note:</strong> The Approve/Reject dialogs will show but not actually submit
                since this is a test page. Check browser console for callback logs.
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
