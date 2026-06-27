import { NextResponse } from "next/server";
import { syncMeetings } from "@/lib/sync";
import { MeetingAccessError } from "@/lib/graph";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const syncSecret = process.env.SYNC_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const provided =
    req.headers.get("x-sync-secret") ?? new URL(req.url).searchParams.get("secret");
  if (syncSecret && provided === syncSecret) return true;
  if (cronSecret && bearer === cronSecret) return true; // Vercel Cron
  return false;
}

/**
 * Pull new Teams transcripts + recordings and process them.
 * POST with `x-sync-secret`/`?secret=` (SYNC_SECRET), or GET from Vercel Cron
 * (Authorization: Bearer CRON_SECRET). Point any scheduler at this endpoint.
 */
export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMeetings();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof MeetingAccessError) {
      return NextResponse.json(
        {
          ok: false,
          error: "meeting_access_denied",
          detail: e.message,
          fix: "Admin-consent OnlineMeeting*.Read.All and grant a Teams application access policy to MS_CLIENT_ID.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
