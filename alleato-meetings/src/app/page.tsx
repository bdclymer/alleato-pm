import { supabaseService } from "@/lib/supabase";
import { MeetingsBrowser, type MeetingCard } from "@/components/meetings-browser";
import { SyncNowButton } from "@/components/sync-now-button";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface SyncStatus {
  relative: string | null;
  status: string | null;
}

export default async function HomePage() {
  const sb = supabaseService();
  const [{ data, error }, { data: syncRow }] = await Promise.all([
    sb
      .from("meetings")
      .select(
        "id, title, started_at, duration_minutes, participants, summary, recording_storage_path, action_items(count)",
      )
      .order("started_at", { ascending: false })
      .limit(200),
    sb
      .from("sync_state")
      .select("last_run_at, last_status")
      .eq("source", "transcripts")
      .maybeSingle(),
  ]);

  const sync: SyncStatus = {
    relative: relativeTime((syncRow?.last_run_at as string) ?? null),
    status: (syncRow?.last_status as string) ?? null,
  };

  if (error) {
    return (
      <Shell sync={sync}>
        <div className="surface p-6 text-sm text-bad">Could not load meetings: {error.message}</div>
      </Shell>
    );
  }

  const meetings: MeetingCard[] = (data ?? []).map((m) => ({
    id: m.id as string,
    title: (m.title as string) ?? "Untitled meeting",
    started_at: (m.started_at as string) ?? null,
    duration_minutes: (m.duration_minutes as number) ?? null,
    participants: (m.participants as string[]) ?? [],
    summary: (m.summary as string) ?? null,
    has_recording: Boolean(m.recording_storage_path),
    action_count:
      Array.isArray(m.action_items) && m.action_items[0]
        ? Number((m.action_items[0] as { count: number }).count) || 0
        : 0,
  }));

  return (
    <Shell sync={sync}>
      <MeetingsBrowser meetings={meetings} />
    </Shell>
  );
}

function Shell({ children, sync }: { children: React.ReactNode; sync: SyncStatus }) {
  const ok = sync.status === "success";
  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-500 tracking-tight">Meetings</h1>
          <p className="mt-1 text-sm text-muted">
            Every Teams meeting, transcribed and distilled — summary, action items, decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sync.relative && (
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-850 px-3 py-1.5 text-xs text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-good" : "bg-warn"}`} />
              Synced {sync.relative}
            </span>
          )}
          <SyncNowButton />
        </div>
      </header>
      {children}
    </div>
  );
}
