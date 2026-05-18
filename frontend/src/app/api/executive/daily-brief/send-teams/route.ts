export const dynamic = "force-dynamic";

/**
 * POST /api/executive/daily-brief/send-teams
 *
 * Deliver the latest approved Daily Brief packet as a conversational Teams
 * message via the Archon bot. Generation is intentionally owned by the Render
 * worker so this endpoint stays short-lived and delivery-only.
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
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { sendOwnerBriefingToTeams } from "@/lib/executive/owner-briefing-delivery";

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST = withApiGuardrails("executive/daily-brief/send-teams#POST", async ({ request }): Promise<Response> => {
  // Kill switch: deactivated 2026-05-18 at user request. Default OFF.
  // Set EXECUTIVE_DAILY_BRIEF_ENABLED=true to re-enable Teams delivery.
  const enabled = (process.env.EXECUTIVE_DAILY_BRIEF_ENABLED ?? "false").toLowerCase() === "true";
  if (!enabled) {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        status: "disabled",
        reason: "executive_daily_brief_disabled",
        message: "Executive Daily Brief Teams delivery is disabled. Set EXECUTIVE_DAILY_BRIEF_ENABLED=true to re-enable.",
      },
      { status: 200 },
    );
  }

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
    } catch (error) {
      console.warn("[executive-briefing] Session auth check failed.", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error_code: "AUTH_EXPIRED", error_message: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { dryRun?: boolean } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as { dryRun?: boolean };
  } catch (error) {
    console.warn("[owner-briefing] Ignoring invalid optional Teams send body.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const result = await sendOwnerBriefingToTeams({ dryRun: body.dryRun });
  if (result.ok) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, {
    status: result.status === "blocked" ? 400 : 500,
  });
});
