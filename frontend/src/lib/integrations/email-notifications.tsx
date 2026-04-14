/**
 * Liveblocks email notification sender.
 *
 * Called from the webhook handler when a `notification` event fires on the
 * `email` channel.  Uses `@liveblocks/emails` to extract unread comment
 * content and `resend` to deliver the formatted email.
 */

import * as React from "react";
import {
  prepareThreadNotificationEmailAsReact,
  prepareTextMentionNotificationEmailAsReact,
} from "@liveblocks/emails";
import type {
  ThreadNotificationEvent,
  TextMentionNotificationEvent,
  CustomNotificationEvent,
  Liveblocks,
} from "@liveblocks/node";
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
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";

// ── Constants ─────────────────────────────────────────────────────────────────

const FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS ?? "Alleato <notifications@alleato.app>";

const APP_BASE_URL =
  process.env.LIVEBLOCKS_NOTIFICATION_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://app.alleato.com";

const COLORS = {
  pageBackground: "hsl(var(--muted-subtle))",
  surface: "hsl(var(--background))",
  surfaceAlt: "hsl(var(--surface-alt))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  mutedForeground: "hsl(var(--muted-foreground))",
  mutedForegroundSoft: "hsl(var(--muted-foreground) / 0.7)",
  primary: "hsl(var(--primary))",
  primaryForeground: "hsl(var(--primary-foreground))",
  destructive: "hsl(var(--destructive))",
  warning: "hsl(var(--status-warning))",
  success: "hsl(var(--status-success))",
  mutedSurface: "hsl(var(--muted))",
  warningSurface: "hsl(var(--status-warning) / 0.14)",
  warningForeground: "hsl(var(--status-warning))",
};

const SPACE = {
  x1: "var(--space-1)",
  x2: "var(--space-2)",
  x3: "var(--space-3)",
  x4: "var(--space-4)",
  x6: "var(--space-6)",
  x8: "var(--space-8)",
  x1Half: "calc(var(--space-1) / 2)",
  x1AndHalf: "calc(var(--space-1) + var(--space-1) / 2)",
  x2AndHalf: "calc(var(--space-2) + var(--space-1) / 2)",
  x4AndOne: "calc(var(--space-4) + var(--space-1))",
};

const RADIUS = {
  sm: "calc(var(--radius) / 2)",
  md: "var(--radius)",
  lg: "var(--radius-lg)",
};

const SHADOWS = {
  subtle: "var(--shadow-subtle)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve user profiles from Supabase for email/name display. */
async function resolveUsersFromDB(
  userIds: string[]
): Promise<Array<{ name: string; avatar?: string }>> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    return userIds.map((id) => {
      const profile = data?.find((p) => p.id === id);
      return {
        name:
          profile?.full_name?.trim() ||
          profile?.email?.split("@")[0] ||
          "A team member",
      };
    });
  } catch {
    return userIds.map(() => ({ name: "A team member" }));
  }
}

