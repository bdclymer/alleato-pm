/**
 * POST /api/cron/decay-memories
 *
 * Weekly cron job that:
 *   1. Decays importance/confidence on stale facts and lessons
 *   2. Expires context memories past their TTL
 *
 * Secured via CRON_SECRET env var (set in Vercel and call with Authorization header).
 * Add to vercel.json:
 *   { "crons": [{ "path": "/api/cron/decay-memories", "schedule": "0 4 * * 0" }] }
 */

import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("decay_memory_confidence");

  if (error) {
    console.error("[cron/decay-memories] failed:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }

  const result = data?.[0] ?? { decayed_count: 0, expired_count: 0 };
  console.log(`[cron/decay-memories] decayed=${result.decayed_count} expired=${result.expired_count}`);

  return Response.json({
    success: true,
    decayed: result.decayed_count,
    expired: result.expired_count,
    runAt: new Date().toISOString(),
  });
}
