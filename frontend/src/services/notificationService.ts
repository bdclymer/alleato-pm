import { Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";
import type {
  CriticalIssueData,
  DeadlineData,
  StatusChangeData,
  BudgetAlertData,
  WeeklyDigestData,
  AssignmentData,
  ApprovalRequestData,
} from "../../liveblocks.config";

// ── Liveblocks server client ────────────────────────────────────────────────

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// ── Helper to send to one or many users ─────────────────────────────────────

type UserTarget = string | string[];

function toArray(target: UserTarget): string[] {
  return Array.isArray(target) ? target : [target];
}

// ── Critical Issue ──────────────────────────────────────────────────────────

export async function notifyCriticalIssue(
  userId: UserTarget,
  data: CriticalIssueData
) {
  const users = toArray(userId);
  await Promise.all(
    users.map((uid) =>
      liveblocks.triggerInboxNotification({
        userId: uid,
        kind: "$criticalIssue",
        subjectId: data.entityId ?? nanoid(),
        activityData: data,
      })
    )
  );
}

// ── Deadline Approaching ────────────────────────────────────────────────────

export async function notifyDeadline(
  userId: UserTarget,
  data: DeadlineData
) {
  const users = toArray(userId);
  await Promise.all(
    users.map((uid) =>
      liveblocks.triggerInboxNotification({
        userId: uid,
        kind: "$deadline",
        subjectId: `deadline-${data.entityType}-${data.entityId ?? nanoid()}`,
        activityData: data,
      })
    )
  );
}

// ── Status Change ───────────────────────────────────────────────────────────

export async function notifyStatusChange(
  userId: UserTarget,
  data: StatusChangeData
) {
  const users = toArray(userId);
  await Promise.all(
    users.map((uid) =>
      liveblocks.triggerInboxNotification({
        userId: uid,
        kind: "$statusChange",
        subjectId: `status-${data.entityType}-${data.entityId ?? nanoid()}`,
        activityData: data,
      })
    )
  );
}

// ── Budget Alert ────────────────────────────────────────────────────────────

export async function notifyBudgetAlert(
  userId: UserTarget,
  data: BudgetAlertData
) {
  const users = toArray(userId);
  await Promise.all(
    users.map((uid) =>
      liveblocks.triggerInboxNotification({
        userId: uid,
        kind: "$budgetAlert",
        subjectId: `budget-${data.alertType}-${nanoid()}`,
        activityData: data,
      })
    )
  );
}

// ── Weekly Digest ───────────────────────────────────────────────────────────

export async function notifyWeeklyDigest(
  userId: UserTarget,
  data: WeeklyDigestData
) {
  const users = toArray(userId);
  await Promise.all(
    users.map((uid) =>
      liveblocks.triggerInboxNotification({
        userId: uid,
        kind: "$weeklyDigest",
        subjectId: `digest-${nanoid()}`,
        activityData: data,
      })
    )
  );
}

// ── Assignment ──────────────────────────────────────────────────────────────

export async function notifyAssignment(
  userId: UserTarget,
  data: AssignmentData
) {
  const users = toArray(userId);
  await Promise.all(
    users.map((uid) =>
      liveblocks.triggerInboxNotification({
        userId: uid,
        kind: "$assignment",
        subjectId: `assign-${data.entityType}-${data.entityId ?? nanoid()}`,
        activityData: data,
      })
    )
  );
}

// ── Approval Request ────────────────────────────────────────────────────────

export async function notifyApprovalRequest(
  userId: UserTarget,
  data: ApprovalRequestData
) {
  const users = toArray(userId);
  await Promise.all(
    users.map((uid) =>
      liveblocks.triggerInboxNotification({
        userId: uid,
        kind: "$approvalRequest",
        subjectId: `approval-${data.entityType}-${data.entityId ?? nanoid()}`,
        activityData: data,
      })
    )
  );
}

// ── Convenience: Notify all project members ─────────────────────────────────

/** Valid custom notification kind names */
type NotificationKind =
  | "$criticalIssue"
  | "$deadline"
  | "$statusChange"
  | "$budgetAlert"
  | "$weeklyDigest"
  | "$assignment"
  | "$approvalRequest";

/** Activity data union for all custom kinds */
type AnyActivityData =
  | CriticalIssueData
  | DeadlineData
  | StatusChangeData
  | BudgetAlertData
  | WeeklyDigestData
  | AssignmentData
  | ApprovalRequestData;

/**
 * Send a notification to all members of a project.
 * Caller is responsible for ensuring data matches the kind.
 */
export async function notifyProjectTeam(
  memberUserIds: string[],
  kind: NotificationKind,
  data: AnyActivityData
) {
  await Promise.all(
    memberUserIds.map((uid) =>
      liveblocks.triggerInboxNotification({
        userId: uid,
        kind,
        subjectId: nanoid(),
        activityData: data,
      })
    )
  );
}

// ── Re-export the Liveblocks client for advanced use ────────────────────────

export { liveblocks };