/** Resolve user's email address from Supabase. Returns null if not found. */
async function getUserEmailAddress(userId: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", userId)
      .single();
    return data?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Build a navigable app URL from a Liveblocks room ID.
 * Room IDs follow the pattern `alleato:{entityType}:{entityId}`.
 * Project-scoped rooms use `entityId = "project-{projectId}"`.
 */
function buildRoomUrl(roomId: string): string {
  const match = roomId.match(/^alleato:([^:]+):(.+)$/);
  if (!match) return APP_BASE_URL;

  const entityType = match[1];
  const entityId = match[2];

  const projectMatch = entityId.match(/^project-(\d+)$/);
  if (projectMatch) {
    return `${APP_BASE_URL}/${projectMatch[1]}/${entityType}`;
  }
  return `${APP_BASE_URL}/${entityType}/${entityId}`;
}

// ── Email template ────────────────────────────────────────────────────────────

interface EmailTemplateProps {
  subject: string;
  previewText: string;
  roomUrl: string;
  roomName: string;
  children: React.ReactNode;
}

function EmailTemplate({
  subject,
  previewText,
  roomUrl,
  roomName,
  children,
}: EmailTemplateProps) {
  return (
    <html>
      {/* This template renders email HTML, not a Next.js document head. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>{subject}</title>
        {/* Inline preview text (invisible) */}
        <style>{`
          .preview { display: none; max-height: 0; overflow: hidden; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${COLORS.pageBackground}; }
          a { color: ${COLORS.primary}; }
        `}</style>
      </head>
      <body>
        {/* Preview text */}
        <span className="preview" style={{ display: "none" }}>
          {previewText}
        </span>

        {/* Wrapper */}
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ backgroundColor: COLORS.pageBackground, padding: `${SPACE.x8} 0` }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="600"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{
                    maxWidth: 600,
                    width: "100%",
                    backgroundColor: COLORS.surface,
                    borderRadius: RADIUS.lg,
                    overflow: "hidden",
                    boxShadow: SHADOWS.subtle,
                  }}
                >
                  {/* Header */}
                  <thead>
                    <tr>
                      <td
                        style={{
                          backgroundColor: COLORS.primary,
                          padding: `${SPACE.x4AndOne} ${SPACE.x8}`,
                        }}
                      >
                        <span
                          style={{
                            color: COLORS.primaryForeground,
                            fontSize: 18,
                            fontWeight: 700,
                            letterSpacing: "-0.3px",
                          }}
                        >
                          Alleato
                        </span>
                      </td>
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody>
                    <tr>
                      <td style={{ padding: `${SPACE.x8} ${SPACE.x8} ${SPACE.x2}` }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            color: COLORS.mutedForeground,
                            fontWeight: 500,
                          }}
                        >
                          {roomName}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: `${SPACE.x1} ${SPACE.x8} ${SPACE.x6}` }}>
                        {children}
                      </td>
                    </tr>

                    {/* CTA */}
                    <tr>
                      <td style={{ padding: `0 ${SPACE.x8} ${SPACE.x8}` }}>
                        <a
                          href={roomUrl}
                          style={{
                            display: "inline-block",
                            backgroundColor: COLORS.primary,
                            color: COLORS.primaryForeground,
                            textDecoration: "none",
                            fontSize: 14,
                            fontWeight: 600,
                            padding: `${SPACE.x2AndHalf} ${SPACE.x4AndOne}`,
                            borderRadius: RADIUS.md,
                          }}
                        >
                          View in Alleato →
                        </a>
                      </td>
                    </tr>
                  </tbody>

                  {/* Footer */}
                  <tfoot>
                    <tr>
                      <td
                        style={{
                          borderTop: `1px solid ${COLORS.border}`,
                          padding: `${SPACE.x4} ${SPACE.x8}`,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: COLORS.mutedForegroundSoft,
                          }}
                        >
                          You received this because you have notifications
                          enabled in{" "}
                          <a href={APP_BASE_URL} style={{ color: COLORS.primary }}>
                            Alleato
                          </a>
                          .
                        </p>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

// ── Comment display ───────────────────────────────────────────────────────────

const commentComponents = {
  Paragraph: ({ children }: { children: React.ReactNode }) => (
    <p style={{ margin: `${SPACE.x2} 0`, fontSize: 14, color: COLORS.foreground, lineHeight: 1.6 }}>
      {children}
    </p>
  ),
  Mention: ({
    element,
    user,
  }: {
    element: { id: string };
    user?: { name?: string };
  }) => (
    <strong style={{ color: COLORS.primary }}>
      @{user?.name ?? element.id}
    </strong>
  ),
  Link: ({
    element,
    href,
  }: {
    element?: { text?: string };
    href: string;
  }) => (
    <a href={href} style={{ color: COLORS.primary, textDecoration: "underline" }}>
      {element?.text ?? href}
    </a>
  ),
};

// ── Thread notification email ─────────────────────────────────────────────────

