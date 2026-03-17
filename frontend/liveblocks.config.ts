// Liveblocks configuration for Alleato PM
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
//
// IMPORTANT: ActivitiesData values must be flat primitive types only
// (string | number | boolean). No nested objects, no arrays, no optionals.

// ── Custom notification data types ──────────────────────────────────────────

/** A critical issue that needs immediate attention */
export type CriticalIssueData = {
  title: string;
  message: string;
  severity: string; // "critical" | "high" | "medium"
  entityType: string;
  entityId: string;
  projectName: string;
  url: string;
};

/** A deadline is approaching or has passed */
export type DeadlineData = {
  title: string;
  entityType: string;
  entityId: string;
  dueDate: string;
  daysRemaining: number;
  projectName: string;
  url: string;
};

/** A status change on a tracked item */
export type StatusChangeData = {
  title: string;
  entityType: string;
  entityId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  projectName: string;
  url: string;
};

/** A budget or cost alert */
export type BudgetAlertData = {
  title: string;
  alertType: string; // "over_budget" | "approaching_limit" | "variance" | "cost_change"
  amount: number;
  percentage: number;
  projectName: string;
  url: string;
};

/** Weekly digest / summary notification (flattened stats) */
export type WeeklyDigestData = {
  title: string;
  summary: string;
  newIssues: number;
  resolvedIssues: number;
  pendingApprovals: number;
  upcomingDeadlines: number;
  projectName: string;
  url: string;
};

/** Someone was assigned to or mentioned in an item */
export type AssignmentData = {
  title: string;
  entityType: string;
  entityId: string;
  assignedBy: string;
  projectName: string;
  url: string;
};

/** A document or item requires approval */
export type ApprovalRequestData = {
  title: string;
  entityType: string;
  entityId: string;
  requestedBy: string;
  projectName: string;
  url: string;
};

/** Ball in Court shift notification for RFIs */
export type BallInCourtData = {
  title: string;
  rfiNumber: number;
  rfiSubject: string;
  previousHolder: string;
  newHolder: string;
  projectName: string;
  url: string;
};

// ── Global Liveblocks type declarations ─────────────────────────────────────

import type { JsonObject, LiveList, LiveObject } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      selectedCell?: string | null;
    };

    Storage: {
      // Issue tracker storage
      meta: LiveObject<{ title: string }>;
      properties: LiveObject<{
        progress: "none" | "todo" | "progress" | "review" | "done";
        priority: "none" | "low" | "medium" | "high" | "urgent";
        assignedTo: string;
      }>;
      labels: LiveList<string>;
      links: LiveList<string>;
      // Spreadsheet storage
      spreadsheet?: LiveObject<Record<string, JsonObject>>;
    };

    UserMeta: {
      id: string;
      info: {
        name?: string;
        avatar?: string;
        color?: string;
      };
    };

    RoomEvent: Record<string, never>;

    ThreadMetadata: {
      resolved?: boolean;
      rowId?: string;
      columnId?: string;
    };

    RoomInfo: {
      title: string;
      url: string;
    };

    // Custom notification kinds with $ prefix
    ActivitiesData: {
      $criticalIssue: CriticalIssueData;
      $deadline: DeadlineData;
      $statusChange: StatusChangeData;
      $budgetAlert: BudgetAlertData;
      $weeklyDigest: WeeklyDigestData;
      $assignment: AssignmentData;
      $approvalRequest: ApprovalRequestData;
      $ballInCourt: BallInCourtData;
    };
  }
}

export {};
