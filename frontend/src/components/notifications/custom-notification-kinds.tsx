"use client";

import {
  InboxNotification,
  InboxNotificationCustomKindProps,
} from "@liveblocks/react-ui";
import {
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  DollarSign,
  BarChart3,
  UserPlus,
  CheckCircle2,
  Users,
} from "lucide-react";
import type {
  CriticalIssueData,
  DeadlineData,
  StatusChangeData,
  BudgetAlertData,
  WeeklyDigestData,
  AssignmentData,
  ApprovalRequestData,
  BallInCourtData,
} from "../../../liveblocks.config";

// ── Critical Issue ──────────────────────────────────────────────────────────

export function CriticalIssueNotification(
  props: InboxNotificationCustomKindProps<"$criticalIssue">
) {
  const { title, message, severity, entityType, projectName } =
    props.inboxNotification.activities[0]
      .data as unknown as CriticalIssueData;

  const severityColors: Record<string, string> = {
    critical: "text-red-600",
    high: "text-orange-600",
    medium: "text-yellow-600",
  };

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle
            className={`h-4 w-4 ${severityColors[severity] ?? "text-red-600"}`}
          />
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
        {projectName && <span>{projectName}</span>}
        {entityType && (
          <>
            <span>·</span>
            <span className="capitalize">{entityType}</span>
          </>
        )}
      </div>
    </InboxNotification.Custom>
  );
}

// ── Deadline ────────────────────────────────────────────────────────────────

export function DeadlineNotification(
  props: InboxNotificationCustomKindProps<"$deadline">
) {
  const { title, daysRemaining, entityType, projectName, dueDate } =
    props.inboxNotification.activities[0]
      .data as unknown as DeadlineData;

  const isOverdue = daysRemaining < 0;
  const urgencyColor = isOverdue
    ? "text-red-600 bg-red-100"
    : daysRemaining <= 3
      ? "text-orange-600 bg-orange-100"
      : "text-yellow-600 bg-yellow-100";

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${urgencyColor.split(" ")[1]}`}
        >
          <Clock className={`h-4 w-4 ${urgencyColor.split(" ")[0]}`} />
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        {isOverdue
          ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? "s" : ""}`
          : `Due in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`}{" "}
        — {new Date(dueDate).toLocaleDateString()}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
        {projectName && <span>{projectName}</span>}
        {entityType && (
          <>
            <span>·</span>
            <span className="capitalize">{entityType}</span>
          </>
        )}
      </div>
    </InboxNotification.Custom>
  );
}

// ── Status Change ───────────────────────────────────────────────────────────

export function StatusChangeNotification(
  props: InboxNotificationCustomKindProps<"$statusChange">
) {
  const { title, oldStatus, newStatus, changedBy, entityType, projectName } =
    props.inboxNotification.activities[0]
      .data as unknown as StatusChangeData;

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
          <ArrowRightLeft className="h-4 w-4 text-blue-600" />
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        <span className="line-through opacity-60">{oldStatus}</span>
        <span className="mx-1">→</span>
        <span className="font-medium text-foreground">{newStatus}</span>
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
        {changedBy && <span>by {changedBy}</span>}
        {projectName && (
          <>
            <span>·</span>
            <span>{projectName}</span>
          </>
        )}
        {entityType && (
          <>
            <span>·</span>
            <span className="capitalize">{entityType}</span>
          </>
        )}
      </div>
    </InboxNotification.Custom>
  );
}

// ── Budget Alert ────────────────────────────────────────────────────────────

export function BudgetAlertNotification(
  props: InboxNotificationCustomKindProps<"$budgetAlert">
) {
  const { title, alertType, amount, percentage, projectName } =
    props.inboxNotification.activities[0]
      .data as unknown as BudgetAlertData;

  const alertLabels: Record<string, string> = {
    over_budget: "Over Budget",
    approaching_limit: "Approaching Limit",
    variance: "Budget Variance",
    cost_change: "Cost Change",
  };

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
          <DollarSign className="h-4 w-4 text-amber-600" />
        </div>
      }
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
          {alertLabels[alertType] ?? alertType}
        </span>
        {amount !== undefined && (
          <span>${amount.toLocaleString()}</span>
        )}
        {percentage !== undefined && <span>{percentage}%</span>}
      </div>
      {projectName && (
        <div className="mt-1 text-xs text-muted-foreground/70">
          {projectName}
        </div>
      )}
    </InboxNotification.Custom>
  );
}