export async function sendThreadNotificationEmail(
  liveblocks: Liveblocks,
  event: ThreadNotificationEvent
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[email-notifications] RESEND_API_KEY not set — skipping");
    return;
  }

  const { userId, roomId } = event.data;

  // Fetch user's email address
  const toAddress = await getUserEmailAddress(userId);
  if (!toAddress) {
    console.warn(`[email-notifications] No email for user ${userId} — skipping`);
    return;
  }

  // Prepare email data from unread thread comments
  const emailData = await prepareThreadNotificationEmailAsReact(
    liveblocks,
    event,
    {
      resolveUsers: async ({ userIds }) => resolveUsersFromDB(userIds),
      resolveRoomInfo: async ({ roomId: rid }) => ({
        title: rid.replace(/^alleato:[^:]+:/, "").replace(/-/g, " "),
        url: buildRoomUrl(rid),
      }),
      components: commentComponents,
    }
  );

  // null means all comments were already read
  if (!emailData) return;

  const roomUrl = buildRoomUrl(roomId ?? "");
  const roomLabel = (roomId ?? "")
    .replace(/^alleato:/, "")
    .replace(/:/g, " · ")
    .replace(/-/g, " ");

  let subject: string;
  let bodyContent: React.ReactNode;

  if (emailData.type === "unreadMention") {
    const { comment } = emailData;
    subject = `You were mentioned in ${roomLabel}`;
    bodyContent = (
      <div>
        <p
          style={{
            margin: `0 0 ${SPACE.x3}`,
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.foreground,
          }}
        >
          You were mentioned in a comment
        </p>
        <div
          style={{
            background: COLORS.surfaceAlt,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.md,
            padding: `${SPACE.x3} ${SPACE.x4}`,
          }}
        >
          <p
            style={{
              margin: `0 0 ${SPACE.x1AndHalf}`,
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.mutedForeground,
            }}
          >
            {comment.author.info?.name ?? "Someone"}
          </p>
          {(comment as any).reactBody ?? (comment as any).body}
        </div>
      </div>
    );
  } else {
    // unreadReplies
    const { comments } = emailData;
    subject = `${comments.length} new comment${comments.length !== 1 ? "s" : ""} in ${roomLabel}`;
    bodyContent = (
      <div>
        <p
          style={{
            margin: `0 0 ${SPACE.x4}`,
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.foreground,
          }}
        >
          {comments.length} new comment{comments.length !== 1 ? "s" : ""} since you last visited
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.x2 }}>
          {comments.map((comment, i) => (
            <div
              key={i}
              style={{
                background: COLORS.surfaceAlt,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADIUS.md,
                padding: `${SPACE.x3} ${SPACE.x4}`,
              }}
            >
              <p
                style={{
                  margin: `0 0 ${SPACE.x1AndHalf}`,
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.mutedForeground,
                }}
              >
                {comment.author.info?.name ?? "Someone"}
              </p>
              {(comment as any).reactBody ?? (comment as any).body}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const email = (
    <EmailTemplate
      subject={subject}
      previewText={subject}
      roomUrl={roomUrl}
      roomName={roomLabel}
    >
      {bodyContent}
    </EmailTemplate>
  );

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toAddress,
    subject,
    react: email,
  });
}

// ── Text mention notification email ───────────────────────────────────────────

export async function sendTextMentionNotificationEmail(
  liveblocks: Liveblocks,
  event: TextMentionNotificationEvent
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[email-notifications] RESEND_API_KEY not set — skipping");
    return;
  }

  const { userId, roomId } = event.data;

  const toAddress = await getUserEmailAddress(userId);
  if (!toAddress) return;

  const emailData = await prepareTextMentionNotificationEmailAsReact(
    liveblocks,
    event,
    {
      resolveUsers: async ({ userIds }) => resolveUsersFromDB(userIds),
      resolveRoomInfo: async ({ roomId: rid }) => ({
        title: rid.replace(/^alleato:[^:]+:/, "").replace(/-/g, " "),
        url: buildRoomUrl(rid),
      }),
    }
  );

  if (!emailData) return;

  const roomUrl = buildRoomUrl(roomId ?? "");
  const roomLabel = (roomId ?? "")
    .replace(/^alleato:/, "")
    .replace(/:/g, " · ")
    .replace(/-/g, " ");

  const subject = `You were mentioned in ${roomLabel}`;

  const email = (
    <EmailTemplate
      subject={subject}
      previewText={subject}
      roomUrl={roomUrl}
      roomName={roomLabel}
    >
      <div>
        <p
          style={{
            margin: `0 0 ${SPACE.x3}`,
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.foreground,
          }}
        >
          You were mentioned in a document
        </p>
        <div
          style={{
            background: COLORS.surfaceAlt,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.md,
            padding: `${SPACE.x3} ${SPACE.x4}`,
          }}
        >
          <p
            style={{
              margin: `0 0 ${SPACE.x1AndHalf}`,
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.mutedForeground,
            }}
          >
            {emailData.mention.author?.info?.name ?? "Someone"}
          </p>
          {(emailData.mention as any).reactContent ?? (emailData.mention as any).body}
        </div>
      </div>
    </EmailTemplate>
  );

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toAddress,
    subject,
    react: email,
  });
}

