import { nanoid } from "nanoid";

import { sendProactiveTeamsDM } from "@/lib/bot/teams-proactive";
import { createServiceClient } from "@/lib/supabase/service";

type UserTarget = string | string[];

type BasePayload = {
  projectId?: number;
  entityType?: string;
  entityId?: string;
};

export type CriticalIssueData = BasePayload & {
  severity?: string;
  summary?: string;
};

export type DeadlineData = BasePayload & {
  dueDate?: string;
  title?: string;
};

export type StatusChangeData = BasePayload & {
  from?: string;
  to?: string;
};

export type BudgetAlertData = BasePayload & {
  alertType?: string;
  amount?: number;
};

export type WeeklyDigestData = BasePayload & {
  totalOpenItems?: number;
};

export type AssignmentData = BasePayload & {
  assignee?: string;
};

export type ApprovalRequestData = BasePayload & {
  requester?: string;
};

export type BallInCourtData = BasePayload & {
  rfiNumber?: string;
};

export type NotificationKind =
  | "$criticalIssue"
  | "$deadline"
  | "$statusChange"
  | "$budgetAlert"
  | "$weeklyDigest"
  | "$assignment"
  | "$approvalRequest"
  | "$ballInCourt";

type AnyActivityData =
  | CriticalIssueData
  | DeadlineData
  | StatusChangeData
  | BudgetAlertData
  | WeeklyDigestData
  | AssignmentData
  | ApprovalRequestData
  | BallInCourtData;

function toArray(target: UserTarget): string[] {
  return Array.isArray(target) ? target : [target];
}

function describeKind(kind: NotificationKind): { title: string; body: string } {
  switch (kind) {
    case "$criticalIssue":
      return { title: "Critical issue", body: "A critical issue needs attention." };
    case "$deadline":
      return { title: "Deadline approaching", body: "A tracked item is due soon." };
    case "$statusChange":
      return { title: "Status changed", body: "A tracked record changed status." };
    case "$budgetAlert":
      return { title: "Budget alert", body: "A budget threshold was triggered." };
    case "$weeklyDigest":
      return { title: "Weekly digest", body: "Your weekly project summary is ready." };
    case "$assignment":
      return { title: "Assignment", body: "You were assigned to a record." };
    case "$approvalRequest":
      return { title: "Approval requested", body: "A record requires your approval." };
    case "$ballInCourt":
      return { title: "Ball in court", body: "Ownership has shifted to your queue." };
    default:
      return { title: "Notification", body: "You have a new update." };
  }
}

async function notifyUsers(
  userId: UserTarget,
  kind: NotificationKind,
  data: AnyActivityData,
) {
  const serviceClient = createServiceClient();
  const users = toArray(userId);
  const descriptor = describeKind(kind);

  const { error } = await serviceClient.from("collaboration_notifications").insert(
    users.map((uid) => ({
      user_id: uid,
      project_id: data.projectId ?? null,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      kind,
      title: descriptor.title,
      body: descriptor.body,
      metadata: {
        ...data,
        eventKey: nanoid(),
      },
    })),
  );

  if (error) {
    throw new Error(`Failed to create notifications (${kind}): ${error.message}`);
  }

  // 2. Teams DM fan-out (fire-and-forget — never blocks the main notification path)
  for (const uid of users) {
    sendProactiveTeamsDM(uid, `**${descriptor.title}**\n${descriptor.body}`)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[notificationService] teams DM failed", { userId: uid, kind, error: msg });
      });
  }
}

export async function notifyCriticalIssue(userId: UserTarget, data: CriticalIssueData) {
  await notifyUsers(userId, "$criticalIssue", data);
}

export async function notifyDeadline(userId: UserTarget, data: DeadlineData) {
  await notifyUsers(userId, "$deadline", data);
}

export async function notifyStatusChange(userId: UserTarget, data: StatusChangeData) {
  await notifyUsers(userId, "$statusChange", data);
}

export async function notifyBudgetAlert(userId: UserTarget, data: BudgetAlertData) {
  await notifyUsers(userId, "$budgetAlert", data);
}

export async function notifyWeeklyDigest(userId: UserTarget, data: WeeklyDigestData) {
  await notifyUsers(userId, "$weeklyDigest", data);
}

export async function notifyAssignment(userId: UserTarget, data: AssignmentData) {
  await notifyUsers(userId, "$assignment", data);
}

export async function notifyApprovalRequest(userId: UserTarget, data: ApprovalRequestData) {
  await notifyUsers(userId, "$approvalRequest", data);
}

export async function notifyBallInCourt(userId: UserTarget, data: BallInCourtData) {
  await notifyUsers(userId, "$ballInCourt", data);
}

export async function notifyProjectTeam(
  memberUserIds: string[],
  kind: NotificationKind,
  data: AnyActivityData,
) {
  await notifyUsers(memberUserIds, kind, data);
}
