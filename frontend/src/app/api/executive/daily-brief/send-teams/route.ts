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
import { createClient } from "@/lib/supabase/server";
import { sendApprovedExecutiveBriefingToTeams } from "@/lib/executive/executive-briefing-teams-delivery";

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // Auth: CRON_SECRET bearer OR active session
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = Boolean(
    cronSecret && authHeader === `Bearer ${cronSecret}`,
  );

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

  const result = await sendApprovedExecutiveBriefingToTeams({
    userId: body.userId,
  });
  if (result.ok) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, {
    status: result.status === "blocked" ? 400 : 409,
  });
}