// ── Custom notification kind emails ───────────────────────────────────────────

/**
 * Handles all custom notification kinds ($criticalIssue, $deadline, etc.).
 * Called when a `notification` event fires on the `email` channel for a
 * custom kind.  Reads activity data from the inbox notification and sends
 * a kind-specific email.
 */
export async function sendCustomNotificationEmail(
  liveblocks: Liveblocks,
  event: CustomNotificationEvent
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const { userId, inboxNotificationId, kind } = event.data;

  const toAddress = await getUserEmailAddress(userId);
  if (!toAddress) return;

  // Fetch the full inbox notification to get the activity data payload
  let activityData: Record<string, unknown> = {};
  try {
    const notification = await liveblocks.getInboxNotification({
      userId,
      inboxNotificationId,
    });
    const firstActivity = (
      notification as { activities?: { data?: unknown }[] }
    ).activities?.[0];
    if (firstActivity?.data && typeof firstActivity.data === "object") {
      activityData = firstActivity.data as Record<string, unknown>;
    }
  } catch (err) {
    console.warn("[email-notifications] Could not fetch inbox notification", err);
  }

  const roomId = event.data.roomId ?? "";
  const roomUrl = buildRoomUrl(roomId);

  const { subject, bodyContent } = buildCustomEmailContent(
    kind,
    activityData,
    roomUrl
  );

  const email = (
    <EmailTemplate
      subject={subject}
      previewText={subject}
      roomUrl={activityData.url ? String(activityData.url) : roomUrl}
      roomName={String(activityData.projectName ?? roomId)}
    >
      {bodyContent}
    </EmailTemplate>
  );

  const resendClient = new Resend(resendApiKey);
  await resendClient.emails.send({
    from: FROM_ADDRESS,
    to: toAddress,
    subject,
    react: email,
  });
}

// ── Custom kind → subject + body ─────────────────────────────────────────────