// ── Weekly Digest ───────────────────────────────────────────────────────────

export function WeeklyDigestNotification(
  props: InboxNotificationCustomKindProps<"$weeklyDigest">
) {
  const {
    title,
    summary,
    newIssues,
    resolvedIssues,
    pendingApprovals,
    upcomingDeadlines,
    projectName,
  } = props.inboxNotification.activities[0]
    .data as unknown as WeeklyDigestData;

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
          <BarChart3 className="h-4 w-4 text-indigo-600" />
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">{summary}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {newIssues > 0 && (
          <span className="text-muted-foreground">
            {newIssues} new issues
          </span>
        )}
        {resolvedIssues > 0 && (
          <span className="text-muted-foreground">
            {resolvedIssues} resolved
          </span>
        )}
        {pendingApprovals > 0 && (
          <span className="text-muted-foreground">
            {pendingApprovals} pending approvals
          </span>
        )}
        {upcomingDeadlines > 0 && (
          <span className="text-muted-foreground">
            {upcomingDeadlines} upcoming deadlines
          </span>
        )}
      </div>
      {projectName && (
        <div className="mt-1 text-xs text-muted-foreground/70">
          {projectName}
        </div>
      )}
    </InboxNotification.Custom>
  );
}

// ── Assignment ──────────────────────────────────────────────────────────────

export function AssignmentNotification(
  props: InboxNotificationCustomKindProps<"$assignment">
) {
  const { title, entityType, assignedBy, projectName } =
    props.inboxNotification.activities[0]
      .data as unknown as AssignmentData;

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
          <UserPlus className="h-4 w-4 text-green-600" />
        </div>
      }
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {assignedBy && <span>Assigned by {assignedBy}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
        {projectName && <span>{projectName}</span>}
        {entityType && (
          <>
            <span>·</span>
            <span className="capitalize">{entityType}</span>
          </>
        )}
      </div>
    </InboxNotification.Custom>
  );
}

// ── Approval Request ────────────────────────────────────────────────────────

export function ApprovalRequestNotification(
  props: InboxNotificationCustomKindProps<"$approvalRequest">
) {
  const { title, entityType, requestedBy, projectName } =
    props.inboxNotification.activities[0]
      .data as unknown as ApprovalRequestData;

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
          <CheckCircle2 className="h-4 w-4 text-purple-600" />
        </div>
      }
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {requestedBy && <span>Requested by {requestedBy}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
        {projectName && <span>{projectName}</span>}
        {entityType && (
          <>
            <span>·</span>
            <span className="capitalize">{entityType}</span>
          </>
        )}
      </div>
    </InboxNotification.Custom>
  );
}

// ── Ball in Court ──────────────────────────────────────────────────────────

export function BallInCourtNotification(
  props: InboxNotificationCustomKindProps<"$ballInCourt">
) {
  const { title, rfiNumber, rfiSubject, previousHolder, newHolder, projectName } =
    props.inboxNotification.activities[0]
      .data as unknown as BallInCourtData;

  return (
    <InboxNotification.Custom
      {...props}
      title={title}
      aside={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
          <Users className="h-4 w-4 text-blue-600" />
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        RFI #{rfiNumber}: {rfiSubject}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
        <span>{previousHolder} → {newHolder}</span>
        {projectName && (
          <>
            <span>·</span>
            <span>{projectName}</span>
          </>
        )}
      </div>
    </InboxNotification.Custom>
  );
}

// ── Export kinds map for InboxNotification component ─────────────────────────

export const customNotificationKinds = {
  $criticalIssue: CriticalIssueNotification,
  $deadline: DeadlineNotification,
  $statusChange: StatusChangeNotification,
  $budgetAlert: BudgetAlertNotification,
  $weeklyDigest: WeeklyDigestNotification,
  $assignment: AssignmentNotification,
  $approvalRequest: ApprovalRequestNotification,
  $ballInCourt: BallInCourtNotification,
};
