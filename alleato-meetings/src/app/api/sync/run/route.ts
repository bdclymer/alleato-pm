import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/auth-server";
import { syncMeetings } from "@/lib/sync";
import { MeetingAccessError } from "@/lib/graph";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Authed manual sync — triggered by the "Sync now" button. Gated by login, not SYNC_SECRET. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await syncMeetings();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof MeetingAccessError) {
      return NextResponse.json(
        { ok: false, error: "meeting_access_denied", detail: e.message },
        { status: 403 },
      );
    }
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