function buildCustomEmailContent(
  kind: string,
  data: Record<string, unknown>,
  fallbackUrl: string
): { subject: string; bodyContent: React.ReactNode } {
  void fallbackUrl;

  switch (kind) {
    // ── Critical Issue ──────────────────────────────────────────────────────
    case "$criticalIssue": {
      const d = data as unknown as CriticalIssueData;
      const severityColor =
        d.severity === "critical"
          ? COLORS.destructive
          : d.severity === "high"
            ? COLORS.warning
            : COLORS.primary;
      return {
        subject: d.title ?? "Critical issue requires attention",
        bodyContent: (
          <div>
            <div style={{ marginBottom: SPACE.x3 }}>
              <span style={{ background: severityColor, color: COLORS.primaryForeground, fontSize: 11, fontWeight: 700, padding: `${SPACE.x1Half} ${SPACE.x2}`, borderRadius: RADIUS.sm, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                {d.severity ?? "high"}
              </span>
            </div>
            <p style={{ margin: `0 0 ${SPACE.x2}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>{d.title}</p>
            <p style={{ margin: `0 0 ${SPACE.x4}`, fontSize: 14, color: COLORS.mutedForeground, lineHeight: 1.6 }}>{d.message}</p>
            {(d.entityType || d.projectName) && (
              <p style={{ margin: 0, fontSize: 12, color: COLORS.mutedForegroundSoft }}>
                {[d.projectName, d.entityType].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        ),
      };
    }

    // ── Deadline ────────────────────────────────────────────────────────────
    case "$deadline": {
      const d = data as unknown as DeadlineData;
      const isOverdue = d.daysRemaining < 0;
      const urgencyColor = isOverdue ? COLORS.destructive : d.daysRemaining <= 3 ? COLORS.warning : COLORS.primary;
      const dueLabel = isOverdue
        ? `Overdue by ${Math.abs(d.daysRemaining)} day${Math.abs(d.daysRemaining) !== 1 ? "s" : ""}`
        : `Due in ${d.daysRemaining} day${d.daysRemaining !== 1 ? "s" : ""}`;
      return {
        subject: d.title ?? `Deadline: ${dueLabel}`,
        bodyContent: (
          <div>
            <p style={{ margin: `0 0 ${SPACE.x2}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>{d.title}</p>
            <p style={{ margin: `0 0 ${SPACE.x1}`, fontSize: 14, color: urgencyColor, fontWeight: 600 }}>{dueLabel}</p>
            {d.dueDate && (
              <p style={{ margin: `0 0 ${SPACE.x4}`, fontSize: 13, color: COLORS.mutedForeground }}>
                Due: {new Date(d.dueDate).toLocaleDateString("en-US", { dateStyle: "long" as const })}
              </p>
            )}
            {(d.entityType || d.projectName) && (
              <p style={{ margin: 0, fontSize: 12, color: COLORS.mutedForegroundSoft }}>
                {[d.projectName, d.entityType].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        ),
      };
    }

    // ── Status Change ───────────────────────────────────────────────────────
    case "$statusChange": {
      const d = data as unknown as StatusChangeData;
      return {
        subject: d.title ?? `Status changed: ${d.oldStatus} → ${d.newStatus}`,
        bodyContent: (
          <div>
            <p style={{ margin: `0 0 ${SPACE.x3}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>{d.title}</p>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.x2, marginBottom: SPACE.x4 }}>
              <span style={{ fontSize: 13, color: COLORS.mutedForeground, textDecoration: "line-through" }}>{d.oldStatus}</span>
              <span style={{ fontSize: 13, color: COLORS.mutedForeground }}>→</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.foreground, background: COLORS.mutedSurface, padding: `${SPACE.x1Half} ${SPACE.x2}`, borderRadius: RADIUS.sm }}>{d.newStatus}</span>
            </div>
            {(d.changedBy || d.projectName || d.entityType) && (
              <p style={{ margin: 0, fontSize: 12, color: COLORS.mutedForegroundSoft }}>
                {[d.changedBy && `Changed by ${d.changedBy}`, d.projectName, d.entityType].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        ),
      };
    }

    // ── Budget Alert ────────────────────────────────────────────────────────
    case "$budgetAlert": {
      const d = data as unknown as BudgetAlertData;
      const alertLabels: Record<string, string> = { over_budget: "Over Budget", approaching_limit: "Approaching Limit", variance: "Budget Variance", cost_change: "Cost Change" };
      return {
        subject: d.title ?? `Budget alert: ${alertLabels[d.alertType] ?? d.alertType}`,
        bodyContent: (
          <div>
            <p style={{ margin: `0 0 ${SPACE.x2}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>{d.title}</p>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.x2, marginBottom: SPACE.x4 }}>
              <span style={{ background: COLORS.warningSurface, color: COLORS.warningForeground, fontSize: 12, fontWeight: 600, padding: `${SPACE.x1Half} ${SPACE.x2}`, borderRadius: RADIUS.sm }}>
                {alertLabels[d.alertType] ?? d.alertType}
              </span>
              {d.amount != null && <span style={{ fontSize: 13, color: COLORS.foreground, fontWeight: 600 }}>${d.amount.toLocaleString()}</span>}
              {d.percentage != null && <span style={{ fontSize: 13, color: COLORS.mutedForeground }}>{d.percentage}%</span>}
            </div>
            {d.projectName && <p style={{ margin: 0, fontSize: 12, color: COLORS.mutedForegroundSoft }}>{d.projectName}</p>}
          </div>
        ),
      };
    }

    // ── Weekly Digest ───────────────────────────────────────────────────────
    case "$weeklyDigest": {
      const d = data as unknown as WeeklyDigestData;
      const stats = [
        d.newIssues > 0 && { label: "New issues", value: d.newIssues, color: COLORS.destructive },
        d.resolvedIssues > 0 && { label: "Resolved", value: d.resolvedIssues, color: COLORS.success },
        d.pendingApprovals > 0 && { label: "Pending approvals", value: d.pendingApprovals, color: COLORS.warning },
        d.upcomingDeadlines > 0 && { label: "Upcoming deadlines", value: d.upcomingDeadlines, color: COLORS.primary },
      ].filter(Boolean) as { label: string; value: number; color: string }[];
      return {
        subject: d.title ?? "Your weekly project digest",
        bodyContent: (
          <div>
            <p style={{ margin: `0 0 ${SPACE.x2}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>{d.title}</p>
            {d.summary && <p style={{ margin: `0 0 ${SPACE.x4AndOne}`, fontSize: 14, color: COLORS.mutedForeground, lineHeight: 1.6 }}>{d.summary}</p>}
            {stats.length > 0 && (
              <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: SPACE.x4 }}>
                <tbody>
                  <tr>
                    {stats.map((s) => (
                      <td key={s.label} style={{ padding: `0 ${SPACE.x1} 0 0`, verticalAlign: "top" }}>
                        <div style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: `${SPACE.x2AndHalf} ${SPACE.x3}` }}>
                          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
                          <p style={{ margin: 0, fontSize: 11, color: COLORS.mutedForeground }}>{s.label}</p>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
            {d.projectName && <p style={{ margin: 0, fontSize: 12, color: COLORS.mutedForegroundSoft }}>{d.projectName}</p>}
          </div>
        ),
      };
    }

    // ── Assignment ──────────────────────────────────────────────────────────
    case "$assignment": {
      const d = data as unknown as AssignmentData;
      return {
        subject: d.title ?? "You've been assigned an item",
        bodyContent: (
          <div>
            <p style={{ margin: `0 0 ${SPACE.x2}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>{d.title}</p>
            {d.assignedBy && <p style={{ margin: `0 0 ${SPACE.x4}`, fontSize: 14, color: COLORS.mutedForeground }}>Assigned by <strong style={{ color: COLORS.foreground }}>{d.assignedBy}</strong></p>}
            {(d.projectName || d.entityType) && <p style={{ margin: 0, fontSize: 12, color: COLORS.mutedForegroundSoft }}>{[d.projectName, d.entityType].filter(Boolean).join(" · ")}</p>}
          </div>
        ),
      };
    }

    // ── Approval Request ────────────────────────────────────────────────────
    case "$approvalRequest": {
      const d = data as unknown as ApprovalRequestData;
      return {
        subject: d.title ?? "Your approval is requested",
        bodyContent: (
          <div>
            <p style={{ margin: `0 0 ${SPACE.x2}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>{d.title}</p>
            {d.requestedBy && <p style={{ margin: `0 0 ${SPACE.x4}`, fontSize: 14, color: COLORS.mutedForeground }}>Requested by <strong style={{ color: COLORS.foreground }}>{d.requestedBy}</strong></p>}
            {(d.projectName || d.entityType) && <p style={{ margin: 0, fontSize: 12, color: COLORS.mutedForegroundSoft }}>{[d.projectName, d.entityType].filter(Boolean).join(" · ")}</p>}
          </div>
        ),
      };
    }

    // ── Ball in Court ───────────────────────────────────────────────────────
    case "$ballInCourt": {
      const d = data as unknown as BallInCourtData;
      return {
        subject: d.title ?? `RFI #${d.rfiNumber}: Action required`,
        bodyContent: (
          <div>
            <p style={{ margin: `0 0 ${SPACE.x2}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>
              {d.title ?? `RFI #${d.rfiNumber} — ${d.rfiSubject}`}
            </p>
            {d.newHolder && (
              <p style={{ margin: `0 0 ${SPACE.x1}`, fontSize: 14, color: COLORS.mutedForeground }}>
                Now assigned to <strong style={{ color: COLORS.foreground }}>{d.newHolder}</strong>
              </p>
            )}
            {d.previousHolder && (
              <p style={{ margin: `0 0 ${SPACE.x4}`, fontSize: 13, color: COLORS.mutedForegroundSoft }}>
                Previously held by {d.previousHolder}
              </p>
            )}
            {d.projectName && (
              <p style={{ margin: 0, fontSize: 12, color: COLORS.mutedForegroundSoft }}>{d.projectName}</p>
            )}
          </div>
        ),
      };
    }

    // ── Unknown kind (safe fallback) ────────────────────────────────────────
    default: {
      const title = String(data.title ?? `Notification: ${kind}`);
      const message = String(data.message ?? data.summary ?? "");
      return {
        subject: title,
        bodyContent: (
          <div>
            <p style={{ margin: `0 0 ${SPACE.x2}`, fontSize: 15, fontWeight: 600, color: COLORS.foreground }}>{title}</p>
            {message && <p style={{ margin: 0, fontSize: 14, color: COLORS.mutedForeground, lineHeight: 1.6 }}>{message}</p>}
          </div>
        ),
      };
    }
  }
}
