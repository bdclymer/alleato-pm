export const dynamic = "force-dynamic";

/**
 * POST /api/executive/daily-brief/send-teams
 *
 * Generate (or load from cache) today's executive brief and deliver it as a
 * conversational Teams message via the Archon bot.
 *
 * Auth: Bearer CRON_SECRET  OR  active Supabase session (any logged-in user
 *       — the admin page is already access-controlled).
 *
 * Body (all optional):
 *   { userId?: string }   — Supabase user ID to send to.
 *                           Omit to auto-resolve the first Teams-linked user
 *                           who has an active conversation ref.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { sendProactiveMessage } from "@/lib/bot/teams-chat";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  type BrandonDailyUpdatePacket,
  type BrandonBriefItem,
} from "@/lib/executive/brandon-daily-update";

// ── Message formatter ─────────────────────────────────────────────────────────

function formatItem(item: BrandonBriefItem): string {
  const action = item.recommendedAction ? `\n  → ${item.recommendedAction}` : "";
  return `• **${item.title}** (${item.project})${action}`;
}

function formatSection(items: BrandonBriefItem[], cap = 5): string {
  return items.slice(0, cap).map(formatItem).join("\n");
}

function formatTeamsMessage(packet: BrandonDailyUpdatePacket, firstName: string): string {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());

  const { needsBrandon, waitingOnOthers, importantUpdates } = packet.sections;
  const totalItems = needsBrandon.length + waitingOnOthers.length + importantUpdates.length;

  const lines: string[] = [
    `Good morning, ${firstName}! Here's your daily operating brief for **${today}** — ${totalItems} item${totalItems === 1 ? "" : "s"} across ${packet.windowDays} day${packet.windowDays === 1 ? "" : "s"}.`,
    "",
  ];

  if (needsBrandon.length > 0) {
    lines.push(`📋 **Needs Your Attention** (${needsBrandon.length})`);
    lines.push(formatSection(needsBrandon));
    lines.push("");
  }

  if (waitingOnOthers.length > 0) {
    lines.push(`⏳ **Waiting on Others** (${waitingOnOthers.length})`);
    lines.push(formatSection(waitingOnOthers));
    lines.push("");
  }

  if (importantUpdates.length > 0) {
    lines.push(`📊 **Project Signals** (${Math.min(importantUpdates.length, 3)} of ${importantUpdates.length})`);
    lines.push(formatSection(importantUpdates, 3));
    lines.push("");
  }

  lines.push("Reply to ask me anything about any of these — or ask me to follow up with someone on your behalf.");

  return lines.join("\n");
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // Auth: CRON_SECRET bearer OR active session
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

  let isAuthorized = isCronAuth;

  if (!isAuthorized) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isAuthorized = Boolean(user);
    } catch {
      // not logged in
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { userId?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as { userId?: string };
  } catch {
    // empty or non-JSON body — use defaults
  }

  const supabase = createServiceClient();

  // Resolve target user ID — use provided userId, or auto-discover
  let targetUserId = body.userId ?? null;

  if (!targetUserId) {
    // Find first Teams-linked user who has an active conversation ref
    const { data: ref } = await supabase
      .from("teams_conversation_refs")
      .select("supabase_user_id")
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    targetUserId = ref?.supabase_user_id ?? null;
  }

  if (!targetUserId) {
    return NextResponse.json(
      {
        error:
          "No Teams-linked user found. Either pass userId or ensure the recipient has messaged the Archon bot at least once.",
      },
      { status: 400 },
    );
  }

  // Get recipient display name for a personal greeting
  const { data: mapping } = await supabase
    .from("bot_user_mappings")
    .select("display_name")
    .eq("platform", "teams")
    .eq("supabase_user_id", targetUserId)
    .maybeSingle();

  const firstName = mapping?.display_name?.split(" ")[0] ?? "there";

  // Load today's brief (cached unless it hasn't been generated yet)
  const dashboard = await getExecutiveBriefingDashboard({
    windowDays: DEFAULT_EXECUTIVE_WINDOW_DAYS,
  });
  const { draft } = dashboard;

  const message = formatTeamsMessage(draft.packet, firstName);

  await sendProactiveMessage(targetUserId, message);

  // Mark as sent in DB
  await supabase
    .from("daily_recaps")
    .update({ sent_teams: true })
    .eq("id", draft.id)
    .eq("recap_kind", "executive_briefing");

  return NextResponse.json({
    ok: true,
    draftId: draft.id,
    userId: targetUserId,
    recipientName: firstName,
    itemCount:
      draft.packet.sections.needsBrandon.length +
      draft.packet.sections.waitingOnOthers.length +
      draft.packet.sections.importantUpdates.length,
  });
}
