import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { requireAdmin } from "@/app/api/admin/intelligence-compiler/_shared";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const WHERE = "api.admin.analytics#GET";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export const GET = withApiGuardrails(WHERE, async () => {
  await requireAdmin(WHERE);
  const supabase = createServiceClient();

  const [
    usersResult,
    recentLoginsResult,
    errorsResult,
    errorGroupsResult,
    syncStatusResult,
    aiEventsResult,
    feedbackItemsResult,
  ] = await Promise.all([
    // All user profiles
    supabase
      .from("user_profiles")
      .select("id, email, full_name, is_active, is_admin, created_at, role")
      .order("created_at", { ascending: false }),

    // Recent logins via users_auth joined to user_profiles via people
    supabase
      .from("users_auth")
      .select("auth_user_id, last_login_at, person_id")
      .not("last_login_at", "is", null)
      .order("last_login_at", { ascending: false })
      .limit(20),

    // Error events last 30 days
    supabase
      .from("app_error_events")
      .select("id, severity, source, created_at, page_path, error_message")
      .gte("created_at", daysAgo(30))
      .order("created_at", { ascending: false })
      .limit(500),

    // Error groups for top errors
    supabase
      .from("app_error_groups")
      .select("id, fingerprint, title, severity, event_count, first_seen_at, last_seen_at, status")
      .order("event_count", { ascending: false })
      .limit(10),

    // Sync status for all integrations
    supabase
      .from("sync_status")
      .select("sync_type, status, last_successful_sync_at, last_sync_at, error_message")
      .order("last_sync_at", { ascending: false }),

    // AI feedback events last 30 days (count only)
    supabase
      .from("ai_feedback_events")
      .select("id, signal, event_type, created_at")
      .gte("created_at", daysAgo(30))
      .order("created_at", { ascending: false })
      .limit(500),

    // Recent admin feedback items (activity feed)
    supabase
      .from("admin_feedback_items")
      .select("id, title, status, severity, created_at, page_path, page_title")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const users = usersResult.data ?? [];
  const recentLogins = recentLoginsResult.data ?? [];
  const errors = errorsResult.data ?? [];
  const errorGroups = errorGroupsResult.data ?? [];
  const syncStatuses = syncStatusResult.data ?? [];
  const aiEvents = aiEventsResult.data ?? [];
  const feedbackItems = feedbackItemsResult.data ?? [];

  const now = Date.now();
  const cut7d = now - 7 * 24 * 60 * 60 * 1000;
  const cut24h = now - 24 * 60 * 60 * 1000;

  // ── User stats ────────────────────────────────────────────────────────────
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const adminUsers = users.filter((u) => u.is_admin).length;
  const newUsers7d = users.filter((u) => new Date(u.created_at).getTime() >= cut7d).length;

  // Map auth_user_id → user_profile for login enrichment
  const profileByAuthId = Object.fromEntries(users.map((u) => [u.id, u]));

  const enrichedLogins = recentLogins
    .slice(0, 15)
    .map((row) => {
      const profile = profileByAuthId[row.auth_user_id];
      return {
        authUserId: row.auth_user_id,
        lastLoginAt: row.last_login_at,
        email: profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        isAdmin: profile?.is_admin ?? false,
      };
    });

  // ── Error stats ───────────────────────────────────────────────────────────
  const errorsLast24h = errors.filter((e) => new Date(e.created_at).getTime() >= cut24h);
  const errorsLast7d = errors.filter((e) => new Date(e.created_at).getTime() >= cut7d);

  const countBySeverity = (evts: typeof errors) =>
    evts.reduce<Record<string, number>>(
      (acc, e) => { acc[e.severity] = (acc[e.severity] ?? 0) + 1; return acc; },
      {},
    );

  // Daily error series for the last 14 days
  const errorSeries: Array<{ date: string; critical: number; high: number; medium: number; low: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const day = errors.filter((e) => e.created_at.slice(0, 10) === key);
    errorSeries.push({
      date: key,
      critical: day.filter((e) => e.severity === "critical").length,
      high: day.filter((e) => e.severity === "high").length,
      medium: day.filter((e) => e.severity === "medium").length,
      low: day.filter((e) => e.severity === "low").length,
    });
  }

  // ── AI stats ──────────────────────────────────────────────────────────────
  const aiTotal30d = aiEvents.length;
  const aiLast24h = aiEvents.filter((e) => new Date(e.created_at).getTime() >= cut24h).length;
  const aiLast7d = aiEvents.filter((e) => new Date(e.created_at).getTime() >= cut7d).length;

  const aiThumbsUp = aiEvents.filter((e) => e.signal === "up").length;
  const aiThumbsDown = aiEvents.filter((e) => e.signal === "down").length;

  // ── Feedback activity ─────────────────────────────────────────────────────
  const feedbackLast7d = feedbackItems.filter((f) => new Date(f.created_at).getTime() >= cut7d).length;

  // ── Activity feed (combined recent events) ────────────────────────────────
  const activityFeed = [
    ...feedbackItems.slice(0, 10).map((f) => ({
      type: "feedback" as const,
      id: f.id,
      title: f.title,
      subtitle: f.page_title ?? f.page_path ?? "",
      severity: f.severity ?? "medium",
      timestamp: f.created_at,
    })),
    ...errors.slice(0, 10).map((e) => ({
      type: "error" as const,
      id: e.id,
      title: e.error_message.slice(0, 80),
      subtitle: e.page_path ?? "",
      severity: e.severity,
      timestamp: e.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    users: {
      total: totalUsers,
      active: activeUsers,
      admins: adminUsers,
      newLast7d: newUsers7d,
      recentLogins: enrichedLogins,
    },
    errors: {
      last24h: { total: errorsLast24h.length, bySeverity: countBySeverity(errorsLast24h) },
      last7d: { total: errorsLast7d.length, bySeverity: countBySeverity(errorsLast7d) },
      last30d: { total: errors.length, bySeverity: countBySeverity(errors) },
      topGroups: errorGroups,
      series: errorSeries,
    },
    ai: {
      events30d: aiTotal30d,
      events7d: aiLast7d,
      events24h: aiLast24h,
      thumbsUp: aiThumbsUp,
      thumbsDown: aiThumbsDown,
    },
    sync: {
      statuses: syncStatuses,
    },
    feedback: {
      recentCount7d: feedbackLast7d,
      recent: feedbackItems.slice(0, 5),
    },
    activityFeed,
  });
});
